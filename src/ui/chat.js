export function createChatView(element) {
  element.replaceChildren();
  function append(text, className) {
    const message = document.createElement("div");
    message.className = className;
    message.textContent = text;
    element.appendChild(message);
    element.scrollTop = element.scrollHeight;
  }

  return {
    addMessage(text, mine) {
      append(text, "chat-msg" + (mine ? " mine" : ""));
    },
    addSystemMessage(text) {
      append(text, "chat-msg system");
    }
  };
}
