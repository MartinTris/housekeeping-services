import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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
        ? "http://localhost:5000/feedback/admin/system"
        : "http://localhost:5000/feedback/admin";
        
      const res = await fetch(endpoint, {
        headers: { token: localStorage.token },
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbacks(data.slice(0, 3)); // Only get 3 most recent
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
    <div className="bg-white rounded-xl shadow-md p-6 max-w-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-green-900">
          Recent Feedback
        </h2>
        
        {isSuperAdmin && (
          <div className="flex gap-1 bg-gray-100 rounded-md p-0.5">
            <button
              onClick={() => setFeedbackType("service")}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                feedbackType === "service"
                  ? "bg-green-600 text-white"
                  : "text-gray-600 hover:bg-gray-200"
              }`}
            >
              Service
            </button>
            <button
              onClick={() => setFeedbackType("system")}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                feedbackType === "system"
                  ? "bg-green-600 text-white"
                  : "text-gray-600 hover:bg-gray-200"
              }`}
            >
              System
            </button>
          </div>
        )}
      </div>

      {feedbacks.length === 0 ? (
        <p className="text-gray-500 text-center text-sm">No feedback available yet.</p>
      ) : (
        <>
          <ul className="divide-y divide-gray-200">
            {feedbacks.map((f) => (
              <li key={f.id} className="flex justify-between items-center py-3">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="font-semibold text-gray-800 truncate">
                    {f.guest_name || "Anonymous"}
                  </p>
                  {feedbackType === "service" && (
                    <p className="text-sm text-gray-500 truncate">
                      {f.housekeeper_name || "N/A"}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-yellow-600">
                    ⭐ {f.rating}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          
          <button 
            onClick={() => navigate(`/admin/feedback?type=${feedbackType}`)}
            className="w-full mt-4 text-center text-sm text-green-600 hover:text-green-700 font-semibold transition-colors"
          >
            View More →
          </button>
        </>
      )}
    </div>
  );
};

export default AdminFeedbackWidget;