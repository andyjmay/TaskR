﻿using TaskR.Models;

namespace TaskR.WP7Client.Events {
  public class AddedTaskEvent {
    public Task AddedTask { get; private set; }
    public AddedTaskEvent(Task task) {
      AddedTask = task;
    }
  }
}
