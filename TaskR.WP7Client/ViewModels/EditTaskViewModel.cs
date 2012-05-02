using GalaSoft.MvvmLight;
using GalaSoft.MvvmLight.Command;
using GalaSoft.MvvmLight.Messaging;
using TaskR.Models;

namespace TaskR.WP7Client.ViewModels {
  public class EditTaskViewModel : ViewModelBase {
    private Task taskToEdit;
    public Task TaskToEdit {
      get { return taskToEdit; }
      set {
        taskToEdit = value;
        RaisePropertyChanged(() => TaskToEdit);
      }
    }

    public RelayCommand Save { get; private set; }

    public EditTaskViewModel() {
      Save = new RelayCommand(() => {
        if (TaskToEdit == null) {
          return;
        }
        Messenger.Default.Send(new Events.UpdateTaskEvent(TaskToEdit));
        Messenger.Default.Send(new Events.SentUpdateTaskEvent());
      });
      Messenger.Default.Register<Events.TaskSelectedForEditEvent>(this, (e) => {
        TaskToEdit = e.Task;
      });
    }
  }
}
