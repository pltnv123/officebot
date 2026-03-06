using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Networking;

namespace OfficeHub
{
public sealed class RuntimeSceneBuilder : MonoBehaviour
{
 private readonly List<GameObject> _robots = new();
 private readonly List<Transform> _robotTransforms = new();
 private readonly List<Vector3> _robotIdleAnchors = new();
 private readonly List<Light> _eyeLights = new();
 private readonly List<Material> _eyePulseMats = new();
 private readonly List<Transform> _labelXforms = new();
 private readonly List<TextMesh> _liveTaskLabels = new();
 private TextMesh _wipText, _queueText, _blockersText, _throughputText;
 private float _t;
 [SerializeField] private string taskStateUrl = "/api/state";

 private void Start()
 {
 SetupCamera();
 BuildRoom();
 BuildTaskBoard();
 BuildDesk();
 BuildRobots();
 BuildLighting();
 WireBackend();
 StartCoroutine(PollTaskState());
 }

 private void Update()
 {
 _t += Time.deltaTime;
 var cam = Camera.main;
 for (int i = 0; i < _robots.Count; i++)
 {
 if (_robots[i] == null) continue;
 var a = i < _robotIdleAnchors.Count ? _robotIdleAnchors[i] : _robots[i].transform.position;
 float bob = Mathf.Sin(_t * 1.8f + i * 1.6f) * 0.05f;
 _robots[i].transform.position = new Vector3(a.x, a.y + bob, a.z);
 _robots[i].transform.rotation = Quaternion.Euler(
 0f, _robots[i].transform.rotation.eulerAngles.y,
 Mathf.Sin(_t * 1.2f + i * 0.8f) * 1.4f);
 }
 for (int i = 0; i < _eyeLights.Count; i++)
 {
 if (_eyeLights[i] == null) continue;
 _eyeLights[i].intensity = 5f + Mathf.Sin(_t * 3f + i * 0.9f) * 2f;
 }
 for (int i = 0; i < _eyePulseMats.Count; i++)
 {
 var m = _eyePulseMats[i]; if (m == null) continue;
 if (m.HasProperty("_EmissionColor"))
 m.SetColor("_EmissionColor", m.color * (15f + Mathf.Sin(_t * 3.3f + i * 0.7f) * 5f));
 }
 if (cam != null)
 foreach (var lx in _labelXforms)
 {
 if (lx == null) continue;
 var d = cam.transform.position - lx.position;
 if (d.sqrMagnitude > 0.001f)
 lx.rotation = Quaternion.LookRotation(-d.normalized, Vector3.up);
 }
 }

 // ═══════════════════════════════════════════
 // CAMERA
 // KEY INSIGHT: rotate Y=-15 so camera looks
 // from left side — this makes Worker(Z=1.3)
 // and Reviewer(Z=1.1) visible beside the desk
 // ═══════════════════════════════════════════
 private static void SetupCamera()
 {
 var cam = Camera.main; if (cam == null) return;
 cam.orthographic = false;
 cam.fieldOfView = 45f;
 // Left-front but closer to straight-on floor receding away
 cam.transform.position = new Vector3(-1.5f, 7.0f, -9.0f);
 cam.transform.rotation = Quaternion.Euler(30f, 8f, 0f);
 cam.backgroundColor = new Color(0.04f, 0.04f, 0.07f);
 cam.clearFlags = CameraClearFlags.SolidColor;
 cam.nearClipPlane = 0.3f;
 cam.farClipPlane = 80f;
 }

