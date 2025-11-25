import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  Calendar,
  User,
  CheckCircle,
  AlertCircle,
  Loader,
  XCircle,
  PlayCircle,
  ChevronLeft,
  ChevronRight,
  Star,
} from "lucide-react";

const MyRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState("");
  const [historyRequests, setHistoryRequests] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [historyFilter, setHistoryFilter] = useState("7days");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  useEffect(() => {
    fetchMyRequests();
    fetchHistory();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    fetchHistory();
  }, [historyFilter]);

  const fetchMyRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");

      if (!token) {
        setError("No authentication token found");
        setLoading(false);
        return;
      }

      console.log(
        "Fetching from:",
        `${API_URL}/housekeeping-requests/user/my-requests`
      );

      const response = await fetch(
        `${API_URL}/housekeeping-requests/user/my-requests`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            token: token,
          },
        }
      );

      console.log("Response status:", response.status);

      if (!response.ok) {
        const text = await response.text();
        console.error("Error response:", text);
        throw new Error(
          `Failed to fetch requests: ${response.status} ${response.statusText}`
        );
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        throw new Error(
          "Server returned non-JSON response. The endpoint might not exist."
        );
      }

      const data = await response.json();
      console.log("Received data:", data);

      setRequests(data.requests || []);
      setCurrentDate(data.date || new Date().toISOString().split("T")[0]);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      setHistoryError(null);

      const token = localStorage.getItem("token");

      if (!token) {
        setHistoryError("No authentication token found");
        setHistoryLoading(false);
        return;
      }

      const response = await fetch(
        `${API_URL}/housekeeping-requests/user/history?filter=${historyFilter}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            token: token,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.status}`);
      }

      const data = await response.json();
      setHistoryRequests(data.requests || []);
    } catch (err) {
      console.error("Fetch history error:", err);
      setHistoryError(err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      pending: {
        label: "Pending",
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        icon: AlertCircle,
        iconColor: "text-yellow-600",
      },
      approved: {
        label: "Approved",
        color: "bg-blue-100 text-blue-800 border-blue-200",
        icon: CheckCircle,
        iconColor: "text-blue-600",
      },
      in_progress: {
        label: "In Progress",
        color: "bg-purple-100 text-purple-800 border-purple-200",
        icon: PlayCircle,
        iconColor: "text-purple-600",
      },
      completed: {
        label: "Completed",
        color: "bg-green-100 text-green-800 border-green-200",
        icon: CheckCircle,
        iconColor: "text-green-600",
      },
      cancelled: {
        label: "Cancelled",
        color: "bg-red-100 text-red-800 border-red-200",
        icon: XCircle,
        iconColor: "text-red-600",
      },
    };
    return configs[status] || configs.pending;
  };

  const formatTime = (time) => {
    if (!time) return "N/A";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const totalPages = Math.ceil(historyRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentHistoryRequests = historyRequests.slice(startIndex, endIndex);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleRateService = () => {
    navigate("/guest");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your requests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full">
          <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 text-center mb-2">
            Error Loading Requests
          </h3>
          <p className="text-red-700 text-center text-sm mb-4">{error}</p>
          <button
            onClick={fetchMyRequests}
            className="mt-4 w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl">
        <div className="mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-green-900 mb-4 sm:mb-6">
            My Requests
          </h2>
          <p className="text-gray-600">
            View all your housekeeping requests for today
          </p>
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(currentDate)}</span>
          </div>
        </div>

        {requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No requests today
            </h3>
            <p className="text-gray-600">
              You haven't made any housekeeping requests for today yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => {
              const statusConfig = getStatusConfig(request.status);
              const StatusIcon = statusConfig.icon;

              return (
                <div
                  key={request.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.color}`}
                    >
                      <StatusIcon
                        className={`w-4 h-4 ${statusConfig.iconColor}`}
                      />
                      {statusConfig.label}
                    </div>
                    <span className="text-sm text-gray-500">
                      Room {request.roomNumber}
                    </span>
                  </div>

                  <div className="mb-4">
                    <span className="text-sm text-gray-500">Service Request</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-indigo-100 rounded-lg p-2">
                        <CheckCircle className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                          Service Type
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {request.serviceType}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="bg-blue-100 rounded-lg p-2">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                          Housekeeper
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {request.housekeeperName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="bg-green-100 rounded-lg p-2">
                        <Clock className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                          Service Time
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {formatTime(request.preferredTime)} -{" "}
                          {formatTime(request.endTime)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="bg-purple-100 rounded-lg p-2">
                        <Calendar className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                          Date
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(request.preferredDate)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="bg-gray-100 rounded-lg p-2">
                        <Clock className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                          Requested At
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(request.createdAt).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                              timeZone: "Asia/Manila",
                            }
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {request.status === "completed" && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={handleRateService}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm"
                      >
                        <Star className="w-4 h-4" />
                        Rate this service
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {requests.length > 0 && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Total requests today:</strong> {requests.length} of 3
              maximum
            </p>
          </div>
        )}

        <div className="mt-12 mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-green-900 mb-4">
            Service History
          </h2>
          <p className="text-gray-600 mb-4">
            View your past housekeeping requests
          </p>

          <div className="flex gap-2 mb-6 flex-wrap">
            <button
              onClick={() => setHistoryFilter("7days")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                historyFilter === "7days"
                  ? "bg-green-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setHistoryFilter("30days")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                historyFilter === "30days"
                  ? "bg-green-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setHistoryFilter("all")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                historyFilter === "all"
                  ? "bg-green-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              All Time
            </button>
          </div>

          {historyLoading ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading history...</p>
            </div>
          ) : historyError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-800 text-center mb-2">
                Error Loading History
              </h3>
              <p className="text-red-700 text-center text-sm mb-4">
                {historyError}
              </p>
              <button
                onClick={fetchHistory}
                className="mt-4 w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition"
              >
                Try Again
              </button>
            </div>
          ) : historyRequests.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No history found
              </h3>
              <p className="text-gray-600">
                You don't have any requests in this time period.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {currentHistoryRequests.map((request) => {
                  const statusConfig = getStatusConfig(request.status);
                  const StatusIcon = statusConfig.icon;

                  return (
                    <div
                      key={request.id}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.color}`}
                        >
                          <StatusIcon
                            className={`w-4 h-4 ${statusConfig.iconColor}`}
                          />
                          {statusConfig.label}
                        </div>
                        <span className="text-sm text-gray-500">
                          Room {request.roomNumber}
                        </span>
                      </div>

                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {request.serviceType}
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                          <div className="bg-blue-100 rounded-lg p-2">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                              Housekeeper
                            </p>
                            <p className="text-sm font-medium text-gray-900">
                              {request.housekeeperName}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="bg-green-100 rounded-lg p-2">
                            <Clock className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                              Service Time
                            </p>
                            <p className="text-sm font-medium text-gray-900">
                              {formatTime(request.preferredTime)} -{" "}
                              {formatTime(request.endTime)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="bg-purple-100 rounded-lg p-2">
                            <Calendar className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                              Date
                            </p>
                            <p className="text-sm font-medium text-gray-900">
                              {formatDate(request.preferredDate)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="bg-gray-100 rounded-lg p-2">
                            <Clock className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                              Requested At
                            </p>
                            <p className="text-sm font-medium text-gray-900">
                              {new Date(request.createdAt).toLocaleTimeString(
                                "en-US",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                  timeZone: "Asia/Manila",
                                }
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {request.status === "completed" && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <button
                            onClick={handleRateService}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm"
                          >
                            <Star className="w-4 h-4" />
                            Rate this service
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 p-4 gap-4">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition ${
                      currentPage === 1
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>

                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-medium text-gray-700">
                      Page {currentPage} of {totalPages}
                    </span>
                    <span className="text-xs text-gray-500">
                      Showing {startIndex + 1}-{Math.min(endIndex, historyRequests.length)} of {historyRequests.length}
                    </span>
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition ${
                      currentPage === totalPages
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <strong>Total historical requests:</strong>{" "}
                  {historyRequests.length}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyRequests;