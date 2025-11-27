import { useEffect, useState } from "react";
import ResetPassword from "../../components/ResetPassword";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const UserProfile = () => {
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
        const t = await res.text().catch(() => "");
        console.error("Failed to fetch profile:", res.status, t);
        setProfile(null);
        setLoading(false);
        return;
      }

      const data = await res.json();
      setProfile(data);
    } catch (err) {
      console.error("Network error fetching profile:", err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-2xl sm:text-3xl font-poppins font-bold text-green-900 mb-4 sm:mb-6">
        My Profile
      </h2>

      {loading ? (
        <p>Loading profile…</p>
      ) : profile ? (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 max-w-2xl">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            <div className="flex-1 w-full">
              <p className="text-lg sm:text-xl font-semibold">
                {profile.first_name} {profile.last_name}
              </p>
              <p className="text-sm text-gray-600 mb-2 break-words">
                {profile.email}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-2 mt-2">
                <div>
                  <p className="text-xs text-gray-500">Role</p>
                  <p className="font-medium">{profile.role}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Facility</p>
                  <p className="font-medium">{profile.facility || "—"}</p>
                </div>
              </div>

              <button
                onClick={() => setShowResetModal(true)}
                className="mt-6 w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-full shadow-lg hover:scale-105 hover:from-green-700 hover:to-emerald-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm sm:text-base"
              >
                Reset Password
              </button>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-base sm:text-lg font-semibold mb-2">
              Current Room
            </h3>

            {profile.current_booking ? (
              <div className="p-3 sm:p-4 border rounded">
                <p className="mb-2">
                  <span className="text-sm text-gray-500">Room:</span>{" "}
                  <span className="font-medium">
                    {profile.current_booking.room_number}
                  </span>
                </p>
                <p className="mb-2">
                  <span className="text-sm text-gray-500">Checked in:</span>{" "}
                  <span className="text-sm">
                    {new Date(profile.current_booking.time_in).toLocaleString()}
                  </span>
                </p>
                <p>
                  <span className="text-sm text-gray-500">Time out:</span>{" "}
                  <span className="text-sm">
                    {profile.current_booking.time_out
                      ? new Date(
                          profile.current_booking.time_out
                        ).toLocaleString()
                      : "Open-ended"}
                  </span>
                </p>
              </div>
            ) : (
              <p className="text-gray-600 text-sm sm:text-base">
                You have no active room assignment.
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-red-600">Unable to load profile.</p>
      )}

      {showResetModal && (
        <ResetPassword onClose={() => setShowResetModal(false)} />
      )}
    </div>
  );
};

export default UserProfile;
