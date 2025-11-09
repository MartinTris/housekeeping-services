import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import ConfirmModal from "../../components/ConfirmModal";

const AddHousekeeper = () => {
  const [inputs, setInputs] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
  });
  const [housekeepers, setHousekeepers] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [facility, setFacility] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = jwtDecode(token);
      setFacility(decoded.facility);
    }
    getHousekeepers();
    getSchedules();
  }, []);

  const getHousekeepers = async () => {
    try {
      const response = await fetch("http://localhost:5000/housekeepers", {
        headers: { token: localStorage.getItem("token") },
      });
      const data = await response.json();
      console.log(data);
      const hkList = Array.isArray(data) ? data : [];

      setHousekeepers(hkList);
      setSchedules((prev) => {
        const updated = [...prev];
        hkList.forEach((hk) => {
          if (!updated.find((s) => s.housekeeper_id === hk.id)) {
            updated.push({
              housekeeper_id: hk.id,
              shift_time_in: "08:00",
              shift_time_out: "17:00",
              day_offs: [],
            });
          }
        });
        return updated;
      });
    } catch (err) {
      console.error(err.message);
    }
  };

  const getSchedules = async () => {
    try {
      const res = await fetch(
        "http://localhost:5000/housekeepers/all-schedules",
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

  const onSubmitForm = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:5000/housekeepers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token: localStorage.getItem("token"),
        },
        body: JSON.stringify(inputs),
      });
      if (response.ok) {
        const newHk = await response.json();

        setInputs({
          first_name: "",
          last_name: "",
          email: "",
          password: "",
        });

        setHousekeepers((prev) => [...prev, newHk]);

        setSchedules((prev) => [
          ...prev,
          {
            housekeeper_id: newHk.id,
            shift_time_in: "08:00",
            shift_time_out: "17:00",
            day_offs: [],
          },
        ]);
      } else {
        alert("User already exists.");
      }
    } catch (err) {
      console.error(err.message);
    }
  };

  const confirmRemove = (id) => {
    setSelectedId(id);
    setShowModal(true);
  };

  // const removeHousekeeper = async () => {
  //   try {
  //     await fetch(`http://localhost:5000/housekeepers/${selectedId}`, {
  //       method: "DELETE",
  //       headers: { token: localStorage.getItem("token") },
  //     });
  //     setHousekeepers((prev) => prev.filter((hk) => hk.id !== selectedId));
  //     setSchedules((prev) =>
  //       prev.filter((s) => s.housekeeper_id !== selectedId)
  //     );
  //     setShowModal(false);
  //     setSelectedId(null);
  //   } catch (err) {
  //     console.error(err.message);
  //   }
  // };

  const toggleStatus = async (id) => {
    try {
      const res = await fetch(
        `http://localhost:5000/housekeepers/${id}/toggle-status`,
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

  const handleSaveSchedule = async (hk) => {
    const current = schedules.find((s) => s.housekeeper_id === hk.id) || {};
    const payload = {
      shift_time_in: current.shift_time_in || "08:00",
      shift_time_out: current.shift_time_out || "17:00",
      day_offs: current.day_offs || [],
    };

    const res = await fetch(
      `http://localhost:5000/housekeepers/${hk.id}/schedule`,
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
      alert("Schedule saved!");
      getSchedules();
    } else {
      alert("Failed to save schedule.");
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-poppins font-bold text-green-900 mb-6">
        Add / Remove Housekeeper ({facility})
      </h2>

      {/* Add Form */}
      <form
        onSubmit={onSubmitForm}
        className="flex flex-col gap-4 max-w-md mx-auto mb-10"
      >
        <input
          type="text"
          name="first_name"
          value={inputs.first_name}
          onChange={onChange}
          placeholder="First Name"
          className="border rounded-lg px-3 py-2"
          required
        />
        <input
          type="text"
          name="last_name"
          value={inputs.last_name}
          onChange={onChange}
          placeholder="Last Name"
          className="border rounded-lg px-3 py-2"
          required
        />
        <input
          type="email"
          name="email"
          value={inputs.email}
          onChange={onChange}
          placeholder="Email"
          className="border rounded-lg px-3 py-2"
          required
        />
        <input
          type="password"
          name="password"
          value={inputs.password}
          onChange={onChange}
          placeholder="Password"
          className="border rounded-lg px-3 py-2"
          required
        />
        <button
          type="submit"
          className="bg-green-900 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700"
        >
          Add Housekeeper
        </button>
      </form>

      <h3 className="text-xl font-poppins font-bold text-green-900 mb-4">
        Current Housekeepers
      </h3>

      <h3 className="text-xl font-poppins font-bold text-green-900 mb-4">
        Active Housekeepers
      </h3>
      <table className="table-auto w-full border-collapse border border-gray-300 text-left mb-8">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-4 py-2">Name</th>
            <th className="border px-4 py-2">Email</th>
            <th className="border px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {housekeepers
            .filter((hk) => hk.is_active)
            .map((hk) => (
              <tr key={hk.id}>
                <td className="border px-4 py-2">{hk.name}</td>
                <td className="border px-4 py-2">{hk.email}</td>
                <td className="border px-4 py-2">
                  <button
                    onClick={() => toggleStatus(hk.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-500"
                  >
                    Disable
                  </button>
                </td>
              </tr>
            ))}
          {housekeepers.filter((hk) => hk.is_active).length === 0 && (
            <tr>
              <td colSpan="3" className="text-center py-4 text-gray-500">
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
            <th className="border px-4 py-2">Name</th>
            <th className="border px-4 py-2">Email</th>
            <th className="border px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {housekeepers
            .filter((hk) => !hk.is_active)
            .map((hk) => (
              <tr key={hk.id}>
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
          {housekeepers.filter((hk) => !hk.is_active).length === 0 && (
            <tr>
              <td colSpan="3" className="text-center py-4 text-gray-500">
                No disabled housekeepers.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* <table className="table-auto w-full border-collapse border border-gray-300 text-left">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-4 py-2">Name</th>
            <th className="border px-4 py-2">Email</th>
            <th className="border px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {housekeepers.map((hk) => (
            <tr key={hk.id}>
              <td className="border px-4 py-2">{hk.name}</td>
              <td className="border px-4 py-2">{hk.email}</td>
              <td className="border px-4 py-2">
                <button
                  onClick={() => confirmRemove(hk.id)}
                  className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-500"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
          {housekeepers.length === 0 && (
            <tr>
              <td colSpan="3" className="text-center py-4 text-gray-500">
                No housekeepers for {facility}.
              </td>
            </tr>
          )}
        </tbody>
      </table> */}

      <div className="mt-10">
        <h3 className="text-xl font-poppins font-bold text-green-900 mb-4">
          Set Housekeeper Schedule
        </h3>

        {housekeepers.map((hk) => {
          const hkSchedule = schedules.find(
            (s) => s.housekeeper_id === hk.id
          ) || {
            shift_time_in: "08:00",
            shift_time_out: "17:00",
            day_offs: [],
          };

          return (
            <div
              key={hk.id}
              className="border rounded-lg p-4 mb-4 bg-gray-50 shadow-sm"
            >
              <h4 className="font-semibold mb-3">{hk.name}</h4>

              <div className="flex flex-col sm:flex-row gap-2 items-center mb-3">
                <label className="flex flex-col">
                  Time In:
                  <input
                    type="time"
                    className="border p-2 rounded"
                    value={hkSchedule.shift_time_in || ""}
                    onChange={(e) =>
                      setSchedules((prev) =>
                        prev.map((s) =>
                          s.housekeeper_id === hk.id
                            ? { ...s, shift_time_in: e.target.value }
                            : s
                        )
                      )
                    }
                  />
                </label>

                <label className="flex flex-col">
                  Time Out:
                  <input
                    type="time"
                    className="border p-2 rounded"
                    value={hkSchedule.shift_time_out || ""}
                    onChange={(e) =>
                      setSchedules((prev) =>
                        prev.map((s) =>
                          s.housekeeper_id === hk.id
                            ? { ...s, shift_time_out: e.target.value }
                            : s
                        )
                      )
                    }
                  />
                </label>
              </div>

              <label>Day off(s):</label>
              <div className="flex flex-wrap gap-2 mb-3">
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
                    className="flex items-center gap-1 border rounded px-2 py-1 bg-white"
                  >
                    <input
                      type="checkbox"
                      checked={hkSchedule.day_offs.includes(day)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSchedules((prev) =>
                          prev.map((s) =>
                            s.housekeeper_id === hk.id
                              ? {
                                  ...s,
                                  day_offs: checked
                                    ? [...(s.day_offs || []), day]
                                    : s.day_offs.filter((d) => d !== day),
                                }
                              : s
                          )
                        );
                      }}
                    />
                    {day}
                  </label>
                ))}
              </div>

              <button
                onClick={() => handleSaveSchedule(hk)}
                className="bg-green-700 text-white px-4 py-1 rounded hover:bg-green-600"
              >
                Save Schedule
              </button>
            </div>
          );
        })}
      </div>

      <ConfirmModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={toggleStatus}
        message="Are you sure you want to remove this housekeeper?"
      />
    </div>
  );
};

export default AddHousekeeper;
