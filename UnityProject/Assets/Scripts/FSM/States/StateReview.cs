using OfficeHub.Bots;

namespace OfficeHub.FSM.States
{
    public sealed class StateReview : BotStateBase
    {
        public StateReview(BotBase bot) : base(bot) { }
        public override string Name => "Review";
    }
}