 // ═══════════════════════════════════════════
 // ROOM
 // ═══════════════════════════════════════════
 private void BuildRoom()
 {
 // warm beige stone floor like reference
 var floor = Mat(new Color(0.54f, 0.48f, 0.38f), 0.06f);
 var line = Mat(new Color(0.40f, 0.35f, 0.27f), 0.04f);
 Cube("Floor", new Vector3(0f, -0.05f, 3f), new Vector3(18f, 0.1f, 20f), floor);
 for (int i = 0; i < 7; i++) Cube($"TX{i}", new Vector3(-9f+i*3f, 0.01f, 3f), new Vector3(0.04f,0.01f,20f), line);
 for (int j = 0; j < 8; j++) Cube($"TZ{j}", new Vector3(0f, 0.01f, -6f+j*3f), new Vector3(18f,0.01f,0.04f), line);

 var wall = Mat(new Color(0.11f, 0.12f, 0.17f), 0.1f);
 Cube("BackWall", new Vector3(0f, 4.5f, 10.5f), new Vector3(20f, 9f, 0.3f), wall);
 Cube("LeftWall", new Vector3(-9f, 4.5f, 2f), new Vector3(0.3f, 9f, 20f), wall);
 Cube("RightWall", new Vector3( 9f, 4.5f, 2f), new Vector3(0.3f, 9f, 20f), wall);
 Cube("Ceiling", new Vector3(0f, 9.0f, 2f), new Vector3(20f, 0.3f, 20f), wall);
 }

 // ═══════════════════════════════════════════
 // TASK BOARD — full back wall
 // ═══════════════════════════════════════════
 private void BuildTaskBoard()
 {
 float bz = 4.2f; // align frame with TaskBoard on back wall
 var board = Mat(new Color(0.07f, 0.08f, 0.11f), 0.08f);
 var frame = Mat(new Color(0.26f, 0.26f, 0.31f), 0.18f);
 var div = Mat(new Color(0.20f, 0.20f, 0.25f), 0.12f);

 Cube("TaskBoard", new Vector3(0f, 2.3f, 4.2f), new Vector3(8f, 2f, 0.2f), board);
 Cube("BrdTop", new Vector3(0f, 5.38f, bz-0.1f),new Vector3(11.2f, 0.10f, 0.12f), frame);
 Cube("BrdBot", new Vector3(0f, 1.10f, bz-0.1f),new Vector3(11.2f, 0.10f, 0.12f), frame);
 Cube("BrdL", new Vector3(-5.5f,3.2f,bz-0.1f),new Vector3(0.10f, 4.2f, 0.12f), frame);
 Cube("BrdR", new Vector3( 5.5f,3.2f,bz-0.1f),new Vector3(0.10f, 4.2f, 0.12f), frame);
 Cube("Div1", new Vector3(-2.2f,3.2f,bz-0.08f),new Vector3(0.07f,4.0f,0.08f), div);
 Cube("Div2", new Vector3( 2.2f,3.2f,bz-0.08f),new Vector3(0.07f,4.0f,0.08f), div);

 float fz = bz - 0.12f;
 Txt("H_INBOX","INBOX",new Vector3(-4.0f,5.0f,fz),30,0.13f,Color.white,FontStyle.Bold);
 Txt("H_PLAN", "PLAN", new Vector3( 0f,5.0f,fz),30,0.13f,Color.white,FontStyle.Bold);
 Txt("H_WORK", "WORK", new Vector3( 4.0f,5.0f,fz),30,0.13f,Color.white,FontStyle.Bold);

 // INBOX — blue-grey cards
 Card("IA",-4.0f,4.35f,new Color(.55f,.65f,.75f),"Inbox A",fz);
 Card("IB",-4.0f,3.75f,new Color(.50f,.60f,.70f),"Inbox B",fz);
 Card("IC",-4.0f,3.15f,new Color(.45f,.55f,.65f),"Inbox C",fz);
 Card("ID",-4.0f,2.55f,new Color(.40f,.50f,.60f),"Inbox D",fz);

 // PLAN — golden cards
 Card("PA",0f,4.35f,new Color(.75f,.65f,.25f),"Plan A",fz);
 Card("PB",0f,3.75f,new Color(.70f,.60f,.22f),"Plan B",fz);
 Card("PC",0f,3.15f,new Color(.65f,.55f,.20f),"Plan C",fz);

 // WORK — blue + green done badge
 Cube("DoneBadge",new Vector3(4.0f,4.60f,fz+0.02f),new Vector3(3.4f,0.38f,0.04f),
 Mat(new Color(.22f,.45f,.70f)));
 Txt("DoneTxt","DONE",new Vector3(4.0f,4.60f,fz-0.04f),10,0.11f,Color.white,FontStyle.Bold);
 Card("WA",4.0f,4.0f, new Color(.25f,.50f,.75f),"Work A",fz);
 Card("WB",4.0f,3.4f, new Color(.22f,.45f,.70f),"Work B",fz);
 Card("WC",4.0f,2.8f, new Color(.28f,.52f,.42f),"Work C",fz);

 // bottom rail + telemetry
 Cube("UrgentRail",new Vector3(0f,1.28f,fz+0.05f),new Vector3(11f,0.11f,0.04f),
 Emissive(new Color(.3f,.05f,.06f),new Color(1f,.12f,.08f),0.9f));
 _wipText = Txt("WIP", "WIP 07", new Vector3( 0f,1.60f,fz),10,0.10f,new Color(.85f,.92f,1f),FontStyle.Bold);
 _queueText = Txt("QUEUE","QUEUE 23", new Vector3(-5.0f,1.60f,fz), 8,0.09f,new Color(.92f,.86f,.68f));
 _blockersText = Txt("BLK", "BLOCKERS 2", new Vector3( 0f,1.22f,fz), 8,0.08f,new Color(1f,.72f,.70f));
 _throughputText = Txt("THRU", "THROUGHPUT 19",new Vector3( 5.0f,1.60f,fz), 8,0.09f,new Color(.74f,.90f,1f));
 }

