#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;

public class RobotModelImporter : AssetPostprocessor
{
    void OnPreprocessModel()
    {
        if (!assetPath.Contains("Models/Robots")) return;
        var importer = assetImporter as ModelImporter;
        if (importer == null) return;
        importer.globalScale = 1.0f;
        importer.useFileUnits = true;
        importer.importBlendShapes = false;
        importer.importVisibility = true;
        importer.importCameras = false;
        importer.importLights = false;
        importer.materialImportMode = ModelImporterMaterialImportMode.ImportViaMaterialDescription;
    }
}
#endif
