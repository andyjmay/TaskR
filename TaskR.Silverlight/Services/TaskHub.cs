using System;
using System.Collections.Generic;
using System.Windows;
using GalaSoft.MvvmLight.Messaging;
using GalaSoft.MvvmLight.Threading;
using SignalR.Client.Hubs;
using TaskR.Silverlight.Events;
using TaskR.Silverlight.Views;
using TaskR.Models;

namespace TaskR.Silverlight.Services {
  public class TaskHub : ITaskHub {
    private readonly HubConnection hubConnection;
    private readonly IHubProxy hubProxy;

    public TaskHub() {
      string signalrService = Application.Current.Host.Source.GetComponents(UriComponents.SchemeAndServer | UriComponents.Path, UriFormat.Unescaped).Replace("ClientBin/TaskR.Silverlight.xap", "");
      hubConnection = new HubConnection(signalrService);
      hubProxy = hubConnection.CreateProxy("TaskR.Hubs.TaskHub");

      hubProxy.On<IEnumerable<Task>>("GotTasksForUser", tasks => DispatcherHelper.UIDispatcher.BeginInvoke(() => Messenger.Default.Send(new GotTasksForUserEvent(tasks))));
      hubProxy.On<string>("GotLogMessage", message => DispatcherHelper.UIDispatcher.BeginInvoke(() => Messenger.Default.Send(new GotLogMessageEvent(message))));
      hubProxy.On<Task>("AddedTask", task => DispatcherHelper.UIDispatcher.BeginInvoke(() => Messenger.Default.Send(new AddedTaskEvent(task))));
      hubProxy.On<Task>("UpdatedTask", task => DispatcherHelper.UIDispatcher.BeginInvoke(() => Messenger.Default.Send(new UpdatedTaskEvent(task))));
      hubProxy.On<Task>("DeletedTask", task => DispatcherHelper.UIDispatcher.BeginInvoke(() => Messenger.Default.Send(new DeletedTaskEvent(task))));
      hubProxy.On<Exception>("HandleException", exception => DispatcherHelper.UIDispatcher.BeginInvoke(() => Messenger.Default.Send(new ExceptionEncounteredEvent(exception))));

      Messenger.Default.Register<LoginEvent>(this, (e) => {
        Login(e.Username);
      });

      Messenger.Default.Register<AddTaskEvent>(this, (e) => {
        AddTask(e.TaskToAdd);
      });

      Messenger.Default.Register<UpdateTaskEvent>(this, (e) => {
        UpdateTask(e.TaskToUpdate);
      });

      Messenger.Default.Register<DeleteTaskEvent>(this, (e) => {
        DeleteTask(e.TaskToDelete);
      });

      hubConnection.Start().ContinueWith(task => {
        if (task.IsFaulted) {
          DispatcherHelper.UIDispatcher.BeginInvoke(() => Messenger.Default.Send(new Events.ExceptionEncounteredEvent(task.Exception)));
          return;
        }
        if (task.IsCompleted) {
          DispatcherHelper.UIDispatcher.BeginInvoke(() => {
            var loginWindow = new LoginView();
            loginWindow.Closed += (sender, ev) => {
              LoginView loginView = (LoginView)sender;
              bool? result = loginView.DialogResult;
              if (result.HasValue && result.Value == true) {
                Messenger.Default.Send(new LoginEvent(loginView.Username));
              }
            };
            loginWindow.Show();
          });
        }
      });
    }

    public void Login(string username) {
      hubProxy.Invoke("Login", username);
    }
    
    public void AddTask(Task taskToAdd) {
      hubProxy.Invoke("AddTask", taskToAdd);
    }

    public void UpdateTask(Task taskToUpdate) {
      hubProxy.Invoke("UpdateTask", taskToUpdate);
    }

    public void DeleteTask(Task taskToDelete) {
      hubProxy.Invoke("DeleteTask", taskToDelete);
    }

    public void GetTasksForUser(string username) {
      hubProxy.Invoke("GetTasksForUser", username);
    }

    public void Dispose() {
      if (hubConnection != null) {
        hubConnection.Stop();
      }
    }
  }
}
