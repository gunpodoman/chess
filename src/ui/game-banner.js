export function createGameBannerView(element, titleElement, textElement) {
  return {
    render(result) {
      if (!result) {
        element.classList.remove("show");
        return;
      }
      titleElement.textContent = result.title;
      textElement.textContent = result.text;
      element.classList.add("show");
    }
  };
}
