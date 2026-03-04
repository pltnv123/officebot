using UnityEngine;
using UnityEngine.Networking;
using System.Collections;

public class ApiClient : MonoBehaviour
{
 private const string API = "http://5.45.115.12:8787";

 public IEnumerator FetchState(System.Action<StateRoot> cb)
 {
 var req = UnityWebRequest.Get(API + "/api/state");
 req.timeout = 5;
 yield return req.SendWebRequest();
 if (req.result == UnityWebRequest.Result.Success)
 {
 try
 {
 var s = JsonUtility.FromJson<StateRoot>(
 req.downloadHandler.text);
 cb?.Invoke(s);
 }
 catch { }
 }
 }

 public IEnumerator PatchTask(string id, string status)
 {
 if (string.IsNullOrEmpty(id)) yield break;
 var req = new UnityWebRequest(API + "/api/tasks/" + id, "POST");
 var body = System.Text.Encoding.UTF8.GetBytes(
 "{\"status\":\"" + status + "\"}");
 req.uploadHandler = new UploadHandlerRaw(body);
 req.downloadHandler = new DownloadHandlerBuffer();
 req.SetRequestHeader("Content-Type", "application/json");
 req.timeout = 5;
 yield return req.SendWebRequest();
 }
}
