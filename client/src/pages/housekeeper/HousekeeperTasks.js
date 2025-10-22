import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

const HousekeeperTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch tasks assigned to current housekeeper
  const fetchTasks = async () => {
    try {
      const res = await fetch("http://localhost:5000/housekeepers/tasks", {
        headers: { token: localStorage.token },
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to fetch tasks");
      setTasks(data);
    } catch (err) {
      console.error(err);
      toast.error("Error loading tasks.");
    } finally {
      setLoading(false);
    }
  };

  // Acknowledge task
  const handleAcknowledge = async (taskId) => {
    try {
      const res = await fetch(
        `http://localhost:5000/housekeepers/tasks/${taskId}/acknowledge`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            token: localStorage.token,
          },
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to acknowledge task");

      toast.success("Task acknowledged.");
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: "in_progress" } : t
        )
      );
    } catch (err) {
      console.error(err);
      toast.error("Error acknowledging task.");
    }
  };

  // Mark task as done
  const handleMarkDone = async (taskId) => {
    try {
      const res = await fetch(
        `http://localhost:5000/housekeepers/tasks/${taskId}/complete`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            token: localStorage.token,
          },
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to mark as done");

      toast.success("Task marked as done!");
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error(err);
      toast.error("Error completing task.");
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  if (loading) return <p className="p-4">Loading tasks...</p>;

  return (
    <div className="p-6">
      <h2 className="text-green-900 text-2xl font-poppins font-bold mb-4">
        Assigned Tasks
      </h2>

      {tasks.length === 0 ? (
        <p>No assigned tasks found.</p>
      ) : (
        <table className="w-full border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Guest</th>
              <th className="p-2 border">Room</th>
              <th className="p-2 border">Service Type</th>
              <th className="p-2 border">Preferred Date</th>
              <th className="p-2 border">Preferred Time</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Action</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="text-center">
                <td className="p-2 border">{task.guest_name}</td>
                <td className="p-2 border">{task.room_number}</td>
                <td className="p-2 border capitalize">{task.service_type}</td>
                <td className="p-2 border">
                  {new Date(task.preferred_date).toLocaleDateString()}
                </td>
                <td className="p-2 border">{task.preferred_time}</td>
                <td className="p-2 border capitalize">{task.status}</td>
                <td className="p-2 border">
                  {task.status === "approved" ? (
                    <button
                      onClick={() => handleAcknowledge(task.id)}
                      className="px-3 py-1 bg-blue-600 text-white rounded"
                    >
                      Acknowledge Task
                    </button>
                  ) : task.status === "in_progress" ? (
                    <button
                      onClick={() => handleMarkDone(task.id)}
                      className="px-3 py-1 bg-green-600 text-white rounded"
                    >
                      Mark as Done
                    </button>
                  ) : (
                    <span className="text-gray-500">Completed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default HousekeeperTasks;
