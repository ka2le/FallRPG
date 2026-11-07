const active = () => Boolean(document.fullscreenElement || document.webkitFullscreenElement);
const supported = () => Boolean(
  (document.fullscreenEnabled && document.documentElement.requestFullscreen) ||
  (document.webkitFullscreenEnabled && document.documentElement.webkitRequestFullscreen)
);

export function fullscreenButton() {
  return `<button type="button" data-fullscreen aria-label="${active() ? 'Exit' : 'Enter'} fullscreen" aria-pressed="${active()}" ${supported() ? '' : 'disabled title="Fullscreen is unavailable in this browser"'}>⛶ ${active() ? 'Exit fullscreen' : 'Fullscreen'}</button>`;
}

export function initFullscreen() {
  function update() {
    for (const button of document.querySelectorAll('[data-fullscreen]')) {
      button.textContent = active() ? '⛶ Exit fullscreen' : '⛶ Fullscreen';
      button.setAttribute('aria-label', `${active() ? 'Exit' : 'Enter'} fullscreen`);
      button.setAttribute('aria-pressed', String(active()));
      button.disabled = !supported();
      button.title = supported() ? button.getAttribute('aria-label') : 'Fullscreen is unavailable in this browser';
    }
  }
  document.addEventListener('fullscreenchange', update);
  document.addEventListener('webkitfullscreenchange', update);
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-fullscreen]');
    if (!button || button.disabled) return;
    button.disabled = true;
    document.getElementById('fullscreen-error')?.remove();
    try {
      if (active()) {
        await (document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen());
      } else {
        const root = document.documentElement;
        await (root.requestFullscreen ? root.requestFullscreen() : root.webkitRequestFullscreen());
      }
    } catch {
      const message = document.createElement('small');
      message.id = 'fullscreen-error';
      message.setAttribute('role', 'status');
      message.textContent = 'Fullscreen could not be changed. Please try again.';
      button.after(message);
    } finally {
      update();
    }
  });
  update();
}
