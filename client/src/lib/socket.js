import { io } from "socket.io-client";

const API_BASE = import.meta.env.VITE_API_BASE || window.location.origin;

export function connectSocket(token) {
  return io(API_BASE, {
    auth: { token },
    transports: ["websocket", "polling"]
  });
}
