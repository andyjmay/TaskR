using GalaSoft.MvvmLight.Ioc;
using Microsoft.Practices.ServiceLocation;
using TaskR.WindowsClient.Services;

namespace TaskR.WindowsClient.ViewModels {
  public class ViewModelLocator {
    public ViewModelLocator() {
      ServiceLocator.SetLocatorProvider(() => SimpleIoc.Default);
      
      SimpleIoc.Default.Register<ITaskHub, TaskHub>();
      SimpleIoc.Default.Register<MainViewModel>();
      SimpleIoc.Default.Register<TasksViewModel>();
      SimpleIoc.Default.Register<MessagesViewModel>();

      ServiceLocator.Current.GetInstance<ITaskHub>();
    }

    public MainViewModel Main {
      get { return ServiceLocator.Current.GetInstance<MainViewModel>(); }
    }

    public TasksViewModel Tasks {
      get { return ServiceLocator.Current.GetInstance<TasksViewModel>(); }
    }

    public MessagesViewModel Messages {
      get { return ServiceLocator.Current.GetInstance<MessagesViewModel>(); }
    }

    public static void Cleanup() {
      ServiceLocator.Current.GetInstance<ITaskHub>().Dispose();
    }
  }
}