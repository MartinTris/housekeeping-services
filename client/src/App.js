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

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

import { Toaster } from "react-hot-toast";
import { NotificationProvider } from "./context/NotificationContext";
import { PermissionsProvider, usePermissions } from "./context/PermissionsContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Superadmin pages
import ManageAdmins from "./pages/superadmin/ManageAdmins";
import PageAccessControl from "./pages/superadmin/PageAccessControl";

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
import FeedbackPage from "./components/FeedbackPage";

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
import VerifyEmail from './pages/VerifyEmail';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const setAuth = (boolean) => {
    setIsAuthenticated(boolean);
  };

  async function checkAuth() {
    try {
      const token = localStorage.getItem("token");
      const role = localStorage.getItem("role");

      console.log("Checking auth - Token exists:", !!token, "Role:", role);

      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/auth/is-verify`, {
        method: "GET",
        headers: { token: token },
      });

      const parseRes = await response.json();

      if (parseRes === true) {
        // Decode token to get user info
        try {
          const decoded = jwtDecode(token);
          console.log("Decoded token:", decoded);

          setUser({
            id: decoded.id,
            role: decoded.role, // Use role from token, not localStorage
            facility: decoded.facility,
            email: decoded.email,
          });
          setIsAuthenticated(true);
        } catch (err) {
          console.error("Error decoding token:", err);
          setIsAuthenticated(false);
          setUser(null);
          localStorage.clear();
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
        localStorage.clear();
      }

      setLoading(false);
    } catch (err) {
      console.error("Auth check error:", err.message);
      setIsAuthenticated(false);
      setUser(null);
      setLoading(false);
    }
  }

  useEffect(() => {
    checkAuth();
  }, []);

  // Listen for user facility updates
  useEffect(() => {
    const handleFacilityUpdate = () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const decoded = jwtDecode(token);
        setUser((prev) => ({
          ...prev,
          facility: decoded.facility,
        }));
      } catch (err) {
        console.error("Error decoding token on facility update:", err);
      }
    };

    window.addEventListener("userFacilityUpdated", handleFacilityUpdate);
    return () =>
      window.removeEventListener("userFacilityUpdated", handleFacilityUpdate);
  }, []);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  console.log("App state:", { isAuthenticated, user });

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <PermissionsProvider>
        <Routes>
          {/* ================= LOGIN ================= */}
          <Route
            path="/login"
            element={
              !isAuthenticated ? (
                <Login setAuth={setAuth} setUser={setUser} />
              ) : localStorage.getItem("first_login") === "true" ? (
                <Navigate to="/force-change-password" />
              ) : user?.role === "admin" || user?.role === "superadmin" ? (
                <Navigate to="/admin" />
              ) : user?.role === "housekeeper" ? (
                <Navigate to="/housekeeper" />
              ) : user?.role === "guest" ? (
                <Navigate to="/guest" />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* ================= REGISTER ================= */}
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
          
          {/* ================= VERIFY EMAIL ================= */}
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* ================= FORCE PASSWORD CHANGE ================= */}
          <Route
            path="/force-change-password"
            element={
              isAuthenticated ? (
                <ForceChangePassword setAuth={setAuth} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* ================= ADMIN ROUTES ================= */}
          <Route
            path="/admin/*"
            element={
              isAuthenticated &&
              (user?.role === "admin" || user?.role === "superadmin") ? (
                <NotificationProvider>
                  <AdminLayout setAuth={setAuth} role={user.role} />
                </NotificationProvider>
              ) : (
                <Navigate to="/login" />
              )
            }
          >
            <Route index element={<ProtectedRoute pageKey="dashboard"><AdminDashboard setAuth={setAuth} /></ProtectedRoute>} />
            <Route path="housekeepers" element={<ProtectedRoute pageKey="housekeepers"><AddHousekeeper /></ProtectedRoute>} />
            <Route path="profile" element={<ProtectedRoute pageKey="profile"><AdminProfile /></ProtectedRoute>} />
            <Route path="guests" element={<ProtectedRoute pageKey="guests"><ManageGuests /></ProtectedRoute>} />
            <Route path="requests" element={<ProtectedRoute pageKey="requests"><ServiceRequests /></ProtectedRoute>} />
            <Route path="item-list" element={<ProtectedRoute pageKey="item_list"><ItemList /></ProtectedRoute>} />
            <Route path="pending-payments" element={<ProtectedRoute pageKey="dashboard"><PendingPayments /></ProtectedRoute>} />
            <Route path="service-types" element={<ProtectedRoute pageKey="service_types"><ServiceTypes /></ProtectedRoute>} />
            <Route path="reports" element={<ProtectedRoute pageKey="reports"><Reports /></ProtectedRoute>} />
            <Route path="manage-admins" element={<ManageAdmins />} />
            <Route path="feedback" element={<ProtectedRoute pageKey="dashboard"><FeedbackPage /></ProtectedRoute>} />
            <Route path="page-access" element={<PageAccessControl /> } />
          </Route>

          {/* ================= GUEST ROUTES ================= */}
          <Route
            path="/guest/*"
            element={
              isAuthenticated && user?.role === "guest" ? (
                <NotificationProvider>
                  <GuestLayout setAuth={setAuth} role={user.role} />
                </NotificationProvider>
              ) : (
                <Navigate to="/login" />
              )
            }
          >
            <Route index element={<ProtectedRoute pageKey="dashboard"><GuestDashboard setAuth={setAuth} /></ProtectedRoute>} />
            <Route path="profile" element={<ProtectedRoute pageKey="profile"><UserProfile /></ProtectedRoute>} />
            <Route path="borrow-items" element={<ProtectedRoute pageKey="borrow_items"><BorrowItems /></ProtectedRoute>} />
            <Route path="system-feedback" element={<ProtectedRoute pageKey="system_feedback"><SystemFeedback /></ProtectedRoute>} />
          </Route>

          {/* ================= HOUSEKEEPER ROUTES ================= */}
          <Route
            path="/housekeeper/*"
            element={
              isAuthenticated && user?.role === "housekeeper" ? (
                <NotificationProvider>
                  <HousekeeperLayout setAuth={setAuth} role={user.role} />
                </NotificationProvider>
              ) : (
                <Navigate to="/login" />
              )
            }
          >
            <Route index element={<ProtectedRoute pageKey="dashboard"><HousekeeperDashboard setAuth={setAuth} /></ProtectedRoute>} />
            <Route path="profile" element={<ProtectedRoute pageKey="profile"><HousekeeperProfile /></ProtectedRoute>} />
            <Route path="tasks" element={<ProtectedRoute pageKey="tasks"><HousekeeperTasks /></ProtectedRoute>} />
          </Route>

          {/* ================= DEFAULT ROUTE ================= */}
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </PermissionsProvider>
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