using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Networking;

namespace OfficeHub
{
    public sealed class RuntimeSceneBuilder : MonoBehaviour
    {
        private readonly List<GameObject> _robots = new();
        private readonly List<Transform> _robotTransforms = new();
        private readonly List<Vector3> _robotBasePos = new();
        private readonly List<Light> _eyeLights = new();
        private readonly List<Light> _monitorGlowLights = new();
        private readonly List<Vector3> _robotIdleAnchors = new();
        private readonly List<Material> _eyePulseMats = new();
        private float _time;

        private Material _floorMat;
        private Material _tileLineMat;
        private Material _leftWallMat;
        private Material _backWallMat;
        private Material _boardMat;
        private Material _frameMat;
        private Material _dividerMat;
        private Material _deskMat;
        private Material _legMat;
        private Material _paperMat;
        private Material _darkMat;
        private Material _robotBodyMat;
        private Material _robotHeadMat;
        private Material _facePlateMat;
        private readonly List<TextMesh> _liveTaskLabels = new();
        private TextMesh _wipCounterText;
        private TextMesh _queueDepthText;
        private TextMesh _blockersText;
        private TextMesh _throughputText;
        private readonly List<Transform> _robotLabelTransforms = new();
        [SerializeField] private string taskStateUrl = "/api/state";

        private void Start()
        {
            // ROUND_12: reset runtime caches before scene construction
            _robots.Clear();
            _robotTransforms.Clear();
            _robotBasePos.Clear();
            _eyeLights.Clear();
            _monitorGlowLights.Clear();
            _robotIdleAnchors.Clear();
            _eyePulseMats.Clear();
            _robotLabelTransforms.Clear();
            SetupMaterials();
            SetupCamera();
            BuildRoom();
            BuildTaskBoard();
            BuildDeskAndProps();
            BuildRobots();
            BuildMonitors();
            BuildLighting();
            BuildPlants();

            // ═══════════════════════════════════════════════
            // WIRE UP TASK PIPELINE
            // ═══════════════════════════════════════════════

            // 1. Find or create SceneManager object
            var mgr = GameObject.Find("SceneManager")
             ?? new GameObject("SceneManager");

            // 2. Add ApiClient
            var api = mgr.GetComponent<ApiClient>()
             ?? mgr.AddComponent<ApiClient>();

            // 3. Setup robot movers from _robotTransforms list
            // Index 0 = WORKER, 1 = PLANNER, 2 = REVIEWER
            BotMover AddMover(int idx, string role,
             Vector3 idle, Vector3 desk, Vector3 done)
            {
             if (idx >= _robotTransforms.Count) return null;
             var go = _robotTransforms[idx].gameObject;
             var mover = go.GetComponent<BotMover>()
             ?? go.AddComponent<BotMover>();
             mover.SetRole(role);
             mover.idlePos = idle;
             mover.boardPos = new Vector3(0f, 0f, 7.0f);
             mover.deskPos = desk;
             mover.donePos = done;
             // Collect eye lights
             mover.eyeLights.Clear();
             foreach (var lt in go.GetComponentsInChildren<Light>())
             mover.eyeLights.Add(lt);
             return mover;
            }

            var plannerMover = AddMover(1, "planner",
             new Vector3(-3.5f, 0f, 1.5f),
             new Vector3(-3.5f, 0f, 0.5f),
             new Vector3( 5.5f, 0f, 7.0f));

            var workerMover = AddMover(0, "worker",
             new Vector3( 0.0f, 0f, 0.0f),
             new Vector3( 0.0f, 0f, 0.5f),
             new Vector3( 5.5f, 0f, 7.0f));

            var testerMover = AddMover(2, "tester",
             new Vector3( 3.5f, 0f, 1.5f),
             new Vector3( 3.5f, 0f, 0.5f),
             new Vector3( 5.5f, 0f, 7.0f));

            // 4. Setup TaskOrchestrator
            var orch = mgr.GetComponent<TaskOrchestrator>()
             ?? mgr.AddComponent<TaskOrchestrator>();
            orch.plannerBot = plannerMover;
            orch.workerBot = workerMover;
            orch.testerBot = testerMover;

            // 5. Setup StatePoller
            var poller = mgr.GetComponent<StatePoller>()
             ?? mgr.AddComponent<StatePoller>();
            poller.orchestrator = orch;

            // 6. Rename SceneManager so JS can find it
            mgr.name = "SceneManager";
            StartCoroutine(PollTaskState());
        }