 private void Card(string id,float x,float y,Color col,string label,float fz)
 {
 Cube($"Card_{id}",new Vector3(x,y,fz+0.02f),new Vector3(3.6f,0.48f,0.04f),Mat(col,0.10f));
 _liveTaskLabels.Add(Txt($"CT_{id}",label,new Vector3(x,y,fz-0.04f),8,0.09f,Color.white));
 }

 // ═══════════════════════════════════════════
 // DESK — origin (0,0,0) = desk center
 // ═══════════════════════════════════════════
 private void BuildDesk()
 {
 var desk = Mat(new Color(0.26f,0.17f,0.09f),0.28f);
 var leg = Mat(new Color(0.20f,0.13f,0.07f),0.18f);
 var paper = Mat(new Color(0.91f,0.89f,0.83f),0.04f);

 // desk top — elevated, centered at world origin
 Cube("DeskTop", new Vector3(0f,0.76f,0.6f), new Vector3(3.4f,0.08f,1.5f), desk);
 Cube("DeskLegFL", new Vector3(-1.55f,0.37f,-0.1f),new Vector3(0.10f,0.74f,0.10f),leg);
 Cube("DeskLegFR", new Vector3( 1.55f,0.37f,-0.1f),new Vector3(0.10f,0.74f,0.10f),leg);
 Cube("DeskLegBL", new Vector3(-1.55f,0.37f, 1.3f),new Vector3(0.10f,0.74f,0.10f),leg);
 Cube("DeskLegBR", new Vector3( 1.55f,0.37f, 1.3f),new Vector3(0.10f,0.74f,0.10f),leg);

 // papers scattered on desk
 float[] px={-1.3f,-0.2f,0.9f,1.4f,-0.8f,0.3f,1.1f};
 float[] pz={ 0.7f, 1.4f,2.0f,0.9f, 2.2f,0.4f,1.7f};
 for(int i=0;i<px.Length;i++){
 var p=Cube($"P{i}",new Vector3(px[i],0.81f,pz[i]),new Vector3(1.1f,0.018f,0.82f),paper);
 p.transform.rotation=Quaternion.Euler(0f,UnityEngine.Random.Range(-20f,20f),0f);
 }
 // coffee cup
 Cyl("Cup",new Vector3(-1.35f,0.88f,1.05f),new Vector3(0.13f,0.18f,0.13f),
 Mat(new Color(.13f,.08f,.06f)));
 // pencil
 var pen=Cyl("Pencil",new Vector3(0.7f,0.81f,1.75f),new Vector3(0.025f,0.33f,0.025f),
 Mat(new Color(.8f,.6f,.1f)));
 pen.transform.rotation=Quaternion.Euler(0f,25f,90f);
 // keyboard
 Cube("Keyboard",new Vector3(0f,0.81f,1.0f),new Vector3(1.3f,0.034f,0.36f),
 Mat(new Color(.09f,.09f,.11f)));
 // monitor
 Cube("MonBase",new Vector3(0.1f,0.84f,1.65f),new Vector3(0.10f,0.06f,0.45f),
 Mat(new Color(.10f,.10f,.12f)));
 Cube("MonBody",new Vector3(0.1f,1.60f,1.68f),new Vector3(0.07f,0.85f,1.45f),
 Mat(new Color(.08f,.08f,.10f)));
 Cube("MonScr", new Vector3(0.04f,1.60f,1.68f),new Vector3(0.03f,0.72f,1.28f),
 Emissive(new Color(.07f,.20f,.55f),new Color(.07f,.20f,.55f),3.2f));
 }

