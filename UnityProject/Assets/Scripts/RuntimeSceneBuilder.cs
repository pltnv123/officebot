using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.Rendering;

namespace OfficeHub
{
public sealed class RuntimeSceneBuilder : MonoBehaviour
{
    private readonly List<GameObject> _agents = new();
    private readonly List<Vector3> _agentIdle = new();
    private readonly List<Transform> _labelXforms = new();
    private readonly List<TextMesh> _liveTaskLabels = new();
    private readonly List<Renderer> _boardCardRenderers = new();
    private readonly List<int> _boardCardColumns = new();
    private readonly Color[] _columnHighlightColors = new Color[6];
    private TextMesh _wipText, _queueText, _blockersText, _throughputText;
    private float _t;
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

    private void Start()
    {
        SetupCamera();
        BuildRoom();
        BuildBoard();
        BuildZones();
        BuildAgents();
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
            float bob = Mathf.Sin(_t * 1.6f + i * 0.9f) * 0.05f;
            go.transform.position = new Vector3(p.x, p.y + bob, p.z);
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

        var nav = Mat(new Color(0.76f, 0.68f, 0.54f), 0.05f);
        Cube("PathBoardDesk", new Vector3(0f, -0.01f, 5f), new Vector3(2f, 0.02f, 8f), nav);      // center corridor
        Cube("PathDeskWorker", new Vector3(-3.5f, -0.01f, 1.5f), new Vector3(7f, 0.02f, 2f), nav); // left corridor
        Cube("PathDeskMonitoring", new Vector3(3.5f, -0.01f, 1.5f), new Vector3(7f, 0.02f, 2f), nav); // right corridor
        Cube("PathMonitoringRoom2", new Vector3(9f, -0.01f, 5f), new Vector3(2f, 0.02f, 6f), nav); // room2 corridor

        var wall = Mat(new Color(0.24f, 0.18f, 0.14f), 0.14f);
        Cube("BackWall", new Vector3(0f, 2.5f, 10f), new Vector3(24f, 5f, 0.25f), wall);
        Cube("DepthBackWall", new Vector3(0f, 3f, 9f), new Vector3(20f, 6f, 0.3f), Mat(new Color(0.15f, 0.12f, 0.08f), 0.12f));
        Cube("LeftWall", new Vector3(-10.8f, 2.5f, 3f), new Vector3(0.55f, 5f, 18f), wall);
        Cube("RightWall", new Vector3(10.8f, 2.5f, 3f), new Vector3(0.55f, 5f, 18f), wall);

        var shelf = Mat(new Color(0.32f, 0.27f, 0.20f), 0.1f);
        Cube("ShelfA", new Vector3(-11.6f, 2.0f, 1.0f), new Vector3(0.4f, 0.12f, 4.2f), shelf);
        Cube("ShelfB", new Vector3(-11.6f, 2.8f, 1.0f), new Vector3(0.4f, 0.12f, 4.2f), shelf);
    }

