import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { jwtDecode } from "jwt-decode";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const BorrowItems = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [borrowQty, setBorrowQty] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [userFacility, setUserFacility] = useState("");
  const [isWithinOperatingHours, setIsWithinOperatingHours] = useState(true);
  const [nextOpenTime, setNextOpenTime] = useState("");

  const checkOperatingHours = (facility) => {
    if (!facility) return { isOpen: false, nextOpen: "" };

    const phTime = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Manila",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });

    const [hours, minutes] = phTime.split(":").map(Number);
    const currentMinutes = hours * 60 + minutes;

    let openMinutes, closeMinutes, openTime, closeTime;

    if (facility === "RCC") {
      openMinutes = 8 * 60; 
      closeMinutes = 17 * 60; 
      openTime = "8:00 AM";
      closeTime = "5:00 PM";
    } else if (facility === "Hotel Rafael") {
      openMinutes = 6 * 60;
      closeMinutes = 22 * 60; 
      openTime = "6:00 AM";
      closeTime = "6:00 PM";
    } else {
      return { isOpen: false, nextOpen: "" };
    }

    const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    
    let nextOpen = "";
    if (!isOpen) {
      if (currentMinutes < openMinutes) {
        nextOpen = `Opens today at ${openTime}`;
      } else {
        nextOpen = `Opens tomorrow at ${openTime}`;
      }
    }

    return { isOpen, nextOpen, openTime, closeTime };
  };

  const fetchUserFacility = async () => {
    try {
      const res = await fetch(`${API_URL}/users/me`, {
        headers: { token: localStorage.getItem("token") },
      });
      if (!res.ok) throw new Error("Failed to fetch user info");
      const user = await res.json();
      setUserFacility(user.facility || "");
      
      // Check operating hours
      const { isOpen, nextOpen } = checkOperatingHours(user.facility);
      setIsWithinOperatingHours(isOpen);
      setNextOpenTime(nextOpen);
    } catch (err) {
      console.error("Error fetching user facility:", err);
    }
  };

  useEffect(() => {
    const initializeFacility = async () => {
      const token = localStorage.token;
      let facilityToCheck = "";
      
      if (token) {
        try {
          const decoded = jwtDecode(token);
          facilityToCheck = decoded.facility || "";
          setUserFacility(facilityToCheck);

          const { isOpen, nextOpen } = checkOperatingHours(facilityToCheck);
          setIsWithinOperatingHours(isOpen);
          setNextOpenTime(nextOpen);
        } catch (err) {
          console.error("Error decoding token:", err);
        }
      }
      
      await fetchUserFacility();
    };

    initializeFacility();

    const interval = setInterval(() => {
      if (userFacility) {
        const { isOpen, nextOpen } = checkOperatingHours(userFacility);
        setIsWithinOperatingHours(isOpen);
        setNextOpenTime(nextOpen);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = async () => {
      console.log("Facility updated event received in BorrowItems");
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      try {
        const res = await fetch(`${API_URL}/users/me`, {
          headers: { token: localStorage.getItem("token") },
        });
        if (!res.ok) throw new Error("Failed to fetch user info");
        const user = await res.json();
        console.log("Updated user data:", user);
        setUserFacility(user.facility || "");

        const { isOpen, nextOpen } = checkOperatingHours(user.facility);
        setIsWithinOperatingHours(isOpen);
        setNextOpenTime(nextOpen);
        
        setTimeout(() => {
          if (user.facility && isOpen) {
            fetchItems();
          }
        }, 300);
      } catch (err) {
        console.error("Error in facility update handler:", err);
      }
    };
    
    window.addEventListener("userFacilityUpdated", handler);
    return () => window.removeEventListener("userFacilityUpdated", handler);
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch(`${API_URL}/items`, {
        headers: { token: localStorage.getItem("token") },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch items");
      setItems(data);
    } catch (err) {
      console.error(err);
      toast.error("Error loading items.");
    } finally {
      setLoading(false);
    }
  };

  const handleBorrow = async (e) => {
    e.preventDefault();
    const { isOpen } = checkOperatingHours(userFacility);
    if (!isOpen) {
      toast.error("Borrowing is currently outside operating hours.");
      setShowModal(false);
      return;
    }

    if (!borrowQty || borrowQty <= 0) {
      toast.error("Please enter a valid quantity.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/items/borrow`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token: localStorage.getItem("token"),
        },
        body: JSON.stringify({
          item_id: selectedItem.id,
          quantity: borrowQty,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Item borrowed successfully!");
      setShowModal(false);
      setBorrowQty("");
      fetchItems();
    } catch (err) {
      toast.error(err.message || "Error borrowing item.");
    }
  };

  useEffect(() => {
    if (userFacility && isWithinOperatingHours) {
      fetchItems();
    } else if (userFacility && !isWithinOperatingHours) {
      setLoading(false);
    }
  }, [userFacility, isWithinOperatingHours]);

  if (!userFacility) {
    return (
      <div className="p-6">
        <h2 className="text-green-900 text-2xl font-bold mb-4 font-poppins">
          Available Items for Borrowing
        </h2>
        <p>You are not assigned to any facility.</p>
      </div>
    );
  }

  const { openTime, closeTime } = checkOperatingHours(userFacility);

  if (!isWithinOperatingHours) {
    return (
      <div className="p-6">
        <h2 className="text-green-900 text-2xl font-bold mb-4 font-poppins">
          Available Items for Borrowing
        </h2>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Borrowing is Currently Unavailable
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Item borrowing for <strong>{userFacility}</strong> is only available between{" "}
                  <strong>{openTime}</strong> and <strong>{closeTime}</strong> (Philippine Time).
                </p>
                <p className="mt-1">{nextOpenTime}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 relative min-h-screen">
      <h2 className="text-green-900 text-2xl font-bold mb-4 font-poppins">
        Available Items for Borrowing
      </h2>

      <div className="mb-4 text-sm text-gray-600">
        Operating Hours: <strong>{openTime} - {closeTime}</strong> (Philippine Time)
      </div>

      <div className="bg-green-50 border-l-4 border-green-400 p-3 sm:p-4 mb-4">
                    <p className="italic text-green-700 text-sm sm:text-base">
                      Note: Please be patient as delivery of borrowed item(s) may take some time. Our housekeepers may be handling multiple requests and will deliver your item as soon as they can.
                    </p>
                  </div>
      {loading ? (
        <p>Loading items...</p>
      ) : items.length === 0 ? (
        <p>No items available right now.</p>
      ) : (
        <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2 border">Item Name</th>
              <th className="p-2 border">Available Quantity</th>
              <th className="p-2 border">Price</th>
              <th className="p-2 border text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="p-2 border">{item.name}</td>
                <td className="p-2 border">{item.quantity}</td>
                <td className="p-2 border">₱{item.price}</td>
                <td className="p-2 border text-center">
                  <button
                    onClick={() => {
                      setSelectedItem(item);
                      setShowModal(true);
                    }}
                    className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                    disabled={item.quantity <= 0}
                  >
                    Borrow
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h3 className="text-xl font-bold mb-4 text-green-900">
              Borrow {selectedItem.name}
            </h3>
            <form onSubmit={handleBorrow} className="flex flex-col gap-3">
              <input
                type="number"
                placeholder="Quantity"
                value={borrowQty}
                onChange={(e) => setBorrowQty(e.target.value)}
                min="1"
                className="border p-2 rounded"
              />

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded border border-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800"
                >
                  Confirm Borrow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BorrowItems;