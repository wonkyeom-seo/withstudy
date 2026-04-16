import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";

export default function AdminPage() {
  const [searchParams] = useSearchParams();
  const adminKey = searchParams.get("key") || "";
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadOverview() {
      if (!adminKey) {
        if (active) {
          setLoading(false);
          setError("관리자 키가 필요합니다.");
        }
        return;
      }

      try {
        const data = await api.get("/admin/overview", {
          headers: {
            "x-admin-key": adminKey
          }
        });
        if (active) {
          setOverview(data);
          setError("");
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadOverview();
    const interval = setInterval(loadOverview, 10000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [adminKey]);

  async function runAction(path) {
    try {
      const data = await api.post(path, {
        headers: {
          "x-admin-key": adminKey
        }
      });
      setOverview(data);
      setError("");
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="screen-shell center-screen">
        <div className="panel subtle-card loading-card">
          <span className="dot" />
          관리자 화면 불러오는 중
        </div>
      </div>
    );
  }

  return (
    <div className="screen-shell admin-shell">
      <div className="panel admin-header">
        <div>
          <p className="eyebrow">withstudy</p>
          <h1>관리자 페이지</h1>
          <p className="muted">
            승인 대기, 실시간 신고 누적, 강제 종료와 데이터 초기화를 한 곳에서
            관리합니다.
          </p>
        </div>
        <div className="stat-stack">
          <div className="mini-stat">
            <span>승인 대기</span>
            <strong>{overview?.pendingUsers.length || 0}</strong>
          </div>
          <div className="mini-stat">
            <span>공부 중</span>
            <strong>
              {overview?.approvedUsers.filter((user) => user.studyLog?.isStudying)
                .length || 0}
            </strong>
          </div>
        </div>
      </div>

      {error ? <div className="panel error-banner">{error}</div> : null}

      <div className="admin-grid">
        <section className="panel">
          <div className="section-head">
            <div>
              <h2>승인 대기</h2>
              <p className="muted">관리자 승인 후에만 로그인할 수 있습니다.</p>
            </div>
          </div>
          <div className="list-stack">
            {overview?.pendingUsers.length ? (
              overview.pendingUsers.map((user) => (
                <article key={user.id} className="list-card">
                  <div>
                    <strong>{user.name}</strong>
                    <p className="muted">
                      {user.studentId} · 가입 {user.createdAtLabel}
                    </p>
                  </div>
                  <button
                    className="primary-button"
                    disabled={busyId === user.id}
                    onClick={() => {
                      setBusyId(user.id);
                      runAction(`/admin/users/${user.id}/approve`);
                    }}
                  >
                    승인
                  </button>
                </article>
              ))
            ) : (
              <div className="empty-state">대기 중인 사용자가 없습니다.</div>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="section-head">
            <div>
              <h2>실시간 현황</h2>
              <p className="muted">오늘 기준 신고 누적과 공부 시간을 확인합니다.</p>
            </div>
          </div>
          <div className="list-stack">
            {overview?.approvedUsers.length ? (
              overview.approvedUsers.map((user) => (
                <article key={user.id} className="list-card column-card">
                  <div className="user-row">
                    <div>
                      <strong>{user.name}</strong>
                      <p className="muted">
                        {user.studentId} · {user.studyLog?.totalTimeLabel || "0분"}
                      </p>
                    </div>
                    <span
                      className={`status-pill ${
                        user.studyLog?.isStudying ? "live" : "idle"
                      }`}
                    >
                      {user.studyLog?.isStudying ? "공부 중" : "대기"}
                    </span>
                  </div>
                  <div className="admin-meta-row">
                    <span>오늘 받은 신고 {user.receivedReportsToday}회</span>
                    <span>오늘 한 신고 {user.madeReportsToday}회</span>
                  </div>
                  <div className="admin-actions">
                    <button
                      className="secondary-button"
                      disabled={busyId === user.id}
                      onClick={() => {
                        setBusyId(user.id);
                        runAction(`/admin/users/${user.id}/force-stop`);
                      }}
                    >
                      강제 종료
                    </button>
                    <button
                      className="danger-button"
                      disabled={busyId === user.id}
                      onClick={() => {
                        setBusyId(user.id);
                        runAction(`/admin/users/${user.id}/reset-today`);
                      }}
                    >
                      오늘 데이터 초기화
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">승인된 사용자가 없습니다.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
