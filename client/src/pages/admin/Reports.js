import { useEffect, useState, useRef } from "react";

const Reports = () => {
  const [days, setDays] = useState(7);
  const [reportType, setReportType] = useState("housekeeping");
  const [reports, setReports] = useState([]);
  const [facility, setFacility] = useState("");
  const [role, setRole] = useState("");
  const [housekeepers, setHousekeepers] = useState([]);
  const [selectedHousekeeper, setSelectedHousekeeper] = useState("");
  const [serviceTypes, setServiceTypes] = useState([]);
  const [selectedServiceType, setSelectedServiceType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const printRef = useRef(null);
  const [facilityFilter, setFacilityFilter] = useState("all");

  // Get user role
  useEffect(() => {
    const userRole = localStorage.getItem("role");
    setRole(userRole);
  }, []);

  const fetchHousekeepers = async () => {
    try {
      const res = await fetch(
        "http://localhost:5000/api/admin/reports/housekeepers",
        {
          headers: { token: localStorage.token },
        }
      );
      const data = await res.json();
      setHousekeepers(data);
    } catch (err) {
      console.error("Error fetching housekeepers:", err);
    }
  };

  const fetchServiceTypes = async () => {
    try {
      const res = await fetch("http://localhost:5000/service-types", {
        headers: { token: localStorage.token },
      });
      const data = await res.json();
      setServiceTypes(data);
    } catch (err) {
      console.error("Error fetching service types:", err);
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError("");

      let url = "";

      if (reportType === "housekeeping") {
        url = `http://localhost:5000/api/admin/reports?days=${days}&type=${reportType}`;
        if (selectedHousekeeper) {
          url += `&housekeeper_id=${selectedHousekeeper}`;
        }
      } else if (reportType === "borrowed") {
        url = `http://localhost:5000/api/admin/reports/borrowed-items?days=${days}`;
      }

      const res = await fetch(url, { headers: { token: localStorage.token } });
      if (!res.ok) throw new Error("Failed to fetch reports");

      const data = await res.json();
      let filteredReports = data.data || [];

      // Filter by service type if selected
      if (reportType === "housekeeping" && selectedServiceType) {
        filteredReports = filteredReports.filter(
          (r) => r.service_type === selectedServiceType
        );
      }

      setReports(filteredReports);
      setFacility(data.facility || "");
    } catch (err) {
      console.error("Error fetching reports:", err);
      setError("Could not load reports.");
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

  useEffect(() => {
    fetchHousekeepers();
    fetchServiceTypes();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [days, selectedHousekeeper, selectedServiceType, reportType]);

  // Filter reports by facility for superadmin
  const displayedReports = reports.filter((report) => {
    if (role !== "superadmin" || facilityFilter === "all") return true;
    return report.facility === facilityFilter;
  });

  const handlePrint = () => {
    if (!displayedReports.length) {
      alert("No report data to print.");
      return;
    }

    const printContent = printRef.current.innerHTML;
    const printWindow = window.open("", "", "width=1000,height=800");
    printWindow.document.write(`
      <html>
        <head>
          <title>${
            reportType === "housekeeping" ? "Housekeeping" : "Borrowed Items"
          } Report</title>
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
          <h1>${
            reportType === "housekeeping"
              ? "Housekeeping Report"
              : "Borrowed Items Report"
          }</h1>
          <div class="meta">
            <p><strong>Facility:</strong> ${facility}</p>
            <p><strong>Date Range:</strong> Last ${days} day(s)</p>
            ${
              reportType === "housekeeping" && selectedHousekeeper
                ? `<p><strong>Housekeeper:</strong> ${
                    housekeepers.find((h) => h.id === selectedHousekeeper)
                      ?.name || ""
                  }</p>`
                : ""
            }
            ${
              reportType === "housekeeping" && selectedServiceType
                ? `<p><strong>Service Type:</strong> ${selectedServiceType}</p>`
                : ""
            }
            ${role === 'superadmin' && facilityFilter !== 'all' ? `<p><strong>Filtered by:</strong> ${facilityFilter}</p>` : ''}
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
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-2 text-green-700">
        {reportType === "housekeeping"
          ? "Housekeeping Reports"
          : "Borrowed Items Reports"}
      </h1>

      {facility && (
        <p className="text-gray-600 mb-4">
          Facility: <span className="font-medium">{facility}</span>
        </p>
      )}

      {/* Report Filters */}
      <div className="flex flex-wrap gap-4 mb-4">
        {/* Report Type Selector */}
        <div>
          <label className="mr-2 font-medium">Select Report Type:</label>
          <select
            value={reportType}
            onChange={(e) => {
              setReportType(e.target.value);
              setSelectedServiceType(""); // Reset service type filter
            }}
            className="border rounded px-3 py-1"
          >
            <option value="housekeeping">Housekeeping</option>
            <option value="borrowed">Borrowed Items</option>
          </select>
        </div>

        {/* Date Range Selector */}
        <div>
          <label className="mr-2 font-medium">Select Report Range:</label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="border rounded px-3 py-1"
          >
            <option value="7">Last 7 Days</option>
            <option value="14">Last 14 Days</option>
            <option value="30">Last 30 Days</option>
          </select>
        </div>

        {/* Facility Filter (only for superadmin) */}
        {role === "superadmin" && (
          <div>
            <label className="mr-2 font-medium">Facility:</label>
            <select
              value={facilityFilter}
              onChange={(e) => setFacilityFilter(e.target.value)}
              className="border rounded px-3 py-1"
            >
              <option value="all">All Facilities</option>
              <option value="RCC">RCC</option>
              <option value="Hotel Rafael">Hotel Rafael</option>
            </select>
          </div>
        )}

        {/* Service Type Filter (only for housekeeping) */}
        {reportType === "housekeeping" && (
          <div>
            <label className="mr-2 font-medium">Service Type:</label>
            <select
              value={selectedServiceType}
              onChange={(e) => setSelectedServiceType(e.target.value)}
              className="border rounded px-3 py-1"
            >
              <option value="">All Service Types</option>
              {serviceTypes.map((type) => (
                <option key={type.id} value={type.name}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Housekeeper Filter (only for housekeeping) */}
        {reportType === "housekeeping" && (
          <div>
            <label className="mr-2 font-medium">Housekeeper:</label>
            <select
              value={selectedHousekeeper}
              onChange={(e) => setSelectedHousekeeper(e.target.value)}
              className="border rounded px-3 py-1"
            >
              <option value="">All Housekeepers</option>
              {housekeepers.map((hk) => (
                <option key={hk.id} value={hk.id}>
                  {hk.name} {role === 'superadmin' && hk.facility && `(${hk.facility})`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div ref={printRef}>
        {loading ? (
          <p>Loading reports...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : displayedReports.length === 0 ? (
          <p className="text-gray-500">
            No records found for the selected filters.
          </p>
        ) : (
          <>
            {reportType === "housekeeping" && (
              <div className="overflow-x-auto shadow rounded-lg">
                <table className="min-w-full border border-gray-200">
                  <thead className="bg-green-100 text-green-900">
                    <tr>
                      {role === "superadmin" && <th className="p-3 text-left border-b">Facility</th>}
                      <th className="p-3 text-left border-b">Guest Name</th>
                      <th className="p-3 text-left border-b">Service Type</th>
                      <th className="p-3 text-left border-b">Housekeeper</th>
                      <th className="p-3 text-left border-b">Room</th>
                      <th className="p-3 text-left border-b">Date</th>
                      <th className="p-3 text-left border-b">Time</th>
                      <th className="p-3 text-left border-b">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedReports.map((r, i) => {
                      const duration = getServiceDuration(r.service_type);
                      const endTime = calculateEndTime(r.time, duration);

                      return (
                        <tr key={i} className="hover:bg-gray-50">
                          {role === "superadmin" && (
                            <td className="p-3 border-b">
                              <span
                                className={`px-2 py-1 rounded text-xs font-semibold ${
                                  r.facility === "RCC"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {r.facility}
                              </span>
                            </td>
                          )}
                          <td className="p-3 border-b">
                            {r.guest_name || "N/A"}
                          </td>
                          <td className="p-3 border-b capitalize">
                            {r.service_type}
                          </td>
                          <td className="p-3 border-b">
                            {r.housekeeper_name || "Unassigned"}
                          </td>
                          <td className="p-3 border-b">
                            {r.room_number || "N/A"}
                          </td>
                          <td className="p-3 border-b">{r.date}</td>
                          <td className="p-3 border-b">
                            {r.time} - {endTime}
                          </td>
                          <td className="p-3 border-b capitalize">
                            {r.status}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {reportType === "borrowed" && (
              <div className="overflow-x-auto shadow rounded-lg">
                <table className="min-w-full border border-gray-200">
                  <thead className="bg-green-100 text-green-900">
                    <tr>
                      {role === "superadmin" && <th className="p-3 text-left border-b">Facility</th>}
                      <th className="p-3 text-left border-b">Guest Name</th>
                      <th className="p-3 text-left border-b">Item Name</th>
                      <th className="p-3 text-left border-b">Quantity</th>
                      <th className="p-3 text-left border-b">Amount (₱)</th>
                      <th className="p-3 text-left border-b">Date Borrowed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedReports.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {role === "superadmin" && (
                          <td className="p-3 border-b">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                r.facility === "RCC"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {r.facility}
                            </span>
                          </td>
                        )}
                        <td className="p-3 border-b">
                          {r.guest_name || "N/A"}
                        </td>
                        <td className="p-3 border-b">{r.item_name}</td>
                        <td className="p-3 border-b">{r.quantity}</td>
                        <td className="p-3 border-b">
                          {r.total_amount ? `₱${r.total_amount}` : "—"}
                        </td>
                        <td className="p-3 border-b">
                          {r.borrowed_date || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {!loading && displayedReports.length > 0 && (
        <div className="mt-6 flex justify-between items-center">
          <p className="text-gray-600">
            Showing {displayedReports.length} of {reports.length} records
          </p>
          <button
            onClick={handlePrint}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
          >
            Print Report
          </button>
        </div>
      )}
    </div>
  );
};

export default Reports;