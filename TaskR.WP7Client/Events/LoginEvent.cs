using TaskR.Models;

namespace TaskR.WP7Client.Events {
  public class LoginEvent {
    public string Username { get; private set; }
    public LoginEvent(string username) {
      Username = username;
    }
  }
}
