using TaskR.Models;

namespace TaskR.WindowsClient.Events {
  public class LoginEvent {
    public string Username { get; private set; }
    public LoginEvent(string username) {
      Username = username;
    }
  }
}
