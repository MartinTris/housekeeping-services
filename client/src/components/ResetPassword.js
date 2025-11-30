import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const ResetPassword = ({ onClose }) => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    if (!oldPassword || !newPassword || !confirm) {
      return setError("All fields are required.");
    }

    if (newPassword !== confirm) {
      return setError("New passwords do not match.");
    }

    try {
      const res = await fetch(`${API_URL}/users/reset-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          token: localStorage.token,
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        return setError(data.error || "Failed to reset password.");
      }

      setSuccess("Password successfully updated!");
      setOldPassword("");
      setNewPassword("");
      setConfirm("");

      setTimeout(() => onClose(), 1200);
    } catch (err) {
      setError("Network error.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
        
        <h3 className="text-xl font-semibold mb-4">Reset Password</h3>

        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        {success && <p className="text-green-600 text-sm mb-2">{success}</p>}

        <div className="mb-4">
          <label className="text-sm text-gray-700">Old Password</label>
          <div className="relative">
            <input
              type={showOldPassword ? "text" : "password"}
              className="w-full mt-1 p-2 pr-10 border rounded"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowOldPassword(!showOldPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showOldPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm text-gray-700">New Password</label>
          <div className="relative">
            <input
              type={showNewPassword ? "text" : "password"}
              className="w-full mt-1 p-2 pr-10 border rounded"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm text-gray-700">Confirm Password</label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              className="w-full mt-1 p-2 pr-10 border rounded"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-gray-500 text-white font-medium rounded-full shadow-lg hover:scale-105 hover:bg-gray-600 transition-all duration-300 mb-4 text-sm sm:text-base"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-full shadow-lg hover:scale-105 hover:from-green-700 hover:to-emerald-700 transition-all duration-300 mb-4 text-sm sm:text-base"

          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;