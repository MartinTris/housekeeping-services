import { useEffect, useState } from "react";
import { Printer, X } from "lucide-react";
import { jwtDecode } from "jwt-decode";

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
      const response = await fetch("http://localhost:5000/items/pending", {
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
        `http://localhost:5000/items/mark-all-paid/${userId}`,
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
        `http://localhost:5000/items/${id}/mark-paid`,
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
    <div className="max-w-4xl mx-auto bg-white p-6 mt-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-green-700 mb-4 text-center">
        Pending Payments
      </h2>

      {Object.keys(groupedByGuest).length === 0 ? (
        <p className="text-gray-600 text-center">No pending payments found.</p>
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
              className="mb-6 border border-gray-300 rounded-lg p-4 shadow-sm"
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

              <div className="flex justify-between items-center mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-green-800">
                    {guest}
                  </h3>
                  {userRole === "superadmin" && facility && (
                    <p className="text-sm text-gray-500 mt-1">
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
                    className="flex items-center gap-1 px-3 py-1 text-gray-700 hover:text-green-600 hover:bg-gray-100 rounded transition"
                    title="Print Receipt"
                  >
                    <Printer size={16} />
                    <span className="text-sm">Print</span>
                  </button>
                  {userRole === "admin" && (
                    <button
                      onClick={() => openInvoiceModal("all", null, userId)}
                      className="px-3 py-1 bg-green-700 text-white text-sm rounded hover:bg-green-800"
                    >
                      Mark All as Paid
                    </button>
                  )}
                </div>
              </div>

              <table className="w-full border border-gray-200 text-sm mb-3">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 border">Item</th>
                    <th className="p-2 border">Quantity</th>
                    <th className="p-2 border">Price Each</th>
                    <th className="p-2 border">Total</th>
                    {userRole === "admin" && <th className="p-2 border">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {Object.values(groupedItems).map((item) => (
                    <tr key={item.id} className="text-center">
                      <td className="p-2 border">{item.item_name}</td>
                      <td className="p-2 border">{item.quantity}</td>
                      <td className="p-2 border">
                        ₱{item.priceEach.toFixed(2)}
                      </td>
                      <td className="p-2 border">
                        ₱{item.totalCharge.toFixed(2)}
                      </td>
                      {userRole === "admin" && (
                        <td className="p-2 border">
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

              <div className="text-right font-semibold text-green-800">
                Total Due: ₱{total.toFixed(2)}
              </div>
            </div>
          );
        })
      )}

      {/* Invoice Number Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-96 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-green-800">
                Enter Invoice Number
              </h3>
              <button
                onClick={closeInvoiceModal}
                className="text-gray-500 hover:text-gray-700"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                This invoice number will be recorded with the payment
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={closeInvoiceModal}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleInvoiceSubmit}
                className="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 text-center">
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
        >
          ← Back
        </button>
      </div>
    </div>
  );
};

export default PendingPayments;