 // ═══════════════════════════════════════════
 // ROBOTS
 // Positions from reference navpoints:
 // Worker: (-2.2, 0, 1.3) — left of desk
 // Planner: (0, 0, -0.7) — center front
 // Reviewer:(2.4, 0, 1.1) — right of desk
 // Camera rotated 15° right so all are visible
 // ═══════════════════════════════════════════
 private void BuildRobots()
 {
 // Worker — left side, facing board (rotY=35)
 var w = BuildRobot(new Vector3(-2.2f,0f,1.3f), new Color(0.20f,0.95f,0.72f),"WORKER", 35f);
 // raise left arm toward board
 if(w!=null){var arm=w.transform.Find("ArmLUp");
 if(arm!=null)arm.localRotation=Quaternion.Euler(-55f,0f,25f);}

 // Planner — center, facing camera (rotate 180 to face viewer)
 var planner = BuildRobot(new Vector3(0f,0f,-0.7f), new Color(0.35f,0.65f,1.00f),"PLANNER", 0f);
 if(planner!=null) planner.transform.rotation = Quaternion.Euler(0f, 180f, 0f);

 // Reviewer — right side, facing left toward desk (rotY=-40)
 BuildRobot(new Vector3(2.4f,0f,1.1f), new Color(0.20f,0.95f,0.72f),"REVIEWER",-40f);
 }

 private GameObject BuildRobot(Vector3 pos,Color eyeCol,string role,float rotY)
 {
 var root=TryLoadFbxRobot(pos, role) ?? BuildPixarRobot(pos,eyeCol,role);
 if(root==null)return null;
 root.transform.rotation=Quaternion.Euler(0f,rotY,0f);

 // floating name label
 var lg=new GameObject("Label");
 lg.transform.SetParent(root.transform);
 lg.transform.localPosition=new Vector3(0f,2.55f,0f);
 lg.transform.localScale=Vector3.one*0.22f;

 var labelBack=GameObject.CreatePrimitive(PrimitiveType.Cube);
 labelBack.name="LabelBack";
 labelBack.transform.SetParent(lg.transform,false);
 labelBack.transform.localPosition=new Vector3(0f,0f,0.12f);
 labelBack.transform.localScale=new Vector3(4.8f,1.2f,0.12f);
 var lbR=labelBack.GetComponent<Renderer>();
 if(lbR!=null) lbR.material=Emissive(new Color(0.02f,0.02f,0.03f),new Color(0.02f,0.02f,0.03f),0.4f);

 var tm=lg.AddComponent<TextMesh>();
 tm.text=role; tm.fontSize=20; tm.color=Color.white;
 tm.anchor=TextAnchor.MiddleCenter; tm.alignment=TextAlignment.Center;
 _labelXforms.Add(lg.transform);

 _robots.Add(root);
 _robotIdleAnchors.Add(pos);
 _robotTransforms.Add(root.transform);
 foreach(var lt in root.GetComponentsInChildren<Light>(true))_eyeLights.Add(lt);
 return root;
 }

