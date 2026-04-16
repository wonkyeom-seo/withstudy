const prisma = require("../lib/prisma");
const registry = require("../lib/socketRegistry");
const { getDateKey, getDayRange } = require("../lib/date");
const {
  serializeAdminPendingUser,
  serializeUser
} = require("./serializers");

async function fetchApprovedUsersWithTodayData(now = new Date()) {
  const dateKey = getDateKey(now);
  const { start, end } = getDayRange(now);

  return prisma.user.findMany({
    where: {
      status: "approved"
    },
    orderBy: {
      name: "asc"
    },
    include: {
      studyLogs: {
        where: { dateKey },
        take: 1
      },
      reportsMade: {
        where: {
          createdAt: {
            gte: start,
            lt: end
          }
        },
        select: {
          targetId: true
        }
      },
      reportsReceived: {
        where: {
          createdAt: {
            gte: start,
            lt: end
          }
        },
        select: {
          reporterId: true
        }
      }
    }
  });
}

async function buildDashboardPayload(userId) {
  const now = new Date();
  const approvedUsers = await fetchApprovedUsersWithTodayData(now);
  const onlineUserIds = new Set(registry.getOnlineUserIds());
  const serializedUsers = approvedUsers.map((user) =>
    serializeUser(user, {
      now,
      online: onlineUserIds.has(user.id),
      madeReportsToday: user.reportsMade.length,
      receivedReportsToday: user.reportsReceived.length
    })
  );

  const me = serializedUsers.find((candidate) => candidate.id === userId);
  const rankings = [...serializedUsers].sort((left, right) => {
    if (right.studyLog.totalSeconds !== left.studyLog.totalSeconds) {
      return right.studyLog.totalSeconds - left.studyLog.totalSeconds;
    }

    return left.name.localeCompare(right.name, "ko");
  });

  const liveUsers = [...serializedUsers].sort((left, right) => {
    if (Number(right.studyLog.isStudying) !== Number(left.studyLog.isStudying)) {
      return Number(right.studyLog.isStudying) - Number(left.studyLog.isStudying);
    }

    return right.studyLog.totalSeconds - left.studyLog.totalSeconds;
  });

  const mySource = approvedUsers.find((candidate) => candidate.id === userId);
  const reportedTargetIds = mySource ? mySource.reportsMade.map((report) => report.targetId) : [];

  return {
    me,
    liveUsers,
    rankings,
    onlineCount: registry.getOnlineCount(),
    reportQuota: {
      remainingTotal: Math.max(0, 5 - reportedTargetIds.length),
      reportedTargetIds
    }
  };
}

async function buildAdminOverview() {
  const now = new Date();
  const { start, end } = getDayRange(now);
  const [pendingUsers, approvedUsers] = await Promise.all([
    prisma.user.findMany({
      where: {
        status: "pending"
      },
      orderBy: {
        createdAt: "asc"
      }
    }),
    fetchApprovedUsersWithTodayData(now)
  ]);

  return {
    pendingUsers: pendingUsers.map(serializeAdminPendingUser),
    approvedUsers: approvedUsers.map((user) =>
      serializeUser(user, {
        now,
        online: registry.getOnlineUserIds().includes(user.id),
        madeReportsToday: user.reportsMade.length,
        receivedReportsToday: user.reportsReceived.length
      })
    ),
    reportWindow: {
      start,
      end
    }
  };
}

module.exports = {
  buildDashboardPayload,
  buildAdminOverview
};
