# Firebase Contract

## SDK와 인증

Firebase Web SDK 12.15.0을 CDN ES module로 사용한다. 인증은 browserLocalPersistence를 설정한 익명 인증이며, 기존 currentUser가 있으면 재사용한다.

설정 파일은 src/config/firebase-config.js다. 프로젝트 ID, databaseURL, 앱 식별자는 리팩터링 전 값과 동일하다.

## Realtime Database 경로

~~~text
rooms/{roomId}/meta
rooms/{roomId}/state
rooms/{roomId}/opponentSeat
rooms/{roomId}/presence/{uid}/{connectionId}
rooms/{roomId}/chat/{messageId}
.info/connected
~~~

meta 필드:

- hostUid
- opponentUid: 최초 상대 배정 후 추가
- hostColor
- guestColor
- createdAt
- closed

state 필드:

- fen
- moveHistory
- positionCountsJson
- result
- lastMove
- resignedBy
- revision
- action
- updatedBy
- updatedAt

opponentSeat 필드:

- uid
- token

chat 메시지 필드:

- uid
- text
- createdAt

## 동기화

방 생성은 전체 meta와 state를 한 번에 기록한다. 대국 갱신은 기존 revision이 예상 값과 같을 때만 transaction으로 반영한다. 충돌 또는 저장 실패 시 최신 state를 다시 읽는다. 초대 링크 형식은 #room=<roomId>이며 room ID 형식은 fc- 접두사 뒤에 URL-safe 토큰을 사용한다.

presence는 .info/connected를 구독하고 onDisconnect remove를 등록한다. 방 전환 시 모든 구독 해제 함수와 presence 세션을 명시적으로 정리한다.

## 로컬 저장 키

- firebaseChessHostRoomV1
- firebaseChessOpponentSeatV1:{roomId}

두 키의 이름과 용도는 기존 구현과 동일하다.

## 보안과 검증 한계

저장소에는 database.rules.json이 없다. 따라서 익명 사용자 권한, 최초 상대 배정 경쟁 조건, 관전자 쓰기 제한, state 필드 검증은 코드만으로 보장할 수 없다. 배포 전 Firebase 콘솔 규칙을 이 문서의 경로와 대조해야 한다.

상대 배정은 기존과 동일하게 opponentSeat와 meta/opponentUid를 순서대로 기록한다. 원자적 transaction이 아니므로 동시 최초 접속의 최종 안전성은 서버 규칙과 실제 두 기기 테스트가 필요하다.
