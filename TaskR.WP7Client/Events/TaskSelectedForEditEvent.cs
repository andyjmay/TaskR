using TaskR.Models;

namespace TaskR.WP7Client.Events {
  public class TaskSelectedForEditEvent {
    public Task Task { get; private set; }
    public TaskSelectedForEditEvent(Task task) {
      Task = task;
    }
  }
}
