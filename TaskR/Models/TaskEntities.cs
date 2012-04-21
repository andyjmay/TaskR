using System.Data.Entity;

namespace TaskR.Models {
  public class TaskEntities : DbContext {
    public DbSet<Task> Tasks { get; set; }
    public DbSet<ConnectedUser> ConnectedUsers { get; set; }

    public TaskEntities() {
    }

    protected override void OnModelCreating(DbModelBuilder modelBuilder) {
      modelBuilder.Entity<Task>().HasKey(t => t.TaskID);
      modelBuilder.Entity<Task>().Property(t => t.Title).IsRequired();
      modelBuilder.Entity<Task>().Property(t => t.Details).IsRequired();
      modelBuilder.Entity<ConnectedUser>().HasKey(c => c.ConnectionID);
      modelBuilder.Entity<ConnectedUser>().Property(c => c.ConnectionID).IsRequired();
      modelBuilder.Entity<ConnectedUser>().Property(c => c.Username).IsRequired();
      base.OnModelCreating(modelBuilder);
    }

  }
}