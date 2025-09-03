import { useState, useEffect } from "react";
import "./App.css";
import { jwtDecode } from "jwt-decode";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import AdminDashboard from "./pages/admin/Dashboard";
import GuestDashboard from "./pages/guest/Dashboard";
import HousekeeperDashboard from "./pages/housekeeper/Dashboard";
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
    const decoded = jwtDecode(token);
    setUser({ role: decoded.role });
  }
}, []);

  return (
    <div>
      <Router>
        <Routes>
          <Route
            path="/admin"
            element={
              isAuthenticated ? (
                <AdminDashboard setAuth={setAuth} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/guest"
            element={
              isAuthenticated ? (
                <GuestDashboard setAuth={setAuth} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/housekeeper"
            element={
              isAuthenticated ? (
                <HousekeeperDashboard setAuth={setAuth} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
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
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
