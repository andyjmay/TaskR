namespace TaskR.Silverlight.Events {
  public class GotLogMessageEvent {
    public string Message { get; private set; }
    public GotLogMessageEvent(string message) {
      Message = message;
    }
  }
}
