const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { getTodayTimelapseImages } = require("../services/studyService");

const router = express.Router();

router.get("/timelapse", requireAuth, async (req, res) => {
  try {
    const images = await getTodayTimelapseImages(req.user.id);
    return res.json({ images });
  } catch (error) {
    return res.status(500).json({ message: "타임랩스 데이터를 불러오지 못했습니다." });
  }
});

module.exports = router;
