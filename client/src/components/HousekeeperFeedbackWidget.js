import { useEffect, useState } from "react";

const HousekeeperFeedbackWidget = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFeedbacks = async () => {
    try {
      const res = await fetch("http://localhost:5000/feedback/housekeeper", {
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
    <div className="mt-10">
      <h3 className="text-xl font-semibold mb-4">Guest Feedback</h3>

      {loading ? (
        <p className="text-gray-600">Loading feedback...</p>
      ) : feedbacks.length === 0 ? (
        <p className="text-gray-600">No feedback assigned to you yet.</p>
      ) : (
        <table className="w-full border border-gray-300">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2 border">Guest</th>
              <th className="p-2 border">Room</th>
              <th className="p-2 border">Service Type</th>
              <th className="p-2 border">Rating</th>
              <th className="p-2 border">Comment</th>
              <th className="p-2 border">Date</th>
            </tr>
          </thead>
          <tbody>
            {feedbacks.map((f) => (
              <tr key={f.id}>
                <td className="p-2 border">{f.guest_name || "N/A"}</td>
                <td className="p-2 border">{f.room_number || "—"}</td>
                <td className="p-2 border capitalize">{f.service_type || "—"}</td>
                <td className="p-2 border text-center">{f.rating} ⭐</td>
                <td className="p-2 border">{f.comment || "No comment"}</td>
                <td className="p-2 border">
                  {new Date(f.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default HousekeeperFeedbackWidget;
