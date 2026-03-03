namespace OfficeHub.FSM
{
    public interface IBotState
    {
        string Name { get; }
        void Enter();
        void Tick(float deltaTime);
        void Exit();
    }
}
