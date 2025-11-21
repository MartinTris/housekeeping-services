let io = null;

module.exports = {
  init: (server, opts = {}) => {
    if (io) return io;
    const { Server } = require("socket.io");

    io = new Server(server, {
      cors: {
        origin: opts.corsOrigin || "*",
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket) => {
      console.log("✅ Socket connected:", socket.id);

      socket.on("joinFacility", (facility) => {
        if (!facility) return;
        const room = `facility:${String(facility).toLowerCase()}`;
        socket.join(room);
        console.log(`Socket ${socket.id} joined facility room: ${room}`);
      });

      socket.on("joinUserRoom", (userId) => {
        if (!userId) return;
        const room = `user:${userId}`;
        socket.join(room);
        console.log(`Socket ${socket.id} joined user room: ${room}`);
      });

      socket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", socket.id, "reason:", reason);
      });
    });

    return io;
  },

  getIo: () => io,
};
