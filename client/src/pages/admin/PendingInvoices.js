import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { jwtDecode } from "jwt-decode";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const PendingInvoices = () => {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("");

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [selectedAction, setSelectedAction] = useState(null); 

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUserRole(decoded.role);
      } catch (err) {
        console.error("Error decoding token:", err);
      }
    }
  }, []);

  const fetchPendingInvoices = async () => {
    try {
      const response = await fetch(`${API_URL}/items/pending-invoices`, {
        headers: { token: localStorage.getItem("token") },
      });
      const data = await response.json();

      if (response.ok) {
        setItems(data);
      } else {
        setError(data.error || "Failed to fetch pending invoices");
      }
    } catch (err) {
      console.error(err);
      setError("Error fetching data from server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingInvoices();
  }, []);

  const openInvoiceModal = (actionType, itemId = null, userId = null) => {
    setSelectedAction({ type: actionType, itemId, userId });
    setInvoiceNumber("");
    setShowInvoiceModal(true);
  };

  const closeInvoiceModal = () => {
    setShowInvoiceModal(false);
    setInvoiceNumber("");
    setSelectedAction(null);
  };

  const handleInvoiceSubmit = async () => {
    if (!invoiceNumber.trim()) {
      alert("Please enter an invoice number");
      return;
    }

    if (selectedAction.type === "single") {
      await handleUpdateSingleInvoice(selectedAction.itemId, invoiceNumber.trim());
    } else if (selectedAction.type === "all") {
      await handleUpdateAllInvoices(selectedAction.userId, invoiceNumber.trim());
    }

    closeInvoiceModal();
  };

  const handleUpdateSingleInvoice = async (itemId, invoice) => {
    try {
      const response = await fetch(
        `${API_URL}/items/update-invoice/${itemId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            token: localStorage.getItem("token"),
          },
          body:  JSON.stringify({ invoice_number: invoice }),
        }
      );

      if (response.ok) {
        alert("Invoice number updated successfully!");
        fetchPendingInvoices();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to update invoice number");
      }
    } catch (err) {
      console.error(err);
      alert("Server error while updating");
    }
  };

  const handleUpdateAllInvoices = async (userId, invoice) => {
    try {
      const response = await fetch(
        `${API_URL}/items/update-all-invoices/${userId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            token: localStorage.getItem("token"),
          },
          body: JSON.stringify({ invoice_number: invoice }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        alert(`Successfully updated ${data.updated_count} item(s) with invoice number! `);
        fetchPendingInvoices();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to update invoice numbers");
      }
    } catch (err) {
      console.error(err);
      alert("Server error while updating");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const groupedByGuest = items.reduce((acc, item) => {
    const guest = item.borrower_name || "Unknown Guest";
    const userId = String(item.user_id);
    const facility = item.facility;
    if (!acc[userId]) acc[userId] = { guest, facility, items: [] };
    acc[userId].items.push(item);
    return acc;
  }, {});

  if (loading) return <p className="text-center mt-10">Loading... </p>;
  if (error) return <p className="text-center mt-10 text-red-500">{error}</p>;

  return (
    <div className="max-w-5xl mx-auto bg-white p-4 sm:p-6 mt-4 sm:mt-6 rounded-lg shadow-md">
      <h2 className="text-xl sm:text-2xl font-semibold text-blue-700 mb-2 text-center">
        Items Paid - Invoice Numbers Pending
      </h2>
      <p className="text-sm text-gray-600 text-center mb-6">
        These items have been marked as paid but are waiting for invoice numbers to be provided.
      </p>

      {Object.keys(groupedByGuest).length === 0 ? (
        <p className="text-gray-600 text-center text-sm sm:text-base">
          No items with pending invoice numbers. 
        </p>
      ) : (
        Object.entries(groupedByGuest).map(([userId, { guest, facility, items:  guestItems }]) => {
          const total = guestItems.reduce(
            (sum, item) => sum + Number(item.charge_amount || 0),
            0
          );

          return (
            <div
              key={userId}
              className="mb-4 sm:mb-6 border border-blue-300 rounded-lg p-3 sm:p-4 shadow-sm bg-blue-50"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-3">
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg font-semibold text-blue-800">
                    {guest}
                  </h3>
                  {userRole === "superadmin" && facility && (
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      Facility:{" "}
                      <span
                        className={`font-semibold ${
                          facility === "RCC"
                            ? "text-green-600"
                            : "text-blue-600"
                        }`}
                      >
                        {facility}
                      </span>
                    </p>
                  )}
                </div>
                <div>
                  <button
                    onClick={() => openInvoiceModal("all", null, userId)}
                    className="px-3 py-2 bg-blue-700 text-white text-sm rounded hover:bg-blue-800 active:bg-blue-900 whitespace-nowrap"
                  >
                    Update All with Invoice #
                  </button>
                </div>
              </div>

              {/* Desktop table view */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full border border-gray-200 text-sm mb-3">
                  <thead className="bg-blue-100">
                    <tr>
                      <th className="p-2 border text-left">Item</th>
                      <th className="p-2 border text-center">Quantity</th>
                      <th className="p-2 border text-right">Amount</th>
                      <th className="p-2 border text-center">Paid At</th>
                      <th className="p-2 border text-center">Room</th>
                      <th className="p-2 border text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guestItems.map((item) => {
                      const quantity = Number(item.quantity || 0);
                      const totalCharge = Number(item.charge_amount || 0);
                      
                      return (
                        <tr key={item.id}>
                          <td className="p-2 border">{item.item_name}</td>
                          <td className="p-2 border text-center">{quantity}</td>
                          <td className="p-2 border text-right">
                            ₱{totalCharge.toFixed(2)}
                          </td>
                          <td className="p-2 border text-center text-xs">
                            {formatDate(item.paid_at)}
                          </td>
                          <td className="p-2 border text-center">
                            {item.room_number || 'N/A'}
                          </td>
                          <td className="p-2 border text-center">
                            <button
                              onClick={() => openInvoiceModal("single", item.id)}
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                            >
                              Add Invoice #
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile card view */}
              <div className="sm:hidden space-y-3 mb-3">
                {guestItems.map((item) => {
                  const quantity = Number(item.quantity || 0);
                  const totalCharge = Number(item.charge_amount || 0);
                  
                  return (
                    <div key={item.id} className="border border-blue-200 rounded-lg p-3 bg-white">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-gray-800 text-sm">
                              {item.item_name}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Qty: {quantity} | Room: {item.room_number || 'N/A'}
                            </p>
                          </div>
                          <div className="text-right ml-2">
                            <p className="text-sm font-semibold text-blue-700">
                              ₱{totalCharge.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-500 pt-2 border-t">
                          Paid:  {formatDate(item.paid_at)}
                        </div>

                        <button
                          onClick={() => openInvoiceModal("single", item.id)}
                          className="w-full mt-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                        >
                          Add Invoice Number
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-right font-semibold text-blue-800 text-sm sm:text-base">
                Total Amount: ₱{total.toFixed(2)}
              </div>
            </div>
          );
        })
      )}

      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg sm:text-xl font-semibold text-blue-800">
                {selectedAction?.type === "all" ? "Update All Invoice Numbers" : "Enter Invoice Number"}
              </h3>
              <button
                onClick={closeInvoiceModal}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Number *
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Enter invoice number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus: outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                autoFocus
              />
              {selectedAction?.type === "all" && (
                <p className="text-xs text-blue-600 mt-2">
                  This invoice number will be applied to all items for this guest.
                </p>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                onClick={closeInvoiceModal}
                className="w-full sm:w-auto px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleInvoiceSubmit}
                className="w-full sm:w-auto px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 text-sm sm:text-base"
              >
                {selectedAction?.type === "all" ? "Update All" : "Update Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 sm:mt-6 text-center">
        <button
          onClick={() => window.history.back()}
          className="w-full sm:w-auto px-6 py-2.5 bg-gray-500 text-white font-medium rounded-full shadow-lg hover:scale-105 hover:bg-gray-600 transition-all duration-300 mb-4 text-sm sm:text-base"
        >
          Back
        </button>
      </div>
    </div>
  );
};

export default PendingInvoices;