    private void BuildBoard()
    {
        float z = 8f;
        Cube("TaskBoard", new Vector3(0f, 2.5f, z), new Vector3(11f, 4f, 0.2f), Mat(new Color(0.12f, 0.12f, 0.12f), 0.08f));

        string[] headers = { "INBOX", "QUEUE", "PLAN", "WORK", "REVIEW", "DONE" };
        Color[] headerCols =
        {
            new Color(0.60f,0.60f,0.60f),
            new Color(0.90f,0.78f,0.33f),
            new Color(0.43f,0.62f,0.92f),
            new Color(0.92f,0.55f,0.28f),
            new Color(0.66f,0.45f,0.88f),
            new Color(0.40f,0.76f,0.40f)
        };

        for (int hi = 0; hi < headerCols.Length && hi < _columnHighlightColors.Length; hi++)
            _columnHighlightColors[hi] = headerCols[hi];

        float startX = -4.58f;
        float dx = 1.83f;
        float tz = z - 0.12f;

        for (int c = 0; c < headers.Length; c++)
        {
            float x = startX + c * dx;
            var colBody = (c % 2 == 0) ? new Color(0.16f, 0.16f, 0.16f) : new Color(0.20f, 0.20f, 0.20f);
            Cube($"BoardCol_{c}", new Vector3(x, 2.5f, tz + 0.02f), new Vector3(1.72f, 3.5f, 0.03f), Mat(colBody, 0.05f));
            Cube($"HdrStrip_{c}", new Vector3(x, 4.15f, tz + 0.03f), new Vector3(1.72f, 0.38f, 0.03f), Mat(headerCols[c], 0.04f));
            Txt($"Hdr{c}", headers[c], new Vector3(x, 4.15f, tz - 0.04f), 24, 0.12f, Color.white, FontStyle.Bold);

            for (int r = 0; r < 3; r++)
            {
                float y = 3.45f - r * 0.85f;
                var card = Cube($"Card_{c}_{r}", new Vector3(x, y, tz + 0.03f), new Vector3(1.45f, 0.55f, 0.03f), Mat(_boardCardBaseColor, 0.04f));
                var renderer = card.GetComponent<Renderer>();
                if (renderer != null)
                {
                    _boardCardRenderers.Add(renderer);
                    _boardCardColumns.Add(c);
                }
                _liveTaskLabels.Add(Txt($"Task_{c}_{r}", $"{headers[c]} {r + 1}", new Vector3(x, y, tz - 0.04f), 10, 0.08f, Color.white));
            }
        }

        _wipText = Txt("WIP", "WIP 00", new Vector3(-2.0f, 0.95f, tz), 10, 0.08f, new Color(1f, 0.93f, 0.72f), FontStyle.Bold);
        _queueText = Txt("QUEUE", "QUEUE 00", new Vector3(-6.3f, 0.95f, tz), 9, 0.08f, new Color(0.92f, 0.86f, 0.68f));
        _blockersText = Txt("BLK", "BLOCKERS 0", new Vector3(1.5f, 0.95f, tz), 9, 0.08f, new Color(1f, 0.74f, 0.66f));
        _throughputText = Txt("THRU", "THROUGHPUT 0", new Vector3(6.0f, 0.95f, tz), 9, 0.08f, new Color(0.74f, 0.90f, 1f));
    }

