using UnityEngine;

namespace OfficeHub
{
    public sealed class RuntimeSceneBuilder : MonoBehaviour
    {
        private Material floorMat;
        private Material wallMat;
        private Material boardMat;
        private Material deskMat;
        private Material paperMat;
        private Material robotMat;
        private Material screenMat;

        private void Start()
        {
            SetupMaterials();
            SetupCamera();
            SetupLighting();
            BuildRoom();
            BuildBoard();
            BuildDesk();
            BuildRobots();
            BuildSideMonitors();
        }

        private static Shader LitShader()
        {
            return Shader.Find("Universal Render Pipeline/Lit")
                ?? Shader.Find("Standard")
                ?? Shader.Find("Diffuse");
        }

        private static Material MakeMat(Color color, float metallic = 0f, float smoothness = 0.25f)
        {
            var mat = new Material(LitShader()) { color = color };
            if (mat.HasProperty("_Metallic")) mat.SetFloat("_Metallic", metallic);
            if (mat.HasProperty("_Smoothness")) mat.SetFloat("_Smoothness", smoothness);
            return mat;
        }

        private static Material MakeEmissive(Color baseColor, Color emission, float intensity = 1f)
        {
            var mat = MakeMat(baseColor, 0f, 0.35f);
            if (mat.HasProperty("_EmissionColor"))
            {
                mat.EnableKeyword("_EMISSION");
                mat.SetColor("_EmissionColor", emission * intensity);
            }
            return mat;
        }

        private void SetupMaterials()
        {
            floorMat = MakeMat(new Color(0.18f, 0.19f, 0.22f), 0f, 0.08f);
            wallMat = MakeMat(new Color(0.13f, 0.16f, 0.22f), 0f, 0.12f);
            boardMat = MakeEmissive(new Color(0.10f, 0.12f, 0.16f), new Color(0.06f, 0.08f, 0.12f), 0.7f);
            deskMat = MakeMat(new Color(0.42f, 0.31f, 0.22f), 0.05f, 0.2f);
            paperMat = MakeMat(new Color(0.82f, 0.83f, 0.79f), 0f, 0.05f);
            robotMat = MakeMat(new Color(0.78f, 0.80f, 0.84f), 0.05f, 0.35f);
            screenMat = MakeEmissive(new Color(0.16f, 0.25f, 0.36f), new Color(0.2f, 0.55f, 1f), 1.4f);
        }

        private static void SetupCamera()
        {
            var cam = Camera.main;
            if (cam == null) return;

            cam.orthographic = true;
            cam.orthographicSize = 9f;
            cam.transform.position = new Vector3(8f, 8f, -8f);
            cam.transform.rotation = Quaternion.Euler(30f, -45f, 0f);
            cam.transform.LookAt(new Vector3(0f, 1f, 2f));
            cam.backgroundColor = new Color(0.07f, 0.09f, 0.13f);
        }

        private static void SetupLighting()
        {
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.10f, 0.14f, 0.22f);

            var dir = GameObject.Find("LegacyDirectional");
            if (dir == null)
            {
                dir = new GameObject("LegacyDirectional");
                var l = dir.AddComponent<Light>();
                l.type = LightType.Directional;
                l.intensity = 0f;
                l.shadows = LightShadows.None;
            }

            CreatePointLight("DeskWarmLight", new Vector3(0f, 3.2f, 2.0f), new Color(1f, 0.64f, 0.35f), 2f, 6f);
        }

        private static void CreatePointLight(string name, Vector3 pos, Color color, float intensity, float range)
        {
            if (GameObject.Find(name) != null) return;
            var lightGo = new GameObject(name);
            var light = lightGo.AddComponent<Light>();
            light.type = LightType.Point;
            light.color = color;
            light.intensity = intensity;
            light.range = range;
            light.shadows = LightShadows.None;
            lightGo.transform.position = pos;
        }

