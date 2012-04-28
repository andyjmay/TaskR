using System.Windows;
using System.Windows.Controls;
using TaskR.Models;

namespace TaskR.WindowsClient.Views {
  public partial class EditTaskView : Window {
    private Task taskToEdit;
    
    public EditTaskView(string title, Task task) {
      InitializeComponent();
      TaskStatus.ItemsSource = new string[] { "Open", "Closed", "On Hold" };
      this.Title = title;
      this.DataContext = task;
      taskToEdit = task;
    }

    private void SaveButton_Click(object sender, RoutedEventArgs e) {
      this.DialogResult = true;
    }

    private void CancelButton_Click(object sender, RoutedEventArgs e) {
      this.DialogResult = false;
    }

    private void DeleteButton_Click(object sender, RoutedEventArgs e) {
      taskToEdit.IsDeleted = true;
      this.DialogResult = true;
    }
  }
}

