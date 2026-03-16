using UnityEngine;
using System.Collections;

public class StatePoller : MonoBehaviour
{
 public TaskOrchestrator orchestrator;
 private ApiClient _api;
 private string _lastUpdatedAt = "";

 void Start()
 {
 _api = GetComponent<ApiClient>();
 if (!_api) _api = gameObject.AddComponent<ApiClient>();
 StartCoroutine(PollLoop());
 }

 private IEnumerator PollLoop()
 {
 while (true)
 {
 yield return _api.FetchState(state =>
 {
 if (state == null) return;
 if (state.updatedAt == _lastUpdatedAt) return;
 _lastUpdatedAt = state.updatedAt;
 orchestrator?.ApplyState(state);
 });
 yield return new WaitForSeconds(3f);
 }
 }

 // Called from JavaScript via SendMessage
 public void OnStateUpdated(string json)
 {
 try
 {
 var state = JsonUtility.FromJson<StateRoot>(json);
 if (state == null) return;
 _lastUpdatedAt = state.updatedAt;
 orchestrator?.ApplyState(state);
 }
 catch { }
 }
}
