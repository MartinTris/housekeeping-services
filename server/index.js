const express = require("express");
const app = express();
const cors = require("cors");

//middleware
app.use(cors());
app.use(express.json());

//routes

//register and login
app.use("/auth", require("./routes/jwtauth"));

//dashboard
app.use("/dashboard", require("./routes/dashboard"));

app.listen(5000, () => {
  console.log("Server is running on port 5000");
});
