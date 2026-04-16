import { getAssetUrl } from "../lib/api";

export default function ProfilePanel({
  user,
  profileForm,
  onChange,
  onSubmit,
  onImageUpload,
  onLogout,
  saving
}) {
  const previewImage = getAssetUrl(user.profileImg);

  return (
    <section className="panel profile-panel">
      <div className="section-head">
        <div>
          <h2>마이 페이지</h2>
          <p className="muted">상태 메시지와 외부 링크를 관리합니다.</p>
        </div>
      </div>

      <div className="profile-hero">
        <div className="avatar-shell">
          {previewImage ? (
            <img src={previewImage} alt={`${user.name} 프로필`} className="avatar-image" />
          ) : (
            <div className="avatar-fallback">{user.name.slice(0, 1)}</div>
          )}
        </div>
        <div>
          <strong>{user.name}</strong>
          <p className="muted">{user.studentId}</p>
        </div>
      </div>

      <form className="form-stack" onSubmit={onSubmit}>
        <label className="field">
          <span>프로필 이미지</span>
          <input type="file" accept="image/*" onChange={onImageUpload} />
        </label>

        <label className="field">
          <span>상태 메시지</span>
          <textarea
            value={profileForm.statusMessage}
            maxLength={120}
            placeholder="예: 수학 3단원 끝내기"
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                statusMessage: event.target.value
              }))
            }
          />
        </label>

        <label className="field">
          <span>상태 메시지 유지 시간</span>
          <select
            value={profileForm.ttlHours}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                ttlHours: Number(event.target.value)
              }))
            }
          >
            <option value={1}>1시간</option>
            <option value={6}>6시간</option>
          </select>
        </label>

        <label className="field">
          <span>외부 링크 1</span>
          <input
            type="url"
            placeholder="https://"
            value={profileForm.links[0] || ""}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                links: [event.target.value, current.links[1] || ""]
              }))
            }
          />
        </label>

        <label className="field">
          <span>외부 링크 2</span>
          <input
            type="url"
            placeholder="https://"
            value={profileForm.links[1] || ""}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                links: [current.links[0] || "", event.target.value]
              }))
            }
          />
        </label>

        <div className="button-row">
          <button className="primary-button" disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </button>
          <button type="button" className="secondary-button" onClick={onLogout}>
            로그아웃
          </button>
        </div>
      </form>
    </section>
  );
}
