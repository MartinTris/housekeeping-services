const jwt = require("jsonwebtoken");
require("dotenv").config();

const authorization = async (req, res, next) => {
  try {
    const jwtToken = req.header("token");

    if (!jwtToken) {
      return res.status(403).json("Not Authorized");
    }

    const payload = jwt.verify(jwtToken, process.env.jwtSecret);
    req.user = payload;

    next();
  } catch (err) {
    console.error(err.message);
    return res.status(403).json("Not Authorized");
  }
};

const checkAdminOrSuperAdmin = (req, res, next) => {
  if (!['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const checkSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Superadmin access required' });
  }
  next();
};

const checkFacilityAccess = (req, res, next) => {
  const facility = req.query.facility || req.params.facility || req.body.facility;

  if (req.user.role === 'superadmin') {
    return next();
  }

  if (facility && req.user.facility !== facility) {
    return res.status(403).json({ error: 'Access denied to this facility' });
  }
  
  next();
};

module.exports = {
  authorization,
  checkAdminOrSuperAdmin,
  checkSuperAdmin,
  checkFacilityAccess
};