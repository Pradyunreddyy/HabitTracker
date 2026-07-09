(() => {
  "use strict";

  const STORAGE_KEY = "habit-ledger-data";
  const DAYS_TO_SHOW = 30;

  const form = document.getElementById("habitForm");
  const input = document.getElementById("habitInput");
  const listEl = document.getElementById("habitList");
  const emptyState = document.getElementById("emptyState");
  const template = document.getElementById("habitCardTemplate");
  const habitCountEl = document.getElementById("habitCount");
  const todayLongEl = document.getElementById("todayLong");

  // ---------- Date helpers (string-based, DST-safe) ----------

  function toDate(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  }

  function fromDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function todayStr() {
    return fromDate(new Date());
  }

  function addDays(dateStr, delta) {
    const dt = toDate(dateStr);
    dt.setDate(dt.getDate() + delta);
    return fromDate(dt);
  }

  function formatLong(dateStr) {
    return toDate(dateStr).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  // ---------- Storage ----------

  function loadHabits() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.error("Could not read habit ledger data:", err);
      return [];
    }
  }

  function saveHabits(habits) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
    } catch (err) {
      console.error("Could not save habit ledger data:", err);
    }
  }

  let habits = loadHabits();

  function uid() {
    return `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  // ---------- Streak calculation ----------

  function computeStreaks(marks) {
    const dates = Object.keys(marks)
      .filter((d) => marks[d])
      .sort();

    if (dates.length === 0) return { current: 0, best: 0 };

    let best = 1;
    let run = 1;
    for (let i = 1; i < dates.length; i++) {
      if (addDays(dates[i - 1], 1) === dates[i]) {
        run++;
      } else {
        run = 1;
      }
      if (run > best) best = run;
    }

    const today = todayStr();
    const yesterday = addDays(today, -1);
    let anchor = null;
    if (marks[today]) anchor = today;
    else if (marks[yesterday]) anchor = yesterday;

    let current = 0;
    if (anchor) {
      let d = anchor;
      while (marks[d]) {
        current++;
        d = addDays(d, -1);
      }
    }

    return { current, best: Math.max(best, current) };
  }

  // ---------- Rendering ----------

  function render() {
    listEl.innerHTML = "";
    emptyState.style.display = habits.length === 0 ? "block" : "none";
    habitCountEl.textContent = String(habits.length);

    habits.forEach((habit) => {
      const node = template.content.cloneNode(true);
      const card = node.querySelector(".habit-card");
      card.dataset.id = habit.id;

      node.querySelector(".habit-name").textContent = habit.name;
      node.querySelector(".since-date").textContent = formatLong(habit.createdAt);

      const { current, best } = computeStreaks(habit.marks);
      node.querySelector(".current-streak").textContent = String(current);
      node.querySelector(".best-streak").textContent = String(best);

      node.querySelector(".btn-retire").addEventListener("click", () => retireHabit(habit.id));

      buildCalendar(node.querySelector(".calendar-grid"), habit);

      listEl.appendChild(node);
    });
  }

  function buildCalendar(gridEl, habit) {
    const today = todayStr();
    const days = [];
    for (let i = DAYS_TO_SHOW - 1; i >= 0; i--) {
      days.push(addDays(today, -i));
    }

    const leadingBlanks = toDate(days[0]).getDay();
    for (let i = 0; i < leadingBlanks; i++) {
      const blank = document.createElement("div");
      blank.className = "day-cell is-blank";
      gridEl.appendChild(blank);
    }

    days.forEach((dateStr) => {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "day-cell";
      if (dateStr === today) cell.classList.add("is-today");
      if (habit.marks[dateStr]) cell.classList.add("is-marked");
      cell.dataset.date = dateStr;
      cell.setAttribute("aria-pressed", habit.marks[dateStr] ? "true" : "false");
      cell.setAttribute("aria-label", `${formatLong(dateStr)}${habit.marks[dateStr] ? ", completed" : ", not completed"}`);
      cell.title = formatLong(dateStr);

      const num = document.createElement("span");
      num.className = "day-num";
      num.textContent = String(toDate(dateStr).getDate());

      const stamp = document.createElement("span");
      stamp.className = "stamp-mark";
      stamp.setAttribute("aria-hidden", "true");

      cell.appendChild(num);
      cell.appendChild(stamp);

      cell.addEventListener("click", () => toggleMark(habit.id, dateStr, cell));

      gridEl.appendChild(cell);
    });
  }

  // ---------- Actions ----------

  function addHabit(name) {
    const trimmed = name.trim();
    if (!trimmed) return;

    const exists = habits.some((h) => h.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      input.setCustomValidity("You already have a page for this habit.");
      input.reportValidity();
      input.setCustomValidity("");
      return;
    }

    habits.push({
      id: uid(),
      name: trimmed,
      createdAt: todayStr(),
      marks: {},
    });

    saveHabits(habits);
    render();
    input.value = "";
    input.focus();
  }

  function toggleMark(habitId, dateStr, cellEl) {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    const wasMarked = !!habit.marks[dateStr];
    if (wasMarked) {
      delete habit.marks[dateStr];
    } else {
      habit.marks[dateStr] = true;
    }

    saveHabits(habits);

    // Update just this card's numbers + cell for a snappier feel
    const card = cellEl.closest(".habit-card");
    const { current, best } = computeStreaks(habit.marks);
    card.querySelector(".current-streak").textContent = String(current);
    card.querySelector(".best-streak").textContent = String(best);

    cellEl.classList.toggle("is-marked", !wasMarked);
    cellEl.setAttribute("aria-pressed", !wasMarked ? "true" : "false");

    if (!wasMarked) {
      cellEl.classList.remove("stamping");
      // force reflow so the animation can restart
      void cellEl.offsetWidth;
      cellEl.classList.add("stamping");
    }
  }

  function retireHabit(habitId) {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;
    const ok = window.confirm(`Retire "${habit.name}"? This removes its whole record.`);
    if (!ok) return;
    habits = habits.filter((h) => h.id !== habitId);
    saveHabits(habits);
    render();
  }

  // ---------- Init ----------

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    addHabit(input.value);
  });

  todayLongEl.textContent = formatLong(todayStr());

  render();
})();