using TaskR.Models;

namespace TaskR.Silverlight.Events {
  public class LoginEvent {
    public string Username { get; private set; }
    public LoginEvent(string username) {
      Username = username;
    }
  }
}
