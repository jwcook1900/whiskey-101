// Mark that JS is available so CSS can collapse panels (no-js shows everything).
document.documentElement.classList.remove('no-js');

(function () {
  'use strict';

  var accordions = Array.prototype.slice.call(document.querySelectorAll('.accordion'));

  function open(acc) {
    acc.classList.add('is-open');
    acc.querySelector('.accordion__btn').setAttribute('aria-expanded', 'true');
  }

  function close(acc) {
    acc.classList.remove('is-open');
    acc.querySelector('.accordion__btn').setAttribute('aria-expanded', 'false');
  }

  accordions.forEach(function (acc) {
    var btn = acc.querySelector('.accordion__btn');
    btn.addEventListener('click', function () {
      if (acc.classList.contains('is-open')) {
        close(acc);
      } else {
        open(acc);
      }
    });
  });

  // Open the matching section when arriving via a quick-nav link or a hash.
  function openFromHash() {
    if (!location.hash) return;
    var target = document.getElementById(location.hash.slice(1));
    if (target && target.classList.contains('accordion')) {
      open(target);
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function () {
      var id = link.getAttribute('href').slice(1);
      var target = document.getElementById(id);
      if (target && target.classList.contains('accordion')) {
        open(target);
      }
    });
  });

  window.addEventListener('hashchange', openFromHash);
  openFromHash();

  // Open the first section by default so the page isn't fully collapsed on load.
  if (!location.hash && accordions.length) {
    open(accordions[0]);
  }

  // Swap video placeholders for real players once a video file actually loads.
  document.querySelectorAll('.video-frame').forEach(function (frame) {
    var video = frame.querySelector('video');
    if (!video) return;
    video.addEventListener('loadedmetadata', function () {
      frame.classList.add('is-loaded');
    });
    // Re-check in case metadata was already available (cached files).
    if (video.readyState >= 1) {
      frame.classList.add('is-loaded');
    }
  });
})();
