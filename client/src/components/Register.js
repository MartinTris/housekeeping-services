import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Register = () => {
  const [role, setRole] = useState("guest");
  const [inputs, setInputs] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
  });

  const { first_name, last_name, email, password } = inputs;
  const navigate = useNavigate();

  const onChange = (e) => {
    setInputs({ ...inputs, [e.target.name]: e.target.value });
  };

  const onSubmitForm = async (e) => {
  e.preventDefault();

  try {
    const body = { first_name, last_name, email, password, role };

    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const parseRes = await response.json();
    console.log(parseRes);

    if (response.status === 409) {
      alert(parseRes.message || "User already exists.");
      return;
    }

    if (response.ok) {
      alert("Registration successful! Please check your email for verification and wait for admin to assign you a room, then login.");
      navigate("/login");
    } else {
      alert(parseRes.message || "Registration failed");
    }
  } catch (err) {
    console.error("Registration error:", err.message);
    alert("Network or server error. Please try again later.");
  }
};

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <div className="w-full lg:w-1/2 relative h-64 lg:h-screen">
        <img
          src="/images/rotonda-image.jpg"
          alt="Rotonda"
          className="w-full h-full object-cover"
        />
        <div className="absolute top-0 left-0 w-full h-full bg-green-900 bg-opacity-50 flex items-start lg:items-start">
          <h1 className="text-white text-2xl sm:text-3xl lg:text-4xl font-bold p-4 sm:p-6">
            DLSU-D <br />
            Housekeeping Services
          </h1>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center bg-gray-100 p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md p-6 sm:p-8 bg-white shadow-lg rounded-lg">
          <h2 className="text-xl sm:text-2xl font-bold text-green-900 mb-4 sm:mb-6 text-center">
            Guest Registration
          </h2>

          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                name="first_name"
                placeholder="First Name"
                value={first_name}
                onChange={onChange}
                required
                className="w-full sm:w-1/2 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-700 text-sm sm:text-base"
              />
              <input
                type="text"
                name="last_name"
                placeholder="Last Name"
                value={last_name}
                onChange={onChange}
                required
                className="w-full sm:w-1/2 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-700 text-sm sm:text-base"
              />
            </div>

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
              onClick={onSubmitForm}
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2.5 rounded-full font-semibold hover:scale-105 hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg text-sm sm:text-base"
            >
              Register
            </button>
          </div>

          <p className="mt-4 text-center text-gray-600 text-sm sm:text-base">
            Already have an account?{" "}
            <a
              href="/login"
              className="text-green-700 font-semibold hover:underline"
            >
              Login here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
