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

// ---- Seizure log -------------------------------------------------------
(function () {
  'use strict';

  var KEY = 'whiskeySeizureLog';
  var logBtn = document.getElementById('log-seizure-btn');
  if (!logBtn) return;

  var dialog = document.getElementById('seizure-dialog');
  var dialogTime = document.getElementById('dialog-time');
  var listEl = document.getElementById('seizure-list');
  var countEl = document.getElementById('seizure-count');
  var actionsEl = document.getElementById('seizure-actions');
  var noteEl = document.querySelector('.seizure-log__note');
  var toastEl = document.getElementById('toast');
  var pendingDate = null;
  var toastTimer = null;

  var cfg = window.WHISKEY_CONFIG || {};
  var ENDPOINT = (cfg.seizureEndpoint || '').trim();
  var shared = false; // becomes true once the sheet has answered

  // Always display in Sydney wall-clock time, regardless of the device's
  // own timezone, so AEST/AEDT is shown correctly.
  function fmtSydney(date) {
    try {
      return new Intl.DateTimeFormat('en-AU', {
        timeZone: 'Australia/Sydney',
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short'
      }).format(date);
    } catch (e) {
      return date.toLocaleString();
    }
  }

  // ---- storage (local cache / offline safety net) ----
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch (e) { return []; }
  }
  function persist(arr) {
    try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch (e) {}
  }
  function byTs(arr) {
    var m = {};
    arr.forEach(function (e) { if (e && e.ts) m[e.ts] = true; });
    return m;
  }
  function mergeTs(a, b) {
    var seen = {}, out = [];
    a.concat(b).forEach(function (e) {
      if (e && e.ts && !seen[e.ts]) { seen[e.ts] = true; out.push({ ts: e.ts }); }
    });
    return out;
  }

  // ---- JSONP bridge to the Apps Script web app (avoids CORS) ----
  function callSheet(params, cb) {
    if (!ENDPOINT) { if (cb) cb(null); return; }
    var name = '__wcb' + Math.random().toString(36).slice(2);
    var script = document.createElement('script');
    var done = false;
    var query = Object.keys(params).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }).join('&');

    function cleanup() {
      clearTimeout(timer);
      try { delete window[name]; } catch (e) { window[name] = undefined; }
      if (script.parentNode) script.parentNode.removeChild(script);
    }
    window[name] = function (data) { done = true; cleanup(); if (cb) cb(data); };
    var timer = setTimeout(function () { if (!done) { cleanup(); if (cb) cb(null); } }, 12000);
    script.onerror = function () { if (!done) { cleanup(); if (cb) cb(null); } };
    script.src = ENDPOINT + (ENDPOINT.indexOf('?') > -1 ? '&' : '?') + query + '&callback=' + name;
    document.head.appendChild(script);
  }

  function remoteToEntries(data) {
    if (!data || !data.ok || !data.entries) return null;
    return data.entries
      .map(function (e) { return e && e.iso ? { ts: e.iso } : null; })
      .filter(function (e) { return e; });
  }

  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.hidden = false;
    void toastEl.offsetWidth; // force reflow so the transition runs
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('is-visible');
      setTimeout(function () { toastEl.hidden = true; }, 300);
    }, 2600);
  }

  function setNote() {
    if (!noteEl) return;
    if (ENDPOINT && shared) {
      noteEl.innerHTML = 'Synced to the shared log — everyone who opens this page sees the same list. Use <strong>Export / Share</strong> to send the history to the vet.';
    } else if (ENDPOINT) {
      noteEl.innerHTML = 'Shared logging is on, but the log couldn’t be reached right now — saved on this device and will sync when you’re back online.';
    } else {
      noteEl.innerHTML = 'Saved on this device, in Sydney time. Use <strong>Export / Share</strong> to send the history to the vet.';
    }
  }

  function render() {
    var entries = load().sort(function (a, b) {
      return new Date(b.ts) - new Date(a.ts);
    });
    listEl.innerHTML = '';

    if (!entries.length) {
      countEl.textContent = 'No seizures logged yet.';
      actionsEl.hidden = true;
      setNote();
      return;
    }

    countEl.textContent = entries.length === 1
      ? '1 seizure logged.'
      : entries.length + ' seizures logged.';
    actionsEl.hidden = false;
    setNote();

    entries.forEach(function (entry) {
      var li = document.createElement('li');
      var when = document.createElement('span');
      when.className = 'seizure-log__when';
      when.textContent = fmtSydney(new Date(entry.ts));
      var rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'seizure-log__remove';
      rm.setAttribute('aria-label', 'Remove this entry');
      rm.textContent = '×';
      rm.addEventListener('click', function () { removeEntry(entry.ts, when.textContent); });
      li.appendChild(when);
      li.appendChild(rm);
      listEl.appendChild(li);
    });
  }

  function saveEntry(date) {
    var ts = date.toISOString();
    var local = load();
    if (!byTs(local)[ts]) { local.push({ ts: ts }); persist(local); }
    render();                       // optimistic — show immediately
    showToast('Seizure logged ✓');
    if (ENDPOINT) {
      callSheet({ action: 'add', iso: ts, ua: (navigator.userAgent || '').slice(0, 60) }, function (data) {
        var remote = remoteToEntries(data);
        if (remote) { shared = true; persist(remote); render(); }
      });
    }
  }

  function removeEntry(ts, label) {
    if (!confirm('Remove this logged seizure?\n\n' + label)) return;
    persist(load().filter(function (e) { return e.ts !== ts; }));
    render();
    showToast('Entry removed');
    if (ENDPOINT) {
      callSheet({ action: 'delete', iso: ts }, function (data) {
        var remote = remoteToEntries(data);
        if (remote) { shared = true; persist(remote); render(); }
      });
    }
  }

  // Pull the shared list and push up anything logged offline.
  function sync() {
    if (!ENDPOINT) return;
    callSheet({ action: 'list' }, function (data) {
      var remote = remoteToEntries(data);
      if (!remote) { setNote(); return; } // offline — keep local view
      shared = true;
      var local = load();
      var remoteMap = byTs(remote);
      // push local-only entries (logged while offline) up to the sheet
      local.forEach(function (e) {
        if (e.ts && !remoteMap[e.ts]) {
          callSheet({ action: 'add', iso: e.ts, ua: (navigator.userAgent || '').slice(0, 60) }, function () {});
        }
      });
      var merged = mergeTs(remote, local);
      persist(merged);
      render();
    });
  }

  // Open confirmation, capturing the exact moment the button was hit.
  logBtn.addEventListener('click', function () {
    pendingDate = new Date();
    if (dialog && typeof dialog.showModal === 'function') {
      dialogTime.textContent = fmtSydney(pendingDate);
      dialog.showModal();
    } else {
      if (confirm('Log a seizure at:\n\n' + fmtSydney(pendingDate) + '\n\nSave to the log?')) {
        saveEntry(pendingDate);
      }
    }
  });

  if (dialog) {
    dialog.addEventListener('close', function () {
      if (dialog.returnValue === 'confirm' && pendingDate) saveEntry(pendingDate);
      pendingDate = null;
    });
  }

  // Export: native share sheet if available, otherwise download a CSV.
  var exportBtn = document.getElementById('export-log-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', function () {
      var entries = load().sort(function (a, b) { return new Date(a.ts) - new Date(b.ts); });
      if (!entries.length) { showToast('Nothing to export yet'); return; }
      var lines = entries.map(function (e, i) { return (i + 1) + '. ' + fmtSydney(new Date(e.ts)); });
      var text = "Whiskey's seizure log (" + entries.length + ')\n' + lines.join('\n');

      if (navigator.share) {
        navigator.share({ title: "Whiskey's seizure log", text: text }).catch(function () {});
        return;
      }
      var csv = 'Number,Date/Time (Sydney)\n' + entries.map(function (e, i) {
        return (i + 1) + ',"' + fmtSydney(new Date(e.ts)) + '"';
      }).join('\n');
      var blob = new Blob([csv], { type: 'text/csv' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'whiskey-seizure-log.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Log downloaded');
    });
  }

  var clearBtn = document.getElementById('clear-log-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      if (!load().length) return;
      if (!confirm('Clear the entire seizure log? This cannot be undone.')) return;
      persist([]);
      render();
      showToast('Log cleared');
      if (ENDPOINT) callSheet({ action: 'clear' }, function () {});
    });
  }

  render();
  sync();
})();
