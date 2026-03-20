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

        private void Start()
        {
            ConfigureWarmLighting();
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

            // Start camera cruise if present
            var cam = Camera.main;
            if (cam != null && cam.GetComponent<CameraCruise>() == null)
                cam.gameObject.AddComponent<CameraCruise>();

            // Add emissive eye effects to agents
            foreach (var rend in FindObjectsOfType<Renderer>())
            {
                var name = rend.gameObject.name.ToLower();
                if (name.Contains("worker") || name.Contains("planner") || name.Contains("reviewer"))
                {
                    foreach (Transform child in rend.transform)
                    {
                        if (child.name.ToLower().Contains("eye"))
                        {
                            var mat = new Material(Shader.Find("Standard"));
                            mat.EnableKeyword("_EMISSION");
                            mat.SetColor("_EmissionColor", new Color(0.2f, 0.9f, 1.0f));
                            mat.globalIlluminationFlags = MaterialGlobalIlluminationFlags.RealtimeEmissive;
                            child.GetComponent<Renderer>().material = mat;
                            break;
                        }
                    }
                }
            }

            // Create dispatch zone glow (orange, pulsing)
            var dispatchGlow = GameObject.CreatePrimitive(PrimitiveType.Quad);
            dispatchGlow.name = "DispatchGlow";
            dispatchGlow.transform.position = new Vector3(-1.5f, 0.1f, 2.5f);
            dispatchGlow.transform.rotation = Quaternion.Euler(90f, 0, 0);
            dispatchGlow.transform.localScale = new Vector3(2f, 2f, 1f);
            var dispatchMat = new Material(Shader.Find("Standard"));
            dispatchMat.EnableKeyword("_EMISSION");
            dispatchMat.SetColor("_EmissionColor", new Color(1f, 0.6f, 0.2f));
            dispatchGlow.GetComponent<Renderer>().material = dispatchMat;
            dispatchGlow.AddComponent<ZoneGlowPulse>().baseColor = new Color(1f, 0.6f, 0.2f);

            // Create monitoring zone glow (green, stable pulse)
            var monitorGlow = GameObject.CreatePrimitive(PrimitiveType.Quad);
            monitorGlow.name = "MonitorGlow";
            monitorGlow.transform.position = new Vector3(4f, 0.1f, 2.5f);
            monitorGlow.transform.rotation = Quaternion.Euler(90f, 0, 0);
            monitorGlow.transform.localScale = new Vector3(2f, 2f, 1f);
            var monitorMat = new Material(Shader.Find("Standard"));
            monitorMat.EnableKeyword("_EMISSION");
            monitorMat.SetColor("_EmissionColor", new Color(0.2f, 1.0f, 0.4f));
            monitorGlow.GetComponent<Renderer>().material = monitorMat;
            monitorGlow.AddComponent<ZoneGlowPulse>().baseColor = new Color(0.2f, 1.0f, 0.4f);
        }

        private class MessageWrapper
        {
            public string type;
            public string payload;
        }
    }
}
