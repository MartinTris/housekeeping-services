import { useState, useEffect } from "react";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const pad = (n) => String(n).padStart(2, "0");

const AdminServiceRequest = () => {
  const [showModal, setShowModal] = useState(false);
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [timeSlots, setTimeSlots] = useState([]);
  const [availability, setAvailability] = useState({});
  const [serviceType, setServiceType] = useState("");
  const [error, setError] = useState("");
  const [serviceTypes, setServiceTypes] = useState([]);

  async function fetchServiceTypes() {
    try {
      const res = await fetch("http://localhost:5000/service-types", {
        headers: { token: localStorage.token },
      });

      const data = await res.json();
      setServiceTypes(data);
      if (data.length > 0) {
        setServiceType(data[0].name);
      }
    } catch (err) {
      console.error("Error fetching service types:", err);
    }
  }

  const generateTimeSlots = () => {
    const getServiceDuration = () => {
      const selected = serviceTypes.find((t) => t.name === serviceType);
      return selected ? selected.duration : 30;
    };

    const intervalMinutes = getServiceDuration();
    const now = new Date();

    const selectedDate = preferredDate ? new Date(preferredDate) : null;
    const isToday =
      selectedDate &&
      now.toISOString().split("T")[0] ===
        selectedDate.toISOString().split("T")[0];

    const slots = [];
    let slotDuration = intervalMinutes;
    let slotStart = new Date(selectedDate || now);
    slotStart.setHours(0, 0, 0, 0);

    const endTime = new Date(selectedDate || now);
    endTime.setHours(24, 0, 0, 0);

    while (slotStart < endTime) {
      const slotEnd = new Date(slotStart.getTime() + slotDuration * 60000);

      if (isToday && slotEnd <= now) {
        slotStart = new Date(slotStart.getTime() + intervalMinutes * 60000);
        continue;
      }

      if (slotEnd > endTime) break;

      const startLabel = slotStart.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
      const endLabel = slotEnd.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });

      const value = `${pad(slotStart.getHours())}:${pad(
        slotStart.getMinutes()
      )}:00`;

      slots.push({ value, label: `${startLabel} - ${endLabel}` });

      slotStart = new Date(slotStart.getTime() + intervalMinutes * 60000);
    }

    setTimeSlots(slots);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!preferredDate || !preferredTime) {
      setError("Please pick a date and time.");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/housekeeping-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token: localStorage.token,
        },
        body: JSON.stringify({
          preferred_date: preferredDate,
          preferred_time: preferredTime,
          service_type: serviceType,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("Service request submitted successfully!");
        setShowModal(false);
        setPreferredDate("");
        setPreferredTime("");
      } else {
        setError(data.error || "Something went wrong.");
      }
    } catch (err) {
      console.error("Submit error:", err.message);
      setError("Failed to submit request.");
    }
  };

  async function fetchAvailability() {
    try {
      const res = await fetch(
        `http://localhost:5000/housekeeping-requests/availability?serviceType=${serviceType}`,
        {
          headers: { token: localStorage.token },
        }
      );
      const data = await res.json();
      setAvailability(data || {});
    } catch (err) {
      console.error("Error fetching availability:", err);
    }
  }

  useEffect(() => {
    fetchServiceTypes();
  }, []);

  useEffect(() => {
    if (showModal) {
      const today = new Date().toISOString().split("T")[0];
      setPreferredDate(today);
      setPreferredTime("");
      if (serviceTypes.length > 0) {
        setServiceType(serviceTypes[0].name);
      }
      setError("");
    } else {
      setPreferredDate("");
      setPreferredTime("");
      if (serviceTypes.length > 0) {
        setServiceType(serviceTypes[0].name);
      } else {
        setServiceType("");
      }
      setError("");
    }
  }, [showModal, serviceTypes]);

  useEffect(() => {
    if (serviceType && preferredDate) {
      generateTimeSlots();
      fetchAvailability();
    }
  }, [serviceType, preferredDate, serviceTypes]);

  return (
    <div className="mb-6">
      <button
        onClick={() => setShowModal(true)}
        className="text-sm text-green-700 hover:text-green-900 underline font-medium"
      >
        Request service for Admin Office
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h3 className="text-xl font-bold mb-4">Request Service</h3>

            {error && <p className="text-red-500 mb-2 text-sm">{error}</p>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Service Type
                </label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="mt-1 block w-full border rounded p-2 text-sm"
                  required
                >
                  <option value="">Select a service</option>
                  {serviceTypes.map((type) => (
                    <option key={type.id} value={type.name}>
                      {type.name} ({type.duration} min)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Service Date (Today)
                </label>
                <input
                  type="date"
                  value={preferredDate}
                  onChange={(e) => {}}
                  className="mt-1 block w-full border rounded p-2 bg-gray-100 text-gray-700 cursor-not-allowed text-sm"
                  min={preferredDate}
                  max={preferredDate}
                  readOnly
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Preferred Time
                </label>
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="mt-1 block w-full border rounded p-2 text-sm"
                  required
                >
                  <option value="">Select a time</option>
                  {timeSlots.map((s, i) => (
                    <option
                      key={i}
                      value={s.value}
                      disabled={!availability[s.value]}
                      style={{
                        color: availability[s.value] ? "black" : "#9CA3AF",
                      }}
                    >
                      {s.label}{" "}
                      {!availability[s.value] ? " (Unavailable)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminServiceRequest;