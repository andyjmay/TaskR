using TaskR.Models;

namespace TaskR.WindowsClient.Events {
  public class UpdatedTaskEvent {
    public Task UpdatedTask { get; private set; }
    public UpdatedTaskEvent(Task task) {
      UpdatedTask = task;
    }
  }
}
