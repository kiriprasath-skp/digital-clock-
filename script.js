(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const groupH = document.getElementById('group-h');
  const groupM = document.getElementById('group-m');
  const groupS = document.getElementById('group-s');
  const meridiemEl = document.getElementById('meridiem');
  const dateLine = document.getElementById('dateLine');
  const srTime = document.getElementById('srTime');
  const greetingEl = document.getElementById('greeting');
  const formatToggle = document.getElementById('formatToggle');
  const fullscreenToggle = document.getElementById('fullscreenToggle');
  const worldClockEl = document.getElementById('worldClock');

  const WORLD_CITIES = [
    { label: 'New York', zone: 'America/New_York' },
    { label: 'London', zone: 'Europe/London' },
    { label: 'Tokyo', zone: 'Asia/Tokyo' },
    { label: 'Sydney', zone: 'Australia/Sydney' }
  ];

  /* ---------- build a 2-digit flip group ---------- */
  function buildDigit() {
    const cell = document.createElement('div');
    cell.className = 'digit';
    cell.innerHTML =
      '<div class="digit-inner">' +
        '<div class="face front">0</div>' +
        '<div class="face back">0</div>' +
      '</div>';
    return cell;
  }

  function buildGroup(container) {
    const a = buildDigit(), b = buildDigit();
    container.appendChild(a);
    container.appendChild(b);
    return [a, b];
  }

  const hDigits = buildGroup(groupH);
  const mDigits = buildGroup(groupM);
  const sDigits = buildGroup(groupS);
  let initialized = false;

  function setDigit(cell, char, animate) {
    const inner = cell.querySelector('.digit-inner');
    const front = inner.querySelector('.face.front');
    const back = inner.querySelector('.face.back');
    if (front.textContent === char) return;

    if (!animate || reduceMotion) {
      front.textContent = char;
      back.textContent = char;
      return;
    }

    back.textContent = char;
    inner.style.transform = 'rotateX(-180deg)';

    const onEnd = () => {
      inner.removeEventListener('transitionend', onEnd);
      inner.style.transition = 'none';
      inner.style.transform = 'rotateX(0deg)';
      front.textContent = char;
      void inner.offsetWidth; // force reflow before re-enabling transition
      inner.style.transition = '';
    };
    inner.addEventListener('transitionend', onEnd);
  }

  function setGroup(cells, value2, animate) {
    setDigit(cells[0], value2[0], animate);
    setDigit(cells[1], value2[1], animate);
  }

  /* ---------- format preference ---------- */
  let use12Hour = false;
  try { use12Hour = localStorage.getItem('clockFormat') === '12'; } catch (e) { /* storage unavailable */ }

  function applyFormatLabel() {
    formatToggle.textContent = use12Hour ? 'Switch to 24h' : 'Switch to 12h';
    formatToggle.setAttribute('aria-pressed', String(use12Hour));
    meridiemEl.classList.toggle('is-hidden', !use12Hour);
  }
  applyFormatLabel();

  formatToggle.addEventListener('click', () => {
    use12Hour = !use12Hour;
    try { localStorage.setItem('clockFormat', use12Hour ? '12' : '24'); } catch (e) { /* ignore */ }
    applyFormatLabel();
    renderTime(new Date(), false); // re-render immediately in new format, no flip animation
  });

  /* ---------- fullscreen ---------- */
  fullscreenToggle.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  });

  /* ---------- time-of-day theme + greeting ---------- */
  function computePhase(hour) {
    if (hour >= 5 && hour < 8) return 'dawn';
    if (hour >= 8 && hour < 17) return 'day';
    if (hour >= 17 && hour < 20) return 'dusk';
    return 'night';
  }
  function computeGreeting(hour) {
    if (hour < 5) return 'Good night';
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 21) return 'Good evening';
    return 'Good night';
  }

  let lastPhase = null;
  function updateThemeAndGreeting(date) {
    const hour = date.getHours();
    const phase = computePhase(hour);
    if (phase !== lastPhase) {
      document.body.setAttribute('data-phase', phase);
      lastPhase = phase;
    }
    greetingEl.textContent = computeGreeting(hour);
  }

  /* ---------- date line ---------- */
  const dateFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  /* ---------- world clock ---------- */
  function buildWorldClock() {
    WORLD_CITIES.forEach(c => {
      const item = document.createElement('div');
      item.className = 'world-item';
      item.innerHTML = '<span class="city">' + c.label + '</span><span class="time" data-zone="' + c.zone + '">--:--</span>';
      worldClockEl.appendChild(item);
    });
  }
  buildWorldClock();
  const worldTimeEls = [...worldClockEl.querySelectorAll('.time')];

  function updateWorldClock(date) {
    worldTimeEls.forEach(el => {
      const formatter = new Intl.DateTimeFormat(undefined, {
        timeZone: el.dataset.zone, hour: '2-digit', minute: '2-digit', hour12: use12Hour
      });
      el.textContent = formatter.format(date);
    });
  }

  /* ---------- main render ---------- */
  function renderTime(date, animate) {
    const hours24 = date.getHours();
    const hoursDisplay = use12Hour ? (hours24 % 12 === 0 ? 12 : hours24 % 12) : hours24;
    const hh = String(hoursDisplay).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');

    setGroup(hDigits, hh, animate && initialized);
    setGroup(mDigits, mm, animate && initialized);
    setGroup(sDigits, ss, animate && initialized);

    if (use12Hour) meridiemEl.textContent = hours24 >= 12 ? 'PM' : 'AM';

    dateLine.textContent = dateFormatter.format(date);
    updateThemeAndGreeting(date);
    updateWorldClock(date);

    const accessible = (use12Hour ? hoursDisplay : hours24) + ':' + mm + ':' + ss + (use12Hour ? ' ' + (hours24 >= 12 ? 'PM' : 'AM') : '');
    srTime.textContent = accessible;

    initialized = true;
  }

  /* ---------- second-accurate scheduler ---------- */
  function tick() {
    const now = new Date();
    renderTime(now, true);
    const delay = 1000 - now.getMilliseconds();
    setTimeout(tick, delay);
  }
  tick();
})();
