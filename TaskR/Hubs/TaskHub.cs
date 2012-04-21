using System;
using System.Collections.Generic;
using System.Linq;
using SignalR.Hubs;
using TaskR.Exceptions;
using TaskR.Models;

namespace TaskR.Hubs {
  public class TaskHub : Hub, IDisconnect {
    private readonly TaskEntities taskEntities;

    public TaskHub() {
      try {
        taskEntities = new TaskEntities();
      } catch (Exception ex) {
        exceptionEncountered(ex);
      }
    }

    public void Login(string username) {
      try {
        ConnectedUser existingUser = taskEntities.ConnectedUsers.SingleOrDefault(c => c.ConnectionID == Context.ConnectionId);
        if (existingUser == null) {
          taskEntities.ConnectedUsers.Add(new ConnectedUser {
            ConnectionID = Context.ConnectionId,
            Username = username
          });
          taskEntities.SaveChanges();
        }
        IEnumerable<Task> existingUserTasks = taskEntities.Tasks.Where(u => u.AssignedTo == username);
        if (!existingUserTasks.Any()) {
          var newTask = new Task {
            AssignedTo = username,
            DateCreated = DateTime.Now,
            Details = "Welcome to TaskR! Now delete this task and create some of your own.",
            Status = "Open",
            Title = "Your First Task"
          };
          taskEntities.Tasks.Add(newTask);
          taskEntities.SaveChanges();
        }
        AddToGroup(username);
        GetTasksForUser(username);
        sendLogMessage(username + " has logged in");
      } catch (Exception ex) {
        exceptionEncountered(ex);
      }
    }

    public void GetTasksForUser(string username) {
      if (string.IsNullOrWhiteSpace(username)) {
        exceptionEncountered(new NullIdentityException());
        return;
      }
      try {
        Caller.GotTasksForUser(taskEntities.Tasks.Where(t => t.IsDeleted == false && t.AssignedTo == username).ToList());
      } catch (Exception ex) {
        exceptionEncountered(ex);
      }
    }

    public void AddTask(Task task) {
      try {
        task.DateCreated = DateTime.Now;
        taskEntities.Tasks.Add(task);
        taskEntities.SaveChanges();
        Clients[task.AssignedTo].AddedTask(task);
        sendLogMessage(string.Format("{0} has added task '{1}'.", getCurrentUser().Username, task.Title));
      } catch (Exception ex) {
        exceptionEncountered(ex);
      }
    }

    public void UpdateTask(Task task) {
      try {
        //taskEntities.Tasks.Attach(task);
        //taskEntities.Entry<Task>(task).State = System.Data.EntityState.Modified;
        
        Task existingTask = taskEntities.Tasks.Find(task.TaskID);
        if (existingTask == null) {
          throw new Exception("Unable to find an existing task in the database");
        }
        existingTask.AssignedTo = task.AssignedTo;
        existingTask.Details = task.Details;
        existingTask.Status = task.Status;
        existingTask.Title = task.Title;
        taskEntities.SaveChanges();
        Clients[task.AssignedTo].UpdatedTask(existingTask);
        sendLogMessage(string.Format("{0} has updated task '{1}'.", getCurrentUser().Username, task.Title));
      } catch (Exception ex) {
        exceptionEncountered(ex);
      }
    }

    public void DeleteTask(Task taskToDelete) {
      try {
        var task = taskEntities.Tasks.Find(taskToDelete.TaskID);
        task.IsDeleted = true;
        taskEntities.SaveChanges();
        Clients[taskToDelete.AssignedTo].DeletedTask(task);
        sendLogMessage(string.Format("{0} has deleted task '{1}'.", getCurrentUser().Username, task.Title));
      } catch (Exception ex) {
        exceptionEncountered(ex);
      }
    }

    private ConnectedUser getCurrentUser() {
      return taskEntities.ConnectedUsers.SingleOrDefault(c => c.ConnectionID == Context.ConnectionId);
    }

    private void sendLogMessage(string message) {
      try {
        Clients.GotLogMessage(message);
      } catch (Exception ex) {
        exceptionEncountered(ex);
      }
    }

    private void exceptionEncountered(Exception ex) {
      if (Caller != null) {
        Caller.HandleException(ex);
      }
    }

    public System.Threading.Tasks.Task Disconnect() {
      try {
        ConnectedUser currentUser = getCurrentUser();
        if (currentUser != null) {
          taskEntities.ConnectedUsers.Remove(currentUser);
          taskEntities.SaveChanges();
          sendLogMessage(currentUser.Username + " has disconnected.");
        }        
      } catch (Exception ex) {
        exceptionEncountered(ex);
      }
      return new System.Threading.Tasks.Task(() => { });
    }
  }
}