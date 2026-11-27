(function () {
  var NATIVE =
    'a[href], button, input, select, textarea, [onclick], [tabindex]:not([tabindex="-1"]), [role="button"]';
  var RING = "tv-focus-ring";
  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, HEAD: 1, META: 1, LINK: 1 };
  var current = null;
  var cache = null;

  function hasBox(element) {
    if (!element || element.disabled) return false;
    var rect = element.getBoundingClientRect();
    return rect.width > 4 && rect.height > 4;
  }

  function isClickable(element) {
    try {
      return window.getComputedStyle(element).cursor === "pointer";
    } catch (error) {
      return false;
    }
  }

  function collect() {
    var found = [];
    var natives = document.querySelectorAll(NATIVE);
    var i;

    for (i = 0; i < natives.length; i += 1) {
      if (hasBox(natives[i])) found.push(natives[i]);
    }

    var all = document.body ? document.body.getElementsByTagName("*") : [];
    for (i = 0; i < all.length; i += 1) {
      var node = all[i];
      if (SKIP[node.tagName]) continue;
      if (found.indexOf(node) !== -1) continue;
      if (!hasBox(node)) continue;
      if (!isClickable(node)) continue;

      var ancestor = node.parentElement;
      var nested = false;
      while (ancestor && ancestor !== document.body) {
        if (found.indexOf(ancestor) !== -1) {
          nested = true;
          break;
        }
        ancestor = ancestor.parentElement;
      }
      if (!nested) found.push(node);
    }

    found.sort(function (a, b) {
      var ra = a.getBoundingClientRect();
      var rb = b.getBoundingClientRect();
      if (Math.abs(ra.top - rb.top) > 6) return ra.top - rb.top;
      return ra.left - rb.left;
    });

    return found;
  }

  function candidates() {
    var now = Date.now();
    if (!cache || now - cache.time > 350) {
      cache = { time: now, list: collect() };
    }
    return cache.list;
  }

  function centerOf(element) {
    var rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  function focusElement(element) {
    if (!element) return;
    if (current && current !== element) {
      current.classList.remove(RING);
    }
    current = element;
    element.classList.add(RING);
    if (typeof element.focus === "function") {
      element.focus({ preventScroll: true });
    }
    if (typeof element.scrollIntoView === "function") {
      element.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
    }
  }

  function scrollPage(direction) {
    var vertical = window.innerHeight * 0.7;
    var horizontal = window.innerWidth * 0.7;
    var top = direction === "up" ? -vertical : direction === "down" ? vertical : 0;
    var left = direction === "left" ? -horizontal : direction === "right" ? horizontal : 0;
    window.scrollBy({ top: top, left: left, behavior: "smooth" });
  }

  function move(direction) {
    var list = candidates();
    if (!list.length) {
      scrollPage(direction);
      return;
    }

    if (!current || !document.contains(current)) {
      focusElement(list[0]);
      return;
    }

    var origin = centerOf(current);
    var best = null;
    var bestScore = Infinity;

    list.forEach(function (element) {
      if (element === current) return;
      var point = centerOf(element);
      var dx = point.x - origin.x;
      var dy = point.y - origin.y;
      var primary = 0;
      var secondary = 0;

      if (direction === "left") {
        if (dx > -8) return;
        primary = -dx;
        secondary = Math.abs(dy);
      } else if (direction === "right") {
        if (dx < 8) return;
        primary = dx;
        secondary = Math.abs(dy);
      } else if (direction === "up") {
        if (dy > -8) return;
        primary = -dy;
        secondary = Math.abs(dx);
      } else {
        if (dy < 8) return;
        primary = dy;
        secondary = Math.abs(dx);
      }

      var score = primary + secondary * 2.4;
      if (score < bestScore) {
        bestScore = score;
        best = element;
      }
    });

    if (best) {
      focusElement(best);
    } else {
      scrollPage(direction);
    }
  }

  var playerStyle = null;
  var playerActive = false;

  function notifyPlayer(active) {
    try {
      if (window.tvPlayer && window.tvPlayer.setPlayerMode) {
        window.tvPlayer.setPlayerMode(!!active);
      }
    } catch (error) {}
  }

  function markClick() {
    try {
      if (window.tvPlayer && window.tvPlayer.markClick) {
        window.tvPlayer.markClick();
      }
    } catch (error) {}
  }

  function findMedia() {
    var viewport = window.innerWidth * window.innerHeight;
    var videos = document.querySelectorAll("video");
    var best = null;
    var bestArea = viewport * 0.12;
    var i;
    var rect;
    var area;

    for (i = 0; i < videos.length; i += 1) {
      rect = videos[i].getBoundingClientRect();
      area = rect.width * rect.height;
      if (videos[i].paused && area < viewport * 0.6) continue;
      if (area > bestArea) {
        best = videos[i];
        bestArea = area;
      }
    }
    if (best) return best;

    var frames = document.querySelectorAll("iframe");
    bestArea = viewport * 0.3;
    for (i = 0; i < frames.length; i += 1) {
      rect = frames[i].getBoundingClientRect();
      area = rect.width * rect.height;
      if (area > bestArea) {
        best = frames[i];
        bestArea = area;
      }
    }
    return best;
  }

  function enterPlayerMode(media) {
    if (playerActive || !media || !document.head) return;
    playerActive = true;

    var path = [];
    var node = media;
    while (node && node !== document.body && node !== document.documentElement) {
      path.push(node);
      node = node.parentElement;
    }

    playerStyle = document.createElement("style");
    playerStyle.textContent =
      "html,body{overflow:hidden !important;background:#000 !important;}" +
      ".tv-player-hidden{display:none !important;}" +
      ".tv-player-fill{position:fixed !important;top:0 !important;left:0 !important;" +
      "width:100vw !important;height:100vh !important;max-width:none !important;max-height:none !important;" +
      "margin:0 !important;padding:0 !important;border:0 !important;border-radius:0 !important;" +
      "transform:none !important;background:#000 !important;z-index:2147483000 !important;" +
      "object-fit:contain !important;}";
    document.head.appendChild(playerStyle);

    path.forEach(function (element) {
      element.classList.add("tv-player-fill");
      var parent = element.parentElement;
      if (!parent) return;
      var kids = parent.children;
      for (var k = 0; k < kids.length; k += 1) {
        var sibling = kids[k];
        if (sibling === element) continue;
        if (sibling.tagName === "SCRIPT" || sibling.tagName === "STYLE") continue;
        sibling.classList.add("tv-player-hidden");
      }
    });

    notifyPlayer(true);
  }

  function exitPlayerMode() {
    if (!playerActive) return;
    playerActive = false;

    var marked = document.querySelectorAll(".tv-player-fill, .tv-player-hidden");
    for (var i = 0; i < marked.length; i += 1) {
      marked[i].classList.remove("tv-player-fill");
      marked[i].classList.remove("tv-player-hidden");
    }
    if (playerStyle && playerStyle.parentNode) {
      playerStyle.parentNode.removeChild(playerStyle);
    }
    playerStyle = null;
    cache = null;
    notifyPlayer(false);
  }

  function openPlayer(attempts) {
    if (playerActive) return;
    var media = findMedia();
    if (media) {
      enterPlayerMode(media);
      return;
    }
    if (attempts > 0) {
      setTimeout(function () {
        openPlayer(attempts - 1);
      }, 500);
    }
  }

  window.__tvExitPlayer = function () {
    exitPlayerMode();
  };

  window.__tvOpenPlayer = function () {
    openPlayer(10);
  };

  function activate() {
    var target = current || document.activeElement;
    if (!target || target === document.body) {
      move("down");
      return;
    }
    target.click();
    cache = null;
    markClick();
    openPlayer(8);
  }

  window.__tvNav = function (command) {
    if (command === "enter") {
      activate();
      return;
    }
    move(command);
  };

  var style = document.createElement("style");
  style.textContent = ".tv-focus-ring{outline:3px solid #ffffff !important;outline-offset:3px !important;border-radius:6px !important;}\n/* TV Forge: formato Android TV */\nhtml{overscroll-behavior:none !important;}\nbody{cursor:default !important;overflow-x:hidden !important;\n-webkit-user-select:none !important;user-select:none !important;\n-webkit-tap-highlight-color:transparent !important;}\n::-webkit-scrollbar{width:0 !important;height:0 !important;}\n::-webkit-scrollbar-thumb{background:transparent !important;}\nbutton,[role=button],input,select,textarea{min-height:44px !important;}\nimg,video{max-width:100% !important;}\nbody{background-color:#080d17 !important;} footer, .cookie-banner{display:none !important;}";
  document.head.appendChild(style);

  function focusFirst() {
    if (!current) move("down");
  }

  window.addEventListener("load", function () {
    setTimeout(focusFirst, 300);
    setTimeout(focusFirst, 1200);
  });
})();
