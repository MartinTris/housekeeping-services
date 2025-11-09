import { useEffect, useState } from "react";

const FeedbackWidget = () => {
  const [recentCompleted, setRecentCompleted] = useState([]);
  const [feedbackModal, setFeedbackModal] = useState({ show: false, requestId: null });
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  // Fetch recently completed housekeeping requests (no feedback yet)
  const fetchRecentCompleted = async () => {
    try {
      const res = await fetch("http://localhost:5000/feedback/recent", {
        headers: { token: localStorage.token },
      });
      const data = await res.json();
      if (res.ok) setRecentCompleted(data);
    } catch (err) {
      console.error("Error fetching completed services:", err.message);
    }
  };

  useEffect(() => {
    fetchRecentCompleted();
  }, []);

  // Submit feedback
  const handleSubmitFeedback = async () => {
    try {
      const res = await fetch("http://localhost:5000/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token: localStorage.token,
        },
        body: JSON.stringify({
          request_id: feedbackModal.requestId,
          rating,
          comment,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("Feedback submitted!");
        setFeedbackModal({ show: false, requestId: null });
        setRating(0);
        setComment("");
        fetchRecentCompleted(); // refresh list
      } else {
        alert(data.error || "Failed to submit feedback.");
      }
    } catch (err) {
      console.error("Feedback error:", err.message);
    }
  };

  return (
    <div className="mt-10">
      <h3 className="text-xl font-semibold mb-4">Recently Completed Services</h3>

      {recentCompleted.length === 0 ? (
        <p className="text-gray-600">No completed services available for feedback.</p>
      ) : (
        <table className="w-full border border-gray-300">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2 border">Room</th>
              <th className="p-2 border">Service Type</th>
              <th className="p-2 border">Date</th>
              <th className="p-2 border">Time</th>
              <th className="p-2 border">Action</th>
            </tr>
          </thead>
          <tbody>
            {recentCompleted.map((s) => (
              <tr key={s.id}>
                <td className="p-2 border">{s.room_number}</td>
                <td className="p-2 border capitalize">{s.service_type}</td>
                <td className="p-2 border">
                  {new Date(s.preferred_date).toLocaleDateString()}
                </td>
                <td className="p-2 border">{s.preferred_time}</td>
                <td className="p-2 border text-center">
                  <button
                    onClick={() => setFeedbackModal({ show: true, requestId: s.id })}
                    className="px-3 py-1 bg-green-600 text-white rounded"
                  >
                    Give Feedback
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Feedback Modal */}
      {feedbackModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h3 className="text-xl font-bold mb-4">Submit Feedback</h3>

            <label className="block mb-2">Rating:</label>
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="w-full border rounded p-2 mb-4"
            >
              <option value={0}>Select rating</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} Star{n > 1 && "s"}
                </option>
              ))}
            </select>

            <label className="block mb-2">Comment:</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows="3"
              className="w-full border rounded p-2 mb-4"
              placeholder="Share your experience..."
            />

            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-gray-200 rounded"
                onClick={() => setFeedbackModal({ show: false, requestId: null })}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-green-600 text-white rounded"
                onClick={handleSubmitFeedback}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackWidget;
