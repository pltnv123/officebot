using OfficeHub.FSM;
using UnityEngine;

namespace OfficeHub.Bots
{
    public class BotBase : MonoBehaviour
    {
        [SerializeField] protected string botId = "bot";
        protected BotStateMachine StateMachine;

        public string BotId => botId;

        protected virtual void Awake()
        {
            StateMachine = new BotStateMachine();
        }

        protected virtual void Update()
        {
            StateMachine?.Tick(Time.deltaTime);
        }

        protected void ChangeState(IBotState next) => StateMachine?.ChangeState(next);
    }
}
