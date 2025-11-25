import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { useNotifications } from "../context/NotificationContext";
import NotificationModal from "./NotificationModal";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const NotificationBell = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const { notifications, fetchNotifications, user, markAllAsRead } = useNotifications();

  useEffect(() => {
    if (user?.id) fetchNotifications();
  }, [user, fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      await fetch(`${API_URL}/notifications/${id}/read`, {
        method: "PUT",
      });
      fetchNotifications();
    } catch (err) {
      console.error("Failed to mark notification:", err);
    }
  };

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    setSelectedNotification(notification);
    setShowDropdown(false);
  };

  const handleCloseModal = () => {
    setSelectedNotification(null);
  };

  const hasUnread = notifications.some((n) => !n.read);

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setShowDropdown((s) => !s)}
          className="relative p-2 hover:bg-gray-200 rounded-full"
        >
          <Bell className="w-6 h-6 text-gray-700" />
          {notifications.some((n) => !n.read) && (
            <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full"></span>
          )}
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg z-50">
            <h3 className="font-semibold px-4 py-2 border-b">Notifications</h3>
            {hasUnread && (
              <button
                onClick={() => {
                  markAllAsRead();
                }}
                className="text-xs text-green-700 hover:text-green-800 font-medium px-4 py-1"
              >
                Mark all as read
              </button>
            )}
            <ul className="max-h-64 overflow-y-auto">
              {notifications.length === 0 ? (
                <li className="px-4 py-2 text-gray-500 text-sm">
                  No notifications
                </li>
              ) : (
                notifications.map((n) => (
                  <li
                    key={n.id || n.message}
                    onClick={() => handleNotificationClick(n)}
                    className={`px-4 py-2 text-sm cursor-pointer ${
                      n.read
                        ? "text-gray-600"
                        : "font-semibold bg-green-50"
                    } hover:bg-gray-100`}
                  >
                    {n.message}
                    <div className="text-xs text-gray-400">
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>

      <NotificationModal
        notification={selectedNotification}
        user={user}
        onClose={handleCloseModal}
      />
    </>
  );
};

export default NotificationBell;