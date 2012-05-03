using System;
using GalaSoft.MvvmLight.Messaging;
using Microsoft.Phone.Controls;

namespace TaskR.WP7Client.Views {
  public partial class MainPage : PhoneApplicationPage {
    public MainPage() {
      InitializeComponent();
      registerEvents();
    }

    private void registerEvents() {
      Messenger.Default.Register<Events.TaskSelectedForEditEvent>(this, (e) => {
        if (e == null || e.Task == null || e.Task.TaskID == 0) {
          return;
        }
        NavigationService.Navigate(new Uri("/Views/EditTaskView.xaml?TaskID=" + e.Task.TaskID, UriKind.RelativeOrAbsolute));
      });
      Messenger.Default.Register<Events.ConnectedToHubEvent>(this, (e) => {
        NavigationService.Navigate(new Uri("/Views/LoginView.xaml", UriKind.RelativeOrAbsolute));
      });
      Messenger.Default.Register<Events.GotTasksForUserEvent>(this, (e) => {
        NavigationService.Navigate(new Uri("/Views/TasksView.xaml", UriKind.RelativeOrAbsolute));
      });
      Messenger.Default.Register<Events.NewTaskEvent>(this, (e) => {
        NavigationService.Navigate(new Uri("/Views/NewTaskView.xaml", UriKind.RelativeOrAbsolute));
      });
      Messenger.Default.Register<Events.AddedTaskEvent>(this, (e) => {
        NavigationService.Navigate(new Uri("/Views/TasksView.xaml", UriKind.RelativeOrAbsolute));
      });
      Messenger.Default.Register<Events.SentUpdateTaskEvent>(this, (e) => {
        NavigationService.Navigate(new Uri("/Views/TasksView.xaml", UriKind.RelativeOrAbsolute));
      });
    }
    
    // Handle selection changed on ListBox
    //private void MainListBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
    //{
    //    // If selected index is -1 (no selection) do nothing
    //    if (MainListBox.SelectedIndex == -1)
    //        return;

    //    // Navigate to the new page
    //    NavigationService.Navigate(new Uri("/DetailsPage.xaml?selectedItem=" + MainListBox.SelectedIndex, UriKind.Relative));

    //    // Reset selected index to -1 (no selection)
    //    MainListBox.SelectedIndex = -1;
    //}

    private void addTaskButton_Clicked(object sender, EventArgs e) {
      //Task taskToEdit = sender as Task;
      //if (taskToEdit == null) {
      //  return;
      //}
      //Messenger.Default.Send(new Events.TaskSelectedForEditEvent(taskToEdit));
      
    }
  }
}