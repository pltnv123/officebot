using UnityEngine;
using System.Collections.Generic;
using System.Linq;

public class TaskOrchestrator : MonoBehaviour
{
    // Filled by RuntimeSceneBuilder — 5-agent system
    [HideInInspector] public BotMover chiefBot;
    [HideInInspector] public BotMover plannerBot;
    [HideInInspector] public BotMover workerBot;
    [HideInInspector] public BotMover testerBot;    // REVIEWER
    [HideInInspector] public BotMover builderBot;

    private readonly HashSet<string> _inProgress = new HashSet<string>();
    private StateRoot _lastState;

    public void ApplyState(StateRoot state)
    {
        _lastState = state;
        if (state?.tasks == null) return;
        Tick(state.tasks);
    }

    private void Tick(List<TaskItem> tasks)
    {
        CleanupInProgress(tasks);

        // 5-agent pipeline: CHIEF → PLANNER → WORKER → REVIEWER → BUILDER
        TryAssign(tasks, "INBOX", chiefBot, "chief");
        TryAssign(tasks, "QUEUED", plannerBot, "planner");
        TryAssign(tasks, "PLANNING", workerBot, "worker");
        TryAssign(tasks, "DOING", testerBot, "reviewer");
        TryAssign(tasks, "REVIEW", builderBot, "builder");
    }

    private void CleanupInProgress(List<TaskItem> tasks)
    {
        var existing = new HashSet<string>(tasks.Select(t => t.id));

        // remove deleted tasks
        _inProgress.RemoveWhere(id => !existing.Contains(id));

        // remove completed/returned tasks
        foreach (var t in tasks)
        {
            if (t == null) continue;
            if (t.status == "DONE" || t.status == "REWORK")
                _inProgress.Remove(t.id);
        }

        // if bot is idle again, unlock tasks in its stage
        UnlockByBotState(tasks, chiefBot, "QUEUED");
        UnlockByBotState(tasks, plannerBot, "PLANNING");
        UnlockByBotState(tasks, workerBot, "DOING");
        UnlockByBotState(tasks, testerBot, "REVIEW");
        UnlockByBotState(tasks, builderBot, "DONE", "REWORK");
    }

    private void UnlockByBotState(List<TaskItem> tasks, BotMover bot, params string[] statuses)
    {
        if (bot == null || !bot.IsIdleState) return;
        foreach (var t in tasks)
        {
            if (t == null) continue;
            for (int i = 0; i < statuses.Length; i++)
            {
                if (t.status == statuses[i])
                {
                    _inProgress.Remove(t.id);
                    break;
                }
            }
        }
    }

    private void TryAssign(List<TaskItem> tasks, string status, BotMover bot, string role)
    {
        if (bot == null || !bot.IsIdleState) return;

        var task = tasks.FirstOrDefault(t =>
            t.status == status &&
            !_inProgress.Contains(t.id));

        if (task == null) return;

        _inProgress.Add(task.id);
        bot.SetRole(role);
        bot.AssignTask(task);
    }
}
