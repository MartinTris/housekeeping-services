import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { jwtDecode } from "jwt-decode";

const BorrowItems = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [borrowQty, setBorrowQty] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [userFacility, setUserFacility] = useState("");

  const fetchUserFacility = async () => {
    try {
      const res = await fetch("http://localhost:5000/users/me", {
        headers: { token: localStorage.token },
      });
      if (!res.ok) throw new Error("Failed to fetch user info");
      const user = await res.json();
      setUserFacility(user.facility || "");
    } catch (err) {
      console.error("Error fetching user facility:", err);
    }
  };

  useEffect(() => {
    const token = localStorage.token;
    if (token) {
      const decoded = jwtDecode(token);
      setUserFacility(decoded.facility || "");
    }
    fetchUserFacility();
  }, []);

  useEffect(() => {
    const handler = () => {
      console.log("Facility updated → refetching user info...");
      fetchUserFacility();
    };
    window.addEventListener("userFacilityUpdated", handler);
    return () => window.removeEventListener("userFacilityUpdated", handler);
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch("http://localhost:5000/items", {
        headers: { token: localStorage.token },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch items");
      setItems(data);
    } catch (err) {
      console.error(err);
      toast.error("Error loading items.");
    } finally {
      setLoading(false);
    }
  };

  const handleBorrow = async (e) => {
    e.preventDefault();
    if (!borrowQty || borrowQty <= 0) {
      toast.error("Please enter a valid quantity.");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/items/borrow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token: localStorage.token,
        },
        body: JSON.stringify({
          item_id: selectedItem.id,
          quantity: borrowQty,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Item borrowed successfully!");
      setShowModal(false);
      setBorrowQty("");
      fetchItems();
    } catch (err) {
      toast.error(err.message || "Error borrowing item.");
    }
  };

  useEffect(() => {
    if (userFacility) fetchItems();
  }, [userFacility]);

  if (!userFacility) {
    return (
      <div className="p-6">
        <h2 className="text-green-900 text-2xl font-bold mb-4 font-poppins">
          Available Items for Borrowing
        </h2>
        <p>You are not assigned to any facility.</p>
      </div>
    );
  }

  return (
    <div className="p-6 relative min-h-screen">
      <h2 className="text-green-900 text-2xl font-bold mb-4 font-poppins">
        Available Items for Borrowing
      </h2>

      {loading ? (
        <p>Loading items...</p>
      ) : items.length === 0 ? (
        <p>No items available right now.</p>
      ) : (
        <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2 border">Item Name</th>
              <th className="p-2 border">Available Quantity</th>
              <th className="p-2 border">Price</th>
              <th className="p-2 border text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="p-2 border">{item.name}</td>
                <td className="p-2 border">{item.quantity}</td>
                <td className="p-2 border">₱{item.price}</td>
                <td className="p-2 border text-center">
                  <button
                    onClick={() => {
                      setSelectedItem(item);
                      setShowModal(true);
                    }}
                    className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                    disabled={item.quantity <= 0}
                  >
                    Borrow
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Borrow Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h3 className="text-xl font-bold mb-4 text-green-900">
              Borrow {selectedItem.name}
            </h3>
            <form onSubmit={handleBorrow} className="flex flex-col gap-3">
              <input
                type="number"
                placeholder="Quantity"
                value={borrowQty}
                onChange={(e) => setBorrowQty(e.target.value)}
                min="1"
                className="border p-2 rounded"
              />

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded border border-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800"
                >
                  Confirm Borrow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BorrowItems;
