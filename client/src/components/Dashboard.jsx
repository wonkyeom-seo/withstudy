import { useEffect, useRef, useState } from "react";
import { connectSocket } from "../lib/socket";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import LiveGrid from "./LiveGrid";
import RankingBoard from "./RankingBoard";
import ProfilePanel from "./ProfilePanel";

function formatDuration(totalSeconds) {
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

export default function Dashboard() {
  const { user, token, logout, setUser } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [socketState, setSocketState] = useState("connecting");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [generatingTimelapse, setGeneratingTimelapse] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [isStudying, setIsStudying] = useState(false);
  const [nextCaptureIn, setNextCaptureIn] = useState(30);
  const [localPreviewUrl, setLocalPreviewUrl] = useState("");
  const [profileForm, setProfileForm] = useState({
    links: ["", ""],
    statusMessage: "",
    ttlHours: 1
  });
  const [toasts, setToasts] = useState([]);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const socketRef = useRef(null);
  const imageCaptureRef = useRef(null);
  const captureIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const ffmpegRef = useRef(null);

  useEffect(() => {
    setProfileForm({
      links: [...(user.links || []), "", ""].slice(0, 2),
      statusMessage: user.statusMessage || "",
      ttlHours: user.statusMessageTtlHours || 1
    });
  }, [user]);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const data = await api.get("/users/dashboard", { token });
        if (!active) {
          return;
        }
        setDashboard(data);
        setUser(data.me);
        setIsStudying(Boolean(data.me?.studyLog?.isStudying));
      } catch (loadError) {
        pushToast(loadError.message, "danger");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    const socket = connectSocket(token);
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketState("connected");
    });

    socket.on("disconnect", () => {
      setSocketState("disconnected");
    });

    socket.on("dashboard:update", (payload) => {
      setDashboard(payload);
      setUser(payload.me);
      setIsStudying(Boolean(payload.me?.studyLog?.isStudying));
    });

    socket.on("force_stop", (payload) => {
      stopLocalSession(false);
      setIsStudying(false);
      pushToast(payload?.message || "신고 누적으로 인해 종료되었습니다.", "danger");
    });

    socket.on("study:error", (payload) => {
      pushToast(payload?.message || "카메라 인증 처리에 실패했습니다.", "danger");
    });

    socket.on("connect_error", (error) => {
      setSocketState("error");
      pushToast(error.message, "danger");
    });

    return () => {
      stopLocalSession(false);
      socket.disconnect();
    };
  }, [token]);

  function pushToast(message, tone = "info") {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3200);
  }

  function stopLocalSession(emitStop = true) {
    if (emitStop && socketRef.current?.connected) {
      socketRef.current.emit("study:stop");
    }

    clearInterval(captureIntervalRef.current);
    clearInterval(countdownIntervalRef.current);
    captureIntervalRef.current = null;
    countdownIntervalRef.current = null;
    setNextCaptureIn(30);
    setLocalPreviewUrl("");
    imageCaptureRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function captureFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      throw new Error("카메라가 준비되지 않았습니다.");
    }

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("캔버스를 사용할 수 없습니다.");
    }

    if (imageCaptureRef.current?.grabFrame) {
      const frame = await imageCaptureRef.current.grabFrame();
      canvas.width = frame.width;
      canvas.height = frame.height;
      context.drawImage(frame, 0, 0);
    } else {
      canvas.width = video.videoWidth || 720;
      canvas.height = video.videoHeight || 540;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    return canvas.toDataURL("image/jpeg", 0.82);
  }

  async function captureAndSend() {
    const imageData = await captureFrame();
    setLocalPreviewUrl(imageData);
    setNextCaptureIn(30);
    socketRef.current?.emit("study:snapshot", { imageData });
  }

  async function startStudySession() {
    try {
      setCameraError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 720 },
          height: { ideal: 540 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const [track] = stream.getVideoTracks();
      if (track && "ImageCapture" in window) {
        imageCaptureRef.current = new window.ImageCapture(track);
      }

      socketRef.current?.emit("study:start");
      setIsStudying(true);
      await captureAndSend();

      captureIntervalRef.current = window.setInterval(captureAndSend, 30000);
      countdownIntervalRef.current = window.setInterval(() => {
        setNextCaptureIn((current) => (current <= 1 ? 30 : current - 1));
      }, 1000);
      pushToast("공부 세션을 시작했습니다.", "success");
    } catch (error) {
      setCameraError(error.message || "카메라 접근에 실패했습니다.");
      pushToast("카메라 접근에 실패했습니다.", "danger");
      stopLocalSession(false);
      setIsStudying(false);
    }
  }

  async function stopStudySession() {
    stopLocalSession(true);
    setIsStudying(false);
    pushToast("공부 세션을 종료했습니다.", "info");
    try {
      const data = await api.get("/users/dashboard", { token });
      setDashboard(data);
      setUser(data.me);
    } catch {
      // ignore refresh failures after stopping
    }
  }

  async function handleReport(targetId) {
    try {
      const response = await api.post(`/reports/${targetId}`, { token });
      pushToast(response.message, "success");
    } catch (error) {
      pushToast(error.message, "danger");
    }
  }

  async function handleProfileSave(event) {
    event.preventDefault();
    setSavingProfile(true);

    try {
      const payload = {
        links: profileForm.links.map((link) => link.trim()).filter(Boolean),
        statusMessage: profileForm.statusMessage.trim(),
        ttlHours: profileForm.ttlHours
      };
      const response = await api.patch("/users/profile", {
        token,
        body: payload
      });
      setUser(response.user);
      pushToast("프로필을 저장했습니다.", "success");
    } catch (error) {
      pushToast(error.message, "danger");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("profileImage", file);

    try {
      const response = await api.post("/users/profile-image", {
        token,
        body: formData,
        isForm: true
      });
      setUser(response.user);
      pushToast("프로필 이미지를 업데이트했습니다.", "success");
    } catch (error) {
      pushToast(error.message, "danger");
    } finally {
      event.target.value = "";
    }
  }

  async function handleTimelapseDownload() {
    setGeneratingTimelapse(true);

    try {
      const { images } = await api.get("/study/timelapse", { token });
      if (!images.length) {
        throw new Error("오늘 저장된 이미지가 없습니다.");
      }

      const [{ FFmpeg }, { fetchFile, toBlobURL }] = await Promise.all([
        import("@ffmpeg/ffmpeg"),
        import("@ffmpeg/util")
      ]);

      if (!ffmpegRef.current) {
        const ffmpeg = new FFmpeg();
        const baseUrl =
          "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd";

        await ffmpeg.load({
          coreURL: await toBlobURL(
            `${baseUrl}/ffmpeg-core.js`,
            "text/javascript"
          ),
          wasmURL: await toBlobURL(
            `${baseUrl}/ffmpeg-core.wasm`,
            "application/wasm"
          )
        });

        ffmpegRef.current = ffmpeg;
      }

      const ffmpeg = ffmpegRef.current;
      const runId = Date.now();
      const framePrefix = `frame-${runId}-`;
      const outputName = `timelapse-${runId}.mp4`;
      for (let index = 0; index < images.length; index += 1) {
        const name = `${framePrefix}${String(index + 1).padStart(4, "0")}.jpg`;
        const file = await fetchFile(images[index].url);
        await ffmpeg.writeFile(name, file);
      }

      await ffmpeg.exec([
        "-framerate",
        "2",
        "-i",
        `${framePrefix}%04d.jpg`,
        "-pix_fmt",
        "yuv420p",
        outputName
      ]);

      const data = await ffmpeg.readFile(outputName);
      const blob = new Blob([data.buffer], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `withstudy-${user.studentId}-timelapse.mp4`;
      anchor.click();
      URL.revokeObjectURL(url);
      pushToast("타임랩스 영상을 내려받았습니다.", "success");
    } catch (error) {
      pushToast(error.message, "danger");
    } finally {
      setGeneratingTimelapse(false);
    }
  }

  const currentUser = dashboard?.me || user;
  const rankings = dashboard?.rankings || [];
  const liveUsers = dashboard?.liveUsers || [];
  const reportQuota = dashboard?.reportQuota || {
    remainingTotal: 5,
    reportedTargetIds: []
  };

  if (loading || !dashboard) {
    return (
      <div className="screen-shell center-screen">
        <div className="panel subtle-card loading-card">
          <span className="dot" />
          대시보드 불러오는 중
        </div>
      </div>
    );
  }

  return (
    <div className="screen-shell dashboard-shell">
      <canvas ref={canvasRef} className="hidden-canvas" />

      <header className="panel dashboard-header">
        <div>
          <p className="eyebrow">withstudy</p>
          <h1>{currentUser.name}님의 집중 대시보드</h1>
          <p className="muted">
            승인형 실시간 공부방. 30초 인증과 오늘 누적 시간을 기준으로 현황이
            갱신됩니다.
          </p>
        </div>
        <div className="top-stats">
          <div className="stat-card">
            <span>접속 인원</span>
            <strong>{dashboard.onlineCount}명</strong>
          </div>
          <div className="stat-card">
            <span>오늘 누적 시간</span>
            <strong>{formatDuration(currentUser.studyLog?.totalSeconds || 0)}</strong>
          </div>
          <div className="stat-card">
            <span>받은 신고</span>
            <strong>{currentUser.receivedReportsToday || 0}회</strong>
          </div>
          <div className="stat-card">
            <span>연결 상태</span>
            <strong>{socketState === "connected" ? "정상" : "재연결 중"}</strong>
          </div>
        </div>
      </header>

      <div className="dashboard-grid">
        <section className="panel live-panel">
          <div className="section-head">
            <div>
              <h2>실시간 캠 그리드</h2>
              <p className="muted">
                내 미리보기와 다른 사용자의 최신 스냅샷을 확인할 수 있습니다.
              </p>
            </div>
            <div className="session-controls">
              <button
                className={isStudying ? "danger-button" : "primary-button"}
                onClick={isStudying ? stopStudySession : startStudySession}
              >
                {isStudying ? "세션 종료" : "세션 시작"}
              </button>
              <button
                className="secondary-button"
                onClick={handleTimelapseDownload}
                disabled={generatingTimelapse}
              >
                {generatingTimelapse ? "변환 중..." : "타임랩스 다운로드"}
              </button>
            </div>
          </div>

          <div className="session-bar">
            <span className={`status-pill ${isStudying ? "live" : "idle"}`}>
              {isStudying ? "공부 중" : "대기 중"}
            </span>
            <span className="muted">
              다음 인증까지 {isStudying ? `${nextCaptureIn}초` : "-"}
            </span>
            <span className="muted">
              남은 신고 가능 횟수 {reportQuota.remainingTotal}회
            </span>
          </div>

          {cameraError ? <div className="error-banner">{cameraError}</div> : null}

          <video
            ref={videoRef}
            className="preview-video"
            autoPlay
            playsInline
            muted
          />

          <LiveGrid
            currentUser={currentUser}
            localPreviewUrl={localPreviewUrl}
            users={liveUsers}
            reportQuota={reportQuota}
            onReport={handleReport}
          />
        </section>

        <aside className="side-column">
          <RankingBoard rankings={rankings} currentUserId={currentUser.id} />
          <ProfilePanel
            user={currentUser}
            profileForm={profileForm}
            onChange={setProfileForm}
            onSubmit={handleProfileSave}
            onImageUpload={handleImageUpload}
            onLogout={logout}
            saving={savingProfile}
          />
        </aside>
      </div>

      <div className="toast-stack">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.tone}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}
