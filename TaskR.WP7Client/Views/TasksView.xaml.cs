using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using GalaSoft.MvvmLight.Messaging;
using Microsoft.Phone.Controls;
using TaskR.Models;
using TaskR.WP7Client.Events;

namespace TaskR.WP7Client.Views {
  public partial class TasksView : PhoneApplicationPage {
    private readonly CollectionViewSource taskCollectionViewSource;

    public TasksView() {
      InitializeComponent();
      var taskCollection = Resources["tasksCollection"];
    }

    private void addTaskButton_Clicked(object sender, EventArgs e) {
      Messenger.Default.Send(new NewTaskEvent());
    }

    private void taskSelectionChanged(object sender, SelectionChangedEventArgs e) {
      Task selectedTask = TaskList.SelectedItem as Task;
      if (selectedTask == null) {
        return;
      }
      Messenger.Default.Send(new TaskSelectedForEditEvent(selectedTask));
    }

    private void taskEditClicked(object sender, RoutedEventArgs e) {
      Task selectedTask = TaskList.SelectedItem as Task;
      if (selectedTask == null) {
        return;
      }
      Messenger.Default.Send(new TaskSelectedForEditEvent(selectedTask));
    }
  }
}
