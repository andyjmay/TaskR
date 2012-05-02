using System;
using System.Collections.ObjectModel;
using GalaSoft.MvvmLight;
using GalaSoft.MvvmLight.Messaging;
using TaskR.Models;

namespace TaskR.WP7Client.ViewModels
{
  public class MessagesViewModel : ViewModelBase {
    public ObservableCollection<Message> ReceivedMessages { get; private set; }

    public MessagesViewModel() {
      ReceivedMessages = new ObservableCollection<Message>();
      Messenger.Default.Register<Events.GotLogMessageEvent>(this, (e) => {
        ReceivedMessages.Add(new Message { Data = e.Message, Time = DateTime.Now });
      });
    }
  }
}
