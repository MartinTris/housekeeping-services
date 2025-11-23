import { useEffect, useState } from "react";
import { Printer, X } from "lucide-react";
import { jwtDecode } from "jwt-decode";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const PendingPayments = () => {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("");
  
  // Invoice modal states
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

  const fetchPendingPayments = async () => {
    try {
      const response = await fetch(`${API_URL}/items/pending`, {
        headers: { token: localStorage.getItem("token") },
      });
      const data = await response.json();

      if (response.ok) {
        setItems(data);
      } else {
        setError(data.error || "Failed to fetch pending payments");
      }
    } catch (err) {
      console.error(err);
      setError("Error fetching data from server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingPayments();
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
      await handleMarkAsPaid(selectedAction.itemId, invoiceNumber.trim());
    } else if (selectedAction.type === "all") {
      await handleMarkAllAsPaid(selectedAction.userId, invoiceNumber.trim());
    }

    closeInvoiceModal();
  };

  const handleMarkAllAsPaid = async (userId, invoice) => {
    try {
      const response = await fetch(
        `${API_URL}/items/mark-all-paid/${userId}`,
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
        alert("All items marked as paid!");
        fetchPendingPayments();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to mark all as paid");
      }
    } catch (err) {
      console.error(err);
      alert("Server error while marking all as paid");
    }
  };

  const handleMarkAsPaid = async (id, invoice) => {
    try {
      const response = await fetch(
        `${API_URL}/items/${id}/mark-paid`,
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
        alert("Item marked as paid!");
        fetchPendingPayments();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to update status");
      }
    } catch (err) {
      console.error(err);
      alert("Server error while updating");
    }
  };

  const handlePrint = (userId, guestName) => {
    const printContent = document.getElementById(`print-content-${userId}`);
    const printWindow = window.open("", "", "width=800,height=600");
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt</title>
          <style>
            @page {
              size: 80mm 297mm;
              margin: 0;
            }
            
            body {
              font-family: Arial, sans-serif;
              padding: 10mm;
              max-width: 100%;
              margin: 0;
              font-size: 12px;
            }
            .receipt-header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #166534;
              padding-bottom: 10px;
            }
            .receipt-title {
              font-size: 18px;
              font-weight: bold;
              color: #166534;
              margin-bottom: 8px;
            }
            .receipt-info {
              font-size: 11px;
              color: #4b5563;
              margin: 3px 0;
            }
            .borrower-info {
              margin: 15px 0;
              padding: 10px;
              background-color: #f3f4f6;
              border-radius: 4px;
            }
            .borrower-label {
              font-weight: bold;
              color: #374151;
              font-size: 11px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
              font-size: 11px;
            }
            th {
              background-color: #166534;
              color: white;
              padding: 8px;
              text-align: left;
              font-weight: 600;
            }
            td {
              padding: 6px 8px;
              border-bottom: 1px solid #e5e7eb;
            }
            .total-row {
              font-weight: bold;
              font-size: 13px;
              background-color: #f3f4f6;
            }
            .total-row td {
              padding: 10px 8px;
              border-top: 2px solid #166534;
              border-bottom: 2px solid #166534;
            }
            .text-center {
              text-align: center;
            }
            .text-right {
              text-align: right;
            }
            @media print {
              body {
                padding: 5mm;
              }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const formatDateTime = () => {
    const now = new Date();
    return now.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const groupedByGuest = items.reduce((acc, item) => {
    const guest = item.borrower_name || "Unknown Guest";
    const userId = item.user_id;
    const facility = item.facility;
    if (!acc[userId]) acc[userId] = { guest, facility, items: [] };
    acc[userId].items.push(item);
    return acc;
  }, {});

  if (loading) return <p className="text-center mt-10">Loading...</p>;
  if (error) return <p className="text-center mt-10 text-red-500">{error}</p>;

  return (
    <div className="max-w-4xl mx-auto bg-white p-4 sm:p-6 mt-4 sm:mt-6 rounded-lg shadow-md">
      <h2 className="text-xl sm:text-2xl font-semibold text-green-700 mb-4 text-center">
        Pending Payments
      </h2>

      {Object.keys(groupedByGuest).length === 0 ? (
        <p className="text-gray-600 text-center text-sm sm:text-base">No pending payments found.</p>
      ) : (
        Object.entries(groupedByGuest).map(([userId, { guest, facility, items: guestItems }]) => {
          const groupedItems = guestItems.reduce((acc, item) => {
            const key = item.item_name;
            const itemQuantity = Number(item.quantity || 0);
            const itemTotalCharge = Number(item.charge_amount || 0);
            const itemPriceEach = itemQuantity > 0 ? itemTotalCharge / itemQuantity : 0;
            
            if (!acc[key]) {
              acc[key] = { 
                ...item, 
                quantity: itemQuantity,
                totalCharge: itemTotalCharge,
                priceEach: itemPriceEach
              };
            } else {
              acc[key].quantity += itemQuantity;
              acc[key].totalCharge += itemTotalCharge;
            }
            return acc;
          }, {});

          const total = Object.values(groupedItems).reduce(
            (sum, item) => sum + item.totalCharge,
            0
          );

          return (
            <div
              key={userId}
              className="mb-4 sm:mb-6 border border-gray-300 rounded-lg p-3 sm:p-4 shadow-sm"
            >
              <div id={`print-content-${userId}`} style={{ display: 'none' }}>
                <div className="receipt-header">
                  <div className="receipt-title">BORROWED ITEMS RECEIPT</div>
                  <div className="receipt-info">Date & Time: {formatDateTime()}</div>
                </div>
                
                <div className="borrower-info">
                  <span className="borrower-label">Borrower:</span> {guest}
                </div>

                <table>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th className="text-center">Quantity</th>
                      <th className="text-right">Price Each</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(groupedItems).map((item, index) => (
                      <tr key={index}>
                        <td>{item.item_name}</td>
                        <td className="text-center">{item.quantity}</td>
                        <td className="text-right">₱{item.priceEach.toFixed(2)}</td>
                        <td className="text-right">₱{item.totalCharge.toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td colSpan="3" className="text-right">TOTAL DUE:</td>
                      <td className="text-right">₱{total.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-3">
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg font-semibold text-green-800">
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
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePrint(userId, guest)}
                    className="flex items-center gap-1 px-3 py-2 text-gray-700 hover:text-green-600 hover:bg-gray-100 active:bg-gray-200 rounded transition text-sm"
                    title="Print Receipt"
                  >
                    <Printer size={16} />
                    <span>Print</span>
                  </button>
                  {userRole === "admin" && (
                    <button
                      onClick={() => openInvoiceModal("all", null, userId)}
                      className="px-3 py-2 bg-green-700 text-white text-sm rounded hover:bg-green-800 active:bg-green-900 whitespace-nowrap"
                    >
                      Mark All as Paid
                    </button>
                  )}
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full border border-gray-200 text-sm mb-3">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 border text-left">Item</th>
                      <th className="p-2 border text-center">Quantity</th>
                      <th className="p-2 border text-right">Price Each</th>
                      <th className="p-2 border text-right">Total</th>
                      {userRole === "admin" && <th className="p-2 border text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(groupedItems).map((item) => (
                      <tr key={item.id}>
                        <td className="p-2 border">{item.item_name}</td>
                        <td className="p-2 border text-center">{item.quantity}</td>
                        <td className="p-2 border text-right">
                          ₱{item.priceEach.toFixed(2)}
                        </td>
                        <td className="p-2 border text-right">
                          ₱{item.totalCharge.toFixed(2)}
                        </td>
                        {userRole === "admin" && (
                          <td className="p-2 border text-center">
                            <button
                              onClick={() => openInvoiceModal("single", item.id)}
                              className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                            >
                              Mark as Paid
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="sm:hidden space-y-3 mb-3">
                {Object.values(groupedItems).map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 text-sm">{item.item_name}</p>
                        </div>
                        <div className="text-right ml-2 flex-shrink-0">
                          <p className="text-xs text-gray-500">Qty</p>
                          <p className="font-semibold text-sm">{item.quantity}</p>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center pt-2 border-t">
                        <div>
                          <p className="text-xs text-gray-500">Price Each</p>
                          <p className="text-sm font-medium">₱{item.priceEach.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Total</p>
                          <p className="text-sm font-semibold text-green-700">₱{item.totalCharge.toFixed(2)}</p>
                        </div>
                      </div>

                      {userRole === "admin" && (
                        <button
                          onClick={() => openInvoiceModal("single", item.id)}
                          className="w-full mt-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 active:bg-green-800 text-sm font-medium"
                        >
                          Mark as Paid
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-right font-semibold text-green-800 text-sm sm:text-base">
                Total Due: ₱{total.toFixed(2)}
              </div>
            </div>
          );
        })
      )}

      {/* Invoice Number Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg sm:text-xl font-semibold text-green-800">
                Enter Invoice Number
              </h3>
              <button
                onClick={closeInvoiceModal}
                className="text-gray-500 hover:text-gray-700 active:text-gray-900 p-1"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                This invoice number will be recorded with the payment
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                onClick={closeInvoiceModal}
                className="w-full sm:w-auto px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 active:bg-gray-500 text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleInvoiceSubmit}
                className="w-full sm:w-auto px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800 active:bg-green-900 text-sm sm:text-base"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 sm:mt-6 text-center">
        <button
          onClick={() => window.history.back()}
          className="w-full sm:w-auto px-6 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 active:bg-gray-500 text-sm sm:text-base"
        >
          ← Back
        </button>
      </div>
    </div>
  );
};

export default PendingPayments;