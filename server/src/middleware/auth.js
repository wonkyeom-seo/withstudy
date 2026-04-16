const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const { adminSecretKey, jwtSecret } = require("../lib/env");

async function readUserFromToken(token) {
  if (!token) {
    throw new Error("인증 토큰이 필요합니다.");
  }

  const decoded = jwt.verify(token, jwtSecret);
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId }
  });

  if (!user) {
    throw new Error("사용자를 찾을 수 없습니다.");
  }

  return user;
}

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    const user = await readUserFromToken(token);
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: error.message || "인증이 필요합니다." });
  }
}

function requireAdminKey(req, res, next) {
  const key = req.headers["x-admin-key"] || req.query.key;

  if (!key || key !== adminSecretKey) {
    return res.status(403).json({ message: "관리자 키가 올바르지 않습니다." });
  }

  return next();
}

module.exports = {
  requireAuth,
  requireAdminKey,
  readUserFromToken
};
