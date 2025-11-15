import { useState, useEffect } from "react";
import "./App.css";
import { jwtDecode } from "jwt-decode";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { NotificationProvider } from "./context/NotificationContext";

// Admin pages
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AddHousekeeper from "./pages/admin/AddHousekeeper";
import ManageGuests from "./pages/admin/ManageGuests";
import ServiceRequests from "./pages/admin/ServiceRequests";
import ItemList from "./pages/admin/ItemList";
import PendingPayments from "./pages/admin/PendingPayments";
import Reports from "./pages/admin/Reports";
import ServiceTypes from "./pages/admin/ServiceTypes";
import AdminProfile from "./pages/admin/AdminProfile";

// Guest pages
import GuestLayout from "./pages/guest/GuestLayout";
import GuestDashboard from "./pages/guest/Dashboard";
import UserProfile from "./pages/guest/UserProfile";
import BorrowItems from "./pages/guest/BorrowItems";
import SystemFeedback from "./pages/guest/SystemFeedback";

// Housekeeper pages
import HousekeeperLayout from "./pages/housekeeper/HousekeeperLayout";
import HousekeeperDashboard from "./pages/housekeeper/Dashboard";
import HousekeeperTasks from "./pages/housekeeper/HousekeeperTasks";
import HousekeeperProfile from "./pages/housekeeper/HousekeeperProfile";

// Auth
import Login from "./components/Login";
import Register from "./components/Register";
import ForceChangePassword from "./components/ForceChangePassword";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const location = useLocation();

  const setAuth = (boolean) => {
    setIsAuthenticated(boolean);
  };

  async function isAuth() {
    try {
      const response = await fetch("http://localhost:5000/auth/is-verify", {
        method: "GET",
        headers: { token: localStorage.token },
      });

      const parseRes = await response.json();
      parseRes === true ? setIsAuthenticated(true) : setIsAuthenticated(false);
    } catch (err) {
      console.error(err.message);
    }
  }

  useEffect(() => {
    // ✅ Skip auth check on /login, /register, and /force-change-password
    if (
      location.pathname !== "/login" &&
      location.pathname !== "/register" &&
      location.pathname !== "/force-change-password"
    ) {
      isAuth();
    }

    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser({
          id: decoded.id,
          name: decoded.name,
          role: decoded.role,
          facility: decoded.facility,
        });
      } catch (err) {
        console.error("Invalid token", err.message);
        localStorage.removeItem("token");
      }
    }
  }, [location.pathname]);

  // ✅ Listen for user facility updates across the app
  useEffect(() => {
    const handleFacilityUpdate = () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const decoded = jwtDecode(token);
        setUser((prev) => ({
          ...prev,
          facility: decoded.facility, // Refresh facility from updated token
        }));
      } catch (err) {
        console.error("Error decoding token on facility update:", err);
      }
    };

    window.addEventListener("userFacilityUpdated", handleFacilityUpdate);
    return () =>
      window.removeEventListener("userFacilityUpdated", handleFacilityUpdate);
  }, []);

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      {user ? (
        <NotificationProvider>
          <Routes>
            {/* ================= ADMIN ROUTES ================= */}
            <Route
              path="/admin"
              element={
                isAuthenticated ? (
                  <AdminLayout setAuth={setAuth} role={user.role} />
                ) : (
                  <Navigate to="/login" />
                )
              }
            >
              <Route index element={<AdminDashboard setAuth={setAuth} />} />
              <Route path="housekeepers" element={<AddHousekeeper />} />
              <Route path="profile" element={<AdminProfile />} />
              <Route path="guests" element={<ManageGuests />} />
              <Route path="/admin/requests" element={<ServiceRequests />} />
              <Route path="item-list" element={<ItemList />} />
              <Route path="/admin/pending-payments" element={<PendingPayments />} />
              <Route path="/admin/service-types" element={<ServiceTypes />} />
              <Route path="/admin/reports" element={<Reports />} />
            </Route>

            {/* ================= GUEST ROUTE ================= */}
            <Route
              path="/guest"
              element={
                isAuthenticated ? (
                  <GuestLayout setAuth={setAuth} role={user.role} />
                ) : (
                  <Navigate to="/login" />
                )
              }
            >
              <Route index element={<GuestDashboard setAuth={setAuth} />} />
              <Route path="profile" element={<UserProfile />} />
              <Route path="borrow-items" element={<BorrowItems />} />
              <Route path="/guest/system-feedback" element={<SystemFeedback />} />
            </Route>

            {/* ================= HOUSEKEEPER ROUTE ================= */}
            <Route
              path="/housekeeper"
              element={
                isAuthenticated ? (
                  <HousekeeperLayout setAuth={setAuth} role={user.role} />
                ) : (
                  <Navigate to="/login" />
                )
              }
            >
              <Route
                index
                element={<HousekeeperDashboard setAuth={setAuth} />}
              />
              <Route path="profile" element={<HousekeeperProfile />} />
              <Route path="tasks" element={<HousekeeperTasks />} />
            </Route>

            {/* ================= AUTH ROUTES ================= */}
            <Route
              path="/login"
              element={
                !isAuthenticated ? (
                  <Login setAuth={setAuth} setUser={setUser} />
                ) : (
                  // Check if user needs to change password first
                  localStorage.getItem("first_login") === "true" ? (
                    <Navigate to="/force-change-password" />
                  ) : user?.role === "admin" ? (
                    <Navigate to="/admin" />
                  ) : user?.role === "housekeeper" ? (
                    <Navigate to="/housekeeper" />
                  ) : (
                    <Navigate to="/guest" />
                  )
                )
              }
            />
            
            {/* ================= FORCE PASSWORD CHANGE ROUTE ================= */}
            <Route
              path="/force-change-password"
              element={
                isAuthenticated ? (
                  <ForceChangePassword />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            
            <Route
              path="/register"
              element={
                !isAuthenticated ? (
                  <Register setAuth={setAuth} />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />

            {/* ================= DEFAULT ROUTE ================= */}
            <Route path="/" element={<Navigate to="/login" />} />
          </Routes>
        </NotificationProvider>
      ) : (
        <Routes>
          <Route
            path="/login"
            element={<Login setAuth={setAuth} setUser={setUser} />}
          />
          <Route path="/register" element={<Register setAuth={setAuth} />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      )}
    </>
  );
}

export default function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}