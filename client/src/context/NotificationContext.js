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

  // 🧠 Fetch user info
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

  // 📩 Fetch notifications for current user
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

  // ⚙️ Run once
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
  
  // ⚡ Socket lifecycle
  useEffect(() => {
    if (!user) {
      socket.disconnect();
      return;
    }

    if (!socket.connected) {
      socket.connect();
      console.log("🔌 Socket connected for user:", user.id);
    }

    // 🔍 Log all events
    socket.onAny((event, ...args) => {
      console.log("⚡ SOCKET EVENT FIRED:", event, args);
    });

    // 🧠 Handle new housekeeping request (for admin)
    const handleNewRequest = (data) => {
      console.log("📥 handleNewRequest triggered:", data);
      if (user.role !== "admin") return;

      const newNotification = {
        id: Date.now(),
        message: data.message,
        created_at: new Date().toISOString(),
        read: false,
      };

      setNotifications((prev) => {
        // Check if notification already exists
        const exists = prev.some((n) => 
          n.message === data.message && 
          Math.abs(new Date(n.created_at) - new Date(newNotification.created_at)) < 2000
        );
        if (exists) return prev;
        return [newNotification, ...prev];
      });

      toast.success(data.message, {
        duration: 4000,
        position: "top-right",
      });
    };

    // 🧩 Handle "housekeeper assigned" (for guest)
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
        // Check if notification already exists
        const exists = prev.some((n) => 
          n.message === data.message && 
          Math.abs(new Date(n.created_at) - new Date(newNotification.created_at)) < 2000
        );
        if (exists) return prev;
        return [newNotification, ...prev];
      });

      toast.success(data.message, {
        duration: 4000,
        position: "top-right",
      });
    };

    // 🧩 Handle "new assignment" (for housekeeper)
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
            Math.abs(new Date(n.created_at) - new Date(newNotification.created_at)) < 2000
        );
        if (exists) return prev;
        return [newNotification, ...prev];
      });

      toast.success(data.message, {
        duration: 4000,
        position: "top-right",
      });
    };

    // ✅ Bind event listeners
    socket.off("newRequest").on("newRequest", handleNewRequest);
    socket.off("housekeeperAssigned").on("housekeeperAssigned", handleHousekeeperAssigned);
    socket.off("newAssignment").on("newAssignment", handleNewAssignment);

    // 🧹 Cleanup
    return () => {
      console.log("🧹 Cleaning up socket listeners...");
      socket.off("newRequest", handleNewRequest);
      socket.off("housekeeperAssigned", handleHousekeeperAssigned);
      socket.off("newAssignment", handleNewAssignment);
      socket.offAny();
    };
  }, [user]);

  // Load notifications on mount
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
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
