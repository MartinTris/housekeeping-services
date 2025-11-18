import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

const FeedbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [feedbacks, setFeedbacks] = useState([]);
  const [filteredFeedbacks, setFilteredFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [feedbackType, setFeedbackType] = useState(searchParams.get("type") || "service");
  
  // Filter states
  const [guestFilter, setGuestFilter] = useState("");
  const [housekeeperFilter, setHousekeeperFilter] = useState("");
  const [sortOrder, setSortOrder] = useState("desc"); // desc = high to low, asc = low to high

  const fetchUserRole = () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role);
      }
    } catch (err) {
      console.error("Error fetching user role:", err);
    }
  };

  const fetchFeedbacks = async () => {
    try {
      const endpoint = feedbackType === "system" 
        ? "http://localhost:5000/feedback/admin/system"
        : "http://localhost:5000/feedback/admin";
        
      const res = await fetch(endpoint, {
        headers: { token: localStorage.token },
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
  }, []);

  useEffect(() => {
    fetchFeedbacks();
  }, [feedbackType]);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...feedbacks];

    // Filter by guest name (exact match)
    if (guestFilter) {
      filtered = filtered.filter(f => 
        f.guest_name === guestFilter
      );
    }

    // Filter by housekeeper name (exact match, only for service feedback)
    if (housekeeperFilter && feedbackType === "service") {
      filtered = filtered.filter(f => 
        f.housekeeper_name === housekeeperFilter
      );
    }

    // Sort by rating
    filtered.sort((a, b) => {
      if (sortOrder === "desc") {
        return b.rating - a.rating; // High to low
      } else {
        return a.rating - b.rating; // Low to high
      }
    });

    setFilteredFeedbacks(filtered);
  }, [guestFilter, housekeeperFilter, sortOrder, feedbacks, feedbackType]);

  const isSuperAdmin = userRole === "superadmin";

  // Get unique names for dropdowns
  const uniqueGuests = [...new Set(feedbacks.map(f => f.guest_name).filter(Boolean))];
  const uniqueHousekeepers = [...new Set(feedbacks.map(f => f.housekeeper_name).filter(Boolean))];

  return (
    <div className="p-6">
      {/* Back Link */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-green-600 hover:text-green-700 font-medium mb-4 transition-colors"
      >
        ← Back
      </button>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Guest Feedback</h2>
        
        {isSuperAdmin && (
          <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setFeedbackType("service")}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                feedbackType === "service"
                  ? "bg-green-600 text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Service Feedback
            </button>
            <button
              onClick={() => setFeedbackType("system")}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                feedbackType === "system"
                  ? "bg-green-600 text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              System Feedback
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Guest Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Guest
            </label>
            <select
              value={guestFilter}
              onChange={(e) => setGuestFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">All Guests</option>
              {uniqueGuests.map((guest) => (
                <option key={guest} value={guest}>{guest}</option>
              ))}
            </select>
          </div>

          {/* Housekeeper Filter - Only for service feedback */}
          {feedbackType === "service" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Housekeeper
              </label>
              <select
                value={housekeeperFilter}
                onChange={(e) => setHousekeeperFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">All Housekeepers</option>
                {uniqueHousekeepers.map((housekeeper) => (
                  <option key={housekeeper} value={housekeeper}>{housekeeper}</option>
                ))}
              </select>
            </div>
          )}

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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

      {/* Feedback Table */}
      {loading ? (
        <p className="text-gray-600">Loading feedback...</p>
      ) : filteredFeedbacks.length === 0 ? (
        <p className="text-gray-600">No feedback found.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Guest</th>
                {isSuperAdmin && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Facility</th>}
                {feedbackType === "service" && (
                  <>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Housekeeper</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Room</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Service Type</th>
                  </>
                )}
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Rating</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Comment</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredFeedbacks.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-800">{f.guest_name || "N/A"}</td>
                  {isSuperAdmin && (
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        f.facility === "RCC" 
                          ? "bg-blue-100 text-blue-800" 
                          : "bg-purple-100 text-purple-800"
                      }`}>
                        {f.facility || "Unknown"}
                      </span>
                    </td>
                  )}
                  {feedbackType === "service" && (
                    <>
                      <td className="px-4 py-3 text-sm text-gray-800 capitalize">
                        {f.housekeeper_name || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">{f.room_number || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-800 capitalize">
                        {f.service_type || "—"}
                      </td>
                    </>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-semibold text-gray-800">{f.rating}</span>
                      <span className="text-yellow-500">⭐</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{f.comment || "No comment"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {new Date(f.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FeedbackPage;