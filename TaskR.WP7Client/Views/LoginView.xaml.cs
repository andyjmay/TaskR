using System.Windows;
using GalaSoft.MvvmLight.Messaging;
using Microsoft.Phone.Controls;

namespace TaskR.WP7Client.Views {
  public partial class LoginView : PhoneApplicationPage {
    public LoginView() {
      InitializeComponent();
    }

    private void LoginButton_Click(object sender, RoutedEventArgs e) {
      if (string.IsNullOrWhiteSpace(LoginBox.Text)) {
        MessageBox.Show("Please enter a username");
        return;
      }
      Messenger.Default.Send(new Events.LoginEvent(LoginBox.Text));
    }
  }
}
