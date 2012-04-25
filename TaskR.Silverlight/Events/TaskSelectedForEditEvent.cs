using TaskR.Models;

namespace TaskR.Silverlight.Events {
  public class TaskSelectedForEditEvent {
    public Task Task { get; private set; }
    public TaskSelectedForEditEvent(Task task) {
      Task = task;
    }
  }
}
