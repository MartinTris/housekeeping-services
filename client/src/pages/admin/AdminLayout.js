import Menu from "../../components/Menu";
import { Outlet } from "react-router-dom";
import NotificationBell from "../../components/NotificationBell";
import { useEffect, useState } from "react";

const AdminLayout = ({ setAuth, role }) => {
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("http://localhost:5000/users/me", {
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
    <div className="flex min-h-screen bg-gray-50">
      <Menu setAuth={setAuth} role={role} />

      <div className="flex-1 ml-64 flex flex-col">
        <header className="flex justify-between items-center px-8 py-4 bg-white border-b shadow-sm">
          <h1 className="text-2xl font-poppins font-semibold text-green-900">
            DLSU-D Housekeeping {role === "superadmin" ? "Superadmin" : "Admin"}
          </h1>

          <div className="flex items-center space-x-4">
            {userId && <NotificationBell userId={userId} />}
          </div>
        </header>

        <main className="flex-1 p-8 bg-gray-50 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
