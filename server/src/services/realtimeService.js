const registry = require("../lib/socketRegistry");
const { buildDashboardPayload } = require("./dashboardService");

async function emitDashboardToUser(io, userId) {
  const payload = await buildDashboardPayload(userId);
  registry.getSocketIds(userId).forEach((socketId) => {
    io.to(socketId).emit("dashboard:update", payload);
  });
}

async function emitDashboardToAll(io) {
  await Promise.all(
    registry.getOnlineUserIds().map((userId) => emitDashboardToUser(io, userId))
  );
}

function emitForceStop(io, userId, message) {
  registry.getSocketIds(userId).forEach((socketId) => {
    io.to(socketId).emit("force_stop", { message });
  });
}

module.exports = {
  emitDashboardToUser,
  emitDashboardToAll,
  emitForceStop
};
