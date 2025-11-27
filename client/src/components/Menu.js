import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import socket from "../socket";
import { usePermissions } from "../context/PermissionsContext";

const Menu = ({ setAuth, role }) => {
  const location = useLocation();
  const { hasAccess, allAccess, loading } = usePermissions();
  const [isOpen, setIsOpen] = useState(false);

  const pageKeyMap = {
    // Admin pages
    "/admin": "dashboard",
    "/admin/profile": "profile",
    "/admin/guests": "guests",
    "/admin/housekeepers": "housekeepers",
    "/admin/requests": "requests",
    "/admin/item-list": "item_list",
    "/admin/service-types": "service_types",
    "/admin/reports": "reports",
    "/admin/manage-admins": "manage_admins",
    "/admin/page-access": "page_access",
    
    // Guest pages
    "/guest": "dashboard",
    "/guest/profile": "profile",
    "/guest/my-requests": "my_requests",
    "/guest/borrow-items": "borrow_items",
    "/guest/system-feedback": "system_feedback",
    
    // Housekeeper pages
    "/housekeeper": "dashboard",
    "/housekeeper/profile": "profile",
    "/housekeeper/tasks": "tasks",
    "/housekeeper/task-history": "task_history",
  };

  const adminItems = [
    { name: "Dashboard", path: "/admin", pageKey: "dashboard" },
    { name: "My Profile", path: "/admin/profile", pageKey: "profile" },
    { name: "Check in/Check out Guests", path: "/admin/guests", pageKey: "guests" },
    { name: "Manage Housekeepers", path: "/admin/housekeepers", pageKey: "housekeepers" },
    { name: "Service Requests", path: "/admin/requests", pageKey: "requests" },
    { name: "Item List", path: "/admin/item-list", pageKey: "item_list" },
    { name: "Service Types", path: "/admin/service-types", pageKey: "service_types" },
    { name: "Reports", path: "/admin/reports", pageKey: "reports" },
  ];

  const superadminItems = [
    { name: "Dashboard", path: "/admin", pageKey: "dashboard" },
    { name: "My Profile", path: "/admin/profile", pageKey: "profile" },    
    { name: "View Guests", path: "/admin/guests", pageKey: "guests" },
    { name: "Manage Admins", path: "/admin/manage-admins", pageKey: "manage_admins" },
    { name: "Manage Housekeepers", path: "/admin/housekeepers", pageKey: "housekeepers" },
    { name: "Service Requests", path: "/admin/requests", pageKey: "requests" },
    { name: "Item List", path: "/admin/item-list", pageKey: "item_list" },
    { name: "Service Types", path: "/admin/service-types", pageKey: "service_types" },
    { name: "Reports", path: "/admin/reports", pageKey: "reports" },
    { name: "Page Access Control", path: "/admin/page-access", pageKey: "page_access" },
  ];

  const guestItems = [
    { name: "Dashboard", path: "/guest", pageKey: "dashboard" },
    { name: "My Profile", path: "/guest/profile", pageKey: "profile" },
    { name: "My Requests", path: "/guest/my-requests", pageKey: "my_requests" },
    { name: "Borrow Items", path: "/guest/borrow-items", pageKey: "borrow_items" },
    { name: "System Feedback", path: "/guest/system-feedback", pageKey: "system_feedback" },
  ];

  const housekeeperItems = [
    { name: "Dashboard", path: "/housekeeper", pageKey: "dashboard" },
    { name: "My Profile", path: "/housekeeper/profile", pageKey: "profile" },
    { name: "Tasks", path: "/housekeeper/tasks", pageKey: "tasks" },
    { name: "Task History", path: "/housekeeper/task-history", pageKey: "task_history" },
  ];

  let items = [];
  let panelTitle = "";

  if (role === "superadmin") {
    items = superadminItems;
    panelTitle = "Superadmin Panel";
  } else if (role === "admin") {
    items = adminItems;
    panelTitle = "Admin Panel";
  } else if (role === "housekeeper") {
    items = housekeeperItems;
    panelTitle = "Housekeeper Panel";
  } else if (role === "guest") {
    items = guestItems;
    panelTitle = "Guest Panel";
  } else {
    console.error("Unknown role in Menu:", role);
    items = guestItems;
    panelTitle = "Panel";
  }

  const filteredItems = items.filter((item) => {
    if (allAccess) return true;
    
    if (loading) return true;
    
    return hasAccess(item.pageKey);
  });

  const isActive = (path) => {
    if (path === "/admin" || path === "/guest" || path === "/housekeeper") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const handleLinkClick = () => {
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-green-600 text-white rounded-lg shadow-lg hover:bg-green-700 transition-colors"
        aria-label="Toggle menu"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col p-6 shadow-sm overflow-y-auto z-40 transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <h2 className="text-xl font-poppins font-bold mb-6 text-green-800 mt-12 lg:mt-0">
          {panelTitle}
        </h2>

        {loading ? (
          <div className="text-sm text-gray-500 mb-4">Loading menu...</div>
        ) : (
          filteredItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={handleLinkClick}
              className={`px-4 py-2 mb-2 rounded transition ${
                isActive(item.path)
                  ? "bg-green-100 text-green-800 font-semibold"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {item.name}
            </Link>
          ))
        )}

        <button
          onClick={() => {
            try {
              socket.disconnect();
            } catch (err) {
              console.warn("Socket disconnect failed:", err);
            }

            localStorage.removeItem("token");
            localStorage.removeItem("role");
            localStorage.removeItem("first_login");
            
            if (typeof setAuth === "function") setAuth(false);
            window.location.href = "/login";
          }}
          className="mt-auto text-sm text-red-500 hover:text-red-700 transition"
        >
          Logout
        </button>
      </aside>
    </>
  );
};

export default Menu;