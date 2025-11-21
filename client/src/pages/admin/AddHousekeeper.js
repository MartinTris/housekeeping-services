import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const ScheduleModal = ({ show, onClose, housekeeper, schedule, onSave }) => {
  const [localSchedule, setLocalSchedule] = useState({
    shift_time_in: "08:00",
    shift_time_out: "17:00",
    day_offs: [],
  });

  useEffect(() => {
    if (schedule) {
      setLocalSchedule(schedule);
    }
  }, [schedule]);

  if (!show) return null;

  const handleSave = () => {
    onSave(localSchedule);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <h3 className="text-xl font-bold text-green-900 mb-4">
          Edit Schedule for {housekeeper?.name}
        </h3>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Shift Time In:
          </label>
          <input
            type="time"
            className="border rounded-lg px-3 py-2 w-full"
            value={localSchedule.shift_time_in || ""}
            onChange={(e) =>
              setLocalSchedule({ ...localSchedule, shift_time_in: e.target.value })
            }
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Shift Time Out:
          </label>
          <input
            type="time"
            className="border rounded-lg px-3 py-2 w-full"
            value={localSchedule.shift_time_out || ""}
            onChange={(e) =>
              setLocalSchedule({ ...localSchedule, shift_time_out: e.target.value })
            }
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Day Off(s):</label>
          <div className="flex flex-wrap gap-2">
            {[
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ].map((day) => (
              <label
                key={day}
                className="flex items-center gap-1 border rounded px-3 py-2 bg-gray-50 hover:bg-gray-100 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={localSchedule.day_offs?.includes(day) || false}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setLocalSchedule({
                      ...localSchedule,
                      day_offs: checked
                        ? [...(localSchedule.day_offs || []), day]
                        : localSchedule.day_offs.filter((d) => d !== day),
                    });
                  }}
                />
                <span className="text-sm">{day}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-600"
          >
            Save Schedule
          </button>
        </div>
      </div>
    </div>
  );
};

