using System.Data.Entity;
using Devtalk.EF.CodeFirst;

[assembly: WebActivator.PreApplicationStartMethod(typeof(TaskR.App_Start.DontDropDbJustCreateTablesIfModelChangedStart), "Start")]

namespace TaskR.App_Start {
    public static class DontDropDbJustCreateTablesIfModelChangedStart {
        public static void Start() {
            // Uncomment this line and replace CONTEXT_NAME with the name of your DbContext if you are 
            // using your DbContext to create and manage your database
            Database.SetInitializer(new DontDropDbJustCreateTablesIfModelChanged<Models.TaskEntities>());
        }
    }
}