 private GameObject TryLoadFbxRobot(Vector3 pos, string role)
 {
 var prefab = Resources.Load<GameObject>("Models/" + role);
 if (prefab == null) return null;

 var go = Instantiate(prefab, pos, Quaternion.identity);
 go.name = role;

 var renderers = go.GetComponentsInChildren<Renderer>(true);
 if (renderers == null || renderers.Length == 0)
 {
 Destroy(go);
 return null;
 }

 var ls = go.transform.localScale;
 if (ls.x < 0.01f || ls.y < 0.01f || ls.z < 0.01f)
 go.transform.localScale = Vector3.one;

 return go;
 }

 // Pixar robot — round head, white body, big glowy eyes
 private GameObject BuildPixarRobot(Vector3 pos,Color eyeCol,string role)
 {
 var root=new GameObject(role);
 root.transform.position=pos;

 Color body =new Color(0.88f,0.88f,0.91f); // near-white
 Color grey =new Color(0.68f,0.68f,0.72f);
 Color dark =new Color(0.12f,0.12f,0.14f);

 // wheel base
 Go(root,PrimitiveType.Cylinder,"WheelBase",
 new Vector3(0f,0.12f,0f),new Vector3(0.62f,0.08f,0.62f),ToonM(dark));
 Go(root,PrimitiveType.Cylinder,"WheelL",
 new Vector3(-0.29f,0.12f,0f),new Vector3(0.14f,0.14f,0.14f),ToonM(dark),
 Quaternion.Euler(0f,0f,90f));
 Go(root,PrimitiveType.Cylinder,"WheelR",
 new Vector3( 0.29f,0.12f,0f),new Vector3(0.14f,0.14f,0.14f),ToonM(dark),
 Quaternion.Euler(0f,0f,90f));

 // body — cube with rounded feel via sphere overlay
 Go(root,PrimitiveType.Cube,"Body",
 new Vector3(0f,0.70f,0f),new Vector3(0.76f,0.66f,0.56f),ToonM(body));
 // belly sphere for Pixar roundness
 Go(root,PrimitiveType.Sphere,"Belly",
 new Vector3(0f,0.68f,0.24f),new Vector3(0.58f,0.48f,0.28f),ToonM(grey));
 // chest emissive stripe
 Go(root,PrimitiveType.Cube,"ChestStripe",
 new Vector3(0f,0.84f,0.29f),new Vector3(0.36f,0.055f,0.025f),
 Emissive(eyeCol*0.4f,eyeCol,2.5f));
 // neck
 Go(root,PrimitiveType.Cylinder,"Neck",
 new Vector3(0f,1.10f,0f),new Vector3(0.19f,0.09f,0.19f),ToonM(dark));
 // HEAD — big Pixar sphere
 Go(root,PrimitiveType.Sphere,"Head",
 new Vector3(0f,1.54f,0f),new Vector3(0.90f,0.84f,0.86f),ToonM(body));
 // face plate
 Go(root,PrimitiveType.Cube,"Face",
 new Vector3(0f,1.54f,0.43f),new Vector3(0.66f,0.54f,0.07f),ToonM(dark));

 // EYES — big glowy Pixar circles
 var eyeMat=new Material(LS()){color=eyeCol};
 eyeMat.EnableKeyword("_EMISSION");
 eyeMat.SetColor("_EmissionColor",eyeCol*22f);
 eyeMat.SetFloat("_Metallic",0f);
 eyeMat.SetFloat("_Glossiness",1f);
 eyeMat.globalIlluminationFlags=MaterialGlobalIlluminationFlags.RealtimeEmissive;
 _eyePulseMats.Add(eyeMat);

 // eye socket (dark ring)
 Go(root,PrimitiveType.Sphere,"SockL",
 new Vector3(-0.18f,1.56f,0.45f),new Vector3(0.27f,0.27f,0.10f),ToonM(dark));
 Go(root,PrimitiveType.Sphere,"SockR",
 new Vector3( 0.18f,1.56f,0.45f),new Vector3(0.27f,0.27f,0.10f),ToonM(dark));
 // glowing eye
 Go(root,PrimitiveType.Sphere,"EyeL",
 new Vector3(-0.18f,1.56f,0.47f),new Vector3(0.21f,0.21f,0.09f),eyeMat);
 Go(root,PrimitiveType.Sphere,"EyeR",
 new Vector3( 0.18f,1.56f,0.47f),new Vector3(0.21f,0.21f,0.09f),eyeMat);

 // eye point light
 var elgo=new GameObject("EyeLight");
 elgo.transform.SetParent(root.transform);
 elgo.transform.localPosition=new Vector3(0f,1.56f,0.55f);
 var elt=elgo.AddComponent<Light>();
 elt.type=LightType.Point; elt.color=eyeCol;
 elt.range=4.5f; elt.intensity=5f; elt.shadows=LightShadows.None;

 // antenna
 Go(root,PrimitiveType.Cylinder,"Ant",
 new Vector3(0.19f,2.02f,0f),new Vector3(0.026f,0.14f,0.026f),ToonM(grey));
 Go(root,PrimitiveType.Sphere,"AntTip",
 new Vector3(0.19f,2.21f,0f),new Vector3(0.08f,0.08f,0.08f),
 Emissive(eyeCol*0.4f,eyeCol,8f));

 // ARMS — chubby Pixar capsules
 MakeArm(root,-1f,body,dark,"L");
 MakeArm(root, 1f,body,dark,"R");

 root.transform.localScale=Vector3.one;
 return root;
 }

