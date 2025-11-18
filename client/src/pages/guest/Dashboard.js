import Information from "../../components/Information";
import { useState, useEffect } from "react";
import BorrowedItemsList from "../../components/BorrowedItemsList";
import DashboardToggle from "../../components/DashboardToggle.js";
import Announcements from "../../components/Announcements";
import FeedbackWidget from "../../components/FeedbackWidget";

const pad = (n) => String(n).padStart(2, "0");

const GuestDashboard = () => {
  const [view, setView] = useState("dashboard");
  const [name, setName] = useState("");
  const [profile, setProfile] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [timeSlots, setTimeSlots] = useState([]);
  const [availability, setAvailability] = useState({});
  const [serviceType, setServiceType] = useState("");
  const [error, setError] = useState("");
  const [serviceTypes, setServiceTypes] = useState([]);

  const [totalRequests, setTotalRequests] = useState(0);
  const [todayRequests, setTodayRequests] = useState(0);
  const dailyLimit = 3;

  async function fetchProfile() {
    try {
      const res = await fetch("http://localhost:5000/users/me", {
        headers: { token: localStorage.token },
      });
      const data = await res.json();
      setProfile(data);

      const fullName =
        data.first_name && data.last_name
          ? `${data.first_name} ${data.last_name}`
          : data.name || "";
      setName(fullName);
    } catch (err) {
      console.error("Error fetching profile:", err.message);
    }
  }

  async function fetchTotalRequests() {
    try {
      const res = await fetch(
        "http://localhost:5000/housekeeping-requests/user/total",
        { headers: { token: localStorage.token } }
      );
      if (!res.ok) {
        const text = await res.text();
        console.error("Server returned:", text);
        return;
      }
      const data = await res.json();
      setTotalRequests(data.count);
    } catch (err) {
      console.error("Fetch total requests failed:", err);
    }
  }

  async function fetchTodayRequests() {
    try {
      const res = await fetch(
        "http://localhost:5000/housekeeping-requests/user/today",
        { headers: { token: localStorage.token } }
      );
      if (!res.ok) {
        const text = await res.text();
        console.error("Server returned:", text);
        return;
      }
      const data = await res.json();
      setTodayRequests(data.count);
    } catch (err) {
      console.error("Fetch today requests failed:", err);
    }
  }

  async function fetchServiceTypes() {
    try {
      const res = await fetch("http://localhost:5000/service-types", {
        headers: { token: localStorage.token },
      });

      const data = await res.json();
      setServiceTypes(data);
    } catch (err) {
      console.error("Error fetching service types:", err);
    }
  }

  useEffect(() => {
    fetchProfile();
    fetchTotalRequests();
    fetchTodayRequests();
    fetchServiceTypes();
  }, []);

  const generateTimeSlots = () => {
    if (!profile?.facility) {
      setTimeSlots([]);
      return;
    }

    const isHotelRafael =
      profile.facility.toLowerCase().includes("hotel") ||
      profile.facility.toLowerCase().includes("rafael");

    const startHour = isHotelRafael ? 0 : 0;
    const endHour = isHotelRafael ? 24 : 24;

    const getServiceDuration = () => {
      const selected = serviceTypes.find((t) => t.name === serviceType);
      return selected ? selected.duration : 30;
    };

    const intervalMinutes = getServiceDuration(); // This is your slot interval
    const now = new Date();

    const selectedDate = preferredDate ? new Date(preferredDate) : null;
    const isToday =
      selectedDate &&
      now.toISOString().split("T")[0] ===
        selectedDate.toISOString().split("T")[0];

    const slots = [];
    let slotDuration = intervalMinutes;
    let slotStart = new Date(selectedDate || now);
    slotStart.setHours(startHour, 0, 0, 0);

    const endTime = new Date(selectedDate || now);
    endTime.setHours(endHour, 0, 0, 0);

    while (slotStart < endTime) {
      const slotEnd = new Date(slotStart.getTime() + slotDuration * 60000);

      if (isToday && slotEnd <= now) {
        slotStart = new Date(slotStart.getTime() + slotDuration * 60000);
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

      // ✅ CHANGED: Move forward by the service duration, not a fixed 30 minutes
      slotStart = new Date(slotStart.getTime() + intervalMinutes * 60000);
    }

    setTimeSlots(slots);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!profile?.current_booking?.room_id) {
      setError("You must be assigned to a room to request service.");
      return;
    }
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
        alert("Service request submitted!");
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
    // Don't fetch if we don't have required data
    if (!profile?.facility || !serviceType) {
      console.log("Skipping availability check:", {
        hasFacility: !!profile?.facility,
        hasServiceType: !!serviceType,
      });
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:5000/housekeeping-requests/availability?serviceType=${serviceType}`,
        {
          headers: { token: localStorage.token },
        }
      );

      if (!res.ok) {
        console.error("Availability check failed:", res.status);
        return;
      }

      const data = await res.json();
      setAvailability(data || {});
    } catch (err) {
      console.error("Error fetching availability:", err);
    }
  }

  // Add this new useEffect to set initial service type when loaded
  useEffect(() => {
    if (serviceTypes.length > 0 && !serviceType) {
      setServiceType(serviceTypes[0].name);
    }
  }, [serviceTypes]);

  useEffect(() => {
    if (showModal) {
      const today = new Date().toISOString().split("T")[0];
      setPreferredDate(today);
      setPreferredTime("");
      // Set serviceType if we have service types loaded and it's not set yet
      if (serviceTypes.length > 0 && !serviceType) {
        setServiceType(serviceTypes[0].name);
      }
      setError("");
    } else {
      setPreferredDate("");
      setPreferredTime("");
      setError("");
    }
  }, [showModal]);

  useEffect(() => {
    const handler = () => {
      fetchProfile();
      fetchServiceTypes(); // Add this
      // If modal is open, regenerate time slots
      if (showModal) {
        generateTimeSlots();
      }
    };
    window.addEventListener("userFacilityUpdated", handler);
    return () => window.removeEventListener("userFacilityUpdated", handler);
  }, [showModal]); // Add showModal as dependency

  useEffect(() => {
    if (serviceType && preferredDate) {
      generateTimeSlots();
      fetchAvailability();
    }
  }, [profile, serviceType, preferredDate, serviceTypes]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <main className="flex-1 p-8">
        <DashboardToggle view={view} setView={setView} />
        <h2 className="text-3xl font-poppins font-bold text-green-900 mb-2">
          Welcome, {name}
        </h2>
        <button
          className="text-gray-600 mb-6 underline"
          onClick={() => setShowModal(true)}
        >
          Request a service
        </button>

        {view === "dashboard" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
              <Information
                infoName="Total Service Requests"
                value={totalRequests}
              />
              <Information
                infoName="Remaining Requests (per day)"
                value={Math.max(dailyLimit - todayRequests, 0)}
              />
            </div>
            <div className="mt-10">
              <h3 className="text-xl font-semibold mb-4">My Borrowed Items</h3>
              <BorrowedItemsList />
            </div>
            <FeedbackWidget />
          </>
        )}

        {view === "announcements" && <Announcements />}
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h3 className="text-xl font-bold mb-4">Request Service</h3>

            {error && <p className="text-red-500 mb-2">{error}</p>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Service Type
                </label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="mt-1 block w-full border rounded p-2"
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
                  className="mt-1 block w-full border rounded p-2 bg-gray-100 text-gray-700 cursor-not-allowed"
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
                  className="mt-1 block w-full border rounded p-2"
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
                      {s.label} {!availability[s.value] ? " (Unavailable)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded"
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

export default GuestDashboard;