const AddHousekeeper = () => {
  const [inputs, setInputs] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    facility: "",
  });
  const [housekeepers, setHousekeepers] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [facility, setFacility] = useState(null);
  const [role, setRole] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedHousekeeper, setSelectedHousekeeper] = useState(null);
  const [facilityFilter, setFacilityFilter] = useState("all");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = jwtDecode(token);
      setFacility(decoded.facility);
      setRole(decoded.role);
    }
    getHousekeepers();
    getSchedules();
  }, []);

  const getHousekeepers = async () => {
    try {
      const response = await fetch(`${API_URL}/housekeepers`, {
        headers: { token: localStorage.getItem("token") },
      });
      const data = await response.json();
      const hkList = Array.isArray(data) ? data : [];
      setHousekeepers(hkList);
    } catch (err) {
      console.error(err.message);
    }
  };

  const getSchedules = async () => {
    try {
      const res = await fetch(
        `${API_URL}/housekeepers/all-schedules`,
        {
          headers: { token: localStorage.getItem("token") },
        }
      );
      const data = await res.json();
      setSchedules(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err.message);
    }
  };

  const onChange = (e) => {
    setInputs({ ...inputs, [e.target.name]: e.target.value });
  };

  const handleAddHousekeeper = async () => {
    try {
      const payload = {
        first_name: inputs.first_name,
        last_name: inputs.last_name,
        email: inputs.email,
        password: inputs.password,
      };

      // Only add facility if superadmin
      if (role === 'superadmin' && inputs.facility) {
        payload.facility = inputs.facility;
      }

      const response = await fetch(`${API_URL}/housekeepers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token: localStorage.getItem("token"),
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const newHk = await response.json();

        setInputs({
          first_name: "",
          last_name: "",
          email: "",
          password: "",
          facility: "",
        });

        setHousekeepers((prev) => [...prev, newHk]);

        // Create default schedule for new housekeeper
        setSchedules((prev) => [
          ...prev,
          {
            housekeeper_id: newHk.id,
            shift_time_in: "08:00",
            shift_time_out: "17:00",
            day_offs: [],
          },
        ]);

        alert("Housekeeper added successfully!");
      } else {
        const errorData = await response.json();
        alert(errorData.message || "Failed to add housekeeper.");
      }
    } catch (err) {
      console.error(err.message);
      alert("Error adding housekeeper.");
    }
  };

  const toggleStatus = async (id) => {
    try {
      const res = await fetch(
        `${API_URL}/housekeepers/${id}/toggle-status`,
        {
          method: "PUT",
          headers: { token: localStorage.getItem("token") },
        }
      );
      const data = await res.json();

      setHousekeepers((prev) =>
        prev.map((hk) =>
          hk.id === id ? { ...hk, is_active: data.is_active } : hk
        )
      );
    } catch (err) {
      console.error(err.message);
    }
  };

  const openScheduleModal = (hk) => {
    setSelectedHousekeeper(hk);
    setShowScheduleModal(true);
  };

  const handleSaveSchedule = async (updatedSchedule) => {
    if (!selectedHousekeeper) return;

    const payload = {
      shift_time_in: updatedSchedule.shift_time_in || "08:00",
      shift_time_out: updatedSchedule.shift_time_out || "17:00",
      day_offs: updatedSchedule.day_offs || [],
    };

    try {
      const res = await fetch(
        `${API_URL}/housekeepers/${selectedHousekeeper.id}/schedule`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            token: localStorage.getItem("token"),
          },
          body: JSON.stringify(payload),
        }
      );
      if (res.ok) {
        alert("Schedule saved successfully!");
        await getSchedules();
        setShowScheduleModal(false);
        setSelectedHousekeeper(null);
      } else {
        alert("Failed to save schedule.");
      }
    } catch (err) {
      console.error(err.message);
      alert("Error saving schedule.");
    }
  };

  const getScheduleForHousekeeper = (hkId) => {
    return (
      schedules.find((s) => s.housekeeper_id === hkId) || {
        shift_time_in: "08:00",
        shift_time_out: "17:00",
        day_offs: [],
      }
    );
  };

  // Filter housekeepers by facility for superadmin
  const filteredHousekeepers = housekeepers.filter((hk) => {
    if (role !== "superadmin" || facilityFilter === "all") return true;
    return hk.facility === facilityFilter;
  });

  return (
    <div className="p-6">
      <h2 className="text-2xl font-poppins font-bold text-green-900 mb-6">
        Add / Remove Housekeeper {role !== "superadmin" && `(${facility})`}
      </h2>

      {/* Add Form */}
      <div className="flex flex-col gap-4 max-w-md mx-auto mb-10">
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

        {/* Facility selector for superadmin */}
        {role === "superadmin" && (
          <select
            name="facility"
            value={inputs.facility}
            onChange={onChange}
            className="border rounded-lg px-3 py-2"
            required
          >
            <option value="">Select Facility</option>
            <option value="RCC">RCC</option>
            <option value="Hotel Rafael">Hotel Rafael</option>
          </select>
        )}

        <button
          onClick={handleAddHousekeeper}
          className="bg-green-900 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700"
        >
          Add Housekeeper
        </button>
      </div>

      {/* Facility Filter for Superadmin */}
      {role === "superadmin" && (
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
      )}

      <h3 className="text-xl font-poppins font-bold text-green-900 mb-4">
        Active Housekeepers
      </h3>
      <table className="table-auto w-full border-collapse border border-gray-300 text-left mb-8">
        <thead>
          <tr className="bg-gray-100">
            {role === "superadmin" && <th className="border px-4 py-2">Facility</th>}
            <th className="border px-4 py-2">Name</th>
            <th className="border px-4 py-2">Email</th>
            <th className="border px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredHousekeepers
            .filter((hk) => hk.is_active)
            .map((hk) => (
              <tr key={hk.id}>
                {role === "superadmin" && (
                  <td className="border px-4 py-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        hk.facility === "RCC"
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {hk.facility}
                    </span>
                  </td>
                )}
                <td className="border px-4 py-2">{hk.name}</td>
                <td className="border px-4 py-2">{hk.email}</td>
                <td className="border px-4 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openScheduleModal(hk)}
                      className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-500"
                    >
                      Edit Schedule
                    </button>
                    <button
                      onClick={() => toggleStatus(hk.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-500"
                    >
                      Disable
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          {filteredHousekeepers.filter((hk) => hk.is_active).length === 0 && (
            <tr>
              <td colSpan={role === "superadmin" ? "4" : "3"} className="text-center py-4 text-gray-500">
                No active housekeepers.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h3 className="text-xl font-poppins font-bold text-green-900 mb-4">
        Disabled Housekeepers
      </h3>
      <table className="table-auto w-full border-collapse border border-gray-300 text-left">
        <thead>
          <tr className="bg-gray-100">
            {role === "superadmin" && <th className="border px-4 py-2">Facility</th>}
            <th className="border px-4 py-2">Name</th>
            <th className="border px-4 py-2">Email</th>
            <th className="border px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredHousekeepers
            .filter((hk) => !hk.is_active)
            .map((hk) => (
              <tr key={hk.id}>
                {role === "superadmin" && (
                  <td className="border px-4 py-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        hk.facility === "RCC"
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {hk.facility}
                    </span>
                  </td>
                )}
                <td className="border px-4 py-2">{hk.name}</td>
                <td className="border px-4 py-2">{hk.email}</td>
                <td className="border px-4 py-2">
                  <button
                    onClick={() => toggleStatus(hk.id)}
                    className="bg-green-700 text-white px-3 py-1 rounded-lg hover:bg-green-600"
                  >
                    Enable
                  </button>
                </td>
              </tr>
            ))}
          {filteredHousekeepers.filter((hk) => !hk.is_active).length === 0 && (
            <tr>
              <td colSpan={role === "superadmin" ? "4" : "3"} className="text-center py-4 text-gray-500">
                No disabled housekeepers.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <ScheduleModal
        show={showScheduleModal}
        onClose={() => {
          setShowScheduleModal(false);
          setSelectedHousekeeper(null);
        }}
        housekeeper={selectedHousekeeper}
        schedule={
          selectedHousekeeper
            ? getScheduleForHousekeeper(selectedHousekeeper.id)
            : null
        }
        onSave={handleSaveSchedule}
      />
    </div>
  );
};

export default AddHousekeeper;