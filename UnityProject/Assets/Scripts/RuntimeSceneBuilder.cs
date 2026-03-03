using UnityEngine;

namespace OfficeHub
{
    public sealed class RuntimeSceneBuilder : MonoBehaviour
    {
        private Material floorMat;
        private Material wallMat;
        private Material deskMat;
        private Material boardMat;

        private void Start()
        {
            SetupMaterials();
            SetupCamera();
            SetupLighting();
            BuildRoom();
            BuildFurniture();
            BuildTaskBoard();
            BuildAgents();
            BuildDecor();
        }

        private static bool Missing(string objectName) => GameObject.Find(objectName) == null;

        private static Shader PickLitShader() => Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard") ?? Shader.Find("Diffuse");

        private static Material NewMat(Color color, float metallic = 0f, float smoothness = 0.2f)
        {
            var mat = new Material(PickLitShader()) { color = color };
            if (mat.HasProperty("_Metallic")) mat.SetFloat("_Metallic", metallic);
            if (mat.HasProperty("_Smoothness")) mat.SetFloat("_Smoothness", smoothness);
            return mat;
        }

        private static Material NewEmissiveMat(Color color, float emissionMul)
        {
            var mat = NewMat(color, 0f, 0.25f);
            if (mat.HasProperty("_EmissionColor"))
            {
                mat.EnableKeyword("_EMISSION");
                mat.SetColor("_EmissionColor", color * emissionMul);
            }
            return mat;
        }

        private static GameObject CreateBox(string name, Vector3 pos, Vector3 scale, Material mat)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = name;
            go.transform.position = pos;
            go.transform.localScale = scale;
            var r = go.GetComponent<Renderer>();
            if (r != null && mat != null) r.material = mat;
            return go;
        }

        private void SetupMaterials()
        {
            floorMat = NewMat(new Color(0.15f, 0.15f, 0.20f), 0f, 0.08f);
            wallMat = NewMat(new Color(0.18f, 0.22f, 0.30f), 0f, 0.12f);
            deskMat = NewMat(new Color(0.42f, 0.29f, 0.20f), 0.05f, 0.18f);
            boardMat = NewEmissiveMat(new Color(0.20f, 0.24f, 0.32f), 0.35f);
        }

        private static void SetupCamera()
        {
            var cam = Camera.main;
            if (cam == null) return;
            cam.orthographic = true;
            cam.orthographicSize = 7f;
            cam.transform.position = new Vector3(12f, 12f, -12f);
            cam.transform.rotation = Quaternion.Euler(35f, 45f, 0f);
            cam.backgroundColor = new Color(0.07f, 0.09f, 0.13f);
        }

        private static void SetupLighting()
        {
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.13f, 0.16f, 0.24f);

            if (GameObject.Find("KeyLight") == null)
            {
                var keyGo = new GameObject("KeyLight");
                var key = keyGo.AddComponent<Light>();
                key.type = LightType.Directional;
                key.color = Color.white;
                key.intensity = 0.8f;
                keyGo.transform.rotation = Quaternion.Euler(50f, 30f, 0f);
            }

            CreateWarmDeskLight("DeskWarm_A", new Vector3(-2.6f, 2.0f, -1.2f));
            CreateWarmDeskLight("DeskWarm_B", new Vector3(2.2f, 2.0f, -0.6f));
            CreateWarmDeskLight("DeskWarm_C", new Vector3(0.0f, 2.0f, 1.0f));

