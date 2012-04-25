using GalaSoft.MvvmLight.Ioc;
using Microsoft.Practices.ServiceLocation;
using TaskR.Silverlight.Services;

namespace TaskR.Silverlight.ViewModels {
  public class ViewModelLocator {
    public ViewModelLocator() {
      ServiceLocator.SetLocatorProvider(() => SimpleIoc.Default);

      ////if (ViewModelBase.IsInDesignModeStatic)
      ////{
      ////    // Create design time view services and models
      ////    SimpleIoc.Default.Register<IDataService, DesignDataService>();
      ////}
      ////else
      ////{
      ////    // Create run time view services and models
      ////    SimpleIoc.Default.Register<IDataService, DataService>();
      ////}
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