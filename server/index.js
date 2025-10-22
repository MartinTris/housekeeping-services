const express = require("express");
const cors = require("cors");
const http = require("http");

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// routes
app.use("/auth", require("./routes/jwtauth"));
app.use("/dashboard", require("./routes/dashboard"));
app.use("/housekeepers", require("./routes/housekeepers"));
app.use("/guests", require("./routes/guests"));
app.use("/rooms", require("./routes/rooms"));
app.use("/users", require("./routes/users"));
app.use("/housekeeping-requests", require("./routes/housekeepingRequests"));
app.use("/notifications", require("./routes/notifications"));

// for socket.io
const server = http.createServer(app);
const realtime = require("./realtime");
const io = realtime.init(server, { corsOrigin: "http://localhost:3000" });

require("./tasks/expireBookings");

server.listen(5000, () => {
  console.log("Server is running on port 5000");
});
