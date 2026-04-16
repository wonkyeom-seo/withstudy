const registry = {
  socketsByUser: new Map(),

  add(userId, socketId) {
    const current = this.socketsByUser.get(userId) || new Set();
    current.add(socketId);
    this.socketsByUser.set(userId, current);
  },

  remove(userId, socketId) {
    const current = this.socketsByUser.get(userId);
    if (!current) {
      return;
    }

    current.delete(socketId);
    if (!current.size) {
      this.socketsByUser.delete(userId);
    }
  },

  getSocketIds(userId) {
    return [...(this.socketsByUser.get(userId) || [])];
  },

  getOnlineUserIds() {
    return [...this.socketsByUser.keys()];
  },

  getOnlineCount() {
    return this.socketsByUser.size;
  }
};

module.exports = registry;
