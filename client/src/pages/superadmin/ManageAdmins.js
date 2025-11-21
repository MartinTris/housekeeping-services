import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const ManageAdmins = () => {
  const [inputs, setInputs] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    facility: "",
  });
  const [admins, setAdmins] = useState([]);
  const [role, setRole] = useState(null);
  const [facilityFilter, setFacilityFilter] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = jwtDecode(token);
      setRole(decoded.role);
      
      // Redirect if not superadmin
      if (decoded.role !== "superadmin") {
        alert("Access denied. This page is only accessible to superadmins.");
        navigate("/");
        return;
      }
    }
    getAdmins();
  }, [navigate]);

  const getAdmins = async () => {
    try {
      const response = await fetch(`${API_URL}/admins`, {
        headers: { token: localStorage.getItem("token") },
      });
      const data = await response.json();
      const adminList = Array.isArray(data) ? data : [];
      setAdmins(adminList);
    } catch (err) {
      console.error(err.message);
    }
  };

  const onChange = (e) => {
    setInputs({ ...inputs, [e.target.name]: e.target.value });
  };

  const handleAddAdmin = async () => {
    if (!inputs.first_name || !inputs.last_name || !inputs.email || !inputs.password) {
      alert("Please fill in all fields.");
      return;
    }

    if (!inputs.facility) {
      alert("Please select a facility for the admin.");
      return;
    }

    try {
      const payload = {
        first_name: inputs.first_name,
        last_name: inputs.last_name,
        email: inputs.email,
        password: inputs.password,
        facility: inputs.facility,
      };

      const response = await fetch(`${API_URL}/admins`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token: localStorage.getItem("token"),
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const newAdmin = await response.json();

        setInputs({
          first_name: "",
          last_name: "",
          email: "",
          password: "",
          facility: "",
        });

        setAdmins((prev) => [...prev, newAdmin]);
        alert("Admin added successfully!");
      } else {
        const errorData = await response.json();
        alert(errorData.error || errorData.message || "Failed to add admin.");
      }
    } catch (err) {
      console.error(err.message);
      alert("Error adding admin.");
    }
  };

  const toggleStatus = async (id) => {
    try {
      const res = await fetch(
        `${API_URL}/admins/${id}/toggle-status`,
        {
          method: "PUT",
          headers: { token: localStorage.getItem("token") },
        }
      );
      const data = await res.json();

      setAdmins((prev) =>
        prev.map((admin) =>
          admin.id === id ? { ...admin, is_active: data.is_active } : admin
        )
      );
    } catch (err) {
      console.error(err.message);
    }
  };

  // Filter admins by facility
  const filteredAdmins = admins.filter((admin) => {
    if (facilityFilter === "all") return true;
    return admin.facility === facilityFilter;
  });

  return (
    <div className="p-6">
      <h2 className="text-2xl font-poppins font-bold text-green-900 mb-6">
        Manage Facility Admins
      </h2>

      {/* Add Form */}
      <div className="flex flex-col gap-4 max-w-md mx-auto mb-10 bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-green-800">Add New Admin</h3>
        
        <input
          type="text"
          name="first_name"
          value={inputs.first_name}
          onChange={onChange}
          placeholder="First Name"
          className="border rounded-lg px-3 py-2"
        />
        <input
          type="text"
          name="last_name"
          value={inputs.last_name}
          onChange={onChange}
          placeholder="Last Name"
          className="border rounded-lg px-3 py-2"
        />
        <input
          type="email"
          name="email"
          value={inputs.email}
          onChange={onChange}
          placeholder="Email"
          className="border rounded-lg px-3 py-2"
        />
        <input
          type="password"
          name="password"
          value={inputs.password}
          onChange={onChange}
          placeholder="Password"
          className="border rounded-lg px-3 py-2"
        />

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Assign Facility *
          </label>
          <select
            name="facility"
            value={inputs.facility}
            onChange={onChange}
            className="border rounded-lg px-3 py-2 w-full"
            required
          >
            <option value="">Select Facility</option>
            <option value="RCC">RCC</option>
            <option value="Hotel Rafael">Hotel Rafael</option>
          </select>
        </div>

        <button
          onClick={handleAddAdmin}
          className="bg-green-900 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition"
        >
          Add Admin
        </button>
      </div>

      {/* Facility Filter */}
      <div className="mb-6 flex justify-center gap-4">
        <label className="font-medium">Filter by Facility:</label>
        <select
          value={facilityFilter}
          onChange={(e) => setFacilityFilter(e.target.value)}
          className="border rounded-lg px-3 py-1"
        >
          <option value="all">All Facilities</option>
          <option value="RCC">RCC</option>
          <option value="Hotel Rafael">Hotel Rafael</option>
        </select>
      </div>

      {/* Active Admins Table */}
      <h3 className="text-xl font-poppins font-bold text-green-900 mb-4">
        Active Admins
      </h3>
      <div className="overflow-x-auto mb-8">
        <table className="table-auto w-full border-collapse border border-gray-300 text-left bg-white shadow-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2">Facility</th>
              <th className="border px-4 py-2">Name</th>
              <th className="border px-4 py-2">Email</th>
              <th className="border px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAdmins
              .filter((admin) => admin.is_active)
              .map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-50">
                  <td className="border px-4 py-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        admin.facility === "RCC"
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {admin.facility}
                    </span>
                  </td>
                  <td className="border px-4 py-2">
                    {admin.first_name} {admin.last_name}
                  </td>
                  <td className="border px-4 py-2">{admin.email}</td>
                  <td className="border px-4 py-2">
                    <button
                      onClick={() => toggleStatus(admin.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-500 transition"
                    >
                      Disable
                    </button>
                  </td>
                </tr>
              ))}
            {filteredAdmins.filter((admin) => admin.is_active).length === 0 && (
              <tr>
                <td colSpan="4" className="text-center py-4 text-gray-500">
                  No active admins found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Disabled Admins Table */}
      <h3 className="text-xl font-poppins font-bold text-green-900 mb-4">
        Disabled Admins
      </h3>
      <div className="overflow-x-auto">
        <table className="table-auto w-full border-collapse border border-gray-300 text-left bg-white shadow-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2">Facility</th>
              <th className="border px-4 py-2">Name</th>
              <th className="border px-4 py-2">Email</th>
              <th className="border px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAdmins
              .filter((admin) => !admin.is_active)
              .map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-50">
                  <td className="border px-4 py-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        admin.facility === "RCC"
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {admin.facility}
                    </span>
                  </td>
                  <td className="border px-4 py-2">
                    {admin.first_name} {admin.last_name}
                  </td>
                  <td className="border px-4 py-2">{admin.email}</td>
                  <td className="border px-4 py-2">
                    <button
                      onClick={() => toggleStatus(admin.id)}
                      className="bg-green-700 text-white px-3 py-1 rounded-lg hover:bg-green-600 transition"
                    >
                      Enable
                    </button>
                  </td>
                </tr>
              ))}
            {filteredAdmins.filter((admin) => !admin.is_active).length === 0 && (
              <tr>
                <td colSpan="4" className="text-center py-4 text-gray-500">
                  No disabled admins found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageAdmins;