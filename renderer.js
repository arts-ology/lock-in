let settings = { defaultTheme: "lilac", focusMinutes: 25, breakMinutes: 5, idleMinutes: 4 };
let quotes = [];
let quoteIndex = 0;

let mode = "focus";
let remainingSeconds = 25 * 60;
let running = false;
let timerHandle = null;
let sessionStartedAt = null;

const clockText = document.getElementById("clock-text");
const clockEl = document.getElementById("clock");
const modeLabelEl = document.getElementById("mode-label");
const playBtn = document.getElementById("play-btn");
const playLabel = document.getElementById("play-label");
const stepperEl = document.getElementById("stepper");
const stepperLabelEl = document.getElementById("stepper-label");
const quoteAreaEl = document.getElementById("quote-area");
const quoteTextEl = document.getElementById("quote-text");
const themeRowEl = document.getElementById("theme-row");
const mainScreenEl = document.getElementById("main-screen");
const screensaverEl = document.getElementById("screensaver");
const historyPanelEl = document.getElementById("history-panel");
const sparkleLayerEl = document.getElementById("sparkle-layer");
const screensaverSparklesEl = document.getElementById("screensaver-sparkles");

function attachPressHandlers(element, { onTap, onLongPress, duration = 600, ringEl = null }) {
  let pressTimer = null;
  let longPressFired = false;

  function startPress() {
    longPressFired = false;
    if (ringEl) ringEl.classList.add("filling");
    pressTimer = setTimeout(() => {
      longPressFired = true;
      if (onLongPress) onLongPress();
    }, duration);
  }

  function endPress() {
    clearTimeout(pressTimer);
    if (ringEl) ringEl.classList.remove("filling");
    if (!longPressFired && onTap) onTap();
  }

  function cancelPress() {
    clearTimeout(pressTimer);
    if (ringEl) ringEl.classList.remove("filling");
  }

  element.addEventListener("touchstart", (e) => { e.preventDefault(); startPress(); });
  element.addEventListener("touchend", (e) => { e.preventDefault(); endPress(); });
  element.addEventListener("touchcancel", cancelPress);

  element.addEventListener("mousedown", startPress);
  element.addEventListener("mouseup", endPress);
  element.addEventListener("mouseleave", cancelPress);
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

function updateClockDisplay() {
  clockText.textContent = formatTime(remainingSeconds);
}

function tick() {
  remainingSeconds -= 1;

  if (remainingSeconds <= 0) {
    if (mode === "focus") {
      logSession(true);
      mode = "break";
      remainingSeconds = settings.breakMinutes * 60;
    } else {
      mode = "focus";
      remainingSeconds = settings.focusMinutes * 60;
      sessionStartedAt = Date.now();
    }
    modeLabelEl.textContent = mode;
    document.body.classList.toggle("break-mode", mode === "break");
  }

  updateClockDisplay();
}

function toggleTimer() {
  running = !running;
  if (running) {
    playLabel.textContent = "pause";
    if (mode === "focus" && !sessionStartedAt) sessionStartedAt = Date.now();
    timerHandle = setInterval(tick, 1000);
  } else {
    playLabel.textContent = "start";
    clearInterval(timerHandle);
  }
}

function resetTimer() {
  if (mode === "focus" && sessionStartedAt) {
    logSession(false);
  }
  running = false;
  clearInterval(timerHandle);
  mode = "focus";
  sessionStartedAt = null;
  modeLabelEl.textContent = "focus";
  document.body.classList.remove("break-mode");
  remainingSeconds = settings.focusMinutes * 60;
  updateClockDisplay();
  playLabel.textContent = "start";
}

function logSession(completed) {
  if (!sessionStartedAt) return;
  const durationMinutes = Math.round((Date.now() - sessionStartedAt) / 60000);
  window.api.logSession({
    timestamp: sessionStartedAt,
    durationMinutes,
    completed,
  });
  sessionStartedAt = null;
}

function toggleStepper() {
  stepperEl.classList.toggle("hidden");
  stepperLabelEl.textContent = mode === "focus" ? "focus min" : "break min";
}

function adjustDuration(amountMinutes) {
  const key = mode === "focus" ? "focusMinutes" : "breakMinutes";
  const newValue = Math.max(1, settings[key] + amountMinutes);
  settings[key] = newValue;
  window.api.saveSettings({ [key]: newValue });

  if (!running) {
    remainingSeconds = newValue * 60;
    updateClockDisplay();
  }
}

document.querySelectorAll(".step-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    adjustDuration(parseInt(btn.dataset.amount, 10));
  });
});

function showRandomQuote() {
  if (quotes.length === 0) return;
  let nextIndex = quoteIndex;
  while (nextIndex === quoteIndex && quotes.length > 1) {
    nextIndex = Math.floor(Math.random() * quotes.length);
  }
  quoteIndex = nextIndex;

  quoteTextEl.classList.add("fading");
  setTimeout(() => {
    quoteTextEl.textContent = '"' + quotes[quoteIndex] + '"';
    quoteTextEl.classList.remove("fading");
  }, 200);
}

quoteAreaEl.addEventListener("click", showRandomQuote);

function applyTheme(themeName) {
  document.body.setAttribute("data-theme", themeName);
  document.querySelectorAll(".swatch").forEach((s) => {
    s.classList.toggle("active", s.dataset.theme === themeName);
  });
}

