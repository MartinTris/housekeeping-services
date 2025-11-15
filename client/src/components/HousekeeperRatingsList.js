import { useEffect, useState } from "react";

const HousekeeperRatingsList = () => {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchRatings = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found");

      const res = await fetch("http://localhost:5000/feedback/admin/housekeeper-ratings", {
        headers: { token },
      });

      const data = await res.json();
      setRatings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching housekeeper ratings:", err);
      setRatings([]);
    } finally {
      setLoading(false);
    }
  };

  fetchRatings();
}, []);

  if (loading) {
    return <div className="p-6 text-gray-600 text-center">Loading ratings...</div>;
  }

  if (ratings.length === 0) {
    return <div className="p-6 text-gray-500 text-center">No ratings available</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold text-green-900 mb-4">
        Housekeeper Ratings
      </h2>

      <ul className="divide-y divide-gray-200">
        {ratings.map((hk, index) => (
          <li key={hk.housekeeper_id} className="flex justify-between items-center py-3">
            <div>
              <p className="font-semibold text-gray-800">
                {index + 1}. {hk.housekeeper_name || "Unnamed"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-yellow-600">
                ⭐ {hk.average_rating}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HousekeeperRatingsList;
