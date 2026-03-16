using UnityEngine;
using UnityEngine.AI;
using System.Collections;
using System.Collections.Generic;

public class BotMover : MonoBehaviour
{
    private enum BotPhase { Idle, Moving, Working }

    [Header("Movement")]
    public float moveSpeed = 2.5f;
    public float rotateSpeed = 8.0f;
    public float arrivalDist = 0.25f;
    public float repathTimeout = 2.5f;
    public float walkTimeout = 20f;

    [Header("Idle bob")]
    public float bobAmplitude = 0.04f;
    public float bobFrequency = 1.4f;
    public float idleYawAmplitude = 5f;
    public float idleYawFrequency = 0.65f;

    [Header("Eye lights")]
    public List<Light> eyeLights = new List<Light>();

    // State
    public bool IsMoving { get; private set; }
    public bool IsBusy { get; private set; }
    public bool IsIdleState => _phase == BotPhase.Idle && !IsBusy && !IsMoving;

    private BotPhase _phase = BotPhase.Idle;
    private Vector3 _basePos;
    private Quaternion _baseRot;
    private float _time;
    private ApiClient _api;
    private NavMeshAgent _agent;

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
    private readonly List<Vector3> _roamTargets = new List<Vector3>();

    void Start()
    {
        _basePos = transform.position;
        _baseRot = transform.rotation;
        idlePos = transform.position;
        _api = FindObjectOfType<ApiClient>();

        _agent = GetComponent<NavMeshAgent>() ?? gameObject.AddComponent<NavMeshAgent>();
        _agent.speed = moveSpeed;
        _agent.angularSpeed = 360f * rotateSpeed;
        _agent.acceleration = Mathf.Max(8f, moveSpeed * 4f);
        _agent.stoppingDistance = Mathf.Max(0.05f, arrivalDist);
        _agent.updateRotation = true;
        _agent.autoBraking = true;

        if (!TrySampleOnNavMesh(transform.position, out var snappedStart))
            snappedStart = transform.position;
        transform.position = snappedStart;
        _agent.Warp(snappedStart);
        _basePos = snappedStart;

        BuildRoamTargets();
        StartCoroutine(IdleRoam());
    }

    void Update()
    {
        _time += Time.deltaTime;

        // Eye pulse
        foreach (var lt in eyeLights)
        {
            if (lt == null) continue;
            float pulseFreq = _phase == BotPhase.Working ? 6f : 2.2f;
            float pulseAmp = _phase == BotPhase.Working ? 1.15f : 0.8f;
            lt.intensity = 2.0f + Mathf.Sin(_time * pulseFreq + GetInstanceID() * 0.9f) * pulseAmp;
        }

        // Idle body bob + micro sway
        if (_phase == BotPhase.Idle && !IsMoving && !IsBusy)
        {
            float phase = GetInstanceID() * 1.1f;
            float bob = Mathf.Sin(_time * bobFrequency + phase) * bobAmplitude;
            float yaw = Mathf.Sin(_time * idleYawFrequency + phase * 0.7f) * idleYawAmplitude;

            var p = transform.position;
            p.y = _basePos.y + bob;
            transform.position = p;
            transform.rotation = _baseRot * Quaternion.Euler(0f, yaw, 0f);
        }
    }

    public void SetRole(string role) => _botRole = role;

    public void AssignTask(TaskItem task)
    {
        if (IsBusy || task == null) return;
        _currentTask = task;
        IsBusy = true;
        _phase = BotPhase.Moving;
        StopCoroutine("IdleRoam");
        StartCoroutine(TaskRoutine());
    }

    private IEnumerator TaskRoutine()
    {
        yield return WalkTo(boardPos);
        yield return new WaitForSeconds(0.7f);

        yield return WalkTo(deskPos);

        _phase = BotPhase.Working;
        IsMoving = false;

        float workTime = 2.5f;
        float t = 0f;
        while (t < workTime)
        {
            t += Time.deltaTime;
            float bob = Mathf.Sin(t * 6f) * 0.06f;
            var p = transform.position;
            p.y = _basePos.y + bob;
            transform.position = p;
            yield return null;
        }

        string next = NextStatus(_botRole, _currentTask.status);
        _currentTask.status = next;
        if (_api != null)
            yield return _api.PatchTask(_currentTask.id, next);

        _phase = BotPhase.Moving;

        if (next == "DONE" || next == "REVIEW")
            yield return WalkTo(donePos);

        yield return WalkTo(idlePos);

        _currentTask = null;
        IsBusy = false;
        IsMoving = false;
        _phase = BotPhase.Idle;
        _baseRot = transform.rotation;
        StartCoroutine(IdleRoam());
    }

