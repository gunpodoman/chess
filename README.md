# Peer Chess

브라우저에서 바로 실행되는 실시간 체스 애플리케이션입니다. 오프라인 대국과 Firebase Realtime Database 기반 온라인 방, 최초 상대 배정, 관전자, 채팅, 재접속, FEN/SAN/PGN을 지원합니다.

## 실행

ES module과 SVG 자산을 사용하므로 파일을 직접 열지 말고 프로젝트 루트에서 HTTP 서버를 실행합니다.

~~~text
npx나 패키지 설치 없이 사용할 수 있는 임의의 정적 HTTP 서버
~~~

GitHub Pages에서는 저장소 하위 경로에서도 동작하도록 모든 로컬 자산을 상대 URL 또는 import.meta.url로 해석합니다.

## 테스트

Node.js 기본 테스트 러너만 사용합니다.

~~~powershell
node --test tests/*.test.mjs
~~~

모든 JavaScript 파일의 문법 확인:

~~~powershell
Get-ChildItem src -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
~~~

## 구조

- index.html: 기존 DOM ID를 유지하는 대국 화면 마크업
- assets/css: 화면 스타일
- assets/pieces: 백·흑 기물 SVG 12개
- src/app.js: 앱 시작점과 뷰 등록
- src/core: 애플리케이션 상태
- src/chess: 체스 규칙, FEN, SAN, PGN, 직렬화
- src/services: 화면이 사용하는 서비스 인터페이스
- src/firebase: Firebase SDK와 데이터 접근 구현
- src/ui: 재사용 가능한 UI 요소
- src/views: 페이지 단위 컨트롤러
- tests: Node.js 회귀 및 정적 자산 테스트
- docs: 아키텍처, Firebase 계약, 확장 로드맵

세부 설계는 docs/architecture.md, Firebase 경로와 형식은 docs/firebase.md, 향후 기능 연결 지점은 docs/roadmap.md를 참고합니다.

## Firebase

설정은 src/config/firebase-config.js에 있고 기존 프로젝트와 데이터베이스를 그대로 사용합니다. 저장소에는 Realtime Database 보안 규칙 파일이 없으므로 실제 배포 규칙은 Firebase 콘솔에서 별도로 검증해야 합니다. 온라인 동작의 최종 확인에는 서로 다른 두 기기가 필요합니다.
