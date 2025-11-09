import { useState, useEffect } from "react";
import Information from "../../components/Information";
import DashboardToggle from "../../components/DashboardToggle.js";
import Announcements from "../../components/Announcements";

const HousekeeperDashboard = ({ setAuth }) => {
  const [view, setView] = useState("dashboard");
  const [name, setName] = useState("");
  const [facility, setFacility] = useState("");

  async function getName() {
    try {
      const response = await fetch("http://localhost:5000/dashboard/", {
        method: "GET",
        headers: { token: localStorage.token },
      });

      const parseRes = await response.json();

      setName(parseRes.name);
      setFacility(parseRes.facility);
    } catch (err) {
      console.error(err.message);
    }
  }

  useEffect(() => {
    getName();
  }, []);

  if (view === "announcements") {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <main className="flex-1 p-8">
          <DashboardToggle view={view} setView={setView} />
          <Announcements />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <main className="flex-1 p-8">
        <DashboardToggle view={view} setView={setView} />
        <h2 className="text-3xl font-poppins font-bold text-green-900 mb-2">
          Welcome, {name}
        </h2>
        <p className="text-gray-600 mb-6">{facility}</p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
          <Information infoName="Total Tasks" />
          <Information infoName="Average Feedback" />
        </div>
      </main>
    </div>
  );
};

export default HousekeeperDashboard;
