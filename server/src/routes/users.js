const express = require("express");
const multer = require("multer");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const { saveProfileImage } = require("../lib/storage");
const { buildDashboardPayload } = require("../services/dashboardService");
const { emitDashboardToAll } = require("../services/realtimeService");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

function validateLinks(links) {
  if (!Array.isArray(links)) {
    return [];
  }

  if (links.length > 2) {
    throw new Error("외부 링크는 최대 2개까지 저장할 수 있습니다.");
  }

  links.forEach((link) => {
    if (!link) {
      return;
    }
    new URL(link);
  });

  return links.filter(Boolean);
}

function createUsersRouter(io) {
  const router = express.Router();

  router.get("/dashboard", requireAuth, async (req, res) => {
    try {
      const payload = await buildDashboardPayload(req.user.id);
      return res.json(payload);
    } catch (error) {
      return res.status(500).json({ message: "대시보드를 불러오지 못했습니다." });
    }
  });

  router.patch("/profile", requireAuth, async (req, res) => {
    try {
      const links = validateLinks(req.body.links || []);
      const ttlHours = [1, 6].includes(Number(req.body.ttlHours))
        ? Number(req.body.ttlHours)
        : 1;
      const statusMessage = (req.body.statusMessage || "").trim();
      const statusMessageExpiresAt = statusMessage
        ? new Date(Date.now() + ttlHours * 3600 * 1000)
        : null;

      await prisma.user.update({
        where: {
          id: req.user.id
        },
        data: {
          links: JSON.stringify(links),
          statusMessage: statusMessage || null,
          statusMessageExpiresAt
        }
      });

      const payload = await buildDashboardPayload(req.user.id);
      await emitDashboardToAll(io);
      return res.json({ user: payload.me });
    } catch (error) {
      return res.status(400).json({ message: error.message || "프로필 저장에 실패했습니다." });
    }
  });

  router.post(
    "/profile-image",
    requireAuth,
    upload.single("profileImage"),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "업로드할 이미지를 선택하세요." });
        }

        const profileImg = await saveProfileImage({
          userId: req.user.id,
          file: req.file
        });

        await prisma.user.update({
          where: {
            id: req.user.id
          },
          data: {
            profileImg
          }
        });

        const payload = await buildDashboardPayload(req.user.id);
        await emitDashboardToAll(io);
        return res.json({ user: payload.me });
      } catch (error) {
        return res.status(400).json({ message: error.message || "이미지 저장에 실패했습니다." });
      }
    }
  );

  return router;
}

module.exports = createUsersRouter;
