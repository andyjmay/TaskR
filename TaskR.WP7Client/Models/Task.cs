using System;
using System.ComponentModel;

namespace TaskR.Models {
  public class Task : INotifyPropertyChanged {
    private int taskId;
    public int TaskID {
      get { return taskId; }
      set {
        if (taskId == value) {
          return;
        }
        taskId = value;
        NotifyPropertyChanged("TaskID");
      }
    }

    private string title;
    public string Title {
      get { return title; }
      set {
        if (title == value) {
          return;
        }
        title = value;
        NotifyPropertyChanged("Title");
      }
    }

    private string details;
    public string Details {
      get { return details; }
      set {
        if (details == value) {
          return;
        }
        details = value;
        NotifyPropertyChanged("Details");
      }
    }

    private string assignedTo;
    public string AssignedTo {
      get { return assignedTo; }
      set {
        if (assignedTo == value) {
          return;
        }
        assignedTo = value;
        NotifyPropertyChanged("AssignedTo");
      }
    }

    private string status;
    public string Status {
      get { return status; }
      set {
        if (status == value) {
          return;
        }
        status = value;
        NotifyPropertyChanged("Status");
      }
    }

    private DateTime dateCreated;
    public DateTime DateCreated {
      get { return dateCreated; }
      set {
        if (dateCreated == value) {
          return;
        }
        dateCreated = value;
        NotifyPropertyChanged("DateCreated");
      }
    }

    private bool isDeleted;

    public bool IsDeleted {
      get { return isDeleted; }
      set {
        if (isDeleted == value) {
          return;
        }
        isDeleted = value;
        NotifyPropertyChanged("IsDeleted");
      }
    }

    public event PropertyChangedEventHandler PropertyChanged;

    public void NotifyPropertyChanged(string propertyName) {
      if (PropertyChanged != null) {
        PropertyChanged(this, new PropertyChangedEventArgs(propertyName));
      }
    }
  }
}