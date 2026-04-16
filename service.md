아래 기능 전부 완벽히 구현하기. 
오류 없어야하며 디자인은 심플하게. 하지만 모바일 기기 최적화 필수.
이상한 제목, 설명 같은거 만들지 않기. 



# 📝 [withstudy] 서비스 설계서 

## 1. 서비스 개요 (Service Overview)
* **서비스명:** withstudy
* **대상:** 중학교 3학년 학생 (관리자 승인 기반 폐쇄형)
* **핵심 가치:** 실시간 공부 자극, 엄격한 인증 환경, 부정행위 방지(신고제).
* **주요 특징:** 30초 간격 무음 캠 캡처, 실시간 랭킹, 5회 신고 시 즉시 퇴출 시스템.

---

## 2. 시스템 아키텍처 (System Architecture)
### 2.1 기술 스택 (Technical Stack)
* **Frontend:** React (Next.js 또는 Vite) - *클라이언트 사이드 렌더링 중심*
* **Backend:** Node.js (Express.js)
* **Database:** SQLite (초기 단계) 또는 PostgreSQL (확장 시)
* **ORM:** Prisma 또는 Sequelize (데이터 무결성 및 관계 정의)
* **Real-time:** Socket.io (실시간 브로드캐스트 및 제재 명령)
* **Media:** Browser ImageCapture API, FFmpeg.wasm (Client-side)

### 2.2 핵심 데이터 흐름 (Data Flow)
1.  **인증:** 가입(Pending) → 관리자 승인(Approved) → 로그인 가능.
2.  **공부 세션:** 캠 활성화 → 30초마다 `Socket.io`로 이미지 전송 → 서버는 이를 DB 경로에 기록 후 타 유저에게 브로드캐스트.
3.  **제재:** 신고 이벤트 발생 → SQL `reports` 테이블 기록 → `COUNT`가 5가 되는 즉시 서버가 해당 소켓에 '강제 종료' 명령 하달.

---

## 3. 데이터베이스 설계 (ERD Schema)

### 3.1 `Users` 테이블 (회원 관리)
| 필드명 | 타입 | 제약 조건 | 설명 |
| :--- | :--- | :--- | :--- |
| `id` | INT | PK, Auto Increment | 고유 식별자 |
| `student_id` | VARCHAR | Unique, Not Null | 학번 (ID로 사용) |
| `password` | TEXT | Not Null | 해싱된 비밀번호 |
| `name` | VARCHAR | Not Null | 실명 |
| `status` | ENUM | 'pending', 'approved' | 관리자 승인 상태 |
| `profile_img` | TEXT | Nullable | 프로필 이미지 경로 |
| `links` | JSON | Nullable | 외부 링크 (최대 2개) |

### 3.2 `StudyLogs` 테이블 (누적 공부 시간 및 상태)
| 필드명 | 타입 | 제약 조건 | 설명 |
| :--- | :--- | :--- | :--- |
| `id` | INT | PK | 식별자 |
| `user_id` | INT | FK (Users.id) | 해당 유저 |
| `total_seconds`| INT | Default 0 | 당일 누적 공부 시간(초) |
| `is_studying` | BOOLEAN | Default False | 현재 캠 활성화 여부 |
| `last_image` | TEXT | Nullable | 최신 스냅샷 파일 경로 |
| `updated_at` | DATETIME | | 마지막 업데이트 시각 |

### 3.3 `Reports` 테이블 (신고 및 제재)
| 필드명 | 타입 | 제약 조건 | 설명 |
| :--- | :--- | :--- | :--- |
| `id` | INT | PK | 식별자 |
| `reporter_id` | INT | FK (Users.id) | 신고자 |
| `target_id` | INT | FK (Users.id) | 신고 대상 |
| `created_at` | DATETIME | Default NOW | 신고 시각 (1일 5회 제한 체크) |

---

## 4. 상세 기능 명세 (Functional Specs)

### 4.1 실시간 공부 인증 (Core)
* **30초 룰:** 클라이언트는 `ImageCapture API`를 통해 30초마다 캔버스에서 스냅샷을 추출, `Base64` 또는 `Blob` 형태로 서버에 전송.
* **실시간 브로드캐스트:** 서버는 수신한 사진을 특정 폴더에 저장하고, 파일 경로를 `study_logs`에 업데이트한 뒤 `socket.broadcast`를 통해 다른 모든 접속자에게 전송.
* **타임랩스:** 세션 종료 시, 당일 저장된 유저의 이미지 경로들을 수집하여 `FFmpeg.wasm`을 이용해 클라이언트 측에서 영상 변환 및 다운로드.

### 4.2 신고 및 자동 제재 시스템 (5-5-5 Rule)
1.  **신고 제약:** 한 유저는 하루 총 **5번**만 신고 가능. 동일 대상은 하루 **1번**만 신고 가능 (SQL 중복 체크).
2.  **누적 제재:** 특정 유저가 오늘 받은 신고가 **5회**가 되는 순간:
    * 서버는 해당 유저의 `is_studying` 필드를 `False`로 변경.
    * `socket.to(user_socket_id).emit('force_stop')` 명령 전송.
    * 클라이언트는 즉시 캠을 끄고 "신고 누적으로 인해 종료되었습니다" 알림 출력.

### 4.3 관리자 페이지 (Admin)
* **경로:** `/admin?key=SECRET_ENV_KEY`
* **기능:**
    * `status: 'pending'`인 유저 리스트업 및 승인(`approved`) 처리.
    * 전체 유저의 실시간 신고 누적 현황 모니터링.
    * 특정 유저 강제 퇴출 및 데이터 초기화.

### 4.4 마이 페이지 및 상태 메시지
* **상태 메시지 TTL:** `status_messages` 테이블(또는 유저 테이블 내 필드)에 `expires_at`을 설정하여 1시간/6시간 후 자동으로 쿼리에서 제외되도록 처리.

---

## 5. UI/UX 컨셉
* **Theme:** 집중력을 높이는 **Ultra-Dark Mode**.
* **Dashboard:**
    * **Top:** 현재 실시간 접속 인원 및 나의 오늘 누적 시간.
    * **Center:** 내 캠 미리보기 (그리드 화면).
    * **Bottom:** 실시간 공부 랭킹 (Top 10 위주, 애니메이션 적용).
* **Interaction:** 신고 버튼 클릭 시 "신고가 접수되었습니다" 토스트 알림.

---

## 6. 개발 로드맵 (Phase)
1.  **Phase 1 (Infra):** Node.js + Prisma(SQLite) 환경 설정 및 User/StudyLog 스키마 생성.
2.  **Phase 2 (Auth):** 승인 대기 로직 및 관리자 승인 UI 구현.
3.  **Phase 3 (Stream):** Socket.io를 이용한 30초 간격 이미지 전송 및 실시간 랭킹 쿼리 구현.
4.  **Phase 4 (Logic):** SQL 기반 신고 카운팅 및 실시간 강제 종료(Socket Kick) 로직 완성.
5.  **Phase 5 (Final):** FFmpeg.wasm 통합 및 마이페이지 상태 메시지 만료 로직 적용.

---
