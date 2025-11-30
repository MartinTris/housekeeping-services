import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Trash2, Pencil } from "lucide-react";
import { jwtDecode } from "jwt-decode";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const ItemList = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [newItem, setNewItem] = useState({ name: "", quantity: "", price: "" });
  const [editData, setEditData] = useState({ quantity: "", price: "" });
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUserRole(decoded.role);
      } catch (err) {
        console.error("Error decoding token:", err);
      }
    }
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch(`${API_URL}/items`, {
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
      const res = await fetch(`${API_URL}/items`, {
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
      window.dispatchEvent(new Event("itemsUpdated"));
    } catch (err) {
      console.error(err);
      toast.error("Error adding item.");
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;

    try {
      const res = await fetch(`${API_URL}/items/${id}`, {
        method: "DELETE",
        headers: { token: localStorage.token },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete item");

      toast.success("Item deleted successfully!");
      setItems(items.filter((item) => item.id !== id));
      window.dispatchEvent(new Event("itemsUpdated"));
    } catch (err) {
      console.error(err);
      toast.error("Error deleting item.");
    }
  };

  const handleEditItem = (item) => {
    setSelectedItem(item);
    setEditData({ quantity: item.quantity, price: item.price });
    setEditModal(true);
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/items/${selectedItem.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          token: localStorage.token,
        },
        body: JSON.stringify(editData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update item");

      toast.success("Item updated successfully!");
      setEditModal(false);
      setSelectedItem(null);
      fetchItems();
      window.dispatchEvent(new Event("itemsUpdated"));
    } catch (err) {
      console.error(err);
      toast.error("Error updating item.");
    }
  };

  const handleCancel = () => {
    setShowModal(false);
    setNewItem({ name: "", quantity: "", price: "" });
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return (
    <div className="p-4 sm:p-6 relative min-h-screen">
      <h2 className="text-green-900 font-poppins text-xl sm:text-2xl font-bold mb-4">
        Borrowable Items
      </h2>

      {loading ? (
        <p className="text-sm sm:text-base">Loading items...</p>
      ) : items.length === 0 ? (
        <p className="text-sm sm:text-base">No items added yet.</p>
      ) : (
        <>
          <div className="block lg:hidden space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="border border-gray-300 rounded-lg p-4 bg-white shadow hover:bg-gray-50"
              >
                {userRole === "superadmin" && (
                  <div className="mb-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        item.facility === "RCC"
                          ? "bg-green-100 text-green-600"
                          : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      {item.facility}
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-gray-500 uppercase">
                      Item Name
                    </span>
                    <p className="font-semibold text-base break-words">
                      {item.name}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-xs text-gray-500 uppercase">
                        Quantity
                      </span>
                      <p className="text-sm">{item.quantity}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 uppercase">
                        Price
                      </span>
                      <p className="text-sm">₱{item.price}</p>
                    </div>
                  </div>

                  {userRole === "admin" && (
                    <div className="flex gap-3 pt-2 justify-end">
                      <button
                        onClick={() => handleEditItem(item)}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        <Pencil size={16} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="flex items-center gap-1 text-red-600 hover:text-red-800 text-sm"
                      >
                        <Trash2 size={16} />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-100 text-left">
                  {userRole === "superadmin" && (
                    <th className="p-2 border">Facility</th>
                  )}
                  <th className="p-2 border">Item Name</th>
                  <th className="p-2 border">Quantity</th>
                  <th className="p-2 border">Price</th>
                  {userRole === "admin" && (
                    <th className="p-2 border text-center w-24">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    {userRole === "superadmin" && (
                      <td className="p-2 border">
                        <span
                          className={`font-semibold ${
                            item.facility === "RCC"
                              ? "text-green-600"
                              : "text-blue-600"
                          }`}
                        >
                          {item.facility}
                        </span>
                      </td>
                    )}
                    <td className="p-2 border">{item.name}</td>
                    <td className="p-2 border">{item.quantity}</td>
                    <td className="p-2 border">₱{item.price}</td>
                    {userRole === "admin" && (
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
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {userRole === "admin" && (
        <div className="flex justify-start mt-4">
          <button
            onClick={() => setShowModal(true)}
            className="flex flex-col items-center text-green-600 hover:text-green-700"
          >
            <span className="text-sm font-medium">Add an item</span>
          </button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-md">
            <h3 className="text-lg sm:text-xl font-bold mb-4 text-green-900">
              Add New Item
            </h3>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Item Name"
                value={newItem.name}
                onChange={(e) =>
                  setNewItem({ ...newItem, name: e.target.value })
                }
                className="border p-2 rounded text-sm sm:text-base"
              />
              <input
                type="number"
                placeholder="Quantity"
                value={newItem.quantity}
                onChange={(e) =>
                  setNewItem({ ...newItem, quantity: e.target.value })
                }
                min="1"
                className="border p-2 rounded text-sm sm:text-base"
              />
              <input
                type="number"
                placeholder="Price"
                value={newItem.price}
                onChange={(e) =>
                  setNewItem({ ...newItem, price: e.target.value })
                }
                min="1"
                className="border p-2 rounded text-sm sm:text-base"
              />

              <div className="flex justify-end gap-2 sm:gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="w-full sm:w-auto px-6 py-2.5 bg-gray-500 text-white font-medium rounded-full shadow-lg hover:scale-105 hover:bg-gray-600 transition-all duration-300 mb-4 text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-full shadow-lg hover:scale-105 hover:from-green-700 hover:to-emerald-700 transition-all duration-300 mb-4 text-sm sm:text-base"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-md">
            <h3 className="text-lg sm:text-xl font-bold mb-4 text-green-900 break-words">
              Edit Item: {selectedItem.name}
            </h3>
            <div className="flex flex-col gap-3">
              <input
                type="number"
                placeholder="Quantity"
                value={editData.quantity}
                onChange={(e) =>
                  setEditData({ ...editData, quantity: e.target.value })
                }
                min="1"
                className="border p-2 rounded text-sm sm:text-base"
              />
              <input
                type="number"
                placeholder="Price"
                value={editData.price}
                onChange={(e) =>
                  setEditData({ ...editData, price: e.target.value })
                }
                min="1"
                className="border p-2 rounded text-sm sm:text-base"
              />

              <div className="flex justify-end gap-2 sm:gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setEditModal(false)}
                  className="px-3 sm:px-4 py-2 rounded border border-gray-400 text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateItem}
                  className="px-3 sm:px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800 text-sm sm:text-base"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemList;
