const jwt = require("jsonwebtoken");
require("dotenv").config();

function jwtGenerator(user) {
  const payload = {
    id: user.id,
    role: user.role,
    facility: user.facility
  };

  return jwt.sign(payload, process.env.jwtSecret, { expiresIn: "1h" });
}

module.exports = jwtGenerator;
