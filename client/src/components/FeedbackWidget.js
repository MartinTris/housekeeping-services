import { useEffect, useState } from "react";
import { Star } from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const FeedbackWidget = () => {
  const [recentCompleted, setRecentCompleted] = useState([]);
  const [feedbackModal, setFeedbackModal] = useState({ show: false, requestId: null });
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");

  // 🔄 Fetch completed requests eligible for feedback
  const fetchRecentCompleted = async () => {
    try {
      const res = await fetch(`${API_URL}/feedback/recent`, {
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

      const res = await fetch(`${API_URL}/feedback`, {
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
    <div className="mt-0 bg-white shadow-md rounded-xl p-3 sm:p-4 border border-gray-200">
      <h3 className="text-lg text-green-900 sm:text-xl font-semibold mb-3 sm:mb-4">Recently Completed Services</h3>

      {recentCompleted.length === 0 ? (
        <p className="text-gray-600 text-sm sm:text-base">No completed services available for feedback.</p>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border border-gray-300">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-2 border text-sm">Room</th>
                  <th className="p-2 border text-sm">Service Type</th>
                  <th className="p-2 border text-sm">Date</th>
                  <th className="p-2 border text-sm">Time</th>
                  <th className="p-2 border text-sm text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentCompleted.map((s) => (
                  <tr key={s.id}>
                    <td className="p-2 border text-sm">{s.room_number}</td>
                    <td className="p-2 border capitalize text-sm">{s.service_type}</td>
                    <td className="p-2 border text-sm">
                      {new Date(s.preferred_date).toLocaleDateString()}
                    </td>
                    <td className="p-2 border text-sm">{s.preferred_time}</td>
                    <td className="p-2 border text-center">
                      <button
                        onClick={() => setFeedbackModal({ show: true, requestId: s.id })}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                      >
                        Give Feedback
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {recentCompleted.map((s) => (
              <div key={s.id} className="border border-gray-300 rounded-lg p-3 bg-gray-50">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Room</p>
                      <p className="font-semibold text-sm">{s.room_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 uppercase">Service Type</p>
                      <p className="font-medium text-sm capitalize">{s.service_type}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t">
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Date</p>
                      <p className="text-sm">
                        {new Date(s.preferred_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 uppercase">Time</p>
                      <p className="text-sm">{s.preferred_time}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setFeedbackModal({ show: true, requestId: s.id })}
                    className="w-full mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 active:bg-green-800 text-sm font-medium"
                  >
                    Give Feedback
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Feedback Modal */}
      {feedbackModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Submit Feedback</h3>

            {/* ⭐ Interactive Star Rating (half support) */}
            <label className="block mb-2 text-sm sm:text-base font-medium">Rating:</label>
            <div className="flex items-center justify-center sm:justify-start space-x-1 sm:space-x-2 mb-2">
              {renderStars()}
            </div>
            <p className="text-sm text-gray-600 mb-4 text-center sm:text-left">
              {displayRating ? `${displayRating} / 5` : "Select a rating"}
            </p>

            {/* 💬 Comment */}
            <label className="block mb-2 text-sm sm:text-base font-medium">Comment:</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows="3"
              className="w-full border rounded p-2 sm:p-3 mb-4 focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
              placeholder="Share your experience..."
            />

            {/* Buttons */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
              <button
                className="w-full sm:w-auto px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 active:bg-gray-400 text-sm sm:text-base"
                onClick={() => setFeedbackModal({ show: false, requestId: null })}
              >
                Cancel
              </button>
              <button
                className={`w-full sm:w-auto px-4 py-2 rounded text-white text-sm sm:text-base ${
                  rating === 0
                    ? "bg-green-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700 active:bg-green-800"
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
