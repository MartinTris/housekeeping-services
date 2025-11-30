import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const ServiceTypes = () => {
  const [serviceTypes, setServiceTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState("");

  const [form, setForm] = useState({
    name: "",
    duration: "",
    facility: ""
  });

  const [editData, setEditData] = useState(null);

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

  const fetchServiceTypes = async () => {
    try {
      const res = await fetch(`${API_URL}/service-types`, {
        method: "GET",
        headers: { token: localStorage.token }
      });

      const data = await res.json();
      setServiceTypes(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Failed to load service types.");
    }
  };

  useEffect(() => {
    fetchServiceTypes();
  }, []);

  const isCheckout = (name) => {
    return name && name.toLowerCase() === "checkout";
  };

  const handleAdd = async (e) => {
    e.preventDefault();

    if (userRole === "superadmin" && !form.facility) {
      alert("Please select a facility.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/service-types`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token: localStorage.token
        },
        body: JSON.stringify(form)
      });

      const data = await res.json();

      if (res.ok) {
        setServiceTypes([data, ...serviceTypes]);
        setForm({ name: "", duration: "", facility: "" });
      } else {
        alert(data.error || "Failed to add service type.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/service-types/${editData.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          token: localStorage.token
        },
        body: JSON.stringify({
          name: editData.name,
          duration: editData.duration
        })
      });

      const data = await res.json();

      if (res.ok) {
        setServiceTypes(
          serviceTypes.map((st) => (st.id === data.id ? data : st))
        );
        setEditData(null);
      } else {
        alert(data.error || "Update failed.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id, name) => {
    if (isCheckout(name)) {
      alert("The 'Checkout' service type cannot be deleted as it is a system-required service.");
      return;
    }

    if (!window.confirm("Delete this service type?")) return;

    try {
      const res = await fetch(`${API_URL}/service-types/${id}`, {
        method: "DELETE",
        headers: { token: localStorage.token }
      });

      const data = await res.json();

      if (res.ok) {
        setServiceTypes(serviceTypes.filter((st) => st.id !== id));
      } else {
        alert(data.error || "Deletion failed.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-6">Loading service types...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="p-4 sm:p-8">
      <h1 className="sm:text-3xl font-bold text-green-900 mb-4 sm:mb-6 font-poppins">
        Manage Service Types
        {userRole === "superadmin" && (
          <span className="block sm:inline text-base sm:text-lg font-normal text-gray-600 sm:ml-2 mt-1 sm:mt-0">
            (All Facilities)
          </span>
        )}
      </h1>

      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg mb-6 sm:mb-8 max-w-xl">
        <h2 className="text-lg sm:text-xl font-semibold mb-4">Add New Service Type</h2>

        {userRole === "superadmin" && (
          <div className="mb-4">
            <label className="block font-medium mb-1 text-sm sm:text-base">Facility *</label>
            <select
              className="w-full p-2 border rounded-lg text-sm sm:text-base"
              value={form.facility}
              onChange={(e) =>
                setForm({ ...form, facility: e.target.value })
              }
              required
            >
              <option value="">Select a facility...</option>
              <option value="RCC">RCC</option>
              <option value="Hotel Rafael">Hotel Rafael</option>
            </select>
          </div>
        )}

        <div className="mb-4">
          <label className="block font-medium mb-1 text-sm sm:text-base">Name</label>
          <input
            type="text"
            className="w-full p-2 border rounded-lg text-sm sm:text-base"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
            required
          />
        </div>

        <div className="mb-4">
          <label className="block font-medium mb-1 text-sm sm:text-base">Duration (minutes)</label>
          <input
            type="number"
            className="w-full p-2 border rounded-lg text-sm sm:text-base"
            value={form.duration}
            min="1"
            onChange={(e) =>
              setForm({ ...form, duration: e.target.value })
            }
            required
          />
        </div>

        <button 
          onClick={handleAdd}
          className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-full shadow-lg hover:scale-105 hover:from-green-700 hover:to-emerald-700 transition-all duration-300 mb-4 text-sm sm:text-base"
        >
          Add Service Type
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {serviceTypes.map((type) => (
          <div
            key={type.id}
            className="bg-white rounded-xl shadow-md p-4 sm:p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              {userRole === "superadmin" && type.facility && (
                <span
                  className={`inline-block px-2 py-1 text-xs font-semibold rounded mb-2 ${
                    type.facility === "RCC"
                      ? "bg-green-100 text-green-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {type.facility}
                </span>
              )}
              <h3 className="text-base sm:text-lg font-bold text-green-900 break-words">
                {type.name}
                {isCheckout(type.name) && (
                  <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                    System Required
                  </span>
                )}
              </h3>
              <p className="text-sm sm:text-base text-gray-700">
                Duration: {type.duration} minutes
              </p>
              <p className="text-xs sm:text-sm text-gray-400">
                Created: {new Date(type.created_at).toLocaleString()}
              </p>
            </div>

            {userRole === "admin" && (
              <div className="flex gap-2 sm:gap-3 justify-end sm:justify-start flex-shrink-0">
                <button
                  onClick={() => setEditData(type)}
                  className="px-3 py-1.5 sm:py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                >
                  Edit
                </button>
                {!isCheckout(type.name) && (
                  <button
                    onClick={() => handleDelete(type.id, type.name)}
                    className="px-3 py-1.5 sm:py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {editData && userRole === "admin" && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-4 sm:p-6 w-full max-w-md">

            <h2 className="text-lg sm:text-xl font-bold mb-4">Edit Service Type</h2>

            <div>
              <div className="mb-4">
                <label className="block font-medium mb-1 text-sm sm:text-base">
                  Name
                  {isCheckout(editData.name) && (
                    <span className="ml-2 text-xs text-gray-500">
                      (Cannot be changed)
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  className={`w-full p-2 border rounded-lg text-sm sm:text-base ${
                    isCheckout(editData.name)
                      ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                      : ""
                  }`}
                  value={editData.name}
                  onChange={(e) =>
                    setEditData({ ...editData, name: e.target.value })
                  }
                  disabled={isCheckout(editData.name)}
                  required
                />
                {isCheckout(editData.name) && (
                  <p className="text-xs text-yellow-600 mt-1">
                    ⚠️ The Checkout service type name is protected and cannot be modified.
                  </p>
                )}
              </div>

              <div className="mb-4">
                <label className="block font-medium mb-1 text-sm sm:text-base">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  className="w-full p-2 border rounded-lg text-sm sm:text-base"
                  value={editData.duration}
                  min="1"
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      duration: e.target.value
                    })
                  }
                  required
                />
              </div>

              <div className="flex justify-end gap-2 sm:gap-4">
                <button
                  type="button"
                  className="px-3 sm:px-4 py-2 bg-gray-400 text-white rounded-lg text-sm sm:text-base"
                  onClick={() => setEditData(null)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleEditSubmit}
                  className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base"
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

export default ServiceTypes;