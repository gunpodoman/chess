export function createConnectionView(root = document) {
  return {
    setActiveTab(name) {
      root.querySelectorAll(".tab").forEach(item => {
        item.classList.toggle("active", item.dataset.tab === name);
      });
      root.querySelectorAll(".tab-page").forEach(item => {
        item.classList.toggle("active", item.id === "tab-" + name);
      });
    }
  };
}
