using OfficeHub.Bots;

namespace OfficeHub.FSM.States
{
    public sealed class StateMoveTo : BotStateBase
    {
        public StateMoveTo(BotBase bot) : base(bot) { }
        public override string Name => "MoveTo";
    }
}
