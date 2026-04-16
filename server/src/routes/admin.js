const express = require("express");
const prisma = require("../lib/prisma");
const { requireAdminKey } = require("../middleware/auth");
const { buildAdminOverview } = require("../services/dashboardService");
const { stopStudySession, resetTodayData } = require("../services/studyService");
const {
  emitDashboardToAll,
  emitForceStop
} = require("../services/realtimeService");

function createAdminRouter(io) {
  const router = express.Router();
  router.use(requireAdminKey);

  router.get("/overview", async (req, res) => {
    try {
      return res.json(await buildAdminOverview());
    } catch (error) {
      return res.status(500).json({ message: "관리자 데이터를 불러오지 못했습니다." });
    }
  });

  router.post("/users/:id/approve", async (req, res) => {
    try {
      await prisma.user.update({
        where: {
          id: Number(req.params.id)
        },
        data: {
          status: "approved"
        }
      });
      return res.json(await buildAdminOverview());
    } catch (error) {
      return res.status(400).json({ message: "사용자 승인에 실패했습니다." });
    }
  });

  router.post("/users/:id/force-stop", async (req, res) => {
    try {
      const userId = Number(req.params.id);
      await stopStudySession(userId);
      emitForceStop(io, userId, "관리자에 의해 세션이 종료되었습니다.");
      await emitDashboardToAll(io);
      return res.json(await buildAdminOverview());
    } catch (error) {
      return res.status(400).json({ message: "강제 종료에 실패했습니다." });
    }
  });

  router.post("/users/:id/reset-today", async (req, res) => {
    try {
      const userId = Number(req.params.id);
      await resetTodayData(userId);
      emitForceStop(io, userId, "관리자에 의해 오늘 데이터가 초기화되었습니다.");
      await emitDashboardToAll(io);
      return res.json(await buildAdminOverview());
    } catch (error) {
      return res.status(400).json({ message: "오늘 데이터 초기화에 실패했습니다." });
    }
  });

  return router;
}

module.exports = createAdminRouter;
