using OfficeHub.Bots;

namespace OfficeHub.FSM.States
{
    public sealed class StateIdle : BotStateBase
    {
        public StateIdle(BotBase bot) : base(bot) { }
        public override string Name => "Idle";
    }
}
