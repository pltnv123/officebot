using OfficeHub.Bots;

namespace OfficeHub.FSM.States
{
    public sealed class StateWork : BotStateBase
    {
        public StateWork(BotBase bot) : base(bot) { }
        public override string Name => "Work";
    }
}
