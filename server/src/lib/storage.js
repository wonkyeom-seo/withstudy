const fs = require("fs/promises");
const path = require("path");

const uploadsRoot = path.resolve(__dirname, "../../uploads");

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

function parseDataUrl(dataUrl) {
  const match = dataUrl?.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error("이미지 형식이 올바르지 않습니다.");
  }

  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64")
  };
}

async function saveSnapshotImage({ userId, dateKey, imageData }) {
  const { mimeType, buffer } = parseDataUrl(imageData);
  const extension = mimeType.includes("png") ? "png" : "jpg";
  const userDir = path.join(uploadsRoot, "study", dateKey, String(userId));
  const fileName = `${Date.now()}.${extension}`;
  const absolutePath = path.join(userDir, fileName);

  await ensureDir(userDir);
  await fs.writeFile(absolutePath, buffer);

  return `/uploads/study/${dateKey}/${userId}/${fileName}`;
}

async function saveProfileImage({ userId, file }) {
  const extension = file.mimetype?.includes("png") ? "png" : "jpg";
  const profileDir = path.join(uploadsRoot, "profiles");
  const fileName = `${userId}-${Date.now()}.${extension}`;
  const absolutePath = path.join(profileDir, fileName);

  await ensureDir(profileDir);
  await fs.writeFile(absolutePath, file.buffer);

  return `/uploads/profiles/${fileName}`;
}

async function deleteUserDayAssets(userId, dateKey) {
  const userDir = path.join(uploadsRoot, "study", dateKey, String(userId));
  await fs.rm(userDir, { recursive: true, force: true });
}

module.exports = {
  uploadsRoot,
  saveSnapshotImage,
  saveProfileImage,
  deleteUserDayAssets
};
