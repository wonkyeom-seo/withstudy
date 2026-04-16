const { formatDateTime, formatDuration } = require("../lib/date");

function normalizeLinks(links) {
  if (typeof links === "string") {
    try {
      const parsed = JSON.parse(links);
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean).slice(0, 2);
      }
    } catch {
      return [];
    }
  }

  if (!Array.isArray(links)) {
    return [];
  }

  return links.filter(Boolean).slice(0, 2);
}

function serializeStudyLog(studyLog) {
  if (!studyLog) {
    return {
      totalSeconds: 0,
      totalTimeLabel: "0분",
      isStudying: false,
      lastImage: null,
      updatedAt: null
    };
  }

  return {
    totalSeconds: studyLog.totalSeconds,
    totalTimeLabel: formatDuration(studyLog.totalSeconds),
    isStudying: studyLog.isStudying,
    lastImage: studyLog.lastImage,
    updatedAt: studyLog.updatedAt
  };
}

function resolveStatusMessage(user, now = new Date()) {
  if (!user.statusMessage) {
    return {
      text: null,
      expiresAt: null,
      ttlHours: 1
    };
  }

  if (user.statusMessageExpiresAt && user.statusMessageExpiresAt <= now) {
    return {
      text: null,
      expiresAt: null,
      ttlHours: 1
    };
  }

  const ttlHours = user.statusMessageExpiresAt
    ? Math.max(
        1,
        Math.round((user.statusMessageExpiresAt.getTime() - now.getTime()) / 3600000)
      )
    : 1;

  return {
    text: user.statusMessage,
    expiresAt: user.statusMessageExpiresAt,
    ttlHours
  };
}

function serializeUser(user, options = {}) {
  const now = options.now || new Date();
  const statusMessage = resolveStatusMessage(user, now);
  const studyLog = Array.isArray(user.studyLogs) ? user.studyLogs[0] : user.studyLog;

  return {
    id: user.id,
    studentId: user.studentId,
    name: user.name,
    status: user.status,
    profileImg: user.profileImg,
    links: normalizeLinks(user.links),
    statusMessage: statusMessage.text,
    statusMessageExpiresAt: statusMessage.expiresAt,
    statusMessageTtlHours: statusMessage.ttlHours,
    studyLog: serializeStudyLog(studyLog),
    receivedReportsToday:
      options.receivedReportsToday ?? user.reportsReceived?.length ?? 0,
    madeReportsToday: options.madeReportsToday ?? user.reportsMade?.length ?? 0,
    online: Boolean(options.online)
  };
}

function serializeAdminPendingUser(user) {
  return {
    id: user.id,
    name: user.name,
    studentId: user.studentId,
    createdAtLabel: formatDateTime(user.createdAt)
  };
}

module.exports = {
  serializeStudyLog,
  serializeUser,
  serializeAdminPendingUser
};
