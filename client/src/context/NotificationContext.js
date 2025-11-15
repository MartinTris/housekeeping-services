import React, {
  createContext,
  useEffect,
  useState,
  useCallback,
  useContext,
} from "react";
import { toast } from "react-hot-toast";
import socket from "../socket";
import { jwtDecode } from "jwt-decode";

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState(null);

  const fetchUser = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const decoded = jwtDecode(token);
      const res = await fetch("http://localhost:5000/users/me", {
        headers: { token },
      });
      const data = await res.json();
      setUser({ ...decoded, ...data });
    } catch (err) {
      console.error("Error fetching user:", err);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`http://localhost:5000/notifications/${user.id}`);
      const data = await res.json();
      setNotifications(data);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  }, [user?.id]);

  const markAllAsRead = async () => {
  if (!user?.id) return;
  try {
    const res = await fetch(`http://localhost:5000/notifications/user/${user.id}/read-all`, {
      method: "PUT",
    });
    if (!res.ok) throw new Error("Failed to mark all as read");
    toast.success("All notifications marked as read!");
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  } catch (err) {
    console.error("Error marking all as read:", err);
    toast.error("Failed to mark all as read");
  }
};

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      if (user.facility) {
        socket.emit("joinFacility", user.facility.toLowerCase());
        console.log(`Joined facility room: ${user.facility.toLowerCase()}`);
      }
      if (user.id) {
        socket.emit("joinUserRoom", user.id);
        console.log(`Joined personal room: user:${user.id}`);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const handleConnect = () => {
      console.log("✅ Reconnected, joining rooms again...");
      if (user.facility) {
        socket.emit("joinFacility", user.facility.toLowerCase());
      }
      if (user.id) {
        socket.emit("joinUserRoom", user.id);
      }
    };

    socket.on("connect", handleConnect);

    return () => {
      socket.off("connect", handleConnect);
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      socket.disconnect();
      return;
    }

    if (!socket.connected) {
      socket.connect();
      console.log("🔌 Socket connected for user:", user.id);
    }

    socket.onAny((event, ...args) => {
      console.log("Socket Event:", event, args);
    });

    const handleNewRequest = (data) => {
      console.log("handleNewRequest triggered:", data);
      if (user.role !== "admin") return;

      const newNotification = {
        id: Date.now(),
        message: data.message,
        created_at: new Date().toISOString(),
        read: false,
      };

      setNotifications((prev) => {
        const exists = prev.some(
          (n) =>
            n.message === data.message &&
            Math.abs(
              new Date(n.created_at) - new Date(newNotification.created_at)
            ) < 2000
        );
        if (exists) return prev;
        return [newNotification, ...prev];
      });

      toast.success(data.message, {
        duration: 4000,
        position: "top-right",
      });
    };

    const handleHousekeeperAssigned = (data) => {
      console.log("📥 handleHousekeeperAssigned triggered:", data);
      if (user.role !== "guest") return;

      const newNotification = {
        id: Date.now(),
        message: data.message,
        created_at: new Date().toISOString(),
        read: false,
      };

      setNotifications((prev) => {
        const exists = prev.some(
          (n) =>
            n.message === data.message &&
            Math.abs(
              new Date(n.created_at) - new Date(newNotification.created_at)
            ) < 2000
        );
        if (exists) return prev;
        return [newNotification, ...prev];
      });

      toast.success(data.message, {
        duration: 4000,
        position: "top-right",
      });
    };

    const handleNewAssignment = (data) => {
      console.log("📥 handleNewAssignment triggered:", data);
      if (user.role !== "housekeeper") return;

      const newNotification = {
        id: Date.now(),
        message: data.message,
        created_at: new Date().toISOString(),
        read: false,
      };

      setNotifications((prev) => {
        const exists = prev.some(
          (n) =>
            n.message === data.message &&
            Math.abs(
              new Date(n.created_at) - new Date(newNotification.created_at)
            ) < 2000
        );
        if (exists) return prev;
        return [newNotification, ...prev];
      });

      toast.success(data.message, {
        duration: 4000,
        position: "top-right",
      });
    };

    socket.off("newRequest").on("newRequest", handleNewRequest);
    socket
      .off("housekeeperAssigned")
      .on("housekeeperAssigned", handleHousekeeperAssigned);
    socket.off("newAssignment").on("newAssignment", handleNewAssignment);

    socket.off("newNotification").on("newNotification", (data) => {
      console.log("📥 newNotification event:", data);

      const newNotif = {
        id: Date.now(),
        message: data.message,
        created_at: new Date().toISOString(),
        read: false,
      };

      setNotifications((prev) => [newNotif, ...prev]);
      toast.success(data.message, { duration: 4000, position: "top-right" });
    });

    return () => {
      console.log("🧹 Cleaning up socket listeners...");
      socket.off("newRequest", handleNewRequest);
      socket.off("housekeeperAssigned", handleHousekeeperAssigned);
      socket.off("newAssignment", handleNewAssignment);
      socket.offAny();
    };
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
    }
  }, [user?.id, fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        fetchNotifications,
        user,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
