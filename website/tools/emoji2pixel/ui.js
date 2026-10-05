/* Presentation helpers for the v2 interface (D8). They read the page and paint it; the tool's own logic stays in app.js. */
(function () {
  'use strict';

  // Slider fill: --p is the share of the track left of the thumb (styles.css draws it in sapphire). The value property is wrapped, so changes
  // made by code (wheel zoom, dragging the canvas, undo, switching frames) repaint the fill as well as the visitor's own input.
  var native = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  function paint(range) {
    var min = parseFloat(range.min) || 0;
    var max = parseFloat(range.max);
    if (!isFinite(max) || max === min) max = min + 100;
    var share = (parseFloat(native.get.call(range)) - min) / (max - min) * 100;
    range.style.setProperty('--p', Math.max(0, Math.min(100, share)) + '%');
  }
  function watch(range) {
    Object.defineProperty(range, 'value', {
      configurable: true,
      get: function () { return native.get.call(this); },
      set: function (value) { native.set.call(this, value); paint(this); }
    });
    range.addEventListener('input', function () { paint(range); });
    paint(range);
  }
  function start() {
    Array.prototype.forEach.call(document.querySelectorAll('input[type=range]'), watch);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
