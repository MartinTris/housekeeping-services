import { useState, useEffect } from "react";
import "./App.css";
import { jwtDecode } from "jwt-decode";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { NotificationProvider } from "./context/NotificationContext";

// Admin pages
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AddHousekeeper from "./pages/admin/AddHousekeeper";
import ManageGuests from "./pages/admin/ManageGuests";
import ServiceRequests from "./pages/admin/ServiceRequests";

// Guest pages
import GuestLayout from "./pages/guest/GuestLayout";
import GuestDashboard from "./pages/guest/Dashboard";
import UserProfile from "./pages/guest/UserProfile";

// Housekeeper pages
import HousekeeperLayout from "./pages/housekeeper/HousekeeperLayout";
import HousekeeperDashboard from "./pages/housekeeper/Dashboard";
import HousekeeperTasks from "./pages/housekeeper/HousekeeperTasks";

// Auth
import Login from "./components/Login";
import Register from "./components/Register";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

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
    isAuth();

    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser({
          id: decoded.id,
          name: decoded.name,
          role: decoded.role,
          facility: decoded.facility, // ✅ Include facility if available
        });
      } catch (err) {
        console.error("Invalid token", err.message);
      }
    }
  }, []);

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      {user ? (
        <NotificationProvider>
          <Router>
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
                <Route path="guests" element={<ManageGuests />} />
                <Route path="/admin/requests" element={<ServiceRequests />} />
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
                <Route path="tasks" element={<HousekeeperTasks />} />
              </Route>

              {/* ================= AUTH ROUTES ================= */}
              <Route
                path="/login"
                element={
                  !isAuthenticated ? (
                    <Login setAuth={setAuth} setUser={setUser} />
                  ) : user?.role === "admin" ? (
                    <Navigate to="/admin" />
                  ) : user?.role === "housekeeper" ? (
                    <Navigate to="/housekeeper" />
                  ) : (
                    <Navigate to="/guest" />
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
          </Router>
        </NotificationProvider>
      ) : (
        <Router>
          <Login setAuth={setAuth} setUser={setUser} />
        </Router>
      )}
    </>
  );
}

export default App;
