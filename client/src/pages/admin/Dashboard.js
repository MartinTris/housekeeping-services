import Information from "../../components/Information";
import { useState, useEffect } from "react";

const AdminDashboard = () => {
  const [name, setName] = useState("");
  const [facility, setFacility] = useState("");
  const [housekeeperCount, setHousekeeperCount] = useState(0);

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

  async function getHousekeeperCount() {
  try {
    const response = await fetch("http://localhost:5000/housekeepers", {
      method: "GET",
      headers: { token: localStorage.token },
    });
    const parseRes = await response.json();

    setHousekeeperCount(parseRes.length);
  } catch (err) {
    console.error(err.message);
  }
}

  useEffect(() => {
    getName();
  }, []);

  useEffect(() => {
    if (facility) {
      getHousekeeperCount();
    }
  }, [facility]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <main className="flex-1 p-8">
        <h2 className="text-3xl font-poppins font-bold text-green-900 mb-2">
          Welcome, {name}
        </h2>
        <p className="text-gray-600 mb-6">{facility}</p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
          <Information infoName="Total Guests" />
          <Information infoName="Occupied Rooms" />
          <Information infoName="Average Rating" />
          <Information infoName="Pending Payments" />
          <Information infoName="Total Housekeepers" value={housekeeperCount} />
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
