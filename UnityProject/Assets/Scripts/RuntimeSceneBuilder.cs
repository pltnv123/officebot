// OfficeBot Multi-Agent System v2.0
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.Rendering;
using UnityEngine.AI;

namespace OfficeHub
{
public sealed class RuntimeSceneBuilder : MonoBehaviour
{
    private readonly List<GameObject> _agents = new();
    private readonly List<Vector3> _agentIdle = new();
    private readonly List<Transform> _labelXforms = new();
    private readonly List<Transform> _agentHeads = new();
    private readonly List<Renderer> _agentEyeRenderers = new();
    private readonly List<Color> _agentEyeBaseColors = new();
    private readonly List<float> _agentWorkBlend = new();
    private readonly List<bool> _agentWorkingTarget = new();
    private readonly List<TextMesh> _liveTaskLabels = new();
    private readonly List<Renderer> _assigneeDotRenderers = new();
    private readonly List<Renderer> _boardCardRenderers = new();
    private readonly List<int> _boardCardColumns = new();
    private readonly Color[] _columnHighlightColors = new Color[6];
    private TextMesh _wipText, _queueText, _blockersText, _throughputText;
    private float _t;
    private readonly string[] _agentRoles = { "chief", "planner", "worker", "tester" };
    private static readonly Color _boardCardBaseColor = new Color(0.28f, 0.28f, 0.28f);
    private static readonly Dictionary<string, int> StatusToColumn = new(System.StringComparer.OrdinalIgnoreCase)
    {
        ["inbox"] = 0,
        ["queue"] = 1,
        ["plan"] = 2,
        ["planning"] = 2,
        ["work"] = 3,
        ["doing"] = 3,
        ["review"] = 4,
        ["rework"] = 4,
        ["done"] = 5
    };

    [SerializeField] private string taskStateUrl = "/api/state";
    private NavMeshData _runtimeNavMeshData;
    private readonly List<NavMeshBuildSource> _navSources = new();

    private void Start()
    {
        SetupCamera();
        BuildRoom();
        BuildBoard();
        BuildZones();
        BuildAgents();
        BuildRuntimeNavMesh();
        BuildLighting();
        WireBackend();
        StartCoroutine(PollTaskState());
    }

    private void Update()
    {
        _t += Time.deltaTime;
        var cam = Camera.main;

        for (int i = 0; i < _agents.Count; i++)
        {
            var go = _agents[i];
            if (go == null) continue;

            var p = i < _agentIdle.Count ? _agentIdle[i] : go.transform.position;
            var targetWorking = i < _agentWorkingTarget.Count && _agentWorkingTarget[i];
            var currentBlend = i < _agentWorkBlend.Count ? _agentWorkBlend[i] : 0f;
            currentBlend = Mathf.MoveTowards(currentBlend, targetWorking ? 1f : 0f, Time.deltaTime * 2.2f);
            if (i < _agentWorkBlend.Count) _agentWorkBlend[i] = currentBlend;

            float baseFreq = 1.6f;
            float workFreq = baseFreq * 2f;
            float bobFreq = Mathf.Lerp(baseFreq, workFreq, currentBlend);
            float bobAmp = 0.05f;
            float bob = Mathf.Sin(_t * bobFreq + i * 0.9f) * bobAmp;
            go.transform.position = new Vector3(p.x, p.y + bob, p.z);

            var head = i < _agentHeads.Count ? _agentHeads[i] : null;
            if (head != null)
            {
                float headYaw = Mathf.Sin(_t * (Mathf.PI * 2f / 3f) + i * 0.6f) * 5f;
                var targetHeadRot = Quaternion.Euler(0f, headYaw, 0f);
                head.localRotation = Quaternion.Slerp(head.localRotation, targetHeadRot, Time.deltaTime * 4f);
            }

            var eyeRenderer = i < _agentEyeRenderers.Count ? _agentEyeRenderers[i] : null;
            if (eyeRenderer != null)
            {
                float pulse = 0.8f;
                if (currentBlend > 0.001f)
                {
                    float pulse01 = (Mathf.Sin(_t * (Mathf.PI * 2f / 0.5f) + i * 0.8f) + 1f) * 0.5f;
                    float workingPulse = Mathf.Lerp(0.8f, 1.5f, pulse01);
                    pulse = Mathf.Lerp(0.8f, workingPulse, currentBlend);
                }
                var baseColor = i < _agentEyeBaseColors.Count ? _agentEyeBaseColors[i] : Color.white;
                eyeRenderer.material.color = baseColor * pulse;
            }
        }

        if (cam == null) return;
        foreach (var lx in _labelXforms)
        {
            if (lx == null) continue;
            var d = cam.transform.position - lx.position;
            if (d.sqrMagnitude > 0.001f)
                lx.rotation = Quaternion.LookRotation(-d.normalized, Vector3.up);
        }
    }

    private static void SetupCamera()
    {
        var cam = Camera.main;
        if (cam == null) return;
        cam.orthographic = false;
        cam.fieldOfView = 63f;
        cam.transform.position = new Vector3(0f, 13f, -9f);
        cam.transform.rotation = Quaternion.Euler(47f, 0f, 0f);
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.08f, 0.07f, 0.06f);
        cam.nearClipPlane = 0.3f;
        cam.farClipPlane = 140f;
    }

