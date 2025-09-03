module.exports = (req, res, next) => {
  const { email, student_number, name, password, role } = req.body;

  function validEmail(userEmail) {
    return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(userEmail);
  }

  if (req.path === "/register") {
    if (![name, password, role].every(Boolean)) {
      return res.status(400).json({ error: "Missing Credentials" });
    }

    if (role === "student") {
      if (![student_number, email].every(Boolean)) {
        return res.status(400).json({ error: "Student must have student_number and email" });
      } else if (!validEmail(email)) {
        return res.status(400).json({ error: "Invalid Email" });
      }
    } else {
      if (!email) {
        return res.status(400).json({ error: "Missing Email" });
      } else if (!validEmail(email)) {
        return res.status(400).json({ error: "Invalid Email" });
      }
    }
  }

  else if (req.path === "/login") {
    if (!password) {
      return res.status(400).json({ error: "Missing Password" });
    }

    if (!(student_number || email)) {
      return res.status(400).json({ error: "Missing Email or Student Number" });
    }

    if (email && !validEmail(email)) {
      return res.status(400).json({ error: "Invalid Email" });
    }
  }

  next();
};
