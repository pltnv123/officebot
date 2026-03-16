using System;
using UnityEngine;

namespace OfficeHub.UIBridge
{
    public sealed class OfficeStateStore : MonoBehaviour
    {
        [SerializeField] private OfficeStateSnapshot current = null;
        public OfficeStateSnapshot Current => current ?? OfficeStateSnapshot.Empty;
        public event Action<OfficeStateSnapshot> Changed;

        public void ApplyJson(string json)
        {
            ApplySnapshot(OfficeStateSnapshot.FromJson(json));
        }

        public void ApplySnapshot(OfficeStateSnapshot snapshot)
        {
            current = snapshot ?? OfficeStateSnapshot.Empty;
            Changed?.Invoke(Current);
        }
    }
}
