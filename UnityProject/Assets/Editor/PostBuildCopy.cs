#if UNITY_EDITOR && !CI
using UnityEditor;
using UnityEngine;
using System.IO;

public class PostBuildCopy
{
    [PostProcessBuild]
    public static void OnPostprocessBuild(BuildTarget target, string path)
    {
        if (target == BuildTarget.WebGL)
        {
            string src = Path.Combine("Assets", "Plugins", "WebGL", "WebSocketPlugin.jslib");
            string dst = Path.Combine(path, "WebSocketPlugin.jslib");
            if (File.Exists(src))
            {
                File.Copy(src, dst, true);
                Debug.Log("[PostBuildCopy] Copied WebSocketPlugin.jslib to " + dst);
            }
            else
            {
                Debug.LogWarning("[PostBuildCopy] WebSocketPlugin.jslib not found at " + src);
            }
        }
    }
}
#endif
