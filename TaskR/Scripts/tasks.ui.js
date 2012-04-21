(function ($, window) {
  "use strict";

  $('#newTaskModal').modal({
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
    //return false;
  });

  $('.editButton').on('click', function () {
    $('#editTaskModal').modal('show');
  });

  var ui = {
  };

  if (!window.tasks) {
    window.tasks = {};
  }
  window.tasks.ui = ui;
})(jQuery, window);