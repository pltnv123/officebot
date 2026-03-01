using System;
using System.IO;
using UnityEditor;

public static class BuildScript
{
    public static void BuildWebGL()
    {
        var scenes = EditorBuildSettings.scenes;
        if (scenes == null || scenes.Length == 0)
        {
            throw new Exception("No scenes in Build Settings. Add at least one scene before CI build.");
        }

        var outputPath = Path.Combine("Builds", "WebGL");
        Directory.CreateDirectory(outputPath);

        BuildPipeline.BuildPlayer(
            scenes,
            outputPath,
            BuildTarget.WebGL,
            BuildOptions.None
        );
    }
}
