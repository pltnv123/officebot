using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

public static class BuildScript
{
    private static readonly string[] ScenePaths =
    {
        "Assets/Scenes/OfficeHub.unity",
        "Assets/Scenes/Room2.unity"
    };

    public static void BuildWebGL()
    {
        EnsureScenesInBuildSettings();

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

    private static void EnsureScenesInBuildSettings()
    {
        foreach (var scenePath in ScenePaths)
        {
            if (!File.Exists(scenePath))
            {
                throw new Exception(
                    $"Scene not found: {scenePath}. " +
                    "Refusing to auto-generate placeholder scene. " +
                    "Create and commit real scene assets first."
                );
            }
        }

        EditorBuildSettings.scenes = Array.ConvertAll(
            ScenePaths,
            path => new EditorBuildSettingsScene(path, true)
        );
    }
}
