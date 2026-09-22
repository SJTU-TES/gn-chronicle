import { readFile, mkdir, writeFile, cp } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const data = JSON.parse(await readFile(new URL("content/chronicle.json", root), "utf8"));
const template = await readFile(new URL("src/chronicle-template.html", root), "utf8");
const styles = new Set(["origin", "travel", "gathering", "reflection"]);
const seenIds = new Set();
const seenYears = new Set();
let previousDate = "";
let previousYear = "";
let eventCount = 0;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function requireText(record, key, context) {
  if (typeof record[key] !== "string" || !record[key].trim()) {
    throw new Error(`${context}: ${key} must be a nonempty string.`);
  }
}

if (!Array.isArray(data.years) || !data.years.length) {
  throw new Error("The chronicle needs at least one year group.");
}

for (const group of data.years) {
  for (const key of ["year", "label", "caption", "english"]) requireText(group, key, "Year group");
  if (!/^\d{4}$/.test(group.year) || seenYears.has(group.year) || group.year <= previousYear) {
    throw new Error("Year groups must have unique four-digit years in chronological order.");
  }
  if (group.prelude !== undefined && typeof group.prelude !== "boolean") {
    throw new Error(`Year ${group.year}: prelude must be a boolean.`);
  }
  if (!Array.isArray(group.events) || !group.events.length) throw new Error(`Year ${group.year} has no events.`);
  seenYears.add(group.year);
  previousYear = group.year;

  for (const event of group.events) {
    for (const key of ["id", "date", "datetime", "category", "title", "style", "number", "english"]) {
      requireText(event, key, `Event in ${group.year}`);
    }
    if (!/^[a-z][a-z0-9-]*$/.test(event.id) || seenIds.has(event.id)) {
      throw new Error(`Event id must be unique and URL-safe: ${event.id}`);
    }
    if (!styles.has(event.style)) throw new Error(`Unknown event style: ${event.style}`);
    if (!/^\d{4}-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?$/.test(event.datetime)) {
      throw new Error(`Invalid event date: ${event.datetime}`);
    }
    const normalizedDate = event.datetime.length === 7 ? `${event.datetime}-01` : event.datetime;
    const parsedDate = new Date(`${normalizedDate}T00:00:00Z`);
    if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== normalizedDate) {
      throw new Error(`Invalid calendar date: ${event.datetime}`);
    }
    if (!event.datetime.startsWith(`${group.year}-`) || normalizedDate < previousDate) {
      throw new Error(`Events must be grouped by year and ordered chronologically: ${event.id}`);
    }
    for (const key of ["description", "note"]) {
      if (event[key] !== undefined && typeof event[key] !== "string") {
        throw new Error(`${event.id}: ${key} must be a string when present.`);
      }
    }
    seenIds.add(event.id);
    previousDate = normalizedDate;
    eventCount += 1;
  }
}

const visuals = {
  origin: `<div class="event-visual system-visual" aria-hidden="true"><span class="visual-top-label">THE BEGINNING</span><div class="system-layers"><div><span>APPLICATION</span></div><div><span>KERNEL</span></div><div><span>HARDWARE</span></div><i></i></div><span class="visual-bottom-label">HELLO, WORLD<span>↗</span></span></div>`,
  travel: `<div class="event-visual journey-visual" aria-hidden="true"><span>OFF WE GO</span><svg viewBox="0 0 210 165"><g fill="none" stroke="currentColor" stroke-width="1"><circle cx="52" cy="118" r="23" opacity=".3"/><circle cx="156" cy="42" r="28" opacity=".3"/><path d="M52 118c-36-78 146 14 104-76" stroke-dasharray="3 5"/><path d="M18 139h172M29 19v12m-6-6h12M180 110v12m-6-6h12" opacity=".35"/></g><circle cx="52" cy="118" r="4" fill="#a65f3c"/><circle cx="156" cy="42" r="4" fill="#a65f3c"/><path d="m93 77 30 7-22 12 2-10z" fill="#8a997a"/></svg><span>GN · ON THE ROAD</span></div>`,
  gathering: `<div class="event-visual gathering-visual" aria-hidden="true"><span>GOOD TIMES, TOGETHER</span><svg viewBox="0 0 210 170"><g fill="none" stroke="currentColor" stroke-width="1"><circle cx="105" cy="85" r="44"/><circle cx="105" cy="85" r="30" opacity=".4"/><circle cx="105" cy="23" r="7"/><circle cx="105" cy="147" r="7"/><circle cx="51" cy="54" r="7"/><circle cx="159" cy="54" r="7"/><circle cx="51" cy="116" r="7"/><circle cx="159" cy="116" r="7"/><path d="M94 85h22m-11-11v22M24 17v12m-6-6h12M184 137v12m-6-6h12"/></g></svg><span>GN · AROUND THE TABLE</span></div>`,
  reflection: "",
};

function renderEvent(event, year) {
  const e = Object.fromEntries(Object.entries(event).map(([key, value]) => [key, escapeHtml(value)]));
  const description = event.description ? `<p class="event-description">${e.description}</p>` : "";
  const note = event.note ? `<p class="event-note">${e.note}</p>` : "";
  return `<article id="${e.id}" class="chronicle-event event-${e.style} reveal" data-year="${escapeHtml(year)}" aria-labelledby="title-${e.id}">
  <span class="event-dot" aria-hidden="true"></span>
  <div class="event-date"><time datetime="${e.datetime}">${e.date}</time><span class="event-category">${e.category}</span></div>
  <div class="event-body">
    <div class="event-copy"><p class="event-kicker"><span>${e.number} /</span> ${e.english}</p><h4 id="title-${e.id}">${e.title}</h4>${description}${note}</div>
    ${visuals[event.style]}
  </div>
</article>`;
}

const yearLinks = data.years.map((group) => `<a data-year-link href="#year-${escapeHtml(group.year)}">${escapeHtml(group.label)}</a>`).join("");
const timelineGroups = data.years.map((group) => {
  const year = escapeHtml(group.year);
  return `<section class="year-group${group.prelude ? " year-prelude" : ""}" id="year-${year}" data-year="${year}" aria-labelledby="heading-${year}">
  <div class="year-label reveal">${group.prelude ? '<span class="prelude-label">前序 / PROLOGUE</span>' : ""}<h3 id="heading-${year}">${year}</h3><span>${escapeHtml(group.caption)}</span><small>${escapeHtml(group.english)}</small></div>
  <div class="year-events">${group.events.map((event) => renderEvent(event, group.year)).join("\n")}</div>
</section>`;
}).join("\n");

for (const marker of ["__GN_YEAR_LINKS__", "__GN_TIMELINE_GROUPS__"]) {
  if (template.split(marker).length !== 2) throw new Error(`Template must contain ${marker} exactly once.`);
}

// Static GitHub Pages build. The passcode is an entrance, not private access control.
const output = template.replace("__GN_YEAR_LINKS__", () => yearLinks).replace("__GN_TIMELINE_GROUPS__", () => timelineGroups);
const destination = new URL("site/index.html", root);
await mkdir(new URL("site/", root), { recursive: true });
await writeFile(destination, output, "utf8");
console.log(`Built ${eventCount} events across ${data.years.length} year groups into ${fileURLToPath(destination)}.`);

await cp(new URL("assets/", root), new URL("site/assets/", root), { recursive: true });
await writeFile(new URL("site/.nojekyll", root), "");
