import { useState, useEffect, useCallback } from "react";
import { Bell } from "lucide-react";
import { useNotifications } from "../context/NotificationContext";
import NotificationModal from "./NotificationModal";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const NotificationBell = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const { notifications, fetchNotifications, user, markAllAsRead } = useNotifications();

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      fetchNotifications();
    }, 5000); 

    return () => clearInterval(interval);
  }, [user?.id, fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      await fetch(`${API_URL}/notifications/${id}/read`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
      });
      await fetchNotifications();
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
          className="relative p-2 hover:bg-gray-200 rounded-full transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-6 h-6 text-gray-700" />
          {hasUnread && (
            <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
          )}
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg z-50">
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <h3 className="font-semibold">Notifications</h3>
              {hasUnread && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    markAllAsRead();
                  }}
                  className="text-xs text-green-700 hover:text-green-800 font-medium"
                >
                  Mark all as read
                </button>
              )}
            </div>
            <ul className="max-h-64 overflow-y-auto">
              {notifications.length === 0 ? (
                <li className="px-4 py-8 text-center text-gray-500 text-sm">
                  No notifications
                </li>
              ) : (
                notifications.map((n) => (
                  <li
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`px-4 py-3 text-sm cursor-pointer border-b last:border-b-0 transition-colors ${
                      n.read
                        ? "text-gray-600 bg-white"
                        : "font-semibold bg-green-50 text-green-900"
                    } hover:bg-gray-100`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read && (
                        <span className="w-2 h-2 bg-green-600 rounded-full mt-1.5 flex-shrink-0"></span>
                      )}
                      <div className="flex-1">
                        <p className="line-clamp-2">{n.message}</p>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(n.created_at).toLocaleString()}
                        </div>
                      </div>
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