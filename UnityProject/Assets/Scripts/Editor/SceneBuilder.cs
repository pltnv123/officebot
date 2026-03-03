using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

public static class SceneBuilder
{
    private const string ScenePath = "Assets/Scenes/OfficeHub.unity";

    [MenuItem("Tools/Office/Build Office Scene")]
    public static void BuildOfficeScene()
    {
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        scene.name = "OfficeHub";

        // Camera (isometric-ish)
        var camGo = new GameObject("Main Camera");
        var cam = camGo.AddComponent<Camera>();
        cam.tag = "MainCamera";
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.07f, 0.1f, 0.16f);
        cam.orthographic = true;
        cam.orthographicSize = 7.5f;
        camGo.transform.position = new Vector3(10f, 8f, -10f);
        camGo.transform.rotation = Quaternion.Euler(30f, 135f, 0f);

        // Lights
        var key = new GameObject("Key Light").AddComponent<Light>();
        key.type = LightType.Directional;
        key.intensity = 0.95f;
        key.color = new Color(1.0f, 0.9f, 0.75f);
        key.transform.rotation = Quaternion.Euler(45f, -40f, 0f);

        var fill = new GameObject("Fill Light").AddComponent<Light>();
        fill.type = LightType.Directional;
        fill.intensity = 0.35f;
        fill.color = new Color(0.65f, 0.75f, 1.0f);
        fill.transform.rotation = Quaternion.Euler(50f, 120f, 0f);

        RenderSettings.ambientIntensity = 1.0f;
        RenderSettings.ambientSkyColor = new Color(0.2f, 0.24f, 0.3f);
        RenderSettings.ambientEquatorColor = new Color(0.12f, 0.14f, 0.18f);
        RenderSettings.ambientGroundColor = new Color(0.05f, 0.05f, 0.07f);

        // Room geometry
        var floor = GameObject.CreatePrimitive(PrimitiveType.Cube);
        floor.name = "Floor";
        floor.transform.position = new Vector3(0f, -0.1f, 0f);
        floor.transform.localScale = new Vector3(16f, 0.2f, 10f);

        var backWall = GameObject.CreatePrimitive(PrimitiveType.Cube);
        backWall.name = "BackWall";
        backWall.transform.position = new Vector3(0f, 2.5f, -5f);
        backWall.transform.localScale = new Vector3(16f, 5f, 0.2f);

        var leftWall = GameObject.CreatePrimitive(PrimitiveType.Cube);
        leftWall.name = "LeftWall";
        leftWall.transform.position = new Vector3(-8f, 2.5f, 0f);
        leftWall.transform.localScale = new Vector3(0.2f, 5f, 10f);

        // Window
        var windowFrame = GameObject.CreatePrimitive(PrimitiveType.Cube);
        windowFrame.name = "WindowFrame";
        windowFrame.transform.position = new Vector3(-7.9f, 3.2f, -2.2f);
        windowFrame.transform.localScale = new Vector3(0.12f, 2.2f, 3.0f);

        // Door
        var door = GameObject.CreatePrimitive(PrimitiveType.Cube);
        door.name = "Door";
        door.transform.position = new Vector3(-7.9f, 1.3f, 2.8f);
        door.transform.localScale = new Vector3(0.1f, 2.6f, 1.4f);

        // Main desk + monitor
        var desk = GameObject.CreatePrimitive(PrimitiveType.Cube);
        desk.name = "MainDesk";
        desk.transform.position = new Vector3(-2.6f, 0.9f, -1.2f);
        desk.transform.localScale = new Vector3(3.8f, 0.2f, 1.4f);

        var monitor = GameObject.CreatePrimitive(PrimitiveType.Cube);
        monitor.name = "MainMonitor";
        monitor.transform.position = new Vector3(-2.6f, 1.45f, -1.55f);
        monitor.transform.localScale = new Vector3(0.9f, 0.55f, 0.08f);

