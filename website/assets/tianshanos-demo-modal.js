(function () {
  const modal = document.querySelector('[data-demo-modal]');
  const openButton = document.querySelector('[data-demo-open]');
  const closeButton = document.querySelector('[data-demo-close]');
  const frame = document.getElementById('ts-demo');
  const page = document.querySelector('main');
  const header = document.querySelector('.site-shell');

  function setOpen(open) {
    if (modal.classList.contains('is-open') === open) return;
    modal.inert = !open;
    modal.classList.toggle('is-open', open);
    modal.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('demo-modal-open', open);
    page.inert = open;
    header.inert = open;
    if (open) {
      frame.style.height = '0px';
      frame.src = frame.dataset.src;
      closeButton.focus({ preventScroll: true });
    } else {
      openButton.focus({ preventScroll: true });
    }
  }

  modal.inert = true;
  openButton.addEventListener('click', () => setOpen(true));
  closeButton.addEventListener('click', () => setOpen(false));
  modal.addEventListener('click', event => {
    if (event.target === modal) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (!modal.classList.contains('is-open')) return;
    if (event.key === 'Escape') setOpen(false);
  });
  frame.addEventListener('load', () => {
    frame.contentWindow.document.addEventListener('keydown', event => {
      if (event.key === 'Escape') setOpen(false);
    });
  });
  addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
    if (event.data?.type !== 'tianshanos-demo-height') return;
    const height = event.data.height;
    if (Number.isFinite(height) && height > 0) frame.style.height = `${height}px`;
  });
})();
