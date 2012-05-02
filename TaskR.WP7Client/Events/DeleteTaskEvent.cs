using TaskR.Models;

namespace TaskR.WP7Client.Events {
  public class DeleteTaskEvent {
    public Task TaskToDelete { get; private set; }
    public DeleteTaskEvent(Task taskToDelete) {
      TaskToDelete = taskToDelete;
    }
  }
}
