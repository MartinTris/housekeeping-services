import React from "react";

const DashboardToggle = ({ view, setView }) => {
  return (
    <div className="flex justify-start mb-6">
      <div className="flex bg-gray-100 rounded-full p-1">
        <button
          className={`px-4 py-1 rounded-full text-sm font-medium transition ${
            view === "dashboard"
              ? "bg-green-600 text-white shadow"
              : "text-gray-600 hover:text-green-700"
          }`}
          onClick={() => setView("dashboard")}
        >
          Dashboard
        </button>
        <button
          className={`px-4 py-1 rounded-full text-sm font-medium transition ${
            view === "announcements"
              ? "bg-green-600 text-white shadow"
              : "text-gray-600 hover:text-green-700"
          }`}
          onClick={() => setView("announcements")}
        >
          Announcements
        </button>
      </div>
    </div>
  );
};

export default DashboardToggle;
