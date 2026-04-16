export default function RankingBoard({ rankings, currentUserId }) {
  return (
    <section className="panel ranking-panel">
      <div className="section-head">
        <div>
          <h2>실시간 랭킹</h2>
          <p className="muted">오늘 누적 공부 시간 기준 상위 10명</p>
        </div>
      </div>
      <div className="ranking-list">
        {rankings.length ? (
          rankings.slice(0, 10).map((user, index) => (
            <article
              key={user.id}
              className={`ranking-item ${user.id === currentUserId ? "me" : ""}`}
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <div className="rank-number">{index + 1}</div>
              <div className="rank-copy">
                <strong>{user.name}</strong>
                <span>{user.studyLog?.totalTimeLabel || "0분"}</span>
              </div>
              <div className="rank-flags">
                {user.studyLog?.isStudying ? <span>Live</span> : null}
                {user.receivedReportsToday ? <span>신고 {user.receivedReportsToday}</span> : null}
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state">오늘 누적 시간이 아직 없습니다.</div>
        )}
      </div>
    </section>
  );
}
