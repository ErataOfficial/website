/* Erata — interactions
   Progressive enhancement: every play control is a working link without JS.
   SoundCloud is loaded only after the visitor asks for audio. */

(function () {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const data = window.ERATA || { releases: [], featured: [] };
  const releaseMap = new Map(data.releases.map((release) => [release.id, release]));
  const playable = data.releases.filter((release) => release.scUrl && release.format !== "Album");
  const playableQueue = playable.map((release) => release.id);

  const body = document.body;
  const html = document.documentElement;
  const siteHead = $("#site-head");
  const feature = $("#feature");
  const featureArtWrap = $(".feature-art-wrap");
  const featureArt = $("#feature-art");
  const featureTitle = $("#feature-title");
  const featureCredit = $("#feature-credit");
  const featureDescription = $("#feature-description");
  const featureYear = $("#feature-year");
  const featureFormat = $("#feature-format");
  const featureDate = $("#feature-date");
  const featureGenre = $("#feature-genre");
  const featureDuration = $("#feature-duration");
  const featureLabelWrap = $("#feature-label-wrap");
  const featureLabel = $("#feature-label");
  const featureIndex = $("#feature-index");
  const featureService = $("#feature-service");
  const featureLink = $("#feature-link");
  const featurePlayButton = $("#feature-play-button");
  const featureCoverPlay = $("#feature-cover-play");
  const featureTabs = $$("[data-release-tab]");
  const featureAnnouncer = $("#feature-announcer");
  const heroPlay = $(".hero-actions [data-play-release]");

  const player = $("#player");
  const playerArt = $("#player-art");
  const playerArtLink = $("#player-art-link");
  const playerCredit = $("#player-credit");
  const playerTitle = $("#player-title");
  const playerSource = $("#player-source");
  const playerElapsed = $("#player-elapsed");
  const playerDuration = $("#player-duration");
  const playerProgress = $("#player-progress-fill");
  const playerScrub = $("#player-scrub");
  const playerToggle = $("#player-toggle");
  const playerPrev = $("#player-prev");
  const playerNext = $("#player-next");
  const playerClose = $("#player-close");
  const playerStatus = $("#player-status");

  let currentFeature = data.featured[0] || "zenith";
  let lastPlayTrigger = null;

  const state = {
    currentId: null,
    isPlaying: false,
    isOpen: false,
    isReady: false,
    isLoading: false,
    widget: null,
    scriptPromise: null,
    durationMs: 0,
    loadedId: null
  };


  /* ------------------------------------------------------------------------
     Small utilities
     ------------------------------------------------------------------------ */

  function formatTime(totalSeconds) {
    if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "00:00";
    const seconds = Math.floor(totalSeconds % 60);
    const minutes = Math.floor(totalSeconds / 60);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function durationToMs(value) {
    if (!value) return 0;
    const parts = value.split(":").map(Number);
    if (parts.some(Number.isNaN)) return 0;
    return (parts[0] * 60 + parts[1]) * 1000;
  }

  function trackLabel(release) {
    if (!release) return "";
    const credit = release.credit && release.credit !== "Erata" ? ` (${release.credit})` : "";
    return `${release.shortTitle || release.title}${credit}`;
  }

  function externalLabel(release) {
    return release.service === "Spotify" ? "Open on Spotify" : "Open on SoundCloud";
  }

  /* ------------------------------------------------------------------------
     Clock + header/progress
     ------------------------------------------------------------------------ */

  const clock = $("#ankara-time");
  const timeFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  function renderClock() {
    const time = timeFormatter.format(new Date());
    if (clock) clock.textContent = time;
  }

  renderClock();
  window.setInterval(renderClock, 30000);

  /* ------------------------------------------------------------------------
     Single logo: hero mark travels up and becomes the header mark
     ------------------------------------------------------------------------ */

  const brand = siteHead ? $(".brand", siteHead) : null;
  const heroLogoBox = $("#hero-logo .hero-logo-mark");
  const navLinks = siteHead ? $$(".site-nav a", siteHead) : [];
  const LOGO_ASPECT = 1346 / 1744;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const morph = { ready: false, docY: 0, x0: 0, h0: 0, baseW: 0, baseH: 0, s0: 1, s1: 1, endY: 0, range: 1, links: [] };
  let docked = false;
  let lastP = -1;
  let headW = 0;
  let darkRanges = [];
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  let themeIsDark = null;

  function setThemeColor(dark) {
    if (!themeMeta || dark === themeIsDark) return;
    themeIsDark = dark;
    themeMeta.setAttribute("content", dark ? "#0b0b0a" : "#e9e8e3");
  }

  // Dark section positions in document coordinates, measured once (not per frame).
  function measureDarkRanges() {
    const y = window.scrollY || window.pageYOffset;
    headW = siteHead ? siteHead.clientWidth : 0;
    darkRanges = $$("[data-header-theme='dark'], .site-footer").map((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top + y, bottom: r.bottom + y };
    });
  }

  function cssPx(name) {
    const probe = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
    return Number.isFinite(probe) ? probe : 0;
  }

  // Effective on-screen scale of the logo (1 when docked); the flag inside it reads this.
  let brandScale = 1;

  function measureBrandMorph() {
    measureDarkRanges();
    lastP = -1;
    if (!brand || !heroLogoBox || !document.documentElement.classList.contains("js")) return;

    const head = cssPx("--head");
    const navArea = cssPx("--nav-area");
    const endH = cssPx("--logo-height") || 64;

    // Hero placeholder: layout position without transforms (reveal animations ignored)
    let docY = 0;
    for (let node = heroLogoBox; node; node = node.offsetParent) docY += node.offsetTop;
    const boxW = heroLogoBox.offsetWidth;
    const boxH = heroLogoBox.offsetHeight;
    if (!boxW || !boxH) return;

    const h0 = Math.min(boxH, boxW / LOGO_ASPECT);
    const baseH = Math.max(h0, endH);

    morph.h0 = h0;
    morph.baseH = baseH;
    morph.baseW = baseH * LOGO_ASPECT;
    morph.s0 = h0 / baseH;
    morph.s1 = endH / baseH;
    morph.docY = docY + boxH / 2;
    morph.x0 = heroLogoBox.getBoundingClientRect().left + boxW / 2;
    morph.endY = (head - navArea) / 2;
    // The hand-off finishes exactly when the hero's bottom edge (the ticker)
    // has risen to just under the bar: the logo is fully docked in that frame.
    let tickerTop = 0;
    const tickerEl = document.querySelector(".ticker");
    for (let node = tickerEl; node; node = node.offsetParent) tickerTop += node.offsetTop;
    const DOCK_GAP = 57; // px between the bar's bottom edge and the ticker at completion
    morph.range = Math.max(1, morph.docY - morph.endY, tickerTop - head - DOCK_GAP);
    morph.head = head;
    morph.headMin = cssPx("--head-min");
    morph.navArea = navArea;

    brand.style.setProperty("--bw", `${morph.baseW.toFixed(2)}px`);
    brand.style.setProperty("--bh", `${morph.baseH.toFixed(2)}px`);

    morph.links = navLinks.map((link) => {
      const r = link.getBoundingClientRect();
      return { el: link, cx: r.left + r.width / 2, w: r.width, h: r.height };
    });

    morph.ready = true;
  }

  function updateBrandMorph(scrollTop) {
    if (!morph.ready) return;

    // Linear in scroll so the logo stays glued to the page, eased for size and bar
    const p = clamp01(scrollTop / morph.range);
    // Once the logo is docked and the page keeps scrolling, nothing changes.
    if (p === 1 && lastP === 1) return;
    lastP = p;
    const e = easeInOut(p);

    const scale = lerp(morph.s0, morph.s1, e);
    const x = lerp(morph.x0, headW / 2, p);
    const y = lerp(morph.docY, morph.endY, p);

    // Docked: render at the real bar size with whole-pixel placement (crisp);
    // otherwise keep the big box and shrink it with a transform while it travels.
    const dockedNow = p >= 0.985;
    brandScale = dockedNow ? 1 : scale;
    if (dockedNow) {
      const endW = morph.baseW * morph.s1;
      const endH = morph.baseH * morph.s1;
      const dpr = window.devicePixelRatio || 1;
      const snap = (v) => Math.round(v * dpr) / dpr;
      brand.style.width = `${endW.toFixed(2)}px`;
      brand.style.height = `${endH.toFixed(2)}px`;
      brand.style.transform =
        `translate3d(${snap(headW / 2 - endW / 2)}px, ${snap(morph.endY - endH / 2)}px, 0)`;
    } else {
      brand.style.width = "";
      brand.style.height = "";
      brand.style.transform =
        `translate3d(${(x - morph.baseW / 2).toFixed(2)}px, ${(y - morph.baseH / 2).toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
    }

    siteHead.style.setProperty("--e", e.toFixed(4));
    siteHead.style.setProperty("--bar", clamp01((p - 0.1) / 0.6).toFixed(3));

    const isDocked = p >= 0.985;
    if (isDocked !== docked) {
      docked = isDocked;
      siteHead.classList.toggle("is-docked", docked);
      brand.setAttribute("tabindex", docked ? "0" : "-1");
    }

    // The logo passes over the nav on its way up: dim only the links it covers
    const navY = morph.headMin / 2 + (morph.head - morph.navArea / 2 - morph.headMin / 2) * e;
    siteHead.style.setProperty("--ny", `${navY.toFixed(2)}px`);
    const logoHalfH = (morph.baseH * scale) / 2;
    const logoHalfW = (morph.baseW * scale) / 2;
    const dy = Math.abs(y - navY);
    morph.links.forEach((l) => {
      const fy = clamp01((logoHalfH + l.h / 2 - dy + 4) / 10);
      const dx = Math.abs(l.cx - x) - (l.w / 2 + logoHalfW);
      const fx = clamp01(1 - dx / 18);
      const v = (1 - fx * fy).toFixed(2);
      if (v !== l.v) {
        l.v = v;
        l.el.style.setProperty("--l", v);
      }
    });
  }

  if (brand) brand.setAttribute("tabindex", "-1");

  const progressFill = $("#page-progress-fill");
  let scrollTicking = false;

  function updateScrollUI() {
    const scrollTop = window.scrollY || window.pageYOffset;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;

    if (progressFill) {
      progressFill.style.transform = `scaleX(${scrollable > 0 ? clamp01(scrollTop / scrollable).toFixed(4) : 0})`;
    }

    if (siteHead) {
      siteHead.classList.toggle("is-scrolled", scrollTop > 18);
      updateBrandMorph(scrollTop);

      const probe = scrollTop + 36;
      const overDark = darkRanges.some((r) => r.top <= probe + 0.5 && r.bottom >= probe - 0.5);
      siteHead.classList.toggle("is-dark", overDark);
      setThemeColor(overDark);
    }

    scrollTicking = false;
  }

  function onScroll() {
    if (!scrollTicking) {
      window.requestAnimationFrame(updateScrollUI);
      scrollTicking = true;
    }
  }

  function remeasure() {
    measureBrandMorph();
    onScroll();
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", remeasure);
  window.addEventListener("load", remeasure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
  let remeasureQueued = false;
  function queueRemeasure() {
    if (remeasureQueued) return;
    remeasureQueued = true;
    window.requestAnimationFrame(() => {
      remeasureQueued = false;
      remeasure();
    });
  }
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(queueRemeasure);
    if (heroLogoBox) ro.observe(heroLogoBox);
    ro.observe(document.body);
  }

  measureBrandMorph();
  updateScrollUI();
  if (siteHead) {
    // Fade-in starts immediately; the mask image is preloaded in <head>.
    window.requestAnimationFrame(() => siteHead.classList.add("is-ready"));
    // Warm the small docked mask for this screen density so the swap has no flicker.
    const dprN = window.devicePixelRatio || 1;
    const warmSize = dprN >= 2.5 ? 192 : dprN >= 1.5 ? 128 : 64;
    ["ink", "paper"].forEach((tone) => {
      new Image().src = `assets/img/logo-${tone}-${warmSize}.png`;
    });
    new Image().src = "assets/img/logo-ink.png";
  }

  /* ------------------------------------------------------------------------
     Reveal on scroll
     ------------------------------------------------------------------------ */

  const revealItems = $$("[data-reveal]");

  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          revealObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -7% 0px", threshold: 0.08 }
    );

    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-in"));
  }

  /* ------------------------------------------------------------------------
     Featured release / selected transmissions
     ------------------------------------------------------------------------ */

  let featureImageToken = 0;

  function setFeatureImage(release) {
    if (!featureArt || !featureArtWrap) return;
    const token = ++featureImageToken;
    const next = new Image();
    next.src = release.art;
    featureArtWrap.classList.add("is-switching");

    const swap = () => {
      if (token !== featureImageToken) return;
      featureArt.src = release.art;
      featureArt.alt = `Cover artwork for ${release.title}${release.credit && release.credit !== "Erata" ? ` by ${release.credit}` : ""}.`;
      featureArtWrap.classList.remove("is-switching");
    };

    if (next.decode) {
      next.decode().then(swap).catch(swap);
    } else if (next.complete) {
      swap();
    } else {
      next.onload = swap;
      next.onerror = swap;
    }
  }

  function renderFeature(id, { animate = true } = {}) {
    const release = releaseMap.get(id);
    if (!release) return;
    currentFeature = id;
    feature.dataset.current = id;

    if (animate) {
      setFeatureImage(release);
    } else if (featureArt) {
      featureArt.src = release.art;
      featureArt.alt = `Cover artwork for ${release.title}.`;
    }

    if (featureTitle) {
      featureTitle.textContent = release.shortTitle || release.title;
      featureTitle.classList.toggle("is-long", (release.shortTitle || release.title).length > 17);
    }

    if (featureCredit) {
      let credit = release.credit;
      if (release.id === "zenith") credit = "Mefjus & flowanastasia (Erata Remix)";
      else if (release.label) credit = `${credit} / ${release.label}`;
      featureCredit.textContent = credit;
    }

    if (featureDescription) featureDescription.textContent = release.blurb;
    if (featureYear) featureYear.textContent = release.year;
    if (featureFormat) featureFormat.textContent = release.format;
    if (featureDate) featureDate.textContent = release.date;
    if (featureGenre) featureGenre.textContent = release.genre || "Electronic";
    if (featureDuration) featureDuration.textContent = release.duration;
    if (featureService) featureService.textContent = release.service;
    if (featureIndex) featureIndex.textContent = String(data.featured.indexOf(id) + 1).padStart(2, "0");
    if (featureAnnouncer) {
      featureAnnouncer.textContent = `${release.shortTitle || release.title} selected: ${release.year}, ${release.format}.`;
    }

    if (featureLabelWrap && featureLabel) {
      if (release.label) {
        featureLabelWrap.hidden = false;
        featureLabel.textContent = release.label;
      } else {
        featureLabelWrap.hidden = true;
      }
    }

    if (featureLink) {
      featureLink.href = release.externalUrl;
      featureLink.target = "_blank";
      featureLink.rel = "noopener";
      featureLink.innerHTML = `${externalLabel(release)} <svg class="icon icon--stroke" aria-hidden="true"><use href="#i-up-right"></use></svg>`;
    }

    if (featureCoverPlay) {
      featureCoverPlay.href = release.externalUrl;
      featureCoverPlay.setAttribute("aria-label", `Play ${release.shortTitle} by Erata on SoundCloud`);
    }

    if (featurePlayButton) {
      featurePlayButton.href = release.externalUrl;
      featurePlayButton.setAttribute("aria-label", `Play ${release.shortTitle} by Erata on SoundCloud`);
      const text = $("span", featurePlayButton);
      if (text) text.textContent = "Play track";
    }

    featureTabs.forEach((tab) => {
      const active = tab.dataset.releaseTab === id;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-pressed", String(active));
    });

    updatePlaybackUI();
  }

  featureTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => renderFeature(tab.dataset.releaseTab));

    tab.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (index + direction + featureTabs.length) % featureTabs.length;
      const nextTab = featureTabs[nextIndex];
      nextTab.focus();
      renderFeature(nextTab.dataset.releaseTab);
    });
  });

  renderFeature(currentFeature, { animate: false });

  /* Preload the other feature covers after the page is quiet. */
  window.addEventListener("load", () => {
    const preload = () => {
      data.featured.slice(1).forEach((id) => {
        const release = releaseMap.get(id);
        if (!release) return;
        const image = new Image();
        image.src = release.art;
      });
    };
    if ("requestIdleCallback" in window) window.requestIdleCallback(preload, { timeout: 2500 });
    else window.setTimeout(preload, 1200);
  });

  /* ------------------------------------------------------------------------
     Discography filter
     ------------------------------------------------------------------------ */

  const filterButtons = $$(".filter");
  const discographyRows = $$(".disco-row");
  const indexCount = $("#index-count");

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      let visible = 0;

      filterButtons.forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", String(active));
      });

      discographyRows.forEach((row) => {
        const show = filter === "all" || row.dataset.group === filter;
        row.hidden = !show;
        if (show) visible += 1;
      });

      if (indexCount) {
        indexCount.textContent = `Showing ${visible} ${visible === 1 ? "release" : "releases"}`;
      }
    });
  });

  /* ------------------------------------------------------------------------
     SoundCloud mini player
     ------------------------------------------------------------------------ */

  const SC_API = "https://w.soundcloud.com/player/api.js";
  const SC_HOST = $("#sc-host");
  function setStatus(message) {
    if (playerStatus) playerStatus.textContent = message;
  }

  function setLoading(loading) {
    state.isLoading = loading;
    player.classList.toggle("is-loading", loading);
    if (playerToggle) playerToggle.disabled = loading;
  }

  function setPlayerTrack(release) {
    if (!release) return;
    state.currentId = release.id;
    state.durationMs = durationToMs(release.duration);

    if (playerArt) {
      playerArt.src = release.artSmall || release.art;
      playerArt.alt = "";
    }
    if (playerArtLink) {
      playerArtLink.href = release.externalUrl;
      playerArtLink.setAttribute("aria-label", `Open ${release.shortTitle || release.title} on ${release.service}`);
    }
    if (playerCredit) playerCredit.href = release.externalUrl;
    if (playerTitle) playerTitle.textContent = release.shortTitle || release.title;
    if (playerSource) {
      const source = release.credit && release.credit !== "Erata" ? `${release.credit} · ${release.service}` : release.service;
      playerSource.textContent = source;
    }
    if (playerElapsed) playerElapsed.textContent = "00:00";
    if (playerDuration) playerDuration.textContent = release.duration;
    if (playerProgress) playerProgress.style.width = "0%";
  }

  function openPlayer(release) {
    setPlayerTrack(release);
    state.isOpen = true;
    player.classList.add("is-open");
    player.setAttribute("aria-hidden", "false");
    body.classList.add("has-player");
  }

  function closePlayer() {
    state.isOpen = false;
    player.classList.remove("is-open");
    player.setAttribute("aria-hidden", "true");
    body.classList.remove("has-player");
    if (state.widget && state.isReady) {
      try {
        state.widget.pause();
      } catch (error) {
        /* no-op */
      }
    }
    state.isPlaying = false;
    setLoading(false);
    updatePlaybackUI();
    if (lastPlayTrigger && document.contains(lastPlayTrigger)) {
      lastPlayTrigger.focus({ preventScroll: true });
    }
  }

  function updatePlaybackUI() {
    const isCurrent = (id) => state.currentId === id;
    player.classList.toggle("is-playing", state.isPlaying);

    $$("[data-play-release]").forEach((trigger) => {
      if (!trigger.classList.contains("row-play")) return;
      const playing = isCurrent(trigger.dataset.playRelease) && state.isPlaying;
      trigger.classList.toggle("is-playing", playing);
      trigger.setAttribute(
        "aria-label",
        `${playing ? "Pause" : "Play"} ${releaseMap.get(trigger.dataset.playRelease)?.shortTitle || "track"}`
      );
    });

    if (playerToggle) {
      playerToggle.setAttribute("aria-label", state.isPlaying ? "Pause" : "Play");
    }

    const featurePlaying = isCurrent(currentFeature) && state.isPlaying;

    if (featurePlayButton) {
      const span = $("span", featurePlayButton);
      if (span) span.textContent = featurePlaying ? "Pause track" : "Play track";
      featurePlayButton.classList.toggle("is-playing", featurePlaying);
      featurePlayButton.setAttribute("aria-label", `${featurePlaying ? "Pause" : "Play"} ${releaseMap.get(currentFeature)?.shortTitle || "track"} by Erata`);
    }

    if (featureCoverPlay) {
      featureCoverPlay.classList.toggle("is-playing", featurePlaying);
      featureCoverPlay.setAttribute(
        "aria-label",
        `${featurePlaying ? "Pause" : "Play"} ${releaseMap.get(currentFeature)?.shortTitle || "track"} by Erata`
      );
    }

    if (heroPlay) {
      const heroPlaying = isCurrent("zenith") && state.isPlaying;
      const span = $("span", heroPlay);
      heroPlay.classList.toggle("is-playing", heroPlaying);
      if (span) span.textContent = heroPlaying ? "Pause latest" : "Play latest";
    }
  }

  function bindWidgetEvents(widget) {
    const Events = window.SC.Widget.Events;

    widget.bind(Events.READY, () => {
      state.isReady = true;
      setLoading(false);
      widget.getDuration((duration) => {
        if (duration) state.durationMs = duration;
      });
    });

    widget.bind(Events.PLAY, () => {
      if (!state.isOpen) {
        try {
          widget.pause();
        } catch (error) {
          /* no-op */
        }
        return;
      }
      state.isPlaying = true;
      state.isLoading = false;
      setLoading(false);
      setStatus(`Playing ${trackLabel(releaseMap.get(state.currentId))}`);
      updatePlaybackUI();
    });

    widget.bind(Events.PAUSE, () => {
      state.isPlaying = false;
      updatePlaybackUI();
    });

    widget.bind(Events.FINISH, () => {
      state.isPlaying = false;
      updatePlaybackUI();
    });

    widget.bind(Events.PLAY_PROGRESS, (progress) => {
      const position = progress && Number.isFinite(progress.currentPosition) ? progress.currentPosition : 0;
      if (state.durationMs > 0) {
        if (playerProgress) playerProgress.style.width = `${clamp((position / state.durationMs) * 100, 0, 100)}%`;
      }
      if (playerElapsed) playerElapsed.textContent = formatTime(position / 1000);
    });

    widget.bind(Events.SEEK, () => {
      setStatus("Seeking");
    });

    widget.bind(Events.ERROR, () => {
      state.isPlaying = false;
      state.isLoading = false;
      setLoading(false);
      if (playerSource) playerSource.textContent = "Open on SoundCloud →";
      setStatus("SoundCloud could not play this track. Open it on SoundCloud instead.");
      updatePlaybackUI();
    });
  }

  function loadSoundCloud() {
    if (state.scriptPromise) return state.scriptPromise;

    const promise = new Promise((resolve, reject) => {
      if (window.SC && window.SC.Widget) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = SC_API;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("SoundCloud API failed to load"));
      document.head.appendChild(script);
    }).then(() => {
      const release = releaseMap.get(state.currentId) || releaseMap.get(data.featured[0]);
      if (!release || !release.scUrl) throw new Error("No playable track selected");

      const iframe = document.createElement("iframe");
      iframe.id = "sc-widget";
      iframe.title = "SoundCloud player";
      iframe.width = "100%";
      iframe.height = "166";
      iframe.allow = "autoplay";
      iframe.setAttribute("scrolling", "no");
      iframe.setAttribute("frameborder", "no");
      iframe.setAttribute(
        "src",
        `https://w.soundcloud.com/player/?url=${encodeURIComponent(release.scUrl)}&color=%23d92a16&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&visual=false`
      );
      iframe.style.cssText = "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;top:-9999px;border:0;";
      SC_HOST.appendChild(iframe);
      state.loadedId = release.id;

      const widget = window.SC.Widget(iframe);
      state.widget = widget;
      bindWidgetEvents(widget);

      return new Promise((resolveWidget) => {
        const started = Date.now();
        widget.bind(window.SC.Widget.Events.READY, () => resolveWidget(widget));
        const poll = window.setInterval(() => {
          if (state.isReady) {
            window.clearInterval(poll);
            resolveWidget(widget);
          } else if (Date.now() - started > 8000) {
            window.clearInterval(poll);
            resolveWidget(widget);
          }
        }, 200);
      });
    });

    state.scriptPromise = promise.catch((error) => {
      state.scriptPromise = null;
      throw error;
    });

    return state.scriptPromise;
  }

  async function startTrack(release) {
    if (!release || !release.scUrl) return;
    openPlayer(release);
    setStatus(`Loading ${trackLabel(release)}`);
    setLoading(true);

    try {
      await loadSoundCloud();
      const widget = state.widget;
      if (!widget) throw new Error("Player unavailable");

      const alreadyLoaded = state.loadedId === release.id && state.isReady;
      const loadAndPlay = () => {
        if (!state.isOpen) return;
        try {
          widget.play();
        } catch (error) {
          setLoading(false);
          if (playerSource) playerSource.textContent = "Open on SoundCloud →";
          setStatus("Playback was blocked. Open this track on SoundCloud.");
        }
      };

      if (!alreadyLoaded) {
        state.loadedId = release.id;
        widget.load(release.scUrl, {
          auto_play: true,
          hide_related: true,
          show_comments: false,
          show_user: false,
          show_reposts: false,
          visual: false
        });
        widget.bind(window.SC.Widget.Events.READY, function onReady() {
          widget.unbind(window.SC.Widget.Events.READY, onReady);
          loadAndPlay();
        });
      } else {
        loadAndPlay();
      }

      /* The iframe may already contain this URL from initialisation. */
      window.setTimeout(() => {
        if (state.isLoading) {
          setLoading(false);
          loadAndPlay();
        }
      }, 1600);
    } catch (error) {
      setLoading(false);
      state.isPlaying = false;
      if (playerSource) playerSource.textContent = "Open on SoundCloud →";
      setStatus("SoundCloud could not be reached. Use the SoundCloud link to listen.");
      updatePlaybackUI();
    }
  }

  async function playRelease(id) {
    const release = releaseMap.get(id);
    if (!release || !release.scUrl) return;

    if (state.currentId === id && state.isOpen) {
      if (state.isPlaying) {
        try {
          state.widget.pause();
        } catch (error) {
          /* no-op */
        }
      } else {
        try {
          state.widget.play();
        } catch (error) {
          startTrack(release);
        }
      }
      return;
    }

    if (data.featured.includes(id) && id !== currentFeature) {
      renderFeature(id);
    }

    await startTrack(release);
  }

  function stepTrack(direction) {
    if (!playableQueue.length) return;
    const currentIndex = playableQueue.indexOf(state.currentId);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + direction + playableQueue.length) % playableQueue.length;
    playRelease(playableQueue[nextIndex]);
  }

  /* Global delegated play controls */
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-play-release]");
    if (!trigger) return;
    event.preventDefault();
    lastPlayTrigger = trigger;
    playRelease(trigger.dataset.playRelease);
  });

  $$("[data-feature-play]").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      lastPlayTrigger = trigger;
      playRelease(currentFeature);
    });
  });

  playerToggle?.addEventListener("click", () => {
    if (!state.currentId) {
      lastPlayTrigger = heroPlay || playerToggle;
      playRelease(data.featured[0]);
      return;
    }
    if (state.isPlaying) {
      try {
        state.widget.pause();
      } catch (error) {
        state.isPlaying = false;
        updatePlaybackUI();
      }
    } else {
      try {
        state.widget.play();
      } catch (error) {
        playRelease(state.currentId);
      }
    }
  });

  playerPrev?.addEventListener("click", () => stepTrack(-1));
  playerNext?.addEventListener("click", () => stepTrack(1));
  playerClose?.addEventListener("click", closePlayer);

  playerScrub?.addEventListener("click", (event) => {
    if (!state.widget || !state.isReady || !state.durationMs) return;
    const rect = playerScrub.getBoundingClientRect();
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    try {
      state.widget.seekTo(Math.round(ratio * state.durationMs));
    } catch (error) {
      /* no-op */
    }
  });

  playerScrub?.addEventListener("keydown", (event) => {
    if (!state.widget || !state.isReady || !state.durationMs) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const step = state.durationMs * 0.05;
    try {
      state.widget.getPosition((position) => {
        const next = clamp(position + (event.key === "ArrowRight" ? step : -step), 0, state.durationMs);
        state.widget.seekTo(Math.round(next));
      });
    } catch (error) {
      /* no-op */
    }
  });

  /* If the SoundCloud script fails to load, the player still remains useful:
     the links in the feature panel and discography go straight to the source. */
  window.addEventListener("pagehide", () => {
    if (state.widget && state.isPlaying) {
      try {
        state.widget.pause();
      } catch (error) {
        /* no-op */
      }
    }
  });

  /* Add the section scroll offset after layout is known. */
  function setScrollOffsets() {
    const offset = siteHead ? cssPx("--head") || siteHead.offsetHeight : 72;
    $$("main > section, #top").forEach((section) => {
      section.style.scrollMarginTop = `${offset + 16}px`;
    });
  }

  setScrollOffsets();
  window.addEventListener("resize", setScrollOffsets);

  /* Ticker: repeat the set until the track is always wider than the viewport,
     then slide by exactly one set so the loop never shows a gap. */
  const tickerTrack = $(".ticker-track");
  const TICKER_SPEED = 35; /* px per second */

  function buildTicker() {
    if (!tickerTrack) return;
    const base = $(".ticker-set", tickerTrack);
    if (!base) return;

    $$("[data-ticker-clone]", tickerTrack).forEach((node) => node.remove());

    const setWidth = base.getBoundingClientRect().width;
    if (!setWidth) return;

    const copies = Math.ceil(window.innerWidth / setWidth) + 1;
    for (let i = 1; i < copies; i += 1) {
      const clone = base.cloneNode(true);
      clone.setAttribute("data-ticker-clone", "");
      tickerTrack.appendChild(clone);
    }

    tickerTrack.style.setProperty("--ticker-shift", `-${setWidth}px`);
    tickerTrack.style.setProperty("--ticker-duration", `${(setWidth / TICKER_SPEED).toFixed(2)}s`);
  }

  buildTicker();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(buildTicker);
  }
  window.addEventListener("load", buildTicker);

  let tickerResizeTimer;
  window.addEventListener("resize", () => {
    window.clearTimeout(tickerResizeTimer);
    tickerResizeTimer = window.setTimeout(buildTicker, 150);
  });

  /* 29 October — Republic Day flag beside the logo --------------------------
     FLAG_MODE: "always" keeps the flag up all year, "oct29" shows it only from
     26 Oct to 1 Nov, "off" hides it. Add ?flag=1 or ?flag=0 to the URL to
     preview either way. The hover / tap message follows the visitor's browser
     language and falls back to English. */
  const FLAG_MODE = "always";

  const FLAG_TEXT = {
    tr: "29 Ekim Cumhuriyet Bayramı",
    en: "29 October – Republic Day",
    de: "29. Oktober – Tag der Republik",
    fr: "29 octobre – Fête de la République",
    es: "29 de octubre – Día de la República",
    it: "29 ottobre – Giorno della Repubblica",
    pt: "29 de outubro – Dia da República",
    nl: "29 oktober – Dag van de Republiek",
    sv: "29 oktober – Republikens dag",
    da: "29. oktober – Republikkens dag",
    pl: "29 października – Dzień Republiki",
    cs: "29. října – Den republiky",
    ro: "29 octombrie – Ziua Republicii",
    hu: "Október 29. – A Köztársaság napja",
    el: "29 Οκτωβρίου – Ημέρα της Δημοκρατίας",
    ru: "29 октября – День Республики",
    uk: "29 жовтня – День Республіки",
    az: "29 Oktyabr – Cümhuriyyət Günü",
    ar: "29 أكتوبر – عيد الجمهورية",
    fa: "۲۹ اکتبر – روز جمهوری",
    hi: "29 अक्टूबर – गणतंत्र दिवस",
    ja: "10月29日 – 共和国記念日",
    ko: "10월 29일 – 공화국 기념일",
    zh: "10月29日 – 共和国日"
  };

  const flag = $("#flag-tr");

  function flagShouldShow() {
    const param = new URLSearchParams(window.location.search).get("flag");
    if (param === "1") return true;
    if (param === "0") return false;
    if (FLAG_MODE === "off") return false;
    if (FLAG_MODE === "oct29") {
      const now = new Date();
      const m = now.getMonth() + 1;
      const d = now.getDate();
      return (m === 10 && d >= 26) || (m === 11 && d <= 1);
    }
    return true;
  }

  function flagLanguage() {
    const list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "en"];
    for (const tag of list) {
      const code = String(tag).toLowerCase().split("-")[0];
      if (FLAG_TEXT[code]) return code;
    }
    return "en";
  }

  if (flag && flagShouldShow()) {
    const lang = flagLanguage();
    const message = FLAG_TEXT[lang];

    /* The flag is painted on a canvas sized to its real device pixels. The flag
       artwork is rasterised once into `art`; every frame copies it column by
       column, shifted up and down along a travelling sine wave, with a soft
       light / shadow band so the cloth looks folded. */
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    flag.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    /* The flag is small (about 23 x 15 px when docked), so it is drawn at 2x or
       4x size and averaged down by exact halves. That keeps the edges, the
       crescent and the star anti-aliased instead of stair-stepped. */
    const art = document.createElement("canvas");
    const artCtx = art.getContext("2d");
    const buf = document.createElement("canvas");
    const bufCtx = buf.getContext("2d");
    const mid = document.createElement("canvas");
    const midCtx = mid.getContext("2d");
    const artImage = new Image();
    const PAD = 0.14;
    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cw = 0;
    let ch = 0;
    let fh = 0;
    let ss = 1;
    let fitScale = 1;
    let ready = false;
    let rafId = 0;

    const paintArt = () => {
      if (!cw || !artImage.complete || !artImage.naturalWidth) return;
      artCtx.clearRect(0, 0, art.width, art.height);
      artCtx.drawImage(artImage, 0, 0, art.width, art.height);
      ready = true;
    };

    /* Docked, the logo sits at its real size, so the bitmap is placed exactly on
       the device-pixel grid and the browser does not resample it. While the logo
       travels up it is scaled by a transform, so the CSS percentages apply. */
    const alignCanvas = (dpr, eff) => {
      if (Math.abs(eff - 1) > 0.001) {
        canvas.style.left = "";
        canvas.style.top = "";
        canvas.style.width = "";
        canvas.style.height = "";
        return;
      }
      const rect = flag.getBoundingClientRect();
      const left = Math.round(rect.left * dpr) / dpr;
      const top = Math.round((rect.top - (fh * PAD) / dpr) * dpr) / dpr;
      canvas.style.left = `${left - rect.left}px`;
      canvas.style.top = `${top - rect.top}px`;
      canvas.style.width = `${cw / dpr}px`;
      canvas.style.height = `${ch / dpr}px`;
    };

    const fit = () => {
      const w = flag.offsetWidth;
      const h = flag.offsetHeight;
      if (!w || !h || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      /* The flag is laid out at the big hero size and shrunk with the logo; size
         the bitmap for what is really on screen. */
      const eff = brandScale > 0 ? brandScale : 1;
      fitScale = eff;
      const nw = Math.max(2, Math.round(w * eff * dpr));
      const nfh = Math.max(2, Math.round(h * eff * dpr));
      const nh = Math.round(nfh * (1 + PAD * 2));
      if (nw !== cw || nh !== ch) {
        cw = nw;
        ch = nh;
        fh = nfh;
        ss = nfh < 90 ? 4 : nfh < 200 ? 2 : 1;
        canvas.width = cw;
        canvas.height = ch;
        art.width = cw * ss;
        art.height = fh * ss;
        buf.width = cw * ss;
        buf.height = ch * ss;
        if (ss === 4) {
          mid.width = cw * 2;
          mid.height = ch * 2;
        }
        ready = false;
        paintArt();
        alignCanvas(dpr, eff);
        if (reduceMotion) draw(600);
      } else {
        alignCanvas(dpr, eff);
      }
    };

    function draw(now) {
      if (!ready || !ctx) return;
      const t = now / 1000;
      const bw = cw * ss;
      const bh = ch * ss;
      const fhS = fh * ss;
      const pad = fhS * PAD;
      const amp = fhS * 0.078;
      bufCtx.clearRect(0, 0, bw, bh);
      let tint = "";
      for (let x = 0; x < bw; x += 1) {
        const u = x / bw;
        const phase = u * Math.PI * 2 * 1.15 - t * Math.PI * 2 / 2.6;
        const y = pad + Math.sin(phase) * amp * (0.12 + 0.88 * u);
        bufCtx.globalAlpha = 1;
        bufCtx.drawImage(art, x, 0, 2, fhS, x, y, 2, fhS);
        const shade = Math.cos(phase) * (0.1 + 0.2 * u);
        const colour = shade > 0 ? "#000" : "#fff";
        if (colour !== tint) {
          bufCtx.fillStyle = colour;
          tint = colour;
        }
        bufCtx.globalAlpha = Math.min(Math.abs(shade) * (shade > 0 ? 0.9 : 0.4), 0.4);
        bufCtx.fillRect(x, y, 2, fhS);
      }
      bufCtx.globalAlpha = 1;

      ctx.clearRect(0, 0, cw, ch);
      if (ss === 4) {
        midCtx.clearRect(0, 0, mid.width, mid.height);
        midCtx.drawImage(buf, 0, 0, bw, bh, 0, 0, mid.width, mid.height);
        ctx.drawImage(mid, 0, 0, mid.width, mid.height, 0, 0, cw, ch);
      } else {
        ctx.drawImage(buf, 0, 0, bw, bh, 0, 0, cw, ch);
      }
    }

    const frame = (now) => {
      if (Math.abs(brandScale - fitScale) > fitScale * 0.12) fit();
      draw(now);
      rafId = window.requestAnimationFrame(frame);
    };

    artImage.addEventListener("load", () => {
      paintArt();
      if (reduceMotion) draw(600);
    });
    artImage.src = "assets/img/flag-tr.svg";

    flag.setAttribute("role", "img");
    flag.setAttribute("aria-label", message);
    flag.setAttribute("tabindex", "0");
    flag.hidden = false;
    fit();
    if ("ResizeObserver" in window) new ResizeObserver(fit).observe(flag);
    window.addEventListener("resize", fit);
    if (!reduceMotion) rafId = window.requestAnimationFrame(frame);

    const tip = document.createElement("div");
    tip.className = "flag-tip";
    tip.setAttribute("aria-hidden", "true");
    tip.lang = lang;
    tip.dir = lang === "ar" || lang === "fa" ? "rtl" : "ltr";
    tip.textContent = message;
    document.body.appendChild(tip);

    let tipTimer = 0;
    let tipScrollY = 0;

    const showTip = (autoHide) => {
      window.clearTimeout(tipTimer);
      tipScrollY = window.scrollY;
      const rect = flag.getBoundingClientRect();
      tip.classList.add("is-on");
      const w = tip.offsetWidth;
      const h = tip.offsetHeight;
      const gap = 12;
      let left;
      let top = clamp(rect.top + rect.height / 2 - h / 2, 8, window.innerHeight - h - 8);
      if (window.innerWidth < 720) {
        left = clamp(rect.left + rect.width / 2 - w / 2, 8, window.innerWidth - w - 8);
        top = Math.max(rect.bottom + gap, siteHead ? siteHead.getBoundingClientRect().bottom + 8 : 0);
      } else if (rect.right + gap + w <= window.innerWidth - 8) {
        left = rect.right + gap;
      } else if (rect.left - gap - w >= 8) {
        left = rect.left - gap - w;
      } else {
        left = clamp(rect.left + rect.width / 2 - w / 2, 8, window.innerWidth - w - 8);
        top = rect.bottom + gap;
      }
      tip.style.left = `${left}px`;
      tip.style.top = `${top}px`;
      if (autoHide) tipTimer = window.setTimeout(hideTip, 3200);
    };

    function hideTip() {
      window.clearTimeout(tipTimer);
      tip.classList.remove("is-on");
    }

    flag.addEventListener("pointerenter", (event) => { if (event.pointerType === "mouse") showTip(false); });
    flag.addEventListener("pointerleave", (event) => { if (event.pointerType === "mouse") hideTip(); });
    flag.addEventListener("focus", () => showTip(false));
    flag.addEventListener("blur", hideTip);
    flag.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      showTip(true);
    });
    window.addEventListener("scroll", () => {
      if (Math.abs(window.scrollY - tipScrollY) > 40) hideTip();
    }, { passive: true });
  }

  /* Remove the initial js flag after the first paint if needed for CSS-only
     fallbacks. Kept intentionally: the reveal classes are only hidden when
     JavaScript is present. */
  html.classList.remove("no-js");
})();
