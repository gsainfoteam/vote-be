# Vote Backend API

## Tech Stack

- **Framework:** NestJS (Node.js)
- **Language:** TypeScript
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Authentication:** JWT (Access / Refresh Token, RTR, Blacklist), Passport, GIST IdP 연동

---

## 초기 설정 및 실행 방법

### 1. 패키지 설치
```bash
$ npm install
```

### 2. 환경 변수 설정

```env
1. Database 설정
DATABASE_HOST=localhost
DATABASE_PORT=
DATABASE_USER=
DATABASE_PASSWORD=
DATABASE_NAME=

DATABASE_URL=

2. GIST IdP 설정
GIST_IDP_CLIENT_ID=
GIST_IDP_CLIENT_SECRET=
GIST_IDP_REDIRECT_URI=http://localhost:3000/auth/callback
IDP_URL=https://idp.gistory.me

3. JWT 설정
JWT_SECRET=
JWT_EXPIRATION=3h
```

### 3. DB 셋업 및 실행

```bash
# Docker DB 실행
$ docker-compose up -d

# DB 스키마 마이그레이션 및 Prisma Client 생성
$ npx prisma migrate dev
$ npx prisma generate
```

### 4. 서버 실행
```bash
# 개발 모드 실행
$ npm run start:dev

# 프로덕션 빌드 및 실행
$ npm run build
$ npm run start:prod
```

---

## API Endpoints

### 인증 (Auth)
| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/login` | GIST IdP 로그인 |
| `POST` | `/auth/refresh` | Access Token 갱신 |
| `POST` | `/auth/logout` | 로그아웃 |

### 내 정보 (Users)
| Method | Path | Description |
|---|---|---|
| `GET` | `/users/me` | 내 프로필 조회 |
| `PATCH` | `/users/me/profile` | 프로필 설정 (닉네임, 학과) |
| `GET` | `/users/me/surveys` | 내가 만든 설문 목록 |
| `DELETE` | `/users/me/surveys/{id}` | 내 설문 삭제 |
| `POST` | `/users/me/surveys/{id}/close`| 내 설문 조기 마감 |
| `GET` | `/users/me/responses` | 내가 참여한 설문 목록 |
| `GET` | `/users/me/comments` | 내가 쓴 댓글 목록 |
| `GET` | `/users/me/notifications` | 내 알림 목록 |

### 설문 (Surveys)
| Method | Path | Description |
|---|---|---|
| `POST` | `/surveys` | 설문 생성 |
| `GET` | `/surveys` | 설문 목록 조회 (탭: ongoing \| closing \| popular) |
| `GET` | `/surveys/{id}` | 설문 상세 조회 (투표 여부 포함) |
| `PATCH` | `/surveys/{id}` | 설문 수정 (응답이 없을 때만 가능) |
| `POST` | `/surveys/{id}/vote` | 설문 투표 (재투표 가능) |
| `GET` | `/surveys/{id}/results` | 설문 결과 조회 (투표자만 가능) |

### 댓글 (Comments)
| Method | Path | Description |
|---|---|---|
| `POST` | `/surveys/{surveyId}/comments`| 댓글 작성 (최대 150자) |
| `GET` | `/surveys/{surveyId}/comments` | 설문 댓글 목록 조회 |
| `PATCH` | `/comments/{id}` | 댓글 수정 (작성자만) |
| `DELETE` | `/comments/{id}` | 댓글 삭제 (작성자만) |

### 신고 (Reports)
| Method | Path | Description |
|---|---|---|
| `POST` | `/reports` | 설문 또는 댓글 신고 (5회 누적 시 자동 숨김) |