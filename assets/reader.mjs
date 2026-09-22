export function startReading(content) {
  const controller = new AbortController();
  const { signal } = controller;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const progress = document.getElementById('reading-progress');
  const percent = document.getElementById('reading-percent');
  const timeline = document.getElementById('timeline');
  const track = document.getElementById('timeline-progress');
  const yearTargets = Array.from(content.querySelectorAll('[data-year-link]')).map(link => ({ link, target: document.getElementById(link.hash.slice(1)) })).filter(item => item.target);
  const reveals = Array.from(content.querySelectorAll('.reveal'));
  const clamp = value => Math.min(1, Math.max(0, value));
  let frame = null;
  let observer = null;

  function update() {
    frame = null;
    const range = document.documentElement.scrollHeight - innerHeight;
    const fraction = range > 0 ? clamp(scrollY / range) : 0;
    const percentage = Math.round(fraction * 100);
    progress?.style.setProperty('--progress', `${fraction * 100}%`);
    progress?.setAttribute('aria-valuenow', String(percentage));
    if (percent) percent.textContent = `${percentage}%`;
    if (timeline && track) {
      const bounds = timeline.getBoundingClientRect();
      track.style.transform = `scaleY(${bounds.height > 0 ? clamp((innerHeight * .5 - bounds.top) / bounds.height) : 0})`;
    }
    let active = yearTargets[0]?.target;
    for (const { target } of yearTargets) if (target.getBoundingClientRect().top <= innerHeight * .4) active = target;
    for (const { link, target } of yearTargets) {
      link.classList.toggle('is-active', target === active);
      if (target === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }
  function schedule() {
    if (frame === null) frame = requestAnimationFrame(update);
  }
  function reveal() {
    observer?.disconnect();
    const animate = 'IntersectionObserver' in window && !reducedMotion.matches;
    document.body.classList.toggle('motion-ready', animate);
    if (!animate) {
      reveals.forEach(element => element.classList.add('is-visible'));
      return;
    }
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }, { threshold: .08, rootMargin: '0px 0px -20px 0px' });
    reveals.filter(element => !element.classList.contains('is-visible')).forEach(element => observer.observe(element));
  }
  for (const name of ['scroll', 'resize', 'hashchange']) window.addEventListener(name, schedule, { passive: true, signal });
  reducedMotion.addEventListener('change', reveal, { signal });
  reveal();
  try {
    const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target && content.contains(target)) target.scrollIntoView({ behavior: 'instant', block: 'start' });
  } catch { /* An invalid fragment does not prevent reading. */ }
  schedule();
  return () => {
    controller.abort();
    observer?.disconnect();
    if (frame !== null) cancelAnimationFrame(frame);
  };
}