    private void BuildRoom()
    {
        var floor = Mat(new Color(0.65f, 0.50f, 0.30f), 0.08f);
        Cube("Floor", new Vector3(0f, -0.05f, 3f), new Vector3(24f, 0.1f, 18f), floor);

        var navCenter = Mat(new Color(0.98f, 0.58f, 0.24f), 0.05f);
        var navLeft = Mat(new Color(0.30f, 0.58f, 1.00f), 0.05f);
        var navRight = Mat(new Color(0.20f, 0.90f, 0.52f), 0.05f);
        Cube("PathBoardDesk", new Vector3(0f, -0.01f, 5f), new Vector3(2.2f, 0.02f, 8.2f), navCenter);      // center corridor
        Cube("PathDeskWorker", new Vector3(-3.5f, -0.01f, 1.5f), new Vector3(7.2f, 0.02f, 2.2f), navLeft); // left corridor
        Cube("PathDeskMonitoring", new Vector3(3.5f, -0.01f, 1.5f), new Vector3(7.2f, 0.02f, 2.2f), navRight); // right corridor
        Cube("PathMonitoringRoom2", new Vector3(9f, -0.01f, 5f), new Vector3(2.2f, 0.02f, 6.2f), navCenter); // room2 corridor

        var wall = Mat(new Color(0.24f, 0.18f, 0.14f), 0.14f);
        // Back wall with a real doorway opening to Room 2 (right-rear)
        Cube("BackWallLeft", new Vector3(-3.4f, 2.5f, 10f), new Vector3(17.2f, 5f, 0.25f), wall);
        Cube("BackWallRight", new Vector3(10.2f, 2.5f, 10f), new Vector3(3.6f, 5f, 0.25f), wall);
        Cube("BackWallTopLintel", new Vector3(8.0f, 4.35f, 10f), new Vector3(2.8f, 1.3f, 0.25f), wall);

        var depthWallMat = Mat(new Color(0.15f, 0.12f, 0.08f), 0.12f);
        Cube("DepthBackWallLeft", new Vector3(-3.4f, 3f, 9f), new Vector3(17.2f, 6f, 0.3f), depthWallMat);
        Cube("DepthBackWallRight", new Vector3(10.2f, 3f, 9f), new Vector3(3.6f, 6f, 0.3f), depthWallMat);
        Cube("DepthBackWallTopLintel", new Vector3(8.0f, 4.8f, 9f), new Vector3(2.8f, 2.4f, 0.3f), depthWallMat);
        Cube("LeftWall", new Vector3(-10.8f, 2.5f, 3f), new Vector3(0.55f, 5f, 18f), wall);
        Cube("RightWall", new Vector3(10.8f, 2.5f, 3f), new Vector3(0.55f, 5f, 18f), wall);

        var shelf = Mat(new Color(0.32f, 0.27f, 0.20f), 0.1f);
        Cube("ShelfA", new Vector3(-11.6f, 2.0f, 1.0f), new Vector3(0.4f, 0.12f, 4.2f), shelf);
        Cube("ShelfB", new Vector3(-11.6f, 2.8f, 1.0f), new Vector3(0.4f, 0.12f, 4.2f), shelf);
    }

    private void BuildBoard()
    {
        float boardZ = 9.1f;
        Cube("TaskBoardFrame", new Vector3(0f, 3.5f, 9.0f), new Vector3(16.4f, 5.4f, 0.15f), Mat(new Color(0.25f, 0.22f, 0.15f), 0.10f));
        Cube("TaskBoard", new Vector3(0f, 3.5f, boardZ), new Vector3(16f, 5f, 0.25f), Mat(new Color(0.08f, 0.08f, 0.12f), 0.08f));

        string[] headers = { "INBOX", "QUEUE", "PLAN", "WORK", "REVIEW", "DONE" };
        float[] xs = { -5.5f, -3.3f, -1.1f, 1.1f, 3.3f, 5.5f };
        float[] ys = { 4.8f, 4.1f, 3.4f, 2.7f };
        Color[] headerCols =
        {
            new Color(0.5f, 0.5f, 0.55f),
            new Color(0.95f, 0.75f, 0.0f),
            new Color(0.2f, 0.45f, 0.95f),
            new Color(0.95f, 0.45f, 0.05f),
            new Color(0.65f, 0.15f, 0.85f),
            new Color(0.1f, 0.75f, 0.2f)
        };

        for (int hi = 0; hi < headerCols.Length && hi < _columnHighlightColors.Length; hi++)
            _columnHighlightColors[hi] = headerCols[hi];

        for (int c = 0; c < headers.Length; c++)
        {
            float x = xs[c];
            Cube($"BoardDivider_{c}", new Vector3(x - 1.1f, 3.5f, 8.98f), new Vector3(0.08f, 4.5f, 0.1f), Mat(new Color(0.2f, 0.2f, 0.24f), 0.05f));
            Txt($"Hdr{c}", headers[c], new Vector3(x, 5.5f, 8.88f), 24, 0.12f, headerCols[c], FontStyle.Bold);

            for (int r = 0; r < ys.Length; r++)
            {
                float shade = (r % 2 == 0) ? 0.60f : 0.42f;
                Color cardColor = Color.Lerp(Color.black, headerCols[c], shade);
                var card = Cube($"Card_{c}_{r}", new Vector3(x, ys[r], 8.96f), new Vector3(1.7f, 0.55f, 0.06f), Mat(cardColor, 0.04f));
                var renderer = card.GetComponent<Renderer>();
                if (renderer != null)
                {
                    _boardCardRenderers.Add(renderer);
                    _boardCardColumns.Add(c);
                }
                _liveTaskLabels.Add(Txt($"Task_{c}_{r}", "", new Vector3(x + 0.12f, ys[r], 8.87f), 9, 0.07f, Color.white));

                var dot = Cube($"AssigneeDot_{c}_{r}", new Vector3(x - 0.72f, ys[r], 8.88f), new Vector3(0.12f, 0.12f, 0.03f), Mat(new Color(0.35f, 0.35f, 0.35f), 0.02f));
                var dotRenderer = dot.GetComponent<Renderer>();
                if (dotRenderer != null) _assigneeDotRenderers.Add(dotRenderer);
            }

            // Extra sticky strips to keep board visually dense even with few live tasks.
            Cube($"StickyA_{c}", new Vector3(x - 0.45f, 2.1f, 8.95f), new Vector3(0.62f, 0.24f, 0.03f), Mat(Color.Lerp(headerCols[c], Color.white, 0.25f), 0.03f));
            Cube($"StickyB_{c}", new Vector3(x + 0.35f, 2.1f, 8.95f), new Vector3(0.58f, 0.22f, 0.03f), Mat(Color.Lerp(headerCols[c], Color.white, 0.4f), 0.03f));
        }

        _wipText = Txt("WIP", "WIP 00", new Vector3(-2.0f, 1.0f, 8.9f), 10, 0.08f, new Color(1f, 0.93f, 0.72f), FontStyle.Bold);
        _queueText = Txt("QUEUE", "QUEUE 00", new Vector3(-6.7f, 1.0f, 8.9f), 9, 0.08f, new Color(0.92f, 0.86f, 0.68f));
        _blockersText = Txt("BLK", "BLOCKERS 0", new Vector3(2.0f, 1.0f, 8.9f), 9, 0.08f, new Color(1f, 0.74f, 0.66f));
        _throughputText = Txt("THRU", "THROUGHPUT 0", new Vector3(6.8f, 1.0f, 8.9f), 9, 0.08f, new Color(0.74f, 0.90f, 1f));
    }

