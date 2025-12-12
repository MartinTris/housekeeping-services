import Information from "../../components/Information";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import BorrowedItemsList from "../../components/BorrowedItemsList";
import DashboardToggle from "../../components/DashboardToggle.js";
import Announcements from "../../components/Announcements";
import FeedbackWidget from "../../components/FeedbackWidget";
import { Wallet } from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const pad = (n) => String(n).padStart(2, "0");

const GuestDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [remainingBalance, setRemainingBalance] = useState(0);
  const dailyLimit = 3;

  useEffect(() => {
    const viewParam = searchParams.get("view");
    if (viewParam === "announcements") {
      setView("announcements");
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const handleSetView = (newView) => {
    setView(newView);
    if (newView === "announcements") {
      setSearchParams({ view: "announcements" });
    } else {
      setSearchParams({});
    }
  };

  async function fetchProfile() {
    try {
      const res = await fetch(`${API_URL}/users/me`, {
        headers: { token: localStorage.getItem("token") },
      });
      const data = await res.json();
      console.log("Fetched profile:", data);
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
        `${API_URL}/housekeeping-requests/user/total`,
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
        `${API_URL}/housekeeping-requests/user/today`,
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

  async function fetchRemainingBalance() {
    try {
      const response = await fetch(`${API_URL}/items/borrowed`, {
        headers: { token: localStorage.getItem("token") },
      });

      const data = await response.json();

      if (response.ok) {
        const validData = Array.isArray(data) ? data : [];

        const unpaidItems = validData.filter((item) => {
          const isPaid =
            item.is_paid === true ||
            item.is_paid === "true" ||
            item.is_paid === 1;
          return !isPaid;
        });

        const totalAmount = unpaidItems.reduce(
          (sum, item) => sum + Number(item.charge_amount || 0),
          0
        );
        setRemainingBalance(totalAmount);
      }
    } catch (err) {
      console.error("Error fetching remaining balance:", err);
    }
  }

  async function fetchServiceTypes() {
    try {
      const res = await fetch(`${API_URL}/service-types`, {
        headers: { token: localStorage.getItem("token") },
      });

      const data = await res.json();
      console.log("Fetched service types:", data);
      setServiceTypes(data);
    } catch (err) {
      console.error("Error fetching service types:", err);
    }
  }

  const refreshData = async () => {
    await Promise.all([
      fetchProfile(),
      fetchTotalRequests(),
      fetchTodayRequests(),
      fetchRemainingBalance(),
    ]);
  };

  useEffect(() => {
    fetchProfile();
    fetchTotalRequests();
    fetchTodayRequests();
    fetchServiceTypes();
    fetchRemainingBalance();
  }, []);

    useEffect(() => {
    const intervalId = setInterval(() => {
      console.log("Auto-refreshing data...");
      refreshData();
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  const generateTimeSlots = () => {
    if (!profile?.facility) {
      console.log("No facility, skipping time slot generation");
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

      slotStart = new Date(slotStart.getTime() + intervalMinutes * 60000);
    }

    console.log("Generated time slots:", slots.length);
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
      const res = await fetch(`${API_URL}/housekeeping-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token: localStorage.getItem("token"),
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

        refreshData();
      } else {
        setError(data.error || "Something went wrong.");
      }
    } catch (err) {
      console.error("Submit error:", err.message);
      setError("Failed to submit request.");
    }
  };

  async function fetchAvailability() {
    if (!profile?.facility || !serviceType) {
      console.log("Skipping availability check:", {
        hasFacility: !!profile?.facility,
        hasServiceType: !!serviceType,
      });
      return;
    }

    try {
      const res = await fetch(
        `${API_URL}/housekeeping-requests/availability?serviceType=${serviceType}`,
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
    const handler = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      try {
        const res = await fetch(`${API_URL}/users/me`, {
          headers: { token: localStorage.getItem("token") },
        });
        const data = await res.json();
        setProfile(data);

        const fullName =
          data.first_name && data.last_name
            ? `${data.first_name} ${data.last_name}`
            : data.name || "";
        setName(fullName);

        if (data.facility) {
          await fetchServiceTypes();
          await fetchTotalRequests();
          await fetchTodayRequests();

          setTimeout(() => {
            if (showModal && serviceType && preferredDate) {
              generateTimeSlots();
              fetchAvailability();
            }
          }, 300);
        }
      } catch (err) {
        console.error(" Error refetching profile:", err);
      }
    };

    window.addEventListener("userFacilityUpdated", handler);
    return () => window.removeEventListener("userFacilityUpdated", handler);
  }, [showModal, serviceType, preferredDate]);

  useEffect(() => {
    if (profile?.facility) {
      console.log("Facility detected in profile:", profile.facility);
      fetchServiceTypes();
    }
  }, [profile?.facility]);

  useEffect(() => {
    if (serviceType && preferredDate && profile?.facility) {
      generateTimeSlots();
      fetchAvailability();
    }
  }, [profile?.facility, serviceType, preferredDate, serviceTypes]);

  return (
    <div className="flex w-full min-h-screen font-sans bg-gray-50">
      <main className="flex-1 p-4 sm:p-8">
        <DashboardToggle view={view} setView={handleSetView} />

        {view === "dashboard" && (
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
            <div className="flex-1 w-full">
              <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-2xl p-4 sm:p-8 mb-4 sm:mb-6 shadow-md border border-green-100">
                <h2 className="text-2xl sm:text-3xl font-poppins font-bold text-green-800 mb-2">
                  Welcome, {name}
                </h2>
                <p className="font-poppins text-sm sm:text-base text-green-700 mb-4 sm:mb-6">
                  {profile?.facility || "No facility assigned"}
                </p>

                {!profile?.facility && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 sm:p-4 mb-4">
                    <p className="text-yellow-700 text-sm sm:text-base">
                      ⚠️ You are not assigned to a room yet.
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setShowModal(true)}
                  disabled={!profile?.facility || !profile?.current_booking?.room_id}
                  className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-full shadow-lg hover:scale-105 hover:from-green-700 hover:to-emerald-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm sm:text-base"
                >
                  Request a Service
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <Information
                  infoName="Total Service Requests"
                  value={totalRequests}
                  className="glass-card"
                />
                <Information
                  infoName="Remaining Requests (per day)"
                  value={Math.max(dailyLimit - todayRequests, 0)}
                  className="glass-card"
                />
              </div>

              <div className="mt-6 sm:mt-8">
                <FeedbackWidget />
              </div>
            </div>

            <div className="w-full lg:w-96 lg:flex-shrink-0 space-y-4">
              <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-4 sm:p-6 rounded-xl shadow-md border border-green-100">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-3 sm:p-4 bg-white rounded-xl shadow-sm">
                    <Wallet className="text-green-600" size={28} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-green-700 mb-1">Remaining Balance</p>
                    <p className="text-2xl sm:text-3xl font-bold text-green-800 break-words">₱{remainingBalance.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <BorrowedItemsList />
            </div>
          </div>
        )}

        {view === "announcements" && <Announcements />}
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg text-green-900 sm:text-xl font-bold mb-4">Request Service</h3>

            {error && <p className="text-red-500 mb-2 text-sm sm:text-base">{error}</p>}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Type
                </label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="mt-1 block w-full border rounded p-2 text-sm sm:text-base"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Date (Today)
                </label>
                <input
                  type="date"
                  value={preferredDate}
                  onChange={(e) => {}}
                  className="mt-1 block w-full border rounded p-2 bg-gray-100 text-gray-700 cursor-not-allowed text-sm sm:text-base"
                  min={preferredDate}
                  max={preferredDate}
                  readOnly
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Time
                </label>
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="mt-1 block w-full border rounded p-2 text-sm sm:text-base"
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

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-gray-200 rounded-full hover:bg-gray-300 transition text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-full hover:scale-105 hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg text-sm sm:text-base"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuestDashboard;