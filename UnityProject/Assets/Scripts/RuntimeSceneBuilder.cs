using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace OfficeHub
{
    public sealed class RuntimeSceneBuilder : MonoBehaviour
    {
        private readonly List<GameObject> _robots = new();
        private readonly List<Light> _eyeLights = new();
        private readonly List<Light> _monitorGlowLights = new();
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

        private void Start()
        {
            SetupMaterials();
            SetupCamera();
            BuildRoom();
            BuildTaskBoard();
            BuildDeskAndProps();
            BuildRobots();
            BuildMonitors();
            BuildLighting();
            BuildPlants();
        }

        private void Update()
        {
            _time += Time.deltaTime;

            for (int i = 0; i < _robots.Count; i++)
            {
                var r = _robots[i];
                if (r == null) continue;
                var basePos = r.transform.position;
                float bobY = Mathf.Sin(_time * 1.5f + i * 2.1f) * 0.06f;
                r.transform.position = new Vector3(basePos.x, bobY, basePos.z);
            }

            // ROUND_6: per-robot eye light phase offsets
            for (int i = 0; i < _eyeLights.Count; i++)
            {
                var light = _eyeLights[i];
                if (light == null) continue;
                light.intensity = 0.65f + Mathf.Sin(_time * 2.2f + i * 0.9f) * 0.28f;
            }

            // ROUND_11: monitor glow breathing rhythm
            for (int i = 0; i < _monitorGlowLights.Count; i++)
            {
                var glow = _monitorGlowLights[i];
                if (glow == null) continue;
                glow.intensity = 0.28f + Mathf.Sin(_time * 1.6f + i * 0.7f) * 0.14f;
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
            _floorMat = NewMat(new Color(0.28f, 0.25f, 0.20f), 0.05f);
            _tileLineMat = NewMat(new Color(0.18f, 0.13f, 0.10f), 0.03f);
            _leftWallMat = NewMat(new Color(0.12f, 0.13f, 0.17f), 0.08f);
            _backWallMat = NewMat(new Color(0.10f, 0.11f, 0.15f), 0.08f);
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
            // ROUND_10: adjust camera framing for board+robots
            var cam = Camera.main;
            if (cam == null) return;
            cam.orthographic = true;
            cam.orthographicSize = 8.6f;
            cam.transform.position = new Vector3(9.6f, 9.5f, -9.2f);
            cam.transform.LookAt(new Vector3(0f, 1.4f, 3.2f));
            cam.backgroundColor = new Color(0.05f, 0.06f, 0.10f);
            cam.clearFlags = CameraClearFlags.SolidColor;
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
            Cube("Floor", new Vector3(0f, 0f, 0f), new Vector3(22f, 0.1f, 18f), _floorMat);

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
            Cube("TaskBoard", new Vector3(0f, 3.5f, 8.7f), new Vector3(14f, 5f, 0.2f), _boardMat);
            Cube("BoardFrameTop", new Vector3(0f, 6.0f, 8.59f), new Vector3(14.2f, 0.08f, 0.1f), _frameMat);
            Cube("BoardFrameBottom", new Vector3(0f, 1.0f, 8.59f), new Vector3(14.2f, 0.08f, 0.1f), _frameMat);
            Cube("BoardFrameLeft", new Vector3(-7.05f, 3.5f, 8.59f), new Vector3(0.08f, 5.0f, 0.1f), _frameMat);
            Cube("BoardFrameRight", new Vector3(7.05f, 3.5f, 8.59f), new Vector3(0.08f, 5.0f, 0.1f), _frameMat);

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
            Txt("WIPCounter", "WIP 07", new Vector3(0f, 1.8f, 8.35f), 10, 0.1f, new Color(0.85f, 0.92f, 1f), FontStyle.Bold);
            Txt("SLAInfo", "SLA 99.2%", new Vector3(-5.6f, 1.8f, 8.35f), 8, 0.09f, new Color(0.75f, 0.85f, 1f));
            Txt("FlowInfo", "FLOW +12", new Vector3(5.6f, 1.8f, 8.35f), 8, 0.09f, new Color(0.70f, 1f, 0.78f));
            // ROUND_7: board footer telemetry labels
            Txt("QueueDepth", "QUEUE 23", new Vector3(-5.6f, 1.3f, 8.35f), 8, 0.08f, new Color(0.92f, 0.86f, 0.68f));
            Txt("Blockers", "BLOCKERS 2", new Vector3(0f, 1.3f, 8.35f), 8, 0.08f, new Color(1f, 0.72f, 0.70f));
            Txt("Throughput", "THROUGHPUT 19", new Vector3(5.6f, 1.3f, 8.35f), 8, 0.08f, new Color(0.74f, 0.90f, 1f));
        }

        private void MakeCard(float x, float y, Color color, string label)
        {
            Cube($"Card_{x}_{y}", new Vector3(x, y, 8.4f), new Vector3(3.5f, 0.55f, 0.05f), NewMat(color, 0.12f));
            Txt($"CardTxt_{x}_{y}", label, new Vector3(x, y, 8.34f), 8, 0.09f, Color.white);
        }

        private void BuildDeskAndProps()
        {
            Cube("DeskTop", new Vector3(0f, 0.6f, 2f), new Vector3(5f, 0.15f, 3f), _deskMat);
            Cube("DeskLeg_FL", new Vector3(-2.3f, 0.3f, 0.6f), new Vector3(0.2f, 0.6f, 0.2f), _legMat);
            Cube("DeskLeg_FR", new Vector3(2.3f, 0.3f, 0.6f), new Vector3(0.2f, 0.6f, 0.2f), _legMat);
            Cube("DeskLeg_BL", new Vector3(-2.3f, 0.3f, 3.4f), new Vector3(0.2f, 0.6f, 0.2f), _legMat);
            Cube("DeskLeg_BR", new Vector3(2.3f, 0.3f, 3.4f), new Vector3(0.2f, 0.6f, 0.2f), _legMat);

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
            var worker = BuildRobot(new Vector3(-3.5f, 0f, 1.5f), new Color(0.1f, 0.9f, 0.4f), "WORKER");
            worker.transform.rotation = Quaternion.Euler(0f, 30f, 0f);
            var wArmL = worker.transform.Find("ArmL");
            if (wArmL != null) wArmL.localRotation = Quaternion.Euler(0f, 0f, 65f);

            var planner = BuildRobot(new Vector3(0f, 0f, 0.5f), new Color(0.2f, 0.5f, 1.0f), "PLANNER");
            planner.transform.rotation = Quaternion.Euler(0f, 0f, 0f);

            var reviewer = BuildRobot(new Vector3(3.5f, 0f, 1.5f), new Color(0.1f, 0.9f, 0.4f), "REVIEWER");
            reviewer.transform.rotation = Quaternion.Euler(0f, -20f, 0f);
            var rArmR = reviewer.transform.Find("ArmR");
            if (rArmR != null) rArmR.localRotation = Quaternion.Euler(0f, 0f, -50f);
        }

        private GameObject BuildRobot(Vector3 position, Color eyeColor, string name)
        {
            var root = new GameObject(name);
            root.transform.position = position;

            var body = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            body.name = "Body";
            body.transform.parent = root.transform;
            body.transform.localPosition = new Vector3(0, 0.7f, 0);
            body.transform.localScale = new Vector3(0.75f, 0.65f, 0.75f);
            body.GetComponent<Renderer>().material = _robotBodyMat;

            var head = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            head.name = "Head";
            head.transform.parent = root.transform;
            head.transform.localPosition = new Vector3(0, 1.55f, 0);
            head.transform.localScale = new Vector3(0.85f, 0.85f, 0.85f);
            head.GetComponent<Renderer>().material = _robotHeadMat;

            var face = GameObject.CreatePrimitive(PrimitiveType.Cube);
            face.name = "FacePlate";
            face.transform.parent = root.transform;
            face.transform.localPosition = new Vector3(0, 1.55f, 0.38f);
            face.transform.localScale = new Vector3(0.6f, 0.45f, 0.05f);
            face.GetComponent<Renderer>().material = _facePlateMat;

            var chestPanel = GameObject.CreatePrimitive(PrimitiveType.Cube);
            chestPanel.name = "ChestPanel";
            chestPanel.transform.parent = root.transform;
            chestPanel.transform.localPosition = new Vector3(0f, 0.95f, 0.39f);
            chestPanel.transform.localScale = new Vector3(0.42f, 0.25f, 0.05f);
            chestPanel.GetComponent<Renderer>().material = NewEmissive(new Color(0.06f, 0.08f, 0.12f), eyeColor, 1.2f);

            var antenna = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            antenna.name = "Antenna";
            antenna.transform.parent = root.transform;
            antenna.transform.localPosition = new Vector3(0f, 2.05f, 0f);
            antenna.transform.localScale = new Vector3(0.03f, 0.2f, 0.03f);
            antenna.GetComponent<Renderer>().material = _robotHeadMat;

            var antennaTip = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            antennaTip.name = "AntennaTip";
            antennaTip.transform.parent = root.transform;
            antennaTip.transform.localPosition = new Vector3(0f, 2.28f, 0f);
            antennaTip.transform.localScale = new Vector3(0.09f, 0.09f, 0.09f);
            antennaTip.GetComponent<Renderer>().material = NewEmissive(eyeColor, eyeColor, 1.8f);

            var eyeMat = NewEmissive(eyeColor, eyeColor, 2.5f);

            var eyeL = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            eyeL.name = "EyeL";
            eyeL.transform.parent = root.transform;
            eyeL.transform.localPosition = new Vector3(-0.14f, 1.57f, 0.42f);
            eyeL.transform.localScale = new Vector3(0.18f, 0.18f, 0.08f);
            eyeL.GetComponent<Renderer>().material = eyeMat;

            var eyeR = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            eyeR.name = "EyeR";
            eyeR.transform.parent = root.transform;
            eyeR.transform.localPosition = new Vector3(0.14f, 1.57f, 0.42f);
            eyeR.transform.localScale = new Vector3(0.18f, 0.18f, 0.08f);
            eyeR.GetComponent<Renderer>().material = eyeMat;

            var eyeLightGo = new GameObject("EyeLight");
            eyeLightGo.transform.parent = root.transform;
            eyeLightGo.transform.localPosition = new Vector3(0, 1.57f, 0.5f);
            var lt = eyeLightGo.AddComponent<Light>();
            lt.type = LightType.Point;
            lt.color = eyeColor;
            lt.intensity = 0.8f;
            lt.range = 1.5f;
            lt.shadows = LightShadows.None;
            _eyeLights.Add(lt);

            var armL = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            armL.name = "ArmL";
            armL.transform.parent = root.transform;
            armL.transform.localPosition = new Vector3(-0.55f, 0.9f, 0);
            armL.transform.localScale = new Vector3(0.18f, 0.35f, 0.18f);
            armL.transform.localRotation = Quaternion.Euler(0, 0, 30f);
            armL.GetComponent<Renderer>().material = NewMat(new Color(0.70f, 0.70f, 0.72f), 0.25f);

            var armR = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            armR.name = "ArmR";
            armR.transform.parent = root.transform;
            armR.transform.localPosition = new Vector3(0.55f, 0.9f, 0);
            armR.transform.localScale = new Vector3(0.18f, 0.35f, 0.18f);
            armR.transform.localRotation = Quaternion.Euler(0, 0, -30f);
            armR.GetComponent<Renderer>().material = NewMat(new Color(0.70f, 0.70f, 0.72f), 0.25f);

            var wheel = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            wheel.name = "WheelBase";
            wheel.transform.parent = root.transform;
            wheel.transform.localPosition = new Vector3(0, 0.08f, 0);
            wheel.transform.localScale = new Vector3(0.5f, 0.08f, 0.5f);
            wheel.GetComponent<Renderer>().material = NewMat(new Color(0.20f, 0.20f, 0.22f), 0.2f);

            var label = new GameObject("Label");
            label.transform.parent = root.transform;
            label.transform.localPosition = new Vector3(0, 2.2f, 0);
            var tm = label.AddComponent<TextMesh>();
            tm.text = name;
            tm.fontSize = 14;
            tm.color = Color.white;
            tm.anchor = TextAnchor.MiddleCenter;
            tm.alignment = TextAlignment.Center;
            label.transform.localScale = Vector3.one * 0.15f;

            _robots.Add(root);
            return root;
        }

        private void BuildMonitors()
        {
            // ROUND_5: monitor wall color variance and glow balance
            float[] zPositions = { -1f, 1.5f, 4f, 6.5f };
            float[] yPositions = { 3.5f, 5f };

            for (int row = 0; row < 2; row++)
            {
                for (int col = 0; col < 4; col++)
                {
                    var body = Cube($"Monitor_{row}_{col}", new Vector3(-9.3f, yPositions[row], zPositions[col]), new Vector3(0.15f, 1.2f, 1.8f), _darkMat);
                    var screenColor = (col % 2 == 0) ? new Color(0.1f, 0.3f, 0.6f) : new Color(0.1f, 0.4f, 0.5f);
                    var screenMat = NewEmissive(screenColor, screenColor, 1.5f);
                    Cube($"MonitorScreen_{row}_{col}", new Vector3(-9.15f, yPositions[row], zPositions[col]), new Vector3(0.05f, 1.0f, 1.6f), screenMat).transform.SetParent(body.transform);

                    var glow = new GameObject($"ScreenGlow_{row}_{col}").AddComponent<Light>();
                    glow.transform.position = new Vector3(-8.8f, yPositions[row], zPositions[col]);
                    glow.type = LightType.Point;
                    glow.color = new Color(0.2f, 0.4f, 0.8f);
                    glow.intensity = 0.4f;
                    glow.range = 2.5f;
                    glow.shadows = LightShadows.None;
                    _monitorGlowLights.Add(glow);
                }
            }

            Cube("RightDesk", new Vector3(9f, 0.6f, 5f), new Vector3(3f, 0.15f, 2f), _deskMat);
            Cube("RightMonitorBody", new Vector3(9f, 1.8f, 5f), new Vector3(0.1f, 1.4f, 2.0f), _darkMat);
            Cube("RightMonitorScreen", new Vector3(8.92f, 1.8f, 5f), new Vector3(0.04f, 1.2f, 1.8f), NewEmissive(new Color(0.1f, 0.3f, 0.7f), new Color(0.1f, 0.4f, 1f), 1.5f));
        }

        private void BuildLighting()
        {
            // ROUND_2: cinematic layered office lighting
            var lights = FindObjectsByType<Light>(FindObjectsSortMode.None);
            foreach (var l in lights) Destroy(l.gameObject);

            RenderSettings.ambientMode = AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.08f, 0.10f, 0.18f);

            var key = new GameObject("KeyLight").AddComponent<Light>();
            key.type = LightType.Directional;
            key.transform.rotation = Quaternion.Euler(45f, -30f, 0f);
            key.color = new Color(0.9f, 0.85f, 0.75f);
            key.intensity = 0.6f;
            key.shadows = LightShadows.None;

            var desk = new GameObject("DeskLamp").AddComponent<Light>();
            desk.type = LightType.Point;
            desk.transform.position = new Vector3(0f, 3.5f, 2f);
            desk.color = new Color(1.0f, 0.75f, 0.4f);
            desk.intensity = 2.0f;
            desk.range = 6.0f;
            desk.shadows = LightShadows.None;

            var fill = new GameObject("FillLight").AddComponent<Light>();
            fill.type = LightType.Point;
            fill.transform.position = new Vector3(-5f, 4f, -3f);
            fill.color = new Color(0.4f, 0.5f, 0.8f);
            fill.intensity = 0.5f;
            fill.range = 12f;
            fill.shadows = LightShadows.None;

            var spot = new GameObject("BoardSpot").AddComponent<Light>();
            spot.type = LightType.Spot;
            spot.transform.position = new Vector3(0f, 6.2f, 5.4f);
            spot.transform.rotation = Quaternion.Euler(34f, 0f, 0f);
            spot.color = new Color(0.95f, 0.98f, 1f);
            spot.intensity = 1.9f;
            spot.range = 9f;
            spot.spotAngle = 54f;
            spot.shadows = LightShadows.None;

            var rim = new GameObject("RobotRimLight").AddComponent<Light>();
            rim.type = LightType.Spot;
            rim.transform.position = new Vector3(0f, 4.6f, -3.8f);
            rim.transform.rotation = Quaternion.Euler(30f, 180f, 0f);
            rim.color = new Color(0.35f, 0.52f, 1f);
            rim.intensity = 1.1f;
            rim.range = 11f;
            rim.spotAngle = 72f;
            rim.shadows = LightShadows.None;
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
    }
}