    private void BuildZones()
    {
        var roomGlow = Emissive(new Color(0.50f, 0.28f, 0.08f), new Color(1.0f, 0.62f, 0.08f), 4.0f);
        Cube("Room2FrameOuter", new Vector3(6.6f, 2.0f, 8.7f), new Vector3(3.1f, 4.5f, 0.24f), roomGlow);
        Cube("Room2Inner", new Vector3(6.6f, 2.0f, 8.75f), new Vector3(2.1f, 3.7f, 0.15f), Mat(new Color(0.15f, 0.12f, 0.08f), 0.08f));
        Cube("Room2TopGlow", new Vector3(6.6f, 4.1f, 8.65f), new Vector3(2.8f, 0.15f, 0.1f), roomGlow);
        Cube("Room2LeftGlow", new Vector3(5.25f, 2.0f, 8.65f), new Vector3(0.15f, 3.7f, 0.1f), roomGlow);
        Cube("Room2RightGlow", new Vector3(7.95f, 2.0f, 8.65f), new Vector3(0.15f, 3.7f, 0.1f), roomGlow);

        Cube("Room2Arrow", new Vector3(6.6f, 4.95f, 8.6f), new Vector3(0.9f, 0.08f, 0.9f), Emissive(new Color(0.4f, 0.2f, 0.05f), new Color(1.0f, 0.7f, 0.1f), 2.8f)).transform.rotation = Quaternion.Euler(0f, 45f, 0f);
        var roomLbl = Txt("Room2Lbl", "ROOM 2", new Vector3(6.6f, 5.35f, 8.6f), 20, 0.12f, new Color(1.0f, 0.7f, 0.1f), FontStyle.Bold);
        _labelXforms.Add(roomLbl.transform);

        // Room 2 interior behind the doorway
        var room2Floor = Mat(new Color(0.58f, 0.42f, 0.22f), 0.08f);
        Cube("Room2Floor", new Vector3(6.6f, -0.05f, 10.9f), new Vector3(2.8f, 0.1f, 2.2f), room2Floor);
        Cube("Room2BackWall", new Vector3(6.6f, 2.2f, 12.0f), new Vector3(2.8f, 4.4f, 0.25f), Mat(new Color(0.26f, 0.19f, 0.13f), 0.12f));
        Cube("Room2LeftWall", new Vector3(5.2f, 2.2f, 10.9f), new Vector3(0.25f, 4.4f, 2.2f), Mat(new Color(0.22f, 0.16f, 0.11f), 0.10f));
        Cube("Room2RightWall", new Vector3(8.0f, 2.2f, 10.9f), new Vector3(0.25f, 4.4f, 2.2f), Mat(new Color(0.22f, 0.16f, 0.11f), 0.10f));
        Cube("Room2Ceiling", new Vector3(6.6f, 4.35f, 10.9f), new Vector3(2.8f, 0.12f, 2.2f), Mat(new Color(0.18f, 0.13f, 0.09f), 0.06f));

        // Interior props + two gray sub agents
        Cube("Room2Desk", new Vector3(6.6f, 0.42f, 11.4f), new Vector3(1.6f, 0.84f, 0.9f), Mat(new Color(0.45f, 0.33f, 0.20f), 0.12f));
        BuildStaticSubAgent(new Vector3(6.1f, 0f, 10.5f), "SUB-AGENT-1");
        BuildStaticSubAgent(new Vector3(7.1f, 0f, 10.5f), "SUB-AGENT-2");

        Cube("DispatchDesk", new Vector3(-6.5f, 0.45f, 5f), new Vector3(2.5f, 0.9f, 1.2f), Mat(new Color(0.45f, 0.28f, 0.10f), 0.12f));
        Cube("DispatchPanel", new Vector3(-7.3f, 0.8f, 5f), new Vector3(0.3f, 1.6f, 1.2f), Mat(new Color(0.3f, 0.18f, 0.06f), 0.12f));
        Cube("DispatchTerminal", new Vector3(-6.5f, 1.2f, 4.5f), new Vector3(0.8f, 0.55f, 0.06f), Mat(new Color(0.05f, 0.05f, 0.12f), 0.1f));
        Cube("DispatchTerminalGlow", new Vector3(-6.5f, 1.2f, 4.44f), new Vector3(0.7f, 0.45f, 0.02f), Emissive(new Color(0.4f, 0.2f, 0.05f), new Color(0.8f, 0.5f, 0.05f), 2.0f));
        Cube("DispatchBox1", new Vector3(-5.5f, 0.3f, 5.5f), new Vector3(0.7f, 0.6f, 0.6f), Mat(new Color(0.7f, 0.55f, 0.25f), 0.05f));
        Cube("DispatchBox2", new Vector3(-5.5f, 0.9f, 5.5f), new Vector3(0.6f, 0.5f, 0.55f), Mat(new Color(0.65f, 0.5f, 0.2f), 0.05f));
        Cube("DispatchBox3", new Vector3(-5.2f, 0.3f, 4.8f), new Vector3(0.55f, 0.55f, 0.5f), Mat(new Color(0.72f, 0.58f, 0.28f), 0.05f));
        Cube("DispatchBox4", new Vector3(-6.1f, 0.35f, 5.7f), new Vector3(0.62f, 0.70f, 0.58f), Mat(new Color(0.68f, 0.50f, 0.22f), 0.05f));
        Cube("DispatchBox5", new Vector3(-6.8f, 0.32f, 4.2f), new Vector3(0.46f, 0.62f, 0.50f), Mat(new Color(0.76f, 0.58f, 0.30f), 0.05f));
        Cube("DispatchZoneGlow", new Vector3(-6.5f, 0.02f, 5f), new Vector3(3.8f, 0.03f, 3.8f), Emissive(new Color(0.35f, 0.18f, 0.03f), new Color(1.0f, 0.50f, 0.04f), 2.6f));
        var dispatchLbl = Txt("DispatchLbl", "DISPATCH", new Vector3(-6.5f, 2.5f, 5f), 16, 0.10f, new Color(1.0f, 0.55f, 0.0f), FontStyle.Bold);
        _labelXforms.Add(dispatchLbl.transform);

        Cube("CentralDesk", new Vector3(0f, 0.40f, 1f), new Vector3(4f, 0.8f, 2.5f), Mat(new Color(0.55f, 0.35f, 0.15f), 0.18f));
        Cube("DeskPaperA", new Vector3(-0.55f, 0.72f, 0.75f), new Vector3(0.8f, 0.02f, 0.6f), Mat(new Color(0.92f, 0.90f, 0.82f), 0.03f));
        Cube("DeskPaperB", new Vector3(0.45f, 0.72f, 1.2f), new Vector3(0.9f, 0.02f, 0.6f), Mat(new Color(0.92f, 0.90f, 0.82f), 0.03f));
        Cube("DeskMug", new Vector3(-1.2f, 0.82f, 1.28f), new Vector3(0.22f, 0.24f, 0.22f), Mat(new Color(0.85f, 0.42f, 0.18f), 0.04f));
        Cube("DeskTablet", new Vector3(1.0f, 0.80f, 0.82f), new Vector3(0.72f, 0.04f, 0.52f), Mat(new Color(0.08f, 0.08f, 0.12f), 0.2f));
        Cube("DeskStickyA", new Vector3(-0.10f, 0.82f, 1.32f), new Vector3(0.28f, 0.02f, 0.22f), Mat(new Color(1.0f, 0.88f, 0.35f), 0.02f));
        Cube("DeskStickyB", new Vector3(0.22f, 0.82f, 0.68f), new Vector3(0.24f, 0.02f, 0.20f), Mat(new Color(0.95f, 0.65f, 0.28f), 0.02f));

        Cube("MonitoringWall", new Vector3(8.25f, 2.1f, 5f), new Vector3(0.28f, 4.2f, 3.8f), Mat(new Color(0.10f, 0.10f, 0.14f), 0.12f));
        Cube("Mon1", new Vector3(7.88f, 2.95f, 4.1f), new Vector3(1.75f, 1.05f, 0.12f), Mat(new Color(0.04f, 0.04f, 0.08f), 0.2f));
        Cube("Mon1Screen", new Vector3(7.82f, 2.95f, 4.05f), new Vector3(1.48f, 0.86f, 0.03f), Emissive(new Color(0.0f, 0.25f, 0.10f), new Color(0.15f, 0.95f, 0.42f), 3.0f));
        Cube("Mon2", new Vector3(7.88f, 1.65f, 4.1f), new Vector3(1.75f, 1.05f, 0.12f), Mat(new Color(0.04f, 0.04f, 0.08f), 0.2f));
        Cube("Mon2Screen", new Vector3(7.82f, 1.65f, 4.05f), new Vector3(1.48f, 0.86f, 0.03f), Emissive(new Color(0.0f, 0.24f, 0.12f), new Color(0.12f, 0.88f, 0.35f), 2.8f));
        Cube("Mon3", new Vector3(7.88f, 2.30f, 5.35f), new Vector3(1.75f, 1.05f, 0.12f), Mat(new Color(0.04f, 0.04f, 0.08f), 0.2f));
        Cube("Mon3Screen", new Vector3(7.82f, 2.30f, 5.30f), new Vector3(1.48f, 0.86f, 0.03f), Emissive(new Color(0.0f, 0.24f, 0.12f), new Color(0.10f, 0.90f, 0.40f), 2.9f));
        Cube("MonitoringDesk", new Vector3(7.5f, 0.5f, 5f), new Vector3(2.0f, 1.0f, 1.5f), Mat(new Color(0.25f, 0.25f, 0.32f), 0.1f));
        Cube("MonitoringZoneGlow", new Vector3(6.5f, 0.02f, 5f), new Vector3(3.5f, 0.03f, 3.5f), Mat(new Color(0.0f, 0.16f, 0.06f), 0.02f));
        var monitoringLbl = Txt("MonitoringLbl", "MONITORING", new Vector3(7f, 3.8f, 5f), 14, 0.10f, new Color(0.15f, 1.0f, 0.45f), FontStyle.Bold);
        _labelXforms.Add(monitoringLbl.transform);

        Vector3[] plantBases =
        {
            new Vector3(-8.5f, 0f, 7.5f),
            new Vector3(6.5f, 0f, 7.5f),
            new Vector3(-8.5f, 0f, 1f),
            new Vector3(-1.5f, 0f, 7f),
            new Vector3(2.8f, 0f, 7.4f)
        };
        for (int i = 0; i < plantBases.Length; i++)
        {
            Cyl($"PlantPot_{i}", new Vector3(plantBases[i].x, 0.25f, plantBases[i].z), new Vector3(0.42f, 0.55f, 0.42f), Mat(new Color(0.55f, 0.32f, 0.12f), 0.08f));
            Cube($"PlantLeaves_{i}", new Vector3(plantBases[i].x, 0.74f, plantBases[i].z), new Vector3(0.88f, 0.95f, 0.88f), Mat(new Color(0.18f, 0.68f, 0.18f), 0.05f));
        }

        Vector3[] dispatchDots = { new Vector3(-4f, 0.02f, 3f), new Vector3(-4.7f, 0.02f, 3.7f), new Vector3(-5.3f, 0.02f, 4.3f), new Vector3(-6f, 0.02f, 5f) };
        Vector3[] boardDots = { new Vector3(-1f, 0.02f, 3f), new Vector3(-0.7f, 0.02f, 4.6f), new Vector3(-0.3f, 0.02f, 6.2f), new Vector3(0f, 0.02f, 7.8f) };
        Vector3[] monDots = { new Vector3(3f, 0.02f, 3f), new Vector3(4f, 0.02f, 3.7f), new Vector3(5f, 0.02f, 4.3f), new Vector3(6f, 0.02f, 5f) };

        foreach (var p in dispatchDots)
            Cube("DotDispatch", p, new Vector3(0.42f, 0.025f, 0.42f), Emissive(new Color(0.4f, 0.2f, 0.03f), new Color(1.0f, 0.58f, 0.08f), 2.0f)).transform.rotation = Quaternion.Euler(0f, 45f, 0f);
        foreach (var p in boardDots)
            Cube("DotBoard", p, new Vector3(0.42f, 0.025f, 0.42f), Emissive(new Color(0.1f, 0.2f, 0.4f), new Color(0.35f, 0.65f, 1.0f), 2.0f)).transform.rotation = Quaternion.Euler(0f, 45f, 0f);
        foreach (var p in monDots)
            Cube("DotMonitoring", p, new Vector3(0.42f, 0.025f, 0.42f), Emissive(new Color(0.05f, 0.25f, 0.12f), new Color(0.15f, 0.95f, 0.45f), 2.0f)).transform.rotation = Quaternion.Euler(0f, 45f, 0f);

        Cube("DeskLampStem", new Vector3(1.3f, 1.00f, 1.3f), new Vector3(0.07f, 0.55f, 0.07f), Mat(new Color(0.18f, 0.18f, 0.20f), 0.2f));
        Cube("DeskLampHead", new Vector3(1.3f, 1.30f, 1.3f), new Vector3(0.22f, 0.14f, 0.22f), Emissive(new Color(0.25f, 0.18f, 0.10f), new Color(1f, 0.72f, 0.35f), 2.2f));
    }


