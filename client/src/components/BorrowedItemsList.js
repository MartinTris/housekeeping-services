import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";

const BorrowedItemsList = () => {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser(decoded);
      } catch (err) {
        console.error("Error decoding token:", err);
      }
    }
  }, []);

  const fetchBorrowedItems = async () => {
    try {
      const response = await fetch("http://localhost:5000/items/borrowed", {
        headers: { token: localStorage.getItem("token") },
      });

      const data = await response.json();

      if (response.ok) {
        const validData = Array.isArray(data) ? data : [];

        // ✅ Normalize and filter unpaid items safely
        const unpaidItems = validData.filter((item) => {
          const isPaid =
            item.is_paid === true ||
            item.is_paid === "true" ||
            item.is_paid === 1;
          return !isPaid; // keep only unpaid
        });

        setItems(unpaidItems);

        // ✅ Guest total for unpaid only
        const totalAmount = unpaidItems.reduce(
          (sum, item) => sum + Number(item.charge_amount || 0),
          0
        );
        setTotal(totalAmount);
      } else {
        setError(data.error || "Failed to fetch borrowed items");
      }
    } catch (err) {
      console.error("Error fetching borrowed items:", err);
      setError("Server error while fetching borrowed items");
    }
  };

  useEffect(() => {
    fetchBorrowedItems();
  }, []);

  return (
    <div className="bg-white p-4 rounded-xl shadow-md w-full max-w-lg mx-auto flex flex-col h-[400px]">
      {/* Header */}
      <div className="flex-shrink-0 border-b pb-2 mb-2">
        <h2 className="text-xl font-semibold text-green-800 text-center">
          Borrowed Items
        </h2>
      </div>

      {/* Scrollable List */}
      <div className="flex-grow overflow-y-auto space-y-2">
        {error ? (
          <p className="text-red-500 text-center">{error}</p>
        ) : items.length === 0 ? (
          <p className="text-gray-500 text-center">No borrowed items found.</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition"
            >
              {/* Admin view shows borrower */}
              {user?.role === "admin" && (
                <div className="mb-2">
                  <p className="text-sm font-semibold text-gray-700">
                    Borrower: {item.first_name} {item.last_name}
                  </p>
                </div>
              )}

              {/* Item Info */}
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-800">{item.item_name}</p>
                  <p className="text-sm text-gray-500">
                    Quantity: {item.quantity}
                  </p>
                </div>
                <p className="font-semibold text-gray-700">
                  ₱{Number(item.charge_amount || 0).toFixed(2)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Section */}
      <div className="flex-shrink-0 border-t pt-2 mt-2">
        {/* Guest total */}
        {user?.role === "guest" && (
          <p className="text-lg font-semibold text-green-700 text-right">
            Total: ₱{total.toFixed(2)}
          </p>
        )}

        {/* Admin “View More Details” Button */}
        {user?.role === "admin" && (
          <div className="text-center mt-2">
            <button
              onClick={() => navigate("/admin/pending-payments")}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
            >
              View More Details
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BorrowedItemsList;