 private static void MakeArm(GameObject root,float side,Color body,Color dark,string tag)
 {
 var aU=Go(root,PrimitiveType.Capsule,$"Arm{tag}Up",
 new Vector3(side*0.56f,0.82f,0.05f),new Vector3(0.16f,0.23f,0.16f),ToonM(body));
 aU.name=$"Arm{tag}Up";
 Go(root,PrimitiveType.Capsule,$"Arm{tag}Dn",
 new Vector3(side*0.63f,0.54f,0.09f),new Vector3(0.13f,0.17f,0.13f),ToonM(body),
 Quaternion.Euler(18f,0f,side*11f));
 Go(root,PrimitiveType.Sphere,$"Hand{tag}",
 new Vector3(side*0.68f,0.34f,0.14f),new Vector3(0.17f,0.13f,0.15f),ToonM(body));
 }

 private static GameObject Go(GameObject root,PrimitiveType t,string n,
 Vector3 lp,Vector3 ls,Material m,Quaternion? lr=null)
 {
 var g=GameObject.CreatePrimitive(t);
 g.name=n; g.transform.SetParent(root.transform);
 g.transform.localPosition=lp; g.transform.localScale=ls;
 g.transform.localRotation=lr??Quaternion.identity;
 g.GetComponent<Renderer>().material=m;
 return g;
 }

