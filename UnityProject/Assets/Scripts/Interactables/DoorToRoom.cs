using UnityEngine;
using UnityEngine.SceneManagement;

namespace OfficeHub.Interactables
{
    public sealed class DoorToRoom : MonoBehaviour
    {
        [SerializeField] private string targetSceneName = "Room2";
        [SerializeField] private bool loadOnTrigger = true;
        [SerializeField] private string requiredTag = "Player";

        private bool _isLoading;

        private void OnMouseDown()
        {
            TryLoad();
        }

        private void OnTriggerEnter(Collider other)
        {
            if (!loadOnTrigger)
            {
                return;
            }

            if (!string.IsNullOrWhiteSpace(requiredTag) && !other.CompareTag(requiredTag))
            {
                return;
            }

            TryLoad();
        }

        public void TryLoad()
        {
            if (_isLoading)
            {
                return;
            }

            if (string.IsNullOrWhiteSpace(targetSceneName))
            {
                Debug.LogError("DoorToRoom target scene is empty.");
                return;
            }

            if (!Application.CanStreamedLevelBeLoaded(targetSceneName))
            {
                Debug.LogError($"DoorToRoom cannot load scene '{targetSceneName}'. Check Build Settings.");
                return;
            }

            _isLoading = true;
            SceneManager.LoadScene(targetSceneName, LoadSceneMode.Single);
        }
    }
}
