using UnityEngine;

namespace OfficeHub
{
    public sealed class RuntimeSceneBuilder : MonoBehaviour
    {
        private Material floorMat;
        private Material tileLineMat;
        private Material leftWallMat;
        private Material backWallMat;
        private Material boardMat;
        private Material boardFrameMat;
        private Material dividerMat;
        private Material deskMat;
        private Material deskLegMat;
        private Material paperMat;

        private void Start()
        {
            SetupMaterials();
            SetupCamera();
            BuildRoom();
            BuildTaskBoard();
            BuildDesk();
        }

        private static Shader LitShader()
        {
            return Shader.Find("Universal Render Pipeline/Lit")
                   ?? Shader.Find("Standard")
                   ?? Shader.Find("Diffuse");
        }

        private static Material CreateMaterial(Color color, float smoothness = 0.2f)
        {
            var mat = new Material(LitShader())
            {
                color = color
            };

            if (mat.HasProperty("_Smoothness"))
                mat.SetFloat("_Smoothness", smoothness);

            if (mat.HasProperty("_Glossiness"))
                mat.SetFloat("_Glossiness", smoothness);

            return mat;
        }

        private void SetupMaterials()
        {
            floorMat = CreateMaterial(new Color(0.28f, 0.25f, 0.20f), 0.05f);
            tileLineMat = CreateMaterial(new Color(0.18f, 0.13f, 0.10f), 0.03f);
            leftWallMat = CreateMaterial(new Color(0.12f, 0.13f, 0.17f), 0.08f);
            backWallMat = CreateMaterial(new Color(0.10f, 0.11f, 0.15f), 0.08f);

            boardMat = CreateMaterial(new Color(0.08f, 0.09f, 0.12f), 0.1f);
            boardFrameMat = CreateMaterial(new Color(0.30f, 0.30f, 0.35f), 0.2f);
            dividerMat = CreateMaterial(new Color(0.25f, 0.25f, 0.30f), 0.2f);

            deskMat = CreateMaterial(new Color(0.30f, 0.20f, 0.12f), 0.3f);
            deskLegMat = CreateMaterial(new Color(0.24f, 0.16f, 0.10f), 0.25f);
            paperMat = CreateMaterial(new Color(0.9f, 0.88f, 0.82f), 0.05f);
        }

        private static void SetupCamera()
        {
            var cam = Camera.main;
            if (cam == null) return;

            cam.orthographic = true;
            cam.orthographicSize = 9f;
            cam.transform.position = new Vector3(10f, 10f, -10f);
            cam.transform.LookAt(new Vector3(0f, 1f, 3f));
            cam.backgroundColor = new Color(0.05f, 0.06f, 0.10f);
            cam.clearFlags = CameraClearFlags.SolidColor;
        }

        private static GameObject CreateCube(string name, Vector3 position, Vector3 scale, Material material)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = name;
            go.transform.position = position;
            go.transform.localScale = scale;
            var renderer = go.GetComponent<Renderer>();
            if (renderer != null) renderer.material = material;
            return go;
        }

        private static TextMesh CreateText(string name, string text, Vector3 position, int fontSize, float charSize, Color color, FontStyle style = FontStyle.Normal)
        {
            var go = new GameObject(name);
            go.transform.position = position;
            var textMesh = go.AddComponent<TextMesh>();
            textMesh.text = text;
            textMesh.fontSize = fontSize;
            textMesh.characterSize = charSize;
            textMesh.color = color;
            textMesh.fontStyle = style;
            textMesh.anchor = TextAnchor.MiddleCenter;
            textMesh.alignment = TextAlignment.Center;
            return textMesh;
        }

        private void BuildRoom()
        {
            CreateCube("Floor", new Vector3(0f, 0f, 0f), new Vector3(22f, 0.1f, 18f), floorMat);

            for (int i = 0; i < 6; i++)
            {
                float x = -8.75f + i * 3.5f;
                CreateCube($"TileLine_X_{i}", new Vector3(x, 0.06f, 0f), new Vector3(0.05f, 0.02f, 18f), tileLineMat);
            }

            for (int j = 0; j < 5; j++)
            {
                float z = -7.2f + j * 3.6f;
                CreateCube($"TileLine_Z_{j}", new Vector3(0f, 0.06f, z), new Vector3(22f, 0.02f, 0.05f), tileLineMat);
            }

            CreateCube("LeftWall", new Vector3(-11f, 3f, 3f), new Vector3(0.3f, 6f, 18f), leftWallMat);
            CreateCube("BackWall", new Vector3(0f, 3f, 9f), new Vector3(22f, 6f, 0.3f), backWallMat);
        }

