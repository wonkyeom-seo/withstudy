const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { submitReport } = require("../services/reportService");
const { stopStudySession } = require("../services/studyService");
const {
  emitDashboardToAll,
  emitForceStop
} = require("../services/realtimeService");

function createReportRouter(io) {
  const router = express.Router();

  router.post("/:targetId", requireAuth, async (req, res) => {
    try {
      const targetId = Number(req.params.targetId);
      if (!targetId) {
        return res.status(400).json({ message: "신고 대상이 올바르지 않습니다." });
      }

      const result = await submitReport({
        reporterId: req.user.id,
        targetId
      });

      if (result.reachedLimit) {
        await stopStudySession(targetId);
        emitForceStop(io, targetId, "신고 누적으로 인해 종료되었습니다.");
      }

      await emitDashboardToAll(io);

      return res.json({
        message: result.reachedLimit
          ? "신고가 접수되어 대상 사용자가 즉시 종료되었습니다."
          : "신고가 접수되었습니다."
      });
    } catch (error) {
      return res.status(400).json({ message: error.message || "신고 처리에 실패했습니다." });
    }
  });

  return router;
}

module.exports = createReportRouter;
