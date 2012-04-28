using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Linq;
using System.Windows;
using GalaSoft.MvvmLight.Threading;

namespace TaskR.WindowsClient {
  public partial class App : Application {
    public App() {
      Startup += (s, e) => {
        DispatcherHelper.Initialize();
      };
    }
  }
}
