import { useEffect, useState } from "react";
import { Star } from "lucide-react";

const FeedbackWidget = () => {
  const [recentCompleted, setRecentCompleted] = useState([]);
  const [feedbackModal, setFeedbackModal] = useState({ show: false, requestId: null });
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");

  // 🔄 Fetch completed requests eligible for feedback
  const fetchRecentCompleted = async () => {
    try {
      const res = await fetch("http://localhost:5000/feedback/recent", {
        headers: { token: localStorage.getItem("token") },
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

  // 📤 Submit feedback
  const handleSubmitFeedback = async () => {
    try {
      if (!feedbackModal.requestId) throw new Error("Missing request ID");

      const res = await fetch("http://localhost:5000/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token: localStorage.getItem("token"),
        },
        body: JSON.stringify({
          rating,
          comment,
          request_id: feedbackModal.requestId,
        }),
      });

      if (!res.ok) throw new Error("Failed to submit feedback");

      const data = await res.json();
      if (data && data.id) {
        alert("Feedback submitted successfully!");
        setFeedbackModal({ show: false, requestId: null });
        setRating(0);
        setHover(0);
        setComment("");
        fetchRecentCompleted();
      }
    } catch (err) {
      console.error("Error submitting feedback:", err.message);
      alert("Failed to submit feedback. Please try again.");
    }
  };

  const displayRating = hover || rating;

  // ⭐ Renders interactive stars with half support
  const renderStars = () => {
    return [1, 2, 3, 4, 5].map((star) => {
      const isFull = displayRating >= star;
      const isHalf = displayRating >= star - 0.5 && displayRating < star;

      return (
        <div
          key={star}
          className="relative cursor-pointer"
          onMouseMove={(e) => {
            const { left, width } = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - left) / width;
            setHover(percent <= 0.5 ? star - 0.5 : star);
          }}
          onMouseLeave={() => setHover(0)}
          onClick={(e) => {
            const { left, width } = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - left) / width;
            setRating(percent <= 0.5 ? star - 0.5 : star);
          }}
        >
          {/* Base empty star */}
          <Star size={32} className="text-gray-300" />
          {/* Filled portion (full or half) */}
          <div
            className="absolute top-0 left-0 overflow-hidden"
            style={{
              width: isFull ? "100%" : isHalf ? "50%" : "0%",
            }}
          >
            <Star
              size={32}
              className="text-yellow-400 fill-yellow-400 transition-transform transform hover:scale-110"
            />
          </div>
        </div>
      );
    });
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

            {/* ⭐ Interactive Star Rating (half support) */}
            <label className="block mb-2">Rating:</label>
            <div className="flex items-center space-x-1 mb-2">{renderStars()}</div>
            <p className="text-sm text-gray-600 mb-4">
              {displayRating ? `${displayRating} / 5` : "Select a rating"}
            </p>

            {/* 💬 Comment */}
            <label className="block mb-2">Comment:</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows="3"
              className="w-full border rounded p-2 mb-4 focus:ring-2 focus:ring-green-500"
              placeholder="Share your experience..."
            />

            {/* Buttons */}
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-gray-200 rounded"
                onClick={() => setFeedbackModal({ show: false, requestId: null })}
              >
                Cancel
              </button>
              <button
                className={`px-4 py-2 rounded text-white ${
                  rating === 0
                    ? "bg-green-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                }`}
                onClick={handleSubmitFeedback}
                disabled={rating === 0}
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
