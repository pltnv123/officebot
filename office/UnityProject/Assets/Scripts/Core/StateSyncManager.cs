using OfficeHub.UIBridge;

namespace OfficeHub.Core
{
    public readonly struct StateUpdatedEvent
    {
        public StateUpdatedEvent(OfficeStateSnapshot snapshot) => Snapshot = snapshot;
        public OfficeStateSnapshot Snapshot { get; }
    }

    public sealed class StateSyncManager
    {
        private readonly EventBus _eventBus;
        private readonly float _pollInterval;
        private float _pollTimer;

        public StateSyncManager(EventBus eventBus, float pollInterval)
        {
            _eventBus = eventBus;
            _pollInterval = pollInterval <= 0f ? 3f : pollInterval;
        }

        public void Tick(float deltaTime)
        {
            _pollTimer += deltaTime;
            if (_pollTimer < _pollInterval)
            {
                return;
            }

            _pollTimer = 0f;
            var snapshot = OfficeStateSnapshot.Empty;
            _eventBus.Publish(new StateUpdatedEvent(snapshot));
        }
    }
}
