const prisma = require("../lib/prisma");
const { getDateKey, getDayRange } = require("../lib/date");
const {
  deleteUserDayAssets,
  saveSnapshotImage
} = require("../lib/storage");

function getAccruedSeconds(lastActiveAt, now = new Date()) {
  if (!lastActiveAt) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(30, Math.round((now.getTime() - lastActiveAt.getTime()) / 1000))
  );
}

async function ensureTodayStudyLog(userId, now = new Date()) {
  const dateKey = getDateKey(now);
  const existing = await prisma.studyLog.findUnique({
    where: {
      userId_dateKey: {
        userId,
        dateKey
      }
    }
  });

  if (existing) {
    return existing;
  }

  return prisma.studyLog.create({
    data: {
      userId,
      dateKey
    }
  });
}

async function startStudySession(userId) {
  const now = new Date();
  const dateKey = getDateKey(now);

  return prisma.studyLog.upsert({
    where: {
      userId_dateKey: {
        userId,
        dateKey
      }
    },
    update: {
      isStudying: true,
      lastActiveAt: now
    },
    create: {
      userId,
      dateKey,
      isStudying: true,
      lastActiveAt: now
    }
  });
}

async function saveSnapshot(userId, imageData) {
  const now = new Date();
  let studyLog = await ensureTodayStudyLog(userId, now);
  const secondsToAdd = studyLog.isStudying
    ? getAccruedSeconds(studyLog.lastActiveAt, now)
    : 0;
  const filePath = await saveSnapshotImage({
    userId,
    dateKey: getDateKey(now),
    imageData
  });

  return prisma.$transaction(async (transaction) => {
    const updated = await transaction.studyLog.update({
      where: { id: studyLog.id },
      data: {
        isStudying: true,
        lastImage: filePath,
        lastActiveAt: now,
        totalSeconds: studyLog.totalSeconds + secondsToAdd
      }
    });

    await transaction.snapshot.create({
      data: {
        userId,
        studyLogId: updated.id,
        filePath
      }
    });

    return updated;
  });
}

async function stopStudySession(userId) {
  const now = new Date();
  const studyLog = await ensureTodayStudyLog(userId, now);

  if (!studyLog.isStudying) {
    return studyLog;
  }

  return prisma.studyLog.update({
    where: { id: studyLog.id },
    data: {
      isStudying: false,
      lastActiveAt: null,
      totalSeconds: studyLog.totalSeconds + getAccruedSeconds(studyLog.lastActiveAt, now)
    }
  });
}

async function getTodayTimelapseImages(userId) {
  const { start, end } = getDayRange();
  const snapshots = await prisma.snapshot.findMany({
    where: {
      userId,
      createdAt: {
        gte: start,
        lt: end
      }
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  return snapshots.map((snapshot) => ({
    id: snapshot.id,
    url: snapshot.filePath,
    createdAt: snapshot.createdAt
  }));
}

async function resetTodayData(userId) {
  const now = new Date();
  const dateKey = getDateKey(now);
  const { start, end } = getDayRange(now);
  await stopStudySession(userId);

  await prisma.$transaction(async (transaction) => {
    const studyLog = await transaction.studyLog.findUnique({
      where: {
        userId_dateKey: {
          userId,
          dateKey
        }
      }
    });

    if (studyLog) {
      await transaction.snapshot.deleteMany({
        where: {
          studyLogId: studyLog.id
        }
      });
      await transaction.studyLog.delete({
        where: {
          id: studyLog.id
        }
      });
    }

    await transaction.report.deleteMany({
      where: {
        createdAt: {
          gte: start,
          lt: end
        },
        OR: [{ reporterId: userId }, { targetId: userId }]
      }
    });
  });

  await deleteUserDayAssets(userId, dateKey);
}

module.exports = {
  ensureTodayStudyLog,
  startStudySession,
  saveSnapshot,
  stopStudySession,
  getTodayTimelapseImages,
  resetTodayData
};
