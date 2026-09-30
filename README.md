# Antioch Accounting

교회 대학부·청년부의 **회비 납부 현황과 수입·지출을 관리하는 웹 서비스**입니다.
엑셀과 카톡으로 흩어져 있던 회비 장부를 웹으로 옮겨, 회원은 공개 대시보드에서 납부율과 결산을 확인하고 회계 담당자는 관리자 페이지에서 장부·회원·수입/지출을 관리합니다.

- 배포: Vercel (`main` 브랜치 푸시 시 자동 배포)
- 배포 URL: _(작성 예정)_

<br>

## 1. 프로젝트 개요

| 구분 | 내용 |
|---|---|
| 사용자 | 회원(공개 대시보드 열람), 회계 담당자(관리자 페이지) |
| 회계 기준 | 11월 시작 회계연도, 월 회비 대학부 5,000원 / 청년부 10,000원 |
| 핵심 기능 | 월별 납부 체크, 납부율·납부액 통계, 개인별 미납 안내, 수입·지출 결산 |

### 기술 스택

| 영역 | 사용 기술 |
|---|---|
| Framework | Next.js 16 (App Router, Route Handlers, Server Components) |
| Language | TypeScript, React 19 |
| Styling | Tailwind CSS v4, Pretendard |
| Chart | Recharts |
| Database | Supabase (PostgreSQL) |
| Auth | 비밀번호 + HMAC 서명 httpOnly 쿠키 (자체 구현) |
| Deploy | Vercel |

### 페이지 구성

```
공개 (로그인 불필요)          관리자 (/admin, 로그인 필요)
├─ /          전체 대시보드    ├─ /admin           미납 현황 · 카톡 안내
├─ /univ      대학부 현황      ├─ /admin/ledger    회계 장부 (월별 납부 체크)
├─ /youth     청년부 현황      ├─ /admin/finance   수입 · 지출 입력, 이월금
└─ /finance   수입 · 지출 결산 └─ /admin/members   회원 관리
```

<br>

## 2. 구현한 기능

### 1차: 직접 구현 — 커밋 [`5a47d7b`](https://github.com/dooollee/antioch-accounting/commit/5a47d7b)

Create Next App 초기 템플릿 위에 서비스의 뼈대를 직접 만들었습니다.

| 기능 | 관련 파일 |
|---|---|
| 회계연도(11월 시작) 기준 월 인덱스 계산, 월별 납부율·납부액 집계 | `lib/utils/dataHelpers.ts` |
| 대시보드 요약 카드, 월별 납부율/납부액 차트, 조회 월 필터 | `app/page.tsx`, `components/SummaryCard.tsx`, `PaymentChart.tsx`, `RevenueChart.tsx`, `Header.tsx` |
| 대학부·청년부 부서별 현황 페이지 | `app/univ/page.tsx`, `app/youth/page.tsx` |
| 회계 장부: 회원 × 12개월 체크 표, 낙관적 업데이트 후 DB 반영 | `app/ledger/page.tsx` |
| 회원 관리: 등록·수정·삭제, 검색, 부서 필터, 상태(활동/장결/군복무/졸업) | `app/members/page.tsx` |
| 임시 데이터(`lib/data.ts`)를 Supabase DB로 이전, CRUD API | `app/api/hello/route.ts` |

### 2차: Claude Code와 함께 개선 — 커밋 [`520b000`](https://github.com/dooollee/antioch-accounting/commit/520b000), [`57472ef`](https://github.com/dooollee/antioch-accounting/commit/57472ef)

실제로 회원들에게 공개하기 위해 필요한 기능과 보안을 AI 코딩 도구(Claude Code)와 함께 작업했습니다. 요구사항 정의, DB 스키마 적용(Supabase SQL), 배포 설정, 동작 확인은 직접 진행했습니다.

| 기능 | 관련 파일 |
|---|---|
| **관리자/공개 영역 분리**: `(public)`, `/admin` 라우트 그룹, 비밀번호 로그인 | `app/admin/layout.tsx`, `app/login/page.tsx`, `lib/auth.ts`, `app/api/auth/route.ts` |
| **개인정보 보호**: 공개 페이지는 서버에서 집계한 숫자만 전달, 회원 API는 관리자 인증 필수 | `lib/publicStats.ts`, `app/api/members/route.ts` |
| **개인별 미납 현황**: 기준 월까지 미납 월·금액 계산, 카톡 안내 메시지 복사/공유 | `app/admin/page.tsx`, `lib/utils/dataHelpers.ts` (`getArrears`) |
| **안내 문구 편집**: `{이름}`, `{미납월}`, `{합계}` 등 치환 템플릿, DB 저장 | `app/admin/page.tsx`, `app/api/settings/route.ts` |
| **일괄 납부**: 1년치 선납 회원 한 번에 처리 | `app/admin/ledger/page.tsx` |
| **소속 필드 및 필터**: 자유 입력 + 기존 값 자동완성 | `app/admin/members/page.tsx`, `components/Header.tsx` (`AffiliationSelect`) |
| **수입·지출 결산**: 항목별 수입/지출 입력, 전년도 이월금, 전월 잔액 → 월말 잔액 이월, 결산 복사 | `app/admin/finance/page.tsx`, `components/FinanceView.tsx`, `MonthReportCard.tsx`, `app/api/transactions/route.ts` |
| **디자인 정리**: 이모지 제거, 모바일 상단 내비게이션, 표 머리행 고정, 검색어 지우기 | `components/Sidebar.tsx`, `components/Shell.tsx` |

