# GVA Data Architect

Gun Violence Archive (GVA) 데이터 분석 및 시각화 앱입니다.

## 주요 기능

- **Research**: 데이터 수집 파이프라인 워크플로우 확인
- **Data Stats**: 10년간 총기 폭력 통계 데이터 테이블
- **Incident Explorer**: 최근 사건 데이터 탐색 및 필터링
- **Intelligence**: 지역 안전 자원 검색 (Maps Grounding)
- **Data Report**: AI 기반 트렌드 분석 리포트 생성
- **AI Expert**: Gemini Pro 기반 연구 상담 챗봇
- **Scraper**: 데이터 수집 Python 스크립트 확인

## 로컬 실행 방법

### 사전 요구사항
- Node.js (v18 이상 권장)
- npm 또는 yarn

### 설치 및 실행

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정
# .env.local 파일에서 GEMINI_API_KEY를 실제 API 키로 변경
# https://aistudio.google.com/app/apikey 에서 API 키 발급

# 3. 개발 서버 실행
npm run dev
```

앱이 http://localhost:3000 에서 실행됩니다.

### 빌드

```bash
# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview
```

## 환경 변수

| 변수명 | 설명 |
|--------|------|
| `GEMINI_API_KEY` | Google Gemini API 키 (AI 기능에 필요) |

## 기술 스택

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **AI**: Google Gemini API (@google/genai)
- **Icons**: Heroicons

## 데이터 출처

- [Gun Violence Archive](https://www.gunviolencearchive.org/)
- 10년간 집계 데이터 (2015-2024)
