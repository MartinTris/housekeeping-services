import Information from "../../components/Information";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BorrowedItemsList from "../../components/BorrowedItemsList";
import AdminFeedbackWidget from "../../components/AdminFeedbackWidget.js";
import HousekeepingTrends from "../../components/HousekeepingTrends.js";
import HousekeeperRatingsList from "../../components/HousekeeperRatingsList.js";
import AdminServiceRequest from "../../components/AdminServiceRequest.js";
import DashboardToggle from "../../components/DashboardToggle.js";
import Announcements from "../../components/Announcements.js";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [view, setView] = useState("dashboard");
  const [name, setName] = useState("");
  const [facility, setFacility] = useState("");
  const [role, setRole] = useState("");
  const [actualFacility, setActualFacility] = useState("");
  const [
    selectedFacilitiesForAnnouncement,
    setSelectedFacilitiesForAnnouncement,
  ] = useState([]);
  const [targetAdmins, setTargetAdmins] = useState(false);

  const [housekeeperCount, setHousekeeperCount] = useState(0);
  const [totalGuests, setTotalGuests] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);
  const [averageRating, setAverageRating] = useState(0);

  const [stats, setStats] = useState({
    rcc: { housekeepers: 0, guests: 0, requests: 0 },
    hotelRafael: { housekeepers: 0, guests: 0, requests: 0 },
  });

  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [targetGuests, setTargetGuests] = useState(false);
  const [targetHousekeepers, setTargetHousekeepers] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [myAnnouncements, setMyAnnouncements] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMessage, setEditMessage] = useState("");

  const [adminFeedback, setAdminFeedback] = useState([]);

  const [housekeepers, setHousekeepers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Authentication check - runs first
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    setIsAuthenticated(true);
  }, [navigate]);

  async function getName() {
    try {
      const response = await fetch(`${API_URL}/dashboard/`, {
        method: "GET",
        headers: { token: localStorage.token },
      });
      
      if (response.status === 401 || response.status === 403) {
        navigate("/login", { replace: true });
        return;
      }
      
      const parseRes = await response.json();
      setName(parseRes.name);
      setFacility(parseRes.facility);
      setActualFacility(parseRes.actualFacility || parseRes.facility);
      setRole(parseRes.role);
    } catch (err) {
      console.error(err.message);
    }
  }

  async function getHousekeeperCount() {
    try {
      const res = await fetch(`${API_URL}/housekeepers`, {
        headers: { token: localStorage.token },
      });
      
      if (res.status === 401 || res.status === 403) {
        navigate("/login", { replace: true });
        return;
      }
      
      const data = await res.json();

      setHousekeepers(data);
      setHousekeeperCount(data.length);

      if (role === "superadmin") {
        const rccCount = data.filter((h) => h.facility === "RCC").length;
        const hrCount = data.filter(
          (h) => h.facility === "Hotel Rafael"
        ).length;
        setStats((prev) => ({
          ...prev,
          rcc: { ...prev.rcc, housekeepers: rccCount },
          hotelRafael: { ...prev.hotelRafael, housekeepers: hrCount },
        }));
      }
    } catch (err) {
      console.error("Error fetching housekeepers:", err.message);
    }
  }

  async function getTotalGuests() {
    try {
      const res = await fetch(`${API_URL}/rooms`, {
        headers: { token: localStorage.token },
      });
      
      if (res.status === 401 || res.status === 403) {
        navigate("/login", { replace: true });
        return;
      }
      
      const data = await res.json();

      setRooms(data);

      const activeBookings = data.filter(
        (room) => room.booking && room.booking.is_active
      );

      setTotalGuests(activeBookings.length);

      if (role === "superadmin") {
        const rccGuests = activeBookings.filter(
          (r) => r.facility === "RCC"
        ).length;
        const hrGuests = activeBookings.filter(
          (r) => r.facility === "Hotel Rafael"
        ).length;
        setStats((prev) => ({
          ...prev,
          rcc: { ...prev.rcc, guests: rccGuests },
          hotelRafael: { ...prev.hotelRafael, guests: hrGuests },
        }));
      }
    } catch (err) {
      console.error("Error fetching guest count:", err.message);
    }
  }

  async function fetchTotalRequests() {
    try {
      const res = await fetch(
        `${API_URL}/housekeeping-requests/admin/total`,
        {
          headers: { token: localStorage.token },
        }
      );
      
      if (res.status === 401 || res.status === 403) {
        navigate("/login", { replace: true });
        return;
      }
      
      const data = await res.json();
      if (res.ok) {
        setTotalRequests(data.count);

        if (role === "superadmin" && data.breakdown) {
          setStats((prev) => ({
            ...prev,
            rcc: { ...prev.rcc, requests: data.breakdown.rcc || 0 },
            hotelRafael: {
              ...prev.hotelRafael,
              requests: data.breakdown.hotelRafael || 0,
            },
          }));
        }
      } else {
        console.error("Error fetching total requests:", data.error);
      }
    } catch (err) {
      console.error("Error fetching total requests:", err);
    }
  }

  async function getAverageRating() {
    try {
      const res = await fetch(`${API_URL}/feedback/admin`, {
        headers: { token: localStorage.token },
      });
      
      if (res.status === 401 || res.status === 403) {
        navigate("/login", { replace: true });
        return;
      }
      
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        const avg =
          data.reduce((sum, f) => sum + (f.rating || 0), 0) / data.length;
        setAverageRating(avg.toFixed(1));
      } else {
        setAverageRating(0);
      }
    } catch (err) {
      console.error("Error fetching average rating:", err.message);
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      getName();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (facility && isAuthenticated) {
      getHousekeeperCount();
      getTotalGuests();
      fetchTotalRequests();
      getAverageRating();
    }
  }, [facility, role, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchMyAnnouncements();
      const interval = setInterval(fetchMyAnnouncements, 5000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const fetchAdminFeedback = async () => {
      if (!isAuthenticated) return;
      
      try {
        const res = await fetch(`${API_URL}/feedback/admin`, {
          headers: { token: localStorage.token },
        });
        
        if (res.status === 401 || res.status === 403) {
          navigate("/login", { replace: true });
          return;
        }
        
        const data = await res.json();
        console.log("Admin feedback:", data);
        setAdminFeedback(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchAdminFeedback();
  }, [isAuthenticated]);

  const handleSelectAll = () => {
    const newValue = !selectAll;
    setSelectAll(newValue);
    setTargetGuests(newValue);
    setTargetHousekeepers(newValue);
    if (role === "superadmin") {
      setTargetAdmins(newValue);
    }
  };

  const handleFacilityChange = (facility) => {
    setSelectedFacilitiesForAnnouncement((prev) => {
      if (prev.includes(facility)) {
        return prev.filter((f) => f !== facility);
      } else {
        return [...prev, facility];
      }
    });
  };

  const handlePostAnnouncement = (e) => {
    e.preventDefault();

    if (!targetGuests && !targetHousekeepers && !targetAdmins) {
      alert("Please select at least one recipient group.");
      return;
    }

    if (!message.trim()) {
      alert("Please enter an announcement message.");
      return;
    }

    let announcementFacilities;

    if (role === "superadmin") {
      if (selectedFacilitiesForAnnouncement.length === 0) {
        alert("Please select at least one facility for this announcement.");
        return;
      }
      announcementFacilities = selectedFacilitiesForAnnouncement;
    } else {
      announcementFacilities = [actualFacility];
    }

    fetch(`${API_URL}/announcements`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token: localStorage.token,
      },
      body: JSON.stringify({
        title,
        message,
        target_guests: targetGuests,
        target_housekeepers: targetHousekeepers,
        target_admins: targetAdmins,
        facilities: announcementFacilities,
      }),
    })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          navigate("/login", { replace: true });
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        
        if (data.error) {
          alert(data.error || "Failed to post announcement.");
        } else {
          alert("Announcement posted successfully!");
          setTitle("");
          setMessage("");
          setTargetGuests(false);
          setTargetHousekeepers(false);
          setTargetAdmins(false);
          setSelectAll(false);
          setSelectedFacilitiesForAnnouncement([]);
          setShowModal(false);
          fetchMyAnnouncements();
        }
      })
      .catch((err) => {
        console.error("Error posting announcement:", err.message);
        alert("Server error. Please try again later.");
      });
  };

  async function fetchMyAnnouncements() {
    try {
      const res = await fetch(`${API_URL}/announcements/admin`, {
        headers: { token: localStorage.token },
      });
      
      if (res.status === 401 || res.status === 403) {
        navigate("/login", { replace: true });
        return;
      }
      
      const data = await res.json();
      
      // Always ensure we set an array
      if (Array.isArray(data)) {
        setMyAnnouncements(data);
      } else {
        setMyAnnouncements([]);
      }
    } catch (err) {
      console.error("Error fetching admin announcements:", err.message);
      setMyAnnouncements([]); // Set to empty array on error
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this announcement?"))
      return;
    try {
      const res = await fetch(`${API_URL}/announcements/${id}`, {
        method: "DELETE",
        headers: { token: localStorage.token },
      });
      
      if (res.status === 401 || res.status === 403) {
        navigate("/login", { replace: true });
        return;
      }
      
      if (res.ok) {
        setMyAnnouncements(myAnnouncements.filter((a) => a.id !== id));
      } else {
        alert("Failed to delete announcement.");
      }
    } catch (err) {
      console.error("Error deleting announcement:", err.message);
    }
  }

  function handleEditSave(e) {
    e.preventDefault();
    fetch(`${API_URL}/announcements/${editingId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        token: localStorage.token,
      },
      body: JSON.stringify({ title: editTitle, message: editMessage }),
    })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          navigate("/login", { replace: true });
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        
        if (data.error) {
          alert(data.error || "Failed to update announcement");
        } else {
          setMyAnnouncements(
            myAnnouncements.map((a) => (a.id === editingId ? data : a))
          );
          setEditingId(null);
          setEditTitle("");
          setEditMessage("");
        }
      })
      .catch((err) => {
        console.error("Error updating announcement:", err.message);
      });
  }

  // Don't render until authenticated
  if (!isAuthenticated) {
    return null;
  }

  if (view === "announcements") {
    return (
      <div className="flex w-full min-h-screen font-sans bg-gray-50">
        <main className="flex-1 p-8">
          <DashboardToggle view={view} setView={setView} />
          <Announcements />
        </main>
      </div>
    );
  }

return (
    <div className="flex w-full min-h-screen font-sans bg-gray-50">
      <main className="flex-1 p-4 sm:p-8 lg:ml-64">
        <DashboardToggle view={view} setView={setView} />

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          {/* Left Side - Welcome Box and Main Content */}
          <div className="flex-1 w-full">
            <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-2xl p-4 sm:p-8 mb-4 sm:mb-6 shadow-md border border-green-100">
              <h2 className="text-2xl sm:text-3xl font-poppins font-bold text-green-800 mb-2">
                Welcome, {name}
              </h2>
              <p className="font-poppins text-sm sm:text-base text-green-700 mb-4 sm:mb-6">
                {role === "superadmin" ? "All Facilities" : facility}
              </p>

              <button
                onClick={() => setShowModal(true)}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-full shadow-lg hover:scale-105 hover:from-green-700 hover:to-emerald-700 transition-all duration-300 mb-4 text-sm sm:text-base"
              >
                Post an Announcement
              </button>

              {role === "admin" && (
                <div className="mt-4">
                  <AdminServiceRequest />
                </div>
              )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1">
              <HousekeepingTrends />

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mt-4 sm:mt-8">
                <Information
                  infoName="Total Guests"
                  value={totalGuests}
                  className="glass-card"
                />
                <Information
                  infoName="Total Task Done"
                  value={totalRequests}
                  className="glass-card"
                />
                <Information
                  infoName="Average Service Rating"
                  value={`${averageRating} / 5`}
                  className="glass-card"
                />
                <Information
                  infoName="Total Housekeepers"
                  value={housekeeperCount}
                  className="glass-card"
                />
              </div>

              {role === "superadmin" && (
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow mt-4 sm:mt-8">
                  <h3 className="text-lg sm:text-xl font-bold mb-4 text-green-900">
                    Facility Breakdown
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                      <h4 className="font-semibold text-green-700 text-base sm:text-lg mb-3">
                        RCC
                      </h4>
                      <p className="text-sm sm:text-base text-gray-700">
                        Housekeepers:{" "}
                        <span className="font-semibold">
                          {stats.rcc.housekeepers}
                        </span>
                      </p>
                      <p className="text-sm sm:text-base text-gray-700">
                        Active Guests:{" "}
                        <span className="font-semibold">
                          {stats.rcc.guests}
                        </span>
                      </p>
                      <p className="text-sm sm:text-base text-gray-700">
                        Requests:{" "}
                        <span className="font-semibold">
                          {stats.rcc.requests}
                        </span>
                      </p>
                    </div>
                    <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                      <h4 className="font-semibold text-blue-700 text-base sm:text-lg mb-3">
                        Hotel Rafael
                      </h4>
                      <p className="text-sm sm:text-base text-gray-700">
                        Housekeepers:{" "}
                        <span className="font-semibold">
                          {stats.hotelRafael.housekeepers}
                        </span>
                      </p>
                      <p className="text-sm sm:text-base text-gray-700">
                        Active Guests:{" "}
                        <span className="font-semibold">
                          {stats.hotelRafael.guests}
                        </span>
                      </p>
                      <p className="text-sm sm:text-base text-gray-700">
                        Requests:{" "}
                        <span className="font-semibold">
                          {stats.hotelRafael.requests}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 sm:mt-8">
              <BorrowedItemsList />
            </div>
          </div>

          {/* Right Sidebar - Stacks below on mobile */}
          <div className="w-full lg:w-96 lg:flex-shrink-0 space-y-4 sm:space-y-6">
            <HousekeeperRatingsList />

            <aside className="w-full bg-white/90 backdrop-blur-md border border-green-100 rounded-3xl p-4 sm:p-6 shadow-lg max-h-[40vh] overflow-y-auto transition-all duration-300">
              <h3 className="text-lg sm:text-xl font-semibold text-green-900 mb-4 sm:mb-5 flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4 sm:w-5 sm:h-5 text-green-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v4l3 3m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Your Announcements
              </h3>

              {myAnnouncements.length === 0 ? (
                <p className="text-gray-400 text-sm italic">
                  No announcements yet.
                </p>
              ) : (
                myAnnouncements.map((a) => (
                  <div
                    key={a.id}
                    className="border border-green-100 rounded-2xl p-3 sm:p-4 mb-3 sm:mb-4 bg-green-50/40 hover:bg-green-50/70 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    {editingId === a.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          className="w-full border border-green-200 rounded-xl p-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white/70"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                        />
                        <textarea
                          rows="3"
                          className="w-full border border-green-200 rounded-xl p-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white/70"
                          value={editMessage}
                          onChange={(e) => setEditMessage(e.target.value)}
                        ></textarea>
                        <div className="flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="text-gray-500 text-sm hover:text-gray-700 transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleEditSave}
                            className="text-green-700 font-semibold text-sm hover:text-green-900 transition"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h4 className="font-semibold text-green-900 text-sm sm:text-base">
                          {a.title}
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">
                          {a.message}
                        </p>
                        {role === "superadmin" && a.facility && (
                          <p className="text-xs text-gray-500 mt-1">
                            Facility:{" "}
                            <span
                              className={`font-semibold ${
                                a.facility === "RCC"
                                  ? "text-green-600"
                                  : "text-blue-600"
                              }`}
                            >
                              {a.facility}
                            </span>
                          </p>
                        )}
                        <div className="flex justify-end gap-4 mt-3">
                          <button
                            onClick={() => {
                              setEditingId(a.id);
                              setEditTitle(a.title);
                              setEditMessage(a.message);
                            }}
                            className="text-blue-600 text-xs sm:text-sm font-medium hover:text-blue-800 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(a.id)}
                            className="text-red-500 text-xs sm:text-sm font-medium hover:text-red-700 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </aside>

            <AdminFeedbackWidget feedback={adminFeedback} />
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-4 sm:p-8 rounded-3xl shadow-2xl w-full max-w-[700px] max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">
                Post New Announcement
              </h3>

              <div className="space-y-4 sm:space-y-6">
                {role === "superadmin" && (
                  <div>
                    <label className="block text-gray-700 font-medium mb-2 text-sm sm:text-base">
                      Select Facilities
                    </label>
                    <div className="flex flex-wrap gap-3 sm:gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedFacilitiesForAnnouncement.includes(
                            "RCC"
                          )}
                          onChange={() => handleFacilityChange("RCC")}
                          className="accent-green-500"
                        />
                        <span className="font-medium text-gray-700 text-sm sm:text-base">RCC</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedFacilitiesForAnnouncement.includes(
                            "Hotel Rafael"
                          )}
                          onChange={() => handleFacilityChange("Hotel Rafael")}
                          className="accent-green-500"
                        />
                        <span className="font-medium text-gray-700 text-sm sm:text-base">
                          Hotel Rafael
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-3 sm:gap-4 items-center">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full shadow hover:scale-105 hover:from-green-600 hover:to-green-700 transition duration-300 text-sm sm:text-base"
                  >
                    {selectAll ? "Deselect All" : "Select All"}
                  </button>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={targetGuests}
                      onChange={(e) => setTargetGuests(e.target.checked)}
                      className="accent-green-500"
                    />
                    <span className="font-medium text-gray-700 text-sm sm:text-base">
                      For Guests
                    </span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={targetHousekeepers}
                      onChange={(e) => setTargetHousekeepers(e.target.checked)}
                      className="accent-green-500"
                    />
                    <span className="font-medium text-gray-700 text-sm sm:text-base">
                      For Housekeepers
                    </span>
                  </label>

                  {role === "superadmin" && (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={targetAdmins}
                        onChange={(e) => setTargetAdmins(e.target.checked)}
                        className="accent-green-500"
                      />
                      <span className="font-medium text-gray-700 text-sm sm:text-base">
                        For Admins
                      </span>
                    </label>
                  )}
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2 text-sm sm:text-base">
                    Title
                  </label>
                  <input
                    type="text"
                    placeholder="Enter announcement title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 sm:p-3 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm sm:text-base"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2 text-sm sm:text-base">
                    Message
                  </label>
                  <textarea
                    rows="5"
                    placeholder="Write your announcement here..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 sm:p-3 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm sm:text-base"
                    required
                  ></textarea>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setSelectedFacilitiesForAnnouncement([]);
                    }}
                    className="px-4 sm:px-5 py-2 bg-gray-200 rounded-full hover:bg-gray-300 transition text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePostAnnouncement}
                    className="px-4 sm:px-5 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full shadow hover:scale-105 hover:from-green-600 hover:to-green-700 transition duration-300 text-sm sm:text-base"
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
export default AdminDashboard;