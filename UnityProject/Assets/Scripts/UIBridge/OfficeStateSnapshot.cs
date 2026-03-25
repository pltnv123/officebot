using System;
using System.Collections.Generic;
using UnityEngine;

namespace OfficeHub.UIBridge
{
    [Serializable]
    public sealed class OfficeStateSnapshot
    {
        public static OfficeStateSnapshot Empty => new OfficeStateSnapshot
        {
            UpdatedAt = string.Empty,
            Tasks = new List<OfficeStateTask>(),
            Agents = new List<OfficeStateAgent>(),
            Events = new List<OfficeStateEvent>(),
            Board = OfficeStateBoard.Empty,
        };

        [SerializeField] private string updatedAt = string.Empty;
        [SerializeField] private List<OfficeStateTask> tasks = new List<OfficeStateTask>();
        [SerializeField] private List<OfficeStateAgent> agents = new List<OfficeStateAgent>();
        [SerializeField] private List<OfficeStateEvent> events = new List<OfficeStateEvent>();
        [SerializeField] private OfficeStateBoard board = null;

        public string UpdatedAt { get => updatedAt ?? string.Empty; set => updatedAt = value ?? string.Empty; }
        public List<OfficeStateTask> Tasks { get { if (tasks == null) tasks = new List<OfficeStateTask>(); return tasks; } set => tasks = value ?? new List<OfficeStateTask>(); }
        public List<OfficeStateAgent> Agents { get { if (agents == null) agents = new List<OfficeStateAgent>(); return agents; } set => agents = value ?? new List<OfficeStateAgent>(); }
        public List<OfficeStateEvent> Events { get { if (events == null) events = new List<OfficeStateEvent>(); return events; } set => events = value ?? new List<OfficeStateEvent>(); }
        public OfficeStateBoard Board { get { if (board == null) board = OfficeStateBoard.Empty; return board; } set => board = value ?? OfficeStateBoard.Empty; }

        public int InboxCount => Board?.InboxCount ?? 0;
        public int DoingCount => Board?.DoingCount ?? 0;
        public int DoneCount => Board?.DoneCount ?? 0;

        [Serializable]
        private sealed class OfficeStateEnvelope
        {
            public string updatedAt;
            public string timestamp;
            public List<OfficeStateTask> tasks;
            public List<OfficeStateAgent> agents;
            public List<OfficeStateEvent> events;
            public OfficeStateBoard board;
            public OfficeTaskStateEnvelope taskState;
        }

        [Serializable]
        private sealed class OfficeTaskStateEnvelope
        {
            public List<OfficeStateTask> tasks;
        }

