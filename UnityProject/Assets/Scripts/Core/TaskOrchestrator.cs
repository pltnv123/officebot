using UnityEngine;
using System.Collections;
using System.Collections.Generic;
using System.Linq;

public class TaskOrchestrator : MonoBehaviour
{
 // Filled by RuntimeSceneBuilder
 [HideInInspector] public BotMover plannerBot;
 [HideInInspector] public BotMover workerBot;
 [HideInInspector] public BotMover testerBot;

 private readonly HashSet<string> _inProgress =
 new HashSet<string>();

 private StateRoot _lastState;

 public void ApplyState(StateRoot state)
 {
 _lastState = state;
 if (state?.tasks == null) return;
 Tick(state.tasks);
 }

 private void Tick(List<TaskItem> tasks)
 {
 TryAssign(tasks, "INBOX", plannerBot, "planner");
 TryAssign(tasks, "PLANNING", workerBot, "worker");
 TryAssign(tasks, "DOING", testerBot, "tester");
 }

 private void TryAssign(List<TaskItem> tasks,
 string status, BotMover bot, string role)
 {
 if (bot == null || bot.IsBusy) return;

 var task = tasks.FirstOrDefault(t =>
 t.status == status &&
 !_inProgress.Contains(t.id));

 if (task == null) return;

 _inProgress.Add(task.id);
 bot.SetRole(role);
 bot.AssignTask(task);

 // Clean finished tasks from tracking
 var done = tasks
 .Where(t => t.status == "DONE" || t.status == "REWORK")
 .Select(t => t.id).ToList();
 foreach (var id in done) _inProgress.Remove(id);
 }
}
