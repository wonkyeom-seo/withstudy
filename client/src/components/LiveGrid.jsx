import { getAssetUrl } from "../lib/api";

function renderImage(user, localPreviewUrl) {
  if (localPreviewUrl && user.isSelf) {
    return localPreviewUrl;
  }

  return getAssetUrl(user.studyLog?.lastImage || user.profileImg);
}

export default function LiveGrid({
  currentUser,
  localPreviewUrl,
  users,
  reportQuota,
  onReport
}) {
  const cards = [
    {
      ...currentUser,
      isSelf: true
    },
    ...users
      .filter((user) => user.id !== currentUser.id)
      .map((user) => ({
        ...user,
        isSelf: false
      }))
  ];

  return (
    <div className="live-grid">
      {cards.map((user) => {
        const image = renderImage(user, localPreviewUrl);
        const alreadyReported = reportQuota.reportedTargetIds.includes(user.id);

        return (
          <article key={user.id} className="camera-card">
            <div className="camera-image-wrap">
              {image ? (
                <img src={image} alt={`${user.name} 최근 스냅샷`} className="camera-image" />
              ) : (
                <div className="camera-placeholder">이미지 대기 중</div>
              )}
              <span
                className={`status-pill floating ${
                  user.studyLog?.isStudying ? "live" : "idle"
                }`}
              >
                {user.studyLog?.isStudying ? "공부 중" : "대기"}
              </span>
            </div>
            <div className="camera-meta">
              <div>
                <strong>{user.isSelf ? `${user.name} (나)` : user.name}</strong>
                <p className="muted">
                  {user.studyLog?.totalTimeLabel || "0분"} · 신고 {user.receivedReportsToday || 0}
                  회
                </p>
              </div>
              {!user.isSelf ? (
                <button
                  className="ghost-button"
                  disabled={
                    !reportQuota.remainingTotal ||
                    alreadyReported ||
                    !user.studyLog?.isStudying
                  }
                  onClick={() => onReport(user.id)}
                >
                  {alreadyReported ? "오늘 신고함" : "신고"}
                </button>
              ) : null}
            </div>
            {user.statusMessage ? (
              <p className="status-message">“{user.statusMessage}”</p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
