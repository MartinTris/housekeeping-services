import Information from "../../components/Information";
import { useState, useEffect } from "react";
import BorrowedItemsList from "../../components/BorrowedItemsList";
import AdminFeedbackWidget from "../../components/AdminFeedbackWidget.js";
import HousekeepingTrends from "../../components/HousekeepingTrends.js";
import HousekeeperRatingsList from "../../components/HousekeeperRatingsList.js";
import AdminServiceRequest from "../../components/AdminServiceRequest.js";

const AdminDashboard = () => {
  const [name, setName] = useState("");
  const [facility, setFacility] = useState("");

  const [housekeeperCount, setHousekeeperCount] = useState(0);
  const [totalGuests, setTotalGuests] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);
  const [averageRating, setAverageRating] = useState(0);

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

  async function getName() {
    try {
      const response = await fetch("http://localhost:5000/dashboard/", {
        method: "GET",
        headers: { token: localStorage.token },
      });
      const parseRes = await response.json();
      setName(parseRes.name);
      setFacility(parseRes.facility);
    } catch (err) {
      console.error(err.message);
    }
  }

  async function getHousekeeperCount() {
    try {
      const response = await fetch("http://localhost:5000/housekeepers", {
        method: "GET",
        headers: { token: localStorage.token },
      });
      const parseRes = await response.json();
      setHousekeeperCount(parseRes.length);
    } catch (err) {
      console.error(err.message);
    }
  }

  async function getTotalGuests() {
    try {
      const res = await fetch("http://localhost:5000/rooms", {
        headers: { token: localStorage.token },
      });
      const data = await res.json();
      const occupied = data.filter((r) => r.occupied_by !== null);
      setTotalGuests(occupied.length);
    } catch (err) {
      console.error("Error fetching total guests:", err.message);
    }
  }

  async function fetchTotalRequests() {
    try {
      const res = await fetch(
        "http://localhost:5000/housekeeping-requests/admin/total",
        {
          headers: { token: localStorage.token },
        }
      );
      const data = await res.json();
      if (res.ok) {
        setTotalRequests(data.count);
      } else {
        console.error("Error fetching total requests:", data.error);
      }
    } catch (err) {
      console.error("Error fetching total requests:", err);
    }
  }

  async function getAverageRating() {
    try {
      const res = await fetch("http://localhost:5000/feedback/admin", {
        headers: { token: localStorage.token },
      });
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
    getName();
  }, []);

  useEffect(() => {
    if (facility) {
      getHousekeeperCount();
      getTotalGuests();
      fetchTotalRequests();
      getAverageRating();
    }
  }, [facility]);

  useEffect(() => {
    fetchMyAnnouncements();
    const interval = setInterval(fetchMyAnnouncements, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchAdminFeedback = async () => {
      try {
        const res = await fetch("http://localhost:5000/feedback/admin", {
          headers: { token: localStorage.token },
        });
        const data = await res.json();
        console.log("Admin feedback:", data);
        setAdminFeedback(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchAdminFeedback();
  }, []);

  const handleSelectAll = () => {
    const newValue = !selectAll;
    setSelectAll(newValue);
    setTargetGuests(newValue);
    setTargetHousekeepers(newValue);
  };

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();

    if (!targetGuests && !targetHousekeepers) {
      alert("Please select at least one recipient group.");
      return;
    }

    if (!message.trim()) {
      alert("Please enter an announcement message.");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/announcements", {
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
          facility,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Announcement posted successfully!");
        setTitle("");
        setMessage("");
        setTargetGuests(false);
        setTargetHousekeepers(false);
        setSelectAll(false);
        setShowModal(false);
      } else {
        alert(data.error || "Failed to post announcement.");
      }
    } catch (err) {
      console.error("Error posting announcement:", err.message);
      alert("Server error. Please try again later.");
    }
  };

  async function fetchMyAnnouncements() {
    try {
      const res = await fetch("http://localhost:5000/announcements/admin", {
        headers: { token: localStorage.token },
      });
      const data = await res.json();
      setMyAnnouncements(data);
    } catch (err) {
      console.error("Error fetching admin announcements:", err.message);
    }
  }

  useEffect(() => {
    fetchMyAnnouncements();
  }, []);

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this announcement?"))
      return;
    try {
      const res = await fetch(`http://localhost:5000/announcements/${id}`, {
        method: "DELETE",
        headers: { token: localStorage.token },
      });
      if (res.ok) {
        setMyAnnouncements(myAnnouncements.filter((a) => a.id !== id));
      } else {
        alert("Failed to delete announcement.");
      }
    } catch (err) {
      console.error("Error deleting announcement:", err.message);
    }
  }

  async function handleEditSave(e) {
    e.preventDefault();
    try {
      const res = await fetch(
        `http://localhost:5000/announcements/${editingId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            token: localStorage.token,
          },
          body: JSON.stringify({ title: editTitle, message: editMessage }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        setMyAnnouncements(
          myAnnouncements.map((a) => (a.id === editingId ? data : a))
        );
        setEditingId(null);
        setEditTitle("");
        setEditMessage("");
      } else {
        alert(data.error || "Failed to update announcement");
      }
    } catch (err) {
      console.error("Error updating announcement:", err.message);
    }
  }

  return (
    <div className="flex w-full min-h-screen font-sans">
      <main className="flex-1 p-8">
        <h2 className="text-3xl font-poppins font-bold text-green-900 mb-2">
          Welcome, {name}
        </h2>
        <p className="text-gray-500 mb-6">{facility}</p>

        <button
          onClick={() => setShowModal(true)}
          className="mb-8 px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full shadow-lg hover:scale-105 hover:from-green-600 hover:to-green-700 transition-all duration-300"
        >
          Post an Announcement
        </button>
        <AdminServiceRequest />

        <div className="grid grid-cols-1 lg:grid-cols-[3fr,1fr] gap-8">
          <div>
            <HousekeepingTrends />

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-6 mt-8">
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

            <aside className="mt-8">
              <BorrowedItemsList />
            </aside>
            <AdminFeedbackWidget feedback={adminFeedback} />
          </div>
          <HousekeeperRatingsList />
          {/* Announcements Sidebar */}
          <aside className="sticky top-20 self-start w-full lg:w-90 bg-white/90 backdrop-blur-md border border-green-100 rounded-3xl p-6 shadow-lg h-[40vh] overflow-y-auto transition-all duration-300">
            <h3 className="text-xl font-semibold text-green-900 mb-5 flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 text-green-700"
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
                  className="border border-green-100 rounded-2xl p-4 mb-4 bg-green-50/40 hover:bg-green-50/70 shadow-sm hover:shadow-md transition-all duration-300"
                >
                  {editingId === a.id ? (
                    <form onSubmit={handleEditSave} className="space-y-3">
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
                          type="submit"
                          className="text-green-700 font-semibold text-sm hover:text-green-900 transition"
                        >
                          Save
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <h4 className="font-semibold text-green-900 text-base">
                        {a.title}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                        {a.message}
                      </p>
                      <div className="flex justify-end gap-4 mt-3">
                        <button
                          onClick={() => {
                            setEditingId(a.id);
                            setEditTitle(a.title);
                            setEditMessage(a.message);
                          }}
                          className="text-blue-600 text-sm font-medium hover:text-blue-800 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(a.id)}
                          className="text-red-500 text-sm font-medium hover:text-red-700 transition"
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
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-[700px] max-w-[90%]">
            <h3 className="text-2xl font-semibold text-gray-900 mb-6">
              Post New Announcement
            </h3>

            <form onSubmit={handlePostAnnouncement} className="space-y-6">
              <div className="flex flex-wrap gap-4 items-center">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full shadow hover:scale-105 hover:from-green-600 hover:to-green-700 transition duration-300"
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
                  <span className="font-medium text-gray-700">For Guests</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={targetHousekeepers}
                    onChange={(e) => setTargetHousekeepers(e.target.checked)}
                    className="accent-green-500"
                  />
                  <span className="font-medium text-gray-700">
                    For Housekeepers
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Title
                </label>
                <input
                  type="text"
                  placeholder="Enter announcement title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-400"
                  required
                />
              </div>

              <div>
                <textarea
                  rows="5"
                  placeholder="Write your announcement here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-400"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2 bg-gray-200 rounded-full hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full shadow hover:scale-105 hover:from-green-600 hover:to-green-700 transition duration-300"
                >
                  Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
