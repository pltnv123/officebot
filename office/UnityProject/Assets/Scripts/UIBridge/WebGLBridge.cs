using System;
using UnityEngine;

namespace OfficeHub.UIBridge
{
    public sealed class WebGLBridge : MonoBehaviour
    {
        [Serializable]
        private sealed class UnityStateSummary
        {
            public long ts;
            public int active;
            public int done;
        }

        [SerializeField] private string lastRawJson = "";
        public OfficeStateSnapshot LastSnapshot { get; private set; } = OfficeStateSnapshot.Empty;

        public void OnStateJson(string json)
        {
            lastRawJson = json ?? string.Empty;
            if (string.IsNullOrWhiteSpace(json))
            {
                LastSnapshot = OfficeStateSnapshot.Empty;
                return;
            }

            try
            {
                var summary = JsonUtility.FromJson<UnityStateSummary>(json);
                LastSnapshot = new OfficeStateSnapshot
                {
                    Board = new OfficeStateBoard
                    {
                        InboxCount = 0,
                        DoingCount = Math.Max(0, summary?.active ?? 0),
                        DoneCount = Math.Max(0, summary?.done ?? 0),
                    }
                };
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"WebGLBridge.OnStateJson parse failed: {ex.Message}");
            }
        }
    }
}
