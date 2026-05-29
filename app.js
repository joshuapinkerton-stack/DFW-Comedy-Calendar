const DATA_URL = "./data/events.json";

const state = {
  events: [],
  filteredEvents: [],
};

const elements = {
  themeToggle: document.querySelector(".theme-toggle"),
  themeLabel: document.querySelector(".theme-label"),
  filtersForm: document.querySelector("#filtersForm"),
  searchInput: document.querySelector("#searchInput"),
  cityFilter: document.querySelector("#cityFilter"),
  venueFilter: document.querySelector("#venueFilter"),
  dateRangeFilter: document.querySelector("#dateRangeFilter"),
  priceFilter: document.querySelector("#priceFilter"),
  quickChips: document.querySelectorAll(".quick-chip"),
  featuredEvents: document.querySelector("#featuredEvents"),
  featuredCount: document.querySelector("#featuredCount"),
  eventsGrid: document.querySelector("#eventsGrid"),
  emptyState: document.querySelector("#emptyState"),
  resultCount: document.querySelector("#resultCount"),
  upcomingSummary: document.querySelector("#upcomingSummary"),
  lastUpdated: document.querySelector("#lastUpdated"),
};

const formatDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function getEventStart(event) {
  return new Date(event.startDate);
}

function getUpcomingEvents(events) {
  const today = startOfToday();
  return events
    .filter((event) => getEventStart(event) >= today)
    .sort((a, b) => getEventStart(a) - getEventStart(b));
}

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function optionMarkup(value) {
  return `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[character];
  });
}

function populateFilters(events) {
  const cities = uniqueSorted(events.map((event) => event.city));
  const venues = uniqueSorted(events.map((event) => event.venue));

  elements.cityFilter.innerHTML = `<option value="">All cities</option>${cities
    .map(optionMarkup)
    .join("")}`;
  elements.venueFilter.innerHTML = `<option value="">All venues</option>${venues
    .map(optionMarkup)
    .join("")}`;
}

function eventMatchesSearch(event, query) {
  if (!query) return true;

  const searchable = [
    event.title,
    event.venue,
    event.city,
    event.region,
    event.description,
    event.priceDisplay,
    ...(event.tags || []),
  ]
    .join(" ")
    .toLowerCase();

  return searchable.includes(query);
}

function eventMatchesDateRange(event, range) {
  if (range === "all") return true;

  const today = startOfToday();
  const start = getEventStart(event);
  const end = new Date(today);

  if (range === "today") {
    return start.toDateString() === today.toDateString();
  }

  if (range === "weekend") {
    const day = today.getDay();
    const daysUntilFriday = (5 - day + 7) % 7;
    const friday = new Date(today);
    friday.setDate(today.getDate() + daysUntilFriday);
    const sunday = new Date(friday);
    sunday.setDate(friday.getDate() + 2);
    sunday.setHours(23, 59, 59, 999);
    return start >= friday && start <= sunday;
  }

  end.setDate(today.getDate() + Number(range));
  end.setHours(23, 59, 59, 999);
  return start >= today && start <= end;
}

function eventMatchesPrice(event, priceBand) {
  const minimum = Number(event.priceMin || 0);

  if (priceBand === "all") return true;
  if (priceBand === "free") return event.priceType === "free" || minimum === 0;
  if (priceBand === "under20") return minimum > 0 && minimum < 20;
  if (priceBand === "20to40") return minimum >= 20 && minimum <= 40;
  if (priceBand === "40plus") return minimum >= 40;

  return true;
}

function applyFilters() {
  const query = normalize(elements.searchInput.value);
  const city = elements.cityFilter.value;
  const venue = elements.venueFilter.value;
  const dateRange = elements.dateRangeFilter.value;
  const priceBand = elements.priceFilter.value;

  state.filteredEvents = state.events.filter((event) => {
    return (
      eventMatchesSearch(event, query) &&
      (!city || event.city === city) &&
      (!venue || event.venue === venue) &&
      eventMatchesDateRange(event, dateRange) &&
      eventMatchesPrice(event, priceBand)
    );
  });

  renderEvents(state.filteredEvents);
  renderCounts();
}

function renderCounts() {
  const count = state.filteredEvents.length;
  const total = state.events.length;
  const plural = count === 1 ? "event" : "events";

  elements.resultCount.textContent = `${count} ${plural} shown`;
  elements.upcomingSummary.textContent = `${total} upcoming DFW comedy events`;
}

function renderLastUpdated(events) {
  const newestDate = events
    .map((event) => new Date(event.lastUpdated))
    .filter((date) => !Number.isNaN(date.valueOf()))
    .sort((a, b) => b - a)[0];

  elements.lastUpdated.textContent = newestDate
    ? `Last updated ${formatDate.format(newestDate)}`
    : "Last updated unavailable";
}

function renderFeatured(events) {
  const featured = events.filter((event) => event.featured).slice(0, 3);

  elements.featuredCount.textContent = `${featured.length} picks`;
  elements.featuredEvents.innerHTML = featured.map(renderFeaturedCard).join("");
}

function renderFeaturedCard(event) {
  return `
    <article class="featured-card">
      <img src="${escapeHtml(event.image)}" alt="" loading="lazy">
      <div class="featured-card-content">
        <span class="featured-badge">Featured pick</span>
        <h3>${escapeHtml(event.title)}</h3>
        <div class="featured-meta">
          <span class="event-date">${escapeHtml(event.dateDisplay)}</span>
          <span class="event-price">${escapeHtml(event.priceDisplay)}</span>
        </div>
        <p>${escapeHtml(event.venue)} in ${escapeHtml(event.city)}</p>
        <span class="source-badge">Source: ${escapeHtml(event.source)}</span>
      </div>
    </article>
  `;
}

function renderEvents(events) {
  elements.eventsGrid.innerHTML = events.map(renderEventCard).join("");
  elements.emptyState.hidden = events.length > 0;
}

function renderEventCard(event) {
  const tags = event.tags
    .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
    .join("");

  return `
    <article class="event-card${event.featured ? " featured" : ""}">
      <div class="event-card-media">
        <img src="${escapeHtml(event.image)}" alt="" loading="lazy">
      </div>
      <div class="event-card-body">
        <div>
          <div class="event-topline">
            <span class="event-date">${escapeHtml(event.dateDisplay)}</span>
            <span class="event-time">${escapeHtml(event.timeDisplay)}</span>
            <span class="event-price">${escapeHtml(event.priceDisplay)}</span>
          </div>
          <h3>${escapeHtml(event.title)}</h3>
        </div>
        <p class="event-description">${escapeHtml(event.description)}</p>
        <dl class="event-details">
          <div>
            <dt>Venue</dt>
            <dd>${escapeHtml(event.venue)}</dd>
          </div>
          <div>
            <dt>City</dt>
            <dd>${escapeHtml(event.city)}</dd>
          </div>
        </dl>
        <div class="tags" aria-label="Tags">${tags}</div>
        <a class="source-link" href="${escapeHtml(event.sourceUrl)}" target="_blank" rel="noopener noreferrer">
          <span>Verified source</span>
          <strong>${escapeHtml(event.source)}</strong>
        </a>
      </div>
    </article>
  `;
}

function setQuickFilter(filter) {
  elements.searchInput.value = "";
  elements.cityFilter.value = "";
  elements.venueFilter.value = "";
  elements.dateRangeFilter.value = "all";
  elements.priceFilter.value = "all";

  if (filter === "weekend") {
    elements.dateRangeFilter.value = "weekend";
  }

  if (filter === "free") {
    elements.priceFilter.value = "free";
  }

  if (filter === "fort-worth") {
    elements.cityFilter.value = "Fort Worth";
  }

  elements.quickChips.forEach((chip) => {
    chip.classList.toggle("is-active", chip.dataset.quickFilter === filter);
  });

  applyFilters();
  document.querySelector("#events").scrollIntoView({ behavior: "smooth", block: "start" });
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("dfwComedyTheme", theme);
  const isDark = theme === "dark";
  elements.themeToggle.setAttribute("aria-pressed", String(isDark));
  elements.themeLabel.textContent = isDark ? "Light" : "Dark";
}

function initTheme() {
  const savedTheme = localStorage.getItem("dfwComedyTheme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  setTheme(savedTheme || (prefersDark ? "dark" : "light"));
}

async function loadEvents() {
  try {
    const response = await fetch(DATA_URL);

    if (!response.ok) {
      throw new Error(`Unable to load events: ${response.status}`);
    }

    const events = await response.json();
    state.events = getUpcomingEvents(events);
    state.filteredEvents = [...state.events];

    populateFilters(state.events);
    renderLastUpdated(events);
    renderFeatured(state.events);
    renderEvents(state.filteredEvents);
    renderCounts();
  } catch (error) {
    elements.resultCount.textContent = "Events could not be loaded";
    elements.upcomingSummary.textContent = "Unable to load event data";
    elements.lastUpdated.textContent = "Last updated unavailable";
    elements.emptyState.hidden = false;
    elements.emptyState.querySelector(".empty-title").textContent = "Event data is unavailable.";
    elements.emptyState.querySelector("p:last-child").textContent =
      "Please check that data/events.json is published with the site.";
    console.error(error);
  }
}

elements.themeToggle.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  setTheme(nextTheme);
});

elements.filtersForm.addEventListener("input", applyFilters);
elements.filtersForm.addEventListener("reset", () => {
  elements.quickChips.forEach((chip) => chip.classList.remove("is-active"));
  requestAnimationFrame(applyFilters);
});

elements.quickChips.forEach((chip) => {
  chip.addEventListener("click", () => setQuickFilter(chip.dataset.quickFilter));
});

initTheme();
loadEvents();
