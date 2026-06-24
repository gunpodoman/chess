# Architecture

## 원칙

애플리케이션은 빌드 단계가 없는 브라우저 ES module 구조다. 체스 규칙은 DOM과 Firebase를 참조하지 않고, 화면은 Firebase SDK를 직접 호출하지 않는다. 현재 기능에 필요한 경계만 두고 미래 기능의 빈 구현이나 가짜 데이터는 만들지 않는다.

## 계층

### 시작점과 뷰

src/app.js는 화면 이름과 mount 함수를 연결한다. 현재는 game 뷰 하나만 등록하며, 향후 홈·프로필·랭킹·기록·설정 뷰를 같은 레지스트리에 추가할 수 있다.

src/views/game-view.js는 사용자 입력, appState 갱신, 체스 도메인 호출, 서비스 호출, UI 렌더링을 조정한다. 규칙 계산이나 Firebase 경로 조합은 담당하지 않는다.

### 애플리케이션 상태

src/core/app-state.js가 현재 대국, 선택 칸, 방향, 역할, 연결, 방, 동기화 revision, presence 세션을 한 객체로 생성한다. UI 모듈은 전달받은 상태를 읽어 렌더링하고, Firebase 모듈은 상태 객체를 직접 수정하지 않는다.

### 체스 도메인

src/chess/engine.js는 FEN, 공격 판정, 합법 수, 캐슬링, 앙파상, 승격, 체크, 종료 판정, SAN과 합법 수 적용을 제공한다. src/chess/serialization.js는 현재 Firebase 저장 형식을 변환하고, src/chess/notation.js는 PGN을 만든다.

### 서비스와 Firebase

src/services는 game view가 의존하는 인증·방·게임 동기화·presence·채팅 인터페이스다. src/firebase는 Firebase 12.15.0 SDK와 Realtime Database 경로를 아는 구현이다. Firebase 교체 시 서비스 계약을 유지하면 view와 체스 엔진을 바꿀 필요가 없다.

src/services/feature-services.js는 사용자, 레이팅, 기록, 매칭, 시간, 친구, 랭킹, 통계, 설정 서비스가 연결될 위치만 정의한다. 현재 기능은 구현하지 않는다.

### UI

src/ui의 각 모듈은 보드, 플레이어 카드, 기보, 채팅, 연결 탭, 승격창, 알림, 결과 배너를 담당한다. 보드는 64개 칸을 mount 시 한 번 생성하고 이후 class, text, img src와 표시 여부만 갱신한다. 모든 기물 표시는 src/ui/pieces.js를 통해 동일한 SVG URL을 사용해 브라우저 캐시를 공유한다.

## 의존 방향

~~~text
app -> view -> core/chess/services/ui
services -> firebase
firebase -> config + Firebase SDK
ui -> chess helpers + piece assets
chess -> no browser or Firebase dependency
~~~

## 확장 규칙

- 새 페이지는 src/views에 추가하고 src/app.js의 view map에 등록한다.
- 새 제품 기능은 먼저 service 계약을 정하고 Firebase 구현은 src/firebase에 둔다.
- 체스 규칙 변경은 DOM 또는 네트워크 코드를 engine.js에 넣지 않는다.
- 현재 rooms 데이터 경로, 직렬화 필드, DOM ID, localStorage 키는 호환성 계약으로 취급한다.
