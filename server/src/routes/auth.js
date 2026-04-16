const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const { jwtSecret } = require("../lib/env");
const { requireAuth } = require("../middleware/auth");
const { buildDashboardPayload } = require("../services/dashboardService");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const studentId = (req.body.studentId || "").trim();
    const password = String(req.body.password || "");
    const name = (req.body.name || "").trim();
    if (!studentId || !password || !name) {
      return res.status(400).json({ message: "이름, 학번, 비밀번호를 모두 입력하세요." });
    }

    const existing = await prisma.user.findUnique({
      where: {
        studentId
      }
    });

    if (existing) {
      return res.status(409).json({ message: "이미 사용 중인 학번입니다." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        studentId,
        password: hashedPassword,
        name,
        status: "pending"
      }
    });

    return res.json({
      message: "가입 신청이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다."
    });
  } catch (error) {
    return res.status(500).json({ message: "가입 처리 중 오류가 발생했습니다." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const studentId = (req.body.studentId || "").trim();
    const password = String(req.body.password || "");
    const user = await prisma.user.findUnique({
      where: {
        studentId
      }
    });

    if (!user) {
      return res.status(400).json({ message: "학번 또는 비밀번호가 올바르지 않습니다." });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: "학번 또는 비밀번호가 올바르지 않습니다." });
    }

    if (user.status !== "approved") {
      return res
        .status(403)
        .json({ message: "관리자 승인 후 로그인할 수 있습니다." });
    }

    const token = jwt.sign({ userId: user.id }, jwtSecret, {
      expiresIn: "7d"
    });
    const payload = await buildDashboardPayload(user.id);

    return res.json({
      token,
      user: payload.me
    });
  } catch (error) {
    return res.status(500).json({ message: "로그인 처리 중 오류가 발생했습니다." });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const payload = await buildDashboardPayload(req.user.id);
    return res.json({ user: payload.me });
  } catch (error) {
    return res.status(500).json({ message: "세션 확인 중 오류가 발생했습니다." });
  }
});

module.exports = router;
