import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const HousekeeperTasks = () => {
  const [housekeepingTasks, setHousekeepingTasks] = useState([]);
  const [deliveryTasks, setDeliveryTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API_URL}/housekeepers/tasks`, {
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

  const handleMarkInProgress = async (taskId) => {
    try {
      const res = await fetch(
        `${API_URL}/housekeepers/tasks/${taskId}/acknowledge`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            token: localStorage.token,
          },
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to mark as in progress");

      toast.success("Task marked as in progress.");
      setHousekeepingTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: "in_progress" } : t
        )
      );
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Error marking task as in progress.");
    }
  };

  const handleMarkDone = async (taskId) => {
    try {
      const res = await fetch(
        `${API_URL}/housekeepers/tasks/${taskId}/complete`,
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
      toast.error(err.message || "Error completing task.");
    }
  };

  const handleItemDelivered = async (deliveryId) => {
    try {
      const res = await fetch(
        `${API_URL}/housekeepers/delivery/${deliveryId}/confirm`,
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
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-green-900 text-xl sm:text-2xl font-poppins font-bold mb-3 sm:mb-4">
          Housekeeping Tasks
        </h2>

        {housekeepingTasks.length === 0 ? (
          <p className="text-gray-500 text-sm sm:text-base">No housekeeping tasks assigned.</p>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 border text-sm">Guest</th>
                    <th className="p-2 border text-sm">Room</th>
                    <th className="p-2 border text-sm">Service Type</th>
                    <th className="p-2 border text-sm">Preferred Date</th>
                    <th className="p-2 border text-sm">Preferred Time</th>
                    <th className="p-2 border text-sm">Status</th>
                    <th className="p-2 border text-sm">Action</th>
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

                    const canStartTask = now >= taskStart;

                    return (
                      <tr key={task.id} className="text-center">
                        <td className="p-2 border text-sm">{task.guest_name}</td>
                        <td className="p-2 border text-sm">{task.room_number}</td>
                        <td className="p-2 border capitalize text-sm">{task.service_type}</td>
                        <td className="p-2 border text-sm">
                          {new Date(task.preferred_date).toLocaleDateString()}
                        </td>
                        <td className="p-2 border text-sm">{task.preferred_time}</td>
                        <td className="p-2 border capitalize text-sm">{task.status}</td>
                        <td className="p-2 border">
                          {task.status === "approved" ? (
                            <button
                              onClick={() => handleMarkInProgress(task.id)}
                              disabled={!canStartTask}
                              className={`px-3 py-1 rounded text-white text-sm ${
                                canStartTask
                                  ? "bg-blue-600 hover:bg-blue-700"
                                  : "bg-gray-400 cursor-not-allowed"
                              }`}
                            >
                              Mark as In Progress
                            </button>
                          ) : task.status === "in_progress" ? (
                            <button
                              onClick={() => handleMarkDone(task.id)}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                            >
                              Mark as Done
                            </button>
                          ) : (
                            <span className="text-gray-500 text-sm">Completed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-4">
              {housekeepingTasks.map((task) => {
                const now = new Date();
                const startTimeStr = task.preferred_time.split(" - ")[0];
                const taskStart = parsePreferredTime(
                  task.preferred_date,
                  startTimeStr
                );

                const canStartTask = now >= taskStart;

                return (
                  <div key={task.id} className="bg-white border border-gray-300 rounded-lg p-4 shadow-sm">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Guest</p>
                          <p className="font-medium">{task.guest_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 uppercase">Room</p>
                          <p className="font-medium">{task.room_number}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Service Type</p>
                          <p className="text-sm capitalize">{task.service_type}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Status</p>
                          <p className="text-sm capitalize">{task.status}</p>
                        </div>
                      </div>

                      <div className="pt-2 border-t">
                        <p className="text-xs text-gray-500 uppercase">Preferred Date & Time</p>
                        <p className="text-sm">
                          {new Date(task.preferred_date).toLocaleDateString()} • {task.preferred_time}
                        </p>
                      </div>

                      <div className="pt-3">
                        {task.status === "approved" ? (
                          <button
                            onClick={() => handleMarkInProgress(task.id)}
                            disabled={!canStartTask}
                            className={`w-full px-4 py-2 rounded text-white text-sm font-medium ${
                              canStartTask
                                ? "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                                : "bg-gray-400 cursor-not-allowed"
                            }`}
                          >
                            Mark as In Progress
                          </button>
                        ) : task.status === "in_progress" ? (
                          <button
                            onClick={() => handleMarkDone(task.id)}
                            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded text-sm font-medium"
                          >
                            Mark as Done
                          </button>
                        ) : (
                          <span className="block text-center text-gray-500 text-sm py-2">Completed</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div>
        <h2 className="text-green-900 text-xl sm:text-2xl font-poppins font-bold mb-3 sm:mb-4">
          Item Deliveries
        </h2>

        {deliveryTasks.length === 0 ? (
          <p className="text-gray-500 text-sm sm:text-base">No delivery tasks pending.</p>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 border text-sm">Guest</th>
                    <th className="p-2 border text-sm">Room</th>
                    <th className="p-2 border text-sm">Item</th>
                    <th className="p-2 border text-sm">Quantity</th>
                    <th className="p-2 border text-sm">Charge Amount</th>
                    <th className="p-2 border text-sm">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveryTasks.map((task) => (
                    <tr key={task.id} className="text-center hover:bg-gray-50">
                      <td className="p-2 border text-sm">{task.guest_name}</td>
                      <td className="p-2 border text-sm">{task.room_number || "N/A"}</td>
                      <td className="p-2 border text-sm">{task.item_name}</td>
                      <td className="p-2 border text-sm">{task.quantity}</td>
                      <td className="p-2 border text-sm">₱{task.charge_amount}</td>
                      <td className="p-2 border">
                        <button
                          onClick={() => handleItemDelivered(task.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                        >
                          Item Delivered
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-4">
              {deliveryTasks.map((task) => (
                <div key={task.id} className="bg-white border border-gray-300 rounded-lg p-4 shadow-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Guest</p>
                        <p className="font-medium">{task.guest_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase">Room</p>
                        <p className="font-medium">{task.room_number || "N/A"}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Item</p>
                        <p className="text-sm">{task.item_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Qty</p>
                        <p className="text-sm">{task.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase">Charge</p>
                        <p className="text-sm font-medium">₱{task.charge_amount}</p>
                      </div>
                    </div>

                    <div className="pt-3">
                      <button
                        onClick={() => handleItemDelivered(task.id)}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 active:bg-green-800 text-sm font-medium"
                      >
                        Item Delivered
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HousekeeperTasks;