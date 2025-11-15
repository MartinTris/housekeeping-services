const jwt = require("jsonwebtoken");
require("dotenv").config();

function jwtGenerator(user) {
  const payload = {
    id: user.id,
    role: user.role,
    facility: user.facility,
    email: user.email,
    first_login: user.first_login
  };

  return jwt.sign(payload, process.env.jwtSecret, { expiresIn: "7d" });
}

module.exports = jwtGenerator;