        private void Update()
        {
            _time += Time.deltaTime;

            for (int i = 0; i < _robots.Count; i++)
            {
                var r = _robots[i];
                if (r == null) continue;
                var anchor = i < _robotIdleAnchors.Count ? _robotIdleAnchors[i] : r.transform.position;
                float bobY = Mathf.Sin(_time * 1.8f + i * 1.6f) * 0.09f;
                r.transform.position = new Vector3(anchor.x, anchor.y + bobY, anchor.z);
                r.transform.rotation = Quaternion.Euler(0f, r.transform.rotation.eulerAngles.y, Mathf.Sin(_time * 1.25f + i * 0.8f) * 1.9f);
            }

            // ROUND_6: per-robot eye light phase offsets
            for (int i = 0; i < _eyeLights.Count; i++)
            {
                var light = _eyeLights[i];
                if (light == null) continue;
                light.range = 7.0f;
                light.intensity = 6.0f + Mathf.Sin(_time * 3.0f + i * 0.9f) * 1.8f;
            }


            for (int i = 0; i < _eyePulseMats.Count; i++)
            {
                var mat = _eyePulseMats[i];
                if (mat == null || !mat.HasProperty("_EmissionColor")) continue;
                float pulse = 12.0f + Mathf.Sin(_time * 3.3f + i * 0.7f) * 4.0f;
                mat.SetColor("_EmissionColor", mat.color * pulse);
            }

            // ROUND_11: monitor glow breathing rhythm
            for (int i = 0; i < _monitorGlowLights.Count; i++)
            {
                var glow = _monitorGlowLights[i];
                if (glow == null) continue;
                glow.intensity = 0.28f + Mathf.Sin(_time * 1.6f + i * 0.7f) * 0.14f;
            }

            var cam = Camera.main;
            if (cam != null)
            {
                for (int i = 0; i < _robotLabelTransforms.Count; i++)
                {
                    var label = _robotLabelTransforms[i];
                    if (label == null) continue;
                    var toCam = cam.transform.position - label.position;
                    if (toCam.sqrMagnitude > 0.0001f)
                    {
                        label.rotation = Quaternion.LookRotation(-toCam.normalized, Vector3.up);
                    }
                }
            }
        }

        private static Shader LitShader() => Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard") ?? Shader.Find("Diffuse");

        private static Material NewMat(Color c, float smooth = 0.2f)
        {
            var m = new Material(LitShader()) { color = c };
            if (m.HasProperty("_Smoothness")) m.SetFloat("_Smoothness", smooth);
            if (m.HasProperty("_Glossiness")) m.SetFloat("_Glossiness", smooth);
            return m;
        }

        private static Material NewEmissive(Color baseColor, Color emit, float mul)
        {
            var m = NewMat(baseColor, 0.25f);
            if (m.HasProperty("_EmissionColor"))
            {
                m.EnableKeyword("_EMISSION");
                m.SetColor("_EmissionColor", emit * mul);
            }
            return m;
        }

        private void SetupMaterials()
        {
            _floorMat = NewMat(new Color(0.54f, 0.48f, 0.38f), 0.08f); // floor
            _tileLineMat = NewMat(new Color(0.38f, 0.33f, 0.26f), 0.05f);
            _leftWallMat = NewMat(new Color(0.08f, 0.09f, 0.13f), 0.08f);
            _backWallMat = NewMat(new Color(0.08f, 0.09f, 0.13f), 0.08f);
            _boardMat = NewMat(new Color(0.08f, 0.09f, 0.12f), 0.1f);
            _frameMat = NewMat(new Color(0.30f, 0.30f, 0.35f), 0.15f);
            _dividerMat = NewMat(new Color(0.25f, 0.25f, 0.30f), 0.15f);
            _deskMat = NewMat(new Color(0.30f, 0.20f, 0.12f), 0.3f);
            _legMat = NewMat(new Color(0.24f, 0.16f, 0.10f), 0.22f);
            _paperMat = NewMat(new Color(0.9f, 0.88f, 0.82f), 0.05f);
            _darkMat = NewMat(new Color(0.08f, 0.08f, 0.10f), 0.15f);
            _robotBodyMat = NewMat(new Color(0.75f, 0.75f, 0.78f), 0.3f);
            _robotHeadMat = NewMat(new Color(0.80f, 0.80f, 0.82f), 0.35f);
            _facePlateMat = NewMat(new Color(0.08f, 0.08f, 0.10f), 0.2f);
        }

