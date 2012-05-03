using System.Collections.ObjectModel;
using System.Linq;
using GalaSoft.MvvmLight;
using GalaSoft.MvvmLight.Command;
using GalaSoft.MvvmLight.Messaging;
using TaskR.Silverlight.Events;
using TaskR.Silverlight.Services;
using TaskR.Models;

namespace TaskR.Silverlight.ViewModels {
  public class TasksViewModel : ViewModelBase {
    public ObservableCollection<Task> Tasks { get; private set; }
    public ObservableCollection<string> TaskStatuses { get; private set; } 
    public RelayCommand AddTask { get; private set; }
    
    private bool showClosedTasks;
    public bool ShowClosedTasks {
      get { return showClosedTasks; }
      set { 
        showClosedTasks = value;
        //TODO: Filter out closed tasks
        RaisePropertyChanged("ShowClosedTasks");
      }
    }

    private string username;
    public string Username {
      get { return username; }
      set { 
        username = value;
        RaisePropertyChanged(() => Username);
      }
    }

    public TasksViewModel(ITaskHub taskHub) {
      Tasks = new ObservableCollection<Task>();
      TaskStatuses = new ObservableCollection<string>{ "Open", "Closed", "On Hold" };
      
      Messenger.Default.Register<GotTasksForUserEvent>(this, (e) => {
        Tasks.Clear();
        foreach (Task task in e.Tasks) {
          Tasks.Add(task);
        }
      });

      Messenger.Default.Register<AddedTaskEvent>(this, (e) => {
        Tasks.Add(e.AddedTask);
      });

      Messenger.Default.Register<UpdatedTaskEvent>(this, (e) => {
        if (e == null || e.UpdatedTask == null) {
          return;
        }
        Task taskToUpdate = Tasks.FirstOrDefault(t => t.TaskID == e.UpdatedTask.TaskID);
        if (taskToUpdate != null) {
          if (taskToUpdate.IsDeleted || taskToUpdate.AssignedTo != Username) {
            Tasks.Remove(taskToUpdate);
          } else {
            taskToUpdate.AssignedTo = e.UpdatedTask.AssignedTo;
            taskToUpdate.Details = e.UpdatedTask.Details;
            taskToUpdate.Status = e.UpdatedTask.Status;
            taskToUpdate.Title = e.UpdatedTask.Title;
            taskToUpdate.IsDeleted = e.UpdatedTask.IsDeleted;
          }
        } else {
          // This is a new assigned task
          Tasks.Add(e.UpdatedTask);
        }
      });

      Messenger.Default.Register<DeletedTaskEvent>(this, (e) => {
        if (e == null || e.DeletedTask == null) {
          return;
        }
        Task deletedTask = Tasks.FirstOrDefault(t => t.TaskID == e.DeletedTask.TaskID);
        if (deletedTask != null) {
          Tasks.Remove(deletedTask);
        }
      });

      Messenger.Default.Register<LoginEvent>(this, (e) => {
        Username = e.Username;
      });

      AddTask = new RelayCommand(() => {
        Messenger.Default.Send(new NewTaskEvent());
      });
    }
  }
}