            if (GameObject.Find("TaskBoardSpot") == null)
            {
                var go = new GameObject("TaskBoardSpot");
                var l = go.AddComponent<Light>();
                l.type = LightType.Spot;
                l.color = Color.white;
                l.intensity = 2f;
                l.range = 14f;
                l.spotAngle = 55f;
                go.transform.position = new Vector3(0f, 5.5f, 4.5f);
                go.transform.rotation = Quaternion.Euler(35f, 0f, 0f);
            }
        }

        private static void CreateWarmDeskLight(string name, Vector3 pos)
        {
            if (GameObject.Find(name) != null) return;
            var l = new GameObject(name).AddComponent<Light>();
            l.type = LightType.Point;
            l.color = new Color(1f, 0.66f, 0.35f);
            l.intensity = 1.5f;
            l.range = 4f;
            l.transform.position = pos;
        }

        private void BuildRoom()
        {
            if (Missing("Floor")) CreateBox("Floor", new Vector3(0f, -0.1f, 0f), new Vector3(20f, 0.2f, 20f), floorMat);
            if (Missing("BackWall")) CreateBox("BackWall", new Vector3(0f, 2.5f, 9.95f), new Vector3(20f, 5f, 0.2f), wallMat);
            if (Missing("LeftWall")) CreateBox("LeftWall", new Vector3(-9.95f, 2.5f, 0f), new Vector3(0.2f, 5f, 20f), wallMat);
            if (Missing("RightWall")) CreateBox("RightWall", new Vector3(9.95f, 2.5f, 0f), new Vector3(0.2f, 5f, 20f), wallMat);
            if (Missing("FrontWallLeft")) CreateBox("FrontWallLeft", new Vector3(-6.0f, 2.5f, -9.95f), new Vector3(8f, 5f, 0.2f), NewMat(new Color(0.18f, 0.22f, 0.30f, 0.65f)));
            if (Missing("FrontWallRight")) CreateBox("FrontWallRight", new Vector3(6.0f, 2.5f, -9.95f), new Vector3(8f, 5f, 0.2f), NewMat(new Color(0.18f, 0.22f, 0.30f, 0.65f)));
        }

        private void BuildFurniture()
        {
            if (Missing("MainDesk")) CreateBox("MainDesk", new Vector3(-2.6f, 0.9f, -1.2f), new Vector3(3.8f, 0.2f, 1.4f), deskMat);
            if (Missing("MainMonitor")) CreateBox("MainMonitor", new Vector3(-2.6f, 1.45f, -1.55f), new Vector3(0.9f, 0.55f, 0.08f), NewEmissiveMat(new Color(0.30f, 0.55f, 0.85f), 0.8f));
            if (Missing("EmployeeDesk")) CreateBox("EmployeeDesk", new Vector3(2.2f, 0.9f, -0.6f), new Vector3(2.6f, 0.2f, 1.2f), deskMat);
            if (Missing("EmployeeMonitor")) CreateBox("EmployeeMonitor", new Vector3(2.2f, 1.35f, -0.85f), new Vector3(0.8f, 0.45f, 0.08f), NewEmissiveMat(new Color(0.28f, 0.50f, 0.82f), 0.8f));
        }

        private static void CreateBoardLabel(string text, Vector3 pos)
        {
            var go = new GameObject("Label_" + text);
            go.transform.position = pos;
            var tm = go.AddComponent<TextMesh>();
            tm.text = text;
            tm.fontSize = 64;
            tm.characterSize = 0.3f;
            tm.anchor = TextAnchor.MiddleCenter;
            tm.alignment = TextAlignment.Center;
            tm.color = new Color(0.95f, 0.98f, 1f);
        }

        private void BuildTaskBoard()
        {
            if (Missing("TaskBoard")) CreateBox("TaskBoard", new Vector3(0f, 2.5f, 9.84f), new Vector3(8f, 3f, 0.1f), boardMat);
            if (Missing("Board_INBOX")) CreateBox("Board_INBOX", new Vector3(-2.6f, 2.4f, 9.78f), new Vector3(2.2f, 2.2f, 0.02f), NewMat(new Color(0.24f, 0.28f, 0.36f)));
            if (Missing("Board_DOING")) CreateBox("Board_DOING", new Vector3(0f, 2.4f, 9.78f), new Vector3(2.2f, 2.2f, 0.02f), NewMat(new Color(0.24f, 0.28f, 0.36f)));
            if (Missing("Board_REVIEW")) CreateBox("Board_REVIEW", new Vector3(2.6f, 2.4f, 9.78f), new Vector3(2.2f, 2.2f, 0.02f), NewMat(new Color(0.24f, 0.28f, 0.36f)));
            if (Missing("Label_INBOX")) CreateBoardLabel("INBOX", new Vector3(-2.6f, 3.45f, 9.72f));
            if (Missing("Label_DOING")) CreateBoardLabel("DOING", new Vector3(0f, 3.45f, 9.72f));
            if (Missing("Label_REVIEW")) CreateBoardLabel("REVIEW", new Vector3(2.6f, 3.45f, 9.72f));
        }

        private static void AddNameLabel(Transform parent, string text)
        {
            var label = new GameObject("NameLabel");
            label.transform.SetParent(parent);
            label.transform.localPosition = new Vector3(0f, 2.0f, 0f);
            var tm = label.AddComponent<TextMesh>();
            tm.text = text;
            tm.fontSize = 48;
            tm.characterSize = 0.1f;
            tm.anchor = TextAnchor.MiddleCenter;
            tm.alignment = TextAlignment.Center;
            tm.color = new Color(0.92f, 0.96f, 1f);
        }

        private static void CreateEye(Transform parent, Vector3 localPos, Color glow)
        {
            var eye = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            eye.name = "Eye";
            eye.transform.SetParent(parent);
            eye.transform.localPosition = localPos;
            eye.transform.localScale = Vector3.one * 0.10f;

            var r = eye.GetComponent<Renderer>();
            if (r != null) r.material = NewEmissiveMat(glow, 2.2f);

            var l = eye.AddComponent<Light>();
            l.type = LightType.Point;
            l.color = glow;
            l.intensity = 0.5f;
            l.range = 1.5f;
        }

        private static void EnsureRobot(string name, Vector3 pos, Color eyeColor)
        {
            if (!Missing(name)) return;
            var root = new GameObject(name);
            root.transform.position = pos;

            var body = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            body.transform.SetParent(root.transform);
            body.transform.localPosition = new Vector3(0f, 0.9f, 0f);
            body.transform.localScale = new Vector3(0.6f, 1.2f, 0.6f);
            var br = body.GetComponent<Renderer>();
            if (br != null) br.material = NewMat(new Color(0.78f, 0.80f, 0.84f), 0.05f, 0.38f);

            var head = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            head.transform.SetParent(root.transform);
            head.transform.localPosition = new Vector3(0f, 1.95f, 0f);
            head.transform.localScale = new Vector3(0.5f, 0.5f, 0.5f);
            var hr = head.GetComponent<Renderer>();
            if (hr != null) hr.material = NewMat(new Color(0.86f, 0.88f, 0.92f), 0.03f, 0.35f);

            CreateEye(head.transform, new Vector3(-0.12f, 0.0f, 0.20f), eyeColor);
            CreateEye(head.transform, new Vector3(0.12f, 0.0f, 0.20f), eyeColor);
            AddNameLabel(root.transform, name.Replace("Agent", "").ToUpperInvariant());
        }

        private static void BuildAgents()
        {
            EnsureRobot("AgentWorker", new Vector3(-3f, 0f, 2f), new Color(0.25f, 1f, 0.35f));
            EnsureRobot("AgentPlanner", new Vector3(0f, 0f, 1f), new Color(0.25f, 0.65f, 1f));
            EnsureRobot("AgentReviewer", new Vector3(3f, 0f, 2f), new Color(1f, 0.86f, 0.2f));
        }

        private void BuildDecor()
        {
            if (Missing("PlantA")) CreateBox("PlantA", new Vector3(7.8f, 0.7f, 7.8f), new Vector3(0.4f, 1.4f, 0.4f), NewMat(new Color(0.36f, 0.63f, 0.35f)));
            if (Missing("PlantB")) CreateBox("PlantB", new Vector3(-7.8f, 0.7f, 7.2f), new Vector3(0.35f, 1.1f, 0.35f), NewMat(new Color(0.36f, 0.63f, 0.35f)));
            if (Missing("Coffee")) CreateBox("Coffee", new Vector3(-2.0f, 1.05f, -0.9f), new Vector3(0.15f, 0.18f, 0.15f), NewMat(new Color(0.25f, 0.16f, 0.1f), 0f, 0.25f));
            if (Missing("PaperA")) CreateBox("PaperA", new Vector3(-2.3f, 1.02f, -1.0f), new Vector3(0.4f, 0.02f, 0.3f), NewMat(new Color(0.82f, 0.84f, 0.86f)));
        }
    }
}