        private static void SetupCamera()
        {
            var cam = Camera.main;
            if (cam == null) return;

            // Perspective — matches reference image style
            cam.orthographic = false;
            cam.fieldOfView = 45f;

            // Position: above and in front, looking into scene
            cam.transform.position = new Vector3(0f, 5.6f, -6.8f);
            cam.transform.rotation = Quaternion.Euler(32f, 0f, 0f);

            cam.backgroundColor = new Color(0.04f, 0.05f, 0.08f);
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.nearClipPlane = 0.3f;
            cam.farClipPlane = 80f;
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

        private static TextMesh Txt(string n, string t, Vector3 p, int size, float ch, Color c, FontStyle fs = FontStyle.Normal)
        {
            var g = new GameObject(n);
            g.transform.position = p;
            var tm = g.AddComponent<TextMesh>();
            tm.text = t;
            tm.fontSize = size;
            tm.characterSize = ch;
            tm.color = c;
            tm.fontStyle = fs;
            tm.anchor = TextAnchor.MiddleCenter;
            tm.alignment = TextAlignment.Center;
            return tm;
        }

        private void BuildRoom()
        {
            Cube("Floor", new Vector3(0f, -0.05f, 0f), new Vector3(12f, 0.1f, 10f), _floorMat);

            for (int i = 0; i < 6; i++)
            {
                float x = -8.75f + i * 3.5f;
                Cube($"Tile_X_{i}", new Vector3(x, 0.06f, 0f), new Vector3(0.05f, 0.02f, 18f), _tileLineMat);
            }
            for (int j = 0; j < 5; j++)
            {
                float z = -7.2f + j * 3.6f;
                Cube($"Tile_Z_{j}", new Vector3(0f, 0.06f, z), new Vector3(22f, 0.02f, 0.05f), _tileLineMat);
            }

            Cube("LeftWall", new Vector3(-11f, 3f, 3f), new Vector3(0.3f, 6f, 18f), _leftWallMat);
            Cube("BackWall", new Vector3(0f, 3f, 9f), new Vector3(22f, 6f, 0.3f), _backWallMat);
        }

        private void BuildTaskBoard()
        {
            // ROUND_3: richer board lanes and progress rail
            Cube("TaskBoard", new Vector3(0f, 2.3f, 4.2f), new Vector3(8f, 2f, 0.2f), _boardMat);
            Cube("BoardFrameTop", new Vector3(0f, 3.35f, 4.09f), new Vector3(8.2f, 0.08f, 0.1f), _frameMat);
            Cube("BoardFrameBottom", new Vector3(0f, 1.25f, 4.09f), new Vector3(8.2f, 0.08f, 0.1f), _frameMat);
            Cube("BoardFrameLeft", new Vector3(-4.05f, 2.3f, 4.09f), new Vector3(0.08f, 2.0f, 0.1f), _frameMat);
            Cube("BoardFrameRight", new Vector3(4.05f, 2.3f, 4.09f), new Vector3(0.08f, 2.0f, 0.1f), _frameMat);

            Cube("Divider1", new Vector3(-2.3f, 3.5f, 8.5f), new Vector3(0.08f, 4.5f, 0.1f), _dividerMat);
            Cube("Divider2", new Vector3(2.3f, 3.5f, 8.5f), new Vector3(0.08f, 4.5f, 0.1f), _dividerMat);

            Txt("H_INBOX", "INBOX", new Vector3(-4.6f, 5.5f, 8.4f), 28, 0.12f, Color.white, FontStyle.Bold);
            Txt("H_PLAN", "PLAN", new Vector3(0f, 5.5f, 8.4f), 28, 0.12f, Color.white, FontStyle.Bold);
            Txt("H_WORK", "WORK", new Vector3(4.6f, 5.5f, 8.4f), 28, 0.12f, Color.white, FontStyle.Bold);

            MakeCard(-4.6f, 4.8f, new Color(0.55f, 0.65f, 0.75f), "Inbox A");
            MakeCard(-4.6f, 4.1f, new Color(0.50f, 0.60f, 0.70f), "Inbox B");
            MakeCard(-4.6f, 3.4f, new Color(0.45f, 0.55f, 0.65f), "Inbox C");
            MakeCard(-4.6f, 2.7f, new Color(0.40f, 0.50f, 0.60f), "Inbox D");

            MakeCard(0f, 4.8f, new Color(0.75f, 0.65f, 0.25f), "Plan A");
            MakeCard(0f, 4.1f, new Color(0.70f, 0.60f, 0.22f), "Plan B");
            MakeCard(0f, 3.4f, new Color(0.65f, 0.55f, 0.20f), "Plan C");

            MakeCard(4.6f, 4.8f, new Color(0.25f, 0.50f, 0.75f), "Work A");
            MakeCard(4.6f, 4.1f, new Color(0.22f, 0.45f, 0.70f), "Work B");
            MakeCard(4.6f, 3.4f, new Color(0.30f, 0.55f, 0.45f), "Work C");

            Cube("DoneBadge", new Vector3(4.6f, 5.0f, 8.4f), new Vector3(2.0f, 0.4f, 0.05f), NewMat(new Color(0.25f, 0.50f, 0.75f), 0.2f));
            Txt("DoneText", "DONE", new Vector3(4.6f, 5.0f, 8.35f), 10, 0.12f, Color.white, FontStyle.Bold);

            Cube("UrgentRail", new Vector3(0f, 1.45f, 8.45f), new Vector3(13.4f, 0.12f, 0.05f), NewEmissive(new Color(0.3f, 0.06f, 0.07f), new Color(1f, 0.12f, 0.08f), 0.8f));
            _wipCounterText = Txt("WIPCounter", "WIP 07", new Vector3(0f, 1.8f, 8.35f), 10, 0.1f, new Color(0.85f, 0.92f, 1f), FontStyle.Bold);
            Txt("SLAInfo", "SLA 99.2%", new Vector3(-5.6f, 1.8f, 8.35f), 8, 0.09f, new Color(0.75f, 0.85f, 1f));
            Txt("FlowInfo", "FLOW +12", new Vector3(5.6f, 1.8f, 8.35f), 8, 0.09f, new Color(0.70f, 1f, 0.78f));
            // ROUND_7: board footer telemetry labels
            _queueDepthText = Txt("QueueDepth", "QUEUE 23", new Vector3(-5.6f, 1.3f, 8.35f), 8, 0.08f, new Color(0.92f, 0.86f, 0.68f));
            _blockersText = Txt("Blockers", "BLOCKERS 2", new Vector3(0f, 1.3f, 8.35f), 8, 0.08f, new Color(1f, 0.72f, 0.70f));
            _throughputText = Txt("Throughput", "THROUGHPUT 19", new Vector3(5.6f, 1.3f, 8.35f), 8, 0.08f, new Color(0.74f, 0.90f, 1f));
        }

        private void MakeCard(float x, float y, Color color, string label)
        {
            Cube($"Card_{x}_{y}", new Vector3(x, y, 8.4f), new Vector3(3.5f, 0.55f, 0.05f), NewMat(color, 0.12f));
            var tm = Txt($"CardTxt_{x}_{y}", label, new Vector3(x, y, 8.34f), 8, 0.09f, Color.white);
            _liveTaskLabels.Add(tm);
        }

        private void BuildDeskAndProps()
        {
            Cube("DeskTop", new Vector3(0f, 0.76f, 0f), new Vector3(3.0f, 0.06f, 1.2f), _deskMat);
            Cube("DeskLeg_FL", new Vector3(-1.3f, 0.37f, -0.5f), new Vector3(0.1f, 0.74f, 0.1f), _legMat);
            Cube("DeskLeg_FR", new Vector3(1.3f, 0.37f, -0.5f), new Vector3(0.1f, 0.74f, 0.1f), _legMat);
            Cube("DeskLeg_BL", new Vector3(-1.3f, 0.37f, 0.5f), new Vector3(0.1f, 0.74f, 0.1f), _legMat);
            Cube("DeskLeg_BR", new Vector3(1.3f, 0.37f, 0.5f), new Vector3(0.1f, 0.74f, 0.1f), _legMat);

            Vector3[] paperPos = {
                new(-1.5f,0.69f,1.2f), new(-0.4f,0.69f,1.9f), new(0.9f,0.69f,2.5f),
                new(1.6f,0.69f,1.4f), new(-1.0f,0.69f,2.8f), new(0.2f,0.69f,1.0f)
            };
            for (int i = 0; i < paperPos.Length; i++)
            {
                var p = Cube($"Paper_{i}", paperPos[i], new Vector3(1.2f, 0.02f, 0.9f), _paperMat);
                p.transform.rotation = Quaternion.Euler(0f, Random.Range(-15f, 15f), 0f);
            }

            var cup = Cyl("CoffeeCup", new Vector3(-1.5f, 0.75f, 1.5f), new Vector3(0.15f, 0.2f, 0.15f), NewMat(new Color(0.15f, 0.10f, 0.08f), 0.2f));
            Cube("CupHandle", new Vector3(-1.3f, 0.75f, 1.5f), new Vector3(0.04f, 0.12f, 0.12f), NewMat(new Color(0.15f, 0.10f, 0.08f), 0.2f)).transform.SetParent(cup.transform);

            var pencil = Cyl("Pencil", new Vector3(0.9f, 0.74f, 2.2f), new Vector3(0.03f, 0.4f, 0.03f), NewMat(new Color(0.8f, 0.6f, 0.1f), 0.1f));
            pencil.transform.rotation = Quaternion.Euler(0f, 0f, 90f);

            Cube("Stapler", new Vector3(-0.6f, 0.73f, 2.4f), new Vector3(0.3f, 0.12f, 0.15f), _darkMat);
            var sc1 = Cyl("Scissor1", new Vector3(0.2f, 0.73f, 2.7f), new Vector3(0.02f, 0.18f, 0.02f), _darkMat); sc1.transform.rotation = Quaternion.Euler(0f, 25f, 78f);
            var sc2 = Cyl("Scissor2", new Vector3(0.25f, 0.73f, 2.66f), new Vector3(0.02f, 0.18f, 0.02f), _darkMat); sc2.transform.rotation = Quaternion.Euler(0f, -20f, 78f);
            Cube("PaperStack1", new Vector3(1.4f, 0.69f, 2.1f), new Vector3(0.9f, 0.02f, 0.7f), _paperMat);
            Cube("PaperStack2", new Vector3(1.43f, 0.71f, 2.12f), new Vector3(0.9f, 0.02f, 0.7f), _paperMat);
            Cube("PaperStack3", new Vector3(1.46f, 0.73f, 2.14f), new Vector3(0.9f, 0.02f, 0.7f), _paperMat);
            // ROUND_8: add keyboard strip and mouse prop
            Cube("Keyboard", new Vector3(0f, 0.72f, 1.55f), new Vector3(1.4f, 0.04f, 0.4f), NewMat(new Color(0.1f, 0.1f, 0.12f), 0.15f));
            Cube("Mouse", new Vector3(1.0f, 0.73f, 1.55f), new Vector3(0.16f, 0.05f, 0.24f), NewMat(new Color(0.18f, 0.18f, 0.2f), 0.2f));
        }

        private void BuildRobots()
        {
            var worker = BuildRobot(new Vector3(-2.5f, 0f, -1.0f), new Color(0.10f, 0.95f, 0.72f), "WORKER");
 if (worker) worker.transform.rotation = Quaternion.Euler(0f, 35f, 0f);
            worker.transform.rotation = Quaternion.Euler(0f, 35f, 0f);
            var wArm = worker.transform.Find("ArmLUp");
            if (wArm != null) wArm.localRotation = Quaternion.Euler(-65f, 0f, 35f);

            var planner = BuildRobot(new Vector3(0f, 0f, -2.0f), new Color(0.15f, 0.50f, 1.00f), "PLANNER");
            planner.transform.rotation = Quaternion.Euler(0f, 0f, 0f);

            var reviewer = BuildRobot(new Vector3(2.5f, 0f, -1.0f), new Color(0.10f, 0.95f, 0.72f), "REVIEWER");
 if (reviewer) reviewer.transform.rotation = Quaternion.Euler(0f, -40f, 0f);
            reviewer.transform.rotation = Quaternion.Euler(0f, -40f, 0f);
        }
        private GameObject BuildRobot(Vector3 position, Color eyeColor, string roleName)
        {
            var root = BuildRobotFromPrimitives(position, eyeColor, roleName);

            EnsureEyeGlowLight(root, eyeColor);

            var labelGo = new GameObject("Label");
            labelGo.transform.parent = root.transform;
            labelGo.transform.localPosition = new Vector3(0, 2.5f, 0);
            var tm = labelGo.AddComponent<TextMesh>();
            tm.text = roleName;
            tm.fontSize = 18;
            tm.color = Color.white;
            tm.anchor = TextAnchor.MiddleCenter;
            tm.alignment = TextAlignment.Center;
            labelGo.transform.localScale = Vector3.one * 0.18f;
            _robotLabelTransforms.Add(labelGo.transform);

            _robots.Add(root);
            _robotIdleAnchors.Add(position);
            foreach (var lt in root.GetComponentsInChildren<Light>(true)) _eyeLights.Add(lt);

            return root;
        }

        private void EnsureEyeGlowLight(GameObject root, Color eyeColor)
        {
            if (root == null) return;
            var eyeGlow = root.transform.Find("EyeGlow");
            if (eyeGlow == null)
            {
                var glowGo = new GameObject("EyeGlow");
                glowGo.transform.SetParent(root.transform);
                eyeGlow = glowGo.transform;
            }

            eyeGlow.gameObject.name = "EyeGlow";
            eyeGlow.localPosition = new Vector3(0f, 1.50f, 0.43f);
            eyeGlow.localRotation = Quaternion.identity;
            var lt = eyeGlow.GetComponent<Light>() ?? eyeGlow.gameObject.AddComponent<Light>();
            lt.type = LightType.Point;
            lt.color = eyeColor;
            lt.range = 5.0f;
            lt.intensity = 4.0f;
            lt.shadows = LightShadows.None;
        }

        private GameObject TryLoadFbxRobot(Vector3 position, string roleName)
        {
            var prefab = Resources.Load<GameObject>("Models/" + roleName);
            if (prefab == null) return null;

            var go = Instantiate(prefab, position, Quaternion.identity);
            go.name = roleName + "_bot";

            var renderers = go.GetComponentsInChildren<Renderer>(true);
            if (renderers == null || renderers.Length == 0)
            {
                Destroy(go);
                return null;
            }

            // Normalize suspicious FBX scale so robots stay visible in frame.
            var ls = go.transform.localScale;
            if (ls.x < 0.01f || ls.y < 0.01f || ls.z < 0.01f)
            {
                go.transform.localScale = Vector3.one;
            }

            var bounds = renderers[0].bounds;
            for (int i = 1; i < renderers.Length; i++) bounds.Encapsulate(renderers[i].bounds);
            if (bounds.size.sqrMagnitude < 0.001f)
            {
                Destroy(go);
                return null;
            }

            foreach (var r in renderers)
            {
                foreach (var mat in r.materials)
                {
                    if (mat.name.ToLower().Contains("eye"))
                    {
                        mat.EnableKeyword("_EMISSION");
                        mat.SetColor("_EmissionColor", new Color(0.2f, 0.9f, 1.0f) * 10f);
                    }
                }
            }
            return go;
        }

        private GameObject BuildRobotFromPrimitives(Vector3 position, Color eyeColor, string roleName)
        {
            var root = new GameObject(roleName);
            root.transform.position = position;

            Color dk = new Color(0.16f, 0.16f, 0.19f);
            Color md = new Color(0.24f, 0.24f, 0.28f);
            Color liteCol = new Color(0.68f, 0.68f, 0.72f);
            Color blk = new Color(0.04f, 0.04f, 0.06f);

            var wheels = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            wheels.name = "WheelBase";
            wheels.transform.parent = root.transform;
            wheels.transform.localPosition = new Vector3(0, 0.10f, 0);
            wheels.transform.localScale = new Vector3(0.60f, 0.07f, 0.60f);
            wheels.GetComponent<Renderer>().material = ToonMat(new Color(0.10f,0.10f,0.12f));

            var wL = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            wL.transform.parent = root.transform;
            wL.transform.localPosition = new Vector3(-0.28f, 0.10f, 0);
            wL.transform.localScale = new Vector3(0.14f, 0.14f, 0.14f);
            wL.transform.localRotation = Quaternion.Euler(0,0,90f);
            wL.GetComponent<Renderer>().material = ToonMat(new Color(0.12f,0.12f,0.14f));

            var wR = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            wR.transform.parent = root.transform;
            wR.transform.localPosition = new Vector3(0.28f, 0.10f, 0);
            wR.transform.localScale = new Vector3(0.14f, 0.14f, 0.14f);
            wR.transform.localRotation = Quaternion.Euler(0,0,90f);
            wR.GetComponent<Renderer>().material = ToonMat(new Color(0.12f,0.12f,0.14f));

            var body = GameObject.CreatePrimitive(PrimitiveType.Cube);
            body.transform.parent = root.transform;
            body.transform.localPosition = new Vector3(0, 0.68f, 0);
            body.transform.localScale = new Vector3(0.72f, 0.62f, 0.55f);
            body.GetComponent<Renderer>().material = ToonMat(dk);

            var chest = GameObject.CreatePrimitive(PrimitiveType.Cube);
            chest.transform.parent = root.transform;
            chest.transform.localPosition = new Vector3(0, 0.68f, 0.285f);
            chest.transform.localScale = new Vector3(0.45f, 0.38f, 0.02f);
            chest.GetComponent<Renderer>().material = ToonMat(md);

            var neck = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            neck.transform.parent = root.transform;
            neck.transform.localPosition = new Vector3(0, 1.08f, 0);
            neck.transform.localScale = new Vector3(0.18f, 0.09f, 0.18f);
            neck.GetComponent<Renderer>().material = ToonMat(new Color(0.12f,0.12f,0.14f));

            var head = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            head.transform.parent = root.transform;
            head.transform.localPosition = new Vector3(0, 1.48f, 0);
            head.transform.localScale = new Vector3(0.80f, 0.75f, 0.78f);
            head.GetComponent<Renderer>().material = ToonMat(md);

            var face = GameObject.CreatePrimitive(PrimitiveType.Cube);
            face.transform.parent = root.transform;
            face.transform.localPosition = new Vector3(0, 1.48f, 0.39f);
            face.transform.localScale = new Vector3(0.62f, 0.52f, 0.05f);
            face.GetComponent<Renderer>().material = ToonMat(blk);

            var eyeCol = eyeColor;
            var eyeMat = new Material(Shader.Find("Standard"));
            eyeMat.color = eyeCol;
            eyeMat.EnableKeyword("_EMISSION");
            eyeMat.SetColor("_EmissionColor", eyeCol * 20.0f);
            eyeMat.SetFloat("_Metallic", 0f);
            eyeMat.SetFloat("_Glossiness", 1.0f);
            eyeMat.globalIlluminationFlags = MaterialGlobalIlluminationFlags.RealtimeEmissive;
            var eyeL = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            eyeL.transform.parent = root.transform;
            eyeL.transform.localPosition = new Vector3(-0.15f, 1.50f, 0.43f);
            eyeL.transform.localScale = new Vector3(0.22f, 0.22f, 0.08f);
            eyeL.GetComponent<Renderer>().material = eyeMat;

            var eyeR = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            eyeR.transform.parent = root.transform;
            eyeR.transform.localPosition = new Vector3(0.15f, 1.50f, 0.43f);
            eyeR.transform.localScale = new Vector3(0.22f, 0.22f, 0.08f);
            eyeR.GetComponent<Renderer>().material = eyeMat;


            var ringL = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            ringL.transform.parent = root.transform;
            ringL.transform.localPosition = new Vector3(-0.15f, 1.50f, 0.41f);
            ringL.transform.localScale = new Vector3(0.21f, 0.005f, 0.21f);
            ringL.transform.localRotation = Quaternion.Euler(90f, 0, 0);
            ringL.GetComponent<Renderer>().material = ToonMat(new Color(0.06f,0.06f,0.08f));

            var ringR = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            ringR.transform.parent = root.transform;
            ringR.transform.localPosition = new Vector3(0.15f, 1.50f, 0.41f);
            ringR.transform.localScale = new Vector3(0.21f, 0.005f, 0.21f);
            ringR.transform.localRotation = Quaternion.Euler(90f, 0, 0);
            ringR.GetComponent<Renderer>().material = ToonMat(new Color(0.06f,0.06f,0.08f));

            var aLU = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            aLU.name = "ArmLUp";
            aLU.transform.parent = root.transform;
            aLU.transform.localPosition = new Vector3(-0.58f, 0.80f, 0.05f);
            aLU.transform.localScale = new Vector3(0.14f, 0.20f, 0.14f);
            aLU.GetComponent<Renderer>().material = ToonMat(dk);

            var aLD = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            aLD.transform.parent = root.transform;
            aLD.transform.localPosition = new Vector3(-0.64f, 0.52f, 0.10f);
            aLD.transform.localScale = new Vector3(0.12f, 0.16f, 0.12f);
            aLD.transform.localRotation = Quaternion.Euler(20f, 0, 12f);
            aLD.GetComponent<Renderer>().material = ToonMat(dk);

            var handL = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            handL.transform.parent = root.transform;
            handL.transform.localPosition = new Vector3(-0.68f, 0.33f, 0.15f);
            handL.transform.localScale = new Vector3(0.16f, 0.12f, 0.14f);
            handL.GetComponent<Renderer>().material = ToonMat(liteCol);

            var aRU = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            aRU.transform.parent = root.transform;
            aRU.transform.localPosition = new Vector3(0.58f, 0.80f, 0.05f);
            aRU.transform.localScale = new Vector3(0.14f, 0.20f, 0.14f);
            aRU.GetComponent<Renderer>().material = ToonMat(dk);

            var aRD = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            aRD.transform.parent = root.transform;
            aRD.transform.localPosition = new Vector3(0.64f, 0.52f, 0.10f);
            aRD.transform.localScale = new Vector3(0.12f, 0.16f, 0.12f);
            aRD.transform.localRotation = Quaternion.Euler(20f, 0, -12f);
            aRD.GetComponent<Renderer>().material = ToonMat(dk);

            var handR = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            handR.transform.parent = root.transform;
            handR.transform.localPosition = new Vector3(0.68f, 0.33f, 0.15f);
            handR.transform.localScale = new Vector3(0.16f, 0.12f, 0.14f);
            handR.GetComponent<Renderer>().material = ToonMat(liteCol);

            var ant = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            ant.transform.parent = root.transform;
            ant.transform.localPosition = new Vector3(0.18f, 1.96f, 0);
            ant.transform.localScale = new Vector3(0.025f, 0.14f, 0.025f);
            ant.GetComponent<Renderer>().material = ToonMat(new Color(0.25f,0.25f,0.28f));

            var antTip = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            antTip.transform.parent = root.transform;
            antTip.transform.localPosition = new Vector3(0.18f, 2.14f, 0);
            antTip.transform.localScale = Vector3.one * 0.07f;
            antTip.GetComponent<Renderer>().material = EmissiveMat(eyeColor * 0.5f, 10.0f);

            root.transform.localScale = Vector3.one * 0.7f;
            _eyePulseMats.Add(eyeMat);
            _eyePulseMats.Add(eyeMat);
            _robotTransforms.Add(root.transform);
            _robotBasePos.Add(position);
            return root;
        }


        private static Material ToonMat(Color c)
        {
            var m = new Material(Shader.Find("Standard") ?? LitShader());
            m.color = c;
            if (m.HasProperty("_Metallic")) m.SetFloat("_Metallic", 0f);
            if (m.HasProperty("_Glossiness")) m.SetFloat("_Glossiness", 0.05f);
            if (m.HasProperty("_Smoothness")) m.SetFloat("_Smoothness", 0.05f);
            return m;
        }

        private static Material EmissiveMat(Color c, float mul = 12.0f)
        {
            var m = new Material(Shader.Find("Standard") ?? LitShader());
            m.color = c;
            m.EnableKeyword("_EMISSION");
            if (m.HasProperty("_EmissionColor")) m.SetColor("_EmissionColor", c * mul);
            if (m.HasProperty("_Metallic")) m.SetFloat("_Metallic", 0f);
            if (m.HasProperty("_Glossiness")) m.SetFloat("_Glossiness", 0.9f);
            if (m.HasProperty("_Smoothness")) m.SetFloat("_Smoothness", 0.9f);
            m.globalIlluminationFlags = MaterialGlobalIlluminationFlags.RealtimeEmissive;
            return m;
        }

        
        private void BuildMonitors()
        {
            // STEP4: six angled monitors visible from diagonal camera
            float leftX = -4.0f;
            float[] zPositions = { 2.0f, 4.0f, 6.0f };
            float[] yPositions = { 3.2f, 4.7f };
            var monitorFacing = Quaternion.Euler(0f, -45f, 0f);
            Color[] monitorBlue =
            {
                new Color(0.08f, 0.25f, 0.65f),
                new Color(0.10f, 0.30f, 0.70f),
                new Color(0.06f, 0.22f, 0.60f),
                new Color(0.09f, 0.28f, 0.68f),
                new Color(0.07f, 0.24f, 0.62f),
                new Color(0.10f, 0.32f, 0.72f)
            };

            int idx = 0;
            for (int row = 0; row < yPositions.Length; row++)
            {
                for (int col = 0; col < zPositions.Length; col++, idx++)
                {
                    var anchor = new Vector3(leftX, yPositions[row], zPositions[col]);
                    var body = Cube($"Monitor_{row}_{col}", anchor, new Vector3(0.16f, 1.1f, 1.7f), _darkMat);
                    body.transform.rotation = monitorFacing;

                    var screenColor = monitorBlue[idx % monitorBlue.Length];
                    var screenMat = NewEmissive(screenColor, screenColor, 3.8f);
                    var screen = Cube($"MonitorScreen_{row}_{col}", anchor, new Vector3(0.05f, 0.95f, 1.5f), screenMat);
                    screen.transform.SetParent(body.transform);
                    screen.transform.localPosition = new Vector3(0.08f, 0f, 0f);
                    screen.transform.localRotation = Quaternion.identity;

                    for (int stripe = 0; stripe < 3; stripe++)
                    {
                        float yLocal = 0.30f - stripe * 0.28f;
                        var stripeBase = monitorBlue[(idx + stripe) % monitorBlue.Length];
                        var stripeMat = NewEmissive(stripeBase * 0.85f, stripeBase, 2.9f);
                        var stripeGo = Cube($"MonitorStripe_{row}_{col}_{stripe}", anchor, new Vector3(0.03f, 0.08f, 1.35f), stripeMat);
                        stripeGo.transform.SetParent(body.transform);
                        stripeGo.transform.localPosition = new Vector3(0.09f, yLocal, 0f);
                        stripeGo.transform.localRotation = Quaternion.identity;
                    }

                    var glow = new GameObject($"ScreenGlow_{row}_{col}").AddComponent<Light>();
                    glow.type = LightType.Point;
                    glow.color = screenColor;
                    glow.intensity = 1.0f;
                    glow.range = 3.0f;
                    glow.shadows = LightShadows.None;
                    glow.transform.position = body.transform.position + body.transform.right * 0.6f;
                    glow.transform.position += new Vector3(0f, 0.05f, 0f);
                    _monitorGlowLights.Add(glow);
                }
            }

            Cube("RightDesk", new Vector3(9f, 0.6f, 5f), new Vector3(3f, 0.15f, 2f), _deskMat);
            Cube("RightMonitorBody", new Vector3(9f, 1.8f, 5f), new Vector3(0.1f, 1.4f, 2.0f), _darkMat);
            Cube("RightMonitorScreen", new Vector3(8.92f, 1.8f, 5f), new Vector3(0.04f, 1.2f, 1.8f), NewEmissive(new Color(0.10f, 0.32f, 0.72f), new Color(0.08f, 0.25f, 0.65f), 3.4f));
        }

        private void BuildLighting()
        {
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.95f, 0.90f, 0.80f);

            var old = GameObject.Find("Directional Light");
            if (old != null) Object.DestroyImmediate(old);

            var lights = FindObjectsByType<Light>(FindObjectsSortMode.None);
            foreach (var l in lights) Destroy(l.gameObject);

            // Key light — warm from top-left diagonal
            var keyGo = new GameObject("KeyLight");
            var keyLt = keyGo.AddComponent<Light>();
            keyLt.type = LightType.Directional;
            keyLt.color = new Color(1.0f, 0.92f, 0.78f);
            keyLt.intensity = 1.8f;
            keyLt.shadows = LightShadows.Soft;
            keyGo.transform.rotation = Quaternion.Euler(45f, -45f, 0f);

            // Desk lamp — warm orange
            var deskGo = new GameObject("DeskLamp");
            var deskLt = deskGo.AddComponent<Light>();
            deskLt.type = LightType.Point;
            deskLt.color = new Color(1.0f, 0.80f, 0.45f);
            deskLt.intensity = 5.0f;
            deskLt.range = 10f;
            deskGo.transform.position = new Vector3(0f, 2.3f, 4.2f);

            // Board spotlight
            var boardGo = new GameObject("BoardSpot");
            var boardLt = boardGo.AddComponent<Light>();
            boardLt.type = LightType.Spot;
            boardLt.color = new Color(0.90f, 0.95f, 1.0f);
            boardLt.intensity = 3.5f;
            boardLt.range = 14f;
            boardLt.spotAngle = 65f;
            boardGo.transform.position = new Vector3(0f, 8f, 2f);
            boardGo.transform.rotation = Quaternion.Euler(55f, 0f, 0f);

            // Fill light from right — cool blue
            var fillGo = new GameObject("FillLight");
            var fillLt = fillGo.AddComponent<Light>();
            fillLt.type = LightType.Point;
            fillLt.color = new Color(0.45f, 0.55f, 0.90f);
            fillLt.intensity = 1.6f;
            fillLt.range = 24f;
            fillGo.transform.position = new Vector3(8f, 6f, 0f);

            // Warm front bounce to lift robot faces from shadows
            var bounceGo = new GameObject("BounceLight");
            var bounceLt = bounceGo.AddComponent<Light>();
            bounceLt.type = LightType.Point;
            bounceLt.color = new Color(1.0f, 0.86f, 0.70f);
            bounceLt.intensity = 1.35f;
            bounceLt.range = 16f;
            bounceGo.transform.position = new Vector3(0f, 3.2f, -3.8f);
        }

