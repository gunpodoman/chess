import {
  sendRoomChatMessage,
  subscribeRoomChat
} from "../firebase/chat-repository.js";

export const chatService = Object.freeze({
  send: sendRoomChatMessage,
  subscribe: subscribeRoomChat
});
