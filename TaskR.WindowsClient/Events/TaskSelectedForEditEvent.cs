using TaskR.Models;

namespace TaskR.WindowsClient.Events {
  public class TaskSelectedForEditEvent {
    public Task Task { get; private set; }
    public TaskSelectedForEditEvent(Task task) {
      Task = task;
    }
  }
}
