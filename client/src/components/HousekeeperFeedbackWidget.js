import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const HousekeeperFeedbackWidget = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchFeedbacks = async () => {
    try {
      const res = await fetch(`${API_URL}/feedback/housekeeper`, {
        headers: { token: localStorage.token },
      });
      const data = await res.json();
      if (res.ok) setFeedbacks(data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching housekeeper feedback:", err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();

    const interval = setInterval(fetchFeedbacks, 300000);
    return () => clearInterval(interval);
  }, []);

  // Limit to 3 feedbacks
  const displayedFeedbacks = feedbacks.slice(0, 3);

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-md border border-gray-100">
      <h3 className="text-lg sm:text-xl font-semibold text-green-900 mb-3 sm:mb-4 flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 text-green-700"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
        Guest Feedback
      </h3>

      {loading ? (
        <p className="text-gray-600 text-sm sm:text-base">Loading feedback...</p>
      ) : displayedFeedbacks.length === 0 ? (
        <p className="text-gray-600 text-sm sm:text-base">No feedback assigned to you yet.</p>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-green-50 to-emerald-50 text-left">
                  <th className="p-3 border border-gray-200 font-semibold text-green-800 text-sm">Guest</th>
                  <th className="p-3 border border-gray-200 font-semibold text-green-800 text-sm">Room</th>
                  <th className="p-3 border border-gray-200 font-semibold text-green-800 text-sm">Service Type</th>
                  <th className="p-3 border border-gray-200 font-semibold text-green-800 text-sm">Rating</th>
                  <th className="p-3 border border-gray-200 font-semibold text-green-800 text-sm">Comment</th>
                  <th className="p-3 border border-gray-200 font-semibold text-green-800 text-sm">Date</th>
                </tr>
              </thead>
              <tbody>
                {displayedFeedbacks.map((f, index) => (
                  <tr 
                    key={f.id} 
                    className={`${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-green-50 transition-colors`}
                  >
                    <td className="p-3 border border-gray-200 text-gray-700 text-sm">{f.guest_name || "N/A"}</td>
                    <td className="p-3 border border-gray-200 text-gray-700 text-sm">{f.room_number || "—"}</td>
                    <td className="p-3 border border-gray-200 capitalize text-gray-700 text-sm">{f.service_type || "—"}</td>
                    <td className="p-3 border border-gray-200 text-center">
                      <span className="inline-flex items-center gap-1 font-semibold text-yellow-600 text-sm">
                        {f.rating} ⭐
                      </span>
                    </td>
                    <td className="p-3 border border-gray-200 text-gray-700 text-sm">{f.comment || "No comment"}</td>
                    <td className="p-3 border border-gray-200 text-gray-600 text-sm">
                      {new Date(f.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {displayedFeedbacks.map((f) => (
              <div 
                key={f.id} 
                className="border border-gray-200 rounded-lg p-3 bg-gradient-to-br from-white to-gray-50 shadow-sm"
              >
                <div className="space-y-2">
                  {/* Header: Guest and Rating */}
                  <div className="flex justify-between items-start gap-2 pb-2 border-b border-gray-200">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 uppercase">Guest</p>
                      <p className="font-semibold text-gray-800 text-sm truncate">
                        {f.guest_name || "N/A"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="font-bold text-yellow-600 text-base">{f.rating}</span>
                      <span className="text-yellow-500 text-lg">⭐</span>
                    </div>
                  </div>

                  {/* Room and Service Details */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Room</p>
                      <p className="text-sm text-gray-700">{f.room_number || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Service Type</p>
                      <p className="text-sm text-gray-700 capitalize truncate">
                        {f.service_type || "—"}
                      </p>
                    </div>
                  </div>

                  {/* Comment */}
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500 uppercase mb-1">Comment</p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {f.comment || "No comment"}
                    </p>
                  </div>

                  {/* Date */}
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      {new Date(f.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* View More Button */}
          {feedbacks.length > 3 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => navigate('/housekeeper/feedback')}
                className="px-4 sm:px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-full shadow-lg hover:scale-105 hover:from-green-700 hover:to-emerald-700 transition-all duration-300 text-sm sm:text-base"
              >
                View More Feedback
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HousekeeperFeedbackWidget;