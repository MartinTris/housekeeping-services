import { useState } from "react";
import { Star } from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const SystemFeedback = () => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    await fetch(`${API_URL}/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token: localStorage.token,
      },
      body: JSON.stringify({ rating, comment, type: "system" }),
    });

    alert("Thank you for your feedback!");
    setRating(0);
    setComment("");
  }

  // Get active rating (hover has priority)
  const displayRating = hover || rating;

  return (
    <div className="p-4 sm:p-8">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 text-green-800">
        System Feedback
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        {/* ⭐ Star Rating */}
        <div>
          <label className="block font-medium mb-2 text-sm sm:text-base">
            Rating
          </label>
          <div className="flex items-center justify-center sm:justify-start space-x-1 sm:space-x-2">
            {[1, 2, 3, 4, 5].map((star) => {
              const isFull = displayRating >= star;
              const isHalf =
                displayRating >= star - 0.5 && displayRating < star;

              return (
                <div
                  key={star}
                  className="relative cursor-pointer touch-manipulation"
                  onMouseMove={(e) => {
                    const { left, width } =
                      e.currentTarget.getBoundingClientRect();
                    const percent = (e.clientX - left) / width;
                    setHover(percent <= 0.5 ? star - 0.5 : star);
                  }}
                  onMouseLeave={() => setHover(0)}
                  onClick={(e) => {
                    const { left, width } =
                      e.currentTarget.getBoundingClientRect();
                    const percent = (e.clientX - left) / width;
                    setRating(percent <= 0.5 ? star - 0.5 : star);
                  }}
                >
                  {/* Base empty star */}
                  <Star
                    size={window.innerWidth < 640 ? 36 : 32}
                    className="text-gray-300"
                  />
                  {/* Overlayed filled portion */}
                  <div
                    className="absolute top-0 left-0 overflow-hidden"
                    style={{
                      width: isFull ? "100%" : isHalf ? "50%" : "0%",
                    }}
                  >
                    <Star
                      size={window.innerWidth < 640 ? 36 : 32}
                      className="text-yellow-400 fill-yellow-400 transition-transform transform hover:scale-110"
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-sm text-gray-600 mt-2 text-center sm:text-left">
            {displayRating ? `${displayRating} / 5` : "Select a rating"}
          </p>
        </div>

        {/* 💬 Comment Section */}
        <div>
          <label className="block font-medium mb-2 text-sm sm:text-base">
            Comment
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="border p-3 rounded w-full focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
            rows={4}
            placeholder="Share your thoughts..."
          />
        </div>

        {/* 📩 Submit */}
        <button
          type="submit"
          className={`mt-6 w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-full shadow-lg hover:scale-105 hover:from-green-700 hover:to-emerald-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm sm:text-base ${
            rating === 0
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-green-700 active:bg-green-800"
          }`}
          disabled={rating === 0}
        >
          Submit Feedback
        </button>
      </form>
    </div>
  );
};

export default SystemFeedback;