    private void BuildStaticSubAgent(Vector3 pos, string label)
    {
        var root = new GameObject(label);
        root.transform.position = pos;
        root.transform.rotation = Quaternion.Euler(0f, 180f, 0f);

        var grayBody = Mat(new Color(0.70f, 0.70f, 0.72f), 0.10f);
        var dark = Mat(new Color(0.12f, 0.12f, 0.14f), 0.05f);
        var eye = Emissive(new Color(0.25f, 0.25f, 0.28f), new Color(0.85f, 0.85f, 0.9f), 1.2f);

        Go(root, PrimitiveType.Cylinder, "Base", new Vector3(0f, 0.14f, 0f), new Vector3(0.45f, 0.08f, 0.45f), dark);
        Go(root, PrimitiveType.Cube, "Body", new Vector3(0f, 0.58f, 0f), new Vector3(0.52f, 0.50f, 0.40f), grayBody);
        Go(root, PrimitiveType.Sphere, "Head", new Vector3(0f, 1.18f, 0f), new Vector3(0.44f, 0.40f, 0.40f), grayBody);
        Go(root, PrimitiveType.Cube, "Face", new Vector3(0f, 1.18f, 0.20f), new Vector3(0.34f, 0.24f, 0.05f), dark);
        Go(root, PrimitiveType.Sphere, "EyeL", new Vector3(-0.09f, 1.18f, 0.23f), new Vector3(0.12f, 0.12f, 0.06f), eye);
        Go(root, PrimitiveType.Sphere, "EyeR", new Vector3(0.09f, 1.18f, 0.23f), new Vector3(0.12f, 0.12f, 0.06f), eye);

        var lbl = Txt(label + "Lbl", label, pos + new Vector3(0f, 1.65f, 0f), 12, 0.06f, new Color(0.90f, 0.90f, 0.94f), FontStyle.Bold);
        _labelXforms.Add(lbl.transform);
    }

