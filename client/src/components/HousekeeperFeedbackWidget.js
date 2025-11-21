import { useEffect, useState } from "react";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const HousekeeperFeedbackWidget = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
      <h3 className="text-xl font-semibold text-green-900 mb-4 flex items-center gap-2">
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
        <p className="text-gray-600">Loading feedback...</p>
      ) : feedbacks.length === 0 ? (
        <p className="text-gray-600">No feedback assigned to you yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-green-50 to-emerald-50 text-left">
                <th className="p-3 border border-gray-200 font-semibold text-green-800">Guest</th>
                <th className="p-3 border border-gray-200 font-semibold text-green-800">Room</th>
                <th className="p-3 border border-gray-200 font-semibold text-green-800">Service Type</th>
                <th className="p-3 border border-gray-200 font-semibold text-green-800">Rating</th>
                <th className="p-3 border border-gray-200 font-semibold text-green-800">Comment</th>
                <th className="p-3 border border-gray-200 font-semibold text-green-800">Date</th>
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
                  <td className="p-3 border border-gray-200 text-gray-700">{f.guest_name || "N/A"}</td>
                  <td className="p-3 border border-gray-200 text-gray-700">{f.room_number || "—"}</td>
                  <td className="p-3 border border-gray-200 capitalize text-gray-700">{f.service_type || "—"}</td>
                  <td className="p-3 border border-gray-200 text-center">
                    <span className="inline-flex items-center gap-1 font-semibold text-yellow-600">
                      {f.rating} ⭐
                    </span>
                  </td>
                  <td className="p-3 border border-gray-200 text-gray-700">{f.comment || "No comment"}</td>
                  <td className="p-3 border border-gray-200 text-gray-600 text-sm">
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

export default HousekeeperFeedbackWidget;