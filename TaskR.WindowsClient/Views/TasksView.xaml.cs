using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Input;
using GalaSoft.MvvmLight.Messaging;
using TaskR.WindowsClient.Events;
using TaskR.Models;

namespace TaskR.WindowsClient.Views {
  public partial class TasksView : UserControl {
    private readonly CollectionViewSource taskCollectionViewSource;  

    public TasksView() {
      InitializeComponent();
      var taskCollection = Resources["tasksCollection"];
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
