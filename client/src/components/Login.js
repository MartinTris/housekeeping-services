import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TermsAndConditionsModal from "../components/TermsAndConditionsModal";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Login = ({ setAuth, setUser }) => {
  const [inputs, setInputs] = useState({
    email: "",
    password: "",
  });

  const [popupRole, setPopupRole] = useState(null);
  const [popupInputs, setPopupInputs] = useState({ email: "", password: "" });
  const [showModal, setShowModal] = useState(false);

  // ✅ Add this new state for T&C modal
  const [showTerms, setShowTerms] = useState(false);

  const navigate = useNavigate();

  const { email, password } = inputs;

  const onChange = (e) => {
    setInputs({ ...inputs, [e.target.name]: e.target.value });
  };

  const onPopupChange = (e) => {
    setPopupInputs({ ...popupInputs, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e, loginRole, creds) => {
    e.preventDefault();
    try {
      const body = { ...creds, role: loginRole };

      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const parseRes = await response.json();
      if (parseRes.token) {
        localStorage.setItem("token", parseRes.token);
        localStorage.setItem("role", parseRes.role);
        localStorage.setItem("first_login", parseRes.first_login);

        setAuth(true);
        try {
          const userRes = await fetch(`${API_URL}/users/me`, {
            headers: { token: parseRes.token },
          });

          const userData = await userRes.json();
          console.log("Fetched user data:", userData);

          setUser({
            id: userData.id || parseRes.id,
            role: parseRes.role,
            facility: userData.facility,
            email: userData.email || parseRes.email,
          });
        } catch (err) {
          console.error("Error fetching user data:", err);
          setUser({
            id: parseRes.id,
            role: parseRes.role,
            email: parseRes.email,
          });
        }

        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("permissionsNeedRefresh"));
          console.log("Dispatched permissionsNeedRefresh event");
        }, 100);

        setShowModal(false);
        setPopupRole(null);
        setPopupInputs({ email: "", password: "" });

        if (
          (parseRes.role === "admin" ||
            parseRes.role === "housekeeper" ||
            parseRes.role === "superadmin") &&
          parseRes.first_login === true
        ) {
          navigate("/force-change-password");
        } else if (parseRes.role === "superadmin") {
          navigate("/superadmin");
        } else if (parseRes.role === "admin") {
          navigate("/admin");
        } else if (parseRes.role === "housekeeper") {
          navigate("/housekeeper");
        } else if (parseRes.role === "guest") {
          navigate("/guest");
        }
      } else {
        alert(parseRes.message || "Invalid Credentials");
      }
    } catch (err) {
      console.error(err.message);
      alert("Login error. Please try again.");
    }
  };

  const handleCancel = () => {
    setPopupInputs({ email: "", password: "" });
    setPopupRole(null);
    setShowModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="flex flex-col sm:flex-row justify-between items-center px-4 sm:px-8 py-4 bg-green-900 text-white gap-3">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold font-poppins text-center sm:text-left">
          DLSU-D Housekeeping Services
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-white text-green-900 px-4 sm:px-6 py-2 rounded-full font-semibold hover:bg-gray-200 transition shadow-md text-sm sm:text-base w-full sm:w-auto"
        >
          Login
        </button>
      </header>

      <main className="flex flex-col items-center justify-center text-green-900 px-4 sm:px-6">
        <p className="p-4 sm:p-6 text-2xl sm:text-3xl font-extrabold mb-4 sm:mb-6 text-center text-green-900">
          Welcome to DLSU-D Housekeeping Services
        </p>
        <p className="max-w-3xl text-base sm:text-lg text-gray-700 text-center mb-8 sm:mb-10">
          Experience the convenience of requesting housekeeping services right
          from your room at
          <span className="font-semibold"> Hotel Rafael</span> and the
          <span className="font-semibold"> Retreat and Conference Center</span>.
          Whether you need to schedule a cleaning or borrow essential items, our
          services are just a click away — making your stay more comfortable and
          worry-free.
        </p>

        {/* Hotel Rafael Section */}
        <div className="flex flex-col lg:flex-row items-center gap-4 sm:gap-6 mb-8 sm:mb-12 w-full max-w-5xl">
          <img
            src="/images/HR_homepage.jpg"
            alt="Hotel Rafael"
            className="w-full lg:w-1/2 rounded-lg shadow-md"
          />
          <div className="w-full lg:w-1/2">
            <h2 className="text-xl sm:text-2xl font-bold mb-2 text-center lg:text-left">Hotel Rafael</h2>
            <p className="text-sm sm:text-base text-gray-700 text-center lg:text-left">
              Formerly known as Hotel Nicole, Hotel Rafael is patterned after
              classic buildings in Vigan, Ilocos Norte. It offers a blend of
              traditional charm and modern amenities, providing guests with a
              comfortable and memorable stay. Hotel Rafael has hosted various
              guests all over the world, making it a notable destination in
              Dasmariñas, Cavite both for accommodation and a learning
              environment for students.
            </p>
          </div>
        </div>

        {/* RCC Section */}
        <div className="flex flex-col lg:flex-row-reverse items-center gap-4 sm:gap-6 w-full max-w-5xl mb-8">
          <img
            src="/images/RCC_homepage.jpg"
            alt="Retreat and Conference Center"
            className="w-full lg:w-1/2 rounded-lg shadow-md"
          />
          <div className="w-full lg:w-1/2">
            <h2 className="text-xl sm:text-2xl font-bold mb-2 text-center lg:text-right">
              Retreat and Conference Center
            </h2>
            <p className="text-sm sm:text-base text-gray-700 text-center lg:text-right">
              The Retreat and Conference Center (RCC) is a venue designed for
              prayer, spiritual renewal, conferences and business meetings. It
              provides a serene and peaceful environment ideal for spiritual
              activities and reflection. The RCC also offers accommodation
              facilities for overnight stays.
            </p>
          </div>
        </div>
      </main>

      {/* Main Login Modal (Guest) */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
          <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl sm:text-2xl font-poppins font-bold text-green-900 mb-4 sm:mb-6 text-center">
              Guest Login
            </h2>

            <div className="flex flex-col gap-3 sm:gap-4">
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={email}
                onChange={onChange}
                required
                className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-700 text-sm sm:text-base"
              />

              <input
                type="password"
                name="password"
                placeholder="Password"
                value={password}
                onChange={onChange}
                required
                className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-700 text-sm sm:text-base"
              />

              <button
                onClick={(e) => handleLogin(e, "guest", { email, password })}
                className="bg-green-800 text-white py-2 rounded-full font-semibold hover:bg-green-900 transition shadow-md text-sm sm:text-base"
              >
                Login
              </button>
            </div>

            <p className="mt-4 text-center text-gray-600 text-sm sm:text-base">
              Don't have an account?{" "}
              <button
                onClick={() => setShowTerms(true)}
                className="text-green-700 font-poppins font-semibold hover:underline"
              >
                Register here
              </button>
            </p>

            <div className="mt-4 sm:mt-6 text-center flex flex-col sm:flex-row justify-center gap-2 sm:gap-4">
              <button
                onClick={() => {
                  setShowModal(false);
                  setPopupRole("admin");
                }}
                className="text-xs sm:text-sm text-blue-600 hover:underline"
              >
                Admin Login
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  setPopupRole("housekeeper");
                }}
                className="text-xs sm:text-sm text-blue-600 hover:underline"
              >
                Housekeeper Login
              </button>
            </div>

            <div className="mt-4 sm:mt-6 text-center">
              <button
                onClick={handleCancel}
                className="bg-gray-400 text-white py-2 px-4 sm:px-6 rounded-full hover:bg-gray-500 transition shadow-md text-sm sm:text-base w-full sm:w-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin/Housekeeper Login Modal */}
      {popupRole && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg sm:text-xl font-bold mb-4 text-center">
              {popupRole.charAt(0).toUpperCase() + popupRole.slice(1)} Login
            </h3>
            <div className="flex flex-col gap-3 sm:gap-4">
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={popupInputs.email}
                onChange={onPopupChange}
                required
                className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-700 text-sm sm:text-base"
              />
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={popupInputs.password}
                onChange={onPopupChange}
                required
                className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-700 text-sm sm:text-base"
              />
              <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-3">
                <button
                  onClick={(e) =>
                    handleLogin(e, popupRole, {
                      email: popupInputs.email,
                      password: popupInputs.password,
                    })
                  }
                  className="flex-1 bg-green-800 text-white py-2 px-4 rounded-full hover:bg-green-900 transition shadow-md text-sm sm:text-base"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 bg-gray-400 text-white py-2 px-4 rounded-full hover:bg-gray-500 transition shadow-md text-sm sm:text-base"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Terms & Conditions Modal */}
      {showTerms && (
        <TermsAndConditionsModal
          isOpen={showTerms}
          onClose={() => setShowTerms(false)}
          onAccept={() => {
            setShowTerms(false);
            navigate("/register");
          }}
        />
      )}
    </div>
  );
};

export default Login;
