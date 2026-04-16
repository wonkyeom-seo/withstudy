const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env"), override: false });

module.exports = {
  port: Number(process.env.PORT || 7001),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:7002",
  jwtSecret: process.env.JWT_SECRET || "replace-this-secret",
  adminSecretKey: process.env.ADMIN_SECRET_KEY || "replace-this-admin-key"
};