<br>

## 3. 시행착오 · 버그 수정 · 리팩터링

### 보안: 인증 없는 API가 전체 회원 정보를 노출
1차 버전의 `/api/hello`는 로그인 없이 누구나 **모든 회원의 이름·전화번호를 조회**하고 수정·삭제까지 할 수 있었습니다. 관리자 페이지를 메뉴에서 숨기는 것만으로는 해결되지 않는 문제라, API를 `/api/members`로 옮기면서 모든 메서드에 관리자 인증을 걸었습니다. 공개 대시보드는 서버 컴포넌트에서 `dept, monthlyStatus` 컬럼만 조회해 집계 숫자만 브라우저로 보내도록 바꿨습니다. (`520b000`)

### 집계 로직 버그
- **부서 페이지의 납부액 차트가 항상 전체 합계를 표시**: `getYearlyChartData`가 부서와 무관하게 `stats.total.revenue`를 반환하고 있었습니다.
- **부서별 납부율 분모 오류**: `calculateRate(paidUniv, safeMembers.length)`처럼 부서 인원이 아닌 전체 인원으로 나누고 있었습니다.
- **부서 페이지의 조회 월 오류**: 대시보드는 회계월 인덱스를 썼지만 부서 페이지는 `new Date().getMonth()`(1월 시작)를 그대로 써서 두 달 어긋났습니다.
- **시간대 문제**: 서버(Vercel, UTC)와 브라우저(KST)의 월이 월초 9시간 동안 달라질 수 있어, 한국 시간 기준으로 계산하도록 바꿨습니다.

→ 12개월 × 부서별 통계를 한 번에 만드는 `buildMonthlyStats`로 집계 로직을 하나로 합쳐 위 문제를 한꺼번에 해결했습니다.

### 리팩터링
- 거의 같은 코드였던 대시보드·대학부·청년부 페이지 3개를 `DashboardView` 하나로 통합했습니다.
- `PaymentChart`/`RevenueChart`(그라데이션 ID 중복, 고정 Y축 `[0, 100000]`, 색상값 `#` 누락)를 `TrendChart` 하나로 합쳤습니다.
- 회원 등록/수정 모달 2개를 폼 하나로 합치고, 저장 실패 시 화면을 이전 상태로 되돌리는 처리를 추가했습니다.

### 운영 중 겪은 문제
- **DB 스키마 변경 순서**: 지출 전용 `expenses` 테이블을 만든 뒤 "항목별 수입도 필요하다"는 요구가 생겨, 테이블 이름을 `transactions`로 바꾸고 `type`(income/expense) 컬럼을 추가했습니다. 초기 설정 SQL에 `DROP TABLE`이 있어서, 실데이터가 있는 상태에서 재실행하지 않도록 SQL 스니펫을 순번으로 정리했습니다.
- **배포 환경 로그인 실패**: 로컬에서는 되던 관리자 로그인이 배포 사이트에서 실패했습니다. Vercel 환경변수(`ADMIN_PASSWORD`)는 추가 후 재배포해야 적용된다는 점을 확인했고, 값 앞뒤 공백을 무시하도록 수정했습니다. 설정 누락 사실은 방문자 화면이 아닌 서버 로그에만 남기도록 했습니다. (`57472ef`)
- **dev 서버 캐시 손상**: 서버 실행 중 `.next` 폴더가 일부만 삭제되어 `build-manifest.json` ENOENT 에러가 발생했습니다. 서버를 종료한 뒤 캐시를 지우고 재실행해 해결했습니다.

<br>

## 4. 결과물

- Vercel에 배포되어 있으며, `main` 푸시 시 자동으로 재배포됩니다.
- **2026년부터 교회 대학·청년부 회계팀이 실제로 사용 중**입니다. 회원 70여 명의 회비 납부를 이 서비스로 관리합니다.
- 관리자 페이지의 개인별 미납 현황에서 만든 안내 메시지로 **실제 미납 회원에게 카톡 안내를 발송**했습니다.
- 공개 대시보드와 월별 결산표(전월 잔액 → 수입 → 지출 → 월말 잔액)를 **월례회 회계 보고 자료로 활용**하고 있습니다.

### 남은 과제
- Supabase RLS 활성화 및 서버 전용 키(service role key)로 전환
- 로그인 시도 횟수 제한
- 회원 본인이 자신의 납부 내역을 조회하는 기능

<br>

## 로컬 실행

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

### DB 테이블

| 테이블 | 용도 | 주요 컬럼 |
|---|---|---|
| `members` | 회원, 월별 납부 여부 | `name`, `dept`(univ/youth), `phone`, `affiliation`, `status`, `monthlyStatus`(boolean[12]) |
| `settings` | 안내 문구, 전년도 이월금 | `key`, `value` |
| `transactions` | 회비 외 수입·지출 | `fiscal_year`, `month_index`(0=11월), `type`, `category`, `description`, `amount` |
