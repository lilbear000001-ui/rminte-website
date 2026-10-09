/* Bevel edge light (design system v2, stage 2): the 1px highlight on the top edge of [data-bevel] elements follows the pointer.
   styles.css draws the line and reads --bx (the position along the edge, in %); this script only moves it. */
(function () {
  'use strict';
  // Touch and reduced motion: the line stays at the middle.
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var states = new WeakMap(), current = null;

  function follow(element) {
    var state = states.get(element);
    state.now += (state.goal - state.now) * 0.14;
    element.style.setProperty('--bx', state.now.toFixed(2) + '%');
    state.frame = Math.abs(state.goal - state.now) > 0.05 ? requestAnimationFrame(function () { follow(element); }) : 0;
  }

  function aim(element, goal) {
    var state = states.get(element);
    if (!state) states.set(element, state = { now: 50, goal: 50, frame: 0 });
    state.goal = goal;
    if (!state.frame) state.frame = requestAnimationFrame(function () { follow(element); });
  }

  document.addEventListener('pointermove', function (event) {
    if (event.pointerType === 'touch') return;
    var element = event.target.closest && event.target.closest('[data-bevel]');
    if (element !== current) { if (current) aim(current, 50); current = element; }
    if (!element) return;
    var box = element.getBoundingClientRect();
    aim(element, Math.max(0, Math.min(100, (event.clientX - box.left) / box.width * 100)));
  }, { passive: true });

  document.documentElement.addEventListener('pointerleave', function () {
    if (current) { aim(current, 50); current = null; }
  });
}());
