const jwt = require("jsonwebtoken");
require("dotenv").config();

// Main authorization middleware
const authorization = async (req, res, next) => {
  try {
    const jwtToken = req.header("token");

    if (!jwtToken) {
      return res.status(403).json("Not Authorized");
    }

    // Verify the token
    const payload = jwt.verify(jwtToken, process.env.jwtSecret);

    // Attach the decoded user to the request object
    req.user = payload;

    next();
  } catch (err) {
    console.error(err.message);
    return res.status(403).json("Not Authorized");
  }
};

// Check if user is admin or superadmin
const checkAdminOrSuperAdmin = (req, res, next) => {
  if (!['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Check if user is superadmin only
const checkSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Superadmin access required' });
  }
  next();
};

// Check facility access
const checkFacilityAccess = (req, res, next) => {
  // Get facility from query, params, or body
  const facility = req.query.facility || req.params.facility || req.body.facility;
  
  // Superadmins can access all facilities
  if (req.user.role === 'superadmin') {
    return next();
  }
  
  // Regular admins can only access their own facility
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