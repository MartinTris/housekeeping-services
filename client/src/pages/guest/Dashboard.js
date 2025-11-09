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
  const [serviceType, setServiceType] = useState("regular");
  const [error, setError] = useState("");

  async function fetchProfile() {
    try {
      const res = await fetch("http://localhost:5000/users/me", {
        headers: { token: localStorage.token },
      });
      const data = await res.json();
      setProfile(data);

      // Combine first_name and last_name
      const fullName =
        data.first_name && data.last_name
          ? `${data.first_name} ${data.last_name}`
          : data.name || "";
      setName(fullName);
    } catch (err) {
      console.error("Error fetching profile:", err.message);
    }
  }

  useEffect(() => {
    fetchProfile();
  }, []);

  const generateTimeSlots = () => {
    if (!profile?.facility) {
      setTimeSlots([]);
      return;
    }

    const isHotelRafael =
      profile.facility.toLowerCase().includes("hotel") ||
      profile.facility.toLowerCase().includes("rafael");

    const startHour = isHotelRafael ? 6 : 8;
    const endHour = isHotelRafael ? 17 : 18;
    const intervalMinutes = serviceType === "regular" ? 30 : 60;
    const now = new Date();

    const selectedDate = preferredDate ? new Date(preferredDate) : null;
    const isToday =
      selectedDate &&
      now.toISOString().split("T")[0] ===
        selectedDate.toISOString().split("T")[0];

    // round to next half hour
    let currentHour = now.getHours();
    let currentMinute = now.getMinutes();
    if (currentMinute > 0 && currentMinute <= 30) {
      currentMinute = 30;
    } else if (currentMinute > 30) {
      currentHour += 1;
      currentMinute = 0;
    } else {
      currentMinute = 0;
    }

    const slots = [];
    let slotDuration = intervalMinutes; // 30 or 60 mins
    let slotStart = new Date(selectedDate || now);
    slotStart.setHours(startHour, 0, 0, 0);

    const endTime = new Date(selectedDate || now);
    endTime.setHours(endHour, 0, 0, 0);

    while (slotStart < endTime) {
      const slotEnd = new Date(slotStart.getTime() + slotDuration * 60000);

      // skip past times if today
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

      // move start forward by full duration (30 or 60 min)
      slotStart = new Date(slotStart.getTime() + slotDuration * 60000);
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
          preferred_date: preferredDate, // backend will enforce today
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
    // preferredDate must be set; backend checks today itself
    if (!profile?.facility) return;

    try {
      // backend uses today's date internally; only serviceType is needed
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

  // reset modal (when open set preferredDate to today; when close clear)
  useEffect(() => {
    if (showModal) {
      const today = new Date().toISOString().split("T")[0];
      setPreferredDate(today);
      setPreferredTime("");
      setServiceType("regular");
      setError("");
    } else {
      // keep existing behavior when modal closed
      setPreferredDate("");
      setPreferredTime("");
      setServiceType("regular");
      setError("");
    }
  }, [showModal]);

  useEffect(() => {
    const handler = () => fetchProfile();
    window.addEventListener("userFacilityUpdated", handler);
    return () => window.removeEventListener("userFacilityUpdated", handler);
  }, []);

  // regenerate slots & fetch availability when profile/serviceType/preferredDate changes
  useEffect(() => {
    generateTimeSlots();
    fetchAvailability();
  }, [profile, serviceType, preferredDate]);

    if (view === "announcements") {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <main className="flex-1 p-8">
          <DashboardToggle view={view} setView={setView} />
          <Announcements />
        </main>
      </div>
    );
  }

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

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
          <Information infoName="Total Service Requests" />
          <Information infoName="Request Cooldown" />
          <Information infoName="Remaining Requests (per day)" />
        </div>
        <div className="mt-10">
          <h3 className="text-xl font-semibold mb-4">My Borrowed Items</h3>
          <BorrowedItemsList />
        </div>
        <FeedbackWidget />
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
                >
                  <option value="regular">Regular cleaning (30 min)</option>
                  <option value="deep">Deep cleaning (60 min)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Service Date (Today)
                </label>
                {/* Keep input visible but locked to today by setting min/max = today */}
                <input
                  type="date"
                  value={preferredDate}
                  onChange={(e) => {
                    /* ignore attempts to change date — keep same-day only */
                    // optional: you could show a toast if user tries to change
                  }}
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
