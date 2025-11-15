import { useState, useEffect } from "react";
import { Megaphone } from "lucide-react";

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [facility, setFacility] = useState("");
  const [notCheckedIn, setNotCheckedIn] = useState(false);

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

  useEffect(() => {
    fetchAnnouncements();
    const interval = setInterval(fetchAnnouncements, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-green-200 rounded-3xl shadow-lg p-8 max-w-3xl mx-auto transition-all duration-300">
      <div className="flex items-center gap-3 mb-6 border-b border-green-100 pb-3">
        <Megaphone className="text-green-800 w-7 h-7" />
        <h3 className="text-2xl font-bold text-green-900 font-poppins">
          Facility Announcements
        </h3>
      </div>

      {notCheckedIn ? (
        <p className="text-red-600 font-medium text-lg">
          You are not checked in to a facility.
        </p>
      ) : announcements.length === 0 ? (
        <p className="text-gray-500 text-lg">No current announcements.</p>
      ) : (
        <ul className="space-y-5 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-green-300 scrollbar-track-green-100 hover:scrollbar-thumb-green-400">
          {announcements.map((a, i) => (
            <li
              key={i}
              className="bg-green-50 border border-green-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:bg-green-50/80 transition-all duration-300"
            >
              <p className="font-semibold text-xl text-green-900">
                {a.title || "Announcement"}
              </p>
              <p className="text-gray-700 text-base mt-2 leading-relaxed">
                {a.message}
              </p>
              <p className="text-gray-500 text-sm mt-3">
                Posted by{" "}
                <span className="font-medium text-green-800">
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