 // ═══════════════════════════════════════════
 // LIGHTING — warm Pixar 3-point
 // ═══════════════════════════════════════════
 private static void BuildLighting()
 {
 RenderSettings.ambientMode = AmbientMode.Flat;
 RenderSettings.ambientLight = new Color(1.0f, 0.95f, 0.85f);

 var def=GameObject.Find("Directional Light");
 if(def!=null)Object.DestroyImmediate(def);

 // KEY — warm from top-left (matches reference sun angle)
 L("Key", LightType.Directional, new Color(1.00f,0.91f,0.74f),2.4f,0f,
 LightShadows.Soft, Vector3.zero,Quaternion.Euler(42f,-35f,0f));

 // FILL — cool from right (blue screen glow from monitors)
 L("Fill", LightType.Point, new Color(0.48f,0.58f,0.92f),2.0f,30f,
 LightShadows.None, new Vector3(8f,5f,0f));

 // RIM — warm from behind/above (lifts shapes from background)
 L("Rim", LightType.Point, new Color(1.00f,0.82f,0.52f),2.8f,22f,
 LightShadows.None, new Vector3(0f,5f,7f));

 // VIZ-002 target: warm white point light for overall scene brightness
 L("WarmFill", LightType.Point, new Color(1.00f, 0.95f, 0.85f), 3.0f, 20f,
 LightShadows.None, new Vector3(0f, 4f, -3f));

 // ROBOT FRONT — dedicated bright fill so robot faces glow
 // Positioned at camera-side to light all 3 robot faces
 L("RobotFront",LightType.Point, new Color(1.00f,0.96f,0.88f),6.0f,18f,
 LightShadows.None, new Vector3(-1f,3.5f,-5f));

 // DESK LAMP — orange pool on desk surface
 L("Desk", LightType.Point, new Color(1.00f,0.76f,0.40f),5.0f,9f,
 LightShadows.None, new Vector3(0f,2.5f,1.2f));

 // BOARD SPOT — cool white on task board
 L("Board",LightType.Spot, new Color(0.88f,0.93f,1.00f),4.0f,16f,
 LightShadows.None, new Vector3(0f,8f,2f),Quaternion.Euler(60f,0f,0f),55f);
 }

 private static void L(string n,LightType t,Color c,float intensity,float range,
 LightShadows sh,Vector3 pos,Quaternion? rot=null,float spot=60f)
 {
 var go=new GameObject(n+"_Light");
 var lt=go.AddComponent<Light>();
 lt.type=t; lt.color=c; lt.intensity=intensity;
 lt.range=range; lt.shadows=sh; lt.spotAngle=spot;
 go.transform.position=pos;
 go.transform.rotation=rot??Quaternion.identity;
 }

 // ═══════════════════════════════════════════
 // BACKEND WIRE-UP
 // ═══════════════════════════════════════════
 private void WireBackend()
 {
 var mgr=GameObject.Find("SceneManager")??new GameObject("SceneManager");
 if (mgr.GetComponent<ApiClient>() == null) mgr.AddComponent<ApiClient>();

 BotMover Mv(int idx,string role,Vector3 idle,Vector3 desk,Vector3 done){
 if(idx>=_robotTransforms.Count)return null;
 var go=_robotTransforms[idx].gameObject;
 var mv=go.GetComponent<BotMover>()??go.AddComponent<BotMover>();
 mv.SetRole(role); mv.idlePos=idle;
 mv.boardPos=new Vector3(0f,0f,9f);
 mv.deskPos=desk; mv.donePos=done;
 mv.eyeLights.Clear();
 foreach(var lt in go.GetComponentsInChildren<Light>())mv.eyeLights.Add(lt);
 return mv;
 }
 var plannerM=Mv(1,"planner",new Vector3(-3.5f,0f,1.5f),new Vector3(-3.5f,0f,0.5f),new Vector3(5.5f,0f,9f));
 var workerM =Mv(0,"worker", new Vector3(0.0f, 0f,0.0f),new Vector3(0.0f, 0f,0.5f),new Vector3(5.5f,0f,9f));
 var testerM =Mv(2,"tester", new Vector3(3.5f, 0f,1.5f),new Vector3(3.5f, 0f,0.5f),new Vector3(5.5f,0f,9f));

 var orch=mgr.GetComponent<TaskOrchestrator>()??mgr.AddComponent<TaskOrchestrator>();
 orch.plannerBot=plannerM; orch.workerBot=workerM; orch.testerBot=testerM;
 var poller=mgr.GetComponent<StatePoller>()??mgr.AddComponent<StatePoller>();
 poller.orchestrator=orch;
 mgr.name="SceneManager";
 }

