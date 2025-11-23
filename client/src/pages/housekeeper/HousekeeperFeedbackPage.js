import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const HousekeeperFeedbackPage = () => {
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
  }, []);

  return (
    <div className="p-4 sm:p-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <button
          onClick={() => navigate('/housekeeper')}
          className="p-2 hover:bg-gray-100 rounded-full transition"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-green-700" />
        </button>
        <h2 className="text-xl sm:text-2xl font-poppins font-bold text-green-900">
          All Guest Feedback
        </h2>
      </div>

      {loading ? (
        <p className="text-gray-600 text-sm sm:text-base">Loading feedback...</p>
      ) : feedbacks.length === 0 ? (
        <div className="bg-white rounded-xl p-6 sm:p-8 shadow-md text-center">
          <p className="text-gray-600 text-sm sm:text-base">No feedback assigned to you yet.</p>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
              <p className="text-xs sm:text-sm text-gray-500 uppercase mb-1">Total Feedback</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-800">{feedbacks.length}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
              <p className="text-xs sm:text-sm text-gray-500 uppercase mb-1">Average Rating</p>
              <p className="text-2xl sm:text-3xl font-bold text-yellow-600">
                {(feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1)} ⭐
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
              <p className="text-xs sm:text-sm text-gray-500 uppercase mb-1">5-Star Ratings</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-800">
                {feedbacks.filter(f => f.rating === 5).length}
              </p>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
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
                  {feedbacks.map((f, index) => (
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
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {feedbacks.map((f) => (
              <div 
                key={f.id} 
                className="border border-gray-200 rounded-lg p-3 bg-white shadow-sm"
              >
                <div className="space-y-2">
                  {/* Header: Guest and Rating */}
                  <div className="flex justify-between items-start gap-2 pb-2 border-b border-gray-200">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 uppercase">Guest</p>
                      <p className="font-semibold text-gray-800 text-sm break-words">
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
                      <p className="text-sm text-gray-700 capitalize break-words">
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
        </>
      )}
    </div>
  );
};

export default HousekeeperFeedbackPage;