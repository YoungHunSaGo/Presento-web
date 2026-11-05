# Presento Web

발표 영상을 올리거나 웹캠으로 녹화하면, AI가 말 속도·추임새·침묵·시선·슬라이드 누락을 찾아
**고쳐야 할 장면만 클립으로 잘라** 타임스탬프 근거와 함께 보여주는 웹 서비스의 프론트엔드입니다.

- 기준 명세: `presento-frontend-spec.md` (API 경로·필드·상태값·에러 코드를 그대로 사용)
- 디자인: Figma `v7 · 정리` 페이지 (색 6개 역할, 텍스트 스타일 Presento/*, 파랑은 근거 전용)

## 시작하기

```bash
npm install
cp .env.example .env.local   # 값 확인
npm run dev                  # http://localhost:5173
```

목업 모드(`VITE_USE_MOCK=true`)에서는 MSW가 명세의 예시 JSON으로 응답합니다.

- 로그인: 아무 이메일 + 비밀번호 `presento1234` (다른 비밀번호는 `INVALID_CREDENTIALS`)
- `캡스톤 중간 발표` → 3회차 리포트, 2회차는 분석 실패(NO_SPEECH_DETECTED) 예시
- 영상 업로드는 S3 PUT까지 목업이고, 분석 진행은 폴링할 때마다 진행률이 올라가다 완료됩니다.
- 목업에는 실제 영상이 없어 플레이어가 내부 시계로 재생을 흉내 냅니다(타임라인·대본 동기화 시연용).

실제 백엔드에 붙일 때는 `.env.local`에서 `VITE_USE_MOCK=false`, `VITE_API_BASE_URL`을 서버 주소로 바꿉니다.

| 스크립트 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 타입 검사 + 프로덕션 빌드 (`dist/`) |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run typecheck` | 타입 검사만 |

## 환경 변수

| 이름 | 예시 | 설명 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` | 백엔드 API 주소 (명세 1장) |
| `VITE_USE_MOCK` | `true` | `true`면 MSW 목업 사용 |

## 화면과 경로 (명세 2장)

| 경로 | 화면 | API |
| --- | --- | --- |
| `/login`, `/signup` | 로그인·회원가입 | A1, A2 |
| `/` | 내 발표 (없으면 첫 방문 인라인 생성) | P2, P1 |
| `/presentations/new` | 새 발표 + PDF 첨부 | P1, P6 |
| `/presentations/:id` | 발표 상세: 회차별 근거 트랙, 점수 변화, 수정·삭제 | P3, P4, P5, P7, N4, N6 |
| `/presentations/:id/record` | 영상 입력: 파일 업로드 / 웹캠 녹화(MediaRecorder) | N1, S3 PUT, N2 |
| `/analyses/:id/progress` | 분석 진행: 2초 폴링, 실패 안내 | N3 |
| `/analyses/:id` | 피드백 리포트 | N4, N5 |
| `/mypage` | 마이페이지: 요약·점수 추이·강점과 약점·항목별 점수·활동 (`docs/presento-mypage-spec.md`) | A3, M1, M2, M3 |

리포트 핵심 동작
- 근거 타임라인의 클립이나 클립 목록을 누르면 영상이 그 구간 `start`로 이동해 재생됩니다.
- "클립만 이어 보기"를 켜면 고칠 장면만 이어서 재생합니다.
- 대본 탭은 재생 중인 문장을 하이라이트하고 자동으로 따라갑니다. 추임새·반복어는 물결 밑줄이고, 마우스를 올리거나 포커스하면 설명이 나옵니다.
- 탭: 클립(=명세의 피드백), 대본, 개선 스크립트, 예상 질문, 슬라이드(PDF 없으면 안내), 요약.
- `?t=초` 쿼리로 특정 시점부터 열 수 있습니다(발표 상세의 "다음 연습에서 볼 것"에서 사용).

## 구조

```
src/
  api/        types.ts(명세 타입) · client.ts(axios, 인증, 401 처리, 직접 업로드) · endpoints.ts(A1~N6)
  auth/       AuthContext (토큰은 localStorage)
  components/ Layout(상단바·인증 가드) · EvidenceTrack(근거 타임라인) · FlaggedWord(추임새 말풍선) · Logo
  hooks/      useUploadAndStart(N1→PUT→N2) · usePlayback(영상/내부 시계 재생 상태)
  mocks/      data.ts(명세 예시 기반) · handlers.ts(MSW) · browser.ts
  pages/      화면 7개
  styles/     tokens.css(디자인 토큰) · global.css · components.css · pages.css
```

## 명세에 없는 부분 (TODO(spec))

- 슬라이드 페이지 썸네일 이미지: 명세에 필드가 없어 페이지 번호 타일로 표시합니다. PDF를 프론트에서 렌더링할지, 백엔드가 이미지를 줄지 결정이 필요합니다.
- 클립 썸네일: 명세에 영상 프레임 이미지가 없어 `feedbacks.evidence` 문장을 자막처럼 보여줍니다.
- 대시보드의 회차별 근거 트랙: P2 응답에 최신 회차 ID가 없어 대시보드에는 넣지 않았습니다(발표 상세에는 N4로 표시).
- 배포 도메인, S3 CORS, 하루 분석 횟수 제한, 소셜 로그인은 명세의 "아직 정해지지 않은 것"이라 구현하지 않았습니다.
