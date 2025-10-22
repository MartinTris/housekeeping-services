import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const [role, setRole] = useState("student");
  const [inputs, setInputs] = useState({
    name: "",
    email: "",
    student_number: "",
    password: "",
  });

  const { name, email, student_number, password } = inputs;
  const navigate = useNavigate();

  const onChange = (e) => {
    setInputs({ ...inputs, [e.target.name]: e.target.value });
  };

  const validateStudent = () => {
    if (role === "student") {
      const lastFour = student_number.slice(-4);

      if (!email.endsWith("@dlsud.edu.ph")) {
        alert("Email must be a DLSU-D email address");
        return false;
      }

      if (!email.includes(lastFour)) {
        alert("Invalid student number or email");
        return false;
      }
    }
    return true;
  };

  const onSubmitForm = async (e) => {
  e.preventDefault();

  if (!validateStudent()) return;

  try {
    const body = { name, email, student_number, password, role };

    const response = await fetch("http://localhost:5000/auth/register", {
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

    if (response.ok && parseRes.token) {
      alert("Registration successful! Please login.");
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
    <div className="flex min-h-screen">
      <div className="w-1/2 relative">
        <img
          src="/images/rotonda-image.jpg"
          alt="Rotonda"
          className="w-full h-screen object-cover"
        />
        <div className="absolute top-0 left-0 w-full h-full bg-green-900 bg-opacity-50 flex">
          <h1 className="text-white text-4xl font-bold p-6 px-4">
            DLSU-D <br />
            Housekeeping Services
          </h1>
        </div>
      </div>

      <div className="w-1/2 flex flex-col justify-center items-center bg-gray-100">
        <div className="w-3/4 max-w-md p-8 bg-white shadow-lg rounded-lg">
          <h2 className="text-2xl font-bold text-green-900 mb-6 text-center">
            Register
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

          <form onSubmit={onSubmitForm} className="flex flex-col gap-4">
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={name}
              onChange={onChange}
              required
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-700"
            />

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
              <>
                <input
                  type="email"
                  name="email"
                  placeholder="Student Email"
                  value={email}
                  onChange={onChange}
                  required
                  className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-700"
                />
                <input
                  type="text"
                  name="student_number"
                  placeholder="Student Number"
                  value={student_number}
                  onChange={onChange}
                  required
                  className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-700"
                />
              </>
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
              Register
            </button>
          </form>

          <p className="mt-4 text-center text-gray-600">
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