    private void BuildAgents()
    {
        BuildAgent(new Vector3(0.5f, 0f, 2.5f), "CHIEF", new Color(1.00f, 0.85f, 0.35f), 0f);
        BuildAgent(new Vector3(-1.5f, 0f, 2.5f), "PLANNER", new Color(0.35f, 0.65f, 1.00f), 20f);
        BuildAgent(new Vector3(-4f, 0f, 4f), "WORKER", new Color(0.20f, 0.95f, 0.72f), 45f);
        BuildAgent(new Vector3(4f, 0f, 4f), "TESTER", new Color(0.45f, 1.00f, 0.65f), -45f);
    }

    private void BuildAgent(Vector3 pos, string role, Color eyeCol, float rotY)
    {
        var root = new GameObject(role);
        root.transform.position = pos;
        root.transform.rotation = Quaternion.Euler(0f, rotY, 0f);

        Color body = new Color(0.85f, 0.85f, 0.88f);
        Color dark = new Color(0.10f, 0.10f, 0.12f);

        Go(root, PrimitiveType.Cylinder, "Base", new Vector3(0f, 0.16f, 0f), new Vector3(0.6f, 0.10f, 0.6f), Mat(dark));
        Go(root, PrimitiveType.Cube, "Body", new Vector3(0f, 0.72f, 0f), new Vector3(0.76f, 0.66f, 0.56f), Mat(body));
        var head = Go(root, PrimitiveType.Sphere, "Head", new Vector3(0f, 1.54f, 0f), new Vector3(0.65f, 0.60f, 0.58f), Mat(body));
        Go(root, PrimitiveType.Cube, "Face", new Vector3(0f, 1.54f, 0.30f), new Vector3(0.55f, 0.42f, 0.06f), Mat(dark));

        var eyeMat = Emissive(eyeCol * 0.2f, eyeCol, 6f);
        var eyeL = Go(root, PrimitiveType.Sphere, "EyeL", new Vector3(-0.15f, 1.54f, 0.34f), new Vector3(0.26f, 0.26f, 0.12f), eyeMat);
        Go(root, PrimitiveType.Sphere, "EyeR", new Vector3(0.15f, 1.54f, 0.34f), new Vector3(0.26f, 0.26f, 0.12f), eyeMat);

        var labelRoot = new GameObject("Label");
        labelRoot.transform.SetParent(root.transform, false);
        labelRoot.transform.localPosition = new Vector3(0f, 2.34f, 0f);
        labelRoot.transform.localScale = Vector3.one * 0.16f;

        var back = GameObject.CreatePrimitive(PrimitiveType.Cube);
        back.name = "LabelBack";
        back.transform.SetParent(labelRoot.transform, false);
        back.transform.localPosition = new Vector3(0f, 0f, 0.12f);
        back.transform.localScale = new Vector3(5.0f, 1.2f, 0.10f);
        back.GetComponent<Renderer>().material = Emissive(new Color(0.03f, 0.03f, 0.04f), new Color(0.02f, 0.02f, 0.03f), 0.6f);

        AddLabelOutline(labelRoot.transform, role, new Vector3(0.02f, 0f, 0.01f));
        AddLabelOutline(labelRoot.transform, role, new Vector3(-0.02f, 0f, 0.01f));
        AddLabelOutline(labelRoot.transform, role, new Vector3(0f, 0.02f, 0.01f));
        AddLabelOutline(labelRoot.transform, role, new Vector3(0f, -0.02f, 0.01f));

        var tm = labelRoot.AddComponent<TextMesh>();
        tm.text = role;
        tm.fontSize = 30;
        tm.characterSize = 0.16f;
        tm.color = Color.white;
        tm.anchor = TextAnchor.MiddleCenter;
        tm.alignment = TextAlignment.Center;

        _labelXforms.Add(labelRoot.transform);
        _agentHeads.Add(head.transform);
        var eyeRenderer = eyeL.GetComponent<Renderer>();
        _agentEyeRenderers.Add(eyeRenderer);
        _agentEyeBaseColors.Add(eyeCol);
        _agentWorkBlend.Add(0f);
        _agentWorkingTarget.Add(false);
        _agents.Add(root);
        _agentIdle.Add(pos);
    }

