import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loginForm, setLoginForm] = useState({
    studentId: "",
    password: ""
  });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    studentId: "",
    password: ""
  });

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");

    try {
      await login(loginForm);
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await register(registerForm);
      setMode("login");
      setRegisterForm({
        name: "",
        studentId: "",
        password: ""
      });
      setNotice(response.message);
    } catch (registerError) {
      setError(registerError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen-shell auth-shell">
      <div className="auth-layout">
        <section className="hero-panel">
          <p className="eyebrow">withstudy</p>
          <h1>실시간 공부 인증과 랭킹을 하나의 흐름으로 묶었습니다.</h1>
          <p className="hero-copy">
            관리자 승인 후에만 입장할 수 있고, 공부 세션은 30초 간격 인증으로
            유지됩니다. 오늘 공부 시간과 실시간 순위, 신고 누적 현황을 한 번에
            확인할 수 있습니다.
          </p>
          <div className="hero-points">
            <div className="mini-stat">
              <span>핵심 규칙</span>
              <strong>5-5-5</strong>
            </div>
            <div className="mini-stat">
              <span>인증 간격</span>
              <strong>30초</strong>
            </div>
            <div className="mini-stat">
              <span>대상</span>
              <strong>승인 사용자</strong>
            </div>
          </div>
        </section>

        <section className="panel auth-panel">
          <div className="tab-row">
            <button
              className={mode === "login" ? "tab active" : "tab"}
              onClick={() => setMode("login")}
            >
              로그인
            </button>
            <button
              className={mode === "register" ? "tab active" : "tab"}
              onClick={() => setMode("register")}
            >
              가입 신청
            </button>
          </div>

          {error ? <div className="error-banner">{error}</div> : null}
          {notice ? <div className="success-banner">{notice}</div> : null}

          {mode === "login" ? (
            <form className="form-stack" onSubmit={handleLogin}>
              <label className="field">
                <span>학번</span>
                <input
                  value={loginForm.studentId}
                  onChange={(event) =>
                    setLoginForm((current) => ({
                      ...current,
                      studentId: event.target.value
                    }))
                  }
                  placeholder="학번 입력"
                  autoComplete="username"
                  required
                />
              </label>
              <label className="field">
                <span>비밀번호</span>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((current) => ({
                      ...current,
                      password: event.target.value
                    }))
                  }
                  placeholder="비밀번호 입력"
                  autoComplete="current-password"
                  required
                />
              </label>
              <button className="primary-button" disabled={loading}>
                {loading ? "확인 중..." : "로그인"}
              </button>
              <p className="muted small-text">
                승인 전 계정은 로그인할 수 없습니다.
              </p>
            </form>
          ) : (
            <form className="form-stack" onSubmit={handleRegister}>
              <label className="field">
                <span>이름</span>
                <input
                  value={registerForm.name}
                  onChange={(event) =>
                    setRegisterForm((current) => ({
                      ...current,
                      name: event.target.value
                    }))
                  }
                  placeholder="실명 입력"
                  autoComplete="name"
                  required
                />
              </label>
              <label className="field">
                <span>학번</span>
                <input
                  value={registerForm.studentId}
                  onChange={(event) =>
                    setRegisterForm((current) => ({
                      ...current,
                      studentId: event.target.value
                    }))
                  }
                  placeholder="학번 입력"
                  required
                />
              </label>
              <label className="field">
                <span>비밀번호</span>
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(event) =>
                    setRegisterForm((current) => ({
                      ...current,
                      password: event.target.value
                    }))
                  }
                  placeholder="6자 이상 권장"
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </label>
              <button className="primary-button" disabled={loading}>
                {loading ? "신청 중..." : "가입 신청"}
              </button>
              <p className="muted small-text">
                가입 후 관리자 승인까지 대기 상태로 유지됩니다.
              </p>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
