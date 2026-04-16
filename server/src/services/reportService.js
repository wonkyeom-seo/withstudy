const prisma = require("../lib/prisma");
const { getDayRange, getDateKey } = require("../lib/date");

async function submitReport({ reporterId, targetId }) {
  if (reporterId === targetId) {
    throw new Error("본인은 신고할 수 없습니다.");
  }

  const now = new Date();
  const dateKey = getDateKey(now);
  const { start, end } = getDayRange(now);
  const [target, totalReportsByReporter, duplicateReport] = await Promise.all([
    prisma.user.findFirst({
      where: {
        id: targetId,
        status: "approved"
      },
      include: {
        studyLogs: {
          where: { dateKey },
          take: 1
        }
      }
    }),
    prisma.report.count({
      where: {
        reporterId,
        createdAt: {
          gte: start,
          lt: end
        }
      }
    }),
    prisma.report.count({
      where: {
        reporterId,
        targetId,
        createdAt: {
          gte: start,
          lt: end
        }
      }
    })
  ]);

  if (!target || !target.studyLogs[0]?.isStudying) {
    throw new Error("현재 공부 중인 사용자만 신고할 수 있습니다.");
  }

  if (totalReportsByReporter >= 5) {
    throw new Error("오늘 사용할 수 있는 신고 횟수를 모두 사용했습니다.");
  }

  if (duplicateReport) {
    throw new Error("같은 사용자는 하루에 한 번만 신고할 수 있습니다.");
  }

  await prisma.report.create({
    data: {
      reporterId,
      targetId
    }
  });

  const targetReportCount = await prisma.report.count({
    where: {
      targetId,
      createdAt: {
        gte: start,
        lt: end
      }
    }
  });

  return {
    targetReportCount,
    reachedLimit: targetReportCount >= 5
  };
}

module.exports = {
  submitReport
};