    private static void AddLabelOutline(Transform parent, string role, Vector3 lp)
    {
        var go = new GameObject("LabelOutline");
        go.transform.SetParent(parent, false);
        go.transform.localPosition = lp;
        var t = go.AddComponent<TextMesh>();
        t.text = role;
        t.fontSize = 30;
        t.characterSize = 0.16f;
        t.color = Color.black;
        t.anchor = TextAnchor.MiddleCenter;
        t.alignment = TextAlignment.Center;
    }

    private static void BuildLighting()
    {
        RenderSettings.ambientMode = AmbientMode.Flat;
        RenderSettings.ambientIntensity = 1.30f;
        RenderSettings.ambientLight = new Color(1.0f, 0.88f, 0.65f);

        var def = GameObject.Find("Directional Light");
        if (def != null) Object.DestroyImmediate(def);

        L("MainDirectional", LightType.Directional, new Color(1.0f, 0.92f, 0.78f), 1.2f, 100f,
            LightShadows.None, Vector3.zero, Quaternion.Euler(40f, -20f, 0f));

        L("DispatchPoint", LightType.Point, new Color(1.0f, 0.62f, 0.24f), 2.8f, 11f,
            LightShadows.None, new Vector3(-7f, 3f, 5f), Quaternion.identity);
        L("MonitoringPoint", LightType.Point, new Color(1.0f, 0.82f, 0.52f), 2.4f, 11f,
            LightShadows.None, new Vector3(7f, 3f, 5f), Quaternion.identity);
        L("DeskPoint", LightType.Point, new Color(1.0f, 0.95f, 0.75f), 2.0f, 9f,
            LightShadows.None, new Vector3(0f, 4f, 3f), Quaternion.identity);
        L("BoardPoint", LightType.Point, new Color(1.0f, 0.92f, 0.72f), 1.9f, 13f,
            LightShadows.None, new Vector3(0f, 5f, 9f), Quaternion.identity);
        L("Room2InteriorPoint", LightType.Point, new Color(1.0f, 0.68f, 0.30f), 2.6f, 10f,
            LightShadows.None, new Vector3(6.6f, 2.5f, 10.9f), Quaternion.identity);

        // Fill lights to avoid dark corners.
        L("FillBackLeft", LightType.Point, new Color(1.0f, 0.86f, 0.62f), 1.0f, 12f,
            LightShadows.None, new Vector3(-8.4f, 2.7f, 8.2f), Quaternion.identity);
        L("FillBackRightRoom2", LightType.Point, new Color(1.0f, 0.84f, 0.60f), 1.0f, 12f,
            LightShadows.None, new Vector3(8.8f, 2.7f, 8.8f), Quaternion.identity);
        L("FillBoardLower", LightType.Point, new Color(1.0f, 0.82f, 0.58f), 0.9f, 10f,
            LightShadows.None, new Vector3(0f, 1.8f, 8.7f), Quaternion.identity);
        L("FillTopLeft", LightType.Point, new Color(1.0f, 0.84f, 0.62f), 0.9f, 14f,
            LightShadows.None, new Vector3(-9.0f, 4.0f, 7.8f), Quaternion.identity);
        L("FillTopRight", LightType.Point, new Color(1.0f, 0.84f, 0.62f), 0.9f, 14f,
            LightShadows.None, new Vector3(9.0f, 4.0f, 7.8f), Quaternion.identity);
    }

