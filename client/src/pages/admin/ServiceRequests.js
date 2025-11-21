import { useEffect, useState } from "react";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const ServiceRequests = () => {
  const [requests, setRequests] = useState([]);
  const [housekeepers, setHousekeepers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedHousekeeper, setSelectedHousekeeper] = useState("");

  // fetch requests
  const fetchRequests = async () => {
    try {
      const res = await fetch(`${API_URL}/housekeeping-requests`, {
        headers: { token: localStorage.token },
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to fetch requests.");
      } else {
        setRequests(data);
      }
    } catch (err) {
      setError("Server error.");
    } finally {
      setLoading(false);
    }
  };

  // fetch housekeepers
  const fetchHousekeepers = async () => {
    try {
      const res = await fetch(`${API_URL}/housekeepers`, {
        headers: { token: localStorage.token },
      });
      const data = await res.json();

      if (res.ok) setHousekeepers(data);
    } catch (err) {
      console.error("Error fetching housekeepers:", err);
    }
  };

  // open modal for assignment
  const openAssignModal = (req) => {
    setSelectedRequest(req);
    setSelectedHousekeeper("");
    setShowModal(true);
  };

  // confirm assignment
  const confirmAssignment = async () => {
    if (!selectedHousekeeper) {
      alert("Please select a housekeeper.");
      return;
    }

    try {
      const res = await fetch(
        `${API_URL}/housekeeping-requests/${selectedRequest.id}/assign`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            token: localStorage.token,
          },
          body: JSON.stringify({ housekeeperId: selectedHousekeeper }),
        }
      );

      const data = await res.json();
      if (res.ok) {
        setRequests((prev) =>
          prev.filter((req) => req.id !== selectedRequest.id)
        );
        setShowModal(false);
      } else {
        alert(data.error || "Failed to assign housekeeper.");
      }
    } catch (err) {
      console.error("Error assigning housekeeper:", err);
      alert("Server error while assigning housekeeper.");
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchHousekeepers();
  }, []);

  if (loading) return <p className="p-4">Loading requests...</p>;
  if (error) return <p className="p-4 text-red-500">{error}</p>;

  return (
    <div className="p-6">
      <h2 className="text-green-900 text-2xl font-poppins font-bold mb-4">
        Service Requests
      </h2>
      {requests.length === 0 ? (
        <p>No requests found for your facility.</p>
      ) : (
        <table className="w-full border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Guest</th>
              <th className="p-2 border">Room</th>
              <th className="p-2 border">Preferred Date</th>
              <th className="p-2 border">Preferred Time</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Assigned To</th>
              <th className="p-2 border">Created At</th>
              <th className="p-2 border">Action</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req.id} className="text-center">
                <td className="p-2 border">{req.guest_name}</td>
                <td className="p-2 border">{req.room_number}</td>
                <td className="p-2 border">
                  {new Date(req.preferred_date).toLocaleDateString()}
                </td>
                <td className="p-2 border">{req.preferred_time}</td>
                <td className="p-2 border capitalize">{req.status}</td>
                <td className="p-2 border">
                  {req.assigned_to
                    ? housekeepers.find((hk) => hk.id === req.assigned_to)
                        ?.name || "Assigned"
                    : "Not assigned"}
                </td>
                <td className="p-2 border">
                    {new Date(req.created_at).toLocaleString()}
                </td>
                <td className="p-2 border">
                  {req.status === "pending" ? (
                    <button
                      onClick={() => openAssignModal(req)}
                      className="px-3 py-1 bg-green-600 text-white rounded"
                    >
                      Assign Housekeeper
                    </button>
                  ) : (
                    <span className="text-gray-500">Housekeeper assigned</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h3 className="text-xl font-bold mb-4">Assign Housekeeper</h3>
            <p className="mb-2">
              Assigning request for{" "}
              <strong>{selectedRequest?.guest_name}</strong> in room{" "}
              <strong>{selectedRequest?.room_number}</strong>.
            </p>

            <select
              value={selectedHousekeeper}
              onChange={(e) => setSelectedHousekeeper(e.target.value)}
              className="w-full border p-2 rounded mb-4"
            >
              <option value="">Select a housekeeper</option>
              {housekeepers.map((hk) => (
                <option key={hk.id} value={hk.id} disabled={!hk.is_active}>
                  {hk.name} {hk.is_active ? "" : "(Disabled)"}
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={confirmAssignment}
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceRequests;
