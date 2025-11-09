import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const PendingPaymentsPage = () => {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch all pending payments
  const fetchPendingPayments = async () => {
    try {
      const response = await fetch("http://localhost:5000/items/pending", {
        headers: { token: localStorage.getItem("token") },
      });
      const data = await response.json();

      if (response.ok) {
        setItems(data);
      } else {
        setError(data.error || "Failed to fetch pending payments");
      }
    } catch (err) {
      console.error(err);
      setError("Error fetching data from server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  // Mark all items for a guest as paid
  const handleMarkAllAsPaid = async (userId) => {
    if (!window.confirm("Mark all items for this user as paid?")) return;

    try {
      const response = await fetch(
        `http://localhost:5000/items/mark-all-paid/${userId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            token: localStorage.getItem("token"),
          },
        }
      );

      if (response.ok) {
        alert("All items marked as paid!");
        fetchPendingPayments();
      } else {
        alert("Failed to mark all as paid");
      }
    } catch (err) {
      console.error(err);
      alert("Server error while marking all as paid");
    }
  };

  // Mark one specific item group as paid
  const handleMarkAsPaid = async (id) => {
    try {
      const response = await fetch(
        `http://localhost:5000/items/${id}/mark-paid`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            token: localStorage.getItem("token"),
          },
        }
      );

      if (response.ok) {
        alert("Item marked as paid!");
        fetchPendingPayments();
      } else {
        alert("Failed to update status");
      }
    } catch (err) {
      console.error(err);
      alert("Server error while updating");
    }
  };

  // 🧩 Group items by guest and then by item name
  const groupedByGuest = items.reduce((acc, item) => {
    const guest = item.borrower_name || "Unknown Guest";
    const userId = item.user_id;
    if (!acc[userId]) acc[userId] = { guest, items: [] };
    acc[userId].items.push(item);
    return acc;
  }, {});

  if (loading) return <p className="text-center mt-10">Loading...</p>;
  if (error) return <p className="text-center mt-10 text-red-500">{error}</p>;

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 mt-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-green-700 mb-4 text-center">
        Pending Payments
      </h2>

      {Object.keys(groupedByGuest).length === 0 ? (
        <p className="text-gray-600 text-center">No pending payments found.</p>
      ) : (
        Object.entries(groupedByGuest).map(([userId, { guest, items: guestItems }]) => {
          // Group by item_name for this guest
          const groupedItems = guestItems.reduce((acc, item) => {
            const key = item.item_name;
            if (!acc[key]) acc[key] = { ...item, quantity: 0 };
            acc[key].quantity += 1;
            return acc;
          }, {});

          const total = Object.values(groupedItems).reduce(
            (sum, item) =>
              sum + Number(item.charge_amount || 0) * item.quantity,
            0
          );

          return (
            <div
              key={guest}
              className="mb-6 border border-gray-300 rounded-lg p-4 shadow-sm"
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-green-800">
                  {guest}
                </h3>
                <button
                  onClick={() => handleMarkAllAsPaid(userId)}
                  className="px-3 py-1 bg-green-700 text-white text-sm rounded hover:bg-green-800"
                >
                  Mark All as Paid
                </button>
              </div>

              <table className="w-full border border-gray-200 text-sm mb-3">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 border">Item</th>
                    <th className="p-2 border">Quantity</th>
                    <th className="p-2 border">Price Each</th>
                    <th className="p-2 border">Total</th>
                    <th className="p-2 border">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(groupedItems).map((item) => (
                    <tr key={item.id} className="text-center">
                      <td className="p-2 border">{item.item_name}</td>
                      <td className="p-2 border">{item.quantity}</td>
                      <td className="p-2 border">
                        ₱{Number(item.charge_amount).toFixed(2)}
                      </td>
                      <td className="p-2 border">
                        ₱
                        {(Number(item.charge_amount) * item.quantity).toFixed(
                          2
                        )}
                      </td>
                      <td className="p-2 border">
                        <button
                          onClick={() => handleMarkAsPaid(item.id)}
                          className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                        >
                          Mark as Paid
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="text-right font-semibold text-green-800">
                Total Due: ₱{total.toFixed(2)}
              </div>
            </div>
          );
        })
      )}

      <div className="mt-6 text-center">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
        >
          ← Back
        </button>
      </div>
    </div>
  );
};

export default PendingPaymentsPage;
