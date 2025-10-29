import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Trash2, Pencil } from "lucide-react";

const ItemList = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [newItem, setNewItem] = useState({ name: "", quantity: "", price: "" });
  const [editData, setEditData] = useState({ quantity: "", price: "" });

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

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.name || !newItem.quantity || !newItem.price) {
      toast.error("Please fill in all fields.");
      return;
    }

    const duplicate = items.find(
      (i) => i.name.toLowerCase() === newItem.name.toLowerCase()
    );
    if (duplicate) {
      toast.error("An item with this name already exists.");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token: localStorage.token,
        },
        body: JSON.stringify(newItem),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add item");

      toast.success("Item added successfully!");
      setShowModal(false);
      setNewItem({ name: "", quantity: "", price: "" });
      fetchItems();
    } catch (err) {
      console.error(err);
      toast.error("Error adding item.");
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;

    try {
      const res = await fetch(`http://localhost:5000/items/${id}`, {
        method: "DELETE",
        headers: { token: localStorage.token },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete item");

      toast.success("Item deleted successfully!");
      setItems(items.filter((item) => item.id !== id));
    } catch (err) {
      console.error(err);
      toast.error("Error deleting item.");
    }
  };

  // ✅ Edit handler
  const handleEditItem = (item) => {
    setSelectedItem(item);
    setEditData({ quantity: item.quantity, price: item.price });
    setEditModal(true);
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(
        `http://localhost:5000/items/${selectedItem.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            token: localStorage.token,
          },
          body: JSON.stringify(editData),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update item");

      toast.success("Item updated successfully!");
      setEditModal(false);
      setSelectedItem(null);
      fetchItems();
    } catch (err) {
      console.error(err);
      toast.error("Error updating item.");
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return (
    <div className="p-6 relative min-h-screen">
      <h2 className="text-green-900 text-2xl font-bold mb-4 font-poppins">
        Borrowable Items
      </h2>

      {loading ? (
        <p>Loading items...</p>
      ) : items.length === 0 ? (
        <p>No items added yet.</p>
      ) : (
        <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2 border">Item Name</th>
              <th className="p-2 border">Quantity</th>
              <th className="p-2 border">Price</th>
              <th className="p-2 border text-center w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="p-2 border">{item.name}</td>
                <td className="p-2 border">{item.quantity}</td>
                <td className="p-2 border">₱{item.price}</td>
                <td className="p-2 border text-center space-x-3">
                  <button
                    onClick={() => handleEditItem(item)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Add Button */}
      <div className="flex justify-start mt-4">
        <button
          onClick={() => setShowModal(true)}
          className="flex flex-col items-center text-green-600 hover:text-green-700"
        >
          <span className="text-sm font-medium">Add an item</span>
        </button>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h3 className="text-xl font-bold mb-4 text-green-900">
              Add New Item
            </h3>
            <form onSubmit={handleAddItem} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Item Name"
                value={newItem.name}
                onChange={(e) =>
                  setNewItem({ ...newItem, name: e.target.value })
                }
                className="border p-2 rounded"
              />
              <input
                type="number"
                placeholder="Quantity"
                value={newItem.quantity}
                onChange={(e) =>
                  setNewItem({ ...newItem, quantity: e.target.value })
                }
                className="border p-2 rounded"
              />
              <input
                type="number"
                placeholder="Price"
                value={newItem.price}
                onChange={(e) =>
                  setNewItem({ ...newItem, price: e.target.value })
                }
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
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h3 className="text-xl font-bold mb-4 text-green-900">
              Edit Item: {selectedItem.name}
            </h3>
            <form onSubmit={handleUpdateItem} className="flex flex-col gap-3">
              <input
                type="number"
                placeholder="Quantity"
                value={editData.quantity}
                onChange={(e) =>
                  setEditData({ ...editData, quantity: e.target.value })
                }
                className="border p-2 rounded"
              />
              <input
                type="number"
                placeholder="Price"
                value={editData.price}
                onChange={(e) =>
                  setEditData({ ...editData, price: e.target.value })
                }
                className="border p-2 rounded"
              />

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setEditModal(false)}
                  className="px-4 py-2 rounded border border-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemList;
