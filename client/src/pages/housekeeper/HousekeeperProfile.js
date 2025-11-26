import { useEffect, useState } from "react";
import ResetPassword from "../../components/ResetPassword";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const HousekeeperProfile = () => {
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
        console.error("Failed to fetch housekeeper profile:", res.status);
        setProfile(null);
        setLoading(false);
        return;
      }

      const data = await res.json();
      setProfile(data);
    } catch (err) {
      console.error("Network error fetching housekeeper profile:", err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <h2 className="text-2xl sm:text-3xl font-poppins font-bold text-green-900 mb-4 sm:mb-6">
        Housekeeper Profile
      </h2>

      {loading ? (
        <p>Loading profile…</p>
      ) : !profile ? (
        <p className="text-red-600">Unable to load profile.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 md:p-8 max-w-3xl">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            <div className="flex-1 w-full">
              <p className="text-xl sm:text-2xl font-semibold text-gray-900">
                {profile.first_name} {profile.last_name}
              </p>
              <p className="text-sm text-gray-600 break-words">{profile.email}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6">
                <div className="p-3 sm:p-4 rounded-lg border">
                  <p className="text-xs text-gray-500 uppercase">Role</p>
                  <p className="text-base sm:text-lg font-medium">{profile.role}</p>
                </div>

                <div className="p-3 sm:p-4 rounded-lg border">
                  <p className="text-xs text-gray-500 uppercase">Facility</p>
                  <p className="text-base sm:text-lg font-medium">
                    {profile.facility || "No facility assigned"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 sm:mt-8">
            <button
              onClick={() => setShowResetModal(true)}
              className="mt-6 w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-full shadow-lg hover:scale-105 hover:from-green-700 hover:to-emerald-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm sm:text-base"
            >
              Reset Password
            </button>
          </div>

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

export default HousekeeperProfile;