        private static GameObject Box(string name, Vector3 pos, Vector3 scale, Material mat, Transform parent = null)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = name;
            if (parent != null) go.transform.SetParent(parent);
            go.transform.position = pos;
            go.transform.localScale = scale;
            var r = go.GetComponent<Renderer>();
            if (r != null && mat != null) r.material = mat;
            return go;
        }

        private void BuildRoom()
        {
            Box("Floor", new Vector3(0f, -0.1f, 2f), new Vector3(30f, 0.2f, 30f), floorMat);
            Box("BackWall", new Vector3(0f, 3f, 12f), new Vector3(30f, 6f, 0.2f), wallMat);
            Box("LeftWall", new Vector3(-15f, 3f, 2f), new Vector3(0.2f, 6f, 20f), wallMat);
            Box("RightWall", new Vector3(15f, 3f, 2f), new Vector3(0.2f, 6f, 20f), wallMat);
            // intentionally no front wall (open room)
        }

        private void BuildBoard()
        {
            var boardRoot = new GameObject("TaskBoardRoot").transform;
            Box("TaskBoard", new Vector3(0f, 2.8f, 11.85f), new Vector3(24f, 4.8f, 0.1f), boardMat, boardRoot);

            // column backgrounds
            var colA = Box("Col_INBOX", new Vector3(-8f, 2.7f, 11.78f), new Vector3(6.8f, 3.8f, 0.04f), MakeMat(new Color(0.16f, 0.19f, 0.25f)), boardRoot);
            var colB = Box("Col_PLAN", new Vector3(0f, 2.7f, 11.78f), new Vector3(6.8f, 3.8f, 0.04f), MakeMat(new Color(0.16f, 0.19f, 0.25f)), boardRoot);
            var colC = Box("Col_WORK", new Vector3(8f, 2.7f, 11.78f), new Vector3(6.8f, 3.8f, 0.04f), MakeMat(new Color(0.16f, 0.19f, 0.25f)), boardRoot);

            CreateHeader("INBOX", new Vector3(-8f, 4.45f, 11.7f), new Color(0.70f, 0.90f, 1f));
            CreateHeader("PLAN", new Vector3(0f, 4.45f, 11.7f), new Color(1f, 0.86f, 0.45f));
            CreateHeader("WORK", new Vector3(8f, 4.45f, 11.7f), new Color(0.58f, 0.84f, 1f));

            // cards
            CreateCards(colA.transform, -8f, new[] { new Color(0.66f, 0.78f, 0.88f), new Color(0.46f, 0.52f, 0.60f), new Color(0.44f, 0.50f, 0.56f), new Color(0.62f, 0.68f, 0.74f) });
            CreateCards(colB.transform, 0f, new[] { new Color(0.92f, 0.74f, 0.35f), new Color(0.56f, 0.56f, 0.56f), new Color(0.46f, 0.46f, 0.46f), new Color(0.58f, 0.75f, 0.96f) });
            CreateCards(colC.transform, 8f, new[] { new Color(0.45f, 0.66f, 0.92f), new Color(0.56f, 0.56f, 0.56f), new Color(0.48f, 0.72f, 0.62f), new Color(0.44f, 0.50f, 0.56f) });
        }

        private static void CreateHeader(string text, Vector3 pos, Color color)
        {
            var go = new GameObject("Header_" + text);
            go.transform.position = pos;
            var tm = go.AddComponent<TextMesh>();
            tm.text = text;
            tm.fontSize = 64;
            tm.characterSize = 0.3f;
            tm.anchor = TextAnchor.MiddleCenter;
            tm.alignment = TextAlignment.Center;
            tm.color = color;
        }

        private void CreateCards(Transform parent, float centerX, Color[] colors)
        {
            for (int i = 0; i < colors.Length; i++)
            {
                var y = 3.65f - i * 0.85f;
                var card = Box($"Card_{centerX}_{i}", new Vector3(centerX, y, 11.73f), new Vector3(5.6f, 0.55f, 0.02f), MakeMat(colors[i]), parent);
                var strip = Box($"CardStrip_{centerX}_{i}", new Vector3(centerX - 1.7f, y, 11.71f), new Vector3(1.2f, 0.12f, 0.01f), MakeMat(new Color(0.9f, 0.9f, 0.9f)), card.transform);
            }
        }

        private void BuildDesk()
        {
            Box("MainDesk", new Vector3(0f, 0.55f, 2f), new Vector3(5f, 1f, 3f), deskMat);

            Box("Paper_1", new Vector3(-1.2f, 1.08f, 1.5f), new Vector3(1.0f, 0.03f, 0.7f), paperMat);
            Box("Paper_2", new Vector3(0.2f, 1.08f, 2.3f), new Vector3(0.9f, 0.03f, 0.6f), paperMat);
            Box("Paper_3", new Vector3(1.1f, 1.08f, 1.2f), new Vector3(1.2f, 0.03f, 0.8f), paperMat);
        }

        private void BuildRobots()
        {
            BuildRobot("WORKER", new Vector3(-4.7f, 0f, 3.8f), new Color(0.25f, 1f, 0.45f), true);
            BuildRobot("PLAN", new Vector3(0f, 0f, 1.2f), new Color(0.35f, 0.75f, 1f), false);
            BuildRobot("REVIEW", new Vector3(4.9f, 0f, 3.5f), new Color(0.25f, 1f, 0.45f), false);
        }

        private void BuildRobot(string name, Vector3 rootPos, Color eyeColor, bool pointAtBoard)
        {
            var root = new GameObject("Robot_" + name);
            root.transform.position = rootPos;

            var body = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            body.name = "Body";
            body.transform.SetParent(root.transform);
            body.transform.localPosition = new Vector3(0f, 0.95f, 0f);
            body.transform.localScale = new Vector3(0.8f, 1.0f, 0.8f);
            body.GetComponent<Renderer>().material = robotMat;

            var head = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            head.name = "Head";
            head.transform.SetParent(root.transform);
            head.transform.localPosition = new Vector3(0f, 2.15f, 0f);
            head.transform.localScale = Vector3.one * 1.2f;
            head.GetComponent<Renderer>().material = robotMat;

            CreateBigEye(head.transform, new Vector3(-0.23f, 0.03f, 0.55f), eyeColor);
            CreateBigEye(head.transform, new Vector3(0.23f, 0.03f, 0.55f), eyeColor);

            var leftArm = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            leftArm.transform.SetParent(root.transform);
            leftArm.transform.localScale = new Vector3(0.15f, 0.4f, 0.15f);
            leftArm.transform.localPosition = new Vector3(-0.75f, 1.15f, 0.0f);
            leftArm.GetComponent<Renderer>().material = robotMat;

            var rightArm = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            rightArm.transform.SetParent(root.transform);
            rightArm.transform.localScale = new Vector3(0.15f, 0.4f, 0.15f);
            rightArm.transform.localPosition = new Vector3(0.75f, 1.15f, 0.0f);
            rightArm.GetComponent<Renderer>().material = robotMat;

            if (pointAtBoard)
            {
                rightArm.transform.localRotation = Quaternion.Euler(0f, 0f, -65f);
                rightArm.transform.localPosition = new Vector3(0.85f, 1.45f, 0.2f);
            }
        }

        private static void CreateBigEye(Transform parent, Vector3 localPos, Color color)
        {
            var eye = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            eye.transform.SetParent(parent);
            eye.transform.localPosition = localPos;
            eye.transform.localScale = Vector3.one * 0.25f;
            var r = eye.GetComponent<Renderer>();
            r.material = MakeEmissive(color, color, 2.3f);

            var glow = eye.AddComponent<Light>();
            glow.type = LightType.Point;
            glow.color = color;
            glow.intensity = 0.5f;
            glow.range = 2f;
            glow.shadows = LightShadows.None;
        }

        private void BuildSideMonitors()
        {
            // left wall monitors
            for (int i = 0; i < 5; i++)
            {
                var y = 1.4f + i * 0.9f;
                var z = -4f + i * 2f;
                BuildMonitor($"LMon_{i}", new Vector3(-14.7f, y, z), Quaternion.Euler(0f, 90f, 0f));
            }

            // right wall monitors
            for (int i = 0; i < 5; i++)
            {
                var y = 1.4f + i * 0.9f;
                var z = -3.5f + i * 2f;
                BuildMonitor($"RMon_{i}", new Vector3(14.7f, y, z), Quaternion.Euler(0f, -90f, 0f));
            }
        }

        private void BuildMonitor(string name, Vector3 pos, Quaternion rot)
        {
            var body = Box(name, pos, new Vector3(1.2f, 0.8f, 0.2f), MakeMat(new Color(0.08f, 0.1f, 0.12f)));
            body.transform.rotation = rot;

            var screen = Box(name + "_Screen", pos + new Vector3(0f, 0f, 0.11f), new Vector3(1.0f, 0.62f, 0.03f), screenMat);
            screen.transform.rotation = rot;

            CreatePointLight(name + "_Glow", pos + new Vector3(0f, 0f, 0.7f), new Color(0.25f, 0.55f, 1f), 0.5f, 2.8f);
        }
    }
}
