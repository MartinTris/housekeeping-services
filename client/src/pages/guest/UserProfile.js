import { useEffect, useState } from "react";
import ResetPassword from "../../components/ResetPassword";

const UserProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/users/me", {
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
    <div className="p-6">
      <h2 className="text-2xl font-poppins font-bold text-green-900 mb-6">My Profile</h2>

      {loading ? (
        <p>Loading profile…</p>
      ) : profile ? (
        <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
          <div className="flex items-start gap-6">
            <div className="flex-1">
              <p className="text-xl font-semibold">{profile.first_name} {profile.last_name}</p>
              <p className="text-sm text-gray-600 mb-2">{profile.email}</p>

              <div className="grid grid-cols-2 gap-2 mt-2">
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
                className="mt-4 px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 text-sm"
              >
                Reset Password
              </button>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Current Room</h3>

            {profile.current_booking ? (
              <div className="p-4 border rounded">
                <p>
                  <span className="text-sm text-gray-500">Room:</span>{" "}
                  <span className="font-medium">{profile.current_booking.room_number}</span>
                </p>
                <p>
                  <span className="text-sm text-gray-500">Checked in:</span>{" "}
                  <span>{new Date(profile.current_booking.time_in).toLocaleString()}</span>
                </p>
                <p>
                  <span className="text-sm text-gray-500">Time out:</span>{" "}
                  <span>
                    {profile.current_booking.time_out
                      ? new Date(profile.current_booking.time_out).toLocaleString()
                      : "Open-ended"}
                  </span>
                </p>
              </div>
            ) : (
              <p className="text-gray-600">You have no active room assignment.</p>
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