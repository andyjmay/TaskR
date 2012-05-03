using System;

namespace TaskR.WP7Client.Events {
  class ExceptionEncounteredEvent {
    public Exception Exception { get; private set; }
    public ExceptionEncounteredEvent(Exception ex) {
      Exception = ex;
    }
  }
}
