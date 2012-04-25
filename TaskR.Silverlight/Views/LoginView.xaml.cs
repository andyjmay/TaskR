using System.Windows;
using System.Windows.Controls;
using TaskR.Models;

namespace TaskR.Silverlight.Views {
  public partial class LoginView : ChildWindow {
    public string Username { get; private set; }

    public LoginView() {
      InitializeComponent();
    }

    private void LoginButton_Click(object sender, RoutedEventArgs e) {
      Username = UsernameBox.Text.Trim().ToLower();
      if (string.IsNullOrWhiteSpace(Username)) {
        MessageBox.Show("Please enter a username");
        return;
      }
      this.DialogResult = true;
    }
  }
}

