import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";

const NotificationModal = ({ notification, user, onClose }) => {
  const navigate = useNavigate();

  if (!notification) return null;

  const getRedirectPath = () => {
    const { message, type } = notification;
    const role = user?.role;

    // Admin notifications
    if (role === "admin" || role === "superadmin") {
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
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            Close
          </button>
          <button
            onClick={handleViewMore}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;