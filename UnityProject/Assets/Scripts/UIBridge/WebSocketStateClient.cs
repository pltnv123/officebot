using UnityEngine;
using UnityEngine.Networking;

namespace OfficeHub.UIBridge
{
    public class WebSocketStateClient : MonoBehaviour
    {
        [SerializeField] private string wsUrl = "ws://5.45.115.12:8081/ws";
        [SerializeField] private OfficeStateStore store;
        [SerializeField] private OfficeStatePoller poller;

        private bool _isConnected = false;
        private bool _isValidated = false;
        private bool _shuttingDown = false;

        private float _lastJsActivityTime;
        private float _lastWsMessageTime;
        private float _lastStateAppliedTime;
        private bool _watchdogActive = false;
        private Coroutine _watchdogCoroutine;
        private float _lastWarningTime;

        private const float WATCHDOG_INTERVAL = 30f;
        private const float WS_SILENCE_THRESHOLD = 60f;
        private const float STATE_STALE_THRESHOLD = 90f;
        private const float CALLBACK_LOSS_THRESHOLD = 90f;
        private const float WARNING_COOLDOWN = 300f;

        private void Awake()
        {
            _lastJsActivityTime = Time.time;
            _lastWsMessageTime = Time.time;
            _lastStateAppliedTime = Time.time;
            _lastWarningTime = -WARNING_COOLDOWN;

            if (store == null) store = FindObjectOfType<OfficeStateStore>();
            if (poller == null) poller = GetComponent<OfficeStatePoller>();
        }

        private void OnEnable()
        {
            StartWatchdog();
#if UNITY_WEBGL && !UNITY_EDITOR
            WebGLBridge.WebSocketSetTarget(gameObject.name);
            WebGLBridge.WebSocketConnect(wsUrl);
#endif
        }

        private void OnDisable()
        {
            StopWatchdog();
#if UNITY_WEBGL && !UNITY_EDITOR
            WebGLBridge.WebSocketClose();
#endif
        }

        private void OnDestroy()
        {
            _shuttingDown = true;
            StopWatchdog();
        }

        public void OnWSOpen(string _)
        {
            Debug.Log("[WebSocketStateClient] OnWSOpen");
            _isConnected = true;
        }

        public void OnWSClose(string _)
        {
            Debug.Log("[WebSocketStateClient] OnWSClose");
            _isConnected = false;
            _isValidated = false;
        }

        public void OnWSError(string _)
        {
            Debug.LogWarning("[WebSocketStateClient] OnWSError");
        }

        public void OnWSMessage(string json)
        {
            _lastWsMessageTime = Time.time;
            try
            {
                var wrapper = JsonUtility.FromJson<MessageWrapper>(json);
                if (wrapper != null && wrapper.type == "state" && !string.IsNullOrEmpty(wrapper.payload))
                {
                    var snapshot = OfficeStateSnapshot.FromJson(wrapper.payload);
                    if (snapshot != null)
                    {
                        store.ApplySnapshot(snapshot);
                        _lastStateAppliedTime = Time.time;
                        if (!_isValidated)
                        {
                            _isValidated = true;
                            poller?.SetPollingEnabled(false);
                            Debug.Log("[WebSocketStateClient] Polling disabled - WebSocket active");
                        }
                    }
                }
            }
            catch (System.Exception ex)
            {
                Debug.LogWarning($"[WebSocketStateClient] Parse error: {ex.Message}");
            }
        }

        public void OnJsHeartbeat(string _)
        {
            _lastJsActivityTime = Time.time;
        }

        private void StartWatchdog()
        {
            if (_watchdogActive) return;
            _watchdogActive = true;
            _watchdogCoroutine = StartCoroutine(WatchdogRoutine());
        }

        private void StopWatchdog()
        {
            _watchdogActive = false;
            if (_watchdogCoroutine != null)
            {
                StopCoroutine(_watchdogCoroutine);
                _watchdogCoroutine = null;
            }
        }

        private System.Collections.IEnumerator WatchdogRoutine()
        {
            while (_watchdogActive && !_shuttingDown)
            {
                yield return new WaitForSeconds(WATCHDOG_INTERVAL);
                if (_shuttingDown) yield break;

                float now = Time.time;

                if (_isConnected && (now - _lastWsMessageTime > WS_SILENCE_THRESHOLD))
                {
                    LogWarningOnce("Watchdog: WS message silence; re-enabling polling");
                    poller?.SetPollingEnabled(true);
                }

                if (_isValidated && (now - _lastStateAppliedTime > STATE_STALE_THRESHOLD))
                {
                    LogWarningOnce("Watchdog: State updates stalled; re-enabling polling");
                    _isValidated = false;
                    poller?.SetPollingEnabled(true);
                }

                if (_isConnected && _isValidated && (now - _lastJsActivityTime < CALLBACK_LOSS_THRESHOLD) && (now - _lastStateAppliedTime > CALLBACK_LOSS_THRESHOLD))
                {
                    LogWarningOnce("Watchdog: JS active but no state applied; probable SendMessage callback loss; re-enabling polling");
                    _isValidated = false;
                    poller?.SetPollingEnabled(true);
                }
            }
        }

        private void LogWarningOnce(string message)
        {
            float now = Time.time;
            if (now - _lastWarningTime > WARNING_COOLDOWN)
            {
                Debug.LogWarning($"[WebSocketStateClient] {message}");
                _lastWarningTime = now;
            }
        }

        private class MessageWrapper
        {
            public string type;
            public string payload;
        }
    }
}
