using System.ComponentModel;
using GalaSoft.MvvmLight.Ioc;
using Microsoft.Practices.ServiceLocation;
using TaskR.WP7Client.Services;

namespace TaskR.WP7Client.ViewModels {
  public class ViewModelLocator {
    public ViewModelLocator() {
      ServiceLocator.SetLocatorProvider(() => SimpleIoc.Default);

      if (!DesignerProperties.IsInDesignTool) {
        SimpleIoc.Default.Register<ITaskHub, TaskHub>();
      } else {
        SimpleIoc.Default.Register<ITaskHub, DesignTaskHub>();
      }
      
      SimpleIoc.Default.Register<MainViewModel>();
      SimpleIoc.Default.Register<TasksViewModel>();
      SimpleIoc.Default.Register<EditTaskViewModel>();
      SimpleIoc.Default.Register<NewTaskViewModel>();
      SimpleIoc.Default.Register<MessagesViewModel>();

      ServiceLocator.Current.GetInstance<ITaskHub>();
      // Warm up the ViewModels so it can listen to events
      ServiceLocator.Current.GetInstance<TasksViewModel>();
      ServiceLocator.Current.GetInstance<EditTaskViewModel>();
    }

    public MainViewModel Main {
      get { return ServiceLocator.Current.GetInstance<MainViewModel>(); }
    }

    public TasksViewModel Tasks {
      get { return ServiceLocator.Current.GetInstance<TasksViewModel>(); }
    }

    public EditTaskViewModel EditTask {
      get { return ServiceLocator.Current.GetInstance<EditTaskViewModel>(); }
    }

    public NewTaskViewModel NewTask {
      get { return ServiceLocator.Current.GetInstance<NewTaskViewModel>(); }
    }

    public MessagesViewModel Messages {
      get { return ServiceLocator.Current.GetInstance<MessagesViewModel>(); }
    }

    public static void Cleanup() {
      ServiceLocator.Current.GetInstance<ITaskHub>().Dispose();
    }
  }
}