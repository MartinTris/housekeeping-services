import { useEffect, useState, useRef } from "react";
import { Printer } from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

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
  const [paymentFilter, setPaymentFilter] = useState("all");

  useEffect(() => {
    const userRole = localStorage.getItem("role");
    setRole(userRole);
  }, []);

  const fetchHousekeepers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/reports/housekeepers`, {
        headers: { token: localStorage.token },
      });
      const data = await res.json();
      setHousekeepers(data);
    } catch (err) {
      console.error("Error fetching housekeepers:", err);
    }
  };

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

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError("");

      let url = "";

      if (reportType === "housekeeping") {
        url = `${API_URL}/api/admin/reports?days=${days}&type=${reportType}`;
        if (selectedHousekeeper) {
          url += `&housekeeper_id=${selectedHousekeeper}`;
        }
      } else if (reportType === "borrowed") {
        url = `${API_URL}/api/admin/reports/borrowed-items?days=${days}`;
        if (paymentFilter !== "all") {
          url += `&payment_status=${paymentFilter}`;
        }
      }

      const res = await fetch(url, { headers: { token: localStorage.token } });
      if (!res.ok) throw new Error("Failed to fetch reports");

      const data = await res.json();
      let filteredReports = data.data || [];

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

  const calculateEndTime = (startTime, serviceDuration) => {
    if (!startTime || !serviceDuration) return startTime;

    try {
      const [time, period] = startTime.split(" ");
      let [hours, minutes] = time.split(":").map(Number);

      if (period === "PM" && hours !== 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;

      const totalMinutes = hours * 60 + minutes + serviceDuration;
      let endHours = Math.floor(totalMinutes / 60) % 24;
      const endMinutes = totalMinutes % 60;

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
  }, [
    days,
    selectedHousekeeper,
    selectedServiceType,
    reportType,
    paymentFilter,
  ]);

  const displayedReports = reports.filter((report) => {
    if (role !== "superadmin" || facilityFilter === "all") return true;
    return report.facility === facilityFilter;
  });

  const handlePrint = () => {
    if (!displayedReports.length) {
      alert("No report data to print.");
      return;
    }

    const tableElement = printRef.current.querySelector('table');
    if (!tableElement) {
      alert("No table found to print.");
      return;
    }
    const printContent = tableElement.outerHTML;

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
            .status-badge {
              padding: 2px 6px;
              border-radius: 3px;
              font-size: 12px;
              font-weight: bold;
            }
            .status-paid {
              background-color: #d1fae5;
              color: #065f46;
            }
            .status-unpaid {
              background-color: #fef3c7;
              color: #92400e;
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
            ${
              reportType === "borrowed" && paymentFilter !== "all"
                ? `<p><strong>Payment Status:</strong> ${
                    paymentFilter === "paid" ? "Paid" : "Unpaid"
                  }</p>`
                : ""
            }
            ${
              role === "superadmin" && facilityFilter !== "all"
                ? `<p><strong>Filtered by:</strong> ${facilityFilter}</p>`
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
      <h1 className="text-xl sm:text-2xl font-bold mb-2 text-green-900 font-poppins">
        {reportType === "housekeeping"
          ? "Housekeeping Reports"
          : "Borrowed Items Reports"}
      </h1>

      {facility && (
        <p className="text-sm sm:text-base text-gray-600 mb-4">
          Facility: <span className="font-medium">{facility}</span>
        </p>
      )}

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          <label className="font-medium text-sm sm:text-base">
            Select Report Type:
          </label>
          <select
            value={reportType}
            onChange={(e) => {
              setReportType(e.target.value);
              setSelectedServiceType("");
              setPaymentFilter("all");
            }}
            className="border rounded px-3 py-1.5 sm:py-1 text-sm sm:text-base"
          >
            <option value="housekeeping">Housekeeping</option>
            <option value="borrowed">Borrowed Items</option>
          </select>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          <label className="font-medium text-sm sm:text-base">
            Select Report Range:
          </label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="border rounded px-3 py-1.5 sm:py-1 text-sm sm:text-base"
          >
            <option value="7">Last 7 Days</option>
            <option value="14">Last 14 Days</option>
            <option value="30">Last 30 Days</option>
          </select>
        </div>

        {role === "superadmin" && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <label className="font-medium text-sm sm:text-base">
              Facility:
            </label>
            <select
              value={facilityFilter}
              onChange={(e) => setFacilityFilter(e.target.value)}
              className="border rounded px-3 py-1.5 sm:py-1 text-sm sm:text-base"
            >
              <option value="all">All Facilities</option>
              <option value="RCC">RCC</option>
              <option value="Hotel Rafael">Hotel Rafael</option>
            </select>
          </div>
        )}

        {reportType === "housekeeping" && (
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
        )}

        {reportType === "housekeeping" && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <label className="font-medium text-sm sm:text-base">
              Housekeeper:
            </label>
            <select
              value={selectedHousekeeper}
              onChange={(e) => setSelectedHousekeeper(e.target.value)}
              className="border rounded px-3 py-1.5 sm:py-1 text-sm sm:text-base"
            >
              <option value="">All Housekeepers</option>
              {housekeepers.map((hk) => (
                <option key={hk.id} value={hk.id}>
                  {hk.name}{" "}
                  {role === "superadmin" && hk.facility && `(${hk.facility})`}
                </option>
              ))}
            </select>
          </div>
        )}

        {reportType === "borrowed" && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <label className="font-medium text-sm sm:text-base">
              Payment Status:
            </label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="border rounded px-3 py-1.5 sm:py-1 text-sm sm:text-base"
            >
              <option value="all">All</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
        )}
      </div>

      <div ref={printRef}>
        {loading ? (
          <p className="text-sm sm:text-base">Loading reports...</p>
        ) : error ? (
          <p className="text-red-500 text-sm sm:text-base">{error}</p>
        ) : displayedReports.length === 0 ? (
          <p className="text-gray-500 text-sm sm:text-base">
            No records found for the selected filters.
          </p>
        ) : (
          <>
            {reportType === "housekeeping" && (
              <>
                <div className="block lg:hidden space-y-3">
                  {displayedReports.map((r, i) => {
                    const duration = getServiceDuration(r.service_type);
                    const endTime = calculateEndTime(r.time, duration);

                    return (
                      <div
                        key={i}
                        className="bg-white border rounded-lg p-4 shadow hover:shadow-md transition"
                      >
                        {role === "superadmin" && (
                          <div className="mb-2">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                r.facility === "RCC"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {r.facility}
                            </span>
                          </div>
                        )}

                        <div className="space-y-2">
                          <div>
                            <span className="text-xs text-gray-500 uppercase">
                              Guest Name
                            </span>
                            <p className="font-semibold text-sm break-words">
                              {r.guest_name || "N/A"}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-xs text-gray-500 uppercase">
                                Service Type
                              </span>
                              <p className="text-sm capitalize break-words">
                                {r.service_type}
                              </p>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500 uppercase">
                                Status
                              </span>
                              <p className="text-sm capitalize">{r.status}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-xs text-gray-500 uppercase">
                                Housekeeper
                              </span>
                              <p className="text-sm break-words">
                                {r.housekeeper_name || "Unassigned"}
                              </p>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500 uppercase">
                                Room
                              </span>
                              <p className="text-sm">
                                {r.room_number || "N/A"}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-xs text-gray-500 uppercase">
                                Date
                              </span>
                              <p className="text-sm">{r.date}</p>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500 uppercase">
                                Time
                              </span>
                              <p className="text-sm">
                                {r.time} - {endTime}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="hidden lg:block overflow-x-auto shadow rounded-lg">
                  <table className="min-w-full border border-gray-200">
                    <thead className="bg-green-100 text-green-900">
                      <tr>
                        {role === "superadmin" && (
                          <th className="p-3 text-left border-b">Facility</th>
                        )}
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
              </>
            )}

            {reportType === "borrowed" && (
              <>
                <div className="block lg:hidden space-y-3">
                  {displayedReports.map((r, i) => (
                    <div
                      key={i}
                      className="bg-white border rounded-lg p-4 shadow hover:shadow-md transition"
                    >
                      {role === "superadmin" && (
                        <div className="mb-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              r.facility === "RCC"
                                ? "bg-green-100 text-green-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {r.facility}
                          </span>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div>
                          <span className="text-xs text-gray-500 uppercase">
                            Guest Name
                          </span>
                          <p className="font-semibold text-sm break-words">
                            {r.guest_name || "N/A"}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-xs text-gray-500 uppercase">
                              Room
                            </span>
                            <p className="text-sm">{r.room_number || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 uppercase">
                              Quantity
                            </span>
                            <p className="text-sm">{r.quantity}</p>
                          </div>
                        </div>

                        <div>
                          <span className="text-xs text-gray-500 uppercase">
                            Item Name
                          </span>
                          <p className="text-sm break-words">{r.item_name}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-xs text-gray-500 uppercase">
                              Amount
                            </span>
                            <p className="text-sm font-semibold">
                              {r.total_amount ? `₱${r.total_amount}` : "—"}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 uppercase">
                              Payment Status
                            </span>
                            <span
                              className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                                r.is_paid
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {r.is_paid ? "Paid" : "Unpaid"}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-xs text-gray-500 uppercase">
                            Date Borrowed
                          </span>
                          <p className="text-sm">{r.borrowed_date || "—"}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden lg:block overflow-x-auto shadow rounded-lg">
                  <table className="min-w-full border border-gray-200">
                    <thead className="bg-green-100 text-green-900">
                      <tr>
                        {role === "superadmin" && (
                          <th className="p-3 text-left border-b">Facility</th>
                        )}
                        <th className="p-3 text-left border-b">Guest Name</th>
                        <th className="p-3 text-left border-b">Room</th>
                        <th className="p-3 text-left border-b">Item Name</th>
                        <th className="p-3 text-left border-b">Quantity</th>
                        <th className="p-3 text-left border-b">Amount (₱)</th>
                        <th className="p-3 text-left border-b">
                          Date Borrowed
                        </th>
                        <th className="p-3 text-left border-b">
                          Payment Status
                        </th>
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
                          <td className="p-3 border-b">
                            {r.room_number || "N/A"}
                          </td>
                          <td className="p-3 border-b">{r.item_name}</td>
                          <td className="p-3 border-b">{r.quantity}</td>
                          <td className="p-3 border-b">
                            {r.total_amount ? `₱${r.total_amount}` : "—"}
                          </td>
                          <td className="p-3 border-b">
                            {r.borrowed_date || "—"}
                          </td>
                          <td className="p-3 border-b">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                r.is_paid
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {r.is_paid ? "Paid" : "Unpaid"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {!loading && displayedReports.length > 0 && (
        <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <p className="text-sm sm:text-base text-gray-600">
            Showing {displayedReports.length} of {reports.length} records
          </p>
          <button
            onClick={handlePrint}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 sm:px-6 py-2.5 rounded-full shadow-lg hover:scale-105 hover:from-green-700 hover:to-emerald-700 transition-all duration-300 text-sm sm:text-base font-medium"
          >
            <Printer size={18} />
            <span>Print Report</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default Reports;
