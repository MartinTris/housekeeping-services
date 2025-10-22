import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = ({ setAuth, setUser }) => {
  const [role, setRole] = useState("student");
  const [inputs, setInputs] = useState({
    email: "",
    student_number: "",
    password: "",
  });

  const [popupRole, setPopupRole] = useState(null);
  const [popupInputs, setPopupInputs] = useState({ email: "", password: "" });
  const [showModal, setShowModal] = useState(false);

  const navigate = useNavigate();

  const { email, student_number, password } = inputs;

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

      const response = await fetch("http://localhost:5000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const parseRes = await response.json();
      console.log(parseRes);

      if (parseRes.token) {
        localStorage.setItem("token", parseRes.token);
        localStorage.setItem("role", parseRes.role);
        setAuth(true);
        setUser({ role: parseRes.role });

        if (parseRes.role === "admin") navigate("/admin");
        else if (parseRes.role === "housekeeper") navigate("/housekeeper");
        else navigate("/guest");

        setShowModal(false);
      } else {
        alert(parseRes.message || "Login failed");
      }
    } catch (err) {
      console.error(err.message);
    }
  };

  const handleCancel = () => {
    setPopupInputs({ email: "", password: "" });
    setPopupRole(null);
    setShowModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="flex justify-between items-center px-8 py-4 bg-green-900 text-white">
        <h1 className="text-2xl font-bold font-poppins">
          DLSU-D Housekeeping Services
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-white text-green-900 px-4 py-2 rounded font-semibold hover:bg-gray-200 transition"
        >
          Login
        </button>
      </header>

      <main className="flex flex-col items-center justify-center text-green-900">
        <p className="p-6 text-3xl font-extrabold mb-6 text-center text-green-900">
          Welcome to DLSU-D Housekeeping Services
        </p>
        <p className="max-w-3xl text-lg text-gray-700 text-center mb-10">
          Experience the convenience of requesting housekeeping services right
          from your room at
          <span className="font-semibold"> Hotel Rafael</span> and the
          <span className="font-semibold"> Retreat and Conference Center</span>.
          Whether you need to schedule a cleaning or borrow essential items, our
          services are just a click away — making your stay more comfortable and
          worry-free.
        </p>

        <div className="flex items-center gap-6 mb-12 w-full max-w-5xl">
          <img
            src="/images/HR_homepage.jpg"
            alt="Hotel Rafael"
            className="w-1/2 rounded-lg shadow-md"
          />
          <div className="w-1/2">
            <h2 className="text-2xl font-bold mb-2">Hotel Rafael</h2>
            <p className="text-gray-700">
              Random placeholder text for Hotel Rafael. Lorem ipsum dolor sit
              amet, consectetur adipiscing elit. Duis commodo felis vel arcu
              egestas, sit amet feugiat lorem euismod.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 w-full max-w-5xl">
          <div className="w-1/2 text-right">
            <h2 className="text-2xl font-bold mb-2">
              Retreat and Conference Center
            </h2>
            <p className="text-gray-700">
              Random placeholder text for RCC. Curabitur eu felis eu lectus
              cursus volutpat. Praesent at dui sit amet nulla faucibus suscipit.
            </p>
          </div>
          <img
            src="/images/RCC_homepage.jpg"
            alt="Retreat and Conference Center"
            className="mb-6 w-1/2 rounded-lg shadow-md"
          />
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-2xl font-poppins font-bold text-green-900 mb-6 text-center">
              Login
            </h2>

            <div className="flex justify-center gap-6 mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="role"
                  value="student"
                  checked={role === "student"}
                  onChange={(e) => setRole(e.target.value)}
                  className="accent-green-700"
                />
                Student
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="role"
                  value="guest"
                  checked={role === "guest"}
                  onChange={(e) => setRole(e.target.value)}
                  className="accent-green-700"
                />
                Guest
              </label>
            </div>

            <form
              onSubmit={(e) =>
                handleLogin(e, role, { email, student_number, password })
              }
              className="flex flex-col gap-4"
            >
              {role === "guest" && (
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={email}
                  onChange={onChange}
                  required
                  className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-700"
                />
              )}

              {role === "student" && (
                <input
                  type="text"
                  name="student_number"
                  placeholder="Student Number"
                  value={student_number}
                  onChange={onChange}
                  required
                  className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-700"
                />
              )}

              <input
                type="password"
                name="password"
                placeholder="Password"
                value={password}
                onChange={onChange}
                required
                className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-700"
              />

              <button
                type="submit"
                className="bg-green-800 text-white py-2 rounded font-semibold hover:bg-green-900 transition"
              >
                Login
              </button>
            </form>

            <p className="mt-4 text-center text-gray-600">
              Don't have an account?{" "}
              <a
                href="/register"
                className="text-green-700 font-poppins font-semibold hover:underline"
              >
                Register here
              </a>
            </p>

            <div className="mt-6 text-center">
              <button
                onClick={() => setPopupRole("admin")}
                className="text-sm text-blue-600 hover:underline mx-2"
              >
                Admin Login
              </button>
              <button
                onClick={() => setPopupRole("housekeeper")}
                className="text-sm text-blue-600 hover:underline mx-2"
              >
                Housekeeper Login
              </button>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={handleCancel}
                className="bg-gray-400 text-white py-2 px-4 rounded hover:bg-gray-500 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {popupRole && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h3 className="text-xl font-bold mb-4 text-center">
              {popupRole.charAt(0).toUpperCase() + popupRole.slice(1)} Login
            </h3>
            <form
              onSubmit={(e) =>
                handleLogin(e, popupRole, {
                  email: popupInputs.email,
                  password: popupInputs.password,
                })
              }
              className="flex flex-col gap-4"
            >
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={popupInputs.email}
                onChange={onPopupChange}
                required
                className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-700"
              />
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={popupInputs.password}
                onChange={onPopupChange}
                required
                className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-700"
              />
              <div className="flex justify-between">
                <button
                  type="submit"
                  className="bg-green-800 text-white py-2 px-4 rounded hover:bg-green-900 transition"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-gray-400 text-white py-2 px-4 rounded hover:bg-gray-500 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
