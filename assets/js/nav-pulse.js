/* Erata — 29.10 nav link attention pulse
   The nav link is steady red by default (CSS). Until the visitor has spent about
   10 seconds inside the 29.10 section it breathes between the header colour and
   red, with a fast flash burst every few seconds (see @keyframes rp-breathe).

   - Entering the section: the pulse stops, the link goes steady red.
   - Staying 10 s (time is cumulative, and only counts while the tab is visible):
     the link stays steady red for the rest of the session.
   - Scrolling past before 10 s: the pulse resumes. */

(function () {
  "use strict";

  const link = document.querySelector('.site-nav a[href="#republic"]');
  const section = document.getElementById("republic");
  if (!link || !section || !("IntersectionObserver" in window)) return;

  const DWELL_MS = 10000;
  const KEY = "erata-republic-seen";

  try {
    if (window.sessionStorage.getItem(KEY) === "1") return;
  } catch (error) { /* storage blocked: carry on without persistence */ }

  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let inView = false;
  let spent = 0;
  let startedAt = 0;
  let timer = 0;

  const pulse = (on) => link.classList.toggle("is-pulsing", on);

  function settle() {
    timer = 0;
    pulse(false);
    observer.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    try { window.sessionStorage.setItem(KEY, "1"); } catch (error) { /* ignore */ }
  }

  function begin() {
    if (timer) return;
    startedAt = performance.now();
    timer = window.setTimeout(settle, Math.max(0, DWELL_MS - spent));
  }

  function pause() {
    if (!timer) return;
    window.clearTimeout(timer);
    timer = 0;
    spent += performance.now() - startedAt;
  }

  function onVisibility() {
    if (document.hidden) pause();
    else if (inView) begin();
  }

  /* "In the section" = it covers the middle band of the viewport. */
  const observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[entries.length - 1];
      inView = entry.isIntersecting;
      if (inView) {
        pulse(false);
        if (!document.hidden) begin();
      } else {
        pause();
        pulse(true);
      }
    },
    { rootMargin: "-30% 0px -30% 0px", threshold: 0 }
  );

  pulse(true);
  observer.observe(section);
  document.addEventListener("visibilitychange", onVisibility);
})();

/* Flag rails: only animate while the section is on screen. */
(function () {
  "use strict";
  const section = document.getElementById("republic");
  if (!section || !("IntersectionObserver" in window)) return;
  new IntersectionObserver((entries) => {
    section.classList.toggle("is-live", entries[entries.length - 1].isIntersecting);
  }, { rootMargin: "100px 0px" }).observe(section);
})();
