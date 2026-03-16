using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace OfficeHub.UIBridge
{
    public sealed class OfficeStatePoller : MonoBehaviour
    {
        [SerializeField] private string stateUrl = "/api/state";
        [SerializeField] private float pollIntervalSeconds = 5f;
        [SerializeField] private float timeoutSeconds = 4f;

        private OfficeStateStore _store;
        private Coroutine _pollRoutine;
        private string _lastUpdatedAt = string.Empty;

        public void Configure(OfficeStateStore store, string url)
        {
            _store = store;
            if (!string.IsNullOrWhiteSpace(url)) stateUrl = url;
        }

        private void OnEnable()
        {
            if (_pollRoutine == null) _pollRoutine = StartCoroutine(PollLoop());
        }

        private void OnDisable()
        {
            if (_pollRoutine != null)
            {
                StopCoroutine(_pollRoutine);
                _pollRoutine = null;
            }
        }

        private IEnumerator PollLoop()
        {
            while (enabled)
            {
                using (var req = UnityWebRequest.Get(stateUrl))
                {
                    req.timeout = Mathf.Max(1, Mathf.RoundToInt(timeoutSeconds));
                    yield return req.SendWebRequest();
                    if (req.result == UnityWebRequest.Result.Success)
                    {
                        var snapshot = OfficeStateSnapshot.FromJson(req.downloadHandler.text);
                        if (snapshot != null && snapshot.UpdatedAt != _lastUpdatedAt)
                        {
                            _lastUpdatedAt = snapshot.UpdatedAt;
                            (_store ?? GetComponent<OfficeStateStore>())?.ApplySnapshot(snapshot);
                        }
                    }
                }

                yield return new WaitForSeconds(pollIntervalSeconds);
            }
        }
    }
}
