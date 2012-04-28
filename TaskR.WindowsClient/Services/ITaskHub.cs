using System;
using TaskR.Models;

namespace TaskR.WindowsClient.Services {
  public interface ITaskHub : IDisposable {
    void Login(string username);
    void GetTasksForUser(string username);
    void AddTask(Task taskToAdd);
    void UpdateTask(Task taskToUpdate);
    void DeleteTask(Task taskToDelete);
  }
}