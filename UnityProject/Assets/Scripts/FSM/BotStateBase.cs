namespace OfficeHub.FSM
{
    public abstract class BotStateBase : IBotState
    {
        protected BotStateBase(Bots.BotBase bot) => Bot = bot;

        protected Bots.BotBase Bot { get; }
        public abstract string Name { get; }

        public virtual void Enter() { }
        public virtual void Tick(float deltaTime) { }
        public virtual void Exit() { }
    }
}
