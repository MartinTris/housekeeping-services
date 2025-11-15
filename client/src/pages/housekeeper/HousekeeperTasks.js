import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

const HousekeeperTasks = () => {
  const [housekeepingTasks, setHousekeepingTasks] = useState([]);
  const [deliveryTasks, setDeliveryTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const res = await fetch("http://localhost:5000/housekeepers/tasks", {
        headers: { token: localStorage.token },
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to fetch tasks");
      
      setHousekeepingTasks(data.housekeeping || []);
      setDeliveryTasks(data.delivery || []);
    } catch (err) {
      console.error(err);
      toast.error("Error loading tasks.");
    } finally {
      setLoading(false);
    }
  };

  // Acknowledge housekeeping task
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
      setHousekeepingTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: "in_progress" } : t
        )
      );
    } catch (err) {
      console.error(err);
      toast.error("Error acknowledging task.");
    }
  };

  // Mark housekeeping task as done
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
      setHousekeepingTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error(err);
      toast.error("Error completing task.");
    }
  };

  // Confirm item delivery
  const handleItemDelivered = async (deliveryId) => {
    try {
      const res = await fetch(
        `http://localhost:5000/housekeepers/delivery/${deliveryId}/confirm`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            token: localStorage.token,
          },
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to confirm delivery");

      toast.success("Item delivery confirmed! Guest has been billed.");
      setDeliveryTasks((prev) => prev.filter((t) => t.id !== deliveryId));
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Error confirming delivery.");
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  if (loading) return <p className="p-4">Loading tasks...</p>;

  // helper function to parse "04:00 PM" correctly into a Date
  const parsePreferredTime = (dateStr, timeStr) => {
    const [time, modifier] = timeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);

    if (modifier === "PM" && hours !== 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;

    const date = new Date(dateStr);
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  return (
    <div className="p-6 space-y-8">
      {/* HOUSEKEEPING TASKS SECTION */}
      <div>
        <h2 className="text-green-900 text-2xl font-poppins font-bold mb-4">
          Housekeeping Tasks
        </h2>

        {housekeepingTasks.length === 0 ? (
          <p className="text-gray-500">No housekeeping tasks assigned.</p>
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
              {housekeepingTasks.map((task) => {
                const now = new Date();
                const startTimeStr = task.preferred_time.split(" - ")[0];
                const taskStart = parsePreferredTime(
                  task.preferred_date,
                  startTimeStr
                );

                const canMarkDone = now >= taskStart;

                return (
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
                          disabled={!canMarkDone}
                          className={`px-3 py-1 rounded text-white ${
                            canMarkDone
                              ? "bg-green-600 hover:bg-green-700"
                              : "bg-gray-400 cursor-not-allowed"
                          }`}
                        >
                          Mark as Done
                        </button>
                      ) : (
                        <span className="text-gray-500">Completed</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ITEM DELIVERY TASKS SECTION */}
      <div>
        <h2 className="text-green-900 text-2xl font-poppins font-bold mb-4">
          Item Deliveries
        </h2>

        {deliveryTasks.length === 0 ? (
          <p className="text-gray-500">No delivery tasks pending.</p>
        ) : (
          <table className="w-full border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">Guest</th>
                <th className="p-2 border">Room</th>
                <th className="p-2 border">Item</th>
                <th className="p-2 border">Quantity</th>
                <th className="p-2 border">Charge Amount</th>
                <th className="p-2 border">Action</th>
              </tr>
            </thead>
            <tbody>
              {deliveryTasks.map((task) => (
                <tr key={task.id} className="text-center hover:bg-gray-50">
                  <td className="p-2 border">{task.guest_name}</td>
                  <td className="p-2 border">{task.room_number || "N/A"}</td>
                  <td className="p-2 border">{task.item_name}</td>
                  <td className="p-2 border">{task.quantity}</td>
                  <td className="p-2 border">₱{task.charge_amount}</td>
                  <td className="p-2 border">
                    <button
                      onClick={() => handleItemDelivered(task.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Item Delivered
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default HousekeeperTasks;