using TaskR.Models;

namespace TaskR.WindowsClient.Events {
  public class DeletedTaskEvent {
    public Task DeletedTask { get; private set; }
    public DeletedTaskEvent(Task task) {
      DeletedTask = task;
    }
  }
}