    private IEnumerator IdleRoam()
    {
        yield return new WaitForSeconds(Random.Range(2f, 5f));
        while (!IsBusy)
        {
            _phase = BotPhase.Moving;
            var target = _roamTargets.Count > 0
                ? _roamTargets[Random.Range(0, _roamTargets.Count)]
                : idlePos;
            yield return WalkTo(target, false);

            _phase = BotPhase.Idle;
            yield return new WaitForSeconds(Random.Range(3f, 8f));

            if (Random.value < 0.3f)
            {
                transform.rotation = Quaternion.Euler(0, 180f, 0);
                _baseRot = transform.rotation;
                yield return new WaitForSeconds(1.5f);
            }
        }
    }

    private IEnumerator WalkTo(Vector3 target, bool verboseWarnings = true)
    {
        if (_agent == null)
        {
            if (verboseWarnings)
                Debug.LogWarning($"[BotMover:{name}] NavMeshAgent missing, fallback to direct move.");
            yield break;
        }

        IsMoving = true;
        _phase = IsBusy ? BotPhase.Moving : _phase;

        if (!TrySampleOnNavMesh(target, out var snappedTarget))
        {
            if (verboseWarnings)
                Debug.LogWarning($"[BotMover:{name}] Target {target} unreachable on NavMesh, fallback to idlePos.");
            TrySampleOnNavMesh(idlePos, out snappedTarget);
        }

        var path = new NavMeshPath();
        if (!_agent.CalculatePath(snappedTarget, path) || path.status != NavMeshPathStatus.PathComplete)
        {
            if (verboseWarnings)
                Debug.LogWarning($"[BotMover:{name}] Path to {snappedTarget} is incomplete, fallback to idlePos.");
            if (!TrySampleOnNavMesh(idlePos, out snappedTarget) || !_agent.CalculatePath(snappedTarget, path) || path.status != NavMeshPathStatus.PathComplete)
            {
                IsMoving = false;
                _phase = IsBusy ? BotPhase.Working : BotPhase.Idle;
                yield break;
            }
        }

        _agent.isStopped = false;
        _agent.SetPath(path);

        float elapsed = 0f;
        float stuckElapsed = 0f;
        float lastRemaining = Mathf.Infinity;
        bool repathTried = false;

        while (elapsed < walkTimeout)
        {
            elapsed += Time.deltaTime;

            if (!_agent.pathPending)
            {
                float remaining = _agent.remainingDistance;
                if (remaining <= _agent.stoppingDistance + 0.02f)
                {
                    if (!_agent.hasPath || _agent.velocity.sqrMagnitude < 0.01f)
                        break;
                }

                if (remaining >= lastRemaining - 0.01f)
                {
                    stuckElapsed += Time.deltaTime;
                    if (stuckElapsed > repathTimeout)
                    {
                        if (!repathTried)
                        {
                            repathTried = true;
                            stuckElapsed = 0f;
                            _agent.ResetPath();
                            _agent.SetDestination(snappedTarget);
                        }
                        else
                        {
                            if (verboseWarnings)
                                Debug.LogWarning($"[BotMover:{name}] Stuck while moving to {snappedTarget}. Fallback to idle.");
                            if (TrySampleOnNavMesh(idlePos, out var fallbackPos) && _agent.CalculatePath(fallbackPos, path) && path.status == NavMeshPathStatus.PathComplete)
                            {
                                _agent.ResetPath();
                                _agent.SetPath(path);
                                repathTried = false;
                                stuckElapsed = 0f;
                                snappedTarget = fallbackPos;
                                continue;
                            }
                            break;
                        }
                    }
                }
                else
                {
                    stuckElapsed = 0f;
                    lastRemaining = remaining;
                }
            }

            yield return null;
        }

        _agent.isStopped = true;
        _agent.ResetPath();

        var pos = transform.position;
        _basePos = new Vector3(pos.x, pos.y, pos.z);
        _baseRot = transform.rotation;
        IsMoving = false;
    }

    private void BuildRoamTargets()
    {
        _roamTargets.Clear();
        for (int i = 0; i < RoamGrid.Length; i++)
        {
            if (!TrySampleOnNavMesh(RoamGrid[i], out var snapped)) continue;
            var path = new NavMeshPath();
            if (_agent != null && _agent.CalculatePath(snapped, path) && path.status == NavMeshPathStatus.PathComplete)
                _roamTargets.Add(snapped);
        }

        if (_roamTargets.Count == 0 && TrySampleOnNavMesh(idlePos, out var idleSnapped))
            _roamTargets.Add(idleSnapped);
    }

    private static bool TrySampleOnNavMesh(Vector3 point, out Vector3 snapped)
    {
        if (NavMesh.SamplePosition(point, out var hit, 1.8f, NavMesh.AllAreas))
        {
            snapped = hit.position;
            return true;
        }
        snapped = point;
        return false;
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
