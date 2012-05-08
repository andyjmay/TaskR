using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using TaskR.Models;

namespace TaskR.Controllers {
  public class TasksController : ApiController {
    private readonly TaskEntities taskEntities;

    public TasksController() {
      taskEntities = new TaskEntities();
    }

    // GET /api/tasks
    public IQueryable<Task> Get() {
      return taskEntities.Tasks.Where(t => !t.IsDeleted).OrderByDescending(t => t.DateCreated);
    }

    // GET /api/tasks/5
    public Task Get(int id) {
      var task = taskEntities.Tasks.Find(id);
      if (task == null) {
        throw new HttpResponseException(HttpStatusCode.NotFound);
      }
      return task;
    }

    // POST /api/tasks
    public HttpResponseMessage<Task> Post(Task task) {
      if (ModelState.IsValid) {
        task.DateCreated = DateTime.Now;
        taskEntities.Tasks.Add(task);
        taskEntities.SaveChanges();
        var response = new HttpResponseMessage<Task>(task, HttpStatusCode.Created);

        string uri = Url.Route(null, new { id = task.TaskID });
        response.Headers.Location = new Uri(Request.RequestUri, uri);
        return response;
      }
      throw new HttpResponseException(HttpStatusCode.BadRequest);
    }

    // PUT /api/tasks/5
    public HttpResponseMessage Put(int id, Task task) {
      if (ModelState.IsValid) {
        var taskToUpdate = Get(task.TaskID);
        if (taskToUpdate == null) {
          throw new HttpResponseException(HttpStatusCode.NotFound);
        }
        taskToUpdate.AssignedTo = task.AssignedTo;
        taskToUpdate.Details = task.Details;
        task.Status = task.Status;
        task.Title = task.Title;
        taskEntities.SaveChanges();

        return new HttpResponseMessage(HttpStatusCode.NoContent);
      }
      throw new HttpResponseException(HttpStatusCode.BadRequest);
    }

    // DELETE /api/tasks/5
    public void Delete(int id) {
      var taskToDelete = Get(id);
      if (taskToDelete != null) {
        taskToDelete.IsDeleted = true;
        taskEntities.SaveChanges();
      }
    }
  }
}
