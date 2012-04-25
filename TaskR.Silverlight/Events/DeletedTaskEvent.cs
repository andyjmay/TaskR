using TaskR.Models;

namespace TaskR.Silverlight.Events {
  public class DeletedTaskEvent {
    public Task DeletedTask { get; private set; }
    public DeletedTaskEvent(Task task) {
      DeletedTask = task;
    }
  }
}
