namespace OfficeHub.UIBridge
{
    public readonly struct OfficeStateSnapshot
    {
        public static OfficeStateSnapshot Empty => new(0, 0, 0);

        public OfficeStateSnapshot(int inbox, int doing, int done)
        {
            InboxCount = inbox;
            DoingCount = doing;
            DoneCount = done;
        }

        public int InboxCount { get; }
        public int DoingCount { get; }
        public int DoneCount { get; }
    }
}
