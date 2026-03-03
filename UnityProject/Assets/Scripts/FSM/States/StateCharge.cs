using OfficeHub.Bots;

namespace OfficeHub.FSM.States
{
    public sealed class StateCharge : BotStateBase
    {
        public StateCharge(BotBase bot) : base(bot) { }
        public override string Name => "Charge";
    }
}
