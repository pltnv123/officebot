using System;
using System.Collections.Generic;

namespace OfficeHub.Core
{
    public sealed class EventBus
    {
        private readonly Dictionary<Type, List<Delegate>> _handlers = new();

        public void Subscribe<TEvent>(Action<TEvent> handler)
        {
            var type = typeof(TEvent);
            if (!_handlers.TryGetValue(type, out var list))
            {
                list = new List<Delegate>();
                _handlers[type] = list;
            }

            if (!list.Contains(handler))
            {
                list.Add(handler);
            }
        }

        public void Unsubscribe<TEvent>(Action<TEvent> handler)
        {
            var type = typeof(TEvent);
            if (_handlers.TryGetValue(type, out var list))
            {
                list.Remove(handler);
                if (list.Count == 0)
                {
                    _handlers.Remove(type);
                }
            }
        }

        public void Publish<TEvent>(TEvent payload)
        {
            var type = typeof(TEvent);
            if (!_handlers.TryGetValue(type, out var list))
            {
                return;
            }

            var snapshot = list.ToArray();
            for (var i = 0; i < snapshot.Length; i++)
            {
                if (snapshot[i] is Action<TEvent> callback)
                {
                    callback.Invoke(payload);
                }
            }
        }

        public void Clear() => _handlers.Clear();
    }
}
