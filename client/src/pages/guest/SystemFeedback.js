import { useState } from "react";
import { Star } from "lucide-react";

const SystemFeedback = () => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    await fetch("http://localhost:5000/feedback", {
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
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4 text-green-800">
        System Feedback
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        {/* ⭐ Star Rating */}
        <div>
          <label className="block font-medium mb-1">Rating</label>
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => {
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
                  <Star
                    size={32}
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
                      size={32}
                      className="text-yellow-400 fill-yellow-400 transition-transform transform hover:scale-110"
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {displayRating ? `${displayRating} / 5` : "Select a rating"}
          </p>
        </div>

        {/* 💬 Comment Section */}
        <div>
          <label className="block font-medium mb-1">Comment</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="border p-2 rounded w-full focus:ring-2 focus:ring-green-500"
            rows={4}
          />
        </div>

        {/* 📩 Submit */}
        <button
          type="submit"
          className={`bg-green-600 text-white px-4 py-2 rounded transition-colors ${
            rating === 0
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-green-700"
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
