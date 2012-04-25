using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Input;
using GalaSoft.MvvmLight.Messaging;
using TaskR.Silverlight.Events;
using TaskR.Models;

namespace TaskR.Silverlight.Views {
  public partial class TasksView : UserControl {
    private readonly CollectionViewSource taskCollectionViewSource;  

    public TasksView() {
      InitializeComponent();
      var taskCollection = Resources["tasksCollection"];
      if (taskCollection is CollectionViewSource) {
        taskCollectionViewSource = taskCollection as CollectionViewSource;
      }
      if (taskCollectionViewSource != null) {
        taskCollectionViewSource.Filter += (s, e) => {
          var task = e.Item as Task;
          if (task == null) {
            return;
          }
          try {
            if (task.Status != "Closed" || (task.Status == "Closed" && showClosedCheckbox.IsChecked == true)) {
              e.Accepted = true;
            } else {
              e.Accepted = false;
            }
          } catch (Exception ex) {
            e.Accepted = false;
          }
        };
      }

    }

    private void Tasks_MouseLeftButtonDown(object sender, MouseButtonEventArgs e) {
      if (e.ClickCount == 2) {
        FrameworkElement element = sender as FrameworkElement;
        if (element == null) {
          return;
        }
        Task task = element.DataContext as Task;
        if (task == null) {
          return;
        }
        Messenger.Default.Send(new TaskSelectedForEditEvent(task));
      }
    }
  }
}
