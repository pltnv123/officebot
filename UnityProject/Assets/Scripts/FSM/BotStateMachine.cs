namespace OfficeHub.FSM
{
    public sealed class BotStateMachine
    {
        public IBotState Current { get; private set; }

        public void ChangeState(IBotState next)
        {
            if (next == null || next == Current)
            {
                return;
            }

            Current?.Exit();
            Current = next;
            Current.Enter();
        }

        public void Tick(float deltaTime) => Current?.Tick(deltaTime);
    }
}
