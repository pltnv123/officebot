using UnityEngine;

namespace OfficeHub
{
    public sealed class RuntimeSceneBuilder : MonoBehaviour
    {
        private void Start()
        {
            EnsureRoom();
            EnsureMainDesk();
            EnsureTaskBoard();
            EnsureAgents();
            EnsureAtmosphere();
        }

        private static bool Missing(string objectName)
        {
            return GameObject.Find(objectName) == null;
        }

        private static GameObject CreateBox(string name, Vector3 position, Vector3 scale, Color color)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = name;
            go.transform.position = position;
            go.transform.localScale = scale;
            var renderer = go.GetComponent<Renderer>();
            if (renderer != null)
            {
                var material = new Material(Shader.Find("Standard"));
                material.color = color;
                renderer.material = material;
            }
            return go;
        }

        private static void EnsureRoom()
        {
            if (Missing("Floor")) CreateBox("Floor", new Vector3(0f, -0.1f, 0f), new Vector3(16f, 0.2f, 10f), new Color(0.31f, 0.28f, 0.24f));
            if (Missing("BackWall")) CreateBox("BackWall", new Vector3(0f, 2.5f, -5f), new Vector3(16f, 5f, 0.2f), new Color(0.21f, 0.24f, 0.31f));
            if (Missing("LeftWall")) CreateBox("LeftWall", new Vector3(-8f, 2.5f, 0f), new Vector3(0.2f, 5f, 10f), new Color(0.19f, 0.22f, 0.3f));
            if (Missing("WindowFrame")) CreateBox("WindowFrame", new Vector3(-7.9f, 3.2f, -2.2f), new Vector3(0.12f, 2.2f, 3f), new Color(0.27f, 0.22f, 0.27f));
            if (Missing("Door")) CreateBox("Door", new Vector3(-7.9f, 1.3f, 2.8f), new Vector3(0.1f, 2.6f, 1.4f), new Color(0.2f, 0.18f, 0.16f));
        }

        private static void EnsureMainDesk()
        {
            if (Missing("MainDesk")) CreateBox("MainDesk", new Vector3(-2.6f, 0.9f, -1.2f), new Vector3(3.8f, 0.2f, 1.4f), new Color(0.52f, 0.37f, 0.28f));
            if (Missing("MainMonitor")) CreateBox("MainMonitor", new Vector3(-2.6f, 1.45f, -1.55f), new Vector3(0.9f, 0.55f, 0.08f), new Color(0.12f, 0.14f, 0.18f));
            if (Missing("EmployeeDesk")) CreateBox("EmployeeDesk", new Vector3(2.2f, 0.9f, -0.6f), new Vector3(2.6f, 0.2f, 1.2f), new Color(0.47f, 0.34f, 0.26f));
        }

        private static void EnsureTaskBoard()
        {
            if (Missing("TaskBoard")) CreateBox("TaskBoard", new Vector3(4.8f, 3.0f, -4.85f), new Vector3(4.8f, 2.6f, 0.1f), new Color(0.2f, 0.24f, 0.3f));
            if (Missing("Board_INBOX")) CreateBox("Board_INBOX", new Vector3(3.4f, 3.0f, -4.78f), new Vector3(1.2f, 2.2f, 0.02f), new Color(0.25f, 0.29f, 0.36f));
            if (Missing("Board_DOING")) CreateBox("Board_DOING", new Vector3(4.8f, 3.0f, -4.78f), new Vector3(1.2f, 2.2f, 0.02f), new Color(0.25f, 0.29f, 0.36f));
            if (Missing("Board_REVIEW")) CreateBox("Board_REVIEW", new Vector3(6.2f, 3.0f, -4.78f), new Vector3(1.2f, 2.2f, 0.02f), new Color(0.25f, 0.29f, 0.36f));
        }

        private static void EnsureAgents()
        {
            EnsureRobot("AgentWorker", new Vector3(1.8f, 0.5f, 1.8f), Color.green);
            EnsureRobot("AgentPlanner", new Vector3(3.4f, 0.5f, 1.8f), Color.yellow);
            EnsureRobot("AgentReviewer", new Vector3(5.0f, 0.5f, 1.8f), Color.cyan);
        }

        private static void EnsureRobot(string name, Vector3 position, Color badgeColor)
        {
            if (!Missing(name)) return;
            var root = new GameObject(name);
            root.transform.position = position;

            var body = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            body.transform.SetParent(root.transform);
            body.transform.localPosition = new Vector3(0f, 0.45f, 0f);
            body.transform.localScale = new Vector3(0.35f, 0.45f, 0.35f);

            var badge = GameObject.CreatePrimitive(PrimitiveType.Cube);
            badge.transform.SetParent(root.transform);
            badge.transform.localPosition = new Vector3(0f, 1.2f, 0f);
            badge.transform.localScale = new Vector3(0.55f, 0.15f, 0.03f);
            var renderer = badge.GetComponent<Renderer>();
            if (renderer != null)
            {
                var material = new Material(Shader.Find("Standard"));
                material.color = badgeColor;
                renderer.material = material;
            }
        }

        private static void EnsureAtmosphere()
        {
            if (Missing("PlantA")) CreateBox("PlantA", new Vector3(6.8f, 0.6f, 3.4f), new Vector3(0.4f, 1.2f, 0.4f), new Color(0.36f, 0.63f, 0.35f));
            if (Missing("PlantB")) CreateBox("PlantB", new Vector3(-0.8f, 0.6f, 3.6f), new Vector3(0.35f, 1.0f, 0.35f), new Color(0.36f, 0.63f, 0.35f));

            if (GameObject.Find("RuntimeFillLight") == null)
            {
                var lightGo = new GameObject("RuntimeFillLight");
                var lightComp = lightGo.AddComponent<Light>();
                lightComp.type = LightType.Directional;
                lightComp.color = new Color(0.63f, 0.73f, 1f);
                lightComp.intensity = 0.35f;
                lightGo.transform.rotation = Quaternion.Euler(50f, 120f, 0f);
            }
        }
    }
}
