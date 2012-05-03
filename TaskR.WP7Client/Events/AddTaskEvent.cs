using TaskR.Models;

namespace TaskR.WP7Client.Events {
  public class AddTaskEvent {
    public Task TaskToAdd { get; private set; }
    public AddTaskEvent(Task taskToAdd) {
      TaskToAdd = taskToAdd;
    }
  }
}
