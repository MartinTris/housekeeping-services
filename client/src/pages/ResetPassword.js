import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [validToken, setValidToken] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const response = await fetch(`${API_URL}/auth/verify-reset-token/${token}`);
        const data = await response.json();

        if (data.valid) {
          setValidToken(true);
        } else {
          setError("This password reset link is invalid or has expired.");
        }
      } catch (err) {
        console.error(err);
        setError("Error verifying reset link.");
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        setError(data.message || "Error resetting password.");
      }
    } catch (err) {
      console.error(err);
      setError("Server error. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-green-900 text-xl">Verifying reset link...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="flex justify-between items-center px-8 py-4 bg-green-900 text-white">
        <h1 className="text-2xl font-bold font-poppins">
          DLSU-D Housekeeping Services
        </h1>
      </header>

      <main className="flex flex-col items-center justify-center text-green-900 mt-10 px-4">
        <div className="bg-white w-full max-w-md p-8 shadow-lg rounded-lg">
          <h2 className="text-2xl font-bold text-center mb-6">
            Reset Your Password
          </h2>

          {!validToken ? (
            <div>
              <p className="text-red-600 text-center mb-4">{error}</p>
              <button
                onClick={() => navigate("/login")}
                className="w-full bg-green-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-800 transition"
              >
                Back to Login
              </button>
            </div>
          ) : (
            <>
              {error && (
                <p className="text-red-600 text-center mb-4 font-semibold">
                  {error}
                </p>
              )}

              {message && (
                <p className="text-green-600 text-center mb-4 font-semibold">
                  {message}
                </p>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="bg-green-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-800 transition mt-4"
                >
                  Reset Password
                </button>
              </form>

              <div className="text-center mt-4">
                <button
                  onClick={() => navigate("/login")}
                  className="text-green-700 hover:text-green-900 underline"
                >
                  Back to Login
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default ResetPassword;