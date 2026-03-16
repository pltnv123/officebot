using UnityEngine;

namespace OfficeHub.Interactables
{
    public class ToggleInteractable : MonoBehaviour
    {
        [SerializeField] private string toggleId = "lights";

        public string ToggleId => toggleId;

        public void Interact()
        {
            // Stub for future world toggle integration.
        }
    }
}
