import { Link, useLocation } from "react-router-dom";
import socket from "../socket";
import { usePermissions } from "../context/PermissionsContext";

const Menu = ({ setAuth, role }) => {
  const location = useLocation();
  const { hasAccess, allAccess, loading } = usePermissions();

  // Map route paths to permission page_keys
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
    "/admin/manage-admins": "manage_admins", // Superadmin only
    "/admin/page-access": "page_access", // Superadmin only
    
    // Guest pages
    "/guest": "dashboard",
    "/guest/profile": "profile",
    "/guest/borrow-items": "borrow_items",
    "/guest/system-feedback": "system_feedback",
    
    // Housekeeper pages
    "/housekeeper": "dashboard",
    "/housekeeper/profile": "profile",
    "/housekeeper/tasks": "tasks",
  };

  const adminItems = [
    { name: "Dashboard", path: "/admin", pageKey: "dashboard" },
    { name: "My Profile", path: "/admin/profile", pageKey: "profile" },
    { name: "Add/Remove Guest", path: "/admin/guests", pageKey: "guests" },
    { name: "Manage Housekeepers", path: "/admin/housekeepers", pageKey: "housekeepers" },
    { name: "Service Requests", path: "/admin/requests", pageKey: "requests" },
    { name: "Item List", path: "/admin/item-list", pageKey: "item_list" },
    { name: "Service Types", path: "/admin/service-types", pageKey: "service_types" },
    { name: "Reports", path: "/admin/reports", pageKey: "reports" },
  ];

  const superadminItems = [
    { name: "Dashboard", path: "/admin", pageKey: "dashboard" },
    { name: "My Profile", path: "/admin/profile", pageKey: "profile" },    
    { name: "Add/Remove Guest", path: "/admin/guests", pageKey: "guests" },
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
    { name: "Borrow Items", path: "/guest/borrow-items", pageKey: "borrow_items" },
    { name: "System Feedback", path: "/guest/system-feedback", pageKey: "system_feedback" },
  ];

  const housekeeperItems = [
    { name: "Dashboard", path: "/housekeeper", pageKey: "dashboard" },
    { name: "My Profile", path: "/housekeeper/profile", pageKey: "profile" },
    { name: "Tasks", path: "/housekeeper/tasks", pageKey: "tasks" },
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

  // Filter items based on permissions
  const filteredItems = items.filter((item) => {
    // Superadmin always has access to everything
    if (allAccess) return true;
    
    // Show loading state items without filtering
    if (loading) return true;
    
    // Check permission for this page
    return hasAccess(item.pageKey);
  });

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

      {loading ? (
        <div className="text-sm text-gray-500 mb-4">Loading menu...</div>
      ) : (
        filteredItems.map((item) => (
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
  );
};

export default Menu;