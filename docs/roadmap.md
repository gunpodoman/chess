# Roadmap

이 문서는 구현 목록이 아니라 현재 구조에 기능을 연결할 위치를 정의한다. 빈 화면, 가짜 사용자, 가짜 레이팅 데이터는 추가하지 않는다.

## 홈 화면

src/views/home-view.js를 추가하고 src/app.js view map에 등록한다. 최근 대국과 추천 모드는 history, matchmaking 서비스가 준비된 뒤 연결한다.

## 회원 및 프로필

account service 계약을 src/services에 추가하고 Firebase Auth 계정 전환과 프로필 저장 구현을 src/firebase에 둔다. game view는 표시용 사용자 모델만 받는다.

## 레이팅

rating service가 대국 결과를 입력받아 레이팅 변경과 현재 값을 제공한다. 체스 엔진의 result는 규칙 결과만 유지하며 레이팅을 계산하지 않는다.

## 매칭

matchmaking service와 play view를 추가한다. 현재 room service는 초대 방의 생성·참가에 계속 사용하고 자동 매칭 큐는 별도 Firebase 경로로 분리한다.

## 대국 기록

history service가 종료된 대국의 FEN, moveHistory, PGN, 참가자, 결과를 저장한다. 현재 serialization과 notation 모듈을 재사용한다.

## 통계

statistics service가 history service의 확정된 기록을 집계한다. 게임 화면의 임시 상태나 Firebase room state를 통계 원본으로 사용하지 않는다.

## 랭킹

ranking service가 레이팅 조회와 페이지 단위 순위를 제공하고 별도 ranking view가 표시한다. 보드 UI와 직접 결합하지 않는다.

## 친구

friends service가 관계와 초대 상태를 관리한다. 대국 초대는 현재 room service가 생성한 #room 링크를 전달하는 방식으로 연결한다.

## 시간제한 대국

clock 도메인과 clock service를 추가하고 game state 직렬화 버전을 명시한다. 서버 기준 시간, 재접속, 지연 보정 규칙을 먼저 정의한 뒤 현재 state 형식을 호환 가능하게 확장한다.

## 테마와 설정

settings service가 로컬 설정과 계정 설정의 우선순위를 관리한다. CSS 변수와 piece loader를 교체 지점으로 사용하고 SVG 파일 경로는 테마별 manifest로 확장한다.

## 관리자 및 운영

별도 admin view와 권한 확인 service를 사용한다. 클라이언트 UI 숨김이 권한 검증을 대신하지 않으며 Firebase Security Rules 또는 서버 측 권한 검사를 필수로 한다.
