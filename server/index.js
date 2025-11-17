process.env.TZ = 'Asia/Manila';

const express = require("express");
const cors = require("cors");
const http = require("http");

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// for socket.io
const server = http.createServer(app);
const realtime = require("./realtime");
const io = realtime.init(server, { corsOrigin: "http://localhost:3000" });

app.use((req, res, next) => {
  req.io = io;
  next();
});

// routes
app.use("/auth", require("./routes/jwtauth"));
app.use("/dashboard", require("./routes/dashboard"));
app.use("/housekeepers", require("./routes/housekeepers"));
app.use("/guests", require("./routes/guests"));
app.use("/rooms", require("./routes/rooms"));
app.use("/users", require("./routes/users"));
app.use("/housekeeping-requests", require("./routes/housekeepingRequests"));
app.use("/notifications", require("./routes/notifications"));
app.use("/items", require("./routes/items"));
app.use("/announcements", require("./routes/announcements"));
app.use("/feedback", require("./routes/feedback"));
app.use("/api/trends", require("./routes/adminTrends"));
app.use("/api/admin/reports", require("./routes/adminReports"));
app.use("/service-types", require("./routes/serviceTypes"));
app.use("/admins", require("./routes/admins"));

require("./tasks/expireBookings");

server.listen(5000, () => {
  console.log("Server is running on port 5000");
});
