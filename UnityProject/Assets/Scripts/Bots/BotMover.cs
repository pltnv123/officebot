using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class BotMover : MonoBehaviour
{
 [Header("Movement")]
 public float moveSpeed = 2.5f;
 public float rotateSpeed = 8.0f;
 public float arrivalDist = 0.25f;

 [Header("Idle bob")]
 public float bobAmplitude = 0.04f;
 public float bobFrequency = 1.4f;

 [Header("Eye lights")]
 public List<Light> eyeLights = new List<Light>();

 // State
 public bool IsMoving { get; private set; }
 public bool IsBusy { get; private set; }

 private Vector3 _basePos;
 private float _time;
 private ApiClient _api;

 // Task pipeline state
 private TaskItem _currentTask;
 private string _botRole; // "planner","worker","tester"

 // Anchor positions — set from RuntimeSceneBuilder
 [HideInInspector] public Vector3 idlePos;
 [HideInInspector] public Vector3 boardPos;
 [HideInInspector] public Vector3 deskPos;
 [HideInInspector] public Vector3 donePos;

 // Roam targets
 private static readonly Vector3[] RoamGrid = {
 new Vector3(-3.5f,0,-1.5f), new Vector3(-1.5f,0,-1.5f),
 new Vector3( 0.0f,0,-1.5f), new Vector3( 1.5f,0,-1.5f),
 new Vector3( 3.5f,0,-1.5f), new Vector3(-3.5f,0, 0.5f),
 new Vector3(-1.5f,0, 0.5f), new Vector3( 0.0f,0, 0.5f),
 new Vector3( 1.5f,0, 0.5f), new Vector3( 3.5f,0, 0.5f),
 new Vector3(-2.0f,0, 2.0f), new Vector3( 2.0f,0, 2.0f)
 };

 void Start()
 {
 _basePos = transform.position;
 idlePos = transform.position;
 _api = FindObjectOfType<ApiClient>();
 StartCoroutine(IdleRoam());
 }

 void Update()
 {
 _time += Time.deltaTime;

 // Eye pulse
 foreach (var lt in eyeLights)
 {
 if (lt == null) continue;
 lt.intensity = 2.0f +
 Mathf.Sin(_time * 2.2f + GetInstanceID() * 0.9f) * 0.8f;
 }

 // Idle body bob (only when not moving)
 if (!IsMoving && !IsBusy)
 {
 float bob = Mathf.Sin(_time * bobFrequency +
 GetInstanceID() * 1.1f) * bobAmplitude;
 var p = transform.position;
 p.y = _basePos.y + bob;
 transform.position = p;
 }
 }

 // ── Public API ────────────────────────────────────────────

 public void SetRole(string role) => _botRole = role;

 public void AssignTask(TaskItem task)
 {
 if (IsBusy) return;
 _currentTask = task;
 IsBusy = true;
 StopCoroutine("IdleRoam");
 StartCoroutine(TaskRoutine());
 }

 // ── Coroutines ────────────────────────────────────────────

 private IEnumerator TaskRoutine()
 {
 // 1. Walk to board
 yield return WalkTo(boardPos);
 yield return new WaitForSeconds(0.7f);

 // 2. Walk to desk
 yield return WalkTo(deskPos);

 // 3. Work animation (bob faster)
 float workTime = 2.5f;
 float t = 0;
 while (t < workTime)
 {
 t += Time.deltaTime;
 float bob = Mathf.Sin(t * 6f) * 0.06f;
 var p = transform.position;
 p.y = _basePos.y + bob;
 transform.position = p;
 yield return null;
 }

 // 4. Advance task status
 string next = NextStatus(_botRole, _currentTask.status);
 _currentTask.status = next;
 if (_api != null)
 yield return _api.PatchTask(_currentTask.id, next);

 // 5. If DONE — walk to done position
 if (next == "DONE" || next == "REVIEW")
 yield return WalkTo(donePos);

 // 6. Return to idle position
 yield return WalkTo(idlePos);

 _currentTask = null;
 IsBusy = false;
 StartCoroutine(IdleRoam());
 }

 private IEnumerator IdleRoam()
 {
 yield return new WaitForSeconds(Random.Range(2f, 5f));
 while (!IsBusy)
 {
 // Pick random roam point
 var target = RoamGrid[Random.Range(0, RoamGrid.Length)];
 yield return WalkTo(target);
 // Wait at point
 yield return new WaitForSeconds(Random.Range(3f, 8f));
 // Occasionally look at camera (rotate toward Z-)
 if (Random.value < 0.3f)
 {
 transform.rotation = Quaternion.Euler(0, 180f, 0);
 yield return new WaitForSeconds(1.5f);
 }
 }
 }

 private IEnumerator WalkTo(Vector3 target)
 {
 target.y = _basePos.y;
 IsMoving = true;
 while (Vector3.Distance(transform.position, target) > arrivalDist)
 {
 // Rotate toward target
 var dir = (target - transform.position).normalized;
 if (dir != Vector3.zero)
 {
 var look = Quaternion.LookRotation(dir);
 transform.rotation = Quaternion.Slerp(
 transform.rotation, look,
 Time.deltaTime * rotateSpeed);
 }
 // Move
 transform.position = Vector3.MoveTowards(
 transform.position, target,
 moveSpeed * Time.deltaTime);
 yield return null;
 }
 IsMoving = false;
 }

 private static string NextStatus(string role, string current)
 {
 switch (role)
 {
 case "planner": return "PLANNING";
 case "worker": return "DOING";
 case "tester":
 return (Random.value < 0.15f) ? "REWORK" : "DONE";
 default: return "DONE";
 }
 }
}
