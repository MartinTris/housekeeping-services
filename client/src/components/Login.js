import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = ({ setAuth, setUser }) => {
  const [role, setRole] = useState("student");
  const [inputs, setInputs] = useState({
    email: "",
    student_number: "",
    password: "",
  });

  // popup states
  const [popupRole, setPopupRole] = useState(null);
  const [popupInputs, setPopupInputs] = useState({ email: "", password: "" });

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
  };

  return (
    <div className="flex min-h-screen">
      <div className="w-1/2 relative">
        <img
          src="/images/rotonda-image.jpg"
          alt="Rotonda"
          className="w-full h-full object-cover"
        />
        <div className="absolute top-0 left-0 w-full h-full bg-green-900 bg-opacity-50 flex">
          <h1 className="p-6 text-white text-4xl font-bold px-4">
            DLSU-D <br /> Housekeeping Services
          </h1>
        </div>
      </div>

      <div className="w-1/2 flex flex-col justify-center items-center bg-gray-100">
        <div className="w-3/4 max-w-md p-8 bg-white shadow-lg rounded-lg">
          <h2 className="text-2xl font-bold text-green-900 mb-6 text-center">
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
            <a href="/register" className="text-green-700 font-semibold hover:underline">
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
        </div>
      </div>

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
