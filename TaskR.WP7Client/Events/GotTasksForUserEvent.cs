using System.Collections.Generic;
using TaskR.Models;

namespace TaskR.WP7Client.Events {
  public class GotTasksForUserEvent {
    public IEnumerable<Task> Tasks { get; private set; }
    public GotTasksForUserEvent(IEnumerable<Task> tasks) {
      Tasks = tasks;
    }
  }
}
