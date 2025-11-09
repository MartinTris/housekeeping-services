import { Link, useLocation } from "react-router-dom";
import socket from "../socket";

const Menu = ({ setAuth, role }) => {
  const location = useLocation();

  const adminItems = [
    { name: "Dashboard", path: "/admin" },
    { name: "Add/Remove Guest", path: "/admin/guests" },
    { name: "Add/Remove Housekeeper", path: "/admin/housekeepers" },
    { name: "Service Requests", path: "/admin/requests" },
    { name: "Item List", path: "/admin/item-list" },
    { name: "Feedback", path: "/admin/feedback" },
    { name: "Reports", path: "/admin/reports" },
  ];

  const guestItems = [
    { name: "Dashboard", path: "/guest" },
    { name: "My Profile", path: "/guest/profile" },
    { name: "Borrow Items", path: "/guest/borrow-items" },
    { name: "System Feedback", path: "/guest/system-feedback" },
  ];

  const housekeeperItems = [
    { name: "Dashboard", path: "/housekeeper" },
    { name: "Tasks", path: "/housekeeper/tasks" },
    { name: "Service Feedback", path: "/housekeeper/feedback" },
  ];

  let items = [];
  let panelTitle = "";

  if (role === "admin") {
    items = adminItems;
    panelTitle = "Admin Panel";
  } else if (role === "housekeeper") {
    items = housekeeperItems;
    panelTitle = "Housekeeper Panel";
  } else {
    items = guestItems;
    panelTitle = "Guest Panel";
  }

  const isActive = (path) => {
    if (path === "/admin" || path === "/guest" || path === "/housekeeper") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col p-6 shadow-sm overflow-hidden">
      <h2 className="text-xl font-poppins font-bold mb-6 text-green-800">
        {panelTitle}
      </h2>

      {items.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={`px-4 py-2 mb-2 rounded transition ${
            isActive(item.path)
              ? "bg-green-100 text-green-800 font-semibold"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          {item.name}
        </Link>
      ))}

      <button
        onClick={() => {
          try {
            socket.disconnect();
          } catch (err) {
            console.warn("Socket disconnect failed:", err);
          }

          localStorage.removeItem("token");
          if (typeof setAuth === "function") setAuth(false);
          window.location.href = "/login";
        }}
        className="mt-auto text-sm text-red-500 hover:text-red-700 transition"
      >
        Logout
      </button>
    </aside>
  );
};

export default Menu;
