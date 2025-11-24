import { useEffect, useState, useRef } from "react";
import { Printer } from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const TaskHistory = () => {
  const [days, setDays] = useState(7);
  const [tasks, setTasks] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [selectedServiceType, setSelectedServiceType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const printRef = useRef(null);

  const fetchServiceTypes = async () => {
    try {
      const res = await fetch(`${API_URL}/service-types`, {
        headers: { token: localStorage.token },
      });
      const data = await res.json();
      setServiceTypes(data);
    } catch (err) {
      console.error("Error fetching service types:", err);
    }
  };

  const fetchTaskHistory = async () => {
    try {
      setLoading(true);
      setError("");

      const url = `${API_URL}/housekeepers/task-history?days=${days}`;

      const res = await fetch(url, {
        headers: { token: localStorage.token },
      });

      if (!res.ok) throw new Error("Failed to fetch task history");

      const data = await res.json();
      let filteredTasks = data.data || [];

      // Filter by service type if selected
      if (selectedServiceType) {
        filteredTasks = filteredTasks.filter(
          (t) => t.service_type === selectedServiceType
        );
      }

      setTasks(filteredTasks);
    } catch (err) {
      console.error("Error fetching task history:", err);
      setError("Could not load task history.");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to calculate end time
  const calculateEndTime = (startTime, serviceDuration) => {
    if (!startTime || !serviceDuration) return startTime;

    try {
      // Parse the time (format: "HH:MM AM/PM")
      const [time, period] = startTime.split(" ");
      let [hours, minutes] = time.split(":").map(Number);

      // Convert to 24-hour format
      if (period === "PM" && hours !== 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;

      // Add duration
      const totalMinutes = hours * 60 + minutes + serviceDuration;
      let endHours = Math.floor(totalMinutes / 60) % 24;
      const endMinutes = totalMinutes % 60;

      // Convert back to 12-hour format
      const endPeriod = endHours >= 12 ? "PM" : "AM";
      if (endHours > 12) endHours -= 12;
      if (endHours === 0) endHours = 12;

      return `${String(endHours).padStart(2, "0")}:${String(
        endMinutes
      ).padStart(2, "0")} ${endPeriod}`;
    } catch (err) {
      console.error("Error calculating end time:", err);
      return startTime;
    }
  };

  // Get service duration for a given service type
  const getServiceDuration = (serviceTypeName) => {
    const type = serviceTypes.find((t) => t.name === serviceTypeName);
    return type ? type.duration : 0;
  };

  // Get display text for date range
  const getDateRangeText = () => {
    if (days === 0) return "All Time";
    return `Last ${days} day(s)`;
  };

  useEffect(() => {
    fetchServiceTypes();
  }, []);

  useEffect(() => {
    fetchTaskHistory();
  }, [days, selectedServiceType]);

  const handlePrint = () => {
    if (!tasks.length) {
      alert("No task history to print.");
      return;
    }

    const printContent = printRef.current.innerHTML;
    const printWindow = window.open("", "", "width=1000,height=800");
    printWindow.document.write(`
      <html>
        <head>
          <title>Task History Report</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              color: #333;
            }
            h1 {
              color: #065f46;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            th, td {
              border: 1px solid #ccc;
              padding: 8px;
              text-align: left;
              font-size: 14px;
            }
            th {
              background-color: #d1fae5;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .meta {
              margin-bottom: 10px;
              font-size: 14px;
            }
            .footer {
              margin-top: 20px;
              font-size: 12px;
              color: gray;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <h1>Task History Report</h1>
          <div class="meta">
            <p><strong>Date Range:</strong> ${getDateRangeText()}</p>
            ${
              selectedServiceType
                ? `<p><strong>Service Type:</strong> ${selectedServiceType}</p>`
                : ""
            }
            <p><strong>Generated on:</strong> ${new Date().toLocaleString()}</p>
          </div>
          ${printContent}
          <div class="footer">Housekeeping Management System — De La Salle University-Dasmariñas</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-xl sm:text-2xl font-semibold mb-2 text-green-700">
        My Task History
      </h1>

      <p className="text-sm sm:text-base text-gray-600 mb-4">
        View all your completed housekeeping tasks
      </p>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4 mb-4">
        {/* Date Range Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          <label className="font-medium text-sm sm:text-base">
            Date Range:
          </label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="border rounded px-3 py-1.5 sm:py-1 text-sm sm:text-base"
          >
            <option value="7">Last 7 Days</option>
            <option value="14">Last 14 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="0">All Time</option>
          </select>
        </div>

        {/* Service Type Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          <label className="font-medium text-sm sm:text-base">
            Service Type:
          </label>
          <select
            value={selectedServiceType}
            onChange={(e) => setSelectedServiceType(e.target.value)}
            className="border rounded px-3 py-1.5 sm:py-1 text-sm sm:text-base"
          >
            <option value="">All Service Types</option>
            {serviceTypes.map((type) => (
              <option key={type.id} value={type.name}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div ref={printRef}>
        {loading ? (
          <p className="text-sm sm:text-base">Loading task history...</p>
        ) : error ? (
          <p className="text-red-500 text-sm sm:text-base">{error}</p>
        ) : tasks.length === 0 ? (
          <p className="text-gray-500 text-sm sm:text-base">
            No completed tasks found for the selected filters.
          </p>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block lg:hidden space-y-3">
              {tasks.map((task, i) => {
                const duration = getServiceDuration(task.service_type);
                const endTime = calculateEndTime(task.time, duration);

                return (
                  <div
                    key={i}
                    className="bg-white border rounded-lg p-4 shadow hover:shadow-md transition"
                  >
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs text-gray-500 uppercase">
                          Guest Name
                        </span>
                        <p className="font-semibold text-sm break-words">
                          {task.guest_name || "N/A"}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-xs text-gray-500 uppercase">
                            Service Type
                          </span>
                          <p className="text-sm capitalize break-words">
                            {task.service_type}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 uppercase">
                            Room
                          </span>
                          <p className="text-sm">{task.room_number || "N/A"}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-xs text-gray-500 uppercase">
                            Date
                          </span>
                          <p className="text-sm">{task.date}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 uppercase">
                            Time
                          </span>
                          <p className="text-sm">
                            {task.time} - {endTime}
                          </p>
                        </div>
                      </div>

                      <div>
                        <span className="text-xs text-gray-500 uppercase">
                          Facility
                        </span>
                        <p className="text-sm">{task.facility || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto shadow rounded-lg">
              <table className="min-w-full border border-gray-200">
                <thead className="bg-green-100 text-green-900">
                  <tr>
                    <th className="p-3 text-left border-b">Guest Name</th>
                    <th className="p-3 text-left border-b">Service Type</th>
                    <th className="p-3 text-left border-b">Room</th>
                    <th className="p-3 text-left border-b">Facility</th>
                    <th className="p-3 text-left border-b">Date</th>
                    <th className="p-3 text-left border-b">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task, i) => {
                    const duration = getServiceDuration(task.service_type);
                    const endTime = calculateEndTime(task.time, duration);

                    return (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="p-3 border-b">
                          {task.guest_name || "N/A"}
                        </td>
                        <td className="p-3 border-b capitalize">
                          {task.service_type}
                        </td>
                        <td className="p-3 border-b">
                          {task.room_number || "N/A"}
                        </td>
                        <td className="p-3 border-b">
                          {task.facility || "N/A"}
                        </td>
                        <td className="p-3 border-b">{task.date}</td>
                        <td className="p-3 border-b">
                          {task.time} - {endTime}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {!loading && tasks.length > 0 && (
        <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <p className="text-sm sm:text-base text-gray-600">
            Showing {tasks.length} completed task(s)
          </p>
          <button
            onClick={handlePrint}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 sm:px-6 py-2.5 rounded-full shadow-lg hover:scale-105 hover:from-green-700 hover:to-emerald-700 transition-all duration-300 text-sm sm:text-base font-medium"
          >
            <Printer size={18} />
            <span>Print History</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default TaskHistory;