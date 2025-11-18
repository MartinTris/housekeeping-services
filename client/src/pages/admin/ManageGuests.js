import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { Trash2, Edit3, Check, X } from "lucide-react";

const ManageGuests = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [timeOut, setTimeOut] = useState("");
  const [role, setRole] = useState("");

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [facilityFilter, setFacilityFilter] = useState("all");

  // Admin modals
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);

  // Rename state
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [editedRoomName, setEditedRoomName] = useState("");

  // Get user role
  useEffect(() => {
    const userRole = localStorage.getItem("role");
    setRole(userRole);
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/rooms", {
        headers: { token: localStorage.token },
      });

      if (!res.ok) {
        console.error("Failed to fetch rooms:", res.status);
        setRooms([]);
        return;
      }

      const data = await res.json();
      setRooms(data || []);
    } catch (err) {
      console.error("Network error fetching rooms:", err);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  // Guest search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/guests/search?query=${encodeURIComponent(
            searchQuery
          )}`,
          {
            headers: { token: localStorage.token },
            signal: controller.signal,
          }
        );

        if (!res.ok) {
          console.error("Guest search failed:", res.status);
          setSuggestions([]);
          return;
        }

        const arr = await res.json();
        setSuggestions(arr || []);
      } catch (err) {
        if (err.name !== "AbortError") console.error("Search error:", err);
      }
    })();

    return () => controller.abort();
  }, [searchQuery]);

  const openAssignModal = (room) => {
    // Superadmin cannot assign guests
    if (role === "superadmin") {
      alert("Superadmins can only view rooms. Guest assignment is restricted to facility admins.");
      return;
    }

    // Check if Admin Office
    if (room.room_number === "Admin Office") {
      alert("Cannot assign guests to Admin Office. This room is reserved for admin service requests.");
      return;
    }

    if (room?.booking && room.booking.is_active) {
      alert("Cannot assign — room is currently occupied.");
      return;
    }

    setSelectedRoom(room);
    setSelectedGuest(null);
    setSearchQuery("");
    setSuggestions([]);
    setTimeOut("");
    setShowModal(true);
  };

  const toISO = (val) => {
    if (!val) return null;
    const [datePart, timePart = "00:00"] = val.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hour, minute] = timePart.split(":").map(Number);
    const localDate = new Date(year, month - 1, day, hour, minute);
    return localDate.toISOString();
  };

  const handleAssign = async () => {
  if (!selectedGuest) return alert("Select a guest first");

  const payload = {
    guest_id: selectedGuest.id,
    time_out: toISO(timeOut) || null,
  };

  console.log("Assigning guest:", selectedGuest.id);

  try {
    const res = await fetch(
      `http://localhost:5000/rooms/${selectedRoom.id}/assign`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token: localStorage.token,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert("Assign failed: " + (j.error || j.message || res.status));
      return;
    }

    const data = await res.json();
    console.log("Assignment response:", data);

    // Get current user from token
    const token = localStorage.getItem("token");
    if (token) {
      const currentUser = JSON.parse(atob(token.split('.')[1]));
      console.log("Current user ID:", currentUser.id);
      console.log("Assigned guest ID:", selectedGuest.id);
      console.log("New token received:", data.token);
      
      if (currentUser.id === selectedGuest.id && data.token) {
        console.log("Updating token for current user");
        localStorage.setItem("token", data.token);
        
        // Verify the new token
        const newTokenData = JSON.parse(atob(data.token.split('.')[1]));
        console.log("New token data:", newTokenData);
        
        // Dispatch event to update UI
        window.dispatchEvent(new Event("userFacilityUpdated"));
        alert("You have been assigned to a room. Your facility has been updated!");
      }
    }

    setShowModal(false);
    await fetchRooms();
  } catch (err) {
    console.error("Assign network error:", err);
    alert("Network error. See console.");
  }
};

  // Socket setup
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io("http://localhost:5000", {
      transports: ["websocket"],
      auth: { token: localStorage.getItem("token") },
    });

    socketRef.current = socket;

    socket.on("connect", () => console.log("Socket connected:", socket.id));

    const refresh = () => fetchRooms();
    socket.on("booking:assigned", refresh);
    socket.on("booking:removed", refresh);
    socket.on("booking:timeoutUpdated", refresh);
    socket.on("booking:autoCheckout", refresh);
    socket.on("room:added", refresh);
    socket.on("room:updated", refresh);
    socket.on("room:deleted", refresh);

    socket.on("disconnect", () => console.log("Socket disconnected"));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const handleRemove = async (room) => {
    // Superadmin cannot remove guests
    if (role === "superadmin") {
      alert("Superadmins can only view rooms. Guest checkout is restricted to facility admins.");
      return;
    }

    if (!window.confirm(`Check out guest from ${room.room_number}?`)) return;

    try {
      const res = await fetch(`http://localhost:5000/rooms/${room.id}/remove`, {
        method: "PUT",
        headers: { token: localStorage.token },
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert("Checkout failed: " + (j.error || j.message || res.status));
        return;
      }

      await fetchRooms();
      alert("Guest checked out.");
      setTimeout(() => {
        window.dispatchEvent(new Event("userFacilityUpdated"));
      }, 300);
    } catch (err) {
      console.error("Remove error:", err);
      alert("Network error. See console.");
    }
  };

  // ---- ADMIN ROOM FUNCTIONS ----
  const handleAddRoom = async () => {
    if (!newRoomName.trim()) return alert("Room name is required.");

    try {
      const res = await fetch("http://localhost:5000/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token: localStorage.token,
        },
        body: JSON.stringify({ room_number: newRoomName.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to add room.");
        return;
      }

      setShowAddRoomModal(false);
      setNewRoomName("");
      await fetchRooms();
    } catch (err) {
      console.error("Add room error:", err);
      alert("Network error. See console.");
    }
  };

  const handleDeleteRoom = async () => {
    if (!roomToDelete) return;

    try {
      const res = await fetch(
        `http://localhost:5000/rooms/${roomToDelete.id}`,
        {
          method: "DELETE",
          headers: { token: localStorage.token },
        }
      );

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete room.");
        return;
      }

      setShowDeleteModal(false);
      setRoomToDelete(null);
      await fetchRooms();
    } catch (err) {
      console.error("Delete room error:", err);
      alert("Network error. See console.");
    }
  };

  const handleRenameRoom = async (roomId) => {
    if (!editedRoomName.trim()) return alert("Room name cannot be empty.");

    try {
      const res = await fetch(`http://localhost:5000/rooms/${roomId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          token: localStorage.token,
        },
        body: JSON.stringify({ room_number: editedRoomName.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to rename room.");
        return;
      }

      setEditingRoomId(null);
      setEditedRoomName("");
      await fetchRooms();
    } catch (err) {
      console.error("Rename room error:", err);
      alert("Network error. See console.");
    }
  };

  // Filter rooms
  const filteredRooms = rooms.filter((room) => {
    const matchesSearch = room.room_number
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "occupied"
        ? room.booking?.is_active
        : !room.booking?.is_active);
    const matchesFacility =
      role !== "superadmin" ||
      facilityFilter === "all" ||
      room.facility === facilityFilter;

    return matchesSearch && matchesStatus && matchesFacility;
  });

  return (
    <div className="p-6">
      <h2 className="text-2xl font-poppins font-bold text-green-900 mb-6">
        Manage Guests
        {role === "superadmin" && (
          <span className="text-base font-normal text-gray-600 ml-2">
            (View-Only Mode)
          </span>
        )}
      </h2>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <input
          type="text"
          placeholder="Search room number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border rounded px-4 py-2 w-64"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-4 py-2"
        >
          <option value="all">All Rooms</option>
          <option value="occupied">Occupied Only</option>
          <option value="vacant">Vacant Only</option>
        </select>

        {role === "superadmin" && (
          <select
            value={facilityFilter}
            onChange={(e) => setFacilityFilter(e.target.value)}
            className="border rounded px-4 py-2"
          >
            <option value="all">All Facilities</option>
            <option value="RCC">RCC</option>
            <option value="Hotel Rafael">Hotel Rafael</option>
          </select>
        )}
      </div>

      {loading ? (
        <p>Loading rooms…</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {filteredRooms.map((room) => {
            const isActive = room.booking?.is_active;
            const isAdminOffice = room.room_number === "Admin Office";

            return (
              <div
                key={room.id}
                className="relative border rounded-lg p-4 shadow bg-white text-center"
              >
                {/* Facility badge for superadmin */}
                {role === "superadmin" && room.facility && (
                  <div className="absolute top-2 left-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        room.facility === "RCC"
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {room.facility}
                    </span>
                  </div>
                )}

                {/* Delete icon - only for regular admin, not for Admin Office */}
                {role === "admin" && !isAdminOffice && (
                  <button
                    onClick={() => {
                      setRoomToDelete(room);
                      setShowDeleteModal(true);
                    }}
                    className="absolute top-2 right-2 text-gray-500 hover:text-red-600"
                    title="Delete room"
                  >
                    <Trash2 size={18} />
                  </button>
                )}

                {/* Room name + edit (not for Admin Office) */}
                {editingRoomId === room.id && !isAdminOffice ? (
                  <div className="flex items-center justify-center gap-2 mb-2 mt-6">
                    <input
                      type="text"
                      className="border p-1 rounded text-center w-28"
                      value={editedRoomName}
                      onChange={(e) => setEditedRoomName(e.target.value)}
                    />
                    <button
                      className="text-green-600 hover:text-green-800"
                      onClick={() => handleRenameRoom(room.id)}
                    >
                      <Check size={18} />
                    </button>
                    <button
                      className="text-gray-500 hover:text-red-600"
                      onClick={() => {
                        setEditingRoomId(null);
                        setEditedRoomName("");
                      }}
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <h3
                    className={`font-bold text-lg flex items-center justify-center gap-2 ${
                      !isAdminOffice && role === "admin" ? "cursor-pointer" : ""
                    } ${role === "superadmin" ? "mt-6" : ""}`}
                    onClick={() => {
                      if (!isAdminOffice && role === "admin") {
                        setEditingRoomId(room.id);
                        setEditedRoomName(room.room_number);
                      }
                    }}
                  >
                    {room.room_number}
                    {!isAdminOffice && role === "admin" && (
                      <Edit3
                        size={15}
                        className="text-gray-400 hover:text-gray-700"
                      />
                    )}
                  </h3>
                )}

                {isActive ? (
                  <>
                    <p className="text-red-600">
                      Occupied by {room.booking.guest_name}
                    </p>
                    <div className="mt-2 flex justify-center gap-2">
                      <button
                        className="px-3 py-1 bg-yellow-500 text-white rounded"
                        onClick={() =>
                          alert(
                            `Booking: ${room.booking.booking_id}\nGuest: ${room.booking.guest_name}`
                          )
                        }
                      >
                        View
                      </button>
                      {role === "admin" && (
                        <button
                          className="px-3 py-1 bg-red-600 text-white rounded"
                          onClick={() => handleRemove(room)}
                        >
                          Remove Guest
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {role === "admin" && !isAdminOffice && (
                      <button
                        className="mt-2 px-4 py-2 bg-green-600 text-white rounded"
                        onClick={() => openAssignModal(room)}
                      >
                        Assign Guest
                      </button>
                    )}
                    {isAdminOffice && (
                      <p className="mt-2 text-sm text-gray-500 italic">
                        Reserved for admin services
                      </p>
                    )}
                  </>
                )}
              </div>
            );
          })}

          {/* Add Room Button - only for regular admin */}
          {role === "admin" && (
            <button
              onClick={() => setShowAddRoomModal(true)}
              className="border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-6 text-gray-500 hover:bg-gray-100"
            >
              <span className="text-3xl font-bold">+</span>
              <span className="text-sm mt-1">Add a Room</span>
            </button>
          )}
        </div>
      )}

      {/* Summary */}
      {!loading && (
        <div className="mt-6 text-gray-600">
          <p>
            Showing {filteredRooms.length} of {rooms.length} rooms
          </p>
        </div>
      )}

      {/* ----- Add Room Modal ----- */}
      {showAddRoomModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-80">
            <h3 className="text-xl font-bold mb-4 text-center">Add a Room</h3>
            <input
              type="text"
              placeholder="Enter room name / number"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              className="border p-2 w-full mb-4 rounded"
            />
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-gray-400 text-white rounded"
                onClick={() => {
                  setShowAddRoomModal(false);
                  setNewRoomName("");
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-green-600 text-white rounded"
                onClick={handleAddRoom}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----- Delete Room Modal ----- */}
      {showDeleteModal && roomToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-80 text-center">
            <h3 className="text-lg font-semibold mb-4">
              Are you sure you want to delete{" "}
              <span className="font-bold">{roomToDelete.room_number}</span>?
            </h3>
            <div className="flex justify-center gap-4">
              <button
                className="px-4 py-2 bg-gray-400 text-white rounded"
                onClick={() => {
                  setShowDeleteModal(false);
                  setRoomToDelete(null);
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded"
                onClick={handleDeleteRoom}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----- Assign Guest Modal ----- */}
      {showModal && selectedRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h3 className="text-xl font-bold mb-4">
              Assign Guest to {selectedRoom.room_number}
            </h3>
            <input
              type="text"
              placeholder="Search guest (min 2 chars)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border p-2 w-full mb-2 rounded"
            />
            {suggestions.length > 0 && (
              <ul className="border rounded bg-gray-50 max-h-40 overflow-y-auto mb-2">
                {suggestions.map((g) => (
                  <li
                    key={g.id}
                    className={`p-2 hover:bg-gray-200 cursor-pointer ${
                      selectedGuest?.id === g.id ? "bg-blue-50" : ""
                    }`}
                    onClick={() => {
                      setSelectedGuest(g);
                      setSearchQuery("");
                      setSuggestions([]);
                    }}
                  >
                    {g.name} ({g.email}) {g.role ? `• ${g.role}` : ""}
                  </li>
                ))}
              </ul>
            )}

            {selectedGuest && (
              <p className="mb-2">
                Selected: <strong>{selectedGuest.name}</strong>
              </p>
            )}

            <label className="block mb-1">Time Out (optional)</label>
            <input
              type="datetime-local"
              value={timeOut}
              onChange={(e) => setTimeOut(e.target.value)}
              className="border p-2 mb-4 w-full rounded"
            />

            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-gray-400 text-white rounded"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-green-600 text-white rounded"
                onClick={handleAssign}
                disabled={!selectedGuest}
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

export default ManageGuests;