        private void BuildPlants()
        {
            // ROUND_9: expand greenery balance around room edges
            MakePlant(new Vector3(-8f, 0.15f, -2f));
            MakePlant(new Vector3(7f, 0.15f, -2f));
            MakePlant(new Vector3(-8f, 0.15f, 7f));
            MakePlant(new Vector3(8.5f, 0.15f, 7f));
        }

        private void MakePlant(Vector3 p)
        {
            var pot = Cyl("PlantPot", p, new Vector3(0.3f, 0.25f, 0.3f), NewMat(new Color(0.25f, 0.15f, 0.08f), 0.15f));
            var leaf = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            leaf.name = "PlantLeaf";
            leaf.transform.position = p + new Vector3(0f, 0.55f, 0f);
            leaf.transform.localScale = Vector3.one * 0.4f;
            leaf.GetComponent<Renderer>().material = NewMat(new Color(0.15f, 0.35f, 0.10f), 0.2f);
            leaf.transform.SetParent(pot.transform);
        }

        [System.Serializable]
        private sealed class RuntimeTask
        {
            public string title;
            public string status;
        }

        [System.Serializable]
        private sealed class RuntimeState
        {
            public List<RuntimeTask> tasks;
        }

        [System.Serializable]
        private sealed class RuntimeStateEnvelope
        {
            public RuntimeState taskState;
            public List<RuntimeTask> tasks;
        }