 // ═══════════════════════════════════════════
 // HELPERS
 // ═══════════════════════════════════════════
 private static Shader LS() => Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Universal Render Pipeline/Simple Lit") ?? Shader.Find("Sprites/Default") ?? Shader.Find("Hidden/InternalErrorShader");
 private static Material Mat(Color c,float s=0.2f){
 var m=new Material(LS()){color=c};
 if(m.HasProperty("_Smoothness"))m.SetFloat("_Smoothness",s);
 if(m.HasProperty("_Glossiness"))m.SetFloat("_Glossiness",s);
 return m;
 }
 private static Material ToonM(Color c){
 var m=new Material(LS()){color=c};
 if(m.HasProperty("_Metallic")) m.SetFloat("_Metallic",0f);
 if(m.HasProperty("_Glossiness")) m.SetFloat("_Glossiness",0.04f);
 if(m.HasProperty("_Smoothness")) m.SetFloat("_Smoothness",0.04f);
 return m;
 }
 private static Material Emissive(Color b,Color e,float mul){
 var m=new Material(LS()){color=b};
 m.EnableKeyword("_EMISSION");
 if(m.HasProperty("_EmissionColor")) m.SetColor("_EmissionColor",e*mul);
 m.globalIlluminationFlags=MaterialGlobalIlluminationFlags.RealtimeEmissive;
 return m;
 }
 private static GameObject Cube(string n,Vector3 p,Vector3 s,Material m){
 var g=GameObject.CreatePrimitive(PrimitiveType.Cube);
 g.name=n;g.transform.position=p;g.transform.localScale=s;
 g.GetComponent<Renderer>().material=m;return g;
 }
 private static GameObject Cyl(string n,Vector3 p,Vector3 s,Material m){
 var g=GameObject.CreatePrimitive(PrimitiveType.Cylinder);
 g.name=n;g.transform.position=p;g.transform.localScale=s;
 g.GetComponent<Renderer>().material=m;return g;
 }
 private static TextMesh Txt(string n,string t,Vector3 p,int sz,float ch,
 Color c,FontStyle fs=FontStyle.Normal){
 var g=new GameObject(n);g.transform.position=p;
 var tm=g.AddComponent<TextMesh>();
 tm.text=t;tm.fontSize=sz;tm.characterSize=ch;
 tm.color=c;tm.fontStyle=fs;
 tm.anchor=TextAnchor.MiddleCenter;tm.alignment=TextAlignment.Center;
 return tm;
 }

 [System.Serializable] private sealed class RT {public string title,status;}
 [System.Serializable] private sealed class RS {public List<RT> tasks;}
 [System.Serializable] private sealed class RSE {public List<RT> tasks; public RS taskState;}

 private System.Collections.IEnumerator PollTaskState()
 {
 while(true){
 var req=UnityWebRequest.Get(taskStateUrl);req.timeout=4;
 yield return req.SendWebRequest();
 if(req.result==UnityWebRequest.Result.Success){
 var e=JsonUtility.FromJson<RSE>(req.downloadHandler.text);
 var tasks=e?.tasks??e?.taskState?.tasks;
 if(tasks!=null){
 int doing=0,done=0;
 foreach(var tk in tasks){var s=(tk.status??"").ToLower();if(s=="done")done++;else doing++;}
 for(int i=0;i<_liveTaskLabels.Count;i++){
 var tm=_liveTaskLabels[i];if(tm==null)continue;
 tm.text=i<tasks.Count?(tasks[i].title??$"Task {i+1}"):"";
 }
 if(_wipText!=null) _wipText.text =$"WIP {doing:00}";
 if(_queueText!=null) _queueText.text =$"QUEUE {tasks.Count:00}";
 if(_blockersText!=null) _blockersText.text =$"BLOCKERS {Mathf.Max(0,doing-3)}";
 if(_throughputText!=null)_throughputText.text=$"THROUGHPUT {done:00}";
 }
 }
 req.Dispose();
 yield return new WaitForSeconds(3f);
 }
 }
}
}
