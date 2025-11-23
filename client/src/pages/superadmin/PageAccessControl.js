import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const PageAccessControl = () => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFacility, setSelectedFacility] = useState("RCC");
  const [role, setRole] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = jwtDecode(token);
      setRole(decoded.role);
      
      if (decoded.role !== "superadmin") {
        alert("Access denied. This page is only accessible to superadmins.");
        navigate("/");
        return;
      }
    }
    fetchPermissions();
  }, [navigate, selectedFacility]);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/permissions?facility=${selectedFacility}`,
        {
          headers: { token: localStorage.getItem("token") },
        }
      );
      const data = await response.json();
      setPermissions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err.message);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = async (permissionId, currentState) => {
    try {
      const response = await fetch(
        `${API_URL}/permissions/${permissionId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            token: localStorage.getItem("token"),
          },
          body: JSON.stringify({ is_enabled: !currentState }),
        }
      );

      if (response.ok) {
        // Update local state
        setPermissions(
          permissions.map((p) =>
            p.id === permissionId ? { ...p, is_enabled: !currentState } : p
          )
        );
        window.dispatchEvent(new CustomEvent('permissionsNeedRefresh'));
      } else {
        alert("Failed to update permission");
      }
    } catch (err) {
      console.error(err.message);
      alert("Error updating permission");
    }
  };

  const toggleAllForRole = async (roleType, enable) => {
    if (!window.confirm(`${enable ? 'Enable' : 'Disable'} all pages for ${roleType} at ${selectedFacility}?`)) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/permissions/bulk/facility-role`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            token: localStorage.getItem("token"),
          },
          body: JSON.stringify({
            facility: selectedFacility,
            role: roleType,
            is_enabled: enable,
          }),
        }
      );

      if (response.ok) {
        fetchPermissions(); // Refresh
        alert(`All pages ${enable ? 'enabled' : 'disabled'} for ${roleType}`);
      } else {
        alert("Failed to update permissions");
      }
    } catch (err) {
      console.error(err.message);
      alert("Error updating permissions");
    }
  };

  // Group permissions by role
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.role]) {
      acc[perm.role] = [];
    }
    acc[perm.role].push(perm);
    return acc;
  }, {});

  const roleDisplayNames = {
    guest: "Guest",
    housekeeper: "Housekeeper",
    admin: "Admin",
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <h2 className="text-xl sm:text-2xl lg:text-3xl font-poppins font-bold text-green-900 mb-4 sm:mb-6">
        Page Access Control
      </h2>

      {/* Facility Selector */}
      <div className="mb-6 sm:mb-8 bg-white p-4 sm:p-6 rounded-lg shadow-md">
        <label className="block text-base sm:text-lg font-semibold mb-3 text-gray-700">
          Select Facility:
        </label>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            onClick={() => setSelectedFacility("RCC")}
            className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 shadow-lg text-sm sm:text-base ${
              selectedFacility === "RCC"
                ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:scale-105 hover:from-green-700 hover:to-emerald-700"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            RCC
          </button>
          <button
            onClick={() => setSelectedFacility("Hotel Rafael")}
            className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 shadow-lg text-sm sm:text-base ${
              selectedFacility === "Hotel Rafael"
                ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:scale-105 hover:from-blue-700 hover:to-blue-800"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Hotel Rafael
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-sm sm:text-base">Loading permissions...</p>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {Object.entries(groupedPermissions).map(([roleType, perms]) => (
            <div
              key={roleType}
              className="bg-white rounded-lg shadow-md p-4 sm:p-6 border-l-4 border-green-600"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800">
                  {roleDisplayNames[roleType] || roleType}
                </h3>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => toggleAllForRole(roleType, true)}
                    className="flex-1 sm:flex-none px-3 py-2 bg-green-600 text-white text-xs sm:text-sm rounded-lg hover:bg-green-700 transition font-medium"
                  >
                    Enable All
                  </button>
                  <button
                    onClick={() => toggleAllForRole(roleType, false)}
                    className="flex-1 sm:flex-none px-3 py-2 bg-red-600 text-white text-xs sm:text-sm rounded-lg hover:bg-red-700 transition font-medium"
                  >
                    Disable All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {perms.map((perm) => (
                  <div
                    key={perm.id}
                    className={`p-3 sm:p-4 rounded-lg border-2 transition ${
                      perm.is_enabled
                        ? "border-green-300 bg-green-50"
                        : "border-gray-300 bg-gray-50"
                    }`}
                  >
                    <label className="flex items-center justify-between cursor-pointer gap-3">
                      <span
                        className={`font-medium text-sm sm:text-base flex-1 ${
                          perm.is_enabled ? "text-gray-800" : "text-gray-500"
                        }`}
                      >
                        {perm.page_name}
                      </span>
                      <div className="relative flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={perm.is_enabled}
                          onChange={() =>
                            togglePermission(perm.id, perm.is_enabled)
                          }
                          className="sr-only"
                        />
                        <div
                          className={`w-11 h-6 rounded-full transition flex items-center ${
                            perm.is_enabled ? "bg-green-500" : "bg-gray-400"
                          }`}
                        >
                          <div
                            className={`w-5 h-5 bg-white rounded-full shadow-md transform transition ${
                              perm.is_enabled
                                ? "translate-x-5"
                                : "translate-x-0.5"
                            }`}
                          />
                        </div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && Object.keys(groupedPermissions).length === 0 && (
        <p className="text-center text-gray-500 text-sm sm:text-base">
          No permissions found for this facility.
        </p>
      )}
    </div>
  );
};

export default PageAccessControl;