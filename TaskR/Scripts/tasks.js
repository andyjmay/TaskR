(function ($, connection, window) {
  "use strict";

  $('#newTaskModal').modal({
    backdrop: true,
    keyboard: true,
    show: false
  });

  $('#userLoginModal').modal({
    backdrop: true,
    keyboard: true,
    show: false
  });

  $('#addTaskButton').on('click', function () {
    $('#newTaskModal').modal('show');
  });

  $('.cancel-button').on('click', function () {
    $('#newTaskModal').modal('hide');
    $('#editTaskModal').modal('hide');
    return false;
  });

  $('.submit-button').on('click', function () {
    $('#newTaskModal').modal('hide');
    $('#editTaskModal').modal('hide');
    $('#userLoginModal').modal('hide');
  });

  $('.editButton').on('click', function () {
    $('#editTaskModal').modal('show');
  });

  var taskHub = connection.taskHub;

  var viewModel = {
    username: ko.observable(),
    showClosed: ko.observable(false),
    Login: function () {
      taskHub.login(this.username())
               .fail(function (e) {
                 taskHub.HandleException(e);
               })
               .done(function (success) {
                 if (success === false) {
                   alert("failed");
                 } else {

                 }
               });
    }
  };

  var tasksViewModel = {
    tasks: ko.observableArray(),
    EditTask: function () {
      taskViewModel.TaskID(this.TaskID);
      taskViewModel.Title(this.Title);
      taskViewModel.AssignedTo(this.AssignedTo);
      taskViewModel.Status(this.Status);
      taskViewModel.Details(this.Details);
      taskViewModel.DateCreated(this.DateCreated);

      //TODO: Fix this UI call
      $('#editTaskModal').modal('show');
    }
  };

  var taskViewModel = {
    TaskID: new ko.observable(),
    Title: new ko.observable(),
    AssignedTo: new ko.observable(),
    Status: new ko.observable(),
    Details: new ko.observable(),
    DateCreated: new ko.observable(),
    AddTask: function () {
      var taskToAdd = {
        Title: this.Title(),
        AssignedTo: this.AssignedTo(),
        Status: this.Status(),
        Details: this.Details()
      }
      tasks.addTask(taskToAdd);
    },
    UpdateTask: function () {
      var updatedTask = {
        TaskID: this.TaskID(),
        Title: this.Title(),
        AssignedTo: this.AssignedTo(),
        Status: this.Status(),
        Details: this.Details()
      }
      tasks.updateTask(updatedTask);
    },
    DeleteTask: function () {
      var taskToDelete = {
        TaskID: this.TaskID(),
        Title: this.Title(),
        AssignedTo: this.AssignedTo(),
        Status: this.Status(),
        Details: this.Details()
      }
      tasks.deleteTask(taskToDelete);
      $('#editTaskModal').modal('hide');
    },
    ClearTask: function () {
      this.TaskID(undefined);
      this.Title(undefined);
      this.AssignedTo(undefined);
      this.Status('Open');
      this.Details(undefined);
      this.DateCreated(new Date());
    }
  };

  taskHub.GotTasksForUser = function (results) {
    if (results) {
      $.each(results, function () {
        var task = this;
        task.DateCreated = new Date(task.DateCreated);
        tasksViewModel.tasks.push(task);
      });
    }
  };

  taskHub.GotLogMessage = function (logMessage) {
    toastr.info(logMessage);
  };

  taskHub.AddedTask = function (task) {
    task.DateCreated = new Date(task.DateCreated);
    tasksViewModel.tasks.push(task);
  };

  taskHub.UpdatedTask = function (task) {
    task.DateCreated = new Date(task.DateCreated);
    taskHub.DeletedTask(task);
    if (task.AssignedTo !== viewModel.username()) {
      return;
    }  
    tasksViewModel.tasks.push(task);
    tasksViewModel.tasks.sort(function (left, right) {
      return left === right ? 0 : (left.TaskID < right.TaskID ? -1 : 1)
    });
  };

  taskHub.DeletedTask = function (task) {
    tasksViewModel.tasks.remove(function (taskToRemove) {
      return taskToRemove.TaskID === task.TaskID;
    });
  };

  taskHub.HandleException = function (ex) {
    alert(ex);
  };

  // Connect to the hub
  $(function () {
    connection.hub.start(function () {
      $('#userLoginModal').modal('show');
    });
  });

  var tasks = {
    addTask: function (newTask) {
      taskHub.addTask(newTask)
               .fail(function (e) {
                 taskHub.HandleException(e);
               })
               .done(function (success) {
                 if (success === false) {
                   alert("failed");
                 } else {
                   taskViewModel.ClearTask();
                 }
               });
    },
    updateTask: function (updatedTask) {
      taskHub.updateTask(updatedTask)
               .fail(function (e) {
                 taskHub.HandleException(e);
               })
               .done(function (success) {
                 if (success === false) {
                   alert("failed");
                 } else {
                   taskViewModel.ClearTask();
                 }
               });
    },
    deleteTask: function (taskToDelete) {
      taskHub.deleteTask(taskToDelete)
               .fail(function (e) {
                 taskHub.HandleException(e);
               })
               .done(function (success) {
                 if (success === false) {
                   alert("failed");
                 } else {
                   taskViewModel.ClearTask();
                 }
               });
    }
  };

  window.tasks = tasks;

  // Apply KO bindings
  ko.applyBindings(viewModel, document.getElementById('actions'));
  ko.applyBindings(viewModel, document.getElementById('userLoginModal'));
  ko.applyBindings(tasksViewModel, document.getElementById('tasks'));
  ko.applyBindings(taskViewModel, document.getElementById('newTaskModal'));
  ko.applyBindings(taskViewModel, document.getElementById('editTaskModal'));
})(jQuery, $.connection, window);