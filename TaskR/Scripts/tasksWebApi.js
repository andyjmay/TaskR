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

  var viewModel = {
    username: ko.observable(),
    showClosed: ko.observable(false),
    Login: function () {
      $.getJSON("api/tasks?$filter=AssignedTo eq '" + this.username() + "'", function (results) {
        $.each(results, function () {
          var task = this;
          task.DateCreated = task.DateCreated.fromJsonDate();
          tasksViewModel.tasks.push(task);
        });
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
      tasks.addTask({
        Title: this.Title(),
        AssignedTo: this.AssignedTo(),
        Status: this.Status(),
        Details: this.Details(),
        DateCreated: this.DateCreated()
      });
    },
    UpdateTask: function () {
      tasks.updateTask({
        TaskID: this.TaskID(),
        Title: this.Title(),
        AssignedTo: this.AssignedTo(),
        Status: this.Status(),
        Details: this.Details(),
        DateCreated: this.DateCreated()
      });
    },
    DeleteTask: function () {
      tasks.deleteTask({
        TaskID: this.TaskID()
      });
      $('#editTaskModal').modal('hide');
    },
    ClearTask: function () {
      this.TaskID(undefined);
      this.Title(undefined);
      this.AssignedTo(undefined);
      this.Status('Open');
      this.Details(undefined);
      this.DateCreated(undefined);
    }
  };

  // Connect to the hub
  $(function () {
    $('#userLoginModal').modal('show');
  });

  var tasks = {
    addTask: function (newTask) {
      $.ajax({
        url: '/api/tasks',
        cache: false,
        type: 'POST',
        contentType: 'application/json; charset=utf-8',
        data: JSON.stringify(newTask),
        success: function (data, textStatus, jqXHR) {
          var createdTask = data;
          createdTask.DateCreated = createdTask.DateCreated.fromJsonDate();
          tasksViewModel.tasks.push(createdTask);
          tasks.sortTasks();
        }
      });
    },
    updateTask: function (updatedTask) {
      $.ajax({
        url: '/api/tasks/' + updatedTask.TaskID,
        cache: false,
        type: 'PUT',
        contentType: 'application/json; charset=utf-8',
        data: JSON.stringify(updatedTask),
        success: function (data, textStatus, jqXHR) {
          tasksViewModel.tasks.remove(function (taskToRemove) {
            return taskToRemove.TaskID === updatedTask.TaskID;
          });
          if (updatedTask.AssignedTo !== viewModel.username()) {
            return;
          }
          tasksViewModel.tasks.push(updatedTask);
          tasks.sortTasks();
          taskViewModel.ClearTask();
        },
        error: function (jqXHR, textStatus, errorThrown) {
          alert(textStatus + " :: " + errorThrown);
        }
      });
    },
    deleteTask: function (taskToDelete) {
      $.ajax({
        url: '/api/tasks/' + taskToDelete.TaskID,
        cache: false,
        type: 'DELETE',
        contentType: 'application/json; charset=utf-8',
        success: function (data, textStatus, jqXHR) {
          tasksViewModel.tasks.remove(function (taskToRemove) {
            return taskToRemove.TaskID === taskToDelete.TaskID;
          });
          taskViewModel.ClearTask();
        },
        error: function (jqXHR, textStatus, errorThrown) {
          alert(textStatus + " :: " + errorThrown);
        }
      });
    },
    sortTasks: function() {
      tasksViewModel.tasks.sort(function (left, right) {
        return left === right ? 0 : (left.TaskID > right.TaskID ? -1 : 1);
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

  // Util functions
  function padZero(s) {
    s = s.toString();
    if (s.length == 1) {
      return "0" + s;
    }
    return s;
  }

  String.prototype.fromJsonDate = function () {
    return eval(this.replace( /\/Date\((\d+)(\+|\-)?.*\)\//gi , "new Date($1)"));
  };

  Date.prototype.formatDate = function () {
    var m = this.getMonth() + 1,
        d = this.getDate(),
        y = this.getFullYear();
    return m + "/" + d + "/" + y;
  };

  Date.prototype.formatTime = function (showAp) {
    var ap = "";
    var hr = this.getHours();
    if (hr < 12) {
      ap = "AM";
    }
    else {
      ap = "PM";
    }
    if (hr == 0) {
      hr = 12;
    }
    if (hr > 12) {
      hr = hr - 12;
    }
    var mins = padZero(this.getMinutes());
    var seconds = padZero(this.getSeconds());
    return hr + ":" + mins + ":" + seconds + (showAp ? " " + ap : "");
  };
})(jQuery, $.connection, window);