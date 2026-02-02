import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Printer } from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const FeedbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [feedbacks, setFeedbacks] = useState([]);
  const [filteredFeedbacks, setFilteredFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [userFacility, setUserFacility] = useState("");
  const [feedbackType, setFeedbackType] = useState(
    searchParams.get("type") || "service",
  );

  const [guestFilter, setGuestFilter] = useState("");
  const [housekeeperFilter, setHousekeeperFilter] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");
  const [dateFilter, setDateFilter] = useState("all");
  const [adminName, setAdminName] = useState("");

  const fetchAdminName = async () => {
    try {
      const response = await fetch(`${API_URL}/dashboard/`, {
        method: "GET",
        headers: { token: localStorage.token },
      });
      const parseRes = await response.json();
      setAdminName(parseRes.name);
    } catch (err) {
      console.error(err.message);
    }
  };

  const fetchUserRole = () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUserRole(payload.role);
        setUserFacility(payload.facility || "");
      }
    } catch (err) {
      console.error("Error fetching user role:", err);
    }
  };

  const fetchFeedbacks = async () => {
    try {
      const endpoint =
        feedbackType === "system"
          ? `${API_URL}/feedback/admin/system`
          : `${API_URL}/feedback/admin`;

      const res = await fetch(endpoint, {
        headers: { token: localStorage.getItem("token") },
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbacks(data);
        setFilteredFeedbacks(data);
      }
      setLoading(false);
    } catch (err) {
      console.error("Error fetching feedbacks:", err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserRole();
    fetchAdminName();
  }, []);

  useEffect(() => {
    fetchFeedbacks();
  }, [feedbackType]);

  useEffect(() => {
    let filtered = [...feedbacks];

    if (dateFilter === "7days") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      filtered = filtered.filter((f) => new Date(f.created_at) >= sevenDaysAgo);
    } else if (dateFilter === "30days") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filtered = filtered.filter(
        (f) => new Date(f.created_at) >= thirtyDaysAgo,
      );
    }

    if (guestFilter) {
      filtered = filtered.filter((f) => f.guest_name === guestFilter);
    }

    if (housekeeperFilter && feedbackType === "service") {
      filtered = filtered.filter(
        (f) => f.housekeeper_name === housekeeperFilter,
      );
    }

    filtered.sort((a, b) => {
      if (sortOrder === "desc") {
        return b.rating - a.rating;
      } else {
        return a.rating - b.rating;
      }
    });

    setFilteredFeedbacks(filtered);
  }, [
    guestFilter,
    housekeeperFilter,
    sortOrder,
    feedbacks,
    feedbackType,
    dateFilter,
  ]);

  const isSuperAdmin = userRole === "superadmin";

  const uniqueGuests = [
    ...new Set(feedbacks.map((f) => f.guest_name).filter(Boolean)),
  ];
  const uniqueHousekeepers = [
    ...new Set(feedbacks.map((f) => f.housekeeper_name).filter(Boolean)),
  ];

  const handlePrint = () => {
    const dateRangeText =
      dateFilter === "all"
        ? "All Time"
        : dateFilter === "7days"
          ? "Last 7 Days"
          : "Last 30 Days";

    const reportTitle =
      feedbackType === "service"
        ? "Service Feedback Report"
        : "System Feedback Report";

    let tableHeaders = "<tr>";
    tableHeaders += "<th>Guest</th>";

    if (isSuperAdmin) {
      tableHeaders += "<th>Facility</th>";
    }

    if (feedbackType === "service") {
      tableHeaders += "<th>Housekeeper</th>";
      tableHeaders += "<th>Room</th>";
      tableHeaders += "<th>Service Type</th>";
    }

    tableHeaders += "<th>Rating</th>";
    tableHeaders += "<th>Comment</th>";
    tableHeaders += "<th>Date</th>";
    tableHeaders += "</tr>";

    let tableRows = "";
    filteredFeedbacks.forEach((f) => {
      tableRows += "<tr>";
      tableRows += `<td>${f.guest_name || "N/A"}</td>`;

      if (isSuperAdmin) {
        tableRows += `<td>${f.facility || "Unknown"}</td>`;
      }

      if (feedbackType === "service") {
        tableRows += `<td>${f.housekeeper_name || "N/A"}</td>`;
        tableRows += `<td>${f.room_number || "—"}</td>`;
        tableRows += `<td>${f.service_type || "—"}</td>`;
      }

      tableRows += `<td>${f.rating} ⭐</td>`;
      tableRows += `<td>${f.comment || "No comment"}</td>`;
      tableRows += `<td>${new Date(f.created_at).toLocaleDateString()}</td>`;
      tableRows += "</tr>";
    });

    const printContent = `
      <table>
        <thead>
          ${tableHeaders}
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    `;

    const printWindow = window.open("", "", "width=1000,height=800");
    printWindow.document.write(`
      <html>
        <head>
          <title>${reportTitle}</title>
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
            tr: nth-child(even) {
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
            .prepared-by {
              margin-top: 30px;
              text-align: right;
              font-size: 12px;
              color: #065f46;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <h1><center>${reportTitle}</h1></center>
          <div class="meta">
            ${!isSuperAdmin ? `<p><strong>Facility:</strong> ${userFacility}</p>` : ""}
            <p><strong>Date Range:</strong> ${dateRangeText}</p>
            ${feedbackType === "service" && housekeeperFilter ? `<p><strong>Housekeeper:</strong> ${housekeeperFilter}</p>` : ""}
            ${guestFilter ? `<p><strong>Guest:</strong> ${guestFilter}</p>` : ""}
            <p><strong>Total Feedback:</strong> ${filteredFeedbacks.length}</p>
            <p><strong>Generated on: </strong> ${new Date().toLocaleString()}</p>
          </div>
          ${printContent}
          <div class="prepared-by">Prepared by: ${adminName}</div>
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
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-green-600 hover:text-green-700 active:text-green-800 font-medium mb-4 transition-colors text-sm sm:text-base"
      >
        ← Back
      </button>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
        <h2 className="text-xl sm: text-2xl font-bold text-gray-800">
          Guest Feedback
        </h2>

        {isSuperAdmin && (
          <div className="flex gap-1 sm:gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setFeedbackType("service")}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md font-medium transition-colors text-sm ${
                feedbackType === "service"
                  ? "bg-green-600 text-white"
                  : "text-gray-600 hover:text-gray-900 active:bg-gray-200"
              }`}
            >
              Service Feedback
            </button>
            <button
              onClick={() => setFeedbackType("system")}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md font-medium transition-colors text-sm ${
                feedbackType === "system"
                  ? "bg-green-600 text-white"
                  : "text-gray-600 hover:text-gray-900 active:bg-gray-200"
              }`}
            >
              System Feedback
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="grid grid-cols-1 sm: grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Date Range
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Time</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm: mb-2">
              Filter by Guest
            </label>
            <select
              value={guestFilter}
              onChange={(e) => setGuestFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus: outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">All Guests</option>
              {uniqueGuests.map((guest) => (
                <option key={guest} value={guest}>
                  {guest}
                </option>
              ))}
            </select>
          </div>

          {feedbackType === "service" && (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Filter by Housekeeper
              </label>
              <select
                value={housekeeperFilter}
                onChange={(e) => setHousekeeperFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus: ring-2 focus:ring-green-500"
              >
                <option value="">All Housekeepers</option>
                {uniqueHousekeepers.map((housekeeper) => (
                  <option key={housekeeper} value={housekeeper}>
                    {housekeeper}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs sm: text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Sort by Rating
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="desc">Highest to Lowest</option>
              <option value="asc">Lowest to Highest</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-600 text-sm sm:text-base">
          Loading feedback...
        </p>
      ) : filteredFeedbacks.length === 0 ? (
        <p className="text-gray-600 text-sm sm:text-base">
          No feedback found.{" "}
        </p>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Guest
                  </th>
                  {isSuperAdmin && (
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Facility
                    </th>
                  )}
                  {feedbackType === "service" && (
                    <>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Housekeeper
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Room
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Service Type
                      </th>
                    </>
                  )}
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Rating
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Comment
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredFeedbacks.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {f.guest_name || "N/A"}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            f.facility === "RCC"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {f.facility || "Unknown"}
                        </span>
                      </td>
                    )}
                    {feedbackType === "service" && (
                      <>
                        <td className="px-4 py-3 text-sm text-gray-800 capitalize">
                          {f.housekeeper_name || "N/A"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-800">
                          {f.room_number || "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-800 capitalize">
                          {f.service_type || "—"}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold text-gray-800">
                          {f.rating}
                        </span>
                        <span className="text-yellow-500">⭐</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {f.comment || "No comment"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {new Date(f.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {filteredFeedbacks.map((f) => (
              <div
                key={f.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">
                        {f.guest_name || "N/A"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(f.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-base font-bold text-gray-800">
                        {f.rating}
                      </span>
                      <span className="text-yellow-500 text-lg">⭐</span>
                    </div>
                  </div>

                  {isSuperAdmin && (
                    <div>
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          f.facility === "RCC"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {f.facility || "Unknown"}
                      </span>
                    </div>
                  )}

                  {feedbackType === "service" && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                      <div>
                        <p className="text-xs text-gray-500 uppercase">
                          Housekeeper
                        </p>
                        <p className="text-sm text-gray-800 capitalize truncate">
                          {f.housekeeper_name || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Room</p>
                        <p className="text-sm text-gray-800">
                          {f.room_number || "—"}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 uppercase">
                          Service Type
                        </p>
                        <p className="text-sm text-gray-800 capitalize">
                          {f.service_type || "—"}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="pt-2 border-t">
                    <p className="text-xs text-gray-500 uppercase mb-1">
                      Comment
                    </p>
                    <p className="text-sm text-gray-700">
                      {f.comment || "No comment"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handlePrint}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 sm:px-6 py-2.5 rounded-full shadow-lg hover:scale-105 hover:from-green-700 hover:to-emerald-700 transition-all duration-300 text-sm sm:text-base font-medium"
            >
              <Printer size={18} />
              <span>Print Report</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default FeedbackPage;