        private System.Collections.IEnumerator PollTaskState()
        {
            while (true)
            {
                var req = UnityWebRequest.Get(taskStateUrl);
                req.timeout = 4;
                yield return req.SendWebRequest();

                if (req.result == UnityWebRequest.Result.Success && !string.IsNullOrWhiteSpace(req.downloadHandler.text))
                {
                    var payload = JsonUtility.FromJson<RuntimeStateEnvelope>(req.downloadHandler.text);
                    var tasks = payload?.tasks ?? payload?.taskState?.tasks;
                    if (tasks != null)
                    {
                        int doing = 0;
                        int done = 0;
                        for (int i = 0; i < tasks.Count; i++)
                        {
                            var st = (tasks[i].status ?? string.Empty).ToLowerInvariant();
                            if (st == "done") done++; else doing++;
                        }

                        for (int i = 0; i < _liveTaskLabels.Count; i++)
                        {
                            var tm = _liveTaskLabels[i];
                            if (tm == null) continue;
                            tm.text = i < tasks.Count
                                ? string.IsNullOrWhiteSpace(tasks[i].title) ? $"Task {i + 1}" : tasks[i].title
                                : "";
                        }

                        if (_wipCounterText != null) _wipCounterText.text = $"WIP {doing:00}";
                        if (_queueDepthText != null) _queueDepthText.text = $"QUEUE {tasks.Count:00}";
                        if (_blockersText != null) _blockersText.text = $"BLOCKERS {Mathf.Max(0, doing - 3)}";
                        if (_throughputText != null) _throughputText.text = $"THROUGHPUT {done:00}";
                    }
                }
                req.Dispose();

                yield return new WaitForSeconds(3f);
            }
        }

    }
}
