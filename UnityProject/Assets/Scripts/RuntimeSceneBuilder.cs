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
        // VREVIEWER lighting target (warm Pixar-like base)
        RenderSettings.ambientMode = AmbientMode.Flat;
        RenderSettings.ambientLight = new Color(1.00f, 0.84f, 0.62f, 1f);
        RenderSettings.fog = false;

        CreatePointLight("KeyWarm", new Vector3(0f, 4.9f, 1.1f), new Color(1.00f, 0.62f, 0.30f, 1f), 4.8f, 22f);
        CreatePointLight("FillL", new Vector3(-6.7f, 3.5f, 2.9f), new Color(1.00f, 0.68f, 0.38f, 1f), 2.6f, 14f);
        CreatePointLight("FillR", new Vector3(6.7f, 3.5f, 2.9f), new Color(1.00f, 0.68f, 0.38f, 1f), 2.6f, 14f);
        CreatePointLight("WarmKey",  new Vector3(0f, 4.8f, 0.8f), new Color(1.00f, 0.62f, 0.30f, 1f), 5.8f, 24f);

        var floor = Mat(new Color(0.36f, 0.32f, 0.28f, 1f), 0.30f);
        Cube("Floor", new Vector3(0f, -0.05f, 3f), new Vector3(24f, 0.1f, 18f), floor);
        Cube("FloorCenterPanel", new Vector3(0f, -0.045f, 3f), new Vector3(18f, 0.02f, 13f), Mat(new Color(0.42f, 0.38f, 0.34f, 1f), 0.30f));
        Cube("FloorTileBandA", new Vector3(-4.5f, -0.043f, 3f), new Vector3(3.6f, 0.02f, 13f), Mat(new Color(0.40f, 0.36f, 0.32f, 1f), 0.30f));
        Cube("FloorTileBandB", new Vector3(4.5f, -0.043f, 3f), new Vector3(3.6f, 0.02f, 13f), Mat(new Color(0.34f, 0.30f, 0.26f, 1f), 0.30f));

        var pathAmber = Emissive(
            new Color(0.38f, 0.2f, 0.04f),
            new Color(1.00f, 0.56f, 0.10f, 1f),
            3.4f);
        var pathBlue = Emissive(
            new Color(0.12f, 0.20f, 0.35f),
            new Color(0.31f, 0.75f, 1.00f, 1f),
            3.4f);
        var pathGreen = Emissive(
            new Color(0.08f, 0.25f, 0.14f),
            new Color(0.20f, 1.00f, 0.74f, 1f),
            3.4f);

        float step = 0.42f;
        Vector3 dotScale = new Vector3(
            0.11f,
            0.02f,
            0.11f);

        void PathDots(
            string prefix,
            Vector3 from,
            Vector3 to,
            Material mat)
        {
            var delta = to - from;
            var length = delta.magnitude;
            var dir = length > 0.001f ? delta.normalized : Vector3.forward;
            int count = Mathf.Max(2, Mathf.CeilToInt(length / step));
            for (int i = 0; i <= count; i++)
            {
                float t = i / (float)count;
                var p = Vector3.Lerp(from, to, t);
                var dot = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                dot.name = prefix + i;
                dot.transform.position = p;
                dot.transform.localScale = dotScale;
                dot.GetComponent<Renderer>().material = mat;

                float dist = t * length;
                if (Mathf.Abs(dist % 2.10f) < 0.24f)
                {
                    var arrow = Cube(prefix + "Arrow" + i, p + new Vector3(0f, 0.01f, 0f), new Vector3(0.28f, 0.02f, 0.28f), mat);
                    arrow.transform.rotation = Quaternion.Euler(0f, Mathf.Atan2(dir.x, dir.z) * Mathf.Rad2Deg + 45f, 0f);
                }
            }
        }

        PathDots(
            "PathDispatchDot_",
            new Vector3(-7.1f, 0.03f, 1.0f),
            new Vector3(-0.6f, 0.03f, 0.5f),
            pathAmber,
            18,
            0.42f,
            new Vector3(0.11f, 0.02f, 0.11f));
        PathDots(
            "PathBoardDot_",
            new Vector3(-0.1f, 0.03f, -2.15f),
            new Vector3(0.0f, 0.03f, 2.75f),
            pathBlue,
            14,
            0.42f,
            new Vector3(0.11f, 0.02f, 0.11f));
        PathDots(
            "PathMonitoringDot_",
            new Vector3(1.2f, 0.03f, 0.55f),
            new Vector3(7.15f, 0.03f, 0.55f),
            pathGreen,
            15,
            0.42f,
            new Vector3(0.11f, 0.02f, 0.11f));
        var pathYellow = Emissive(
            new Color(0.45f, 0.32f, 0.08f),
            new Color(1.00f, 0.82f, 0.22f, 1f),
            1.8f);
        PathDots(
            "PathRoom2LinkDot_",
            new Vector3(6.9f, 0.03f, 2.0f),
            new Vector3(8.55f, 0.03f, 5.8f),
            pathYellow,
            10,
            0.42f,
            new Vector3(0.11f, 0.02f, 0.11f));

        var wall = Mat(new Color(0.24f, 0.18f, 0.14f), 0.14f);
        Cube("WallToneBandL", new Vector3(-9.0f, 2.0f, 6.8f), new Vector3(0.12f, 2.6f, 3.0f), Mat(new Color(0.28f, 0.20f, 0.16f), 0.22f));
        Cube("WallToneBandR", new Vector3(9.0f, 2.0f, 6.8f), new Vector3(0.12f, 2.6f, 3.0f), Mat(new Color(0.20f, 0.16f, 0.12f), 0.08f));
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
        // VREVIEWER board target: position/scale + dense 90-note population
        Vector3 taskBoardPos = new Vector3(
            0.0f,
            2.55f,
            8.75f);
        Vector3 taskBoardScale = new Vector3(
            10.6f,
            3.2f,
            0.24f);
        Vector3 taskBoardFrameScale = new Vector3(
            taskBoardScale.x + 1.0f,
            taskBoardScale.y + 0.9f,
            0.15f);
        Cube("TaskBoardFrame", taskBoardPos + new Vector3(0f, 0f, -0.05f), taskBoardFrameScale, Mat(new Color(0.46f, 0.31f, 0.14f), 0.10f));
        var taskBoard = Cube("TaskBoard", new Vector3(0f, 0f, 0f), Vector3.one, Mat(new Color(0.07f, 0.07f, 0.10f), 0.10f));
        taskBoard.transform.position = taskBoardPos;
        taskBoard.transform.localScale = taskBoardScale;

        string[] headers =
        {
            "INBOX",
            "QUEUE",
            "PLAN",
            "WORK",
            "REVIEW",
            "DONE"
        };
        float[] xs =
        {
            -4.175f,
            -2.505f,
            -0.835f,
            0.835f,
            2.505f,
            4.175f
        };
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
            Cube($"HdrBack_{c}", new Vector3(x, 3.95f, 8.93f), new Vector3(1.55f, 0.30f, 0.03f), Emissive(new Color(0.08f, 0.08f, 0.12f), Color.Lerp(headerCols[c], Color.white, 0.35f), 1.8f));
            Txt($"Hdr{c}", headers[c], new Vector3(x, 3.95f, 8.88f), 32, 0.15f, Color.Lerp(headerCols[c], Color.white, 0.78f), FontStyle.Bold);

            Color[] stickyPalette =
            {
                new Color(1.00f, 0.84f, 0.26f, 1f),
                new Color(0.40f, 0.72f, 1.00f, 1f),
                new Color(0.98f, 0.56f, 0.22f, 1f),
                new Color(0.44f, 0.96f, 0.78f, 1f)
            };
            int cardsPerColumn = 16;
            Vector3 cardScale = new Vector3(0.22f, 0.14f, 0.02f);
            float boardTopY = taskBoardPos.y + taskBoardScale.y * 0.5f - 0.30f;
            float boardBottomY = Mathf.Max(0.20f, taskBoardPos.y - taskBoardScale.y * 0.5f + 0.25f);
            for (int s = 0; s < cardsPerColumn; s++)
            {
                float sx = x - 0.33f + (s % 2) * 0.44f;
                float rawSy = 3.58f - (s / 2) * 0.18f;
                float sy = Mathf.Clamp(rawSy, boardBottomY, boardTopY);
                var sc = stickyPalette[s % stickyPalette.Length];
                Cube($"StickyDense_{c}_{s}", new Vector3(sx, sy, 8.94f), cardScale, Mat(sc, 0.03f));
            }
        }

        _wipText = Txt("WIP", "WIP 00", new Vector3(-2.0f, 1.0f, 8.9f), 10, 0.08f, new Color(1f, 0.93f, 0.72f), FontStyle.Bold);
        _queueText = Txt("QUEUE", "QUEUE 00", new Vector3(-6.7f, 1.0f, 8.9f), 9, 0.08f, new Color(0.92f, 0.86f, 0.68f));
        _blockersText = Txt("BLK", "BLOCKERS 0", new Vector3(2.0f, 1.0f, 8.9f), 9, 0.08f, new Color(1f, 0.74f, 0.66f));
        _throughputText = Txt("THRU", "THROUGHPUT 0", new Vector3(6.8f, 1.0f, 8.9f), 9, 0.08f, new Color(0.74f, 0.90f, 1f));
    }

    private void BuildZones()
    {
        var roomGlow = Emissive(new Color(0.55f, 0.30f, 0.06f), new Color(1.0f, 0.60f, 0.05f), 4.0f);
        Cube("Room2FrameOuter", new Vector3(6.6f, 2.0f, 8.7f), new Vector3(3.1f, 4.5f, 0.24f), roomGlow);
        // VREVIEWER room2 doorway accent target
        Cube(
            "Room2DoorFrameTarget",
            new Vector3(8.78f, 0.0f, 6.32f),
            new Vector3(3.05f, 3.35f, 0.24f),
            Emissive(
                new Color(0.45f, 0.22f, 0.05f),
                new Color(1.00f, 0.58f, 0.14f, 1f),
                3.8f));
        Cube("Room2FrameInner", new Vector3(6.6f, 2.0f, 8.72f), new Vector3(2.6f, 4.0f, 0.14f), Emissive(new Color(0.45f, 0.24f, 0.04f), new Color(1.0f, 0.55f, 0.02f), 3.2f));
        Cube("Room2Inner", new Vector3(6.6f, 2.0f, 8.75f), new Vector3(2.1f, 3.7f, 0.15f), Mat(new Color(0.15f, 0.12f, 0.08f), 0.08f));
        Cube("Room2TopGlow", new Vector3(6.6f, 4.1f, 8.65f), new Vector3(2.8f, 0.15f, 0.1f), roomGlow);
        Cube("Room2LeftGlow", new Vector3(5.25f, 2.0f, 8.65f), new Vector3(0.15f, 3.7f, 0.1f), roomGlow);
        Cube("Room2RightGlow", new Vector3(7.95f, 2.0f, 8.65f), new Vector3(0.15f, 3.7f, 0.1f), roomGlow);
        Cube("Room2DoorFloorGlow", new Vector3(6.6f, -0.01f, 8.9f), new Vector3(2.6f, 0.03f, 1.2f), Emissive(new Color(0.4f, 0.2f, 0.05f), new Color(1.0f, 0.55f, 0.06f), 2.5f));
        Cube("Room2PillarL", new Vector3(5.35f, 1.9f, 8.62f), new Vector3(0.22f, 3.9f, 0.22f), Emissive(new Color(0.45f, 0.24f, 0.05f), new Color(1.0f, 0.58f, 0.08f), 2.4f));
        Cube("Room2PillarR", new Vector3(7.85f, 1.9f, 8.62f), new Vector3(0.22f, 3.9f, 0.22f), Emissive(new Color(0.45f, 0.24f, 0.05f), new Color(1.0f, 0.58f, 0.08f), 2.4f));

        Cube(
            "Room2Arrow",
            new Vector3(8.78f, 1.18f, 6.12f),
            new Vector3(0.62f, 0.62f, 0.62f),
            Emissive(
                new Color(0.4f, 0.2f, 0.05f),
                new Color(1.0f, 0.7f, 0.1f),
                3.2f))
            .transform.rotation = Quaternion.Euler(0f, 0f, -28f);
        Cube("Room2ArrowGlow", new Vector3(8.78f, 1.18f, 6.12f), new Vector3(0.92f, 0.22f, 0.22f), Emissive(new Color(0.5f, 0.24f, 0.06f), new Color(1.0f, 0.70f, 0.18f), 3.0f));
        Cube("Room2PortalSideGlowL", new Vector3(7.25f, 1.6f, 6.30f), new Vector3(0.18f, 2.8f, 0.18f), Emissive(new Color(0.45f, 0.22f, 0.05f), new Color(1.0f, 0.62f, 0.16f), 3.6f));
        Cube("Room2PortalSideGlowR", new Vector3(10.25f, 1.6f, 6.30f), new Vector3(0.18f, 2.8f, 0.18f), Emissive(new Color(0.45f, 0.22f, 0.05f), new Color(1.0f, 0.62f, 0.16f), 3.6f));
        var roomLbl = Txt(
            "Room2Lbl",
            "ROOM 2",
            new Vector3(8.78f, 2.86f, 6.08f),
            20,
            0.62f,
            new Color(1.00f, 0.74f, 0.26f, 1f),
            FontStyle.Bold);
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

        Cube(
            "DispatchDesk",
            new Vector3(-7.25f, 0f, 1.15f),
            new Vector3(2.2f, 0.90f, 1.10f),
            Mat(new Color(0.45f, 0.28f, 0.10f), 0.12f));
        Cube(
            "DispatchPanel",
            new Vector3(-8.1f, 0.8f, 1.5f),
            new Vector3(0.3f, 1.6f, 1.2f),
            Mat(new Color(0.3f, 0.18f, 0.06f), 0.12f));
        Cube(
            "DispatchTerminal",
            new Vector3(-6.65f, 1.18f, 1.05f),
            new Vector3(0.72f, 0.46f, 0.05f),
            Mat(new Color(0.05f, 0.05f, 0.12f), 0.1f));
        Cube(
            "DispatchTerminalGlow",
            new Vector3(-6.65f, 1.18f, 1.05f),
            new Vector3(0.72f, 0.46f, 0.02f),
            Emissive(new Color(0.4f, 0.2f, 0.05f), new Color(1.00f,0.58f,0.18f,1f), 2.8f));
        Cube(
            "DispatchBox1",
            new Vector3(-8.35f, 0f, 0.55f),
            new Vector3(0.72f, 0.42f, 0.62f),
            Mat(new Color(0.7f, 0.55f, 0.25f), 0.05f));
        Cube(
            "DispatchBox2",
            new Vector3(-8.00f, 0f, 1.05f),
            new Vector3(0.62f, 0.62f, 0.62f),
            Mat(new Color(0.65f, 0.5f, 0.2f), 0.05f));
        Cube(
            "DispatchBox3",
            new Vector3(-7.75f, 0f, 1.60f),
            new Vector3(0.82f, 0.52f, 0.72f),
            Mat(new Color(0.72f, 0.58f, 0.28f), 0.05f));
        Cube(
            "DispatchBox4",
            new Vector3(-8.20f, 0f, 1.95f),
            new Vector3(0.66f, 0.86f, 0.66f),
            Mat(new Color(0.68f, 0.50f, 0.22f), 0.05f));
        Cube(
            "DispatchBox5",
            new Vector3(-7.35f, 0f, 0.55f),
            new Vector3(0.58f, 0.38f, 0.58f),
            Mat(new Color(0.76f, 0.58f, 0.30f), 0.05f));
        Cube(
            "DispatchBox6",
            new Vector3(-7.10f, 0f, 1.95f),
            new Vector3(0.54f, 0.54f, 0.54f),
            Mat(new Color(0.70f, 0.54f, 0.26f), 0.05f));
        Cube("DispatchRack", new Vector3(-7.8f, 1.6f, 5.8f), new Vector3(0.22f, 2.6f, 1.6f), Mat(new Color(0.30f, 0.20f, 0.10f), 0.08f));
        Cube("DispatchHolo", new Vector3(-7.5f, 1.55f, 1.65f), new Vector3(1.0f, 0.05f, 0.8f), Emissive(new Color(0.5f, 0.22f, 0.05f), new Color(1.0f, 0.60f, 0.12f), 2.4f));
        Cube("DispatchPaperA", new Vector3(-7.1f, 0.84f, 1.8f), new Vector3(0.42f, 0.02f, 0.30f), Mat(new Color(0.9f, 0.86f, 0.76f), 0.03f));
        Cube("DispatchToolA", new Vector3(-7.9f, 0.86f, 1.3f), new Vector3(0.26f, 0.08f, 0.12f), Mat(new Color(0.65f, 0.36f, 0.12f), 0.04f));
        Cube("DispatchToolB", new Vector3(-7.2f, 0.86f, 1.15f), new Vector3(0.24f, 0.08f, 0.14f), Mat(new Color(0.60f, 0.32f, 0.10f), 0.04f));
        Cube("DispatchPaperB", new Vector3(-7.75f, 0.84f, 1.95f), new Vector3(0.34f, 0.02f, 0.26f), Mat(new Color(0.9f, 0.86f, 0.76f), 0.03f));
        Cube("DispatchPaperC", new Vector3(-7.35f, 0.84f, 1.62f), new Vector3(0.30f, 0.02f, 0.20f), Mat(new Color(0.9f, 0.86f, 0.76f), 0.03f));
        Cube("DispatchToolC", new Vector3(-8.05f, 0.86f, 1.75f), new Vector3(0.22f, 0.07f, 0.10f), Mat(new Color(0.62f, 0.34f, 0.12f), 0.04f));
        Cube("DispatchWallPanel", new Vector3(-8.25f, 1.95f, 1.45f), new Vector3(0.12f, 1.6f, 1.8f), Emissive(new Color(0.36f, 0.18f, 0.05f), new Color(1.0f, 0.58f, 0.10f), 2.8f));
        Cube("DispatchToolRack", new Vector3(-8.0f, 1.35f, 2.6f), new Vector3(0.18f, 1.8f, 0.9f), Mat(new Color(0.36f, 0.22f, 0.12f), 0.08f));
        Cube("DispatchCableCoil", new Vector3(-7.25f, 0.88f, 2.35f), new Vector3(0.20f, 0.08f, 0.20f), Mat(new Color(0.12f, 0.12f, 0.14f), 0.03f));
        Cube("DispatchConsoleGlow", new Vector3(-7.55f, 1.42f, 1.85f), new Vector3(0.66f, 0.06f, 0.42f), Emissive(new Color(0.45f, 0.20f, 0.05f), new Color(1.0f, 0.58f, 0.10f), 3.8f));
        Cube("DispatchGlowColumn", new Vector3(-7.4f, 1.4f, 0.2f), new Vector3(0.18f, 2.8f, 0.18f), Emissive(new Color(0.45f, 0.20f, 0.05f), new Color(1.0f, 0.56f, 0.08f), 3.8f));
        Cube(
            "DispatchZoneGlow",
            new Vector3(-7.45f, 0.02f, 1.15f),
            new Vector3(2.8f, 0.02f, 2.1f),
            Emissive(
                new Color(0.35f, 0.18f, 0.03f),
                new Color(1.00f, 0.56f, 0.10f, 1f),
                2.4f));

        Cube("DispatchFloorArrow", new Vector3(-6.9f, 0.03f, 2.9f), new Vector3(1.4f, 0.03f, 0.48f), Emissive(new Color(0.38f, 0.18f, 0.04f), new Color(1.00f, 0.60f, 0.12f), 5.0f));
        Cube("DispatchTerminalGlow", new Vector3(-7.95f, 1.28f, 1.42f), new Vector3(0.32f, 0.42f, 0.03f), Emissive(new Color(0.40f, 0.20f, 0.06f), new Color(1.00f, 0.62f, 0.14f), 4.2f));
        var dispatchLbl = Txt("DispatchLbl", "DISPATCH", new Vector3(-7.5f, 2.5f, 1.5f), 16, 0.10f, new Color(1.0f, 0.55f, 0.0f), FontStyle.Bold);
        _labelXforms.Add(dispatchLbl.transform);

        // Premium rounded main desk cluster
        Cube("CentralDeskBase", new Vector3(0f, 0f, 0.1f), new Vector3(4.2f, 1.0f, 2.6f), Mat(new Color(0.46f, 0.30f, 0.14f), 0.18f));
        Cyl("CentralDeskEdgeL", new Vector3(-2.05f, 0.50f, 0.1f), new Vector3(0.54f, 0.58f, 0.54f), Mat(new Color(0.42f, 0.28f, 0.14f), 0.15f));
        Cyl("CentralDeskEdgeR", new Vector3(2.05f, 0.50f, 0.1f), new Vector3(0.54f, 0.58f, 0.54f), Mat(new Color(0.42f, 0.28f, 0.14f), 0.15f));
        Cube("CentralDeskTop", new Vector3(0f, 1.02f, 0.1f), new Vector3(3.6f, 0.18f, 2.1f), Mat(new Color(0.64f, 0.46f, 0.25f), 0.20f));
        Cube(
            "DeskLaptop",
            new Vector3(-0.95f, 0.86f, 1.25f),
            new Vector3(0.95f, 0.04f, 0.60f),
            Mat(new Color(0.10f, 0.10f, 0.14f), 0.2f));
        Cube(
            "DeskMonitorA",
            new Vector3(0.65f, 1.10f, 0.72f),
            new Vector3(0.82f, 0.46f, 0.08f),
            Mat(new Color(0.06f, 0.06f, 0.10f), 0.2f));
        Cube(
            "DeskMonitorB",
            new Vector3(1.28f, 1.10f, 0.92f),
            new Vector3(0.62f, 0.38f, 0.08f),
            Mat(new Color(0.06f, 0.06f, 0.10f), 0.2f));
        Cube(
            "DeskPaperA",
            new Vector3(-0.65f, 0.84f, 0.75f),
            new Vector3(0.95f, 0.02f, 0.65f),
            Mat(new Color(0.92f, 0.90f, 0.82f), 0.03f));
        Cube(
            "DeskPaperB",
            new Vector3(0.55f, 0.84f, 1.2f),
            new Vector3(1.0f, 0.02f, 0.65f),
            Mat(new Color(0.92f, 0.90f, 0.82f), 0.03f));
        Cube(
            "DeskPaperC",
            new Vector3(-0.05f, 0.84f, 1.7f),
            new Vector3(0.82f, 0.02f, 0.52f),
            Mat(new Color(0.90f, 0.88f, 0.80f), 0.03f));
        Cube(
            "DeskPaperD",
            new Vector3(0.22f, 0.84f, 1.85f),
            new Vector3(0.62f, 0.02f, 0.38f),
            Mat(new Color(0.92f, 0.90f, 0.82f), 0.03f));
        Cube(
            "DeskPaperE",
            new Vector3(-0.62f, 0.84f, 1.95f),
            new Vector3(0.56f, 0.02f, 0.32f),
            Mat(new Color(0.92f, 0.90f, 0.82f), 0.03f));
        Cube(
            "DeskPaperF",
            new Vector3(0.78f, 0.84f, 1.62f),
            new Vector3(0.58f, 0.02f, 0.34f),
            Mat(new Color(0.92f, 0.90f, 0.82f), 0.03f));
        Cube(
            "DeskMugA",
            new Vector3(-1.45f, 0.90f, 1.30f),
            new Vector3(0.22f, 0.24f, 0.22f),
            Mat(new Color(0.85f, 0.42f, 0.18f), 0.04f));
        Cube(
            "DeskMugB",
            new Vector3(-1.25f, 0.90f, 0.62f),
            new Vector3(0.20f, 0.22f, 0.20f),
            Mat(new Color(0.78f, 0.42f, 0.20f), 0.04f));
        Cube(
            "DeskMugC",
            new Vector3(1.52f, 0.90f, 0.58f),
            new Vector3(0.20f, 0.22f, 0.20f),
            Mat(new Color(0.82f, 0.46f, 0.22f), 0.04f));
        Cube(
            "DeskDeviceA",
            new Vector3(-0.35f, 0.90f, 0.45f),
            new Vector3(0.22f, 0.08f, 0.16f),
            Mat(new Color(0.15f, 0.16f, 0.20f), 0.08f));
        Cube(
            "DeskDeviceB",
            new Vector3(0.95f, 0.90f, 1.70f),
            new Vector3(0.26f, 0.08f, 0.18f),
            Mat(new Color(0.15f, 0.16f, 0.20f), 0.08f));
        Cube(
            "DeskDeviceC",
            new Vector3(0.42f, 0.92f, 0.42f),
            new Vector3(0.24f, 0.10f, 0.18f),
            Mat(new Color(0.14f, 0.16f, 0.20f), 0.08f));
        Cube(
            "DeskDeviceD",
            new Vector3(-0.18f, 0.92f, 0.58f),
            new Vector3(0.28f, 0.10f, 0.20f),
            Mat(new Color(0.14f, 0.16f, 0.20f), 0.08f));
        Cube(
            "DeskCrateA",
            new Vector3(-1.9f, 0.58f, 0.3f),
            new Vector3(0.62f, 0.34f, 0.48f),
            Mat(new Color(0.65f, 0.48f, 0.25f), 0.05f));
        Cube(
            "DeskCrateB",
            new Vector3(1.85f, 0.58f, 1.72f),
            new Vector3(0.58f, 0.36f, 0.45f),
            Mat(new Color(0.60f, 0.44f, 0.22f), 0.05f));
        Cube(
            "DeskLampStem",
            new Vector3(1.58f, 1.05f, 1.46f),
            new Vector3(0.06f, 0.42f, 0.06f),
            Mat(new Color(0.14f, 0.14f, 0.16f), 0.2f));
        Cube(
            "DeskLampHead",
            new Vector3(0.95f, 1.22f, 0.18f),
            new Vector3(0.26f, 0.16f, 0.22f),
            Emissive(new Color(0.30f, 0.20f, 0.10f), new Color(1.00f,0.80f,0.45f,1f), 2.6f));

        Cube(
            "MonitoringWall",
            new Vector3(8.10f, 2.1f, 1.25f),
            new Vector3(0.28f, 4.2f, 3.8f),
            Mat(new Color(0.10f, 0.10f, 0.14f), 0.12f));
        Cube(
            "Mon1",
            new Vector3(8.10f, 1.95f, 0.55f),
            new Vector3(1.18f, 0.78f, 0.08f),
            Mat(new Color(0.04f, 0.04f, 0.08f), 0.2f));
        Cube(
            "Mon1Screen",
            new Vector3(8.10f, 1.95f, 0.55f),
            new Vector3(1.18f, 0.78f, 0.08f),
            Emissive(new Color(0.08f, 0.22f, 0.16f), new Color(0.18f, 1.00f, 0.78f, 1f), 3.6f));
        Cube(
            "Mon2",
            new Vector3(8.10f, 1.95f, 1.25f),
            new Vector3(1.18f, 0.78f, 0.08f),
            Mat(new Color(0.04f, 0.04f, 0.08f), 0.2f));
        Cube(
            "Mon2Screen",
            new Vector3(8.10f, 1.95f, 1.25f),
            new Vector3(1.18f, 0.78f, 0.08f),
            Emissive(new Color(0.08f, 0.22f, 0.16f), new Color(0.18f, 1.00f, 0.78f, 1f), 3.6f));
        Cube(
            "Mon3",
            new Vector3(8.10f, 1.95f, 1.95f),
            new Vector3(1.18f, 0.78f, 0.08f),
            Mat(new Color(0.04f, 0.04f, 0.08f), 0.2f));
        Cube(
            "Mon3Screen",
            new Vector3(8.10f, 1.95f, 1.95f),
            new Vector3(1.18f, 0.78f, 0.08f),
            Emissive(new Color(0.08f, 0.22f, 0.16f), new Color(0.18f, 1.00f, 0.78f, 1f), 3.6f));
        Cube(
            "Mon4",
            new Vector3(7.55f, 1.45f, 0.25f),
            new Vector3(0.58f, 0.42f, 0.06f),
            Mat(new Color(0.04f, 0.04f, 0.08f), 0.2f));
        Cube(
            "Mon4Screen",
            new Vector3(7.55f, 1.45f, 0.25f),
            new Vector3(0.58f, 0.42f, 0.06f),
            Emissive(
                new Color(0.08f, 0.22f, 0.16f),
                new Color(0.18f, 1.00f, 0.78f, 1f),
                3.6f));
        Cube(
            "Mon5",
            new Vector3(7.55f, 1.45f, 2.25f),
            new Vector3(0.58f, 0.42f, 0.06f),
            Mat(new Color(0.04f, 0.04f, 0.08f), 0.2f));
        Cube(
            "Mon5Screen",
            new Vector3(7.55f, 1.45f, 2.25f),
            new Vector3(0.58f, 0.42f, 0.06f),
            Emissive(
                new Color(0.08f, 0.22f, 0.16f),
                new Color(0.18f, 1.00f, 0.78f, 1f),
                3.6f));
        // VREVIEWER monitoring target desk anchor/scale
        Cube("MonitoringDesk", new Vector3(7.05f, 0f, 1.15f), new Vector3(2.4f, 0.92f, 1.05f), Mat(new Color(0.25f, 0.25f, 0.32f), 0.1f));
        Cube("MonitoringConsoleA", new Vector3(6.7f, 0.92f, 4.5f), new Vector3(0.55f, 0.20f, 0.38f), Mat(new Color(0.10f, 0.10f, 0.14f), 0.1f));
        Cube("MonitoringConsoleB", new Vector3(6.95f, 0.92f, 5.4f), new Vector3(0.50f, 0.20f, 0.34f), Mat(new Color(0.10f, 0.10f, 0.14f), 0.1f));
        Cube("MonitoringRack", new Vector3(6.15f, 1.7f, 5.9f), new Vector3(0.22f, 2.8f, 1.5f), Mat(new Color(0.10f, 0.12f, 0.14f), 0.1f));
        Cyl("MonitoringChairBase", new Vector3(7.0f, 0.22f, 4.9f), new Vector3(0.28f, 0.16f, 0.28f), Mat(new Color(0.12f, 0.12f, 0.14f), 0.12f));
        Cube("MonitoringChairSeat", new Vector3(7.0f, 0.56f, 4.9f), new Vector3(0.58f, 0.16f, 0.58f), Mat(new Color(0.18f, 0.22f, 0.26f), 0.12f));
        Cube("MonitoringChairBack", new Vector3(7.0f, 0.95f, 5.15f), new Vector3(0.58f, 0.56f, 0.10f), Mat(new Color(0.18f, 0.22f, 0.26f), 0.12f));
        Cube("MonitoringKeypad", new Vector3(7.25f, 0.92f, 5.15f), new Vector3(0.28f, 0.04f, 0.22f), Emissive(new Color(0.08f, 0.18f, 0.10f), new Color(0.18f, 0.9f, 0.45f), 1.6f));
        Cube("MonitoringTablet", new Vector3(6.55f, 0.94f, 1.45f), new Vector3(0.36f, 0.04f, 0.24f), Mat(new Color(0.08f, 0.10f, 0.14f), 0.16f));
        Cube("MonitoringCableTray", new Vector3(6.25f, 0.35f, 1.95f), new Vector3(0.40f, 0.08f, 0.18f), Mat(new Color(0.12f, 0.12f, 0.14f), 0.04f));
        Cube("MonitoringPatchPanel", new Vector3(6.05f, 1.85f, 2.05f), new Vector3(0.38f, 0.52f, 0.16f), Emissive(new Color(0.06f, 0.18f, 0.10f), new Color(0.16f, 0.95f, 0.48f), 2.2f));
        Cube("MonitoringWallGlow", new Vector3(8.15f, 1.95f, 1.25f), new Vector3(0.88f, 6.4f, 5.7f), Emissive(new Color(0.04f, 0.16f, 0.10f), new Color(0.20f, 1.00f, 0.72f), 12.8f));
        Cube("MonitoringPropRack", new Vector3(6.15f, 1.15f, 0.45f), new Vector3(0.28f, 1.8f, 0.9f), Mat(new Color(0.12f, 0.14f, 0.16f), 0.12f));
        Cube("MonitoringServerStack", new Vector3(6.0f, 0.85f, 2.25f), new Vector3(0.34f, 1.4f, 0.48f), Mat(new Color(0.10f, 0.12f, 0.14f), 0.12f));
        Cube("MonitoringServerGlow", new Vector3(6.0f, 0.90f, 2.0f), new Vector3(0.22f, 0.86f, 0.04f), Emissive(new Color(0.06f, 0.16f, 0.10f), new Color(0.18f, 0.95f, 0.50f), 2.8f));
        Cube("MonitoringStatusStrip", new Vector3(8.05f, 0.55f, 2.25f), new Vector3(0.12f, 0.28f, 0.86f), Emissive(new Color(0.06f, 0.16f, 0.10f), new Color(0.18f, 0.95f, 0.50f), 3.0f));
        Cube("MonitoringCableBundle", new Vector3(6.45f, 0.24f, 2.10f), new Vector3(0.46f, 0.06f, 0.24f), Mat(new Color(0.10f, 0.10f, 0.12f), 0.02f));
        Cube("MonitoringChairGlow", new Vector3(7.0f, 0.18f, 4.9f), new Vector3(1.1f, 0.03f, 1.1f), Emissive(new Color(0.05f, 0.16f, 0.10f), new Color(0.16f, 0.95f, 0.50f), 2.6f));
        Cube("MonitoringZoneGlow", new Vector3(7.2f, 0.02f, 1.2f), new Vector3(5.5f, 0.03f, 5.3f), Emissive(new Color(0.02f, 0.18f, 0.08f), new Color(0.14f, 0.85f, 0.40f), 3.8f));
        Cube("MonitoringDeskGlow", new Vector3(7.05f, 0.92f, 1.15f), new Vector3(2.0f, 0.05f, 0.82f), Emissive(new Color(0.04f, 0.18f, 0.10f), new Color(0.16f, 0.95f, 0.50f), 2.8f));
        var monitoringLbl = Txt("MonitoringLbl", "MONITORING", new Vector3(7.2f, 3.0f, 1.2f), 14, 0.10f, new Color(0.15f, 1.0f, 0.45f), FontStyle.Bold);
        _labelXforms.Add(monitoringLbl.transform);

        Vector3[] plantBases =
        {
            new Vector3(-8.45f, 0.0f, 6.95f),
            new Vector3(-3.55f, 0.0f, 7.15f),
            new Vector3(3.95f, 0.0f, 7.15f),
            new Vector3(8.18f, 0.0f, 6.88f)
        };
        for (int i = 0; i < plantBases.Length; i++)
        {
            Cyl(
                $"PlantPot_{i}",
                new Vector3(plantBases[i].x, 0.25f, plantBases[i].z),
                new Vector3(0.38f, 0.55f, 0.38f),
                Mat(new Color(0.55f, 0.32f, 0.12f), 0.08f));
            Cube(
                $"PlantLeaves_{i}",
                new Vector3(plantBases[i].x, 0.92f, plantBases[i].z),
                new Vector3(0.76f, 1.22f, 0.76f),
                Mat(new Color(0.22f, 0.56f, 0.28f, 1f), 0.05f));
        }

        Cube("WallShelfPropsL", new Vector3(-9.8f, 2.2f, 6.6f), new Vector3(0.20f, 0.16f, 2.6f), Mat(new Color(0.34f, 0.25f, 0.16f), 0.08f));
        Cube("WallShelfPropsR", new Vector3(9.8f, 2.2f, 6.6f), new Vector3(0.20f, 0.16f, 2.6f), Mat(new Color(0.34f, 0.25f, 0.16f), 0.08f));
        Cube("PerimeterCrateL", new Vector3(-9.2f, 0.35f, 5.9f), new Vector3(0.7f, 0.7f, 0.7f), Mat(new Color(0.52f, 0.34f, 0.18f), 0.06f));
        Cube("PerimeterCrateR", new Vector3(9.1f, 0.35f, 5.8f), new Vector3(0.7f, 0.7f, 0.7f), Mat(new Color(0.52f, 0.34f, 0.18f), 0.06f));
        Cube("PerimeterPanelL", new Vector3(-9.4f, 0.04f, 2.2f), new Vector3(1.8f, 0.02f, 1.2f), Mat(new Color(0.44f, 0.32f, 0.20f), 0.18f));
        Cube("PerimeterPanelR", new Vector3(9.3f, 0.04f, 2.1f), new Vector3(1.8f, 0.02f, 1.2f), Mat(new Color(0.44f, 0.32f, 0.20f), 0.18f));
        Cube("PerimeterToolCrateL", new Vector3(-8.6f, 0.42f, 4.8f), new Vector3(0.64f, 0.42f, 0.54f), Mat(new Color(0.56f, 0.38f, 0.20f), 0.06f));
        Cube("PerimeterToolCrateR", new Vector3(8.5f, 0.42f, 4.7f), new Vector3(0.64f, 0.42f, 0.54f), Mat(new Color(0.56f, 0.38f, 0.20f), 0.06f));
        Cube("PerimeterShelfBoxL", new Vector3(-9.7f, 2.45f, 6.2f), new Vector3(0.20f, 0.26f, 0.38f), Mat(new Color(0.54f, 0.36f, 0.20f), 0.06f));
        Cube("PerimeterShelfBoxR", new Vector3(9.7f, 2.45f, 6.1f), new Vector3(0.20f, 0.26f, 0.38f), Mat(new Color(0.54f, 0.36f, 0.20f), 0.06f));
        Cube("PerimeterFloorPropL", new Vector3(-9.0f, 0.18f, 3.4f), new Vector3(0.46f, 0.28f, 0.36f), Mat(new Color(0.48f, 0.34f, 0.22f), 0.07f));
        Cube("PerimeterFloorPropR", new Vector3(9.0f, 0.18f, 3.3f), new Vector3(0.46f, 0.28f, 0.36f), Mat(new Color(0.48f, 0.34f, 0.22f), 0.07f));
        Cube("PerimeterToolStackL", new Vector3(-8.7f, 0.36f, 6.2f), new Vector3(0.56f, 0.56f, 0.46f), Mat(new Color(0.54f, 0.36f, 0.20f), 0.07f));
        Cube("PerimeterToolStackR", new Vector3(8.6f, 0.36f, 6.1f), new Vector3(0.56f, 0.56f, 0.46f), Mat(new Color(0.54f, 0.36f, 0.20f), 0.07f));


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
        var eyeCol = new Color(0.36f, 0.95f, 1.00f, 1f);
        BuildAgent(
            new Vector3(-3.25f, 0.0f, 0.05f),
            "PLANNER",
            eyeCol,
            0f);

        BuildAgent(
            new Vector3(-6.85f, 0.0f, 0.95f),
            "WORKER",
            eyeCol,
            20f);

        BuildAgent(
            new Vector3(5.95f, 0.0f, 0.05f),
            "TESTER",
            eyeCol,
            -24f);

        BuildAgent(
            new Vector3(1.85f, 0.0f, 0.10f),
            "REVIEWER",
            eyeCol,
            -12f);
    }

    private void BuildAgent(Vector3 pos, string role, Color eyeCol, float rotY)
    {
        var root = new GameObject(role);
        root.transform.position = pos;
        root.transform.rotation = Quaternion.Euler(0f, rotY, 0f);
        root.transform.localScale = new Vector3(0.88f, 0.88f, 0.88f);

        Color body = new Color(0.85f, 0.85f, 0.88f);
        Color dark = new Color(0.10f, 0.10f, 0.12f);

        Go(root, PrimitiveType.Cylinder, "Base", new Vector3(0f, 0.16f, 0f), new Vector3(0.6f, 0.10f, 0.6f), Mat(dark));
        Go(root, PrimitiveType.Cube, "Body", new Vector3(0f, 0.72f, 0f), new Vector3(0.76f, 0.66f, 0.56f), Mat(body));
        var head = Go(root, PrimitiveType.Sphere, "Head", new Vector3(0f, 1.54f, 0f), new Vector3(0.65f, 0.60f, 0.58f), Mat(body));
        Go(root, PrimitiveType.Cube, "Face", new Vector3(0f, 1.54f, 0.30f), new Vector3(0.55f, 0.42f, 0.06f), Mat(dark));

        var eyeMat = Emissive(eyeCol * 0.2f, eyeCol, 2.2f);
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
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
        RenderSettings.ambientIntensity = 31.9f;
        RenderSettings.ambientLight = new Color(
            1.00f,
            0.84f,
            0.62f,
            1f);

        var def = GameObject.Find("Directional Light");
        if (def != null) Object.DestroyImmediate(def);

        L("MainDirectional", LightType.Directional, new Color(1.0f, 0.90f, 0.68f), 2.8f, 100f,
            LightShadows.Soft, Vector3.zero, Quaternion.Euler(40f, -20f, 0f));

        CreatePointLight(
            "WarmKey",
            new Vector3(0.0f, 4.8f, 0.8f),
            new Color(1.00f, 0.62f, 0.30f, 1f),
            5.4f,
            22f);

        CreatePointLight(
            "DispatchFill",
            new Vector3(-7.2f, 2.8f, 1.0f),
            new Color(1.00f, 0.56f, 0.18f, 1f),
            3.2f,
            10f);

        CreatePointLight(
            "MonitorFill",
            new Vector3(7.4f, 2.9f, 1.3f),
            new Color(0.30f, 1.00f, 0.78f, 1f),
            2.8f,
            11f);

        CreatePointLight(
            "Room2Glow",
            new Vector3(8.6f, 2.6f, 6.2f),
            new Color(1.00f, 0.58f, 0.16f, 1f),
            3.4f,
            9f);

    }

    private static void CreatePointLight(
        string n,
        Vector3 pos,
        Color c,
        float intensity,
        float range)
    {
        L(n, LightType.Point, c, intensity, range, LightShadows.None, pos, Quaternion.identity);
    }

    private static void L(
        string n,
        LightType t,
        Color c,
        float intensity,
        float range,
        LightShadows sh,
        Vector3 pos,
        Quaternion rot)
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
        var world = new Bounds(new Vector3(0f, 2f, 6f), new Vector3(32f, 8f, 24f));

        // Explicit navigation geometry to avoid invalid mesh sources from labels/FX objects.
        AddNavMeshSource("Floor");
        AddNavMeshSource("Room2Floor");

        if (_navSources.Count == 0)
        {
            Debug.LogWarning("[RuntimeSceneBuilder] NavMesh sources are empty.");
            return;
        }

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

    private void AddNavMeshSource(string objectName)
    {
        var go = GameObject.Find(objectName);
        if (go == null)
            return;

        var mf = go.GetComponent<MeshFilter>();
        if (mf == null || mf.sharedMesh == null)
            return;

        _navSources.Add(new NavMeshBuildSource
        {
            shape = NavMeshBuildSourceShape.Mesh,
            sourceObject = mf.sharedMesh,
            transform = go.transform.localToWorldMatrix,
            area = 0
        });
    }

    private static Vector3 SnapToNavMesh(Vector3 point, float maxDistance = 2f)
    {
        if (NavMesh.SamplePosition(point, out var hit, maxDistance, NavMesh.AllAreas))
        {
            return hit.position;
        }

        return point;
    }

    private void WireBackend()
    {
        var mgr = GameObject.Find("SceneManager")
                  ?? new GameObject("SceneManager");
        if (mgr.GetComponent<ApiClient>() == null)
            mgr.AddComponent<ApiClient>();

        BotMover Mv(int idx, string role, Vector3 idle, Vector3 board, Vector3 desk, Vector3 done)
        {
            if (idx >= _agents.Count)
                return null;

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
        var shader = Shader.Find("Universal Render Pipeline/Lit") ??
                     Shader.Find("Sprites/Default") ??
                     Shader.Find("UI/Default") ??
                     Shader.Find("Hidden/InternalErrorShader");
        var m = new Material(shader);
        m.color = c;
        if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", c);
        if (m.HasProperty("_Smoothness")) m.SetFloat("_Smoothness", Mathf.Clamp(smooth, 0.0f, 1.0f));
        if (m.HasProperty("_Metallic")) m.SetFloat("_Metallic", 0.05f);
        if (m.HasProperty("_BumpScale")) m.SetFloat("_BumpScale", 0.65f);
        return m;
    }

    private static Material Emissive(Color baseColor, Color emit, float mul)
    {
        var shader = Shader.Find("Universal Render Pipeline/Lit") ??
                     Shader.Find("Sprites/Default") ??
                     Shader.Find("UI/Default") ??
                     Shader.Find("Hidden/InternalErrorShader");
        var m = new Material(shader);
        var col = Color.Lerp(baseColor, emit, 0.6f);
        m.color = col;
        if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", col);
        if (m.HasProperty("_EmissionColor"))
        {
            m.EnableKeyword("_EMISSION");
            m.SetColor("_EmissionColor", emit * Mathf.Max(1f, mul));
        }
        if (m.HasProperty("_Smoothness")) m.SetFloat("_Smoothness", 0.32f);
        if (m.HasProperty("_BumpScale")) m.SetFloat("_BumpScale", 0.65f);
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
