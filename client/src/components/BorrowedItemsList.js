import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import { Printer } from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const BorrowedItemsList = () => {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser(decoded);
      } catch (err) {
        console.error("Error decoding token:", err);
      }
    }
  }, []);

  const fetchBorrowedItems = async () => {
    try {
      const response = await fetch(`${API_URL}/items/borrowed`, {
        headers: { token: localStorage.getItem("token") },
      });

      const data = await response.json();

      if (response.ok) {
        const validData = Array.isArray(data) ? data : [];

        const unpaidItems = validData.filter((item) => {
          const isPaid =
            item.is_paid === true ||
            item.is_paid === "true" ||
            item.is_paid === 1;
          return !isPaid;
        });

        setItems(unpaidItems);

        const totalAmount = unpaidItems.reduce(
          (sum, item) => sum + Number(item.charge_amount || 0),
          0
        );
        setTotal(totalAmount);
      } else {
        setError(data.error || "Failed to fetch borrowed items");
      }
    } catch (err) {
      console.error("Error fetching borrowed items:", err);
      setError("Server error while fetching borrowed items");
    }
  };

  useEffect(() => {
    fetchBorrowedItems();
  }, []);

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

  const handlePrint = () => {
    const printContent = document.getElementById('print-content');
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
              font-size: 11px;
            }
            .borrower-label {
              font-weight: bold;
              color: #374151;
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

    console.log(user);
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-md w-full flex flex-col h-[400px]">
      {/* Print content - hidden on screen */}
      <div id="print-content" style={{ display: 'none' }}>
        <div className="receipt-header">
          <div className="receipt-title">BORROWED ITEMS RECEIPT</div>
          <div className="receipt-info">Date & Time: {formatDateTime()}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item Name</th>
              <th className="text-center">Quantity</th>
              <th className="text-right">Charge Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.item_name}</td>
                <td className="text-center">{item.quantity}</td>
                <td className="text-right">₱{Number(item.charge_amount || 0).toFixed(2)}</td>
              </tr>
            ))}
            <tr className="total-row">
              <td colSpan="2" className="text-right">TOTAL DUE:</td>
              <td className="text-right">₱{total.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Screen display */}
      <div className="flex-shrink-0 border-b pb-2 mb-2">
        <h2 className="text-xl font-semibold text-green-800 text-center">
          Borrowed Items
        </h2>
      </div>

      <div className="flex-grow overflow-y-auto space-y-2">
        {error ? (
          <p className="text-red-500 text-center">{error}</p>
        ) : items.length === 0 ? (
          <p className="text-gray-500 text-center">No borrowed items found.</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition"
            >
              {(user?.role === "admin" || user?.role === "superadmin") && (
                <div className="mb-2">
                  <p className="text-sm font-semibold text-gray-700">
                    Borrower: {item.first_name} {item.last_name}
                  </p>
                  {user?.role === "superadmin" && item.facility && (
                    <p className="text-xs text-gray-500">
                      Facility: <span className={`font-semibold ${item.facility === 'RCC' ? 'text-green-600' : 'text-blue-600'}`}>
                        {item.facility}
                      </span>
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-800">{item.item_name}</p>
                  <p className="text-sm text-gray-500">
                    Quantity: {item.quantity}
                  </p>
                </div>
                <p className="font-semibold text-gray-700">
                  ₱{Number(item.charge_amount || 0).toFixed(2)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex-shrink-0 border-t pt-2 mt-2">
        {user?.role === "guest" && (
          <div className="flex justify-between items-center">
            <p className="text-lg font-semibold text-green-700">
              Total: ₱{total.toFixed(2)}
            </p>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 px-3 py-1 text-gray-700 hover:text-green-600 hover:bg-gray-100 rounded transition"
              title="Print Receipt"
            >
              <Printer size={16} />
              <span className="text-sm">Print</span>
            </button>
          </div>
        )}

        {(user?.role === "admin" || user?.role === "superadmin") && (
          <div className="text-center">
            <button
              onClick={() => navigate("/admin/pending-payments")}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
            >
              View More Details
            </button>
            {user?.role === "superadmin" && (
              <p className="text-xs text-gray-500 mt-1 italic">
                View-only mode
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BorrowedItemsList;