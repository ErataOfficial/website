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

  const progressFill = $("#page-progress-fill");
  let scrollTicking = false;

  function updateScrollUI() {
    const scrollTop = window.scrollY || window.pageYOffset;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;

    if (progressFill) {
      progressFill.style.width = scrollable > 0 ? `${(scrollTop / scrollable) * 100}%` : "0%";
    }

    if (siteHead) {
      siteHead.classList.toggle("is-scrolled", scrollTop > 18);

      // Header logo fades/slides in gradually as the hero logo scrolls away
      const logoStart = 24;
      const logoRange = Math.max(window.innerHeight * 0.45, 200);
      const logoP = Math.min(1, Math.max(0, (scrollTop - logoStart) / logoRange));
      siteHead.style.setProperty("--logo-p", logoP.toFixed(3));
      siteHead.classList.toggle("is-logo-hidden", logoP < 0.01);

      const probe = 36;
      const darkSections = $$("[data-header-theme='dark'], .site-footer");
      const overDark = darkSections.some((section) => {
        const rect = section.getBoundingClientRect();
        return rect.top <= probe && rect.bottom >= probe;
      });
      siteHead.classList.toggle("is-dark", overDark);
    }

    scrollTicking = false;
  }

  function onScroll() {
    if (!scrollTicking) {
      window.requestAnimationFrame(updateScrollUI);
      scrollTicking = true;
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  updateScrollUI();

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
    const offset = siteHead ? siteHead.offsetHeight : 72;
    $$("main > section, #top").forEach((section) => {
      section.style.scrollMarginTop = `${offset + 16}px`;
    });
  }

  setScrollOffsets();
  window.addEventListener("resize", setScrollOffsets);

  /* Remove the initial js flag after the first paint if needed for CSS-only
     fallbacks. Kept intentionally: the reveal classes are only hidden when
     JavaScript is present. */
  html.classList.remove("no-js");
})();
