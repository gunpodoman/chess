export function createToastView(element) {
  let timer = null;
  return {
    show(text) {
      element.textContent = text;
      element.classList.add("show");
      clearTimeout(timer);
      timer = setTimeout(() => element.classList.remove("show"), 2200);
    },
    destroy() {
      clearTimeout(timer);
      element.classList.remove("show");
    }
  };
}