        public static OfficeStateSnapshot FromJson(string json)
        {
            if (string.IsNullOrWhiteSpace(json)) return Empty;

            try
            {
                var envelope = JsonUtility.FromJson<OfficeStateEnvelope>(json);
                if (envelope == null) return Empty;

                object tasksCandidate = envelope.tasks ?? envelope.taskState?.tasks;
                if (tasksCandidate == null)
                {
                    Debug.LogWarning("[OfficeStateSnapshot] Missing tasks array in payload");
                    return Empty;
                }
                var typedTasks = tasksCandidate as List<OfficeStateTask>;
                if (typedTasks == null)
                {
                    Debug.LogWarning("[OfficeStateSnapshot] Tasks array has invalid type");
                    return Empty;
                }

                var snapshot = new OfficeStateSnapshot
                {
                    UpdatedAt = string.IsNullOrWhiteSpace(envelope.updatedAt) ? envelope.timestamp : envelope.updatedAt,
                    Tasks = typedTasks,
                    Agents = envelope.agents ?? new List<OfficeStateAgent>(),
                    Events = envelope.events ?? new List<OfficeStateEvent>(),
                    Board = envelope.board ?? OfficeStateBoard.FromTasks(typedTasks),
                };

                if (snapshot.Board == null)
                    snapshot.Board = OfficeStateBoard.FromTasks(snapshot.Tasks);

                if ((snapshot.Agents == null || snapshot.Agents.Count == 0) && snapshot.Tasks != null)
                    snapshot.Agents = OfficeStateAgent.FromTasks(snapshot.Tasks);

                return snapshot;
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"OfficeStateSnapshot.FromJson parse failed: {ex.Message}");
                return Empty;
            }
        }
    }

    [Serializable]
    public sealed class OfficeStateAgent
    {
        [SerializeField] private string id = string.Empty;
        [SerializeField] private string role = string.Empty;
        [SerializeField] private string state = string.Empty;
        [SerializeField] private bool isWorking;
        [SerializeField] private string taskId = string.Empty;

        public string Id { get => id ?? string.Empty; set => id = value ?? string.Empty; }
        public string Role { get => role ?? string.Empty; set => role = value ?? string.Empty; }
        public string State { get => state ?? string.Empty; set => state = value ?? string.Empty; }
        public bool IsWorking { get => isWorking; set => isWorking = value; }
        public string TaskId { get => taskId ?? string.Empty; set => taskId = value ?? string.Empty; }

        public static List<OfficeStateAgent> FromTasks(List<OfficeStateTask> tasks)
        {
            var agents = new List<OfficeStateAgent>();
            var byRole = new Dictionary<string, OfficeStateAgent>(StringComparer.OrdinalIgnoreCase);
            if (tasks == null) return agents;

            foreach (var task in tasks)
            {
                var roleKey = (task?.Assignee ?? string.Empty).Trim().ToLowerInvariant();
                if (string.IsNullOrEmpty(roleKey)) continue;
                if (!byRole.TryGetValue(roleKey, out var agent))
                {
                    agent = new OfficeStateAgent
                    {
                        Id = roleKey,
                        Role = roleKey,
                        State = "idle",
                        IsWorking = false,
                    };
                    byRole[roleKey] = agent;
                    agents.Add(agent);
                }

                if (string.Equals(task?.Status, "done", StringComparison.OrdinalIgnoreCase)) continue;
                agent.IsWorking = true;
                agent.State = task?.Status ?? "doing";
                agent.TaskId = task?.Id ?? string.Empty;
            }

            return agents;
        }
    }

    [Serializable]
    public sealed class OfficeStateTask
    {
        [SerializeField] private string id = string.Empty;
        [SerializeField] private string title = string.Empty;
        [SerializeField] private string status = string.Empty;
        [SerializeField] private string assignee = string.Empty;
        [SerializeField] private float progress;

        public string Id { get => id ?? string.Empty; set => id = value ?? string.Empty; }
        public string Title { get => title ?? string.Empty; set => title = value ?? string.Empty; }
        public string Status { get => status ?? string.Empty; set => status = value ?? string.Empty; }
        public string Assignee { get => assignee ?? string.Empty; set => assignee = value ?? string.Empty; }
        public float Progress { get => progress; set => progress = value; }
    }

    [Serializable]
    public sealed class OfficeStateEvent
    {
        [SerializeField] private string id = string.Empty;
        [SerializeField] private string type = string.Empty;
        [SerializeField] private string title = string.Empty;
        [SerializeField] private string createdAt = string.Empty;

        public string Id { get => id ?? string.Empty; set => id = value ?? string.Empty; }
        public string Type { get => type ?? string.Empty; set => type = value ?? string.Empty; }
        public string Title { get => title ?? string.Empty; set => title = value ?? string.Empty; }
        public string CreatedAt { get => createdAt ?? string.Empty; set => createdAt = value ?? string.Empty; }
    }

    [Serializable]
    public sealed class OfficeStateBoard
    {
        public static OfficeStateBoard Empty => new OfficeStateBoard { ColumnTaskCounts = new List<int> { 0, 0, 0, 0, 0, 0 } };

        [SerializeField] private int inboxCount;
        [SerializeField] private int doingCount;
        [SerializeField] private int doneCount;
        [SerializeField] private List<int> columnTaskCounts = new List<int> { 0, 0, 0, 0, 0, 0 };

        public int InboxCount { get => inboxCount; set => inboxCount = value; }
        public int DoingCount { get => doingCount; set => doingCount = value; }
        public int DoneCount { get => doneCount; set => doneCount = value; }
        public List<int> ColumnTaskCounts { get { if (columnTaskCounts == null) columnTaskCounts = new List<int> { 0, 0, 0, 0, 0, 0 }; return columnTaskCounts; } set => columnTaskCounts = value ?? new List<int> { 0, 0, 0, 0, 0, 0 }; }

        public static OfficeStateBoard FromTasks(List<OfficeStateTask> tasks)
        {
            var board = Empty;
            if (tasks == null) return board;

            foreach (var task in tasks)
            {
                var status = (task?.Status ?? string.Empty).Trim().ToLowerInvariant();
                var column = ResolveColumn(status);
                while (board.ColumnTaskCounts.Count <= column) board.ColumnTaskCounts.Add(0);
                board.ColumnTaskCounts[column]++;

                if (column == 0) board.InboxCount++;
                if (string.Equals(status, "done", StringComparison.OrdinalIgnoreCase)) board.DoneCount++;
                else board.DoingCount++;
            }

            return board;
        }

        private static int ResolveColumn(string status)
        {
            switch (status)
            {
                case "inbox": return 0;
                case "queue": return 1;
                case "plan":
                case "planning": return 2;
                case "work":
                case "doing": return 3;
                case "review":
                case "rework": return 4;
                case "done": return 5;
                default: return 1;
            }
        }
    }
}