        private void BuildTaskBoard()
        {
            CreateCube("TaskBoard", new Vector3(0f, 3.5f, 8.7f), new Vector3(14f, 5f, 0.2f), boardMat);

            CreateCube("BoardFrameTop", new Vector3(0f, 6.0f, 8.59f), new Vector3(14.2f, 0.08f, 0.1f), boardFrameMat);
            CreateCube("BoardFrameBottom", new Vector3(0f, 1.0f, 8.59f), new Vector3(14.2f, 0.08f, 0.1f), boardFrameMat);
            CreateCube("BoardFrameLeft", new Vector3(-7.05f, 3.5f, 8.59f), new Vector3(0.08f, 5.0f, 0.1f), boardFrameMat);
            CreateCube("BoardFrameRight", new Vector3(7.05f, 3.5f, 8.59f), new Vector3(0.08f, 5.0f, 0.1f), boardFrameMat);

            CreateCube("Divider1", new Vector3(-2.3f, 3.5f, 8.5f), new Vector3(0.08f, 4.5f, 0.1f), dividerMat);
            CreateCube("Divider2", new Vector3(2.3f, 3.5f, 8.5f), new Vector3(0.08f, 4.5f, 0.1f), dividerMat);

            CreateText("Header_INBOX", "INBOX", new Vector3(-4.6f, 5.5f, 8.4f), 28, 0.12f, Color.white, FontStyle.Bold);
            CreateText("Header_PLAN", "PLAN", new Vector3(0f, 5.5f, 8.4f), 28, 0.12f, Color.white, FontStyle.Bold);
            CreateText("Header_WORK", "WORK", new Vector3(4.6f, 5.5f, 8.4f), 28, 0.12f, Color.white, FontStyle.Bold);

            CreateTaskCard(new Vector3(-4.6f, 4.8f, 8.4f), new Color(0.55f, 0.65f, 0.75f), "Inbox: Docs", 0);
            CreateTaskCard(new Vector3(-4.6f, 4.1f, 8.4f), new Color(0.50f, 0.60f, 0.70f), "Inbox: API", 1);
            CreateTaskCard(new Vector3(-4.6f, 3.4f, 8.4f), new Color(0.45f, 0.55f, 0.65f), "Inbox: UI", 2);
            CreateTaskCard(new Vector3(-4.6f, 2.7f, 8.4f), new Color(0.40f, 0.50f, 0.60f), "Inbox: Tests", 3);

            CreateTaskCard(new Vector3(0f, 4.8f, 8.4f), new Color(0.75f, 0.65f, 0.25f), "Plan: Scene", 4);
            CreateTaskCard(new Vector3(0f, 4.1f, 8.4f), new Color(0.70f, 0.60f, 0.22f), "Plan: AI", 5);
            CreateTaskCard(new Vector3(0f, 3.4f, 8.4f), new Color(0.65f, 0.55f, 0.20f), "Plan: Deploy", 6);

            CreateTaskCard(new Vector3(4.6f, 4.8f, 8.4f), new Color(0.25f, 0.50f, 0.75f), "Work: Build", 7);
            CreateTaskCard(new Vector3(4.6f, 4.1f, 8.4f), new Color(0.22f, 0.45f, 0.70f), "Work: Sync", 8);
            CreateTaskCard(new Vector3(4.6f, 3.4f, 8.4f), new Color(0.30f, 0.55f, 0.45f), "Work: QA", 9);

            CreateCube("DoneBadge", new Vector3(4.6f, 5.0f, 8.4f), new Vector3(2.0f, 0.4f, 0.05f), CreateMaterial(new Color(0.25f, 0.50f, 0.75f), 0.2f));
            CreateText("DoneText", "DONE", new Vector3(4.6f, 5.0f, 8.35f), 10, 0.12f, Color.white, FontStyle.Bold);
        }

        private void CreateTaskCard(Vector3 position, Color color, string label, int index)
        {
            var card = CreateCube($"Card_{index}", position, new Vector3(3.5f, 0.55f, 0.05f), CreateMaterial(color, 0.12f));
            var txt = CreateText($"CardText_{index}", label, position + new Vector3(0f, 0f, -0.03f), 8, 0.09f, Color.white, FontStyle.Normal);
            txt.transform.SetParent(card.transform);
            txt.transform.localPosition = new Vector3(0f, 0f, -0.03f);
        }

        private void BuildDesk()
        {
            CreateCube("DeskSurface", new Vector3(0f, 0.6f, 2f), new Vector3(5f, 0.15f, 3f), deskMat);

            CreateCube("DeskLeg_FL", new Vector3(-2.3f, 0.3f, 0.6f), new Vector3(0.2f, 0.6f, 0.2f), deskLegMat);
            CreateCube("DeskLeg_FR", new Vector3(2.3f, 0.3f, 0.6f), new Vector3(0.2f, 0.6f, 0.2f), deskLegMat);
            CreateCube("DeskLeg_BL", new Vector3(-2.3f, 0.3f, 3.4f), new Vector3(0.2f, 0.6f, 0.2f), deskLegMat);
            CreateCube("DeskLeg_BR", new Vector3(2.3f, 0.3f, 3.4f), new Vector3(0.2f, 0.6f, 0.2f), deskLegMat);

            Vector3[] paperPositions =
            {
                new Vector3(-1.5f, 0.69f, 1.2f),
                new Vector3(-0.4f, 0.69f, 1.9f),
                new Vector3(0.9f, 0.69f, 2.5f),
                new Vector3(1.6f, 0.69f, 1.4f),
                new Vector3(-1.0f, 0.69f, 2.8f),
                new Vector3(0.2f, 0.69f, 1.0f)
            };

            for (int i = 0; i < paperPositions.Length; i++)
            {
                var paper = CreateCube($"Paper_{i + 1}", paperPositions[i], new Vector3(1.2f, 0.02f, 0.9f), paperMat);
                paper.transform.rotation = Quaternion.Euler(0f, Random.Range(-15f, 15f), 0f);
            }
        }
    }
}
