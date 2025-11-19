import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const ForceChangePassword = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");

  const [inputs, setInputs] = useState({
    new_password: "",
    confirm_password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { new_password, confirm_password } = inputs;

  const onChange = (e) => {
    setInputs({ ...inputs, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (new_password !== confirm_password) {
      setError("Passwords do not match.");
      return;
    }

    if (new_password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "http://localhost:5000/auth/change-password",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            token: localStorage.getItem("token"),
          },
          body: JSON.stringify({ newPassword: new_password }),
        }
      );

      const parseRes = await response.json();

      if (response.ok) {
        alert("Password updated successfully!");

        // Redirect based on role
        if (role === "admin") navigate("/admin");
        else if (role === "housekeeper") navigate("/housekeeper");
        else navigate("/guest");
      } else {
        setError(parseRes.message || "Error updating password.");
      }
    } catch (err) {
      console.error(err.message);
      setError("Server error.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const firstLogin = localStorage.getItem("first_login");
    if (firstLogin === "false") {
      if (role === "admin") navigate("/admin");
      else if (role === "housekeeper") navigate("/housekeeper");
    }
  }, [role, navigate]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="flex justify-between items-center px-8 py-4 bg-green-900 text-white">
        <h1 className="text-2xl font-bold font-poppins">
          DLSU-D Housekeeping Services
        </h1>
      </header>

      <main className="flex flex-col items-center justify-center text-green-900 mt-10">
        <div className="bg-white w-full max-w-md p-8 shadow-lg rounded-lg">
          <h2 className="text-2xl font-bold text-center mb-6">
            Change Your Password
          </h2>

          <p className="text-center text-gray-600 mb-4">
            For security purposes, you must set a new password before
            continuing.
          </p>

          {error && (
            <p className="text-red-600 text-center mb-4 font-semibold">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="password"
              name="new_password"
              placeholder="New Password"
              value={new_password}
              onChange={onChange}
              required
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-700"
            />

            <input
              type="password"
              name="confirm_password"
              placeholder="Confirm Password"
              value={confirm_password}
              onChange={onChange}
              required
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-700"
            />

            <button
              type="submit"
              disabled={loading}
              className="bg-green-800 text-white py-2 rounded font-semibold hover:bg-green-900 transition disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ForceChangePassword;