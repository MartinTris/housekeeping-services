import Information from "../../components/Information";
import { useState, useEffect } from "react";
import BorrowedItemsList from "../../components/BorrowedItemsList";
import AdminFeedbackWidget from "../../components/AdminFeedbackWidget.js";

const AdminDashboard = () => {
  const [name, setName] = useState("");
  const [facility, setFacility] = useState("");
  const [housekeeperCount, setHousekeeperCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [targetStudents, setTargetStudents] = useState(false);
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

  useEffect(() => {
    getName();
  }, []);

  useEffect(() => {
    if (facility) {
      getHousekeeperCount();
    }
  }, [facility]);

  useEffect(() => {
    fetchMyAnnouncements(); // fetch immediately when component mounts
    const interval = setInterval(fetchMyAnnouncements, 5000); // refresh every 5s
    return () => clearInterval(interval); // cleanup
  }, []);

  useEffect(() => {
  const fetchAdminFeedback = async () => {
    try {
      const res = await fetch("http://localhost:5000/feedback/admin", {
        headers: { token: localStorage.token },
      });
      const data = await res.json();
      console.log("Admin feedback:", data); // <-- see what comes back
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
    setTargetStudents(newValue);
    setTargetGuests(newValue);
    setTargetHousekeepers(newValue);
  };

  // ✅ Posting announcement
  const handlePostAnnouncement = async (e) => {
    e.preventDefault();

    if (!targetStudents && !targetGuests && !targetHousekeepers) {
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
          target_students: targetStudents,
          target_guests: targetGuests,
          target_housekeepers: targetHousekeepers,
          facility, // ✅ include facility
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Announcement posted successfully!");
        setTitle("");
        setMessage("");
        setTargetStudents(false);
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

  // Handle delete
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

  // Handle edit
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
    <div className="flex min-h-screen bg-gray-50">
      <main className="flex-1 p-8">
        <h2 className="text-3xl font-poppins font-bold text-green-900 mb-2">
          Welcome, {name}
        </h2>
        <p className="text-gray-600 mb-6">{facility}</p>

        <button
          onClick={() => setShowModal(true)}
          className="mb-8 px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          Post an Announcement
        </button>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
          <Information infoName="Total Guests" />
          <Information infoName="Occupied Rooms" />
          <Information infoName="Average Rating" />
          <Information infoName="Pending Payments" />
          <Information infoName="Total Housekeepers" value={housekeeperCount} />
        </div>

        <aside>
          <BorrowedItemsList />
        </aside>
        <AdminFeedbackWidget feedback={adminFeedback} />


        <div className="fixed right-8 top-24 w-80 bg-white shadow-lg rounded-lg p-4 h-[75vh] overflow-y-auto">
          <h3 className="text-lg font-semibold text-green-900 mb-3">
            Your Announcements
          </h3>
          {myAnnouncements.length === 0 ? (
            <p className="text-gray-500 text-sm">No announcements yet.</p>
          ) : (
            myAnnouncements.map((a) => (
              <div
                key={a.id}
                className="border border-gray-200 rounded-lg p-3 mb-3 bg-gray-50"
              >
                {editingId === a.id ? (
                  <form onSubmit={handleEditSave} className="space-y-2">
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded p-2 text-sm"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                    <textarea
                      rows="3"
                      className="w-full border border-gray-300 rounded p-2 text-sm"
                      value={editMessage}
                      onChange={(e) => setEditMessage(e.target.value)}
                    ></textarea>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-gray-600 text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="text-green-700 font-semibold text-sm"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <h4 className="font-semibold text-gray-800">{a.title}</h4>
                    <p className="text-sm text-gray-600">{a.message}</p>
                    <div className="flex justify-end gap-3 mt-2">
                      <button
                        onClick={() => {
                          setEditingId(a.id);
                          setEditTitle(a.title);
                          setEditMessage(a.message);
                        }}
                        className="text-blue-600 text-sm hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="text-red-600 text-sm hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-[700px] max-w-[90%]">
            <h3 className="text-2xl font-semibold text-green-900 mb-4">
              Post New Announcement
            </h3>

            <form onSubmit={handlePostAnnouncement} className="space-y-6">
              {/* ✅ Select All button */}
              <div className="flex flex-wrap gap-4 items-center">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                >
                  {selectAll ? "Deselect All" : "Select All"}
                </button>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={targetStudents}
                    onChange={(e) => setTargetStudents(e.target.checked)}
                  />
                  <span className="font-medium">For Students</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={targetGuests}
                    onChange={(e) => setTargetGuests(e.target.checked)}
                  />
                  <span className="font-medium">For Guests</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={targetHousekeepers}
                    onChange={(e) => setTargetHousekeepers(e.target.checked)}
                  />
                  <span className="font-medium">For Housekeepers</span>
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
                  className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-600"
                  required
                />
              </div>

              {/* Message */}
              <div>
                <textarea
                  rows="5"
                  placeholder="Write your announcement here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-600"
                ></textarea>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
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
