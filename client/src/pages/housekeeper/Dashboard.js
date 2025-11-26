import { useState, useEffect } from "react";
import Information from "../../components/Information";
import DashboardToggle from "../../components/DashboardToggle.js";
import Announcements from "../../components/Announcements";
import HousekeeperFeedbackWidget from "../../components/HousekeeperFeedbackWidget.js";
import HousekeeperPersonalTrends from "../../components/HousekeeperPersonalTrends.js";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const HousekeeperDashboard = () => {
  const [view, setView] = useState("dashboard");
  const [name, setName] = useState("");
  const [facility, setFacility] = useState("");

  const [totalDone, setTotalDone] = useState(0);
  const [averageFeedback, setAverageFeedback] = useState(0.0);

  async function getName() {
    try {
      const response = await fetch(`${API_URL}/dashboard/`, {
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

  async function getTotalDone() {
    try {
      const response = await fetch(
        `${API_URL}/housekeeping-requests/housekeeper/total-done`,
        { headers: { token: localStorage.token } }
      );
      const data = await response.json();
      setTotalDone(data.totalDone);
    } catch (err) {
      console.error("Error fetching total tasks done:", err);
    }
  }

  async function getAverageFeedback() {
    try {
      const response = await fetch(`${API_URL}/feedback/housekeeper/average`, {
        headers: { token: localStorage.token },
      });
      const data = await response.json();
      setAverageFeedback(data.averageRating);
    } catch (err) {
      console.error("Error fetching average feedback:", err);
    }
  }

  useEffect(() => {
    getName();
    getTotalDone();
    getAverageFeedback();
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
    <div className="flex w-full min-h-screen font-sans bg-gray-50">
      <main className="flex-1 p-8">
        <DashboardToggle view={view} setView={setView} />
        <div className="flex gap-6">
          <div className="flex-1">
            <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-2xl p-8 mb-6 shadow-md border border-green-100">
              <h2 className="text-3xl font-poppins font-bold text-green-800 mb-2">
                Welcome, {name}
              </h2>
              <p className="font-poppins text-base text-green-700 mb-2">
                {facility}
              </p>
            </div>
            <div className="flex-1">
              <HousekeeperPersonalTrends />

              <div className="grid grid-cols-2 mt-4 md:grid-cols-2 gap-6 mb-8">
                <Information
                  infoName="Total Tasks Done"
                  value={totalDone}
                  className="glass-card"
                />
                <Information
                  infoName="Average Feedback"
                  value={`${averageFeedback}/5`}
                  className="glass-card"
                />
              </div>

              <div className="mt-8">
                <HousekeeperFeedbackWidget />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HousekeeperDashboard;
