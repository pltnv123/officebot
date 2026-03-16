using UnityEngine;

namespace OfficeHub.Core
{
    public sealed class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        public EventBus EventBus { get; private set; }
        public StateSyncManager StateSyncManager { get; private set; }

        [SerializeField] private float statePollInterval = 3f;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }

            Instance = this;
            DontDestroyOnLoad(gameObject);

            EventBus = new EventBus();
            StateSyncManager = new StateSyncManager(EventBus, statePollInterval);
        }

        private void Update()
        {
            StateSyncManager?.Tick(Time.deltaTime);
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                EventBus?.Clear();
                Instance = null;
            }
        }
    }
}
