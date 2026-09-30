# Antioch Accounting

**교회 대학·청년부 회비 관리 웹 서비스**

엑셀과 카톡으로 관리하던 회비 장부를 웹으로 옮겼습니다.
회원은 납부 현황과 결산을 보고, 회계팀은 장부 기록부터 미납 안내·월례회 보고까지 한 곳에서 처리합니다.

**[antioch-accounting.vercel.app](https://antioch-accounting.vercel.app)**

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-22B5BF?style=flat-square)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)

<br>

## 실제로 이렇게 쓰이고 있어요

- **2026년부터 교회 대학·청년부 회계팀이 사용 중**입니다. (회원 약 70명)
- 미납 회원에게 이 서비스에서 만든 **카톡 안내를 실제로 발송**했습니다.
- 월별 결산표를 **월례회 회계 보고 자료**로 쓰고 있습니다.

<br>

## 주요 기능

### 회원이 보는 화면 · 로그인 없이 누구나

| 기능 | 설명 |
|---|---|
| **회비 대시보드** | 이번 달 납부율, 납부액, 누적 납부액과 월별 추이 차트. 전체 / 대학부 / 청년부별로 확인 |
| **수입 · 지출 결산** | 월별 결산표 (전월 잔액 → 항목별 수입 → 항목별 지출 → 월말 잔액)와 12개월 요약 |

> 이름, 연락처 같은 개인정보는 보이지 않고 **집계된 숫자만** 공개됩니다.

### 회계팀이 쓰는 화면 · 관리자 로그인 필요

| 기능 | 설명 |
|---|---|
| **회계 장부** | 회원 × 12개월 표에서 칸을 눌러 납부 체크. 1년치 선납은 **일괄 납부** 한 번으로 처리 |
| **미납 안내** | 사람별로 몇 월이 미납이고 얼마인지 자동 계산 → **카톡 메시지 복사 / 공유** |
| **안내 문구 편집** | `{이름}`, `{미납월}`, `{합계}` 같은 항목을 넣어 문구를 직접 수정하면 사람마다 자동으로 채워짐 |
| **수입 · 지출 입력** | 헌금, 간식비 등 항목별 입력. 회비는 장부에서 자동 집계되고, 전년도 이월금부터 잔액이 이어짐 |
| **결산 복사** | 월별 결산을 카톡에 붙여넣기 좋은 형태로 복사 |
| **회원 관리** | 등록·수정·삭제, 부서 / 소속 / 상태(활동·장결·군복무·졸업) 관리와 검색 |

<br>

## 문제 해결 경험

**1. 누구나 회원 전화번호를 볼 수 있던 문제**
초기 API에 인증이 없어서, 주소만 알면 전체 회원의 이름과 연락처를 조회하고 수정·삭제까지 할 수 있었습니다.
→ 관리자 API에 로그인 검사를 걸고, 공개 화면은 서버에서 숫자로 합산한 결과만 보내도록 바꿨습니다.

**2. 통계 숫자가 맞지 않던 문제**
부서 페이지에 전체 합계가 나오거나, 부서 납부율을 전체 인원으로 나누거나, 조회 월이 두 달 어긋나는 등 버그가 여러 곳에 흩어져 있었습니다.
→ 페이지마다 따로 하던 계산을 함수 하나로 합쳐 한 번에 해결했습니다. 서버(UTC)와 한국 시간이 달라 월초에 달이 바뀌어 보이던 문제도 함께 고쳤습니다.

**3. 요구사항이 바뀌며 DB 구조를 변경한 경험**
지출만 기록하려다 "항목별 수입도 필요하다"는 요청을 받았습니다.
→ 데이터를 잃지 않도록 테이블을 새로 만들지 않고, 기존 테이블에 수입/지출 구분 컬럼을 추가하는 방식으로 바꿨습니다.

**4. 배포 사이트에서만 로그인이 안 되던 문제**
로컬에서는 되던 관리자 로그인이 배포 후 실패했습니다.
→ Vercel 환경변수는 등록 후 재배포해야 적용된다는 점을 확인했고, 설정 오류는 사용자 화면이 아닌 서버 로그에만 남기도록 했습니다.

<br>

## 기술 스택

| 영역 | 기술 |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Recharts |
| Backend | Next.js Route Handlers, Server Components |
| Database | Supabase (PostgreSQL) |
| 인증 | 비밀번호 + 서명된 httpOnly 쿠키 (직접 구현) |
| 배포 | Vercel (`main` 푸시 시 자동 배포) |
| 개발 도구 | Claude Code (AI 페어 프로그래밍) |

<br>

## 앞으로 할 일

- 회원 본인이 자기 납부 내역을 조회하는 기능
- DB 보안 강화 (Supabase RLS, 서버 전용 키)
- 로그인 시도 횟수 제한

<br>

<details>
<summary><b>로컬에서 실행하기</b></summary>

```bash
npm install
npm run dev
```

`.env.local`

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
ADMIN_PASSWORD=...
```

| DB 테이블 | 용도 |
|---|---|
| `members` | 회원 정보, 월별 납부 여부 |
| `transactions` | 회비 외 수입 · 지출 |
| `settings` | 안내 문구, 전년도 이월금 |

</details>