        // Task board with columns
        var board = GameObject.CreatePrimitive(PrimitiveType.Cube);
        board.name = "TaskBoard";
        board.transform.position = new Vector3(4.8f, 3.0f, -4.85f);
        board.transform.localScale = new Vector3(4.8f, 2.6f, 0.1f);

        CreateBoardColumn("INBOX", new Vector3(3.4f, 3.0f, -4.78f));
        CreateBoardColumn("DOING", new Vector3(4.8f, 3.0f, -4.78f));
        CreateBoardColumn("REVIEW", new Vector3(6.2f, 3.0f, -4.78f));

        // 3 robot agents (primitive style)
        CreateRobot("AgentWorker", new Vector3(2.0f, 0.5f, 1.8f), Color.green);
        CreateRobot("AgentPlanner", new Vector3(3.6f, 0.5f, 1.8f), Color.yellow);
        CreateRobot("AgentReviewer", new Vector3(5.2f, 0.5f, 1.8f), Color.cyan);

        // Atmosphere details: papers + plant
        CreatePaperStack(new Vector3(-2.0f, 1.02f, -1.0f));
        CreatePlant(new Vector3(6.8f, 0.35f, 3.5f));

        EditorSceneManager.SaveScene(SceneManager.GetActiveScene(), ScenePath);
        AssetDatabase.SaveAssets();
        Debug.Log("SceneBuilder: OfficeHub scene generated.");
    }

    private static void CreateBoardColumn(string name, Vector3 pos)
    {
        var col = GameObject.CreatePrimitive(PrimitiveType.Cube);
        col.name = $"Board_{name}";
        col.transform.position = pos;
        col.transform.localScale = new Vector3(1.2f, 2.2f, 0.02f);
    }

    private static void CreateRobot(string name, Vector3 pos, Color badgeColor)
    {
        var root = new GameObject(name);
        root.transform.position = pos;

        var body = GameObject.CreatePrimitive(PrimitiveType.Capsule);
        body.name = "Body";
        body.transform.SetParent(root.transform);
        body.transform.localPosition = new Vector3(0f, 0.45f, 0f);
        body.transform.localScale = new Vector3(0.35f, 0.45f, 0.35f);

        var head = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        head.name = "Head";
        head.transform.SetParent(root.transform);
        head.transform.localPosition = new Vector3(0f, 0.95f, 0f);
        head.transform.localScale = Vector3.one * 0.3f;

        var badge = GameObject.CreatePrimitive(PrimitiveType.Cube);
        badge.name = "RoleBadge";
        badge.transform.SetParent(root.transform);
        badge.transform.localPosition = new Vector3(0f, 1.25f, 0f);
        badge.transform.localScale = new Vector3(0.55f, 0.15f, 0.03f);
        var renderer = badge.GetComponent<Renderer>();
        if (renderer != null)
        {
            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit"));
            mat.color = badgeColor;
            renderer.sharedMaterial = mat;
        }
    }

    private static void CreatePaperStack(Vector3 pos)
    {
        for (int i = 0; i < 3; i++)
        {
            var paper = GameObject.CreatePrimitive(PrimitiveType.Cube);
            paper.name = $"Paper_{i}";
            paper.transform.position = pos + new Vector3(i * 0.02f, i * 0.01f, i * 0.02f);
            paper.transform.localScale = new Vector3(0.5f, 0.02f, 0.35f);
        }
    }

    private static void CreatePlant(Vector3 pos)
    {
        var pot = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        pot.name = "PlantPot";
        pot.transform.position = pos;
        pot.transform.localScale = new Vector3(0.3f, 0.25f, 0.3f);

        var leaves = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        leaves.name = "PlantLeaves";
        leaves.transform.position = pos + new Vector3(0f, 0.6f, 0f);
        leaves.transform.localScale = new Vector3(0.75f, 0.75f, 0.75f);
    }
}
