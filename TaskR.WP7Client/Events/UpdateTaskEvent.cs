using TaskR.Models;
namespace TaskR.WP7Client.Events {
  public class UpdateTaskEvent {
    public Task TaskToUpdate { get; private set; }
    public UpdateTaskEvent(Task taskToUpdate) {
      TaskToUpdate = taskToUpdate;
    }
  }
}
