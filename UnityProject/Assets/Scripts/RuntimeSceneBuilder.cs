using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace OfficeHub
{
    /// <summary>
    /// Procedurally builds the full OfficeHub runtime scene (geometry + lights + simple animation).
    /// </summary>
    public sealed class RuntimeSceneBuilder : MonoBehaviour
    {
        private readonly List<Transform> animatedRobots = new();
        private readonly List<Transform> animatedCards = new();
        private readonly List<Vector3> animatedCardBasePositions = new();
        private readonly List<Renderer> animatedMonitors = new();
        private readonly List<Light> accentLights = new();

        private Material floorMat;
        private Material wallMat;
        private Material boardMat;
        private Material cardBaseMat;
        private Material deskMat;
        private Material robotMat;
        private Material monitorBodyMat;
        private Material monitorScreenMat;
        private Material decorMat;

        private Transform sceneRoot;
        private float phase;

        private void Awake()
        {
            var previous = GameObject.Find("RuntimeOfficeRoot");
            if (previous != null)
            {
                Destroy(previous);
            }

            sceneRoot = new GameObject("RuntimeOfficeRoot").transform;
            SetupMaterials();
            SetupCamera();
            SetupLighting();
            BuildFloorAndWalls();
            BuildTaskBoardAndCards();
            BuildDesk();
            BuildRobots();
            BuildMonitors();
            BuildDecor();
        }

        private void Update()
        {
            phase += Time.deltaTime;

            for (var i = 0; i < animatedRobots.Count; i++)
            {
                var t = animatedRobots[i];
                var baseY = 0.06f * i;
                t.localPosition = new Vector3(t.localPosition.x, 0.12f + baseY + Mathf.Sin(phase * 1.2f + i) * 0.06f, t.localPosition.z);
                t.localRotation = Quaternion.Euler(0f, Mathf.Sin(phase * 0.9f + i) * 8f, 0f);
            }

            for (var i = 0; i < animatedCards.Count; i++)
            {
                var t = animatedCards[i];
                var basePos = animatedCardBasePositions[i];
                t.localPosition = basePos + new Vector3(0f, Mathf.Sin(phase * 1.5f + i * 0.8f) * 0.03f, 0f);
            }

            for (var i = 0; i < animatedMonitors.Count; i++)
            {
                var r = animatedMonitors[i];
                if (r == null || r.sharedMaterial == null) continue;
                var pulse = 0.85f + Mathf.Sin(phase * 2.2f + i * 0.5f) * 0.15f;
                if (r.sharedMaterial.HasProperty("_EmissionColor"))
                {
                    r.sharedMaterial.SetColor("_EmissionColor", new Color(0.12f, 0.45f, 1f) * pulse * 1.8f);
                }
            }

            for (var i = 0; i < accentLights.Count; i++)
            {
                var l = accentLights[i];
                if (l == null) continue;
                l.intensity = 0.9f + Mathf.Sin(phase * 1.8f + i) * 0.2f;
            }
        }

        private void SetupMaterials()
        {
            floorMat = MakeLit(new Color(0.13f, 0.14f, 0.17f), 0f, 0.08f);
            wallMat = MakeLit(new Color(0.09f, 0.12f, 0.18f), 0f, 0.12f);
            boardMat = MakeEmissive(new Color(0.10f, 0.11f, 0.14f), new Color(0.04f, 0.06f, 0.09f), 0.8f);
            cardBaseMat = MakeLit(new Color(0.53f, 0.58f, 0.66f), 0.05f, 0.2f);
            deskMat = MakeLit(new Color(0.36f, 0.24f, 0.16f), 0.05f, 0.25f);
            robotMat = MakeLit(new Color(0.78f, 0.81f, 0.86f), 0.15f, 0.35f);
            monitorBodyMat = MakeLit(new Color(0.05f, 0.06f, 0.08f), 0.4f, 0.3f);
            monitorScreenMat = MakeEmissive(new Color(0.08f, 0.14f, 0.22f), new Color(0.12f, 0.45f, 1f), 1.4f);
            decorMat = MakeLit(new Color(0.25f, 0.38f, 0.29f), 0f, 0.15f);
        }

        private void SetupCamera()
        {
            var cam = Camera.main;
            if (cam == null)
            {
                var go = new GameObject("Main Camera");
                go.tag = "MainCamera";
                cam = go.AddComponent<Camera>();
                go.AddComponent<AudioListener>();
            }

            cam.orthographic = true;
            cam.orthographicSize = 8.8f;
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.045f, 0.065f, 0.1f);
            cam.transform.position = new Vector3(10f, 9f, -8f);
            cam.transform.rotation = Quaternion.Euler(31f, -42f, 0f);
        }

        private void SetupLighting()
        {
            RenderSettings.ambientMode = AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.08f, 0.12f, 0.2f);

            var dirGo = GameObject.Find("Directional Light") ?? new GameObject("Directional Light");
            var dir = dirGo.GetComponent<Light>() ?? dirGo.AddComponent<Light>();
            dir.type = LightType.Directional;
            dir.color = new Color(0.95f, 0.95f, 1f);
            dir.intensity = 0.45f;
            dir.shadows = LightShadows.Soft;
            dir.transform.rotation = Quaternion.Euler(45f, -30f, 0f);

            accentLights.Add(CreatePointLight("BoardAccent", new Vector3(0f, 4.6f, 7.8f), new Color(0.35f, 0.6f, 1f), 1.0f, 9f));
            accentLights.Add(CreatePointLight("DeskAccent", new Vector3(0f, 2.6f, 0f), new Color(1f, 0.75f, 0.45f), 1.0f, 6f));
        }

        private void BuildFloorAndWalls()
        {
            Box("Floor", new Vector3(0f, -0.1f, 0f), new Vector3(22f, 0.2f, 16f), floorMat, sceneRoot);
            Box("BackWall", new Vector3(0f, 3.2f, 8f), new Vector3(22f, 6.4f, 0.2f), wallMat, sceneRoot);
            Box("LeftWall", new Vector3(-11f, 3.2f, 0f), new Vector3(0.2f, 6.4f, 16f), wallMat, sceneRoot);
            Box("RightWall", new Vector3(11f, 3.2f, 0f), new Vector3(0.2f, 6.4f, 16f), wallMat, sceneRoot);
        }

        private void BuildTaskBoardAndCards()
        {
            var root = new GameObject("TaskBoardRoot").transform;
            root.SetParent(sceneRoot);

            Box("TaskBoard", new Vector3(0f, 3.1f, 7.88f), new Vector3(14f, 4.4f, 0.08f), boardMat, root);

            var headers = new[] { "INBOX", "PLAN", "WORK" };
            for (var c = 0; c < 3; c++)
            {
                var x = -4.4f + c * 4.4f;
                Box($"Column_{headers[c]}", new Vector3(x, 3f, 7.83f), new Vector3(3.9f, 3.6f, 0.04f), MakeLit(new Color(0.15f, 0.18f, 0.24f), 0.02f, 0.18f), root);
                CreateHeader(headers[c], new Vector3(x, 4.7f, 7.75f), root);

                for (var i = 0; i < 5; i++)
                {
                    var y = 3.9f - i * 0.68f;
                    var card = Box($"Card_{headers[c]}_{i}", new Vector3(x, y, 7.77f), new Vector3(3.2f, 0.44f, 0.02f), cardBaseMat, root);
                    animatedCards.Add(card.transform);
                    animatedCardBasePositions.Add(card.transform.localPosition);
                }
            }
        }

        private void BuildDesk()
        {
            var root = new GameObject("DeskRoot").transform;
            root.SetParent(sceneRoot);

            Box("DeskTop", new Vector3(0f, 0.95f, 0f), new Vector3(6.2f, 0.2f, 2.8f), deskMat, root);
            Box("DeskLeg_L", new Vector3(-2.7f, 0.45f, -1.1f), new Vector3(0.24f, 0.9f, 0.24f), deskMat, root);
            Box("DeskLeg_R", new Vector3(2.7f, 0.45f, -1.1f), new Vector3(0.24f, 0.9f, 0.24f), deskMat, root);
            Box("DeskLeg_L2", new Vector3(-2.7f, 0.45f, 1.1f), new Vector3(0.24f, 0.9f, 0.24f), deskMat, root);
            Box("DeskLeg_R2", new Vector3(2.7f, 0.45f, 1.1f), new Vector3(0.24f, 0.9f, 0.24f), deskMat, root);

            for (var i = 0; i < 4; i++)
            {
                Box($"Paper_{i}", new Vector3(-1.8f + i * 1.1f, 1.06f + i * 0.01f, 0.4f - i * 0.1f), new Vector3(0.9f, 0.02f, 0.6f), MakeLit(new Color(0.82f, 0.83f, 0.8f), 0f, 0.05f), root);
            }
        }

        private void BuildRobots()
        {
            CreateRobot("RobotWorker", new Vector3(-3.8f, 0f, 1.8f), new Color(0.35f, 1f, 0.6f));
            CreateRobot("RobotPlanner", new Vector3(0f, 0f, 1.4f), new Color(0.35f, 0.75f, 1f));
            CreateRobot("RobotReviewer", new Vector3(3.8f, 0f, 1.8f), new Color(0.9f, 0.9f, 0.35f));
        }

        private void BuildMonitors()
        {
            var root = new GameObject("MonitorsRoot").transform;
            root.SetParent(sceneRoot);

            for (var i = 0; i < 4; i++)
            {
                CreateMonitor(root, $"LeftMonitor_{i}", new Vector3(-10.78f, 1.8f + i * 1.0f, -4f + i * 2.4f), Quaternion.Euler(0f, 90f, 0f));
                CreateMonitor(root, $"RightMonitor_{i}", new Vector3(10.78f, 1.8f + i * 1.0f, -4f + i * 2.4f), Quaternion.Euler(0f, -90f, 0f));
            }
        }

        private void BuildDecor()
        {
            var root = new GameObject("DecorRoot").transform;
            root.SetParent(sceneRoot);

            Box("PlantPot", new Vector3(8.7f, 0.4f, -4.8f), new Vector3(0.7f, 0.8f, 0.7f), MakeLit(new Color(0.18f, 0.12f, 0.08f), 0f, 0.2f), root);
            var leaves = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            leaves.name = "PlantLeaves";
            leaves.transform.SetParent(root);
            leaves.transform.position = new Vector3(8.7f, 1.25f, -4.8f);
            leaves.transform.localScale = new Vector3(1.1f, 1.0f, 1.1f);
            leaves.GetComponent<Renderer>().sharedMaterial = decorMat;

            Box("CeilingBeam", new Vector3(0f, 5.6f, 0f), new Vector3(16f, 0.15f, 0.35f), MakeLit(new Color(0.2f, 0.21f, 0.24f), 0.1f, 0.3f), root);
        }

        private void CreateRobot(string name, Vector3 pos, Color eyeColor)
        {
            var root = new GameObject(name).transform;
            root.SetParent(sceneRoot);
            root.position = pos;

            var body = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            body.name = "Body";
            body.transform.SetParent(root);
            body.transform.localPosition = new Vector3(0f, 0.95f, 0f);
            body.transform.localScale = new Vector3(0.75f, 0.95f, 0.75f);
            body.GetComponent<Renderer>().sharedMaterial = robotMat;

            var head = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            head.name = "Head";
            head.transform.SetParent(root);
            head.transform.localPosition = new Vector3(0f, 2.0f, 0f);
            head.transform.localScale = Vector3.one * 0.9f;
            head.GetComponent<Renderer>().sharedMaterial = robotMat;

            CreateEye(head.transform, new Vector3(-0.18f, 0.05f, 0.41f), eyeColor);
            CreateEye(head.transform, new Vector3(0.18f, 0.05f, 0.41f), eyeColor);

            animatedRobots.Add(root);
        }

        private void CreateMonitor(Transform parent, string name, Vector3 pos, Quaternion rot)
        {
            var body = Box(name, pos, new Vector3(1.5f, 0.9f, 0.15f), monitorBodyMat, parent);
            body.transform.rotation = rot;

            var offset = rot * new Vector3(0f, 0f, 0.09f);
            var screen = Box(name + "_Screen", pos + offset, new Vector3(1.28f, 0.72f, 0.04f), monitorScreenMat, parent);
            screen.transform.rotation = rot;
            var renderer = screen.GetComponent<Renderer>();
            animatedMonitors.Add(renderer);
        }

        private void CreateEye(Transform parent, Vector3 localPos, Color color)
        {
            var eye = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            eye.name = "Eye";
            eye.transform.SetParent(parent);
            eye.transform.localPosition = localPos;
            eye.transform.localScale = Vector3.one * 0.16f;
            eye.GetComponent<Renderer>().sharedMaterial = MakeEmissive(color, color, 2.3f);
        }

        private void CreateHeader(string text, Vector3 worldPos, Transform parent)
        {
            var go = new GameObject("Header_" + text);
            go.transform.SetParent(parent);
            go.transform.position = worldPos;
            var mesh = go.AddComponent<TextMesh>();
            mesh.text = text;
            mesh.fontSize = 64;
            mesh.characterSize = 0.22f;
            mesh.anchor = TextAnchor.MiddleCenter;
            mesh.alignment = TextAlignment.Center;
            mesh.color = new Color(0.8f, 0.9f, 1f);
        }

        private static GameObject Box(string name, Vector3 pos, Vector3 scale, Material mat, Transform parent)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = name;
            go.transform.SetParent(parent);
            go.transform.position = pos;
            go.transform.localScale = scale;
            go.GetComponent<Renderer>().sharedMaterial = mat;
            return go;
        }

        private static Light CreatePointLight(string name, Vector3 pos, Color color, float intensity, float range)
        {
            var go = GameObject.Find(name) ?? new GameObject(name);
            var light = go.GetComponent<Light>() ?? go.AddComponent<Light>();
            light.type = LightType.Point;
            light.color = color;
            light.intensity = intensity;
            light.range = range;
            light.shadows = LightShadows.None;
            go.transform.position = pos;
            return light;
        }

        private static Material MakeLit(Color color, float metallic, float smoothness)
        {
            var shader = Shader.Find("Universal Render Pipeline/Lit")
                ?? Shader.Find("Standard")
                ?? Shader.Find("Diffuse");
            var mat = new Material(shader) { color = color };
            if (mat.HasProperty("_Metallic")) mat.SetFloat("_Metallic", metallic);
            if (mat.HasProperty("_Smoothness")) mat.SetFloat("_Smoothness", smoothness);
            return mat;
        }

        private static Material MakeEmissive(Color color, Color emission, float intensity)
        {
            var mat = MakeLit(color, 0f, 0.3f);
            if (mat.HasProperty("_EmissionColor"))
            {
                mat.EnableKeyword("_EMISSION");
                mat.SetColor("_EmissionColor", emission * intensity);
            }

            return mat;
        }
    }
}
