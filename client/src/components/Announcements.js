import { useState, useEffect } from "react";
import { Megaphone, ChevronLeft, ChevronRight } from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [facility, setFacility] = useState("");
  const [role, setRole] = useState("");
  const [notCheckedIn, setNotCheckedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch("http://localhost:5000/dashboard/", {
        headers: { token: localStorage.token },
      });
      const data = await res.json();

      // For guests and housekeepers, check if they're checked in
      if ((data.role === "guest" || data.role === "housekeeper") && 
          (!data.facility || data.facility.trim() === "")) {
        setNotCheckedIn(true);
        setFacility("");
        setRole(data.role);
        setAnnouncements([]);
        return;
      }

      setFacility(data.facility);
      setRole(data.role);
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

  // Calculate pagination
  const totalPages = Math.ceil(announcements.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAnnouncements = announcements.slice(indexOfFirstItem, indexOfLastItem);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Reset to page 1 if announcements change and current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [announcements.length, totalPages, currentPage]);

  // Get title based on role
  const getTitle = () => {
    if (role === "admin" || role === "superadmin") {
      return "Admin Announcements";
    } else if (role === "housekeeper") {
      return "Housekeeper Announcements";
    } else {
      return "Facility Announcements";
    }
  };

  // Get empty message based on role
  const getEmptyMessage = () => {
    if (role === "admin" || role === "superadmin") {
      return "No announcements for admins at this time.";
    } else if (role === "housekeeper") {
      return "No announcements for housekeepers at this time.";
    } else {
      return "No current announcements.";
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-green-200 rounded-3xl shadow-lg p-8 max-w-3xl mx-auto transition-all duration-300">
      <div className="flex items-center gap-3 mb-6 border-b border-green-100 pb-3">
        <Megaphone className="text-green-800 w-7 h-7" />
        <h3 className="text-2xl font-bold text-green-900 font-poppins">
          {getTitle()}
        </h3>
      </div>

      {notCheckedIn ? (
        <p className="text-red-600 font-medium text-lg">
          You are not checked in to a facility.
        </p>
      ) : announcements.length === 0 ? (
        <p className="text-gray-500 text-lg">{getEmptyMessage()}</p>
      ) : (
        <>
          <ul className="space-y-5">
            {currentAnnouncements.map((a, i) => (
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
                {/* Show facility for superadmins */}
                {role === "superadmin" && a.facility && (
                  <p className="text-xs text-gray-500 mt-2">
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

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={18} />
                Previous
              </button>
              
              <span className="text-gray-700 font-medium">
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Announcements;