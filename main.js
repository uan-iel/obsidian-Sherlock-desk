"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => SherlockOSPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian4 = require("obsidian");
var import_fs = require("fs");
var import_path = require("path");
var import_electron = require("electron");

// src/data.ts
var import_obsidian = require("obsidian");
var ENTITY_TYPES = ["case", "task", "schedule", "collection", "evidence", "place"];
async function ensureFolders(app, settings) {
  const folders = [
    settings.caseFolder,
    settings.taskFolder,
    settings.scheduleFolder,
    settings.collectionFolder,
    settings.evidenceFolder,
    settings.placeFolder
  ];
  for (const folder of folders) {
    const normalized = (0, import_obsidian.normalizePath)(folder);
    const segments = normalized.split("/").filter(Boolean);
    let current = "";
    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      const currentPath = (0, import_obsidian.normalizePath)(current);
      if (app.vault.getAbstractFileByPath(currentPath)) {
        continue;
      }
      try {
        await app.vault.createFolder(currentPath);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes("Folder already exists")) {
          throw error;
        }
      }
    }
  }
}
function buildFrontmatter(type, title, extras = {}) {
  const created = (/* @__PURE__ */ new Date()).toISOString();
  const lines = [
    "---",
    `type: ${type}`,
    `title: "${title.replace(/"/g, '\\"')}"`,
    `created: ${created}`,
    `updated: ${created}`
  ];
  Object.entries(extras).forEach(([key, value]) => {
    lines.push(`${key}: ${value}`);
  });
  lines.push("---", "");
  return lines.join("\n");
}
function buildCaseTemplate(title) {
  return `${buildFrontmatter("case", title, {
    status: "open",
    priority: "medium",
    tags: "[]"
  })}# ${title}

## \u6848\u60C5\u6982\u89C8
- \u80CC\u666F\uFF1A
- \u5F53\u524D\u76EE\u6807\uFF1A
- \u4E0B\u4E00\u6B65\u63A8\u7406\uFF1A

## \u76F8\u5173\u7EBF\u7D22
- 

## \u5173\u8054\u8D44\u6599
- 
`;
}
function buildTaskTemplate(title) {
  return `${buildFrontmatter("task", title, {
    status: "backlog",
    priority: "medium",
    case: '""',
    casePath: '""'
  })}# ${title}

## \u4EFB\u52A1\u8BF4\u660E
- 

## \u6240\u5C5E\u6848\u4EF6
- 
`;
}
function buildScheduleTemplate(title) {
  return `${buildFrontmatter("schedule", title, {
    day: `"${formatLocalDate(/* @__PURE__ */ new Date())}"`,
    start: '"09:00"',
    end: '"10:00"',
    durationMinutes: "60",
    relatedTask: '""',
    relatedTaskPath: '""'
  })}# ${title}

## \u8C03\u67E5\u5B89\u6392
- \u76EE\u6807\uFF1A
- \u51C6\u5907\u4E8B\u9879\uFF1A
`;
}
function buildCollectionTemplate(title) {
  return `${buildFrontmatter("collection", title, {
    status: "reading",
    medium: "book",
    case: '""',
    casePath: '""',
    rating: "0"
  })}# ${title}

## \u7814\u8BFB\u8BB0\u5F55
- \u6458\u6284\uFF1A
- \u89C2\u70B9\uFF1A
- \u590D\u76D8\uFF1A

## \u6848\u4EF6\u5173\u8054
- 
`;
}
function buildEvidenceTemplate(title, caseName = "", casePath = "") {
  return `${buildFrontmatter("evidence", title, {
    case: `"${caseName.replace(/"/g, '\\"')}"`,
    casePath: `"${casePath.replace(/"/g, '\\"')}"`,
    source: '""'
  })}# ${title}

## \u8BC1\u7269\u8BF4\u660E
- \u6765\u6E90\uFF1A
- \u89C2\u5BDF\uFF1A
- \u63A8\u8BBA\uFF1A

## \u5173\u8054\u6848\u4EF6
- ${caseName || "\u672A\u5173\u8054"}
`;
}
function buildPlaceTemplate(title, latitude, longitude, latitudeHemisphere = "", longitudeHemisphere = "") {
  return `${buildFrontmatter("place", title, {
    city: `"${title.replace(/"/g, '\\"')}"`,
    country: '""',
    latitude: latitude === void 0 ? '""' : String(latitude),
    longitude: longitude === void 0 ? '""' : String(longitude),
    latitudeHemisphere: `"${latitudeHemisphere}"`,
    longitudeHemisphere: `"${longitudeHemisphere}"`,
    visitedAt: `"${formatLocalDate(/* @__PURE__ */ new Date())}"`,
    cover: '""',
    case: '""',
    casePath: '""'
  })}# ${title}

## \u5230\u8BBF\u8BB0\u5F55
- \u65F6\u95F4\uFF1A
- \u7167\u7247\uFF1A
- \u8BB0\u5FC6\uFF1A

## \u5173\u8054
- 
`;
}
async function collectWorkspaceData(app) {
  const files = app.vault.getMarkdownFiles();
  const cases = [];
  const tasks = [];
  const schedules = [];
  const collections = [];
  const evidence = [];
  const places = [];
  for (const file of files) {
    const cache = app.metadataCache.getFileCache(file);
    const frontmatter = cache?.frontmatter;
    const type = frontmatter?.type;
    if (!ENTITY_TYPES.includes(type)) {
      continue;
    }
    const base = {
      filePath: file.path,
      name: String(frontmatter?.title ?? file.basename),
      type,
      created: asString(frontmatter?.created),
      updated: asString(frontmatter?.updated)
    };
    if (type === "case") {
      cases.push({
        ...base,
        type,
        status: asCaseStatus(frontmatter?.status),
        priority: asPriority(frontmatter?.priority),
        deadline: asString(frontmatter?.deadline),
        tags: Array.isArray(frontmatter?.tags) ? frontmatter.tags.map(String) : []
      });
    }
    if (type === "task") {
      tasks.push({
        ...base,
        type,
        status: asTaskStatus(frontmatter?.status),
        case: asString(frontmatter?.case),
        casePath: asString(frontmatter?.casePath),
        priority: asPriority(frontmatter?.priority),
        due: asString(frontmatter?.due)
      });
    }
    if (type === "schedule") {
      schedules.push({
        ...base,
        type,
        day: asString(frontmatter?.day),
        start: asString(frontmatter?.start),
        end: asString(frontmatter?.end),
        durationMinutes: asNumber(frontmatter?.durationMinutes),
        relatedTask: asString(frontmatter?.relatedTask),
        relatedTaskPath: asString(frontmatter?.relatedTaskPath)
      });
    }
    if (type === "collection") {
      collections.push({
        ...base,
        type,
        status: asCollectionStatus(frontmatter?.status),
        medium: asCollectionMedium(frontmatter?.medium),
        case: asString(frontmatter?.case),
        casePath: asString(frontmatter?.casePath),
        rating: asNumber(frontmatter?.rating)
      });
    }
    if (type === "evidence") {
      evidence.push({
        ...base,
        type,
        case: asString(frontmatter?.case),
        casePath: asString(frontmatter?.casePath),
        source: asString(frontmatter?.source)
      });
    }
    if (type === "place") {
      places.push({
        ...base,
        type,
        city: asString(frontmatter?.city),
        country: asString(frontmatter?.country),
        latitude: asNumber(frontmatter?.latitude),
        longitude: asNumber(frontmatter?.longitude),
        visitedAt: asString(frontmatter?.visitedAt),
        cover: asString(frontmatter?.cover),
        case: asString(frontmatter?.case),
        casePath: asString(frontmatter?.casePath)
      });
    }
  }
  cases.sort(byUpdatedDesc);
  tasks.sort(byUpdatedDesc);
  schedules.sort(byUpdatedDesc);
  collections.sort(byUpdatedDesc);
  evidence.sort(byUpdatedDesc);
  places.sort(byUpdatedDesc);
  return { cases, tasks, schedules, collections, evidence, places };
}
function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
async function createTypedNote(app, folder, title, template) {
  const safeName = title.replace(/[\\/:*?"<>|]/g, "-").trim() || "Untitled";
  const filePath = (0, import_obsidian.normalizePath)(`${folder}/${safeName}.md`);
  const existing = app.vault.getAbstractFileByPath(filePath);
  if (existing instanceof import_obsidian.TFile) {
    return existing;
  }
  return app.vault.create(filePath, template);
}
function asString(value) {
  return typeof value === "string" ? value : void 0;
}
function asPriority(value) {
  return value === "low" || value === "medium" || value === "high" ? value : void 0;
}
function asNumber(value) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : void 0;
  }
  return void 0;
}
function asCaseStatus(value) {
  return value === "active" || value === "archived" ? value : "open";
}
function asTaskStatus(value) {
  return value === "scheduled" || value === "done" ? value : "backlog";
}
function asCollectionStatus(value) {
  return value === "queued" || value === "reading" || value === "finished" ? value : void 0;
}
function asCollectionMedium(value) {
  return value === "book" || value === "movie" || value === "series" || value === "album" || value === "article" || value === "other" ? value : void 0;
}
function byUpdatedDesc(a, b) {
  return (b.updated ?? "").localeCompare(a.updated ?? "");
}

// src/settings.ts
var import_obsidian2 = require("obsidian");
var SherlockSettingTab = class extends import_obsidian2.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Sherlock OS Settings" });
    this.addTextSetting(containerEl, "\u6848\u4EF6\u6587\u4EF6\u5939", this.plugin.settings.caseFolder, async (value) => {
      this.plugin.settings.caseFolder = value.trim() || "Sherlock OS/Cases";
      await this.plugin.saveSettings();
    });
    this.addTextSetting(containerEl, "\u4EFB\u52A1\u6587\u4EF6\u5939", this.plugin.settings.taskFolder, async (value) => {
      this.plugin.settings.taskFolder = value.trim() || "Sherlock OS/Tasks";
      await this.plugin.saveSettings();
    });
    this.addTextSetting(containerEl, "\u6392\u671F\u6587\u4EF6\u5939", this.plugin.settings.scheduleFolder, async (value) => {
      this.plugin.settings.scheduleFolder = value.trim() || "Sherlock OS/Schedules";
      await this.plugin.saveSettings();
    });
    new import_obsidian2.Setting(containerEl).setName("\u96FE\u6C14\u5F3A\u5EA6").setDesc("\u63A7\u5236\u9996\u9875\u6C1B\u56F4\u5C42\u7684\u5B58\u5728\u611F\u3002").addSlider(
      (slider) => slider.setLimits(0, 100, 1).setValue(this.plugin.settings.fogDensity).setDynamicTooltip().onChange(async (value) => {
        this.plugin.settings.fogDensity = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName("\u52A8\u6001\u5F3A\u5EA6").setDesc("\u4E3A\u540E\u7EED\u9996\u9875\u52A8\u6001\u548C\u5468\u6392\u671F\u52A8\u753B\u9884\u7559\u3002").addSlider(
      (slider) => slider.setLimits(0, 100, 1).setValue(this.plugin.settings.motionIntensity).setDynamicTooltip().onChange(async (value) => {
        this.plugin.settings.motionIntensity = value;
        await this.plugin.saveSettings();
      })
    );
  }
  addTextSetting(containerEl, name, value, onChange) {
    new import_obsidian2.Setting(containerEl).setName(name).addText((text) => text.setPlaceholder(value).setValue(value).onChange(onChange));
  }
};

// src/view.ts
var import_obsidian3 = require("obsidian");
var SHERLOCK_VIEW_TYPE = "sherlock-os-dashboard";
var LEGACY_SHERLOCK_VIEW_TYPE = "sherlock-os-workspace";
var ENTRY_TRANSITION_MS = 2600;
var DEFAULT_SCHEDULE_DURATION_MINUTES = 60;
var MAP_CENTER_LONGITUDE = 105;
var WEEK_DAYS = [
  { label: "Mon", offset: 0 },
  { label: "Tue", offset: 1 },
  { label: "Wed", offset: 2 },
  { label: "Thu", offset: 3 },
  { label: "Fri", offset: 4 },
  { label: "Sat", offset: 5 },
  { label: "Sun", offset: 6 }
];
var TIME_SLOTS = ["08:00", "10:00", "12:00", "14:00", "16:00", "19:00"];
var SherlockWorkspaceView = class extends import_obsidian3.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.screen = "entry";
    this.hasEntered = false;
    this.plugin = plugin;
  }
  getViewType() {
    return SHERLOCK_VIEW_TYPE;
  }
  getDisplayText() {
    return "Sherlock";
  }
  getIcon() {
    return "search-check";
  }
  async onOpen() {
    try {
      this.contentEl.empty();
      this.contentEl.addClass("sherlock-os-view");
      await this.resetToEntry();
    } catch (error) {
      this.plugin.debugLog(`view:onOpen:error:${error instanceof Error ? error.stack ?? error.message : String(error)}`);
      this.renderFallback(error);
    }
  }
  async onClose() {
    if (this.entryTimer) {
      window.clearTimeout(this.entryTimer);
      this.entryTimer = void 0;
    }
  }
  async refresh() {
    try {
      await this.renderCurrentScreen();
    } catch (error) {
      this.plugin.debugLog(`view:refresh:error:${error instanceof Error ? error.stack ?? error.message : String(error)}`);
      this.renderFallback(error);
    }
  }
  async resetToEntry() {
    if (this.entryTimer) {
      window.clearTimeout(this.entryTimer);
      this.entryTimer = void 0;
    }
    this.selectedCasePath = void 0;
    this.hasEntered = false;
    this.screen = "entry";
    await this.renderCurrentScreen();
  }
  async renderCurrentScreen() {
    if (this.screen === "entry" && !this.hasEntered) {
      this.renderEntryScreen();
      return;
    }
    if (this.screen === "case" && this.selectedCasePath) {
      await this.renderCaseWorkspace(this.selectedCasePath);
      return;
    }
    if (this.screen === "cases") {
      await this.renderCaseDesk();
      return;
    }
    if (this.screen === "reading") {
      await this.renderReadingDesk();
      return;
    }
    if (this.screen === "footprints") {
      await this.renderFootprintDesk();
      return;
    }
    await this.renderHome();
  }
  renderEntryScreen() {
    this.contentEl.empty();
    const imageUrl = this.plugin.getEntryImageUrl();
    const entry = this.contentEl.createDiv({ cls: "sherlock-entry-screen is-warming" });
    entry.style.backgroundImage = `linear-gradient(180deg, rgba(7, 9, 11, 0.08), rgba(6, 7, 8, 0.28)), url("${imageUrl}")`;
    entry.createDiv({ cls: "sherlock-entry-ambient" });
    entry.createDiv({ cls: "sherlock-entry-frame" });
    entry.createDiv({ cls: "sherlock-entry-veil" });
    const bookButton = entry.createEl("button", {
      cls: "sherlock-entry-book",
      attr: {
        "aria-label": "Enter Sherlock OS"
      }
    });
    bookButton.createSpan({ cls: "sherlock-entry-ring" });
    bookButton.createSpan({ cls: "sherlock-entry-orbit" });
    const caption = entry.createDiv({ cls: "sherlock-entry-caption" });
    caption.createEl("span", { text: "Sherlock" });
    caption.createEl("small", { text: "221B case console" });
    const hint = entry.createDiv({ cls: "sherlock-entry-hint" });
    hint.setText("\u70B9\u51FB\u4E2D\u592E\u5377\u5B97\uFF0C\u70B9\u4EAE\u6848\u4EF6\u684C");
    const preload = new Image();
    preload.src = imageUrl;
    const imageReady = preload.decode ? preload.decode() : Promise.resolve();
    imageReady.then(() => entry.addClass("is-ready")).catch(() => entry.addClass("is-ready"));
    let entering = false;
    this.registerDomEvent(bookButton, "click", () => {
      if (entering) {
        return;
      }
      entering = true;
      bookButton.setAttribute("disabled", "true");
      window.requestAnimationFrame(() => {
        entry.removeClass("is-warming");
        entry.addClass("is-entering");
      });
      this.entryTimer = window.setTimeout(async () => {
        this.hasEntered = true;
        this.screen = "home";
        await this.renderHome();
      }, ENTRY_TRANSITION_MS);
    });
  }
  async renderHome() {
    this.plugin.debugLog("view:render:start");
    const data = await this.plugin.getWorkspaceData();
    this.contentEl.empty();
    const shell2 = this.contentEl.createDiv({ cls: "sherlock-shell sherlock-home-shell" });
    shell2.dataset.period = this.resolvePeriod();
    this.createParlorBackdrop(shell2);
    shell2.createDiv({ cls: "sherlock-atmosphere sherlock-fog-layer" });
    shell2.createDiv({ cls: "sherlock-atmosphere sherlock-grain-layer" });
    shell2.createDiv({ cls: "sherlock-atmosphere sherlock-map-layer" });
    const hero = shell2.createDiv({ cls: "sherlock-hero sherlock-home-hero" });
    const copy = hero.createDiv();
    copy.createEl("p", { cls: "sherlock-kicker", text: "221B Baker Street / Home Hall" });
    copy.createEl("h1", { cls: "sherlock-title", text: "Sherlock" });
    copy.createEl("p", {
      cls: "sherlock-editorial-note",
      text: this.resolvePeriod() === "night" ? "\u591C\u8272\u91CC\u7684\u4F26\u6566\u66F4\u9002\u5408\u63A8\u7406\u3002\u628A\u7EBF\u7D22\u3001\u65E5\u7A0B\u8868\u3001\u7814\u7A76\u4E0E\u56DE\u5FC6\u6574\u7406\u8FDB\u540C\u4E00\u5F20\u6848\u4EF6\u684C\u3002" : "\u767D\u663C\u9002\u5408\u5F52\u6863\u4E0E\u6392\u7A0B\u3002\u8BA9\u4F60\u7684\u7B14\u8BB0\u3001\u4E8B\u52A1\u4E0E\u8D44\u6599\u50CF\u6848\u5377\u4E00\u6837\u88AB\u7CFB\u7EDF\u6574\u7406\u3002"
    });
    const hub = shell2.createDiv({ cls: "sherlock-home-hub" });
    this.createHomePortal(hub, {
      label: "PROJECT DESK",
      title: "\u6848\u4EF6\u5377\u5B97\u4E0E\u8C03\u67E5\u6392\u671F",
      text: `\u7BA1\u7406 ${data.cases.length} \u5B97\u6848\u4EF6\u3001${data.tasks.filter((item) => item.status !== "done").length} \u6761\u7EBF\u7D22\u4EFB\u52A1\u548C ${data.schedules.length} \u6761\u6392\u671F\u3002`,
      button: "\u6253\u5F00\u6848\u4EF6\u684C",
      screen: "cases",
      tone: "board"
    });
    this.createHomePortal(hub, {
      label: "ARCHIVE DESK",
      title: "\u8BC1\u7269\u7814\u8BFB\u4E0E\u6863\u6848\u67DC",
      text: `\u6B63\u5728\u7814\u8BFB ${data.collections.filter((item) => item.status !== "finished").length} \u9879\uFF0C\u8BC1\u7269\u67DC\u5DF2\u6709 ${data.evidence.length} \u4EFD\u53EF\u7F16\u8F91\u6863\u6848\u3002`,
      button: "\u6253\u5F00\u6863\u6848\u684C",
      screen: "reading",
      tone: "study"
    });
    this.createHomePortal(hub, {
      label: "MEMORY MAP",
      title: "\u8DB3\u8FF9\u5730\u56FE",
      text: `${data.places.length} \u4E2A\u57CE\u5E02\u5149\u70B9\u3002\u6BCF\u6B21\u5230\u8BBF\u90FD\u53EF\u4EE5\u6C89\u6DC0\u6210\u7167\u7247\u3001\u65E5\u671F\u4E0E\u7B14\u8BB0\u3002`,
      button: "\u6253\u5F00\u5730\u56FE",
      screen: "footprints",
      tone: "map"
    });
    this.plugin.debugLog("view:render:complete");
  }
  async renderCaseDesk() {
    const data = await this.plugin.getWorkspaceData();
    this.contentEl.empty();
    const shell2 = this.createDeskShell("sherlock-case-desk-shell");
    this.renderDeskHeader(shell2, "Project Desk", "\u6848\u4EF6\u5377\u5B97\u4E0E\u8C03\u67E5\u6392\u671F", "\u6848\u4EF6\u3001\u4EFB\u52A1\u548C\u672C\u5468\u8C03\u67E5\u6392\u671F\u653E\u5728\u540C\u4E00\u4E2A\u5DE5\u4F5C\u53F0\u91CC\uFF0C\u5148\u9009\u6848\u4EF6\uFF0C\u518D\u628A\u771F\u6B63\u8981\u6267\u884C\u7684\u7EBF\u7D22\u6295\u9012\u5230\u5468\u677F\u3002", [
      { label: "\u65B0\u5EFA\u6848\u4EF6", action: async () => this.plugin.createCaseNote() },
      { label: "\u65B0\u5EFA\u4EFB\u52A1", action: async () => this.plugin.createTaskNote() },
      { label: "\u65B0\u5EFA\u6392\u671F", action: async () => this.plugin.createScheduleNote(), secondary: true }
    ]);
    const grid = shell2.createDiv({ cls: "sherlock-grid sherlock-desk-grid" });
    this.renderCaseBoard(grid, data.cases);
    this.renderInvestigationScheduler(grid, data);
  }
  async renderReadingDesk() {
    const data = await this.plugin.getWorkspaceData();
    this.contentEl.empty();
    const shell2 = this.createDeskShell("sherlock-reading-desk-shell");
    this.renderDeskHeader(shell2, "Archive Desk", "\u8BC1\u7269\u7814\u8BFB\u4E0E\u6863\u6848\u67DC", "\u6B63\u5728\u8BFB\u3001\u6B63\u5728\u770B\u3001\u6B63\u5728\u7814\u7A76\u7684\u5185\u5BB9\u5148\u7559\u5728\u8BC1\u7269\u7814\u8BFB\uFF1B\u786E\u8BA4\u6C89\u6DC0\u540E\uFF0C\u4E00\u952E\u5F52\u5165\u8BC1\u7269\u67DC\uFF0C\u4E4B\u540E\u4ECD\u53EF\u7F16\u8F91\u3001\u5220\u9664\u548C\u5173\u8054\u6848\u4EF6\u3002", [
      { label: "\u65B0\u5EFA\u7814\u8BFB", action: async () => this.plugin.createCollectionNote() },
      { label: "\u65B0\u5EFA\u8BC1\u7269", action: async () => this.plugin.createEvidenceNote(), secondary: true }
    ]);
    const grid = shell2.createDiv({ cls: "sherlock-grid sherlock-desk-grid" });
    this.renderReadingModule(grid, data);
    this.renderArchiveModule(grid, data);
  }
  async renderFootprintDesk() {
    const data = await this.plugin.getWorkspaceData();
    this.contentEl.empty();
    const shell2 = this.createDeskShell("sherlock-footprint-desk-shell");
    this.renderDeskHeader(shell2, "Memory Map", "\u8DB3\u8FF9\u5730\u56FE", "\u57CE\u5E02\u662F\u8BB0\u5FC6\u5750\u6807\u3002\u70B9\u5F00\u4E00\u6B21\u5230\u8BBF\uFF0C\u5C31\u80FD\u7EE7\u7EED\u8865\u5C01\u9762\u3001\u7167\u7247\u5899\u3001\u65F6\u95F4\u3001\u7B14\u8BB0\u548C\u6848\u4EF6/\u9605\u8BFB\u5173\u8054\u3002", []);
    this.renderFootprintModule(shell2, data);
  }
  async navigateTo(screen) {
    this.screen = screen;
    this.selectedCasePath = void 0;
    await this.renderCurrentScreen();
  }
  createHomePortal(container, config) {
    const portal = container.createEl("button", { cls: `sherlock-home-portal ${config.tone}` });
    portal.createEl("span", { cls: "sherlock-stage-label", text: config.label });
    portal.createEl("strong", { text: config.title });
    portal.createEl("p", { text: config.text });
    portal.createEl("b", { text: config.button });
    this.registerDomEvent(portal, "click", async () => this.navigateTo(config.screen));
  }
  createDeskShell(extraClass) {
    const shell2 = this.contentEl.createDiv({ cls: `sherlock-shell sherlock-desk-shell ${extraClass}` });
    shell2.dataset.period = this.resolvePeriod();
    shell2.createDiv({ cls: "sherlock-atmosphere sherlock-fog-layer" });
    shell2.createDiv({ cls: "sherlock-atmosphere sherlock-grain-layer" });
    return shell2;
  }
  renderDeskHeader(shell2, kicker, title, subtitle, actions) {
    const header = shell2.createDiv({ cls: "sherlock-desk-header" });
    const backButton = header.createEl("button", { cls: "sherlock-icon-button", text: "\u2190" });
    this.registerDomEvent(backButton, "click", async () => this.navigateTo("home"));
    const copy = header.createDiv({ cls: "sherlock-desk-heading" });
    copy.createEl("span", { cls: "sherlock-kicker", text: kicker });
    copy.createEl("h1", { text: title });
    copy.createEl("p", { text: subtitle });
    const actionGroup = header.createDiv({ cls: "sherlock-actions sherlock-desk-actions" });
    actions.forEach((action) => {
      this.createAction(actionGroup, action.label, action.action, action.secondary);
    });
  }
  renderCaseBoard(container, cases) {
    const card = container.createDiv({ cls: "sherlock-panel sherlock-card full" });
    const header = card.createDiv({ cls: "sherlock-card-heading" });
    const titleBlock = header.createDiv();
    titleBlock.createEl("h3", { text: "\u6848\u4EF6\u5377\u5B97" });
    titleBlock.createEl("p", { text: "\u6309\u72B6\u6001\u6574\u7406\u6240\u6709\u6848\u4EF6\uFF0C\u70B9\u51FB\u8FDB\u5165\u6848\u4EF6\u8BE6\u60C5\u5DE5\u4F5C\u53F0\u3002" });
    const newCaseButton = header.createEl("button", { cls: "sherlock-mini-button sherlock-mini-button-strong", text: "New Case" });
    this.registerDomEvent(newCaseButton, "click", async () => this.plugin.createCaseNote());
    const board = card.createDiv({ cls: "sherlock-board" });
    this.renderCaseColumn(board, "Open", cases.filter((item) => item.status === "open"));
    this.renderCaseColumn(board, "Active", cases.filter((item) => item.status === "active"));
    this.renderCaseColumn(board, "Archived", cases.filter((item) => item.status === "archived"));
  }
  renderCaseColumn(container, title, items) {
    const column = container.createDiv({ cls: "sherlock-board-column" });
    const columnHeader = column.createDiv({ cls: "sherlock-board-column-header" });
    columnHeader.createEl("h4", { text: title });
    columnHeader.createEl("span", { text: String(items.length) });
    if (items.length === 0) {
      column.createEl("p", { cls: "sherlock-empty", text: "\u6682\u65E0\u8BB0\u5F55" });
      return;
    }
    const list = column.createEl("ul", { cls: "sherlock-list" });
    items.slice(0, 4).forEach((item) => {
      const row = list.createEl("li", { cls: "sherlock-list-item sherlock-case-row" });
      const body = row.createDiv({ cls: "sherlock-list-copy" });
      body.createEl("strong", { text: item.name });
      const linkedTasks = this.pluginTaskCount(item.filePath);
      body.createEl("span", {
        cls: "sherlock-meta",
        text: item.deadline ? `\u622A\u6B62 ${item.deadline}` : item.filePath
      });
      body.createEl("span", {
        cls: "sherlock-meta",
        text: linkedTasks > 0 ? `${linkedTasks} linked task${linkedTasks > 1 ? "s" : ""}` : "No linked tasks yet"
      });
      const progress = body.createDiv({ cls: "sherlock-case-progress" });
      const progressFill = progress.createDiv();
      progressFill.style.width = `${this.resolveCaseProgress(item.filePath)}%`;
      body.createEl("span", { cls: "sherlock-row-affordance", text: "Click to open workspace" });
      const side = row.createDiv({ cls: "sherlock-list-actions" });
      side.createEl("span", { cls: `sherlock-chip priority-${item.priority ?? "medium"}`, text: this.renderPriorityLabel(item.priority) });
      const action = side.createEl("button", { cls: "sherlock-mini-button", text: "+Task" });
      const edit = side.createEl("button", { cls: "sherlock-mini-button", text: "\u7F16\u8F91" });
      const remove = side.createEl("button", { cls: "sherlock-mini-button danger", text: "\u5220\u9664" });
      this.registerDomEvent(action, "click", async (event) => {
        event.stopPropagation();
        await this.plugin.createTaskFromCase(item.filePath);
      });
      this.registerDomEvent(edit, "click", async (event) => {
        event.stopPropagation();
        await this.plugin.openPath(item.filePath);
      });
      this.registerDomEvent(remove, "click", async (event) => {
        event.stopPropagation();
        await this.plugin.deletePath(item.filePath);
      });
      this.registerDomEvent(row, "click", async () => {
        this.selectedCasePath = item.filePath;
        this.screen = "case";
        await this.renderCurrentScreen();
      });
      this.registerDomEvent(row, "dblclick", async () => this.plugin.openPath(item.filePath));
    });
  }
  async renderCaseWorkspace(casePath) {
    this.plugin.debugLog("view:case:render:start");
    const data = await this.plugin.getWorkspaceData();
    const currentCase = data.cases.find((item) => item.filePath === casePath);
    if (!currentCase) {
      this.screen = "cases";
      await this.renderCaseDesk();
      return;
    }
    const caseTasks = data.tasks.filter((task) => task.casePath === currentCase.filePath);
    const caseSchedules = data.schedules.filter((schedule) => {
      if (!schedule.relatedTaskPath) {
        return false;
      }
      return caseTasks.some((task) => task.filePath === schedule.relatedTaskPath);
    });
    this.contentEl.empty();
    const shell2 = this.contentEl.createDiv({ cls: "sherlock-shell sherlock-case-shell" });
    shell2.dataset.period = this.resolvePeriod();
    shell2.createDiv({ cls: "sherlock-atmosphere sherlock-fog-layer" });
    shell2.createDiv({ cls: "sherlock-atmosphere sherlock-grain-layer" });
    const header = shell2.createDiv({ cls: "sherlock-case-header" });
    const backButton = header.createEl("button", { cls: "sherlock-icon-button", text: "\u2190" });
    this.registerDomEvent(backButton, "click", async () => {
      this.screen = "cases";
      this.selectedCasePath = void 0;
      await this.renderCaseDesk();
    });
    const titleBlock = header.createDiv({ cls: "sherlock-case-title-block" });
    titleBlock.createEl("span", { cls: "sherlock-kicker", text: "Case Workspace" });
    titleBlock.createEl("h1", { text: currentCase.name });
    titleBlock.createEl("p", {
      text: [currentCase.status, currentCase.priority ? `${currentCase.priority} priority` : void 0, currentCase.deadline ? `due ${currentCase.deadline}` : void 0].filter(Boolean).join(" / ")
    });
    const actions = header.createDiv({ cls: "sherlock-case-actions" });
    this.createAction(actions, "\u65B0\u5EFA\u7EBF\u7D22\u4EFB\u52A1", async () => this.plugin.createTaskFromCase(currentCase.filePath));
    this.createAction(actions, "\u6253\u5F00\u6848\u4EF6\u6587\u4EF6", async () => this.plugin.openPath(currentCase.filePath), true);
    const body = shell2.createDiv({ cls: "sherlock-case-grid" });
    this.renderCaseOverview(body, currentCase, caseTasks, caseSchedules);
    this.renderCaseTasks(body, currentCase, caseTasks);
    this.renderCaseSchedule(body, caseSchedules);
    this.renderCaseEvidence(body, currentCase);
    this.renderCaseTimeline(body, currentCase, caseTasks, caseSchedules);
    this.plugin.debugLog("view:case:render:complete");
  }
  renderCaseOverview(container, currentCase, tasks, schedules) {
    const panel = container.createDiv({ cls: "sherlock-panel sherlock-case-overview" });
    panel.createEl("h3", { text: "\u6848\u60C5\u4E2D\u67A2" });
    const stats = panel.createDiv({ cls: "sherlock-metric-row" });
    this.createMetric(stats, "\u4EFB\u52A1", String(tasks.length));
    this.createMetric(stats, "\u5DF2\u6392\u671F", String(schedules.length));
    this.createMetric(stats, "\u72B6\u6001", currentCase.status);
    const notes = panel.createDiv({ cls: "sherlock-case-brief" });
    notes.createEl("p", { text: "\u6848\u4EF6\u6587\u4EF6\u3001\u4EFB\u52A1\u7EBF\u7D22\u3001\u8C03\u67E5\u6392\u671F\u548C\u8D44\u6599\u5165\u53E3\u4F1A\u5728\u8FD9\u91CC\u6C47\u5408\u3002" });
  }
  renderCaseTasks(container, currentCase, tasks) {
    const panel = container.createDiv({ cls: "sherlock-panel sherlock-case-panel" });
    panel.createEl("h3", { text: "\u7EBF\u7D22\u4EFB\u52A1" });
    const list = panel.createEl("ul", { cls: "sherlock-list" });
    if (tasks.length === 0) {
      const row = list.createEl("li", { cls: "sherlock-empty" });
      row.setText("\u8FD9\u4E2A\u6848\u4EF6\u8FD8\u6CA1\u6709\u4EFB\u52A1\u3002");
      const button = panel.createEl("button", { cls: "sherlock-button", text: "\u521B\u5EFA\u7B2C\u4E00\u6761\u7EBF\u7D22" });
      this.registerDomEvent(button, "click", async () => this.plugin.createTaskFromCase(currentCase.filePath));
      return;
    }
    tasks.forEach((task) => {
      const row = list.createEl("li", { cls: "sherlock-list-item" });
      const body = row.createDiv();
      body.createEl("strong", { text: task.name });
      body.createEl("span", { cls: "sherlock-meta", text: [task.status, task.priority, task.due].filter(Boolean).join(" / ") });
      const side = row.createDiv({ cls: "sherlock-list-actions" });
      side.createEl("span", { cls: "sherlock-chip compact", text: task.status });
      const edit = side.createEl("button", { cls: "sherlock-mini-button", text: "\u7F16\u8F91" });
      const remove = side.createEl("button", { cls: "sherlock-mini-button danger", text: "\u5220\u9664" });
      this.registerDomEvent(edit, "click", async (event) => {
        event.stopPropagation();
        await this.plugin.openPath(task.filePath);
      });
      this.registerDomEvent(remove, "click", async (event) => {
        event.stopPropagation();
        await this.plugin.deletePath(task.filePath);
      });
      this.registerDomEvent(row, "click", async () => this.plugin.openPath(task.filePath));
    });
  }
  renderCaseSchedule(container, schedules) {
    const panel = container.createDiv({ cls: "sherlock-panel sherlock-case-panel" });
    panel.createEl("h3", { text: "\u8C03\u67E5\u6392\u671F" });
    const list = panel.createEl("ul", { cls: "sherlock-list" });
    if (schedules.length === 0) {
      list.createEl("li", { cls: "sherlock-empty", text: "\u6682\u65E0\u6392\u671F\u3002\u628A\u4EFB\u52A1\u62D6\u8FDB\u5468\u677F\u540E\uFF0C\u8FD9\u91CC\u4F1A\u81EA\u52A8\u51FA\u73B0\u5173\u8054\u8BB0\u5F55\u3002" });
      return;
    }
    schedules.forEach((schedule) => {
      const row = list.createEl("li", { cls: "sherlock-list-item" });
      const body = row.createDiv();
      body.createEl("strong", { text: schedule.relatedTask ?? schedule.name });
      body.createEl("span", { cls: "sherlock-meta", text: [schedule.day, schedule.start && schedule.end ? `${schedule.start}-${schedule.end}` : void 0].filter(Boolean).join(" / ") });
      const side = row.createDiv({ cls: "sherlock-list-actions" });
      const edit = side.createEl("button", { cls: "sherlock-mini-button", text: "\u7F16\u8F91" });
      const remove = side.createEl("button", { cls: "sherlock-mini-button danger", text: "\u5220\u9664" });
      this.registerDomEvent(edit, "click", async (event) => {
        event.stopPropagation();
        await this.plugin.openPath(schedule.filePath);
      });
      this.registerDomEvent(remove, "click", async (event) => {
        event.stopPropagation();
        await this.plugin.deletePath(schedule.filePath);
      });
      this.registerDomEvent(row, "click", async () => this.plugin.openPath(schedule.filePath));
    });
  }
  renderCaseEvidence(container, currentCase) {
    const panel = container.createDiv({ cls: "sherlock-panel sherlock-case-panel" });
    const header = panel.createDiv({ cls: "sherlock-panel-heading" });
    header.createEl("h3", { text: "\u8BC1\u7269\u67DC" });
    const actions = header.createDiv({ cls: "sherlock-inline-actions" });
    const folderButton = actions.createEl("button", { cls: "sherlock-mini-button", text: "\u6253\u5F00\u8D44\u6599\u5939" });
    const evidenceButton = actions.createEl("button", { cls: "sherlock-mini-button", text: "\u65B0\u5EFA\u8BC1\u7269" });
    this.registerDomEvent(folderButton, "click", async () => this.plugin.revealEvidenceFolderForCase(currentCase.filePath));
    this.registerDomEvent(evidenceButton, "click", async () => this.plugin.createEvidenceFromCase(currentCase.filePath));
    const evidence = this.findCaseEvidence(currentCase);
    const cabinet = panel.createDiv({ cls: "sherlock-evidence-cabinet" });
    [
      { label: "Markdown", kind: "markdown" },
      { label: "PDF", kind: "pdf" },
      { label: "Images", kind: "image" },
      { label: "Local files", kind: "local" }
    ].forEach(({ label, kind }) => {
      const files = evidence.filter((item2) => item2.kind === kind);
      const item = cabinet.createDiv({ cls: "sherlock-evidence-slot" });
      item.createEl("strong", { text: label });
      item.createEl("span", { text: files.length > 0 ? `${files.length} item${files.length > 1 ? "s" : ""}` : "empty" });
      const list = item.createEl("ul", { cls: "sherlock-evidence-list" });
      files.slice(0, 3).forEach((evidenceItem) => {
        const row = list.createEl("li");
        const link = row.createEl("button", { cls: "sherlock-evidence-link", text: evidenceItem.file.basename });
        const remove = row.createEl("button", { cls: "sherlock-mini-button danger", text: "\u5220\u9664" });
        this.registerDomEvent(link, "click", async () => this.plugin.openPath(evidenceItem.file.path));
        this.registerDomEvent(remove, "click", async () => this.plugin.deletePath(evidenceItem.file.path));
      });
    });
    const footer = panel.createDiv({ cls: "sherlock-footer" });
    footer.createEl("span", {
      text: evidence.length > 0 ? `${evidence.length} \u4EFD\u8D44\u6599\u5DF2\u5173\u8054\u5230\u6B64\u6848\u4EF6` : "\u628A\u8D44\u6599\u653E\u5165 Evidence \u6587\u4EF6\u5939\uFF0C\u6216\u65B0\u5EFA\u8BC1\u7269\u7B14\u8BB0\u5F00\u59CB\u5F52\u6863"
    });
  }
  renderCaseTimeline(container, currentCase, tasks, schedules) {
    const panel = container.createDiv({ cls: "sherlock-panel sherlock-case-panel sherlock-case-timeline-panel" });
    panel.createEl("h3", { text: "\u6848\u4EF6\u65F6\u95F4\u7EBF" });
    const timeline = panel.createDiv({ cls: "sherlock-timeline" });
    const events = [
      { label: "\u6848\u4EF6\u521B\u5EFA", value: currentCase.created ?? "unknown" },
      ...tasks.slice(0, 4).map((task) => ({ label: `\u4EFB\u52A1: ${task.name}`, value: task.updated ?? task.created ?? task.status })),
      ...schedules.slice(0, 4).map((schedule) => ({ label: `\u6392\u671F: ${schedule.relatedTask ?? schedule.name}`, value: [schedule.day, schedule.start].filter(Boolean).join(" ") }))
    ];
    events.forEach((event) => {
      const row = timeline.createDiv({ cls: "sherlock-timeline-row" });
      row.createSpan({ cls: "sherlock-timeline-dot" });
      const copy = row.createDiv();
      copy.createEl("strong", { text: event.label });
      copy.createEl("span", { cls: "sherlock-meta", text: event.value });
    });
  }
  renderReadingModule(container, data) {
    const readingItems = data.collections.filter((item) => item.status !== "finished");
    const card = container.createDiv({ cls: "sherlock-panel sherlock-card wide" });
    const header = card.createDiv({ cls: "sherlock-panel-heading" });
    header.createEl("h3", { text: "\u8BC1\u7269\u7814\u8BFB" });
    const addButton = header.createEl("button", { cls: "sherlock-mini-button", text: "\u65B0\u5EFA\u7814\u8BFB\u6761\u76EE" });
    this.registerDomEvent(addButton, "click", async () => this.plugin.createCollectionNote());
    card.createEl("p", {
      cls: "sherlock-mini-copy",
      text: "\u8FD9\u91CC\u653E\u6B63\u5728\u8BFB\u3001\u6B63\u5728\u770B\u3001\u6B63\u5728\u7814\u7A76\u7684\u5185\u5BB9\u3002\u6BCF\u6761\u90FD\u80FD\u968F\u65F6\u8865\u7B14\u8BB0\uFF1B\u786E\u8BA4\u8BFB\u5B8C\u540E\uFF0C\u518D\u5F52\u5165\u6863\u6848\u67DC\u3002"
    });
    const list = card.createEl("ul", { cls: "sherlock-list" });
    if (readingItems.length === 0) {
      list.createEl("li", { cls: "sherlock-empty", text: "\u8FD8\u6CA1\u6709\u6B63\u5728\u7814\u8BFB\u7684\u6761\u76EE\u3002\u53EF\u4EE5\u4ECE\u4E66\u7C4D\u3001\u7535\u5F71\u3001\u6587\u7AE0\u6216\u4E13\u8F91\u5F00\u59CB\u3002" });
      return;
    }
    readingItems.slice(0, 10).forEach((item) => {
      const row = list.createEl("li", { cls: "sherlock-list-item" });
      const copy = row.createDiv({ cls: "sherlock-list-copy" });
      copy.createEl("strong", { text: item.name });
      copy.createEl("span", { cls: "sherlock-meta", text: [item.medium ?? "collection", item.status ?? "queued"].join(" / ") });
      const side = row.createDiv({ cls: "sherlock-list-actions" });
      side.createEl("span", { cls: "sherlock-chip compact", text: item.medium ?? "item" });
      const archive = side.createEl("button", { cls: "sherlock-mini-button", text: "\u5F52\u5165\u8BC1\u7269\u67DC" });
      const edit = side.createEl("button", { cls: "sherlock-mini-button", text: "\u8865\u7B14\u8BB0" });
      const remove = side.createEl("button", { cls: "sherlock-mini-button danger", text: "\u5220\u9664" });
      this.registerDomEvent(archive, "click", async (event) => {
        event.stopPropagation();
        await this.plugin.archiveCollectionAsEvidence(item.filePath);
      });
      this.registerDomEvent(edit, "click", async (event) => {
        event.stopPropagation();
        await this.plugin.openPath(item.filePath);
      });
      this.registerDomEvent(remove, "click", async (event) => {
        event.stopPropagation();
        await this.plugin.deletePath(item.filePath);
      });
      this.registerDomEvent(row, "click", async () => this.plugin.openPath(item.filePath));
    });
  }
  renderArchiveModule(container, data) {
    const card = container.createDiv({ cls: "sherlock-panel sherlock-card wide" });
    const header = card.createDiv({ cls: "sherlock-panel-heading" });
    header.createEl("h3", { text: "\u6863\u6848\u67DC" });
    const addButton = header.createEl("button", { cls: "sherlock-mini-button", text: "\u65B0\u5EFA\u8BC1\u7269" });
    this.registerDomEvent(addButton, "click", async () => this.plugin.createEvidenceNote());
    const cabinet = card.createDiv({ cls: "sherlock-archive-grid" });
    this.createArchiveStat(cabinet, "Markdown", data.evidence.filter((item) => item.filePath.endsWith(".md")).length);
    this.createArchiveStat(cabinet, "PDF / \u56FE\u7247", this.countVaultFiles(["pdf", "png", "jpg", "jpeg", "webp"]));
    this.createArchiveStat(cabinet, "\u6848\u4EF6\u5173\u8054", data.evidence.filter((item) => item.casePath).length);
    card.createEl("p", {
      cls: "sherlock-mini-copy",
      text: "\u8FD9\u91CC\u663E\u793A\u5DF2\u7ECF\u6C89\u6DC0\u8FDB\u8BC1\u7269\u67DC\u7684\u6761\u76EE\uFF1B\u6BCF\u4E00\u6761\u90FD\u662F Vault \u4E2D\u771F\u5B9E Markdown \u6587\u4EF6\uFF0C\u53EF\u968F\u65F6\u7EE7\u7EED\u7F16\u8F91\u6216\u5220\u9664\u3002"
    });
    const list = card.createEl("ul", { cls: "sherlock-list sherlock-archive-list" });
    if (data.evidence.length === 0) {
      list.createEl("li", { cls: "sherlock-empty", text: "\u8BC1\u7269\u67DC\u8FD8\u662F\u7A7A\u7684\u3002\u53EF\u4EE5\u4ECE\u8BC1\u7269\u7814\u8BFB\u4E2D\u5F52\u6863\uFF0C\u4E5F\u53EF\u4EE5\u76F4\u63A5\u65B0\u5EFA\u8BC1\u7269\u3002" });
      return;
    }
    data.evidence.slice(0, 10).forEach((item) => {
      const row = list.createEl("li", { cls: "sherlock-list-item" });
      const copy = row.createDiv({ cls: "sherlock-list-copy" });
      copy.createEl("strong", { text: item.name });
      copy.createEl("span", { cls: "sherlock-meta", text: [item.case ? `\u6848\u4EF6: ${item.case}` : void 0, item.source ? `\u6765\u6E90: ${item.source}` : void 0].filter(Boolean).join(" / ") || item.filePath });
      const side = row.createDiv({ cls: "sherlock-list-actions" });
      const edit = side.createEl("button", { cls: "sherlock-mini-button", text: "\u7F16\u8F91" });
      const remove = side.createEl("button", { cls: "sherlock-mini-button danger", text: "\u5220\u9664" });
      this.registerDomEvent(edit, "click", async (event) => {
        event.stopPropagation();
        await this.plugin.openPath(item.filePath);
      });
      this.registerDomEvent(remove, "click", async (event) => {
        event.stopPropagation();
        await this.plugin.deletePath(item.filePath);
      });
      this.registerDomEvent(row, "click", async () => this.plugin.openPath(item.filePath));
    });
  }
  renderFootprintModule(container, data) {
    const card = container.createDiv({ cls: "sherlock-footprint-panel" });
    const header = card.createDiv({ cls: "sherlock-panel-heading" });
    header.createEl("h3", { text: "\u8DB3\u8FF9\u5730\u56FE" });
    const hint = header.createEl("span", { cls: "sherlock-map-hint", text: "\u70B9\u51FB\u5730\u56FE\u4EFB\u610F\u4F4D\u7F6E\u521B\u5EFA\u8DB3\u8FF9" });
    hint.setAttribute("aria-label", "\u70B9\u51FB\u5730\u56FE\u4EFB\u610F\u4F4D\u7F6E\u521B\u5EFA\u8DB3\u8FF9");
    const map = card.createDiv({ cls: "sherlock-footprint-map" });
    map.style.backgroundImage = `linear-gradient(180deg, rgba(47, 25, 9, 0.1), rgba(47, 25, 9, 0.22)), url("${this.plugin.getWorldMapImageUrl()}"), linear-gradient(135deg, #b38a52, #d5b778 42%, #9c6c35)`;
    this.registerDomEvent(map, "click", async (event) => {
      if (event.target.closest(".sherlock-map-point")) {
        return;
      }
      const confirmed = window.confirm("\u662F\u5426\u786E\u8BA4\u521B\u5EFA\u8DB3\u8FF9\uFF1F");
      if (!confirmed) {
        return;
      }
      const rect = map.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width * 100;
      const y = (event.clientY - rect.top) / rect.height * 100;
      await this.plugin.createPlaceFromMapClick(x, y);
    });
    const places = data.places.filter((place) => typeof place.latitude === "number" && typeof place.longitude === "number").slice(0, 80);
    if (places.length === 0) {
      map.createEl("p", { cls: "sherlock-empty sherlock-map-empty", text: "\u8FD8\u6CA1\u6709\u8DB3\u8FF9\u3002\u70B9\u51FB\u5730\u56FE\u4EFB\u610F\u4F4D\u7F6E\u5373\u53EF\u521B\u5EFA\u5230\u8BBF\u8BB0\u5F55\u3002" });
    }
    places.forEach((place) => {
      const position = this.resolveMapPoint(place);
      const label = [place.city ?? place.name, place.country, place.visitedAt].filter(Boolean).join(" / ");
      const point = map.createEl("button", { cls: "sherlock-map-point", text: "\u2713" });
      point.style.left = `${position.x.toFixed(2)}%`;
      point.style.top = `${position.y.toFixed(2)}%`;
      point.setAttribute("aria-label", label || place.name);
      point.setAttribute("title", [place.city, place.country, place.visitedAt].filter(Boolean).join(" / ") || place.name);
      this.registerDomEvent(point, "click", async () => this.plugin.openPath(place.filePath));
      this.registerDomEvent(point, "contextmenu", async (event) => {
        event.preventDefault();
        await this.plugin.deletePath(place.filePath);
      });
    });
  }
  renderInvestigationScheduler(container, data) {
    const card = container.createDiv({ cls: "sherlock-panel sherlock-card full" });
    card.createEl("h3", { text: "\u8C03\u67E5\u6392\u671F" });
    card.createEl("p", {
      cls: "sherlock-subtitle sherlock-mini-copy",
      text: "\u62D6\u52A8\u5DE6\u4FA7\u4EFB\u52A1\u5230\u65F6\u95F4\u683C\u5373\u53EF\u6392\u5165\u672C\u5468\u8C03\u67E5\uFF1B\u53CC\u51FB\u4EFB\u610F\u65F6\u95F4\u683C\u4F1A\u5FEB\u901F\u65B0\u5EFA\u4E00\u6761\u65E5\u7A0B\u8868\u8BB0\u5F55\u3002\u6392\u8FDB\u53BB\u540E\u53EF\u4EE5\u968F\u65F6\u628A\u4EFB\u52A1\u5757\u653E\u957F\u3001\u653E\u77ED\u3002"
    });
    const planner = card.createDiv({ cls: "sherlock-planner" });
    const backlog = planner.createDiv({ cls: "sherlock-planner-backlog" });
    backlog.createEl("h4", { text: "\u5F85\u5B89\u6392\u4EFB\u52A1" });
    const backlogList = backlog.createEl("ul", { cls: "sherlock-list" });
    const backlogTasks = data.tasks.filter((item) => item.status !== "done");
    if (backlogTasks.length === 0) {
      backlogList.createEl("li", { cls: "sherlock-empty", text: "\u6240\u6709\u4E8B\u9879\u90FD\u5904\u7406\u5B8C\u4E86\uFF0C\u6216\u8005\u5148\u65B0\u5EFA\u4E00\u6761\u4EFB\u52A1\u3002" });
    } else {
      backlogTasks.slice(0, 8).forEach((item) => {
        const row = backlogList.createEl("li", { cls: "sherlock-list-item sherlock-draggable-task" });
        row.setAttribute("draggable", "true");
        row.createEl("strong", { text: item.name });
        row.createEl("span", { cls: "sherlock-meta", text: item.status === "scheduled" ? "\u5DF2\u6392\u5165\u5468\u677F\uFF0C\u53EF\u518D\u6B21\u62D6\u52A8\u6539\u6863\u671F" : "\u62D6\u52A8\u5230\u53F3\u4FA7\u65F6\u95F4\u683C" });
        this.registerDomEvent(row, "dragstart", (event) => {
          event.dataTransfer?.setData("text/plain", item.filePath);
          event.dataTransfer?.setData("application/sherlock-task", item.filePath);
        });
        this.registerDomEvent(row, "dblclick", async () => this.plugin.openPath(item.filePath));
      });
    }
    const board = planner.createDiv({ cls: "sherlock-week-board" });
    const header = board.createDiv({ cls: "sherlock-week-header" });
    header.createDiv({ cls: "sherlock-corner-cell" });
    WEEK_DAYS.forEach((day) => {
      const date = this.resolveWeekDate(day.offset);
      const cell = header.createDiv({ cls: "sherlock-day-header" });
      cell.createEl("strong", { text: day.label });
      cell.createEl("span", { cls: "sherlock-meta", text: date });
    });
    const scheduleIndex = this.indexSchedules(data.schedules);
    TIME_SLOTS.forEach((slot) => {
      const row = board.createDiv({ cls: "sherlock-week-row" });
      row.createDiv({ cls: "sherlock-time-label", text: slot });
      WEEK_DAYS.forEach((day) => {
        const date = this.resolveWeekDate(day.offset);
        const key = `${date}|${slot}`;
        const cell = row.createDiv({ cls: "sherlock-drop-cell" });
        const entries = scheduleIndex.get(key) ?? [];
        if (entries.length > 1) {
          cell.addClass("has-conflict");
        }
        this.registerDomEvent(cell, "dragover", (event) => {
          event.preventDefault();
          cell.addClass("is-dragover");
        });
        this.registerDomEvent(cell, "dragleave", () => {
          cell.removeClass("is-dragover");
        });
        this.registerDomEvent(cell, "drop", async (event) => {
          event.preventDefault();
          cell.removeClass("is-dragover");
          const schedulePath = event.dataTransfer?.getData("application/sherlock-schedule");
          if (schedulePath) {
            const schedule = data.schedules.find((item) => item.filePath === schedulePath);
            const duration = schedule?.durationMinutes ?? this.resolveScheduleDuration(void 0);
            await this.plugin.moveScheduleEntry(schedulePath, date, slot, this.resolveScheduleEnd(slot, duration));
            return;
          }
          const taskPath = event.dataTransfer?.getData("application/sherlock-task") || event.dataTransfer?.getData("text/plain");
          if (!taskPath) {
            return;
          }
          await this.plugin.scheduleTaskFromDashboard(taskPath, date, slot, this.resolveScheduleEnd(slot, DEFAULT_SCHEDULE_DURATION_MINUTES));
        });
        this.registerDomEvent(cell, "dblclick", async () => {
          await this.plugin.createQuickSchedule(date, slot, this.resolveScheduleEnd(slot, DEFAULT_SCHEDULE_DURATION_MINUTES));
        });
        if (entries.length === 0) {
          cell.createEl("span", { cls: "sherlock-slot-hint", text: "Double-click or drop task" });
        } else {
          if (entries.length > 1) {
            const conflictBar = cell.createDiv({ cls: "sherlock-conflict-bar" });
            const warning = conflictBar.createEl("span", {
              cls: "sherlock-conflict-hint",
              text: `${entries.length} items overlap`
            });
            warning.setAttribute("title", "\u8FD9\u4E2A\u65F6\u95F4\u683C\u6709\u591A\u6761\u5B89\u6392\uFF0C\u4E0B\u4E00\u6B65\u53EF\u4EE5\u52A0\u5165\u51B2\u7A81\u89E3\u51B3\u903B\u8F91\u3002");
            const resolveButton = conflictBar.createEl("button", {
              cls: "sherlock-mini-button",
              text: "\u987A\u5EF6\u4E00\u6761"
            });
            this.registerDomEvent(resolveButton, "click", async (event) => {
              event.stopPropagation();
              const movable = entries[entries.length - 1];
              await this.plugin.moveScheduleToNextFreeSlot(movable.filePath);
            });
          }
          entries.forEach((entry) => {
            const pill = cell.createDiv({ cls: "sherlock-schedule-pill" });
            pill.setAttribute("draggable", "true");
            pill.style.minHeight = `${this.resolveSchedulePillHeight(entry.durationMinutes)}px`;
            const top = pill.createDiv({ cls: "sherlock-pill-top" });
            top.createEl("strong", { text: entry.relatedTask ?? entry.name });
            const controls = top.createDiv({ cls: "sherlock-pill-controls" });
            const shrinkButton = controls.createEl("button", { cls: "sherlock-mini-button", text: "-30m" });
            const extendButton = controls.createEl("button", { cls: "sherlock-mini-button", text: "+30m" });
            const deleteButton = controls.createEl("button", { cls: "sherlock-mini-button danger", text: "\u5220\u9664" });
            this.registerDomEvent(shrinkButton, "click", async (event) => {
              event.stopPropagation();
              await this.plugin.adjustScheduleDuration(entry.filePath, -30);
            });
            this.registerDomEvent(extendButton, "click", async (event) => {
              event.stopPropagation();
              await this.plugin.adjustScheduleDuration(entry.filePath, 30);
            });
            this.registerDomEvent(deleteButton, "click", async (event) => {
              event.stopPropagation();
              await this.plugin.deletePath(entry.filePath);
            });
            pill.createEl("span", {
              cls: "sherlock-meta",
              text: `${entry.start ?? slot}-${entry.end ?? this.resolveScheduleEnd(slot, this.resolveScheduleDuration(entry.durationMinutes))}${entry.durationMinutes ? ` / ${entry.durationMinutes}m` : ""}`
            });
            if (entry.relatedTaskPath) {
              pill.createEl("span", { cls: "sherlock-meta", text: "Linked task" });
            }
            this.registerDomEvent(pill, "dragstart", (event) => {
              event.dataTransfer?.setData("application/sherlock-schedule", entry.filePath);
              event.dataTransfer?.setData("text/plain", entry.filePath);
            });
            this.registerDomEvent(pill, "click", async () => this.plugin.openPath(entry.filePath));
          });
        }
      });
    });
  }
  createMetric(container, label, value) {
    const metric = container.createDiv({ cls: "sherlock-metric" });
    metric.createEl("div", { cls: "sherlock-metric-label", text: label });
    metric.createEl("div", { cls: "sherlock-metric-value", text: value });
  }
  createArchiveStat(container, label, value) {
    const stat = container.createDiv({ cls: "sherlock-archive-stat" });
    stat.createEl("strong", { text: String(value) });
    stat.createEl("span", { text: label });
  }
  createAction(container, label, onClick, secondary = false) {
    const button = container.createEl("button", { cls: `sherlock-button${secondary ? " secondary" : ""}`, text: label });
    this.registerDomEvent(button, "click", async () => {
      try {
        await onClick();
      } catch (error) {
        console.error(error);
        new import_obsidian3.Notice(`Sherlock OS \u64CD\u4F5C\u5931\u8D25: ${error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"}`);
      }
    });
  }
  resolveWeekDate(offset) {
    const now = /* @__PURE__ */ new Date();
    const day = now.getDay();
    const mondayDelta = day === 0 ? -6 : 1 - day;
    const target = new Date(now);
    target.setDate(now.getDate() + mondayDelta + offset);
    return this.formatLocalDate(target);
  }
  resolveScheduleDuration(durationMinutes) {
    return Math.max(30, Math.min(240, durationMinutes ?? DEFAULT_SCHEDULE_DURATION_MINUTES));
  }
  resolveScheduleEnd(start, durationMinutes) {
    const duration = this.resolveScheduleDuration(durationMinutes);
    const [hour, minute] = start.split(":").map(Number);
    const endMinutes = Math.min(hour * 60 + minute + duration, 23 * 60 + 30);
    const endHour = Math.floor(endMinutes / 60);
    const endMinute = endMinutes % 60;
    return `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
  }
  resolveSchedulePillHeight(durationMinutes) {
    const steps = this.resolveScheduleDuration(durationMinutes) / 30;
    return 44 + steps * 26;
  }
  resolveMapPoint(place) {
    const latitude = place.latitude ?? 0;
    const longitude = place.longitude ?? MAP_CENTER_LONGITUDE;
    const wrappedLongitude = (longitude - MAP_CENTER_LONGITUDE + 540) % 360 - 180;
    const x = (wrappedLongitude + 180) / 360 * 100;
    const y = (90 - latitude) / 180 * 100;
    return {
      x: Math.max(4, Math.min(96, x)),
      y: Math.max(8, Math.min(92, y))
    };
  }
  indexSchedules(items) {
    const index = /* @__PURE__ */ new Map();
    items.forEach((item) => {
      if (!item.day || !item.start) {
        return;
      }
      const key = `${item.day}|${item.start}`;
      const existing = index.get(key) ?? [];
      existing.push(item);
      index.set(key, existing);
    });
    return index;
  }
  pluginTaskCount(casePath) {
    const plugin = this.plugin;
    const cached = plugin.latestWorkspaceData;
    if (!cached) {
      return 0;
    }
    return cached.tasks.filter((task) => task.casePath === casePath).length;
  }
  resolveCaseProgress(casePath) {
    const cached = this.plugin.latestWorkspaceData;
    if (!cached) {
      return 6;
    }
    const linked = cached.tasks.filter((task) => task.casePath === casePath);
    if (linked.length === 0) {
      return 6;
    }
    const done = linked.filter((task) => task.status === "done").length;
    return Math.max(12, Math.round(done / linked.length * 100));
  }
  renderPriorityLabel(priority) {
    if (priority === "high") {
      return "H";
    }
    if (priority === "low") {
      return "L";
    }
    return "M";
  }
  countVaultFiles(extensions) {
    const normalized = new Set(extensions.map((item) => item.toLowerCase()));
    return this.app.vault.getFiles().filter((file) => normalized.has(file.extension.toLowerCase())).length;
  }
  formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  resolvePeriod() {
    const hour = (/* @__PURE__ */ new Date()).getHours();
    return hour >= 7 && hour < 18 ? "day" : "night";
  }
  createParlorBackdrop(shell2) {
    const backdrop = shell2.createDiv({ cls: "sherlock-parlor-backdrop" });
    backdrop.style.backgroundImage = `url("${this.plugin.getParlorImageUrl()}")`;
  }
  renderFallback(error) {
    this.contentEl.empty();
    this.contentEl.addClass("sherlock-os-view");
    const panel = this.contentEl.createDiv({ cls: "sherlock-panel" });
    panel.createEl("h3", { text: "Sherlock OS \u6682\u65F6\u672A\u80FD\u6E32\u67D3" });
    panel.createEl("p", {
      text: error instanceof Error ? error.message : "Unknown render error"
    });
    panel.createEl("p", {
      text: "\u8C03\u8BD5\u65E5\u5FD7\u5DF2\u5199\u5165 /tmp/sherlock-os-debug.log"
    });
  }
  findCaseEvidence(currentCase) {
    const evidenceRoot = `${this.plugin.settings.evidenceFolder.replace(/\/$/, "")}/`;
    const caseTokens = [
      currentCase.name,
      currentCase.filePath,
      currentCase.filePath.split("/").pop()?.replace(/\.md$/i, "")
    ].filter((value) => Boolean(value)).map((value) => this.normalizeEvidenceToken(value));
    return this.app.vault.getFiles().filter((file) => file.path.startsWith(evidenceRoot)).filter((file) => {
      const cache = this.app.metadataCache.getFileCache(file);
      const frontmatter = cache?.frontmatter;
      if (frontmatter?.casePath === currentCase.filePath || frontmatter?.case === currentCase.name) {
        return true;
      }
      const normalizedPath = this.normalizeEvidenceToken(file.path);
      return caseTokens.some((token) => token.length > 0 && normalizedPath.includes(token));
    }).map((file) => ({ file, kind: this.resolveEvidenceKind(file.extension) })).sort((a, b) => a.file.basename.localeCompare(b.file.basename));
  }
  resolveEvidenceKind(extension) {
    const ext = extension.toLowerCase();
    if (ext === "md") {
      return "markdown";
    }
    if (ext === "pdf") {
      return "pdf";
    }
    if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) {
      return "image";
    }
    return "local";
  }
  normalizeEvidenceToken(value) {
    return value.toLowerCase().replace(/[\s/_\\.-]+/g, "");
  }
};

// src/main.ts
var DEFAULT_SETTINGS = {
  caseFolder: "Sherlock OS/Cases",
  taskFolder: "Sherlock OS/Tasks",
  scheduleFolder: "Sherlock OS/Schedules",
  collectionFolder: "Sherlock OS/Collections",
  evidenceFolder: "Sherlock OS/Evidence",
  placeFolder: "Sherlock OS/Places",
  fogDensity: 48,
  motionIntensity: 36,
  lampGlow: 58
};
var SherlockOSPlugin = class extends import_obsidian4.Plugin {
  constructor(app, manifest) {
    super(app, manifest);
    this.settings = DEFAULT_SETTINGS;
  }
  async onload() {
    try {
      this.debugLog("onload:start");
      await this.loadSettings();
      this.debugLog("onload:settings-loaded");
      this.enableGlobalStyle();
      await ensureFolders(this.app, this.settings);
      this.debugLog("onload:folders-ensured");
      await this.ensureEntryAsset();
      this.debugLog("onload:entry-asset-ensured");
      await this.ensureParlorAsset();
      this.debugLog("onload:parlor-asset-ensured");
      await this.ensureWorldMapAsset();
      this.debugLog("onload:world-map-asset-ensured");
      this.registerView(
        SHERLOCK_VIEW_TYPE,
        (leaf) => new SherlockWorkspaceView(leaf, this)
      );
      this.registerView(
        LEGACY_SHERLOCK_VIEW_TYPE,
        (leaf) => new SherlockWorkspaceView(leaf, this)
      );
      this.addRibbonIcon("search-check", "Open Sherlock", async () => {
        await this.activateWorkspaceView();
      });
      this.addCommand({
        id: "open-sherlock-workspace",
        name: "Open Sherlock workspace",
        callback: async () => this.activateWorkspaceView()
      });
      this.addCommand({
        id: "create-case-file",
        name: "Create a new case file",
        callback: async () => this.createCaseNote()
      });
      this.addCommand({
        id: "create-task-file",
        name: "Create a new task file",
        callback: async () => this.createTaskNote()
      });
      this.addCommand({
        id: "create-task-for-active-case",
        name: "Create a task for the current case",
        callback: async () => this.createTaskForActiveCase()
      });
      this.addCommand({
        id: "create-evidence-for-active-case",
        name: "Create evidence for the current case",
        callback: async () => this.createEvidenceForActiveCase()
      });
      this.addCommand({
        id: "create-schedule-file",
        name: "Create a new schedule file",
        callback: async () => this.createScheduleNote()
      });
      this.addCommand({
        id: "create-collection-file",
        name: "Create a new collection item",
        callback: async () => this.createCollectionNote()
      });
      this.addCommand({
        id: "create-place-file",
        name: "Create a new footprint place",
        callback: async () => this.createPlaceNote()
      });
      this.addSettingTab(new SherlockSettingTab(this.app, this));
      this.registerEvent(this.app.vault.on("create", () => this.refreshWorkspace()));
      this.registerEvent(this.app.vault.on("modify", () => this.refreshWorkspace()));
      this.registerEvent(this.app.vault.on("delete", () => this.refreshWorkspace()));
      this.app.workspace.onLayoutReady(() => {
        this.debugLog("layout-ready:activate");
        this.app.workspace.detachLeavesOfType(LEGACY_SHERLOCK_VIEW_TYPE);
        void this.activateWorkspaceView();
      });
      this.debugLog("onload:complete");
    } catch (error) {
      this.debugLog(`onload:error:${error instanceof Error ? error.stack ?? error.message : String(error)}`);
      throw error;
    }
  }
  async onunload() {
    document.body.classList.remove("sherlock-global-style");
    this.app.workspace.detachLeavesOfType(LEGACY_SHERLOCK_VIEW_TYPE);
    this.app.workspace.detachLeavesOfType(SHERLOCK_VIEW_TYPE);
  }
  async loadSettings() {
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...await this.loadData()
    };
  }
  async saveSettings() {
    await this.saveData(this.settings);
    await ensureFolders(this.app, this.settings);
    await this.refreshWorkspace();
  }
  async getWorkspaceData() {
    try {
      this.latestWorkspaceData = await collectWorkspaceData(this.app);
      return this.latestWorkspaceData;
    } catch (error) {
      this.debugLog(`getWorkspaceData:error:${error instanceof Error ? error.stack ?? error.message : String(error)}`);
      throw error;
    }
  }
  async activateWorkspaceView() {
    try {
      const { workspace } = this.app;
      this.debugLog("activate:start");
      let leaf = workspace.getLeavesOfType(SHERLOCK_VIEW_TYPE)[0] ?? null;
      if (!leaf) {
        this.debugLog("activate:create-leaf");
        leaf = workspace.getLeaf("tab");
      }
      if (!leaf) {
        new import_obsidian4.Notice("Sherlock \u65E0\u6CD5\u6253\u5F00\u4E3B\u5DE5\u4F5C\u533A\u89C6\u56FE\u3002");
        this.debugLog("activate:no-leaf");
        return;
      }
      this.debugLog("activate:set-view-state:start");
      await leaf.setViewState({ type: SHERLOCK_VIEW_TYPE, state: {}, active: true });
      this.debugLog("activate:set-view-state:complete");
      workspace.setActiveLeaf(leaf, { focus: true });
      workspace.revealLeaf(leaf);
      const view = leaf.view;
      if (view instanceof SherlockWorkspaceView) {
        this.debugLog("activate:reset-entry:start");
        await view.resetToEntry();
        this.debugLog("activate:reset-entry:complete");
      } else {
        this.debugLog(`activate:unexpected-view:${view.getViewType()}`);
        await this.refreshWorkspace();
      }
      this.debugLog(`activate:complete:${leaf.view.getViewType()}`);
    } catch (error) {
      this.debugLog(`activate:error:${error instanceof Error ? error.stack ?? error.message : String(error)}`);
      new import_obsidian4.Notice(`Sherlock \u6253\u5F00\u5931\u8D25: ${error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"}`);
    }
  }
  async refreshWorkspace() {
    const leaves = [
      ...this.app.workspace.getLeavesOfType(SHERLOCK_VIEW_TYPE),
      ...this.app.workspace.getLeavesOfType(LEGACY_SHERLOCK_VIEW_TYPE)
    ];
    await Promise.all(
      leaves.map(async (leaf) => {
        const view = leaf.view;
        if (view instanceof SherlockWorkspaceView) {
          await view.refresh();
        }
      })
    );
  }
  async createCaseNote(title = this.defaultTitle("New Case")) {
    const file = await createTypedNote(
      this.app,
      this.settings.caseFolder,
      title,
      buildCaseTemplate(title)
    );
    await this.openFile(file);
    return file;
  }
  async createTaskNote(title = this.defaultTitle("New Task")) {
    const file = await createTypedNote(
      this.app,
      this.settings.taskFolder,
      title,
      buildTaskTemplate(title)
    );
    await this.openFile(file);
    return file;
  }
  async createTaskFromCase(casePath, title) {
    const abstract = this.app.vault.getAbstractFileByPath(casePath);
    if (!(abstract instanceof import_obsidian4.TFile)) {
      throw new Error("\u627E\u4E0D\u5230\u5BF9\u5E94\u6848\u4EF6\u6587\u4EF6\u3002");
    }
    const taskTitle = title ?? `${abstract.basename} Lead ${(/* @__PURE__ */ new Date()).toISOString().slice(11, 16)}`;
    const file = await createTypedNote(
      this.app,
      this.settings.taskFolder,
      taskTitle,
      buildTaskTemplate(taskTitle)
    );
    await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
      frontmatter.type = "task";
      frontmatter.case = abstract.basename;
      frontmatter.casePath = abstract.path;
      frontmatter.updated = (/* @__PURE__ */ new Date()).toISOString();
    });
    await this.openFile(file);
    return file;
  }
  async createTaskForActiveCase() {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      new import_obsidian4.Notice("\u8BF7\u5148\u6253\u5F00\u4E00\u4E2A\u6848\u4EF6\u6587\u4EF6\u3002");
      return;
    }
    const cache = this.app.metadataCache.getFileCache(activeFile);
    if (cache?.frontmatter?.type !== "case") {
      new import_obsidian4.Notice("\u5F53\u524D\u6253\u5F00\u7684\u4E0D\u662F\u6848\u4EF6\u6587\u4EF6\u3002");
      return;
    }
    await this.createTaskFromCase(activeFile.path);
  }
  async createEvidenceFromCase(casePath, title) {
    const abstract = this.app.vault.getAbstractFileByPath(casePath);
    if (!(abstract instanceof import_obsidian4.TFile)) {
      throw new Error("\u627E\u4E0D\u5230\u5BF9\u5E94\u6848\u4EF6\u6587\u4EF6\u3002");
    }
    const evidenceTitle = title ?? `${abstract.basename} Evidence ${(/* @__PURE__ */ new Date()).toISOString().slice(11, 16)}`;
    const file = await createTypedNote(
      this.app,
      this.settings.evidenceFolder,
      evidenceTitle,
      buildEvidenceTemplate(evidenceTitle, abstract.basename, abstract.path)
    );
    await this.openFile(file);
    return file;
  }
  async createEvidenceNote(title = this.defaultTitle("New Evidence")) {
    const file = await createTypedNote(
      this.app,
      this.settings.evidenceFolder,
      title,
      buildEvidenceTemplate(title)
    );
    await this.openFile(file);
    return file;
  }
  async archiveCollectionAsEvidence(collectionPath) {
    const abstract = this.app.vault.getAbstractFileByPath(collectionPath);
    if (!(abstract instanceof import_obsidian4.TFile)) {
      new import_obsidian4.Notice("\u627E\u4E0D\u5230\u8981\u5F52\u6863\u7684\u7814\u8BFB\u6761\u76EE\u3002");
      return null;
    }
    const firstConfirm = window.confirm(`\u5C06\u300C${abstract.basename}\u300D\u52A0\u5165\u8BC1\u7269\u67DC\uFF1F

\u8FD9\u4F1A\u521B\u5EFA\u4E00\u4EFD\u53EF\u7EE7\u7EED\u7F16\u8F91\u7684\u8BC1\u7269\u7B14\u8BB0\uFF0C\u539F\u7814\u8BFB\u6761\u76EE\u4F1A\u4FDD\u7559\u3002`);
    if (!firstConfirm) {
      return null;
    }
    const secondConfirm = window.confirm(`\u518D\u6B21\u786E\u8BA4\uFF1A\u628A\u300C${abstract.basename}\u300D\u6C89\u6DC0\u4E3A\u8BC1\u7269\u67DC\u6761\u76EE\uFF1F`);
    if (!secondConfirm) {
      return null;
    }
    const cache = this.app.metadataCache.getFileCache(abstract);
    const frontmatter = cache?.frontmatter;
    const title = `${abstract.basename} Evidence`;
    const sourceBody = await this.app.vault.cachedRead(abstract);
    const file = await createTypedNote(
      this.app,
      this.settings.evidenceFolder,
      title,
      `${buildEvidenceTemplate(title, String(frontmatter?.case ?? ""), String(frontmatter?.casePath ?? ""))}
## \u6765\u6E90\u7814\u8BFB
- \u539F\u59CB\u6761\u76EE\uFF1A[[${abstract.basename}]]
- \u539F\u59CB\u8DEF\u5F84\uFF1A${abstract.path}

## \u539F\u59CB\u7B14\u8BB0\u6458\u5F55
${sourceBody.replace(/^---[\s\S]*?---\s*/, "").trim() || "- "}
`
    );
    await this.app.fileManager.processFrontMatter(file, (evidenceFrontmatter) => {
      evidenceFrontmatter.type = "evidence";
      evidenceFrontmatter.source = abstract.path;
      evidenceFrontmatter.case = typeof frontmatter?.case === "string" ? frontmatter.case : "";
      evidenceFrontmatter.casePath = typeof frontmatter?.casePath === "string" ? frontmatter.casePath : "";
      evidenceFrontmatter.updated = (/* @__PURE__ */ new Date()).toISOString();
    });
    await this.app.fileManager.processFrontMatter(abstract, (collectionFrontmatter) => {
      collectionFrontmatter.type = "collection";
      collectionFrontmatter.status = "finished";
      collectionFrontmatter.updated = (/* @__PURE__ */ new Date()).toISOString();
    });
    new import_obsidian4.Notice(`\u5DF2\u52A0\u5165\u8BC1\u7269\u67DC: ${file.basename}`);
    await this.refreshWorkspace();
    await this.openFile(file);
    return file;
  }
  async ensureEvidenceFolderForCase(casePath) {
    const abstract = this.app.vault.getAbstractFileByPath(casePath);
    if (!(abstract instanceof import_obsidian4.TFile)) {
      throw new Error("\u627E\u4E0D\u5230\u5BF9\u5E94\u6848\u4EF6\u6587\u4EF6\u3002");
    }
    const safeName = abstract.basename.replace(/[\\/:*?"<>|]/g, "-").trim() || "Untitled Case";
    const folderPath = `${this.settings.evidenceFolder.replace(/\/$/, "")}/${safeName}`;
    if (!this.app.vault.getAbstractFileByPath(folderPath)) {
      await this.app.vault.createFolder(folderPath);
    }
    new import_obsidian4.Notice(`\u5DF2\u5EFA\u7ACB\u6848\u4EF6\u8D44\u6599\u5939: ${folderPath}`);
    await this.refreshWorkspace();
    return folderPath;
  }
  async revealEvidenceFolderForCase(casePath) {
    const folderPath = await this.ensureEvidenceFolderForCase(casePath);
    const adapter = this.app.vault.adapter;
    const basePath = adapter.getBasePath?.();
    if (!basePath) {
      new import_obsidian4.Notice(`\u6848\u4EF6\u8D44\u6599\u5939\u5DF2\u5EFA\u7ACB: ${folderPath}`);
      return;
    }
    await import_electron.shell.openPath((0, import_path.join)(basePath, folderPath));
  }
  async createEvidenceForActiveCase() {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      new import_obsidian4.Notice("\u8BF7\u5148\u6253\u5F00\u4E00\u4E2A\u6848\u4EF6\u6587\u4EF6\u3002");
      return;
    }
    const cache = this.app.metadataCache.getFileCache(activeFile);
    if (cache?.frontmatter?.type !== "case") {
      new import_obsidian4.Notice("\u5F53\u524D\u6253\u5F00\u7684\u4E0D\u662F\u6848\u4EF6\u6587\u4EF6\u3002");
      return;
    }
    await this.createEvidenceFromCase(activeFile.path);
  }
  async createScheduleNote(title = this.defaultTitle("New Schedule")) {
    const file = await createTypedNote(
      this.app,
      this.settings.scheduleFolder,
      title,
      buildScheduleTemplate(title)
    );
    await this.openFile(file);
    return file;
  }
  async createCollectionNote(title = this.defaultTitle("New Collection")) {
    const file = await createTypedNote(
      this.app,
      this.settings.collectionFolder,
      title,
      buildCollectionTemplate(title)
    );
    await this.openFile(file);
    return file;
  }
  async createPlaceNote() {
    return this.createPlaceWithTitleAtMapPercent(this.defaultPlaceTitle(), 50, 50);
  }
  async createPlaceFromMapClick(xPercent, yPercent) {
    return this.createPlaceWithTitleAtMapPercent(this.defaultPlaceTitle(), xPercent, yPercent);
  }
  async createPlaceWithTitleAtMapPercent(title, xPercent, yPercent) {
    try {
      const { latitude, longitude, latitudeHemisphere, longitudeHemisphere } = this.convertMapPercentToCoordinates(xPercent, yPercent);
      const file = await createTypedNote(
        this.app,
        this.settings.placeFolder,
        title,
        buildPlaceTemplate(title, latitude, longitude, latitudeHemisphere, longitudeHemisphere)
      );
      await this.openFile(file);
      return file;
    } catch (error) {
      this.debugLog(`createPlaceNote:error:${error instanceof Error ? error.stack ?? error.message : String(error)}`);
      new import_obsidian4.Notice(`\u65E0\u6CD5\u521B\u5EFA\u8DB3\u8FF9: ${error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"}`);
      return null;
    }
  }
  defaultPlaceTitle() {
    const stamp = (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").slice(0, 16);
    return `Footprint ${stamp}`;
  }
  convertMapPercentToCoordinates(xPercent, yPercent) {
    const clampedX = Math.max(0, Math.min(100, xPercent));
    const clampedY = Math.max(0, Math.min(100, yPercent));
    const rawLongitude = clampedX / 100 * 360 - 180 + 105;
    const normalizedLongitude = ((rawLongitude + 180) % 360 + 360) % 360 - 180;
    const rawLatitude = 90 - clampedY / 100 * 180;
    const latitudeHemisphere = rawLatitude >= 0 ? "N" : "S";
    const longitudeHemisphere = normalizedLongitude >= 0 ? "E" : "W";
    return {
      latitude: Math.round(Math.abs(rawLatitude) * 100) / 100,
      longitude: Math.round(Math.abs(normalizedLongitude) * 100) / 100,
      latitudeHemisphere,
      longitudeHemisphere
    };
  }
  async createQuickSchedule(day, start, end) {
    const title = `${day} ${start} Investigation`;
    const file = await createTypedNote(
      this.app,
      this.settings.scheduleFolder,
      title,
      buildScheduleTemplate(title)
    );
    await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
      frontmatter.day = day;
      frontmatter.start = start;
      frontmatter.end = end;
      frontmatter.durationMinutes = this.diffMinutes(start, end);
      frontmatter.updated = (/* @__PURE__ */ new Date()).toISOString();
      if (typeof frontmatter.relatedTask !== "string") {
        frontmatter.relatedTask = "";
      }
      if (typeof frontmatter.relatedTaskPath !== "string") {
        frontmatter.relatedTaskPath = "";
      }
    });
    await this.openFile(file);
    return file;
  }
  async scheduleTaskFromDashboard(taskPath, day, start, end) {
    const abstract = this.app.vault.getAbstractFileByPath(taskPath);
    if (!(abstract instanceof import_obsidian4.TFile)) {
      throw new Error("\u627E\u4E0D\u5230\u8981\u5B89\u6392\u7684\u4EFB\u52A1\u6587\u4EF6\u3002");
    }
    const taskFile = abstract;
    const scheduleTitle = `${day} ${start} ${taskFile.basename}`;
    const scheduleFile = await createTypedNote(
      this.app,
      this.settings.scheduleFolder,
      scheduleTitle,
      buildScheduleTemplate(scheduleTitle)
    );
    await this.app.fileManager.processFrontMatter(scheduleFile, (frontmatter) => {
      frontmatter.day = day;
      frontmatter.start = start;
      frontmatter.end = end;
      frontmatter.durationMinutes = this.diffMinutes(start, end);
      frontmatter.relatedTask = taskFile.basename;
      frontmatter.relatedTaskPath = taskFile.path;
      frontmatter.updated = (/* @__PURE__ */ new Date()).toISOString();
    });
    await this.app.fileManager.processFrontMatter(taskFile, (frontmatter) => {
      frontmatter.type = "task";
      frontmatter.status = "scheduled";
      frontmatter.updated = (/* @__PURE__ */ new Date()).toISOString();
    });
    new import_obsidian4.Notice(`\u5DF2\u5C06 ${taskFile.basename} \u5B89\u6392\u5230 ${day} ${start}`);
    await this.refreshWorkspace();
  }
  async moveScheduleEntry(schedulePath, day, start, end) {
    const abstract = this.app.vault.getAbstractFileByPath(schedulePath);
    if (!(abstract instanceof import_obsidian4.TFile)) {
      throw new Error("\u627E\u4E0D\u5230\u8981\u79FB\u52A8\u7684\u6392\u671F\u6587\u4EF6\u3002");
    }
    await this.app.fileManager.processFrontMatter(abstract, (frontmatter) => {
      frontmatter.type = "schedule";
      frontmatter.day = day;
      frontmatter.start = start;
      frontmatter.end = end;
      frontmatter.durationMinutes = this.diffMinutes(start, end);
      frontmatter.updated = (/* @__PURE__ */ new Date()).toISOString();
    });
    new import_obsidian4.Notice(`\u5DF2\u8C03\u6574\u6392\u671F\u5230 ${day} ${start}`);
    await this.refreshWorkspace();
  }
  async adjustScheduleDuration(schedulePath, deltaMinutes) {
    const abstract = this.app.vault.getAbstractFileByPath(schedulePath);
    if (!(abstract instanceof import_obsidian4.TFile)) {
      throw new Error("\u627E\u4E0D\u5230\u8981\u8C03\u6574\u65F6\u957F\u7684\u6392\u671F\u6587\u4EF6\u3002");
    }
    await this.app.fileManager.processFrontMatter(abstract, (frontmatter) => {
      const start = typeof frontmatter.start === "string" ? frontmatter.start : "09:00";
      const currentDuration = typeof frontmatter.durationMinutes === "number" ? frontmatter.durationMinutes : this.diffMinutes(
        start,
        typeof frontmatter.end === "string" ? frontmatter.end : this.addMinutes(start, 60)
      );
      const nextDuration = Math.max(30, Math.min(240, currentDuration + deltaMinutes));
      frontmatter.start = start;
      frontmatter.durationMinutes = nextDuration;
      frontmatter.end = this.addMinutes(start, nextDuration);
      frontmatter.updated = (/* @__PURE__ */ new Date()).toISOString();
    });
    await this.refreshWorkspace();
  }
  async moveScheduleToNextFreeSlot(schedulePath) {
    const abstract = this.app.vault.getAbstractFileByPath(schedulePath);
    if (!(abstract instanceof import_obsidian4.TFile)) {
      throw new Error("\u627E\u4E0D\u5230\u8981\u987A\u5EF6\u7684\u6392\u671F\u6587\u4EF6\u3002");
    }
    const cache = this.app.metadataCache.getFileCache(abstract);
    const frontmatter = cache?.frontmatter;
    const currentDay = typeof frontmatter?.day === "string" ? frontmatter.day : (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const currentStart = typeof frontmatter?.start === "string" ? frontmatter.start : "08:00";
    const duration = typeof frontmatter?.durationMinutes === "number" ? frontmatter.durationMinutes : this.diffMinutes(
      currentStart,
      typeof frontmatter?.end === "string" ? frontmatter.end : this.addMinutes(currentStart, 60)
    );
    const workspaceData = await this.getWorkspaceData();
    const candidate = this.findNextFreeSlot(currentDay, currentStart, duration, workspaceData.schedules, schedulePath);
    if (!candidate) {
      new import_obsidian4.Notice("\u672C\u5468\u6CA1\u6709\u627E\u5230\u53EF\u987A\u5EF6\u7684\u7A7A\u6863\u3002");
      return;
    }
    await this.moveScheduleEntry(schedulePath, candidate.day, candidate.start, candidate.end);
  }
  async openPath(path) {
    const abstract = this.app.vault.getAbstractFileByPath(path);
    if (!(abstract instanceof import_obsidian4.TFile)) {
      new import_obsidian4.Notice("\u5BF9\u5E94\u6587\u4EF6\u4E0D\u5B58\u5728\u3002");
      return;
    }
    await this.app.workspace.getLeaf(true).openFile(abstract);
  }
  async deletePath(path) {
    const abstract = this.app.vault.getAbstractFileByPath(path);
    if (!(abstract instanceof import_obsidian4.TFile)) {
      new import_obsidian4.Notice("\u5BF9\u5E94\u6587\u4EF6\u4E0D\u5B58\u5728\uFF0C\u65E0\u6CD5\u5220\u9664\u3002");
      return;
    }
    const confirmed = window.confirm(`\u786E\u5B9A\u5220\u9664\u300C${abstract.basename}\u300D\u5417\uFF1F\u6587\u4EF6\u4F1A\u79FB\u5230\u7CFB\u7EDF\u5E9F\u7EB8\u7BD3\u3002`);
    if (!confirmed) {
      return;
    }
    await this.app.vault.trash(abstract, true);
    new import_obsidian4.Notice(`\u5DF2\u5220\u9664 ${abstract.basename}`);
    await this.refreshWorkspace();
  }
  async openFile(file) {
    await this.app.workspace.getLeaf(true).openFile(file);
    new import_obsidian4.Notice(`Sherlock OS \u5DF2\u6253\u5F00 ${file.basename}`);
    await this.refreshWorkspace();
  }
  defaultTitle(prefix) {
    const stamp = (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").slice(0, 16);
    return `${prefix} ${stamp}`;
  }
  diffMinutes(start, end) {
    const startMinutes = this.timeToMinutes(start);
    const endMinutes = this.timeToMinutes(end);
    return Math.max(30, endMinutes - startMinutes);
  }
  addMinutes(start, amount) {
    const next = Math.min(this.timeToMinutes(start) + amount, 23 * 60 + 30);
    const hours = Math.floor(next / 60);
    const minutes = next % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }
  timeToMinutes(value) {
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
  }
  findNextFreeSlot(currentDay, currentStart, duration, schedules, ignoredPath) {
    const slots = ["08:00", "10:00", "12:00", "14:00", "16:00", "19:00"];
    const week = this.buildCurrentWeek();
    const currentIndex = week.findIndex((day) => day === currentDay);
    const orderedDays = currentIndex >= 0 ? [...week.slice(currentIndex), ...week.slice(0, currentIndex)] : week;
    for (const day of orderedDays) {
      for (const slot of slots) {
        if (day === currentDay && this.timeToMinutes(slot) <= this.timeToMinutes(currentStart)) {
          continue;
        }
        const occupied = schedules.some((item) => item.filePath !== ignoredPath && item.day === day && item.start === slot);
        if (!occupied) {
          return { day, start: slot, end: this.addMinutes(slot, duration) };
        }
      }
    }
    return null;
  }
  buildCurrentWeek() {
    const now = /* @__PURE__ */ new Date();
    const day = now.getDay();
    const mondayDelta = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayDelta);
    return Array.from({ length: 7 }, (_, index) => {
      const target = new Date(monday);
      target.setDate(monday.getDate() + index);
      return formatLocalDate(target);
    });
  }
  debugLog(message) {
    try {
      (0, import_fs.appendFileSync)("/tmp/sherlock-os-debug.log", `[${(/* @__PURE__ */ new Date()).toISOString()}] ${message}
`);
    } catch (_error) {
    }
  }
  enableGlobalStyle() {
    document.body.classList.add("sherlock-global-style");
  }
  getEntryImageUrl() {
    return this.app.vault.adapter.getResourcePath("Sherlock OS/Assets/sherlock-entry.png");
  }
  getParlorImageUrl() {
    return this.app.vault.adapter.getResourcePath("Sherlock OS/Assets/sherlock-parlor.png");
  }
  getWorldMapImageUrl() {
    return this.app.vault.adapter.getResourcePath("Sherlock OS/Assets/sherlock-world-map.png");
  }
  async ensureEntryAsset() {
    const adapter = this.app.vault.adapter;
    if (!this.app.vault.getAbstractFileByPath("Sherlock OS/Assets")) {
      try {
        await this.app.vault.createFolder("Sherlock OS/Assets");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes("Folder already exists")) {
          throw error;
        }
      }
    }
    const targetPath = "Sherlock OS/Assets/sherlock-entry.png";
    if (await adapter.exists(targetPath)) {
      return;
    }
    try {
      const fileSystemAdapter = adapter;
      const basePath = fileSystemAdapter.getBasePath?.();
      if (!basePath) {
        this.debugLog("entry-asset:skip:no-base-path");
        return;
      }
      const pluginAssetPath = (0, import_path.join)(
        basePath,
        ".obsidian",
        "plugins",
        this.manifest.id,
        "assets",
        "sherlock-entry.png"
      );
      const source = (0, import_fs.readFileSync)(pluginAssetPath);
      const data = source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
      await adapter.writeBinary(targetPath, data);
    } catch (error) {
      const message = error instanceof Error ? error.stack ?? error.message : String(error);
      this.debugLog(`entry-asset:skip:${message}`);
    }
  }
  async ensureParlorAsset() {
    await this.ensureBundledAsset("sherlock-parlor.png", "parlor-asset");
  }
  async ensureWorldMapAsset() {
    await this.ensureBundledAsset("sherlock-world-map.png", "world-map-asset");
  }
  async ensureBundledAsset(fileName, logPrefix) {
    const adapter = this.app.vault.adapter;
    if (!this.app.vault.getAbstractFileByPath("Sherlock OS/Assets")) {
      try {
        await this.app.vault.createFolder("Sherlock OS/Assets");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes("Folder already exists")) {
          throw error;
        }
      }
    }
    const targetPath = `Sherlock OS/Assets/${fileName}`;
    try {
      const fileSystemAdapter = adapter;
      const basePath = fileSystemAdapter.getBasePath?.();
      if (!basePath) {
        this.debugLog(`${logPrefix}:skip:no-base-path`);
        return;
      }
      const pluginAssetPath = (0, import_path.join)(
        basePath,
        ".obsidian",
        "plugins",
        this.manifest.id,
        "assets",
        fileName
      );
      const source = (0, import_fs.readFileSync)(pluginAssetPath);
      const data = source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
      await adapter.writeBinary(targetPath, data);
    } catch (error) {
      const message = error instanceof Error ? error.stack ?? error.message : String(error);
      this.debugLog(`${logPrefix}:skip:${message}`);
    }
  }
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2RhdGEudHMiLCAic3JjL3NldHRpbmdzLnRzIiwgInNyYy92aWV3LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQge1xuICBBcHAsXG4gIE5vdGljZSxcbiAgUGx1Z2luLFxuICBQbHVnaW5NYW5pZmVzdCxcbiAgVEFic3RyYWN0RmlsZSxcbiAgVEZpbGUsXG4gIFdvcmtzcGFjZUxlYWZcbn0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgeyBhcHBlbmRGaWxlU3luYywgcmVhZEZpbGVTeW5jIH0gZnJvbSBcImZzXCI7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSBcInBhdGhcIjtcbmltcG9ydCB7IHNoZWxsIH0gZnJvbSBcImVsZWN0cm9uXCI7XG5pbXBvcnQge1xuICBidWlsZENhc2VUZW1wbGF0ZSxcbiAgYnVpbGRDb2xsZWN0aW9uVGVtcGxhdGUsXG4gIGJ1aWxkRXZpZGVuY2VUZW1wbGF0ZSxcbiAgYnVpbGRQbGFjZVRlbXBsYXRlLFxuICBidWlsZFNjaGVkdWxlVGVtcGxhdGUsXG4gIGJ1aWxkVGFza1RlbXBsYXRlLFxuICBjb2xsZWN0V29ya3NwYWNlRGF0YSxcbiAgY3JlYXRlVHlwZWROb3RlLFxuICBlbnN1cmVGb2xkZXJzLFxuICBmb3JtYXRMb2NhbERhdGVcbn0gZnJvbSBcIi4vZGF0YVwiO1xuaW1wb3J0IHsgU2hlcmxvY2tTZXR0aW5nVGFiIH0gZnJvbSBcIi4vc2V0dGluZ3NcIjtcbmltcG9ydCB0eXBlIHsgU2hlcmxvY2tQbHVnaW5TZXR0aW5ncywgU2hlcmxvY2tXb3Jrc3BhY2VEYXRhIH0gZnJvbSBcIi4vdHlwZXNcIjtcbmltcG9ydCB7IExFR0FDWV9TSEVSTE9DS19WSUVXX1RZUEUsIFNoZXJsb2NrV29ya3NwYWNlVmlldywgU0hFUkxPQ0tfVklFV19UWVBFIH0gZnJvbSBcIi4vdmlld1wiO1xuXG5jb25zdCBERUZBVUxUX1NFVFRJTkdTOiBTaGVybG9ja1BsdWdpblNldHRpbmdzID0ge1xuICBjYXNlRm9sZGVyOiBcIlNoZXJsb2NrIE9TL0Nhc2VzXCIsXG4gIHRhc2tGb2xkZXI6IFwiU2hlcmxvY2sgT1MvVGFza3NcIixcbiAgc2NoZWR1bGVGb2xkZXI6IFwiU2hlcmxvY2sgT1MvU2NoZWR1bGVzXCIsXG4gIGNvbGxlY3Rpb25Gb2xkZXI6IFwiU2hlcmxvY2sgT1MvQ29sbGVjdGlvbnNcIixcbiAgZXZpZGVuY2VGb2xkZXI6IFwiU2hlcmxvY2sgT1MvRXZpZGVuY2VcIixcbiAgcGxhY2VGb2xkZXI6IFwiU2hlcmxvY2sgT1MvUGxhY2VzXCIsXG4gIGZvZ0RlbnNpdHk6IDQ4LFxuICBtb3Rpb25JbnRlbnNpdHk6IDM2LFxuICBsYW1wR2xvdzogNThcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNoZXJsb2NrT1NQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuICBzZXR0aW5nczogU2hlcmxvY2tQbHVnaW5TZXR0aW5ncyA9IERFRkFVTFRfU0VUVElOR1M7XG4gIGxhdGVzdFdvcmtzcGFjZURhdGE/OiBTaGVybG9ja1dvcmtzcGFjZURhdGE7XG5cbiAgY29uc3RydWN0b3IoYXBwOiBBcHAsIG1hbmlmZXN0OiBQbHVnaW5NYW5pZmVzdCkge1xuICAgIHN1cGVyKGFwcCwgbWFuaWZlc3QpO1xuICB9XG5cbiAgYXN5bmMgb25sb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICB0aGlzLmRlYnVnTG9nKFwib25sb2FkOnN0YXJ0XCIpO1xuICAgICAgYXdhaXQgdGhpcy5sb2FkU2V0dGluZ3MoKTtcbiAgICAgIHRoaXMuZGVidWdMb2coXCJvbmxvYWQ6c2V0dGluZ3MtbG9hZGVkXCIpO1xuICAgICAgdGhpcy5lbmFibGVHbG9iYWxTdHlsZSgpO1xuICAgICAgYXdhaXQgZW5zdXJlRm9sZGVycyh0aGlzLmFwcCwgdGhpcy5zZXR0aW5ncyk7XG4gICAgICB0aGlzLmRlYnVnTG9nKFwib25sb2FkOmZvbGRlcnMtZW5zdXJlZFwiKTtcbiAgICAgIGF3YWl0IHRoaXMuZW5zdXJlRW50cnlBc3NldCgpO1xuICAgICAgdGhpcy5kZWJ1Z0xvZyhcIm9ubG9hZDplbnRyeS1hc3NldC1lbnN1cmVkXCIpO1xuICAgICAgYXdhaXQgdGhpcy5lbnN1cmVQYXJsb3JBc3NldCgpO1xuICAgICAgdGhpcy5kZWJ1Z0xvZyhcIm9ubG9hZDpwYXJsb3ItYXNzZXQtZW5zdXJlZFwiKTtcbiAgICAgIGF3YWl0IHRoaXMuZW5zdXJlV29ybGRNYXBBc3NldCgpO1xuICAgICAgdGhpcy5kZWJ1Z0xvZyhcIm9ubG9hZDp3b3JsZC1tYXAtYXNzZXQtZW5zdXJlZFwiKTtcblxuICAgICAgdGhpcy5yZWdpc3RlclZpZXcoXG4gICAgICAgIFNIRVJMT0NLX1ZJRVdfVFlQRSxcbiAgICAgICAgKGxlYWYpID0+IG5ldyBTaGVybG9ja1dvcmtzcGFjZVZpZXcobGVhZiwgdGhpcylcbiAgICAgICk7XG4gICAgICB0aGlzLnJlZ2lzdGVyVmlldyhcbiAgICAgICAgTEVHQUNZX1NIRVJMT0NLX1ZJRVdfVFlQRSxcbiAgICAgICAgKGxlYWYpID0+IG5ldyBTaGVybG9ja1dvcmtzcGFjZVZpZXcobGVhZiwgdGhpcylcbiAgICAgICk7XG5cbiAgICAgIHRoaXMuYWRkUmliYm9uSWNvbihcInNlYXJjaC1jaGVja1wiLCBcIk9wZW4gU2hlcmxvY2tcIiwgYXN5bmMgKCkgPT4ge1xuICAgICAgICBhd2FpdCB0aGlzLmFjdGl2YXRlV29ya3NwYWNlVmlldygpO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgIGlkOiBcIm9wZW4tc2hlcmxvY2std29ya3NwYWNlXCIsXG4gICAgICAgIG5hbWU6IFwiT3BlbiBTaGVybG9jayB3b3Jrc3BhY2VcIixcbiAgICAgICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHRoaXMuYWN0aXZhdGVXb3Jrc3BhY2VWaWV3KClcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICBpZDogXCJjcmVhdGUtY2FzZS1maWxlXCIsXG4gICAgICAgIG5hbWU6IFwiQ3JlYXRlIGEgbmV3IGNhc2UgZmlsZVwiLFxuICAgICAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4gdGhpcy5jcmVhdGVDYXNlTm90ZSgpXG4gICAgICB9KTtcblxuICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgaWQ6IFwiY3JlYXRlLXRhc2stZmlsZVwiLFxuICAgICAgICBuYW1lOiBcIkNyZWF0ZSBhIG5ldyB0YXNrIGZpbGVcIixcbiAgICAgICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHRoaXMuY3JlYXRlVGFza05vdGUoKVxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgIGlkOiBcImNyZWF0ZS10YXNrLWZvci1hY3RpdmUtY2FzZVwiLFxuICAgICAgICBuYW1lOiBcIkNyZWF0ZSBhIHRhc2sgZm9yIHRoZSBjdXJyZW50IGNhc2VcIixcbiAgICAgICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHRoaXMuY3JlYXRlVGFza0ZvckFjdGl2ZUNhc2UoKVxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgIGlkOiBcImNyZWF0ZS1ldmlkZW5jZS1mb3ItYWN0aXZlLWNhc2VcIixcbiAgICAgICAgbmFtZTogXCJDcmVhdGUgZXZpZGVuY2UgZm9yIHRoZSBjdXJyZW50IGNhc2VcIixcbiAgICAgICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHRoaXMuY3JlYXRlRXZpZGVuY2VGb3JBY3RpdmVDYXNlKClcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICBpZDogXCJjcmVhdGUtc2NoZWR1bGUtZmlsZVwiLFxuICAgICAgICBuYW1lOiBcIkNyZWF0ZSBhIG5ldyBzY2hlZHVsZSBmaWxlXCIsXG4gICAgICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB0aGlzLmNyZWF0ZVNjaGVkdWxlTm90ZSgpXG4gICAgICB9KTtcblxuICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgaWQ6IFwiY3JlYXRlLWNvbGxlY3Rpb24tZmlsZVwiLFxuICAgICAgICBuYW1lOiBcIkNyZWF0ZSBhIG5ldyBjb2xsZWN0aW9uIGl0ZW1cIixcbiAgICAgICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHRoaXMuY3JlYXRlQ29sbGVjdGlvbk5vdGUoKVxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgIGlkOiBcImNyZWF0ZS1wbGFjZS1maWxlXCIsXG4gICAgICAgIG5hbWU6IFwiQ3JlYXRlIGEgbmV3IGZvb3RwcmludCBwbGFjZVwiLFxuICAgICAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4gdGhpcy5jcmVhdGVQbGFjZU5vdGUoKVxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuYWRkU2V0dGluZ1RhYihuZXcgU2hlcmxvY2tTZXR0aW5nVGFiKHRoaXMuYXBwLCB0aGlzKSk7XG5cbiAgICAgIHRoaXMucmVnaXN0ZXJFdmVudCh0aGlzLmFwcC52YXVsdC5vbihcImNyZWF0ZVwiLCAoKSA9PiB0aGlzLnJlZnJlc2hXb3Jrc3BhY2UoKSkpO1xuICAgICAgdGhpcy5yZWdpc3RlckV2ZW50KHRoaXMuYXBwLnZhdWx0Lm9uKFwibW9kaWZ5XCIsICgpID0+IHRoaXMucmVmcmVzaFdvcmtzcGFjZSgpKSk7XG4gICAgICB0aGlzLnJlZ2lzdGVyRXZlbnQodGhpcy5hcHAudmF1bHQub24oXCJkZWxldGVcIiwgKCkgPT4gdGhpcy5yZWZyZXNoV29ya3NwYWNlKCkpKTtcbiAgICAgIHRoaXMuYXBwLndvcmtzcGFjZS5vbkxheW91dFJlYWR5KCgpID0+IHtcbiAgICAgICAgdGhpcy5kZWJ1Z0xvZyhcImxheW91dC1yZWFkeTphY3RpdmF0ZVwiKTtcbiAgICAgICAgdGhpcy5hcHAud29ya3NwYWNlLmRldGFjaExlYXZlc09mVHlwZShMRUdBQ1lfU0hFUkxPQ0tfVklFV19UWVBFKTtcbiAgICAgICAgdm9pZCB0aGlzLmFjdGl2YXRlV29ya3NwYWNlVmlldygpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLmRlYnVnTG9nKFwib25sb2FkOmNvbXBsZXRlXCIpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmRlYnVnTG9nKGBvbmxvYWQ6ZXJyb3I6JHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3Iuc3RhY2sgPz8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICBhc3luYyBvbnVubG9hZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5yZW1vdmUoXCJzaGVybG9jay1nbG9iYWwtc3R5bGVcIik7XG4gICAgdGhpcy5hcHAud29ya3NwYWNlLmRldGFjaExlYXZlc09mVHlwZShMRUdBQ1lfU0hFUkxPQ0tfVklFV19UWVBFKTtcbiAgICB0aGlzLmFwcC53b3Jrc3BhY2UuZGV0YWNoTGVhdmVzT2ZUeXBlKFNIRVJMT0NLX1ZJRVdfVFlQRSk7XG4gIH1cblxuICBhc3luYyBsb2FkU2V0dGluZ3MoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5zZXR0aW5ncyA9IHtcbiAgICAgIC4uLkRFRkFVTFRfU0VUVElOR1MsXG4gICAgICAuLi4oYXdhaXQgdGhpcy5sb2FkRGF0YSgpKVxuICAgIH07XG4gIH1cblxuICBhc3luYyBzYXZlU2V0dGluZ3MoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5zYXZlRGF0YSh0aGlzLnNldHRpbmdzKTtcbiAgICBhd2FpdCBlbnN1cmVGb2xkZXJzKHRoaXMuYXBwLCB0aGlzLnNldHRpbmdzKTtcbiAgICBhd2FpdCB0aGlzLnJlZnJlc2hXb3Jrc3BhY2UoKTtcbiAgfVxuXG4gIGFzeW5jIGdldFdvcmtzcGFjZURhdGEoKTogUHJvbWlzZTxTaGVybG9ja1dvcmtzcGFjZURhdGE+IHtcbiAgICB0cnkge1xuICAgICAgdGhpcy5sYXRlc3RXb3Jrc3BhY2VEYXRhID0gYXdhaXQgY29sbGVjdFdvcmtzcGFjZURhdGEodGhpcy5hcHApO1xuICAgICAgcmV0dXJuIHRoaXMubGF0ZXN0V29ya3NwYWNlRGF0YTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5kZWJ1Z0xvZyhgZ2V0V29ya3NwYWNlRGF0YTplcnJvcjoke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5zdGFjayA/PyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGFjdGl2YXRlV29ya3NwYWNlVmlldygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyB3b3Jrc3BhY2UgfSA9IHRoaXMuYXBwO1xuICAgICAgdGhpcy5kZWJ1Z0xvZyhcImFjdGl2YXRlOnN0YXJ0XCIpO1xuICAgICAgbGV0IGxlYWYgPSB3b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKFNIRVJMT0NLX1ZJRVdfVFlQRSlbMF0gPz8gbnVsbDtcblxuICAgICAgaWYgKCFsZWFmKSB7XG4gICAgICAgIHRoaXMuZGVidWdMb2coXCJhY3RpdmF0ZTpjcmVhdGUtbGVhZlwiKTtcbiAgICAgICAgbGVhZiA9IHdvcmtzcGFjZS5nZXRMZWFmKFwidGFiXCIpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWxlYWYpIHtcbiAgICAgICAgbmV3IE5vdGljZShcIlNoZXJsb2NrIFx1NjVFMFx1NkNENVx1NjI1M1x1NUYwMFx1NEUzQlx1NURFNVx1NEY1Q1x1NTMzQVx1ODlDNlx1NTZGRVx1MzAwMlwiKTtcbiAgICAgICAgdGhpcy5kZWJ1Z0xvZyhcImFjdGl2YXRlOm5vLWxlYWZcIik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdGhpcy5kZWJ1Z0xvZyhcImFjdGl2YXRlOnNldC12aWV3LXN0YXRlOnN0YXJ0XCIpO1xuICAgICAgYXdhaXQgbGVhZi5zZXRWaWV3U3RhdGUoeyB0eXBlOiBTSEVSTE9DS19WSUVXX1RZUEUsIHN0YXRlOiB7fSwgYWN0aXZlOiB0cnVlIH0pO1xuICAgICAgdGhpcy5kZWJ1Z0xvZyhcImFjdGl2YXRlOnNldC12aWV3LXN0YXRlOmNvbXBsZXRlXCIpO1xuICAgICAgd29ya3NwYWNlLnNldEFjdGl2ZUxlYWYobGVhZiwgeyBmb2N1czogdHJ1ZSB9KTtcbiAgICAgIHdvcmtzcGFjZS5yZXZlYWxMZWFmKGxlYWYpO1xuICAgICAgY29uc3QgdmlldyA9IGxlYWYudmlldztcbiAgICAgIGlmICh2aWV3IGluc3RhbmNlb2YgU2hlcmxvY2tXb3Jrc3BhY2VWaWV3KSB7XG4gICAgICAgIHRoaXMuZGVidWdMb2coXCJhY3RpdmF0ZTpyZXNldC1lbnRyeTpzdGFydFwiKTtcbiAgICAgICAgYXdhaXQgdmlldy5yZXNldFRvRW50cnkoKTtcbiAgICAgICAgdGhpcy5kZWJ1Z0xvZyhcImFjdGl2YXRlOnJlc2V0LWVudHJ5OmNvbXBsZXRlXCIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5kZWJ1Z0xvZyhgYWN0aXZhdGU6dW5leHBlY3RlZC12aWV3OiR7dmlldy5nZXRWaWV3VHlwZSgpfWApO1xuICAgICAgICBhd2FpdCB0aGlzLnJlZnJlc2hXb3Jrc3BhY2UoKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuZGVidWdMb2coYGFjdGl2YXRlOmNvbXBsZXRlOiR7bGVhZi52aWV3LmdldFZpZXdUeXBlKCl9YCk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMuZGVidWdMb2coYGFjdGl2YXRlOmVycm9yOiR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLnN0YWNrID8/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgICAgbmV3IE5vdGljZShgU2hlcmxvY2sgXHU2MjUzXHU1RjAwXHU1OTMxXHU4RDI1OiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogXCJcdTY3MkFcdTc3RTVcdTk1MTlcdThCRUZcIn1gKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyByZWZyZXNoV29ya3NwYWNlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGxlYXZlcyA9IFtcbiAgICAgIC4uLnRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoU0hFUkxPQ0tfVklFV19UWVBFKSxcbiAgICAgIC4uLnRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoTEVHQUNZX1NIRVJMT0NLX1ZJRVdfVFlQRSlcbiAgICBdO1xuICAgIGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgbGVhdmVzLm1hcChhc3luYyAobGVhZikgPT4ge1xuICAgICAgICBjb25zdCB2aWV3ID0gbGVhZi52aWV3O1xuICAgICAgICBpZiAodmlldyBpbnN0YW5jZW9mIFNoZXJsb2NrV29ya3NwYWNlVmlldykge1xuICAgICAgICAgIGF3YWl0IHZpZXcucmVmcmVzaCgpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICk7XG4gIH1cblxuICBhc3luYyBjcmVhdGVDYXNlTm90ZSh0aXRsZSA9IHRoaXMuZGVmYXVsdFRpdGxlKFwiTmV3IENhc2VcIikpOiBQcm9taXNlPFRGaWxlPiB7XG4gICAgY29uc3QgZmlsZSA9IGF3YWl0IGNyZWF0ZVR5cGVkTm90ZShcbiAgICAgIHRoaXMuYXBwLFxuICAgICAgdGhpcy5zZXR0aW5ncy5jYXNlRm9sZGVyLFxuICAgICAgdGl0bGUsXG4gICAgICBidWlsZENhc2VUZW1wbGF0ZSh0aXRsZSlcbiAgICApO1xuICAgIGF3YWl0IHRoaXMub3BlbkZpbGUoZmlsZSk7XG4gICAgcmV0dXJuIGZpbGU7XG4gIH1cblxuICBhc3luYyBjcmVhdGVUYXNrTm90ZSh0aXRsZSA9IHRoaXMuZGVmYXVsdFRpdGxlKFwiTmV3IFRhc2tcIikpOiBQcm9taXNlPFRGaWxlPiB7XG4gICAgY29uc3QgZmlsZSA9IGF3YWl0IGNyZWF0ZVR5cGVkTm90ZShcbiAgICAgIHRoaXMuYXBwLFxuICAgICAgdGhpcy5zZXR0aW5ncy50YXNrRm9sZGVyLFxuICAgICAgdGl0bGUsXG4gICAgICBidWlsZFRhc2tUZW1wbGF0ZSh0aXRsZSlcbiAgICApO1xuICAgIGF3YWl0IHRoaXMub3BlbkZpbGUoZmlsZSk7XG4gICAgcmV0dXJuIGZpbGU7XG4gIH1cblxuICBhc3luYyBjcmVhdGVUYXNrRnJvbUNhc2UoY2FzZVBhdGg6IHN0cmluZywgdGl0bGU/OiBzdHJpbmcpOiBQcm9taXNlPFRGaWxlPiB7XG4gICAgY29uc3QgYWJzdHJhY3QgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoY2FzZVBhdGgpO1xuICAgIGlmICghKGFic3RyYWN0IGluc3RhbmNlb2YgVEZpbGUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJcdTYyN0VcdTRFMERcdTUyMzBcdTVCRjlcdTVFOTRcdTY4NDhcdTRFRjZcdTY1ODdcdTRFRjZcdTMwMDJcIik7XG4gICAgfVxuXG4gICAgY29uc3QgdGFza1RpdGxlID0gdGl0bGUgPz8gYCR7YWJzdHJhY3QuYmFzZW5hbWV9IExlYWQgJHtuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc2xpY2UoMTEsIDE2KX1gO1xuICAgIGNvbnN0IGZpbGUgPSBhd2FpdCBjcmVhdGVUeXBlZE5vdGUoXG4gICAgICB0aGlzLmFwcCxcbiAgICAgIHRoaXMuc2V0dGluZ3MudGFza0ZvbGRlcixcbiAgICAgIHRhc2tUaXRsZSxcbiAgICAgIGJ1aWxkVGFza1RlbXBsYXRlKHRhc2tUaXRsZSlcbiAgICApO1xuXG4gICAgYXdhaXQgdGhpcy5hcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGZpbGUsIChmcm9udG1hdHRlcikgPT4ge1xuICAgICAgZnJvbnRtYXR0ZXIudHlwZSA9IFwidGFza1wiO1xuICAgICAgZnJvbnRtYXR0ZXIuY2FzZSA9IGFic3RyYWN0LmJhc2VuYW1lO1xuICAgICAgZnJvbnRtYXR0ZXIuY2FzZVBhdGggPSBhYnN0cmFjdC5wYXRoO1xuICAgICAgZnJvbnRtYXR0ZXIudXBkYXRlZCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICB9KTtcblxuICAgIGF3YWl0IHRoaXMub3BlbkZpbGUoZmlsZSk7XG4gICAgcmV0dXJuIGZpbGU7XG4gIH1cblxuICBhc3luYyBjcmVhdGVUYXNrRm9yQWN0aXZlQ2FzZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBhY3RpdmVGaWxlID0gdGhpcy5hcHAud29ya3NwYWNlLmdldEFjdGl2ZUZpbGUoKTtcbiAgICBpZiAoIWFjdGl2ZUZpbGUpIHtcbiAgICAgIG5ldyBOb3RpY2UoXCJcdThCRjdcdTUxNDhcdTYyNTNcdTVGMDBcdTRFMDBcdTRFMkFcdTY4NDhcdTRFRjZcdTY1ODdcdTRFRjZcdTMwMDJcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgY2FjaGUgPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShhY3RpdmVGaWxlKTtcbiAgICBpZiAoY2FjaGU/LmZyb250bWF0dGVyPy50eXBlICE9PSBcImNhc2VcIikge1xuICAgICAgbmV3IE5vdGljZShcIlx1NUY1M1x1NTI0RFx1NjI1M1x1NUYwMFx1NzY4NFx1NEUwRFx1NjYyRlx1Njg0OFx1NEVGNlx1NjU4N1x1NEVGNlx1MzAwMlwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLmNyZWF0ZVRhc2tGcm9tQ2FzZShhY3RpdmVGaWxlLnBhdGgpO1xuICB9XG5cbiAgYXN5bmMgY3JlYXRlRXZpZGVuY2VGcm9tQ2FzZShjYXNlUGF0aDogc3RyaW5nLCB0aXRsZT86IHN0cmluZyk6IFByb21pc2U8VEZpbGU+IHtcbiAgICBjb25zdCBhYnN0cmFjdCA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChjYXNlUGF0aCk7XG4gICAgaWYgKCEoYWJzdHJhY3QgaW5zdGFuY2VvZiBURmlsZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlx1NjI3RVx1NEUwRFx1NTIzMFx1NUJGOVx1NUU5NFx1Njg0OFx1NEVGNlx1NjU4N1x1NEVGNlx1MzAwMlwiKTtcbiAgICB9XG5cbiAgICBjb25zdCBldmlkZW5jZVRpdGxlID0gdGl0bGUgPz8gYCR7YWJzdHJhY3QuYmFzZW5hbWV9IEV2aWRlbmNlICR7bmV3IERhdGUoKS50b0lTT1N0cmluZygpLnNsaWNlKDExLCAxNil9YDtcbiAgICBjb25zdCBmaWxlID0gYXdhaXQgY3JlYXRlVHlwZWROb3RlKFxuICAgICAgdGhpcy5hcHAsXG4gICAgICB0aGlzLnNldHRpbmdzLmV2aWRlbmNlRm9sZGVyLFxuICAgICAgZXZpZGVuY2VUaXRsZSxcbiAgICAgIGJ1aWxkRXZpZGVuY2VUZW1wbGF0ZShldmlkZW5jZVRpdGxlLCBhYnN0cmFjdC5iYXNlbmFtZSwgYWJzdHJhY3QucGF0aClcbiAgICApO1xuXG4gICAgYXdhaXQgdGhpcy5vcGVuRmlsZShmaWxlKTtcbiAgICByZXR1cm4gZmlsZTtcbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZUV2aWRlbmNlTm90ZSh0aXRsZSA9IHRoaXMuZGVmYXVsdFRpdGxlKFwiTmV3IEV2aWRlbmNlXCIpKTogUHJvbWlzZTxURmlsZT4ge1xuICAgIGNvbnN0IGZpbGUgPSBhd2FpdCBjcmVhdGVUeXBlZE5vdGUoXG4gICAgICB0aGlzLmFwcCxcbiAgICAgIHRoaXMuc2V0dGluZ3MuZXZpZGVuY2VGb2xkZXIsXG4gICAgICB0aXRsZSxcbiAgICAgIGJ1aWxkRXZpZGVuY2VUZW1wbGF0ZSh0aXRsZSlcbiAgICApO1xuICAgIGF3YWl0IHRoaXMub3BlbkZpbGUoZmlsZSk7XG4gICAgcmV0dXJuIGZpbGU7XG4gIH1cblxuICBhc3luYyBhcmNoaXZlQ29sbGVjdGlvbkFzRXZpZGVuY2UoY29sbGVjdGlvblBhdGg6IHN0cmluZyk6IFByb21pc2U8VEZpbGUgfCBudWxsPiB7XG4gICAgY29uc3QgYWJzdHJhY3QgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoY29sbGVjdGlvblBhdGgpO1xuICAgIGlmICghKGFic3RyYWN0IGluc3RhbmNlb2YgVEZpbGUpKSB7XG4gICAgICBuZXcgTm90aWNlKFwiXHU2MjdFXHU0RTBEXHU1MjMwXHU4OTgxXHU1RjUyXHU2ODYzXHU3Njg0XHU3ODE0XHU4QkZCXHU2NzYxXHU3NkVFXHUzMDAyXCIpO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgZmlyc3RDb25maXJtID0gd2luZG93LmNvbmZpcm0oYFx1NUMwNlx1MzAwQyR7YWJzdHJhY3QuYmFzZW5hbWV9XHUzMDBEXHU1MkEwXHU1MTY1XHU4QkMxXHU3MjY5XHU2N0RDXHVGRjFGXFxuXFxuXHU4RkQ5XHU0RjFBXHU1MjFCXHU1RUZBXHU0RTAwXHU0RUZEXHU1M0VGXHU3RUU3XHU3RUVEXHU3RjE2XHU4RjkxXHU3Njg0XHU4QkMxXHU3MjY5XHU3QjE0XHU4QkIwXHVGRjBDXHU1MzlGXHU3ODE0XHU4QkZCXHU2NzYxXHU3NkVFXHU0RjFBXHU0RkREXHU3NTU5XHUzMDAyYCk7XG4gICAgaWYgKCFmaXJzdENvbmZpcm0pIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBzZWNvbmRDb25maXJtID0gd2luZG93LmNvbmZpcm0oYFx1NTE4RFx1NkIyMVx1Nzg2RVx1OEJBNFx1RkYxQVx1NjI4QVx1MzAwQyR7YWJzdHJhY3QuYmFzZW5hbWV9XHUzMDBEXHU2Qzg5XHU2REMwXHU0RTNBXHU4QkMxXHU3MjY5XHU2N0RDXHU2NzYxXHU3NkVFXHVGRjFGYCk7XG4gICAgaWYgKCFzZWNvbmRDb25maXJtKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBjYWNoZSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGFic3RyYWN0KTtcbiAgICBjb25zdCBmcm9udG1hdHRlciA9IGNhY2hlPy5mcm9udG1hdHRlcjtcbiAgICBjb25zdCB0aXRsZSA9IGAke2Fic3RyYWN0LmJhc2VuYW1lfSBFdmlkZW5jZWA7XG4gICAgY29uc3Qgc291cmNlQm9keSA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNhY2hlZFJlYWQoYWJzdHJhY3QpO1xuICAgIGNvbnN0IGZpbGUgPSBhd2FpdCBjcmVhdGVUeXBlZE5vdGUoXG4gICAgICB0aGlzLmFwcCxcbiAgICAgIHRoaXMuc2V0dGluZ3MuZXZpZGVuY2VGb2xkZXIsXG4gICAgICB0aXRsZSxcbiAgICAgIGAke2J1aWxkRXZpZGVuY2VUZW1wbGF0ZSh0aXRsZSwgU3RyaW5nKGZyb250bWF0dGVyPy5jYXNlID8/IFwiXCIpLCBTdHJpbmcoZnJvbnRtYXR0ZXI/LmNhc2VQYXRoID8/IFwiXCIpKX1cbiMjIFx1Njc2NVx1NkU5MFx1NzgxNFx1OEJGQlxuLSBcdTUzOUZcdTU5Q0JcdTY3NjFcdTc2RUVcdUZGMUFbWyR7YWJzdHJhY3QuYmFzZW5hbWV9XV1cbi0gXHU1MzlGXHU1OUNCXHU4REVGXHU1Rjg0XHVGRjFBJHthYnN0cmFjdC5wYXRofVxuXG4jIyBcdTUzOUZcdTU5Q0JcdTdCMTRcdThCQjBcdTY0NThcdTVGNTVcbiR7c291cmNlQm9keS5yZXBsYWNlKC9eLS0tW1xcc1xcU10qPy0tLVxccyovLCBcIlwiKS50cmltKCkgfHwgXCItIFwifVxuYFxuICAgICk7XG5cbiAgICBhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoZmlsZSwgKGV2aWRlbmNlRnJvbnRtYXR0ZXIpID0+IHtcbiAgICAgIGV2aWRlbmNlRnJvbnRtYXR0ZXIudHlwZSA9IFwiZXZpZGVuY2VcIjtcbiAgICAgIGV2aWRlbmNlRnJvbnRtYXR0ZXIuc291cmNlID0gYWJzdHJhY3QucGF0aDtcbiAgICAgIGV2aWRlbmNlRnJvbnRtYXR0ZXIuY2FzZSA9IHR5cGVvZiBmcm9udG1hdHRlcj8uY2FzZSA9PT0gXCJzdHJpbmdcIiA/IGZyb250bWF0dGVyLmNhc2UgOiBcIlwiO1xuICAgICAgZXZpZGVuY2VGcm9udG1hdHRlci5jYXNlUGF0aCA9IHR5cGVvZiBmcm9udG1hdHRlcj8uY2FzZVBhdGggPT09IFwic3RyaW5nXCIgPyBmcm9udG1hdHRlci5jYXNlUGF0aCA6IFwiXCI7XG4gICAgICBldmlkZW5jZUZyb250bWF0dGVyLnVwZGF0ZWQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoYWJzdHJhY3QsIChjb2xsZWN0aW9uRnJvbnRtYXR0ZXIpID0+IHtcbiAgICAgIGNvbGxlY3Rpb25Gcm9udG1hdHRlci50eXBlID0gXCJjb2xsZWN0aW9uXCI7XG4gICAgICBjb2xsZWN0aW9uRnJvbnRtYXR0ZXIuc3RhdHVzID0gXCJmaW5pc2hlZFwiO1xuICAgICAgY29sbGVjdGlvbkZyb250bWF0dGVyLnVwZGF0ZWQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgfSk7XG5cbiAgICBuZXcgTm90aWNlKGBcdTVERjJcdTUyQTBcdTUxNjVcdThCQzFcdTcyNjlcdTY3REM6ICR7ZmlsZS5iYXNlbmFtZX1gKTtcbiAgICBhd2FpdCB0aGlzLnJlZnJlc2hXb3Jrc3BhY2UoKTtcbiAgICBhd2FpdCB0aGlzLm9wZW5GaWxlKGZpbGUpO1xuICAgIHJldHVybiBmaWxlO1xuICB9XG5cbiAgYXN5bmMgZW5zdXJlRXZpZGVuY2VGb2xkZXJGb3JDYXNlKGNhc2VQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IGFic3RyYWN0ID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGNhc2VQYXRoKTtcbiAgICBpZiAoIShhYnN0cmFjdCBpbnN0YW5jZW9mIFRGaWxlKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiXHU2MjdFXHU0RTBEXHU1MjMwXHU1QkY5XHU1RTk0XHU2ODQ4XHU0RUY2XHU2NTg3XHU0RUY2XHUzMDAyXCIpO1xuICAgIH1cblxuICAgIGNvbnN0IHNhZmVOYW1lID0gYWJzdHJhY3QuYmFzZW5hbWUucmVwbGFjZSgvW1xcXFwvOio/XCI8PnxdL2csIFwiLVwiKS50cmltKCkgfHwgXCJVbnRpdGxlZCBDYXNlXCI7XG4gICAgY29uc3QgZm9sZGVyUGF0aCA9IGAke3RoaXMuc2V0dGluZ3MuZXZpZGVuY2VGb2xkZXIucmVwbGFjZSgvXFwvJC8sIFwiXCIpfS8ke3NhZmVOYW1lfWA7XG4gICAgaWYgKCF0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoZm9sZGVyUGF0aCkpIHtcbiAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZUZvbGRlcihmb2xkZXJQYXRoKTtcbiAgICB9XG4gICAgbmV3IE5vdGljZShgXHU1REYyXHU1RUZBXHU3QUNCXHU2ODQ4XHU0RUY2XHU4RDQ0XHU2NTk5XHU1OTM5OiAke2ZvbGRlclBhdGh9YCk7XG4gICAgYXdhaXQgdGhpcy5yZWZyZXNoV29ya3NwYWNlKCk7XG4gICAgcmV0dXJuIGZvbGRlclBhdGg7XG4gIH1cblxuICBhc3luYyByZXZlYWxFdmlkZW5jZUZvbGRlckZvckNhc2UoY2FzZVBhdGg6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGZvbGRlclBhdGggPSBhd2FpdCB0aGlzLmVuc3VyZUV2aWRlbmNlRm9sZGVyRm9yQ2FzZShjYXNlUGF0aCk7XG4gICAgY29uc3QgYWRhcHRlciA9IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIgYXMgdW5rbm93biBhcyB7IGdldEJhc2VQYXRoPzogKCkgPT4gc3RyaW5nIH07XG4gICAgY29uc3QgYmFzZVBhdGggPSBhZGFwdGVyLmdldEJhc2VQYXRoPy4oKTtcbiAgICBpZiAoIWJhc2VQYXRoKSB7XG4gICAgICBuZXcgTm90aWNlKGBcdTY4NDhcdTRFRjZcdThENDRcdTY1OTlcdTU5MzlcdTVERjJcdTVFRkFcdTdBQ0I6ICR7Zm9sZGVyUGF0aH1gKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgYXdhaXQgc2hlbGwub3BlblBhdGgoam9pbihiYXNlUGF0aCwgZm9sZGVyUGF0aCkpO1xuICB9XG5cbiAgYXN5bmMgY3JlYXRlRXZpZGVuY2VGb3JBY3RpdmVDYXNlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGFjdGl2ZUZpbGUgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlRmlsZSgpO1xuICAgIGlmICghYWN0aXZlRmlsZSkge1xuICAgICAgbmV3IE5vdGljZShcIlx1OEJGN1x1NTE0OFx1NjI1M1x1NUYwMFx1NEUwMFx1NEUyQVx1Njg0OFx1NEVGNlx1NjU4N1x1NEVGNlx1MzAwMlwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBjYWNoZSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGFjdGl2ZUZpbGUpO1xuICAgIGlmIChjYWNoZT8uZnJvbnRtYXR0ZXI/LnR5cGUgIT09IFwiY2FzZVwiKSB7XG4gICAgICBuZXcgTm90aWNlKFwiXHU1RjUzXHU1MjREXHU2MjUzXHU1RjAwXHU3Njg0XHU0RTBEXHU2NjJGXHU2ODQ4XHU0RUY2XHU2NTg3XHU0RUY2XHUzMDAyXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMuY3JlYXRlRXZpZGVuY2VGcm9tQ2FzZShhY3RpdmVGaWxlLnBhdGgpO1xuICB9XG5cbiAgYXN5bmMgY3JlYXRlU2NoZWR1bGVOb3RlKHRpdGxlID0gdGhpcy5kZWZhdWx0VGl0bGUoXCJOZXcgU2NoZWR1bGVcIikpOiBQcm9taXNlPFRGaWxlPiB7XG4gICAgY29uc3QgZmlsZSA9IGF3YWl0IGNyZWF0ZVR5cGVkTm90ZShcbiAgICAgIHRoaXMuYXBwLFxuICAgICAgdGhpcy5zZXR0aW5ncy5zY2hlZHVsZUZvbGRlcixcbiAgICAgIHRpdGxlLFxuICAgICAgYnVpbGRTY2hlZHVsZVRlbXBsYXRlKHRpdGxlKVxuICAgICk7XG4gICAgYXdhaXQgdGhpcy5vcGVuRmlsZShmaWxlKTtcbiAgICByZXR1cm4gZmlsZTtcbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZUNvbGxlY3Rpb25Ob3RlKHRpdGxlID0gdGhpcy5kZWZhdWx0VGl0bGUoXCJOZXcgQ29sbGVjdGlvblwiKSk6IFByb21pc2U8VEZpbGU+IHtcbiAgICBjb25zdCBmaWxlID0gYXdhaXQgY3JlYXRlVHlwZWROb3RlKFxuICAgICAgdGhpcy5hcHAsXG4gICAgICB0aGlzLnNldHRpbmdzLmNvbGxlY3Rpb25Gb2xkZXIsXG4gICAgICB0aXRsZSxcbiAgICAgIGJ1aWxkQ29sbGVjdGlvblRlbXBsYXRlKHRpdGxlKVxuICAgICk7XG4gICAgYXdhaXQgdGhpcy5vcGVuRmlsZShmaWxlKTtcbiAgICByZXR1cm4gZmlsZTtcbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZVBsYWNlTm90ZSgpOiBQcm9taXNlPFRGaWxlIHwgbnVsbD4ge1xuICAgIHJldHVybiB0aGlzLmNyZWF0ZVBsYWNlV2l0aFRpdGxlQXRNYXBQZXJjZW50KHRoaXMuZGVmYXVsdFBsYWNlVGl0bGUoKSwgNTAsIDUwKTtcbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZVBsYWNlRnJvbU1hcENsaWNrKHhQZXJjZW50OiBudW1iZXIsIHlQZXJjZW50OiBudW1iZXIpOiBQcm9taXNlPFRGaWxlIHwgbnVsbD4ge1xuICAgIHJldHVybiB0aGlzLmNyZWF0ZVBsYWNlV2l0aFRpdGxlQXRNYXBQZXJjZW50KHRoaXMuZGVmYXVsdFBsYWNlVGl0bGUoKSwgeFBlcmNlbnQsIHlQZXJjZW50KTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgY3JlYXRlUGxhY2VXaXRoVGl0bGVBdE1hcFBlcmNlbnQodGl0bGU6IHN0cmluZywgeFBlcmNlbnQ6IG51bWJlciwgeVBlcmNlbnQ6IG51bWJlcik6IFByb21pc2U8VEZpbGUgfCBudWxsPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgbGF0aXR1ZGUsIGxvbmdpdHVkZSwgbGF0aXR1ZGVIZW1pc3BoZXJlLCBsb25naXR1ZGVIZW1pc3BoZXJlIH0gPSB0aGlzLmNvbnZlcnRNYXBQZXJjZW50VG9Db29yZGluYXRlcyh4UGVyY2VudCwgeVBlcmNlbnQpO1xuICAgICAgY29uc3QgZmlsZSA9IGF3YWl0IGNyZWF0ZVR5cGVkTm90ZShcbiAgICAgICAgdGhpcy5hcHAsXG4gICAgICAgIHRoaXMuc2V0dGluZ3MucGxhY2VGb2xkZXIsXG4gICAgICAgIHRpdGxlLFxuICAgICAgICBidWlsZFBsYWNlVGVtcGxhdGUodGl0bGUsIGxhdGl0dWRlLCBsb25naXR1ZGUsIGxhdGl0dWRlSGVtaXNwaGVyZSwgbG9uZ2l0dWRlSGVtaXNwaGVyZSlcbiAgICAgICk7XG4gICAgICBhd2FpdCB0aGlzLm9wZW5GaWxlKGZpbGUpO1xuICAgICAgcmV0dXJuIGZpbGU7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMuZGVidWdMb2coYGNyZWF0ZVBsYWNlTm90ZTplcnJvcjoke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5zdGFjayA/PyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgICAgIG5ldyBOb3RpY2UoYFx1NjVFMFx1NkNENVx1NTIxQlx1NUVGQVx1OERCM1x1OEZGOTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFwiXHU2NzJBXHU3N0U1XHU5NTE5XHU4QkVGXCJ9YCk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGRlZmF1bHRQbGFjZVRpdGxlKCk6IHN0cmluZyB7XG4gICAgY29uc3Qgc3RhbXAgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkucmVwbGFjZShcIlRcIiwgXCIgXCIpLnNsaWNlKDAsIDE2KTtcbiAgICByZXR1cm4gYEZvb3RwcmludCAke3N0YW1wfWA7XG4gIH1cblxuICBwcml2YXRlIGNvbnZlcnRNYXBQZXJjZW50VG9Db29yZGluYXRlcyh4UGVyY2VudDogbnVtYmVyLCB5UGVyY2VudDogbnVtYmVyKToge1xuICAgIGxhdGl0dWRlOiBudW1iZXI7XG4gICAgbG9uZ2l0dWRlOiBudW1iZXI7XG4gICAgbGF0aXR1ZGVIZW1pc3BoZXJlOiBcIk5cIiB8IFwiU1wiO1xuICAgIGxvbmdpdHVkZUhlbWlzcGhlcmU6IFwiRVwiIHwgXCJXXCI7XG4gIH0ge1xuICAgIGNvbnN0IGNsYW1wZWRYID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oMTAwLCB4UGVyY2VudCkpO1xuICAgIGNvbnN0IGNsYW1wZWRZID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oMTAwLCB5UGVyY2VudCkpO1xuICAgIGNvbnN0IHJhd0xvbmdpdHVkZSA9IChjbGFtcGVkWCAvIDEwMCkgKiAzNjAgLSAxODAgKyAxMDU7XG4gICAgY29uc3Qgbm9ybWFsaXplZExvbmdpdHVkZSA9ICgocmF3TG9uZ2l0dWRlICsgMTgwKSAlIDM2MCArIDM2MCkgJSAzNjAgLSAxODA7XG4gICAgY29uc3QgcmF3TGF0aXR1ZGUgPSA5MCAtIChjbGFtcGVkWSAvIDEwMCkgKiAxODA7XG4gICAgY29uc3QgbGF0aXR1ZGVIZW1pc3BoZXJlID0gcmF3TGF0aXR1ZGUgPj0gMCA/IFwiTlwiIDogXCJTXCI7XG4gICAgY29uc3QgbG9uZ2l0dWRlSGVtaXNwaGVyZSA9IG5vcm1hbGl6ZWRMb25naXR1ZGUgPj0gMCA/IFwiRVwiIDogXCJXXCI7XG4gICAgcmV0dXJuIHtcbiAgICAgIGxhdGl0dWRlOiBNYXRoLnJvdW5kKE1hdGguYWJzKHJhd0xhdGl0dWRlKSAqIDEwMCkgLyAxMDAsXG4gICAgICBsb25naXR1ZGU6IE1hdGgucm91bmQoTWF0aC5hYnMobm9ybWFsaXplZExvbmdpdHVkZSkgKiAxMDApIC8gMTAwLFxuICAgICAgbGF0aXR1ZGVIZW1pc3BoZXJlLFxuICAgICAgbG9uZ2l0dWRlSGVtaXNwaGVyZVxuICAgIH07XG4gIH1cblxuICBhc3luYyBjcmVhdGVRdWlja1NjaGVkdWxlKGRheTogc3RyaW5nLCBzdGFydDogc3RyaW5nLCBlbmQ6IHN0cmluZyk6IFByb21pc2U8VEZpbGU+IHtcbiAgICBjb25zdCB0aXRsZSA9IGAke2RheX0gJHtzdGFydH0gSW52ZXN0aWdhdGlvbmA7XG4gICAgY29uc3QgZmlsZSA9IGF3YWl0IGNyZWF0ZVR5cGVkTm90ZShcbiAgICAgIHRoaXMuYXBwLFxuICAgICAgdGhpcy5zZXR0aW5ncy5zY2hlZHVsZUZvbGRlcixcbiAgICAgIHRpdGxlLFxuICAgICAgYnVpbGRTY2hlZHVsZVRlbXBsYXRlKHRpdGxlKVxuICAgICk7XG5cbiAgICBhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoZmlsZSwgKGZyb250bWF0dGVyKSA9PiB7XG4gICAgICBmcm9udG1hdHRlci5kYXkgPSBkYXk7XG4gICAgICBmcm9udG1hdHRlci5zdGFydCA9IHN0YXJ0O1xuICAgICAgZnJvbnRtYXR0ZXIuZW5kID0gZW5kO1xuICAgICAgZnJvbnRtYXR0ZXIuZHVyYXRpb25NaW51dGVzID0gdGhpcy5kaWZmTWludXRlcyhzdGFydCwgZW5kKTtcbiAgICAgIGZyb250bWF0dGVyLnVwZGF0ZWQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgICBpZiAodHlwZW9mIGZyb250bWF0dGVyLnJlbGF0ZWRUYXNrICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIGZyb250bWF0dGVyLnJlbGF0ZWRUYXNrID0gXCJcIjtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgZnJvbnRtYXR0ZXIucmVsYXRlZFRhc2tQYXRoICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIGZyb250bWF0dGVyLnJlbGF0ZWRUYXNrUGF0aCA9IFwiXCI7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBhd2FpdCB0aGlzLm9wZW5GaWxlKGZpbGUpO1xuICAgIHJldHVybiBmaWxlO1xuICB9XG5cbiAgYXN5bmMgc2NoZWR1bGVUYXNrRnJvbURhc2hib2FyZCh0YXNrUGF0aDogc3RyaW5nLCBkYXk6IHN0cmluZywgc3RhcnQ6IHN0cmluZywgZW5kOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBhYnN0cmFjdCA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aCh0YXNrUGF0aCk7XG4gICAgaWYgKCEoYWJzdHJhY3QgaW5zdGFuY2VvZiBURmlsZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlx1NjI3RVx1NEUwRFx1NTIzMFx1ODk4MVx1NUI4OVx1NjM5Mlx1NzY4NFx1NEVGQlx1NTJBMVx1NjU4N1x1NEVGNlx1MzAwMlwiKTtcbiAgICB9XG5cbiAgICBjb25zdCB0YXNrRmlsZSA9IGFic3RyYWN0O1xuICAgIGNvbnN0IHNjaGVkdWxlVGl0bGUgPSBgJHtkYXl9ICR7c3RhcnR9ICR7dGFza0ZpbGUuYmFzZW5hbWV9YDtcbiAgICBjb25zdCBzY2hlZHVsZUZpbGUgPSBhd2FpdCBjcmVhdGVUeXBlZE5vdGUoXG4gICAgICB0aGlzLmFwcCxcbiAgICAgIHRoaXMuc2V0dGluZ3Muc2NoZWR1bGVGb2xkZXIsXG4gICAgICBzY2hlZHVsZVRpdGxlLFxuICAgICAgYnVpbGRTY2hlZHVsZVRlbXBsYXRlKHNjaGVkdWxlVGl0bGUpXG4gICAgKTtcblxuICAgIGF3YWl0IHRoaXMuYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihzY2hlZHVsZUZpbGUsIChmcm9udG1hdHRlcikgPT4ge1xuICAgICAgZnJvbnRtYXR0ZXIuZGF5ID0gZGF5O1xuICAgICAgZnJvbnRtYXR0ZXIuc3RhcnQgPSBzdGFydDtcbiAgICAgIGZyb250bWF0dGVyLmVuZCA9IGVuZDtcbiAgICAgIGZyb250bWF0dGVyLmR1cmF0aW9uTWludXRlcyA9IHRoaXMuZGlmZk1pbnV0ZXMoc3RhcnQsIGVuZCk7XG4gICAgICBmcm9udG1hdHRlci5yZWxhdGVkVGFzayA9IHRhc2tGaWxlLmJhc2VuYW1lO1xuICAgICAgZnJvbnRtYXR0ZXIucmVsYXRlZFRhc2tQYXRoID0gdGFza0ZpbGUucGF0aDtcbiAgICAgIGZyb250bWF0dGVyLnVwZGF0ZWQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIodGFza0ZpbGUsIChmcm9udG1hdHRlcikgPT4ge1xuICAgICAgZnJvbnRtYXR0ZXIudHlwZSA9IFwidGFza1wiO1xuICAgICAgZnJvbnRtYXR0ZXIuc3RhdHVzID0gXCJzY2hlZHVsZWRcIjtcbiAgICAgIGZyb250bWF0dGVyLnVwZGF0ZWQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgfSk7XG5cbiAgICBuZXcgTm90aWNlKGBcdTVERjJcdTVDMDYgJHt0YXNrRmlsZS5iYXNlbmFtZX0gXHU1Qjg5XHU2MzkyXHU1MjMwICR7ZGF5fSAke3N0YXJ0fWApO1xuICAgIGF3YWl0IHRoaXMucmVmcmVzaFdvcmtzcGFjZSgpO1xuICB9XG5cbiAgYXN5bmMgbW92ZVNjaGVkdWxlRW50cnkoc2NoZWR1bGVQYXRoOiBzdHJpbmcsIGRheTogc3RyaW5nLCBzdGFydDogc3RyaW5nLCBlbmQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGFic3RyYWN0ID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHNjaGVkdWxlUGF0aCk7XG4gICAgaWYgKCEoYWJzdHJhY3QgaW5zdGFuY2VvZiBURmlsZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlx1NjI3RVx1NEUwRFx1NTIzMFx1ODk4MVx1NzlGQlx1NTJBOFx1NzY4NFx1NjM5Mlx1NjcxRlx1NjU4N1x1NEVGNlx1MzAwMlwiKTtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoYWJzdHJhY3QsIChmcm9udG1hdHRlcikgPT4ge1xuICAgICAgZnJvbnRtYXR0ZXIudHlwZSA9IFwic2NoZWR1bGVcIjtcbiAgICAgIGZyb250bWF0dGVyLmRheSA9IGRheTtcbiAgICAgIGZyb250bWF0dGVyLnN0YXJ0ID0gc3RhcnQ7XG4gICAgICBmcm9udG1hdHRlci5lbmQgPSBlbmQ7XG4gICAgICBmcm9udG1hdHRlci5kdXJhdGlvbk1pbnV0ZXMgPSB0aGlzLmRpZmZNaW51dGVzKHN0YXJ0LCBlbmQpO1xuICAgICAgZnJvbnRtYXR0ZXIudXBkYXRlZCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICB9KTtcblxuICAgIG5ldyBOb3RpY2UoYFx1NURGMlx1OEMwM1x1NjU3NFx1NjM5Mlx1NjcxRlx1NTIzMCAke2RheX0gJHtzdGFydH1gKTtcbiAgICBhd2FpdCB0aGlzLnJlZnJlc2hXb3Jrc3BhY2UoKTtcbiAgfVxuXG4gIGFzeW5jIGFkanVzdFNjaGVkdWxlRHVyYXRpb24oc2NoZWR1bGVQYXRoOiBzdHJpbmcsIGRlbHRhTWludXRlczogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgYWJzdHJhY3QgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoc2NoZWR1bGVQYXRoKTtcbiAgICBpZiAoIShhYnN0cmFjdCBpbnN0YW5jZW9mIFRGaWxlKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiXHU2MjdFXHU0RTBEXHU1MjMwXHU4OTgxXHU4QzAzXHU2NTc0XHU2NUY2XHU5NTdGXHU3Njg0XHU2MzkyXHU2NzFGXHU2NTg3XHU0RUY2XHUzMDAyXCIpO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMuYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihhYnN0cmFjdCwgKGZyb250bWF0dGVyKSA9PiB7XG4gICAgICBjb25zdCBzdGFydCA9IHR5cGVvZiBmcm9udG1hdHRlci5zdGFydCA9PT0gXCJzdHJpbmdcIiA/IGZyb250bWF0dGVyLnN0YXJ0IDogXCIwOTowMFwiO1xuICAgICAgY29uc3QgY3VycmVudER1cmF0aW9uID1cbiAgICAgICAgdHlwZW9mIGZyb250bWF0dGVyLmR1cmF0aW9uTWludXRlcyA9PT0gXCJudW1iZXJcIlxuICAgICAgICAgID8gZnJvbnRtYXR0ZXIuZHVyYXRpb25NaW51dGVzXG4gICAgICAgICAgOiB0aGlzLmRpZmZNaW51dGVzKFxuICAgICAgICAgICAgICBzdGFydCxcbiAgICAgICAgICAgICAgdHlwZW9mIGZyb250bWF0dGVyLmVuZCA9PT0gXCJzdHJpbmdcIiA/IGZyb250bWF0dGVyLmVuZCA6IHRoaXMuYWRkTWludXRlcyhzdGFydCwgNjApXG4gICAgICAgICAgICApO1xuICAgICAgY29uc3QgbmV4dER1cmF0aW9uID0gTWF0aC5tYXgoMzAsIE1hdGgubWluKDI0MCwgY3VycmVudER1cmF0aW9uICsgZGVsdGFNaW51dGVzKSk7XG4gICAgICBmcm9udG1hdHRlci5zdGFydCA9IHN0YXJ0O1xuICAgICAgZnJvbnRtYXR0ZXIuZHVyYXRpb25NaW51dGVzID0gbmV4dER1cmF0aW9uO1xuICAgICAgZnJvbnRtYXR0ZXIuZW5kID0gdGhpcy5hZGRNaW51dGVzKHN0YXJ0LCBuZXh0RHVyYXRpb24pO1xuICAgICAgZnJvbnRtYXR0ZXIudXBkYXRlZCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICB9KTtcblxuICAgIGF3YWl0IHRoaXMucmVmcmVzaFdvcmtzcGFjZSgpO1xuICB9XG5cbiAgYXN5bmMgbW92ZVNjaGVkdWxlVG9OZXh0RnJlZVNsb3Qoc2NoZWR1bGVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBhYnN0cmFjdCA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChzY2hlZHVsZVBhdGgpO1xuICAgIGlmICghKGFic3RyYWN0IGluc3RhbmNlb2YgVEZpbGUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJcdTYyN0VcdTRFMERcdTUyMzBcdTg5ODFcdTk4N0FcdTVFRjZcdTc2ODRcdTYzOTJcdTY3MUZcdTY1ODdcdTRFRjZcdTMwMDJcIik7XG4gICAgfVxuXG4gICAgY29uc3QgY2FjaGUgPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShhYnN0cmFjdCk7XG4gICAgY29uc3QgZnJvbnRtYXR0ZXIgPSBjYWNoZT8uZnJvbnRtYXR0ZXI7XG4gICAgY29uc3QgY3VycmVudERheSA9IHR5cGVvZiBmcm9udG1hdHRlcj8uZGF5ID09PSBcInN0cmluZ1wiID8gZnJvbnRtYXR0ZXIuZGF5IDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLnNsaWNlKDAsIDEwKTtcbiAgICBjb25zdCBjdXJyZW50U3RhcnQgPSB0eXBlb2YgZnJvbnRtYXR0ZXI/LnN0YXJ0ID09PSBcInN0cmluZ1wiID8gZnJvbnRtYXR0ZXIuc3RhcnQgOiBcIjA4OjAwXCI7XG4gICAgY29uc3QgZHVyYXRpb24gPVxuICAgICAgdHlwZW9mIGZyb250bWF0dGVyPy5kdXJhdGlvbk1pbnV0ZXMgPT09IFwibnVtYmVyXCJcbiAgICAgICAgPyBmcm9udG1hdHRlci5kdXJhdGlvbk1pbnV0ZXNcbiAgICAgICAgOiB0aGlzLmRpZmZNaW51dGVzKFxuICAgICAgICAgICAgY3VycmVudFN0YXJ0LFxuICAgICAgICAgICAgdHlwZW9mIGZyb250bWF0dGVyPy5lbmQgPT09IFwic3RyaW5nXCIgPyBmcm9udG1hdHRlci5lbmQgOiB0aGlzLmFkZE1pbnV0ZXMoY3VycmVudFN0YXJ0LCA2MClcbiAgICAgICAgICApO1xuXG4gICAgY29uc3Qgd29ya3NwYWNlRGF0YSA9IGF3YWl0IHRoaXMuZ2V0V29ya3NwYWNlRGF0YSgpO1xuICAgIGNvbnN0IGNhbmRpZGF0ZSA9IHRoaXMuZmluZE5leHRGcmVlU2xvdChjdXJyZW50RGF5LCBjdXJyZW50U3RhcnQsIGR1cmF0aW9uLCB3b3Jrc3BhY2VEYXRhLnNjaGVkdWxlcywgc2NoZWR1bGVQYXRoKTtcbiAgICBpZiAoIWNhbmRpZGF0ZSkge1xuICAgICAgbmV3IE5vdGljZShcIlx1NjcyQ1x1NTQ2OFx1NkNBMVx1NjcwOVx1NjI3RVx1NTIzMFx1NTNFRlx1OTg3QVx1NUVGNlx1NzY4NFx1N0E3QVx1Njg2M1x1MzAwMlwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLm1vdmVTY2hlZHVsZUVudHJ5KHNjaGVkdWxlUGF0aCwgY2FuZGlkYXRlLmRheSwgY2FuZGlkYXRlLnN0YXJ0LCBjYW5kaWRhdGUuZW5kKTtcbiAgfVxuXG4gIGFzeW5jIG9wZW5QYXRoKHBhdGg6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGFic3RyYWN0OiBUQWJzdHJhY3RGaWxlIHwgbnVsbCA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChwYXRoKTtcbiAgICBpZiAoIShhYnN0cmFjdCBpbnN0YW5jZW9mIFRGaWxlKSkge1xuICAgICAgbmV3IE5vdGljZShcIlx1NUJGOVx1NUU5NFx1NjU4N1x1NEVGNlx1NEUwRFx1NUI1OFx1NTcyOFx1MzAwMlwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgYXdhaXQgdGhpcy5hcHAud29ya3NwYWNlLmdldExlYWYodHJ1ZSkub3BlbkZpbGUoYWJzdHJhY3QpO1xuICB9XG5cbiAgYXN5bmMgZGVsZXRlUGF0aChwYXRoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBhYnN0cmFjdDogVEFic3RyYWN0RmlsZSB8IG51bGwgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgocGF0aCk7XG4gICAgaWYgKCEoYWJzdHJhY3QgaW5zdGFuY2VvZiBURmlsZSkpIHtcbiAgICAgIG5ldyBOb3RpY2UoXCJcdTVCRjlcdTVFOTRcdTY1ODdcdTRFRjZcdTRFMERcdTVCNThcdTU3MjhcdUZGMENcdTY1RTBcdTZDRDVcdTUyMjBcdTk2NjRcdTMwMDJcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGNvbmZpcm1lZCA9IHdpbmRvdy5jb25maXJtKGBcdTc4NkVcdTVCOUFcdTUyMjBcdTk2NjRcdTMwMEMke2Fic3RyYWN0LmJhc2VuYW1lfVx1MzAwRFx1NTQxN1x1RkYxRlx1NjU4N1x1NEVGNlx1NEYxQVx1NzlGQlx1NTIzMFx1N0NGQlx1N0VERlx1NUU5Rlx1N0VCOFx1N0JEM1x1MzAwMmApO1xuICAgIGlmICghY29uZmlybWVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LnRyYXNoKGFic3RyYWN0LCB0cnVlKTtcbiAgICBuZXcgTm90aWNlKGBcdTVERjJcdTUyMjBcdTk2NjQgJHthYnN0cmFjdC5iYXNlbmFtZX1gKTtcbiAgICBhd2FpdCB0aGlzLnJlZnJlc2hXb3Jrc3BhY2UoKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgb3BlbkZpbGUoZmlsZTogVEZpbGUpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhZih0cnVlKS5vcGVuRmlsZShmaWxlKTtcbiAgICBuZXcgTm90aWNlKGBTaGVybG9jayBPUyBcdTVERjJcdTYyNTNcdTVGMDAgJHtmaWxlLmJhc2VuYW1lfWApO1xuICAgIGF3YWl0IHRoaXMucmVmcmVzaFdvcmtzcGFjZSgpO1xuICB9XG5cbiAgcHJpdmF0ZSBkZWZhdWx0VGl0bGUocHJlZml4OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IHN0YW1wID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpLnJlcGxhY2UoXCJUXCIsIFwiIFwiKS5zbGljZSgwLCAxNik7XG4gICAgcmV0dXJuIGAke3ByZWZpeH0gJHtzdGFtcH1gO1xuICB9XG5cbiAgcHJpdmF0ZSBkaWZmTWludXRlcyhzdGFydDogc3RyaW5nLCBlbmQ6IHN0cmluZyk6IG51bWJlciB7XG4gICAgY29uc3Qgc3RhcnRNaW51dGVzID0gdGhpcy50aW1lVG9NaW51dGVzKHN0YXJ0KTtcbiAgICBjb25zdCBlbmRNaW51dGVzID0gdGhpcy50aW1lVG9NaW51dGVzKGVuZCk7XG4gICAgcmV0dXJuIE1hdGgubWF4KDMwLCBlbmRNaW51dGVzIC0gc3RhcnRNaW51dGVzKTtcbiAgfVxuXG4gIHByaXZhdGUgYWRkTWludXRlcyhzdGFydDogc3RyaW5nLCBhbW91bnQ6IG51bWJlcik6IHN0cmluZyB7XG4gICAgY29uc3QgbmV4dCA9IE1hdGgubWluKHRoaXMudGltZVRvTWludXRlcyhzdGFydCkgKyBhbW91bnQsIDIzICogNjAgKyAzMCk7XG4gICAgY29uc3QgaG91cnMgPSBNYXRoLmZsb29yKG5leHQgLyA2MCk7XG4gICAgY29uc3QgbWludXRlcyA9IG5leHQgJSA2MDtcbiAgICByZXR1cm4gYCR7U3RyaW5nKGhvdXJzKS5wYWRTdGFydCgyLCBcIjBcIil9OiR7U3RyaW5nKG1pbnV0ZXMpLnBhZFN0YXJ0KDIsIFwiMFwiKX1gO1xuICB9XG5cbiAgcHJpdmF0ZSB0aW1lVG9NaW51dGVzKHZhbHVlOiBzdHJpbmcpOiBudW1iZXIge1xuICAgIGNvbnN0IFtob3VycywgbWludXRlc10gPSB2YWx1ZS5zcGxpdChcIjpcIikubWFwKE51bWJlcik7XG4gICAgcmV0dXJuIGhvdXJzICogNjAgKyBtaW51dGVzO1xuICB9XG5cbiAgcHJpdmF0ZSBmaW5kTmV4dEZyZWVTbG90KFxuICAgIGN1cnJlbnREYXk6IHN0cmluZyxcbiAgICBjdXJyZW50U3RhcnQ6IHN0cmluZyxcbiAgICBkdXJhdGlvbjogbnVtYmVyLFxuICAgIHNjaGVkdWxlczogU2hlcmxvY2tXb3Jrc3BhY2VEYXRhW1wic2NoZWR1bGVzXCJdLFxuICAgIGlnbm9yZWRQYXRoOiBzdHJpbmdcbiAgKTogeyBkYXk6IHN0cmluZzsgc3RhcnQ6IHN0cmluZzsgZW5kOiBzdHJpbmcgfSB8IG51bGwge1xuICAgIGNvbnN0IHNsb3RzID0gW1wiMDg6MDBcIiwgXCIxMDowMFwiLCBcIjEyOjAwXCIsIFwiMTQ6MDBcIiwgXCIxNjowMFwiLCBcIjE5OjAwXCJdO1xuICAgIGNvbnN0IHdlZWsgPSB0aGlzLmJ1aWxkQ3VycmVudFdlZWsoKTtcbiAgICBjb25zdCBjdXJyZW50SW5kZXggPSB3ZWVrLmZpbmRJbmRleCgoZGF5KSA9PiBkYXkgPT09IGN1cnJlbnREYXkpO1xuICAgIGNvbnN0IG9yZGVyZWREYXlzID0gY3VycmVudEluZGV4ID49IDAgPyBbLi4ud2Vlay5zbGljZShjdXJyZW50SW5kZXgpLCAuLi53ZWVrLnNsaWNlKDAsIGN1cnJlbnRJbmRleCldIDogd2VlaztcblxuICAgIGZvciAoY29uc3QgZGF5IG9mIG9yZGVyZWREYXlzKSB7XG4gICAgICBmb3IgKGNvbnN0IHNsb3Qgb2Ygc2xvdHMpIHtcbiAgICAgICAgaWYgKGRheSA9PT0gY3VycmVudERheSAmJiB0aGlzLnRpbWVUb01pbnV0ZXMoc2xvdCkgPD0gdGhpcy50aW1lVG9NaW51dGVzKGN1cnJlbnRTdGFydCkpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBvY2N1cGllZCA9IHNjaGVkdWxlcy5zb21lKChpdGVtKSA9PiBpdGVtLmZpbGVQYXRoICE9PSBpZ25vcmVkUGF0aCAmJiBpdGVtLmRheSA9PT0gZGF5ICYmIGl0ZW0uc3RhcnQgPT09IHNsb3QpO1xuICAgICAgICBpZiAoIW9jY3VwaWVkKSB7XG4gICAgICAgICAgcmV0dXJuIHsgZGF5LCBzdGFydDogc2xvdCwgZW5kOiB0aGlzLmFkZE1pbnV0ZXMoc2xvdCwgZHVyYXRpb24pIH07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgYnVpbGRDdXJyZW50V2VlaygpOiBzdHJpbmdbXSB7XG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgICBjb25zdCBkYXkgPSBub3cuZ2V0RGF5KCk7XG4gICAgY29uc3QgbW9uZGF5RGVsdGEgPSBkYXkgPT09IDAgPyAtNiA6IDEgLSBkYXk7XG4gICAgY29uc3QgbW9uZGF5ID0gbmV3IERhdGUobm93KTtcbiAgICBtb25kYXkuc2V0RGF0ZShub3cuZ2V0RGF0ZSgpICsgbW9uZGF5RGVsdGEpO1xuICAgIHJldHVybiBBcnJheS5mcm9tKHsgbGVuZ3RoOiA3IH0sIChfLCBpbmRleCkgPT4ge1xuICAgICAgY29uc3QgdGFyZ2V0ID0gbmV3IERhdGUobW9uZGF5KTtcbiAgICAgIHRhcmdldC5zZXREYXRlKG1vbmRheS5nZXREYXRlKCkgKyBpbmRleCk7XG4gICAgICByZXR1cm4gZm9ybWF0TG9jYWxEYXRlKHRhcmdldCk7XG4gICAgfSk7XG4gIH1cblxuICBkZWJ1Z0xvZyhtZXNzYWdlOiBzdHJpbmcpOiB2b2lkIHtcbiAgICB0cnkge1xuICAgICAgYXBwZW5kRmlsZVN5bmMoXCIvdG1wL3NoZXJsb2NrLW9zLWRlYnVnLmxvZ1wiLCBgWyR7bmV3IERhdGUoKS50b0lTT1N0cmluZygpfV0gJHttZXNzYWdlfVxcbmApO1xuICAgIH0gY2F0Y2ggKF9lcnJvcikge1xuICAgICAgLy8gSWdub3JlIGxvZ2dpbmcgZmFpbHVyZXMgc28gZGlhZ25vc3RpY3MgbmV2ZXIgYnJlYWsgdGhlIHBsdWdpbiBpdHNlbGYuXG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBlbmFibGVHbG9iYWxTdHlsZSgpOiB2b2lkIHtcbiAgICBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5hZGQoXCJzaGVybG9jay1nbG9iYWwtc3R5bGVcIik7XG4gIH1cblxuICBnZXRFbnRyeUltYWdlVXJsKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIuZ2V0UmVzb3VyY2VQYXRoKFwiU2hlcmxvY2sgT1MvQXNzZXRzL3NoZXJsb2NrLWVudHJ5LnBuZ1wiKTtcbiAgfVxuXG4gIGdldFBhcmxvckltYWdlVXJsKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIuZ2V0UmVzb3VyY2VQYXRoKFwiU2hlcmxvY2sgT1MvQXNzZXRzL3NoZXJsb2NrLXBhcmxvci5wbmdcIik7XG4gIH1cblxuICBnZXRXb3JsZE1hcEltYWdlVXJsKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIuZ2V0UmVzb3VyY2VQYXRoKFwiU2hlcmxvY2sgT1MvQXNzZXRzL3NoZXJsb2NrLXdvcmxkLW1hcC5wbmdcIik7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGVuc3VyZUVudHJ5QXNzZXQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgYWRhcHRlciA9IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXI7XG4gICAgaWYgKCF0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXCJTaGVybG9jayBPUy9Bc3NldHNcIikpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZUZvbGRlcihcIlNoZXJsb2NrIE9TL0Fzc2V0c1wiKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcik7XG4gICAgICAgIGlmICghbWVzc2FnZS5pbmNsdWRlcyhcIkZvbGRlciBhbHJlYWR5IGV4aXN0c1wiKSkge1xuICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdGFyZ2V0UGF0aCA9IFwiU2hlcmxvY2sgT1MvQXNzZXRzL3NoZXJsb2NrLWVudHJ5LnBuZ1wiO1xuICAgIGlmIChhd2FpdCBhZGFwdGVyLmV4aXN0cyh0YXJnZXRQYXRoKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBmaWxlU3lzdGVtQWRhcHRlciA9IGFkYXB0ZXIgYXMgdW5rbm93biBhcyB7IGdldEJhc2VQYXRoPzogKCkgPT4gc3RyaW5nIH07XG4gICAgICBjb25zdCBiYXNlUGF0aCA9IGZpbGVTeXN0ZW1BZGFwdGVyLmdldEJhc2VQYXRoPy4oKTtcbiAgICAgIGlmICghYmFzZVBhdGgpIHtcbiAgICAgICAgdGhpcy5kZWJ1Z0xvZyhcImVudHJ5LWFzc2V0OnNraXA6bm8tYmFzZS1wYXRoXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHBsdWdpbkFzc2V0UGF0aCA9IGpvaW4oXG4gICAgICAgIGJhc2VQYXRoLFxuICAgICAgICBcIi5vYnNpZGlhblwiLFxuICAgICAgICBcInBsdWdpbnNcIixcbiAgICAgICAgdGhpcy5tYW5pZmVzdC5pZCxcbiAgICAgICAgXCJhc3NldHNcIixcbiAgICAgICAgXCJzaGVybG9jay1lbnRyeS5wbmdcIlxuICAgICAgKTtcbiAgICAgIGNvbnN0IHNvdXJjZSA9IHJlYWRGaWxlU3luYyhwbHVnaW5Bc3NldFBhdGgpO1xuICAgICAgY29uc3QgZGF0YSA9IHNvdXJjZS5idWZmZXIuc2xpY2Uoc291cmNlLmJ5dGVPZmZzZXQsIHNvdXJjZS5ieXRlT2Zmc2V0ICsgc291cmNlLmJ5dGVMZW5ndGgpO1xuICAgICAgYXdhaXQgYWRhcHRlci53cml0ZUJpbmFyeSh0YXJnZXRQYXRoLCBkYXRhKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc3QgbWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5zdGFjayA/PyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcbiAgICAgIHRoaXMuZGVidWdMb2coYGVudHJ5LWFzc2V0OnNraXA6JHttZXNzYWdlfWApO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZW5zdXJlUGFybG9yQXNzZXQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5lbnN1cmVCdW5kbGVkQXNzZXQoXCJzaGVybG9jay1wYXJsb3IucG5nXCIsIFwicGFybG9yLWFzc2V0XCIpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBlbnN1cmVXb3JsZE1hcEFzc2V0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuZW5zdXJlQnVuZGxlZEFzc2V0KFwic2hlcmxvY2std29ybGQtbWFwLnBuZ1wiLCBcIndvcmxkLW1hcC1hc3NldFwiKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZW5zdXJlQnVuZGxlZEFzc2V0KGZpbGVOYW1lOiBzdHJpbmcsIGxvZ1ByZWZpeDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgYWRhcHRlciA9IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXI7XG4gICAgaWYgKCF0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXCJTaGVybG9jayBPUy9Bc3NldHNcIikpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZUZvbGRlcihcIlNoZXJsb2NrIE9TL0Fzc2V0c1wiKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcik7XG4gICAgICAgIGlmICghbWVzc2FnZS5pbmNsdWRlcyhcIkZvbGRlciBhbHJlYWR5IGV4aXN0c1wiKSkge1xuICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdGFyZ2V0UGF0aCA9IGBTaGVybG9jayBPUy9Bc3NldHMvJHtmaWxlTmFtZX1gO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGZpbGVTeXN0ZW1BZGFwdGVyID0gYWRhcHRlciBhcyB1bmtub3duIGFzIHsgZ2V0QmFzZVBhdGg/OiAoKSA9PiBzdHJpbmcgfTtcbiAgICAgIGNvbnN0IGJhc2VQYXRoID0gZmlsZVN5c3RlbUFkYXB0ZXIuZ2V0QmFzZVBhdGg/LigpO1xuICAgICAgaWYgKCFiYXNlUGF0aCkge1xuICAgICAgICB0aGlzLmRlYnVnTG9nKGAke2xvZ1ByZWZpeH06c2tpcDpuby1iYXNlLXBhdGhgKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBwbHVnaW5Bc3NldFBhdGggPSBqb2luKFxuICAgICAgICBiYXNlUGF0aCxcbiAgICAgICAgXCIub2JzaWRpYW5cIixcbiAgICAgICAgXCJwbHVnaW5zXCIsXG4gICAgICAgIHRoaXMubWFuaWZlc3QuaWQsXG4gICAgICAgIFwiYXNzZXRzXCIsXG4gICAgICAgIGZpbGVOYW1lXG4gICAgICApO1xuICAgICAgY29uc3Qgc291cmNlID0gcmVhZEZpbGVTeW5jKHBsdWdpbkFzc2V0UGF0aCk7XG4gICAgICBjb25zdCBkYXRhID0gc291cmNlLmJ1ZmZlci5zbGljZShzb3VyY2UuYnl0ZU9mZnNldCwgc291cmNlLmJ5dGVPZmZzZXQgKyBzb3VyY2UuYnl0ZUxlbmd0aCk7XG4gICAgICBhd2FpdCBhZGFwdGVyLndyaXRlQmluYXJ5KHRhcmdldFBhdGgsIGRhdGEpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLnN0YWNrID8/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xuICAgICAgdGhpcy5kZWJ1Z0xvZyhgJHtsb2dQcmVmaXh9OnNraXA6JHttZXNzYWdlfWApO1xuICAgIH1cbiAgfVxufVxuXG5cbiIsICJpbXBvcnQgeyBBcHAsIFRGaWxlLCBub3JtYWxpemVQYXRoIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgdHlwZSB7XG4gIFNoZXJsb2NrQ2FzZSxcbiAgU2hlcmxvY2tDb2xsZWN0aW9uLFxuICBTaGVybG9ja0V2aWRlbmNlLFxuICBTaGVybG9ja0VudGl0eVR5cGUsXG4gIFNoZXJsb2NrUGxhY2UsXG4gIFNoZXJsb2NrUGx1Z2luU2V0dGluZ3MsXG4gIFNoZXJsb2NrU2NoZWR1bGUsXG4gIFNoZXJsb2NrVGFzayxcbiAgU2hlcmxvY2tXb3Jrc3BhY2VEYXRhXG59IGZyb20gXCIuL3R5cGVzXCI7XG5cbmNvbnN0IEVOVElUWV9UWVBFUzogU2hlcmxvY2tFbnRpdHlUeXBlW10gPSBbXCJjYXNlXCIsIFwidGFza1wiLCBcInNjaGVkdWxlXCIsIFwiY29sbGVjdGlvblwiLCBcImV2aWRlbmNlXCIsIFwicGxhY2VcIl07XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBlbnN1cmVGb2xkZXJzKGFwcDogQXBwLCBzZXR0aW5nczogU2hlcmxvY2tQbHVnaW5TZXR0aW5ncyk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBmb2xkZXJzID0gW1xuICAgIHNldHRpbmdzLmNhc2VGb2xkZXIsXG4gICAgc2V0dGluZ3MudGFza0ZvbGRlcixcbiAgICBzZXR0aW5ncy5zY2hlZHVsZUZvbGRlcixcbiAgICBzZXR0aW5ncy5jb2xsZWN0aW9uRm9sZGVyLFxuICAgIHNldHRpbmdzLmV2aWRlbmNlRm9sZGVyLFxuICAgIHNldHRpbmdzLnBsYWNlRm9sZGVyXG4gIF07XG5cbiAgZm9yIChjb25zdCBmb2xkZXIgb2YgZm9sZGVycykge1xuICAgIGNvbnN0IG5vcm1hbGl6ZWQgPSBub3JtYWxpemVQYXRoKGZvbGRlcik7XG4gICAgY29uc3Qgc2VnbWVudHMgPSBub3JtYWxpemVkLnNwbGl0KFwiL1wiKS5maWx0ZXIoQm9vbGVhbik7XG4gICAgbGV0IGN1cnJlbnQgPSBcIlwiO1xuXG4gICAgZm9yIChjb25zdCBzZWdtZW50IG9mIHNlZ21lbnRzKSB7XG4gICAgICBjdXJyZW50ID0gY3VycmVudCA/IGAke2N1cnJlbnR9LyR7c2VnbWVudH1gIDogc2VnbWVudDtcbiAgICAgIGNvbnN0IGN1cnJlbnRQYXRoID0gbm9ybWFsaXplUGF0aChjdXJyZW50KTtcbiAgICAgIGlmIChhcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGN1cnJlbnRQYXRoKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgYXBwLnZhdWx0LmNyZWF0ZUZvbGRlcihjdXJyZW50UGF0aCk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xuICAgICAgICBpZiAoIW1lc3NhZ2UuaW5jbHVkZXMoXCJGb2xkZXIgYWxyZWFkeSBleGlzdHNcIikpIHtcbiAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRGcm9udG1hdHRlcih0eXBlOiBTaGVybG9ja0VudGl0eVR5cGUsIHRpdGxlOiBzdHJpbmcsIGV4dHJhczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9KTogc3RyaW5nIHtcbiAgY29uc3QgY3JlYXRlZCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgY29uc3QgbGluZXMgPSBbXG4gICAgXCItLS1cIixcbiAgICBgdHlwZTogJHt0eXBlfWAsXG4gICAgYHRpdGxlOiBcIiR7dGl0bGUucmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpfVwiYCxcbiAgICBgY3JlYXRlZDogJHtjcmVhdGVkfWAsXG4gICAgYHVwZGF0ZWQ6ICR7Y3JlYXRlZH1gXG4gIF07XG5cbiAgT2JqZWN0LmVudHJpZXMoZXh0cmFzKS5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcbiAgICBsaW5lcy5wdXNoKGAke2tleX06ICR7dmFsdWV9YCk7XG4gIH0pO1xuXG4gIGxpbmVzLnB1c2goXCItLS1cIiwgXCJcIik7XG4gIHJldHVybiBsaW5lcy5qb2luKFwiXFxuXCIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRDYXNlVGVtcGxhdGUodGl0bGU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBgJHtidWlsZEZyb250bWF0dGVyKFwiY2FzZVwiLCB0aXRsZSwge1xuICAgIHN0YXR1czogXCJvcGVuXCIsXG4gICAgcHJpb3JpdHk6IFwibWVkaXVtXCIsXG4gICAgdGFnczogXCJbXVwiXG4gIH0pfSMgJHt0aXRsZX1cblxuIyMgXHU2ODQ4XHU2MEM1XHU2OTgyXHU4OUM4XG4tIFx1ODBDQ1x1NjY2Rlx1RkYxQVxuLSBcdTVGNTNcdTUyNERcdTc2RUVcdTY4MDdcdUZGMUFcbi0gXHU0RTBCXHU0RTAwXHU2QjY1XHU2M0E4XHU3NDA2XHVGRjFBXG5cbiMjIFx1NzZGOFx1NTE3M1x1N0VCRlx1N0QyMlxuLSBcblxuIyMgXHU1MTczXHU4MDU0XHU4RDQ0XHU2NTk5XG4tIFxuYDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkVGFza1RlbXBsYXRlKHRpdGxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYCR7YnVpbGRGcm9udG1hdHRlcihcInRhc2tcIiwgdGl0bGUsIHtcbiAgICBzdGF0dXM6IFwiYmFja2xvZ1wiLFxuICAgIHByaW9yaXR5OiBcIm1lZGl1bVwiLFxuICAgIGNhc2U6ICdcIlwiJyxcbiAgICBjYXNlUGF0aDogJ1wiXCInXG4gIH0pfSMgJHt0aXRsZX1cblxuIyMgXHU0RUZCXHU1MkExXHU4QkY0XHU2NjBFXG4tIFxuXG4jIyBcdTYyNDBcdTVDNUVcdTY4NDhcdTRFRjZcbi0gXG5gO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRTY2hlZHVsZVRlbXBsYXRlKHRpdGxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYCR7YnVpbGRGcm9udG1hdHRlcihcInNjaGVkdWxlXCIsIHRpdGxlLCB7XG4gICAgZGF5OiBgXCIke2Zvcm1hdExvY2FsRGF0ZShuZXcgRGF0ZSgpKX1cImAsXG4gICAgc3RhcnQ6ICdcIjA5OjAwXCInLFxuICAgIGVuZDogJ1wiMTA6MDBcIicsXG4gICAgZHVyYXRpb25NaW51dGVzOiBcIjYwXCIsXG4gICAgcmVsYXRlZFRhc2s6ICdcIlwiJyxcbiAgICByZWxhdGVkVGFza1BhdGg6ICdcIlwiJ1xuICB9KX0jICR7dGl0bGV9XG5cbiMjIFx1OEMwM1x1NjdFNVx1NUI4OVx1NjM5MlxuLSBcdTc2RUVcdTY4MDdcdUZGMUFcbi0gXHU1MUM2XHU1OTA3XHU0RThCXHU5ODc5XHVGRjFBXG5gO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRDb2xsZWN0aW9uVGVtcGxhdGUodGl0bGU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBgJHtidWlsZEZyb250bWF0dGVyKFwiY29sbGVjdGlvblwiLCB0aXRsZSwge1xuICAgIHN0YXR1czogXCJyZWFkaW5nXCIsXG4gICAgbWVkaXVtOiBcImJvb2tcIixcbiAgICBjYXNlOiAnXCJcIicsXG4gICAgY2FzZVBhdGg6ICdcIlwiJyxcbiAgICByYXRpbmc6IFwiMFwiXG4gIH0pfSMgJHt0aXRsZX1cblxuIyMgXHU3ODE0XHU4QkZCXHU4QkIwXHU1RjU1XG4tIFx1NjQ1OFx1NjI4NFx1RkYxQVxuLSBcdTg5QzJcdTcwQjlcdUZGMUFcbi0gXHU1OTBEXHU3NkQ4XHVGRjFBXG5cbiMjIFx1Njg0OFx1NEVGNlx1NTE3M1x1ODA1NFxuLSBcbmA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZEV2aWRlbmNlVGVtcGxhdGUodGl0bGU6IHN0cmluZywgY2FzZU5hbWUgPSBcIlwiLCBjYXNlUGF0aCA9IFwiXCIpOiBzdHJpbmcge1xuICByZXR1cm4gYCR7YnVpbGRGcm9udG1hdHRlcihcImV2aWRlbmNlXCIsIHRpdGxlLCB7XG4gICAgY2FzZTogYFwiJHtjYXNlTmFtZS5yZXBsYWNlKC9cIi9nLCAnXFxcXFwiJyl9XCJgLFxuICAgIGNhc2VQYXRoOiBgXCIke2Nhc2VQYXRoLnJlcGxhY2UoL1wiL2csICdcXFxcXCInKX1cImAsXG4gICAgc291cmNlOiAnXCJcIidcbiAgfSl9IyAke3RpdGxlfVxuXG4jIyBcdThCQzFcdTcyNjlcdThCRjRcdTY2MEVcbi0gXHU2NzY1XHU2RTkwXHVGRjFBXG4tIFx1ODlDMlx1NUJERlx1RkYxQVxuLSBcdTYzQThcdThCQkFcdUZGMUFcblxuIyMgXHU1MTczXHU4MDU0XHU2ODQ4XHU0RUY2XG4tICR7Y2FzZU5hbWUgfHwgXCJcdTY3MkFcdTUxNzNcdTgwNTRcIn1cbmA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFBsYWNlVGVtcGxhdGUoXG4gIHRpdGxlOiBzdHJpbmcsXG4gIGxhdGl0dWRlPzogbnVtYmVyLFxuICBsb25naXR1ZGU/OiBudW1iZXIsXG4gIGxhdGl0dWRlSGVtaXNwaGVyZSA9IFwiXCIsXG4gIGxvbmdpdHVkZUhlbWlzcGhlcmUgPSBcIlwiXG4pOiBzdHJpbmcge1xuICByZXR1cm4gYCR7YnVpbGRGcm9udG1hdHRlcihcInBsYWNlXCIsIHRpdGxlLCB7XG4gICAgY2l0eTogYFwiJHt0aXRsZS5yZXBsYWNlKC9cIi9nLCAnXFxcXFwiJyl9XCJgLFxuICAgIGNvdW50cnk6ICdcIlwiJyxcbiAgICBsYXRpdHVkZTogbGF0aXR1ZGUgPT09IHVuZGVmaW5lZCA/ICdcIlwiJyA6IFN0cmluZyhsYXRpdHVkZSksXG4gICAgbG9uZ2l0dWRlOiBsb25naXR1ZGUgPT09IHVuZGVmaW5lZCA/ICdcIlwiJyA6IFN0cmluZyhsb25naXR1ZGUpLFxuICAgIGxhdGl0dWRlSGVtaXNwaGVyZTogYFwiJHtsYXRpdHVkZUhlbWlzcGhlcmV9XCJgLFxuICAgIGxvbmdpdHVkZUhlbWlzcGhlcmU6IGBcIiR7bG9uZ2l0dWRlSGVtaXNwaGVyZX1cImAsXG4gICAgdmlzaXRlZEF0OiBgXCIke2Zvcm1hdExvY2FsRGF0ZShuZXcgRGF0ZSgpKX1cImAsXG4gICAgY292ZXI6ICdcIlwiJyxcbiAgICBjYXNlOiAnXCJcIicsXG4gICAgY2FzZVBhdGg6ICdcIlwiJ1xuICB9KX0jICR7dGl0bGV9XG5cbiMjIFx1NTIzMFx1OEJCRlx1OEJCMFx1NUY1NVxuLSBcdTY1RjZcdTk1RjRcdUZGMUFcbi0gXHU3MTY3XHU3MjQ3XHVGRjFBXG4tIFx1OEJCMFx1NUZDNlx1RkYxQVxuXG4jIyBcdTUxNzNcdTgwNTRcbi0gXG5gO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY29sbGVjdFdvcmtzcGFjZURhdGEoYXBwOiBBcHApOiBQcm9taXNlPFNoZXJsb2NrV29ya3NwYWNlRGF0YT4ge1xuICBjb25zdCBmaWxlcyA9IGFwcC52YXVsdC5nZXRNYXJrZG93bkZpbGVzKCk7XG4gIGNvbnN0IGNhc2VzOiBTaGVybG9ja0Nhc2VbXSA9IFtdO1xuICBjb25zdCB0YXNrczogU2hlcmxvY2tUYXNrW10gPSBbXTtcbiAgY29uc3Qgc2NoZWR1bGVzOiBTaGVybG9ja1NjaGVkdWxlW10gPSBbXTtcbiAgY29uc3QgY29sbGVjdGlvbnM6IFNoZXJsb2NrQ29sbGVjdGlvbltdID0gW107XG4gIGNvbnN0IGV2aWRlbmNlOiBTaGVybG9ja0V2aWRlbmNlW10gPSBbXTtcbiAgY29uc3QgcGxhY2VzOiBTaGVybG9ja1BsYWNlW10gPSBbXTtcblxuICBmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcbiAgICBjb25zdCBjYWNoZSA9IGFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKTtcbiAgICBjb25zdCBmcm9udG1hdHRlciA9IGNhY2hlPy5mcm9udG1hdHRlcjtcbiAgICBjb25zdCB0eXBlID0gZnJvbnRtYXR0ZXI/LnR5cGU7XG5cbiAgICBpZiAoIUVOVElUWV9UWVBFUy5pbmNsdWRlcyh0eXBlKSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgY29uc3QgYmFzZSA9IHtcbiAgICAgIGZpbGVQYXRoOiBmaWxlLnBhdGgsXG4gICAgICBuYW1lOiBTdHJpbmcoZnJvbnRtYXR0ZXI/LnRpdGxlID8/IGZpbGUuYmFzZW5hbWUpLFxuICAgICAgdHlwZSxcbiAgICAgIGNyZWF0ZWQ6IGFzU3RyaW5nKGZyb250bWF0dGVyPy5jcmVhdGVkKSxcbiAgICAgIHVwZGF0ZWQ6IGFzU3RyaW5nKGZyb250bWF0dGVyPy51cGRhdGVkKVxuICAgIH07XG5cbiAgICBpZiAodHlwZSA9PT0gXCJjYXNlXCIpIHtcbiAgICAgIGNhc2VzLnB1c2goe1xuICAgICAgICAuLi5iYXNlLFxuICAgICAgICB0eXBlLFxuICAgICAgICBzdGF0dXM6IGFzQ2FzZVN0YXR1cyhmcm9udG1hdHRlcj8uc3RhdHVzKSxcbiAgICAgICAgcHJpb3JpdHk6IGFzUHJpb3JpdHkoZnJvbnRtYXR0ZXI/LnByaW9yaXR5KSxcbiAgICAgICAgZGVhZGxpbmU6IGFzU3RyaW5nKGZyb250bWF0dGVyPy5kZWFkbGluZSksXG4gICAgICAgIHRhZ3M6IEFycmF5LmlzQXJyYXkoZnJvbnRtYXR0ZXI/LnRhZ3MpID8gZnJvbnRtYXR0ZXIudGFncy5tYXAoU3RyaW5nKSA6IFtdXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAodHlwZSA9PT0gXCJ0YXNrXCIpIHtcbiAgICAgIHRhc2tzLnB1c2goe1xuICAgICAgICAuLi5iYXNlLFxuICAgICAgICB0eXBlLFxuICAgICAgICBzdGF0dXM6IGFzVGFza1N0YXR1cyhmcm9udG1hdHRlcj8uc3RhdHVzKSxcbiAgICAgICAgY2FzZTogYXNTdHJpbmcoZnJvbnRtYXR0ZXI/LmNhc2UpLFxuICAgICAgICBjYXNlUGF0aDogYXNTdHJpbmcoZnJvbnRtYXR0ZXI/LmNhc2VQYXRoKSxcbiAgICAgICAgcHJpb3JpdHk6IGFzUHJpb3JpdHkoZnJvbnRtYXR0ZXI/LnByaW9yaXR5KSxcbiAgICAgICAgZHVlOiBhc1N0cmluZyhmcm9udG1hdHRlcj8uZHVlKVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGUgPT09IFwic2NoZWR1bGVcIikge1xuICAgICAgc2NoZWR1bGVzLnB1c2goe1xuICAgICAgICAuLi5iYXNlLFxuICAgICAgICB0eXBlLFxuICAgICAgICBkYXk6IGFzU3RyaW5nKGZyb250bWF0dGVyPy5kYXkpLFxuICAgICAgICBzdGFydDogYXNTdHJpbmcoZnJvbnRtYXR0ZXI/LnN0YXJ0KSxcbiAgICAgICAgZW5kOiBhc1N0cmluZyhmcm9udG1hdHRlcj8uZW5kKSxcbiAgICAgICAgZHVyYXRpb25NaW51dGVzOiBhc051bWJlcihmcm9udG1hdHRlcj8uZHVyYXRpb25NaW51dGVzKSxcbiAgICAgICAgcmVsYXRlZFRhc2s6IGFzU3RyaW5nKGZyb250bWF0dGVyPy5yZWxhdGVkVGFzayksXG4gICAgICAgIHJlbGF0ZWRUYXNrUGF0aDogYXNTdHJpbmcoZnJvbnRtYXR0ZXI/LnJlbGF0ZWRUYXNrUGF0aClcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0eXBlID09PSBcImNvbGxlY3Rpb25cIikge1xuICAgICAgY29sbGVjdGlvbnMucHVzaCh7XG4gICAgICAgIC4uLmJhc2UsXG4gICAgICAgIHR5cGUsXG4gICAgICAgIHN0YXR1czogYXNDb2xsZWN0aW9uU3RhdHVzKGZyb250bWF0dGVyPy5zdGF0dXMpLFxuICAgICAgICBtZWRpdW06IGFzQ29sbGVjdGlvbk1lZGl1bShmcm9udG1hdHRlcj8ubWVkaXVtKSxcbiAgICAgICAgY2FzZTogYXNTdHJpbmcoZnJvbnRtYXR0ZXI/LmNhc2UpLFxuICAgICAgICBjYXNlUGF0aDogYXNTdHJpbmcoZnJvbnRtYXR0ZXI/LmNhc2VQYXRoKSxcbiAgICAgICAgcmF0aW5nOiBhc051bWJlcihmcm9udG1hdHRlcj8ucmF0aW5nKVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGUgPT09IFwiZXZpZGVuY2VcIikge1xuICAgICAgZXZpZGVuY2UucHVzaCh7XG4gICAgICAgIC4uLmJhc2UsXG4gICAgICAgIHR5cGUsXG4gICAgICAgIGNhc2U6IGFzU3RyaW5nKGZyb250bWF0dGVyPy5jYXNlKSxcbiAgICAgICAgY2FzZVBhdGg6IGFzU3RyaW5nKGZyb250bWF0dGVyPy5jYXNlUGF0aCksXG4gICAgICAgIHNvdXJjZTogYXNTdHJpbmcoZnJvbnRtYXR0ZXI/LnNvdXJjZSlcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0eXBlID09PSBcInBsYWNlXCIpIHtcbiAgICAgIHBsYWNlcy5wdXNoKHtcbiAgICAgICAgLi4uYmFzZSxcbiAgICAgICAgdHlwZSxcbiAgICAgICAgY2l0eTogYXNTdHJpbmcoZnJvbnRtYXR0ZXI/LmNpdHkpLFxuICAgICAgICBjb3VudHJ5OiBhc1N0cmluZyhmcm9udG1hdHRlcj8uY291bnRyeSksXG4gICAgICAgIGxhdGl0dWRlOiBhc051bWJlcihmcm9udG1hdHRlcj8ubGF0aXR1ZGUpLFxuICAgICAgICBsb25naXR1ZGU6IGFzTnVtYmVyKGZyb250bWF0dGVyPy5sb25naXR1ZGUpLFxuICAgICAgICB2aXNpdGVkQXQ6IGFzU3RyaW5nKGZyb250bWF0dGVyPy52aXNpdGVkQXQpLFxuICAgICAgICBjb3ZlcjogYXNTdHJpbmcoZnJvbnRtYXR0ZXI/LmNvdmVyKSxcbiAgICAgICAgY2FzZTogYXNTdHJpbmcoZnJvbnRtYXR0ZXI/LmNhc2UpLFxuICAgICAgICBjYXNlUGF0aDogYXNTdHJpbmcoZnJvbnRtYXR0ZXI/LmNhc2VQYXRoKVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgY2FzZXMuc29ydChieVVwZGF0ZWREZXNjKTtcbiAgdGFza3Muc29ydChieVVwZGF0ZWREZXNjKTtcbiAgc2NoZWR1bGVzLnNvcnQoYnlVcGRhdGVkRGVzYyk7XG4gIGNvbGxlY3Rpb25zLnNvcnQoYnlVcGRhdGVkRGVzYyk7XG4gIGV2aWRlbmNlLnNvcnQoYnlVcGRhdGVkRGVzYyk7XG4gIHBsYWNlcy5zb3J0KGJ5VXBkYXRlZERlc2MpO1xuXG4gIHJldHVybiB7IGNhc2VzLCB0YXNrcywgc2NoZWR1bGVzLCBjb2xsZWN0aW9ucywgZXZpZGVuY2UsIHBsYWNlcyB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0TG9jYWxEYXRlKGRhdGU6IERhdGUpOiBzdHJpbmcge1xuICBjb25zdCB5ZWFyID0gZGF0ZS5nZXRGdWxsWWVhcigpO1xuICBjb25zdCBtb250aCA9IFN0cmluZyhkYXRlLmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCBcIjBcIik7XG4gIGNvbnN0IGRheSA9IFN0cmluZyhkYXRlLmdldERhdGUoKSkucGFkU3RhcnQoMiwgXCIwXCIpO1xuICByZXR1cm4gYCR7eWVhcn0tJHttb250aH0tJHtkYXl9YDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZVR5cGVkTm90ZShcbiAgYXBwOiBBcHAsXG4gIGZvbGRlcjogc3RyaW5nLFxuICB0aXRsZTogc3RyaW5nLFxuICB0ZW1wbGF0ZTogc3RyaW5nXG4pOiBQcm9taXNlPFRGaWxlPiB7XG4gIGNvbnN0IHNhZmVOYW1lID0gdGl0bGUucmVwbGFjZSgvW1xcXFwvOio/XCI8PnxdL2csIFwiLVwiKS50cmltKCkgfHwgXCJVbnRpdGxlZFwiO1xuICBjb25zdCBmaWxlUGF0aCA9IG5vcm1hbGl6ZVBhdGgoYCR7Zm9sZGVyfS8ke3NhZmVOYW1lfS5tZGApO1xuICBjb25zdCBleGlzdGluZyA9IGFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoZmlsZVBhdGgpO1xuICBpZiAoZXhpc3RpbmcgaW5zdGFuY2VvZiBURmlsZSkge1xuICAgIHJldHVybiBleGlzdGluZztcbiAgfVxuICByZXR1cm4gYXBwLnZhdWx0LmNyZWF0ZShmaWxlUGF0aCwgdGVtcGxhdGUpO1xufVxuXG5mdW5jdGlvbiBhc1N0cmluZyh2YWx1ZTogdW5rbm93bik6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgPyB2YWx1ZSA6IHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gYXNQcmlvcml0eSh2YWx1ZTogdW5rbm93bik6IFwibG93XCIgfCBcIm1lZGl1bVwiIHwgXCJoaWdoXCIgfCB1bmRlZmluZWQge1xuICByZXR1cm4gdmFsdWUgPT09IFwibG93XCIgfHwgdmFsdWUgPT09IFwibWVkaXVtXCIgfHwgdmFsdWUgPT09IFwiaGlnaFwiID8gdmFsdWUgOiB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIGFzTnVtYmVyKHZhbHVlOiB1bmtub3duKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJudW1iZXJcIikge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuICBpZiAodHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiKSB7XG4gICAgY29uc3QgcGFyc2VkID0gTnVtYmVyKHZhbHVlKTtcbiAgICByZXR1cm4gTnVtYmVyLmlzRmluaXRlKHBhcnNlZCkgPyBwYXJzZWQgOiB1bmRlZmluZWQ7XG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gYXNDYXNlU3RhdHVzKHZhbHVlOiB1bmtub3duKTogXCJvcGVuXCIgfCBcImFjdGl2ZVwiIHwgXCJhcmNoaXZlZFwiIHtcbiAgcmV0dXJuIHZhbHVlID09PSBcImFjdGl2ZVwiIHx8IHZhbHVlID09PSBcImFyY2hpdmVkXCIgPyB2YWx1ZSA6IFwib3BlblwiO1xufVxuXG5mdW5jdGlvbiBhc1Rhc2tTdGF0dXModmFsdWU6IHVua25vd24pOiBcImJhY2tsb2dcIiB8IFwic2NoZWR1bGVkXCIgfCBcImRvbmVcIiB7XG4gIHJldHVybiB2YWx1ZSA9PT0gXCJzY2hlZHVsZWRcIiB8fCB2YWx1ZSA9PT0gXCJkb25lXCIgPyB2YWx1ZSA6IFwiYmFja2xvZ1wiO1xufVxuXG5mdW5jdGlvbiBhc0NvbGxlY3Rpb25TdGF0dXModmFsdWU6IHVua25vd24pOiBcInF1ZXVlZFwiIHwgXCJyZWFkaW5nXCIgfCBcImZpbmlzaGVkXCIgfCB1bmRlZmluZWQge1xuICByZXR1cm4gdmFsdWUgPT09IFwicXVldWVkXCIgfHwgdmFsdWUgPT09IFwicmVhZGluZ1wiIHx8IHZhbHVlID09PSBcImZpbmlzaGVkXCIgPyB2YWx1ZSA6IHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gYXNDb2xsZWN0aW9uTWVkaXVtKHZhbHVlOiB1bmtub3duKTogXCJib29rXCIgfCBcIm1vdmllXCIgfCBcInNlcmllc1wiIHwgXCJhbGJ1bVwiIHwgXCJhcnRpY2xlXCIgfCBcIm90aGVyXCIgfCB1bmRlZmluZWQge1xuICByZXR1cm4gdmFsdWUgPT09IFwiYm9va1wiIHx8IHZhbHVlID09PSBcIm1vdmllXCIgfHwgdmFsdWUgPT09IFwic2VyaWVzXCIgfHwgdmFsdWUgPT09IFwiYWxidW1cIiB8fCB2YWx1ZSA9PT0gXCJhcnRpY2xlXCIgfHwgdmFsdWUgPT09IFwib3RoZXJcIlxuICAgID8gdmFsdWVcbiAgICA6IHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gYnlVcGRhdGVkRGVzYzxUIGV4dGVuZHMgeyB1cGRhdGVkPzogc3RyaW5nIH0+KGE6IFQsIGI6IFQpOiBudW1iZXIge1xuICByZXR1cm4gKGIudXBkYXRlZCA/PyBcIlwiKS5sb2NhbGVDb21wYXJlKGEudXBkYXRlZCA/PyBcIlwiKTtcbn1cbiIsICJpbXBvcnQgeyBBcHAsIFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmcgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB0eXBlIFNoZXJsb2NrT1NQbHVnaW4gZnJvbSBcIi4vbWFpblwiO1xuXG5leHBvcnQgY2xhc3MgU2hlcmxvY2tTZXR0aW5nVGFiIGV4dGVuZHMgUGx1Z2luU2V0dGluZ1RhYiB7XG4gIHBsdWdpbjogU2hlcmxvY2tPU1BsdWdpbjtcblxuICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBTaGVybG9ja09TUGx1Z2luKSB7XG4gICAgc3VwZXIoYXBwLCBwbHVnaW4pO1xuICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICB9XG5cbiAgZGlzcGxheSgpOiB2b2lkIHtcbiAgICBjb25zdCB7IGNvbnRhaW5lckVsIH0gPSB0aGlzO1xuICAgIGNvbnRhaW5lckVsLmVtcHR5KCk7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwiU2hlcmxvY2sgT1MgU2V0dGluZ3NcIiB9KTtcblxuICAgIHRoaXMuYWRkVGV4dFNldHRpbmcoY29udGFpbmVyRWwsIFwiXHU2ODQ4XHU0RUY2XHU2NTg3XHU0RUY2XHU1OTM5XCIsIHRoaXMucGx1Z2luLnNldHRpbmdzLmNhc2VGb2xkZXIsIGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuY2FzZUZvbGRlciA9IHZhbHVlLnRyaW0oKSB8fCBcIlNoZXJsb2NrIE9TL0Nhc2VzXCI7XG4gICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICB9KTtcblxuICAgIHRoaXMuYWRkVGV4dFNldHRpbmcoY29udGFpbmVyRWwsIFwiXHU0RUZCXHU1MkExXHU2NTg3XHU0RUY2XHU1OTM5XCIsIHRoaXMucGx1Z2luLnNldHRpbmdzLnRhc2tGb2xkZXIsIGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudGFza0ZvbGRlciA9IHZhbHVlLnRyaW0oKSB8fCBcIlNoZXJsb2NrIE9TL1Rhc2tzXCI7XG4gICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICB9KTtcblxuICAgIHRoaXMuYWRkVGV4dFNldHRpbmcoY29udGFpbmVyRWwsIFwiXHU2MzkyXHU2NzFGXHU2NTg3XHU0RUY2XHU1OTM5XCIsIHRoaXMucGx1Z2luLnNldHRpbmdzLnNjaGVkdWxlRm9sZGVyLCBhc3luYyAodmFsdWUpID0+IHtcbiAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnNjaGVkdWxlRm9sZGVyID0gdmFsdWUudHJpbSgpIHx8IFwiU2hlcmxvY2sgT1MvU2NoZWR1bGVzXCI7XG4gICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICB9KTtcblxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJcdTk2RkVcdTZDMTRcdTVGM0FcdTVFQTZcIilcbiAgICAgIC5zZXREZXNjKFwiXHU2M0E3XHU1MjM2XHU5OTk2XHU5ODc1XHU2QzFCXHU1NkY0XHU1QzQyXHU3Njg0XHU1QjU4XHU1NzI4XHU2MTFGXHUzMDAyXCIpXG4gICAgICAuYWRkU2xpZGVyKChzbGlkZXIpID0+XG4gICAgICAgIHNsaWRlci5zZXRMaW1pdHMoMCwgMTAwLCAxKS5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5mb2dEZW5zaXR5KS5zZXREeW5hbWljVG9vbHRpcCgpLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmZvZ0RlbnNpdHkgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSlcbiAgICAgICk7XG5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiXHU1MkE4XHU2MDAxXHU1RjNBXHU1RUE2XCIpXG4gICAgICAuc2V0RGVzYyhcIlx1NEUzQVx1NTQwRVx1N0VFRFx1OTk5Nlx1OTg3NVx1NTJBOFx1NjAwMVx1NTQ4Q1x1NTQ2OFx1NjM5Mlx1NjcxRlx1NTJBOFx1NzUzQlx1OTg4NFx1NzU1OVx1MzAwMlwiKVxuICAgICAgLmFkZFNsaWRlcigoc2xpZGVyKSA9PlxuICAgICAgICBzbGlkZXIuc2V0TGltaXRzKDAsIDEwMCwgMSkuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MubW90aW9uSW50ZW5zaXR5KS5zZXREeW5hbWljVG9vbHRpcCgpLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLm1vdGlvbkludGVuc2l0eSA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KVxuICAgICAgKTtcbiAgfVxuXG4gIHByaXZhdGUgYWRkVGV4dFNldHRpbmcoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50LCBuYW1lOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcsIG9uQ2hhbmdlOiAodmFsdWU6IHN0cmluZykgPT4gUHJvbWlzZTx2b2lkPik6IHZvaWQge1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUobmFtZSlcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PiB0ZXh0LnNldFBsYWNlaG9sZGVyKHZhbHVlKS5zZXRWYWx1ZSh2YWx1ZSkub25DaGFuZ2Uob25DaGFuZ2UpKTtcbiAgfVxufVxuIiwgImltcG9ydCB7IEl0ZW1WaWV3LCBOb3RpY2UsIFRGaWxlLCBXb3Jrc3BhY2VMZWFmIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgdHlwZSBTaGVybG9ja09TUGx1Z2luIGZyb20gXCIuL21haW5cIjtcbmltcG9ydCB0eXBlIHsgU2hlcmxvY2tDYXNlLCBTaGVybG9ja1BsYWNlLCBTaGVybG9ja1NjaGVkdWxlLCBTaGVybG9ja1Rhc2ssIFNoZXJsb2NrV29ya3NwYWNlRGF0YSB9IGZyb20gXCIuL3R5cGVzXCI7XG5cbmV4cG9ydCBjb25zdCBTSEVSTE9DS19WSUVXX1RZUEUgPSBcInNoZXJsb2NrLW9zLWRhc2hib2FyZFwiO1xuZXhwb3J0IGNvbnN0IExFR0FDWV9TSEVSTE9DS19WSUVXX1RZUEUgPSBcInNoZXJsb2NrLW9zLXdvcmtzcGFjZVwiO1xudHlwZSBTaGVybG9ja1NjcmVlbiA9IFwiZW50cnlcIiB8IFwiaG9tZVwiIHwgXCJjYXNlc1wiIHwgXCJyZWFkaW5nXCIgfCBcImZvb3RwcmludHNcIiB8IFwiY2FzZVwiO1xudHlwZSBTaGVybG9ja0V2aWRlbmNlS2luZCA9IFwibWFya2Rvd25cIiB8IFwicGRmXCIgfCBcImltYWdlXCIgfCBcImxvY2FsXCI7XG5pbnRlcmZhY2UgU2hlcmxvY2tFdmlkZW5jZUl0ZW0ge1xuICBmaWxlOiBURmlsZTtcbiAga2luZDogU2hlcmxvY2tFdmlkZW5jZUtpbmQ7XG59XG5cbmNvbnN0IEVOVFJZX1RSQU5TSVRJT05fTVMgPSAyNjAwO1xuY29uc3QgREVGQVVMVF9TQ0hFRFVMRV9EVVJBVElPTl9NSU5VVEVTID0gNjA7XG5jb25zdCBNQVBfQ0VOVEVSX0xPTkdJVFVERSA9IDEwNTtcbmNvbnN0IFdFRUtfREFZUyA9IFtcbiAgeyBsYWJlbDogXCJNb25cIiwgb2Zmc2V0OiAwIH0sXG4gIHsgbGFiZWw6IFwiVHVlXCIsIG9mZnNldDogMSB9LFxuICB7IGxhYmVsOiBcIldlZFwiLCBvZmZzZXQ6IDIgfSxcbiAgeyBsYWJlbDogXCJUaHVcIiwgb2Zmc2V0OiAzIH0sXG4gIHsgbGFiZWw6IFwiRnJpXCIsIG9mZnNldDogNCB9LFxuICB7IGxhYmVsOiBcIlNhdFwiLCBvZmZzZXQ6IDUgfSxcbiAgeyBsYWJlbDogXCJTdW5cIiwgb2Zmc2V0OiA2IH1cbl0gYXMgY29uc3Q7XG5jb25zdCBUSU1FX1NMT1RTID0gW1wiMDg6MDBcIiwgXCIxMDowMFwiLCBcIjEyOjAwXCIsIFwiMTQ6MDBcIiwgXCIxNjowMFwiLCBcIjE5OjAwXCJdO1xuXG5leHBvcnQgY2xhc3MgU2hlcmxvY2tXb3Jrc3BhY2VWaWV3IGV4dGVuZHMgSXRlbVZpZXcge1xuICBwbHVnaW46IFNoZXJsb2NrT1NQbHVnaW47XG4gIHByaXZhdGUgc2NyZWVuOiBTaGVybG9ja1NjcmVlbiA9IFwiZW50cnlcIjtcbiAgcHJpdmF0ZSBzZWxlY3RlZENhc2VQYXRoPzogc3RyaW5nO1xuICBwcml2YXRlIGhhc0VudGVyZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSBlbnRyeVRpbWVyPzogbnVtYmVyO1xuXG4gIGNvbnN0cnVjdG9yKGxlYWY6IFdvcmtzcGFjZUxlYWYsIHBsdWdpbjogU2hlcmxvY2tPU1BsdWdpbikge1xuICAgIHN1cGVyKGxlYWYpO1xuICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICB9XG5cbiAgZ2V0Vmlld1R5cGUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gU0hFUkxPQ0tfVklFV19UWVBFO1xuICB9XG5cbiAgZ2V0RGlzcGxheVRleHQoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gXCJTaGVybG9ja1wiO1xuICB9XG5cbiAgZ2V0SWNvbigpOiBzdHJpbmcge1xuICAgIHJldHVybiBcInNlYXJjaC1jaGVja1wiO1xuICB9XG5cbiAgYXN5bmMgb25PcGVuKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgICAgdGhpcy5jb250ZW50RWwuYWRkQ2xhc3MoXCJzaGVybG9jay1vcy12aWV3XCIpO1xuICAgICAgYXdhaXQgdGhpcy5yZXNldFRvRW50cnkoKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5wbHVnaW4uZGVidWdMb2coYHZpZXc6b25PcGVuOmVycm9yOiR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLnN0YWNrID8/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgICAgdGhpcy5yZW5kZXJGYWxsYmFjayhlcnJvcik7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgb25DbG9zZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5lbnRyeVRpbWVyKSB7XG4gICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHRoaXMuZW50cnlUaW1lcik7XG4gICAgICB0aGlzLmVudHJ5VGltZXIgPSB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcmVmcmVzaCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5yZW5kZXJDdXJyZW50U2NyZWVuKCk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMucGx1Z2luLmRlYnVnTG9nKGB2aWV3OnJlZnJlc2g6ZXJyb3I6JHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3Iuc3RhY2sgPz8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgICB0aGlzLnJlbmRlckZhbGxiYWNrKGVycm9yKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyByZXNldFRvRW50cnkoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMuZW50cnlUaW1lcikge1xuICAgICAgd2luZG93LmNsZWFyVGltZW91dCh0aGlzLmVudHJ5VGltZXIpO1xuICAgICAgdGhpcy5lbnRyeVRpbWVyID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB0aGlzLnNlbGVjdGVkQ2FzZVBhdGggPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5oYXNFbnRlcmVkID0gZmFsc2U7XG4gICAgdGhpcy5zY3JlZW4gPSBcImVudHJ5XCI7XG4gICAgYXdhaXQgdGhpcy5yZW5kZXJDdXJyZW50U2NyZWVuKCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlbmRlckN1cnJlbnRTY3JlZW4oKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMuc2NyZWVuID09PSBcImVudHJ5XCIgJiYgIXRoaXMuaGFzRW50ZXJlZCkge1xuICAgICAgdGhpcy5yZW5kZXJFbnRyeVNjcmVlbigpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnNjcmVlbiA9PT0gXCJjYXNlXCIgJiYgdGhpcy5zZWxlY3RlZENhc2VQYXRoKSB7XG4gICAgICBhd2FpdCB0aGlzLnJlbmRlckNhc2VXb3Jrc3BhY2UodGhpcy5zZWxlY3RlZENhc2VQYXRoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5zY3JlZW4gPT09IFwiY2FzZXNcIikge1xuICAgICAgYXdhaXQgdGhpcy5yZW5kZXJDYXNlRGVzaygpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnNjcmVlbiA9PT0gXCJyZWFkaW5nXCIpIHtcbiAgICAgIGF3YWl0IHRoaXMucmVuZGVyUmVhZGluZ0Rlc2soKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5zY3JlZW4gPT09IFwiZm9vdHByaW50c1wiKSB7XG4gICAgICBhd2FpdCB0aGlzLnJlbmRlckZvb3RwcmludERlc2soKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLnJlbmRlckhvbWUoKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyRW50cnlTY3JlZW4oKTogdm9pZCB7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICBjb25zdCBpbWFnZVVybCA9IHRoaXMucGx1Z2luLmdldEVudHJ5SW1hZ2VVcmwoKTtcbiAgICBjb25zdCBlbnRyeSA9IHRoaXMuY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1lbnRyeS1zY3JlZW4gaXMtd2FybWluZ1wiIH0pO1xuICAgIGVudHJ5LnN0eWxlLmJhY2tncm91bmRJbWFnZSA9IGBsaW5lYXItZ3JhZGllbnQoMTgwZGVnLCByZ2JhKDcsIDksIDExLCAwLjA4KSwgcmdiYSg2LCA3LCA4LCAwLjI4KSksIHVybChcIiR7aW1hZ2VVcmx9XCIpYDtcbiAgICBlbnRyeS5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stZW50cnktYW1iaWVudFwiIH0pO1xuICAgIGVudHJ5LmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1lbnRyeS1mcmFtZVwiIH0pO1xuICAgIGVudHJ5LmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1lbnRyeS12ZWlsXCIgfSk7XG4gICAgY29uc3QgYm9va0J1dHRvbiA9IGVudHJ5LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcbiAgICAgIGNsczogXCJzaGVybG9jay1lbnRyeS1ib29rXCIsXG4gICAgICBhdHRyOiB7XG4gICAgICAgIFwiYXJpYS1sYWJlbFwiOiBcIkVudGVyIFNoZXJsb2NrIE9TXCJcbiAgICAgIH1cbiAgICB9KTtcbiAgICBib29rQnV0dG9uLmNyZWF0ZVNwYW4oeyBjbHM6IFwic2hlcmxvY2stZW50cnktcmluZ1wiIH0pO1xuICAgIGJvb2tCdXR0b24uY3JlYXRlU3Bhbih7IGNsczogXCJzaGVybG9jay1lbnRyeS1vcmJpdFwiIH0pO1xuICAgIGNvbnN0IGNhcHRpb24gPSBlbnRyeS5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stZW50cnktY2FwdGlvblwiIH0pO1xuICAgIGNhcHRpb24uY3JlYXRlRWwoXCJzcGFuXCIsIHsgdGV4dDogXCJTaGVybG9ja1wiIH0pO1xuICAgIGNhcHRpb24uY3JlYXRlRWwoXCJzbWFsbFwiLCB7IHRleHQ6IFwiMjIxQiBjYXNlIGNvbnNvbGVcIiB9KTtcbiAgICBjb25zdCBoaW50ID0gZW50cnkuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWVudHJ5LWhpbnRcIiB9KTtcbiAgICBoaW50LnNldFRleHQoXCJcdTcwQjlcdTUxRkJcdTRFMkRcdTU5MkVcdTUzNzdcdTVCOTdcdUZGMENcdTcwQjlcdTRFQUVcdTY4NDhcdTRFRjZcdTY4NENcIik7XG5cbiAgICBjb25zdCBwcmVsb2FkID0gbmV3IEltYWdlKCk7XG4gICAgcHJlbG9hZC5zcmMgPSBpbWFnZVVybDtcbiAgICBjb25zdCBpbWFnZVJlYWR5ID0gcHJlbG9hZC5kZWNvZGUgPyBwcmVsb2FkLmRlY29kZSgpIDogUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgaW1hZ2VSZWFkeVxuICAgICAgLnRoZW4oKCkgPT4gZW50cnkuYWRkQ2xhc3MoXCJpcy1yZWFkeVwiKSlcbiAgICAgIC5jYXRjaCgoKSA9PiBlbnRyeS5hZGRDbGFzcyhcImlzLXJlYWR5XCIpKTtcblxuICAgIGxldCBlbnRlcmluZyA9IGZhbHNlO1xuICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChib29rQnV0dG9uLCBcImNsaWNrXCIsICgpID0+IHtcbiAgICAgIGlmIChlbnRlcmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBlbnRlcmluZyA9IHRydWU7XG4gICAgICBib29rQnV0dG9uLnNldEF0dHJpYnV0ZShcImRpc2FibGVkXCIsIFwidHJ1ZVwiKTtcbiAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgICAgICBlbnRyeS5yZW1vdmVDbGFzcyhcImlzLXdhcm1pbmdcIik7XG4gICAgICAgIGVudHJ5LmFkZENsYXNzKFwiaXMtZW50ZXJpbmdcIik7XG4gICAgICB9KTtcbiAgICAgIHRoaXMuZW50cnlUaW1lciA9IHdpbmRvdy5zZXRUaW1lb3V0KGFzeW5jICgpID0+IHtcbiAgICAgICAgdGhpcy5oYXNFbnRlcmVkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5zY3JlZW4gPSBcImhvbWVcIjtcbiAgICAgICAgYXdhaXQgdGhpcy5yZW5kZXJIb21lKCk7XG4gICAgICB9LCBFTlRSWV9UUkFOU0lUSU9OX01TKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcmVuZGVySG9tZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLnBsdWdpbi5kZWJ1Z0xvZyhcInZpZXc6cmVuZGVyOnN0YXJ0XCIpO1xuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCB0aGlzLnBsdWdpbi5nZXRXb3Jrc3BhY2VEYXRhKCk7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcblxuICAgIGNvbnN0IHNoZWxsID0gdGhpcy5jb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLXNoZWxsIHNoZXJsb2NrLWhvbWUtc2hlbGxcIiB9KTtcbiAgICBzaGVsbC5kYXRhc2V0LnBlcmlvZCA9IHRoaXMucmVzb2x2ZVBlcmlvZCgpO1xuICAgIHRoaXMuY3JlYXRlUGFybG9yQmFja2Ryb3Aoc2hlbGwpO1xuICAgIHNoZWxsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1hdG1vc3BoZXJlIHNoZXJsb2NrLWZvZy1sYXllclwiIH0pO1xuICAgIHNoZWxsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1hdG1vc3BoZXJlIHNoZXJsb2NrLWdyYWluLWxheWVyXCIgfSk7XG4gICAgc2hlbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWF0bW9zcGhlcmUgc2hlcmxvY2stbWFwLWxheWVyXCIgfSk7XG4gICAgY29uc3QgaGVybyA9IHNoZWxsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1oZXJvIHNoZXJsb2NrLWhvbWUtaGVyb1wiIH0pO1xuICAgIGNvbnN0IGNvcHkgPSBoZXJvLmNyZWF0ZURpdigpO1xuICAgIGNvcHkuY3JlYXRlRWwoXCJwXCIsIHsgY2xzOiBcInNoZXJsb2NrLWtpY2tlclwiLCB0ZXh0OiBcIjIyMUIgQmFrZXIgU3RyZWV0IC8gSG9tZSBIYWxsXCIgfSk7XG4gICAgY29weS5jcmVhdGVFbChcImgxXCIsIHsgY2xzOiBcInNoZXJsb2NrLXRpdGxlXCIsIHRleHQ6IFwiU2hlcmxvY2tcIiB9KTtcbiAgICBjb3B5LmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICBjbHM6IFwic2hlcmxvY2stZWRpdG9yaWFsLW5vdGVcIixcbiAgICAgIHRleHQ6IHRoaXMucmVzb2x2ZVBlcmlvZCgpID09PSBcIm5pZ2h0XCJcbiAgICAgICAgPyBcIlx1NTkxQ1x1ODI3Mlx1OTFDQ1x1NzY4NFx1NEYyNlx1NjU2Nlx1NjZGNFx1OTAwMlx1NTQwOFx1NjNBOFx1NzQwNlx1MzAwMlx1NjI4QVx1N0VCRlx1N0QyMlx1MzAwMVx1NjVFNVx1N0EwQlx1ODg2OFx1MzAwMVx1NzgxNFx1N0E3Nlx1NEUwRVx1NTZERVx1NUZDNlx1NjU3NFx1NzQwNlx1OEZEQlx1NTQwQ1x1NEUwMFx1NUYyMFx1Njg0OFx1NEVGNlx1Njg0Q1x1MzAwMlwiXG4gICAgICAgIDogXCJcdTc2N0RcdTY2M0NcdTkwMDJcdTU0MDhcdTVGNTJcdTY4NjNcdTRFMEVcdTYzOTJcdTdBMEJcdTMwMDJcdThCQTlcdTRGNjBcdTc2ODRcdTdCMTRcdThCQjBcdTMwMDFcdTRFOEJcdTUyQTFcdTRFMEVcdThENDRcdTY1OTlcdTUwQ0ZcdTY4NDhcdTUzNzdcdTRFMDBcdTY4MzdcdTg4QUJcdTdDRkJcdTdFREZcdTY1NzRcdTc0MDZcdTMwMDJcIlxuICAgIH0pO1xuXG4gICAgY29uc3QgaHViID0gc2hlbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWhvbWUtaHViXCIgfSk7XG4gICAgdGhpcy5jcmVhdGVIb21lUG9ydGFsKGh1Yiwge1xuICAgICAgbGFiZWw6IFwiUFJPSkVDVCBERVNLXCIsXG4gICAgICB0aXRsZTogXCJcdTY4NDhcdTRFRjZcdTUzNzdcdTVCOTdcdTRFMEVcdThDMDNcdTY3RTVcdTYzOTJcdTY3MUZcIixcbiAgICAgIHRleHQ6IGBcdTdCQTFcdTc0MDYgJHtkYXRhLmNhc2VzLmxlbmd0aH0gXHU1Qjk3XHU2ODQ4XHU0RUY2XHUzMDAxJHtkYXRhLnRhc2tzLmZpbHRlcigoaXRlbSkgPT4gaXRlbS5zdGF0dXMgIT09IFwiZG9uZVwiKS5sZW5ndGh9IFx1Njc2MVx1N0VCRlx1N0QyMlx1NEVGQlx1NTJBMVx1NTQ4QyAke2RhdGEuc2NoZWR1bGVzLmxlbmd0aH0gXHU2NzYxXHU2MzkyXHU2NzFGXHUzMDAyYCxcbiAgICAgIGJ1dHRvbjogXCJcdTYyNTNcdTVGMDBcdTY4NDhcdTRFRjZcdTY4NENcIixcbiAgICAgIHNjcmVlbjogXCJjYXNlc1wiLFxuICAgICAgdG9uZTogXCJib2FyZFwiXG4gICAgfSk7XG4gICAgdGhpcy5jcmVhdGVIb21lUG9ydGFsKGh1Yiwge1xuICAgICAgbGFiZWw6IFwiQVJDSElWRSBERVNLXCIsXG4gICAgICB0aXRsZTogXCJcdThCQzFcdTcyNjlcdTc4MTRcdThCRkJcdTRFMEVcdTY4NjNcdTY4NDhcdTY3RENcIixcbiAgICAgIHRleHQ6IGBcdTZCNjNcdTU3MjhcdTc4MTRcdThCRkIgJHtkYXRhLmNvbGxlY3Rpb25zLmZpbHRlcigoaXRlbSkgPT4gaXRlbS5zdGF0dXMgIT09IFwiZmluaXNoZWRcIikubGVuZ3RofSBcdTk4NzlcdUZGMENcdThCQzFcdTcyNjlcdTY3RENcdTVERjJcdTY3MDkgJHtkYXRhLmV2aWRlbmNlLmxlbmd0aH0gXHU0RUZEXHU1M0VGXHU3RjE2XHU4RjkxXHU2ODYzXHU2ODQ4XHUzMDAyYCxcbiAgICAgIGJ1dHRvbjogXCJcdTYyNTNcdTVGMDBcdTY4NjNcdTY4NDhcdTY4NENcIixcbiAgICAgIHNjcmVlbjogXCJyZWFkaW5nXCIsXG4gICAgICB0b25lOiBcInN0dWR5XCJcbiAgICB9KTtcbiAgICB0aGlzLmNyZWF0ZUhvbWVQb3J0YWwoaHViLCB7XG4gICAgICBsYWJlbDogXCJNRU1PUlkgTUFQXCIsXG4gICAgICB0aXRsZTogXCJcdThEQjNcdThGRjlcdTU3MzBcdTU2RkVcIixcbiAgICAgIHRleHQ6IGAke2RhdGEucGxhY2VzLmxlbmd0aH0gXHU0RTJBXHU1N0NFXHU1RTAyXHU1MTQ5XHU3MEI5XHUzMDAyXHU2QkNGXHU2QjIxXHU1MjMwXHU4QkJGXHU5MEZEXHU1M0VGXHU0RUU1XHU2Qzg5XHU2REMwXHU2MjEwXHU3MTY3XHU3MjQ3XHUzMDAxXHU2NUU1XHU2NzFGXHU0RTBFXHU3QjE0XHU4QkIwXHUzMDAyYCxcbiAgICAgIGJ1dHRvbjogXCJcdTYyNTNcdTVGMDBcdTU3MzBcdTU2RkVcIixcbiAgICAgIHNjcmVlbjogXCJmb290cHJpbnRzXCIsXG4gICAgICB0b25lOiBcIm1hcFwiXG4gICAgfSk7XG4gICAgdGhpcy5wbHVnaW4uZGVidWdMb2coXCJ2aWV3OnJlbmRlcjpjb21wbGV0ZVwiKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcmVuZGVyQ2FzZURlc2soKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHRoaXMucGx1Z2luLmdldFdvcmtzcGFjZURhdGEoKTtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIGNvbnN0IHNoZWxsID0gdGhpcy5jcmVhdGVEZXNrU2hlbGwoXCJzaGVybG9jay1jYXNlLWRlc2stc2hlbGxcIik7XG4gICAgdGhpcy5yZW5kZXJEZXNrSGVhZGVyKHNoZWxsLCBcIlByb2plY3QgRGVza1wiLCBcIlx1Njg0OFx1NEVGNlx1NTM3N1x1NUI5N1x1NEUwRVx1OEMwM1x1NjdFNVx1NjM5Mlx1NjcxRlwiLCBcIlx1Njg0OFx1NEVGNlx1MzAwMVx1NEVGQlx1NTJBMVx1NTQ4Q1x1NjcyQ1x1NTQ2OFx1OEMwM1x1NjdFNVx1NjM5Mlx1NjcxRlx1NjUzRVx1NTcyOFx1NTQwQ1x1NEUwMFx1NEUyQVx1NURFNVx1NEY1Q1x1NTNGMFx1OTFDQ1x1RkYwQ1x1NTE0OFx1OTAwOVx1Njg0OFx1NEVGNlx1RkYwQ1x1NTE4RFx1NjI4QVx1NzcxRlx1NkI2M1x1ODk4MVx1NjI2N1x1ODg0Q1x1NzY4NFx1N0VCRlx1N0QyMlx1NjI5NVx1OTAxMlx1NTIzMFx1NTQ2OFx1Njc3Rlx1MzAwMlwiLCBbXG4gICAgICB7IGxhYmVsOiBcIlx1NjVCMFx1NUVGQVx1Njg0OFx1NEVGNlwiLCBhY3Rpb246IGFzeW5jICgpID0+IHRoaXMucGx1Z2luLmNyZWF0ZUNhc2VOb3RlKCkgfSxcbiAgICAgIHsgbGFiZWw6IFwiXHU2NUIwXHU1RUZBXHU0RUZCXHU1MkExXCIsIGFjdGlvbjogYXN5bmMgKCkgPT4gdGhpcy5wbHVnaW4uY3JlYXRlVGFza05vdGUoKSB9LFxuICAgICAgeyBsYWJlbDogXCJcdTY1QjBcdTVFRkFcdTYzOTJcdTY3MUZcIiwgYWN0aW9uOiBhc3luYyAoKSA9PiB0aGlzLnBsdWdpbi5jcmVhdGVTY2hlZHVsZU5vdGUoKSwgc2Vjb25kYXJ5OiB0cnVlIH1cbiAgICBdKTtcbiAgICBjb25zdCBncmlkID0gc2hlbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWdyaWQgc2hlcmxvY2stZGVzay1ncmlkXCIgfSk7XG4gICAgdGhpcy5yZW5kZXJDYXNlQm9hcmQoZ3JpZCwgZGF0YS5jYXNlcyk7XG4gICAgdGhpcy5yZW5kZXJJbnZlc3RpZ2F0aW9uU2NoZWR1bGVyKGdyaWQsIGRhdGEpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyByZW5kZXJSZWFkaW5nRGVzaygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgdGhpcy5wbHVnaW4uZ2V0V29ya3NwYWNlRGF0YSgpO1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgY29uc3Qgc2hlbGwgPSB0aGlzLmNyZWF0ZURlc2tTaGVsbChcInNoZXJsb2NrLXJlYWRpbmctZGVzay1zaGVsbFwiKTtcbiAgICB0aGlzLnJlbmRlckRlc2tIZWFkZXIoc2hlbGwsIFwiQXJjaGl2ZSBEZXNrXCIsIFwiXHU4QkMxXHU3MjY5XHU3ODE0XHU4QkZCXHU0RTBFXHU2ODYzXHU2ODQ4XHU2N0RDXCIsIFwiXHU2QjYzXHU1NzI4XHU4QkZCXHUzMDAxXHU2QjYzXHU1NzI4XHU3NzBCXHUzMDAxXHU2QjYzXHU1NzI4XHU3ODE0XHU3QTc2XHU3Njg0XHU1MTg1XHU1QkI5XHU1MTQ4XHU3NTU5XHU1NzI4XHU4QkMxXHU3MjY5XHU3ODE0XHU4QkZCXHVGRjFCXHU3ODZFXHU4QkE0XHU2Qzg5XHU2REMwXHU1NDBFXHVGRjBDXHU0RTAwXHU5NTJFXHU1RjUyXHU1MTY1XHU4QkMxXHU3MjY5XHU2N0RDXHVGRjBDXHU0RTRCXHU1NDBFXHU0RUNEXHU1M0VGXHU3RjE2XHU4RjkxXHUzMDAxXHU1MjIwXHU5NjY0XHU1NDhDXHU1MTczXHU4MDU0XHU2ODQ4XHU0RUY2XHUzMDAyXCIsIFtcbiAgICAgIHsgbGFiZWw6IFwiXHU2NUIwXHU1RUZBXHU3ODE0XHU4QkZCXCIsIGFjdGlvbjogYXN5bmMgKCkgPT4gdGhpcy5wbHVnaW4uY3JlYXRlQ29sbGVjdGlvbk5vdGUoKSB9LFxuICAgICAgeyBsYWJlbDogXCJcdTY1QjBcdTVFRkFcdThCQzFcdTcyNjlcIiwgYWN0aW9uOiBhc3luYyAoKSA9PiB0aGlzLnBsdWdpbi5jcmVhdGVFdmlkZW5jZU5vdGUoKSwgc2Vjb25kYXJ5OiB0cnVlIH1cbiAgICBdKTtcbiAgICBjb25zdCBncmlkID0gc2hlbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWdyaWQgc2hlcmxvY2stZGVzay1ncmlkXCIgfSk7XG4gICAgdGhpcy5yZW5kZXJSZWFkaW5nTW9kdWxlKGdyaWQsIGRhdGEpO1xuICAgIHRoaXMucmVuZGVyQXJjaGl2ZU1vZHVsZShncmlkLCBkYXRhKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcmVuZGVyRm9vdHByaW50RGVzaygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgdGhpcy5wbHVnaW4uZ2V0V29ya3NwYWNlRGF0YSgpO1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgY29uc3Qgc2hlbGwgPSB0aGlzLmNyZWF0ZURlc2tTaGVsbChcInNoZXJsb2NrLWZvb3RwcmludC1kZXNrLXNoZWxsXCIpO1xuICAgIHRoaXMucmVuZGVyRGVza0hlYWRlcihzaGVsbCwgXCJNZW1vcnkgTWFwXCIsIFwiXHU4REIzXHU4RkY5XHU1NzMwXHU1NkZFXCIsIFwiXHU1N0NFXHU1RTAyXHU2NjJGXHU4QkIwXHU1RkM2XHU1NzUwXHU2ODA3XHUzMDAyXHU3MEI5XHU1RjAwXHU0RTAwXHU2QjIxXHU1MjMwXHU4QkJGXHVGRjBDXHU1QzMxXHU4MEZEXHU3RUU3XHU3RUVEXHU4ODY1XHU1QzAxXHU5NzYyXHUzMDAxXHU3MTY3XHU3MjQ3XHU1ODk5XHUzMDAxXHU2NUY2XHU5NUY0XHUzMDAxXHU3QjE0XHU4QkIwXHU1NDhDXHU2ODQ4XHU0RUY2L1x1OTYwNVx1OEJGQlx1NTE3M1x1ODA1NFx1MzAwMlwiLCBbXSk7XG4gICAgdGhpcy5yZW5kZXJGb290cHJpbnRNb2R1bGUoc2hlbGwsIGRhdGEpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBuYXZpZ2F0ZVRvKHNjcmVlbjogRXhjbHVkZTxTaGVybG9ja1NjcmVlbiwgXCJlbnRyeVwiIHwgXCJjYXNlXCI+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5zY3JlZW4gPSBzY3JlZW47XG4gICAgdGhpcy5zZWxlY3RlZENhc2VQYXRoID0gdW5kZWZpbmVkO1xuICAgIGF3YWl0IHRoaXMucmVuZGVyQ3VycmVudFNjcmVlbigpO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVIb21lUG9ydGFsKFxuICAgIGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsXG4gICAgY29uZmlnOiB7XG4gICAgICBsYWJlbDogc3RyaW5nO1xuICAgICAgdGl0bGU6IHN0cmluZztcbiAgICAgIHRleHQ6IHN0cmluZztcbiAgICAgIGJ1dHRvbjogc3RyaW5nO1xuICAgICAgc2NyZWVuOiBFeGNsdWRlPFNoZXJsb2NrU2NyZWVuLCBcImVudHJ5XCIgfCBcImNhc2VcIiB8IFwiaG9tZVwiPjtcbiAgICAgIHRvbmU6IFwic3R1ZHlcIiB8IFwiYm9hcmRcIiB8IFwibWFwXCI7XG4gICAgfVxuICApOiB2b2lkIHtcbiAgICBjb25zdCBwb3J0YWwgPSBjb250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IGBzaGVybG9jay1ob21lLXBvcnRhbCAke2NvbmZpZy50b25lfWAgfSk7XG4gICAgcG9ydGFsLmNyZWF0ZUVsKFwic3BhblwiLCB7IGNsczogXCJzaGVybG9jay1zdGFnZS1sYWJlbFwiLCB0ZXh0OiBjb25maWcubGFiZWwgfSk7XG4gICAgcG9ydGFsLmNyZWF0ZUVsKFwic3Ryb25nXCIsIHsgdGV4dDogY29uZmlnLnRpdGxlIH0pO1xuICAgIHBvcnRhbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBjb25maWcudGV4dCB9KTtcbiAgICBwb3J0YWwuY3JlYXRlRWwoXCJiXCIsIHsgdGV4dDogY29uZmlnLmJ1dHRvbiB9KTtcbiAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQocG9ydGFsLCBcImNsaWNrXCIsIGFzeW5jICgpID0+IHRoaXMubmF2aWdhdGVUbyhjb25maWcuc2NyZWVuKSk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZURlc2tTaGVsbChleHRyYUNsYXNzOiBzdHJpbmcpOiBIVE1MRWxlbWVudCB7XG4gICAgY29uc3Qgc2hlbGwgPSB0aGlzLmNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IGBzaGVybG9jay1zaGVsbCBzaGVybG9jay1kZXNrLXNoZWxsICR7ZXh0cmFDbGFzc31gIH0pO1xuICAgIHNoZWxsLmRhdGFzZXQucGVyaW9kID0gdGhpcy5yZXNvbHZlUGVyaW9kKCk7XG4gICAgc2hlbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWF0bW9zcGhlcmUgc2hlcmxvY2stZm9nLWxheWVyXCIgfSk7XG4gICAgc2hlbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWF0bW9zcGhlcmUgc2hlcmxvY2stZ3JhaW4tbGF5ZXJcIiB9KTtcbiAgICByZXR1cm4gc2hlbGw7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckRlc2tIZWFkZXIoXG4gICAgc2hlbGw6IEhUTUxFbGVtZW50LFxuICAgIGtpY2tlcjogc3RyaW5nLFxuICAgIHRpdGxlOiBzdHJpbmcsXG4gICAgc3VidGl0bGU6IHN0cmluZyxcbiAgICBhY3Rpb25zOiBBcnJheTx7IGxhYmVsOiBzdHJpbmc7IGFjdGlvbjogKCkgPT4gUHJvbWlzZTx1bmtub3duPjsgc2Vjb25kYXJ5PzogYm9vbGVhbiB9PlxuICApOiB2b2lkIHtcbiAgICBjb25zdCBoZWFkZXIgPSBzaGVsbC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stZGVzay1oZWFkZXJcIiB9KTtcbiAgICBjb25zdCBiYWNrQnV0dG9uID0gaGVhZGVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLWljb24tYnV0dG9uXCIsIHRleHQ6IFwiXHUyMTkwXCIgfSk7XG4gICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KGJhY2tCdXR0b24sIFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4gdGhpcy5uYXZpZ2F0ZVRvKFwiaG9tZVwiKSk7XG4gICAgY29uc3QgY29weSA9IGhlYWRlci5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stZGVzay1oZWFkaW5nXCIgfSk7XG4gICAgY29weS5jcmVhdGVFbChcInNwYW5cIiwgeyBjbHM6IFwic2hlcmxvY2sta2lja2VyXCIsIHRleHQ6IGtpY2tlciB9KTtcbiAgICBjb3B5LmNyZWF0ZUVsKFwiaDFcIiwgeyB0ZXh0OiB0aXRsZSB9KTtcbiAgICBjb3B5LmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IHN1YnRpdGxlIH0pO1xuICAgIGNvbnN0IGFjdGlvbkdyb3VwID0gaGVhZGVyLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1hY3Rpb25zIHNoZXJsb2NrLWRlc2stYWN0aW9uc1wiIH0pO1xuICAgIGFjdGlvbnMuZm9yRWFjaCgoYWN0aW9uKSA9PiB7XG4gICAgICB0aGlzLmNyZWF0ZUFjdGlvbihhY3Rpb25Hcm91cCwgYWN0aW9uLmxhYmVsLCBhY3Rpb24uYWN0aW9uLCBhY3Rpb24uc2Vjb25kYXJ5KTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyQ2FzZUJvYXJkKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIGNhc2VzOiBTaGVybG9ja0Nhc2VbXSk6IHZvaWQge1xuICAgIGNvbnN0IGNhcmQgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLXBhbmVsIHNoZXJsb2NrLWNhcmQgZnVsbFwiIH0pO1xuICAgIGNvbnN0IGhlYWRlciA9IGNhcmQuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWNhcmQtaGVhZGluZ1wiIH0pO1xuICAgIGNvbnN0IHRpdGxlQmxvY2sgPSBoZWFkZXIuY3JlYXRlRGl2KCk7XG4gICAgdGl0bGVCbG9jay5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJcdTY4NDhcdTRFRjZcdTUzNzdcdTVCOTdcIiB9KTtcbiAgICB0aXRsZUJsb2NrLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IFwiXHU2MzA5XHU3MkI2XHU2MDAxXHU2NTc0XHU3NDA2XHU2MjQwXHU2NzA5XHU2ODQ4XHU0RUY2XHVGRjBDXHU3MEI5XHU1MUZCXHU4RkRCXHU1MTY1XHU2ODQ4XHU0RUY2XHU4QkU2XHU2MEM1XHU1REU1XHU0RjVDXHU1M0YwXHUzMDAyXCIgfSk7XG4gICAgY29uc3QgbmV3Q2FzZUJ1dHRvbiA9IGhlYWRlci5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzaGVybG9jay1taW5pLWJ1dHRvbiBzaGVybG9jay1taW5pLWJ1dHRvbi1zdHJvbmdcIiwgdGV4dDogXCJOZXcgQ2FzZVwiIH0pO1xuICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChuZXdDYXNlQnV0dG9uLCBcImNsaWNrXCIsIGFzeW5jICgpID0+IHRoaXMucGx1Z2luLmNyZWF0ZUNhc2VOb3RlKCkpO1xuICAgIGNvbnN0IGJvYXJkID0gY2FyZC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stYm9hcmRcIiB9KTtcblxuICAgIHRoaXMucmVuZGVyQ2FzZUNvbHVtbihib2FyZCwgXCJPcGVuXCIsIGNhc2VzLmZpbHRlcigoaXRlbSkgPT4gaXRlbS5zdGF0dXMgPT09IFwib3BlblwiKSk7XG4gICAgdGhpcy5yZW5kZXJDYXNlQ29sdW1uKGJvYXJkLCBcIkFjdGl2ZVwiLCBjYXNlcy5maWx0ZXIoKGl0ZW0pID0+IGl0ZW0uc3RhdHVzID09PSBcImFjdGl2ZVwiKSk7XG4gICAgdGhpcy5yZW5kZXJDYXNlQ29sdW1uKGJvYXJkLCBcIkFyY2hpdmVkXCIsIGNhc2VzLmZpbHRlcigoaXRlbSkgPT4gaXRlbS5zdGF0dXMgPT09IFwiYXJjaGl2ZWRcIikpO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJDYXNlQ29sdW1uKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIHRpdGxlOiBzdHJpbmcsIGl0ZW1zOiBTaGVybG9ja0Nhc2VbXSk6IHZvaWQge1xuICAgIGNvbnN0IGNvbHVtbiA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stYm9hcmQtY29sdW1uXCIgfSk7XG4gICAgY29uc3QgY29sdW1uSGVhZGVyID0gY29sdW1uLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1ib2FyZC1jb2x1bW4taGVhZGVyXCIgfSk7XG4gICAgY29sdW1uSGVhZGVyLmNyZWF0ZUVsKFwiaDRcIiwgeyB0ZXh0OiB0aXRsZSB9KTtcbiAgICBjb2x1bW5IZWFkZXIuY3JlYXRlRWwoXCJzcGFuXCIsIHsgdGV4dDogU3RyaW5nKGl0ZW1zLmxlbmd0aCkgfSk7XG4gICAgaWYgKGl0ZW1zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgY29sdW1uLmNyZWF0ZUVsKFwicFwiLCB7IGNsczogXCJzaGVybG9jay1lbXB0eVwiLCB0ZXh0OiBcIlx1NjY4Mlx1NjVFMFx1OEJCMFx1NUY1NVwiIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGxpc3QgPSBjb2x1bW4uY3JlYXRlRWwoXCJ1bFwiLCB7IGNsczogXCJzaGVybG9jay1saXN0XCIgfSk7XG4gICAgaXRlbXMuc2xpY2UoMCwgNCkuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgY29uc3Qgcm93ID0gbGlzdC5jcmVhdGVFbChcImxpXCIsIHsgY2xzOiBcInNoZXJsb2NrLWxpc3QtaXRlbSBzaGVybG9jay1jYXNlLXJvd1wiIH0pO1xuICAgICAgY29uc3QgYm9keSA9IHJvdy5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stbGlzdC1jb3B5XCIgfSk7XG4gICAgICBib2R5LmNyZWF0ZUVsKFwic3Ryb25nXCIsIHsgdGV4dDogaXRlbS5uYW1lIH0pO1xuICAgICAgY29uc3QgbGlua2VkVGFza3MgPSB0aGlzLnBsdWdpblRhc2tDb3VudChpdGVtLmZpbGVQYXRoKTtcbiAgICAgIGJvZHkuY3JlYXRlRWwoXCJzcGFuXCIsIHtcbiAgICAgICAgY2xzOiBcInNoZXJsb2NrLW1ldGFcIixcbiAgICAgICAgdGV4dDogaXRlbS5kZWFkbGluZSA/IGBcdTYyMkFcdTZCNjIgJHtpdGVtLmRlYWRsaW5lfWAgOiBpdGVtLmZpbGVQYXRoXG4gICAgICB9KTtcbiAgICAgIGJvZHkuY3JlYXRlRWwoXCJzcGFuXCIsIHtcbiAgICAgICAgY2xzOiBcInNoZXJsb2NrLW1ldGFcIixcbiAgICAgICAgdGV4dDogbGlua2VkVGFza3MgPiAwID8gYCR7bGlua2VkVGFza3N9IGxpbmtlZCB0YXNrJHtsaW5rZWRUYXNrcyA+IDEgPyBcInNcIiA6IFwiXCJ9YCA6IFwiTm8gbGlua2VkIHRhc2tzIHlldFwiXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHByb2dyZXNzID0gYm9keS5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stY2FzZS1wcm9ncmVzc1wiIH0pO1xuICAgICAgY29uc3QgcHJvZ3Jlc3NGaWxsID0gcHJvZ3Jlc3MuY3JlYXRlRGl2KCk7XG4gICAgICBwcm9ncmVzc0ZpbGwuc3R5bGUud2lkdGggPSBgJHt0aGlzLnJlc29sdmVDYXNlUHJvZ3Jlc3MoaXRlbS5maWxlUGF0aCl9JWA7XG4gICAgICBib2R5LmNyZWF0ZUVsKFwic3BhblwiLCB7IGNsczogXCJzaGVybG9jay1yb3ctYWZmb3JkYW5jZVwiLCB0ZXh0OiBcIkNsaWNrIHRvIG9wZW4gd29ya3NwYWNlXCIgfSk7XG4gICAgICBjb25zdCBzaWRlID0gcm93LmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1saXN0LWFjdGlvbnNcIiB9KTtcbiAgICAgIHNpZGUuY3JlYXRlRWwoXCJzcGFuXCIsIHsgY2xzOiBgc2hlcmxvY2stY2hpcCBwcmlvcml0eS0ke2l0ZW0ucHJpb3JpdHkgPz8gXCJtZWRpdW1cIn1gLCB0ZXh0OiB0aGlzLnJlbmRlclByaW9yaXR5TGFiZWwoaXRlbS5wcmlvcml0eSkgfSk7XG4gICAgICBjb25zdCBhY3Rpb24gPSBzaWRlLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1pbmktYnV0dG9uXCIsIHRleHQ6IFwiK1Rhc2tcIiB9KTtcbiAgICAgIGNvbnN0IGVkaXQgPSBzaWRlLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1pbmktYnV0dG9uXCIsIHRleHQ6IFwiXHU3RjE2XHU4RjkxXCIgfSk7XG4gICAgICBjb25zdCByZW1vdmUgPSBzaWRlLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1pbmktYnV0dG9uIGRhbmdlclwiLCB0ZXh0OiBcIlx1NTIyMFx1OTY2NFwiIH0pO1xuICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KGFjdGlvbiwgXCJjbGlja1wiLCBhc3luYyAoZXZlbnQ6IE1vdXNlRXZlbnQpID0+IHtcbiAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmNyZWF0ZVRhc2tGcm9tQ2FzZShpdGVtLmZpbGVQYXRoKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KGVkaXQsIFwiY2xpY2tcIiwgYXN5bmMgKGV2ZW50OiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5vcGVuUGF0aChpdGVtLmZpbGVQYXRoKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KHJlbW92ZSwgXCJjbGlja1wiLCBhc3luYyAoZXZlbnQ6IE1vdXNlRXZlbnQpID0+IHtcbiAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmRlbGV0ZVBhdGgoaXRlbS5maWxlUGF0aCk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChyb3csIFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4ge1xuICAgICAgICB0aGlzLnNlbGVjdGVkQ2FzZVBhdGggPSBpdGVtLmZpbGVQYXRoO1xuICAgICAgICB0aGlzLnNjcmVlbiA9IFwiY2FzZVwiO1xuICAgICAgICBhd2FpdCB0aGlzLnJlbmRlckN1cnJlbnRTY3JlZW4oKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KHJvdywgXCJkYmxjbGlja1wiLCBhc3luYyAoKSA9PiB0aGlzLnBsdWdpbi5vcGVuUGF0aChpdGVtLmZpbGVQYXRoKSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlbmRlckNhc2VXb3Jrc3BhY2UoY2FzZVBhdGg6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMucGx1Z2luLmRlYnVnTG9nKFwidmlldzpjYXNlOnJlbmRlcjpzdGFydFwiKTtcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgdGhpcy5wbHVnaW4uZ2V0V29ya3NwYWNlRGF0YSgpO1xuICAgIGNvbnN0IGN1cnJlbnRDYXNlID0gZGF0YS5jYXNlcy5maW5kKChpdGVtKSA9PiBpdGVtLmZpbGVQYXRoID09PSBjYXNlUGF0aCk7XG4gICAgaWYgKCFjdXJyZW50Q2FzZSkge1xuICAgICAgdGhpcy5zY3JlZW4gPSBcImNhc2VzXCI7XG4gICAgICBhd2FpdCB0aGlzLnJlbmRlckNhc2VEZXNrKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgY2FzZVRhc2tzID0gZGF0YS50YXNrcy5maWx0ZXIoKHRhc2spID0+IHRhc2suY2FzZVBhdGggPT09IGN1cnJlbnRDYXNlLmZpbGVQYXRoKTtcbiAgICBjb25zdCBjYXNlU2NoZWR1bGVzID0gZGF0YS5zY2hlZHVsZXMuZmlsdGVyKChzY2hlZHVsZSkgPT4ge1xuICAgICAgaWYgKCFzY2hlZHVsZS5yZWxhdGVkVGFza1BhdGgpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGNhc2VUYXNrcy5zb21lKCh0YXNrKSA9PiB0YXNrLmZpbGVQYXRoID09PSBzY2hlZHVsZS5yZWxhdGVkVGFza1BhdGgpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICBjb25zdCBzaGVsbCA9IHRoaXMuY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1zaGVsbCBzaGVybG9jay1jYXNlLXNoZWxsXCIgfSk7XG4gICAgc2hlbGwuZGF0YXNldC5wZXJpb2QgPSB0aGlzLnJlc29sdmVQZXJpb2QoKTtcbiAgICBzaGVsbC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stYXRtb3NwaGVyZSBzaGVybG9jay1mb2ctbGF5ZXJcIiB9KTtcbiAgICBzaGVsbC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stYXRtb3NwaGVyZSBzaGVybG9jay1ncmFpbi1sYXllclwiIH0pO1xuXG4gICAgY29uc3QgaGVhZGVyID0gc2hlbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWNhc2UtaGVhZGVyXCIgfSk7XG4gICAgY29uc3QgYmFja0J1dHRvbiA9IGhlYWRlci5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzaGVybG9jay1pY29uLWJ1dHRvblwiLCB0ZXh0OiBcIlx1MjE5MFwiIH0pO1xuICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChiYWNrQnV0dG9uLCBcImNsaWNrXCIsIGFzeW5jICgpID0+IHtcbiAgICAgIHRoaXMuc2NyZWVuID0gXCJjYXNlc1wiO1xuICAgICAgdGhpcy5zZWxlY3RlZENhc2VQYXRoID0gdW5kZWZpbmVkO1xuICAgICAgYXdhaXQgdGhpcy5yZW5kZXJDYXNlRGVzaygpO1xuICAgIH0pO1xuICAgIGNvbnN0IHRpdGxlQmxvY2sgPSBoZWFkZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWNhc2UtdGl0bGUtYmxvY2tcIiB9KTtcbiAgICB0aXRsZUJsb2NrLmNyZWF0ZUVsKFwic3BhblwiLCB7IGNsczogXCJzaGVybG9jay1raWNrZXJcIiwgdGV4dDogXCJDYXNlIFdvcmtzcGFjZVwiIH0pO1xuICAgIHRpdGxlQmxvY2suY3JlYXRlRWwoXCJoMVwiLCB7IHRleHQ6IGN1cnJlbnRDYXNlLm5hbWUgfSk7XG4gICAgdGl0bGVCbG9jay5jcmVhdGVFbChcInBcIiwge1xuICAgICAgdGV4dDogW2N1cnJlbnRDYXNlLnN0YXR1cywgY3VycmVudENhc2UucHJpb3JpdHkgPyBgJHtjdXJyZW50Q2FzZS5wcmlvcml0eX0gcHJpb3JpdHlgIDogdW5kZWZpbmVkLCBjdXJyZW50Q2FzZS5kZWFkbGluZSA/IGBkdWUgJHtjdXJyZW50Q2FzZS5kZWFkbGluZX1gIDogdW5kZWZpbmVkXVxuICAgICAgICAuZmlsdGVyKEJvb2xlYW4pXG4gICAgICAgIC5qb2luKFwiIC8gXCIpXG4gICAgfSk7XG4gICAgY29uc3QgYWN0aW9ucyA9IGhlYWRlci5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stY2FzZS1hY3Rpb25zXCIgfSk7XG4gICAgdGhpcy5jcmVhdGVBY3Rpb24oYWN0aW9ucywgXCJcdTY1QjBcdTVFRkFcdTdFQkZcdTdEMjJcdTRFRkJcdTUyQTFcIiwgYXN5bmMgKCkgPT4gdGhpcy5wbHVnaW4uY3JlYXRlVGFza0Zyb21DYXNlKGN1cnJlbnRDYXNlLmZpbGVQYXRoKSk7XG4gICAgdGhpcy5jcmVhdGVBY3Rpb24oYWN0aW9ucywgXCJcdTYyNTNcdTVGMDBcdTY4NDhcdTRFRjZcdTY1ODdcdTRFRjZcIiwgYXN5bmMgKCkgPT4gdGhpcy5wbHVnaW4ub3BlblBhdGgoY3VycmVudENhc2UuZmlsZVBhdGgpLCB0cnVlKTtcblxuICAgIGNvbnN0IGJvZHkgPSBzaGVsbC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stY2FzZS1ncmlkXCIgfSk7XG4gICAgdGhpcy5yZW5kZXJDYXNlT3ZlcnZpZXcoYm9keSwgY3VycmVudENhc2UsIGNhc2VUYXNrcywgY2FzZVNjaGVkdWxlcyk7XG4gICAgdGhpcy5yZW5kZXJDYXNlVGFza3MoYm9keSwgY3VycmVudENhc2UsIGNhc2VUYXNrcyk7XG4gICAgdGhpcy5yZW5kZXJDYXNlU2NoZWR1bGUoYm9keSwgY2FzZVNjaGVkdWxlcyk7XG4gICAgdGhpcy5yZW5kZXJDYXNlRXZpZGVuY2UoYm9keSwgY3VycmVudENhc2UpO1xuICAgIHRoaXMucmVuZGVyQ2FzZVRpbWVsaW5lKGJvZHksIGN1cnJlbnRDYXNlLCBjYXNlVGFza3MsIGNhc2VTY2hlZHVsZXMpO1xuICAgIHRoaXMucGx1Z2luLmRlYnVnTG9nKFwidmlldzpjYXNlOnJlbmRlcjpjb21wbGV0ZVwiKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyQ2FzZU92ZXJ2aWV3KGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIGN1cnJlbnRDYXNlOiBTaGVybG9ja0Nhc2UsIHRhc2tzOiBTaGVybG9ja1Rhc2tbXSwgc2NoZWR1bGVzOiBTaGVybG9ja1NjaGVkdWxlW10pOiB2b2lkIHtcbiAgICBjb25zdCBwYW5lbCA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stcGFuZWwgc2hlcmxvY2stY2FzZS1vdmVydmlld1wiIH0pO1xuICAgIHBhbmVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIlx1Njg0OFx1NjBDNVx1NEUyRFx1NjdBMlwiIH0pO1xuICAgIGNvbnN0IHN0YXRzID0gcGFuZWwuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLW1ldHJpYy1yb3dcIiB9KTtcbiAgICB0aGlzLmNyZWF0ZU1ldHJpYyhzdGF0cywgXCJcdTRFRkJcdTUyQTFcIiwgU3RyaW5nKHRhc2tzLmxlbmd0aCkpO1xuICAgIHRoaXMuY3JlYXRlTWV0cmljKHN0YXRzLCBcIlx1NURGMlx1NjM5Mlx1NjcxRlwiLCBTdHJpbmcoc2NoZWR1bGVzLmxlbmd0aCkpO1xuICAgIHRoaXMuY3JlYXRlTWV0cmljKHN0YXRzLCBcIlx1NzJCNlx1NjAwMVwiLCBjdXJyZW50Q2FzZS5zdGF0dXMpO1xuICAgIGNvbnN0IG5vdGVzID0gcGFuZWwuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWNhc2UtYnJpZWZcIiB9KTtcbiAgICBub3Rlcy5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIlx1Njg0OFx1NEVGNlx1NjU4N1x1NEVGNlx1MzAwMVx1NEVGQlx1NTJBMVx1N0VCRlx1N0QyMlx1MzAwMVx1OEMwM1x1NjdFNVx1NjM5Mlx1NjcxRlx1NTQ4Q1x1OEQ0NFx1NjU5OVx1NTE2NVx1NTNFM1x1NEYxQVx1NTcyOFx1OEZEOVx1OTFDQ1x1NkM0N1x1NTQwOFx1MzAwMlwiIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJDYXNlVGFza3MoY29udGFpbmVyOiBIVE1MRWxlbWVudCwgY3VycmVudENhc2U6IFNoZXJsb2NrQ2FzZSwgdGFza3M6IFNoZXJsb2NrVGFza1tdKTogdm9pZCB7XG4gICAgY29uc3QgcGFuZWwgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLXBhbmVsIHNoZXJsb2NrLWNhc2UtcGFuZWxcIiB9KTtcbiAgICBwYW5lbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJcdTdFQkZcdTdEMjJcdTRFRkJcdTUyQTFcIiB9KTtcbiAgICBjb25zdCBsaXN0ID0gcGFuZWwuY3JlYXRlRWwoXCJ1bFwiLCB7IGNsczogXCJzaGVybG9jay1saXN0XCIgfSk7XG4gICAgaWYgKHRhc2tzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgY29uc3Qgcm93ID0gbGlzdC5jcmVhdGVFbChcImxpXCIsIHsgY2xzOiBcInNoZXJsb2NrLWVtcHR5XCIgfSk7XG4gICAgICByb3cuc2V0VGV4dChcIlx1OEZEOVx1NEUyQVx1Njg0OFx1NEVGNlx1OEZEOFx1NkNBMVx1NjcwOVx1NEVGQlx1NTJBMVx1MzAwMlwiKTtcbiAgICAgIGNvbnN0IGJ1dHRvbiA9IHBhbmVsLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLWJ1dHRvblwiLCB0ZXh0OiBcIlx1NTIxQlx1NUVGQVx1N0IyQ1x1NEUwMFx1Njc2MVx1N0VCRlx1N0QyMlwiIH0pO1xuICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KGJ1dHRvbiwgXCJjbGlja1wiLCBhc3luYyAoKSA9PiB0aGlzLnBsdWdpbi5jcmVhdGVUYXNrRnJvbUNhc2UoY3VycmVudENhc2UuZmlsZVBhdGgpKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0YXNrcy5mb3JFYWNoKCh0YXNrKSA9PiB7XG4gICAgICBjb25zdCByb3cgPSBsaXN0LmNyZWF0ZUVsKFwibGlcIiwgeyBjbHM6IFwic2hlcmxvY2stbGlzdC1pdGVtXCIgfSk7XG4gICAgICBjb25zdCBib2R5ID0gcm93LmNyZWF0ZURpdigpO1xuICAgICAgYm9keS5jcmVhdGVFbChcInN0cm9uZ1wiLCB7IHRleHQ6IHRhc2submFtZSB9KTtcbiAgICAgIGJvZHkuY3JlYXRlRWwoXCJzcGFuXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1ldGFcIiwgdGV4dDogW3Rhc2suc3RhdHVzLCB0YXNrLnByaW9yaXR5LCB0YXNrLmR1ZV0uZmlsdGVyKEJvb2xlYW4pLmpvaW4oXCIgLyBcIikgfSk7XG4gICAgICBjb25zdCBzaWRlID0gcm93LmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1saXN0LWFjdGlvbnNcIiB9KTtcbiAgICAgIHNpZGUuY3JlYXRlRWwoXCJzcGFuXCIsIHsgY2xzOiBcInNoZXJsb2NrLWNoaXAgY29tcGFjdFwiLCB0ZXh0OiB0YXNrLnN0YXR1cyB9KTtcbiAgICAgIGNvbnN0IGVkaXQgPSBzaWRlLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1pbmktYnV0dG9uXCIsIHRleHQ6IFwiXHU3RjE2XHU4RjkxXCIgfSk7XG4gICAgICBjb25zdCByZW1vdmUgPSBzaWRlLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1pbmktYnV0dG9uIGRhbmdlclwiLCB0ZXh0OiBcIlx1NTIyMFx1OTY2NFwiIH0pO1xuICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KGVkaXQsIFwiY2xpY2tcIiwgYXN5bmMgKGV2ZW50OiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5vcGVuUGF0aCh0YXNrLmZpbGVQYXRoKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KHJlbW92ZSwgXCJjbGlja1wiLCBhc3luYyAoZXZlbnQ6IE1vdXNlRXZlbnQpID0+IHtcbiAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmRlbGV0ZVBhdGgodGFzay5maWxlUGF0aCk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChyb3csIFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4gdGhpcy5wbHVnaW4ub3BlblBhdGgodGFzay5maWxlUGF0aCkpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJDYXNlU2NoZWR1bGUoY29udGFpbmVyOiBIVE1MRWxlbWVudCwgc2NoZWR1bGVzOiBTaGVybG9ja1NjaGVkdWxlW10pOiB2b2lkIHtcbiAgICBjb25zdCBwYW5lbCA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stcGFuZWwgc2hlcmxvY2stY2FzZS1wYW5lbFwiIH0pO1xuICAgIHBhbmVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIlx1OEMwM1x1NjdFNVx1NjM5Mlx1NjcxRlwiIH0pO1xuICAgIGNvbnN0IGxpc3QgPSBwYW5lbC5jcmVhdGVFbChcInVsXCIsIHsgY2xzOiBcInNoZXJsb2NrLWxpc3RcIiB9KTtcbiAgICBpZiAoc2NoZWR1bGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgbGlzdC5jcmVhdGVFbChcImxpXCIsIHsgY2xzOiBcInNoZXJsb2NrLWVtcHR5XCIsIHRleHQ6IFwiXHU2NjgyXHU2NUUwXHU2MzkyXHU2NzFGXHUzMDAyXHU2MjhBXHU0RUZCXHU1MkExXHU2MkQ2XHU4RkRCXHU1NDY4XHU2NzdGXHU1NDBFXHVGRjBDXHU4RkQ5XHU5MUNDXHU0RjFBXHU4MUVBXHU1MkE4XHU1MUZBXHU3M0IwXHU1MTczXHU4MDU0XHU4QkIwXHU1RjU1XHUzMDAyXCIgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgc2NoZWR1bGVzLmZvckVhY2goKHNjaGVkdWxlKSA9PiB7XG4gICAgICBjb25zdCByb3cgPSBsaXN0LmNyZWF0ZUVsKFwibGlcIiwgeyBjbHM6IFwic2hlcmxvY2stbGlzdC1pdGVtXCIgfSk7XG4gICAgICBjb25zdCBib2R5ID0gcm93LmNyZWF0ZURpdigpO1xuICAgICAgYm9keS5jcmVhdGVFbChcInN0cm9uZ1wiLCB7IHRleHQ6IHNjaGVkdWxlLnJlbGF0ZWRUYXNrID8/IHNjaGVkdWxlLm5hbWUgfSk7XG4gICAgICBib2R5LmNyZWF0ZUVsKFwic3BhblwiLCB7IGNsczogXCJzaGVybG9jay1tZXRhXCIsIHRleHQ6IFtzY2hlZHVsZS5kYXksIHNjaGVkdWxlLnN0YXJ0ICYmIHNjaGVkdWxlLmVuZCA/IGAke3NjaGVkdWxlLnN0YXJ0fS0ke3NjaGVkdWxlLmVuZH1gIDogdW5kZWZpbmVkXS5maWx0ZXIoQm9vbGVhbikuam9pbihcIiAvIFwiKSB9KTtcbiAgICAgIGNvbnN0IHNpZGUgPSByb3cuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWxpc3QtYWN0aW9uc1wiIH0pO1xuICAgICAgY29uc3QgZWRpdCA9IHNpZGUuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwic2hlcmxvY2stbWluaS1idXR0b25cIiwgdGV4dDogXCJcdTdGMTZcdThGOTFcIiB9KTtcbiAgICAgIGNvbnN0IHJlbW92ZSA9IHNpZGUuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwic2hlcmxvY2stbWluaS1idXR0b24gZGFuZ2VyXCIsIHRleHQ6IFwiXHU1MjIwXHU5NjY0XCIgfSk7XG4gICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoZWRpdCwgXCJjbGlja1wiLCBhc3luYyAoZXZlbnQ6IE1vdXNlRXZlbnQpID0+IHtcbiAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLm9wZW5QYXRoKHNjaGVkdWxlLmZpbGVQYXRoKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KHJlbW92ZSwgXCJjbGlja1wiLCBhc3luYyAoZXZlbnQ6IE1vdXNlRXZlbnQpID0+IHtcbiAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmRlbGV0ZVBhdGgoc2NoZWR1bGUuZmlsZVBhdGgpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQocm93LCBcImNsaWNrXCIsIGFzeW5jICgpID0+IHRoaXMucGx1Z2luLm9wZW5QYXRoKHNjaGVkdWxlLmZpbGVQYXRoKSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckNhc2VFdmlkZW5jZShjb250YWluZXI6IEhUTUxFbGVtZW50LCBjdXJyZW50Q2FzZTogU2hlcmxvY2tDYXNlKTogdm9pZCB7XG4gICAgY29uc3QgcGFuZWwgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLXBhbmVsIHNoZXJsb2NrLWNhc2UtcGFuZWxcIiB9KTtcbiAgICBjb25zdCBoZWFkZXIgPSBwYW5lbC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stcGFuZWwtaGVhZGluZ1wiIH0pO1xuICAgIGhlYWRlci5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJcdThCQzFcdTcyNjlcdTY3RENcIiB9KTtcbiAgICBjb25zdCBhY3Rpb25zID0gaGVhZGVyLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1pbmxpbmUtYWN0aW9uc1wiIH0pO1xuICAgIGNvbnN0IGZvbGRlckJ1dHRvbiA9IGFjdGlvbnMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwic2hlcmxvY2stbWluaS1idXR0b25cIiwgdGV4dDogXCJcdTYyNTNcdTVGMDBcdThENDRcdTY1OTlcdTU5MzlcIiB9KTtcbiAgICBjb25zdCBldmlkZW5jZUJ1dHRvbiA9IGFjdGlvbnMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwic2hlcmxvY2stbWluaS1idXR0b25cIiwgdGV4dDogXCJcdTY1QjBcdTVFRkFcdThCQzFcdTcyNjlcIiB9KTtcbiAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoZm9sZGVyQnV0dG9uLCBcImNsaWNrXCIsIGFzeW5jICgpID0+IHRoaXMucGx1Z2luLnJldmVhbEV2aWRlbmNlRm9sZGVyRm9yQ2FzZShjdXJyZW50Q2FzZS5maWxlUGF0aCkpO1xuICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChldmlkZW5jZUJ1dHRvbiwgXCJjbGlja1wiLCBhc3luYyAoKSA9PiB0aGlzLnBsdWdpbi5jcmVhdGVFdmlkZW5jZUZyb21DYXNlKGN1cnJlbnRDYXNlLmZpbGVQYXRoKSk7XG5cbiAgICBjb25zdCBldmlkZW5jZSA9IHRoaXMuZmluZENhc2VFdmlkZW5jZShjdXJyZW50Q2FzZSk7XG4gICAgY29uc3QgY2FiaW5ldCA9IHBhbmVsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1ldmlkZW5jZS1jYWJpbmV0XCIgfSk7XG4gICAgW1xuICAgICAgeyBsYWJlbDogXCJNYXJrZG93blwiLCBraW5kOiBcIm1hcmtkb3duXCIgYXMgY29uc3QgfSxcbiAgICAgIHsgbGFiZWw6IFwiUERGXCIsIGtpbmQ6IFwicGRmXCIgYXMgY29uc3QgfSxcbiAgICAgIHsgbGFiZWw6IFwiSW1hZ2VzXCIsIGtpbmQ6IFwiaW1hZ2VcIiBhcyBjb25zdCB9LFxuICAgICAgeyBsYWJlbDogXCJMb2NhbCBmaWxlc1wiLCBraW5kOiBcImxvY2FsXCIgYXMgY29uc3QgfVxuICAgIF0uZm9yRWFjaCgoeyBsYWJlbCwga2luZCB9KSA9PiB7XG4gICAgICBjb25zdCBmaWxlcyA9IGV2aWRlbmNlLmZpbHRlcigoaXRlbSkgPT4gaXRlbS5raW5kID09PSBraW5kKTtcbiAgICAgIGNvbnN0IGl0ZW0gPSBjYWJpbmV0LmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1ldmlkZW5jZS1zbG90XCIgfSk7XG4gICAgICBpdGVtLmNyZWF0ZUVsKFwic3Ryb25nXCIsIHsgdGV4dDogbGFiZWwgfSk7XG4gICAgICBpdGVtLmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IGZpbGVzLmxlbmd0aCA+IDAgPyBgJHtmaWxlcy5sZW5ndGh9IGl0ZW0ke2ZpbGVzLmxlbmd0aCA+IDEgPyBcInNcIiA6IFwiXCJ9YCA6IFwiZW1wdHlcIiB9KTtcbiAgICAgIGNvbnN0IGxpc3QgPSBpdGVtLmNyZWF0ZUVsKFwidWxcIiwgeyBjbHM6IFwic2hlcmxvY2stZXZpZGVuY2UtbGlzdFwiIH0pO1xuICAgICAgZmlsZXMuc2xpY2UoMCwgMykuZm9yRWFjaCgoZXZpZGVuY2VJdGVtKSA9PiB7XG4gICAgICAgIGNvbnN0IHJvdyA9IGxpc3QuY3JlYXRlRWwoXCJsaVwiKTtcbiAgICAgICAgY29uc3QgbGluayA9IHJvdy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzaGVybG9jay1ldmlkZW5jZS1saW5rXCIsIHRleHQ6IGV2aWRlbmNlSXRlbS5maWxlLmJhc2VuYW1lIH0pO1xuICAgICAgICBjb25zdCByZW1vdmUgPSByb3cuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwic2hlcmxvY2stbWluaS1idXR0b24gZGFuZ2VyXCIsIHRleHQ6IFwiXHU1MjIwXHU5NjY0XCIgfSk7XG4gICAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChsaW5rLCBcImNsaWNrXCIsIGFzeW5jICgpID0+IHRoaXMucGx1Z2luLm9wZW5QYXRoKGV2aWRlbmNlSXRlbS5maWxlLnBhdGgpKTtcbiAgICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KHJlbW92ZSwgXCJjbGlja1wiLCBhc3luYyAoKSA9PiB0aGlzLnBsdWdpbi5kZWxldGVQYXRoKGV2aWRlbmNlSXRlbS5maWxlLnBhdGgpKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIGNvbnN0IGZvb3RlciA9IHBhbmVsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1mb290ZXJcIiB9KTtcbiAgICBmb290ZXIuY3JlYXRlRWwoXCJzcGFuXCIsIHtcbiAgICAgIHRleHQ6IGV2aWRlbmNlLmxlbmd0aCA+IDBcbiAgICAgICAgPyBgJHtldmlkZW5jZS5sZW5ndGh9IFx1NEVGRFx1OEQ0NFx1NjU5OVx1NURGMlx1NTE3M1x1ODA1NFx1NTIzMFx1NkI2NFx1Njg0OFx1NEVGNmBcbiAgICAgICAgOiBcIlx1NjI4QVx1OEQ0NFx1NjU5OVx1NjUzRVx1NTE2NSBFdmlkZW5jZSBcdTY1ODdcdTRFRjZcdTU5MzlcdUZGMENcdTYyMTZcdTY1QjBcdTVFRkFcdThCQzFcdTcyNjlcdTdCMTRcdThCQjBcdTVGMDBcdTU5Q0JcdTVGNTJcdTY4NjNcIlxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJDYXNlVGltZWxpbmUoY29udGFpbmVyOiBIVE1MRWxlbWVudCwgY3VycmVudENhc2U6IFNoZXJsb2NrQ2FzZSwgdGFza3M6IFNoZXJsb2NrVGFza1tdLCBzY2hlZHVsZXM6IFNoZXJsb2NrU2NoZWR1bGVbXSk6IHZvaWQge1xuICAgIGNvbnN0IHBhbmVsID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1wYW5lbCBzaGVybG9jay1jYXNlLXBhbmVsIHNoZXJsb2NrLWNhc2UtdGltZWxpbmUtcGFuZWxcIiB9KTtcbiAgICBwYW5lbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJcdTY4NDhcdTRFRjZcdTY1RjZcdTk1RjRcdTdFQkZcIiB9KTtcbiAgICBjb25zdCB0aW1lbGluZSA9IHBhbmVsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay10aW1lbGluZVwiIH0pO1xuICAgIGNvbnN0IGV2ZW50cyA9IFtcbiAgICAgIHsgbGFiZWw6IFwiXHU2ODQ4XHU0RUY2XHU1MjFCXHU1RUZBXCIsIHZhbHVlOiBjdXJyZW50Q2FzZS5jcmVhdGVkID8/IFwidW5rbm93blwiIH0sXG4gICAgICAuLi50YXNrcy5zbGljZSgwLCA0KS5tYXAoKHRhc2spID0+ICh7IGxhYmVsOiBgXHU0RUZCXHU1MkExOiAke3Rhc2submFtZX1gLCB2YWx1ZTogdGFzay51cGRhdGVkID8/IHRhc2suY3JlYXRlZCA/PyB0YXNrLnN0YXR1cyB9KSksXG4gICAgICAuLi5zY2hlZHVsZXMuc2xpY2UoMCwgNCkubWFwKChzY2hlZHVsZSkgPT4gKHsgbGFiZWw6IGBcdTYzOTJcdTY3MUY6ICR7c2NoZWR1bGUucmVsYXRlZFRhc2sgPz8gc2NoZWR1bGUubmFtZX1gLCB2YWx1ZTogW3NjaGVkdWxlLmRheSwgc2NoZWR1bGUuc3RhcnRdLmZpbHRlcihCb29sZWFuKS5qb2luKFwiIFwiKSB9KSlcbiAgICBdO1xuXG4gICAgZXZlbnRzLmZvckVhY2goKGV2ZW50KSA9PiB7XG4gICAgICBjb25zdCByb3cgPSB0aW1lbGluZS5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stdGltZWxpbmUtcm93XCIgfSk7XG4gICAgICByb3cuY3JlYXRlU3Bhbih7IGNsczogXCJzaGVybG9jay10aW1lbGluZS1kb3RcIiB9KTtcbiAgICAgIGNvbnN0IGNvcHkgPSByb3cuY3JlYXRlRGl2KCk7XG4gICAgICBjb3B5LmNyZWF0ZUVsKFwic3Ryb25nXCIsIHsgdGV4dDogZXZlbnQubGFiZWwgfSk7XG4gICAgICBjb3B5LmNyZWF0ZUVsKFwic3BhblwiLCB7IGNsczogXCJzaGVybG9jay1tZXRhXCIsIHRleHQ6IGV2ZW50LnZhbHVlIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJSZWFkaW5nTW9kdWxlKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIGRhdGE6IFNoZXJsb2NrV29ya3NwYWNlRGF0YSk6IHZvaWQge1xuICAgIGNvbnN0IHJlYWRpbmdJdGVtcyA9IGRhdGEuY29sbGVjdGlvbnMuZmlsdGVyKChpdGVtKSA9PiBpdGVtLnN0YXR1cyAhPT0gXCJmaW5pc2hlZFwiKTtcbiAgICBjb25zdCBjYXJkID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1wYW5lbCBzaGVybG9jay1jYXJkIHdpZGVcIiB9KTtcbiAgICBjb25zdCBoZWFkZXIgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1wYW5lbC1oZWFkaW5nXCIgfSk7XG4gICAgaGVhZGVyLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIlx1OEJDMVx1NzI2OVx1NzgxNFx1OEJGQlwiIH0pO1xuICAgIGNvbnN0IGFkZEJ1dHRvbiA9IGhlYWRlci5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzaGVybG9jay1taW5pLWJ1dHRvblwiLCB0ZXh0OiBcIlx1NjVCMFx1NUVGQVx1NzgxNFx1OEJGQlx1Njc2MVx1NzZFRVwiIH0pO1xuICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChhZGRCdXR0b24sIFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4gdGhpcy5wbHVnaW4uY3JlYXRlQ29sbGVjdGlvbk5vdGUoKSk7XG4gICAgY2FyZC5jcmVhdGVFbChcInBcIiwge1xuICAgICAgY2xzOiBcInNoZXJsb2NrLW1pbmktY29weVwiLFxuICAgICAgdGV4dDogXCJcdThGRDlcdTkxQ0NcdTY1M0VcdTZCNjNcdTU3MjhcdThCRkJcdTMwMDFcdTZCNjNcdTU3MjhcdTc3MEJcdTMwMDFcdTZCNjNcdTU3MjhcdTc4MTRcdTdBNzZcdTc2ODRcdTUxODVcdTVCQjlcdTMwMDJcdTZCQ0ZcdTY3NjFcdTkwRkRcdTgwRkRcdTk2OEZcdTY1RjZcdTg4NjVcdTdCMTRcdThCQjBcdUZGMUJcdTc4NkVcdThCQTRcdThCRkJcdTVCOENcdTU0MEVcdUZGMENcdTUxOERcdTVGNTJcdTUxNjVcdTY4NjNcdTY4NDhcdTY3RENcdTMwMDJcIlxuICAgIH0pO1xuICAgIGNvbnN0IGxpc3QgPSBjYXJkLmNyZWF0ZUVsKFwidWxcIiwgeyBjbHM6IFwic2hlcmxvY2stbGlzdFwiIH0pO1xuICAgIGlmIChyZWFkaW5nSXRlbXMubGVuZ3RoID09PSAwKSB7XG4gICAgICBsaXN0LmNyZWF0ZUVsKFwibGlcIiwgeyBjbHM6IFwic2hlcmxvY2stZW1wdHlcIiwgdGV4dDogXCJcdThGRDhcdTZDQTFcdTY3MDlcdTZCNjNcdTU3MjhcdTc4MTRcdThCRkJcdTc2ODRcdTY3NjFcdTc2RUVcdTMwMDJcdTUzRUZcdTRFRTVcdTRFQ0VcdTRFNjZcdTdDNERcdTMwMDFcdTc1MzVcdTVGNzFcdTMwMDFcdTY1ODdcdTdBRTBcdTYyMTZcdTRFMTNcdThGOTFcdTVGMDBcdTU5Q0JcdTMwMDJcIiB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmVhZGluZ0l0ZW1zLnNsaWNlKDAsIDEwKS5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICBjb25zdCByb3cgPSBsaXN0LmNyZWF0ZUVsKFwibGlcIiwgeyBjbHM6IFwic2hlcmxvY2stbGlzdC1pdGVtXCIgfSk7XG4gICAgICBjb25zdCBjb3B5ID0gcm93LmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1saXN0LWNvcHlcIiB9KTtcbiAgICAgIGNvcHkuY3JlYXRlRWwoXCJzdHJvbmdcIiwgeyB0ZXh0OiBpdGVtLm5hbWUgfSk7XG4gICAgICBjb3B5LmNyZWF0ZUVsKFwic3BhblwiLCB7IGNsczogXCJzaGVybG9jay1tZXRhXCIsIHRleHQ6IFtpdGVtLm1lZGl1bSA/PyBcImNvbGxlY3Rpb25cIiwgaXRlbS5zdGF0dXMgPz8gXCJxdWV1ZWRcIl0uam9pbihcIiAvIFwiKSB9KTtcbiAgICAgIGNvbnN0IHNpZGUgPSByb3cuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWxpc3QtYWN0aW9uc1wiIH0pO1xuICAgICAgc2lkZS5jcmVhdGVFbChcInNwYW5cIiwgeyBjbHM6IFwic2hlcmxvY2stY2hpcCBjb21wYWN0XCIsIHRleHQ6IGl0ZW0ubWVkaXVtID8/IFwiaXRlbVwiIH0pO1xuICAgICAgY29uc3QgYXJjaGl2ZSA9IHNpZGUuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwic2hlcmxvY2stbWluaS1idXR0b25cIiwgdGV4dDogXCJcdTVGNTJcdTUxNjVcdThCQzFcdTcyNjlcdTY3RENcIiB9KTtcbiAgICAgIGNvbnN0IGVkaXQgPSBzaWRlLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1pbmktYnV0dG9uXCIsIHRleHQ6IFwiXHU4ODY1XHU3QjE0XHU4QkIwXCIgfSk7XG4gICAgICBjb25zdCByZW1vdmUgPSBzaWRlLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1pbmktYnV0dG9uIGRhbmdlclwiLCB0ZXh0OiBcIlx1NTIyMFx1OTY2NFwiIH0pO1xuICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KGFyY2hpdmUsIFwiY2xpY2tcIiwgYXN5bmMgKGV2ZW50OiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5hcmNoaXZlQ29sbGVjdGlvbkFzRXZpZGVuY2UoaXRlbS5maWxlUGF0aCk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChlZGl0LCBcImNsaWNrXCIsIGFzeW5jIChldmVudDogTW91c2VFdmVudCkgPT4ge1xuICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4ub3BlblBhdGgoaXRlbS5maWxlUGF0aCk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChyZW1vdmUsIFwiY2xpY2tcIiwgYXN5bmMgKGV2ZW50OiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5kZWxldGVQYXRoKGl0ZW0uZmlsZVBhdGgpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQocm93LCBcImNsaWNrXCIsIGFzeW5jICgpID0+IHRoaXMucGx1Z2luLm9wZW5QYXRoKGl0ZW0uZmlsZVBhdGgpKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyQXJjaGl2ZU1vZHVsZShjb250YWluZXI6IEhUTUxFbGVtZW50LCBkYXRhOiBTaGVybG9ja1dvcmtzcGFjZURhdGEpOiB2b2lkIHtcbiAgICBjb25zdCBjYXJkID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1wYW5lbCBzaGVybG9jay1jYXJkIHdpZGVcIiB9KTtcbiAgICBjb25zdCBoZWFkZXIgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1wYW5lbC1oZWFkaW5nXCIgfSk7XG4gICAgaGVhZGVyLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIlx1Njg2M1x1Njg0OFx1NjdEQ1wiIH0pO1xuICAgIGNvbnN0IGFkZEJ1dHRvbiA9IGhlYWRlci5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzaGVybG9jay1taW5pLWJ1dHRvblwiLCB0ZXh0OiBcIlx1NjVCMFx1NUVGQVx1OEJDMVx1NzI2OVwiIH0pO1xuICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChhZGRCdXR0b24sIFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4gdGhpcy5wbHVnaW4uY3JlYXRlRXZpZGVuY2VOb3RlKCkpO1xuICAgIGNvbnN0IGNhYmluZXQgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1hcmNoaXZlLWdyaWRcIiB9KTtcbiAgICB0aGlzLmNyZWF0ZUFyY2hpdmVTdGF0KGNhYmluZXQsIFwiTWFya2Rvd25cIiwgZGF0YS5ldmlkZW5jZS5maWx0ZXIoKGl0ZW0pID0+IGl0ZW0uZmlsZVBhdGguZW5kc1dpdGgoXCIubWRcIikpLmxlbmd0aCk7XG4gICAgdGhpcy5jcmVhdGVBcmNoaXZlU3RhdChjYWJpbmV0LCBcIlBERiAvIFx1NTZGRVx1NzI0N1wiLCB0aGlzLmNvdW50VmF1bHRGaWxlcyhbXCJwZGZcIiwgXCJwbmdcIiwgXCJqcGdcIiwgXCJqcGVnXCIsIFwid2VicFwiXSkpO1xuICAgIHRoaXMuY3JlYXRlQXJjaGl2ZVN0YXQoY2FiaW5ldCwgXCJcdTY4NDhcdTRFRjZcdTUxNzNcdTgwNTRcIiwgZGF0YS5ldmlkZW5jZS5maWx0ZXIoKGl0ZW0pID0+IGl0ZW0uY2FzZVBhdGgpLmxlbmd0aCk7XG4gICAgY2FyZC5jcmVhdGVFbChcInBcIiwge1xuICAgICAgY2xzOiBcInNoZXJsb2NrLW1pbmktY29weVwiLFxuICAgICAgdGV4dDogXCJcdThGRDlcdTkxQ0NcdTY2M0VcdTc5M0FcdTVERjJcdTdFQ0ZcdTZDODlcdTZEQzBcdThGREJcdThCQzFcdTcyNjlcdTY3RENcdTc2ODRcdTY3NjFcdTc2RUVcdUZGMUJcdTZCQ0ZcdTRFMDBcdTY3NjFcdTkwRkRcdTY2MkYgVmF1bHQgXHU0RTJEXHU3NzFGXHU1QjlFIE1hcmtkb3duIFx1NjU4N1x1NEVGNlx1RkYwQ1x1NTNFRlx1OTY4Rlx1NjVGNlx1N0VFN1x1N0VFRFx1N0YxNlx1OEY5MVx1NjIxNlx1NTIyMFx1OTY2NFx1MzAwMlwiXG4gICAgfSk7XG4gICAgY29uc3QgbGlzdCA9IGNhcmQuY3JlYXRlRWwoXCJ1bFwiLCB7IGNsczogXCJzaGVybG9jay1saXN0IHNoZXJsb2NrLWFyY2hpdmUtbGlzdFwiIH0pO1xuICAgIGlmIChkYXRhLmV2aWRlbmNlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgbGlzdC5jcmVhdGVFbChcImxpXCIsIHsgY2xzOiBcInNoZXJsb2NrLWVtcHR5XCIsIHRleHQ6IFwiXHU4QkMxXHU3MjY5XHU2N0RDXHU4RkQ4XHU2NjJGXHU3QTdBXHU3Njg0XHUzMDAyXHU1M0VGXHU0RUU1XHU0RUNFXHU4QkMxXHU3MjY5XHU3ODE0XHU4QkZCXHU0RTJEXHU1RjUyXHU2ODYzXHVGRjBDXHU0RTVGXHU1M0VGXHU0RUU1XHU3NkY0XHU2M0E1XHU2NUIwXHU1RUZBXHU4QkMxXHU3MjY5XHUzMDAyXCIgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGRhdGEuZXZpZGVuY2Uuc2xpY2UoMCwgMTApLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgIGNvbnN0IHJvdyA9IGxpc3QuY3JlYXRlRWwoXCJsaVwiLCB7IGNsczogXCJzaGVybG9jay1saXN0LWl0ZW1cIiB9KTtcbiAgICAgIGNvbnN0IGNvcHkgPSByb3cuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWxpc3QtY29weVwiIH0pO1xuICAgICAgY29weS5jcmVhdGVFbChcInN0cm9uZ1wiLCB7IHRleHQ6IGl0ZW0ubmFtZSB9KTtcbiAgICAgIGNvcHkuY3JlYXRlRWwoXCJzcGFuXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1ldGFcIiwgdGV4dDogW2l0ZW0uY2FzZSA/IGBcdTY4NDhcdTRFRjY6ICR7aXRlbS5jYXNlfWAgOiB1bmRlZmluZWQsIGl0ZW0uc291cmNlID8gYFx1Njc2NVx1NkU5MDogJHtpdGVtLnNvdXJjZX1gIDogdW5kZWZpbmVkXS5maWx0ZXIoQm9vbGVhbikuam9pbihcIiAvIFwiKSB8fCBpdGVtLmZpbGVQYXRoIH0pO1xuICAgICAgY29uc3Qgc2lkZSA9IHJvdy5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stbGlzdC1hY3Rpb25zXCIgfSk7XG4gICAgICBjb25zdCBlZGl0ID0gc2lkZS5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzaGVybG9jay1taW5pLWJ1dHRvblwiLCB0ZXh0OiBcIlx1N0YxNlx1OEY5MVwiIH0pO1xuICAgICAgY29uc3QgcmVtb3ZlID0gc2lkZS5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzaGVybG9jay1taW5pLWJ1dHRvbiBkYW5nZXJcIiwgdGV4dDogXCJcdTUyMjBcdTk2NjRcIiB9KTtcbiAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChlZGl0LCBcImNsaWNrXCIsIGFzeW5jIChldmVudDogTW91c2VFdmVudCkgPT4ge1xuICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4ub3BlblBhdGgoaXRlbS5maWxlUGF0aCk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChyZW1vdmUsIFwiY2xpY2tcIiwgYXN5bmMgKGV2ZW50OiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5kZWxldGVQYXRoKGl0ZW0uZmlsZVBhdGgpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQocm93LCBcImNsaWNrXCIsIGFzeW5jICgpID0+IHRoaXMucGx1Z2luLm9wZW5QYXRoKGl0ZW0uZmlsZVBhdGgpKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyRm9vdHByaW50TW9kdWxlKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIGRhdGE6IFNoZXJsb2NrV29ya3NwYWNlRGF0YSk6IHZvaWQge1xuICAgIGNvbnN0IGNhcmQgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWZvb3RwcmludC1wYW5lbFwiIH0pO1xuICAgIGNvbnN0IGhlYWRlciA9IGNhcmQuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLXBhbmVsLWhlYWRpbmdcIiB9KTtcbiAgICBoZWFkZXIuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiXHU4REIzXHU4RkY5XHU1NzMwXHU1NkZFXCIgfSk7XG4gICAgY29uc3QgaGludCA9IGhlYWRlci5jcmVhdGVFbChcInNwYW5cIiwgeyBjbHM6IFwic2hlcmxvY2stbWFwLWhpbnRcIiwgdGV4dDogXCJcdTcwQjlcdTUxRkJcdTU3MzBcdTU2RkVcdTRFRkJcdTYxMEZcdTRGNERcdTdGNkVcdTUyMUJcdTVFRkFcdThEQjNcdThGRjlcIiB9KTtcbiAgICBoaW50LnNldEF0dHJpYnV0ZShcImFyaWEtbGFiZWxcIiwgXCJcdTcwQjlcdTUxRkJcdTU3MzBcdTU2RkVcdTRFRkJcdTYxMEZcdTRGNERcdTdGNkVcdTUyMUJcdTVFRkFcdThEQjNcdThGRjlcIik7XG4gICAgY29uc3QgbWFwID0gY2FyZC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stZm9vdHByaW50LW1hcFwiIH0pO1xuICAgIG1hcC5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2UgPSBgbGluZWFyLWdyYWRpZW50KDE4MGRlZywgcmdiYSg0NywgMjUsIDksIDAuMSksIHJnYmEoNDcsIDI1LCA5LCAwLjIyKSksIHVybChcIiR7dGhpcy5wbHVnaW4uZ2V0V29ybGRNYXBJbWFnZVVybCgpfVwiKSwgbGluZWFyLWdyYWRpZW50KDEzNWRlZywgI2IzOGE1MiwgI2Q1Yjc3OCA0MiUsICM5YzZjMzUpYDtcblxuICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChtYXAsIFwiY2xpY2tcIiwgYXN5bmMgKGV2ZW50OiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICBpZiAoKGV2ZW50LnRhcmdldCBhcyBIVE1MRWxlbWVudCkuY2xvc2VzdChcIi5zaGVybG9jay1tYXAtcG9pbnRcIikpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgY29uZmlybWVkID0gd2luZG93LmNvbmZpcm0oXCJcdTY2MkZcdTU0MjZcdTc4NkVcdThCQTRcdTUyMUJcdTVFRkFcdThEQjNcdThGRjlcdUZGMUZcIik7XG4gICAgICBpZiAoIWNvbmZpcm1lZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCByZWN0ID0gbWFwLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgY29uc3QgeCA9ICgoZXZlbnQuY2xpZW50WCAtIHJlY3QubGVmdCkgLyByZWN0LndpZHRoKSAqIDEwMDtcbiAgICAgIGNvbnN0IHkgPSAoKGV2ZW50LmNsaWVudFkgLSByZWN0LnRvcCkgLyByZWN0LmhlaWdodCkgKiAxMDA7XG4gICAgICBhd2FpdCB0aGlzLnBsdWdpbi5jcmVhdGVQbGFjZUZyb21NYXBDbGljayh4LCB5KTtcbiAgICB9KTtcblxuICAgIGNvbnN0IHBsYWNlcyA9IGRhdGEucGxhY2VzXG4gICAgICAuZmlsdGVyKChwbGFjZSkgPT4gdHlwZW9mIHBsYWNlLmxhdGl0dWRlID09PSBcIm51bWJlclwiICYmIHR5cGVvZiBwbGFjZS5sb25naXR1ZGUgPT09IFwibnVtYmVyXCIpXG4gICAgICAuc2xpY2UoMCwgODApO1xuICAgIGlmIChwbGFjZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICBtYXAuY3JlYXRlRWwoXCJwXCIsIHsgY2xzOiBcInNoZXJsb2NrLWVtcHR5IHNoZXJsb2NrLW1hcC1lbXB0eVwiLCB0ZXh0OiBcIlx1OEZEOFx1NkNBMVx1NjcwOVx1OERCM1x1OEZGOVx1MzAwMlx1NzBCOVx1NTFGQlx1NTczMFx1NTZGRVx1NEVGQlx1NjEwRlx1NEY0RFx1N0Y2RVx1NTM3M1x1NTNFRlx1NTIxQlx1NUVGQVx1NTIzMFx1OEJCRlx1OEJCMFx1NUY1NVx1MzAwMlwiIH0pO1xuICAgIH1cbiAgICBwbGFjZXMuZm9yRWFjaCgocGxhY2UpID0+IHtcbiAgICAgIGNvbnN0IHBvc2l0aW9uID0gdGhpcy5yZXNvbHZlTWFwUG9pbnQocGxhY2UpO1xuICAgICAgY29uc3QgbGFiZWwgPSBbcGxhY2UuY2l0eSA/PyBwbGFjZS5uYW1lLCBwbGFjZS5jb3VudHJ5LCBwbGFjZS52aXNpdGVkQXRdLmZpbHRlcihCb29sZWFuKS5qb2luKFwiIC8gXCIpO1xuICAgICAgY29uc3QgcG9pbnQgPSBtYXAuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwic2hlcmxvY2stbWFwLXBvaW50XCIsIHRleHQ6IFwiXHUyNzEzXCIgfSk7XG4gICAgICBwb2ludC5zdHlsZS5sZWZ0ID0gYCR7cG9zaXRpb24ueC50b0ZpeGVkKDIpfSVgO1xuICAgICAgcG9pbnQuc3R5bGUudG9wID0gYCR7cG9zaXRpb24ueS50b0ZpeGVkKDIpfSVgO1xuICAgICAgcG9pbnQuc2V0QXR0cmlidXRlKFwiYXJpYS1sYWJlbFwiLCBsYWJlbCB8fCBwbGFjZS5uYW1lKTtcbiAgICAgIHBvaW50LnNldEF0dHJpYnV0ZShcInRpdGxlXCIsIFtwbGFjZS5jaXR5LCBwbGFjZS5jb3VudHJ5LCBwbGFjZS52aXNpdGVkQXRdLmZpbHRlcihCb29sZWFuKS5qb2luKFwiIC8gXCIpIHx8IHBsYWNlLm5hbWUpO1xuICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KHBvaW50LCBcImNsaWNrXCIsIGFzeW5jICgpID0+IHRoaXMucGx1Z2luLm9wZW5QYXRoKHBsYWNlLmZpbGVQYXRoKSk7XG4gICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQocG9pbnQsIFwiY29udGV4dG1lbnVcIiwgYXN5bmMgKGV2ZW50OiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmRlbGV0ZVBhdGgocGxhY2UuZmlsZVBhdGgpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckludmVzdGlnYXRpb25TY2hlZHVsZXIoY29udGFpbmVyOiBIVE1MRWxlbWVudCwgZGF0YTogU2hlcmxvY2tXb3Jrc3BhY2VEYXRhKTogdm9pZCB7XG4gICAgY29uc3QgY2FyZCA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stcGFuZWwgc2hlcmxvY2stY2FyZCBmdWxsXCIgfSk7XG4gICAgY2FyZC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJcdThDMDNcdTY3RTVcdTYzOTJcdTY3MUZcIiB9KTtcbiAgICBjYXJkLmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICBjbHM6IFwic2hlcmxvY2stc3VidGl0bGUgc2hlcmxvY2stbWluaS1jb3B5XCIsXG4gICAgICB0ZXh0OiBcIlx1NjJENlx1NTJBOFx1NURFNlx1NEZBN1x1NEVGQlx1NTJBMVx1NTIzMFx1NjVGNlx1OTVGNFx1NjgzQ1x1NTM3M1x1NTNFRlx1NjM5Mlx1NTE2NVx1NjcyQ1x1NTQ2OFx1OEMwM1x1NjdFNVx1RkYxQlx1NTNDQ1x1NTFGQlx1NEVGQlx1NjEwRlx1NjVGNlx1OTVGNFx1NjgzQ1x1NEYxQVx1NUZFQlx1OTAxRlx1NjVCMFx1NUVGQVx1NEUwMFx1Njc2MVx1NjVFNVx1N0EwQlx1ODg2OFx1OEJCMFx1NUY1NVx1MzAwMlx1NjM5Mlx1OEZEQlx1NTNCQlx1NTQwRVx1NTNFRlx1NEVFNVx1OTY4Rlx1NjVGNlx1NjI4QVx1NEVGQlx1NTJBMVx1NTc1N1x1NjUzRVx1OTU3Rlx1MzAwMVx1NjUzRVx1NzdFRFx1MzAwMlwiXG4gICAgfSk7XG5cbiAgICBjb25zdCBwbGFubmVyID0gY2FyZC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stcGxhbm5lclwiIH0pO1xuICAgIGNvbnN0IGJhY2tsb2cgPSBwbGFubmVyLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1wbGFubmVyLWJhY2tsb2dcIiB9KTtcbiAgICBiYWNrbG9nLmNyZWF0ZUVsKFwiaDRcIiwgeyB0ZXh0OiBcIlx1NUY4NVx1NUI4OVx1NjM5Mlx1NEVGQlx1NTJBMVwiIH0pO1xuXG4gICAgY29uc3QgYmFja2xvZ0xpc3QgPSBiYWNrbG9nLmNyZWF0ZUVsKFwidWxcIiwgeyBjbHM6IFwic2hlcmxvY2stbGlzdFwiIH0pO1xuICAgIGNvbnN0IGJhY2tsb2dUYXNrcyA9IGRhdGEudGFza3MuZmlsdGVyKChpdGVtKSA9PiBpdGVtLnN0YXR1cyAhPT0gXCJkb25lXCIpO1xuICAgIGlmIChiYWNrbG9nVGFza3MubGVuZ3RoID09PSAwKSB7XG4gICAgICBiYWNrbG9nTGlzdC5jcmVhdGVFbChcImxpXCIsIHsgY2xzOiBcInNoZXJsb2NrLWVtcHR5XCIsIHRleHQ6IFwiXHU2MjQwXHU2NzA5XHU0RThCXHU5ODc5XHU5MEZEXHU1OTA0XHU3NDA2XHU1QjhDXHU0RTg2XHVGRjBDXHU2MjE2XHU4MDA1XHU1MTQ4XHU2NUIwXHU1RUZBXHU0RTAwXHU2NzYxXHU0RUZCXHU1MkExXHUzMDAyXCIgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGJhY2tsb2dUYXNrcy5zbGljZSgwLCA4KS5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgIGNvbnN0IHJvdyA9IGJhY2tsb2dMaXN0LmNyZWF0ZUVsKFwibGlcIiwgeyBjbHM6IFwic2hlcmxvY2stbGlzdC1pdGVtIHNoZXJsb2NrLWRyYWdnYWJsZS10YXNrXCIgfSk7XG4gICAgICAgIHJvdy5zZXRBdHRyaWJ1dGUoXCJkcmFnZ2FibGVcIiwgXCJ0cnVlXCIpO1xuICAgICAgICByb3cuY3JlYXRlRWwoXCJzdHJvbmdcIiwgeyB0ZXh0OiBpdGVtLm5hbWUgfSk7XG4gICAgICAgIHJvdy5jcmVhdGVFbChcInNwYW5cIiwgeyBjbHM6IFwic2hlcmxvY2stbWV0YVwiLCB0ZXh0OiBpdGVtLnN0YXR1cyA9PT0gXCJzY2hlZHVsZWRcIiA/IFwiXHU1REYyXHU2MzkyXHU1MTY1XHU1NDY4XHU2NzdGXHVGRjBDXHU1M0VGXHU1MThEXHU2QjIxXHU2MkQ2XHU1MkE4XHU2NTM5XHU2ODYzXHU2NzFGXCIgOiBcIlx1NjJENlx1NTJBOFx1NTIzMFx1NTNGM1x1NEZBN1x1NjVGNlx1OTVGNFx1NjgzQ1wiIH0pO1xuICAgICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQocm93LCBcImRyYWdzdGFydFwiLCAoZXZlbnQ6IERyYWdFdmVudCkgPT4ge1xuICAgICAgICAgIGV2ZW50LmRhdGFUcmFuc2Zlcj8uc2V0RGF0YShcInRleHQvcGxhaW5cIiwgaXRlbS5maWxlUGF0aCk7XG4gICAgICAgICAgZXZlbnQuZGF0YVRyYW5zZmVyPy5zZXREYXRhKFwiYXBwbGljYXRpb24vc2hlcmxvY2stdGFza1wiLCBpdGVtLmZpbGVQYXRoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChyb3csIFwiZGJsY2xpY2tcIiwgYXN5bmMgKCkgPT4gdGhpcy5wbHVnaW4ub3BlblBhdGgoaXRlbS5maWxlUGF0aCkpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgYm9hcmQgPSBwbGFubmVyLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay13ZWVrLWJvYXJkXCIgfSk7XG4gICAgY29uc3QgaGVhZGVyID0gYm9hcmQuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLXdlZWstaGVhZGVyXCIgfSk7XG4gICAgaGVhZGVyLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1jb3JuZXItY2VsbFwiIH0pO1xuICAgIFdFRUtfREFZUy5mb3JFYWNoKChkYXkpID0+IHtcbiAgICAgIGNvbnN0IGRhdGUgPSB0aGlzLnJlc29sdmVXZWVrRGF0ZShkYXkub2Zmc2V0KTtcbiAgICAgIGNvbnN0IGNlbGwgPSBoZWFkZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWRheS1oZWFkZXJcIiB9KTtcbiAgICAgIGNlbGwuY3JlYXRlRWwoXCJzdHJvbmdcIiwgeyB0ZXh0OiBkYXkubGFiZWwgfSk7XG4gICAgICBjZWxsLmNyZWF0ZUVsKFwic3BhblwiLCB7IGNsczogXCJzaGVybG9jay1tZXRhXCIsIHRleHQ6IGRhdGUgfSk7XG4gICAgfSk7XG5cbiAgICBjb25zdCBzY2hlZHVsZUluZGV4ID0gdGhpcy5pbmRleFNjaGVkdWxlcyhkYXRhLnNjaGVkdWxlcyk7XG5cbiAgICBUSU1FX1NMT1RTLmZvckVhY2goKHNsb3QpID0+IHtcbiAgICAgIGNvbnN0IHJvdyA9IGJvYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay13ZWVrLXJvd1wiIH0pO1xuICAgICAgcm93LmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay10aW1lLWxhYmVsXCIsIHRleHQ6IHNsb3QgfSk7XG5cbiAgICAgIFdFRUtfREFZUy5mb3JFYWNoKChkYXkpID0+IHtcbiAgICAgICAgY29uc3QgZGF0ZSA9IHRoaXMucmVzb2x2ZVdlZWtEYXRlKGRheS5vZmZzZXQpO1xuICAgICAgICBjb25zdCBrZXkgPSBgJHtkYXRlfXwke3Nsb3R9YDtcbiAgICAgICAgY29uc3QgY2VsbCA9IHJvdy5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stZHJvcC1jZWxsXCIgfSk7XG4gICAgICAgIGNvbnN0IGVudHJpZXMgPSBzY2hlZHVsZUluZGV4LmdldChrZXkpID8/IFtdO1xuICAgICAgICBpZiAoZW50cmllcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgY2VsbC5hZGRDbGFzcyhcImhhcy1jb25mbGljdFwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChjZWxsLCBcImRyYWdvdmVyXCIsIChldmVudDogRHJhZ0V2ZW50KSA9PiB7XG4gICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBjZWxsLmFkZENsYXNzKFwiaXMtZHJhZ292ZXJcIik7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoY2VsbCwgXCJkcmFnbGVhdmVcIiwgKCkgPT4ge1xuICAgICAgICAgIGNlbGwucmVtb3ZlQ2xhc3MoXCJpcy1kcmFnb3ZlclwiKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChjZWxsLCBcImRyb3BcIiwgYXN5bmMgKGV2ZW50OiBEcmFnRXZlbnQpID0+IHtcbiAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIGNlbGwucmVtb3ZlQ2xhc3MoXCJpcy1kcmFnb3ZlclwiKTtcbiAgICAgICAgICBjb25zdCBzY2hlZHVsZVBhdGggPSBldmVudC5kYXRhVHJhbnNmZXI/LmdldERhdGEoXCJhcHBsaWNhdGlvbi9zaGVybG9jay1zY2hlZHVsZVwiKTtcbiAgICAgICAgICBpZiAoc2NoZWR1bGVQYXRoKSB7XG4gICAgICAgICAgICBjb25zdCBzY2hlZHVsZSA9IGRhdGEuc2NoZWR1bGVzLmZpbmQoKGl0ZW0pID0+IGl0ZW0uZmlsZVBhdGggPT09IHNjaGVkdWxlUGF0aCk7XG4gICAgICAgICAgICBjb25zdCBkdXJhdGlvbiA9IHNjaGVkdWxlPy5kdXJhdGlvbk1pbnV0ZXMgPz8gdGhpcy5yZXNvbHZlU2NoZWR1bGVEdXJhdGlvbih1bmRlZmluZWQpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4ubW92ZVNjaGVkdWxlRW50cnkoc2NoZWR1bGVQYXRoLCBkYXRlLCBzbG90LCB0aGlzLnJlc29sdmVTY2hlZHVsZUVuZChzbG90LCBkdXJhdGlvbikpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCB0YXNrUGF0aCA9XG4gICAgICAgICAgICBldmVudC5kYXRhVHJhbnNmZXI/LmdldERhdGEoXCJhcHBsaWNhdGlvbi9zaGVybG9jay10YXNrXCIpIHx8XG4gICAgICAgICAgICBldmVudC5kYXRhVHJhbnNmZXI/LmdldERhdGEoXCJ0ZXh0L3BsYWluXCIpO1xuICAgICAgICAgIGlmICghdGFza1BhdGgpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2NoZWR1bGVUYXNrRnJvbURhc2hib2FyZCh0YXNrUGF0aCwgZGF0ZSwgc2xvdCwgdGhpcy5yZXNvbHZlU2NoZWR1bGVFbmQoc2xvdCwgREVGQVVMVF9TQ0hFRFVMRV9EVVJBVElPTl9NSU5VVEVTKSk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoY2VsbCwgXCJkYmxjbGlja1wiLCBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uY3JlYXRlUXVpY2tTY2hlZHVsZShkYXRlLCBzbG90LCB0aGlzLnJlc29sdmVTY2hlZHVsZUVuZChzbG90LCBERUZBVUxUX1NDSEVEVUxFX0RVUkFUSU9OX01JTlVURVMpKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKGVudHJpZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgY2VsbC5jcmVhdGVFbChcInNwYW5cIiwgeyBjbHM6IFwic2hlcmxvY2stc2xvdC1oaW50XCIsIHRleHQ6IFwiRG91YmxlLWNsaWNrIG9yIGRyb3AgdGFza1wiIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChlbnRyaWVzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIGNvbnN0IGNvbmZsaWN0QmFyID0gY2VsbC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stY29uZmxpY3QtYmFyXCIgfSk7XG4gICAgICAgICAgICBjb25zdCB3YXJuaW5nID0gY29uZmxpY3RCYXIuY3JlYXRlRWwoXCJzcGFuXCIsIHtcbiAgICAgICAgICAgICAgY2xzOiBcInNoZXJsb2NrLWNvbmZsaWN0LWhpbnRcIixcbiAgICAgICAgICAgICAgdGV4dDogYCR7ZW50cmllcy5sZW5ndGh9IGl0ZW1zIG92ZXJsYXBgXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHdhcm5pbmcuc2V0QXR0cmlidXRlKFwidGl0bGVcIiwgXCJcdThGRDlcdTRFMkFcdTY1RjZcdTk1RjRcdTY4M0NcdTY3MDlcdTU5MUFcdTY3NjFcdTVCODlcdTYzOTJcdUZGMENcdTRFMEJcdTRFMDBcdTZCNjVcdTUzRUZcdTRFRTVcdTUyQTBcdTUxNjVcdTUxQjJcdTdBODFcdTg5RTNcdTUxQjNcdTkwM0JcdThGOTFcdTMwMDJcIik7XG4gICAgICAgICAgICBjb25zdCByZXNvbHZlQnV0dG9uID0gY29uZmxpY3RCYXIuY3JlYXRlRWwoXCJidXR0b25cIiwge1xuICAgICAgICAgICAgICBjbHM6IFwic2hlcmxvY2stbWluaS1idXR0b25cIixcbiAgICAgICAgICAgICAgdGV4dDogXCJcdTk4N0FcdTVFRjZcdTRFMDBcdTY3NjFcIlxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQocmVzb2x2ZUJ1dHRvbiwgXCJjbGlja1wiLCBhc3luYyAoZXZlbnQ6IE1vdXNlRXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgIGNvbnN0IG1vdmFibGUgPSBlbnRyaWVzW2VudHJpZXMubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLm1vdmVTY2hlZHVsZVRvTmV4dEZyZWVTbG90KG1vdmFibGUuZmlsZVBhdGgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVudHJpZXMuZm9yRWFjaCgoZW50cnkpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHBpbGwgPSBjZWxsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1zY2hlZHVsZS1waWxsXCIgfSk7XG4gICAgICAgICAgICBwaWxsLnNldEF0dHJpYnV0ZShcImRyYWdnYWJsZVwiLCBcInRydWVcIik7XG4gICAgICAgICAgICBwaWxsLnN0eWxlLm1pbkhlaWdodCA9IGAke3RoaXMucmVzb2x2ZVNjaGVkdWxlUGlsbEhlaWdodChlbnRyeS5kdXJhdGlvbk1pbnV0ZXMpfXB4YDtcbiAgICAgICAgICAgIGNvbnN0IHRvcCA9IHBpbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLXBpbGwtdG9wXCIgfSk7XG4gICAgICAgICAgICB0b3AuY3JlYXRlRWwoXCJzdHJvbmdcIiwgeyB0ZXh0OiBlbnRyeS5yZWxhdGVkVGFzayA/PyBlbnRyeS5uYW1lIH0pO1xuICAgICAgICAgICAgY29uc3QgY29udHJvbHMgPSB0b3AuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLXBpbGwtY29udHJvbHNcIiB9KTtcbiAgICAgICAgICAgIGNvbnN0IHNocmlua0J1dHRvbiA9IGNvbnRyb2xzLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1pbmktYnV0dG9uXCIsIHRleHQ6IFwiLTMwbVwiIH0pO1xuICAgICAgICAgICAgY29uc3QgZXh0ZW5kQnV0dG9uID0gY29udHJvbHMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwic2hlcmxvY2stbWluaS1idXR0b25cIiwgdGV4dDogXCIrMzBtXCIgfSk7XG4gICAgICAgICAgICBjb25zdCBkZWxldGVCdXR0b24gPSBjb250cm9scy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzaGVybG9jay1taW5pLWJ1dHRvbiBkYW5nZXJcIiwgdGV4dDogXCJcdTUyMjBcdTk2NjRcIiB9KTtcbiAgICAgICAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChzaHJpbmtCdXR0b24sIFwiY2xpY2tcIiwgYXN5bmMgKGV2ZW50OiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5hZGp1c3RTY2hlZHVsZUR1cmF0aW9uKGVudHJ5LmZpbGVQYXRoLCAtMzApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoZXh0ZW5kQnV0dG9uLCBcImNsaWNrXCIsIGFzeW5jIChldmVudDogTW91c2VFdmVudCkgPT4ge1xuICAgICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uYWRqdXN0U2NoZWR1bGVEdXJhdGlvbihlbnRyeS5maWxlUGF0aCwgMzApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoZGVsZXRlQnV0dG9uLCBcImNsaWNrXCIsIGFzeW5jIChldmVudDogTW91c2VFdmVudCkgPT4ge1xuICAgICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uZGVsZXRlUGF0aChlbnRyeS5maWxlUGF0aCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHBpbGwuY3JlYXRlRWwoXCJzcGFuXCIsIHtcbiAgICAgICAgICAgICAgY2xzOiBcInNoZXJsb2NrLW1ldGFcIixcbiAgICAgICAgICAgICAgdGV4dDogYCR7ZW50cnkuc3RhcnQgPz8gc2xvdH0tJHtlbnRyeS5lbmQgPz8gdGhpcy5yZXNvbHZlU2NoZWR1bGVFbmQoc2xvdCwgdGhpcy5yZXNvbHZlU2NoZWR1bGVEdXJhdGlvbihlbnRyeS5kdXJhdGlvbk1pbnV0ZXMpKX0ke2VudHJ5LmR1cmF0aW9uTWludXRlcyA/IGAgLyAke2VudHJ5LmR1cmF0aW9uTWludXRlc31tYCA6IFwiXCJ9YFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoZW50cnkucmVsYXRlZFRhc2tQYXRoKSB7XG4gICAgICAgICAgICAgIHBpbGwuY3JlYXRlRWwoXCJzcGFuXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1ldGFcIiwgdGV4dDogXCJMaW5rZWQgdGFza1wiIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KHBpbGwsIFwiZHJhZ3N0YXJ0XCIsIChldmVudDogRHJhZ0V2ZW50KSA9PiB7XG4gICAgICAgICAgICAgIGV2ZW50LmRhdGFUcmFuc2Zlcj8uc2V0RGF0YShcImFwcGxpY2F0aW9uL3NoZXJsb2NrLXNjaGVkdWxlXCIsIGVudHJ5LmZpbGVQYXRoKTtcbiAgICAgICAgICAgICAgZXZlbnQuZGF0YVRyYW5zZmVyPy5zZXREYXRhKFwidGV4dC9wbGFpblwiLCBlbnRyeS5maWxlUGF0aCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChwaWxsLCBcImNsaWNrXCIsIGFzeW5jICgpID0+IHRoaXMucGx1Z2luLm9wZW5QYXRoKGVudHJ5LmZpbGVQYXRoKSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVNZXRyaWMoY29udGFpbmVyOiBIVE1MRWxlbWVudCwgbGFiZWw6IHN0cmluZywgdmFsdWU6IHN0cmluZyk6IHZvaWQge1xuICAgIGNvbnN0IG1ldHJpYyA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stbWV0cmljXCIgfSk7XG4gICAgbWV0cmljLmNyZWF0ZUVsKFwiZGl2XCIsIHsgY2xzOiBcInNoZXJsb2NrLW1ldHJpYy1sYWJlbFwiLCB0ZXh0OiBsYWJlbCB9KTtcbiAgICBtZXRyaWMuY3JlYXRlRWwoXCJkaXZcIiwgeyBjbHM6IFwic2hlcmxvY2stbWV0cmljLXZhbHVlXCIsIHRleHQ6IHZhbHVlIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVBcmNoaXZlU3RhdChjb250YWluZXI6IEhUTUxFbGVtZW50LCBsYWJlbDogc3RyaW5nLCB2YWx1ZTogbnVtYmVyKTogdm9pZCB7XG4gICAgY29uc3Qgc3RhdCA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stYXJjaGl2ZS1zdGF0XCIgfSk7XG4gICAgc3RhdC5jcmVhdGVFbChcInN0cm9uZ1wiLCB7IHRleHQ6IFN0cmluZyh2YWx1ZSkgfSk7XG4gICAgc3RhdC5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiBsYWJlbCB9KTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlQWN0aW9uKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIGxhYmVsOiBzdHJpbmcsIG9uQ2xpY2s6ICgpID0+IFByb21pc2U8dW5rbm93bj4sIHNlY29uZGFyeSA9IGZhbHNlKTogdm9pZCB7XG4gICAgY29uc3QgYnV0dG9uID0gY29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBgc2hlcmxvY2stYnV0dG9uJHtzZWNvbmRhcnkgPyBcIiBzZWNvbmRhcnlcIiA6IFwiXCJ9YCwgdGV4dDogbGFiZWwgfSk7XG4gICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KGJ1dHRvbiwgXCJjbGlja1wiLCBhc3luYyAoKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBvbkNsaWNrKCk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgICAgICAgbmV3IE5vdGljZShgU2hlcmxvY2sgT1MgXHU2NENEXHU0RjVDXHU1OTMxXHU4RDI1OiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogXCJcdTY3MkFcdTc3RTVcdTk1MTlcdThCRUZcIn1gKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVzb2x2ZVdlZWtEYXRlKG9mZnNldDogbnVtYmVyKTogc3RyaW5nIHtcbiAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xuICAgIGNvbnN0IGRheSA9IG5vdy5nZXREYXkoKTtcbiAgICBjb25zdCBtb25kYXlEZWx0YSA9IGRheSA9PT0gMCA/IC02IDogMSAtIGRheTtcbiAgICBjb25zdCB0YXJnZXQgPSBuZXcgRGF0ZShub3cpO1xuICAgIHRhcmdldC5zZXREYXRlKG5vdy5nZXREYXRlKCkgKyBtb25kYXlEZWx0YSArIG9mZnNldCk7XG4gICAgcmV0dXJuIHRoaXMuZm9ybWF0TG9jYWxEYXRlKHRhcmdldCk7XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVTY2hlZHVsZUR1cmF0aW9uKGR1cmF0aW9uTWludXRlcz86IG51bWJlcik6IG51bWJlciB7XG4gICAgcmV0dXJuIE1hdGgubWF4KDMwLCBNYXRoLm1pbigyNDAsIGR1cmF0aW9uTWludXRlcyA/PyBERUZBVUxUX1NDSEVEVUxFX0RVUkFUSU9OX01JTlVURVMpKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVzb2x2ZVNjaGVkdWxlRW5kKHN0YXJ0OiBzdHJpbmcsIGR1cmF0aW9uTWludXRlcz86IG51bWJlcik6IHN0cmluZyB7XG4gICAgY29uc3QgZHVyYXRpb24gPSB0aGlzLnJlc29sdmVTY2hlZHVsZUR1cmF0aW9uKGR1cmF0aW9uTWludXRlcyk7XG4gICAgY29uc3QgW2hvdXIsIG1pbnV0ZV0gPSBzdGFydC5zcGxpdChcIjpcIikubWFwKE51bWJlcik7XG4gICAgY29uc3QgZW5kTWludXRlcyA9IE1hdGgubWluKGhvdXIgKiA2MCArIG1pbnV0ZSArIGR1cmF0aW9uLCAyMyAqIDYwICsgMzApO1xuICAgIGNvbnN0IGVuZEhvdXIgPSBNYXRoLmZsb29yKGVuZE1pbnV0ZXMgLyA2MCk7XG4gICAgY29uc3QgZW5kTWludXRlID0gZW5kTWludXRlcyAlIDYwO1xuICAgIHJldHVybiBgJHtTdHJpbmcoZW5kSG91cikucGFkU3RhcnQoMiwgXCIwXCIpfToke1N0cmluZyhlbmRNaW51dGUpLnBhZFN0YXJ0KDIsIFwiMFwiKX1gO1xuICB9XG5cbiAgcHJpdmF0ZSByZXNvbHZlU2NoZWR1bGVQaWxsSGVpZ2h0KGR1cmF0aW9uTWludXRlcz86IG51bWJlcik6IG51bWJlciB7XG4gICAgY29uc3Qgc3RlcHMgPSB0aGlzLnJlc29sdmVTY2hlZHVsZUR1cmF0aW9uKGR1cmF0aW9uTWludXRlcykgLyAzMDtcbiAgICByZXR1cm4gNDQgKyBzdGVwcyAqIDI2O1xuICB9XG5cbiAgcHJpdmF0ZSByZXNvbHZlTWFwUG9pbnQocGxhY2U6IFNoZXJsb2NrUGxhY2UpOiB7IHg6IG51bWJlcjsgeTogbnVtYmVyIH0ge1xuICAgIGNvbnN0IGxhdGl0dWRlID0gcGxhY2UubGF0aXR1ZGUgPz8gMDtcbiAgICBjb25zdCBsb25naXR1ZGUgPSBwbGFjZS5sb25naXR1ZGUgPz8gTUFQX0NFTlRFUl9MT05HSVRVREU7XG4gICAgLy8gQmFjay1lbmQgcHJvamVjdGlvbiBjb250cmFjdDogc2lnbmVkIGxvbmdpdHVkZSB1c2VzIGVhc3QgcG9zaXRpdmUgYW5kIHdlc3QgbmVnYXRpdmU7XG4gICAgLy8gc2lnbmVkIGxhdGl0dWRlIHVzZXMgbm9ydGggcG9zaXRpdmUgYW5kIHNvdXRoIG5lZ2F0aXZlLiBUaGUgbWFwIGlzIGNlbnRlcmVkIG9uIENoaW5hLlxuICAgIGNvbnN0IHdyYXBwZWRMb25naXR1ZGUgPSAoKGxvbmdpdHVkZSAtIE1BUF9DRU5URVJfTE9OR0lUVURFICsgNTQwKSAlIDM2MCkgLSAxODA7XG4gICAgY29uc3QgeCA9ICgod3JhcHBlZExvbmdpdHVkZSArIDE4MCkgLyAzNjApICogMTAwO1xuICAgIGNvbnN0IHkgPSAoKDkwIC0gbGF0aXR1ZGUpIC8gMTgwKSAqIDEwMDtcbiAgICByZXR1cm4ge1xuICAgICAgeDogTWF0aC5tYXgoNCwgTWF0aC5taW4oOTYsIHgpKSxcbiAgICAgIHk6IE1hdGgubWF4KDgsIE1hdGgubWluKDkyLCB5KSlcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBpbmRleFNjaGVkdWxlcyhpdGVtczogU2hlcmxvY2tTY2hlZHVsZVtdKTogTWFwPHN0cmluZywgU2hlcmxvY2tTY2hlZHVsZVtdPiB7XG4gICAgY29uc3QgaW5kZXggPSBuZXcgTWFwPHN0cmluZywgU2hlcmxvY2tTY2hlZHVsZVtdPigpO1xuICAgIGl0ZW1zLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgIGlmICghaXRlbS5kYXkgfHwgIWl0ZW0uc3RhcnQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3Qga2V5ID0gYCR7aXRlbS5kYXl9fCR7aXRlbS5zdGFydH1gO1xuICAgICAgY29uc3QgZXhpc3RpbmcgPSBpbmRleC5nZXQoa2V5KSA/PyBbXTtcbiAgICAgIGV4aXN0aW5nLnB1c2goaXRlbSk7XG4gICAgICBpbmRleC5zZXQoa2V5LCBleGlzdGluZyk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGluZGV4O1xuICB9XG5cbiAgcHJpdmF0ZSBwbHVnaW5UYXNrQ291bnQoY2FzZVBhdGg6IHN0cmluZyk6IG51bWJlciB7XG4gICAgY29uc3QgcGx1Z2luID0gdGhpcy5wbHVnaW47XG4gICAgY29uc3QgY2FjaGVkID0gKHBsdWdpbiBhcyBTaGVybG9ja09TUGx1Z2luICYge1xuICAgICAgbGF0ZXN0V29ya3NwYWNlRGF0YT86IFNoZXJsb2NrV29ya3NwYWNlRGF0YTtcbiAgICB9KS5sYXRlc3RXb3Jrc3BhY2VEYXRhO1xuICAgIGlmICghY2FjaGVkKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgcmV0dXJuIGNhY2hlZC50YXNrcy5maWx0ZXIoKHRhc2spID0+IHRhc2suY2FzZVBhdGggPT09IGNhc2VQYXRoKS5sZW5ndGg7XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVDYXNlUHJvZ3Jlc3MoY2FzZVBhdGg6IHN0cmluZyk6IG51bWJlciB7XG4gICAgY29uc3QgY2FjaGVkID0gKHRoaXMucGx1Z2luIGFzIFNoZXJsb2NrT1NQbHVnaW4gJiB7XG4gICAgICBsYXRlc3RXb3Jrc3BhY2VEYXRhPzogU2hlcmxvY2tXb3Jrc3BhY2VEYXRhO1xuICAgIH0pLmxhdGVzdFdvcmtzcGFjZURhdGE7XG4gICAgaWYgKCFjYWNoZWQpIHtcbiAgICAgIHJldHVybiA2O1xuICAgIH1cbiAgICBjb25zdCBsaW5rZWQgPSBjYWNoZWQudGFza3MuZmlsdGVyKCh0YXNrKSA9PiB0YXNrLmNhc2VQYXRoID09PSBjYXNlUGF0aCk7XG4gICAgaWYgKGxpbmtlZC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiA2O1xuICAgIH1cbiAgICBjb25zdCBkb25lID0gbGlua2VkLmZpbHRlcigodGFzaykgPT4gdGFzay5zdGF0dXMgPT09IFwiZG9uZVwiKS5sZW5ndGg7XG4gICAgcmV0dXJuIE1hdGgubWF4KDEyLCBNYXRoLnJvdW5kKChkb25lIC8gbGlua2VkLmxlbmd0aCkgKiAxMDApKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyUHJpb3JpdHlMYWJlbChwcmlvcml0eT86IFwibG93XCIgfCBcIm1lZGl1bVwiIHwgXCJoaWdoXCIpOiBzdHJpbmcge1xuICAgIGlmIChwcmlvcml0eSA9PT0gXCJoaWdoXCIpIHtcbiAgICAgIHJldHVybiBcIkhcIjtcbiAgICB9XG4gICAgaWYgKHByaW9yaXR5ID09PSBcImxvd1wiKSB7XG4gICAgICByZXR1cm4gXCJMXCI7XG4gICAgfVxuICAgIHJldHVybiBcIk1cIjtcbiAgfVxuXG4gIHByaXZhdGUgY291bnRWYXVsdEZpbGVzKGV4dGVuc2lvbnM6IHN0cmluZ1tdKTogbnVtYmVyIHtcbiAgICBjb25zdCBub3JtYWxpemVkID0gbmV3IFNldChleHRlbnNpb25zLm1hcCgoaXRlbSkgPT4gaXRlbS50b0xvd2VyQ2FzZSgpKSk7XG4gICAgcmV0dXJuIHRoaXMuYXBwLnZhdWx0LmdldEZpbGVzKCkuZmlsdGVyKChmaWxlKSA9PiBub3JtYWxpemVkLmhhcyhmaWxlLmV4dGVuc2lvbi50b0xvd2VyQ2FzZSgpKSkubGVuZ3RoO1xuICB9XG5cbiAgcHJpdmF0ZSBmb3JtYXRMb2NhbERhdGUoZGF0ZTogRGF0ZSk6IHN0cmluZyB7XG4gICAgY29uc3QgeWVhciA9IGRhdGUuZ2V0RnVsbFllYXIoKTtcbiAgICBjb25zdCBtb250aCA9IFN0cmluZyhkYXRlLmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCBcIjBcIik7XG4gICAgY29uc3QgZGF5ID0gU3RyaW5nKGRhdGUuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCBcIjBcIik7XG4gICAgcmV0dXJuIGAke3llYXJ9LSR7bW9udGh9LSR7ZGF5fWA7XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVQZXJpb2QoKTogXCJkYXlcIiB8IFwibmlnaHRcIiB7XG4gICAgY29uc3QgaG91ciA9IG5ldyBEYXRlKCkuZ2V0SG91cnMoKTtcbiAgICByZXR1cm4gaG91ciA+PSA3ICYmIGhvdXIgPCAxOCA/IFwiZGF5XCIgOiBcIm5pZ2h0XCI7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZVBhcmxvckJhY2tkcm9wKHNoZWxsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnN0IGJhY2tkcm9wID0gc2hlbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLXBhcmxvci1iYWNrZHJvcFwiIH0pO1xuICAgIGJhY2tkcm9wLnN0eWxlLmJhY2tncm91bmRJbWFnZSA9IGB1cmwoXCIke3RoaXMucGx1Z2luLmdldFBhcmxvckltYWdlVXJsKCl9XCIpYDtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyRmFsbGJhY2soZXJyb3I6IHVua25vd24pOiB2b2lkIHtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIHRoaXMuY29udGVudEVsLmFkZENsYXNzKFwic2hlcmxvY2stb3Mtdmlld1wiKTtcbiAgICBjb25zdCBwYW5lbCA9IHRoaXMuY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1wYW5lbFwiIH0pO1xuICAgIHBhbmVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIlNoZXJsb2NrIE9TIFx1NjY4Mlx1NjVGNlx1NjcyQVx1ODBGRFx1NkUzMlx1NjdEM1wiIH0pO1xuICAgIHBhbmVsLmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICB0ZXh0OiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFwiVW5rbm93biByZW5kZXIgZXJyb3JcIlxuICAgIH0pO1xuICAgIHBhbmVsLmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICB0ZXh0OiBcIlx1OEMwM1x1OEJENVx1NjVFNVx1NUZEN1x1NURGMlx1NTE5OVx1NTE2NSAvdG1wL3NoZXJsb2NrLW9zLWRlYnVnLmxvZ1wiXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGZpbmRDYXNlRXZpZGVuY2UoY3VycmVudENhc2U6IFNoZXJsb2NrQ2FzZSk6IFNoZXJsb2NrRXZpZGVuY2VJdGVtW10ge1xuICAgIGNvbnN0IGV2aWRlbmNlUm9vdCA9IGAke3RoaXMucGx1Z2luLnNldHRpbmdzLmV2aWRlbmNlRm9sZGVyLnJlcGxhY2UoL1xcLyQvLCBcIlwiKX0vYDtcbiAgICBjb25zdCBjYXNlVG9rZW5zID0gW1xuICAgICAgY3VycmVudENhc2UubmFtZSxcbiAgICAgIGN1cnJlbnRDYXNlLmZpbGVQYXRoLFxuICAgICAgY3VycmVudENhc2UuZmlsZVBhdGguc3BsaXQoXCIvXCIpLnBvcCgpPy5yZXBsYWNlKC9cXC5tZCQvaSwgXCJcIilcbiAgICBdXG4gICAgICAuZmlsdGVyKCh2YWx1ZSk6IHZhbHVlIGlzIHN0cmluZyA9PiBCb29sZWFuKHZhbHVlKSlcbiAgICAgIC5tYXAoKHZhbHVlKSA9PiB0aGlzLm5vcm1hbGl6ZUV2aWRlbmNlVG9rZW4odmFsdWUpKTtcblxuICAgIHJldHVybiB0aGlzLmFwcC52YXVsdC5nZXRGaWxlcygpXG4gICAgICAuZmlsdGVyKChmaWxlKSA9PiBmaWxlLnBhdGguc3RhcnRzV2l0aChldmlkZW5jZVJvb3QpKVxuICAgICAgLmZpbHRlcigoZmlsZSkgPT4ge1xuICAgICAgICBjb25zdCBjYWNoZSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpO1xuICAgICAgICBjb25zdCBmcm9udG1hdHRlciA9IGNhY2hlPy5mcm9udG1hdHRlcjtcbiAgICAgICAgaWYgKGZyb250bWF0dGVyPy5jYXNlUGF0aCA9PT0gY3VycmVudENhc2UuZmlsZVBhdGggfHwgZnJvbnRtYXR0ZXI/LmNhc2UgPT09IGN1cnJlbnRDYXNlLm5hbWUpIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBub3JtYWxpemVkUGF0aCA9IHRoaXMubm9ybWFsaXplRXZpZGVuY2VUb2tlbihmaWxlLnBhdGgpO1xuICAgICAgICByZXR1cm4gY2FzZVRva2Vucy5zb21lKCh0b2tlbikgPT4gdG9rZW4ubGVuZ3RoID4gMCAmJiBub3JtYWxpemVkUGF0aC5pbmNsdWRlcyh0b2tlbikpO1xuICAgICAgfSlcbiAgICAgIC5tYXAoKGZpbGUpID0+ICh7IGZpbGUsIGtpbmQ6IHRoaXMucmVzb2x2ZUV2aWRlbmNlS2luZChmaWxlLmV4dGVuc2lvbikgfSkpXG4gICAgICAuc29ydCgoYSwgYikgPT4gYS5maWxlLmJhc2VuYW1lLmxvY2FsZUNvbXBhcmUoYi5maWxlLmJhc2VuYW1lKSk7XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVFdmlkZW5jZUtpbmQoZXh0ZW5zaW9uOiBzdHJpbmcpOiBTaGVybG9ja0V2aWRlbmNlS2luZCB7XG4gICAgY29uc3QgZXh0ID0gZXh0ZW5zaW9uLnRvTG93ZXJDYXNlKCk7XG4gICAgaWYgKGV4dCA9PT0gXCJtZFwiKSB7XG4gICAgICByZXR1cm4gXCJtYXJrZG93blwiO1xuICAgIH1cbiAgICBpZiAoZXh0ID09PSBcInBkZlwiKSB7XG4gICAgICByZXR1cm4gXCJwZGZcIjtcbiAgICB9XG4gICAgaWYgKFtcInBuZ1wiLCBcImpwZ1wiLCBcImpwZWdcIiwgXCJnaWZcIiwgXCJ3ZWJwXCIsIFwic3ZnXCJdLmluY2x1ZGVzKGV4dCkpIHtcbiAgICAgIHJldHVybiBcImltYWdlXCI7XG4gICAgfVxuICAgIHJldHVybiBcImxvY2FsXCI7XG4gIH1cblxuICBwcml2YXRlIG5vcm1hbGl6ZUV2aWRlbmNlVG9rZW4odmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHZhbHVlLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvW1xccy9fXFxcXC4tXSsvZywgXCJcIik7XG4gIH1cbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtB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QUFVLE9BQU8sS0FBSztBQUNwRixXQUFLLFNBQVMsb0JBQW9CLE9BQU8sRUFBRTtBQUFBLElBQzdDO0FBQUEsRUFDRjtBQUFBLEVBRUEsTUFBYyxvQkFBbUM7QUFDL0MsVUFBTSxLQUFLLG1CQUFtQix1QkFBdUIsY0FBYztBQUFBLEVBQ3JFO0FBQUEsRUFFQSxNQUFjLHNCQUFxQztBQUNqRCxVQUFNLEtBQUssbUJBQW1CLDBCQUEwQixpQkFBaUI7QUFBQSxFQUMzRTtBQUFBLEVBRUEsTUFBYyxtQkFBbUIsVUFBa0IsV0FBa0M7QUFDbkYsVUFBTSxVQUFVLEtBQUssSUFBSSxNQUFNO0FBQy9CLFFBQUksQ0FBQyxLQUFLLElBQUksTUFBTSxzQkFBc0Isb0JBQW9CLEdBQUc7QUFDL0QsVUFBSTtBQUNGLGNBQU0sS0FBSyxJQUFJLE1BQU0sYUFBYSxvQkFBb0I7QUFBQSxNQUN4RCxTQUFTLE9BQU87QUFDZCxjQUFNLFVBQVUsaUJBQWlCLFFBQVEsTUFBTSxVQUFVLE9BQU8sS0FBSztBQUNyRSxZQUFJLENBQUMsUUFBUSxTQUFTLHVCQUF1QixHQUFHO0FBQzlDLGdCQUFNO0FBQUEsUUFDUjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBRUEsVUFBTSxhQUFhLHNCQUFzQixRQUFRO0FBRWpELFFBQUk7QUFDRixZQUFNLG9CQUFvQjtBQUMxQixZQUFNLFdBQVcsa0JBQWtCLGNBQWM7QUFDakQsVUFBSSxDQUFDLFVBQVU7QUFDYixhQUFLLFNBQVMsR0FBRyxTQUFTLG9CQUFvQjtBQUM5QztBQUFBLE1BQ0Y7QUFFQSxZQUFNLHNCQUFrQjtBQUFBLFFBQ3RCO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBLEtBQUssU0FBUztBQUFBLFFBQ2Q7QUFBQSxRQUNBO0FBQUEsTUFDRjtBQUNBLFlBQU0sYUFBUyx3QkFBYSxlQUFlO0FBQzNDLFlBQU0sT0FBTyxPQUFPLE9BQU8sTUFBTSxPQUFPLFlBQVksT0FBTyxhQUFhLE9BQU8sVUFBVTtBQUN6RixZQUFNLFFBQVEsWUFBWSxZQUFZLElBQUk7QUFBQSxJQUM1QyxTQUFTLE9BQU87QUFDZCxZQUFNLFVBQVUsaUJBQWlCLFFBQVEsTUFBTSxTQUFTLE1BQU0sVUFBVSxPQUFPLEtBQUs7QUFDcEYsV0FBSyxTQUFTLEdBQUcsU0FBUyxTQUFTLE9BQU8sRUFBRTtBQUFBLElBQzlDO0FBQUEsRUFDRjtBQUNGOyIsCiAgIm5hbWVzIjogWyJpbXBvcnRfb2JzaWRpYW4iLCAiaW1wb3J0X29ic2lkaWFuIiwgImltcG9ydF9vYnNpZGlhbiIsICJzaGVsbCIsICJpdGVtIl0KfQo=
