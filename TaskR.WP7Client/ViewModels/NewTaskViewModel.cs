using GalaSoft.MvvmLight;
using GalaSoft.MvvmLight.Command;
using GalaSoft.MvvmLight.Messaging;
using TaskR.Models;

namespace TaskR.WP7Client.ViewModels {
  public class NewTaskViewModel : ViewModelBase {
    private string title;
    public string Title {
      get { return title; }
      set { 
        title = value;
        RaisePropertyChanged(() => Title);
      }
    }

    private string assignedTo;
    public string AssignedTo {
      get { return assignedTo; }
      set {
        assignedTo = value;
        RaisePropertyChanged(() => AssignedTo);
      }
    }

    private string status;
    public string Status {
      get { return status; }
      set {
        status = value;
        RaisePropertyChanged(() => Status);
      }
    }

    private string details;
    public string Details {
      get { return details; }
      set {
        details = value;
        RaisePropertyChanged(() => Details);
      }
    }

    public RelayCommand AddTask { get; private set; }

    public NewTaskViewModel() {
      AddTask = new RelayCommand(() => {
        var taskToAdd = new Task {
          Title = Title,
          AssignedTo = AssignedTo,
          Status = Status,
          Details = Details
        };
        Messenger.Default.Send(new Events.AddTaskEvent(taskToAdd));
      });
    }
  }
}
