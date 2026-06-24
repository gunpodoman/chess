export function createDisposables() {
  const callbacks = [];

  return {
    add(callback) {
      callbacks.push(callback);
      return callback;
    },
    listen(target, type, listener, options) {
      target.addEventListener(type, listener, options);
      callbacks.push(() => target.removeEventListener(type, listener, options));
      return listener;
    },
    dispose() {
      while (callbacks.length > 0) {
        const callback = callbacks.pop();
        try { callback(); } catch (error) { console.debug(error); }
      }
    }
  };
}
