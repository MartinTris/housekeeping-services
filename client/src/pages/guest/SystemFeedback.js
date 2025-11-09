import { useState, useEffect } from "react";

const SystemFeedback = () => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [feedbacks, setFeedbacks] = useState([]);

  async function fetchMyFeedback() {
    const res = await fetch("http://localhost:5000/feedback/my", {
      headers: { token: localStorage.token },
    });
    const data = await res.json();
    setFeedbacks(data.filter(f => f.type === "system"));
  }

  useEffect(() => {
    fetchMyFeedback();
  }, []);

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
    fetchMyFeedback();
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4 text-green-800">
        System Feedback
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block font-medium">Rating (1–5)</label>
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="border p-2 rounded w-full"
            required
          >
            <option value="">Select</option>
            {[1, 2, 3, 4, 5].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-medium">Comment</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="border p-2 rounded w-full"
            rows={4}
          />
        </div>
        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Submit Feedback
        </button>
      </form>

      <div className="mt-10">
        <h3 className="text-lg font-semibold mb-3">My Feedback</h3>
        {feedbacks.length === 0 ? (
          <p>No feedback yet.</p>
        ) : (
          feedbacks.map((f) => (
            <div
              key={f.id}
              className="border rounded p-3 mb-2 bg-gray-50 shadow-sm"
            >
              <p>
                ⭐ {f.rating}/5 — <em>{f.comment}</em>
              </p>
              <small className="text-gray-500">
                {new Date(f.created_at).toLocaleString()}
              </small>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SystemFeedback;
