using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.Rendering;
using System;
using System.Globalization;

namespace OfficeHub.UIBridge
{
    public class WebSocketStateClient : MonoBehaviour
    {
        [SerializeField] private string wsUrl = "ws://5.45.115.12:8787/ws";
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
        private bool _firstStateReceived = false;
        private bool _recoveryTriggered = false;
        private float _watchdogStartTime;
        private DateTime? _lastStateTimestamp;

        private const float WATCHDOG_INTERVAL = 30f;
        private const float FIRST_STATE_WAIT = 15f;
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

        private void Start()
        {
            ConfigureWarmLighting();
        }

        private void OnEnable()
        {
            _watchdogStartTime = Time.time;
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
                    Debug.Log(snapshot == null ? "[WebSocketStateClient] snapshot parse returned null" : $"[WebSocketStateClient] snapshot tasks={snapshot.Tasks?.Count ?? 0} updatedAt={snapshot.UpdatedAt}");
                    if (snapshot != null)
                    {
                        bool isFirstState = !_firstStateReceived;
                        DateTime parsedTimestamp;
                        var hasTimestamp = !string.IsNullOrEmpty(snapshot.UpdatedAt) && DateTime.TryParse(snapshot.UpdatedAt, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out parsedTimestamp);
                        if (!isFirstState && hasTimestamp && _lastStateTimestamp.HasValue && parsedTimestamp <= _lastStateTimestamp.Value)
                        {
                            Debug.LogWarning($"[WebSocketStateClient] Drop stale state ({parsedTimestamp:o} <= {_lastStateTimestamp.Value:o})");
                            return;
                        }
                        if (hasTimestamp)
                        {
                            _lastStateTimestamp = parsedTimestamp;
                            Debug.Log($"[WebSocketStateClient] Observed timestamp {parsedTimestamp:o}");
                        }
                        if (store == null)
                        {
                            Debug.LogWarning("[WebSocketStateClient] Store missing; skipping state update");
                            return;
                        }
                        Debug.Log("[WebSocketStateClient] Applying snapshot state");
                        store.ApplySnapshot(snapshot);
                        _firstStateReceived = true;
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

                if (!_firstStateReceived && !_recoveryTriggered && (now - _watchdogStartTime > FIRST_STATE_WAIT))
                {
                    LogWarningOnce("Watchdog: initial state timeout; reloading once");
                    _recoveryTriggered = true;
                    TriggerRecoveryReload();
                }

                if (_isConnected && _isValidated && (now - _lastJsActivityTime < CALLBACK_LOSS_THRESHOLD) && (now - _lastStateAppliedTime > CALLBACK_LOSS_THRESHOLD))
                {
                    LogWarningOnce("Watchdog: JS active but no state applied; probable SendMessage callback loss; re-enabling polling");
                    _isValidated = false;
                    poller?.SetPollingEnabled(true);
                }
            }
        }

        private void TriggerRecoveryReload()
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            Debug.Log("[WebSocketStateClient] Triggering reload due to missing state");
            Application.OpenURL(Application.absoluteURL);
#else
            Debug.Log("[WebSocketStateClient] Reload skipped (non-WebGL)");
#endif
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

        private void ConfigureWarmLighting()
        {
            // Set warm orange ambient to match reference
            RenderSettings.ambientLight = new Color(1.0f, 0.88f, 0.65f);
            RenderSettings.ambientMode = AmbientMode.Trilight;
            // Add a warm directional light for consistency
            var lightGO = new GameObject("WarmDirectional");
            var light = lightGO.AddComponent<Light>();
            light.type = LightType.Directional;
            light.color = new Color(1.0f, 0.9f, 0.7f);
            light.intensity = 0.6f;
            light.shadows = LightShadows.Soft;
            light.transform.rotation = Quaternion.Euler(50f, -30f, 0f);
        }

        private class MessageWrapper
        {
            public string type;
            public string payload;
        }
    }
}
