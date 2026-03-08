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
 BuildBoard();
 BuildZones();
 BuildAgents();
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
 cam.fieldOfView = 50f;
 cam.transform.position = new Vector3(0f, 8f, -7f);
 cam.transform.rotation = Quaternion.Euler(42f, 0f, 0f);
 cam.backgroundColor = new Color(0.08f, 0.07f, 0.06f);
 cam.clearFlags = CameraClearFlags.SolidColor;
 cam.nearClipPlane = 0.3f;
 cam.farClipPlane = 100f;
 }

 // ═══════════════════════════════════════════
 // ROOM // ═══════════════════════════════════════════
 // ROOM
 // ═══════════════════════════════════════════
 private void BuildRoom()
 {
 var floor = Mat(new Color(0.35f, 0.30f, 0.25f), 0.05f);
 Cube("Floor", new Vector3(0f, -0.05f, 3f), new Vector3(20f, 0.2f, 14f), floor);

 var corridor = Mat(new Color(0.43f, 0.37f, 0.30f), 0.04f);
 Cube("CorridorCenter", new Vector3(0f, -0.03f, 3f), new Vector3(2f, 0.02f, 14f), corridor);
 Cube("CorridorLeft", new Vector3(-5f, -0.03f, 3f), new Vector3(2f, 0.02f, 14f), corridor);
 Cube("CorridorRight", new Vector3(5f, -0.03f, 3f), new Vector3(2f, 0.02f, 14f), corridor);

 var wall = Mat(new Color(0.25f, 0.22f, 0.18f), 0.08f);
 Cube("BackWall", new Vector3(0f, 2.5f, 10f), new Vector3(20f, 5f, 0.3f), wall);
 Cube("LeftWall", new Vector3(-10f, 2.5f, 3f), new Vector3(0.3f, 5f, 14f), wall);
 Cube("RightWall", new Vector3(10f, 2.5f, 3f), new Vector3(0.3f, 5f, 14f), wall);
 Cube("Ceiling", new Vector3(0f, 5.0f, 3f), new Vector3(20f, 0.3f, 14f), wall);

 var shelf=Mat(new Color(0.40f,0.30f,0.22f),0.12f);
 var box=Mat(new Color(0.52f,0.42f,0.30f),0.06f);
 for(int i=0;i<3;i++){
 float y=1.2f+i*1.1f;
 Cube($"Shelf{i}",new Vector3(-9.3f,y,1.5f+i*2.2f),new Vector3(0.8f,0.08f,2.6f),shelf);
 Cube($"ShelfBox{i}A",new Vector3(-9.3f,y+0.22f,0.9f+i*2.2f),new Vector3(0.45f,0.35f,0.5f),box);
 Cube($"ShelfBox{i}B",new Vector3(-9.3f,y+0.22f,2.0f+i*2.2f),new Vector3(0.35f,0.25f,0.45f),box);
 }
 }

 // ═══════════════════════════════════════════
 // TASK BOARD // ═══════════════════════════════════════════
 // TASK BOARD — full back wall
 // ═══════════════════════════════════════════
 private void BuildBoard()
 {
 var board = Mat(new Color(0.14f, 0.11f, 0.09f), 0.08f);
 Cube("TaskBoard", new Vector3(0f, 2.5f, 9f), new Vector3(14f, 3f, 0.2f), board);

 string[] headers={"INBOX","QUEUE","PLAN","WORK","REVIEW","DONE"};
 Color[] cols={new Color(.55f,.55f,.55f),new Color(.75f,.65f,.25f),new Color(.38f,.62f,.95f),new Color(.92f,.55f,.22f),new Color(.62f,.40f,.82f),new Color(.35f,.70f,.42f)};
 for(int i=0;i<6;i++){
 float x=-5.8f+i*2.32f;
 Cube($"Col{i}",new Vector3(x,2.5f,8.95f),new Vector3(2.1f,2.8f,0.04f),Mat(cols[i],0.1f));
 Txt($"H{i}",headers[i],new Vector3(x,3.7f,8.84f),26,0.08f,Color.white,FontStyle.Bold);
 for(int r=0;r<3;r++)
 Cube($"Slot{i}_{r}",new Vector3(x,3.1f-r*0.8f,8.90f),new Vector3(1.8f,0.45f,0.03f),Mat(cols[i]*0.8f,0.05f));
 }
 }

 private void Card(string id,float x,float y,Color col,string label,float fz)
 {
 Cube($"Card_{id}",new Vector3(x,y,fz+0.02f),new Vector3(3.6f,0.48f,0.04f),Mat(col,0.10f));
 _liveTaskLabels.Add(Txt($"CT_{id}",label,new Vector3(x,y,fz-0.04f),8,0.09f,Color.white));
 }

 // ═══════════════════════════════════════════
 // DESK — origin (0,0,0) = desk center
 // ═══════════════════════════════════════════
 private void BuildZones()
 {
 var wood = Mat(new Color(0.55f, 0.35f, 0.15f), 0.20f);
 var dark = Mat(new Color(0.16f,0.12f,0.10f),0.08f);

 // dispatch zone
 Cube("DispatchDesk", new Vector3(-7f,0.4f,3f), new Vector3(2f,0.8f,1f), Mat(new Color(0.6f,0.4f,0.2f),0.18f));
 Txt("DispatchLabel","DISPATCH",new Vector3(-7f,1.9f,2.4f),24,0.08f,Color.white,FontStyle.Bold);
 Cube("IncomingTray",new Vector3(-6.3f,0.9f,3.2f),new Vector3(0.4f,0.2f,0.4f),Emissive(new Color(.5f,.3f,.1f),new Color(1f,.6f,.1f),2f));

 // central desk + lamp + papers
 Cube("CentralDesk", new Vector3(0f,0.4f,1f), new Vector3(3f,0.8f,2f), wood);
 Cyl("DeskLampBase",new Vector3(0.9f,0.86f,1.3f),new Vector3(0.08f,0.1f,0.08f),dark);
 Cyl("DeskLampStem",new Vector3(0.9f,1.05f,1.3f),new Vector3(0.03f,0.25f,0.03f),dark);
 Cube("DeskLampHead",new Vector3(0.9f,1.25f,1.3f),new Vector3(0.22f,0.12f,0.22f),dark);
 Cube("PaperA",new Vector3(-0.4f,0.83f,1.1f),new Vector3(0.7f,0.01f,0.5f),Mat(new Color(.92f,.90f,.85f),0.02f));
 Cube("PaperB",new Vector3(0.2f,0.83f,0.7f),new Vector3(0.6f,0.01f,0.45f),Mat(new Color(.92f,.90f,.85f),0.02f));
 Cube("PaperC",new Vector3(-0.1f,0.83f,1.45f),new Vector3(0.55f,0.01f,0.4f),Mat(new Color(.92f,.90f,.85f),0.02f));

 // monitoring zone
 Txt("MonitoringLabel","MONITORING",new Vector3(7f,1.9f,2.4f),22,0.08f,Color.white,FontStyle.Bold);
 for(int i=0;i<3;i++){
 float xo=6.5f+i*0.45f;
 Cube($"Mon{i}",new Vector3(xo,1.1f+i*0.22f,3f-i*0.15f),new Vector3(0.7f,0.45f,0.08f),Mat(new Color(0.1f,0.1f,0.15f),0.2f));
 Cube($"MonScr{i}",new Vector3(xo,1.1f+i*0.22f,2.95f-i*0.15f),new Vector3(0.62f,0.34f,0.03f),Emissive(new Color(.10f,.35f,.15f),new Color(.30f,1.0f,.5f),2.2f));
 }

 // room2 door
 Cube("Room2FrameL",new Vector3(7.0f,1.5f,8f),new Vector3(0.2f,3f,0.2f),Emissive(new Color(.5f,.3f,.1f),new Color(1f,.6f,.1f),1.5f));
 Cube("Room2FrameR",new Vector3(9.0f,1.5f,8f),new Vector3(0.2f,3f,0.2f),Emissive(new Color(.5f,.3f,.1f),new Color(1f,.6f,.1f),1.5f));
 Cube("Room2FrameTop",new Vector3(8f,3.0f,8f),new Vector3(2.2f,0.2f,0.2f),Emissive(new Color(.5f,.3f,.1f),new Color(1f,.6f,.1f),1.5f));
 Txt("Room2Label","ROOM 2",new Vector3(8f,3.45f,7.8f),22,0.08f,Color.white,FontStyle.Bold);
 }

 // ═══════════════════════════════════════════
 // ROBOTS // ═══════════════════════════════════════════
 // ROBOTS
 // Positions from reference navpoints:
 // Worker: (-2.2, 0, 1.3) — left of desk
 // Planner: (0, 0, -0.7) — center front
 // Reviewer:(2.4, 0, 1.1) — right of desk
 // Camera rotated 15° right so all are visible
 // ═══════════════════════════════════════════
 private void BuildAgents()
 {
 var worker = BuildRobot(new Vector3(-6.5f,0f,2.5f), new Color(0.20f,0.95f,0.72f),"WORKER", 45f);
 var planner = BuildRobot(new Vector3(-1.8f,0f,0.5f), new Color(0.35f,0.65f,1.00f),"PLANNER", 20f);
 var tester = BuildRobot(new Vector3(6.5f,0f,2.5f), new Color(0.45f,1.00f,0.65f),"TESTER", -45f);
 var chief = BuildRobot(new Vector3(0f,0f,-0.5f), new Color(0.95f,0.85f,0.35f),"CHIEF", 0f);
 Debug.Log($"CHIEF {chief?.transform.position}");
 Debug.Log($"PLANNER {planner?.transform.position}");
 Debug.Log($"WORKER {worker?.transform.position}");
 Debug.Log($"TESTER {tester?.transform.position}");
 }

 private GameObject BuildRobot(Vector3 pos,Color eyeCol,string role,float rotY)
 {
 var root=TryLoadFbxRobot(pos, role) ?? BuildPixarRobot(pos,eyeCol,role);
 if(root==null)return null;
 root.transform.rotation=Quaternion.Euler(0f,rotY,0f);

 // floating name label (VIZ-005 readability)
 var lg=new GameObject("Label");
 lg.transform.SetParent(root.transform);
 // head top (~1.84f) + 0.5f = 2.34f
 lg.transform.localPosition=new Vector3(0f,2.45f,0f);
 lg.transform.localScale=Vector3.one*0.18f;

 var labelBack=GameObject.CreatePrimitive(PrimitiveType.Cube);
 labelBack.name="LabelBack";
 labelBack.transform.SetParent(lg.transform,false);
 labelBack.transform.localPosition=new Vector3(0f,0f,0.12f);
 labelBack.transform.localScale=new Vector3(4.8f,1.2f,0.12f);
 var lbR=labelBack.GetComponent<Renderer>();
 if(lbR!=null) lbR.material=Emissive(new Color(0.02f,0.02f,0.03f),new Color(0.02f,0.02f,0.03f),0.5f);

 AddLabelOutline(lg.transform, role, new Vector3(0f,0.02f,0.01f));
 AddLabelOutline(lg.transform, role, new Vector3(0f,-0.02f,0.01f));
 AddLabelOutline(lg.transform, role, new Vector3(0.02f,0f,0.01f));
 AddLabelOutline(lg.transform, role, new Vector3(-0.02f,0f,0.01f));

 var tm=lg.AddComponent<TextMesh>();
 tm.text=role; tm.fontSize=30; tm.characterSize=0.16f; tm.color=Color.white;
 tm.anchor=TextAnchor.MiddleCenter; tm.alignment=TextAlignment.Center;
 _labelXforms.Add(lg.transform);

 _robots.Add(root);
 _robotIdleAnchors.Add(pos);
 _robotTransforms.Add(root.transform);
 foreach(var lt in root.GetComponentsInChildren<Light>(true))_eyeLights.Add(lt);
 return root;
 }

 private static void AddLabelOutline(Transform parent,string role,Vector3 lp)
 {
 var o=new GameObject("LabelOutline");
 o.transform.SetParent(parent,false);
 o.transform.localPosition=lp;
 var t=o.AddComponent<TextMesh>();
 t.text=role; t.fontSize=30; t.characterSize=0.16f; t.color=Color.black;
 t.anchor=TextAnchor.MiddleCenter; t.alignment=TextAlignment.Center;
 }

 private GameObject TryLoadFbxRobot(Vector3 pos, string role)
 {
     // FBX assets временно отключены — всегда строим процедурного робота
     return null;
 }

 // Pixar robot — round head, white body, big glowy eyes
 private GameObject BuildPixarRobot(Vector3 pos,Color eyeCol,string role)
 {
 var root=new GameObject(role);
 root.transform.position=pos;

 Color body =new Color(0.85f,0.85f,0.88f); // Pixar light gray target
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
 new Vector3(0f,1.54f,0f),new Vector3(0.65f,0.60f,0.58f),ToonM(body));
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
 new Vector3(-0.18f,1.56f,0.47f),new Vector3(0.26f,0.26f,0.26f),eyeMat);
 Go(root,PrimitiveType.Sphere,"EyeR",
 new Vector3( 0.18f,1.56f,0.47f),new Vector3(0.26f,0.26f,0.26f),eyeMat);

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
 // LIGHTING — VIZ-002 Pixar warm lighting setup
 // ═══════════════════════════════════════════
 private static void BuildLighting()
 {
 RenderSettings.ambientMode = AmbientMode.Flat;
 RenderSettings.ambientLight = new Color(1.0f, 0.85f, 0.7f);

 var def=GameObject.Find("Directional Light");
 if(def!=null)Object.DestroyImmediate(def);
 L("Main", LightType.Directional, new Color(1.0f,0.90f,0.75f), 1.2f, 0f,
 LightShadows.Soft, new Vector3(0f,8f,0f), Quaternion.Euler(35f,-30f,0f));
 L("Dispatch", LightType.Point, new Color(1.0f,0.6f,0.1f), 1.5f, 5f,
 LightShadows.None, new Vector3(-7f,2.2f,3f));
 L("Monitoring", LightType.Point, new Color(0.3f,1.0f,0.5f), 1.4f, 4f,
 LightShadows.None, new Vector3(7f,2.2f,3f));
 L("DeskLamp", LightType.Point, new Color(1.0f,0.9f,0.6f), 1.8f, 3f,
 LightShadows.None, new Vector3(0f,1.5f,1f));
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
 var s=LS();
 if(s==null) return new Material(Shader.Find("Hidden/InternalErrorShader"));
 var m=new Material(s){color=c};
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
