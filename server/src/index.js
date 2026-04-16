const fs = require("fs");
const path = require("path");
const http = require("http");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { Server } = require("socket.io");
const { port, clientOrigin } = require("./lib/env");
const prisma = require("./lib/prisma");
const registry = require("./lib/socketRegistry");
const { uploadsRoot } = require("./lib/storage");
const { readUserFromToken } = require("./middleware/auth");
const authRouter = require("./routes/auth");
const createUsersRouter = require("./routes/users");
const studyRouter = require("./routes/study");
const createReportRouter = require("./routes/reports");
const createAdminRouter = require("./routes/admin");
const {
  startStudySession,
  saveSnapshot,
  stopStudySession
} = require("./services/studyService");
const { emitDashboardToAll } = require("./services/realtimeService");

const app = express();
app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);
app.use(
  cors({
    origin: clientOrigin,
    credentials: true
  })
);
app.use(express.json({ limit: "12mb" }));
app.use("/uploads", express.static(uploadsRoot));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: clientOrigin,
    credentials: true
  },
  maxHttpBufferSize: 12 * 1024 * 1024
});

app.use("/api/auth", authRouter);
app.use("/api/users", createUsersRouter(io));
app.use("/api/study", studyRouter);
app.use("/api/reports", createReportRouter(io));
app.use("/api/admin", createAdminRouter(io));

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

const clientDistPath = path.resolve(__dirname, "../../client/dist");
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get(/^\/(?!api|uploads|socket\.io).*/, (req, res) => {
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
}

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    const user = await readUserFromToken(token);
    if (user.status !== "approved") {
      return next(new Error("승인된 사용자만 접속할 수 있습니다."));
    }

    socket.data.user = user;
    return next();
  } catch (error) {
    return next(new Error(error.message || "소켓 인증에 실패했습니다."));
  }
});

io.on("connection", (socket) => {
  const userId = socket.data.user.id;
  registry.add(userId, socket.id);
  emitDashboardToAll(io).catch(() => {});

  socket.on("study:start", async () => {
    try {
      await startStudySession(userId);
      await emitDashboardToAll(io);
    } catch (error) {
      socket.emit("study:error", { message: "세션 시작에 실패했습니다." });
    }
  });

  socket.on("study:snapshot", async (payload) => {
    try {
      if (!payload?.imageData) {
        throw new Error("이미지 데이터가 필요합니다.");
      }

      await saveSnapshot(userId, payload.imageData);
      await emitDashboardToAll(io);
    } catch (error) {
      socket.emit("study:error", {
        message: error.message || "스냅샷 저장에 실패했습니다."
      });
    }
  });

  socket.on("study:stop", async () => {
    try {
      await stopStudySession(userId);
      await emitDashboardToAll(io);
    } catch (error) {
      socket.emit("study:error", { message: "세션 종료에 실패했습니다." });
    }
  });

  socket.on("disconnect", async () => {
    registry.remove(userId, socket.id);

    if (!registry.getSocketIds(userId).length) {
      await stopStudySession(userId).catch(() => {});
    }

    await emitDashboardToAll(io).catch(() => {});
  });
});

server.listen(port, async () => {
  await prisma.$connect();
  console.log(`withstudy server listening on http://localhost:${port}`);
});
