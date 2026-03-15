using UnityEngine;

namespace OfficeHub.UIBridge
{
    public sealed class OfficeSceneController : MonoBehaviour
    {
        private OfficeStateStore _store;
        private RuntimeSceneBuilder _builder;

        public void Configure(OfficeStateStore store, RuntimeSceneBuilder builder)
        {
            if (_store != null) _store.Changed -= OnStateChanged;
            _store = store;
            _builder = builder;
            if (_store != null) _store.Changed += OnStateChanged;
            if (_store != null && _builder != null) _builder.ApplyOfficeStateSnapshot(_store.Current);
        }

        private void OnEnable()
        {
            if (_store == null) _store = GetComponent<OfficeStateStore>();
            if (_builder == null) _builder = GetComponent<RuntimeSceneBuilder>();
            if (_store != null)
            {
                _store.Changed -= OnStateChanged;
                _store.Changed += OnStateChanged;
                if (_builder != null) _builder.ApplyOfficeStateSnapshot(_store.Current);
            }
        }

        private void OnDisable()
        {
            if (_store != null) _store.Changed -= OnStateChanged;
        }

        private void OnStateChanged(OfficeStateSnapshot snapshot)
        {
            _builder?.ApplyOfficeStateSnapshot(snapshot);
        }
    }
}
