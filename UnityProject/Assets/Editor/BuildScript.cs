using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

public static class BuildScript
{
    private const string ScenePath = "Assets/Scenes/MainOffice.unity";

    public static void BuildWebGL()
    {
        EnsureMainOfficeScene();

        var scenes = EditorBuildSettings.scenes;
        if (scenes == null || scenes.Length == 0)
        {
            throw new Exception("No scenes in Build Settings after auto-setup.");
        }

        var outputPath = Path.Combine("Builds", "WebGL");
        Directory.CreateDirectory(outputPath);

        var report = BuildPipeline.BuildPlayer(
            scenes,
            outputPath,
            BuildTarget.WebGL,
            BuildOptions.None
        );

        if (report.summary.result != UnityEditor.Build.Reporting.BuildResult.Succeeded)
        {
            throw new Exception("WebGL build failed: " + report.summary.result);
        }
    }

    private static void EnsureMainOfficeScene()
    {
        Directory.CreateDirectory("Assets/Scenes");

        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

        // Camera
        var camObj = new GameObject("Main Camera");
        var cam = camObj.AddComponent<Camera>();
        cam.tag = "MainCamera";
        camObj.transform.position = new Vector3(0f, 4f, -10f);
        camObj.transform.rotation = Quaternion.Euler(15f, 0f, 0f);

        // Light
        var lightObj = new GameObject("Directional Light");
        var light = lightObj.AddComponent<Light>();
        light.type = LightType.Directional;
        light.intensity = 1.2f;
        lightObj.transform.rotation = Quaternion.Euler(50f, -30f, 0f);

        // Floor
        var floor = GameObject.CreatePrimitive(PrimitiveType.Cube);
        floor.name = "Floor";
        floor.transform.position = new Vector3(0f, -0.5f, 0f);
        floor.transform.localScale = new Vector3(14f, 1f, 10f);

        // Walls
        CreateWall("Wall_Back", new Vector3(0f, 1.5f, 5f), new Vector3(14f, 3f, 0.4f));
        CreateWall("Wall_Left", new Vector3(-7f, 1.5f, 0f), new Vector3(0.4f, 3f, 10f));
        CreateWall("Wall_Right", new Vector3(7f, 1.5f, 0f), new Vector3(0.4f, 3f, 10f));

        // Front wall split for door opening
        CreateWall("Wall_Front_Left", new Vector3(-4.5f, 1.5f, -5f), new Vector3(5f, 3f, 0.4f));
        CreateWall("Wall_Front_Right", new Vector3(4.5f, 1.5f, -5f), new Vector3(5f, 3f, 0.4f));
        CreateWall("Wall_Front_Top", new Vector3(0f, 2.65f, -5f), new Vector3(4f, 0.7f, 0.4f));

        // Door
        var door = GameObject.CreatePrimitive(PrimitiveType.Cube);
        door.name = "Door";
        door.transform.position = new Vector3(0f, 1f, -4.82f);
        door.transform.localScale = new Vector3(1.8f, 2f, 0.15f);

        // Window
        CreateWall("Window_Frame", new Vector3(-2.5f, 1.7f, 4.82f), new Vector3(2.8f, 1.4f, 0.15f));

        // Task board
        var board = GameObject.CreatePrimitive(PrimitiveType.Cube);
        board.name = "TaskBoard";
        board.transform.position = new Vector3(3.5f, 1.8f, 4.75f);
        board.transform.localScale = new Vector3(3.2f, 1.8f, 0.08f);

        EditorSceneManager.SaveScene(scene, ScenePath);
        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();

        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
    }

    private static void CreateWall(string name, Vector3 pos, Vector3 scale)
    {
        var wall = GameObject.CreatePrimitive(PrimitiveType.Cube);
        wall.name = name;
        wall.transform.position = pos;
        wall.transform.localScale = scale;
    }
}
