import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";

const NotificationModal = ({ notification, user, onClose }) => {
  const navigate = useNavigate();

  if (!notification) return null;

  const getRedirectPath = () => {
    const { message } = notification;
    const role = user?.role;

    // Check if this is an announcement notification
    if (message.includes("New announcement") || message.includes("📢")) {
      // Redirect to the base route with announcements view
      if (role === "admin" || role === "superadmin") {
        return "/admin?view=announcements";
      }
      if (role === "guest") {
        return "/guest?view=announcements";
      }
      if (role === "housekeeper") {
        return "/housekeeper?view=announcements";
      }
    }

    // Admin notifications
    if (role === "admin" || role === "superadmin") {
      // Task completion notification (from housekeeper) - no redirect, just OK
      if (message.includes("has completed a") && message.includes("task for Room")) {
        return null;
      }
      if (message.includes("borrowed")) {
        return "/admin/pending-payments";
      }
      if (message.includes("housekeeping request") || message.includes("service request")) {
        return "/admin/requests";
      }
    }

    // Guest notifications
    if (role === "guest") {
      if (
        message.includes("approved") ||
        message.includes("in progress") ||
        message.includes("completed")
      ) {
        return "/guest/my-requests";
      }
      // Items delivered
      if (message.includes("has been delivered")) {
        return "/guest";
      }
      if (message.includes("will be delivered")) {
        return null;
      }
    }

    if (role === "housekeeper") {
      return "/housekeeper/tasks";
    }

    return null;
  };

  const handleViewMore = () => {
    const path = getRedirectPath();
    if (path) {
      navigate(path);
      onClose();
    } else {
      onClose();
    }
  };

  const redirectPath = getRedirectPath();
  const buttonText = redirectPath ? "View More" : "OK";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-semibold text-green-900">
            Notification Details
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 text-base leading-relaxed">
            {notification.message}
          </p>
          <p className="text-xs text-gray-400 mt-3">
            {new Date(notification.created_at).toLocaleString()}
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-gray-500 text-white font-medium rounded-full shadow-lg hover:scale-105 hover:bg-gray-600 transition-all duration-300 text-sm sm:text-base"
          >
            Close
          </button>
          <button
            onClick={handleViewMore}
            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-full shadow-lg hover:scale-105 hover:from-green-700 hover:to-emerald-700 transition-all duration-300 text-sm sm:text-base"
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;