    private void BuildZones()
    {
        // ROOM 2 door (top-right)
        var frame = Emissive(new Color(0.30f, 0.18f, 0.06f), new Color(1.0f, 0.55f, 0.08f), 3.0f);
        Cube("Room2L", new Vector3(6.3f, 2f, 8.5f), new Vector3(0.2f, 2f, 0.2f), frame);
        Cube("Room2R", new Vector3(7.7f, 2f, 8.5f), new Vector3(0.2f, 2f, 0.2f), frame);
        Cube("Room2Top", new Vector3(7f, 3f, 8.5f), new Vector3(1.6f, 0.2f, 0.2f), frame);
        Txt("Room2Lbl", "ROOM 2", new Vector3(7f, 3.5f, 8.3f), 26, 0.12f, new Color(1f, 0.85f, 0.55f), FontStyle.Bold);

        // Dispatch zone (left, detailed)
        Cube("DispatchDesk", new Vector3(-6.5f, 0.45f, 5f), new Vector3(2.5f, 0.9f, 1.2f), Mat(new Color(0.45f, 0.28f, 0.10f), 0.12f));
        Cube("DispatchPanel", new Vector3(-7.3f, 0.8f, 5f), new Vector3(0.3f, 1.6f, 1.2f), Mat(new Color(0.3f, 0.18f, 0.06f), 0.12f));
        Cube("DispatchTerminal", new Vector3(-6.5f, 1.2f, 4.5f), new Vector3(0.8f, 0.55f, 0.06f), Mat(new Color(0.05f, 0.05f, 0.12f), 0.1f));
        Cube("DispatchTerminalGlow", new Vector3(-6.5f, 1.2f, 4.44f), new Vector3(0.7f, 0.45f, 0.02f), Emissive(new Color(0.4f, 0.2f, 0.05f), new Color(0.8f, 0.5f, 0.05f), 2.0f));
        Cube("DispatchBox1", new Vector3(-5.5f, 0.3f, 5.5f), new Vector3(0.7f, 0.6f, 0.6f), Mat(new Color(0.7f, 0.55f, 0.25f), 0.05f));
        Cube("DispatchBox2", new Vector3(-5.5f, 0.9f, 5.5f), new Vector3(0.6f, 0.5f, 0.55f), Mat(new Color(0.65f, 0.5f, 0.2f), 0.05f));
        Cube("DispatchBox3", new Vector3(-5.2f, 0.3f, 4.8f), new Vector3(0.55f, 0.55f, 0.5f), Mat(new Color(0.72f, 0.58f, 0.28f), 0.05f));
        Cube("DispatchZoneGlow", new Vector3(-6.5f, 0.02f, 5f), new Vector3(3.5f, 0.03f, 3.5f), Mat(new Color(0.25f, 0.125f, 0f), 0.02f));
        var dispatchLbl = Txt("DispatchLbl", "DISPATCH", new Vector3(-6.5f, 2.5f, 5f), 16, 0.10f, new Color(1.0f, 0.55f, 0.0f), FontStyle.Bold);
        _labelXforms.Add(dispatchLbl.transform);

        // Central desk (bigger)
        Cube("CentralDesk", new Vector3(0f, 0.40f, 1f), new Vector3(4f, 0.8f, 2.5f), Mat(new Color(0.55f, 0.35f, 0.15f), 0.18f));
        Cube("DeskPaperA", new Vector3(-0.55f, 0.72f, 0.75f), new Vector3(0.8f, 0.02f, 0.6f), Mat(new Color(0.92f, 0.90f, 0.82f), 0.03f));
        Cube("DeskPaperB", new Vector3(0.45f, 0.72f, 1.2f), new Vector3(0.9f, 0.02f, 0.6f), Mat(new Color(0.92f, 0.90f, 0.82f), 0.03f));

        // Monitoring zone (right)
        Vector3[] monPos =
        {
            new Vector3(6f, 1.2f, 5f),
            new Vector3(6.8f, 1.2f, 5f),
            new Vector3(7f, 1.2f, 4.2f)
        };
        for (int i = 0; i < monPos.Length; i++)
            Cube($"Mon{i}", monPos[i], new Vector3(0.8f, 0.6f, 0.1f), Mat(new Color(0.08f, 0.09f, 0.11f), 0.2f));
        Txt("MonitoringLbl", "MONITORING", new Vector3(5.5f, 1.5f, 3.5f), 22, 0.10f, new Color(0.85f, 1f, 0.85f), FontStyle.Bold);

        // Zone decorations
        Cube("CenterRug", new Vector3(0f, -0.01f, 1.0f), new Vector3(5.8f, 0.01f, 3.0f), Mat(new Color(0.58f, 0.50f, 0.42f), 0.02f));
        Cube("DispatchPlantPot", new Vector3(-10.2f, 0.30f, 3.7f), new Vector3(0.45f, 0.60f, 0.45f), Mat(new Color(0.42f, 0.28f, 0.16f), 0.10f));
        var dispatchPlant = new GameObject("DispatchPlant");
        dispatchPlant.transform.position = new Vector3(-10.2f, 0.30f, 3.7f);
        Go(dispatchPlant, PrimitiveType.Sphere, "Leaves", new Vector3(0f, 0.65f, 0f), new Vector3(0.95f, 1.10f, 0.95f), Mat(new Color(0.22f, 0.52f, 0.24f), 0.05f));

        Cube("MonitoringPlantPot", new Vector3(10.4f, 0.30f, 3.9f), new Vector3(0.45f, 0.60f, 0.45f), Mat(new Color(0.42f, 0.28f, 0.16f), 0.10f));
        var monitoringPlant = new GameObject("MonitoringPlant");
        monitoringPlant.transform.position = new Vector3(10.4f, 0.30f, 3.9f);
        Go(monitoringPlant, PrimitiveType.Sphere, "Leaves", new Vector3(0f, 0.65f, 0f), new Vector3(0.95f, 1.10f, 0.95f), Mat(new Color(0.24f, 0.55f, 0.28f), 0.05f));

        Cube("DeskLampStem", new Vector3(1.3f, 1.00f, 1.3f), new Vector3(0.07f, 0.55f, 0.07f), Mat(new Color(0.18f, 0.18f, 0.20f), 0.2f));
        Cube("DeskLampHead", new Vector3(1.3f, 1.30f, 1.3f), new Vector3(0.22f, 0.14f, 0.22f), Emissive(new Color(0.25f, 0.18f, 0.10f), new Color(1f, 0.72f, 0.35f), 2.2f));
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
        Go(root, PrimitiveType.Sphere, "Head", new Vector3(0f, 1.54f, 0f), new Vector3(0.65f, 0.60f, 0.58f), Mat(body));
        Go(root, PrimitiveType.Cube, "Face", new Vector3(0f, 1.54f, 0.30f), new Vector3(0.55f, 0.42f, 0.06f), Mat(dark));

        var eyeMat = Emissive(eyeCol * 0.2f, eyeCol, 6f);
        Go(root, PrimitiveType.Sphere, "EyeL", new Vector3(-0.15f, 1.54f, 0.34f), new Vector3(0.26f, 0.26f, 0.12f), eyeMat);
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
        RenderSettings.ambientIntensity = 1.2f;
        RenderSettings.ambientLight = new Color(1.0f, 0.88f, 0.65f);

        var def = GameObject.Find("Directional Light");
        if (def != null) Object.DestroyImmediate(def);

        L("MainDirectional", LightType.Directional, new Color(1.0f, 0.92f, 0.75f), 1.8f, 100f,
            LightShadows.Soft, Vector3.zero, Quaternion.Euler(40f, -20f, 0f));
        L("DispatchPoint", LightType.Point, new Color(1.0f, 0.55f, 0.05f), 3.0f, 10f,
            LightShadows.None, new Vector3(-7f, 3f, 5f), Quaternion.identity);
        L("MonitoringPoint", LightType.Point, new Color(0.15f, 1.0f, 0.45f), 2.5f, 10f,
            LightShadows.None, new Vector3(7f, 3f, 5f), Quaternion.identity);
        L("DeskPoint", LightType.Point, new Color(1.0f, 0.95f, 0.7f), 2.0f, 8f,
            LightShadows.None, new Vector3(0f, 4f, 3f), Quaternion.identity);
        L("BoardPoint", LightType.Point, new Color(0.9f, 0.95f, 1.0f), 1.5f, 12f,
            LightShadows.None, new Vector3(0f, 5f, 9f), Quaternion.identity);
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

    private void WireBackend()
    {
        var mgr = GameObject.Find("SceneManager") ?? new GameObject("SceneManager");
        if (mgr.GetComponent<ApiClient>() == null) mgr.AddComponent<ApiClient>();

        BotMover Mv(int idx, string role, Vector3 idle, Vector3 desk, Vector3 done)
        {
            if (idx >= _agents.Count) return null;
            var go = _agents[idx];
            var mv = go.GetComponent<BotMover>() ?? go.AddComponent<BotMover>();
            mv.SetRole(role);
            mv.idlePos = idle;
            mv.boardPos = new Vector3(0f, 0f, 8f);
            mv.deskPos = desk;
            mv.donePos = done;
            return mv;
        }

        // Map existing orchestrator roles to planner/worker/tester.
        var plannerM = Mv(1, "planner", new Vector3(-1.8f, 0f, 0.5f), new Vector3(-1.3f, 0f, 1.2f), new Vector3(5.2f, 0f, 8.6f));
        var workerM = Mv(2, "worker", new Vector3(-6.5f, 0f, 2.5f), new Vector3(-0.3f, 0f, 1.0f), new Vector3(5.6f, 0f, 8.6f));
        var testerM = Mv(3, "tester", new Vector3(6.5f, 0f, 2.5f), new Vector3(0.8f, 0f, 1.0f), new Vector3(6.0f, 0f, 8.6f));

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

    [System.Serializable] private sealed class RT { public string title, status; }
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

                    for (int i = 0; i < _liveTaskLabels.Count; i++)
                    {
                        var tm = _liveTaskLabels[i];
                        if (tm == null) continue;
                        tm.text = i < tasks.Count ? (tasks[i].title ?? $"Task {i + 1}") : "";
                    }

                    UpdateBoardCardColors(columnCounts);

                    if (_wipText != null) _wipText.text = $"WIP {doing:00}";
                    if (_queueText != null) _queueText.text = $"QUEUE {tasks.Count:00}";
                    if (_blockersText != null) _blockersText.text = $"BLOCKERS {Mathf.Max(0, doing - 3)}";
                    if (_throughputText != null) _throughputText.text = $"THROUGHPUT {done:00}";
                }
            }

            req.Dispose();
            yield return new WaitForSeconds(3f);
        }
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
