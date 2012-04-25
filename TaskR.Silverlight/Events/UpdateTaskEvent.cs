using TaskR.Models;
namespace TaskR.Silverlight.Events {
  public class UpdateTaskEvent {
    public Task TaskToUpdate { get; private set; }
    public UpdateTaskEvent(Task taskToUpdate) {
      TaskToUpdate = taskToUpdate;
    }
  }
}
