import { useState, useEffect } from "react";

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [facility, setFacility] = useState("");
  const [notCheckedIn, setNotCheckedIn] = useState(false);

  // 🔹 Fetch facility and announcements
  const fetchAnnouncements = async () => {
    try {
      const res = await fetch("http://localhost:5000/dashboard/", {
        headers: { token: localStorage.token },
      });
      const data = await res.json();

      if (!data.facility || data.facility.trim() === "") {
        setNotCheckedIn(true);
        setFacility("");
        setAnnouncements([]);
        return;
      }

      setFacility(data.facility);
      setNotCheckedIn(false);

      const annRes = await fetch("http://localhost:5000/announcements", {
        headers: { token: localStorage.token },
      });

      if (annRes.ok) {
        const announcementsData = await annRes.json();
        setAnnouncements(announcementsData);
      } else {
        setAnnouncements([]);
      }
    } catch (err) {
      console.error("Error fetching announcements:", err);
    }
  };

  // 🔁 Fetch on mount and auto-refresh every 10s
  useEffect(() => {
    fetchAnnouncements();
    const interval = setInterval(fetchAnnouncements, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-6 mt-4">
      <h3 className="text-2xl font-semibold text-green-900 mb-4">
        Facility Announcements
      </h3>

      {/* 🔴 Show message if user not checked in */}
      {notCheckedIn ? (
        <p className="text-red-600 font-medium">
          You are not checked in to a facility.
        </p>
      ) : announcements.length === 0 ? (
        <p className="text-gray-500">No current announcements.</p>
      ) : (
        <ul className="space-y-4">
          {announcements.map((a, i) => (
            <li
              key={i}
              className="border border-gray-200 rounded p-4 hover:bg-gray-50 transition"
            >
              <p className="font-bold text-gray-900">
                {a.title || "Announcement"}
              </p>
              <p className="text-gray-600 mt-1">{a.message}</p>
              <p className="text-gray-500 text-sm mt-2">
                Posted by{" "}
                <span className="font-medium text-gray-800">
                  {a.admin_name || "Unknown Admin"}
                </span>{" "}
                • {new Date(a.created_at).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Announcements;