    private static void L(string n, LightType t, Color c, float intensity, float range, LightShadows sh, Vector3 pos, Quaternion rot)
    {
        var go = new GameObject(n + "_Light");
        var lt = go.AddComponent<Light>();
        lt.type = t;
        lt.color = c;
        lt.intensity = intensity;
        lt.range = range;
        lt.shadows = sh;
        go.transform.position = pos;
        go.transform.rotation = rot;
    }

    private void BuildRuntimeNavMesh()
    {
        _navSources.Clear();
        var marks = new List<NavMeshBuildMarkup>();
        var world = new Bounds(new Vector3(0f, 2f, 6f), new Vector3(32f, 8f, 24f));

        NavMeshBuilder.CollectSources(
            world,
            LayerMask.GetMask("Default"),
            NavMeshCollectGeometry.RenderMeshes,
            0,
            marks,
            _navSources);

        var settings = NavMesh.GetSettingsByID(0);
        if (settings.agentTypeID == -1)
        {
            Debug.LogWarning("[RuntimeSceneBuilder] NavMesh agent settings not found.");
            return;
        }

        var navRoot = GameObject.Find("NavigationRoot") ?? new GameObject("NavigationRoot");
        navRoot.transform.position = Vector3.zero;

        _runtimeNavMeshData = NavMeshBuilder.BuildNavMeshData(settings, _navSources, world, Vector3.zero, Quaternion.identity);
        if (_runtimeNavMeshData != null)
            NavMesh.AddNavMeshData(_runtimeNavMeshData);
    }

    private static Vector3 SnapToNavMesh(Vector3 point, float maxDistance = 2f)
    {
        if (NavMesh.SamplePosition(point, out var hit, maxDistance, NavMesh.AllAreas))
            return hit.position;
        return point;
    }

    private void WireBackend()
    {
        var mgr = GameObject.Find("SceneManager") ?? new GameObject("SceneManager");
        if (mgr.GetComponent<ApiClient>() == null) mgr.AddComponent<ApiClient>();

        BotMover Mv(int idx, string role, Vector3 idle, Vector3 board, Vector3 desk, Vector3 done)
        {
            if (idx >= _agents.Count) return null;
            var go = _agents[idx];
            var mv = go.GetComponent<BotMover>() ?? go.AddComponent<BotMover>();
            mv.SetRole(role);
            mv.idlePos = SnapToNavMesh(idle);
            mv.boardPos = SnapToNavMesh(board);
            mv.deskPos = SnapToNavMesh(desk);
            mv.donePos = SnapToNavMesh(done);
            return mv;
        }

        // Map existing orchestrator roles to planner/worker/tester.
        var plannerM = Mv(1, "planner", new Vector3(-1.8f, 0f, 0.5f), new Vector3(0f, 0f, 8f), new Vector3(-1.3f, 0f, 1.2f), new Vector3(5.2f, 0f, 8.6f));
        var workerM = Mv(2, "worker", new Vector3(-6.5f, 0f, 2.5f), new Vector3(0f, 0f, 8f), new Vector3(-0.3f, 0f, 1.0f), new Vector3(5.6f, 0f, 8.6f));
        var testerM = Mv(3, "tester", new Vector3(6.5f, 0f, 2.5f), new Vector3(0f, 0f, 8f), new Vector3(0.8f, 0f, 1.0f), new Vector3(6.0f, 0f, 8.6f));

        var orch = mgr.GetComponent<TaskOrchestrator>() ?? mgr.AddComponent<TaskOrchestrator>();
        orch.plannerBot = plannerM;
        orch.workerBot = workerM;
        orch.testerBot = testerM;

        var poller = mgr.GetComponent<StatePoller>() ?? mgr.AddComponent<StatePoller>();
        poller.orchestrator = orch;
    }

    private static Shader LS()
    {
        return Shader.Find("Sprites/Default") ??
               Shader.Find("UI/Default") ??
               Shader.Find("Hidden/InternalErrorShader");
    }

    private static Material Mat(Color c, float smooth = 0.15f)
    {
        var m = new Material(Shader.Find("Sprites/Default") ?? Shader.Find("UI/Default") ?? Shader.Find("Hidden/InternalErrorShader"));
        m.color = c;
        return m;
    }

    private static Material Emissive(Color baseColor, Color emit, float mul)
    {
        var m = new Material(Shader.Find("Sprites/Default") ?? Shader.Find("UI/Default") ?? Shader.Find("Hidden/InternalErrorShader"));
        m.color = Color.Lerp(baseColor, emit, 0.6f);
        return m;
    }

    private static GameObject Go(GameObject root, PrimitiveType t, string n, Vector3 lp, Vector3 ls, Material m)
    {
        var g = GameObject.CreatePrimitive(t);
        g.name = n;
        g.transform.SetParent(root.transform, false);
        g.transform.localPosition = lp;
        g.transform.localScale = ls;
        g.GetComponent<Renderer>().material = m;
        return g;
    }

    private static GameObject Cube(string n, Vector3 p, Vector3 s, Material m)
    {
        var g = GameObject.CreatePrimitive(PrimitiveType.Cube);
        g.name = n;
        g.transform.position = p;
        g.transform.localScale = s;
        g.GetComponent<Renderer>().material = m;
        return g;
    }

