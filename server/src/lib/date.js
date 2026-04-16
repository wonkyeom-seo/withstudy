const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function getKstParts(date = new Date()) {
  const shifted = new Date(date.getTime() + KST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate()
  };
}

function getDateKey(date = new Date()) {
  const { year, month, day } = getKstParts(date);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getDayRange(date = new Date()) {
  const { year, month, day } = getKstParts(date);
  const start = new Date(Date.UTC(year, month, day) - KST_OFFSET_MS);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

function formatDateTime(date) {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatDuration(totalSeconds = 0) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (!hours && !minutes) {
    return "0분";
  }

  if (!hours) {
    return `${minutes}분`;
  }

  return `${hours}시간 ${minutes}분`;
}

module.exports = {
  getDateKey,
  getDayRange,
  formatDateTime,
  formatDuration
};