function setDefaultTheme(themeName) {
  applyTheme(themeName);
  settings.defaultTheme = themeName;
  window.api.saveSettings({ defaultTheme: themeName });
  quoteTextEl.textContent = "default theme set \u2728";
  setTimeout(showRandomQuote, 1200);
}

document.querySelectorAll(".swatch").forEach((swatch) => {
  attachPressHandlers(swatch, {
    onTap: () => applyTheme(swatch.dataset.theme),
    onLongPress: () => setDefaultTheme(swatch.dataset.theme),
    duration: 550,
  });
  swatch.addEventListener("touchstart", () => swatch.classList.add("pressing"));
  swatch.addEventListener("touchend", () => swatch.classList.remove("pressing"));
  swatch.addEventListener("mousedown", () => swatch.classList.add("pressing"));
  swatch.addEventListener("mouseup", () => swatch.classList.remove("pressing"));
});

let idleTimer = null;
let screensaverActive = false;

function resetIdleTimer() {
  clearTimeout(idleTimer);
  if (screensaverActive) wakeFromScreensaver();
  idleTimer = setTimeout(showScreensaver, settings.idleMinutes * 60 * 1000);
}

function showScreensaver() {
  screensaverActive = true;
  screensaverEl.classList.remove("hidden");
  updateScreensaverClock();
  screensaverEl._clockInterval = setInterval(updateScreensaverClock, 1000);
}

function wakeFromScreensaver() {
  screensaverActive = false;
  screensaverEl.classList.add("hidden");
  clearInterval(screensaverEl._clockInterval);
}

function updateScreensaverClock() {
  const now = new Date();
  document.getElementById("screensaver-clock").textContent =
    now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  document.getElementById("screensaver-date").textContent =
    now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

["touchstart", "mousedown"].forEach((evt) => {
  document.addEventListener(evt, resetIdleTimer);
});

let pointerStartY = null;

document.addEventListener("pointerdown", (e) => {
  pointerStartY = e.clientY;
});

document.addEventListener("pointerup", (e) => {
  if (pointerStartY === null) return;

  const pointerEndY = e.clientY;
  const deltaY = pointerStartY - pointerEndY;
  const SWIPE_THRESHOLD = 60;

  if (deltaY > SWIPE_THRESHOLD && !historyPanelEl.classList.contains("visible")) {
    openHistoryPanel();
  } 
  
  else if (deltaY < -SWIPE_THRESHOLD && historyPanelEl.classList.contains("visible")) {
    closeHistoryPanel();
  }

  pointerStartY = null;
});

function openHistoryPanel() {
  historyPanelEl.classList.remove("hidden");
  historyPanelEl.classList.add("visible");
  renderHeatmap();
}

function closeHistoryPanel() {
  historyPanelEl.classList.remove("visible"); 
  historyPanelEl.classList.add("hidden");
}

async function renderHeatmap() {
  const history = await window.api.getHistory();
  const heatmapEl = document.getElementById("heatmap");
  const statsEl = document.getElementById("history-stats");
  heatmapEl.innerHTML = "";

  const DAYS = 35;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const minutesByDay = {};
  history.forEach((session) => {
    if (!session.completed) return;
    const day = new Date(session.timestamp);
    day.setHours(0, 0, 0, 0);
    const key = day.getTime();
    minutesByDay[key] = (minutesByDay[key] || 0) + session.durationMinutes;
  });

  let totalSessions = history.filter((s) => s.completed).length;

  for (let i = DAYS - 1; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);
    const key = day.getTime();
    const minutes = minutesByDay[key] || 0;

    const cell = document.createElement("div");
    cell.className = "heat-cell " + intensityClass(minutes);
    cell.title = day.toDateString() + ": " + minutes + " min";
    heatmapEl.appendChild(cell);
  }

  statsEl.textContent = totalSessions + " sessions completed";
}

function intensityClass(minutes) {
  if (minutes <= 0) return "heat-0";
  if (minutes < 25) return "heat-1";
  if (minutes < 50) return "heat-2";
  if (minutes < 100) return "heat-3";
  return "heat-4";
}

function spawnSparkles(container, count) {
  const symbols = ["\u2726", "\u2727", "\u2739", "\u22c6"];
  for (let i = 0; i < count; i++) {
    const el = document.createElement("span");
    el.className = "sparkle";
    el.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    el.style.left = Math.random() * 100 + "%";
    el.style.top = Math.random() * 100 + "%";
    el.style.animationDelay = (Math.random() * 6) + "s";
    container.appendChild(el);
  }
}

async function init() {
  settings = await window.api.getSettings();
  quotes = await window.api.getQuotes();

  applyTheme(settings.defaultTheme);
  remainingSeconds = settings.focusMinutes * 60;
  updateClockDisplay();
  showRandomQuote();

  spawnSparkles(sparkleLayerEl, 12);
  spawnSparkles(screensaverSparklesEl, 18);

  playBtn.addEventListener("click", toggleTimer);

  attachPressHandlers(clockEl, {
    onTap: toggleStepper,
    onLongPress: resetTimer,
    duration: 600,
    ringEl: document.getElementById("longpress-ring"),
  });

  resetIdleTimer();
}

init();