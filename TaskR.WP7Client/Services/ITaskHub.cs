using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using TaskR.Models;

namespace TaskR.WP7Client.Services
{
    public interface ITaskHub : IDisposable
    {
        void Login(string username);
        void GetTasksForUser(string username);
        void AddTask(Task taskToAdd);
        void UpdateTask(Task taskToUpdate);
        void DeleteTask(Task taskToDelete);
    }
}
