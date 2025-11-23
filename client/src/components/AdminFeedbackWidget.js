import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AdminFeedbackWidget = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [feedbackType, setFeedbackType] = useState("service");
  const navigate = useNavigate();

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
        ? `${API_URL}/feedback/admin/system`
        : `${API_URL}/feedback/admin`;
        
      const res = await fetch(endpoint, {
        headers: { token: localStorage.token },
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbacks(data.slice(0, 3));
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
    const interval = setInterval(fetchFeedbacks, 10000);
    return () => clearInterval(interval);
  }, [feedbackType]);

  const isSuperAdmin = userRole === "superadmin";

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <p className="text-gray-600 text-center">Loading feedback...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 max-w-md">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-green-900">
          Recent Feedback
        </h2>
        
        {isSuperAdmin && (
          <div className="flex gap-1 bg-gray-100 rounded-md p-0.5 w-full sm:w-auto">
            <button
              onClick={() => setFeedbackType("service")}
              className={`flex-1 sm:flex-none px-3 sm:px-2 py-1.5 sm:py-1 text-xs rounded font-medium transition-colors ${
                feedbackType === "service"
                  ? "bg-green-600 text-white"
                  : "text-gray-600 hover:bg-gray-200 active:bg-gray-300"
              }`}
            >
              Service
            </button>
            <button
              onClick={() => setFeedbackType("system")}
              className={`flex-1 sm:flex-none px-3 sm:px-2 py-1.5 sm:py-1 text-xs rounded font-medium transition-colors ${
                feedbackType === "system"
                  ? "bg-green-600 text-white"
                  : "text-gray-600 hover:bg-gray-200 active:bg-gray-300"
              }`}
            >
              System
            </button>
          </div>
        )}
      </div>

      {feedbacks.length === 0 ? (
        <p className="text-gray-500 text-center text-sm py-4">No feedback available yet.</p>
      ) : (
        <>
          <ul className="divide-y divide-gray-200">
            {feedbacks.map((f) => (
              <li key={f.id} className="flex justify-between items-center py-3 gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm sm:text-base truncate">
                    {f.guest_name || "Anonymous"}
                  </p>
                  {feedbackType === "service" && (
                    <p className="text-xs sm:text-sm text-gray-500 truncate">
                      {f.housekeeper_name || "N/A"}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-base sm:text-lg font-bold text-yellow-600 whitespace-nowrap">
                    ⭐ {f.rating}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          
          <button 
            onClick={() => navigate(`/admin/feedback?type=${feedbackType}`)}
            className="w-full mt-4 py-2 sm:py-0 text-center text-sm text-green-600 hover:text-green-700 active:text-green-800 font-semibold transition-colors"
          >
            View More →
          </button>
        </>
      )}
    </div>
  );
};

export default AdminFeedbackWidget;