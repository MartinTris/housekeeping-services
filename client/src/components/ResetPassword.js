import { useState } from "react";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const ResetPasswordModal = ({ onClose }) => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
          <input
            type="password"
            className="w-full mt-1 p-2 border rounded"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="text-sm text-gray-700">New Password</label>
          <input
            type="password"
            className="w-full mt-1 p-2 border rounded"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="text-sm text-gray-700">Confirm Password</label>
          <input
            type="password"
            className="w-full mt-1 p-2 border rounded"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordModal;
