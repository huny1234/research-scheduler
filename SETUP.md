# 연구 참여 예약 시스템 — 설치 및 배포 가이드

---

## 1단계. Node.js 설치

1. https://nodejs.org 에서 **LTS 버전** 다운로드
2. 설치 프로그램 실행 (기본 설정으로 Next 계속 클릭)
3. 설치 완료 후 명령 프롬프트(cmd)에서 확인:
   ```
   node --version
   ```
   버전 번호가 출력되면 성공

---

## 2단계. Supabase 프로젝트 생성

1. https://supabase.com 접속 → **Start your project** → GitHub 계정으로 회원가입
2. **New project** 클릭
   - Name: `research-scheduler` (아무거나)
   - Database Password: 안전한 비밀번호 입력 (저장해두기)
   - Region: **Northeast Asia (Seoul)** 선택
3. 프로젝트 생성 완료까지 약 1-2분 대기

### 데이터베이스 스키마 실행

1. 왼쪽 메뉴에서 **SQL Editor** 클릭
2. **New query** 클릭
3. `supabase-schema.sql` 파일 내용을 전체 복사 후 붙여넣기
4. **Run** 버튼 클릭 → "Success" 메시지 확인

### API 키 복사

1. 왼쪽 메뉴 **Project Settings** → **API** 클릭
2. 아래 두 가지를 메모장에 복사:
   - **Project URL** (예: `https://abcdefg.supabase.co`)
   - **service_role** 키 (주의: anon 키가 아닌 service_role 키)

---

## 3단계. 환경 변수 설정

1. `research-scheduler` 폴더 안에서 `.env.local.example` 파일을 복사해서 `.env.local` 파일 생성
2. `.env.local` 파일을 메모장으로 열고 아래 내용 수정:

```
NEXT_PUBLIC_SUPABASE_URL=여기에_Project_URL_붙여넣기
SUPABASE_SERVICE_ROLE_KEY=여기에_service_role_키_붙여넣기
ADMIN_PASSWORD=연구팀이_쓸_비밀번호
ADMIN_SECRET=랜덤한문자열아무거나32자이상입력하세요예시abc123xyz
```

> ADMIN_PASSWORD: 관리자 로그인 시 쓸 비밀번호 (마음대로 설정)
> ADMIN_SECRET: 세션 보안용 랜덤 문자열 (아무 문자나 32자 이상)

---

## 4단계. 로컬에서 테스트

1. `research-scheduler` 폴더에서 우클릭 → "터미널에서 열기" (또는 cmd에서 `cd` 명령으로 이동)
2. 의존성 설치:
   ```
   npm install
   ```
3. 개발 서버 실행:
   ```
   npm run dev
   ```
4. 브라우저에서 http://localhost:3000 접속
5. 정상 동작 확인 후 Ctrl+C 로 서버 중지

---

## 5단계. Vercel 배포 (공개 URL 생성)

### GitHub에 코드 올리기

1. https://github.com 에서 **New repository** 클릭
2. Repository name: `research-scheduler`
3. **Private** 선택 후 **Create repository**
4. 화면에 나오는 명령어 중 "push an existing repository" 부분 실행:
   ```
   git init
   git add .
   git commit -m "init"
   git branch -M main
   git remote add origin https://github.com/내계정/research-scheduler.git
   git push -u origin main
   ```

### Vercel 배포

1. https://vercel.com 접속 → GitHub 계정으로 로그인
2. **Add New Project** → 방금 만든 `research-scheduler` 저장소 선택
3. **Environment Variables** 섹션에서 `.env.local` 에 있는 4가지 변수 입력:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSWORD`
   - `ADMIN_SECRET`
4. **Deploy** 클릭
5. 배포 완료 후 `https://research-scheduler-xxx.vercel.app` 형태의 URL 생성됨

---

## 6단계. QR 코드 생성

1. https://qr.io 또는 https://www.qr-code-generator.com 접속
2. 배포된 Vercel URL 입력
3. QR 코드 이미지 다운로드 → 피험자 안내자료에 삽입

---

## 페이지 안내

| URL | 용도 |
|-----|------|
| `/` | 피험자 예약 (달력 + 예약 신청) |
| `/today` | 당일 일정 조회 + 측정값 입력 |
| `/admin` | 관리자 패널 (슬롯 생성, 예약 현황, CSV 다운로드) |

---

## 관리자 사용 방법

1. `/admin` 접속 → 설정한 ADMIN_PASSWORD 입력
2. **슬롯 관리** 탭:
   - 날짜 범위 + 시간 선택 후 "슬롯 생성" 클릭
   - 피험자들이 해당 날짜/시간에 예약 가능해짐
3. **당일 운영**: `/today` 페이지에서 각 예약자 클릭 → 키/체중/악력 입력 (BMI 자동 계산)
4. **데이터 수집 후**: 관리자 패널 → 데이터 내보내기 → CSV 다운로드

---

## 문제 해결

- **"supabase is not defined" 오류**: `.env.local` 파일의 Supabase URL과 키 확인
- **로그인이 안 됨**: `.env.local` 의 ADMIN_PASSWORD 값 확인
- **예약이 안 됨**: Supabase SQL Editor에서 스키마가 정상 실행됐는지 확인
- **배포 후 오류**: Vercel 대시보드 → 프로젝트 → Functions 탭에서 오류 로그 확인
