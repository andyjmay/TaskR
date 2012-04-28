using TaskR.Models;

namespace TaskR.WindowsClient.Events {
  public class AddTaskEvent {
    public Task TaskToAdd { get; private set; }
    public AddTaskEvent(Task taskToAdd) {
      TaskToAdd = taskToAdd;
    }
  }
}
