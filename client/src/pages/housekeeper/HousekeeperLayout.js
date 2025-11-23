import Menu from "../../components/Menu";
import { Outlet } from "react-router-dom";
import NotificationBell from "../../components/NotificationBell";
import { useState, useEffect } from "react";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const HousekeeperLayout = ({ setAuth, role }) => {
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`${API_URL}/users/me`, {
          headers: { token: localStorage.token },
        });
        const data = await res.json();
        setUserId(data.id);
      } catch (err) {
        console.error("Failed to load user:", err.message);
      }
    };
    fetchUser();
  }, []);

  return (
    <div className="flex h-screen">
      <Menu setAuth={setAuth} role={role} />

      <div className="flex-1 ml-0 md:ml-64 flex flex-col">

        <header className="flex justify-between items-center px-4 sm:px-6 md:px-8 py-3 sm:py-4 bg-white border-b shadow-sm">
          <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-poppins font-semibold text-green-900 truncate pr-2">
            DLSU-D Housekeeping Housekeeper
          </h1>

          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
            {userId && <NotificationBell userId={userId} />}
          </div>
        </header>

        <Outlet />
      </div>
    </div>
  );
};

export default HousekeeperLayout;
