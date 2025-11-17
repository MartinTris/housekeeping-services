import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";

const ServiceTypes = () => {
  const [serviceTypes, setServiceTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState("");

  const [form, setForm] = useState({
    name: "",
    duration: "",
    facility: "" // For superadmin
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
      const res = await fetch("http://localhost:5000/service-types", {
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

  // Add service type
  const handleAdd = async (e) => {
    e.preventDefault();

    // Validate facility selection for superadmin
    if (userRole === "superadmin" && !form.facility) {
      alert("Please select a facility.");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/service-types", {
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

  // Edit service type
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:5000/service-types/${editData.id}`, {
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
        setEditData(null); // close modal
      } else {
        alert(data.error || "Update failed.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete service type
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this service type?")) return;

    try {
      const res = await fetch(`http://localhost:5000/service-types/${id}`, {
        method: "DELETE",
        headers: { token: localStorage.token }
      });

      if (res.ok) {
        setServiceTypes(serviceTypes.filter((st) => st.id !== id));
      } else {
        alert("Deletion failed.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-6">Loading service types...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-green-800 mb-6">
        Manage Service Types
        {userRole === "superadmin" && (
          <span className="text-lg font-normal text-gray-600 ml-2">
            (All Facilities)
          </span>
        )}
      </h1>

      {/* Add new service type form */}
      <form
        onSubmit={handleAdd}
        className="bg-white p-6 rounded-xl shadow-lg mb-8 max-w-xl"
      >
        <h2 className="text-xl font-semibold mb-4">Add New Service Type</h2>

        {/* Facility Selector for Superadmin */}
        {userRole === "superadmin" && (
          <div className="mb-4">
            <label className="block font-medium mb-1">Facility *</label>
            <select
              className="w-full p-2 border rounded-lg"
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
          <label className="block font-medium mb-1">Name</label>
          <input
            type="text"
            className="w-full p-2 border rounded-lg"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
            required
          />
        </div>

        <div className="mb-4">
          <label className="block font-medium mb-1">Duration (minutes)</label>
          <input
            type="number"
            className="w-full p-2 border rounded-lg"
            value={form.duration}
            min="1"
            onChange={(e) =>
              setForm({ ...form, duration: e.target.value })
            }
            required
          />
        </div>

        <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
          Add Service Type
        </button>
      </form>

      {/* Service type list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {serviceTypes.map((type) => (
          <div
            key={type.id}
            className="bg-white rounded-xl shadow-md p-5 flex justify-between items-center"
          >
            <div>
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
              <h3 className="text-lg font-bold text-green-900">{type.name}</h3>
              <p className="text-gray-700">
                Duration: {type.duration} minutes
              </p>
              <p className="text-sm text-gray-400">
                Created: {new Date(type.created_at).toLocaleString()}
              </p>
            </div>

            {/* Only show edit/delete for regular admin */}
            {userRole === "admin" && (
              <div className="flex gap-3">
                <button
                  onClick={() => setEditData(type)}
                  className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(type.id)}
                  className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Edit Modal - Only for admin */}
      {editData && userRole === "admin" && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">

            <h2 className="text-xl font-bold mb-4">Edit Service Type</h2>

            <form onSubmit={handleEditSubmit}>
              <div className="mb-4">
                <label className="block font-medium mb-1">Name</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-lg"
                  value={editData.name}
                  onChange={(e) =>
                    setEditData({ ...editData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block font-medium mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  className="w-full p-2 border rounded-lg"
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

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-400 text-white rounded-lg"
                  onClick={() => setEditData(null)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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

export default ServiceTypes;