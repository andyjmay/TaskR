using TaskR.Models;

namespace TaskR.WP7Client.Events {
  public class DeletedTaskEvent {
    public Task DeletedTask { get; private set; }
    public DeletedTaskEvent(Task task) {
      DeletedTask = task;
    }
  }
}
