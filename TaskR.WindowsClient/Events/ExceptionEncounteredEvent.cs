using System;

namespace TaskR.WindowsClient.Events {
  class ExceptionEncounteredEvent {
    public Exception Exception { get; private set; }
    public ExceptionEncounteredEvent(Exception ex) {
      Exception = ex;
    }
  }
}
