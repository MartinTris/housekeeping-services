import { useEffect, useState } from "react";

const AdminFeedbackWidget = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [feedbackType, setFeedbackType] = useState("service"); // "service" or "system"

  const fetchUserRole = () => {
    try {
      // Decode JWT token to get user role
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
      }
      setLoading(false);
    } catch (err) {
      console.error("Error fetching feedbacks:", err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserRole(); // Fetch role on mount
  }, []);

  useEffect(() => {
    fetchFeedbacks();
    const interval = setInterval(fetchFeedbacks, 10000);
    return () => clearInterval(interval);
  }, [feedbackType]);

  const isSuperAdmin = userRole === "superadmin";

  return (
    <div className="mt-10">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-poppins text-green-900 font-bold">
          Guest Feedback
        </h3>
        
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

      {loading ? (
        <p className="text-gray-600">Loading feedback...</p>
      ) : feedbacks.length === 0 ? (
        <p className="text-gray-600">No feedback available yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-300">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2 border">Guest</th>
                {isSuperAdmin && <th className="p-2 border">Facility</th>}
                {feedbackType === "service" && (
                  <>
                    <th className="p-2 border">Housekeeper</th>
                    <th className="p-2 border">Room</th>
                    <th className="p-2 border">Service Type</th>
                  </>
                )}
                <th className="p-2 border">Rating</th>
                <th className="p-2 border">Comment</th>
                <th className="p-2 border">Date</th>
              </tr>
            </thead>
            <tbody>
              {feedbacks.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="p-2 border">{f.guest_name || "N/A"}</td>
                  {isSuperAdmin && (
                    <td className="p-2 border">
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
                      <td className="p-2 border capitalize">
                        {f.housekeeper_name || "N/A"}
                      </td>
                      <td className="p-2 border">{f.room_number || "—"}</td>
                      <td className="p-2 border capitalize">
                        {f.service_type || "—"}
                      </td>
                    </>
                  )}
                  <td className="p-2 border text-center">{f.rating} ⭐</td>
                  <td className="p-2 border">{f.comment || "No comment"}</td>
                  <td className="p-2 border whitespace-nowrap">
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

export default AdminFeedbackWidget;