    private static GameObject Cyl(string n, Vector3 p, Vector3 s, Material m)
    {
        var g = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        g.name = n;
        g.transform.position = p;
        g.transform.localScale = s;
        g.GetComponent<Renderer>().material = m;
        return g;
    }

    private static TextMesh Txt(string n, string t, Vector3 p, int sz, float ch, Color c, FontStyle fs = FontStyle.Normal)
    {
        var g = new GameObject(n);
        g.transform.position = p;
        var tm = g.AddComponent<TextMesh>();
        tm.text = t;
        tm.fontSize = sz;
        tm.characterSize = ch;
        tm.color = c;
        tm.fontStyle = fs;
        tm.anchor = TextAnchor.MiddleCenter;
        tm.alignment = TextAlignment.Center;
        return tm;
    }

    [System.Serializable] private sealed class RT { public string id, title, status, assignee; }
    [System.Serializable] private sealed class RS { public List<RT> tasks; }
    [System.Serializable] private sealed class RSE { public List<RT> tasks; public RS taskState; }

    private System.Collections.IEnumerator PollTaskState()
    {
        while (true)
        {
            var req = UnityWebRequest.Get(taskStateUrl);
            req.timeout = 4;
            yield return req.SendWebRequest();

            if (req.result == UnityWebRequest.Result.Success)
            {
                var e = JsonUtility.FromJson<RSE>(req.downloadHandler.text);
                var tasks = e?.tasks ?? e?.taskState?.tasks;
                if (tasks != null)
                {
                    int doing = 0, done = 0;
                    var columnCounts = new int[6];
                    foreach (var tk in tasks)
                    {
                        var s = (tk.status ?? "").ToLower();
                        if (s == "done") done++; else doing++;
                        if (!StatusToColumn.TryGetValue(s, out var col)) col = 1;
                        if (col >= 0 && col < columnCounts.Length)
                            columnCounts[col]++;
                    }

                    for (int ai = 0; ai < _agentWorkingTarget.Count; ai++) _agentWorkingTarget[ai] = false;
                    foreach (var tk in tasks)
                    {
                        var assignee = (tk?.assignee ?? "").Trim().ToLower();
                        var status = (tk?.status ?? "").Trim().ToLower();
                        if (string.IsNullOrEmpty(assignee)) continue;
                        if (status == "done") continue;

                        for (int ai = 0; ai < _agentRoles.Length && ai < _agentWorkingTarget.Count; ai++)
                        {
                            if (_agentRoles[ai] == assignee)
                            {
                                _agentWorkingTarget[ai] = true;
                                break;
                            }
                        }
                    }

                    var columnTasks = new List<RT>[6];
                    for (int c = 0; c < columnTasks.Length; c++) columnTasks[c] = new List<RT>();

                    foreach (var task in tasks)
                    {
                        var st = (task?.status ?? "").ToLower();
                        if (!StatusToColumn.TryGetValue(st, out var column)) column = 1;
                        column = Mathf.Clamp(column, 0, columnTasks.Length - 1);
                        columnTasks[column].Add(task);
                    }

                    for (int i = 0; i < _liveTaskLabels.Count; i++)
                    {
                        var tm = _liveTaskLabels[i];
                        if (tm == null) continue;

                        int column = i < _boardCardColumns.Count ? _boardCardColumns[i] : 0;
                        int row = i % 4;
                        var hasTask = column >= 0 && column < columnTasks.Length && row < columnTasks[column].Count;
                        var task = hasTask ? columnTasks[column][row] : null;

                        if (task == null)
                        {
                            tm.text = "";
                            if (i < _assigneeDotRenderers.Count && _assigneeDotRenderers[i] != null)
                                _assigneeDotRenderers[i].material.color = new Color(0.35f, 0.35f, 0.35f);
                            continue;
                        }

                        var id = string.IsNullOrWhiteSpace(task.id) ? "TASK" : task.id;
                        var title = string.IsNullOrWhiteSpace(task.title) ? "Без названия" : task.title;
                        var text = $"{id} {title}";
                        tm.text = text.Length > 28 ? text.Substring(0, 27) + "…" : text;

                        if (i < _assigneeDotRenderers.Count && _assigneeDotRenderers[i] != null)
                            _assigneeDotRenderers[i].material.color = GetAssigneeColor(task.assignee);
                    }

                    UpdateBoardCardColors(columnCounts);

                    if (_wipText != null) _wipText.text = $"WIP {doing:00}";
                    if (_queueText != null) _queueText.text = $"QUEUE {tasks.Count:00}";
                    if (_blockersText != null) _blockersText.text = $"BLOCKERS {Mathf.Max(0, doing - 3)}";
                    if (_throughputText != null) _throughputText.text = $"THROUGHPUT {done:00}";
                }
            }

            req.Dispose();
            yield return new WaitForSeconds(5f);
        }
    }


    private static Color GetAssigneeColor(string assignee)
    {
        var key = (assignee ?? "").Trim().ToLower();
        if (key == "chief") return new Color(1.00f, 0.85f, 0.35f);
        if (key == "planner") return new Color(0.35f, 0.65f, 1.00f);
        if (key == "worker") return new Color(0.20f, 0.95f, 0.72f);
        if (key == "tester") return new Color(0.45f, 1.00f, 0.65f);
        return new Color(0.75f, 0.75f, 0.78f);
    }
    private void UpdateBoardCardColors(int[] columnCounts)
    {
        if (columnCounts == null || columnCounts.Length == 0) return;
        for (int i = 0; i < _boardCardRenderers.Count; i++)
        {
            var renderer = _boardCardRenderers[i];
            if (renderer == null) continue;
            var column = i < _boardCardColumns.Count ? _boardCardColumns[i] : 0;
            float intensity = Mathf.Clamp01(columnCounts[column] / 4f);
            var targetColor = Color.Lerp(_boardCardBaseColor, _columnHighlightColors[column], intensity);
            renderer.material.color = targetColor;
        }
    }
}
}
