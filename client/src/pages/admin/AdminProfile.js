import { useEffect, useState } from "react";
import ResetPassword from "../../components/ResetPassword"

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AdminProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/users/me`, {
        headers: { token: localStorage.token },
      });

      if (!res.ok) {
        console.error("Failed to fetch admin profile:", res.status);
        setProfile(null);
        setLoading(false);
        return;
      }

      const data = await res.json();
      setProfile(data);
    } catch (err) {
      console.error("Network error fetching admin profile:", err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return (
    <div className="p-8">
      <h2 className="text-3xl font-poppins font-bold text-green-900 mb-6">
        Admin Profile
      </h2>

      {loading ? (
        <p>Loading profile…</p>
      ) : !profile ? (
        <p className="text-red-600">Unable to load profile.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-3xl">

          {/* Top Section */}
          <div className="flex items-start gap-6">
            <div className="flex-1">
              <p className="text-2xl font-semibold text-gray-900">
                {profile.first_name} {profile.last_name}
              </p>
              <p className="text-sm text-gray-600">{profile.email}</p>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="p-4 rounded-lg border">
                  <p className="text-xs text-gray-500 uppercase">Role</p>
                  <p className="text-lg font-medium">{profile.role}</p>
                </div>

                <div className="p-4 rounded-lg border">
                  <p className="text-xs text-gray-500 uppercase">Facility</p>
                  <p className="text-lg font-medium">
                    {profile.facility || "No facility assigned"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Reset Password Button */}
          <div className="mt-8">
            <button
              onClick={() => setShowResetModal(true)}
              className="px-4 py-2 bg-green-700 text-white rounded-lg shadow hover:bg-green-800 transition"
            >
              Reset Password
            </button>
          </div>

          {/* Modal */}
          {showResetModal && (
            <ResetPassword
              onClose={() => setShowResetModal(false)}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default AdminProfile;
