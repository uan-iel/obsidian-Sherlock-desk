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
      const preview = map.createEl("button", { cls: "sherlock-map-point sherlock-map-point-preview", text: "\u2713" });
      preview.style.left = `${x.toFixed(2)}%`;
      preview.style.top = `${y.toFixed(2)}%`;
      preview.setAttribute("aria-label", "\u6B63\u5728\u521B\u5EFA\u8DB3\u8FF9");
      preview.setAttribute("title", "\u6B63\u5728\u521B\u5EFA\u8DB3\u8FF9");
      preview.setAttribute("disabled", "true");
      try {
        await this.plugin.createPlaceFromMapClick(x, y);
      } finally {
        preview.remove();
      }
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
      const uniqueTitle = this.ensureUniquePlaceTitle(title);
      const file = await createTypedNote(
        this.app,
        this.settings.placeFolder,
        uniqueTitle,
        buildPlaceTemplate(uniqueTitle, latitude, longitude, latitudeHemisphere, longitudeHemisphere)
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
    const now = /* @__PURE__ */ new Date();
    const stamp = now.toISOString().replace("T", " ").slice(0, 19).replace(/:/g, "-");
    const ms = String(now.getMilliseconds()).padStart(3, "0");
    return `Footprint ${stamp} ${ms}`;
  }
  ensureUniquePlaceTitle(title) {
    const folder = this.settings.placeFolder.replace(/\/$/, "");
    const safeName = title.replace(/[\\/:*?"<>|]/g, "-").trim() || "Untitled";
    let candidate = safeName;
    let index = 1;
    while (this.app.vault.getAbstractFileByPath(`${folder}/${candidate}.md`)) {
      index += 1;
      candidate = `${safeName} ${index}`;
    }
    return candidate;
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
      latitude: Math.round(rawLatitude * 100) / 100,
      longitude: Math.round(normalizedLongitude * 100) / 100,
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2RhdGEudHMiLCAic3JjL3NldHRpbmdzLnRzIiwgInNyYy92aWV3LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQge1xuICBBcHAsXG4gIE5vdGljZSxcbiAgUGx1Z2luLFxuICBQbHVnaW5NYW5pZmVzdCxcbiAgVEFic3RyYWN0RmlsZSxcbiAgVEZpbGUsXG4gIFdvcmtzcGFjZUxlYWZcbn0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgeyBhcHBlbmRGaWxlU3luYywgcmVhZEZpbGVTeW5jIH0gZnJvbSBcImZzXCI7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSBcInBhdGhcIjtcbmltcG9ydCB7IHNoZWxsIH0gZnJvbSBcImVsZWN0cm9uXCI7XG5pbXBvcnQge1xuICBidWlsZENhc2VUZW1wbGF0ZSxcbiAgYnVpbGRDb2xsZWN0aW9uVGVtcGxhdGUsXG4gIGJ1aWxkRXZpZGVuY2VUZW1wbGF0ZSxcbiAgYnVpbGRQbGFjZVRlbXBsYXRlLFxuICBidWlsZFNjaGVkdWxlVGVtcGxhdGUsXG4gIGJ1aWxkVGFza1RlbXBsYXRlLFxuICBjb2xsZWN0V29ya3NwYWNlRGF0YSxcbiAgY3JlYXRlVHlwZWROb3RlLFxuICBlbnN1cmVGb2xkZXJzLFxuICBmb3JtYXRMb2NhbERhdGVcbn0gZnJvbSBcIi4vZGF0YVwiO1xuaW1wb3J0IHsgU2hlcmxvY2tTZXR0aW5nVGFiIH0gZnJvbSBcIi4vc2V0dGluZ3NcIjtcbmltcG9ydCB0eXBlIHsgU2hlcmxvY2tQbHVnaW5TZXR0aW5ncywgU2hlcmxvY2tXb3Jrc3BhY2VEYXRhIH0gZnJvbSBcIi4vdHlwZXNcIjtcbmltcG9ydCB7IExFR0FDWV9TSEVSTE9DS19WSUVXX1RZUEUsIFNoZXJsb2NrV29ya3NwYWNlVmlldywgU0hFUkxPQ0tfVklFV19UWVBFIH0gZnJvbSBcIi4vdmlld1wiO1xuXG5jb25zdCBERUZBVUxUX1NFVFRJTkdTOiBTaGVybG9ja1BsdWdpblNldHRpbmdzID0ge1xuICBjYXNlRm9sZGVyOiBcIlNoZXJsb2NrIE9TL0Nhc2VzXCIsXG4gIHRhc2tGb2xkZXI6IFwiU2hlcmxvY2sgT1MvVGFza3NcIixcbiAgc2NoZWR1bGVGb2xkZXI6IFwiU2hlcmxvY2sgT1MvU2NoZWR1bGVzXCIsXG4gIGNvbGxlY3Rpb25Gb2xkZXI6IFwiU2hlcmxvY2sgT1MvQ29sbGVjdGlvbnNcIixcbiAgZXZpZGVuY2VGb2xkZXI6IFwiU2hlcmxvY2sgT1MvRXZpZGVuY2VcIixcbiAgcGxhY2VGb2xkZXI6IFwiU2hlcmxvY2sgT1MvUGxhY2VzXCIsXG4gIGZvZ0RlbnNpdHk6IDQ4LFxuICBtb3Rpb25JbnRlbnNpdHk6IDM2LFxuICBsYW1wR2xvdzogNThcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNoZXJsb2NrT1NQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuICBzZXR0aW5nczogU2hlcmxvY2tQbHVnaW5TZXR0aW5ncyA9IERFRkFVTFRfU0VUVElOR1M7XG4gIGxhdGVzdFdvcmtzcGFjZURhdGE/OiBTaGVybG9ja1dvcmtzcGFjZURhdGE7XG5cbiAgY29uc3RydWN0b3IoYXBwOiBBcHAsIG1hbmlmZXN0OiBQbHVnaW5NYW5pZmVzdCkge1xuICAgIHN1cGVyKGFwcCwgbWFuaWZlc3QpO1xuICB9XG5cbiAgYXN5bmMgb25sb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICB0aGlzLmRlYnVnTG9nKFwib25sb2FkOnN0YXJ0XCIpO1xuICAgICAgYXdhaXQgdGhpcy5sb2FkU2V0dGluZ3MoKTtcbiAgICAgIHRoaXMuZGVidWdMb2coXCJvbmxvYWQ6c2V0dGluZ3MtbG9hZGVkXCIpO1xuICAgICAgdGhpcy5lbmFibGVHbG9iYWxTdHlsZSgpO1xuICAgICAgYXdhaXQgZW5zdXJlRm9sZGVycyh0aGlzLmFwcCwgdGhpcy5zZXR0aW5ncyk7XG4gICAgICB0aGlzLmRlYnVnTG9nKFwib25sb2FkOmZvbGRlcnMtZW5zdXJlZFwiKTtcbiAgICAgIGF3YWl0IHRoaXMuZW5zdXJlRW50cnlBc3NldCgpO1xuICAgICAgdGhpcy5kZWJ1Z0xvZyhcIm9ubG9hZDplbnRyeS1hc3NldC1lbnN1cmVkXCIpO1xuICAgICAgYXdhaXQgdGhpcy5lbnN1cmVQYXJsb3JBc3NldCgpO1xuICAgICAgdGhpcy5kZWJ1Z0xvZyhcIm9ubG9hZDpwYXJsb3ItYXNzZXQtZW5zdXJlZFwiKTtcbiAgICAgIGF3YWl0IHRoaXMuZW5zdXJlV29ybGRNYXBBc3NldCgpO1xuICAgICAgdGhpcy5kZWJ1Z0xvZyhcIm9ubG9hZDp3b3JsZC1tYXAtYXNzZXQtZW5zdXJlZFwiKTtcblxuICAgICAgdGhpcy5yZWdpc3RlclZpZXcoXG4gICAgICAgIFNIRVJMT0NLX1ZJRVdfVFlQRSxcbiAgICAgICAgKGxlYWYpID0+IG5ldyBTaGVybG9ja1dvcmtzcGFjZVZpZXcobGVhZiwgdGhpcylcbiAgICAgICk7XG4gICAgICB0aGlzLnJlZ2lzdGVyVmlldyhcbiAgICAgICAgTEVHQUNZX1NIRVJMT0NLX1ZJRVdfVFlQRSxcbiAgICAgICAgKGxlYWYpID0+IG5ldyBTaGVybG9ja1dvcmtzcGFjZVZpZXcobGVhZiwgdGhpcylcbiAgICAgICk7XG5cbiAgICAgIHRoaXMuYWRkUmliYm9uSWNvbihcInNlYXJjaC1jaGVja1wiLCBcIk9wZW4gU2hlcmxvY2tcIiwgYXN5bmMgKCkgPT4ge1xuICAgICAgICBhd2FpdCB0aGlzLmFjdGl2YXRlV29ya3NwYWNlVmlldygpO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgIGlkOiBcIm9wZW4tc2hlcmxvY2std29ya3NwYWNlXCIsXG4gICAgICAgIG5hbWU6IFwiT3BlbiBTaGVybG9jayB3b3Jrc3BhY2VcIixcbiAgICAgICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHRoaXMuYWN0aXZhdGVXb3Jrc3BhY2VWaWV3KClcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICBpZDogXCJjcmVhdGUtY2FzZS1maWxlXCIsXG4gICAgICAgIG5hbWU6IFwiQ3JlYXRlIGEgbmV3IGNhc2UgZmlsZVwiLFxuICAgICAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4gdGhpcy5jcmVhdGVDYXNlTm90ZSgpXG4gICAgICB9KTtcblxuICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgaWQ6IFwiY3JlYXRlLXRhc2stZmlsZVwiLFxuICAgICAgICBuYW1lOiBcIkNyZWF0ZSBhIG5ldyB0YXNrIGZpbGVcIixcbiAgICAgICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHRoaXMuY3JlYXRlVGFza05vdGUoKVxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgIGlkOiBcImNyZWF0ZS10YXNrLWZvci1hY3RpdmUtY2FzZVwiLFxuICAgICAgICBuYW1lOiBcIkNyZWF0ZSBhIHRhc2sgZm9yIHRoZSBjdXJyZW50IGNhc2VcIixcbiAgICAgICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHRoaXMuY3JlYXRlVGFza0ZvckFjdGl2ZUNhc2UoKVxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgIGlkOiBcImNyZWF0ZS1ldmlkZW5jZS1mb3ItYWN0aXZlLWNhc2VcIixcbiAgICAgICAgbmFtZTogXCJDcmVhdGUgZXZpZGVuY2UgZm9yIHRoZSBjdXJyZW50IGNhc2VcIixcbiAgICAgICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHRoaXMuY3JlYXRlRXZpZGVuY2VGb3JBY3RpdmVDYXNlKClcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICBpZDogXCJjcmVhdGUtc2NoZWR1bGUtZmlsZVwiLFxuICAgICAgICBuYW1lOiBcIkNyZWF0ZSBhIG5ldyBzY2hlZHVsZSBmaWxlXCIsXG4gICAgICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB0aGlzLmNyZWF0ZVNjaGVkdWxlTm90ZSgpXG4gICAgICB9KTtcblxuICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgaWQ6IFwiY3JlYXRlLWNvbGxlY3Rpb24tZmlsZVwiLFxuICAgICAgICBuYW1lOiBcIkNyZWF0ZSBhIG5ldyBjb2xsZWN0aW9uIGl0ZW1cIixcbiAgICAgICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHRoaXMuY3JlYXRlQ29sbGVjdGlvbk5vdGUoKVxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgIGlkOiBcImNyZWF0ZS1wbGFjZS1maWxlXCIsXG4gICAgICAgIG5hbWU6IFwiQ3JlYXRlIGEgbmV3IGZvb3RwcmludCBwbGFjZVwiLFxuICAgICAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4gdGhpcy5jcmVhdGVQbGFjZU5vdGUoKVxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuYWRkU2V0dGluZ1RhYihuZXcgU2hlcmxvY2tTZXR0aW5nVGFiKHRoaXMuYXBwLCB0aGlzKSk7XG5cbiAgICAgIHRoaXMucmVnaXN0ZXJFdmVudCh0aGlzLmFwcC52YXVsdC5vbihcImNyZWF0ZVwiLCAoKSA9PiB0aGlzLnJlZnJlc2hXb3Jrc3BhY2UoKSkpO1xuICAgICAgdGhpcy5yZWdpc3RlckV2ZW50KHRoaXMuYXBwLnZhdWx0Lm9uKFwibW9kaWZ5XCIsICgpID0+IHRoaXMucmVmcmVzaFdvcmtzcGFjZSgpKSk7XG4gICAgICB0aGlzLnJlZ2lzdGVyRXZlbnQodGhpcy5hcHAudmF1bHQub24oXCJkZWxldGVcIiwgKCkgPT4gdGhpcy5yZWZyZXNoV29ya3NwYWNlKCkpKTtcbiAgICAgIHRoaXMuYXBwLndvcmtzcGFjZS5vbkxheW91dFJlYWR5KCgpID0+IHtcbiAgICAgICAgdGhpcy5kZWJ1Z0xvZyhcImxheW91dC1yZWFkeTphY3RpdmF0ZVwiKTtcbiAgICAgICAgdGhpcy5hcHAud29ya3NwYWNlLmRldGFjaExlYXZlc09mVHlwZShMRUdBQ1lfU0hFUkxPQ0tfVklFV19UWVBFKTtcbiAgICAgICAgdm9pZCB0aGlzLmFjdGl2YXRlV29ya3NwYWNlVmlldygpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLmRlYnVnTG9nKFwib25sb2FkOmNvbXBsZXRlXCIpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmRlYnVnTG9nKGBvbmxvYWQ6ZXJyb3I6JHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3Iuc3RhY2sgPz8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICBhc3luYyBvbnVubG9hZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5yZW1vdmUoXCJzaGVybG9jay1nbG9iYWwtc3R5bGVcIik7XG4gICAgdGhpcy5hcHAud29ya3NwYWNlLmRldGFjaExlYXZlc09mVHlwZShMRUdBQ1lfU0hFUkxPQ0tfVklFV19UWVBFKTtcbiAgICB0aGlzLmFwcC53b3Jrc3BhY2UuZGV0YWNoTGVhdmVzT2ZUeXBlKFNIRVJMT0NLX1ZJRVdfVFlQRSk7XG4gIH1cblxuICBhc3luYyBsb2FkU2V0dGluZ3MoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5zZXR0aW5ncyA9IHtcbiAgICAgIC4uLkRFRkFVTFRfU0VUVElOR1MsXG4gICAgICAuLi4oYXdhaXQgdGhpcy5sb2FkRGF0YSgpKVxuICAgIH07XG4gIH1cblxuICBhc3luYyBzYXZlU2V0dGluZ3MoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5zYXZlRGF0YSh0aGlzLnNldHRpbmdzKTtcbiAgICBhd2FpdCBlbnN1cmVGb2xkZXJzKHRoaXMuYXBwLCB0aGlzLnNldHRpbmdzKTtcbiAgICBhd2FpdCB0aGlzLnJlZnJlc2hXb3Jrc3BhY2UoKTtcbiAgfVxuXG4gIGFzeW5jIGdldFdvcmtzcGFjZURhdGEoKTogUHJvbWlzZTxTaGVybG9ja1dvcmtzcGFjZURhdGE+IHtcbiAgICB0cnkge1xuICAgICAgdGhpcy5sYXRlc3RXb3Jrc3BhY2VEYXRhID0gYXdhaXQgY29sbGVjdFdvcmtzcGFjZURhdGEodGhpcy5hcHApO1xuICAgICAgcmV0dXJuIHRoaXMubGF0ZXN0V29ya3NwYWNlRGF0YTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5kZWJ1Z0xvZyhgZ2V0V29ya3NwYWNlRGF0YTplcnJvcjoke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5zdGFjayA/PyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGFjdGl2YXRlV29ya3NwYWNlVmlldygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyB3b3Jrc3BhY2UgfSA9IHRoaXMuYXBwO1xuICAgICAgdGhpcy5kZWJ1Z0xvZyhcImFjdGl2YXRlOnN0YXJ0XCIpO1xuICAgICAgbGV0IGxlYWYgPSB3b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKFNIRVJMT0NLX1ZJRVdfVFlQRSlbMF0gPz8gbnVsbDtcblxuICAgICAgaWYgKCFsZWFmKSB7XG4gICAgICAgIHRoaXMuZGVidWdMb2coXCJhY3RpdmF0ZTpjcmVhdGUtbGVhZlwiKTtcbiAgICAgICAgbGVhZiA9IHdvcmtzcGFjZS5nZXRMZWFmKFwidGFiXCIpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWxlYWYpIHtcbiAgICAgICAgbmV3IE5vdGljZShcIlNoZXJsb2NrIFx1NjVFMFx1NkNENVx1NjI1M1x1NUYwMFx1NEUzQlx1NURFNVx1NEY1Q1x1NTMzQVx1ODlDNlx1NTZGRVx1MzAwMlwiKTtcbiAgICAgICAgdGhpcy5kZWJ1Z0xvZyhcImFjdGl2YXRlOm5vLWxlYWZcIik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdGhpcy5kZWJ1Z0xvZyhcImFjdGl2YXRlOnNldC12aWV3LXN0YXRlOnN0YXJ0XCIpO1xuICAgICAgYXdhaXQgbGVhZi5zZXRWaWV3U3RhdGUoeyB0eXBlOiBTSEVSTE9DS19WSUVXX1RZUEUsIHN0YXRlOiB7fSwgYWN0aXZlOiB0cnVlIH0pO1xuICAgICAgdGhpcy5kZWJ1Z0xvZyhcImFjdGl2YXRlOnNldC12aWV3LXN0YXRlOmNvbXBsZXRlXCIpO1xuICAgICAgd29ya3NwYWNlLnNldEFjdGl2ZUxlYWYobGVhZiwgeyBmb2N1czogdHJ1ZSB9KTtcbiAgICAgIHdvcmtzcGFjZS5yZXZlYWxMZWFmKGxlYWYpO1xuICAgICAgY29uc3QgdmlldyA9IGxlYWYudmlldztcbiAgICAgIGlmICh2aWV3IGluc3RhbmNlb2YgU2hlcmxvY2tXb3Jrc3BhY2VWaWV3KSB7XG4gICAgICAgIHRoaXMuZGVidWdMb2coXCJhY3RpdmF0ZTpyZXNldC1lbnRyeTpzdGFydFwiKTtcbiAgICAgICAgYXdhaXQgdmlldy5yZXNldFRvRW50cnkoKTtcbiAgICAgICAgdGhpcy5kZWJ1Z0xvZyhcImFjdGl2YXRlOnJlc2V0LWVudHJ5OmNvbXBsZXRlXCIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5kZWJ1Z0xvZyhgYWN0aXZhdGU6dW5leHBlY3RlZC12aWV3OiR7dmlldy5nZXRWaWV3VHlwZSgpfWApO1xuICAgICAgICBhd2FpdCB0aGlzLnJlZnJlc2hXb3Jrc3BhY2UoKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuZGVidWdMb2coYGFjdGl2YXRlOmNvbXBsZXRlOiR7bGVhZi52aWV3LmdldFZpZXdUeXBlKCl9YCk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMuZGVidWdMb2coYGFjdGl2YXRlOmVycm9yOiR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLnN0YWNrID8/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgICAgbmV3IE5vdGljZShgU2hlcmxvY2sgXHU2MjUzXHU1RjAwXHU1OTMxXHU4RDI1OiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogXCJcdTY3MkFcdTc3RTVcdTk1MTlcdThCRUZcIn1gKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyByZWZyZXNoV29ya3NwYWNlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGxlYXZlcyA9IFtcbiAgICAgIC4uLnRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoU0hFUkxPQ0tfVklFV19UWVBFKSxcbiAgICAgIC4uLnRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoTEVHQUNZX1NIRVJMT0NLX1ZJRVdfVFlQRSlcbiAgICBdO1xuICAgIGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgbGVhdmVzLm1hcChhc3luYyAobGVhZikgPT4ge1xuICAgICAgICBjb25zdCB2aWV3ID0gbGVhZi52aWV3O1xuICAgICAgICBpZiAodmlldyBpbnN0YW5jZW9mIFNoZXJsb2NrV29ya3NwYWNlVmlldykge1xuICAgICAgICAgIGF3YWl0IHZpZXcucmVmcmVzaCgpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICk7XG4gIH1cblxuICBhc3luYyBjcmVhdGVDYXNlTm90ZSh0aXRsZSA9IHRoaXMuZGVmYXVsdFRpdGxlKFwiTmV3IENhc2VcIikpOiBQcm9taXNlPFRGaWxlPiB7XG4gICAgY29uc3QgZmlsZSA9IGF3YWl0IGNyZWF0ZVR5cGVkTm90ZShcbiAgICAgIHRoaXMuYXBwLFxuICAgICAgdGhpcy5zZXR0aW5ncy5jYXNlRm9sZGVyLFxuICAgICAgdGl0bGUsXG4gICAgICBidWlsZENhc2VUZW1wbGF0ZSh0aXRsZSlcbiAgICApO1xuICAgIGF3YWl0IHRoaXMub3BlbkZpbGUoZmlsZSk7XG4gICAgcmV0dXJuIGZpbGU7XG4gIH1cblxuICBhc3luYyBjcmVhdGVUYXNrTm90ZSh0aXRsZSA9IHRoaXMuZGVmYXVsdFRpdGxlKFwiTmV3IFRhc2tcIikpOiBQcm9taXNlPFRGaWxlPiB7XG4gICAgY29uc3QgZmlsZSA9IGF3YWl0IGNyZWF0ZVR5cGVkTm90ZShcbiAgICAgIHRoaXMuYXBwLFxuICAgICAgdGhpcy5zZXR0aW5ncy50YXNrRm9sZGVyLFxuICAgICAgdGl0bGUsXG4gICAgICBidWlsZFRhc2tUZW1wbGF0ZSh0aXRsZSlcbiAgICApO1xuICAgIGF3YWl0IHRoaXMub3BlbkZpbGUoZmlsZSk7XG4gICAgcmV0dXJuIGZpbGU7XG4gIH1cblxuICBhc3luYyBjcmVhdGVUYXNrRnJvbUNhc2UoY2FzZVBhdGg6IHN0cmluZywgdGl0bGU/OiBzdHJpbmcpOiBQcm9taXNlPFRGaWxlPiB7XG4gICAgY29uc3QgYWJzdHJhY3QgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoY2FzZVBhdGgpO1xuICAgIGlmICghKGFic3RyYWN0IGluc3RhbmNlb2YgVEZpbGUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJcdTYyN0VcdTRFMERcdTUyMzBcdTVCRjlcdTVFOTRcdTY4NDhcdTRFRjZcdTY1ODdcdTRFRjZcdTMwMDJcIik7XG4gICAgfVxuXG4gICAgY29uc3QgdGFza1RpdGxlID0gdGl0bGUgPz8gYCR7YWJzdHJhY3QuYmFzZW5hbWV9IExlYWQgJHtuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc2xpY2UoMTEsIDE2KX1gO1xuICAgIGNvbnN0IGZpbGUgPSBhd2FpdCBjcmVhdGVUeXBlZE5vdGUoXG4gICAgICB0aGlzLmFwcCxcbiAgICAgIHRoaXMuc2V0dGluZ3MudGFza0ZvbGRlcixcbiAgICAgIHRhc2tUaXRsZSxcbiAgICAgIGJ1aWxkVGFza1RlbXBsYXRlKHRhc2tUaXRsZSlcbiAgICApO1xuXG4gICAgYXdhaXQgdGhpcy5hcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGZpbGUsIChmcm9udG1hdHRlcikgPT4ge1xuICAgICAgZnJvbnRtYXR0ZXIudHlwZSA9IFwidGFza1wiO1xuICAgICAgZnJvbnRtYXR0ZXIuY2FzZSA9IGFic3RyYWN0LmJhc2VuYW1lO1xuICAgICAgZnJvbnRtYXR0ZXIuY2FzZVBhdGggPSBhYnN0cmFjdC5wYXRoO1xuICAgICAgZnJvbnRtYXR0ZXIudXBkYXRlZCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICB9KTtcblxuICAgIGF3YWl0IHRoaXMub3BlbkZpbGUoZmlsZSk7XG4gICAgcmV0dXJuIGZpbGU7XG4gIH1cblxuICBhc3luYyBjcmVhdGVUYXNrRm9yQWN0aXZlQ2FzZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBhY3RpdmVGaWxlID0gdGhpcy5hcHAud29ya3NwYWNlLmdldEFjdGl2ZUZpbGUoKTtcbiAgICBpZiAoIWFjdGl2ZUZpbGUpIHtcbiAgICAgIG5ldyBOb3RpY2UoXCJcdThCRjdcdTUxNDhcdTYyNTNcdTVGMDBcdTRFMDBcdTRFMkFcdTY4NDhcdTRFRjZcdTY1ODdcdTRFRjZcdTMwMDJcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgY2FjaGUgPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShhY3RpdmVGaWxlKTtcbiAgICBpZiAoY2FjaGU/LmZyb250bWF0dGVyPy50eXBlICE9PSBcImNhc2VcIikge1xuICAgICAgbmV3IE5vdGljZShcIlx1NUY1M1x1NTI0RFx1NjI1M1x1NUYwMFx1NzY4NFx1NEUwRFx1NjYyRlx1Njg0OFx1NEVGNlx1NjU4N1x1NEVGNlx1MzAwMlwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLmNyZWF0ZVRhc2tGcm9tQ2FzZShhY3RpdmVGaWxlLnBhdGgpO1xuICB9XG5cbiAgYXN5bmMgY3JlYXRlRXZpZGVuY2VGcm9tQ2FzZShjYXNlUGF0aDogc3RyaW5nLCB0aXRsZT86IHN0cmluZyk6IFByb21pc2U8VEZpbGU+IHtcbiAgICBjb25zdCBhYnN0cmFjdCA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChjYXNlUGF0aCk7XG4gICAgaWYgKCEoYWJzdHJhY3QgaW5zdGFuY2VvZiBURmlsZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlx1NjI3RVx1NEUwRFx1NTIzMFx1NUJGOVx1NUU5NFx1Njg0OFx1NEVGNlx1NjU4N1x1NEVGNlx1MzAwMlwiKTtcbiAgICB9XG5cbiAgICBjb25zdCBldmlkZW5jZVRpdGxlID0gdGl0bGUgPz8gYCR7YWJzdHJhY3QuYmFzZW5hbWV9IEV2aWRlbmNlICR7bmV3IERhdGUoKS50b0lTT1N0cmluZygpLnNsaWNlKDExLCAxNil9YDtcbiAgICBjb25zdCBmaWxlID0gYXdhaXQgY3JlYXRlVHlwZWROb3RlKFxuICAgICAgdGhpcy5hcHAsXG4gICAgICB0aGlzLnNldHRpbmdzLmV2aWRlbmNlRm9sZGVyLFxuICAgICAgZXZpZGVuY2VUaXRsZSxcbiAgICAgIGJ1aWxkRXZpZGVuY2VUZW1wbGF0ZShldmlkZW5jZVRpdGxlLCBhYnN0cmFjdC5iYXNlbmFtZSwgYWJzdHJhY3QucGF0aClcbiAgICApO1xuXG4gICAgYXdhaXQgdGhpcy5vcGVuRmlsZShmaWxlKTtcbiAgICByZXR1cm4gZmlsZTtcbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZUV2aWRlbmNlTm90ZSh0aXRsZSA9IHRoaXMuZGVmYXVsdFRpdGxlKFwiTmV3IEV2aWRlbmNlXCIpKTogUHJvbWlzZTxURmlsZT4ge1xuICAgIGNvbnN0IGZpbGUgPSBhd2FpdCBjcmVhdGVUeXBlZE5vdGUoXG4gICAgICB0aGlzLmFwcCxcbiAgICAgIHRoaXMuc2V0dGluZ3MuZXZpZGVuY2VGb2xkZXIsXG4gICAgICB0aXRsZSxcbiAgICAgIGJ1aWxkRXZpZGVuY2VUZW1wbGF0ZSh0aXRsZSlcbiAgICApO1xuICAgIGF3YWl0IHRoaXMub3BlbkZpbGUoZmlsZSk7XG4gICAgcmV0dXJuIGZpbGU7XG4gIH1cblxuICBhc3luYyBhcmNoaXZlQ29sbGVjdGlvbkFzRXZpZGVuY2UoY29sbGVjdGlvblBhdGg6IHN0cmluZyk6IFByb21pc2U8VEZpbGUgfCBudWxsPiB7XG4gICAgY29uc3QgYWJzdHJhY3QgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoY29sbGVjdGlvblBhdGgpO1xuICAgIGlmICghKGFic3RyYWN0IGluc3RhbmNlb2YgVEZpbGUpKSB7XG4gICAgICBuZXcgTm90aWNlKFwiXHU2MjdFXHU0RTBEXHU1MjMwXHU4OTgxXHU1RjUyXHU2ODYzXHU3Njg0XHU3ODE0XHU4QkZCXHU2NzYxXHU3NkVFXHUzMDAyXCIpO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgZmlyc3RDb25maXJtID0gd2luZG93LmNvbmZpcm0oYFx1NUMwNlx1MzAwQyR7YWJzdHJhY3QuYmFzZW5hbWV9XHUzMDBEXHU1MkEwXHU1MTY1XHU4QkMxXHU3MjY5XHU2N0RDXHVGRjFGXFxuXFxuXHU4RkQ5XHU0RjFBXHU1MjFCXHU1RUZBXHU0RTAwXHU0RUZEXHU1M0VGXHU3RUU3XHU3RUVEXHU3RjE2XHU4RjkxXHU3Njg0XHU4QkMxXHU3MjY5XHU3QjE0XHU4QkIwXHVGRjBDXHU1MzlGXHU3ODE0XHU4QkZCXHU2NzYxXHU3NkVFXHU0RjFBXHU0RkREXHU3NTU5XHUzMDAyYCk7XG4gICAgaWYgKCFmaXJzdENvbmZpcm0pIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBzZWNvbmRDb25maXJtID0gd2luZG93LmNvbmZpcm0oYFx1NTE4RFx1NkIyMVx1Nzg2RVx1OEJBNFx1RkYxQVx1NjI4QVx1MzAwQyR7YWJzdHJhY3QuYmFzZW5hbWV9XHUzMDBEXHU2Qzg5XHU2REMwXHU0RTNBXHU4QkMxXHU3MjY5XHU2N0RDXHU2NzYxXHU3NkVFXHVGRjFGYCk7XG4gICAgaWYgKCFzZWNvbmRDb25maXJtKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBjYWNoZSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGFic3RyYWN0KTtcbiAgICBjb25zdCBmcm9udG1hdHRlciA9IGNhY2hlPy5mcm9udG1hdHRlcjtcbiAgICBjb25zdCB0aXRsZSA9IGAke2Fic3RyYWN0LmJhc2VuYW1lfSBFdmlkZW5jZWA7XG4gICAgY29uc3Qgc291cmNlQm9keSA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNhY2hlZFJlYWQoYWJzdHJhY3QpO1xuICAgIGNvbnN0IGZpbGUgPSBhd2FpdCBjcmVhdGVUeXBlZE5vdGUoXG4gICAgICB0aGlzLmFwcCxcbiAgICAgIHRoaXMuc2V0dGluZ3MuZXZpZGVuY2VGb2xkZXIsXG4gICAgICB0aXRsZSxcbiAgICAgIGAke2J1aWxkRXZpZGVuY2VUZW1wbGF0ZSh0aXRsZSwgU3RyaW5nKGZyb250bWF0dGVyPy5jYXNlID8/IFwiXCIpLCBTdHJpbmcoZnJvbnRtYXR0ZXI/LmNhc2VQYXRoID8/IFwiXCIpKX1cbiMjIFx1Njc2NVx1NkU5MFx1NzgxNFx1OEJGQlxuLSBcdTUzOUZcdTU5Q0JcdTY3NjFcdTc2RUVcdUZGMUFbWyR7YWJzdHJhY3QuYmFzZW5hbWV9XV1cbi0gXHU1MzlGXHU1OUNCXHU4REVGXHU1Rjg0XHVGRjFBJHthYnN0cmFjdC5wYXRofVxuXG4jIyBcdTUzOUZcdTU5Q0JcdTdCMTRcdThCQjBcdTY0NThcdTVGNTVcbiR7c291cmNlQm9keS5yZXBsYWNlKC9eLS0tW1xcc1xcU10qPy0tLVxccyovLCBcIlwiKS50cmltKCkgfHwgXCItIFwifVxuYFxuICAgICk7XG5cbiAgICBhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoZmlsZSwgKGV2aWRlbmNlRnJvbnRtYXR0ZXIpID0+IHtcbiAgICAgIGV2aWRlbmNlRnJvbnRtYXR0ZXIudHlwZSA9IFwiZXZpZGVuY2VcIjtcbiAgICAgIGV2aWRlbmNlRnJvbnRtYXR0ZXIuc291cmNlID0gYWJzdHJhY3QucGF0aDtcbiAgICAgIGV2aWRlbmNlRnJvbnRtYXR0ZXIuY2FzZSA9IHR5cGVvZiBmcm9udG1hdHRlcj8uY2FzZSA9PT0gXCJzdHJpbmdcIiA/IGZyb250bWF0dGVyLmNhc2UgOiBcIlwiO1xuICAgICAgZXZpZGVuY2VGcm9udG1hdHRlci5jYXNlUGF0aCA9IHR5cGVvZiBmcm9udG1hdHRlcj8uY2FzZVBhdGggPT09IFwic3RyaW5nXCIgPyBmcm9udG1hdHRlci5jYXNlUGF0aCA6IFwiXCI7XG4gICAgICBldmlkZW5jZUZyb250bWF0dGVyLnVwZGF0ZWQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoYWJzdHJhY3QsIChjb2xsZWN0aW9uRnJvbnRtYXR0ZXIpID0+IHtcbiAgICAgIGNvbGxlY3Rpb25Gcm9udG1hdHRlci50eXBlID0gXCJjb2xsZWN0aW9uXCI7XG4gICAgICBjb2xsZWN0aW9uRnJvbnRtYXR0ZXIuc3RhdHVzID0gXCJmaW5pc2hlZFwiO1xuICAgICAgY29sbGVjdGlvbkZyb250bWF0dGVyLnVwZGF0ZWQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgfSk7XG5cbiAgICBuZXcgTm90aWNlKGBcdTVERjJcdTUyQTBcdTUxNjVcdThCQzFcdTcyNjlcdTY3REM6ICR7ZmlsZS5iYXNlbmFtZX1gKTtcbiAgICBhd2FpdCB0aGlzLnJlZnJlc2hXb3Jrc3BhY2UoKTtcbiAgICBhd2FpdCB0aGlzLm9wZW5GaWxlKGZpbGUpO1xuICAgIHJldHVybiBmaWxlO1xuICB9XG5cbiAgYXN5bmMgZW5zdXJlRXZpZGVuY2VGb2xkZXJGb3JDYXNlKGNhc2VQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IGFic3RyYWN0ID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGNhc2VQYXRoKTtcbiAgICBpZiAoIShhYnN0cmFjdCBpbnN0YW5jZW9mIFRGaWxlKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiXHU2MjdFXHU0RTBEXHU1MjMwXHU1QkY5XHU1RTk0XHU2ODQ4XHU0RUY2XHU2NTg3XHU0RUY2XHUzMDAyXCIpO1xuICAgIH1cblxuICAgIGNvbnN0IHNhZmVOYW1lID0gYWJzdHJhY3QuYmFzZW5hbWUucmVwbGFjZSgvW1xcXFwvOio/XCI8PnxdL2csIFwiLVwiKS50cmltKCkgfHwgXCJVbnRpdGxlZCBDYXNlXCI7XG4gICAgY29uc3QgZm9sZGVyUGF0aCA9IGAke3RoaXMuc2V0dGluZ3MuZXZpZGVuY2VGb2xkZXIucmVwbGFjZSgvXFwvJC8sIFwiXCIpfS8ke3NhZmVOYW1lfWA7XG4gICAgaWYgKCF0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoZm9sZGVyUGF0aCkpIHtcbiAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZUZvbGRlcihmb2xkZXJQYXRoKTtcbiAgICB9XG4gICAgbmV3IE5vdGljZShgXHU1REYyXHU1RUZBXHU3QUNCXHU2ODQ4XHU0RUY2XHU4RDQ0XHU2NTk5XHU1OTM5OiAke2ZvbGRlclBhdGh9YCk7XG4gICAgYXdhaXQgdGhpcy5yZWZyZXNoV29ya3NwYWNlKCk7XG4gICAgcmV0dXJuIGZvbGRlclBhdGg7XG4gIH1cblxuICBhc3luYyByZXZlYWxFdmlkZW5jZUZvbGRlckZvckNhc2UoY2FzZVBhdGg6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGZvbGRlclBhdGggPSBhd2FpdCB0aGlzLmVuc3VyZUV2aWRlbmNlRm9sZGVyRm9yQ2FzZShjYXNlUGF0aCk7XG4gICAgY29uc3QgYWRhcHRlciA9IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIgYXMgdW5rbm93biBhcyB7IGdldEJhc2VQYXRoPzogKCkgPT4gc3RyaW5nIH07XG4gICAgY29uc3QgYmFzZVBhdGggPSBhZGFwdGVyLmdldEJhc2VQYXRoPy4oKTtcbiAgICBpZiAoIWJhc2VQYXRoKSB7XG4gICAgICBuZXcgTm90aWNlKGBcdTY4NDhcdTRFRjZcdThENDRcdTY1OTlcdTU5MzlcdTVERjJcdTVFRkFcdTdBQ0I6ICR7Zm9sZGVyUGF0aH1gKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgYXdhaXQgc2hlbGwub3BlblBhdGgoam9pbihiYXNlUGF0aCwgZm9sZGVyUGF0aCkpO1xuICB9XG5cbiAgYXN5bmMgY3JlYXRlRXZpZGVuY2VGb3JBY3RpdmVDYXNlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGFjdGl2ZUZpbGUgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlRmlsZSgpO1xuICAgIGlmICghYWN0aXZlRmlsZSkge1xuICAgICAgbmV3IE5vdGljZShcIlx1OEJGN1x1NTE0OFx1NjI1M1x1NUYwMFx1NEUwMFx1NEUyQVx1Njg0OFx1NEVGNlx1NjU4N1x1NEVGNlx1MzAwMlwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBjYWNoZSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGFjdGl2ZUZpbGUpO1xuICAgIGlmIChjYWNoZT8uZnJvbnRtYXR0ZXI/LnR5cGUgIT09IFwiY2FzZVwiKSB7XG4gICAgICBuZXcgTm90aWNlKFwiXHU1RjUzXHU1MjREXHU2MjUzXHU1RjAwXHU3Njg0XHU0RTBEXHU2NjJGXHU2ODQ4XHU0RUY2XHU2NTg3XHU0RUY2XHUzMDAyXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMuY3JlYXRlRXZpZGVuY2VGcm9tQ2FzZShhY3RpdmVGaWxlLnBhdGgpO1xuICB9XG5cbiAgYXN5bmMgY3JlYXRlU2NoZWR1bGVOb3RlKHRpdGxlID0gdGhpcy5kZWZhdWx0VGl0bGUoXCJOZXcgU2NoZWR1bGVcIikpOiBQcm9taXNlPFRGaWxlPiB7XG4gICAgY29uc3QgZmlsZSA9IGF3YWl0IGNyZWF0ZVR5cGVkTm90ZShcbiAgICAgIHRoaXMuYXBwLFxuICAgICAgdGhpcy5zZXR0aW5ncy5zY2hlZHVsZUZvbGRlcixcbiAgICAgIHRpdGxlLFxuICAgICAgYnVpbGRTY2hlZHVsZVRlbXBsYXRlKHRpdGxlKVxuICAgICk7XG4gICAgYXdhaXQgdGhpcy5vcGVuRmlsZShmaWxlKTtcbiAgICByZXR1cm4gZmlsZTtcbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZUNvbGxlY3Rpb25Ob3RlKHRpdGxlID0gdGhpcy5kZWZhdWx0VGl0bGUoXCJOZXcgQ29sbGVjdGlvblwiKSk6IFByb21pc2U8VEZpbGU+IHtcbiAgICBjb25zdCBmaWxlID0gYXdhaXQgY3JlYXRlVHlwZWROb3RlKFxuICAgICAgdGhpcy5hcHAsXG4gICAgICB0aGlzLnNldHRpbmdzLmNvbGxlY3Rpb25Gb2xkZXIsXG4gICAgICB0aXRsZSxcbiAgICAgIGJ1aWxkQ29sbGVjdGlvblRlbXBsYXRlKHRpdGxlKVxuICAgICk7XG4gICAgYXdhaXQgdGhpcy5vcGVuRmlsZShmaWxlKTtcbiAgICByZXR1cm4gZmlsZTtcbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZVBsYWNlTm90ZSgpOiBQcm9taXNlPFRGaWxlIHwgbnVsbD4ge1xuICAgIHJldHVybiB0aGlzLmNyZWF0ZVBsYWNlV2l0aFRpdGxlQXRNYXBQZXJjZW50KHRoaXMuZGVmYXVsdFBsYWNlVGl0bGUoKSwgNTAsIDUwKTtcbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZVBsYWNlRnJvbU1hcENsaWNrKHhQZXJjZW50OiBudW1iZXIsIHlQZXJjZW50OiBudW1iZXIpOiBQcm9taXNlPFRGaWxlIHwgbnVsbD4ge1xuICAgIHJldHVybiB0aGlzLmNyZWF0ZVBsYWNlV2l0aFRpdGxlQXRNYXBQZXJjZW50KHRoaXMuZGVmYXVsdFBsYWNlVGl0bGUoKSwgeFBlcmNlbnQsIHlQZXJjZW50KTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgY3JlYXRlUGxhY2VXaXRoVGl0bGVBdE1hcFBlcmNlbnQodGl0bGU6IHN0cmluZywgeFBlcmNlbnQ6IG51bWJlciwgeVBlcmNlbnQ6IG51bWJlcik6IFByb21pc2U8VEZpbGUgfCBudWxsPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgbGF0aXR1ZGUsIGxvbmdpdHVkZSwgbGF0aXR1ZGVIZW1pc3BoZXJlLCBsb25naXR1ZGVIZW1pc3BoZXJlIH0gPSB0aGlzLmNvbnZlcnRNYXBQZXJjZW50VG9Db29yZGluYXRlcyh4UGVyY2VudCwgeVBlcmNlbnQpO1xuICAgICAgY29uc3QgdW5pcXVlVGl0bGUgPSB0aGlzLmVuc3VyZVVuaXF1ZVBsYWNlVGl0bGUodGl0bGUpO1xuICAgICAgY29uc3QgZmlsZSA9IGF3YWl0IGNyZWF0ZVR5cGVkTm90ZShcbiAgICAgICAgdGhpcy5hcHAsXG4gICAgICAgIHRoaXMuc2V0dGluZ3MucGxhY2VGb2xkZXIsXG4gICAgICAgIHVuaXF1ZVRpdGxlLFxuICAgICAgICBidWlsZFBsYWNlVGVtcGxhdGUodW5pcXVlVGl0bGUsIGxhdGl0dWRlLCBsb25naXR1ZGUsIGxhdGl0dWRlSGVtaXNwaGVyZSwgbG9uZ2l0dWRlSGVtaXNwaGVyZSlcbiAgICAgICk7XG4gICAgICBhd2FpdCB0aGlzLm9wZW5GaWxlKGZpbGUpO1xuICAgICAgcmV0dXJuIGZpbGU7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMuZGVidWdMb2coYGNyZWF0ZVBsYWNlTm90ZTplcnJvcjoke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5zdGFjayA/PyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgICAgIG5ldyBOb3RpY2UoYFx1NjVFMFx1NkNENVx1NTIxQlx1NUVGQVx1OERCM1x1OEZGOTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFwiXHU2NzJBXHU3N0U1XHU5NTE5XHU4QkVGXCJ9YCk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGRlZmF1bHRQbGFjZVRpdGxlKCk6IHN0cmluZyB7XG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgICBjb25zdCBzdGFtcCA9IG5vdy50b0lTT1N0cmluZygpLnJlcGxhY2UoXCJUXCIsIFwiIFwiKS5zbGljZSgwLCAxOSkucmVwbGFjZSgvOi9nLCBcIi1cIik7XG4gICAgY29uc3QgbXMgPSBTdHJpbmcobm93LmdldE1pbGxpc2Vjb25kcygpKS5wYWRTdGFydCgzLCBcIjBcIik7XG4gICAgcmV0dXJuIGBGb290cHJpbnQgJHtzdGFtcH0gJHttc31gO1xuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVVbmlxdWVQbGFjZVRpdGxlKHRpdGxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IGZvbGRlciA9IHRoaXMuc2V0dGluZ3MucGxhY2VGb2xkZXIucmVwbGFjZSgvXFwvJC8sIFwiXCIpO1xuICAgIGNvbnN0IHNhZmVOYW1lID0gdGl0bGUucmVwbGFjZSgvW1xcXFwvOio/XCI8PnxdL2csIFwiLVwiKS50cmltKCkgfHwgXCJVbnRpdGxlZFwiO1xuICAgIGxldCBjYW5kaWRhdGUgPSBzYWZlTmFtZTtcbiAgICBsZXQgaW5kZXggPSAxO1xuICAgIHdoaWxlICh0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoYCR7Zm9sZGVyfS8ke2NhbmRpZGF0ZX0ubWRgKSkge1xuICAgICAgaW5kZXggKz0gMTtcbiAgICAgIGNhbmRpZGF0ZSA9IGAke3NhZmVOYW1lfSAke2luZGV4fWA7XG4gICAgfVxuICAgIHJldHVybiBjYW5kaWRhdGU7XG4gIH1cblxuICBwcml2YXRlIGNvbnZlcnRNYXBQZXJjZW50VG9Db29yZGluYXRlcyh4UGVyY2VudDogbnVtYmVyLCB5UGVyY2VudDogbnVtYmVyKToge1xuICAgIGxhdGl0dWRlOiBudW1iZXI7XG4gICAgbG9uZ2l0dWRlOiBudW1iZXI7XG4gICAgbGF0aXR1ZGVIZW1pc3BoZXJlOiBcIk5cIiB8IFwiU1wiO1xuICAgIGxvbmdpdHVkZUhlbWlzcGhlcmU6IFwiRVwiIHwgXCJXXCI7XG4gIH0ge1xuICAgIGNvbnN0IGNsYW1wZWRYID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oMTAwLCB4UGVyY2VudCkpO1xuICAgIGNvbnN0IGNsYW1wZWRZID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oMTAwLCB5UGVyY2VudCkpO1xuICAgIGNvbnN0IHJhd0xvbmdpdHVkZSA9IChjbGFtcGVkWCAvIDEwMCkgKiAzNjAgLSAxODAgKyAxMDU7XG4gICAgY29uc3Qgbm9ybWFsaXplZExvbmdpdHVkZSA9ICgocmF3TG9uZ2l0dWRlICsgMTgwKSAlIDM2MCArIDM2MCkgJSAzNjAgLSAxODA7XG4gICAgY29uc3QgcmF3TGF0aXR1ZGUgPSA5MCAtIChjbGFtcGVkWSAvIDEwMCkgKiAxODA7XG4gICAgY29uc3QgbGF0aXR1ZGVIZW1pc3BoZXJlID0gcmF3TGF0aXR1ZGUgPj0gMCA/IFwiTlwiIDogXCJTXCI7XG4gICAgY29uc3QgbG9uZ2l0dWRlSGVtaXNwaGVyZSA9IG5vcm1hbGl6ZWRMb25naXR1ZGUgPj0gMCA/IFwiRVwiIDogXCJXXCI7XG4gICAgcmV0dXJuIHtcbiAgICAgIGxhdGl0dWRlOiBNYXRoLnJvdW5kKHJhd0xhdGl0dWRlICogMTAwKSAvIDEwMCxcbiAgICAgIGxvbmdpdHVkZTogTWF0aC5yb3VuZChub3JtYWxpemVkTG9uZ2l0dWRlICogMTAwKSAvIDEwMCxcbiAgICAgIGxhdGl0dWRlSGVtaXNwaGVyZSxcbiAgICAgIGxvbmdpdHVkZUhlbWlzcGhlcmVcbiAgICB9O1xuICB9XG5cbiAgYXN5bmMgY3JlYXRlUXVpY2tTY2hlZHVsZShkYXk6IHN0cmluZywgc3RhcnQ6IHN0cmluZywgZW5kOiBzdHJpbmcpOiBQcm9taXNlPFRGaWxlPiB7XG4gICAgY29uc3QgdGl0bGUgPSBgJHtkYXl9ICR7c3RhcnR9IEludmVzdGlnYXRpb25gO1xuICAgIGNvbnN0IGZpbGUgPSBhd2FpdCBjcmVhdGVUeXBlZE5vdGUoXG4gICAgICB0aGlzLmFwcCxcbiAgICAgIHRoaXMuc2V0dGluZ3Muc2NoZWR1bGVGb2xkZXIsXG4gICAgICB0aXRsZSxcbiAgICAgIGJ1aWxkU2NoZWR1bGVUZW1wbGF0ZSh0aXRsZSlcbiAgICApO1xuXG4gICAgYXdhaXQgdGhpcy5hcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGZpbGUsIChmcm9udG1hdHRlcikgPT4ge1xuICAgICAgZnJvbnRtYXR0ZXIuZGF5ID0gZGF5O1xuICAgICAgZnJvbnRtYXR0ZXIuc3RhcnQgPSBzdGFydDtcbiAgICAgIGZyb250bWF0dGVyLmVuZCA9IGVuZDtcbiAgICAgIGZyb250bWF0dGVyLmR1cmF0aW9uTWludXRlcyA9IHRoaXMuZGlmZk1pbnV0ZXMoc3RhcnQsIGVuZCk7XG4gICAgICBmcm9udG1hdHRlci51cGRhdGVkID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgaWYgKHR5cGVvZiBmcm9udG1hdHRlci5yZWxhdGVkVGFzayAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgICBmcm9udG1hdHRlci5yZWxhdGVkVGFzayA9IFwiXCI7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIGZyb250bWF0dGVyLnJlbGF0ZWRUYXNrUGF0aCAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgICBmcm9udG1hdHRlci5yZWxhdGVkVGFza1BhdGggPSBcIlwiO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgYXdhaXQgdGhpcy5vcGVuRmlsZShmaWxlKTtcbiAgICByZXR1cm4gZmlsZTtcbiAgfVxuXG4gIGFzeW5jIHNjaGVkdWxlVGFza0Zyb21EYXNoYm9hcmQodGFza1BhdGg6IHN0cmluZywgZGF5OiBzdHJpbmcsIHN0YXJ0OiBzdHJpbmcsIGVuZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgYWJzdHJhY3QgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgodGFza1BhdGgpO1xuICAgIGlmICghKGFic3RyYWN0IGluc3RhbmNlb2YgVEZpbGUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJcdTYyN0VcdTRFMERcdTUyMzBcdTg5ODFcdTVCODlcdTYzOTJcdTc2ODRcdTRFRkJcdTUyQTFcdTY1ODdcdTRFRjZcdTMwMDJcIik7XG4gICAgfVxuXG4gICAgY29uc3QgdGFza0ZpbGUgPSBhYnN0cmFjdDtcbiAgICBjb25zdCBzY2hlZHVsZVRpdGxlID0gYCR7ZGF5fSAke3N0YXJ0fSAke3Rhc2tGaWxlLmJhc2VuYW1lfWA7XG4gICAgY29uc3Qgc2NoZWR1bGVGaWxlID0gYXdhaXQgY3JlYXRlVHlwZWROb3RlKFxuICAgICAgdGhpcy5hcHAsXG4gICAgICB0aGlzLnNldHRpbmdzLnNjaGVkdWxlRm9sZGVyLFxuICAgICAgc2NoZWR1bGVUaXRsZSxcbiAgICAgIGJ1aWxkU2NoZWR1bGVUZW1wbGF0ZShzY2hlZHVsZVRpdGxlKVxuICAgICk7XG5cbiAgICBhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoc2NoZWR1bGVGaWxlLCAoZnJvbnRtYXR0ZXIpID0+IHtcbiAgICAgIGZyb250bWF0dGVyLmRheSA9IGRheTtcbiAgICAgIGZyb250bWF0dGVyLnN0YXJ0ID0gc3RhcnQ7XG4gICAgICBmcm9udG1hdHRlci5lbmQgPSBlbmQ7XG4gICAgICBmcm9udG1hdHRlci5kdXJhdGlvbk1pbnV0ZXMgPSB0aGlzLmRpZmZNaW51dGVzKHN0YXJ0LCBlbmQpO1xuICAgICAgZnJvbnRtYXR0ZXIucmVsYXRlZFRhc2sgPSB0YXNrRmlsZS5iYXNlbmFtZTtcbiAgICAgIGZyb250bWF0dGVyLnJlbGF0ZWRUYXNrUGF0aCA9IHRhc2tGaWxlLnBhdGg7XG4gICAgICBmcm9udG1hdHRlci51cGRhdGVkID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgdGhpcy5hcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKHRhc2tGaWxlLCAoZnJvbnRtYXR0ZXIpID0+IHtcbiAgICAgIGZyb250bWF0dGVyLnR5cGUgPSBcInRhc2tcIjtcbiAgICAgIGZyb250bWF0dGVyLnN0YXR1cyA9IFwic2NoZWR1bGVkXCI7XG4gICAgICBmcm9udG1hdHRlci51cGRhdGVkID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgIH0pO1xuXG4gICAgbmV3IE5vdGljZShgXHU1REYyXHU1QzA2ICR7dGFza0ZpbGUuYmFzZW5hbWV9IFx1NUI4OVx1NjM5Mlx1NTIzMCAke2RheX0gJHtzdGFydH1gKTtcbiAgICBhd2FpdCB0aGlzLnJlZnJlc2hXb3Jrc3BhY2UoKTtcbiAgfVxuXG4gIGFzeW5jIG1vdmVTY2hlZHVsZUVudHJ5KHNjaGVkdWxlUGF0aDogc3RyaW5nLCBkYXk6IHN0cmluZywgc3RhcnQ6IHN0cmluZywgZW5kOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBhYnN0cmFjdCA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChzY2hlZHVsZVBhdGgpO1xuICAgIGlmICghKGFic3RyYWN0IGluc3RhbmNlb2YgVEZpbGUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJcdTYyN0VcdTRFMERcdTUyMzBcdTg5ODFcdTc5RkJcdTUyQThcdTc2ODRcdTYzOTJcdTY3MUZcdTY1ODdcdTRFRjZcdTMwMDJcIik7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5hcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGFic3RyYWN0LCAoZnJvbnRtYXR0ZXIpID0+IHtcbiAgICAgIGZyb250bWF0dGVyLnR5cGUgPSBcInNjaGVkdWxlXCI7XG4gICAgICBmcm9udG1hdHRlci5kYXkgPSBkYXk7XG4gICAgICBmcm9udG1hdHRlci5zdGFydCA9IHN0YXJ0O1xuICAgICAgZnJvbnRtYXR0ZXIuZW5kID0gZW5kO1xuICAgICAgZnJvbnRtYXR0ZXIuZHVyYXRpb25NaW51dGVzID0gdGhpcy5kaWZmTWludXRlcyhzdGFydCwgZW5kKTtcbiAgICAgIGZyb250bWF0dGVyLnVwZGF0ZWQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgfSk7XG5cbiAgICBuZXcgTm90aWNlKGBcdTVERjJcdThDMDNcdTY1NzRcdTYzOTJcdTY3MUZcdTUyMzAgJHtkYXl9ICR7c3RhcnR9YCk7XG4gICAgYXdhaXQgdGhpcy5yZWZyZXNoV29ya3NwYWNlKCk7XG4gIH1cblxuICBhc3luYyBhZGp1c3RTY2hlZHVsZUR1cmF0aW9uKHNjaGVkdWxlUGF0aDogc3RyaW5nLCBkZWx0YU1pbnV0ZXM6IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGFic3RyYWN0ID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHNjaGVkdWxlUGF0aCk7XG4gICAgaWYgKCEoYWJzdHJhY3QgaW5zdGFuY2VvZiBURmlsZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlx1NjI3RVx1NEUwRFx1NTIzMFx1ODk4MVx1OEMwM1x1NjU3NFx1NjVGNlx1OTU3Rlx1NzY4NFx1NjM5Mlx1NjcxRlx1NjU4N1x1NEVGNlx1MzAwMlwiKTtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoYWJzdHJhY3QsIChmcm9udG1hdHRlcikgPT4ge1xuICAgICAgY29uc3Qgc3RhcnQgPSB0eXBlb2YgZnJvbnRtYXR0ZXIuc3RhcnQgPT09IFwic3RyaW5nXCIgPyBmcm9udG1hdHRlci5zdGFydCA6IFwiMDk6MDBcIjtcbiAgICAgIGNvbnN0IGN1cnJlbnREdXJhdGlvbiA9XG4gICAgICAgIHR5cGVvZiBmcm9udG1hdHRlci5kdXJhdGlvbk1pbnV0ZXMgPT09IFwibnVtYmVyXCJcbiAgICAgICAgICA/IGZyb250bWF0dGVyLmR1cmF0aW9uTWludXRlc1xuICAgICAgICAgIDogdGhpcy5kaWZmTWludXRlcyhcbiAgICAgICAgICAgICAgc3RhcnQsXG4gICAgICAgICAgICAgIHR5cGVvZiBmcm9udG1hdHRlci5lbmQgPT09IFwic3RyaW5nXCIgPyBmcm9udG1hdHRlci5lbmQgOiB0aGlzLmFkZE1pbnV0ZXMoc3RhcnQsIDYwKVxuICAgICAgICAgICAgKTtcbiAgICAgIGNvbnN0IG5leHREdXJhdGlvbiA9IE1hdGgubWF4KDMwLCBNYXRoLm1pbigyNDAsIGN1cnJlbnREdXJhdGlvbiArIGRlbHRhTWludXRlcykpO1xuICAgICAgZnJvbnRtYXR0ZXIuc3RhcnQgPSBzdGFydDtcbiAgICAgIGZyb250bWF0dGVyLmR1cmF0aW9uTWludXRlcyA9IG5leHREdXJhdGlvbjtcbiAgICAgIGZyb250bWF0dGVyLmVuZCA9IHRoaXMuYWRkTWludXRlcyhzdGFydCwgbmV4dER1cmF0aW9uKTtcbiAgICAgIGZyb250bWF0dGVyLnVwZGF0ZWQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCB0aGlzLnJlZnJlc2hXb3Jrc3BhY2UoKTtcbiAgfVxuXG4gIGFzeW5jIG1vdmVTY2hlZHVsZVRvTmV4dEZyZWVTbG90KHNjaGVkdWxlUGF0aDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgYWJzdHJhY3QgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoc2NoZWR1bGVQYXRoKTtcbiAgICBpZiAoIShhYnN0cmFjdCBpbnN0YW5jZW9mIFRGaWxlKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiXHU2MjdFXHU0RTBEXHU1MjMwXHU4OTgxXHU5ODdBXHU1RUY2XHU3Njg0XHU2MzkyXHU2NzFGXHU2NTg3XHU0RUY2XHUzMDAyXCIpO1xuICAgIH1cblxuICAgIGNvbnN0IGNhY2hlID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoYWJzdHJhY3QpO1xuICAgIGNvbnN0IGZyb250bWF0dGVyID0gY2FjaGU/LmZyb250bWF0dGVyO1xuICAgIGNvbnN0IGN1cnJlbnREYXkgPSB0eXBlb2YgZnJvbnRtYXR0ZXI/LmRheSA9PT0gXCJzdHJpbmdcIiA/IGZyb250bWF0dGVyLmRheSA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKS5zbGljZSgwLCAxMCk7XG4gICAgY29uc3QgY3VycmVudFN0YXJ0ID0gdHlwZW9mIGZyb250bWF0dGVyPy5zdGFydCA9PT0gXCJzdHJpbmdcIiA/IGZyb250bWF0dGVyLnN0YXJ0IDogXCIwODowMFwiO1xuICAgIGNvbnN0IGR1cmF0aW9uID1cbiAgICAgIHR5cGVvZiBmcm9udG1hdHRlcj8uZHVyYXRpb25NaW51dGVzID09PSBcIm51bWJlclwiXG4gICAgICAgID8gZnJvbnRtYXR0ZXIuZHVyYXRpb25NaW51dGVzXG4gICAgICAgIDogdGhpcy5kaWZmTWludXRlcyhcbiAgICAgICAgICAgIGN1cnJlbnRTdGFydCxcbiAgICAgICAgICAgIHR5cGVvZiBmcm9udG1hdHRlcj8uZW5kID09PSBcInN0cmluZ1wiID8gZnJvbnRtYXR0ZXIuZW5kIDogdGhpcy5hZGRNaW51dGVzKGN1cnJlbnRTdGFydCwgNjApXG4gICAgICAgICAgKTtcblxuICAgIGNvbnN0IHdvcmtzcGFjZURhdGEgPSBhd2FpdCB0aGlzLmdldFdvcmtzcGFjZURhdGEoKTtcbiAgICBjb25zdCBjYW5kaWRhdGUgPSB0aGlzLmZpbmROZXh0RnJlZVNsb3QoY3VycmVudERheSwgY3VycmVudFN0YXJ0LCBkdXJhdGlvbiwgd29ya3NwYWNlRGF0YS5zY2hlZHVsZXMsIHNjaGVkdWxlUGF0aCk7XG4gICAgaWYgKCFjYW5kaWRhdGUpIHtcbiAgICAgIG5ldyBOb3RpY2UoXCJcdTY3MkNcdTU0NjhcdTZDQTFcdTY3MDlcdTYyN0VcdTUyMzBcdTUzRUZcdTk4N0FcdTVFRjZcdTc2ODRcdTdBN0FcdTY4NjNcdTMwMDJcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5tb3ZlU2NoZWR1bGVFbnRyeShzY2hlZHVsZVBhdGgsIGNhbmRpZGF0ZS5kYXksIGNhbmRpZGF0ZS5zdGFydCwgY2FuZGlkYXRlLmVuZCk7XG4gIH1cblxuICBhc3luYyBvcGVuUGF0aChwYXRoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBhYnN0cmFjdDogVEFic3RyYWN0RmlsZSB8IG51bGwgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgocGF0aCk7XG4gICAgaWYgKCEoYWJzdHJhY3QgaW5zdGFuY2VvZiBURmlsZSkpIHtcbiAgICAgIG5ldyBOb3RpY2UoXCJcdTVCRjlcdTVFOTRcdTY1ODdcdTRFRjZcdTRFMERcdTVCNThcdTU3MjhcdTMwMDJcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGF3YWl0IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWFmKHRydWUpLm9wZW5GaWxlKGFic3RyYWN0KTtcbiAgfVxuXG4gIGFzeW5jIGRlbGV0ZVBhdGgocGF0aDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgYWJzdHJhY3Q6IFRBYnN0cmFjdEZpbGUgfCBudWxsID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHBhdGgpO1xuICAgIGlmICghKGFic3RyYWN0IGluc3RhbmNlb2YgVEZpbGUpKSB7XG4gICAgICBuZXcgTm90aWNlKFwiXHU1QkY5XHU1RTk0XHU2NTg3XHU0RUY2XHU0RTBEXHU1QjU4XHU1NzI4XHVGRjBDXHU2NUUwXHU2Q0Q1XHU1MjIwXHU5NjY0XHUzMDAyXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBjb25maXJtZWQgPSB3aW5kb3cuY29uZmlybShgXHU3ODZFXHU1QjlBXHU1MjIwXHU5NjY0XHUzMDBDJHthYnN0cmFjdC5iYXNlbmFtZX1cdTMwMERcdTU0MTdcdUZGMUZcdTY1ODdcdTRFRjZcdTRGMUFcdTc5RkJcdTUyMzBcdTdDRkJcdTdFREZcdTVFOUZcdTdFQjhcdTdCRDNcdTMwMDJgKTtcbiAgICBpZiAoIWNvbmZpcm1lZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC50cmFzaChhYnN0cmFjdCwgdHJ1ZSk7XG4gICAgbmV3IE5vdGljZShgXHU1REYyXHU1MjIwXHU5NjY0ICR7YWJzdHJhY3QuYmFzZW5hbWV9YCk7XG4gICAgYXdhaXQgdGhpcy5yZWZyZXNoV29ya3NwYWNlKCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIG9wZW5GaWxlKGZpbGU6IFRGaWxlKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5hcHAud29ya3NwYWNlLmdldExlYWYodHJ1ZSkub3BlbkZpbGUoZmlsZSk7XG4gICAgbmV3IE5vdGljZShgU2hlcmxvY2sgT1MgXHU1REYyXHU2MjUzXHU1RjAwICR7ZmlsZS5iYXNlbmFtZX1gKTtcbiAgICBhd2FpdCB0aGlzLnJlZnJlc2hXb3Jrc3BhY2UoKTtcbiAgfVxuXG4gIHByaXZhdGUgZGVmYXVsdFRpdGxlKHByZWZpeDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCBzdGFtcCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKS5yZXBsYWNlKFwiVFwiLCBcIiBcIikuc2xpY2UoMCwgMTYpO1xuICAgIHJldHVybiBgJHtwcmVmaXh9ICR7c3RhbXB9YDtcbiAgfVxuXG4gIHByaXZhdGUgZGlmZk1pbnV0ZXMoc3RhcnQ6IHN0cmluZywgZW5kOiBzdHJpbmcpOiBudW1iZXIge1xuICAgIGNvbnN0IHN0YXJ0TWludXRlcyA9IHRoaXMudGltZVRvTWludXRlcyhzdGFydCk7XG4gICAgY29uc3QgZW5kTWludXRlcyA9IHRoaXMudGltZVRvTWludXRlcyhlbmQpO1xuICAgIHJldHVybiBNYXRoLm1heCgzMCwgZW5kTWludXRlcyAtIHN0YXJ0TWludXRlcyk7XG4gIH1cblxuICBwcml2YXRlIGFkZE1pbnV0ZXMoc3RhcnQ6IHN0cmluZywgYW1vdW50OiBudW1iZXIpOiBzdHJpbmcge1xuICAgIGNvbnN0IG5leHQgPSBNYXRoLm1pbih0aGlzLnRpbWVUb01pbnV0ZXMoc3RhcnQpICsgYW1vdW50LCAyMyAqIDYwICsgMzApO1xuICAgIGNvbnN0IGhvdXJzID0gTWF0aC5mbG9vcihuZXh0IC8gNjApO1xuICAgIGNvbnN0IG1pbnV0ZXMgPSBuZXh0ICUgNjA7XG4gICAgcmV0dXJuIGAke1N0cmluZyhob3VycykucGFkU3RhcnQoMiwgXCIwXCIpfToke1N0cmluZyhtaW51dGVzKS5wYWRTdGFydCgyLCBcIjBcIil9YDtcbiAgfVxuXG4gIHByaXZhdGUgdGltZVRvTWludXRlcyh2YWx1ZTogc3RyaW5nKTogbnVtYmVyIHtcbiAgICBjb25zdCBbaG91cnMsIG1pbnV0ZXNdID0gdmFsdWUuc3BsaXQoXCI6XCIpLm1hcChOdW1iZXIpO1xuICAgIHJldHVybiBob3VycyAqIDYwICsgbWludXRlcztcbiAgfVxuXG4gIHByaXZhdGUgZmluZE5leHRGcmVlU2xvdChcbiAgICBjdXJyZW50RGF5OiBzdHJpbmcsXG4gICAgY3VycmVudFN0YXJ0OiBzdHJpbmcsXG4gICAgZHVyYXRpb246IG51bWJlcixcbiAgICBzY2hlZHVsZXM6IFNoZXJsb2NrV29ya3NwYWNlRGF0YVtcInNjaGVkdWxlc1wiXSxcbiAgICBpZ25vcmVkUGF0aDogc3RyaW5nXG4gICk6IHsgZGF5OiBzdHJpbmc7IHN0YXJ0OiBzdHJpbmc7IGVuZDogc3RyaW5nIH0gfCBudWxsIHtcbiAgICBjb25zdCBzbG90cyA9IFtcIjA4OjAwXCIsIFwiMTA6MDBcIiwgXCIxMjowMFwiLCBcIjE0OjAwXCIsIFwiMTY6MDBcIiwgXCIxOTowMFwiXTtcbiAgICBjb25zdCB3ZWVrID0gdGhpcy5idWlsZEN1cnJlbnRXZWVrKCk7XG4gICAgY29uc3QgY3VycmVudEluZGV4ID0gd2Vlay5maW5kSW5kZXgoKGRheSkgPT4gZGF5ID09PSBjdXJyZW50RGF5KTtcbiAgICBjb25zdCBvcmRlcmVkRGF5cyA9IGN1cnJlbnRJbmRleCA+PSAwID8gWy4uLndlZWsuc2xpY2UoY3VycmVudEluZGV4KSwgLi4ud2Vlay5zbGljZSgwLCBjdXJyZW50SW5kZXgpXSA6IHdlZWs7XG5cbiAgICBmb3IgKGNvbnN0IGRheSBvZiBvcmRlcmVkRGF5cykge1xuICAgICAgZm9yIChjb25zdCBzbG90IG9mIHNsb3RzKSB7XG4gICAgICAgIGlmIChkYXkgPT09IGN1cnJlbnREYXkgJiYgdGhpcy50aW1lVG9NaW51dGVzKHNsb3QpIDw9IHRoaXMudGltZVRvTWludXRlcyhjdXJyZW50U3RhcnQpKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgb2NjdXBpZWQgPSBzY2hlZHVsZXMuc29tZSgoaXRlbSkgPT4gaXRlbS5maWxlUGF0aCAhPT0gaWdub3JlZFBhdGggJiYgaXRlbS5kYXkgPT09IGRheSAmJiBpdGVtLnN0YXJ0ID09PSBzbG90KTtcbiAgICAgICAgaWYgKCFvY2N1cGllZCkge1xuICAgICAgICAgIHJldHVybiB7IGRheSwgc3RhcnQ6IHNsb3QsIGVuZDogdGhpcy5hZGRNaW51dGVzKHNsb3QsIGR1cmF0aW9uKSB9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBwcml2YXRlIGJ1aWxkQ3VycmVudFdlZWsoKTogc3RyaW5nW10ge1xuICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgY29uc3QgZGF5ID0gbm93LmdldERheSgpO1xuICAgIGNvbnN0IG1vbmRheURlbHRhID0gZGF5ID09PSAwID8gLTYgOiAxIC0gZGF5O1xuICAgIGNvbnN0IG1vbmRheSA9IG5ldyBEYXRlKG5vdyk7XG4gICAgbW9uZGF5LnNldERhdGUobm93LmdldERhdGUoKSArIG1vbmRheURlbHRhKTtcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh7IGxlbmd0aDogNyB9LCAoXywgaW5kZXgpID0+IHtcbiAgICAgIGNvbnN0IHRhcmdldCA9IG5ldyBEYXRlKG1vbmRheSk7XG4gICAgICB0YXJnZXQuc2V0RGF0ZShtb25kYXkuZ2V0RGF0ZSgpICsgaW5kZXgpO1xuICAgICAgcmV0dXJuIGZvcm1hdExvY2FsRGF0ZSh0YXJnZXQpO1xuICAgIH0pO1xuICB9XG5cbiAgZGVidWdMb2cobWVzc2FnZTogc3RyaW5nKTogdm9pZCB7XG4gICAgdHJ5IHtcbiAgICAgIGFwcGVuZEZpbGVTeW5jKFwiL3RtcC9zaGVybG9jay1vcy1kZWJ1Zy5sb2dcIiwgYFske25ldyBEYXRlKCkudG9JU09TdHJpbmcoKX1dICR7bWVzc2FnZX1cXG5gKTtcbiAgICB9IGNhdGNoIChfZXJyb3IpIHtcbiAgICAgIC8vIElnbm9yZSBsb2dnaW5nIGZhaWx1cmVzIHNvIGRpYWdub3N0aWNzIG5ldmVyIGJyZWFrIHRoZSBwbHVnaW4gaXRzZWxmLlxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZW5hYmxlR2xvYmFsU3R5bGUoKTogdm9pZCB7XG4gICAgZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QuYWRkKFwic2hlcmxvY2stZ2xvYmFsLXN0eWxlXCIpO1xuICB9XG5cbiAgZ2V0RW50cnlJbWFnZVVybCgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLmdldFJlc291cmNlUGF0aChcIlNoZXJsb2NrIE9TL0Fzc2V0cy9zaGVybG9jay1lbnRyeS5wbmdcIik7XG4gIH1cblxuICBnZXRQYXJsb3JJbWFnZVVybCgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLmdldFJlc291cmNlUGF0aChcIlNoZXJsb2NrIE9TL0Fzc2V0cy9zaGVybG9jay1wYXJsb3IucG5nXCIpO1xuICB9XG5cbiAgZ2V0V29ybGRNYXBJbWFnZVVybCgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLmdldFJlc291cmNlUGF0aChcIlNoZXJsb2NrIE9TL0Fzc2V0cy9zaGVybG9jay13b3JsZC1tYXAucG5nXCIpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBlbnN1cmVFbnRyeUFzc2V0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGFkYXB0ZXIgPSB0aGlzLmFwcC52YXVsdC5hZGFwdGVyO1xuICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFwiU2hlcmxvY2sgT1MvQXNzZXRzXCIpKSB7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoXCJTaGVybG9jayBPUy9Bc3NldHNcIik7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xuICAgICAgICBpZiAoIW1lc3NhZ2UuaW5jbHVkZXMoXCJGb2xkZXIgYWxyZWFkeSBleGlzdHNcIikpIHtcbiAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHRhcmdldFBhdGggPSBcIlNoZXJsb2NrIE9TL0Fzc2V0cy9zaGVybG9jay1lbnRyeS5wbmdcIjtcbiAgICBpZiAoYXdhaXQgYWRhcHRlci5leGlzdHModGFyZ2V0UGF0aCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgZmlsZVN5c3RlbUFkYXB0ZXIgPSBhZGFwdGVyIGFzIHVua25vd24gYXMgeyBnZXRCYXNlUGF0aD86ICgpID0+IHN0cmluZyB9O1xuICAgICAgY29uc3QgYmFzZVBhdGggPSBmaWxlU3lzdGVtQWRhcHRlci5nZXRCYXNlUGF0aD8uKCk7XG4gICAgICBpZiAoIWJhc2VQYXRoKSB7XG4gICAgICAgIHRoaXMuZGVidWdMb2coXCJlbnRyeS1hc3NldDpza2lwOm5vLWJhc2UtcGF0aFwiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBwbHVnaW5Bc3NldFBhdGggPSBqb2luKFxuICAgICAgICBiYXNlUGF0aCxcbiAgICAgICAgXCIub2JzaWRpYW5cIixcbiAgICAgICAgXCJwbHVnaW5zXCIsXG4gICAgICAgIHRoaXMubWFuaWZlc3QuaWQsXG4gICAgICAgIFwiYXNzZXRzXCIsXG4gICAgICAgIFwic2hlcmxvY2stZW50cnkucG5nXCJcbiAgICAgICk7XG4gICAgICBjb25zdCBzb3VyY2UgPSByZWFkRmlsZVN5bmMocGx1Z2luQXNzZXRQYXRoKTtcbiAgICAgIGNvbnN0IGRhdGEgPSBzb3VyY2UuYnVmZmVyLnNsaWNlKHNvdXJjZS5ieXRlT2Zmc2V0LCBzb3VyY2UuYnl0ZU9mZnNldCArIHNvdXJjZS5ieXRlTGVuZ3RoKTtcbiAgICAgIGF3YWl0IGFkYXB0ZXIud3JpdGVCaW5hcnkodGFyZ2V0UGF0aCwgZGF0YSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3Iuc3RhY2sgPz8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcik7XG4gICAgICB0aGlzLmRlYnVnTG9nKGBlbnRyeS1hc3NldDpza2lwOiR7bWVzc2FnZX1gKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGVuc3VyZVBhcmxvckFzc2V0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuZW5zdXJlQnVuZGxlZEFzc2V0KFwic2hlcmxvY2stcGFybG9yLnBuZ1wiLCBcInBhcmxvci1hc3NldFwiKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZW5zdXJlV29ybGRNYXBBc3NldCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLmVuc3VyZUJ1bmRsZWRBc3NldChcInNoZXJsb2NrLXdvcmxkLW1hcC5wbmdcIiwgXCJ3b3JsZC1tYXAtYXNzZXRcIik7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGVuc3VyZUJ1bmRsZWRBc3NldChmaWxlTmFtZTogc3RyaW5nLCBsb2dQcmVmaXg6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGFkYXB0ZXIgPSB0aGlzLmFwcC52YXVsdC5hZGFwdGVyO1xuICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFwiU2hlcmxvY2sgT1MvQXNzZXRzXCIpKSB7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoXCJTaGVybG9jayBPUy9Bc3NldHNcIik7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xuICAgICAgICBpZiAoIW1lc3NhZ2UuaW5jbHVkZXMoXCJGb2xkZXIgYWxyZWFkeSBleGlzdHNcIikpIHtcbiAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHRhcmdldFBhdGggPSBgU2hlcmxvY2sgT1MvQXNzZXRzLyR7ZmlsZU5hbWV9YDtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBmaWxlU3lzdGVtQWRhcHRlciA9IGFkYXB0ZXIgYXMgdW5rbm93biBhcyB7IGdldEJhc2VQYXRoPzogKCkgPT4gc3RyaW5nIH07XG4gICAgICBjb25zdCBiYXNlUGF0aCA9IGZpbGVTeXN0ZW1BZGFwdGVyLmdldEJhc2VQYXRoPy4oKTtcbiAgICAgIGlmICghYmFzZVBhdGgpIHtcbiAgICAgICAgdGhpcy5kZWJ1Z0xvZyhgJHtsb2dQcmVmaXh9OnNraXA6bm8tYmFzZS1wYXRoYCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcGx1Z2luQXNzZXRQYXRoID0gam9pbihcbiAgICAgICAgYmFzZVBhdGgsXG4gICAgICAgIFwiLm9ic2lkaWFuXCIsXG4gICAgICAgIFwicGx1Z2luc1wiLFxuICAgICAgICB0aGlzLm1hbmlmZXN0LmlkLFxuICAgICAgICBcImFzc2V0c1wiLFxuICAgICAgICBmaWxlTmFtZVxuICAgICAgKTtcbiAgICAgIGNvbnN0IHNvdXJjZSA9IHJlYWRGaWxlU3luYyhwbHVnaW5Bc3NldFBhdGgpO1xuICAgICAgY29uc3QgZGF0YSA9IHNvdXJjZS5idWZmZXIuc2xpY2Uoc291cmNlLmJ5dGVPZmZzZXQsIHNvdXJjZS5ieXRlT2Zmc2V0ICsgc291cmNlLmJ5dGVMZW5ndGgpO1xuICAgICAgYXdhaXQgYWRhcHRlci53cml0ZUJpbmFyeSh0YXJnZXRQYXRoLCBkYXRhKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc3QgbWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5zdGFjayA/PyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcbiAgICAgIHRoaXMuZGVidWdMb2coYCR7bG9nUHJlZml4fTpza2lwOiR7bWVzc2FnZX1gKTtcbiAgICB9XG4gIH1cbn1cblxuXG4iLCAiaW1wb3J0IHsgQXBwLCBURmlsZSwgbm9ybWFsaXplUGF0aCB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHR5cGUge1xuICBTaGVybG9ja0Nhc2UsXG4gIFNoZXJsb2NrQ29sbGVjdGlvbixcbiAgU2hlcmxvY2tFdmlkZW5jZSxcbiAgU2hlcmxvY2tFbnRpdHlUeXBlLFxuICBTaGVybG9ja1BsYWNlLFxuICBTaGVybG9ja1BsdWdpblNldHRpbmdzLFxuICBTaGVybG9ja1NjaGVkdWxlLFxuICBTaGVybG9ja1Rhc2ssXG4gIFNoZXJsb2NrV29ya3NwYWNlRGF0YVxufSBmcm9tIFwiLi90eXBlc1wiO1xuXG5jb25zdCBFTlRJVFlfVFlQRVM6IFNoZXJsb2NrRW50aXR5VHlwZVtdID0gW1wiY2FzZVwiLCBcInRhc2tcIiwgXCJzY2hlZHVsZVwiLCBcImNvbGxlY3Rpb25cIiwgXCJldmlkZW5jZVwiLCBcInBsYWNlXCJdO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZW5zdXJlRm9sZGVycyhhcHA6IEFwcCwgc2V0dGluZ3M6IFNoZXJsb2NrUGx1Z2luU2V0dGluZ3MpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgZm9sZGVycyA9IFtcbiAgICBzZXR0aW5ncy5jYXNlRm9sZGVyLFxuICAgIHNldHRpbmdzLnRhc2tGb2xkZXIsXG4gICAgc2V0dGluZ3Muc2NoZWR1bGVGb2xkZXIsXG4gICAgc2V0dGluZ3MuY29sbGVjdGlvbkZvbGRlcixcbiAgICBzZXR0aW5ncy5ldmlkZW5jZUZvbGRlcixcbiAgICBzZXR0aW5ncy5wbGFjZUZvbGRlclxuICBdO1xuXG4gIGZvciAoY29uc3QgZm9sZGVyIG9mIGZvbGRlcnMpIHtcbiAgICBjb25zdCBub3JtYWxpemVkID0gbm9ybWFsaXplUGF0aChmb2xkZXIpO1xuICAgIGNvbnN0IHNlZ21lbnRzID0gbm9ybWFsaXplZC5zcGxpdChcIi9cIikuZmlsdGVyKEJvb2xlYW4pO1xuICAgIGxldCBjdXJyZW50ID0gXCJcIjtcblxuICAgIGZvciAoY29uc3Qgc2VnbWVudCBvZiBzZWdtZW50cykge1xuICAgICAgY3VycmVudCA9IGN1cnJlbnQgPyBgJHtjdXJyZW50fS8ke3NlZ21lbnR9YCA6IHNlZ21lbnQ7XG4gICAgICBjb25zdCBjdXJyZW50UGF0aCA9IG5vcm1hbGl6ZVBhdGgoY3VycmVudCk7XG4gICAgICBpZiAoYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChjdXJyZW50UGF0aCkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGFwcC52YXVsdC5jcmVhdGVGb2xkZXIoY3VycmVudFBhdGgpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcbiAgICAgICAgaWYgKCFtZXNzYWdlLmluY2x1ZGVzKFwiRm9sZGVyIGFscmVhZHkgZXhpc3RzXCIpKSB7XG4gICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkRnJvbnRtYXR0ZXIodHlwZTogU2hlcmxvY2tFbnRpdHlUeXBlLCB0aXRsZTogc3RyaW5nLCBleHRyYXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fSk6IHN0cmluZyB7XG4gIGNvbnN0IGNyZWF0ZWQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gIGNvbnN0IGxpbmVzID0gW1xuICAgIFwiLS0tXCIsXG4gICAgYHR5cGU6ICR7dHlwZX1gLFxuICAgIGB0aXRsZTogXCIke3RpdGxlLnJlcGxhY2UoL1wiL2csICdcXFxcXCInKX1cImAsXG4gICAgYGNyZWF0ZWQ6ICR7Y3JlYXRlZH1gLFxuICAgIGB1cGRhdGVkOiAke2NyZWF0ZWR9YFxuICBdO1xuXG4gIE9iamVjdC5lbnRyaWVzKGV4dHJhcykuZm9yRWFjaCgoW2tleSwgdmFsdWVdKSA9PiB7XG4gICAgbGluZXMucHVzaChgJHtrZXl9OiAke3ZhbHVlfWApO1xuICB9KTtcblxuICBsaW5lcy5wdXNoKFwiLS0tXCIsIFwiXCIpO1xuICByZXR1cm4gbGluZXMuam9pbihcIlxcblwiKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQ2FzZVRlbXBsYXRlKHRpdGxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYCR7YnVpbGRGcm9udG1hdHRlcihcImNhc2VcIiwgdGl0bGUsIHtcbiAgICBzdGF0dXM6IFwib3BlblwiLFxuICAgIHByaW9yaXR5OiBcIm1lZGl1bVwiLFxuICAgIHRhZ3M6IFwiW11cIlxuICB9KX0jICR7dGl0bGV9XG5cbiMjIFx1Njg0OFx1NjBDNVx1Njk4Mlx1ODlDOFxuLSBcdTgwQ0NcdTY2NkZcdUZGMUFcbi0gXHU1RjUzXHU1MjREXHU3NkVFXHU2ODA3XHVGRjFBXG4tIFx1NEUwQlx1NEUwMFx1NkI2NVx1NjNBOFx1NzQwNlx1RkYxQVxuXG4jIyBcdTc2RjhcdTUxNzNcdTdFQkZcdTdEMjJcbi0gXG5cbiMjIFx1NTE3M1x1ODA1NFx1OEQ0NFx1NjU5OVxuLSBcbmA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFRhc2tUZW1wbGF0ZSh0aXRsZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGAke2J1aWxkRnJvbnRtYXR0ZXIoXCJ0YXNrXCIsIHRpdGxlLCB7XG4gICAgc3RhdHVzOiBcImJhY2tsb2dcIixcbiAgICBwcmlvcml0eTogXCJtZWRpdW1cIixcbiAgICBjYXNlOiAnXCJcIicsXG4gICAgY2FzZVBhdGg6ICdcIlwiJ1xuICB9KX0jICR7dGl0bGV9XG5cbiMjIFx1NEVGQlx1NTJBMVx1OEJGNFx1NjYwRVxuLSBcblxuIyMgXHU2MjQwXHU1QzVFXHU2ODQ4XHU0RUY2XG4tIFxuYDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkU2NoZWR1bGVUZW1wbGF0ZSh0aXRsZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGAke2J1aWxkRnJvbnRtYXR0ZXIoXCJzY2hlZHVsZVwiLCB0aXRsZSwge1xuICAgIGRheTogYFwiJHtmb3JtYXRMb2NhbERhdGUobmV3IERhdGUoKSl9XCJgLFxuICAgIHN0YXJ0OiAnXCIwOTowMFwiJyxcbiAgICBlbmQ6ICdcIjEwOjAwXCInLFxuICAgIGR1cmF0aW9uTWludXRlczogXCI2MFwiLFxuICAgIHJlbGF0ZWRUYXNrOiAnXCJcIicsXG4gICAgcmVsYXRlZFRhc2tQYXRoOiAnXCJcIidcbiAgfSl9IyAke3RpdGxlfVxuXG4jIyBcdThDMDNcdTY3RTVcdTVCODlcdTYzOTJcbi0gXHU3NkVFXHU2ODA3XHVGRjFBXG4tIFx1NTFDNlx1NTkwN1x1NEU4Qlx1OTg3OVx1RkYxQVxuYDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQ29sbGVjdGlvblRlbXBsYXRlKHRpdGxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYCR7YnVpbGRGcm9udG1hdHRlcihcImNvbGxlY3Rpb25cIiwgdGl0bGUsIHtcbiAgICBzdGF0dXM6IFwicmVhZGluZ1wiLFxuICAgIG1lZGl1bTogXCJib29rXCIsXG4gICAgY2FzZTogJ1wiXCInLFxuICAgIGNhc2VQYXRoOiAnXCJcIicsXG4gICAgcmF0aW5nOiBcIjBcIlxuICB9KX0jICR7dGl0bGV9XG5cbiMjIFx1NzgxNFx1OEJGQlx1OEJCMFx1NUY1NVxuLSBcdTY0NThcdTYyODRcdUZGMUFcbi0gXHU4OUMyXHU3MEI5XHVGRjFBXG4tIFx1NTkwRFx1NzZEOFx1RkYxQVxuXG4jIyBcdTY4NDhcdTRFRjZcdTUxNzNcdTgwNTRcbi0gXG5gO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRFdmlkZW5jZVRlbXBsYXRlKHRpdGxlOiBzdHJpbmcsIGNhc2VOYW1lID0gXCJcIiwgY2FzZVBhdGggPSBcIlwiKTogc3RyaW5nIHtcbiAgcmV0dXJuIGAke2J1aWxkRnJvbnRtYXR0ZXIoXCJldmlkZW5jZVwiLCB0aXRsZSwge1xuICAgIGNhc2U6IGBcIiR7Y2FzZU5hbWUucmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpfVwiYCxcbiAgICBjYXNlUGF0aDogYFwiJHtjYXNlUGF0aC5yZXBsYWNlKC9cIi9nLCAnXFxcXFwiJyl9XCJgLFxuICAgIHNvdXJjZTogJ1wiXCInXG4gIH0pfSMgJHt0aXRsZX1cblxuIyMgXHU4QkMxXHU3MjY5XHU4QkY0XHU2NjBFXG4tIFx1Njc2NVx1NkU5MFx1RkYxQVxuLSBcdTg5QzJcdTVCREZcdUZGMUFcbi0gXHU2M0E4XHU4QkJBXHVGRjFBXG5cbiMjIFx1NTE3M1x1ODA1NFx1Njg0OFx1NEVGNlxuLSAke2Nhc2VOYW1lIHx8IFwiXHU2NzJBXHU1MTczXHU4MDU0XCJ9XG5gO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRQbGFjZVRlbXBsYXRlKFxuICB0aXRsZTogc3RyaW5nLFxuICBsYXRpdHVkZT86IG51bWJlcixcbiAgbG9uZ2l0dWRlPzogbnVtYmVyLFxuICBsYXRpdHVkZUhlbWlzcGhlcmUgPSBcIlwiLFxuICBsb25naXR1ZGVIZW1pc3BoZXJlID0gXCJcIlxuKTogc3RyaW5nIHtcbiAgcmV0dXJuIGAke2J1aWxkRnJvbnRtYXR0ZXIoXCJwbGFjZVwiLCB0aXRsZSwge1xuICAgIGNpdHk6IGBcIiR7dGl0bGUucmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpfVwiYCxcbiAgICBjb3VudHJ5OiAnXCJcIicsXG4gICAgbGF0aXR1ZGU6IGxhdGl0dWRlID09PSB1bmRlZmluZWQgPyAnXCJcIicgOiBTdHJpbmcobGF0aXR1ZGUpLFxuICAgIGxvbmdpdHVkZTogbG9uZ2l0dWRlID09PSB1bmRlZmluZWQgPyAnXCJcIicgOiBTdHJpbmcobG9uZ2l0dWRlKSxcbiAgICBsYXRpdHVkZUhlbWlzcGhlcmU6IGBcIiR7bGF0aXR1ZGVIZW1pc3BoZXJlfVwiYCxcbiAgICBsb25naXR1ZGVIZW1pc3BoZXJlOiBgXCIke2xvbmdpdHVkZUhlbWlzcGhlcmV9XCJgLFxuICAgIHZpc2l0ZWRBdDogYFwiJHtmb3JtYXRMb2NhbERhdGUobmV3IERhdGUoKSl9XCJgLFxuICAgIGNvdmVyOiAnXCJcIicsXG4gICAgY2FzZTogJ1wiXCInLFxuICAgIGNhc2VQYXRoOiAnXCJcIidcbiAgfSl9IyAke3RpdGxlfVxuXG4jIyBcdTUyMzBcdThCQkZcdThCQjBcdTVGNTVcbi0gXHU2NUY2XHU5NUY0XHVGRjFBXG4tIFx1NzE2N1x1NzI0N1x1RkYxQVxuLSBcdThCQjBcdTVGQzZcdUZGMUFcblxuIyMgXHU1MTczXHU4MDU0XG4tIFxuYDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNvbGxlY3RXb3Jrc3BhY2VEYXRhKGFwcDogQXBwKTogUHJvbWlzZTxTaGVybG9ja1dvcmtzcGFjZURhdGE+IHtcbiAgY29uc3QgZmlsZXMgPSBhcHAudmF1bHQuZ2V0TWFya2Rvd25GaWxlcygpO1xuICBjb25zdCBjYXNlczogU2hlcmxvY2tDYXNlW10gPSBbXTtcbiAgY29uc3QgdGFza3M6IFNoZXJsb2NrVGFza1tdID0gW107XG4gIGNvbnN0IHNjaGVkdWxlczogU2hlcmxvY2tTY2hlZHVsZVtdID0gW107XG4gIGNvbnN0IGNvbGxlY3Rpb25zOiBTaGVybG9ja0NvbGxlY3Rpb25bXSA9IFtdO1xuICBjb25zdCBldmlkZW5jZTogU2hlcmxvY2tFdmlkZW5jZVtdID0gW107XG4gIGNvbnN0IHBsYWNlczogU2hlcmxvY2tQbGFjZVtdID0gW107XG5cbiAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgY29uc3QgY2FjaGUgPSBhcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk7XG4gICAgY29uc3QgZnJvbnRtYXR0ZXIgPSBjYWNoZT8uZnJvbnRtYXR0ZXI7XG4gICAgY29uc3QgdHlwZSA9IGZyb250bWF0dGVyPy50eXBlO1xuXG4gICAgaWYgKCFFTlRJVFlfVFlQRVMuaW5jbHVkZXModHlwZSkpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGNvbnN0IGJhc2UgPSB7XG4gICAgICBmaWxlUGF0aDogZmlsZS5wYXRoLFxuICAgICAgbmFtZTogU3RyaW5nKGZyb250bWF0dGVyPy50aXRsZSA/PyBmaWxlLmJhc2VuYW1lKSxcbiAgICAgIHR5cGUsXG4gICAgICBjcmVhdGVkOiBhc1N0cmluZyhmcm9udG1hdHRlcj8uY3JlYXRlZCksXG4gICAgICB1cGRhdGVkOiBhc1N0cmluZyhmcm9udG1hdHRlcj8udXBkYXRlZClcbiAgICB9O1xuXG4gICAgaWYgKHR5cGUgPT09IFwiY2FzZVwiKSB7XG4gICAgICBjYXNlcy5wdXNoKHtcbiAgICAgICAgLi4uYmFzZSxcbiAgICAgICAgdHlwZSxcbiAgICAgICAgc3RhdHVzOiBhc0Nhc2VTdGF0dXMoZnJvbnRtYXR0ZXI/LnN0YXR1cyksXG4gICAgICAgIHByaW9yaXR5OiBhc1ByaW9yaXR5KGZyb250bWF0dGVyPy5wcmlvcml0eSksXG4gICAgICAgIGRlYWRsaW5lOiBhc1N0cmluZyhmcm9udG1hdHRlcj8uZGVhZGxpbmUpLFxuICAgICAgICB0YWdzOiBBcnJheS5pc0FycmF5KGZyb250bWF0dGVyPy50YWdzKSA/IGZyb250bWF0dGVyLnRhZ3MubWFwKFN0cmluZykgOiBbXVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGUgPT09IFwidGFza1wiKSB7XG4gICAgICB0YXNrcy5wdXNoKHtcbiAgICAgICAgLi4uYmFzZSxcbiAgICAgICAgdHlwZSxcbiAgICAgICAgc3RhdHVzOiBhc1Rhc2tTdGF0dXMoZnJvbnRtYXR0ZXI/LnN0YXR1cyksXG4gICAgICAgIGNhc2U6IGFzU3RyaW5nKGZyb250bWF0dGVyPy5jYXNlKSxcbiAgICAgICAgY2FzZVBhdGg6IGFzU3RyaW5nKGZyb250bWF0dGVyPy5jYXNlUGF0aCksXG4gICAgICAgIHByaW9yaXR5OiBhc1ByaW9yaXR5KGZyb250bWF0dGVyPy5wcmlvcml0eSksXG4gICAgICAgIGR1ZTogYXNTdHJpbmcoZnJvbnRtYXR0ZXI/LmR1ZSlcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0eXBlID09PSBcInNjaGVkdWxlXCIpIHtcbiAgICAgIHNjaGVkdWxlcy5wdXNoKHtcbiAgICAgICAgLi4uYmFzZSxcbiAgICAgICAgdHlwZSxcbiAgICAgICAgZGF5OiBhc1N0cmluZyhmcm9udG1hdHRlcj8uZGF5KSxcbiAgICAgICAgc3RhcnQ6IGFzU3RyaW5nKGZyb250bWF0dGVyPy5zdGFydCksXG4gICAgICAgIGVuZDogYXNTdHJpbmcoZnJvbnRtYXR0ZXI/LmVuZCksXG4gICAgICAgIGR1cmF0aW9uTWludXRlczogYXNOdW1iZXIoZnJvbnRtYXR0ZXI/LmR1cmF0aW9uTWludXRlcyksXG4gICAgICAgIHJlbGF0ZWRUYXNrOiBhc1N0cmluZyhmcm9udG1hdHRlcj8ucmVsYXRlZFRhc2spLFxuICAgICAgICByZWxhdGVkVGFza1BhdGg6IGFzU3RyaW5nKGZyb250bWF0dGVyPy5yZWxhdGVkVGFza1BhdGgpXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAodHlwZSA9PT0gXCJjb2xsZWN0aW9uXCIpIHtcbiAgICAgIGNvbGxlY3Rpb25zLnB1c2goe1xuICAgICAgICAuLi5iYXNlLFxuICAgICAgICB0eXBlLFxuICAgICAgICBzdGF0dXM6IGFzQ29sbGVjdGlvblN0YXR1cyhmcm9udG1hdHRlcj8uc3RhdHVzKSxcbiAgICAgICAgbWVkaXVtOiBhc0NvbGxlY3Rpb25NZWRpdW0oZnJvbnRtYXR0ZXI/Lm1lZGl1bSksXG4gICAgICAgIGNhc2U6IGFzU3RyaW5nKGZyb250bWF0dGVyPy5jYXNlKSxcbiAgICAgICAgY2FzZVBhdGg6IGFzU3RyaW5nKGZyb250bWF0dGVyPy5jYXNlUGF0aCksXG4gICAgICAgIHJhdGluZzogYXNOdW1iZXIoZnJvbnRtYXR0ZXI/LnJhdGluZylcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0eXBlID09PSBcImV2aWRlbmNlXCIpIHtcbiAgICAgIGV2aWRlbmNlLnB1c2goe1xuICAgICAgICAuLi5iYXNlLFxuICAgICAgICB0eXBlLFxuICAgICAgICBjYXNlOiBhc1N0cmluZyhmcm9udG1hdHRlcj8uY2FzZSksXG4gICAgICAgIGNhc2VQYXRoOiBhc1N0cmluZyhmcm9udG1hdHRlcj8uY2FzZVBhdGgpLFxuICAgICAgICBzb3VyY2U6IGFzU3RyaW5nKGZyb250bWF0dGVyPy5zb3VyY2UpXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAodHlwZSA9PT0gXCJwbGFjZVwiKSB7XG4gICAgICBwbGFjZXMucHVzaCh7XG4gICAgICAgIC4uLmJhc2UsXG4gICAgICAgIHR5cGUsXG4gICAgICAgIGNpdHk6IGFzU3RyaW5nKGZyb250bWF0dGVyPy5jaXR5KSxcbiAgICAgICAgY291bnRyeTogYXNTdHJpbmcoZnJvbnRtYXR0ZXI/LmNvdW50cnkpLFxuICAgICAgICBsYXRpdHVkZTogYXNOdW1iZXIoZnJvbnRtYXR0ZXI/LmxhdGl0dWRlKSxcbiAgICAgICAgbG9uZ2l0dWRlOiBhc051bWJlcihmcm9udG1hdHRlcj8ubG9uZ2l0dWRlKSxcbiAgICAgICAgdmlzaXRlZEF0OiBhc1N0cmluZyhmcm9udG1hdHRlcj8udmlzaXRlZEF0KSxcbiAgICAgICAgY292ZXI6IGFzU3RyaW5nKGZyb250bWF0dGVyPy5jb3ZlciksXG4gICAgICAgIGNhc2U6IGFzU3RyaW5nKGZyb250bWF0dGVyPy5jYXNlKSxcbiAgICAgICAgY2FzZVBhdGg6IGFzU3RyaW5nKGZyb250bWF0dGVyPy5jYXNlUGF0aClcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGNhc2VzLnNvcnQoYnlVcGRhdGVkRGVzYyk7XG4gIHRhc2tzLnNvcnQoYnlVcGRhdGVkRGVzYyk7XG4gIHNjaGVkdWxlcy5zb3J0KGJ5VXBkYXRlZERlc2MpO1xuICBjb2xsZWN0aW9ucy5zb3J0KGJ5VXBkYXRlZERlc2MpO1xuICBldmlkZW5jZS5zb3J0KGJ5VXBkYXRlZERlc2MpO1xuICBwbGFjZXMuc29ydChieVVwZGF0ZWREZXNjKTtcblxuICByZXR1cm4geyBjYXNlcywgdGFza3MsIHNjaGVkdWxlcywgY29sbGVjdGlvbnMsIGV2aWRlbmNlLCBwbGFjZXMgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdExvY2FsRGF0ZShkYXRlOiBEYXRlKTogc3RyaW5nIHtcbiAgY29uc3QgeWVhciA9IGRhdGUuZ2V0RnVsbFllYXIoKTtcbiAgY29uc3QgbW9udGggPSBTdHJpbmcoZGF0ZS5nZXRNb250aCgpICsgMSkucGFkU3RhcnQoMiwgXCIwXCIpO1xuICBjb25zdCBkYXkgPSBTdHJpbmcoZGF0ZS5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIFwiMFwiKTtcbiAgcmV0dXJuIGAke3llYXJ9LSR7bW9udGh9LSR7ZGF5fWA7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVUeXBlZE5vdGUoXG4gIGFwcDogQXBwLFxuICBmb2xkZXI6IHN0cmluZyxcbiAgdGl0bGU6IHN0cmluZyxcbiAgdGVtcGxhdGU6IHN0cmluZ1xuKTogUHJvbWlzZTxURmlsZT4ge1xuICBjb25zdCBzYWZlTmFtZSA9IHRpdGxlLnJlcGxhY2UoL1tcXFxcLzoqP1wiPD58XS9nLCBcIi1cIikudHJpbSgpIHx8IFwiVW50aXRsZWRcIjtcbiAgY29uc3QgZmlsZVBhdGggPSBub3JtYWxpemVQYXRoKGAke2ZvbGRlcn0vJHtzYWZlTmFtZX0ubWRgKTtcbiAgY29uc3QgZXhpc3RpbmcgPSBhcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGZpbGVQYXRoKTtcbiAgaWYgKGV4aXN0aW5nIGluc3RhbmNlb2YgVEZpbGUpIHtcbiAgICByZXR1cm4gZXhpc3Rpbmc7XG4gIH1cbiAgcmV0dXJuIGFwcC52YXVsdC5jcmVhdGUoZmlsZVBhdGgsIHRlbXBsYXRlKTtcbn1cblxuZnVuY3Rpb24gYXNTdHJpbmcodmFsdWU6IHVua25vd24pOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gdmFsdWUgOiB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIGFzUHJpb3JpdHkodmFsdWU6IHVua25vd24pOiBcImxvd1wiIHwgXCJtZWRpdW1cIiB8IFwiaGlnaFwiIHwgdW5kZWZpbmVkIHtcbiAgcmV0dXJuIHZhbHVlID09PSBcImxvd1wiIHx8IHZhbHVlID09PSBcIm1lZGl1bVwiIHx8IHZhbHVlID09PSBcImhpZ2hcIiA/IHZhbHVlIDogdW5kZWZpbmVkO1xufVxuXG5mdW5jdGlvbiBhc051bWJlcih2YWx1ZTogdW5rbm93bik6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gIGlmICh0eXBlb2YgdmFsdWUgPT09IFwibnVtYmVyXCIpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIikge1xuICAgIGNvbnN0IHBhcnNlZCA9IE51bWJlcih2YWx1ZSk7XG4gICAgcmV0dXJuIE51bWJlci5pc0Zpbml0ZShwYXJzZWQpID8gcGFyc2VkIDogdW5kZWZpbmVkO1xuICB9XG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIGFzQ2FzZVN0YXR1cyh2YWx1ZTogdW5rbm93bik6IFwib3BlblwiIHwgXCJhY3RpdmVcIiB8IFwiYXJjaGl2ZWRcIiB7XG4gIHJldHVybiB2YWx1ZSA9PT0gXCJhY3RpdmVcIiB8fCB2YWx1ZSA9PT0gXCJhcmNoaXZlZFwiID8gdmFsdWUgOiBcIm9wZW5cIjtcbn1cblxuZnVuY3Rpb24gYXNUYXNrU3RhdHVzKHZhbHVlOiB1bmtub3duKTogXCJiYWNrbG9nXCIgfCBcInNjaGVkdWxlZFwiIHwgXCJkb25lXCIge1xuICByZXR1cm4gdmFsdWUgPT09IFwic2NoZWR1bGVkXCIgfHwgdmFsdWUgPT09IFwiZG9uZVwiID8gdmFsdWUgOiBcImJhY2tsb2dcIjtcbn1cblxuZnVuY3Rpb24gYXNDb2xsZWN0aW9uU3RhdHVzKHZhbHVlOiB1bmtub3duKTogXCJxdWV1ZWRcIiB8IFwicmVhZGluZ1wiIHwgXCJmaW5pc2hlZFwiIHwgdW5kZWZpbmVkIHtcbiAgcmV0dXJuIHZhbHVlID09PSBcInF1ZXVlZFwiIHx8IHZhbHVlID09PSBcInJlYWRpbmdcIiB8fCB2YWx1ZSA9PT0gXCJmaW5pc2hlZFwiID8gdmFsdWUgOiB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIGFzQ29sbGVjdGlvbk1lZGl1bSh2YWx1ZTogdW5rbm93bik6IFwiYm9va1wiIHwgXCJtb3ZpZVwiIHwgXCJzZXJpZXNcIiB8IFwiYWxidW1cIiB8IFwiYXJ0aWNsZVwiIHwgXCJvdGhlclwiIHwgdW5kZWZpbmVkIHtcbiAgcmV0dXJuIHZhbHVlID09PSBcImJvb2tcIiB8fCB2YWx1ZSA9PT0gXCJtb3ZpZVwiIHx8IHZhbHVlID09PSBcInNlcmllc1wiIHx8IHZhbHVlID09PSBcImFsYnVtXCIgfHwgdmFsdWUgPT09IFwiYXJ0aWNsZVwiIHx8IHZhbHVlID09PSBcIm90aGVyXCJcbiAgICA/IHZhbHVlXG4gICAgOiB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIGJ5VXBkYXRlZERlc2M8VCBleHRlbmRzIHsgdXBkYXRlZD86IHN0cmluZyB9PihhOiBULCBiOiBUKTogbnVtYmVyIHtcbiAgcmV0dXJuIChiLnVwZGF0ZWQgPz8gXCJcIikubG9jYWxlQ29tcGFyZShhLnVwZGF0ZWQgPz8gXCJcIik7XG59XG4iLCAiaW1wb3J0IHsgQXBwLCBQbHVnaW5TZXR0aW5nVGFiLCBTZXR0aW5nIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgdHlwZSBTaGVybG9ja09TUGx1Z2luIGZyb20gXCIuL21haW5cIjtcblxuZXhwb3J0IGNsYXNzIFNoZXJsb2NrU2V0dGluZ1RhYiBleHRlbmRzIFBsdWdpblNldHRpbmdUYWIge1xuICBwbHVnaW46IFNoZXJsb2NrT1NQbHVnaW47XG5cbiAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogU2hlcmxvY2tPU1BsdWdpbikge1xuICAgIHN1cGVyKGFwcCwgcGx1Z2luKTtcbiAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgfVxuXG4gIGRpc3BsYXkoKTogdm9pZCB7XG4gICAgY29uc3QgeyBjb250YWluZXJFbCB9ID0gdGhpcztcbiAgICBjb250YWluZXJFbC5lbXB0eSgpO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIlNoZXJsb2NrIE9TIFNldHRpbmdzXCIgfSk7XG5cbiAgICB0aGlzLmFkZFRleHRTZXR0aW5nKGNvbnRhaW5lckVsLCBcIlx1Njg0OFx1NEVGNlx1NjU4N1x1NEVGNlx1NTkzOVwiLCB0aGlzLnBsdWdpbi5zZXR0aW5ncy5jYXNlRm9sZGVyLCBhc3luYyAodmFsdWUpID0+IHtcbiAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmNhc2VGb2xkZXIgPSB2YWx1ZS50cmltKCkgfHwgXCJTaGVybG9jayBPUy9DYXNlc1wiO1xuICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgfSk7XG5cbiAgICB0aGlzLmFkZFRleHRTZXR0aW5nKGNvbnRhaW5lckVsLCBcIlx1NEVGQlx1NTJBMVx1NjU4N1x1NEVGNlx1NTkzOVwiLCB0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXNrRm9sZGVyLCBhc3luYyAodmFsdWUpID0+IHtcbiAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnRhc2tGb2xkZXIgPSB2YWx1ZS50cmltKCkgfHwgXCJTaGVybG9jayBPUy9UYXNrc1wiO1xuICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgfSk7XG5cbiAgICB0aGlzLmFkZFRleHRTZXR0aW5nKGNvbnRhaW5lckVsLCBcIlx1NjM5Mlx1NjcxRlx1NjU4N1x1NEVGNlx1NTkzOVwiLCB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zY2hlZHVsZUZvbGRlciwgYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zY2hlZHVsZUZvbGRlciA9IHZhbHVlLnRyaW0oKSB8fCBcIlNoZXJsb2NrIE9TL1NjaGVkdWxlc1wiO1xuICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgfSk7XG5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiXHU5NkZFXHU2QzE0XHU1RjNBXHU1RUE2XCIpXG4gICAgICAuc2V0RGVzYyhcIlx1NjNBN1x1NTIzNlx1OTk5Nlx1OTg3NVx1NkMxQlx1NTZGNFx1NUM0Mlx1NzY4NFx1NUI1OFx1NTcyOFx1NjExRlx1MzAwMlwiKVxuICAgICAgLmFkZFNsaWRlcigoc2xpZGVyKSA9PlxuICAgICAgICBzbGlkZXIuc2V0TGltaXRzKDAsIDEwMCwgMSkuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZm9nRGVuc2l0eSkuc2V0RHluYW1pY1Rvb2x0aXAoKS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5mb2dEZW5zaXR5ID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pXG4gICAgICApO1xuXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIlx1NTJBOFx1NjAwMVx1NUYzQVx1NUVBNlwiKVxuICAgICAgLnNldERlc2MoXCJcdTRFM0FcdTU0MEVcdTdFRURcdTk5OTZcdTk4NzVcdTUyQThcdTYwMDFcdTU0OENcdTU0NjhcdTYzOTJcdTY3MUZcdTUyQThcdTc1M0JcdTk4ODRcdTc1NTlcdTMwMDJcIilcbiAgICAgIC5hZGRTbGlkZXIoKHNsaWRlcikgPT5cbiAgICAgICAgc2xpZGVyLnNldExpbWl0cygwLCAxMDAsIDEpLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLm1vdGlvbkludGVuc2l0eSkuc2V0RHluYW1pY1Rvb2x0aXAoKS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5tb3Rpb25JbnRlbnNpdHkgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSlcbiAgICAgICk7XG4gIH1cblxuICBwcml2YXRlIGFkZFRleHRTZXR0aW5nKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCwgbmFtZTogc3RyaW5nLCB2YWx1ZTogc3RyaW5nLCBvbkNoYW5nZTogKHZhbHVlOiBzdHJpbmcpID0+IFByb21pc2U8dm9pZD4pOiB2b2lkIHtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKG5hbWUpXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT4gdGV4dC5zZXRQbGFjZWhvbGRlcih2YWx1ZSkuc2V0VmFsdWUodmFsdWUpLm9uQ2hhbmdlKG9uQ2hhbmdlKSk7XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBJdGVtVmlldywgTm90aWNlLCBURmlsZSwgV29ya3NwYWNlTGVhZiB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHR5cGUgU2hlcmxvY2tPU1BsdWdpbiBmcm9tIFwiLi9tYWluXCI7XG5pbXBvcnQgdHlwZSB7IFNoZXJsb2NrQ2FzZSwgU2hlcmxvY2tQbGFjZSwgU2hlcmxvY2tTY2hlZHVsZSwgU2hlcmxvY2tUYXNrLCBTaGVybG9ja1dvcmtzcGFjZURhdGEgfSBmcm9tIFwiLi90eXBlc1wiO1xuXG5leHBvcnQgY29uc3QgU0hFUkxPQ0tfVklFV19UWVBFID0gXCJzaGVybG9jay1vcy1kYXNoYm9hcmRcIjtcbmV4cG9ydCBjb25zdCBMRUdBQ1lfU0hFUkxPQ0tfVklFV19UWVBFID0gXCJzaGVybG9jay1vcy13b3Jrc3BhY2VcIjtcbnR5cGUgU2hlcmxvY2tTY3JlZW4gPSBcImVudHJ5XCIgfCBcImhvbWVcIiB8IFwiY2FzZXNcIiB8IFwicmVhZGluZ1wiIHwgXCJmb290cHJpbnRzXCIgfCBcImNhc2VcIjtcbnR5cGUgU2hlcmxvY2tFdmlkZW5jZUtpbmQgPSBcIm1hcmtkb3duXCIgfCBcInBkZlwiIHwgXCJpbWFnZVwiIHwgXCJsb2NhbFwiO1xuaW50ZXJmYWNlIFNoZXJsb2NrRXZpZGVuY2VJdGVtIHtcbiAgZmlsZTogVEZpbGU7XG4gIGtpbmQ6IFNoZXJsb2NrRXZpZGVuY2VLaW5kO1xufVxuXG5jb25zdCBFTlRSWV9UUkFOU0lUSU9OX01TID0gMjYwMDtcbmNvbnN0IERFRkFVTFRfU0NIRURVTEVfRFVSQVRJT05fTUlOVVRFUyA9IDYwO1xuY29uc3QgTUFQX0NFTlRFUl9MT05HSVRVREUgPSAxMDU7XG5jb25zdCBXRUVLX0RBWVMgPSBbXG4gIHsgbGFiZWw6IFwiTW9uXCIsIG9mZnNldDogMCB9LFxuICB7IGxhYmVsOiBcIlR1ZVwiLCBvZmZzZXQ6IDEgfSxcbiAgeyBsYWJlbDogXCJXZWRcIiwgb2Zmc2V0OiAyIH0sXG4gIHsgbGFiZWw6IFwiVGh1XCIsIG9mZnNldDogMyB9LFxuICB7IGxhYmVsOiBcIkZyaVwiLCBvZmZzZXQ6IDQgfSxcbiAgeyBsYWJlbDogXCJTYXRcIiwgb2Zmc2V0OiA1IH0sXG4gIHsgbGFiZWw6IFwiU3VuXCIsIG9mZnNldDogNiB9XG5dIGFzIGNvbnN0O1xuY29uc3QgVElNRV9TTE9UUyA9IFtcIjA4OjAwXCIsIFwiMTA6MDBcIiwgXCIxMjowMFwiLCBcIjE0OjAwXCIsIFwiMTY6MDBcIiwgXCIxOTowMFwiXTtcblxuZXhwb3J0IGNsYXNzIFNoZXJsb2NrV29ya3NwYWNlVmlldyBleHRlbmRzIEl0ZW1WaWV3IHtcbiAgcGx1Z2luOiBTaGVybG9ja09TUGx1Z2luO1xuICBwcml2YXRlIHNjcmVlbjogU2hlcmxvY2tTY3JlZW4gPSBcImVudHJ5XCI7XG4gIHByaXZhdGUgc2VsZWN0ZWRDYXNlUGF0aD86IHN0cmluZztcbiAgcHJpdmF0ZSBoYXNFbnRlcmVkID0gZmFsc2U7XG4gIHByaXZhdGUgZW50cnlUaW1lcj86IG51bWJlcjtcblxuICBjb25zdHJ1Y3RvcihsZWFmOiBXb3Jrc3BhY2VMZWFmLCBwbHVnaW46IFNoZXJsb2NrT1NQbHVnaW4pIHtcbiAgICBzdXBlcihsZWFmKTtcbiAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgfVxuXG4gIGdldFZpZXdUeXBlKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIFNIRVJMT0NLX1ZJRVdfVFlQRTtcbiAgfVxuXG4gIGdldERpc3BsYXlUZXh0KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIFwiU2hlcmxvY2tcIjtcbiAgfVxuXG4gIGdldEljb24oKTogc3RyaW5nIHtcbiAgICByZXR1cm4gXCJzZWFyY2gtY2hlY2tcIjtcbiAgfVxuXG4gIGFzeW5jIG9uT3BlbigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICAgIHRoaXMuY29udGVudEVsLmFkZENsYXNzKFwic2hlcmxvY2stb3Mtdmlld1wiKTtcbiAgICAgIGF3YWl0IHRoaXMucmVzZXRUb0VudHJ5KCk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMucGx1Z2luLmRlYnVnTG9nKGB2aWV3Om9uT3BlbjplcnJvcjoke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5zdGFjayA/PyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgICAgIHRoaXMucmVuZGVyRmFsbGJhY2soZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIG9uQ2xvc2UoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMuZW50cnlUaW1lcikge1xuICAgICAgd2luZG93LmNsZWFyVGltZW91dCh0aGlzLmVudHJ5VGltZXIpO1xuICAgICAgdGhpcy5lbnRyeVRpbWVyID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHJlZnJlc2goKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMucmVuZGVyQ3VycmVudFNjcmVlbigpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLnBsdWdpbi5kZWJ1Z0xvZyhgdmlldzpyZWZyZXNoOmVycm9yOiR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLnN0YWNrID8/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgICAgdGhpcy5yZW5kZXJGYWxsYmFjayhlcnJvcik7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcmVzZXRUb0VudHJ5KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICh0aGlzLmVudHJ5VGltZXIpIHtcbiAgICAgIHdpbmRvdy5jbGVhclRpbWVvdXQodGhpcy5lbnRyeVRpbWVyKTtcbiAgICAgIHRoaXMuZW50cnlUaW1lciA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdGhpcy5zZWxlY3RlZENhc2VQYXRoID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuaGFzRW50ZXJlZCA9IGZhbHNlO1xuICAgIHRoaXMuc2NyZWVuID0gXCJlbnRyeVwiO1xuICAgIGF3YWl0IHRoaXMucmVuZGVyQ3VycmVudFNjcmVlbigpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyByZW5kZXJDdXJyZW50U2NyZWVuKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICh0aGlzLnNjcmVlbiA9PT0gXCJlbnRyeVwiICYmICF0aGlzLmhhc0VudGVyZWQpIHtcbiAgICAgIHRoaXMucmVuZGVyRW50cnlTY3JlZW4oKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5zY3JlZW4gPT09IFwiY2FzZVwiICYmIHRoaXMuc2VsZWN0ZWRDYXNlUGF0aCkge1xuICAgICAgYXdhaXQgdGhpcy5yZW5kZXJDYXNlV29ya3NwYWNlKHRoaXMuc2VsZWN0ZWRDYXNlUGF0aCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuc2NyZWVuID09PSBcImNhc2VzXCIpIHtcbiAgICAgIGF3YWl0IHRoaXMucmVuZGVyQ2FzZURlc2soKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5zY3JlZW4gPT09IFwicmVhZGluZ1wiKSB7XG4gICAgICBhd2FpdCB0aGlzLnJlbmRlclJlYWRpbmdEZXNrKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuc2NyZWVuID09PSBcImZvb3RwcmludHNcIikge1xuICAgICAgYXdhaXQgdGhpcy5yZW5kZXJGb290cHJpbnREZXNrKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5yZW5kZXJIb21lKCk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckVudHJ5U2NyZWVuKCk6IHZvaWQge1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgY29uc3QgaW1hZ2VVcmwgPSB0aGlzLnBsdWdpbi5nZXRFbnRyeUltYWdlVXJsKCk7XG4gICAgY29uc3QgZW50cnkgPSB0aGlzLmNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stZW50cnktc2NyZWVuIGlzLXdhcm1pbmdcIiB9KTtcbiAgICBlbnRyeS5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2UgPSBgbGluZWFyLWdyYWRpZW50KDE4MGRlZywgcmdiYSg3LCA5LCAxMSwgMC4wOCksIHJnYmEoNiwgNywgOCwgMC4yOCkpLCB1cmwoXCIke2ltYWdlVXJsfVwiKWA7XG4gICAgZW50cnkuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWVudHJ5LWFtYmllbnRcIiB9KTtcbiAgICBlbnRyeS5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stZW50cnktZnJhbWVcIiB9KTtcbiAgICBlbnRyeS5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stZW50cnktdmVpbFwiIH0pO1xuICAgIGNvbnN0IGJvb2tCdXR0b24gPSBlbnRyeS5jcmVhdGVFbChcImJ1dHRvblwiLCB7XG4gICAgICBjbHM6IFwic2hlcmxvY2stZW50cnktYm9va1wiLFxuICAgICAgYXR0cjoge1xuICAgICAgICBcImFyaWEtbGFiZWxcIjogXCJFbnRlciBTaGVybG9jayBPU1wiXG4gICAgICB9XG4gICAgfSk7XG4gICAgYm9va0J1dHRvbi5jcmVhdGVTcGFuKHsgY2xzOiBcInNoZXJsb2NrLWVudHJ5LXJpbmdcIiB9KTtcbiAgICBib29rQnV0dG9uLmNyZWF0ZVNwYW4oeyBjbHM6IFwic2hlcmxvY2stZW50cnktb3JiaXRcIiB9KTtcbiAgICBjb25zdCBjYXB0aW9uID0gZW50cnkuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWVudHJ5LWNhcHRpb25cIiB9KTtcbiAgICBjYXB0aW9uLmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IFwiU2hlcmxvY2tcIiB9KTtcbiAgICBjYXB0aW9uLmNyZWF0ZUVsKFwic21hbGxcIiwgeyB0ZXh0OiBcIjIyMUIgY2FzZSBjb25zb2xlXCIgfSk7XG4gICAgY29uc3QgaGludCA9IGVudHJ5LmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1lbnRyeS1oaW50XCIgfSk7XG4gICAgaGludC5zZXRUZXh0KFwiXHU3MEI5XHU1MUZCXHU0RTJEXHU1OTJFXHU1Mzc3XHU1Qjk3XHVGRjBDXHU3MEI5XHU0RUFFXHU2ODQ4XHU0RUY2XHU2ODRDXCIpO1xuXG4gICAgY29uc3QgcHJlbG9hZCA9IG5ldyBJbWFnZSgpO1xuICAgIHByZWxvYWQuc3JjID0gaW1hZ2VVcmw7XG4gICAgY29uc3QgaW1hZ2VSZWFkeSA9IHByZWxvYWQuZGVjb2RlID8gcHJlbG9hZC5kZWNvZGUoKSA6IFByb21pc2UucmVzb2x2ZSgpO1xuICAgIGltYWdlUmVhZHlcbiAgICAgIC50aGVuKCgpID0+IGVudHJ5LmFkZENsYXNzKFwiaXMtcmVhZHlcIikpXG4gICAgICAuY2F0Y2goKCkgPT4gZW50cnkuYWRkQ2xhc3MoXCJpcy1yZWFkeVwiKSk7XG5cbiAgICBsZXQgZW50ZXJpbmcgPSBmYWxzZTtcbiAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoYm9va0J1dHRvbiwgXCJjbGlja1wiLCAoKSA9PiB7XG4gICAgICBpZiAoZW50ZXJpbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgZW50ZXJpbmcgPSB0cnVlO1xuICAgICAgYm9va0J1dHRvbi5zZXRBdHRyaWJ1dGUoXCJkaXNhYmxlZFwiLCBcInRydWVcIik7XG4gICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgICAgZW50cnkucmVtb3ZlQ2xhc3MoXCJpcy13YXJtaW5nXCIpO1xuICAgICAgICBlbnRyeS5hZGRDbGFzcyhcImlzLWVudGVyaW5nXCIpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLmVudHJ5VGltZXIgPSB3aW5kb3cuc2V0VGltZW91dChhc3luYyAoKSA9PiB7XG4gICAgICAgIHRoaXMuaGFzRW50ZXJlZCA9IHRydWU7XG4gICAgICAgIHRoaXMuc2NyZWVuID0gXCJob21lXCI7XG4gICAgICAgIGF3YWl0IHRoaXMucmVuZGVySG9tZSgpO1xuICAgICAgfSwgRU5UUllfVFJBTlNJVElPTl9NUyk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlbmRlckhvbWUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5wbHVnaW4uZGVidWdMb2coXCJ2aWV3OnJlbmRlcjpzdGFydFwiKTtcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgdGhpcy5wbHVnaW4uZ2V0V29ya3NwYWNlRGF0YSgpO1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG5cbiAgICBjb25zdCBzaGVsbCA9IHRoaXMuY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1zaGVsbCBzaGVybG9jay1ob21lLXNoZWxsXCIgfSk7XG4gICAgc2hlbGwuZGF0YXNldC5wZXJpb2QgPSB0aGlzLnJlc29sdmVQZXJpb2QoKTtcbiAgICB0aGlzLmNyZWF0ZVBhcmxvckJhY2tkcm9wKHNoZWxsKTtcbiAgICBzaGVsbC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stYXRtb3NwaGVyZSBzaGVybG9jay1mb2ctbGF5ZXJcIiB9KTtcbiAgICBzaGVsbC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stYXRtb3NwaGVyZSBzaGVybG9jay1ncmFpbi1sYXllclwiIH0pO1xuICAgIHNoZWxsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1hdG1vc3BoZXJlIHNoZXJsb2NrLW1hcC1sYXllclwiIH0pO1xuICAgIGNvbnN0IGhlcm8gPSBzaGVsbC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2staGVybyBzaGVybG9jay1ob21lLWhlcm9cIiB9KTtcbiAgICBjb25zdCBjb3B5ID0gaGVyby5jcmVhdGVEaXYoKTtcbiAgICBjb3B5LmNyZWF0ZUVsKFwicFwiLCB7IGNsczogXCJzaGVybG9jay1raWNrZXJcIiwgdGV4dDogXCIyMjFCIEJha2VyIFN0cmVldCAvIEhvbWUgSGFsbFwiIH0pO1xuICAgIGNvcHkuY3JlYXRlRWwoXCJoMVwiLCB7IGNsczogXCJzaGVybG9jay10aXRsZVwiLCB0ZXh0OiBcIlNoZXJsb2NrXCIgfSk7XG4gICAgY29weS5jcmVhdGVFbChcInBcIiwge1xuICAgICAgY2xzOiBcInNoZXJsb2NrLWVkaXRvcmlhbC1ub3RlXCIsXG4gICAgICB0ZXh0OiB0aGlzLnJlc29sdmVQZXJpb2QoKSA9PT0gXCJuaWdodFwiXG4gICAgICAgID8gXCJcdTU5MUNcdTgyNzJcdTkxQ0NcdTc2ODRcdTRGMjZcdTY1NjZcdTY2RjRcdTkwMDJcdTU0MDhcdTYzQThcdTc0MDZcdTMwMDJcdTYyOEFcdTdFQkZcdTdEMjJcdTMwMDFcdTY1RTVcdTdBMEJcdTg4NjhcdTMwMDFcdTc4MTRcdTdBNzZcdTRFMEVcdTU2REVcdTVGQzZcdTY1NzRcdTc0MDZcdThGREJcdTU0MENcdTRFMDBcdTVGMjBcdTY4NDhcdTRFRjZcdTY4NENcdTMwMDJcIlxuICAgICAgICA6IFwiXHU3NjdEXHU2NjNDXHU5MDAyXHU1NDA4XHU1RjUyXHU2ODYzXHU0RTBFXHU2MzkyXHU3QTBCXHUzMDAyXHU4QkE5XHU0RjYwXHU3Njg0XHU3QjE0XHU4QkIwXHUzMDAxXHU0RThCXHU1MkExXHU0RTBFXHU4RDQ0XHU2NTk5XHU1MENGXHU2ODQ4XHU1Mzc3XHU0RTAwXHU2ODM3XHU4OEFCXHU3Q0ZCXHU3RURGXHU2NTc0XHU3NDA2XHUzMDAyXCJcbiAgICB9KTtcblxuICAgIGNvbnN0IGh1YiA9IHNoZWxsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1ob21lLWh1YlwiIH0pO1xuICAgIHRoaXMuY3JlYXRlSG9tZVBvcnRhbChodWIsIHtcbiAgICAgIGxhYmVsOiBcIlBST0pFQ1QgREVTS1wiLFxuICAgICAgdGl0bGU6IFwiXHU2ODQ4XHU0RUY2XHU1Mzc3XHU1Qjk3XHU0RTBFXHU4QzAzXHU2N0U1XHU2MzkyXHU2NzFGXCIsXG4gICAgICB0ZXh0OiBgXHU3QkExXHU3NDA2ICR7ZGF0YS5jYXNlcy5sZW5ndGh9IFx1NUI5N1x1Njg0OFx1NEVGNlx1MzAwMSR7ZGF0YS50YXNrcy5maWx0ZXIoKGl0ZW0pID0+IGl0ZW0uc3RhdHVzICE9PSBcImRvbmVcIikubGVuZ3RofSBcdTY3NjFcdTdFQkZcdTdEMjJcdTRFRkJcdTUyQTFcdTU0OEMgJHtkYXRhLnNjaGVkdWxlcy5sZW5ndGh9IFx1Njc2MVx1NjM5Mlx1NjcxRlx1MzAwMmAsXG4gICAgICBidXR0b246IFwiXHU2MjUzXHU1RjAwXHU2ODQ4XHU0RUY2XHU2ODRDXCIsXG4gICAgICBzY3JlZW46IFwiY2FzZXNcIixcbiAgICAgIHRvbmU6IFwiYm9hcmRcIlxuICAgIH0pO1xuICAgIHRoaXMuY3JlYXRlSG9tZVBvcnRhbChodWIsIHtcbiAgICAgIGxhYmVsOiBcIkFSQ0hJVkUgREVTS1wiLFxuICAgICAgdGl0bGU6IFwiXHU4QkMxXHU3MjY5XHU3ODE0XHU4QkZCXHU0RTBFXHU2ODYzXHU2ODQ4XHU2N0RDXCIsXG4gICAgICB0ZXh0OiBgXHU2QjYzXHU1NzI4XHU3ODE0XHU4QkZCICR7ZGF0YS5jb2xsZWN0aW9ucy5maWx0ZXIoKGl0ZW0pID0+IGl0ZW0uc3RhdHVzICE9PSBcImZpbmlzaGVkXCIpLmxlbmd0aH0gXHU5ODc5XHVGRjBDXHU4QkMxXHU3MjY5XHU2N0RDXHU1REYyXHU2NzA5ICR7ZGF0YS5ldmlkZW5jZS5sZW5ndGh9IFx1NEVGRFx1NTNFRlx1N0YxNlx1OEY5MVx1Njg2M1x1Njg0OFx1MzAwMmAsXG4gICAgICBidXR0b246IFwiXHU2MjUzXHU1RjAwXHU2ODYzXHU2ODQ4XHU2ODRDXCIsXG4gICAgICBzY3JlZW46IFwicmVhZGluZ1wiLFxuICAgICAgdG9uZTogXCJzdHVkeVwiXG4gICAgfSk7XG4gICAgdGhpcy5jcmVhdGVIb21lUG9ydGFsKGh1Yiwge1xuICAgICAgbGFiZWw6IFwiTUVNT1JZIE1BUFwiLFxuICAgICAgdGl0bGU6IFwiXHU4REIzXHU4RkY5XHU1NzMwXHU1NkZFXCIsXG4gICAgICB0ZXh0OiBgJHtkYXRhLnBsYWNlcy5sZW5ndGh9IFx1NEUyQVx1NTdDRVx1NUUwMlx1NTE0OVx1NzBCOVx1MzAwMlx1NkJDRlx1NkIyMVx1NTIzMFx1OEJCRlx1OTBGRFx1NTNFRlx1NEVFNVx1NkM4OVx1NkRDMFx1NjIxMFx1NzE2N1x1NzI0N1x1MzAwMVx1NjVFNVx1NjcxRlx1NEUwRVx1N0IxNFx1OEJCMFx1MzAwMmAsXG4gICAgICBidXR0b246IFwiXHU2MjUzXHU1RjAwXHU1NzMwXHU1NkZFXCIsXG4gICAgICBzY3JlZW46IFwiZm9vdHByaW50c1wiLFxuICAgICAgdG9uZTogXCJtYXBcIlxuICAgIH0pO1xuICAgIHRoaXMucGx1Z2luLmRlYnVnTG9nKFwidmlldzpyZW5kZXI6Y29tcGxldGVcIik7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlbmRlckNhc2VEZXNrKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCB0aGlzLnBsdWdpbi5nZXRXb3Jrc3BhY2VEYXRhKCk7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICBjb25zdCBzaGVsbCA9IHRoaXMuY3JlYXRlRGVza1NoZWxsKFwic2hlcmxvY2stY2FzZS1kZXNrLXNoZWxsXCIpO1xuICAgIHRoaXMucmVuZGVyRGVza0hlYWRlcihzaGVsbCwgXCJQcm9qZWN0IERlc2tcIiwgXCJcdTY4NDhcdTRFRjZcdTUzNzdcdTVCOTdcdTRFMEVcdThDMDNcdTY3RTVcdTYzOTJcdTY3MUZcIiwgXCJcdTY4NDhcdTRFRjZcdTMwMDFcdTRFRkJcdTUyQTFcdTU0OENcdTY3MkNcdTU0NjhcdThDMDNcdTY3RTVcdTYzOTJcdTY3MUZcdTY1M0VcdTU3MjhcdTU0MENcdTRFMDBcdTRFMkFcdTVERTVcdTRGNUNcdTUzRjBcdTkxQ0NcdUZGMENcdTUxNDhcdTkwMDlcdTY4NDhcdTRFRjZcdUZGMENcdTUxOERcdTYyOEFcdTc3MUZcdTZCNjNcdTg5ODFcdTYyNjdcdTg4NENcdTc2ODRcdTdFQkZcdTdEMjJcdTYyOTVcdTkwMTJcdTUyMzBcdTU0NjhcdTY3N0ZcdTMwMDJcIiwgW1xuICAgICAgeyBsYWJlbDogXCJcdTY1QjBcdTVFRkFcdTY4NDhcdTRFRjZcIiwgYWN0aW9uOiBhc3luYyAoKSA9PiB0aGlzLnBsdWdpbi5jcmVhdGVDYXNlTm90ZSgpIH0sXG4gICAgICB7IGxhYmVsOiBcIlx1NjVCMFx1NUVGQVx1NEVGQlx1NTJBMVwiLCBhY3Rpb246IGFzeW5jICgpID0+IHRoaXMucGx1Z2luLmNyZWF0ZVRhc2tOb3RlKCkgfSxcbiAgICAgIHsgbGFiZWw6IFwiXHU2NUIwXHU1RUZBXHU2MzkyXHU2NzFGXCIsIGFjdGlvbjogYXN5bmMgKCkgPT4gdGhpcy5wbHVnaW4uY3JlYXRlU2NoZWR1bGVOb3RlKCksIHNlY29uZGFyeTogdHJ1ZSB9XG4gICAgXSk7XG4gICAgY29uc3QgZ3JpZCA9IHNoZWxsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1ncmlkIHNoZXJsb2NrLWRlc2stZ3JpZFwiIH0pO1xuICAgIHRoaXMucmVuZGVyQ2FzZUJvYXJkKGdyaWQsIGRhdGEuY2FzZXMpO1xuICAgIHRoaXMucmVuZGVySW52ZXN0aWdhdGlvblNjaGVkdWxlcihncmlkLCBkYXRhKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcmVuZGVyUmVhZGluZ0Rlc2soKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHRoaXMucGx1Z2luLmdldFdvcmtzcGFjZURhdGEoKTtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIGNvbnN0IHNoZWxsID0gdGhpcy5jcmVhdGVEZXNrU2hlbGwoXCJzaGVybG9jay1yZWFkaW5nLWRlc2stc2hlbGxcIik7XG4gICAgdGhpcy5yZW5kZXJEZXNrSGVhZGVyKHNoZWxsLCBcIkFyY2hpdmUgRGVza1wiLCBcIlx1OEJDMVx1NzI2OVx1NzgxNFx1OEJGQlx1NEUwRVx1Njg2M1x1Njg0OFx1NjdEQ1wiLCBcIlx1NkI2M1x1NTcyOFx1OEJGQlx1MzAwMVx1NkI2M1x1NTcyOFx1NzcwQlx1MzAwMVx1NkI2M1x1NTcyOFx1NzgxNFx1N0E3Nlx1NzY4NFx1NTE4NVx1NUJCOVx1NTE0OFx1NzU1OVx1NTcyOFx1OEJDMVx1NzI2OVx1NzgxNFx1OEJGQlx1RkYxQlx1Nzg2RVx1OEJBNFx1NkM4OVx1NkRDMFx1NTQwRVx1RkYwQ1x1NEUwMFx1OTUyRVx1NUY1Mlx1NTE2NVx1OEJDMVx1NzI2OVx1NjdEQ1x1RkYwQ1x1NEU0Qlx1NTQwRVx1NEVDRFx1NTNFRlx1N0YxNlx1OEY5MVx1MzAwMVx1NTIyMFx1OTY2NFx1NTQ4Q1x1NTE3M1x1ODA1NFx1Njg0OFx1NEVGNlx1MzAwMlwiLCBbXG4gICAgICB7IGxhYmVsOiBcIlx1NjVCMFx1NUVGQVx1NzgxNFx1OEJGQlwiLCBhY3Rpb246IGFzeW5jICgpID0+IHRoaXMucGx1Z2luLmNyZWF0ZUNvbGxlY3Rpb25Ob3RlKCkgfSxcbiAgICAgIHsgbGFiZWw6IFwiXHU2NUIwXHU1RUZBXHU4QkMxXHU3MjY5XCIsIGFjdGlvbjogYXN5bmMgKCkgPT4gdGhpcy5wbHVnaW4uY3JlYXRlRXZpZGVuY2VOb3RlKCksIHNlY29uZGFyeTogdHJ1ZSB9XG4gICAgXSk7XG4gICAgY29uc3QgZ3JpZCA9IHNoZWxsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1ncmlkIHNoZXJsb2NrLWRlc2stZ3JpZFwiIH0pO1xuICAgIHRoaXMucmVuZGVyUmVhZGluZ01vZHVsZShncmlkLCBkYXRhKTtcbiAgICB0aGlzLnJlbmRlckFyY2hpdmVNb2R1bGUoZ3JpZCwgZGF0YSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlbmRlckZvb3RwcmludERlc2soKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHRoaXMucGx1Z2luLmdldFdvcmtzcGFjZURhdGEoKTtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIGNvbnN0IHNoZWxsID0gdGhpcy5jcmVhdGVEZXNrU2hlbGwoXCJzaGVybG9jay1mb290cHJpbnQtZGVzay1zaGVsbFwiKTtcbiAgICB0aGlzLnJlbmRlckRlc2tIZWFkZXIoc2hlbGwsIFwiTWVtb3J5IE1hcFwiLCBcIlx1OERCM1x1OEZGOVx1NTczMFx1NTZGRVwiLCBcIlx1NTdDRVx1NUUwMlx1NjYyRlx1OEJCMFx1NUZDNlx1NTc1MFx1NjgwN1x1MzAwMlx1NzBCOVx1NUYwMFx1NEUwMFx1NkIyMVx1NTIzMFx1OEJCRlx1RkYwQ1x1NUMzMVx1ODBGRFx1N0VFN1x1N0VFRFx1ODg2NVx1NUMwMVx1OTc2Mlx1MzAwMVx1NzE2N1x1NzI0N1x1NTg5OVx1MzAwMVx1NjVGNlx1OTVGNFx1MzAwMVx1N0IxNFx1OEJCMFx1NTQ4Q1x1Njg0OFx1NEVGNi9cdTk2MDVcdThCRkJcdTUxNzNcdTgwNTRcdTMwMDJcIiwgW10pO1xuICAgIHRoaXMucmVuZGVyRm9vdHByaW50TW9kdWxlKHNoZWxsLCBkYXRhKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgbmF2aWdhdGVUbyhzY3JlZW46IEV4Y2x1ZGU8U2hlcmxvY2tTY3JlZW4sIFwiZW50cnlcIiB8IFwiY2FzZVwiPik6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMuc2NyZWVuID0gc2NyZWVuO1xuICAgIHRoaXMuc2VsZWN0ZWRDYXNlUGF0aCA9IHVuZGVmaW5lZDtcbiAgICBhd2FpdCB0aGlzLnJlbmRlckN1cnJlbnRTY3JlZW4oKTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlSG9tZVBvcnRhbChcbiAgICBjb250YWluZXI6IEhUTUxFbGVtZW50LFxuICAgIGNvbmZpZzoge1xuICAgICAgbGFiZWw6IHN0cmluZztcbiAgICAgIHRpdGxlOiBzdHJpbmc7XG4gICAgICB0ZXh0OiBzdHJpbmc7XG4gICAgICBidXR0b246IHN0cmluZztcbiAgICAgIHNjcmVlbjogRXhjbHVkZTxTaGVybG9ja1NjcmVlbiwgXCJlbnRyeVwiIHwgXCJjYXNlXCIgfCBcImhvbWVcIj47XG4gICAgICB0b25lOiBcInN0dWR5XCIgfCBcImJvYXJkXCIgfCBcIm1hcFwiO1xuICAgIH1cbiAgKTogdm9pZCB7XG4gICAgY29uc3QgcG9ydGFsID0gY29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBgc2hlcmxvY2staG9tZS1wb3J0YWwgJHtjb25maWcudG9uZX1gIH0pO1xuICAgIHBvcnRhbC5jcmVhdGVFbChcInNwYW5cIiwgeyBjbHM6IFwic2hlcmxvY2stc3RhZ2UtbGFiZWxcIiwgdGV4dDogY29uZmlnLmxhYmVsIH0pO1xuICAgIHBvcnRhbC5jcmVhdGVFbChcInN0cm9uZ1wiLCB7IHRleHQ6IGNvbmZpZy50aXRsZSB9KTtcbiAgICBwb3J0YWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogY29uZmlnLnRleHQgfSk7XG4gICAgcG9ydGFsLmNyZWF0ZUVsKFwiYlwiLCB7IHRleHQ6IGNvbmZpZy5idXR0b24gfSk7XG4gICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KHBvcnRhbCwgXCJjbGlja1wiLCBhc3luYyAoKSA9PiB0aGlzLm5hdmlnYXRlVG8oY29uZmlnLnNjcmVlbikpO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVEZXNrU2hlbGwoZXh0cmFDbGFzczogc3RyaW5nKTogSFRNTEVsZW1lbnQge1xuICAgIGNvbnN0IHNoZWxsID0gdGhpcy5jb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBgc2hlcmxvY2stc2hlbGwgc2hlcmxvY2stZGVzay1zaGVsbCAke2V4dHJhQ2xhc3N9YCB9KTtcbiAgICBzaGVsbC5kYXRhc2V0LnBlcmlvZCA9IHRoaXMucmVzb2x2ZVBlcmlvZCgpO1xuICAgIHNoZWxsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1hdG1vc3BoZXJlIHNoZXJsb2NrLWZvZy1sYXllclwiIH0pO1xuICAgIHNoZWxsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1hdG1vc3BoZXJlIHNoZXJsb2NrLWdyYWluLWxheWVyXCIgfSk7XG4gICAgcmV0dXJuIHNoZWxsO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJEZXNrSGVhZGVyKFxuICAgIHNoZWxsOiBIVE1MRWxlbWVudCxcbiAgICBraWNrZXI6IHN0cmluZyxcbiAgICB0aXRsZTogc3RyaW5nLFxuICAgIHN1YnRpdGxlOiBzdHJpbmcsXG4gICAgYWN0aW9uczogQXJyYXk8eyBsYWJlbDogc3RyaW5nOyBhY3Rpb246ICgpID0+IFByb21pc2U8dW5rbm93bj47IHNlY29uZGFyeT86IGJvb2xlYW4gfT5cbiAgKTogdm9pZCB7XG4gICAgY29uc3QgaGVhZGVyID0gc2hlbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWRlc2staGVhZGVyXCIgfSk7XG4gICAgY29uc3QgYmFja0J1dHRvbiA9IGhlYWRlci5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzaGVybG9jay1pY29uLWJ1dHRvblwiLCB0ZXh0OiBcIlx1MjE5MFwiIH0pO1xuICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChiYWNrQnV0dG9uLCBcImNsaWNrXCIsIGFzeW5jICgpID0+IHRoaXMubmF2aWdhdGVUbyhcImhvbWVcIikpO1xuICAgIGNvbnN0IGNvcHkgPSBoZWFkZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWRlc2staGVhZGluZ1wiIH0pO1xuICAgIGNvcHkuY3JlYXRlRWwoXCJzcGFuXCIsIHsgY2xzOiBcInNoZXJsb2NrLWtpY2tlclwiLCB0ZXh0OiBraWNrZXIgfSk7XG4gICAgY29weS5jcmVhdGVFbChcImgxXCIsIHsgdGV4dDogdGl0bGUgfSk7XG4gICAgY29weS5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBzdWJ0aXRsZSB9KTtcbiAgICBjb25zdCBhY3Rpb25Hcm91cCA9IGhlYWRlci5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stYWN0aW9ucyBzaGVybG9jay1kZXNrLWFjdGlvbnNcIiB9KTtcbiAgICBhY3Rpb25zLmZvckVhY2goKGFjdGlvbikgPT4ge1xuICAgICAgdGhpcy5jcmVhdGVBY3Rpb24oYWN0aW9uR3JvdXAsIGFjdGlvbi5sYWJlbCwgYWN0aW9uLmFjdGlvbiwgYWN0aW9uLnNlY29uZGFyeSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckNhc2VCb2FyZChjb250YWluZXI6IEhUTUxFbGVtZW50LCBjYXNlczogU2hlcmxvY2tDYXNlW10pOiB2b2lkIHtcbiAgICBjb25zdCBjYXJkID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1wYW5lbCBzaGVybG9jay1jYXJkIGZ1bGxcIiB9KTtcbiAgICBjb25zdCBoZWFkZXIgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1jYXJkLWhlYWRpbmdcIiB9KTtcbiAgICBjb25zdCB0aXRsZUJsb2NrID0gaGVhZGVyLmNyZWF0ZURpdigpO1xuICAgIHRpdGxlQmxvY2suY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiXHU2ODQ4XHU0RUY2XHU1Mzc3XHU1Qjk3XCIgfSk7XG4gICAgdGl0bGVCbG9jay5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIlx1NjMwOVx1NzJCNlx1NjAwMVx1NjU3NFx1NzQwNlx1NjI0MFx1NjcwOVx1Njg0OFx1NEVGNlx1RkYwQ1x1NzBCOVx1NTFGQlx1OEZEQlx1NTE2NVx1Njg0OFx1NEVGNlx1OEJFNlx1NjBDNVx1NURFNVx1NEY1Q1x1NTNGMFx1MzAwMlwiIH0pO1xuICAgIGNvbnN0IG5ld0Nhc2VCdXR0b24gPSBoZWFkZXIuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwic2hlcmxvY2stbWluaS1idXR0b24gc2hlcmxvY2stbWluaS1idXR0b24tc3Ryb25nXCIsIHRleHQ6IFwiTmV3IENhc2VcIiB9KTtcbiAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQobmV3Q2FzZUJ1dHRvbiwgXCJjbGlja1wiLCBhc3luYyAoKSA9PiB0aGlzLnBsdWdpbi5jcmVhdGVDYXNlTm90ZSgpKTtcbiAgICBjb25zdCBib2FyZCA9IGNhcmQuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWJvYXJkXCIgfSk7XG5cbiAgICB0aGlzLnJlbmRlckNhc2VDb2x1bW4oYm9hcmQsIFwiT3BlblwiLCBjYXNlcy5maWx0ZXIoKGl0ZW0pID0+IGl0ZW0uc3RhdHVzID09PSBcIm9wZW5cIikpO1xuICAgIHRoaXMucmVuZGVyQ2FzZUNvbHVtbihib2FyZCwgXCJBY3RpdmVcIiwgY2FzZXMuZmlsdGVyKChpdGVtKSA9PiBpdGVtLnN0YXR1cyA9PT0gXCJhY3RpdmVcIikpO1xuICAgIHRoaXMucmVuZGVyQ2FzZUNvbHVtbihib2FyZCwgXCJBcmNoaXZlZFwiLCBjYXNlcy5maWx0ZXIoKGl0ZW0pID0+IGl0ZW0uc3RhdHVzID09PSBcImFyY2hpdmVkXCIpKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyQ2FzZUNvbHVtbihjb250YWluZXI6IEhUTUxFbGVtZW50LCB0aXRsZTogc3RyaW5nLCBpdGVtczogU2hlcmxvY2tDYXNlW10pOiB2b2lkIHtcbiAgICBjb25zdCBjb2x1bW4gPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWJvYXJkLWNvbHVtblwiIH0pO1xuICAgIGNvbnN0IGNvbHVtbkhlYWRlciA9IGNvbHVtbi5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stYm9hcmQtY29sdW1uLWhlYWRlclwiIH0pO1xuICAgIGNvbHVtbkhlYWRlci5jcmVhdGVFbChcImg0XCIsIHsgdGV4dDogdGl0bGUgfSk7XG4gICAgY29sdW1uSGVhZGVyLmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IFN0cmluZyhpdGVtcy5sZW5ndGgpIH0pO1xuICAgIGlmIChpdGVtcy5sZW5ndGggPT09IDApIHtcbiAgICAgIGNvbHVtbi5jcmVhdGVFbChcInBcIiwgeyBjbHM6IFwic2hlcmxvY2stZW1wdHlcIiwgdGV4dDogXCJcdTY2ODJcdTY1RTBcdThCQjBcdTVGNTVcIiB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBsaXN0ID0gY29sdW1uLmNyZWF0ZUVsKFwidWxcIiwgeyBjbHM6IFwic2hlcmxvY2stbGlzdFwiIH0pO1xuICAgIGl0ZW1zLnNsaWNlKDAsIDQpLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgIGNvbnN0IHJvdyA9IGxpc3QuY3JlYXRlRWwoXCJsaVwiLCB7IGNsczogXCJzaGVybG9jay1saXN0LWl0ZW0gc2hlcmxvY2stY2FzZS1yb3dcIiB9KTtcbiAgICAgIGNvbnN0IGJvZHkgPSByb3cuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWxpc3QtY29weVwiIH0pO1xuICAgICAgYm9keS5jcmVhdGVFbChcInN0cm9uZ1wiLCB7IHRleHQ6IGl0ZW0ubmFtZSB9KTtcbiAgICAgIGNvbnN0IGxpbmtlZFRhc2tzID0gdGhpcy5wbHVnaW5UYXNrQ291bnQoaXRlbS5maWxlUGF0aCk7XG4gICAgICBib2R5LmNyZWF0ZUVsKFwic3BhblwiLCB7XG4gICAgICAgIGNsczogXCJzaGVybG9jay1tZXRhXCIsXG4gICAgICAgIHRleHQ6IGl0ZW0uZGVhZGxpbmUgPyBgXHU2MjJBXHU2QjYyICR7aXRlbS5kZWFkbGluZX1gIDogaXRlbS5maWxlUGF0aFxuICAgICAgfSk7XG4gICAgICBib2R5LmNyZWF0ZUVsKFwic3BhblwiLCB7XG4gICAgICAgIGNsczogXCJzaGVybG9jay1tZXRhXCIsXG4gICAgICAgIHRleHQ6IGxpbmtlZFRhc2tzID4gMCA/IGAke2xpbmtlZFRhc2tzfSBsaW5rZWQgdGFzayR7bGlua2VkVGFza3MgPiAxID8gXCJzXCIgOiBcIlwifWAgOiBcIk5vIGxpbmtlZCB0YXNrcyB5ZXRcIlxuICAgICAgfSk7XG4gICAgICBjb25zdCBwcm9ncmVzcyA9IGJvZHkuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWNhc2UtcHJvZ3Jlc3NcIiB9KTtcbiAgICAgIGNvbnN0IHByb2dyZXNzRmlsbCA9IHByb2dyZXNzLmNyZWF0ZURpdigpO1xuICAgICAgcHJvZ3Jlc3NGaWxsLnN0eWxlLndpZHRoID0gYCR7dGhpcy5yZXNvbHZlQ2FzZVByb2dyZXNzKGl0ZW0uZmlsZVBhdGgpfSVgO1xuICAgICAgYm9keS5jcmVhdGVFbChcInNwYW5cIiwgeyBjbHM6IFwic2hlcmxvY2stcm93LWFmZm9yZGFuY2VcIiwgdGV4dDogXCJDbGljayB0byBvcGVuIHdvcmtzcGFjZVwiIH0pO1xuICAgICAgY29uc3Qgc2lkZSA9IHJvdy5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stbGlzdC1hY3Rpb25zXCIgfSk7XG4gICAgICBzaWRlLmNyZWF0ZUVsKFwic3BhblwiLCB7IGNsczogYHNoZXJsb2NrLWNoaXAgcHJpb3JpdHktJHtpdGVtLnByaW9yaXR5ID8/IFwibWVkaXVtXCJ9YCwgdGV4dDogdGhpcy5yZW5kZXJQcmlvcml0eUxhYmVsKGl0ZW0ucHJpb3JpdHkpIH0pO1xuICAgICAgY29uc3QgYWN0aW9uID0gc2lkZS5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzaGVybG9jay1taW5pLWJ1dHRvblwiLCB0ZXh0OiBcIitUYXNrXCIgfSk7XG4gICAgICBjb25zdCBlZGl0ID0gc2lkZS5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzaGVybG9jay1taW5pLWJ1dHRvblwiLCB0ZXh0OiBcIlx1N0YxNlx1OEY5MVwiIH0pO1xuICAgICAgY29uc3QgcmVtb3ZlID0gc2lkZS5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzaGVybG9jay1taW5pLWJ1dHRvbiBkYW5nZXJcIiwgdGV4dDogXCJcdTUyMjBcdTk2NjRcIiB9KTtcbiAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChhY3Rpb24sIFwiY2xpY2tcIiwgYXN5bmMgKGV2ZW50OiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5jcmVhdGVUYXNrRnJvbUNhc2UoaXRlbS5maWxlUGF0aCk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChlZGl0LCBcImNsaWNrXCIsIGFzeW5jIChldmVudDogTW91c2VFdmVudCkgPT4ge1xuICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4ub3BlblBhdGgoaXRlbS5maWxlUGF0aCk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChyZW1vdmUsIFwiY2xpY2tcIiwgYXN5bmMgKGV2ZW50OiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5kZWxldGVQYXRoKGl0ZW0uZmlsZVBhdGgpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQocm93LCBcImNsaWNrXCIsIGFzeW5jICgpID0+IHtcbiAgICAgICAgdGhpcy5zZWxlY3RlZENhc2VQYXRoID0gaXRlbS5maWxlUGF0aDtcbiAgICAgICAgdGhpcy5zY3JlZW4gPSBcImNhc2VcIjtcbiAgICAgICAgYXdhaXQgdGhpcy5yZW5kZXJDdXJyZW50U2NyZWVuKCk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChyb3csIFwiZGJsY2xpY2tcIiwgYXN5bmMgKCkgPT4gdGhpcy5wbHVnaW4ub3BlblBhdGgoaXRlbS5maWxlUGF0aCkpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyByZW5kZXJDYXNlV29ya3NwYWNlKGNhc2VQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLnBsdWdpbi5kZWJ1Z0xvZyhcInZpZXc6Y2FzZTpyZW5kZXI6c3RhcnRcIik7XG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHRoaXMucGx1Z2luLmdldFdvcmtzcGFjZURhdGEoKTtcbiAgICBjb25zdCBjdXJyZW50Q2FzZSA9IGRhdGEuY2FzZXMuZmluZCgoaXRlbSkgPT4gaXRlbS5maWxlUGF0aCA9PT0gY2FzZVBhdGgpO1xuICAgIGlmICghY3VycmVudENhc2UpIHtcbiAgICAgIHRoaXMuc2NyZWVuID0gXCJjYXNlc1wiO1xuICAgICAgYXdhaXQgdGhpcy5yZW5kZXJDYXNlRGVzaygpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGNhc2VUYXNrcyA9IGRhdGEudGFza3MuZmlsdGVyKCh0YXNrKSA9PiB0YXNrLmNhc2VQYXRoID09PSBjdXJyZW50Q2FzZS5maWxlUGF0aCk7XG4gICAgY29uc3QgY2FzZVNjaGVkdWxlcyA9IGRhdGEuc2NoZWR1bGVzLmZpbHRlcigoc2NoZWR1bGUpID0+IHtcbiAgICAgIGlmICghc2NoZWR1bGUucmVsYXRlZFRhc2tQYXRoKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjYXNlVGFza3Muc29tZSgodGFzaykgPT4gdGFzay5maWxlUGF0aCA9PT0gc2NoZWR1bGUucmVsYXRlZFRhc2tQYXRoKTtcbiAgICB9KTtcblxuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgY29uc3Qgc2hlbGwgPSB0aGlzLmNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stc2hlbGwgc2hlcmxvY2stY2FzZS1zaGVsbFwiIH0pO1xuICAgIHNoZWxsLmRhdGFzZXQucGVyaW9kID0gdGhpcy5yZXNvbHZlUGVyaW9kKCk7XG4gICAgc2hlbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWF0bW9zcGhlcmUgc2hlcmxvY2stZm9nLWxheWVyXCIgfSk7XG4gICAgc2hlbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWF0bW9zcGhlcmUgc2hlcmxvY2stZ3JhaW4tbGF5ZXJcIiB9KTtcblxuICAgIGNvbnN0IGhlYWRlciA9IHNoZWxsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1jYXNlLWhlYWRlclwiIH0pO1xuICAgIGNvbnN0IGJhY2tCdXR0b24gPSBoZWFkZXIuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwic2hlcmxvY2staWNvbi1idXR0b25cIiwgdGV4dDogXCJcdTIxOTBcIiB9KTtcbiAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoYmFja0J1dHRvbiwgXCJjbGlja1wiLCBhc3luYyAoKSA9PiB7XG4gICAgICB0aGlzLnNjcmVlbiA9IFwiY2FzZXNcIjtcbiAgICAgIHRoaXMuc2VsZWN0ZWRDYXNlUGF0aCA9IHVuZGVmaW5lZDtcbiAgICAgIGF3YWl0IHRoaXMucmVuZGVyQ2FzZURlc2soKTtcbiAgICB9KTtcbiAgICBjb25zdCB0aXRsZUJsb2NrID0gaGVhZGVyLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1jYXNlLXRpdGxlLWJsb2NrXCIgfSk7XG4gICAgdGl0bGVCbG9jay5jcmVhdGVFbChcInNwYW5cIiwgeyBjbHM6IFwic2hlcmxvY2sta2lja2VyXCIsIHRleHQ6IFwiQ2FzZSBXb3Jrc3BhY2VcIiB9KTtcbiAgICB0aXRsZUJsb2NrLmNyZWF0ZUVsKFwiaDFcIiwgeyB0ZXh0OiBjdXJyZW50Q2FzZS5uYW1lIH0pO1xuICAgIHRpdGxlQmxvY2suY3JlYXRlRWwoXCJwXCIsIHtcbiAgICAgIHRleHQ6IFtjdXJyZW50Q2FzZS5zdGF0dXMsIGN1cnJlbnRDYXNlLnByaW9yaXR5ID8gYCR7Y3VycmVudENhc2UucHJpb3JpdHl9IHByaW9yaXR5YCA6IHVuZGVmaW5lZCwgY3VycmVudENhc2UuZGVhZGxpbmUgPyBgZHVlICR7Y3VycmVudENhc2UuZGVhZGxpbmV9YCA6IHVuZGVmaW5lZF1cbiAgICAgICAgLmZpbHRlcihCb29sZWFuKVxuICAgICAgICAuam9pbihcIiAvIFwiKVxuICAgIH0pO1xuICAgIGNvbnN0IGFjdGlvbnMgPSBoZWFkZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWNhc2UtYWN0aW9uc1wiIH0pO1xuICAgIHRoaXMuY3JlYXRlQWN0aW9uKGFjdGlvbnMsIFwiXHU2NUIwXHU1RUZBXHU3RUJGXHU3RDIyXHU0RUZCXHU1MkExXCIsIGFzeW5jICgpID0+IHRoaXMucGx1Z2luLmNyZWF0ZVRhc2tGcm9tQ2FzZShjdXJyZW50Q2FzZS5maWxlUGF0aCkpO1xuICAgIHRoaXMuY3JlYXRlQWN0aW9uKGFjdGlvbnMsIFwiXHU2MjUzXHU1RjAwXHU2ODQ4XHU0RUY2XHU2NTg3XHU0RUY2XCIsIGFzeW5jICgpID0+IHRoaXMucGx1Z2luLm9wZW5QYXRoKGN1cnJlbnRDYXNlLmZpbGVQYXRoKSwgdHJ1ZSk7XG5cbiAgICBjb25zdCBib2R5ID0gc2hlbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWNhc2UtZ3JpZFwiIH0pO1xuICAgIHRoaXMucmVuZGVyQ2FzZU92ZXJ2aWV3KGJvZHksIGN1cnJlbnRDYXNlLCBjYXNlVGFza3MsIGNhc2VTY2hlZHVsZXMpO1xuICAgIHRoaXMucmVuZGVyQ2FzZVRhc2tzKGJvZHksIGN1cnJlbnRDYXNlLCBjYXNlVGFza3MpO1xuICAgIHRoaXMucmVuZGVyQ2FzZVNjaGVkdWxlKGJvZHksIGNhc2VTY2hlZHVsZXMpO1xuICAgIHRoaXMucmVuZGVyQ2FzZUV2aWRlbmNlKGJvZHksIGN1cnJlbnRDYXNlKTtcbiAgICB0aGlzLnJlbmRlckNhc2VUaW1lbGluZShib2R5LCBjdXJyZW50Q2FzZSwgY2FzZVRhc2tzLCBjYXNlU2NoZWR1bGVzKTtcbiAgICB0aGlzLnBsdWdpbi5kZWJ1Z0xvZyhcInZpZXc6Y2FzZTpyZW5kZXI6Y29tcGxldGVcIik7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckNhc2VPdmVydmlldyhjb250YWluZXI6IEhUTUxFbGVtZW50LCBjdXJyZW50Q2FzZTogU2hlcmxvY2tDYXNlLCB0YXNrczogU2hlcmxvY2tUYXNrW10sIHNjaGVkdWxlczogU2hlcmxvY2tTY2hlZHVsZVtdKTogdm9pZCB7XG4gICAgY29uc3QgcGFuZWwgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLXBhbmVsIHNoZXJsb2NrLWNhc2Utb3ZlcnZpZXdcIiB9KTtcbiAgICBwYW5lbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJcdTY4NDhcdTYwQzVcdTRFMkRcdTY3QTJcIiB9KTtcbiAgICBjb25zdCBzdGF0cyA9IHBhbmVsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1tZXRyaWMtcm93XCIgfSk7XG4gICAgdGhpcy5jcmVhdGVNZXRyaWMoc3RhdHMsIFwiXHU0RUZCXHU1MkExXCIsIFN0cmluZyh0YXNrcy5sZW5ndGgpKTtcbiAgICB0aGlzLmNyZWF0ZU1ldHJpYyhzdGF0cywgXCJcdTVERjJcdTYzOTJcdTY3MUZcIiwgU3RyaW5nKHNjaGVkdWxlcy5sZW5ndGgpKTtcbiAgICB0aGlzLmNyZWF0ZU1ldHJpYyhzdGF0cywgXCJcdTcyQjZcdTYwMDFcIiwgY3VycmVudENhc2Uuc3RhdHVzKTtcbiAgICBjb25zdCBub3RlcyA9IHBhbmVsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1jYXNlLWJyaWVmXCIgfSk7XG4gICAgbm90ZXMuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogXCJcdTY4NDhcdTRFRjZcdTY1ODdcdTRFRjZcdTMwMDFcdTRFRkJcdTUyQTFcdTdFQkZcdTdEMjJcdTMwMDFcdThDMDNcdTY3RTVcdTYzOTJcdTY3MUZcdTU0OENcdThENDRcdTY1OTlcdTUxNjVcdTUzRTNcdTRGMUFcdTU3MjhcdThGRDlcdTkxQ0NcdTZDNDdcdTU0MDhcdTMwMDJcIiB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyQ2FzZVRhc2tzKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIGN1cnJlbnRDYXNlOiBTaGVybG9ja0Nhc2UsIHRhc2tzOiBTaGVybG9ja1Rhc2tbXSk6IHZvaWQge1xuICAgIGNvbnN0IHBhbmVsID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1wYW5lbCBzaGVybG9jay1jYXNlLXBhbmVsXCIgfSk7XG4gICAgcGFuZWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiXHU3RUJGXHU3RDIyXHU0RUZCXHU1MkExXCIgfSk7XG4gICAgY29uc3QgbGlzdCA9IHBhbmVsLmNyZWF0ZUVsKFwidWxcIiwgeyBjbHM6IFwic2hlcmxvY2stbGlzdFwiIH0pO1xuICAgIGlmICh0YXNrcy5sZW5ndGggPT09IDApIHtcbiAgICAgIGNvbnN0IHJvdyA9IGxpc3QuY3JlYXRlRWwoXCJsaVwiLCB7IGNsczogXCJzaGVybG9jay1lbXB0eVwiIH0pO1xuICAgICAgcm93LnNldFRleHQoXCJcdThGRDlcdTRFMkFcdTY4NDhcdTRFRjZcdThGRDhcdTZDQTFcdTY3MDlcdTRFRkJcdTUyQTFcdTMwMDJcIik7XG4gICAgICBjb25zdCBidXR0b24gPSBwYW5lbC5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzaGVybG9jay1idXR0b25cIiwgdGV4dDogXCJcdTUyMUJcdTVFRkFcdTdCMkNcdTRFMDBcdTY3NjFcdTdFQkZcdTdEMjJcIiB9KTtcbiAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChidXR0b24sIFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4gdGhpcy5wbHVnaW4uY3JlYXRlVGFza0Zyb21DYXNlKGN1cnJlbnRDYXNlLmZpbGVQYXRoKSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGFza3MuZm9yRWFjaCgodGFzaykgPT4ge1xuICAgICAgY29uc3Qgcm93ID0gbGlzdC5jcmVhdGVFbChcImxpXCIsIHsgY2xzOiBcInNoZXJsb2NrLWxpc3QtaXRlbVwiIH0pO1xuICAgICAgY29uc3QgYm9keSA9IHJvdy5jcmVhdGVEaXYoKTtcbiAgICAgIGJvZHkuY3JlYXRlRWwoXCJzdHJvbmdcIiwgeyB0ZXh0OiB0YXNrLm5hbWUgfSk7XG4gICAgICBib2R5LmNyZWF0ZUVsKFwic3BhblwiLCB7IGNsczogXCJzaGVybG9jay1tZXRhXCIsIHRleHQ6IFt0YXNrLnN0YXR1cywgdGFzay5wcmlvcml0eSwgdGFzay5kdWVdLmZpbHRlcihCb29sZWFuKS5qb2luKFwiIC8gXCIpIH0pO1xuICAgICAgY29uc3Qgc2lkZSA9IHJvdy5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stbGlzdC1hY3Rpb25zXCIgfSk7XG4gICAgICBzaWRlLmNyZWF0ZUVsKFwic3BhblwiLCB7IGNsczogXCJzaGVybG9jay1jaGlwIGNvbXBhY3RcIiwgdGV4dDogdGFzay5zdGF0dXMgfSk7XG4gICAgICBjb25zdCBlZGl0ID0gc2lkZS5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzaGVybG9jay1taW5pLWJ1dHRvblwiLCB0ZXh0OiBcIlx1N0YxNlx1OEY5MVwiIH0pO1xuICAgICAgY29uc3QgcmVtb3ZlID0gc2lkZS5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzaGVybG9jay1taW5pLWJ1dHRvbiBkYW5nZXJcIiwgdGV4dDogXCJcdTUyMjBcdTk2NjRcIiB9KTtcbiAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChlZGl0LCBcImNsaWNrXCIsIGFzeW5jIChldmVudDogTW91c2VFdmVudCkgPT4ge1xuICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4ub3BlblBhdGgodGFzay5maWxlUGF0aCk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChyZW1vdmUsIFwiY2xpY2tcIiwgYXN5bmMgKGV2ZW50OiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5kZWxldGVQYXRoKHRhc2suZmlsZVBhdGgpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQocm93LCBcImNsaWNrXCIsIGFzeW5jICgpID0+IHRoaXMucGx1Z2luLm9wZW5QYXRoKHRhc2suZmlsZVBhdGgpKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyQ2FzZVNjaGVkdWxlKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIHNjaGVkdWxlczogU2hlcmxvY2tTY2hlZHVsZVtdKTogdm9pZCB7XG4gICAgY29uc3QgcGFuZWwgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLXBhbmVsIHNoZXJsb2NrLWNhc2UtcGFuZWxcIiB9KTtcbiAgICBwYW5lbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJcdThDMDNcdTY3RTVcdTYzOTJcdTY3MUZcIiB9KTtcbiAgICBjb25zdCBsaXN0ID0gcGFuZWwuY3JlYXRlRWwoXCJ1bFwiLCB7IGNsczogXCJzaGVybG9jay1saXN0XCIgfSk7XG4gICAgaWYgKHNjaGVkdWxlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIGxpc3QuY3JlYXRlRWwoXCJsaVwiLCB7IGNsczogXCJzaGVybG9jay1lbXB0eVwiLCB0ZXh0OiBcIlx1NjY4Mlx1NjVFMFx1NjM5Mlx1NjcxRlx1MzAwMlx1NjI4QVx1NEVGQlx1NTJBMVx1NjJENlx1OEZEQlx1NTQ2OFx1Njc3Rlx1NTQwRVx1RkYwQ1x1OEZEOVx1OTFDQ1x1NEYxQVx1ODFFQVx1NTJBOFx1NTFGQVx1NzNCMFx1NTE3M1x1ODA1NFx1OEJCMFx1NUY1NVx1MzAwMlwiIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHNjaGVkdWxlcy5mb3JFYWNoKChzY2hlZHVsZSkgPT4ge1xuICAgICAgY29uc3Qgcm93ID0gbGlzdC5jcmVhdGVFbChcImxpXCIsIHsgY2xzOiBcInNoZXJsb2NrLWxpc3QtaXRlbVwiIH0pO1xuICAgICAgY29uc3QgYm9keSA9IHJvdy5jcmVhdGVEaXYoKTtcbiAgICAgIGJvZHkuY3JlYXRlRWwoXCJzdHJvbmdcIiwgeyB0ZXh0OiBzY2hlZHVsZS5yZWxhdGVkVGFzayA/PyBzY2hlZHVsZS5uYW1lIH0pO1xuICAgICAgYm9keS5jcmVhdGVFbChcInNwYW5cIiwgeyBjbHM6IFwic2hlcmxvY2stbWV0YVwiLCB0ZXh0OiBbc2NoZWR1bGUuZGF5LCBzY2hlZHVsZS5zdGFydCAmJiBzY2hlZHVsZS5lbmQgPyBgJHtzY2hlZHVsZS5zdGFydH0tJHtzY2hlZHVsZS5lbmR9YCA6IHVuZGVmaW5lZF0uZmlsdGVyKEJvb2xlYW4pLmpvaW4oXCIgLyBcIikgfSk7XG4gICAgICBjb25zdCBzaWRlID0gcm93LmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1saXN0LWFjdGlvbnNcIiB9KTtcbiAgICAgIGNvbnN0IGVkaXQgPSBzaWRlLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1pbmktYnV0dG9uXCIsIHRleHQ6IFwiXHU3RjE2XHU4RjkxXCIgfSk7XG4gICAgICBjb25zdCByZW1vdmUgPSBzaWRlLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1pbmktYnV0dG9uIGRhbmdlclwiLCB0ZXh0OiBcIlx1NTIyMFx1OTY2NFwiIH0pO1xuICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KGVkaXQsIFwiY2xpY2tcIiwgYXN5bmMgKGV2ZW50OiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5vcGVuUGF0aChzY2hlZHVsZS5maWxlUGF0aCk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChyZW1vdmUsIFwiY2xpY2tcIiwgYXN5bmMgKGV2ZW50OiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5kZWxldGVQYXRoKHNjaGVkdWxlLmZpbGVQYXRoKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KHJvdywgXCJjbGlja1wiLCBhc3luYyAoKSA9PiB0aGlzLnBsdWdpbi5vcGVuUGF0aChzY2hlZHVsZS5maWxlUGF0aCkpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJDYXNlRXZpZGVuY2UoY29udGFpbmVyOiBIVE1MRWxlbWVudCwgY3VycmVudENhc2U6IFNoZXJsb2NrQ2FzZSk6IHZvaWQge1xuICAgIGNvbnN0IHBhbmVsID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1wYW5lbCBzaGVybG9jay1jYXNlLXBhbmVsXCIgfSk7XG4gICAgY29uc3QgaGVhZGVyID0gcGFuZWwuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLXBhbmVsLWhlYWRpbmdcIiB9KTtcbiAgICBoZWFkZXIuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiXHU4QkMxXHU3MjY5XHU2N0RDXCIgfSk7XG4gICAgY29uc3QgYWN0aW9ucyA9IGhlYWRlci5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2staW5saW5lLWFjdGlvbnNcIiB9KTtcbiAgICBjb25zdCBmb2xkZXJCdXR0b24gPSBhY3Rpb25zLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1pbmktYnV0dG9uXCIsIHRleHQ6IFwiXHU2MjUzXHU1RjAwXHU4RDQ0XHU2NTk5XHU1OTM5XCIgfSk7XG4gICAgY29uc3QgZXZpZGVuY2VCdXR0b24gPSBhY3Rpb25zLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1pbmktYnV0dG9uXCIsIHRleHQ6IFwiXHU2NUIwXHU1RUZBXHU4QkMxXHU3MjY5XCIgfSk7XG4gICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KGZvbGRlckJ1dHRvbiwgXCJjbGlja1wiLCBhc3luYyAoKSA9PiB0aGlzLnBsdWdpbi5yZXZlYWxFdmlkZW5jZUZvbGRlckZvckNhc2UoY3VycmVudENhc2UuZmlsZVBhdGgpKTtcbiAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoZXZpZGVuY2VCdXR0b24sIFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4gdGhpcy5wbHVnaW4uY3JlYXRlRXZpZGVuY2VGcm9tQ2FzZShjdXJyZW50Q2FzZS5maWxlUGF0aCkpO1xuXG4gICAgY29uc3QgZXZpZGVuY2UgPSB0aGlzLmZpbmRDYXNlRXZpZGVuY2UoY3VycmVudENhc2UpO1xuICAgIGNvbnN0IGNhYmluZXQgPSBwYW5lbC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stZXZpZGVuY2UtY2FiaW5ldFwiIH0pO1xuICAgIFtcbiAgICAgIHsgbGFiZWw6IFwiTWFya2Rvd25cIiwga2luZDogXCJtYXJrZG93blwiIGFzIGNvbnN0IH0sXG4gICAgICB7IGxhYmVsOiBcIlBERlwiLCBraW5kOiBcInBkZlwiIGFzIGNvbnN0IH0sXG4gICAgICB7IGxhYmVsOiBcIkltYWdlc1wiLCBraW5kOiBcImltYWdlXCIgYXMgY29uc3QgfSxcbiAgICAgIHsgbGFiZWw6IFwiTG9jYWwgZmlsZXNcIiwga2luZDogXCJsb2NhbFwiIGFzIGNvbnN0IH1cbiAgICBdLmZvckVhY2goKHsgbGFiZWwsIGtpbmQgfSkgPT4ge1xuICAgICAgY29uc3QgZmlsZXMgPSBldmlkZW5jZS5maWx0ZXIoKGl0ZW0pID0+IGl0ZW0ua2luZCA9PT0ga2luZCk7XG4gICAgICBjb25zdCBpdGVtID0gY2FiaW5ldC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stZXZpZGVuY2Utc2xvdFwiIH0pO1xuICAgICAgaXRlbS5jcmVhdGVFbChcInN0cm9uZ1wiLCB7IHRleHQ6IGxhYmVsIH0pO1xuICAgICAgaXRlbS5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiBmaWxlcy5sZW5ndGggPiAwID8gYCR7ZmlsZXMubGVuZ3RofSBpdGVtJHtmaWxlcy5sZW5ndGggPiAxID8gXCJzXCIgOiBcIlwifWAgOiBcImVtcHR5XCIgfSk7XG4gICAgICBjb25zdCBsaXN0ID0gaXRlbS5jcmVhdGVFbChcInVsXCIsIHsgY2xzOiBcInNoZXJsb2NrLWV2aWRlbmNlLWxpc3RcIiB9KTtcbiAgICAgIGZpbGVzLnNsaWNlKDAsIDMpLmZvckVhY2goKGV2aWRlbmNlSXRlbSkgPT4ge1xuICAgICAgICBjb25zdCByb3cgPSBsaXN0LmNyZWF0ZUVsKFwibGlcIik7XG4gICAgICAgIGNvbnN0IGxpbmsgPSByb3cuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwic2hlcmxvY2stZXZpZGVuY2UtbGlua1wiLCB0ZXh0OiBldmlkZW5jZUl0ZW0uZmlsZS5iYXNlbmFtZSB9KTtcbiAgICAgICAgY29uc3QgcmVtb3ZlID0gcm93LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1pbmktYnV0dG9uIGRhbmdlclwiLCB0ZXh0OiBcIlx1NTIyMFx1OTY2NFwiIH0pO1xuICAgICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQobGluaywgXCJjbGlja1wiLCBhc3luYyAoKSA9PiB0aGlzLnBsdWdpbi5vcGVuUGF0aChldmlkZW5jZUl0ZW0uZmlsZS5wYXRoKSk7XG4gICAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChyZW1vdmUsIFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4gdGhpcy5wbHVnaW4uZGVsZXRlUGF0aChldmlkZW5jZUl0ZW0uZmlsZS5wYXRoKSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICBjb25zdCBmb290ZXIgPSBwYW5lbC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stZm9vdGVyXCIgfSk7XG4gICAgZm9vdGVyLmNyZWF0ZUVsKFwic3BhblwiLCB7XG4gICAgICB0ZXh0OiBldmlkZW5jZS5sZW5ndGggPiAwXG4gICAgICAgID8gYCR7ZXZpZGVuY2UubGVuZ3RofSBcdTRFRkRcdThENDRcdTY1OTlcdTVERjJcdTUxNzNcdTgwNTRcdTUyMzBcdTZCNjRcdTY4NDhcdTRFRjZgXG4gICAgICAgIDogXCJcdTYyOEFcdThENDRcdTY1OTlcdTY1M0VcdTUxNjUgRXZpZGVuY2UgXHU2NTg3XHU0RUY2XHU1OTM5XHVGRjBDXHU2MjE2XHU2NUIwXHU1RUZBXHU4QkMxXHU3MjY5XHU3QjE0XHU4QkIwXHU1RjAwXHU1OUNCXHU1RjUyXHU2ODYzXCJcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyQ2FzZVRpbWVsaW5lKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIGN1cnJlbnRDYXNlOiBTaGVybG9ja0Nhc2UsIHRhc2tzOiBTaGVybG9ja1Rhc2tbXSwgc2NoZWR1bGVzOiBTaGVybG9ja1NjaGVkdWxlW10pOiB2b2lkIHtcbiAgICBjb25zdCBwYW5lbCA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stcGFuZWwgc2hlcmxvY2stY2FzZS1wYW5lbCBzaGVybG9jay1jYXNlLXRpbWVsaW5lLXBhbmVsXCIgfSk7XG4gICAgcGFuZWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiXHU2ODQ4XHU0RUY2XHU2NUY2XHU5NUY0XHU3RUJGXCIgfSk7XG4gICAgY29uc3QgdGltZWxpbmUgPSBwYW5lbC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stdGltZWxpbmVcIiB9KTtcbiAgICBjb25zdCBldmVudHMgPSBbXG4gICAgICB7IGxhYmVsOiBcIlx1Njg0OFx1NEVGNlx1NTIxQlx1NUVGQVwiLCB2YWx1ZTogY3VycmVudENhc2UuY3JlYXRlZCA/PyBcInVua25vd25cIiB9LFxuICAgICAgLi4udGFza3Muc2xpY2UoMCwgNCkubWFwKCh0YXNrKSA9PiAoeyBsYWJlbDogYFx1NEVGQlx1NTJBMTogJHt0YXNrLm5hbWV9YCwgdmFsdWU6IHRhc2sudXBkYXRlZCA/PyB0YXNrLmNyZWF0ZWQgPz8gdGFzay5zdGF0dXMgfSkpLFxuICAgICAgLi4uc2NoZWR1bGVzLnNsaWNlKDAsIDQpLm1hcCgoc2NoZWR1bGUpID0+ICh7IGxhYmVsOiBgXHU2MzkyXHU2NzFGOiAke3NjaGVkdWxlLnJlbGF0ZWRUYXNrID8/IHNjaGVkdWxlLm5hbWV9YCwgdmFsdWU6IFtzY2hlZHVsZS5kYXksIHNjaGVkdWxlLnN0YXJ0XS5maWx0ZXIoQm9vbGVhbikuam9pbihcIiBcIikgfSkpXG4gICAgXTtcblxuICAgIGV2ZW50cy5mb3JFYWNoKChldmVudCkgPT4ge1xuICAgICAgY29uc3Qgcm93ID0gdGltZWxpbmUuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLXRpbWVsaW5lLXJvd1wiIH0pO1xuICAgICAgcm93LmNyZWF0ZVNwYW4oeyBjbHM6IFwic2hlcmxvY2stdGltZWxpbmUtZG90XCIgfSk7XG4gICAgICBjb25zdCBjb3B5ID0gcm93LmNyZWF0ZURpdigpO1xuICAgICAgY29weS5jcmVhdGVFbChcInN0cm9uZ1wiLCB7IHRleHQ6IGV2ZW50LmxhYmVsIH0pO1xuICAgICAgY29weS5jcmVhdGVFbChcInNwYW5cIiwgeyBjbHM6IFwic2hlcmxvY2stbWV0YVwiLCB0ZXh0OiBldmVudC52YWx1ZSB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyUmVhZGluZ01vZHVsZShjb250YWluZXI6IEhUTUxFbGVtZW50LCBkYXRhOiBTaGVybG9ja1dvcmtzcGFjZURhdGEpOiB2b2lkIHtcbiAgICBjb25zdCByZWFkaW5nSXRlbXMgPSBkYXRhLmNvbGxlY3Rpb25zLmZpbHRlcigoaXRlbSkgPT4gaXRlbS5zdGF0dXMgIT09IFwiZmluaXNoZWRcIik7XG4gICAgY29uc3QgY2FyZCA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stcGFuZWwgc2hlcmxvY2stY2FyZCB3aWRlXCIgfSk7XG4gICAgY29uc3QgaGVhZGVyID0gY2FyZC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stcGFuZWwtaGVhZGluZ1wiIH0pO1xuICAgIGhlYWRlci5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJcdThCQzFcdTcyNjlcdTc4MTRcdThCRkJcIiB9KTtcbiAgICBjb25zdCBhZGRCdXR0b24gPSBoZWFkZXIuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwic2hlcmxvY2stbWluaS1idXR0b25cIiwgdGV4dDogXCJcdTY1QjBcdTVFRkFcdTc4MTRcdThCRkJcdTY3NjFcdTc2RUVcIiB9KTtcbiAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoYWRkQnV0dG9uLCBcImNsaWNrXCIsIGFzeW5jICgpID0+IHRoaXMucGx1Z2luLmNyZWF0ZUNvbGxlY3Rpb25Ob3RlKCkpO1xuICAgIGNhcmQuY3JlYXRlRWwoXCJwXCIsIHtcbiAgICAgIGNsczogXCJzaGVybG9jay1taW5pLWNvcHlcIixcbiAgICAgIHRleHQ6IFwiXHU4RkQ5XHU5MUNDXHU2NTNFXHU2QjYzXHU1NzI4XHU4QkZCXHUzMDAxXHU2QjYzXHU1NzI4XHU3NzBCXHUzMDAxXHU2QjYzXHU1NzI4XHU3ODE0XHU3QTc2XHU3Njg0XHU1MTg1XHU1QkI5XHUzMDAyXHU2QkNGXHU2NzYxXHU5MEZEXHU4MEZEXHU5NjhGXHU2NUY2XHU4ODY1XHU3QjE0XHU4QkIwXHVGRjFCXHU3ODZFXHU4QkE0XHU4QkZCXHU1QjhDXHU1NDBFXHVGRjBDXHU1MThEXHU1RjUyXHU1MTY1XHU2ODYzXHU2ODQ4XHU2N0RDXHUzMDAyXCJcbiAgICB9KTtcbiAgICBjb25zdCBsaXN0ID0gY2FyZC5jcmVhdGVFbChcInVsXCIsIHsgY2xzOiBcInNoZXJsb2NrLWxpc3RcIiB9KTtcbiAgICBpZiAocmVhZGluZ0l0ZW1zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgbGlzdC5jcmVhdGVFbChcImxpXCIsIHsgY2xzOiBcInNoZXJsb2NrLWVtcHR5XCIsIHRleHQ6IFwiXHU4RkQ4XHU2Q0ExXHU2NzA5XHU2QjYzXHU1NzI4XHU3ODE0XHU4QkZCXHU3Njg0XHU2NzYxXHU3NkVFXHUzMDAyXHU1M0VGXHU0RUU1XHU0RUNFXHU0RTY2XHU3QzREXHUzMDAxXHU3NTM1XHU1RjcxXHUzMDAxXHU2NTg3XHU3QUUwXHU2MjE2XHU0RTEzXHU4RjkxXHU1RjAwXHU1OUNCXHUzMDAyXCIgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJlYWRpbmdJdGVtcy5zbGljZSgwLCAxMCkuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgY29uc3Qgcm93ID0gbGlzdC5jcmVhdGVFbChcImxpXCIsIHsgY2xzOiBcInNoZXJsb2NrLWxpc3QtaXRlbVwiIH0pO1xuICAgICAgY29uc3QgY29weSA9IHJvdy5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stbGlzdC1jb3B5XCIgfSk7XG4gICAgICBjb3B5LmNyZWF0ZUVsKFwic3Ryb25nXCIsIHsgdGV4dDogaXRlbS5uYW1lIH0pO1xuICAgICAgY29weS5jcmVhdGVFbChcInNwYW5cIiwgeyBjbHM6IFwic2hlcmxvY2stbWV0YVwiLCB0ZXh0OiBbaXRlbS5tZWRpdW0gPz8gXCJjb2xsZWN0aW9uXCIsIGl0ZW0uc3RhdHVzID8/IFwicXVldWVkXCJdLmpvaW4oXCIgLyBcIikgfSk7XG4gICAgICBjb25zdCBzaWRlID0gcm93LmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1saXN0LWFjdGlvbnNcIiB9KTtcbiAgICAgIHNpZGUuY3JlYXRlRWwoXCJzcGFuXCIsIHsgY2xzOiBcInNoZXJsb2NrLWNoaXAgY29tcGFjdFwiLCB0ZXh0OiBpdGVtLm1lZGl1bSA/PyBcIml0ZW1cIiB9KTtcbiAgICAgIGNvbnN0IGFyY2hpdmUgPSBzaWRlLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1pbmktYnV0dG9uXCIsIHRleHQ6IFwiXHU1RjUyXHU1MTY1XHU4QkMxXHU3MjY5XHU2N0RDXCIgfSk7XG4gICAgICBjb25zdCBlZGl0ID0gc2lkZS5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzaGVybG9jay1taW5pLWJ1dHRvblwiLCB0ZXh0OiBcIlx1ODg2NVx1N0IxNFx1OEJCMFwiIH0pO1xuICAgICAgY29uc3QgcmVtb3ZlID0gc2lkZS5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzaGVybG9jay1taW5pLWJ1dHRvbiBkYW5nZXJcIiwgdGV4dDogXCJcdTUyMjBcdTk2NjRcIiB9KTtcbiAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChhcmNoaXZlLCBcImNsaWNrXCIsIGFzeW5jIChldmVudDogTW91c2VFdmVudCkgPT4ge1xuICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uYXJjaGl2ZUNvbGxlY3Rpb25Bc0V2aWRlbmNlKGl0ZW0uZmlsZVBhdGgpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoZWRpdCwgXCJjbGlja1wiLCBhc3luYyAoZXZlbnQ6IE1vdXNlRXZlbnQpID0+IHtcbiAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLm9wZW5QYXRoKGl0ZW0uZmlsZVBhdGgpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQocmVtb3ZlLCBcImNsaWNrXCIsIGFzeW5jIChldmVudDogTW91c2VFdmVudCkgPT4ge1xuICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uZGVsZXRlUGF0aChpdGVtLmZpbGVQYXRoKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KHJvdywgXCJjbGlja1wiLCBhc3luYyAoKSA9PiB0aGlzLnBsdWdpbi5vcGVuUGF0aChpdGVtLmZpbGVQYXRoKSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckFyY2hpdmVNb2R1bGUoY29udGFpbmVyOiBIVE1MRWxlbWVudCwgZGF0YTogU2hlcmxvY2tXb3Jrc3BhY2VEYXRhKTogdm9pZCB7XG4gICAgY29uc3QgY2FyZCA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stcGFuZWwgc2hlcmxvY2stY2FyZCB3aWRlXCIgfSk7XG4gICAgY29uc3QgaGVhZGVyID0gY2FyZC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stcGFuZWwtaGVhZGluZ1wiIH0pO1xuICAgIGhlYWRlci5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJcdTY4NjNcdTY4NDhcdTY3RENcIiB9KTtcbiAgICBjb25zdCBhZGRCdXR0b24gPSBoZWFkZXIuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwic2hlcmxvY2stbWluaS1idXR0b25cIiwgdGV4dDogXCJcdTY1QjBcdTVFRkFcdThCQzFcdTcyNjlcIiB9KTtcbiAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoYWRkQnV0dG9uLCBcImNsaWNrXCIsIGFzeW5jICgpID0+IHRoaXMucGx1Z2luLmNyZWF0ZUV2aWRlbmNlTm90ZSgpKTtcbiAgICBjb25zdCBjYWJpbmV0ID0gY2FyZC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stYXJjaGl2ZS1ncmlkXCIgfSk7XG4gICAgdGhpcy5jcmVhdGVBcmNoaXZlU3RhdChjYWJpbmV0LCBcIk1hcmtkb3duXCIsIGRhdGEuZXZpZGVuY2UuZmlsdGVyKChpdGVtKSA9PiBpdGVtLmZpbGVQYXRoLmVuZHNXaXRoKFwiLm1kXCIpKS5sZW5ndGgpO1xuICAgIHRoaXMuY3JlYXRlQXJjaGl2ZVN0YXQoY2FiaW5ldCwgXCJQREYgLyBcdTU2RkVcdTcyNDdcIiwgdGhpcy5jb3VudFZhdWx0RmlsZXMoW1wicGRmXCIsIFwicG5nXCIsIFwianBnXCIsIFwianBlZ1wiLCBcIndlYnBcIl0pKTtcbiAgICB0aGlzLmNyZWF0ZUFyY2hpdmVTdGF0KGNhYmluZXQsIFwiXHU2ODQ4XHU0RUY2XHU1MTczXHU4MDU0XCIsIGRhdGEuZXZpZGVuY2UuZmlsdGVyKChpdGVtKSA9PiBpdGVtLmNhc2VQYXRoKS5sZW5ndGgpO1xuICAgIGNhcmQuY3JlYXRlRWwoXCJwXCIsIHtcbiAgICAgIGNsczogXCJzaGVybG9jay1taW5pLWNvcHlcIixcbiAgICAgIHRleHQ6IFwiXHU4RkQ5XHU5MUNDXHU2NjNFXHU3OTNBXHU1REYyXHU3RUNGXHU2Qzg5XHU2REMwXHU4RkRCXHU4QkMxXHU3MjY5XHU2N0RDXHU3Njg0XHU2NzYxXHU3NkVFXHVGRjFCXHU2QkNGXHU0RTAwXHU2NzYxXHU5MEZEXHU2NjJGIFZhdWx0IFx1NEUyRFx1NzcxRlx1NUI5RSBNYXJrZG93biBcdTY1ODdcdTRFRjZcdUZGMENcdTUzRUZcdTk2OEZcdTY1RjZcdTdFRTdcdTdFRURcdTdGMTZcdThGOTFcdTYyMTZcdTUyMjBcdTk2NjRcdTMwMDJcIlxuICAgIH0pO1xuICAgIGNvbnN0IGxpc3QgPSBjYXJkLmNyZWF0ZUVsKFwidWxcIiwgeyBjbHM6IFwic2hlcmxvY2stbGlzdCBzaGVybG9jay1hcmNoaXZlLWxpc3RcIiB9KTtcbiAgICBpZiAoZGF0YS5ldmlkZW5jZS5sZW5ndGggPT09IDApIHtcbiAgICAgIGxpc3QuY3JlYXRlRWwoXCJsaVwiLCB7IGNsczogXCJzaGVybG9jay1lbXB0eVwiLCB0ZXh0OiBcIlx1OEJDMVx1NzI2OVx1NjdEQ1x1OEZEOFx1NjYyRlx1N0E3QVx1NzY4NFx1MzAwMlx1NTNFRlx1NEVFNVx1NEVDRVx1OEJDMVx1NzI2OVx1NzgxNFx1OEJGQlx1NEUyRFx1NUY1Mlx1Njg2M1x1RkYwQ1x1NEU1Rlx1NTNFRlx1NEVFNVx1NzZGNFx1NjNBNVx1NjVCMFx1NUVGQVx1OEJDMVx1NzI2OVx1MzAwMlwiIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkYXRhLmV2aWRlbmNlLnNsaWNlKDAsIDEwKS5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICBjb25zdCByb3cgPSBsaXN0LmNyZWF0ZUVsKFwibGlcIiwgeyBjbHM6IFwic2hlcmxvY2stbGlzdC1pdGVtXCIgfSk7XG4gICAgICBjb25zdCBjb3B5ID0gcm93LmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1saXN0LWNvcHlcIiB9KTtcbiAgICAgIGNvcHkuY3JlYXRlRWwoXCJzdHJvbmdcIiwgeyB0ZXh0OiBpdGVtLm5hbWUgfSk7XG4gICAgICBjb3B5LmNyZWF0ZUVsKFwic3BhblwiLCB7IGNsczogXCJzaGVybG9jay1tZXRhXCIsIHRleHQ6IFtpdGVtLmNhc2UgPyBgXHU2ODQ4XHU0RUY2OiAke2l0ZW0uY2FzZX1gIDogdW5kZWZpbmVkLCBpdGVtLnNvdXJjZSA/IGBcdTY3NjVcdTZFOTA6ICR7aXRlbS5zb3VyY2V9YCA6IHVuZGVmaW5lZF0uZmlsdGVyKEJvb2xlYW4pLmpvaW4oXCIgLyBcIikgfHwgaXRlbS5maWxlUGF0aCB9KTtcbiAgICAgIGNvbnN0IHNpZGUgPSByb3cuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWxpc3QtYWN0aW9uc1wiIH0pO1xuICAgICAgY29uc3QgZWRpdCA9IHNpZGUuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwic2hlcmxvY2stbWluaS1idXR0b25cIiwgdGV4dDogXCJcdTdGMTZcdThGOTFcIiB9KTtcbiAgICAgIGNvbnN0IHJlbW92ZSA9IHNpZGUuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwic2hlcmxvY2stbWluaS1idXR0b24gZGFuZ2VyXCIsIHRleHQ6IFwiXHU1MjIwXHU5NjY0XCIgfSk7XG4gICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoZWRpdCwgXCJjbGlja1wiLCBhc3luYyAoZXZlbnQ6IE1vdXNlRXZlbnQpID0+IHtcbiAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLm9wZW5QYXRoKGl0ZW0uZmlsZVBhdGgpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQocmVtb3ZlLCBcImNsaWNrXCIsIGFzeW5jIChldmVudDogTW91c2VFdmVudCkgPT4ge1xuICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uZGVsZXRlUGF0aChpdGVtLmZpbGVQYXRoKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KHJvdywgXCJjbGlja1wiLCBhc3luYyAoKSA9PiB0aGlzLnBsdWdpbi5vcGVuUGF0aChpdGVtLmZpbGVQYXRoKSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckZvb3RwcmludE1vZHVsZShjb250YWluZXI6IEhUTUxFbGVtZW50LCBkYXRhOiBTaGVybG9ja1dvcmtzcGFjZURhdGEpOiB2b2lkIHtcbiAgICBjb25zdCBjYXJkID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1mb290cHJpbnQtcGFuZWxcIiB9KTtcbiAgICBjb25zdCBoZWFkZXIgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1wYW5lbC1oZWFkaW5nXCIgfSk7XG4gICAgaGVhZGVyLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIlx1OERCM1x1OEZGOVx1NTczMFx1NTZGRVwiIH0pO1xuICAgIGNvbnN0IGhpbnQgPSBoZWFkZXIuY3JlYXRlRWwoXCJzcGFuXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1hcC1oaW50XCIsIHRleHQ6IFwiXHU3MEI5XHU1MUZCXHU1NzMwXHU1NkZFXHU0RUZCXHU2MTBGXHU0RjREXHU3RjZFXHU1MjFCXHU1RUZBXHU4REIzXHU4RkY5XCIgfSk7XG4gICAgaGludC5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIFwiXHU3MEI5XHU1MUZCXHU1NzMwXHU1NkZFXHU0RUZCXHU2MTBGXHU0RjREXHU3RjZFXHU1MjFCXHU1RUZBXHU4REIzXHU4RkY5XCIpO1xuICAgIGNvbnN0IG1hcCA9IGNhcmQuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWZvb3RwcmludC1tYXBcIiB9KTtcbiAgICBtYXAuc3R5bGUuYmFja2dyb3VuZEltYWdlID0gYGxpbmVhci1ncmFkaWVudCgxODBkZWcsIHJnYmEoNDcsIDI1LCA5LCAwLjEpLCByZ2JhKDQ3LCAyNSwgOSwgMC4yMikpLCB1cmwoXCIke3RoaXMucGx1Z2luLmdldFdvcmxkTWFwSW1hZ2VVcmwoKX1cIiksIGxpbmVhci1ncmFkaWVudCgxMzVkZWcsICNiMzhhNTIsICNkNWI3NzggNDIlLCAjOWM2YzM1KWA7XG5cbiAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQobWFwLCBcImNsaWNrXCIsIGFzeW5jIChldmVudDogTW91c2VFdmVudCkgPT4ge1xuICAgICAgaWYgKChldmVudC50YXJnZXQgYXMgSFRNTEVsZW1lbnQpLmNsb3Nlc3QoXCIuc2hlcmxvY2stbWFwLXBvaW50XCIpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGNvbmZpcm1lZCA9IHdpbmRvdy5jb25maXJtKFwiXHU2NjJGXHU1NDI2XHU3ODZFXHU4QkE0XHU1MjFCXHU1RUZBXHU4REIzXHU4RkY5XHVGRjFGXCIpO1xuICAgICAgaWYgKCFjb25maXJtZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgcmVjdCA9IG1hcC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgIGNvbnN0IHggPSAoKGV2ZW50LmNsaWVudFggLSByZWN0LmxlZnQpIC8gcmVjdC53aWR0aCkgKiAxMDA7XG4gICAgICBjb25zdCB5ID0gKChldmVudC5jbGllbnRZIC0gcmVjdC50b3ApIC8gcmVjdC5oZWlnaHQpICogMTAwO1xuICAgICAgY29uc3QgcHJldmlldyA9IG1hcC5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzaGVybG9jay1tYXAtcG9pbnQgc2hlcmxvY2stbWFwLXBvaW50LXByZXZpZXdcIiwgdGV4dDogXCJcdTI3MTNcIiB9KTtcbiAgICAgIHByZXZpZXcuc3R5bGUubGVmdCA9IGAke3gudG9GaXhlZCgyKX0lYDtcbiAgICAgIHByZXZpZXcuc3R5bGUudG9wID0gYCR7eS50b0ZpeGVkKDIpfSVgO1xuICAgICAgcHJldmlldy5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIFwiXHU2QjYzXHU1NzI4XHU1MjFCXHU1RUZBXHU4REIzXHU4RkY5XCIpO1xuICAgICAgcHJldmlldy5zZXRBdHRyaWJ1dGUoXCJ0aXRsZVwiLCBcIlx1NkI2M1x1NTcyOFx1NTIxQlx1NUVGQVx1OERCM1x1OEZGOVwiKTtcbiAgICAgIHByZXZpZXcuc2V0QXR0cmlidXRlKFwiZGlzYWJsZWRcIiwgXCJ0cnVlXCIpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uY3JlYXRlUGxhY2VGcm9tTWFwQ2xpY2soeCwgeSk7XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICBwcmV2aWV3LnJlbW92ZSgpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29uc3QgcGxhY2VzID0gZGF0YS5wbGFjZXNcbiAgICAgIC5maWx0ZXIoKHBsYWNlKSA9PiB0eXBlb2YgcGxhY2UubGF0aXR1ZGUgPT09IFwibnVtYmVyXCIgJiYgdHlwZW9mIHBsYWNlLmxvbmdpdHVkZSA9PT0gXCJudW1iZXJcIilcbiAgICAgIC5zbGljZSgwLCA4MCk7XG4gICAgaWYgKHBsYWNlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIG1hcC5jcmVhdGVFbChcInBcIiwgeyBjbHM6IFwic2hlcmxvY2stZW1wdHkgc2hlcmxvY2stbWFwLWVtcHR5XCIsIHRleHQ6IFwiXHU4RkQ4XHU2Q0ExXHU2NzA5XHU4REIzXHU4RkY5XHUzMDAyXHU3MEI5XHU1MUZCXHU1NzMwXHU1NkZFXHU0RUZCXHU2MTBGXHU0RjREXHU3RjZFXHU1MzczXHU1M0VGXHU1MjFCXHU1RUZBXHU1MjMwXHU4QkJGXHU4QkIwXHU1RjU1XHUzMDAyXCIgfSk7XG4gICAgfVxuICAgIHBsYWNlcy5mb3JFYWNoKChwbGFjZSkgPT4ge1xuICAgICAgY29uc3QgcG9zaXRpb24gPSB0aGlzLnJlc29sdmVNYXBQb2ludChwbGFjZSk7XG4gICAgICBjb25zdCBsYWJlbCA9IFtwbGFjZS5jaXR5ID8/IHBsYWNlLm5hbWUsIHBsYWNlLmNvdW50cnksIHBsYWNlLnZpc2l0ZWRBdF0uZmlsdGVyKEJvb2xlYW4pLmpvaW4oXCIgLyBcIik7XG4gICAgICBjb25zdCBwb2ludCA9IG1hcC5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzaGVybG9jay1tYXAtcG9pbnRcIiwgdGV4dDogXCJcdTI3MTNcIiB9KTtcbiAgICAgIHBvaW50LnN0eWxlLmxlZnQgPSBgJHtwb3NpdGlvbi54LnRvRml4ZWQoMil9JWA7XG4gICAgICBwb2ludC5zdHlsZS50b3AgPSBgJHtwb3NpdGlvbi55LnRvRml4ZWQoMil9JWA7XG4gICAgICBwb2ludC5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIGxhYmVsIHx8IHBsYWNlLm5hbWUpO1xuICAgICAgcG9pbnQuc2V0QXR0cmlidXRlKFwidGl0bGVcIiwgW3BsYWNlLmNpdHksIHBsYWNlLmNvdW50cnksIHBsYWNlLnZpc2l0ZWRBdF0uZmlsdGVyKEJvb2xlYW4pLmpvaW4oXCIgLyBcIikgfHwgcGxhY2UubmFtZSk7XG4gICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQocG9pbnQsIFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4gdGhpcy5wbHVnaW4ub3BlblBhdGgocGxhY2UuZmlsZVBhdGgpKTtcbiAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChwb2ludCwgXCJjb250ZXh0bWVudVwiLCBhc3luYyAoZXZlbnQ6IE1vdXNlRXZlbnQpID0+IHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uZGVsZXRlUGF0aChwbGFjZS5maWxlUGF0aCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVySW52ZXN0aWdhdGlvblNjaGVkdWxlcihjb250YWluZXI6IEhUTUxFbGVtZW50LCBkYXRhOiBTaGVybG9ja1dvcmtzcGFjZURhdGEpOiB2b2lkIHtcbiAgICBjb25zdCBjYXJkID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1wYW5lbCBzaGVybG9jay1jYXJkIGZ1bGxcIiB9KTtcbiAgICBjYXJkLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIlx1OEMwM1x1NjdFNVx1NjM5Mlx1NjcxRlwiIH0pO1xuICAgIGNhcmQuY3JlYXRlRWwoXCJwXCIsIHtcbiAgICAgIGNsczogXCJzaGVybG9jay1zdWJ0aXRsZSBzaGVybG9jay1taW5pLWNvcHlcIixcbiAgICAgIHRleHQ6IFwiXHU2MkQ2XHU1MkE4XHU1REU2XHU0RkE3XHU0RUZCXHU1MkExXHU1MjMwXHU2NUY2XHU5NUY0XHU2ODNDXHU1MzczXHU1M0VGXHU2MzkyXHU1MTY1XHU2NzJDXHU1NDY4XHU4QzAzXHU2N0U1XHVGRjFCXHU1M0NDXHU1MUZCXHU0RUZCXHU2MTBGXHU2NUY2XHU5NUY0XHU2ODNDXHU0RjFBXHU1RkVCXHU5MDFGXHU2NUIwXHU1RUZBXHU0RTAwXHU2NzYxXHU2NUU1XHU3QTBCXHU4ODY4XHU4QkIwXHU1RjU1XHUzMDAyXHU2MzkyXHU4RkRCXHU1M0JCXHU1NDBFXHU1M0VGXHU0RUU1XHU5NjhGXHU2NUY2XHU2MjhBXHU0RUZCXHU1MkExXHU1NzU3XHU2NTNFXHU5NTdGXHUzMDAxXHU2NTNFXHU3N0VEXHUzMDAyXCJcbiAgICB9KTtcblxuICAgIGNvbnN0IHBsYW5uZXIgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1wbGFubmVyXCIgfSk7XG4gICAgY29uc3QgYmFja2xvZyA9IHBsYW5uZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLXBsYW5uZXItYmFja2xvZ1wiIH0pO1xuICAgIGJhY2tsb2cuY3JlYXRlRWwoXCJoNFwiLCB7IHRleHQ6IFwiXHU1Rjg1XHU1Qjg5XHU2MzkyXHU0RUZCXHU1MkExXCIgfSk7XG5cbiAgICBjb25zdCBiYWNrbG9nTGlzdCA9IGJhY2tsb2cuY3JlYXRlRWwoXCJ1bFwiLCB7IGNsczogXCJzaGVybG9jay1saXN0XCIgfSk7XG4gICAgY29uc3QgYmFja2xvZ1Rhc2tzID0gZGF0YS50YXNrcy5maWx0ZXIoKGl0ZW0pID0+IGl0ZW0uc3RhdHVzICE9PSBcImRvbmVcIik7XG4gICAgaWYgKGJhY2tsb2dUYXNrcy5sZW5ndGggPT09IDApIHtcbiAgICAgIGJhY2tsb2dMaXN0LmNyZWF0ZUVsKFwibGlcIiwgeyBjbHM6IFwic2hlcmxvY2stZW1wdHlcIiwgdGV4dDogXCJcdTYyNDBcdTY3MDlcdTRFOEJcdTk4NzlcdTkwRkRcdTU5MDRcdTc0MDZcdTVCOENcdTRFODZcdUZGMENcdTYyMTZcdTgwMDVcdTUxNDhcdTY1QjBcdTVFRkFcdTRFMDBcdTY3NjFcdTRFRkJcdTUyQTFcdTMwMDJcIiB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgYmFja2xvZ1Rhc2tzLnNsaWNlKDAsIDgpLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgICAgY29uc3Qgcm93ID0gYmFja2xvZ0xpc3QuY3JlYXRlRWwoXCJsaVwiLCB7IGNsczogXCJzaGVybG9jay1saXN0LWl0ZW0gc2hlcmxvY2stZHJhZ2dhYmxlLXRhc2tcIiB9KTtcbiAgICAgICAgcm93LnNldEF0dHJpYnV0ZShcImRyYWdnYWJsZVwiLCBcInRydWVcIik7XG4gICAgICAgIHJvdy5jcmVhdGVFbChcInN0cm9uZ1wiLCB7IHRleHQ6IGl0ZW0ubmFtZSB9KTtcbiAgICAgICAgcm93LmNyZWF0ZUVsKFwic3BhblwiLCB7IGNsczogXCJzaGVybG9jay1tZXRhXCIsIHRleHQ6IGl0ZW0uc3RhdHVzID09PSBcInNjaGVkdWxlZFwiID8gXCJcdTVERjJcdTYzOTJcdTUxNjVcdTU0NjhcdTY3N0ZcdUZGMENcdTUzRUZcdTUxOERcdTZCMjFcdTYyRDZcdTUyQThcdTY1MzlcdTY4NjNcdTY3MUZcIiA6IFwiXHU2MkQ2XHU1MkE4XHU1MjMwXHU1M0YzXHU0RkE3XHU2NUY2XHU5NUY0XHU2ODNDXCIgfSk7XG4gICAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChyb3csIFwiZHJhZ3N0YXJ0XCIsIChldmVudDogRHJhZ0V2ZW50KSA9PiB7XG4gICAgICAgICAgZXZlbnQuZGF0YVRyYW5zZmVyPy5zZXREYXRhKFwidGV4dC9wbGFpblwiLCBpdGVtLmZpbGVQYXRoKTtcbiAgICAgICAgICBldmVudC5kYXRhVHJhbnNmZXI/LnNldERhdGEoXCJhcHBsaWNhdGlvbi9zaGVybG9jay10YXNrXCIsIGl0ZW0uZmlsZVBhdGgpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KHJvdywgXCJkYmxjbGlja1wiLCBhc3luYyAoKSA9PiB0aGlzLnBsdWdpbi5vcGVuUGF0aChpdGVtLmZpbGVQYXRoKSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zdCBib2FyZCA9IHBsYW5uZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLXdlZWstYm9hcmRcIiB9KTtcbiAgICBjb25zdCBoZWFkZXIgPSBib2FyZC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2std2Vlay1oZWFkZXJcIiB9KTtcbiAgICBoZWFkZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWNvcm5lci1jZWxsXCIgfSk7XG4gICAgV0VFS19EQVlTLmZvckVhY2goKGRheSkgPT4ge1xuICAgICAgY29uc3QgZGF0ZSA9IHRoaXMucmVzb2x2ZVdlZWtEYXRlKGRheS5vZmZzZXQpO1xuICAgICAgY29uc3QgY2VsbCA9IGhlYWRlci5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stZGF5LWhlYWRlclwiIH0pO1xuICAgICAgY2VsbC5jcmVhdGVFbChcInN0cm9uZ1wiLCB7IHRleHQ6IGRheS5sYWJlbCB9KTtcbiAgICAgIGNlbGwuY3JlYXRlRWwoXCJzcGFuXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1ldGFcIiwgdGV4dDogZGF0ZSB9KTtcbiAgICB9KTtcblxuICAgIGNvbnN0IHNjaGVkdWxlSW5kZXggPSB0aGlzLmluZGV4U2NoZWR1bGVzKGRhdGEuc2NoZWR1bGVzKTtcblxuICAgIFRJTUVfU0xPVFMuZm9yRWFjaCgoc2xvdCkgPT4ge1xuICAgICAgY29uc3Qgcm93ID0gYm9hcmQuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLXdlZWstcm93XCIgfSk7XG4gICAgICByb3cuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLXRpbWUtbGFiZWxcIiwgdGV4dDogc2xvdCB9KTtcblxuICAgICAgV0VFS19EQVlTLmZvckVhY2goKGRheSkgPT4ge1xuICAgICAgICBjb25zdCBkYXRlID0gdGhpcy5yZXNvbHZlV2Vla0RhdGUoZGF5Lm9mZnNldCk7XG4gICAgICAgIGNvbnN0IGtleSA9IGAke2RhdGV9fCR7c2xvdH1gO1xuICAgICAgICBjb25zdCBjZWxsID0gcm93LmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1kcm9wLWNlbGxcIiB9KTtcbiAgICAgICAgY29uc3QgZW50cmllcyA9IHNjaGVkdWxlSW5kZXguZ2V0KGtleSkgPz8gW107XG4gICAgICAgIGlmIChlbnRyaWVzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICBjZWxsLmFkZENsYXNzKFwiaGFzLWNvbmZsaWN0XCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KGNlbGwsIFwiZHJhZ292ZXJcIiwgKGV2ZW50OiBEcmFnRXZlbnQpID0+IHtcbiAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIGNlbGwuYWRkQ2xhc3MoXCJpcy1kcmFnb3ZlclwiKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChjZWxsLCBcImRyYWdsZWF2ZVwiLCAoKSA9PiB7XG4gICAgICAgICAgY2VsbC5yZW1vdmVDbGFzcyhcImlzLWRyYWdvdmVyXCIpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KGNlbGwsIFwiZHJvcFwiLCBhc3luYyAoZXZlbnQ6IERyYWdFdmVudCkgPT4ge1xuICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgY2VsbC5yZW1vdmVDbGFzcyhcImlzLWRyYWdvdmVyXCIpO1xuICAgICAgICAgIGNvbnN0IHNjaGVkdWxlUGF0aCA9IGV2ZW50LmRhdGFUcmFuc2Zlcj8uZ2V0RGF0YShcImFwcGxpY2F0aW9uL3NoZXJsb2NrLXNjaGVkdWxlXCIpO1xuICAgICAgICAgIGlmIChzY2hlZHVsZVBhdGgpIHtcbiAgICAgICAgICAgIGNvbnN0IHNjaGVkdWxlID0gZGF0YS5zY2hlZHVsZXMuZmluZCgoaXRlbSkgPT4gaXRlbS5maWxlUGF0aCA9PT0gc2NoZWR1bGVQYXRoKTtcbiAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uID0gc2NoZWR1bGU/LmR1cmF0aW9uTWludXRlcyA/PyB0aGlzLnJlc29sdmVTY2hlZHVsZUR1cmF0aW9uKHVuZGVmaW5lZCk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5tb3ZlU2NoZWR1bGVFbnRyeShzY2hlZHVsZVBhdGgsIGRhdGUsIHNsb3QsIHRoaXMucmVzb2x2ZVNjaGVkdWxlRW5kKHNsb3QsIGR1cmF0aW9uKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IHRhc2tQYXRoID1cbiAgICAgICAgICAgIGV2ZW50LmRhdGFUcmFuc2Zlcj8uZ2V0RGF0YShcImFwcGxpY2F0aW9uL3NoZXJsb2NrLXRhc2tcIikgfHxcbiAgICAgICAgICAgIGV2ZW50LmRhdGFUcmFuc2Zlcj8uZ2V0RGF0YShcInRleHQvcGxhaW5cIik7XG4gICAgICAgICAgaWYgKCF0YXNrUGF0aCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zY2hlZHVsZVRhc2tGcm9tRGFzaGJvYXJkKHRhc2tQYXRoLCBkYXRlLCBzbG90LCB0aGlzLnJlc29sdmVTY2hlZHVsZUVuZChzbG90LCBERUZBVUxUX1NDSEVEVUxFX0RVUkFUSU9OX01JTlVURVMpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChjZWxsLCBcImRibGNsaWNrXCIsIGFzeW5jICgpID0+IHtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5jcmVhdGVRdWlja1NjaGVkdWxlKGRhdGUsIHNsb3QsIHRoaXMucmVzb2x2ZVNjaGVkdWxlRW5kKHNsb3QsIERFRkFVTFRfU0NIRURVTEVfRFVSQVRJT05fTUlOVVRFUykpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoZW50cmllcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICBjZWxsLmNyZWF0ZUVsKFwic3BhblwiLCB7IGNsczogXCJzaGVybG9jay1zbG90LWhpbnRcIiwgdGV4dDogXCJEb3VibGUtY2xpY2sgb3IgZHJvcCB0YXNrXCIgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKGVudHJpZXMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgY29uc3QgY29uZmxpY3RCYXIgPSBjZWxsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1jb25mbGljdC1iYXJcIiB9KTtcbiAgICAgICAgICAgIGNvbnN0IHdhcm5pbmcgPSBjb25mbGljdEJhci5jcmVhdGVFbChcInNwYW5cIiwge1xuICAgICAgICAgICAgICBjbHM6IFwic2hlcmxvY2stY29uZmxpY3QtaGludFwiLFxuICAgICAgICAgICAgICB0ZXh0OiBgJHtlbnRyaWVzLmxlbmd0aH0gaXRlbXMgb3ZlcmxhcGBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgd2FybmluZy5zZXRBdHRyaWJ1dGUoXCJ0aXRsZVwiLCBcIlx1OEZEOVx1NEUyQVx1NjVGNlx1OTVGNFx1NjgzQ1x1NjcwOVx1NTkxQVx1Njc2MVx1NUI4OVx1NjM5Mlx1RkYwQ1x1NEUwQlx1NEUwMFx1NkI2NVx1NTNFRlx1NEVFNVx1NTJBMFx1NTE2NVx1NTFCMlx1N0E4MVx1ODlFM1x1NTFCM1x1OTAzQlx1OEY5MVx1MzAwMlwiKTtcbiAgICAgICAgICAgIGNvbnN0IHJlc29sdmVCdXR0b24gPSBjb25mbGljdEJhci5jcmVhdGVFbChcImJ1dHRvblwiLCB7XG4gICAgICAgICAgICAgIGNsczogXCJzaGVybG9jay1taW5pLWJ1dHRvblwiLFxuICAgICAgICAgICAgICB0ZXh0OiBcIlx1OTg3QVx1NUVGNlx1NEUwMFx1Njc2MVwiXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChyZXNvbHZlQnV0dG9uLCBcImNsaWNrXCIsIGFzeW5jIChldmVudDogTW91c2VFdmVudCkgPT4ge1xuICAgICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgY29uc3QgbW92YWJsZSA9IGVudHJpZXNbZW50cmllcy5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4ubW92ZVNjaGVkdWxlVG9OZXh0RnJlZVNsb3QobW92YWJsZS5maWxlUGF0aCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZW50cmllcy5mb3JFYWNoKChlbnRyeSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgcGlsbCA9IGNlbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLXNjaGVkdWxlLXBpbGxcIiB9KTtcbiAgICAgICAgICAgIHBpbGwuc2V0QXR0cmlidXRlKFwiZHJhZ2dhYmxlXCIsIFwidHJ1ZVwiKTtcbiAgICAgICAgICAgIHBpbGwuc3R5bGUubWluSGVpZ2h0ID0gYCR7dGhpcy5yZXNvbHZlU2NoZWR1bGVQaWxsSGVpZ2h0KGVudHJ5LmR1cmF0aW9uTWludXRlcyl9cHhgO1xuICAgICAgICAgICAgY29uc3QgdG9wID0gcGlsbC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stcGlsbC10b3BcIiB9KTtcbiAgICAgICAgICAgIHRvcC5jcmVhdGVFbChcInN0cm9uZ1wiLCB7IHRleHQ6IGVudHJ5LnJlbGF0ZWRUYXNrID8/IGVudHJ5Lm5hbWUgfSk7XG4gICAgICAgICAgICBjb25zdCBjb250cm9scyA9IHRvcC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stcGlsbC1jb250cm9sc1wiIH0pO1xuICAgICAgICAgICAgY29uc3Qgc2hyaW5rQnV0dG9uID0gY29udHJvbHMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwic2hlcmxvY2stbWluaS1idXR0b25cIiwgdGV4dDogXCItMzBtXCIgfSk7XG4gICAgICAgICAgICBjb25zdCBleHRlbmRCdXR0b24gPSBjb250cm9scy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzaGVybG9jay1taW5pLWJ1dHRvblwiLCB0ZXh0OiBcIiszMG1cIiB9KTtcbiAgICAgICAgICAgIGNvbnN0IGRlbGV0ZUJ1dHRvbiA9IGNvbnRyb2xzLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1pbmktYnV0dG9uIGRhbmdlclwiLCB0ZXh0OiBcIlx1NTIyMFx1OTY2NFwiIH0pO1xuICAgICAgICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KHNocmlua0J1dHRvbiwgXCJjbGlja1wiLCBhc3luYyAoZXZlbnQ6IE1vdXNlRXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmFkanVzdFNjaGVkdWxlRHVyYXRpb24oZW50cnkuZmlsZVBhdGgsIC0zMCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChleHRlbmRCdXR0b24sIFwiY2xpY2tcIiwgYXN5bmMgKGV2ZW50OiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5hZGp1c3RTY2hlZHVsZUR1cmF0aW9uKGVudHJ5LmZpbGVQYXRoLCAzMCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChkZWxldGVCdXR0b24sIFwiY2xpY2tcIiwgYXN5bmMgKGV2ZW50OiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5kZWxldGVQYXRoKGVudHJ5LmZpbGVQYXRoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcGlsbC5jcmVhdGVFbChcInNwYW5cIiwge1xuICAgICAgICAgICAgICBjbHM6IFwic2hlcmxvY2stbWV0YVwiLFxuICAgICAgICAgICAgICB0ZXh0OiBgJHtlbnRyeS5zdGFydCA/PyBzbG90fS0ke2VudHJ5LmVuZCA/PyB0aGlzLnJlc29sdmVTY2hlZHVsZUVuZChzbG90LCB0aGlzLnJlc29sdmVTY2hlZHVsZUR1cmF0aW9uKGVudHJ5LmR1cmF0aW9uTWludXRlcykpfSR7ZW50cnkuZHVyYXRpb25NaW51dGVzID8gYCAvICR7ZW50cnkuZHVyYXRpb25NaW51dGVzfW1gIDogXCJcIn1gXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChlbnRyeS5yZWxhdGVkVGFza1BhdGgpIHtcbiAgICAgICAgICAgICAgcGlsbC5jcmVhdGVFbChcInNwYW5cIiwgeyBjbHM6IFwic2hlcmxvY2stbWV0YVwiLCB0ZXh0OiBcIkxpbmtlZCB0YXNrXCIgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQocGlsbCwgXCJkcmFnc3RhcnRcIiwgKGV2ZW50OiBEcmFnRXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgZXZlbnQuZGF0YVRyYW5zZmVyPy5zZXREYXRhKFwiYXBwbGljYXRpb24vc2hlcmxvY2stc2NoZWR1bGVcIiwgZW50cnkuZmlsZVBhdGgpO1xuICAgICAgICAgICAgICBldmVudC5kYXRhVHJhbnNmZXI/LnNldERhdGEoXCJ0ZXh0L3BsYWluXCIsIGVudHJ5LmZpbGVQYXRoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KHBpbGwsIFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4gdGhpcy5wbHVnaW4ub3BlblBhdGgoZW50cnkuZmlsZVBhdGgpKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZU1ldHJpYyhjb250YWluZXI6IEhUTUxFbGVtZW50LCBsYWJlbDogc3RyaW5nLCB2YWx1ZTogc3RyaW5nKTogdm9pZCB7XG4gICAgY29uc3QgbWV0cmljID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1tZXRyaWNcIiB9KTtcbiAgICBtZXRyaWMuY3JlYXRlRWwoXCJkaXZcIiwgeyBjbHM6IFwic2hlcmxvY2stbWV0cmljLWxhYmVsXCIsIHRleHQ6IGxhYmVsIH0pO1xuICAgIG1ldHJpYy5jcmVhdGVFbChcImRpdlwiLCB7IGNsczogXCJzaGVybG9jay1tZXRyaWMtdmFsdWVcIiwgdGV4dDogdmFsdWUgfSk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZUFyY2hpdmVTdGF0KGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIGxhYmVsOiBzdHJpbmcsIHZhbHVlOiBudW1iZXIpOiB2b2lkIHtcbiAgICBjb25zdCBzdGF0ID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1hcmNoaXZlLXN0YXRcIiB9KTtcbiAgICBzdGF0LmNyZWF0ZUVsKFwic3Ryb25nXCIsIHsgdGV4dDogU3RyaW5nKHZhbHVlKSB9KTtcbiAgICBzdGF0LmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IGxhYmVsIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVBY3Rpb24oY29udGFpbmVyOiBIVE1MRWxlbWVudCwgbGFiZWw6IHN0cmluZywgb25DbGljazogKCkgPT4gUHJvbWlzZTx1bmtub3duPiwgc2Vjb25kYXJ5ID0gZmFsc2UpOiB2b2lkIHtcbiAgICBjb25zdCBidXR0b24gPSBjb250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IGBzaGVybG9jay1idXR0b24ke3NlY29uZGFyeSA/IFwiIHNlY29uZGFyeVwiIDogXCJcIn1gLCB0ZXh0OiBsYWJlbCB9KTtcbiAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoYnV0dG9uLCBcImNsaWNrXCIsIGFzeW5jICgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IG9uQ2xpY2soKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICAgICAgICBuZXcgTm90aWNlKGBTaGVybG9jayBPUyBcdTY0Q0RcdTRGNUNcdTU5MzFcdThEMjU6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBcIlx1NjcyQVx1NzdFNVx1OTUxOVx1OEJFRlwifWApO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZXNvbHZlV2Vla0RhdGUob2Zmc2V0OiBudW1iZXIpOiBzdHJpbmcge1xuICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgY29uc3QgZGF5ID0gbm93LmdldERheSgpO1xuICAgIGNvbnN0IG1vbmRheURlbHRhID0gZGF5ID09PSAwID8gLTYgOiAxIC0gZGF5O1xuICAgIGNvbnN0IHRhcmdldCA9IG5ldyBEYXRlKG5vdyk7XG4gICAgdGFyZ2V0LnNldERhdGUobm93LmdldERhdGUoKSArIG1vbmRheURlbHRhICsgb2Zmc2V0KTtcbiAgICByZXR1cm4gdGhpcy5mb3JtYXRMb2NhbERhdGUodGFyZ2V0KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVzb2x2ZVNjaGVkdWxlRHVyYXRpb24oZHVyYXRpb25NaW51dGVzPzogbnVtYmVyKTogbnVtYmVyIHtcbiAgICByZXR1cm4gTWF0aC5tYXgoMzAsIE1hdGgubWluKDI0MCwgZHVyYXRpb25NaW51dGVzID8/IERFRkFVTFRfU0NIRURVTEVfRFVSQVRJT05fTUlOVVRFUykpO1xuICB9XG5cbiAgcHJpdmF0ZSByZXNvbHZlU2NoZWR1bGVFbmQoc3RhcnQ6IHN0cmluZywgZHVyYXRpb25NaW51dGVzPzogbnVtYmVyKTogc3RyaW5nIHtcbiAgICBjb25zdCBkdXJhdGlvbiA9IHRoaXMucmVzb2x2ZVNjaGVkdWxlRHVyYXRpb24oZHVyYXRpb25NaW51dGVzKTtcbiAgICBjb25zdCBbaG91ciwgbWludXRlXSA9IHN0YXJ0LnNwbGl0KFwiOlwiKS5tYXAoTnVtYmVyKTtcbiAgICBjb25zdCBlbmRNaW51dGVzID0gTWF0aC5taW4oaG91ciAqIDYwICsgbWludXRlICsgZHVyYXRpb24sIDIzICogNjAgKyAzMCk7XG4gICAgY29uc3QgZW5kSG91ciA9IE1hdGguZmxvb3IoZW5kTWludXRlcyAvIDYwKTtcbiAgICBjb25zdCBlbmRNaW51dGUgPSBlbmRNaW51dGVzICUgNjA7XG4gICAgcmV0dXJuIGAke1N0cmluZyhlbmRIb3VyKS5wYWRTdGFydCgyLCBcIjBcIil9OiR7U3RyaW5nKGVuZE1pbnV0ZSkucGFkU3RhcnQoMiwgXCIwXCIpfWA7XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVTY2hlZHVsZVBpbGxIZWlnaHQoZHVyYXRpb25NaW51dGVzPzogbnVtYmVyKTogbnVtYmVyIHtcbiAgICBjb25zdCBzdGVwcyA9IHRoaXMucmVzb2x2ZVNjaGVkdWxlRHVyYXRpb24oZHVyYXRpb25NaW51dGVzKSAvIDMwO1xuICAgIHJldHVybiA0NCArIHN0ZXBzICogMjY7XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVNYXBQb2ludChwbGFjZTogU2hlcmxvY2tQbGFjZSk6IHsgeDogbnVtYmVyOyB5OiBudW1iZXIgfSB7XG4gICAgY29uc3QgbGF0aXR1ZGUgPSBwbGFjZS5sYXRpdHVkZSA/PyAwO1xuICAgIGNvbnN0IGxvbmdpdHVkZSA9IHBsYWNlLmxvbmdpdHVkZSA/PyBNQVBfQ0VOVEVSX0xPTkdJVFVERTtcbiAgICAvLyBCYWNrLWVuZCBwcm9qZWN0aW9uIGNvbnRyYWN0OiBzaWduZWQgbG9uZ2l0dWRlIHVzZXMgZWFzdCBwb3NpdGl2ZSBhbmQgd2VzdCBuZWdhdGl2ZTtcbiAgICAvLyBzaWduZWQgbGF0aXR1ZGUgdXNlcyBub3J0aCBwb3NpdGl2ZSBhbmQgc291dGggbmVnYXRpdmUuIFRoZSBtYXAgaXMgY2VudGVyZWQgb24gQ2hpbmEuXG4gICAgY29uc3Qgd3JhcHBlZExvbmdpdHVkZSA9ICgobG9uZ2l0dWRlIC0gTUFQX0NFTlRFUl9MT05HSVRVREUgKyA1NDApICUgMzYwKSAtIDE4MDtcbiAgICBjb25zdCB4ID0gKCh3cmFwcGVkTG9uZ2l0dWRlICsgMTgwKSAvIDM2MCkgKiAxMDA7XG4gICAgY29uc3QgeSA9ICgoOTAgLSBsYXRpdHVkZSkgLyAxODApICogMTAwO1xuICAgIHJldHVybiB7XG4gICAgICB4OiBNYXRoLm1heCg0LCBNYXRoLm1pbig5NiwgeCkpLFxuICAgICAgeTogTWF0aC5tYXgoOCwgTWF0aC5taW4oOTIsIHkpKVxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGluZGV4U2NoZWR1bGVzKGl0ZW1zOiBTaGVybG9ja1NjaGVkdWxlW10pOiBNYXA8c3RyaW5nLCBTaGVybG9ja1NjaGVkdWxlW10+IHtcbiAgICBjb25zdCBpbmRleCA9IG5ldyBNYXA8c3RyaW5nLCBTaGVybG9ja1NjaGVkdWxlW10+KCk7XG4gICAgaXRlbXMuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgaWYgKCFpdGVtLmRheSB8fCAhaXRlbS5zdGFydCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBrZXkgPSBgJHtpdGVtLmRheX18JHtpdGVtLnN0YXJ0fWA7XG4gICAgICBjb25zdCBleGlzdGluZyA9IGluZGV4LmdldChrZXkpID8/IFtdO1xuICAgICAgZXhpc3RpbmcucHVzaChpdGVtKTtcbiAgICAgIGluZGV4LnNldChrZXksIGV4aXN0aW5nKTtcbiAgICB9KTtcbiAgICByZXR1cm4gaW5kZXg7XG4gIH1cblxuICBwcml2YXRlIHBsdWdpblRhc2tDb3VudChjYXNlUGF0aDogc3RyaW5nKTogbnVtYmVyIHtcbiAgICBjb25zdCBwbHVnaW4gPSB0aGlzLnBsdWdpbjtcbiAgICBjb25zdCBjYWNoZWQgPSAocGx1Z2luIGFzIFNoZXJsb2NrT1NQbHVnaW4gJiB7XG4gICAgICBsYXRlc3RXb3Jrc3BhY2VEYXRhPzogU2hlcmxvY2tXb3Jrc3BhY2VEYXRhO1xuICAgIH0pLmxhdGVzdFdvcmtzcGFjZURhdGE7XG4gICAgaWYgKCFjYWNoZWQpIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICByZXR1cm4gY2FjaGVkLnRhc2tzLmZpbHRlcigodGFzaykgPT4gdGFzay5jYXNlUGF0aCA9PT0gY2FzZVBhdGgpLmxlbmd0aDtcbiAgfVxuXG4gIHByaXZhdGUgcmVzb2x2ZUNhc2VQcm9ncmVzcyhjYXNlUGF0aDogc3RyaW5nKTogbnVtYmVyIHtcbiAgICBjb25zdCBjYWNoZWQgPSAodGhpcy5wbHVnaW4gYXMgU2hlcmxvY2tPU1BsdWdpbiAmIHtcbiAgICAgIGxhdGVzdFdvcmtzcGFjZURhdGE/OiBTaGVybG9ja1dvcmtzcGFjZURhdGE7XG4gICAgfSkubGF0ZXN0V29ya3NwYWNlRGF0YTtcbiAgICBpZiAoIWNhY2hlZCkge1xuICAgICAgcmV0dXJuIDY7XG4gICAgfVxuICAgIGNvbnN0IGxpbmtlZCA9IGNhY2hlZC50YXNrcy5maWx0ZXIoKHRhc2spID0+IHRhc2suY2FzZVBhdGggPT09IGNhc2VQYXRoKTtcbiAgICBpZiAobGlua2VkLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIDY7XG4gICAgfVxuICAgIGNvbnN0IGRvbmUgPSBsaW5rZWQuZmlsdGVyKCh0YXNrKSA9PiB0YXNrLnN0YXR1cyA9PT0gXCJkb25lXCIpLmxlbmd0aDtcbiAgICByZXR1cm4gTWF0aC5tYXgoMTIsIE1hdGgucm91bmQoKGRvbmUgLyBsaW5rZWQubGVuZ3RoKSAqIDEwMCkpO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJQcmlvcml0eUxhYmVsKHByaW9yaXR5PzogXCJsb3dcIiB8IFwibWVkaXVtXCIgfCBcImhpZ2hcIik6IHN0cmluZyB7XG4gICAgaWYgKHByaW9yaXR5ID09PSBcImhpZ2hcIikge1xuICAgICAgcmV0dXJuIFwiSFwiO1xuICAgIH1cbiAgICBpZiAocHJpb3JpdHkgPT09IFwibG93XCIpIHtcbiAgICAgIHJldHVybiBcIkxcIjtcbiAgICB9XG4gICAgcmV0dXJuIFwiTVwiO1xuICB9XG5cbiAgcHJpdmF0ZSBjb3VudFZhdWx0RmlsZXMoZXh0ZW5zaW9uczogc3RyaW5nW10pOiBudW1iZXIge1xuICAgIGNvbnN0IG5vcm1hbGl6ZWQgPSBuZXcgU2V0KGV4dGVuc2lvbnMubWFwKChpdGVtKSA9PiBpdGVtLnRvTG93ZXJDYXNlKCkpKTtcbiAgICByZXR1cm4gdGhpcy5hcHAudmF1bHQuZ2V0RmlsZXMoKS5maWx0ZXIoKGZpbGUpID0+IG5vcm1hbGl6ZWQuaGFzKGZpbGUuZXh0ZW5zaW9uLnRvTG93ZXJDYXNlKCkpKS5sZW5ndGg7XG4gIH1cblxuICBwcml2YXRlIGZvcm1hdExvY2FsRGF0ZShkYXRlOiBEYXRlKTogc3RyaW5nIHtcbiAgICBjb25zdCB5ZWFyID0gZGF0ZS5nZXRGdWxsWWVhcigpO1xuICAgIGNvbnN0IG1vbnRoID0gU3RyaW5nKGRhdGUuZ2V0TW9udGgoKSArIDEpLnBhZFN0YXJ0KDIsIFwiMFwiKTtcbiAgICBjb25zdCBkYXkgPSBTdHJpbmcoZGF0ZS5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIFwiMFwiKTtcbiAgICByZXR1cm4gYCR7eWVhcn0tJHttb250aH0tJHtkYXl9YDtcbiAgfVxuXG4gIHByaXZhdGUgcmVzb2x2ZVBlcmlvZCgpOiBcImRheVwiIHwgXCJuaWdodFwiIHtcbiAgICBjb25zdCBob3VyID0gbmV3IERhdGUoKS5nZXRIb3VycygpO1xuICAgIHJldHVybiBob3VyID49IDcgJiYgaG91ciA8IDE4ID8gXCJkYXlcIiA6IFwibmlnaHRcIjtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlUGFybG9yQmFja2Ryb3Aoc2hlbGw6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgY29uc3QgYmFja2Ryb3AgPSBzaGVsbC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stcGFybG9yLWJhY2tkcm9wXCIgfSk7XG4gICAgYmFja2Ryb3Auc3R5bGUuYmFja2dyb3VuZEltYWdlID0gYHVybChcIiR7dGhpcy5wbHVnaW4uZ2V0UGFybG9ySW1hZ2VVcmwoKX1cIilgO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJGYWxsYmFjayhlcnJvcjogdW5rbm93bik6IHZvaWQge1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgdGhpcy5jb250ZW50RWwuYWRkQ2xhc3MoXCJzaGVybG9jay1vcy12aWV3XCIpO1xuICAgIGNvbnN0IHBhbmVsID0gdGhpcy5jb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLXBhbmVsXCIgfSk7XG4gICAgcGFuZWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiU2hlcmxvY2sgT1MgXHU2NjgyXHU2NUY2XHU2NzJBXHU4MEZEXHU2RTMyXHU2N0QzXCIgfSk7XG4gICAgcGFuZWwuY3JlYXRlRWwoXCJwXCIsIHtcbiAgICAgIHRleHQ6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogXCJVbmtub3duIHJlbmRlciBlcnJvclwiXG4gICAgfSk7XG4gICAgcGFuZWwuY3JlYXRlRWwoXCJwXCIsIHtcbiAgICAgIHRleHQ6IFwiXHU4QzAzXHU4QkQ1XHU2NUU1XHU1RkQ3XHU1REYyXHU1MTk5XHU1MTY1IC90bXAvc2hlcmxvY2stb3MtZGVidWcubG9nXCJcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgZmluZENhc2VFdmlkZW5jZShjdXJyZW50Q2FzZTogU2hlcmxvY2tDYXNlKTogU2hlcmxvY2tFdmlkZW5jZUl0ZW1bXSB7XG4gICAgY29uc3QgZXZpZGVuY2VSb290ID0gYCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZpZGVuY2VGb2xkZXIucmVwbGFjZSgvXFwvJC8sIFwiXCIpfS9gO1xuICAgIGNvbnN0IGNhc2VUb2tlbnMgPSBbXG4gICAgICBjdXJyZW50Q2FzZS5uYW1lLFxuICAgICAgY3VycmVudENhc2UuZmlsZVBhdGgsXG4gICAgICBjdXJyZW50Q2FzZS5maWxlUGF0aC5zcGxpdChcIi9cIikucG9wKCk/LnJlcGxhY2UoL1xcLm1kJC9pLCBcIlwiKVxuICAgIF1cbiAgICAgIC5maWx0ZXIoKHZhbHVlKTogdmFsdWUgaXMgc3RyaW5nID0+IEJvb2xlYW4odmFsdWUpKVxuICAgICAgLm1hcCgodmFsdWUpID0+IHRoaXMubm9ybWFsaXplRXZpZGVuY2VUb2tlbih2YWx1ZSkpO1xuXG4gICAgcmV0dXJuIHRoaXMuYXBwLnZhdWx0LmdldEZpbGVzKClcbiAgICAgIC5maWx0ZXIoKGZpbGUpID0+IGZpbGUucGF0aC5zdGFydHNXaXRoKGV2aWRlbmNlUm9vdCkpXG4gICAgICAuZmlsdGVyKChmaWxlKSA9PiB7XG4gICAgICAgIGNvbnN0IGNhY2hlID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk7XG4gICAgICAgIGNvbnN0IGZyb250bWF0dGVyID0gY2FjaGU/LmZyb250bWF0dGVyO1xuICAgICAgICBpZiAoZnJvbnRtYXR0ZXI/LmNhc2VQYXRoID09PSBjdXJyZW50Q2FzZS5maWxlUGF0aCB8fCBmcm9udG1hdHRlcj8uY2FzZSA9PT0gY3VycmVudENhc2UubmFtZSkge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG5vcm1hbGl6ZWRQYXRoID0gdGhpcy5ub3JtYWxpemVFdmlkZW5jZVRva2VuKGZpbGUucGF0aCk7XG4gICAgICAgIHJldHVybiBjYXNlVG9rZW5zLnNvbWUoKHRva2VuKSA9PiB0b2tlbi5sZW5ndGggPiAwICYmIG5vcm1hbGl6ZWRQYXRoLmluY2x1ZGVzKHRva2VuKSk7XG4gICAgICB9KVxuICAgICAgLm1hcCgoZmlsZSkgPT4gKHsgZmlsZSwga2luZDogdGhpcy5yZXNvbHZlRXZpZGVuY2VLaW5kKGZpbGUuZXh0ZW5zaW9uKSB9KSlcbiAgICAgIC5zb3J0KChhLCBiKSA9PiBhLmZpbGUuYmFzZW5hbWUubG9jYWxlQ29tcGFyZShiLmZpbGUuYmFzZW5hbWUpKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVzb2x2ZUV2aWRlbmNlS2luZChleHRlbnNpb246IHN0cmluZyk6IFNoZXJsb2NrRXZpZGVuY2VLaW5kIHtcbiAgICBjb25zdCBleHQgPSBleHRlbnNpb24udG9Mb3dlckNhc2UoKTtcbiAgICBpZiAoZXh0ID09PSBcIm1kXCIpIHtcbiAgICAgIHJldHVybiBcIm1hcmtkb3duXCI7XG4gICAgfVxuICAgIGlmIChleHQgPT09IFwicGRmXCIpIHtcbiAgICAgIHJldHVybiBcInBkZlwiO1xuICAgIH1cbiAgICBpZiAoW1wicG5nXCIsIFwianBnXCIsIFwianBlZ1wiLCBcImdpZlwiLCBcIndlYnBcIiwgXCJzdmdcIl0uaW5jbHVkZXMoZXh0KSkge1xuICAgICAgcmV0dXJuIFwiaW1hZ2VcIjtcbiAgICB9XG4gICAgcmV0dXJuIFwibG9jYWxcIjtcbiAgfVxuXG4gIHByaXZhdGUgbm9ybWFsaXplRXZpZGVuY2VUb2tlbih2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdmFsdWUudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9bXFxzL19cXFxcLi1dKy9nLCBcIlwiKTtcbiAgfVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFBQUEsbUJBUU87QUFDUCxnQkFBNkM7QUFDN0Msa0JBQXFCO0FBQ3JCLHNCQUFzQjs7O0FDWHRCLHNCQUEwQztBQWExQyxJQUFNLGVBQXFDLENBQUMsUUFBUSxRQUFRLFlBQVksY0FBYyxZQUFZLE9BQU87QUFFekcsZUFBc0IsY0FBYyxLQUFVLFVBQWlEO0FBQzdGLFFBQU0sVUFBVTtBQUFBLElBQ2QsU0FBUztBQUFBLElBQ1QsU0FBUztBQUFBLElBQ1QsU0FBUztBQUFBLElBQ1QsU0FBUztBQUFBLElBQ1QsU0FBUztBQUFBLElBQ1QsU0FBUztBQUFBLEVBQ1g7QUFFQSxhQUFXLFVBQVUsU0FBUztBQUM1QixVQUFNLGlCQUFhLCtCQUFjLE1BQU07QUFDdkMsVUFBTSxXQUFXLFdBQVcsTUFBTSxHQUFHLEVBQUUsT0FBTyxPQUFPO0FBQ3JELFFBQUksVUFBVTtBQUVkLGVBQVcsV0FBVyxVQUFVO0FBQzlCLGdCQUFVLFVBQVUsR0FBRyxPQUFPLElBQUksT0FBTyxLQUFLO0FBQzlDLFlBQU0sa0JBQWMsK0JBQWMsT0FBTztBQUN6QyxVQUFJLElBQUksTUFBTSxzQkFBc0IsV0FBVyxHQUFHO0FBQ2hEO0FBQUEsTUFDRjtBQUVBLFVBQUk7QUFDRixjQUFNLElBQUksTUFBTSxhQUFhLFdBQVc7QUFBQSxNQUMxQyxTQUFTLE9BQU87QUFDZCxjQUFNLFVBQVUsaUJBQWlCLFFBQVEsTUFBTSxVQUFVLE9BQU8sS0FBSztBQUNyRSxZQUFJLENBQUMsUUFBUSxTQUFTLHVC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TSxTQUFTLE1BQU0sVUFBVSxPQUFPLEtBQUs7QUFDcEYsV0FBSyxTQUFTLG9CQUFvQixPQUFPLEVBQUU7QUFBQSxJQUM3QztBQUFBLEVBQ0Y7QUFBQSxFQUVBLE1BQWMsb0JBQW1DO0FBQy9DLFVBQU0sS0FBSyxtQkFBbUIsdUJBQXVCLGNBQWM7QUFBQSxFQUNyRTtBQUFBLEVBRUEsTUFBYyxzQkFBcUM7QUFDakQsVUFBTSxLQUFLLG1CQUFtQiwwQkFBMEIsaUJBQWlCO0FBQUEsRUFDM0U7QUFBQSxFQUVBLE1BQWMsbUJBQW1CLFVBQWtCLFdBQWtDO0FBQ25GLFVBQU0sVUFBVSxLQUFLLElBQUksTUFBTTtBQUMvQixRQUFJLENBQUMsS0FBSyxJQUFJLE1BQU0sc0JBQXNCLG9CQUFvQixHQUFHO0FBQy9ELFVBQUk7QUFDRixjQUFNLEtBQUssSUFBSSxNQUFNLGFBQWEsb0JBQW9CO0FBQUEsTUFDeEQsU0FBUyxPQUFPO0FBQ2QsY0FBTSxVQUFVLGlCQUFpQixRQUFRLE1BQU0sVUFBVSxPQUFPLEtBQUs7QUFDckUsWUFBSSxDQUFDLFFBQVEsU0FBUyx1QkFBdUIsR0FBRztBQUM5QyxnQkFBTTtBQUFBLFFBQ1I7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUVBLFVBQU0sYUFBYSxzQkFBc0IsUUFBUTtBQUVqRCxRQUFJO0FBQ0YsWUFBTSxvQkFBb0I7QUFDMUIsWUFBTSxXQUFXLGtCQUFrQixjQUFjO0FBQ2pELFVBQUksQ0FBQyxVQUFVO0FBQ2IsYUFBSyxTQUFTLEdBQUcsU0FBUyxvQkFBb0I7QUFDOUM7QUFBQSxNQUNGO0FBRUEsWUFBTSxzQkFBa0I7QUFBQSxRQUN0QjtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQSxLQUFLLFNBQVM7QUFBQSxRQUNkO0FBQUEsUUFDQTtBQUFBLE1BQ0Y7QUFDQSxZQUFNLGFBQVMsd0JBQWEsZUFBZTtBQUMzQyxZQUFNLE9BQU8sT0FBTyxPQUFPLE1BQU0sT0FBTyxZQUFZLE9BQU8sYUFBYSxPQUFPLFVBQVU7QUFDekYsWUFBTSxRQUFRLFlBQVksWUFBWSxJQUFJO0FBQUEsSUFDNUMsU0FBUyxPQUFPO0FBQ2QsWUFBTSxVQUFVLGlCQUFpQixRQUFRLE1BQU0sU0FBUyxNQUFNLFVBQVUsT0FBTyxLQUFLO0FBQ3BGLFdBQUssU0FBUyxHQUFHLFNBQVMsU0FBUyxPQUFPLEVBQUU7QUFBQSxJQUM5QztBQUFBLEVBQ0Y7QUFDRjsiLAogICJuYW1lcyI6IFsiaW1wb3J0X29ic2lkaWFuIiwgImltcG9ydF9vYnNpZGlhbiIsICJpbXBvcnRfb2JzaWRpYW4iLCAic2hlbGwiLCAiaXRlbSJdCn0K
