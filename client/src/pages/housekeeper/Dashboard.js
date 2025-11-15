import { useState, useEffect } from "react";
import Information from "../../components/Information";
import DashboardToggle from "../../components/DashboardToggle.js";
import Announcements from "../../components/Announcements";
import HousekeeperFeedbackWidget from "../../components/HousekeeperFeedbackWidget.js";

const HousekeeperDashboard = () => {
  const [view, setView] = useState("dashboard");
  const [name, setName] = useState("");
  const [facility, setFacility] = useState("");

  const [totalDone, setTotalDone] = useState(0);
  const [averageFeedback, setAverageFeedback] = useState(0.0);

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

  async function getTotalDone() {
  try {
    const response = await fetch(
      `http://localhost:5000/housekeeping-requests/housekeeper/total-done`,
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
      const response = await fetch(
        `http://localhost:5000/feedback/housekeeper/average`,
        { headers: { token: localStorage.token } }
      );
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
    <div className="flex min-h-screen bg-gray-50">
      <main className="flex-1 p-8">
        <DashboardToggle view={view} setView={setView} />
        <h2 className="text-3xl font-poppins font-bold text-green-900 mb-2">
          Welcome, {name}
        </h2>
        <p className="text-gray-600 mb-6">{facility}</p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
          <Information infoName="Total Tasks Done" value={totalDone} />
          <Information infoName="Average Feedback" value={`${averageFeedback}/5`} />
        </div>
      </main>
      <HousekeeperFeedbackWidget />
    </div>
  );
};

export default HousekeeperDashboard;
