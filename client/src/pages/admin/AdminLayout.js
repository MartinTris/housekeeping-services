import Menu from "../../components/Menu";
import { Outlet } from "react-router-dom";
import NotificationBell from "../../components/NotificationBell";
import { useEffect, useState } from "react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const AdminLayout = ({ setAuth, role }) => {
  const [userId, setUserId] = useState(null);
  const [name, setName] = useState("");

  async function getName() {
    try {
      const response = await fetch(`${API_URL}/dashboard/`, {
        method: "GET",
        headers: { token: localStorage.token },
      });

      const parseRes = await response.json();

      setName(parseRes.name);
    } catch (err) {
      console.error(err.message);
    }
  }

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
    getName();
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Menu setAuth={setAuth} role={role} />

      {/* Remove ml-64 and add lg:ml-64 instead */}
      <div className="flex-1 lg:ml-64 flex flex-col">
        <header className="flex justify-between items-center px-4 sm:px-6 md:px-8 py-3 sm:py-4 bg-white border-b shadow-sm w-full">
          <h1 className="ml-11 text-base sm:text-lg md:text-xl lg:text-2xl font-poppins font-semibold text-green-900">
            DLSU-D Housekeeping {role === "superadmin" ? "Superadmin" : "Admin"}
          </h1>

          <div className="flex items-center space-x-4 flex-shrink-0">
            <span className="text-sm sm:text-base font-poppins text-green-900 opacity-80">
              {name}
            </span>

            {userId && <NotificationBell userId={userId} />}
          </div>
        </header>
        
        <main className="flex-1 p-4 sm:p-8 bg-gray-50 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
