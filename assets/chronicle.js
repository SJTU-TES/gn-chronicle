(() => {
  "use strict";

  const initialize = () => {
    const gate = document.getElementById("entry-screen");
    const form = document.getElementById("entry-form");
    const password = document.getElementById("entry-password");
    const error = document.getElementById("entry-error");
    const content = document.getElementById("chronicle-content");
    const title = document.getElementById("chronicle-title");
    if (!gate || !form || !password || !error || !content) return;

    // This is a playful entrance to a public chronicle, not an authentication system.
    const chroniclePassword = "202304";
    const storageKey = "gn-chronicle-202304-unlocked";
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const readingProgress = document.getElementById("reading-progress");
    const readingPercent = document.getElementById("reading-percent");
    const timeline = document.getElementById("timeline");
    const timelineProgress = document.getElementById("timeline-progress");
    const yearLinks = Array.from(document.querySelectorAll("[data-year-link]"));
    const yearTargets = yearLinks
      .map((link) => {
        const href = link.getAttribute("href");
        const target = href && href.startsWith("#") ? document.getElementById(href.slice(1)) : null;
        return { link, target };
      })
      .filter(({ target }) => target);
    const reveals = Array.from(document.querySelectorAll(".reveal"));
    let unlocked = false;
    let framePending = false;
    let revealObserver = null;

    const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

    const saveSession = (value) => {
      try {
        if (value) window.sessionStorage.setItem(storageKey, "1");
        else window.sessionStorage.removeItem(storageKey);
      } catch (_) {
        // Browsers that disable storage can still open the current page.
      }
    };

    const clearError = () => {
      error.textContent = "";
      password.removeAttribute("aria-invalid");
    };

    const updateProgress = () => {
      framePending = false;
      if (!unlocked) return;

      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollRange = document.documentElement.scrollHeight - viewportHeight;
      const fraction = scrollRange > 0 ? clamp(scrollTop / scrollRange) : 0;
      const percentage = Math.round(fraction * 100);

      if (readingProgress) {
        readingProgress.style.setProperty("--progress", `${fraction * 100}%`);
        readingProgress.setAttribute("aria-valuenow", String(percentage));
      }
      if (readingPercent) readingPercent.textContent = `${percentage}%`;

      if (timeline && timelineProgress) {
        const bounds = timeline.getBoundingClientRect();
        const timelineFraction = bounds.height > 0 ? clamp((viewportHeight * 0.5 - bounds.top) / bounds.height) : 0;
        timelineProgress.style.transform = `scaleY(${timelineFraction})`;
      }

      let activeTarget = yearTargets.length ? yearTargets[0].target : null;
      for (const { target } of yearTargets) {
        if (target.getBoundingClientRect().top <= viewportHeight * 0.4) activeTarget = target;
      }
      for (const { link, target } of yearTargets) {
        const active = target === activeTarget;
        link.classList.toggle("is-active", active);
        if (active) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      }
    };

    const scheduleProgress = () => {
      if (framePending || !unlocked) return;
      framePending = true;
      window.requestAnimationFrame(updateProgress);
    };

    const configureReveals = () => {
      if (revealObserver) revealObserver.disconnect();
      revealObserver = null;
      const canAnimate = unlocked && "IntersectionObserver" in window && !reducedMotion.matches;
      document.body.classList.toggle("motion-ready", canAnimate);
      if (!canAnimate) {
        reveals.forEach((element) => element.classList.add("is-visible"));
        return;
      }

      revealObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        },
        { threshold: 0.08, rootMargin: "0px 0px -20px 0px" }
      );
      reveals.forEach((element) => {
        if (!element.classList.contains("is-visible")) revealObserver.observe(element);
      });
    };

    const followCurrentHash = () => {
      if (!unlocked || !window.location.hash) return;
      let id;
      try {
        id = decodeURIComponent(window.location.hash.slice(1));
      } catch (_) {
        return;
      }
      const target = document.getElementById(id);
      if (target && content.contains(target)) target.scrollIntoView({ behavior: "instant", block: "start" });
    };

    const openChronicle = () => {
      unlocked = true;
      saveSession(true);
      clearError();
      password.value = "";
      gate.hidden = true;
      content.hidden = false;
      content.removeAttribute("inert");
      document.body.classList.add("chronicle-open");
      if (title) title.focus({ preventScroll: true });
      configureReveals();
      window.requestAnimationFrame(() => {
        followCurrentHash();
        scheduleProgress();
      });
    };

    const lockChronicle = () => {
      unlocked = false;
      saveSession(false);
      clearError();
      password.value = "";
      content.hidden = true;
      content.setAttribute("inert", "");
      gate.hidden = false;
      document.body.classList.remove("chronicle-open", "motion-ready");
      if (revealObserver) revealObserver.disconnect();
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      password.focus({ preventScroll: true });
    };

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (password.value.trim() === chroniclePassword) {
        openChronicle();
        return;
      }
      error.textContent = "口令不太对，再试一次。";
      password.value = "";
      password.setAttribute("aria-invalid", "true");
      password.focus();
    });
    password.addEventListener("input", clearError);
    document.querySelectorAll("[data-lock]").forEach((button) => {
      button.addEventListener("click", lockChronicle);
    });
    window.addEventListener("scroll", scheduleProgress, { passive: true });
    window.addEventListener("resize", scheduleProgress, { passive: true });
    window.addEventListener("hashchange", scheduleProgress);
    window.addEventListener("pageshow", scheduleProgress);
    if (typeof reducedMotion.addEventListener === "function") {
      reducedMotion.addEventListener("change", configureReveals);
    } else if (typeof reducedMotion.addListener === "function") {
      reducedMotion.addListener(configureReveals);
    }

    let remembered = false;
    try {
      remembered = window.sessionStorage.getItem(storageKey) === "1";
    } catch (_) {
      // Storage is optional; the password form remains usable.
    }
    if (remembered) openChronicle();
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
})();
