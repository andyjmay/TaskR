using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Linq;
using GalaSoft.MvvmLight;
using GalaSoft.MvvmLight.Command;
using GalaSoft.MvvmLight.Messaging;
using TaskR.Models;
using TaskR.WP7Client.Events;
using TaskR.WP7Client.Services;

namespace TaskR.WP7Client.ViewModels
{
  public class TasksViewModel : ViewModelBase {
    public ObservableCollection<Task> Tasks { get; private set; }
    public ObservableCollection<string> TaskStatuses { get; private set; } 
    public RelayCommand AddTask { get; private set; }
    
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
          if (taskToUpdate.IsDeleted) {
            Tasks.Remove(taskToUpdate);
          } else {
            taskToUpdate.AssignedTo = e.UpdatedTask.AssignedTo;
            taskToUpdate.Details = e.UpdatedTask.Details;
            taskToUpdate.Status = e.UpdatedTask.Status;
            taskToUpdate.Title = e.UpdatedTask.Title;
            taskToUpdate.IsDeleted = e.UpdatedTask.IsDeleted;
          }
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

      AddTask = new RelayCommand(() => {
        Messenger.Default.Send(new NewTaskEvent());
      });

      if (DesignerProperties.IsInDesignTool) {
        for (int i = 0; i < 10; i++) {
          Tasks.Add(new Task {
                               AssignedTo = "andyjmay",
                               DateCreated = System.DateTime.Today.AddDays(-i),
                               Details = "Some details for task " + i,
                               IsDeleted = false,
                               Status = "Open",
                               Title = "Task " + i
                             });
        }
      }
    }
  }
}
