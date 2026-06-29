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
    this.renderDeskHeader(shell2, "Memory Map", "\u8DB3\u8FF9\u5730\u56FE", "\u57CE\u5E02\u662F\u8BB0\u5FC6\u5750\u6807\u3002\u70B9\u5F00\u4E00\u6B21\u5230\u8BBF\uFF0C\u5C31\u80FD\u7EE7\u7EED\u8865\u5C01\u9762\u3001\u7167\u7247\u5899\u3001\u65F6\u95F4\u3001\u7B14\u8BB0\u548C\u6848\u4EF6/\u9605\u8BFB\u5173\u8054\u3002", [
      { label: "\u65B0\u5EFA\u8DB3\u8FF9", action: async () => this.plugin.createPlaceNote() }
    ]);
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
    const addButton = header.createEl("button", { cls: "sherlock-mini-button", text: "\u65B0\u5EFA\u8DB3\u8FF9" });
    this.registerDomEvent(addButton, "click", async () => this.plugin.createPlaceNote());
    const map = card.createDiv({ cls: "sherlock-footprint-map" });
    map.style.backgroundImage = `linear-gradient(180deg, rgba(47, 25, 9, 0.1), rgba(47, 25, 9, 0.22)), url("${this.plugin.getWorldMapImageUrl()}"), linear-gradient(135deg, #b38a52, #d5b778 42%, #9c6c35)`;
    const places = data.places.filter((place) => typeof place.latitude === "number" && typeof place.longitude === "number").slice(0, 80);
    if (places.length === 0) {
      map.createEl("p", { cls: "sherlock-empty sherlock-map-empty", text: "\u8FD8\u6CA1\u6709\u8DB3\u8FF9\u3002\u65B0\u5EFA\u4E00\u6B21\u5230\u8BBF\u8BB0\u5F55\u540E\uFF0C\u5730\u56FE\u4F1A\u4EAE\u8D77\u7B2C\u4E00\u4E2A\u5750\u6807\u3002" });
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
    const input = await PlaceCaptureModal.request(this.app);
    if (!input) {
      return null;
    }
    try {
      const file = await createTypedNote(
        this.app,
        this.settings.placeFolder,
        input.title,
        buildPlaceTemplate(
          input.title,
          input.latitude,
          input.longitude,
          input.latitudeHemisphere,
          input.longitudeHemisphere
        )
      );
      await this.openFile(file);
      return file;
    } catch (error) {
      this.debugLog(`createPlaceNote:error:${error instanceof Error ? error.stack ?? error.message : String(error)}`);
      new import_obsidian4.Notice(`\u65E0\u6CD5\u521B\u5EFA\u8DB3\u8FF9: ${error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF"}`);
      return null;
    }
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
var PlaceCaptureModal = class _PlaceCaptureModal extends import_obsidian4.Modal {
  constructor() {
    super(...arguments);
    this.titleValue = "";
    this.longitudeHemisphere = "E";
    this.latitudeValue = "";
    this.latitudeHemisphere = "N";
    this.longitudeValue = "";
  }
  static request(app) {
    return new Promise((resolve) => {
      const modal = new _PlaceCaptureModal(app);
      modal.resolveInput = resolve;
      modal.open();
    });
  }
  onOpen() {
    this.setTitle("\u65B0\u5EFA\u8DB3\u8FF9");
    this.contentEl.empty();
    new import_obsidian4.Setting(this.contentEl).setName("\u5730\u70B9\u540D\u79F0").addText((text) => text.setPlaceholder("\u4F8B\u5982 \u4E0A\u6D77 / Iceland").onChange((value) => {
      this.titleValue = value.trim();
    }));
    new import_obsidian4.Setting(this.contentEl).setName("\u7ECF\u5EA6\u65B9\u5411").addDropdown((dropdown) => dropdown.addOption("E", "\u4E1C\u7ECF E").addOption("W", "\u897F\u7ECF W").setValue(this.longitudeHemisphere).onChange((value) => {
      this.longitudeHemisphere = value === "W" ? "W" : "E";
    }));
    new import_obsidian4.Setting(this.contentEl).setName("\u7ECF\u5EA6").setDesc("\u586B\u5199 0 \u5230 180\uFF0C\u4FDD\u5B58\u5230\u5C0F\u6570\u70B9\u540E\u4E24\u4F4D\u3002").addText((text) => text.setPlaceholder("121.5").onChange((value) => {
      this.longitudeValue = value.trim();
    }));
    new import_obsidian4.Setting(this.contentEl).setName("\u7EAC\u5EA6\u65B9\u5411").addDropdown((dropdown) => dropdown.addOption("N", "\u5317\u7EAC N").addOption("S", "\u5357\u7EAC S").setValue(this.latitudeHemisphere).onChange((value) => {
      this.latitudeHemisphere = value === "S" ? "S" : "N";
    }));
    new import_obsidian4.Setting(this.contentEl).setName("\u7EAC\u5EA6").setDesc("\u586B\u5199 0 \u5230 90\uFF0C\u4FDD\u5B58\u5230\u5C0F\u6570\u70B9\u540E\u4E24\u4F4D\u3002").addText((text) => text.setPlaceholder("31.23").onChange((value) => {
      this.latitudeValue = value.trim();
    }));
    new import_obsidian4.Setting(this.contentEl).addButton((button) => button.setButtonText("\u53D6\u6D88").onClick(() => {
      this.resolveInput?.(null);
      this.close();
    })).addButton((button) => button.setCta().setButtonText("\u521B\u5EFA").onClick(() => {
      const input = this.parseInput();
      if (!input) {
        return;
      }
      this.resolveInput?.(input);
      this.close();
    }));
  }
  onClose() {
    this.contentEl.empty();
  }
  parseInput() {
    if (!this.titleValue) {
      new import_obsidian4.Notice("\u9700\u8981\u586B\u5199\u5730\u70B9\u540D\u79F0\u3002");
      return null;
    }
    const longitudeMagnitude = this.parseCoordinate(this.longitudeValue, 0, 180, "\u7ECF\u5EA6");
    if (longitudeMagnitude === null) {
      return null;
    }
    const latitudeMagnitude = this.parseCoordinate(this.latitudeValue, 0, 90, "\u7EAC\u5EA6");
    if (latitudeMagnitude === null) {
      return null;
    }
    const longitude = this.applyHemisphere(longitudeMagnitude, this.longitudeHemisphere);
    const latitude = this.applyHemisphere(latitudeMagnitude, this.latitudeHemisphere);
    return {
      title: this.titleValue,
      latitude,
      longitude,
      latitudeHemisphere: this.latitudeHemisphere,
      longitudeHemisphere: this.longitudeHemisphere
    };
  }
  parseCoordinate(raw, min, max, label) {
    const value = Number(raw);
    if (!Number.isFinite(value) || value < min || value > max) {
      new import_obsidian4.Notice(`${label}\u9700\u8981\u586B\u5199 ${min} \u5230 ${max} \u4E4B\u95F4\u7684\u6570\u5B57\u3002`);
      return null;
    }
    return Math.round(value * 100) / 100;
  }
  applyHemisphere(value, hemisphere) {
    const signed = hemisphere === "S" || hemisphere === "W" ? -value : value;
    return Math.round(signed * 100) / 100;
  }
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2RhdGEudHMiLCAic3JjL3NldHRpbmdzLnRzIiwgInNyYy92aWV3LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQge1xuICBBcHAsXG4gIE1vZGFsLFxuICBOb3RpY2UsXG4gIFBsdWdpbixcbiAgUGx1Z2luTWFuaWZlc3QsXG4gIFNldHRpbmcsXG4gIFRBYnN0cmFjdEZpbGUsXG4gIFRGaWxlLFxuICBXb3Jrc3BhY2VMZWFmXG59IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHsgYXBwZW5kRmlsZVN5bmMsIHJlYWRGaWxlU3luYyB9IGZyb20gXCJmc1wiO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBzaGVsbCB9IGZyb20gXCJlbGVjdHJvblwiO1xuaW1wb3J0IHtcbiAgYnVpbGRDYXNlVGVtcGxhdGUsXG4gIGJ1aWxkQ29sbGVjdGlvblRlbXBsYXRlLFxuICBidWlsZEV2aWRlbmNlVGVtcGxhdGUsXG4gIGJ1aWxkUGxhY2VUZW1wbGF0ZSxcbiAgYnVpbGRTY2hlZHVsZVRlbXBsYXRlLFxuICBidWlsZFRhc2tUZW1wbGF0ZSxcbiAgY29sbGVjdFdvcmtzcGFjZURhdGEsXG4gIGNyZWF0ZVR5cGVkTm90ZSxcbiAgZW5zdXJlRm9sZGVycyxcbiAgZm9ybWF0TG9jYWxEYXRlXG59IGZyb20gXCIuL2RhdGFcIjtcbmltcG9ydCB7IFNoZXJsb2NrU2V0dGluZ1RhYiB9IGZyb20gXCIuL3NldHRpbmdzXCI7XG5pbXBvcnQgdHlwZSB7IFNoZXJsb2NrUGx1Z2luU2V0dGluZ3MsIFNoZXJsb2NrV29ya3NwYWNlRGF0YSB9IGZyb20gXCIuL3R5cGVzXCI7XG5pbXBvcnQgeyBMRUdBQ1lfU0hFUkxPQ0tfVklFV19UWVBFLCBTaGVybG9ja1dvcmtzcGFjZVZpZXcsIFNIRVJMT0NLX1ZJRVdfVFlQRSB9IGZyb20gXCIuL3ZpZXdcIjtcblxuY29uc3QgREVGQVVMVF9TRVRUSU5HUzogU2hlcmxvY2tQbHVnaW5TZXR0aW5ncyA9IHtcbiAgY2FzZUZvbGRlcjogXCJTaGVybG9jayBPUy9DYXNlc1wiLFxuICB0YXNrRm9sZGVyOiBcIlNoZXJsb2NrIE9TL1Rhc2tzXCIsXG4gIHNjaGVkdWxlRm9sZGVyOiBcIlNoZXJsb2NrIE9TL1NjaGVkdWxlc1wiLFxuICBjb2xsZWN0aW9uRm9sZGVyOiBcIlNoZXJsb2NrIE9TL0NvbGxlY3Rpb25zXCIsXG4gIGV2aWRlbmNlRm9sZGVyOiBcIlNoZXJsb2NrIE9TL0V2aWRlbmNlXCIsXG4gIHBsYWNlRm9sZGVyOiBcIlNoZXJsb2NrIE9TL1BsYWNlc1wiLFxuICBmb2dEZW5zaXR5OiA0OCxcbiAgbW90aW9uSW50ZW5zaXR5OiAzNixcbiAgbGFtcEdsb3c6IDU4XG59O1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTaGVybG9ja09TUGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcbiAgc2V0dGluZ3M6IFNoZXJsb2NrUGx1Z2luU2V0dGluZ3MgPSBERUZBVUxUX1NFVFRJTkdTO1xuICBsYXRlc3RXb3Jrc3BhY2VEYXRhPzogU2hlcmxvY2tXb3Jrc3BhY2VEYXRhO1xuXG4gIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBtYW5pZmVzdDogUGx1Z2luTWFuaWZlc3QpIHtcbiAgICBzdXBlcihhcHAsIG1hbmlmZXN0KTtcbiAgfVxuXG4gIGFzeW5jIG9ubG9hZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgdGhpcy5kZWJ1Z0xvZyhcIm9ubG9hZDpzdGFydFwiKTtcbiAgICAgIGF3YWl0IHRoaXMubG9hZFNldHRpbmdzKCk7XG4gICAgICB0aGlzLmRlYnVnTG9nKFwib25sb2FkOnNldHRpbmdzLWxvYWRlZFwiKTtcbiAgICAgIHRoaXMuZW5hYmxlR2xvYmFsU3R5bGUoKTtcbiAgICAgIGF3YWl0IGVuc3VyZUZvbGRlcnModGhpcy5hcHAsIHRoaXMuc2V0dGluZ3MpO1xuICAgICAgdGhpcy5kZWJ1Z0xvZyhcIm9ubG9hZDpmb2xkZXJzLWVuc3VyZWRcIik7XG4gICAgICBhd2FpdCB0aGlzLmVuc3VyZUVudHJ5QXNzZXQoKTtcbiAgICAgIHRoaXMuZGVidWdMb2coXCJvbmxvYWQ6ZW50cnktYXNzZXQtZW5zdXJlZFwiKTtcbiAgICAgIGF3YWl0IHRoaXMuZW5zdXJlUGFybG9yQXNzZXQoKTtcbiAgICAgIHRoaXMuZGVidWdMb2coXCJvbmxvYWQ6cGFybG9yLWFzc2V0LWVuc3VyZWRcIik7XG4gICAgICBhd2FpdCB0aGlzLmVuc3VyZVdvcmxkTWFwQXNzZXQoKTtcbiAgICAgIHRoaXMuZGVidWdMb2coXCJvbmxvYWQ6d29ybGQtbWFwLWFzc2V0LWVuc3VyZWRcIik7XG5cbiAgICAgIHRoaXMucmVnaXN0ZXJWaWV3KFxuICAgICAgICBTSEVSTE9DS19WSUVXX1RZUEUsXG4gICAgICAgIChsZWFmKSA9PiBuZXcgU2hlcmxvY2tXb3Jrc3BhY2VWaWV3KGxlYWYsIHRoaXMpXG4gICAgICApO1xuICAgICAgdGhpcy5yZWdpc3RlclZpZXcoXG4gICAgICAgIExFR0FDWV9TSEVSTE9DS19WSUVXX1RZUEUsXG4gICAgICAgIChsZWFmKSA9PiBuZXcgU2hlcmxvY2tXb3Jrc3BhY2VWaWV3KGxlYWYsIHRoaXMpXG4gICAgICApO1xuXG4gICAgICB0aGlzLmFkZFJpYmJvbkljb24oXCJzZWFyY2gtY2hlY2tcIiwgXCJPcGVuIFNoZXJsb2NrXCIsIGFzeW5jICgpID0+IHtcbiAgICAgICAgYXdhaXQgdGhpcy5hY3RpdmF0ZVdvcmtzcGFjZVZpZXcoKTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICBpZDogXCJvcGVuLXNoZXJsb2NrLXdvcmtzcGFjZVwiLFxuICAgICAgICBuYW1lOiBcIk9wZW4gU2hlcmxvY2sgd29ya3NwYWNlXCIsXG4gICAgICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB0aGlzLmFjdGl2YXRlV29ya3NwYWNlVmlldygpXG4gICAgICB9KTtcblxuICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgaWQ6IFwiY3JlYXRlLWNhc2UtZmlsZVwiLFxuICAgICAgICBuYW1lOiBcIkNyZWF0ZSBhIG5ldyBjYXNlIGZpbGVcIixcbiAgICAgICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHRoaXMuY3JlYXRlQ2FzZU5vdGUoKVxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgIGlkOiBcImNyZWF0ZS10YXNrLWZpbGVcIixcbiAgICAgICAgbmFtZTogXCJDcmVhdGUgYSBuZXcgdGFzayBmaWxlXCIsXG4gICAgICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB0aGlzLmNyZWF0ZVRhc2tOb3RlKClcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICBpZDogXCJjcmVhdGUtdGFzay1mb3ItYWN0aXZlLWNhc2VcIixcbiAgICAgICAgbmFtZTogXCJDcmVhdGUgYSB0YXNrIGZvciB0aGUgY3VycmVudCBjYXNlXCIsXG4gICAgICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB0aGlzLmNyZWF0ZVRhc2tGb3JBY3RpdmVDYXNlKClcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICBpZDogXCJjcmVhdGUtZXZpZGVuY2UtZm9yLWFjdGl2ZS1jYXNlXCIsXG4gICAgICAgIG5hbWU6IFwiQ3JlYXRlIGV2aWRlbmNlIGZvciB0aGUgY3VycmVudCBjYXNlXCIsXG4gICAgICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB0aGlzLmNyZWF0ZUV2aWRlbmNlRm9yQWN0aXZlQ2FzZSgpXG4gICAgICB9KTtcblxuICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgaWQ6IFwiY3JlYXRlLXNjaGVkdWxlLWZpbGVcIixcbiAgICAgICAgbmFtZTogXCJDcmVhdGUgYSBuZXcgc2NoZWR1bGUgZmlsZVwiLFxuICAgICAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4gdGhpcy5jcmVhdGVTY2hlZHVsZU5vdGUoKVxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgIGlkOiBcImNyZWF0ZS1jb2xsZWN0aW9uLWZpbGVcIixcbiAgICAgICAgbmFtZTogXCJDcmVhdGUgYSBuZXcgY29sbGVjdGlvbiBpdGVtXCIsXG4gICAgICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB0aGlzLmNyZWF0ZUNvbGxlY3Rpb25Ob3RlKClcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICBpZDogXCJjcmVhdGUtcGxhY2UtZmlsZVwiLFxuICAgICAgICBuYW1lOiBcIkNyZWF0ZSBhIG5ldyBmb290cHJpbnQgcGxhY2VcIixcbiAgICAgICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHRoaXMuY3JlYXRlUGxhY2VOb3RlKClcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLmFkZFNldHRpbmdUYWIobmV3IFNoZXJsb2NrU2V0dGluZ1RhYih0aGlzLmFwcCwgdGhpcykpO1xuXG4gICAgICB0aGlzLnJlZ2lzdGVyRXZlbnQodGhpcy5hcHAudmF1bHQub24oXCJjcmVhdGVcIiwgKCkgPT4gdGhpcy5yZWZyZXNoV29ya3NwYWNlKCkpKTtcbiAgICAgIHRoaXMucmVnaXN0ZXJFdmVudCh0aGlzLmFwcC52YXVsdC5vbihcIm1vZGlmeVwiLCAoKSA9PiB0aGlzLnJlZnJlc2hXb3Jrc3BhY2UoKSkpO1xuICAgICAgdGhpcy5yZWdpc3RlckV2ZW50KHRoaXMuYXBwLnZhdWx0Lm9uKFwiZGVsZXRlXCIsICgpID0+IHRoaXMucmVmcmVzaFdvcmtzcGFjZSgpKSk7XG4gICAgICB0aGlzLmFwcC53b3Jrc3BhY2Uub25MYXlvdXRSZWFkeSgoKSA9PiB7XG4gICAgICAgIHRoaXMuZGVidWdMb2coXCJsYXlvdXQtcmVhZHk6YWN0aXZhdGVcIik7XG4gICAgICAgIHRoaXMuYXBwLndvcmtzcGFjZS5kZXRhY2hMZWF2ZXNPZlR5cGUoTEVHQUNZX1NIRVJMT0NLX1ZJRVdfVFlQRSk7XG4gICAgICAgIHZvaWQgdGhpcy5hY3RpdmF0ZVdvcmtzcGFjZVZpZXcoKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5kZWJ1Z0xvZyhcIm9ubG9hZDpjb21wbGV0ZVwiKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5kZWJ1Z0xvZyhgb25sb2FkOmVycm9yOiR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLnN0YWNrID8/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgb251bmxvYWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QucmVtb3ZlKFwic2hlcmxvY2stZ2xvYmFsLXN0eWxlXCIpO1xuICAgIHRoaXMuYXBwLndvcmtzcGFjZS5kZXRhY2hMZWF2ZXNPZlR5cGUoTEVHQUNZX1NIRVJMT0NLX1ZJRVdfVFlQRSk7XG4gICAgdGhpcy5hcHAud29ya3NwYWNlLmRldGFjaExlYXZlc09mVHlwZShTSEVSTE9DS19WSUVXX1RZUEUpO1xuICB9XG5cbiAgYXN5bmMgbG9hZFNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMuc2V0dGluZ3MgPSB7XG4gICAgICAuLi5ERUZBVUxUX1NFVFRJTkdTLFxuICAgICAgLi4uKGF3YWl0IHRoaXMubG9hZERhdGEoKSlcbiAgICB9O1xuICB9XG5cbiAgYXN5bmMgc2F2ZVNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncyk7XG4gICAgYXdhaXQgZW5zdXJlRm9sZGVycyh0aGlzLmFwcCwgdGhpcy5zZXR0aW5ncyk7XG4gICAgYXdhaXQgdGhpcy5yZWZyZXNoV29ya3NwYWNlKCk7XG4gIH1cblxuICBhc3luYyBnZXRXb3Jrc3BhY2VEYXRhKCk6IFByb21pc2U8U2hlcmxvY2tXb3Jrc3BhY2VEYXRhPiB7XG4gICAgdHJ5IHtcbiAgICAgIHRoaXMubGF0ZXN0V29ya3NwYWNlRGF0YSA9IGF3YWl0IGNvbGxlY3RXb3Jrc3BhY2VEYXRhKHRoaXMuYXBwKTtcbiAgICAgIHJldHVybiB0aGlzLmxhdGVzdFdvcmtzcGFjZURhdGE7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMuZGVidWdMb2coYGdldFdvcmtzcGFjZURhdGE6ZXJyb3I6JHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3Iuc3RhY2sgPz8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICBhc3luYyBhY3RpdmF0ZVdvcmtzcGFjZVZpZXcoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgd29ya3NwYWNlIH0gPSB0aGlzLmFwcDtcbiAgICAgIHRoaXMuZGVidWdMb2coXCJhY3RpdmF0ZTpzdGFydFwiKTtcbiAgICAgIGxldCBsZWFmID0gd29ya3NwYWNlLmdldExlYXZlc09mVHlwZShTSEVSTE9DS19WSUVXX1RZUEUpWzBdID8/IG51bGw7XG5cbiAgICAgIGlmICghbGVhZikge1xuICAgICAgICB0aGlzLmRlYnVnTG9nKFwiYWN0aXZhdGU6Y3JlYXRlLWxlYWZcIik7XG4gICAgICAgIGxlYWYgPSB3b3Jrc3BhY2UuZ2V0TGVhZihcInRhYlwiKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFsZWFmKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoXCJTaGVybG9jayBcdTY1RTBcdTZDRDVcdTYyNTNcdTVGMDBcdTRFM0JcdTVERTVcdTRGNUNcdTUzM0FcdTg5QzZcdTU2RkVcdTMwMDJcIik7XG4gICAgICAgIHRoaXMuZGVidWdMb2coXCJhY3RpdmF0ZTpuby1sZWFmXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHRoaXMuZGVidWdMb2coXCJhY3RpdmF0ZTpzZXQtdmlldy1zdGF0ZTpzdGFydFwiKTtcbiAgICAgIGF3YWl0IGxlYWYuc2V0Vmlld1N0YXRlKHsgdHlwZTogU0hFUkxPQ0tfVklFV19UWVBFLCBzdGF0ZToge30sIGFjdGl2ZTogdHJ1ZSB9KTtcbiAgICAgIHRoaXMuZGVidWdMb2coXCJhY3RpdmF0ZTpzZXQtdmlldy1zdGF0ZTpjb21wbGV0ZVwiKTtcbiAgICAgIHdvcmtzcGFjZS5zZXRBY3RpdmVMZWFmKGxlYWYsIHsgZm9jdXM6IHRydWUgfSk7XG4gICAgICB3b3Jrc3BhY2UucmV2ZWFsTGVhZihsZWFmKTtcbiAgICAgIGNvbnN0IHZpZXcgPSBsZWFmLnZpZXc7XG4gICAgICBpZiAodmlldyBpbnN0YW5jZW9mIFNoZXJsb2NrV29ya3NwYWNlVmlldykge1xuICAgICAgICB0aGlzLmRlYnVnTG9nKFwiYWN0aXZhdGU6cmVzZXQtZW50cnk6c3RhcnRcIik7XG4gICAgICAgIGF3YWl0IHZpZXcucmVzZXRUb0VudHJ5KCk7XG4gICAgICAgIHRoaXMuZGVidWdMb2coXCJhY3RpdmF0ZTpyZXNldC1lbnRyeTpjb21wbGV0ZVwiKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZGVidWdMb2coYGFjdGl2YXRlOnVuZXhwZWN0ZWQtdmlldzoke3ZpZXcuZ2V0Vmlld1R5cGUoKX1gKTtcbiAgICAgICAgYXdhaXQgdGhpcy5yZWZyZXNoV29ya3NwYWNlKCk7XG4gICAgICB9XG4gICAgICB0aGlzLmRlYnVnTG9nKGBhY3RpdmF0ZTpjb21wbGV0ZToke2xlYWYudmlldy5nZXRWaWV3VHlwZSgpfWApO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmRlYnVnTG9nKGBhY3RpdmF0ZTplcnJvcjoke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5zdGFjayA/PyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgICAgIG5ldyBOb3RpY2UoYFNoZXJsb2NrIFx1NjI1M1x1NUYwMFx1NTkzMVx1OEQyNTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFwiXHU2NzJBXHU3N0U1XHU5NTE5XHU4QkVGXCJ9YCk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcmVmcmVzaFdvcmtzcGFjZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBsZWF2ZXMgPSBbXG4gICAgICAuLi50aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKFNIRVJMT0NLX1ZJRVdfVFlQRSksXG4gICAgICAuLi50aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKExFR0FDWV9TSEVSTE9DS19WSUVXX1RZUEUpXG4gICAgXTtcbiAgICBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgIGxlYXZlcy5tYXAoYXN5bmMgKGxlYWYpID0+IHtcbiAgICAgICAgY29uc3QgdmlldyA9IGxlYWYudmlldztcbiAgICAgICAgaWYgKHZpZXcgaW5zdGFuY2VvZiBTaGVybG9ja1dvcmtzcGFjZVZpZXcpIHtcbiAgICAgICAgICBhd2FpdCB2aWV3LnJlZnJlc2goKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApO1xuICB9XG5cbiAgYXN5bmMgY3JlYXRlQ2FzZU5vdGUodGl0bGUgPSB0aGlzLmRlZmF1bHRUaXRsZShcIk5ldyBDYXNlXCIpKTogUHJvbWlzZTxURmlsZT4ge1xuICAgIGNvbnN0IGZpbGUgPSBhd2FpdCBjcmVhdGVUeXBlZE5vdGUoXG4gICAgICB0aGlzLmFwcCxcbiAgICAgIHRoaXMuc2V0dGluZ3MuY2FzZUZvbGRlcixcbiAgICAgIHRpdGxlLFxuICAgICAgYnVpbGRDYXNlVGVtcGxhdGUodGl0bGUpXG4gICAgKTtcbiAgICBhd2FpdCB0aGlzLm9wZW5GaWxlKGZpbGUpO1xuICAgIHJldHVybiBmaWxlO1xuICB9XG5cbiAgYXN5bmMgY3JlYXRlVGFza05vdGUodGl0bGUgPSB0aGlzLmRlZmF1bHRUaXRsZShcIk5ldyBUYXNrXCIpKTogUHJvbWlzZTxURmlsZT4ge1xuICAgIGNvbnN0IGZpbGUgPSBhd2FpdCBjcmVhdGVUeXBlZE5vdGUoXG4gICAgICB0aGlzLmFwcCxcbiAgICAgIHRoaXMuc2V0dGluZ3MudGFza0ZvbGRlcixcbiAgICAgIHRpdGxlLFxuICAgICAgYnVpbGRUYXNrVGVtcGxhdGUodGl0bGUpXG4gICAgKTtcbiAgICBhd2FpdCB0aGlzLm9wZW5GaWxlKGZpbGUpO1xuICAgIHJldHVybiBmaWxlO1xuICB9XG5cbiAgYXN5bmMgY3JlYXRlVGFza0Zyb21DYXNlKGNhc2VQYXRoOiBzdHJpbmcsIHRpdGxlPzogc3RyaW5nKTogUHJvbWlzZTxURmlsZT4ge1xuICAgIGNvbnN0IGFic3RyYWN0ID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGNhc2VQYXRoKTtcbiAgICBpZiAoIShhYnN0cmFjdCBpbnN0YW5jZW9mIFRGaWxlKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiXHU2MjdFXHU0RTBEXHU1MjMwXHU1QkY5XHU1RTk0XHU2ODQ4XHU0RUY2XHU2NTg3XHU0RUY2XHUzMDAyXCIpO1xuICAgIH1cblxuICAgIGNvbnN0IHRhc2tUaXRsZSA9IHRpdGxlID8/IGAke2Fic3RyYWN0LmJhc2VuYW1lfSBMZWFkICR7bmV3IERhdGUoKS50b0lTT1N0cmluZygpLnNsaWNlKDExLCAxNil9YDtcbiAgICBjb25zdCBmaWxlID0gYXdhaXQgY3JlYXRlVHlwZWROb3RlKFxuICAgICAgdGhpcy5hcHAsXG4gICAgICB0aGlzLnNldHRpbmdzLnRhc2tGb2xkZXIsXG4gICAgICB0YXNrVGl0bGUsXG4gICAgICBidWlsZFRhc2tUZW1wbGF0ZSh0YXNrVGl0bGUpXG4gICAgKTtcblxuICAgIGF3YWl0IHRoaXMuYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihmaWxlLCAoZnJvbnRtYXR0ZXIpID0+IHtcbiAgICAgIGZyb250bWF0dGVyLnR5cGUgPSBcInRhc2tcIjtcbiAgICAgIGZyb250bWF0dGVyLmNhc2UgPSBhYnN0cmFjdC5iYXNlbmFtZTtcbiAgICAgIGZyb250bWF0dGVyLmNhc2VQYXRoID0gYWJzdHJhY3QucGF0aDtcbiAgICAgIGZyb250bWF0dGVyLnVwZGF0ZWQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCB0aGlzLm9wZW5GaWxlKGZpbGUpO1xuICAgIHJldHVybiBmaWxlO1xuICB9XG5cbiAgYXN5bmMgY3JlYXRlVGFza0ZvckFjdGl2ZUNhc2UoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgYWN0aXZlRmlsZSA9IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVGaWxlKCk7XG4gICAgaWYgKCFhY3RpdmVGaWxlKSB7XG4gICAgICBuZXcgTm90aWNlKFwiXHU4QkY3XHU1MTQ4XHU2MjUzXHU1RjAwXHU0RTAwXHU0RTJBXHU2ODQ4XHU0RUY2XHU2NTg3XHU0RUY2XHUzMDAyXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGNhY2hlID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoYWN0aXZlRmlsZSk7XG4gICAgaWYgKGNhY2hlPy5mcm9udG1hdHRlcj8udHlwZSAhPT0gXCJjYXNlXCIpIHtcbiAgICAgIG5ldyBOb3RpY2UoXCJcdTVGNTNcdTUyNERcdTYyNTNcdTVGMDBcdTc2ODRcdTRFMERcdTY2MkZcdTY4NDhcdTRFRjZcdTY1ODdcdTRFRjZcdTMwMDJcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5jcmVhdGVUYXNrRnJvbUNhc2UoYWN0aXZlRmlsZS5wYXRoKTtcbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZUV2aWRlbmNlRnJvbUNhc2UoY2FzZVBhdGg6IHN0cmluZywgdGl0bGU/OiBzdHJpbmcpOiBQcm9taXNlPFRGaWxlPiB7XG4gICAgY29uc3QgYWJzdHJhY3QgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoY2FzZVBhdGgpO1xuICAgIGlmICghKGFic3RyYWN0IGluc3RhbmNlb2YgVEZpbGUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJcdTYyN0VcdTRFMERcdTUyMzBcdTVCRjlcdTVFOTRcdTY4NDhcdTRFRjZcdTY1ODdcdTRFRjZcdTMwMDJcIik7XG4gICAgfVxuXG4gICAgY29uc3QgZXZpZGVuY2VUaXRsZSA9IHRpdGxlID8/IGAke2Fic3RyYWN0LmJhc2VuYW1lfSBFdmlkZW5jZSAke25ldyBEYXRlKCkudG9JU09TdHJpbmcoKS5zbGljZSgxMSwgMTYpfWA7XG4gICAgY29uc3QgZmlsZSA9IGF3YWl0IGNyZWF0ZVR5cGVkTm90ZShcbiAgICAgIHRoaXMuYXBwLFxuICAgICAgdGhpcy5zZXR0aW5ncy5ldmlkZW5jZUZvbGRlcixcbiAgICAgIGV2aWRlbmNlVGl0bGUsXG4gICAgICBidWlsZEV2aWRlbmNlVGVtcGxhdGUoZXZpZGVuY2VUaXRsZSwgYWJzdHJhY3QuYmFzZW5hbWUsIGFic3RyYWN0LnBhdGgpXG4gICAgKTtcblxuICAgIGF3YWl0IHRoaXMub3BlbkZpbGUoZmlsZSk7XG4gICAgcmV0dXJuIGZpbGU7XG4gIH1cblxuICBhc3luYyBjcmVhdGVFdmlkZW5jZU5vdGUodGl0bGUgPSB0aGlzLmRlZmF1bHRUaXRsZShcIk5ldyBFdmlkZW5jZVwiKSk6IFByb21pc2U8VEZpbGU+IHtcbiAgICBjb25zdCBmaWxlID0gYXdhaXQgY3JlYXRlVHlwZWROb3RlKFxuICAgICAgdGhpcy5hcHAsXG4gICAgICB0aGlzLnNldHRpbmdzLmV2aWRlbmNlRm9sZGVyLFxuICAgICAgdGl0bGUsXG4gICAgICBidWlsZEV2aWRlbmNlVGVtcGxhdGUodGl0bGUpXG4gICAgKTtcbiAgICBhd2FpdCB0aGlzLm9wZW5GaWxlKGZpbGUpO1xuICAgIHJldHVybiBmaWxlO1xuICB9XG5cbiAgYXN5bmMgYXJjaGl2ZUNvbGxlY3Rpb25Bc0V2aWRlbmNlKGNvbGxlY3Rpb25QYXRoOiBzdHJpbmcpOiBQcm9taXNlPFRGaWxlIHwgbnVsbD4ge1xuICAgIGNvbnN0IGFic3RyYWN0ID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGNvbGxlY3Rpb25QYXRoKTtcbiAgICBpZiAoIShhYnN0cmFjdCBpbnN0YW5jZW9mIFRGaWxlKSkge1xuICAgICAgbmV3IE5vdGljZShcIlx1NjI3RVx1NEUwRFx1NTIzMFx1ODk4MVx1NUY1Mlx1Njg2M1x1NzY4NFx1NzgxNFx1OEJGQlx1Njc2MVx1NzZFRVx1MzAwMlwiKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGZpcnN0Q29uZmlybSA9IHdpbmRvdy5jb25maXJtKGBcdTVDMDZcdTMwMEMke2Fic3RyYWN0LmJhc2VuYW1lfVx1MzAwRFx1NTJBMFx1NTE2NVx1OEJDMVx1NzI2OVx1NjdEQ1x1RkYxRlxcblxcblx1OEZEOVx1NEYxQVx1NTIxQlx1NUVGQVx1NEUwMFx1NEVGRFx1NTNFRlx1N0VFN1x1N0VFRFx1N0YxNlx1OEY5MVx1NzY4NFx1OEJDMVx1NzI2OVx1N0IxNFx1OEJCMFx1RkYwQ1x1NTM5Rlx1NzgxNFx1OEJGQlx1Njc2MVx1NzZFRVx1NEYxQVx1NEZERFx1NzU1OVx1MzAwMmApO1xuICAgIGlmICghZmlyc3RDb25maXJtKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3Qgc2Vjb25kQ29uZmlybSA9IHdpbmRvdy5jb25maXJtKGBcdTUxOERcdTZCMjFcdTc4NkVcdThCQTRcdUZGMUFcdTYyOEFcdTMwMEMke2Fic3RyYWN0LmJhc2VuYW1lfVx1MzAwRFx1NkM4OVx1NkRDMFx1NEUzQVx1OEJDMVx1NzI2OVx1NjdEQ1x1Njc2MVx1NzZFRVx1RkYxRmApO1xuICAgIGlmICghc2Vjb25kQ29uZmlybSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgY2FjaGUgPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShhYnN0cmFjdCk7XG4gICAgY29uc3QgZnJvbnRtYXR0ZXIgPSBjYWNoZT8uZnJvbnRtYXR0ZXI7XG4gICAgY29uc3QgdGl0bGUgPSBgJHthYnN0cmFjdC5iYXNlbmFtZX0gRXZpZGVuY2VgO1xuICAgIGNvbnN0IHNvdXJjZUJvZHkgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5jYWNoZWRSZWFkKGFic3RyYWN0KTtcbiAgICBjb25zdCBmaWxlID0gYXdhaXQgY3JlYXRlVHlwZWROb3RlKFxuICAgICAgdGhpcy5hcHAsXG4gICAgICB0aGlzLnNldHRpbmdzLmV2aWRlbmNlRm9sZGVyLFxuICAgICAgdGl0bGUsXG4gICAgICBgJHtidWlsZEV2aWRlbmNlVGVtcGxhdGUodGl0bGUsIFN0cmluZyhmcm9udG1hdHRlcj8uY2FzZSA/PyBcIlwiKSwgU3RyaW5nKGZyb250bWF0dGVyPy5jYXNlUGF0aCA/PyBcIlwiKSl9XG4jIyBcdTY3NjVcdTZFOTBcdTc4MTRcdThCRkJcbi0gXHU1MzlGXHU1OUNCXHU2NzYxXHU3NkVFXHVGRjFBW1ske2Fic3RyYWN0LmJhc2VuYW1lfV1dXG4tIFx1NTM5Rlx1NTlDQlx1OERFRlx1NUY4NFx1RkYxQSR7YWJzdHJhY3QucGF0aH1cblxuIyMgXHU1MzlGXHU1OUNCXHU3QjE0XHU4QkIwXHU2NDU4XHU1RjU1XG4ke3NvdXJjZUJvZHkucmVwbGFjZSgvXi0tLVtcXHNcXFNdKj8tLS1cXHMqLywgXCJcIikudHJpbSgpIHx8IFwiLSBcIn1cbmBcbiAgICApO1xuXG4gICAgYXdhaXQgdGhpcy5hcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGZpbGUsIChldmlkZW5jZUZyb250bWF0dGVyKSA9PiB7XG4gICAgICBldmlkZW5jZUZyb250bWF0dGVyLnR5cGUgPSBcImV2aWRlbmNlXCI7XG4gICAgICBldmlkZW5jZUZyb250bWF0dGVyLnNvdXJjZSA9IGFic3RyYWN0LnBhdGg7XG4gICAgICBldmlkZW5jZUZyb250bWF0dGVyLmNhc2UgPSB0eXBlb2YgZnJvbnRtYXR0ZXI/LmNhc2UgPT09IFwic3RyaW5nXCIgPyBmcm9udG1hdHRlci5jYXNlIDogXCJcIjtcbiAgICAgIGV2aWRlbmNlRnJvbnRtYXR0ZXIuY2FzZVBhdGggPSB0eXBlb2YgZnJvbnRtYXR0ZXI/LmNhc2VQYXRoID09PSBcInN0cmluZ1wiID8gZnJvbnRtYXR0ZXIuY2FzZVBhdGggOiBcIlwiO1xuICAgICAgZXZpZGVuY2VGcm9udG1hdHRlci51cGRhdGVkID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgdGhpcy5hcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGFic3RyYWN0LCAoY29sbGVjdGlvbkZyb250bWF0dGVyKSA9PiB7XG4gICAgICBjb2xsZWN0aW9uRnJvbnRtYXR0ZXIudHlwZSA9IFwiY29sbGVjdGlvblwiO1xuICAgICAgY29sbGVjdGlvbkZyb250bWF0dGVyLnN0YXR1cyA9IFwiZmluaXNoZWRcIjtcbiAgICAgIGNvbGxlY3Rpb25Gcm9udG1hdHRlci51cGRhdGVkID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgIH0pO1xuXG4gICAgbmV3IE5vdGljZShgXHU1REYyXHU1MkEwXHU1MTY1XHU4QkMxXHU3MjY5XHU2N0RDOiAke2ZpbGUuYmFzZW5hbWV9YCk7XG4gICAgYXdhaXQgdGhpcy5yZWZyZXNoV29ya3NwYWNlKCk7XG4gICAgYXdhaXQgdGhpcy5vcGVuRmlsZShmaWxlKTtcbiAgICByZXR1cm4gZmlsZTtcbiAgfVxuXG4gIGFzeW5jIGVuc3VyZUV2aWRlbmNlRm9sZGVyRm9yQ2FzZShjYXNlUGF0aDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBjb25zdCBhYnN0cmFjdCA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChjYXNlUGF0aCk7XG4gICAgaWYgKCEoYWJzdHJhY3QgaW5zdGFuY2VvZiBURmlsZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlx1NjI3RVx1NEUwRFx1NTIzMFx1NUJGOVx1NUU5NFx1Njg0OFx1NEVGNlx1NjU4N1x1NEVGNlx1MzAwMlwiKTtcbiAgICB9XG5cbiAgICBjb25zdCBzYWZlTmFtZSA9IGFic3RyYWN0LmJhc2VuYW1lLnJlcGxhY2UoL1tcXFxcLzoqP1wiPD58XS9nLCBcIi1cIikudHJpbSgpIHx8IFwiVW50aXRsZWQgQ2FzZVwiO1xuICAgIGNvbnN0IGZvbGRlclBhdGggPSBgJHt0aGlzLnNldHRpbmdzLmV2aWRlbmNlRm9sZGVyLnJlcGxhY2UoL1xcLyQvLCBcIlwiKX0vJHtzYWZlTmFtZX1gO1xuICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGZvbGRlclBhdGgpKSB7XG4gICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoZm9sZGVyUGF0aCk7XG4gICAgfVxuICAgIG5ldyBOb3RpY2UoYFx1NURGMlx1NUVGQVx1N0FDQlx1Njg0OFx1NEVGNlx1OEQ0NFx1NjU5OVx1NTkzOTogJHtmb2xkZXJQYXRofWApO1xuICAgIGF3YWl0IHRoaXMucmVmcmVzaFdvcmtzcGFjZSgpO1xuICAgIHJldHVybiBmb2xkZXJQYXRoO1xuICB9XG5cbiAgYXN5bmMgcmV2ZWFsRXZpZGVuY2VGb2xkZXJGb3JDYXNlKGNhc2VQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBmb2xkZXJQYXRoID0gYXdhaXQgdGhpcy5lbnN1cmVFdmlkZW5jZUZvbGRlckZvckNhc2UoY2FzZVBhdGgpO1xuICAgIGNvbnN0IGFkYXB0ZXIgPSB0aGlzLmFwcC52YXVsdC5hZGFwdGVyIGFzIHVua25vd24gYXMgeyBnZXRCYXNlUGF0aD86ICgpID0+IHN0cmluZyB9O1xuICAgIGNvbnN0IGJhc2VQYXRoID0gYWRhcHRlci5nZXRCYXNlUGF0aD8uKCk7XG4gICAgaWYgKCFiYXNlUGF0aCkge1xuICAgICAgbmV3IE5vdGljZShgXHU2ODQ4XHU0RUY2XHU4RDQ0XHU2NTk5XHU1OTM5XHU1REYyXHU1RUZBXHU3QUNCOiAke2ZvbGRlclBhdGh9YCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGF3YWl0IHNoZWxsLm9wZW5QYXRoKGpvaW4oYmFzZVBhdGgsIGZvbGRlclBhdGgpKTtcbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZUV2aWRlbmNlRm9yQWN0aXZlQ2FzZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBhY3RpdmVGaWxlID0gdGhpcy5hcHAud29ya3NwYWNlLmdldEFjdGl2ZUZpbGUoKTtcbiAgICBpZiAoIWFjdGl2ZUZpbGUpIHtcbiAgICAgIG5ldyBOb3RpY2UoXCJcdThCRjdcdTUxNDhcdTYyNTNcdTVGMDBcdTRFMDBcdTRFMkFcdTY4NDhcdTRFRjZcdTY1ODdcdTRFRjZcdTMwMDJcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgY2FjaGUgPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShhY3RpdmVGaWxlKTtcbiAgICBpZiAoY2FjaGU/LmZyb250bWF0dGVyPy50eXBlICE9PSBcImNhc2VcIikge1xuICAgICAgbmV3IE5vdGljZShcIlx1NUY1M1x1NTI0RFx1NjI1M1x1NUYwMFx1NzY4NFx1NEUwRFx1NjYyRlx1Njg0OFx1NEVGNlx1NjU4N1x1NEVGNlx1MzAwMlwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLmNyZWF0ZUV2aWRlbmNlRnJvbUNhc2UoYWN0aXZlRmlsZS5wYXRoKTtcbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZVNjaGVkdWxlTm90ZSh0aXRsZSA9IHRoaXMuZGVmYXVsdFRpdGxlKFwiTmV3IFNjaGVkdWxlXCIpKTogUHJvbWlzZTxURmlsZT4ge1xuICAgIGNvbnN0IGZpbGUgPSBhd2FpdCBjcmVhdGVUeXBlZE5vdGUoXG4gICAgICB0aGlzLmFwcCxcbiAgICAgIHRoaXMuc2V0dGluZ3Muc2NoZWR1bGVGb2xkZXIsXG4gICAgICB0aXRsZSxcbiAgICAgIGJ1aWxkU2NoZWR1bGVUZW1wbGF0ZSh0aXRsZSlcbiAgICApO1xuICAgIGF3YWl0IHRoaXMub3BlbkZpbGUoZmlsZSk7XG4gICAgcmV0dXJuIGZpbGU7XG4gIH1cblxuICBhc3luYyBjcmVhdGVDb2xsZWN0aW9uTm90ZSh0aXRsZSA9IHRoaXMuZGVmYXVsdFRpdGxlKFwiTmV3IENvbGxlY3Rpb25cIikpOiBQcm9taXNlPFRGaWxlPiB7XG4gICAgY29uc3QgZmlsZSA9IGF3YWl0IGNyZWF0ZVR5cGVkTm90ZShcbiAgICAgIHRoaXMuYXBwLFxuICAgICAgdGhpcy5zZXR0aW5ncy5jb2xsZWN0aW9uRm9sZGVyLFxuICAgICAgdGl0bGUsXG4gICAgICBidWlsZENvbGxlY3Rpb25UZW1wbGF0ZSh0aXRsZSlcbiAgICApO1xuICAgIGF3YWl0IHRoaXMub3BlbkZpbGUoZmlsZSk7XG4gICAgcmV0dXJuIGZpbGU7XG4gIH1cblxuICBhc3luYyBjcmVhdGVQbGFjZU5vdGUoKTogUHJvbWlzZTxURmlsZSB8IG51bGw+IHtcbiAgICBjb25zdCBpbnB1dCA9IGF3YWl0IFBsYWNlQ2FwdHVyZU1vZGFsLnJlcXVlc3QodGhpcy5hcHApO1xuICAgIGlmICghaW5wdXQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgY29uc3QgZmlsZSA9IGF3YWl0IGNyZWF0ZVR5cGVkTm90ZShcbiAgICAgICAgdGhpcy5hcHAsXG4gICAgICAgIHRoaXMuc2V0dGluZ3MucGxhY2VGb2xkZXIsXG4gICAgICAgIGlucHV0LnRpdGxlLFxuICAgICAgICBidWlsZFBsYWNlVGVtcGxhdGUoXG4gICAgICAgICAgaW5wdXQudGl0bGUsXG4gICAgICAgICAgaW5wdXQubGF0aXR1ZGUsXG4gICAgICAgICAgaW5wdXQubG9uZ2l0dWRlLFxuICAgICAgICAgIGlucHV0LmxhdGl0dWRlSGVtaXNwaGVyZSxcbiAgICAgICAgICBpbnB1dC5sb25naXR1ZGVIZW1pc3BoZXJlXG4gICAgICAgIClcbiAgICAgICk7XG4gICAgICBhd2FpdCB0aGlzLm9wZW5GaWxlKGZpbGUpO1xuICAgICAgcmV0dXJuIGZpbGU7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMuZGVidWdMb2coYGNyZWF0ZVBsYWNlTm90ZTplcnJvcjoke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5zdGFjayA/PyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgICAgIG5ldyBOb3RpY2UoYFx1NjVFMFx1NkNENVx1NTIxQlx1NUVGQVx1OERCM1x1OEZGOTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFwiXHU2NzJBXHU3N0U1XHU5NTE5XHU4QkVGXCJ9YCk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICBhc3luYyBjcmVhdGVRdWlja1NjaGVkdWxlKGRheTogc3RyaW5nLCBzdGFydDogc3RyaW5nLCBlbmQ6IHN0cmluZyk6IFByb21pc2U8VEZpbGU+IHtcbiAgICBjb25zdCB0aXRsZSA9IGAke2RheX0gJHtzdGFydH0gSW52ZXN0aWdhdGlvbmA7XG4gICAgY29uc3QgZmlsZSA9IGF3YWl0IGNyZWF0ZVR5cGVkTm90ZShcbiAgICAgIHRoaXMuYXBwLFxuICAgICAgdGhpcy5zZXR0aW5ncy5zY2hlZHVsZUZvbGRlcixcbiAgICAgIHRpdGxlLFxuICAgICAgYnVpbGRTY2hlZHVsZVRlbXBsYXRlKHRpdGxlKVxuICAgICk7XG5cbiAgICBhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoZmlsZSwgKGZyb250bWF0dGVyKSA9PiB7XG4gICAgICBmcm9udG1hdHRlci5kYXkgPSBkYXk7XG4gICAgICBmcm9udG1hdHRlci5zdGFydCA9IHN0YXJ0O1xuICAgICAgZnJvbnRtYXR0ZXIuZW5kID0gZW5kO1xuICAgICAgZnJvbnRtYXR0ZXIuZHVyYXRpb25NaW51dGVzID0gdGhpcy5kaWZmTWludXRlcyhzdGFydCwgZW5kKTtcbiAgICAgIGZyb250bWF0dGVyLnVwZGF0ZWQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgICBpZiAodHlwZW9mIGZyb250bWF0dGVyLnJlbGF0ZWRUYXNrICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIGZyb250bWF0dGVyLnJlbGF0ZWRUYXNrID0gXCJcIjtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgZnJvbnRtYXR0ZXIucmVsYXRlZFRhc2tQYXRoICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIGZyb250bWF0dGVyLnJlbGF0ZWRUYXNrUGF0aCA9IFwiXCI7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBhd2FpdCB0aGlzLm9wZW5GaWxlKGZpbGUpO1xuICAgIHJldHVybiBmaWxlO1xuICB9XG5cbiAgYXN5bmMgc2NoZWR1bGVUYXNrRnJvbURhc2hib2FyZCh0YXNrUGF0aDogc3RyaW5nLCBkYXk6IHN0cmluZywgc3RhcnQ6IHN0cmluZywgZW5kOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBhYnN0cmFjdCA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aCh0YXNrUGF0aCk7XG4gICAgaWYgKCEoYWJzdHJhY3QgaW5zdGFuY2VvZiBURmlsZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlx1NjI3RVx1NEUwRFx1NTIzMFx1ODk4MVx1NUI4OVx1NjM5Mlx1NzY4NFx1NEVGQlx1NTJBMVx1NjU4N1x1NEVGNlx1MzAwMlwiKTtcbiAgICB9XG5cbiAgICBjb25zdCB0YXNrRmlsZSA9IGFic3RyYWN0O1xuICAgIGNvbnN0IHNjaGVkdWxlVGl0bGUgPSBgJHtkYXl9ICR7c3RhcnR9ICR7dGFza0ZpbGUuYmFzZW5hbWV9YDtcbiAgICBjb25zdCBzY2hlZHVsZUZpbGUgPSBhd2FpdCBjcmVhdGVUeXBlZE5vdGUoXG4gICAgICB0aGlzLmFwcCxcbiAgICAgIHRoaXMuc2V0dGluZ3Muc2NoZWR1bGVGb2xkZXIsXG4gICAgICBzY2hlZHVsZVRpdGxlLFxuICAgICAgYnVpbGRTY2hlZHVsZVRlbXBsYXRlKHNjaGVkdWxlVGl0bGUpXG4gICAgKTtcblxuICAgIGF3YWl0IHRoaXMuYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihzY2hlZHVsZUZpbGUsIChmcm9udG1hdHRlcikgPT4ge1xuICAgICAgZnJvbnRtYXR0ZXIuZGF5ID0gZGF5O1xuICAgICAgZnJvbnRtYXR0ZXIuc3RhcnQgPSBzdGFydDtcbiAgICAgIGZyb250bWF0dGVyLmVuZCA9IGVuZDtcbiAgICAgIGZyb250bWF0dGVyLmR1cmF0aW9uTWludXRlcyA9IHRoaXMuZGlmZk1pbnV0ZXMoc3RhcnQsIGVuZCk7XG4gICAgICBmcm9udG1hdHRlci5yZWxhdGVkVGFzayA9IHRhc2tGaWxlLmJhc2VuYW1lO1xuICAgICAgZnJvbnRtYXR0ZXIucmVsYXRlZFRhc2tQYXRoID0gdGFza0ZpbGUucGF0aDtcbiAgICAgIGZyb250bWF0dGVyLnVwZGF0ZWQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIodGFza0ZpbGUsIChmcm9udG1hdHRlcikgPT4ge1xuICAgICAgZnJvbnRtYXR0ZXIudHlwZSA9IFwidGFza1wiO1xuICAgICAgZnJvbnRtYXR0ZXIuc3RhdHVzID0gXCJzY2hlZHVsZWRcIjtcbiAgICAgIGZyb250bWF0dGVyLnVwZGF0ZWQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgfSk7XG5cbiAgICBuZXcgTm90aWNlKGBcdTVERjJcdTVDMDYgJHt0YXNrRmlsZS5iYXNlbmFtZX0gXHU1Qjg5XHU2MzkyXHU1MjMwICR7ZGF5fSAke3N0YXJ0fWApO1xuICAgIGF3YWl0IHRoaXMucmVmcmVzaFdvcmtzcGFjZSgpO1xuICB9XG5cbiAgYXN5bmMgbW92ZVNjaGVkdWxlRW50cnkoc2NoZWR1bGVQYXRoOiBzdHJpbmcsIGRheTogc3RyaW5nLCBzdGFydDogc3RyaW5nLCBlbmQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGFic3RyYWN0ID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHNjaGVkdWxlUGF0aCk7XG4gICAgaWYgKCEoYWJzdHJhY3QgaW5zdGFuY2VvZiBURmlsZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlx1NjI3RVx1NEUwRFx1NTIzMFx1ODk4MVx1NzlGQlx1NTJBOFx1NzY4NFx1NjM5Mlx1NjcxRlx1NjU4N1x1NEVGNlx1MzAwMlwiKTtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoYWJzdHJhY3QsIChmcm9udG1hdHRlcikgPT4ge1xuICAgICAgZnJvbnRtYXR0ZXIudHlwZSA9IFwic2NoZWR1bGVcIjtcbiAgICAgIGZyb250bWF0dGVyLmRheSA9IGRheTtcbiAgICAgIGZyb250bWF0dGVyLnN0YXJ0ID0gc3RhcnQ7XG4gICAgICBmcm9udG1hdHRlci5lbmQgPSBlbmQ7XG4gICAgICBmcm9udG1hdHRlci5kdXJhdGlvbk1pbnV0ZXMgPSB0aGlzLmRpZmZNaW51dGVzKHN0YXJ0LCBlbmQpO1xuICAgICAgZnJvbnRtYXR0ZXIudXBkYXRlZCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICB9KTtcblxuICAgIG5ldyBOb3RpY2UoYFx1NURGMlx1OEMwM1x1NjU3NFx1NjM5Mlx1NjcxRlx1NTIzMCAke2RheX0gJHtzdGFydH1gKTtcbiAgICBhd2FpdCB0aGlzLnJlZnJlc2hXb3Jrc3BhY2UoKTtcbiAgfVxuXG4gIGFzeW5jIGFkanVzdFNjaGVkdWxlRHVyYXRpb24oc2NoZWR1bGVQYXRoOiBzdHJpbmcsIGRlbHRhTWludXRlczogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgYWJzdHJhY3QgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoc2NoZWR1bGVQYXRoKTtcbiAgICBpZiAoIShhYnN0cmFjdCBpbnN0YW5jZW9mIFRGaWxlKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiXHU2MjdFXHU0RTBEXHU1MjMwXHU4OTgxXHU4QzAzXHU2NTc0XHU2NUY2XHU5NTdGXHU3Njg0XHU2MzkyXHU2NzFGXHU2NTg3XHU0RUY2XHUzMDAyXCIpO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMuYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihhYnN0cmFjdCwgKGZyb250bWF0dGVyKSA9PiB7XG4gICAgICBjb25zdCBzdGFydCA9IHR5cGVvZiBmcm9udG1hdHRlci5zdGFydCA9PT0gXCJzdHJpbmdcIiA/IGZyb250bWF0dGVyLnN0YXJ0IDogXCIwOTowMFwiO1xuICAgICAgY29uc3QgY3VycmVudER1cmF0aW9uID1cbiAgICAgICAgdHlwZW9mIGZyb250bWF0dGVyLmR1cmF0aW9uTWludXRlcyA9PT0gXCJudW1iZXJcIlxuICAgICAgICAgID8gZnJvbnRtYXR0ZXIuZHVyYXRpb25NaW51dGVzXG4gICAgICAgICAgOiB0aGlzLmRpZmZNaW51dGVzKFxuICAgICAgICAgICAgICBzdGFydCxcbiAgICAgICAgICAgICAgdHlwZW9mIGZyb250bWF0dGVyLmVuZCA9PT0gXCJzdHJpbmdcIiA/IGZyb250bWF0dGVyLmVuZCA6IHRoaXMuYWRkTWludXRlcyhzdGFydCwgNjApXG4gICAgICAgICAgICApO1xuICAgICAgY29uc3QgbmV4dER1cmF0aW9uID0gTWF0aC5tYXgoMzAsIE1hdGgubWluKDI0MCwgY3VycmVudER1cmF0aW9uICsgZGVsdGFNaW51dGVzKSk7XG4gICAgICBmcm9udG1hdHRlci5zdGFydCA9IHN0YXJ0O1xuICAgICAgZnJvbnRtYXR0ZXIuZHVyYXRpb25NaW51dGVzID0gbmV4dER1cmF0aW9uO1xuICAgICAgZnJvbnRtYXR0ZXIuZW5kID0gdGhpcy5hZGRNaW51dGVzKHN0YXJ0LCBuZXh0RHVyYXRpb24pO1xuICAgICAgZnJvbnRtYXR0ZXIudXBkYXRlZCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICB9KTtcblxuICAgIGF3YWl0IHRoaXMucmVmcmVzaFdvcmtzcGFjZSgpO1xuICB9XG5cbiAgYXN5bmMgbW92ZVNjaGVkdWxlVG9OZXh0RnJlZVNsb3Qoc2NoZWR1bGVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBhYnN0cmFjdCA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChzY2hlZHVsZVBhdGgpO1xuICAgIGlmICghKGFic3RyYWN0IGluc3RhbmNlb2YgVEZpbGUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJcdTYyN0VcdTRFMERcdTUyMzBcdTg5ODFcdTk4N0FcdTVFRjZcdTc2ODRcdTYzOTJcdTY3MUZcdTY1ODdcdTRFRjZcdTMwMDJcIik7XG4gICAgfVxuXG4gICAgY29uc3QgY2FjaGUgPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShhYnN0cmFjdCk7XG4gICAgY29uc3QgZnJvbnRtYXR0ZXIgPSBjYWNoZT8uZnJvbnRtYXR0ZXI7XG4gICAgY29uc3QgY3VycmVudERheSA9IHR5cGVvZiBmcm9udG1hdHRlcj8uZGF5ID09PSBcInN0cmluZ1wiID8gZnJvbnRtYXR0ZXIuZGF5IDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLnNsaWNlKDAsIDEwKTtcbiAgICBjb25zdCBjdXJyZW50U3RhcnQgPSB0eXBlb2YgZnJvbnRtYXR0ZXI/LnN0YXJ0ID09PSBcInN0cmluZ1wiID8gZnJvbnRtYXR0ZXIuc3RhcnQgOiBcIjA4OjAwXCI7XG4gICAgY29uc3QgZHVyYXRpb24gPVxuICAgICAgdHlwZW9mIGZyb250bWF0dGVyPy5kdXJhdGlvbk1pbnV0ZXMgPT09IFwibnVtYmVyXCJcbiAgICAgICAgPyBmcm9udG1hdHRlci5kdXJhdGlvbk1pbnV0ZXNcbiAgICAgICAgOiB0aGlzLmRpZmZNaW51dGVzKFxuICAgICAgICAgICAgY3VycmVudFN0YXJ0LFxuICAgICAgICAgICAgdHlwZW9mIGZyb250bWF0dGVyPy5lbmQgPT09IFwic3RyaW5nXCIgPyBmcm9udG1hdHRlci5lbmQgOiB0aGlzLmFkZE1pbnV0ZXMoY3VycmVudFN0YXJ0LCA2MClcbiAgICAgICAgICApO1xuXG4gICAgY29uc3Qgd29ya3NwYWNlRGF0YSA9IGF3YWl0IHRoaXMuZ2V0V29ya3NwYWNlRGF0YSgpO1xuICAgIGNvbnN0IGNhbmRpZGF0ZSA9IHRoaXMuZmluZE5leHRGcmVlU2xvdChjdXJyZW50RGF5LCBjdXJyZW50U3RhcnQsIGR1cmF0aW9uLCB3b3Jrc3BhY2VEYXRhLnNjaGVkdWxlcywgc2NoZWR1bGVQYXRoKTtcbiAgICBpZiAoIWNhbmRpZGF0ZSkge1xuICAgICAgbmV3IE5vdGljZShcIlx1NjcyQ1x1NTQ2OFx1NkNBMVx1NjcwOVx1NjI3RVx1NTIzMFx1NTNFRlx1OTg3QVx1NUVGNlx1NzY4NFx1N0E3QVx1Njg2M1x1MzAwMlwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLm1vdmVTY2hlZHVsZUVudHJ5KHNjaGVkdWxlUGF0aCwgY2FuZGlkYXRlLmRheSwgY2FuZGlkYXRlLnN0YXJ0LCBjYW5kaWRhdGUuZW5kKTtcbiAgfVxuXG4gIGFzeW5jIG9wZW5QYXRoKHBhdGg6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGFic3RyYWN0OiBUQWJzdHJhY3RGaWxlIHwgbnVsbCA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChwYXRoKTtcbiAgICBpZiAoIShhYnN0cmFjdCBpbnN0YW5jZW9mIFRGaWxlKSkge1xuICAgICAgbmV3IE5vdGljZShcIlx1NUJGOVx1NUU5NFx1NjU4N1x1NEVGNlx1NEUwRFx1NUI1OFx1NTcyOFx1MzAwMlwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgYXdhaXQgdGhpcy5hcHAud29ya3NwYWNlLmdldExlYWYodHJ1ZSkub3BlbkZpbGUoYWJzdHJhY3QpO1xuICB9XG5cbiAgYXN5bmMgZGVsZXRlUGF0aChwYXRoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBhYnN0cmFjdDogVEFic3RyYWN0RmlsZSB8IG51bGwgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgocGF0aCk7XG4gICAgaWYgKCEoYWJzdHJhY3QgaW5zdGFuY2VvZiBURmlsZSkpIHtcbiAgICAgIG5ldyBOb3RpY2UoXCJcdTVCRjlcdTVFOTRcdTY1ODdcdTRFRjZcdTRFMERcdTVCNThcdTU3MjhcdUZGMENcdTY1RTBcdTZDRDVcdTUyMjBcdTk2NjRcdTMwMDJcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGNvbmZpcm1lZCA9IHdpbmRvdy5jb25maXJtKGBcdTc4NkVcdTVCOUFcdTUyMjBcdTk2NjRcdTMwMEMke2Fic3RyYWN0LmJhc2VuYW1lfVx1MzAwRFx1NTQxN1x1RkYxRlx1NjU4N1x1NEVGNlx1NEYxQVx1NzlGQlx1NTIzMFx1N0NGQlx1N0VERlx1NUU5Rlx1N0VCOFx1N0JEM1x1MzAwMmApO1xuICAgIGlmICghY29uZmlybWVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LnRyYXNoKGFic3RyYWN0LCB0cnVlKTtcbiAgICBuZXcgTm90aWNlKGBcdTVERjJcdTUyMjBcdTk2NjQgJHthYnN0cmFjdC5iYXNlbmFtZX1gKTtcbiAgICBhd2FpdCB0aGlzLnJlZnJlc2hXb3Jrc3BhY2UoKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgb3BlbkZpbGUoZmlsZTogVEZpbGUpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhZih0cnVlKS5vcGVuRmlsZShmaWxlKTtcbiAgICBuZXcgTm90aWNlKGBTaGVybG9jayBPUyBcdTVERjJcdTYyNTNcdTVGMDAgJHtmaWxlLmJhc2VuYW1lfWApO1xuICAgIGF3YWl0IHRoaXMucmVmcmVzaFdvcmtzcGFjZSgpO1xuICB9XG5cbiAgcHJpdmF0ZSBkZWZhdWx0VGl0bGUocHJlZml4OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IHN0YW1wID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpLnJlcGxhY2UoXCJUXCIsIFwiIFwiKS5zbGljZSgwLCAxNik7XG4gICAgcmV0dXJuIGAke3ByZWZpeH0gJHtzdGFtcH1gO1xuICB9XG5cbiAgcHJpdmF0ZSBkaWZmTWludXRlcyhzdGFydDogc3RyaW5nLCBlbmQ6IHN0cmluZyk6IG51bWJlciB7XG4gICAgY29uc3Qgc3RhcnRNaW51dGVzID0gdGhpcy50aW1lVG9NaW51dGVzKHN0YXJ0KTtcbiAgICBjb25zdCBlbmRNaW51dGVzID0gdGhpcy50aW1lVG9NaW51dGVzKGVuZCk7XG4gICAgcmV0dXJuIE1hdGgubWF4KDMwLCBlbmRNaW51dGVzIC0gc3RhcnRNaW51dGVzKTtcbiAgfVxuXG4gIHByaXZhdGUgYWRkTWludXRlcyhzdGFydDogc3RyaW5nLCBhbW91bnQ6IG51bWJlcik6IHN0cmluZyB7XG4gICAgY29uc3QgbmV4dCA9IE1hdGgubWluKHRoaXMudGltZVRvTWludXRlcyhzdGFydCkgKyBhbW91bnQsIDIzICogNjAgKyAzMCk7XG4gICAgY29uc3QgaG91cnMgPSBNYXRoLmZsb29yKG5leHQgLyA2MCk7XG4gICAgY29uc3QgbWludXRlcyA9IG5leHQgJSA2MDtcbiAgICByZXR1cm4gYCR7U3RyaW5nKGhvdXJzKS5wYWRTdGFydCgyLCBcIjBcIil9OiR7U3RyaW5nKG1pbnV0ZXMpLnBhZFN0YXJ0KDIsIFwiMFwiKX1gO1xuICB9XG5cbiAgcHJpdmF0ZSB0aW1lVG9NaW51dGVzKHZhbHVlOiBzdHJpbmcpOiBudW1iZXIge1xuICAgIGNvbnN0IFtob3VycywgbWludXRlc10gPSB2YWx1ZS5zcGxpdChcIjpcIikubWFwKE51bWJlcik7XG4gICAgcmV0dXJuIGhvdXJzICogNjAgKyBtaW51dGVzO1xuICB9XG5cbiAgcHJpdmF0ZSBmaW5kTmV4dEZyZWVTbG90KFxuICAgIGN1cnJlbnREYXk6IHN0cmluZyxcbiAgICBjdXJyZW50U3RhcnQ6IHN0cmluZyxcbiAgICBkdXJhdGlvbjogbnVtYmVyLFxuICAgIHNjaGVkdWxlczogU2hlcmxvY2tXb3Jrc3BhY2VEYXRhW1wic2NoZWR1bGVzXCJdLFxuICAgIGlnbm9yZWRQYXRoOiBzdHJpbmdcbiAgKTogeyBkYXk6IHN0cmluZzsgc3RhcnQ6IHN0cmluZzsgZW5kOiBzdHJpbmcgfSB8IG51bGwge1xuICAgIGNvbnN0IHNsb3RzID0gW1wiMDg6MDBcIiwgXCIxMDowMFwiLCBcIjEyOjAwXCIsIFwiMTQ6MDBcIiwgXCIxNjowMFwiLCBcIjE5OjAwXCJdO1xuICAgIGNvbnN0IHdlZWsgPSB0aGlzLmJ1aWxkQ3VycmVudFdlZWsoKTtcbiAgICBjb25zdCBjdXJyZW50SW5kZXggPSB3ZWVrLmZpbmRJbmRleCgoZGF5KSA9PiBkYXkgPT09IGN1cnJlbnREYXkpO1xuICAgIGNvbnN0IG9yZGVyZWREYXlzID0gY3VycmVudEluZGV4ID49IDAgPyBbLi4ud2Vlay5zbGljZShjdXJyZW50SW5kZXgpLCAuLi53ZWVrLnNsaWNlKDAsIGN1cnJlbnRJbmRleCldIDogd2VlaztcblxuICAgIGZvciAoY29uc3QgZGF5IG9mIG9yZGVyZWREYXlzKSB7XG4gICAgICBmb3IgKGNvbnN0IHNsb3Qgb2Ygc2xvdHMpIHtcbiAgICAgICAgaWYgKGRheSA9PT0gY3VycmVudERheSAmJiB0aGlzLnRpbWVUb01pbnV0ZXMoc2xvdCkgPD0gdGhpcy50aW1lVG9NaW51dGVzKGN1cnJlbnRTdGFydCkpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBvY2N1cGllZCA9IHNjaGVkdWxlcy5zb21lKChpdGVtKSA9PiBpdGVtLmZpbGVQYXRoICE9PSBpZ25vcmVkUGF0aCAmJiBpdGVtLmRheSA9PT0gZGF5ICYmIGl0ZW0uc3RhcnQgPT09IHNsb3QpO1xuICAgICAgICBpZiAoIW9jY3VwaWVkKSB7XG4gICAgICAgICAgcmV0dXJuIHsgZGF5LCBzdGFydDogc2xvdCwgZW5kOiB0aGlzLmFkZE1pbnV0ZXMoc2xvdCwgZHVyYXRpb24pIH07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgYnVpbGRDdXJyZW50V2VlaygpOiBzdHJpbmdbXSB7XG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgICBjb25zdCBkYXkgPSBub3cuZ2V0RGF5KCk7XG4gICAgY29uc3QgbW9uZGF5RGVsdGEgPSBkYXkgPT09IDAgPyAtNiA6IDEgLSBkYXk7XG4gICAgY29uc3QgbW9uZGF5ID0gbmV3IERhdGUobm93KTtcbiAgICBtb25kYXkuc2V0RGF0ZShub3cuZ2V0RGF0ZSgpICsgbW9uZGF5RGVsdGEpO1xuICAgIHJldHVybiBBcnJheS5mcm9tKHsgbGVuZ3RoOiA3IH0sIChfLCBpbmRleCkgPT4ge1xuICAgICAgY29uc3QgdGFyZ2V0ID0gbmV3IERhdGUobW9uZGF5KTtcbiAgICAgIHRhcmdldC5zZXREYXRlKG1vbmRheS5nZXREYXRlKCkgKyBpbmRleCk7XG4gICAgICByZXR1cm4gZm9ybWF0TG9jYWxEYXRlKHRhcmdldCk7XG4gICAgfSk7XG4gIH1cblxuICBkZWJ1Z0xvZyhtZXNzYWdlOiBzdHJpbmcpOiB2b2lkIHtcbiAgICB0cnkge1xuICAgICAgYXBwZW5kRmlsZVN5bmMoXCIvdG1wL3NoZXJsb2NrLW9zLWRlYnVnLmxvZ1wiLCBgWyR7bmV3IERhdGUoKS50b0lTT1N0cmluZygpfV0gJHttZXNzYWdlfVxcbmApO1xuICAgIH0gY2F0Y2ggKF9lcnJvcikge1xuICAgICAgLy8gSWdub3JlIGxvZ2dpbmcgZmFpbHVyZXMgc28gZGlhZ25vc3RpY3MgbmV2ZXIgYnJlYWsgdGhlIHBsdWdpbiBpdHNlbGYuXG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBlbmFibGVHbG9iYWxTdHlsZSgpOiB2b2lkIHtcbiAgICBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5hZGQoXCJzaGVybG9jay1nbG9iYWwtc3R5bGVcIik7XG4gIH1cblxuICBnZXRFbnRyeUltYWdlVXJsKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIuZ2V0UmVzb3VyY2VQYXRoKFwiU2hlcmxvY2sgT1MvQXNzZXRzL3NoZXJsb2NrLWVudHJ5LnBuZ1wiKTtcbiAgfVxuXG4gIGdldFBhcmxvckltYWdlVXJsKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIuZ2V0UmVzb3VyY2VQYXRoKFwiU2hlcmxvY2sgT1MvQXNzZXRzL3NoZXJsb2NrLXBhcmxvci5wbmdcIik7XG4gIH1cblxuICBnZXRXb3JsZE1hcEltYWdlVXJsKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIuZ2V0UmVzb3VyY2VQYXRoKFwiU2hlcmxvY2sgT1MvQXNzZXRzL3NoZXJsb2NrLXdvcmxkLW1hcC5wbmdcIik7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGVuc3VyZUVudHJ5QXNzZXQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgYWRhcHRlciA9IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXI7XG4gICAgaWYgKCF0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXCJTaGVybG9jayBPUy9Bc3NldHNcIikpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZUZvbGRlcihcIlNoZXJsb2NrIE9TL0Fzc2V0c1wiKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcik7XG4gICAgICAgIGlmICghbWVzc2FnZS5pbmNsdWRlcyhcIkZvbGRlciBhbHJlYWR5IGV4aXN0c1wiKSkge1xuICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdGFyZ2V0UGF0aCA9IFwiU2hlcmxvY2sgT1MvQXNzZXRzL3NoZXJsb2NrLWVudHJ5LnBuZ1wiO1xuICAgIGlmIChhd2FpdCBhZGFwdGVyLmV4aXN0cyh0YXJnZXRQYXRoKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBmaWxlU3lzdGVtQWRhcHRlciA9IGFkYXB0ZXIgYXMgdW5rbm93biBhcyB7IGdldEJhc2VQYXRoPzogKCkgPT4gc3RyaW5nIH07XG4gICAgICBjb25zdCBiYXNlUGF0aCA9IGZpbGVTeXN0ZW1BZGFwdGVyLmdldEJhc2VQYXRoPy4oKTtcbiAgICAgIGlmICghYmFzZVBhdGgpIHtcbiAgICAgICAgdGhpcy5kZWJ1Z0xvZyhcImVudHJ5LWFzc2V0OnNraXA6bm8tYmFzZS1wYXRoXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHBsdWdpbkFzc2V0UGF0aCA9IGpvaW4oXG4gICAgICAgIGJhc2VQYXRoLFxuICAgICAgICBcIi5vYnNpZGlhblwiLFxuICAgICAgICBcInBsdWdpbnNcIixcbiAgICAgICAgdGhpcy5tYW5pZmVzdC5pZCxcbiAgICAgICAgXCJhc3NldHNcIixcbiAgICAgICAgXCJzaGVybG9jay1lbnRyeS5wbmdcIlxuICAgICAgKTtcbiAgICAgIGNvbnN0IHNvdXJjZSA9IHJlYWRGaWxlU3luYyhwbHVnaW5Bc3NldFBhdGgpO1xuICAgICAgY29uc3QgZGF0YSA9IHNvdXJjZS5idWZmZXIuc2xpY2Uoc291cmNlLmJ5dGVPZmZzZXQsIHNvdXJjZS5ieXRlT2Zmc2V0ICsgc291cmNlLmJ5dGVMZW5ndGgpO1xuICAgICAgYXdhaXQgYWRhcHRlci53cml0ZUJpbmFyeSh0YXJnZXRQYXRoLCBkYXRhKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc3QgbWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5zdGFjayA/PyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcbiAgICAgIHRoaXMuZGVidWdMb2coYGVudHJ5LWFzc2V0OnNraXA6JHttZXNzYWdlfWApO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZW5zdXJlUGFybG9yQXNzZXQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5lbnN1cmVCdW5kbGVkQXNzZXQoXCJzaGVybG9jay1wYXJsb3IucG5nXCIsIFwicGFybG9yLWFzc2V0XCIpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBlbnN1cmVXb3JsZE1hcEFzc2V0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuZW5zdXJlQnVuZGxlZEFzc2V0KFwic2hlcmxvY2std29ybGQtbWFwLnBuZ1wiLCBcIndvcmxkLW1hcC1hc3NldFwiKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZW5zdXJlQnVuZGxlZEFzc2V0KGZpbGVOYW1lOiBzdHJpbmcsIGxvZ1ByZWZpeDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgYWRhcHRlciA9IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXI7XG4gICAgaWYgKCF0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXCJTaGVybG9jayBPUy9Bc3NldHNcIikpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZUZvbGRlcihcIlNoZXJsb2NrIE9TL0Fzc2V0c1wiKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcik7XG4gICAgICAgIGlmICghbWVzc2FnZS5pbmNsdWRlcyhcIkZvbGRlciBhbHJlYWR5IGV4aXN0c1wiKSkge1xuICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdGFyZ2V0UGF0aCA9IGBTaGVybG9jayBPUy9Bc3NldHMvJHtmaWxlTmFtZX1gO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGZpbGVTeXN0ZW1BZGFwdGVyID0gYWRhcHRlciBhcyB1bmtub3duIGFzIHsgZ2V0QmFzZVBhdGg/OiAoKSA9PiBzdHJpbmcgfTtcbiAgICAgIGNvbnN0IGJhc2VQYXRoID0gZmlsZVN5c3RlbUFkYXB0ZXIuZ2V0QmFzZVBhdGg/LigpO1xuICAgICAgaWYgKCFiYXNlUGF0aCkge1xuICAgICAgICB0aGlzLmRlYnVnTG9nKGAke2xvZ1ByZWZpeH06c2tpcDpuby1iYXNlLXBhdGhgKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBwbHVnaW5Bc3NldFBhdGggPSBqb2luKFxuICAgICAgICBiYXNlUGF0aCxcbiAgICAgICAgXCIub2JzaWRpYW5cIixcbiAgICAgICAgXCJwbHVnaW5zXCIsXG4gICAgICAgIHRoaXMubWFuaWZlc3QuaWQsXG4gICAgICAgIFwiYXNzZXRzXCIsXG4gICAgICAgIGZpbGVOYW1lXG4gICAgICApO1xuICAgICAgY29uc3Qgc291cmNlID0gcmVhZEZpbGVTeW5jKHBsdWdpbkFzc2V0UGF0aCk7XG4gICAgICBjb25zdCBkYXRhID0gc291cmNlLmJ1ZmZlci5zbGljZShzb3VyY2UuYnl0ZU9mZnNldCwgc291cmNlLmJ5dGVPZmZzZXQgKyBzb3VyY2UuYnl0ZUxlbmd0aCk7XG4gICAgICBhd2FpdCBhZGFwdGVyLndyaXRlQmluYXJ5KHRhcmdldFBhdGgsIGRhdGEpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLnN0YWNrID8/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xuICAgICAgdGhpcy5kZWJ1Z0xvZyhgJHtsb2dQcmVmaXh9OnNraXA6JHttZXNzYWdlfWApO1xuICAgIH1cbiAgfVxufVxuXG5pbnRlcmZhY2UgUGxhY2VDYXB0dXJlSW5wdXQge1xuICB0aXRsZTogc3RyaW5nO1xuICBsYXRpdHVkZTogbnVtYmVyO1xuICBsb25naXR1ZGU6IG51bWJlcjtcbiAgbGF0aXR1ZGVIZW1pc3BoZXJlOiBcIk5cIiB8IFwiU1wiO1xuICBsb25naXR1ZGVIZW1pc3BoZXJlOiBcIkVcIiB8IFwiV1wiO1xufVxuXG5jbGFzcyBQbGFjZUNhcHR1cmVNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgcHJpdmF0ZSB0aXRsZVZhbHVlID0gXCJcIjtcbiAgcHJpdmF0ZSBsb25naXR1ZGVIZW1pc3BoZXJlOiBcIkVcIiB8IFwiV1wiID0gXCJFXCI7XG4gIHByaXZhdGUgbGF0aXR1ZGVWYWx1ZSA9IFwiXCI7XG4gIHByaXZhdGUgbGF0aXR1ZGVIZW1pc3BoZXJlOiBcIk5cIiB8IFwiU1wiID0gXCJOXCI7XG4gIHByaXZhdGUgbG9uZ2l0dWRlVmFsdWUgPSBcIlwiO1xuICBwcml2YXRlIHJlc29sdmVJbnB1dD86ICh2YWx1ZTogUGxhY2VDYXB0dXJlSW5wdXQgfCBudWxsKSA9PiB2b2lkO1xuXG4gIHN0YXRpYyByZXF1ZXN0KGFwcDogQXBwKTogUHJvbWlzZTxQbGFjZUNhcHR1cmVJbnB1dCB8IG51bGw+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgIGNvbnN0IG1vZGFsID0gbmV3IFBsYWNlQ2FwdHVyZU1vZGFsKGFwcCk7XG4gICAgICBtb2RhbC5yZXNvbHZlSW5wdXQgPSByZXNvbHZlO1xuICAgICAgbW9kYWwub3BlbigpO1xuICAgIH0pO1xuICB9XG5cbiAgb25PcGVuKCk6IHZvaWQge1xuICAgIHRoaXMuc2V0VGl0bGUoXCJcdTY1QjBcdTVFRkFcdThEQjNcdThGRjlcIik7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcblxuICAgIG5ldyBTZXR0aW5nKHRoaXMuY29udGVudEVsKVxuICAgICAgLnNldE5hbWUoXCJcdTU3MzBcdTcwQjlcdTU0MERcdTc5RjBcIilcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PiB0ZXh0LnNldFBsYWNlaG9sZGVyKFwiXHU0RjhCXHU1OTgyIFx1NEUwQVx1NkQ3NyAvIEljZWxhbmRcIikub25DaGFuZ2UoKHZhbHVlKSA9PiB7XG4gICAgICAgIHRoaXMudGl0bGVWYWx1ZSA9IHZhbHVlLnRyaW0oKTtcbiAgICAgIH0pKTtcblxuICAgIG5ldyBTZXR0aW5nKHRoaXMuY29udGVudEVsKVxuICAgICAgLnNldE5hbWUoXCJcdTdFQ0ZcdTVFQTZcdTY1QjlcdTU0MTFcIilcbiAgICAgIC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IGRyb3Bkb3duXG4gICAgICAgIC5hZGRPcHRpb24oXCJFXCIsIFwiXHU0RTFDXHU3RUNGIEVcIilcbiAgICAgICAgLmFkZE9wdGlvbihcIldcIiwgXCJcdTg5N0ZcdTdFQ0YgV1wiKVxuICAgICAgICAuc2V0VmFsdWUodGhpcy5sb25naXR1ZGVIZW1pc3BoZXJlKVxuICAgICAgICAub25DaGFuZ2UoKHZhbHVlKSA9PiB7XG4gICAgICAgICAgdGhpcy5sb25naXR1ZGVIZW1pc3BoZXJlID0gdmFsdWUgPT09IFwiV1wiID8gXCJXXCIgOiBcIkVcIjtcbiAgICAgICAgfSkpO1xuXG4gICAgbmV3IFNldHRpbmcodGhpcy5jb250ZW50RWwpXG4gICAgICAuc2V0TmFtZShcIlx1N0VDRlx1NUVBNlwiKVxuICAgICAgLnNldERlc2MoXCJcdTU4NkJcdTUxOTkgMCBcdTUyMzAgMTgwXHVGRjBDXHU0RkREXHU1QjU4XHU1MjMwXHU1QzBGXHU2NTcwXHU3MEI5XHU1NDBFXHU0RTI0XHU0RjREXHUzMDAyXCIpXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT4gdGV4dC5zZXRQbGFjZWhvbGRlcihcIjEyMS41XCIpLm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xuICAgICAgICB0aGlzLmxvbmdpdHVkZVZhbHVlID0gdmFsdWUudHJpbSgpO1xuICAgICAgfSkpO1xuXG4gICAgbmV3IFNldHRpbmcodGhpcy5jb250ZW50RWwpXG4gICAgICAuc2V0TmFtZShcIlx1N0VBQ1x1NUVBNlx1NjVCOVx1NTQxMVwiKVxuICAgICAgLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4gZHJvcGRvd25cbiAgICAgICAgLmFkZE9wdGlvbihcIk5cIiwgXCJcdTUzMTdcdTdFQUMgTlwiKVxuICAgICAgICAuYWRkT3B0aW9uKFwiU1wiLCBcIlx1NTM1N1x1N0VBQyBTXCIpXG4gICAgICAgIC5zZXRWYWx1ZSh0aGlzLmxhdGl0dWRlSGVtaXNwaGVyZSlcbiAgICAgICAgLm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMubGF0aXR1ZGVIZW1pc3BoZXJlID0gdmFsdWUgPT09IFwiU1wiID8gXCJTXCIgOiBcIk5cIjtcbiAgICAgICAgfSkpO1xuXG4gICAgbmV3IFNldHRpbmcodGhpcy5jb250ZW50RWwpXG4gICAgICAuc2V0TmFtZShcIlx1N0VBQ1x1NUVBNlwiKVxuICAgICAgLnNldERlc2MoXCJcdTU4NkJcdTUxOTkgMCBcdTUyMzAgOTBcdUZGMENcdTRGRERcdTVCNThcdTUyMzBcdTVDMEZcdTY1NzBcdTcwQjlcdTU0MEVcdTRFMjRcdTRGNERcdTMwMDJcIilcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PiB0ZXh0LnNldFBsYWNlaG9sZGVyKFwiMzEuMjNcIikub25DaGFuZ2UoKHZhbHVlKSA9PiB7XG4gICAgICAgIHRoaXMubGF0aXR1ZGVWYWx1ZSA9IHZhbHVlLnRyaW0oKTtcbiAgICAgIH0pKTtcblxuICAgIG5ldyBTZXR0aW5nKHRoaXMuY29udGVudEVsKVxuICAgICAgLmFkZEJ1dHRvbigoYnV0dG9uKSA9PiBidXR0b24uc2V0QnV0dG9uVGV4dChcIlx1NTNENlx1NkQ4OFwiKS5vbkNsaWNrKCgpID0+IHtcbiAgICAgICAgdGhpcy5yZXNvbHZlSW5wdXQ/LihudWxsKTtcbiAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgfSkpXG4gICAgICAuYWRkQnV0dG9uKChidXR0b24pID0+IGJ1dHRvbi5zZXRDdGEoKS5zZXRCdXR0b25UZXh0KFwiXHU1MjFCXHU1RUZBXCIpLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICBjb25zdCBpbnB1dCA9IHRoaXMucGFyc2VJbnB1dCgpO1xuICAgICAgICBpZiAoIWlucHV0KSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVzb2x2ZUlucHV0Py4oaW5wdXQpO1xuICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICB9KSk7XG4gIH1cblxuICBvbkNsb3NlKCk6IHZvaWQge1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gIH1cblxuICBwcml2YXRlIHBhcnNlSW5wdXQoKTogUGxhY2VDYXB0dXJlSW5wdXQgfCBudWxsIHtcbiAgICBpZiAoIXRoaXMudGl0bGVWYWx1ZSkge1xuICAgICAgbmV3IE5vdGljZShcIlx1OTcwMFx1ODk4MVx1NTg2Qlx1NTE5OVx1NTczMFx1NzBCOVx1NTQwRFx1NzlGMFx1MzAwMlwiKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBsb25naXR1ZGVNYWduaXR1ZGUgPSB0aGlzLnBhcnNlQ29vcmRpbmF0ZSh0aGlzLmxvbmdpdHVkZVZhbHVlLCAwLCAxODAsIFwiXHU3RUNGXHU1RUE2XCIpO1xuICAgIGlmIChsb25naXR1ZGVNYWduaXR1ZGUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBsYXRpdHVkZU1hZ25pdHVkZSA9IHRoaXMucGFyc2VDb29yZGluYXRlKHRoaXMubGF0aXR1ZGVWYWx1ZSwgMCwgOTAsIFwiXHU3RUFDXHU1RUE2XCIpO1xuICAgIGlmIChsYXRpdHVkZU1hZ25pdHVkZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IGxvbmdpdHVkZSA9IHRoaXMuYXBwbHlIZW1pc3BoZXJlKGxvbmdpdHVkZU1hZ25pdHVkZSwgdGhpcy5sb25naXR1ZGVIZW1pc3BoZXJlKTtcbiAgICBjb25zdCBsYXRpdHVkZSA9IHRoaXMuYXBwbHlIZW1pc3BoZXJlKGxhdGl0dWRlTWFnbml0dWRlLCB0aGlzLmxhdGl0dWRlSGVtaXNwaGVyZSk7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRpdGxlOiB0aGlzLnRpdGxlVmFsdWUsXG4gICAgICBsYXRpdHVkZSxcbiAgICAgIGxvbmdpdHVkZSxcbiAgICAgIGxhdGl0dWRlSGVtaXNwaGVyZTogdGhpcy5sYXRpdHVkZUhlbWlzcGhlcmUsXG4gICAgICBsb25naXR1ZGVIZW1pc3BoZXJlOiB0aGlzLmxvbmdpdHVkZUhlbWlzcGhlcmVcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZUNvb3JkaW5hdGUocmF3OiBzdHJpbmcsIG1pbjogbnVtYmVyLCBtYXg6IG51bWJlciwgbGFiZWw6IHN0cmluZyk6IG51bWJlciB8IG51bGwge1xuICAgIGNvbnN0IHZhbHVlID0gTnVtYmVyKHJhdyk7XG4gICAgaWYgKCFOdW1iZXIuaXNGaW5pdGUodmFsdWUpIHx8IHZhbHVlIDwgbWluIHx8IHZhbHVlID4gbWF4KSB7XG4gICAgICBuZXcgTm90aWNlKGAke2xhYmVsfVx1OTcwMFx1ODk4MVx1NTg2Qlx1NTE5OSAke21pbn0gXHU1MjMwICR7bWF4fSBcdTRFNEJcdTk1RjRcdTc2ODRcdTY1NzBcdTVCNTdcdTMwMDJgKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gTWF0aC5yb3VuZCh2YWx1ZSAqIDEwMCkgLyAxMDA7XG4gIH1cblxuICBwcml2YXRlIGFwcGx5SGVtaXNwaGVyZSh2YWx1ZTogbnVtYmVyLCBoZW1pc3BoZXJlOiBcIk5cIiB8IFwiU1wiIHwgXCJFXCIgfCBcIldcIik6IG51bWJlciB7XG4gICAgY29uc3Qgc2lnbmVkID0gaGVtaXNwaGVyZSA9PT0gXCJTXCIgfHwgaGVtaXNwaGVyZSA9PT0gXCJXXCIgPyAtdmFsdWUgOiB2YWx1ZTtcbiAgICByZXR1cm4gTWF0aC5yb3VuZChzaWduZWQgKiAxMDApIC8gMTAwO1xuICB9XG59XG4iLCAiaW1wb3J0IHsgQXBwLCBURmlsZSwgbm9ybWFsaXplUGF0aCB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHR5cGUge1xuICBTaGVybG9ja0Nhc2UsXG4gIFNoZXJsb2NrQ29sbGVjdGlvbixcbiAgU2hlcmxvY2tFdmlkZW5jZSxcbiAgU2hlcmxvY2tFbnRpdHlUeXBlLFxuICBTaGVybG9ja1BsYWNlLFxuICBTaGVybG9ja1BsdWdpblNldHRpbmdzLFxuICBTaGVybG9ja1NjaGVkdWxlLFxuICBTaGVybG9ja1Rhc2ssXG4gIFNoZXJsb2NrV29ya3NwYWNlRGF0YVxufSBmcm9tIFwiLi90eXBlc1wiO1xuXG5jb25zdCBFTlRJVFlfVFlQRVM6IFNoZXJsb2NrRW50aXR5VHlwZVtdID0gW1wiY2FzZVwiLCBcInRhc2tcIiwgXCJzY2hlZHVsZVwiLCBcImNvbGxlY3Rpb25cIiwgXCJldmlkZW5jZVwiLCBcInBsYWNlXCJdO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZW5zdXJlRm9sZGVycyhhcHA6IEFwcCwgc2V0dGluZ3M6IFNoZXJsb2NrUGx1Z2luU2V0dGluZ3MpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgZm9sZGVycyA9IFtcbiAgICBzZXR0aW5ncy5jYXNlRm9sZGVyLFxuICAgIHNldHRpbmdzLnRhc2tGb2xkZXIsXG4gICAgc2V0dGluZ3Muc2NoZWR1bGVGb2xkZXIsXG4gICAgc2V0dGluZ3MuY29sbGVjdGlvbkZvbGRlcixcbiAgICBzZXR0aW5ncy5ldmlkZW5jZUZvbGRlcixcbiAgICBzZXR0aW5ncy5wbGFjZUZvbGRlclxuICBdO1xuXG4gIGZvciAoY29uc3QgZm9sZGVyIG9mIGZvbGRlcnMpIHtcbiAgICBjb25zdCBub3JtYWxpemVkID0gbm9ybWFsaXplUGF0aChmb2xkZXIpO1xuICAgIGNvbnN0IHNlZ21lbnRzID0gbm9ybWFsaXplZC5zcGxpdChcIi9cIikuZmlsdGVyKEJvb2xlYW4pO1xuICAgIGxldCBjdXJyZW50ID0gXCJcIjtcblxuICAgIGZvciAoY29uc3Qgc2VnbWVudCBvZiBzZWdtZW50cykge1xuICAgICAgY3VycmVudCA9IGN1cnJlbnQgPyBgJHtjdXJyZW50fS8ke3NlZ21lbnR9YCA6IHNlZ21lbnQ7XG4gICAgICBjb25zdCBjdXJyZW50UGF0aCA9IG5vcm1hbGl6ZVBhdGgoY3VycmVudCk7XG4gICAgICBpZiAoYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChjdXJyZW50UGF0aCkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGFwcC52YXVsdC5jcmVhdGVGb2xkZXIoY3VycmVudFBhdGgpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcbiAgICAgICAgaWYgKCFtZXNzYWdlLmluY2x1ZGVzKFwiRm9sZGVyIGFscmVhZHkgZXhpc3RzXCIpKSB7XG4gICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkRnJvbnRtYXR0ZXIodHlwZTogU2hlcmxvY2tFbnRpdHlUeXBlLCB0aXRsZTogc3RyaW5nLCBleHRyYXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fSk6IHN0cmluZyB7XG4gIGNvbnN0IGNyZWF0ZWQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gIGNvbnN0IGxpbmVzID0gW1xuICAgIFwiLS0tXCIsXG4gICAgYHR5cGU6ICR7dHlwZX1gLFxuICAgIGB0aXRsZTogXCIke3RpdGxlLnJlcGxhY2UoL1wiL2csICdcXFxcXCInKX1cImAsXG4gICAgYGNyZWF0ZWQ6ICR7Y3JlYXRlZH1gLFxuICAgIGB1cGRhdGVkOiAke2NyZWF0ZWR9YFxuICBdO1xuXG4gIE9iamVjdC5lbnRyaWVzKGV4dHJhcykuZm9yRWFjaCgoW2tleSwgdmFsdWVdKSA9PiB7XG4gICAgbGluZXMucHVzaChgJHtrZXl9OiAke3ZhbHVlfWApO1xuICB9KTtcblxuICBsaW5lcy5wdXNoKFwiLS0tXCIsIFwiXCIpO1xuICByZXR1cm4gbGluZXMuam9pbihcIlxcblwiKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQ2FzZVRlbXBsYXRlKHRpdGxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYCR7YnVpbGRGcm9udG1hdHRlcihcImNhc2VcIiwgdGl0bGUsIHtcbiAgICBzdGF0dXM6IFwib3BlblwiLFxuICAgIHByaW9yaXR5OiBcIm1lZGl1bVwiLFxuICAgIHRhZ3M6IFwiW11cIlxuICB9KX0jICR7dGl0bGV9XG5cbiMjIFx1Njg0OFx1NjBDNVx1Njk4Mlx1ODlDOFxuLSBcdTgwQ0NcdTY2NkZcdUZGMUFcbi0gXHU1RjUzXHU1MjREXHU3NkVFXHU2ODA3XHVGRjFBXG4tIFx1NEUwQlx1NEUwMFx1NkI2NVx1NjNBOFx1NzQwNlx1RkYxQVxuXG4jIyBcdTc2RjhcdTUxNzNcdTdFQkZcdTdEMjJcbi0gXG5cbiMjIFx1NTE3M1x1ODA1NFx1OEQ0NFx1NjU5OVxuLSBcbmA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFRhc2tUZW1wbGF0ZSh0aXRsZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGAke2J1aWxkRnJvbnRtYXR0ZXIoXCJ0YXNrXCIsIHRpdGxlLCB7XG4gICAgc3RhdHVzOiBcImJhY2tsb2dcIixcbiAgICBwcmlvcml0eTogXCJtZWRpdW1cIixcbiAgICBjYXNlOiAnXCJcIicsXG4gICAgY2FzZVBhdGg6ICdcIlwiJ1xuICB9KX0jICR7dGl0bGV9XG5cbiMjIFx1NEVGQlx1NTJBMVx1OEJGNFx1NjYwRVxuLSBcblxuIyMgXHU2MjQwXHU1QzVFXHU2ODQ4XHU0RUY2XG4tIFxuYDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkU2NoZWR1bGVUZW1wbGF0ZSh0aXRsZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGAke2J1aWxkRnJvbnRtYXR0ZXIoXCJzY2hlZHVsZVwiLCB0aXRsZSwge1xuICAgIGRheTogYFwiJHtmb3JtYXRMb2NhbERhdGUobmV3IERhdGUoKSl9XCJgLFxuICAgIHN0YXJ0OiAnXCIwOTowMFwiJyxcbiAgICBlbmQ6ICdcIjEwOjAwXCInLFxuICAgIGR1cmF0aW9uTWludXRlczogXCI2MFwiLFxuICAgIHJlbGF0ZWRUYXNrOiAnXCJcIicsXG4gICAgcmVsYXRlZFRhc2tQYXRoOiAnXCJcIidcbiAgfSl9IyAke3RpdGxlfVxuXG4jIyBcdThDMDNcdTY3RTVcdTVCODlcdTYzOTJcbi0gXHU3NkVFXHU2ODA3XHVGRjFBXG4tIFx1NTFDNlx1NTkwN1x1NEU4Qlx1OTg3OVx1RkYxQVxuYDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQ29sbGVjdGlvblRlbXBsYXRlKHRpdGxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYCR7YnVpbGRGcm9udG1hdHRlcihcImNvbGxlY3Rpb25cIiwgdGl0bGUsIHtcbiAgICBzdGF0dXM6IFwicmVhZGluZ1wiLFxuICAgIG1lZGl1bTogXCJib29rXCIsXG4gICAgY2FzZTogJ1wiXCInLFxuICAgIGNhc2VQYXRoOiAnXCJcIicsXG4gICAgcmF0aW5nOiBcIjBcIlxuICB9KX0jICR7dGl0bGV9XG5cbiMjIFx1NzgxNFx1OEJGQlx1OEJCMFx1NUY1NVxuLSBcdTY0NThcdTYyODRcdUZGMUFcbi0gXHU4OUMyXHU3MEI5XHVGRjFBXG4tIFx1NTkwRFx1NzZEOFx1RkYxQVxuXG4jIyBcdTY4NDhcdTRFRjZcdTUxNzNcdTgwNTRcbi0gXG5gO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRFdmlkZW5jZVRlbXBsYXRlKHRpdGxlOiBzdHJpbmcsIGNhc2VOYW1lID0gXCJcIiwgY2FzZVBhdGggPSBcIlwiKTogc3RyaW5nIHtcbiAgcmV0dXJuIGAke2J1aWxkRnJvbnRtYXR0ZXIoXCJldmlkZW5jZVwiLCB0aXRsZSwge1xuICAgIGNhc2U6IGBcIiR7Y2FzZU5hbWUucmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpfVwiYCxcbiAgICBjYXNlUGF0aDogYFwiJHtjYXNlUGF0aC5yZXBsYWNlKC9cIi9nLCAnXFxcXFwiJyl9XCJgLFxuICAgIHNvdXJjZTogJ1wiXCInXG4gIH0pfSMgJHt0aXRsZX1cblxuIyMgXHU4QkMxXHU3MjY5XHU4QkY0XHU2NjBFXG4tIFx1Njc2NVx1NkU5MFx1RkYxQVxuLSBcdTg5QzJcdTVCREZcdUZGMUFcbi0gXHU2M0E4XHU4QkJBXHVGRjFBXG5cbiMjIFx1NTE3M1x1ODA1NFx1Njg0OFx1NEVGNlxuLSAke2Nhc2VOYW1lIHx8IFwiXHU2NzJBXHU1MTczXHU4MDU0XCJ9XG5gO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRQbGFjZVRlbXBsYXRlKFxuICB0aXRsZTogc3RyaW5nLFxuICBsYXRpdHVkZT86IG51bWJlcixcbiAgbG9uZ2l0dWRlPzogbnVtYmVyLFxuICBsYXRpdHVkZUhlbWlzcGhlcmUgPSBcIlwiLFxuICBsb25naXR1ZGVIZW1pc3BoZXJlID0gXCJcIlxuKTogc3RyaW5nIHtcbiAgcmV0dXJuIGAke2J1aWxkRnJvbnRtYXR0ZXIoXCJwbGFjZVwiLCB0aXRsZSwge1xuICAgIGNpdHk6IGBcIiR7dGl0bGUucmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpfVwiYCxcbiAgICBjb3VudHJ5OiAnXCJcIicsXG4gICAgbGF0aXR1ZGU6IGxhdGl0dWRlID09PSB1bmRlZmluZWQgPyAnXCJcIicgOiBTdHJpbmcobGF0aXR1ZGUpLFxuICAgIGxvbmdpdHVkZTogbG9uZ2l0dWRlID09PSB1bmRlZmluZWQgPyAnXCJcIicgOiBTdHJpbmcobG9uZ2l0dWRlKSxcbiAgICBsYXRpdHVkZUhlbWlzcGhlcmU6IGBcIiR7bGF0aXR1ZGVIZW1pc3BoZXJlfVwiYCxcbiAgICBsb25naXR1ZGVIZW1pc3BoZXJlOiBgXCIke2xvbmdpdHVkZUhlbWlzcGhlcmV9XCJgLFxuICAgIHZpc2l0ZWRBdDogYFwiJHtmb3JtYXRMb2NhbERhdGUobmV3IERhdGUoKSl9XCJgLFxuICAgIGNvdmVyOiAnXCJcIicsXG4gICAgY2FzZTogJ1wiXCInLFxuICAgIGNhc2VQYXRoOiAnXCJcIidcbiAgfSl9IyAke3RpdGxlfVxuXG4jIyBcdTUyMzBcdThCQkZcdThCQjBcdTVGNTVcbi0gXHU2NUY2XHU5NUY0XHVGRjFBXG4tIFx1NzE2N1x1NzI0N1x1RkYxQVxuLSBcdThCQjBcdTVGQzZcdUZGMUFcblxuIyMgXHU1MTczXHU4MDU0XG4tIFxuYDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNvbGxlY3RXb3Jrc3BhY2VEYXRhKGFwcDogQXBwKTogUHJvbWlzZTxTaGVybG9ja1dvcmtzcGFjZURhdGE+IHtcbiAgY29uc3QgZmlsZXMgPSBhcHAudmF1bHQuZ2V0TWFya2Rvd25GaWxlcygpO1xuICBjb25zdCBjYXNlczogU2hlcmxvY2tDYXNlW10gPSBbXTtcbiAgY29uc3QgdGFza3M6IFNoZXJsb2NrVGFza1tdID0gW107XG4gIGNvbnN0IHNjaGVkdWxlczogU2hlcmxvY2tTY2hlZHVsZVtdID0gW107XG4gIGNvbnN0IGNvbGxlY3Rpb25zOiBTaGVybG9ja0NvbGxlY3Rpb25bXSA9IFtdO1xuICBjb25zdCBldmlkZW5jZTogU2hlcmxvY2tFdmlkZW5jZVtdID0gW107XG4gIGNvbnN0IHBsYWNlczogU2hlcmxvY2tQbGFjZVtdID0gW107XG5cbiAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgY29uc3QgY2FjaGUgPSBhcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk7XG4gICAgY29uc3QgZnJvbnRtYXR0ZXIgPSBjYWNoZT8uZnJvbnRtYXR0ZXI7XG4gICAgY29uc3QgdHlwZSA9IGZyb250bWF0dGVyPy50eXBlO1xuXG4gICAgaWYgKCFFTlRJVFlfVFlQRVMuaW5jbHVkZXModHlwZSkpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGNvbnN0IGJhc2UgPSB7XG4gICAgICBmaWxlUGF0aDogZmlsZS5wYXRoLFxuICAgICAgbmFtZTogU3RyaW5nKGZyb250bWF0dGVyPy50aXRsZSA/PyBmaWxlLmJhc2VuYW1lKSxcbiAgICAgIHR5cGUsXG4gICAgICBjcmVhdGVkOiBhc1N0cmluZyhmcm9udG1hdHRlcj8uY3JlYXRlZCksXG4gICAgICB1cGRhdGVkOiBhc1N0cmluZyhmcm9udG1hdHRlcj8udXBkYXRlZClcbiAgICB9O1xuXG4gICAgaWYgKHR5cGUgPT09IFwiY2FzZVwiKSB7XG4gICAgICBjYXNlcy5wdXNoKHtcbiAgICAgICAgLi4uYmFzZSxcbiAgICAgICAgdHlwZSxcbiAgICAgICAgc3RhdHVzOiBhc0Nhc2VTdGF0dXMoZnJvbnRtYXR0ZXI/LnN0YXR1cyksXG4gICAgICAgIHByaW9yaXR5OiBhc1ByaW9yaXR5KGZyb250bWF0dGVyPy5wcmlvcml0eSksXG4gICAgICAgIGRlYWRsaW5lOiBhc1N0cmluZyhmcm9udG1hdHRlcj8uZGVhZGxpbmUpLFxuICAgICAgICB0YWdzOiBBcnJheS5pc0FycmF5KGZyb250bWF0dGVyPy50YWdzKSA/IGZyb250bWF0dGVyLnRhZ3MubWFwKFN0cmluZykgOiBbXVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGUgPT09IFwidGFza1wiKSB7XG4gICAgICB0YXNrcy5wdXNoKHtcbiAgICAgICAgLi4uYmFzZSxcbiAgICAgICAgdHlwZSxcbiAgICAgICAgc3RhdHVzOiBhc1Rhc2tTdGF0dXMoZnJvbnRtYXR0ZXI/LnN0YXR1cyksXG4gICAgICAgIGNhc2U6IGFzU3RyaW5nKGZyb250bWF0dGVyPy5jYXNlKSxcbiAgICAgICAgY2FzZVBhdGg6IGFzU3RyaW5nKGZyb250bWF0dGVyPy5jYXNlUGF0aCksXG4gICAgICAgIHByaW9yaXR5OiBhc1ByaW9yaXR5KGZyb250bWF0dGVyPy5wcmlvcml0eSksXG4gICAgICAgIGR1ZTogYXNTdHJpbmcoZnJvbnRtYXR0ZXI/LmR1ZSlcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0eXBlID09PSBcInNjaGVkdWxlXCIpIHtcbiAgICAgIHNjaGVkdWxlcy5wdXNoKHtcbiAgICAgICAgLi4uYmFzZSxcbiAgICAgICAgdHlwZSxcbiAgICAgICAgZGF5OiBhc1N0cmluZyhmcm9udG1hdHRlcj8uZGF5KSxcbiAgICAgICAgc3RhcnQ6IGFzU3RyaW5nKGZyb250bWF0dGVyPy5zdGFydCksXG4gICAgICAgIGVuZDogYXNTdHJpbmcoZnJvbnRtYXR0ZXI/LmVuZCksXG4gICAgICAgIGR1cmF0aW9uTWludXRlczogYXNOdW1iZXIoZnJvbnRtYXR0ZXI/LmR1cmF0aW9uTWludXRlcyksXG4gICAgICAgIHJlbGF0ZWRUYXNrOiBhc1N0cmluZyhmcm9udG1hdHRlcj8ucmVsYXRlZFRhc2spLFxuICAgICAgICByZWxhdGVkVGFza1BhdGg6IGFzU3RyaW5nKGZyb250bWF0dGVyPy5yZWxhdGVkVGFza1BhdGgpXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAodHlwZSA9PT0gXCJjb2xsZWN0aW9uXCIpIHtcbiAgICAgIGNvbGxlY3Rpb25zLnB1c2goe1xuICAgICAgICAuLi5iYXNlLFxuICAgICAgICB0eXBlLFxuICAgICAgICBzdGF0dXM6IGFzQ29sbGVjdGlvblN0YXR1cyhmcm9udG1hdHRlcj8uc3RhdHVzKSxcbiAgICAgICAgbWVkaXVtOiBhc0NvbGxlY3Rpb25NZWRpdW0oZnJvbnRtYXR0ZXI/Lm1lZGl1bSksXG4gICAgICAgIGNhc2U6IGFzU3RyaW5nKGZyb250bWF0dGVyPy5jYXNlKSxcbiAgICAgICAgY2FzZVBhdGg6IGFzU3RyaW5nKGZyb250bWF0dGVyPy5jYXNlUGF0aCksXG4gICAgICAgIHJhdGluZzogYXNOdW1iZXIoZnJvbnRtYXR0ZXI/LnJhdGluZylcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0eXBlID09PSBcImV2aWRlbmNlXCIpIHtcbiAgICAgIGV2aWRlbmNlLnB1c2goe1xuICAgICAgICAuLi5iYXNlLFxuICAgICAgICB0eXBlLFxuICAgICAgICBjYXNlOiBhc1N0cmluZyhmcm9udG1hdHRlcj8uY2FzZSksXG4gICAgICAgIGNhc2VQYXRoOiBhc1N0cmluZyhmcm9udG1hdHRlcj8uY2FzZVBhdGgpLFxuICAgICAgICBzb3VyY2U6IGFzU3RyaW5nKGZyb250bWF0dGVyPy5zb3VyY2UpXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAodHlwZSA9PT0gXCJwbGFjZVwiKSB7XG4gICAgICBwbGFjZXMucHVzaCh7XG4gICAgICAgIC4uLmJhc2UsXG4gICAgICAgIHR5cGUsXG4gICAgICAgIGNpdHk6IGFzU3RyaW5nKGZyb250bWF0dGVyPy5jaXR5KSxcbiAgICAgICAgY291bnRyeTogYXNTdHJpbmcoZnJvbnRtYXR0ZXI/LmNvdW50cnkpLFxuICAgICAgICBsYXRpdHVkZTogYXNOdW1iZXIoZnJvbnRtYXR0ZXI/LmxhdGl0dWRlKSxcbiAgICAgICAgbG9uZ2l0dWRlOiBhc051bWJlcihmcm9udG1hdHRlcj8ubG9uZ2l0dWRlKSxcbiAgICAgICAgdmlzaXRlZEF0OiBhc1N0cmluZyhmcm9udG1hdHRlcj8udmlzaXRlZEF0KSxcbiAgICAgICAgY292ZXI6IGFzU3RyaW5nKGZyb250bWF0dGVyPy5jb3ZlciksXG4gICAgICAgIGNhc2U6IGFzU3RyaW5nKGZyb250bWF0dGVyPy5jYXNlKSxcbiAgICAgICAgY2FzZVBhdGg6IGFzU3RyaW5nKGZyb250bWF0dGVyPy5jYXNlUGF0aClcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGNhc2VzLnNvcnQoYnlVcGRhdGVkRGVzYyk7XG4gIHRhc2tzLnNvcnQoYnlVcGRhdGVkRGVzYyk7XG4gIHNjaGVkdWxlcy5zb3J0KGJ5VXBkYXRlZERlc2MpO1xuICBjb2xsZWN0aW9ucy5zb3J0KGJ5VXBkYXRlZERlc2MpO1xuICBldmlkZW5jZS5zb3J0KGJ5VXBkYXRlZERlc2MpO1xuICBwbGFjZXMuc29ydChieVVwZGF0ZWREZXNjKTtcblxuICByZXR1cm4geyBjYXNlcywgdGFza3MsIHNjaGVkdWxlcywgY29sbGVjdGlvbnMsIGV2aWRlbmNlLCBwbGFjZXMgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdExvY2FsRGF0ZShkYXRlOiBEYXRlKTogc3RyaW5nIHtcbiAgY29uc3QgeWVhciA9IGRhdGUuZ2V0RnVsbFllYXIoKTtcbiAgY29uc3QgbW9udGggPSBTdHJpbmcoZGF0ZS5nZXRNb250aCgpICsgMSkucGFkU3RhcnQoMiwgXCIwXCIpO1xuICBjb25zdCBkYXkgPSBTdHJpbmcoZGF0ZS5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIFwiMFwiKTtcbiAgcmV0dXJuIGAke3llYXJ9LSR7bW9udGh9LSR7ZGF5fWA7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVUeXBlZE5vdGUoXG4gIGFwcDogQXBwLFxuICBmb2xkZXI6IHN0cmluZyxcbiAgdGl0bGU6IHN0cmluZyxcbiAgdGVtcGxhdGU6IHN0cmluZ1xuKTogUHJvbWlzZTxURmlsZT4ge1xuICBjb25zdCBzYWZlTmFtZSA9IHRpdGxlLnJlcGxhY2UoL1tcXFxcLzoqP1wiPD58XS9nLCBcIi1cIikudHJpbSgpIHx8IFwiVW50aXRsZWRcIjtcbiAgY29uc3QgZmlsZVBhdGggPSBub3JtYWxpemVQYXRoKGAke2ZvbGRlcn0vJHtzYWZlTmFtZX0ubWRgKTtcbiAgY29uc3QgZXhpc3RpbmcgPSBhcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGZpbGVQYXRoKTtcbiAgaWYgKGV4aXN0aW5nIGluc3RhbmNlb2YgVEZpbGUpIHtcbiAgICByZXR1cm4gZXhpc3Rpbmc7XG4gIH1cbiAgcmV0dXJuIGFwcC52YXVsdC5jcmVhdGUoZmlsZVBhdGgsIHRlbXBsYXRlKTtcbn1cblxuZnVuY3Rpb24gYXNTdHJpbmcodmFsdWU6IHVua25vd24pOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gdmFsdWUgOiB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIGFzUHJpb3JpdHkodmFsdWU6IHVua25vd24pOiBcImxvd1wiIHwgXCJtZWRpdW1cIiB8IFwiaGlnaFwiIHwgdW5kZWZpbmVkIHtcbiAgcmV0dXJuIHZhbHVlID09PSBcImxvd1wiIHx8IHZhbHVlID09PSBcIm1lZGl1bVwiIHx8IHZhbHVlID09PSBcImhpZ2hcIiA/IHZhbHVlIDogdW5kZWZpbmVkO1xufVxuXG5mdW5jdGlvbiBhc051bWJlcih2YWx1ZTogdW5rbm93bik6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gIGlmICh0eXBlb2YgdmFsdWUgPT09IFwibnVtYmVyXCIpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIikge1xuICAgIGNvbnN0IHBhcnNlZCA9IE51bWJlcih2YWx1ZSk7XG4gICAgcmV0dXJuIE51bWJlci5pc0Zpbml0ZShwYXJzZWQpID8gcGFyc2VkIDogdW5kZWZpbmVkO1xuICB9XG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIGFzQ2FzZVN0YXR1cyh2YWx1ZTogdW5rbm93bik6IFwib3BlblwiIHwgXCJhY3RpdmVcIiB8IFwiYXJjaGl2ZWRcIiB7XG4gIHJldHVybiB2YWx1ZSA9PT0gXCJhY3RpdmVcIiB8fCB2YWx1ZSA9PT0gXCJhcmNoaXZlZFwiID8gdmFsdWUgOiBcIm9wZW5cIjtcbn1cblxuZnVuY3Rpb24gYXNUYXNrU3RhdHVzKHZhbHVlOiB1bmtub3duKTogXCJiYWNrbG9nXCIgfCBcInNjaGVkdWxlZFwiIHwgXCJkb25lXCIge1xuICByZXR1cm4gdmFsdWUgPT09IFwic2NoZWR1bGVkXCIgfHwgdmFsdWUgPT09IFwiZG9uZVwiID8gdmFsdWUgOiBcImJhY2tsb2dcIjtcbn1cblxuZnVuY3Rpb24gYXNDb2xsZWN0aW9uU3RhdHVzKHZhbHVlOiB1bmtub3duKTogXCJxdWV1ZWRcIiB8IFwicmVhZGluZ1wiIHwgXCJmaW5pc2hlZFwiIHwgdW5kZWZpbmVkIHtcbiAgcmV0dXJuIHZhbHVlID09PSBcInF1ZXVlZFwiIHx8IHZhbHVlID09PSBcInJlYWRpbmdcIiB8fCB2YWx1ZSA9PT0gXCJmaW5pc2hlZFwiID8gdmFsdWUgOiB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIGFzQ29sbGVjdGlvbk1lZGl1bSh2YWx1ZTogdW5rbm93bik6IFwiYm9va1wiIHwgXCJtb3ZpZVwiIHwgXCJzZXJpZXNcIiB8IFwiYWxidW1cIiB8IFwiYXJ0aWNsZVwiIHwgXCJvdGhlclwiIHwgdW5kZWZpbmVkIHtcbiAgcmV0dXJuIHZhbHVlID09PSBcImJvb2tcIiB8fCB2YWx1ZSA9PT0gXCJtb3ZpZVwiIHx8IHZhbHVlID09PSBcInNlcmllc1wiIHx8IHZhbHVlID09PSBcImFsYnVtXCIgfHwgdmFsdWUgPT09IFwiYXJ0aWNsZVwiIHx8IHZhbHVlID09PSBcIm90aGVyXCJcbiAgICA/IHZhbHVlXG4gICAgOiB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIGJ5VXBkYXRlZERlc2M8VCBleHRlbmRzIHsgdXBkYXRlZD86IHN0cmluZyB9PihhOiBULCBiOiBUKTogbnVtYmVyIHtcbiAgcmV0dXJuIChiLnVwZGF0ZWQgPz8gXCJcIikubG9jYWxlQ29tcGFyZShhLnVwZGF0ZWQgPz8gXCJcIik7XG59XG4iLCAiaW1wb3J0IHsgQXBwLCBQbHVnaW5TZXR0aW5nVGFiLCBTZXR0aW5nIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgdHlwZSBTaGVybG9ja09TUGx1Z2luIGZyb20gXCIuL21haW5cIjtcblxuZXhwb3J0IGNsYXNzIFNoZXJsb2NrU2V0dGluZ1RhYiBleHRlbmRzIFBsdWdpblNldHRpbmdUYWIge1xuICBwbHVnaW46IFNoZXJsb2NrT1NQbHVnaW47XG5cbiAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogU2hlcmxvY2tPU1BsdWdpbikge1xuICAgIHN1cGVyKGFwcCwgcGx1Z2luKTtcbiAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgfVxuXG4gIGRpc3BsYXkoKTogdm9pZCB7XG4gICAgY29uc3QgeyBjb250YWluZXJFbCB9ID0gdGhpcztcbiAgICBjb250YWluZXJFbC5lbXB0eSgpO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIlNoZXJsb2NrIE9TIFNldHRpbmdzXCIgfSk7XG5cbiAgICB0aGlzLmFkZFRleHRTZXR0aW5nKGNvbnRhaW5lckVsLCBcIlx1Njg0OFx1NEVGNlx1NjU4N1x1NEVGNlx1NTkzOVwiLCB0aGlzLnBsdWdpbi5zZXR0aW5ncy5jYXNlRm9sZGVyLCBhc3luYyAodmFsdWUpID0+IHtcbiAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmNhc2VGb2xkZXIgPSB2YWx1ZS50cmltKCkgfHwgXCJTaGVybG9jayBPUy9DYXNlc1wiO1xuICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgfSk7XG5cbiAgICB0aGlzLmFkZFRleHRTZXR0aW5nKGNvbnRhaW5lckVsLCBcIlx1NEVGQlx1NTJBMVx1NjU4N1x1NEVGNlx1NTkzOVwiLCB0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXNrRm9sZGVyLCBhc3luYyAodmFsdWUpID0+IHtcbiAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnRhc2tGb2xkZXIgPSB2YWx1ZS50cmltKCkgfHwgXCJTaGVybG9jayBPUy9UYXNrc1wiO1xuICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgfSk7XG5cbiAgICB0aGlzLmFkZFRleHRTZXR0aW5nKGNvbnRhaW5lckVsLCBcIlx1NjM5Mlx1NjcxRlx1NjU4N1x1NEVGNlx1NTkzOVwiLCB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zY2hlZHVsZUZvbGRlciwgYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zY2hlZHVsZUZvbGRlciA9IHZhbHVlLnRyaW0oKSB8fCBcIlNoZXJsb2NrIE9TL1NjaGVkdWxlc1wiO1xuICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgfSk7XG5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiXHU5NkZFXHU2QzE0XHU1RjNBXHU1RUE2XCIpXG4gICAgICAuc2V0RGVzYyhcIlx1NjNBN1x1NTIzNlx1OTk5Nlx1OTg3NVx1NkMxQlx1NTZGNFx1NUM0Mlx1NzY4NFx1NUI1OFx1NTcyOFx1NjExRlx1MzAwMlwiKVxuICAgICAgLmFkZFNsaWRlcigoc2xpZGVyKSA9PlxuICAgICAgICBzbGlkZXIuc2V0TGltaXRzKDAsIDEwMCwgMSkuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZm9nRGVuc2l0eSkuc2V0RHluYW1pY1Rvb2x0aXAoKS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5mb2dEZW5zaXR5ID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pXG4gICAgICApO1xuXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIlx1NTJBOFx1NjAwMVx1NUYzQVx1NUVBNlwiKVxuICAgICAgLnNldERlc2MoXCJcdTRFM0FcdTU0MEVcdTdFRURcdTk5OTZcdTk4NzVcdTUyQThcdTYwMDFcdTU0OENcdTU0NjhcdTYzOTJcdTY3MUZcdTUyQThcdTc1M0JcdTk4ODRcdTc1NTlcdTMwMDJcIilcbiAgICAgIC5hZGRTbGlkZXIoKHNsaWRlcikgPT5cbiAgICAgICAgc2xpZGVyLnNldExpbWl0cygwLCAxMDAsIDEpLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLm1vdGlvbkludGVuc2l0eSkuc2V0RHluYW1pY1Rvb2x0aXAoKS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5tb3Rpb25JbnRlbnNpdHkgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSlcbiAgICAgICk7XG4gIH1cblxuICBwcml2YXRlIGFkZFRleHRTZXR0aW5nKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCwgbmFtZTogc3RyaW5nLCB2YWx1ZTogc3RyaW5nLCBvbkNoYW5nZTogKHZhbHVlOiBzdHJpbmcpID0+IFByb21pc2U8dm9pZD4pOiB2b2lkIHtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKG5hbWUpXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT4gdGV4dC5zZXRQbGFjZWhvbGRlcih2YWx1ZSkuc2V0VmFsdWUodmFsdWUpLm9uQ2hhbmdlKG9uQ2hhbmdlKSk7XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBJdGVtVmlldywgTm90aWNlLCBURmlsZSwgV29ya3NwYWNlTGVhZiB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHR5cGUgU2hlcmxvY2tPU1BsdWdpbiBmcm9tIFwiLi9tYWluXCI7XG5pbXBvcnQgdHlwZSB7IFNoZXJsb2NrQ2FzZSwgU2hlcmxvY2tQbGFjZSwgU2hlcmxvY2tTY2hlZHVsZSwgU2hlcmxvY2tUYXNrLCBTaGVybG9ja1dvcmtzcGFjZURhdGEgfSBmcm9tIFwiLi90eXBlc1wiO1xuXG5leHBvcnQgY29uc3QgU0hFUkxPQ0tfVklFV19UWVBFID0gXCJzaGVybG9jay1vcy1kYXNoYm9hcmRcIjtcbmV4cG9ydCBjb25zdCBMRUdBQ1lfU0hFUkxPQ0tfVklFV19UWVBFID0gXCJzaGVybG9jay1vcy13b3Jrc3BhY2VcIjtcbnR5cGUgU2hlcmxvY2tTY3JlZW4gPSBcImVudHJ5XCIgfCBcImhvbWVcIiB8IFwiY2FzZXNcIiB8IFwicmVhZGluZ1wiIHwgXCJmb290cHJpbnRzXCIgfCBcImNhc2VcIjtcbnR5cGUgU2hlcmxvY2tFdmlkZW5jZUtpbmQgPSBcIm1hcmtkb3duXCIgfCBcInBkZlwiIHwgXCJpbWFnZVwiIHwgXCJsb2NhbFwiO1xuaW50ZXJmYWNlIFNoZXJsb2NrRXZpZGVuY2VJdGVtIHtcbiAgZmlsZTogVEZpbGU7XG4gIGtpbmQ6IFNoZXJsb2NrRXZpZGVuY2VLaW5kO1xufVxuXG5jb25zdCBFTlRSWV9UUkFOU0lUSU9OX01TID0gMjYwMDtcbmNvbnN0IERFRkFVTFRfU0NIRURVTEVfRFVSQVRJT05fTUlOVVRFUyA9IDYwO1xuY29uc3QgTUFQX0NFTlRFUl9MT05HSVRVREUgPSAxMDU7XG5jb25zdCBXRUVLX0RBWVMgPSBbXG4gIHsgbGFiZWw6IFwiTW9uXCIsIG9mZnNldDogMCB9LFxuICB7IGxhYmVsOiBcIlR1ZVwiLCBvZmZzZXQ6IDEgfSxcbiAgeyBsYWJlbDogXCJXZWRcIiwgb2Zmc2V0OiAyIH0sXG4gIHsgbGFiZWw6IFwiVGh1XCIsIG9mZnNldDogMyB9LFxuICB7IGxhYmVsOiBcIkZyaVwiLCBvZmZzZXQ6IDQgfSxcbiAgeyBsYWJlbDogXCJTYXRcIiwgb2Zmc2V0OiA1IH0sXG4gIHsgbGFiZWw6IFwiU3VuXCIsIG9mZnNldDogNiB9XG5dIGFzIGNvbnN0O1xuY29uc3QgVElNRV9TTE9UUyA9IFtcIjA4OjAwXCIsIFwiMTA6MDBcIiwgXCIxMjowMFwiLCBcIjE0OjAwXCIsIFwiMTY6MDBcIiwgXCIxOTowMFwiXTtcblxuZXhwb3J0IGNsYXNzIFNoZXJsb2NrV29ya3NwYWNlVmlldyBleHRlbmRzIEl0ZW1WaWV3IHtcbiAgcGx1Z2luOiBTaGVybG9ja09TUGx1Z2luO1xuICBwcml2YXRlIHNjcmVlbjogU2hlcmxvY2tTY3JlZW4gPSBcImVudHJ5XCI7XG4gIHByaXZhdGUgc2VsZWN0ZWRDYXNlUGF0aD86IHN0cmluZztcbiAgcHJpdmF0ZSBoYXNFbnRlcmVkID0gZmFsc2U7XG4gIHByaXZhdGUgZW50cnlUaW1lcj86IG51bWJlcjtcblxuICBjb25zdHJ1Y3RvcihsZWFmOiBXb3Jrc3BhY2VMZWFmLCBwbHVnaW46IFNoZXJsb2NrT1NQbHVnaW4pIHtcbiAgICBzdXBlcihsZWFmKTtcbiAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgfVxuXG4gIGdldFZpZXdUeXBlKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIFNIRVJMT0NLX1ZJRVdfVFlQRTtcbiAgfVxuXG4gIGdldERpc3BsYXlUZXh0KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIFwiU2hlcmxvY2tcIjtcbiAgfVxuXG4gIGdldEljb24oKTogc3RyaW5nIHtcbiAgICByZXR1cm4gXCJzZWFyY2gtY2hlY2tcIjtcbiAgfVxuXG4gIGFzeW5jIG9uT3BlbigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICAgIHRoaXMuY29udGVudEVsLmFkZENsYXNzKFwic2hlcmxvY2stb3Mtdmlld1wiKTtcbiAgICAgIGF3YWl0IHRoaXMucmVzZXRUb0VudHJ5KCk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMucGx1Z2luLmRlYnVnTG9nKGB2aWV3Om9uT3BlbjplcnJvcjoke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5zdGFjayA/PyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgICAgIHRoaXMucmVuZGVyRmFsbGJhY2soZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIG9uQ2xvc2UoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMuZW50cnlUaW1lcikge1xuICAgICAgd2luZG93LmNsZWFyVGltZW91dCh0aGlzLmVudHJ5VGltZXIpO1xuICAgICAgdGhpcy5lbnRyeVRpbWVyID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHJlZnJlc2goKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMucmVuZGVyQ3VycmVudFNjcmVlbigpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLnBsdWdpbi5kZWJ1Z0xvZyhgdmlldzpyZWZyZXNoOmVycm9yOiR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLnN0YWNrID8/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgICAgdGhpcy5yZW5kZXJGYWxsYmFjayhlcnJvcik7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcmVzZXRUb0VudHJ5KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICh0aGlzLmVudHJ5VGltZXIpIHtcbiAgICAgIHdpbmRvdy5jbGVhclRpbWVvdXQodGhpcy5lbnRyeVRpbWVyKTtcbiAgICAgIHRoaXMuZW50cnlUaW1lciA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdGhpcy5zZWxlY3RlZENhc2VQYXRoID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuaGFzRW50ZXJlZCA9IGZhbHNlO1xuICAgIHRoaXMuc2NyZWVuID0gXCJlbnRyeVwiO1xuICAgIGF3YWl0IHRoaXMucmVuZGVyQ3VycmVudFNjcmVlbigpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyByZW5kZXJDdXJyZW50U2NyZWVuKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICh0aGlzLnNjcmVlbiA9PT0gXCJlbnRyeVwiICYmICF0aGlzLmhhc0VudGVyZWQpIHtcbiAgICAgIHRoaXMucmVuZGVyRW50cnlTY3JlZW4oKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5zY3JlZW4gPT09IFwiY2FzZVwiICYmIHRoaXMuc2VsZWN0ZWRDYXNlUGF0aCkge1xuICAgICAgYXdhaXQgdGhpcy5yZW5kZXJDYXNlV29ya3NwYWNlKHRoaXMuc2VsZWN0ZWRDYXNlUGF0aCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuc2NyZWVuID09PSBcImNhc2VzXCIpIHtcbiAgICAgIGF3YWl0IHRoaXMucmVuZGVyQ2FzZURlc2soKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5zY3JlZW4gPT09IFwicmVhZGluZ1wiKSB7XG4gICAgICBhd2FpdCB0aGlzLnJlbmRlclJlYWRpbmdEZXNrKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuc2NyZWVuID09PSBcImZvb3RwcmludHNcIikge1xuICAgICAgYXdhaXQgdGhpcy5yZW5kZXJGb290cHJpbnREZXNrKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5yZW5kZXJIb21lKCk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckVudHJ5U2NyZWVuKCk6IHZvaWQge1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgY29uc3QgaW1hZ2VVcmwgPSB0aGlzLnBsdWdpbi5nZXRFbnRyeUltYWdlVXJsKCk7XG4gICAgY29uc3QgZW50cnkgPSB0aGlzLmNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stZW50cnktc2NyZWVuIGlzLXdhcm1pbmdcIiB9KTtcbiAgICBlbnRyeS5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2UgPSBgbGluZWFyLWdyYWRpZW50KDE4MGRlZywgcmdiYSg3LCA5LCAxMSwgMC4wOCksIHJnYmEoNiwgNywgOCwgMC4yOCkpLCB1cmwoXCIke2ltYWdlVXJsfVwiKWA7XG4gICAgZW50cnkuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWVudHJ5LWFtYmllbnRcIiB9KTtcbiAgICBlbnRyeS5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stZW50cnktZnJhbWVcIiB9KTtcbiAgICBlbnRyeS5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stZW50cnktdmVpbFwiIH0pO1xuICAgIGNvbnN0IGJvb2tCdXR0b24gPSBlbnRyeS5jcmVhdGVFbChcImJ1dHRvblwiLCB7XG4gICAgICBjbHM6IFwic2hlcmxvY2stZW50cnktYm9va1wiLFxuICAgICAgYXR0cjoge1xuICAgICAgICBcImFyaWEtbGFiZWxcIjogXCJFbnRlciBTaGVybG9jayBPU1wiXG4gICAgICB9XG4gICAgfSk7XG4gICAgYm9va0J1dHRvbi5jcmVhdGVTcGFuKHsgY2xzOiBcInNoZXJsb2NrLWVudHJ5LXJpbmdcIiB9KTtcbiAgICBib29rQnV0dG9uLmNyZWF0ZVNwYW4oeyBjbHM6IFwic2hlcmxvY2stZW50cnktb3JiaXRcIiB9KTtcbiAgICBjb25zdCBjYXB0aW9uID0gZW50cnkuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWVudHJ5LWNhcHRpb25cIiB9KTtcbiAgICBjYXB0aW9uLmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IFwiU2hlcmxvY2tcIiB9KTtcbiAgICBjYXB0aW9uLmNyZWF0ZUVsKFwic21hbGxcIiwgeyB0ZXh0OiBcIjIyMUIgY2FzZSBjb25zb2xlXCIgfSk7XG4gICAgY29uc3QgaGludCA9IGVudHJ5LmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1lbnRyeS1oaW50XCIgfSk7XG4gICAgaGludC5zZXRUZXh0KFwiXHU3MEI5XHU1MUZCXHU0RTJEXHU1OTJFXHU1Mzc3XHU1Qjk3XHVGRjBDXHU3MEI5XHU0RUFFXHU2ODQ4XHU0RUY2XHU2ODRDXCIpO1xuXG4gICAgY29uc3QgcHJlbG9hZCA9IG5ldyBJbWFnZSgpO1xuICAgIHByZWxvYWQuc3JjID0gaW1hZ2VVcmw7XG4gICAgY29uc3QgaW1hZ2VSZWFkeSA9IHByZWxvYWQuZGVjb2RlID8gcHJlbG9hZC5kZWNvZGUoKSA6IFByb21pc2UucmVzb2x2ZSgpO1xuICAgIGltYWdlUmVhZHlcbiAgICAgIC50aGVuKCgpID0+IGVudHJ5LmFkZENsYXNzKFwiaXMtcmVhZHlcIikpXG4gICAgICAuY2F0Y2goKCkgPT4gZW50cnkuYWRkQ2xhc3MoXCJpcy1yZWFkeVwiKSk7XG5cbiAgICBsZXQgZW50ZXJpbmcgPSBmYWxzZTtcbiAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoYm9va0J1dHRvbiwgXCJjbGlja1wiLCAoKSA9PiB7XG4gICAgICBpZiAoZW50ZXJpbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgZW50ZXJpbmcgPSB0cnVlO1xuICAgICAgYm9va0J1dHRvbi5zZXRBdHRyaWJ1dGUoXCJkaXNhYmxlZFwiLCBcInRydWVcIik7XG4gICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgICAgZW50cnkucmVtb3ZlQ2xhc3MoXCJpcy13YXJtaW5nXCIpO1xuICAgICAgICBlbnRyeS5hZGRDbGFzcyhcImlzLWVudGVyaW5nXCIpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLmVudHJ5VGltZXIgPSB3aW5kb3cuc2V0VGltZW91dChhc3luYyAoKSA9PiB7XG4gICAgICAgIHRoaXMuaGFzRW50ZXJlZCA9IHRydWU7XG4gICAgICAgIHRoaXMuc2NyZWVuID0gXCJob21lXCI7XG4gICAgICAgIGF3YWl0IHRoaXMucmVuZGVySG9tZSgpO1xuICAgICAgfSwgRU5UUllfVFJBTlNJVElPTl9NUyk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlbmRlckhvbWUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5wbHVnaW4uZGVidWdMb2coXCJ2aWV3OnJlbmRlcjpzdGFydFwiKTtcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgdGhpcy5wbHVnaW4uZ2V0V29ya3NwYWNlRGF0YSgpO1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG5cbiAgICBjb25zdCBzaGVsbCA9IHRoaXMuY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1zaGVsbCBzaGVybG9jay1ob21lLXNoZWxsXCIgfSk7XG4gICAgc2hlbGwuZGF0YXNldC5wZXJpb2QgPSB0aGlzLnJlc29sdmVQZXJpb2QoKTtcbiAgICB0aGlzLmNyZWF0ZVBhcmxvckJhY2tkcm9wKHNoZWxsKTtcbiAgICBzaGVsbC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stYXRtb3NwaGVyZSBzaGVybG9jay1mb2ctbGF5ZXJcIiB9KTtcbiAgICBzaGVsbC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stYXRtb3NwaGVyZSBzaGVybG9jay1ncmFpbi1sYXllclwiIH0pO1xuICAgIHNoZWxsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1hdG1vc3BoZXJlIHNoZXJsb2NrLW1hcC1sYXllclwiIH0pO1xuICAgIGNvbnN0IGhlcm8gPSBzaGVsbC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2staGVybyBzaGVybG9jay1ob21lLWhlcm9cIiB9KTtcbiAgICBjb25zdCBjb3B5ID0gaGVyby5jcmVhdGVEaXYoKTtcbiAgICBjb3B5LmNyZWF0ZUVsKFwicFwiLCB7IGNsczogXCJzaGVybG9jay1raWNrZXJcIiwgdGV4dDogXCIyMjFCIEJha2VyIFN0cmVldCAvIEhvbWUgSGFsbFwiIH0pO1xuICAgIGNvcHkuY3JlYXRlRWwoXCJoMVwiLCB7IGNsczogXCJzaGVybG9jay10aXRsZVwiLCB0ZXh0OiBcIlNoZXJsb2NrXCIgfSk7XG4gICAgY29weS5jcmVhdGVFbChcInBcIiwge1xuICAgICAgY2xzOiBcInNoZXJsb2NrLWVkaXRvcmlhbC1ub3RlXCIsXG4gICAgICB0ZXh0OiB0aGlzLnJlc29sdmVQZXJpb2QoKSA9PT0gXCJuaWdodFwiXG4gICAgICAgID8gXCJcdTU5MUNcdTgyNzJcdTkxQ0NcdTc2ODRcdTRGMjZcdTY1NjZcdTY2RjRcdTkwMDJcdTU0MDhcdTYzQThcdTc0MDZcdTMwMDJcdTYyOEFcdTdFQkZcdTdEMjJcdTMwMDFcdTY1RTVcdTdBMEJcdTg4NjhcdTMwMDFcdTc4MTRcdTdBNzZcdTRFMEVcdTU2REVcdTVGQzZcdTY1NzRcdTc0MDZcdThGREJcdTU0MENcdTRFMDBcdTVGMjBcdTY4NDhcdTRFRjZcdTY4NENcdTMwMDJcIlxuICAgICAgICA6IFwiXHU3NjdEXHU2NjNDXHU5MDAyXHU1NDA4XHU1RjUyXHU2ODYzXHU0RTBFXHU2MzkyXHU3QTBCXHUzMDAyXHU4QkE5XHU0RjYwXHU3Njg0XHU3QjE0XHU4QkIwXHUzMDAxXHU0RThCXHU1MkExXHU0RTBFXHU4RDQ0XHU2NTk5XHU1MENGXHU2ODQ4XHU1Mzc3XHU0RTAwXHU2ODM3XHU4OEFCXHU3Q0ZCXHU3RURGXHU2NTc0XHU3NDA2XHUzMDAyXCJcbiAgICB9KTtcblxuICAgIGNvbnN0IGh1YiA9IHNoZWxsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1ob21lLWh1YlwiIH0pO1xuICAgIHRoaXMuY3JlYXRlSG9tZVBvcnRhbChodWIsIHtcbiAgICAgIGxhYmVsOiBcIlBST0pFQ1QgREVTS1wiLFxuICAgICAgdGl0bGU6IFwiXHU2ODQ4XHU0RUY2XHU1Mzc3XHU1Qjk3XHU0RTBFXHU4QzAzXHU2N0U1XHU2MzkyXHU2NzFGXCIsXG4gICAgICB0ZXh0OiBgXHU3QkExXHU3NDA2ICR7ZGF0YS5jYXNlcy5sZW5ndGh9IFx1NUI5N1x1Njg0OFx1NEVGNlx1MzAwMSR7ZGF0YS50YXNrcy5maWx0ZXIoKGl0ZW0pID0+IGl0ZW0uc3RhdHVzICE9PSBcImRvbmVcIikubGVuZ3RofSBcdTY3NjFcdTdFQkZcdTdEMjJcdTRFRkJcdTUyQTFcdTU0OEMgJHtkYXRhLnNjaGVkdWxlcy5sZW5ndGh9IFx1Njc2MVx1NjM5Mlx1NjcxRlx1MzAwMmAsXG4gICAgICBidXR0b246IFwiXHU2MjUzXHU1RjAwXHU2ODQ4XHU0RUY2XHU2ODRDXCIsXG4gICAgICBzY3JlZW46IFwiY2FzZXNcIixcbiAgICAgIHRvbmU6IFwiYm9hcmRcIlxuICAgIH0pO1xuICAgIHRoaXMuY3JlYXRlSG9tZVBvcnRhbChodWIsIHtcbiAgICAgIGxhYmVsOiBcIkFSQ0hJVkUgREVTS1wiLFxuICAgICAgdGl0bGU6IFwiXHU4QkMxXHU3MjY5XHU3ODE0XHU4QkZCXHU0RTBFXHU2ODYzXHU2ODQ4XHU2N0RDXCIsXG4gICAgICB0ZXh0OiBgXHU2QjYzXHU1NzI4XHU3ODE0XHU4QkZCICR7ZGF0YS5jb2xsZWN0aW9ucy5maWx0ZXIoKGl0ZW0pID0+IGl0ZW0uc3RhdHVzICE9PSBcImZpbmlzaGVkXCIpLmxlbmd0aH0gXHU5ODc5XHVGRjBDXHU4QkMxXHU3MjY5XHU2N0RDXHU1REYyXHU2NzA5ICR7ZGF0YS5ldmlkZW5jZS5sZW5ndGh9IFx1NEVGRFx1NTNFRlx1N0YxNlx1OEY5MVx1Njg2M1x1Njg0OFx1MzAwMmAsXG4gICAgICBidXR0b246IFwiXHU2MjUzXHU1RjAwXHU2ODYzXHU2ODQ4XHU2ODRDXCIsXG4gICAgICBzY3JlZW46IFwicmVhZGluZ1wiLFxuICAgICAgdG9uZTogXCJzdHVkeVwiXG4gICAgfSk7XG4gICAgdGhpcy5jcmVhdGVIb21lUG9ydGFsKGh1Yiwge1xuICAgICAgbGFiZWw6IFwiTUVNT1JZIE1BUFwiLFxuICAgICAgdGl0bGU6IFwiXHU4REIzXHU4RkY5XHU1NzMwXHU1NkZFXCIsXG4gICAgICB0ZXh0OiBgJHtkYXRhLnBsYWNlcy5sZW5ndGh9IFx1NEUyQVx1NTdDRVx1NUUwMlx1NTE0OVx1NzBCOVx1MzAwMlx1NkJDRlx1NkIyMVx1NTIzMFx1OEJCRlx1OTBGRFx1NTNFRlx1NEVFNVx1NkM4OVx1NkRDMFx1NjIxMFx1NzE2N1x1NzI0N1x1MzAwMVx1NjVFNVx1NjcxRlx1NEUwRVx1N0IxNFx1OEJCMFx1MzAwMmAsXG4gICAgICBidXR0b246IFwiXHU2MjUzXHU1RjAwXHU1NzMwXHU1NkZFXCIsXG4gICAgICBzY3JlZW46IFwiZm9vdHByaW50c1wiLFxuICAgICAgdG9uZTogXCJtYXBcIlxuICAgIH0pO1xuICAgIHRoaXMucGx1Z2luLmRlYnVnTG9nKFwidmlldzpyZW5kZXI6Y29tcGxldGVcIik7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlbmRlckNhc2VEZXNrKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCB0aGlzLnBsdWdpbi5nZXRXb3Jrc3BhY2VEYXRhKCk7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICBjb25zdCBzaGVsbCA9IHRoaXMuY3JlYXRlRGVza1NoZWxsKFwic2hlcmxvY2stY2FzZS1kZXNrLXNoZWxsXCIpO1xuICAgIHRoaXMucmVuZGVyRGVza0hlYWRlcihzaGVsbCwgXCJQcm9qZWN0IERlc2tcIiwgXCJcdTY4NDhcdTRFRjZcdTUzNzdcdTVCOTdcdTRFMEVcdThDMDNcdTY3RTVcdTYzOTJcdTY3MUZcIiwgXCJcdTY4NDhcdTRFRjZcdTMwMDFcdTRFRkJcdTUyQTFcdTU0OENcdTY3MkNcdTU0NjhcdThDMDNcdTY3RTVcdTYzOTJcdTY3MUZcdTY1M0VcdTU3MjhcdTU0MENcdTRFMDBcdTRFMkFcdTVERTVcdTRGNUNcdTUzRjBcdTkxQ0NcdUZGMENcdTUxNDhcdTkwMDlcdTY4NDhcdTRFRjZcdUZGMENcdTUxOERcdTYyOEFcdTc3MUZcdTZCNjNcdTg5ODFcdTYyNjdcdTg4NENcdTc2ODRcdTdFQkZcdTdEMjJcdTYyOTVcdTkwMTJcdTUyMzBcdTU0NjhcdTY3N0ZcdTMwMDJcIiwgW1xuICAgICAgeyBsYWJlbDogXCJcdTY1QjBcdTVFRkFcdTY4NDhcdTRFRjZcIiwgYWN0aW9uOiBhc3luYyAoKSA9PiB0aGlzLnBsdWdpbi5jcmVhdGVDYXNlTm90ZSgpIH0sXG4gICAgICB7IGxhYmVsOiBcIlx1NjVCMFx1NUVGQVx1NEVGQlx1NTJBMVwiLCBhY3Rpb246IGFzeW5jICgpID0+IHRoaXMucGx1Z2luLmNyZWF0ZVRhc2tOb3RlKCkgfSxcbiAgICAgIHsgbGFiZWw6IFwiXHU2NUIwXHU1RUZBXHU2MzkyXHU2NzFGXCIsIGFjdGlvbjogYXN5bmMgKCkgPT4gdGhpcy5wbHVnaW4uY3JlYXRlU2NoZWR1bGVOb3RlKCksIHNlY29uZGFyeTogdHJ1ZSB9XG4gICAgXSk7XG4gICAgY29uc3QgZ3JpZCA9IHNoZWxsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1ncmlkIHNoZXJsb2NrLWRlc2stZ3JpZFwiIH0pO1xuICAgIHRoaXMucmVuZGVyQ2FzZUJvYXJkKGdyaWQsIGRhdGEuY2FzZXMpO1xuICAgIHRoaXMucmVuZGVySW52ZXN0aWdhdGlvblNjaGVkdWxlcihncmlkLCBkYXRhKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcmVuZGVyUmVhZGluZ0Rlc2soKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHRoaXMucGx1Z2luLmdldFdvcmtzcGFjZURhdGEoKTtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIGNvbnN0IHNoZWxsID0gdGhpcy5jcmVhdGVEZXNrU2hlbGwoXCJzaGVybG9jay1yZWFkaW5nLWRlc2stc2hlbGxcIik7XG4gICAgdGhpcy5yZW5kZXJEZXNrSGVhZGVyKHNoZWxsLCBcIkFyY2hpdmUgRGVza1wiLCBcIlx1OEJDMVx1NzI2OVx1NzgxNFx1OEJGQlx1NEUwRVx1Njg2M1x1Njg0OFx1NjdEQ1wiLCBcIlx1NkI2M1x1NTcyOFx1OEJGQlx1MzAwMVx1NkI2M1x1NTcyOFx1NzcwQlx1MzAwMVx1NkI2M1x1NTcyOFx1NzgxNFx1N0E3Nlx1NzY4NFx1NTE4NVx1NUJCOVx1NTE0OFx1NzU1OVx1NTcyOFx1OEJDMVx1NzI2OVx1NzgxNFx1OEJGQlx1RkYxQlx1Nzg2RVx1OEJBNFx1NkM4OVx1NkRDMFx1NTQwRVx1RkYwQ1x1NEUwMFx1OTUyRVx1NUY1Mlx1NTE2NVx1OEJDMVx1NzI2OVx1NjdEQ1x1RkYwQ1x1NEU0Qlx1NTQwRVx1NEVDRFx1NTNFRlx1N0YxNlx1OEY5MVx1MzAwMVx1NTIyMFx1OTY2NFx1NTQ4Q1x1NTE3M1x1ODA1NFx1Njg0OFx1NEVGNlx1MzAwMlwiLCBbXG4gICAgICB7IGxhYmVsOiBcIlx1NjVCMFx1NUVGQVx1NzgxNFx1OEJGQlwiLCBhY3Rpb246IGFzeW5jICgpID0+IHRoaXMucGx1Z2luLmNyZWF0ZUNvbGxlY3Rpb25Ob3RlKCkgfSxcbiAgICAgIHsgbGFiZWw6IFwiXHU2NUIwXHU1RUZBXHU4QkMxXHU3MjY5XCIsIGFjdGlvbjogYXN5bmMgKCkgPT4gdGhpcy5wbHVnaW4uY3JlYXRlRXZpZGVuY2VOb3RlKCksIHNlY29uZGFyeTogdHJ1ZSB9XG4gICAgXSk7XG4gICAgY29uc3QgZ3JpZCA9IHNoZWxsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1ncmlkIHNoZXJsb2NrLWRlc2stZ3JpZFwiIH0pO1xuICAgIHRoaXMucmVuZGVyUmVhZGluZ01vZHVsZShncmlkLCBkYXRhKTtcbiAgICB0aGlzLnJlbmRlckFyY2hpdmVNb2R1bGUoZ3JpZCwgZGF0YSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlbmRlckZvb3RwcmludERlc2soKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHRoaXMucGx1Z2luLmdldFdvcmtzcGFjZURhdGEoKTtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIGNvbnN0IHNoZWxsID0gdGhpcy5jcmVhdGVEZXNrU2hlbGwoXCJzaGVybG9jay1mb290cHJpbnQtZGVzay1zaGVsbFwiKTtcbiAgICB0aGlzLnJlbmRlckRlc2tIZWFkZXIoc2hlbGwsIFwiTWVtb3J5IE1hcFwiLCBcIlx1OERCM1x1OEZGOVx1NTczMFx1NTZGRVwiLCBcIlx1NTdDRVx1NUUwMlx1NjYyRlx1OEJCMFx1NUZDNlx1NTc1MFx1NjgwN1x1MzAwMlx1NzBCOVx1NUYwMFx1NEUwMFx1NkIyMVx1NTIzMFx1OEJCRlx1RkYwQ1x1NUMzMVx1ODBGRFx1N0VFN1x1N0VFRFx1ODg2NVx1NUMwMVx1OTc2Mlx1MzAwMVx1NzE2N1x1NzI0N1x1NTg5OVx1MzAwMVx1NjVGNlx1OTVGNFx1MzAwMVx1N0IxNFx1OEJCMFx1NTQ4Q1x1Njg0OFx1NEVGNi9cdTk2MDVcdThCRkJcdTUxNzNcdTgwNTRcdTMwMDJcIiwgW1xuICAgICAgeyBsYWJlbDogXCJcdTY1QjBcdTVFRkFcdThEQjNcdThGRjlcIiwgYWN0aW9uOiBhc3luYyAoKSA9PiB0aGlzLnBsdWdpbi5jcmVhdGVQbGFjZU5vdGUoKSB9XG4gICAgXSk7XG4gICAgdGhpcy5yZW5kZXJGb290cHJpbnRNb2R1bGUoc2hlbGwsIGRhdGEpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBuYXZpZ2F0ZVRvKHNjcmVlbjogRXhjbHVkZTxTaGVybG9ja1NjcmVlbiwgXCJlbnRyeVwiIHwgXCJjYXNlXCI+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5zY3JlZW4gPSBzY3JlZW47XG4gICAgdGhpcy5zZWxlY3RlZENhc2VQYXRoID0gdW5kZWZpbmVkO1xuICAgIGF3YWl0IHRoaXMucmVuZGVyQ3VycmVudFNjcmVlbigpO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVIb21lUG9ydGFsKFxuICAgIGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsXG4gICAgY29uZmlnOiB7XG4gICAgICBsYWJlbDogc3RyaW5nO1xuICAgICAgdGl0bGU6IHN0cmluZztcbiAgICAgIHRleHQ6IHN0cmluZztcbiAgICAgIGJ1dHRvbjogc3RyaW5nO1xuICAgICAgc2NyZWVuOiBFeGNsdWRlPFNoZXJsb2NrU2NyZWVuLCBcImVudHJ5XCIgfCBcImNhc2VcIiB8IFwiaG9tZVwiPjtcbiAgICAgIHRvbmU6IFwic3R1ZHlcIiB8IFwiYm9hcmRcIiB8IFwibWFwXCI7XG4gICAgfVxuICApOiB2b2lkIHtcbiAgICBjb25zdCBwb3J0YWwgPSBjb250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IGBzaGVybG9jay1ob21lLXBvcnRhbCAke2NvbmZpZy50b25lfWAgfSk7XG4gICAgcG9ydGFsLmNyZWF0ZUVsKFwic3BhblwiLCB7IGNsczogXCJzaGVybG9jay1zdGFnZS1sYWJlbFwiLCB0ZXh0OiBjb25maWcubGFiZWwgfSk7XG4gICAgcG9ydGFsLmNyZWF0ZUVsKFwic3Ryb25nXCIsIHsgdGV4dDogY29uZmlnLnRpdGxlIH0pO1xuICAgIHBvcnRhbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBjb25maWcudGV4dCB9KTtcbiAgICBwb3J0YWwuY3JlYXRlRWwoXCJiXCIsIHsgdGV4dDogY29uZmlnLmJ1dHRvbiB9KTtcbiAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQocG9ydGFsLCBcImNsaWNrXCIsIGFzeW5jICgpID0+IHRoaXMubmF2aWdhdGVUbyhjb25maWcuc2NyZWVuKSk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZURlc2tTaGVsbChleHRyYUNsYXNzOiBzdHJpbmcpOiBIVE1MRWxlbWVudCB7XG4gICAgY29uc3Qgc2hlbGwgPSB0aGlzLmNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IGBzaGVybG9jay1zaGVsbCBzaGVybG9jay1kZXNrLXNoZWxsICR7ZXh0cmFDbGFzc31gIH0pO1xuICAgIHNoZWxsLmRhdGFzZXQucGVyaW9kID0gdGhpcy5yZXNvbHZlUGVyaW9kKCk7XG4gICAgc2hlbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWF0bW9zcGhlcmUgc2hlcmxvY2stZm9nLWxheWVyXCIgfSk7XG4gICAgc2hlbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWF0bW9zcGhlcmUgc2hlcmxvY2stZ3JhaW4tbGF5ZXJcIiB9KTtcbiAgICByZXR1cm4gc2hlbGw7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckRlc2tIZWFkZXIoXG4gICAgc2hlbGw6IEhUTUxFbGVtZW50LFxuICAgIGtpY2tlcjogc3RyaW5nLFxuICAgIHRpdGxlOiBzdHJpbmcsXG4gICAgc3VidGl0bGU6IHN0cmluZyxcbiAgICBhY3Rpb25zOiBBcnJheTx7IGxhYmVsOiBzdHJpbmc7IGFjdGlvbjogKCkgPT4gUHJvbWlzZTx1bmtub3duPjsgc2Vjb25kYXJ5PzogYm9vbGVhbiB9PlxuICApOiB2b2lkIHtcbiAgICBjb25zdCBoZWFkZXIgPSBzaGVsbC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stZGVzay1oZWFkZXJcIiB9KTtcbiAgICBjb25zdCBiYWNrQnV0dG9uID0gaGVhZGVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLWljb24tYnV0dG9uXCIsIHRleHQ6IFwiXHUyMTkwXCIgfSk7XG4gICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KGJhY2tCdXR0b24sIFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4gdGhpcy5uYXZpZ2F0ZVRvKFwiaG9tZVwiKSk7XG4gICAgY29uc3QgY29weSA9IGhlYWRlci5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stZGVzay1oZWFkaW5nXCIgfSk7XG4gICAgY29weS5jcmVhdGVFbChcInNwYW5cIiwgeyBjbHM6IFwic2hlcmxvY2sta2lja2VyXCIsIHRleHQ6IGtpY2tlciB9KTtcbiAgICBjb3B5LmNyZWF0ZUVsKFwiaDFcIiwgeyB0ZXh0OiB0aXRsZSB9KTtcbiAgICBjb3B5LmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IHN1YnRpdGxlIH0pO1xuICAgIGNvbnN0IGFjdGlvbkdyb3VwID0gaGVhZGVyLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1hY3Rpb25zIHNoZXJsb2NrLWRlc2stYWN0aW9uc1wiIH0pO1xuICAgIGFjdGlvbnMuZm9yRWFjaCgoYWN0aW9uKSA9PiB7XG4gICAgICB0aGlzLmNyZWF0ZUFjdGlvbihhY3Rpb25Hcm91cCwgYWN0aW9uLmxhYmVsLCBhY3Rpb24uYWN0aW9uLCBhY3Rpb24uc2Vjb25kYXJ5KTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyQ2FzZUJvYXJkKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIGNhc2VzOiBTaGVybG9ja0Nhc2VbXSk6IHZvaWQge1xuICAgIGNvbnN0IGNhcmQgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLXBhbmVsIHNoZXJsb2NrLWNhcmQgZnVsbFwiIH0pO1xuICAgIGNvbnN0IGhlYWRlciA9IGNhcmQuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWNhcmQtaGVhZGluZ1wiIH0pO1xuICAgIGNvbnN0IHRpdGxlQmxvY2sgPSBoZWFkZXIuY3JlYXRlRGl2KCk7XG4gICAgdGl0bGVCbG9jay5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJcdTY4NDhcdTRFRjZcdTUzNzdcdTVCOTdcIiB9KTtcbiAgICB0aXRsZUJsb2NrLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IFwiXHU2MzA5XHU3MkI2XHU2MDAxXHU2NTc0XHU3NDA2XHU2MjQwXHU2NzA5XHU2ODQ4XHU0RUY2XHVGRjBDXHU3MEI5XHU1MUZCXHU4RkRCXHU1MTY1XHU2ODQ4XHU0RUY2XHU4QkU2XHU2MEM1XHU1REU1XHU0RjVDXHU1M0YwXHUzMDAyXCIgfSk7XG4gICAgY29uc3QgbmV3Q2FzZUJ1dHRvbiA9IGhlYWRlci5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzaGVybG9jay1taW5pLWJ1dHRvbiBzaGVybG9jay1taW5pLWJ1dHRvbi1zdHJvbmdcIiwgdGV4dDogXCJOZXcgQ2FzZVwiIH0pO1xuICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChuZXdDYXNlQnV0dG9uLCBcImNsaWNrXCIsIGFzeW5jICgpID0+IHRoaXMucGx1Z2luLmNyZWF0ZUNhc2VOb3RlKCkpO1xuICAgIGNvbnN0IGJvYXJkID0gY2FyZC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stYm9hcmRcIiB9KTtcblxuICAgIHRoaXMucmVuZGVyQ2FzZUNvbHVtbihib2FyZCwgXCJPcGVuXCIsIGNhc2VzLmZpbHRlcigoaXRlbSkgPT4gaXRlbS5zdGF0dXMgPT09IFwib3BlblwiKSk7XG4gICAgdGhpcy5yZW5kZXJDYXNlQ29sdW1uKGJvYXJkLCBcIkFjdGl2ZVwiLCBjYXNlcy5maWx0ZXIoKGl0ZW0pID0+IGl0ZW0uc3RhdHVzID09PSBcImFjdGl2ZVwiKSk7XG4gICAgdGhpcy5yZW5kZXJDYXNlQ29sdW1uKGJvYXJkLCBcIkFyY2hpdmVkXCIsIGNhc2VzLmZpbHRlcigoaXRlbSkgPT4gaXRlbS5zdGF0dXMgPT09IFwiYXJjaGl2ZWRcIikpO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJDYXNlQ29sdW1uKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIHRpdGxlOiBzdHJpbmcsIGl0ZW1zOiBTaGVybG9ja0Nhc2VbXSk6IHZvaWQge1xuICAgIGNvbnN0IGNvbHVtbiA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stYm9hcmQtY29sdW1uXCIgfSk7XG4gICAgY29uc3QgY29sdW1uSGVhZGVyID0gY29sdW1uLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1ib2FyZC1jb2x1bW4taGVhZGVyXCIgfSk7XG4gICAgY29sdW1uSGVhZGVyLmNyZWF0ZUVsKFwiaDRcIiwgeyB0ZXh0OiB0aXRsZSB9KTtcbiAgICBjb2x1bW5IZWFkZXIuY3JlYXRlRWwoXCJzcGFuXCIsIHsgdGV4dDogU3RyaW5nKGl0ZW1zLmxlbmd0aCkgfSk7XG4gICAgaWYgKGl0ZW1zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgY29sdW1uLmNyZWF0ZUVsKFwicFwiLCB7IGNsczogXCJzaGVybG9jay1lbXB0eVwiLCB0ZXh0OiBcIlx1NjY4Mlx1NjVFMFx1OEJCMFx1NUY1NVwiIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGxpc3QgPSBjb2x1bW4uY3JlYXRlRWwoXCJ1bFwiLCB7IGNsczogXCJzaGVybG9jay1saXN0XCIgfSk7XG4gICAgaXRlbXMuc2xpY2UoMCwgNCkuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgY29uc3Qgcm93ID0gbGlzdC5jcmVhdGVFbChcImxpXCIsIHsgY2xzOiBcInNoZXJsb2NrLWxpc3QtaXRlbSBzaGVybG9jay1jYXNlLXJvd1wiIH0pO1xuICAgICAgY29uc3QgYm9keSA9IHJvdy5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stbGlzdC1jb3B5XCIgfSk7XG4gICAgICBib2R5LmNyZWF0ZUVsKFwic3Ryb25nXCIsIHsgdGV4dDogaXRlbS5uYW1lIH0pO1xuICAgICAgY29uc3QgbGlua2VkVGFza3MgPSB0aGlzLnBsdWdpblRhc2tDb3VudChpdGVtLmZpbGVQYXRoKTtcbiAgICAgIGJvZHkuY3JlYXRlRWwoXCJzcGFuXCIsIHtcbiAgICAgICAgY2xzOiBcInNoZXJsb2NrLW1ldGFcIixcbiAgICAgICAgdGV4dDogaXRlbS5kZWFkbGluZSA/IGBcdTYyMkFcdTZCNjIgJHtpdGVtLmRlYWRsaW5lfWAgOiBpdGVtLmZpbGVQYXRoXG4gICAgICB9KTtcbiAgICAgIGJvZHkuY3JlYXRlRWwoXCJzcGFuXCIsIHtcbiAgICAgICAgY2xzOiBcInNoZXJsb2NrLW1ldGFcIixcbiAgICAgICAgdGV4dDogbGlua2VkVGFza3MgPiAwID8gYCR7bGlua2VkVGFza3N9IGxpbmtlZCB0YXNrJHtsaW5rZWRUYXNrcyA+IDEgPyBcInNcIiA6IFwiXCJ9YCA6IFwiTm8gbGlua2VkIHRhc2tzIHlldFwiXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHByb2dyZXNzID0gYm9keS5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stY2FzZS1wcm9ncmVzc1wiIH0pO1xuICAgICAgY29uc3QgcHJvZ3Jlc3NGaWxsID0gcHJvZ3Jlc3MuY3JlYXRlRGl2KCk7XG4gICAgICBwcm9ncmVzc0ZpbGwuc3R5bGUud2lkdGggPSBgJHt0aGlzLnJlc29sdmVDYXNlUHJvZ3Jlc3MoaXRlbS5maWxlUGF0aCl9JWA7XG4gICAgICBib2R5LmNyZWF0ZUVsKFwic3BhblwiLCB7IGNsczogXCJzaGVybG9jay1yb3ctYWZmb3JkYW5jZVwiLCB0ZXh0OiBcIkNsaWNrIHRvIG9wZW4gd29ya3NwYWNlXCIgfSk7XG4gICAgICBjb25zdCBzaWRlID0gcm93LmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1saXN0LWFjdGlvbnNcIiB9KTtcbiAgICAgIHNpZGUuY3JlYXRlRWwoXCJzcGFuXCIsIHsgY2xzOiBgc2hlcmxvY2stY2hpcCBwcmlvcml0eS0ke2l0ZW0ucHJpb3JpdHkgPz8gXCJtZWRpdW1cIn1gLCB0ZXh0OiB0aGlzLnJlbmRlclByaW9yaXR5TGFiZWwoaXRlbS5wcmlvcml0eSkgfSk7XG4gICAgICBjb25zdCBhY3Rpb24gPSBzaWRlLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1pbmktYnV0dG9uXCIsIHRleHQ6IFwiK1Rhc2tcIiB9KTtcbiAgICAgIGNvbnN0IGVkaXQgPSBzaWRlLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1pbmktYnV0dG9uXCIsIHRleHQ6IFwiXHU3RjE2XHU4RjkxXCIgfSk7XG4gICAgICBjb25zdCByZW1vdmUgPSBzaWRlLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1pbmktYnV0dG9uIGRhbmdlclwiLCB0ZXh0OiBcIlx1NTIyMFx1OTY2NFwiIH0pO1xuICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KGFjdGlvbiwgXCJjbGlja1wiLCBhc3luYyAoZXZlbnQ6IE1vdXNlRXZlbnQpID0+IHtcbiAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmNyZWF0ZVRhc2tGcm9tQ2FzZShpdGVtLmZpbGVQYXRoKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KGVkaXQsIFwiY2xpY2tcIiwgYXN5bmMgKGV2ZW50OiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5vcGVuUGF0aChpdGVtLmZpbGVQYXRoKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KHJlbW92ZSwgXCJjbGlja1wiLCBhc3luYyAoZXZlbnQ6IE1vdXNlRXZlbnQpID0+IHtcbiAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmRlbGV0ZVBhdGgoaXRlbS5maWxlUGF0aCk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChyb3csIFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4ge1xuICAgICAgICB0aGlzLnNlbGVjdGVkQ2FzZVBhdGggPSBpdGVtLmZpbGVQYXRoO1xuICAgICAgICB0aGlzLnNjcmVlbiA9IFwiY2FzZVwiO1xuICAgICAgICBhd2FpdCB0aGlzLnJlbmRlckN1cnJlbnRTY3JlZW4oKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KHJvdywgXCJkYmxjbGlja1wiLCBhc3luYyAoKSA9PiB0aGlzLnBsdWdpbi5vcGVuUGF0aChpdGVtLmZpbGVQYXRoKSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlbmRlckNhc2VXb3Jrc3BhY2UoY2FzZVBhdGg6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMucGx1Z2luLmRlYnVnTG9nKFwidmlldzpjYXNlOnJlbmRlcjpzdGFydFwiKTtcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgdGhpcy5wbHVnaW4uZ2V0V29ya3NwYWNlRGF0YSgpO1xuICAgIGNvbnN0IGN1cnJlbnRDYXNlID0gZGF0YS5jYXNlcy5maW5kKChpdGVtKSA9PiBpdGVtLmZpbGVQYXRoID09PSBjYXNlUGF0aCk7XG4gICAgaWYgKCFjdXJyZW50Q2FzZSkge1xuICAgICAgdGhpcy5zY3JlZW4gPSBcImNhc2VzXCI7XG4gICAgICBhd2FpdCB0aGlzLnJlbmRlckNhc2VEZXNrKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgY2FzZVRhc2tzID0gZGF0YS50YXNrcy5maWx0ZXIoKHRhc2spID0+IHRhc2suY2FzZVBhdGggPT09IGN1cnJlbnRDYXNlLmZpbGVQYXRoKTtcbiAgICBjb25zdCBjYXNlU2NoZWR1bGVzID0gZGF0YS5zY2hlZHVsZXMuZmlsdGVyKChzY2hlZHVsZSkgPT4ge1xuICAgICAgaWYgKCFzY2hlZHVsZS5yZWxhdGVkVGFza1BhdGgpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGNhc2VUYXNrcy5zb21lKCh0YXNrKSA9PiB0YXNrLmZpbGVQYXRoID09PSBzY2hlZHVsZS5yZWxhdGVkVGFza1BhdGgpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICBjb25zdCBzaGVsbCA9IHRoaXMuY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1zaGVsbCBzaGVybG9jay1jYXNlLXNoZWxsXCIgfSk7XG4gICAgc2hlbGwuZGF0YXNldC5wZXJpb2QgPSB0aGlzLnJlc29sdmVQZXJpb2QoKTtcbiAgICBzaGVsbC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stYXRtb3NwaGVyZSBzaGVybG9jay1mb2ctbGF5ZXJcIiB9KTtcbiAgICBzaGVsbC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stYXRtb3NwaGVyZSBzaGVybG9jay1ncmFpbi1sYXllclwiIH0pO1xuXG4gICAgY29uc3QgaGVhZGVyID0gc2hlbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWNhc2UtaGVhZGVyXCIgfSk7XG4gICAgY29uc3QgYmFja0J1dHRvbiA9IGhlYWRlci5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzaGVybG9jay1pY29uLWJ1dHRvblwiLCB0ZXh0OiBcIlx1MjE5MFwiIH0pO1xuICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChiYWNrQnV0dG9uLCBcImNsaWNrXCIsIGFzeW5jICgpID0+IHtcbiAgICAgIHRoaXMuc2NyZWVuID0gXCJjYXNlc1wiO1xuICAgICAgdGhpcy5zZWxlY3RlZENhc2VQYXRoID0gdW5kZWZpbmVkO1xuICAgICAgYXdhaXQgdGhpcy5yZW5kZXJDYXNlRGVzaygpO1xuICAgIH0pO1xuICAgIGNvbnN0IHRpdGxlQmxvY2sgPSBoZWFkZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWNhc2UtdGl0bGUtYmxvY2tcIiB9KTtcbiAgICB0aXRsZUJsb2NrLmNyZWF0ZUVsKFwic3BhblwiLCB7IGNsczogXCJzaGVybG9jay1raWNrZXJcIiwgdGV4dDogXCJDYXNlIFdvcmtzcGFjZVwiIH0pO1xuICAgIHRpdGxlQmxvY2suY3JlYXRlRWwoXCJoMVwiLCB7IHRleHQ6IGN1cnJlbnRDYXNlLm5hbWUgfSk7XG4gICAgdGl0bGVCbG9jay5jcmVhdGVFbChcInBcIiwge1xuICAgICAgdGV4dDogW2N1cnJlbnRDYXNlLnN0YXR1cywgY3VycmVudENhc2UucHJpb3JpdHkgPyBgJHtjdXJyZW50Q2FzZS5wcmlvcml0eX0gcHJpb3JpdHlgIDogdW5kZWZpbmVkLCBjdXJyZW50Q2FzZS5kZWFkbGluZSA/IGBkdWUgJHtjdXJyZW50Q2FzZS5kZWFkbGluZX1gIDogdW5kZWZpbmVkXVxuICAgICAgICAuZmlsdGVyKEJvb2xlYW4pXG4gICAgICAgIC5qb2luKFwiIC8gXCIpXG4gICAgfSk7XG4gICAgY29uc3QgYWN0aW9ucyA9IGhlYWRlci5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stY2FzZS1hY3Rpb25zXCIgfSk7XG4gICAgdGhpcy5jcmVhdGVBY3Rpb24oYWN0aW9ucywgXCJcdTY1QjBcdTVFRkFcdTdFQkZcdTdEMjJcdTRFRkJcdTUyQTFcIiwgYXN5bmMgKCkgPT4gdGhpcy5wbHVnaW4uY3JlYXRlVGFza0Zyb21DYXNlKGN1cnJlbnRDYXNlLmZpbGVQYXRoKSk7XG4gICAgdGhpcy5jcmVhdGVBY3Rpb24oYWN0aW9ucywgXCJcdTYyNTNcdTVGMDBcdTY4NDhcdTRFRjZcdTY1ODdcdTRFRjZcIiwgYXN5bmMgKCkgPT4gdGhpcy5wbHVnaW4ub3BlblBhdGgoY3VycmVudENhc2UuZmlsZVBhdGgpLCB0cnVlKTtcblxuICAgIGNvbnN0IGJvZHkgPSBzaGVsbC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stY2FzZS1ncmlkXCIgfSk7XG4gICAgdGhpcy5yZW5kZXJDYXNlT3ZlcnZpZXcoYm9keSwgY3VycmVudENhc2UsIGNhc2VUYXNrcywgY2FzZVNjaGVkdWxlcyk7XG4gICAgdGhpcy5yZW5kZXJDYXNlVGFza3MoYm9keSwgY3VycmVudENhc2UsIGNhc2VUYXNrcyk7XG4gICAgdGhpcy5yZW5kZXJDYXNlU2NoZWR1bGUoYm9keSwgY2FzZVNjaGVkdWxlcyk7XG4gICAgdGhpcy5yZW5kZXJDYXNlRXZpZGVuY2UoYm9keSwgY3VycmVudENhc2UpO1xuICAgIHRoaXMucmVuZGVyQ2FzZVRpbWVsaW5lKGJvZHksIGN1cnJlbnRDYXNlLCBjYXNlVGFza3MsIGNhc2VTY2hlZHVsZXMpO1xuICAgIHRoaXMucGx1Z2luLmRlYnVnTG9nKFwidmlldzpjYXNlOnJlbmRlcjpjb21wbGV0ZVwiKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyQ2FzZU92ZXJ2aWV3KGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIGN1cnJlbnRDYXNlOiBTaGVybG9ja0Nhc2UsIHRhc2tzOiBTaGVybG9ja1Rhc2tbXSwgc2NoZWR1bGVzOiBTaGVybG9ja1NjaGVkdWxlW10pOiB2b2lkIHtcbiAgICBjb25zdCBwYW5lbCA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stcGFuZWwgc2hlcmxvY2stY2FzZS1vdmVydmlld1wiIH0pO1xuICAgIHBhbmVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIlx1Njg0OFx1NjBDNVx1NEUyRFx1NjdBMlwiIH0pO1xuICAgIGNvbnN0IHN0YXRzID0gcGFuZWwuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLW1ldHJpYy1yb3dcIiB9KTtcbiAgICB0aGlzLmNyZWF0ZU1ldHJpYyhzdGF0cywgXCJcdTRFRkJcdTUyQTFcIiwgU3RyaW5nKHRhc2tzLmxlbmd0aCkpO1xuICAgIHRoaXMuY3JlYXRlTWV0cmljKHN0YXRzLCBcIlx1NURGMlx1NjM5Mlx1NjcxRlwiLCBTdHJpbmcoc2NoZWR1bGVzLmxlbmd0aCkpO1xuICAgIHRoaXMuY3JlYXRlTWV0cmljKHN0YXRzLCBcIlx1NzJCNlx1NjAwMVwiLCBjdXJyZW50Q2FzZS5zdGF0dXMpO1xuICAgIGNvbnN0IG5vdGVzID0gcGFuZWwuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWNhc2UtYnJpZWZcIiB9KTtcbiAgICBub3Rlcy5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIlx1Njg0OFx1NEVGNlx1NjU4N1x1NEVGNlx1MzAwMVx1NEVGQlx1NTJBMVx1N0VCRlx1N0QyMlx1MzAwMVx1OEMwM1x1NjdFNVx1NjM5Mlx1NjcxRlx1NTQ4Q1x1OEQ0NFx1NjU5OVx1NTE2NVx1NTNFM1x1NEYxQVx1NTcyOFx1OEZEOVx1OTFDQ1x1NkM0N1x1NTQwOFx1MzAwMlwiIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJDYXNlVGFza3MoY29udGFpbmVyOiBIVE1MRWxlbWVudCwgY3VycmVudENhc2U6IFNoZXJsb2NrQ2FzZSwgdGFza3M6IFNoZXJsb2NrVGFza1tdKTogdm9pZCB7XG4gICAgY29uc3QgcGFuZWwgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLXBhbmVsIHNoZXJsb2NrLWNhc2UtcGFuZWxcIiB9KTtcbiAgICBwYW5lbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJcdTdFQkZcdTdEMjJcdTRFRkJcdTUyQTFcIiB9KTtcbiAgICBjb25zdCBsaXN0ID0gcGFuZWwuY3JlYXRlRWwoXCJ1bFwiLCB7IGNsczogXCJzaGVybG9jay1saXN0XCIgfSk7XG4gICAgaWYgKHRhc2tzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgY29uc3Qgcm93ID0gbGlzdC5jcmVhdGVFbChcImxpXCIsIHsgY2xzOiBcInNoZXJsb2NrLWVtcHR5XCIgfSk7XG4gICAgICByb3cuc2V0VGV4dChcIlx1OEZEOVx1NEUyQVx1Njg0OFx1NEVGNlx1OEZEOFx1NkNBMVx1NjcwOVx1NEVGQlx1NTJBMVx1MzAwMlwiKTtcbiAgICAgIGNvbnN0IGJ1dHRvbiA9IHBhbmVsLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLWJ1dHRvblwiLCB0ZXh0OiBcIlx1NTIxQlx1NUVGQVx1N0IyQ1x1NEUwMFx1Njc2MVx1N0VCRlx1N0QyMlwiIH0pO1xuICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KGJ1dHRvbiwgXCJjbGlja1wiLCBhc3luYyAoKSA9PiB0aGlzLnBsdWdpbi5jcmVhdGVUYXNrRnJvbUNhc2UoY3VycmVudENhc2UuZmlsZVBhdGgpKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0YXNrcy5mb3JFYWNoKCh0YXNrKSA9PiB7XG4gICAgICBjb25zdCByb3cgPSBsaXN0LmNyZWF0ZUVsKFwibGlcIiwgeyBjbHM6IFwic2hlcmxvY2stbGlzdC1pdGVtXCIgfSk7XG4gICAgICBjb25zdCBib2R5ID0gcm93LmNyZWF0ZURpdigpO1xuICAgICAgYm9keS5jcmVhdGVFbChcInN0cm9uZ1wiLCB7IHRleHQ6IHRhc2submFtZSB9KTtcbiAgICAgIGJvZHkuY3JlYXRlRWwoXCJzcGFuXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1ldGFcIiwgdGV4dDogW3Rhc2suc3RhdHVzLCB0YXNrLnByaW9yaXR5LCB0YXNrLmR1ZV0uZmlsdGVyKEJvb2xlYW4pLmpvaW4oXCIgLyBcIikgfSk7XG4gICAgICBjb25zdCBzaWRlID0gcm93LmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1saXN0LWFjdGlvbnNcIiB9KTtcbiAgICAgIHNpZGUuY3JlYXRlRWwoXCJzcGFuXCIsIHsgY2xzOiBcInNoZXJsb2NrLWNoaXAgY29tcGFjdFwiLCB0ZXh0OiB0YXNrLnN0YXR1cyB9KTtcbiAgICAgIGNvbnN0IGVkaXQgPSBzaWRlLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1pbmktYnV0dG9uXCIsIHRleHQ6IFwiXHU3RjE2XHU4RjkxXCIgfSk7XG4gICAgICBjb25zdCByZW1vdmUgPSBzaWRlLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1pbmktYnV0dG9uIGRhbmdlclwiLCB0ZXh0OiBcIlx1NTIyMFx1OTY2NFwiIH0pO1xuICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KGVkaXQsIFwiY2xpY2tcIiwgYXN5bmMgKGV2ZW50OiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5vcGVuUGF0aCh0YXNrLmZpbGVQYXRoKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KHJlbW92ZSwgXCJjbGlja1wiLCBhc3luYyAoZXZlbnQ6IE1vdXNlRXZlbnQpID0+IHtcbiAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmRlbGV0ZVBhdGgodGFzay5maWxlUGF0aCk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChyb3csIFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4gdGhpcy5wbHVnaW4ub3BlblBhdGgodGFzay5maWxlUGF0aCkpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJDYXNlU2NoZWR1bGUoY29udGFpbmVyOiBIVE1MRWxlbWVudCwgc2NoZWR1bGVzOiBTaGVybG9ja1NjaGVkdWxlW10pOiB2b2lkIHtcbiAgICBjb25zdCBwYW5lbCA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stcGFuZWwgc2hlcmxvY2stY2FzZS1wYW5lbFwiIH0pO1xuICAgIHBhbmVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIlx1OEMwM1x1NjdFNVx1NjM5Mlx1NjcxRlwiIH0pO1xuICAgIGNvbnN0IGxpc3QgPSBwYW5lbC5jcmVhdGVFbChcInVsXCIsIHsgY2xzOiBcInNoZXJsb2NrLWxpc3RcIiB9KTtcbiAgICBpZiAoc2NoZWR1bGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgbGlzdC5jcmVhdGVFbChcImxpXCIsIHsgY2xzOiBcInNoZXJsb2NrLWVtcHR5XCIsIHRleHQ6IFwiXHU2NjgyXHU2NUUwXHU2MzkyXHU2NzFGXHUzMDAyXHU2MjhBXHU0RUZCXHU1MkExXHU2MkQ2XHU4RkRCXHU1NDY4XHU2NzdGXHU1NDBFXHVGRjBDXHU4RkQ5XHU5MUNDXHU0RjFBXHU4MUVBXHU1MkE4XHU1MUZBXHU3M0IwXHU1MTczXHU4MDU0XHU4QkIwXHU1RjU1XHUzMDAyXCIgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgc2NoZWR1bGVzLmZvckVhY2goKHNjaGVkdWxlKSA9PiB7XG4gICAgICBjb25zdCByb3cgPSBsaXN0LmNyZWF0ZUVsKFwibGlcIiwgeyBjbHM6IFwic2hlcmxvY2stbGlzdC1pdGVtXCIgfSk7XG4gICAgICBjb25zdCBib2R5ID0gcm93LmNyZWF0ZURpdigpO1xuICAgICAgYm9keS5jcmVhdGVFbChcInN0cm9uZ1wiLCB7IHRleHQ6IHNjaGVkdWxlLnJlbGF0ZWRUYXNrID8/IHNjaGVkdWxlLm5hbWUgfSk7XG4gICAgICBib2R5LmNyZWF0ZUVsKFwic3BhblwiLCB7IGNsczogXCJzaGVybG9jay1tZXRhXCIsIHRleHQ6IFtzY2hlZHVsZS5kYXksIHNjaGVkdWxlLnN0YXJ0ICYmIHNjaGVkdWxlLmVuZCA/IGAke3NjaGVkdWxlLnN0YXJ0fS0ke3NjaGVkdWxlLmVuZH1gIDogdW5kZWZpbmVkXS5maWx0ZXIoQm9vbGVhbikuam9pbihcIiAvIFwiKSB9KTtcbiAgICAgIGNvbnN0IHNpZGUgPSByb3cuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWxpc3QtYWN0aW9uc1wiIH0pO1xuICAgICAgY29uc3QgZWRpdCA9IHNpZGUuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwic2hlcmxvY2stbWluaS1idXR0b25cIiwgdGV4dDogXCJcdTdGMTZcdThGOTFcIiB9KTtcbiAgICAgIGNvbnN0IHJlbW92ZSA9IHNpZGUuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwic2hlcmxvY2stbWluaS1idXR0b24gZGFuZ2VyXCIsIHRleHQ6IFwiXHU1MjIwXHU5NjY0XCIgfSk7XG4gICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoZWRpdCwgXCJjbGlja1wiLCBhc3luYyAoZXZlbnQ6IE1vdXNlRXZlbnQpID0+IHtcbiAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLm9wZW5QYXRoKHNjaGVkdWxlLmZpbGVQYXRoKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KHJlbW92ZSwgXCJjbGlja1wiLCBhc3luYyAoZXZlbnQ6IE1vdXNlRXZlbnQpID0+IHtcbiAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmRlbGV0ZVBhdGgoc2NoZWR1bGUuZmlsZVBhdGgpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQocm93LCBcImNsaWNrXCIsIGFzeW5jICgpID0+IHRoaXMucGx1Z2luLm9wZW5QYXRoKHNjaGVkdWxlLmZpbGVQYXRoKSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckNhc2VFdmlkZW5jZShjb250YWluZXI6IEhUTUxFbGVtZW50LCBjdXJyZW50Q2FzZTogU2hlcmxvY2tDYXNlKTogdm9pZCB7XG4gICAgY29uc3QgcGFuZWwgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLXBhbmVsIHNoZXJsb2NrLWNhc2UtcGFuZWxcIiB9KTtcbiAgICBjb25zdCBoZWFkZXIgPSBwYW5lbC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stcGFuZWwtaGVhZGluZ1wiIH0pO1xuICAgIGhlYWRlci5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJcdThCQzFcdTcyNjlcdTY3RENcIiB9KTtcbiAgICBjb25zdCBhY3Rpb25zID0gaGVhZGVyLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1pbmxpbmUtYWN0aW9uc1wiIH0pO1xuICAgIGNvbnN0IGZvbGRlckJ1dHRvbiA9IGFjdGlvbnMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwic2hlcmxvY2stbWluaS1idXR0b25cIiwgdGV4dDogXCJcdTYyNTNcdTVGMDBcdThENDRcdTY1OTlcdTU5MzlcIiB9KTtcbiAgICBjb25zdCBldmlkZW5jZUJ1dHRvbiA9IGFjdGlvbnMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwic2hlcmxvY2stbWluaS1idXR0b25cIiwgdGV4dDogXCJcdTY1QjBcdTVFRkFcdThCQzFcdTcyNjlcIiB9KTtcbiAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoZm9sZGVyQnV0dG9uLCBcImNsaWNrXCIsIGFzeW5jICgpID0+IHRoaXMucGx1Z2luLnJldmVhbEV2aWRlbmNlRm9sZGVyRm9yQ2FzZShjdXJyZW50Q2FzZS5maWxlUGF0aCkpO1xuICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChldmlkZW5jZUJ1dHRvbiwgXCJjbGlja1wiLCBhc3luYyAoKSA9PiB0aGlzLnBsdWdpbi5jcmVhdGVFdmlkZW5jZUZyb21DYXNlKGN1cnJlbnRDYXNlLmZpbGVQYXRoKSk7XG5cbiAgICBjb25zdCBldmlkZW5jZSA9IHRoaXMuZmluZENhc2VFdmlkZW5jZShjdXJyZW50Q2FzZSk7XG4gICAgY29uc3QgY2FiaW5ldCA9IHBhbmVsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1ldmlkZW5jZS1jYWJpbmV0XCIgfSk7XG4gICAgW1xuICAgICAgeyBsYWJlbDogXCJNYXJrZG93blwiLCBraW5kOiBcIm1hcmtkb3duXCIgYXMgY29uc3QgfSxcbiAgICAgIHsgbGFiZWw6IFwiUERGXCIsIGtpbmQ6IFwicGRmXCIgYXMgY29uc3QgfSxcbiAgICAgIHsgbGFiZWw6IFwiSW1hZ2VzXCIsIGtpbmQ6IFwiaW1hZ2VcIiBhcyBjb25zdCB9LFxuICAgICAgeyBsYWJlbDogXCJMb2NhbCBmaWxlc1wiLCBraW5kOiBcImxvY2FsXCIgYXMgY29uc3QgfVxuICAgIF0uZm9yRWFjaCgoeyBsYWJlbCwga2luZCB9KSA9PiB7XG4gICAgICBjb25zdCBmaWxlcyA9IGV2aWRlbmNlLmZpbHRlcigoaXRlbSkgPT4gaXRlbS5raW5kID09PSBraW5kKTtcbiAgICAgIGNvbnN0IGl0ZW0gPSBjYWJpbmV0LmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1ldmlkZW5jZS1zbG90XCIgfSk7XG4gICAgICBpdGVtLmNyZWF0ZUVsKFwic3Ryb25nXCIsIHsgdGV4dDogbGFiZWwgfSk7XG4gICAgICBpdGVtLmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IGZpbGVzLmxlbmd0aCA+IDAgPyBgJHtmaWxlcy5sZW5ndGh9IGl0ZW0ke2ZpbGVzLmxlbmd0aCA+IDEgPyBcInNcIiA6IFwiXCJ9YCA6IFwiZW1wdHlcIiB9KTtcbiAgICAgIGNvbnN0IGxpc3QgPSBpdGVtLmNyZWF0ZUVsKFwidWxcIiwgeyBjbHM6IFwic2hlcmxvY2stZXZpZGVuY2UtbGlzdFwiIH0pO1xuICAgICAgZmlsZXMuc2xpY2UoMCwgMykuZm9yRWFjaCgoZXZpZGVuY2VJdGVtKSA9PiB7XG4gICAgICAgIGNvbnN0IHJvdyA9IGxpc3QuY3JlYXRlRWwoXCJsaVwiKTtcbiAgICAgICAgY29uc3QgbGluayA9IHJvdy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzaGVybG9jay1ldmlkZW5jZS1saW5rXCIsIHRleHQ6IGV2aWRlbmNlSXRlbS5maWxlLmJhc2VuYW1lIH0pO1xuICAgICAgICBjb25zdCByZW1vdmUgPSByb3cuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwic2hlcmxvY2stbWluaS1idXR0b24gZGFuZ2VyXCIsIHRleHQ6IFwiXHU1MjIwXHU5NjY0XCIgfSk7XG4gICAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChsaW5rLCBcImNsaWNrXCIsIGFzeW5jICgpID0+IHRoaXMucGx1Z2luLm9wZW5QYXRoKGV2aWRlbmNlSXRlbS5maWxlLnBhdGgpKTtcbiAgICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KHJlbW92ZSwgXCJjbGlja1wiLCBhc3luYyAoKSA9PiB0aGlzLnBsdWdpbi5kZWxldGVQYXRoKGV2aWRlbmNlSXRlbS5maWxlLnBhdGgpKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIGNvbnN0IGZvb3RlciA9IHBhbmVsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1mb290ZXJcIiB9KTtcbiAgICBmb290ZXIuY3JlYXRlRWwoXCJzcGFuXCIsIHtcbiAgICAgIHRleHQ6IGV2aWRlbmNlLmxlbmd0aCA+IDBcbiAgICAgICAgPyBgJHtldmlkZW5jZS5sZW5ndGh9IFx1NEVGRFx1OEQ0NFx1NjU5OVx1NURGMlx1NTE3M1x1ODA1NFx1NTIzMFx1NkI2NFx1Njg0OFx1NEVGNmBcbiAgICAgICAgOiBcIlx1NjI4QVx1OEQ0NFx1NjU5OVx1NjUzRVx1NTE2NSBFdmlkZW5jZSBcdTY1ODdcdTRFRjZcdTU5MzlcdUZGMENcdTYyMTZcdTY1QjBcdTVFRkFcdThCQzFcdTcyNjlcdTdCMTRcdThCQjBcdTVGMDBcdTU5Q0JcdTVGNTJcdTY4NjNcIlxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJDYXNlVGltZWxpbmUoY29udGFpbmVyOiBIVE1MRWxlbWVudCwgY3VycmVudENhc2U6IFNoZXJsb2NrQ2FzZSwgdGFza3M6IFNoZXJsb2NrVGFza1tdLCBzY2hlZHVsZXM6IFNoZXJsb2NrU2NoZWR1bGVbXSk6IHZvaWQge1xuICAgIGNvbnN0IHBhbmVsID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1wYW5lbCBzaGVybG9jay1jYXNlLXBhbmVsIHNoZXJsb2NrLWNhc2UtdGltZWxpbmUtcGFuZWxcIiB9KTtcbiAgICBwYW5lbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJcdTY4NDhcdTRFRjZcdTY1RjZcdTk1RjRcdTdFQkZcIiB9KTtcbiAgICBjb25zdCB0aW1lbGluZSA9IHBhbmVsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay10aW1lbGluZVwiIH0pO1xuICAgIGNvbnN0IGV2ZW50cyA9IFtcbiAgICAgIHsgbGFiZWw6IFwiXHU2ODQ4XHU0RUY2XHU1MjFCXHU1RUZBXCIsIHZhbHVlOiBjdXJyZW50Q2FzZS5jcmVhdGVkID8/IFwidW5rbm93blwiIH0sXG4gICAgICAuLi50YXNrcy5zbGljZSgwLCA0KS5tYXAoKHRhc2spID0+ICh7IGxhYmVsOiBgXHU0RUZCXHU1MkExOiAke3Rhc2submFtZX1gLCB2YWx1ZTogdGFzay51cGRhdGVkID8/IHRhc2suY3JlYXRlZCA/PyB0YXNrLnN0YXR1cyB9KSksXG4gICAgICAuLi5zY2hlZHVsZXMuc2xpY2UoMCwgNCkubWFwKChzY2hlZHVsZSkgPT4gKHsgbGFiZWw6IGBcdTYzOTJcdTY3MUY6ICR7c2NoZWR1bGUucmVsYXRlZFRhc2sgPz8gc2NoZWR1bGUubmFtZX1gLCB2YWx1ZTogW3NjaGVkdWxlLmRheSwgc2NoZWR1bGUuc3RhcnRdLmZpbHRlcihCb29sZWFuKS5qb2luKFwiIFwiKSB9KSlcbiAgICBdO1xuXG4gICAgZXZlbnRzLmZvckVhY2goKGV2ZW50KSA9PiB7XG4gICAgICBjb25zdCByb3cgPSB0aW1lbGluZS5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stdGltZWxpbmUtcm93XCIgfSk7XG4gICAgICByb3cuY3JlYXRlU3Bhbih7IGNsczogXCJzaGVybG9jay10aW1lbGluZS1kb3RcIiB9KTtcbiAgICAgIGNvbnN0IGNvcHkgPSByb3cuY3JlYXRlRGl2KCk7XG4gICAgICBjb3B5LmNyZWF0ZUVsKFwic3Ryb25nXCIsIHsgdGV4dDogZXZlbnQubGFiZWwgfSk7XG4gICAgICBjb3B5LmNyZWF0ZUVsKFwic3BhblwiLCB7IGNsczogXCJzaGVybG9jay1tZXRhXCIsIHRleHQ6IGV2ZW50LnZhbHVlIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJSZWFkaW5nTW9kdWxlKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIGRhdGE6IFNoZXJsb2NrV29ya3NwYWNlRGF0YSk6IHZvaWQge1xuICAgIGNvbnN0IHJlYWRpbmdJdGVtcyA9IGRhdGEuY29sbGVjdGlvbnMuZmlsdGVyKChpdGVtKSA9PiBpdGVtLnN0YXR1cyAhPT0gXCJmaW5pc2hlZFwiKTtcbiAgICBjb25zdCBjYXJkID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1wYW5lbCBzaGVybG9jay1jYXJkIHdpZGVcIiB9KTtcbiAgICBjb25zdCBoZWFkZXIgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1wYW5lbC1oZWFkaW5nXCIgfSk7XG4gICAgaGVhZGVyLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIlx1OEJDMVx1NzI2OVx1NzgxNFx1OEJGQlwiIH0pO1xuICAgIGNvbnN0IGFkZEJ1dHRvbiA9IGhlYWRlci5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzaGVybG9jay1taW5pLWJ1dHRvblwiLCB0ZXh0OiBcIlx1NjVCMFx1NUVGQVx1NzgxNFx1OEJGQlx1Njc2MVx1NzZFRVwiIH0pO1xuICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChhZGRCdXR0b24sIFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4gdGhpcy5wbHVnaW4uY3JlYXRlQ29sbGVjdGlvbk5vdGUoKSk7XG4gICAgY2FyZC5jcmVhdGVFbChcInBcIiwge1xuICAgICAgY2xzOiBcInNoZXJsb2NrLW1pbmktY29weVwiLFxuICAgICAgdGV4dDogXCJcdThGRDlcdTkxQ0NcdTY1M0VcdTZCNjNcdTU3MjhcdThCRkJcdTMwMDFcdTZCNjNcdTU3MjhcdTc3MEJcdTMwMDFcdTZCNjNcdTU3MjhcdTc4MTRcdTdBNzZcdTc2ODRcdTUxODVcdTVCQjlcdTMwMDJcdTZCQ0ZcdTY3NjFcdTkwRkRcdTgwRkRcdTk2OEZcdTY1RjZcdTg4NjVcdTdCMTRcdThCQjBcdUZGMUJcdTc4NkVcdThCQTRcdThCRkJcdTVCOENcdTU0MEVcdUZGMENcdTUxOERcdTVGNTJcdTUxNjVcdTY4NjNcdTY4NDhcdTY3RENcdTMwMDJcIlxuICAgIH0pO1xuICAgIGNvbnN0IGxpc3QgPSBjYXJkLmNyZWF0ZUVsKFwidWxcIiwgeyBjbHM6IFwic2hlcmxvY2stbGlzdFwiIH0pO1xuICAgIGlmIChyZWFkaW5nSXRlbXMubGVuZ3RoID09PSAwKSB7XG4gICAgICBsaXN0LmNyZWF0ZUVsKFwibGlcIiwgeyBjbHM6IFwic2hlcmxvY2stZW1wdHlcIiwgdGV4dDogXCJcdThGRDhcdTZDQTFcdTY3MDlcdTZCNjNcdTU3MjhcdTc4MTRcdThCRkJcdTc2ODRcdTY3NjFcdTc2RUVcdTMwMDJcdTUzRUZcdTRFRTVcdTRFQ0VcdTRFNjZcdTdDNERcdTMwMDFcdTc1MzVcdTVGNzFcdTMwMDFcdTY1ODdcdTdBRTBcdTYyMTZcdTRFMTNcdThGOTFcdTVGMDBcdTU5Q0JcdTMwMDJcIiB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmVhZGluZ0l0ZW1zLnNsaWNlKDAsIDEwKS5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICBjb25zdCByb3cgPSBsaXN0LmNyZWF0ZUVsKFwibGlcIiwgeyBjbHM6IFwic2hlcmxvY2stbGlzdC1pdGVtXCIgfSk7XG4gICAgICBjb25zdCBjb3B5ID0gcm93LmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1saXN0LWNvcHlcIiB9KTtcbiAgICAgIGNvcHkuY3JlYXRlRWwoXCJzdHJvbmdcIiwgeyB0ZXh0OiBpdGVtLm5hbWUgfSk7XG4gICAgICBjb3B5LmNyZWF0ZUVsKFwic3BhblwiLCB7IGNsczogXCJzaGVybG9jay1tZXRhXCIsIHRleHQ6IFtpdGVtLm1lZGl1bSA/PyBcImNvbGxlY3Rpb25cIiwgaXRlbS5zdGF0dXMgPz8gXCJxdWV1ZWRcIl0uam9pbihcIiAvIFwiKSB9KTtcbiAgICAgIGNvbnN0IHNpZGUgPSByb3cuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWxpc3QtYWN0aW9uc1wiIH0pO1xuICAgICAgc2lkZS5jcmVhdGVFbChcInNwYW5cIiwgeyBjbHM6IFwic2hlcmxvY2stY2hpcCBjb21wYWN0XCIsIHRleHQ6IGl0ZW0ubWVkaXVtID8/IFwiaXRlbVwiIH0pO1xuICAgICAgY29uc3QgYXJjaGl2ZSA9IHNpZGUuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwic2hlcmxvY2stbWluaS1idXR0b25cIiwgdGV4dDogXCJcdTVGNTJcdTUxNjVcdThCQzFcdTcyNjlcdTY3RENcIiB9KTtcbiAgICAgIGNvbnN0IGVkaXQgPSBzaWRlLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1pbmktYnV0dG9uXCIsIHRleHQ6IFwiXHU4ODY1XHU3QjE0XHU4QkIwXCIgfSk7XG4gICAgICBjb25zdCByZW1vdmUgPSBzaWRlLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1pbmktYnV0dG9uIGRhbmdlclwiLCB0ZXh0OiBcIlx1NTIyMFx1OTY2NFwiIH0pO1xuICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KGFyY2hpdmUsIFwiY2xpY2tcIiwgYXN5bmMgKGV2ZW50OiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5hcmNoaXZlQ29sbGVjdGlvbkFzRXZpZGVuY2UoaXRlbS5maWxlUGF0aCk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChlZGl0LCBcImNsaWNrXCIsIGFzeW5jIChldmVudDogTW91c2VFdmVudCkgPT4ge1xuICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4ub3BlblBhdGgoaXRlbS5maWxlUGF0aCk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChyZW1vdmUsIFwiY2xpY2tcIiwgYXN5bmMgKGV2ZW50OiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5kZWxldGVQYXRoKGl0ZW0uZmlsZVBhdGgpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQocm93LCBcImNsaWNrXCIsIGFzeW5jICgpID0+IHRoaXMucGx1Z2luLm9wZW5QYXRoKGl0ZW0uZmlsZVBhdGgpKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyQXJjaGl2ZU1vZHVsZShjb250YWluZXI6IEhUTUxFbGVtZW50LCBkYXRhOiBTaGVybG9ja1dvcmtzcGFjZURhdGEpOiB2b2lkIHtcbiAgICBjb25zdCBjYXJkID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1wYW5lbCBzaGVybG9jay1jYXJkIHdpZGVcIiB9KTtcbiAgICBjb25zdCBoZWFkZXIgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1wYW5lbC1oZWFkaW5nXCIgfSk7XG4gICAgaGVhZGVyLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIlx1Njg2M1x1Njg0OFx1NjdEQ1wiIH0pO1xuICAgIGNvbnN0IGFkZEJ1dHRvbiA9IGhlYWRlci5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzaGVybG9jay1taW5pLWJ1dHRvblwiLCB0ZXh0OiBcIlx1NjVCMFx1NUVGQVx1OEJDMVx1NzI2OVwiIH0pO1xuICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChhZGRCdXR0b24sIFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4gdGhpcy5wbHVnaW4uY3JlYXRlRXZpZGVuY2VOb3RlKCkpO1xuICAgIGNvbnN0IGNhYmluZXQgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1hcmNoaXZlLWdyaWRcIiB9KTtcbiAgICB0aGlzLmNyZWF0ZUFyY2hpdmVTdGF0KGNhYmluZXQsIFwiTWFya2Rvd25cIiwgZGF0YS5ldmlkZW5jZS5maWx0ZXIoKGl0ZW0pID0+IGl0ZW0uZmlsZVBhdGguZW5kc1dpdGgoXCIubWRcIikpLmxlbmd0aCk7XG4gICAgdGhpcy5jcmVhdGVBcmNoaXZlU3RhdChjYWJpbmV0LCBcIlBERiAvIFx1NTZGRVx1NzI0N1wiLCB0aGlzLmNvdW50VmF1bHRGaWxlcyhbXCJwZGZcIiwgXCJwbmdcIiwgXCJqcGdcIiwgXCJqcGVnXCIsIFwid2VicFwiXSkpO1xuICAgIHRoaXMuY3JlYXRlQXJjaGl2ZVN0YXQoY2FiaW5ldCwgXCJcdTY4NDhcdTRFRjZcdTUxNzNcdTgwNTRcIiwgZGF0YS5ldmlkZW5jZS5maWx0ZXIoKGl0ZW0pID0+IGl0ZW0uY2FzZVBhdGgpLmxlbmd0aCk7XG4gICAgY2FyZC5jcmVhdGVFbChcInBcIiwge1xuICAgICAgY2xzOiBcInNoZXJsb2NrLW1pbmktY29weVwiLFxuICAgICAgdGV4dDogXCJcdThGRDlcdTkxQ0NcdTY2M0VcdTc5M0FcdTVERjJcdTdFQ0ZcdTZDODlcdTZEQzBcdThGREJcdThCQzFcdTcyNjlcdTY3RENcdTc2ODRcdTY3NjFcdTc2RUVcdUZGMUJcdTZCQ0ZcdTRFMDBcdTY3NjFcdTkwRkRcdTY2MkYgVmF1bHQgXHU0RTJEXHU3NzFGXHU1QjlFIE1hcmtkb3duIFx1NjU4N1x1NEVGNlx1RkYwQ1x1NTNFRlx1OTY4Rlx1NjVGNlx1N0VFN1x1N0VFRFx1N0YxNlx1OEY5MVx1NjIxNlx1NTIyMFx1OTY2NFx1MzAwMlwiXG4gICAgfSk7XG4gICAgY29uc3QgbGlzdCA9IGNhcmQuY3JlYXRlRWwoXCJ1bFwiLCB7IGNsczogXCJzaGVybG9jay1saXN0IHNoZXJsb2NrLWFyY2hpdmUtbGlzdFwiIH0pO1xuICAgIGlmIChkYXRhLmV2aWRlbmNlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgbGlzdC5jcmVhdGVFbChcImxpXCIsIHsgY2xzOiBcInNoZXJsb2NrLWVtcHR5XCIsIHRleHQ6IFwiXHU4QkMxXHU3MjY5XHU2N0RDXHU4RkQ4XHU2NjJGXHU3QTdBXHU3Njg0XHUzMDAyXHU1M0VGXHU0RUU1XHU0RUNFXHU4QkMxXHU3MjY5XHU3ODE0XHU4QkZCXHU0RTJEXHU1RjUyXHU2ODYzXHVGRjBDXHU0RTVGXHU1M0VGXHU0RUU1XHU3NkY0XHU2M0E1XHU2NUIwXHU1RUZBXHU4QkMxXHU3MjY5XHUzMDAyXCIgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGRhdGEuZXZpZGVuY2Uuc2xpY2UoMCwgMTApLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgIGNvbnN0IHJvdyA9IGxpc3QuY3JlYXRlRWwoXCJsaVwiLCB7IGNsczogXCJzaGVybG9jay1saXN0LWl0ZW1cIiB9KTtcbiAgICAgIGNvbnN0IGNvcHkgPSByb3cuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWxpc3QtY29weVwiIH0pO1xuICAgICAgY29weS5jcmVhdGVFbChcInN0cm9uZ1wiLCB7IHRleHQ6IGl0ZW0ubmFtZSB9KTtcbiAgICAgIGNvcHkuY3JlYXRlRWwoXCJzcGFuXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1ldGFcIiwgdGV4dDogW2l0ZW0uY2FzZSA/IGBcdTY4NDhcdTRFRjY6ICR7aXRlbS5jYXNlfWAgOiB1bmRlZmluZWQsIGl0ZW0uc291cmNlID8gYFx1Njc2NVx1NkU5MDogJHtpdGVtLnNvdXJjZX1gIDogdW5kZWZpbmVkXS5maWx0ZXIoQm9vbGVhbikuam9pbihcIiAvIFwiKSB8fCBpdGVtLmZpbGVQYXRoIH0pO1xuICAgICAgY29uc3Qgc2lkZSA9IHJvdy5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stbGlzdC1hY3Rpb25zXCIgfSk7XG4gICAgICBjb25zdCBlZGl0ID0gc2lkZS5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzaGVybG9jay1taW5pLWJ1dHRvblwiLCB0ZXh0OiBcIlx1N0YxNlx1OEY5MVwiIH0pO1xuICAgICAgY29uc3QgcmVtb3ZlID0gc2lkZS5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzaGVybG9jay1taW5pLWJ1dHRvbiBkYW5nZXJcIiwgdGV4dDogXCJcdTUyMjBcdTk2NjRcIiB9KTtcbiAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChlZGl0LCBcImNsaWNrXCIsIGFzeW5jIChldmVudDogTW91c2VFdmVudCkgPT4ge1xuICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4ub3BlblBhdGgoaXRlbS5maWxlUGF0aCk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChyZW1vdmUsIFwiY2xpY2tcIiwgYXN5bmMgKGV2ZW50OiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5kZWxldGVQYXRoKGl0ZW0uZmlsZVBhdGgpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQocm93LCBcImNsaWNrXCIsIGFzeW5jICgpID0+IHRoaXMucGx1Z2luLm9wZW5QYXRoKGl0ZW0uZmlsZVBhdGgpKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyRm9vdHByaW50TW9kdWxlKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIGRhdGE6IFNoZXJsb2NrV29ya3NwYWNlRGF0YSk6IHZvaWQge1xuICAgIGNvbnN0IGNhcmQgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWZvb3RwcmludC1wYW5lbFwiIH0pO1xuICAgIGNvbnN0IGhlYWRlciA9IGNhcmQuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLXBhbmVsLWhlYWRpbmdcIiB9KTtcbiAgICBoZWFkZXIuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiXHU4REIzXHU4RkY5XHU1NzMwXHU1NkZFXCIgfSk7XG4gICAgY29uc3QgYWRkQnV0dG9uID0gaGVhZGVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1pbmktYnV0dG9uXCIsIHRleHQ6IFwiXHU2NUIwXHU1RUZBXHU4REIzXHU4RkY5XCIgfSk7XG4gICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KGFkZEJ1dHRvbiwgXCJjbGlja1wiLCBhc3luYyAoKSA9PiB0aGlzLnBsdWdpbi5jcmVhdGVQbGFjZU5vdGUoKSk7XG4gICAgY29uc3QgbWFwID0gY2FyZC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stZm9vdHByaW50LW1hcFwiIH0pO1xuICAgIG1hcC5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2UgPSBgbGluZWFyLWdyYWRpZW50KDE4MGRlZywgcmdiYSg0NywgMjUsIDksIDAuMSksIHJnYmEoNDcsIDI1LCA5LCAwLjIyKSksIHVybChcIiR7dGhpcy5wbHVnaW4uZ2V0V29ybGRNYXBJbWFnZVVybCgpfVwiKSwgbGluZWFyLWdyYWRpZW50KDEzNWRlZywgI2IzOGE1MiwgI2Q1Yjc3OCA0MiUsICM5YzZjMzUpYDtcbiAgICBjb25zdCBwbGFjZXMgPSBkYXRhLnBsYWNlc1xuICAgICAgLmZpbHRlcigocGxhY2UpID0+IHR5cGVvZiBwbGFjZS5sYXRpdHVkZSA9PT0gXCJudW1iZXJcIiAmJiB0eXBlb2YgcGxhY2UubG9uZ2l0dWRlID09PSBcIm51bWJlclwiKVxuICAgICAgLnNsaWNlKDAsIDgwKTtcbiAgICBpZiAocGxhY2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgbWFwLmNyZWF0ZUVsKFwicFwiLCB7IGNsczogXCJzaGVybG9jay1lbXB0eSBzaGVybG9jay1tYXAtZW1wdHlcIiwgdGV4dDogXCJcdThGRDhcdTZDQTFcdTY3MDlcdThEQjNcdThGRjlcdTMwMDJcdTY1QjBcdTVFRkFcdTRFMDBcdTZCMjFcdTUyMzBcdThCQkZcdThCQjBcdTVGNTVcdTU0MEVcdUZGMENcdTU3MzBcdTU2RkVcdTRGMUFcdTRFQUVcdThENzdcdTdCMkNcdTRFMDBcdTRFMkFcdTU3NTBcdTY4MDdcdTMwMDJcIiB9KTtcbiAgICB9XG4gICAgcGxhY2VzLmZvckVhY2goKHBsYWNlKSA9PiB7XG4gICAgICBjb25zdCBwb3NpdGlvbiA9IHRoaXMucmVzb2x2ZU1hcFBvaW50KHBsYWNlKTtcbiAgICAgIGNvbnN0IGxhYmVsID0gW3BsYWNlLmNpdHkgPz8gcGxhY2UubmFtZSwgcGxhY2UuY291bnRyeSwgcGxhY2UudmlzaXRlZEF0XS5maWx0ZXIoQm9vbGVhbikuam9pbihcIiAvIFwiKTtcbiAgICAgIGNvbnN0IHBvaW50ID0gbWFwLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1hcC1wb2ludFwiLCB0ZXh0OiBcIlx1MjcxM1wiIH0pO1xuICAgICAgcG9pbnQuc3R5bGUubGVmdCA9IGAke3Bvc2l0aW9uLngudG9GaXhlZCgyKX0lYDtcbiAgICAgIHBvaW50LnN0eWxlLnRvcCA9IGAke3Bvc2l0aW9uLnkudG9GaXhlZCgyKX0lYDtcbiAgICAgIHBvaW50LnNldEF0dHJpYnV0ZShcImFyaWEtbGFiZWxcIiwgbGFiZWwgfHwgcGxhY2UubmFtZSk7XG4gICAgICBwb2ludC5zZXRBdHRyaWJ1dGUoXCJ0aXRsZVwiLCBbcGxhY2UuY2l0eSwgcGxhY2UuY291bnRyeSwgcGxhY2UudmlzaXRlZEF0XS5maWx0ZXIoQm9vbGVhbikuam9pbihcIiAvIFwiKSB8fCBwbGFjZS5uYW1lKTtcbiAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChwb2ludCwgXCJjbGlja1wiLCBhc3luYyAoKSA9PiB0aGlzLnBsdWdpbi5vcGVuUGF0aChwbGFjZS5maWxlUGF0aCkpO1xuICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KHBvaW50LCBcImNvbnRleHRtZW51XCIsIGFzeW5jIChldmVudDogTW91c2VFdmVudCkgPT4ge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5kZWxldGVQYXRoKHBsYWNlLmZpbGVQYXRoKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJJbnZlc3RpZ2F0aW9uU2NoZWR1bGVyKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIGRhdGE6IFNoZXJsb2NrV29ya3NwYWNlRGF0YSk6IHZvaWQge1xuICAgIGNvbnN0IGNhcmQgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLXBhbmVsIHNoZXJsb2NrLWNhcmQgZnVsbFwiIH0pO1xuICAgIGNhcmQuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiXHU4QzAzXHU2N0U1XHU2MzkyXHU2NzFGXCIgfSk7XG4gICAgY2FyZC5jcmVhdGVFbChcInBcIiwge1xuICAgICAgY2xzOiBcInNoZXJsb2NrLXN1YnRpdGxlIHNoZXJsb2NrLW1pbmktY29weVwiLFxuICAgICAgdGV4dDogXCJcdTYyRDZcdTUyQThcdTVERTZcdTRGQTdcdTRFRkJcdTUyQTFcdTUyMzBcdTY1RjZcdTk1RjRcdTY4M0NcdTUzNzNcdTUzRUZcdTYzOTJcdTUxNjVcdTY3MkNcdTU0NjhcdThDMDNcdTY3RTVcdUZGMUJcdTUzQ0NcdTUxRkJcdTRFRkJcdTYxMEZcdTY1RjZcdTk1RjRcdTY4M0NcdTRGMUFcdTVGRUJcdTkwMUZcdTY1QjBcdTVFRkFcdTRFMDBcdTY3NjFcdTY1RTVcdTdBMEJcdTg4NjhcdThCQjBcdTVGNTVcdTMwMDJcdTYzOTJcdThGREJcdTUzQkJcdTU0MEVcdTUzRUZcdTRFRTVcdTk2OEZcdTY1RjZcdTYyOEFcdTRFRkJcdTUyQTFcdTU3NTdcdTY1M0VcdTk1N0ZcdTMwMDFcdTY1M0VcdTc3RURcdTMwMDJcIlxuICAgIH0pO1xuXG4gICAgY29uc3QgcGxhbm5lciA9IGNhcmQuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLXBsYW5uZXJcIiB9KTtcbiAgICBjb25zdCBiYWNrbG9nID0gcGxhbm5lci5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stcGxhbm5lci1iYWNrbG9nXCIgfSk7XG4gICAgYmFja2xvZy5jcmVhdGVFbChcImg0XCIsIHsgdGV4dDogXCJcdTVGODVcdTVCODlcdTYzOTJcdTRFRkJcdTUyQTFcIiB9KTtcblxuICAgIGNvbnN0IGJhY2tsb2dMaXN0ID0gYmFja2xvZy5jcmVhdGVFbChcInVsXCIsIHsgY2xzOiBcInNoZXJsb2NrLWxpc3RcIiB9KTtcbiAgICBjb25zdCBiYWNrbG9nVGFza3MgPSBkYXRhLnRhc2tzLmZpbHRlcigoaXRlbSkgPT4gaXRlbS5zdGF0dXMgIT09IFwiZG9uZVwiKTtcbiAgICBpZiAoYmFja2xvZ1Rhc2tzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgYmFja2xvZ0xpc3QuY3JlYXRlRWwoXCJsaVwiLCB7IGNsczogXCJzaGVybG9jay1lbXB0eVwiLCB0ZXh0OiBcIlx1NjI0MFx1NjcwOVx1NEU4Qlx1OTg3OVx1OTBGRFx1NTkwNFx1NzQwNlx1NUI4Q1x1NEU4Nlx1RkYwQ1x1NjIxNlx1ODAwNVx1NTE0OFx1NjVCMFx1NUVGQVx1NEUwMFx1Njc2MVx1NEVGQlx1NTJBMVx1MzAwMlwiIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBiYWNrbG9nVGFza3Muc2xpY2UoMCwgOCkuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgICBjb25zdCByb3cgPSBiYWNrbG9nTGlzdC5jcmVhdGVFbChcImxpXCIsIHsgY2xzOiBcInNoZXJsb2NrLWxpc3QtaXRlbSBzaGVybG9jay1kcmFnZ2FibGUtdGFza1wiIH0pO1xuICAgICAgICByb3cuc2V0QXR0cmlidXRlKFwiZHJhZ2dhYmxlXCIsIFwidHJ1ZVwiKTtcbiAgICAgICAgcm93LmNyZWF0ZUVsKFwic3Ryb25nXCIsIHsgdGV4dDogaXRlbS5uYW1lIH0pO1xuICAgICAgICByb3cuY3JlYXRlRWwoXCJzcGFuXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1ldGFcIiwgdGV4dDogaXRlbS5zdGF0dXMgPT09IFwic2NoZWR1bGVkXCIgPyBcIlx1NURGMlx1NjM5Mlx1NTE2NVx1NTQ2OFx1Njc3Rlx1RkYwQ1x1NTNFRlx1NTE4RFx1NkIyMVx1NjJENlx1NTJBOFx1NjUzOVx1Njg2M1x1NjcxRlwiIDogXCJcdTYyRDZcdTUyQThcdTUyMzBcdTUzRjNcdTRGQTdcdTY1RjZcdTk1RjRcdTY4M0NcIiB9KTtcbiAgICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KHJvdywgXCJkcmFnc3RhcnRcIiwgKGV2ZW50OiBEcmFnRXZlbnQpID0+IHtcbiAgICAgICAgICBldmVudC5kYXRhVHJhbnNmZXI/LnNldERhdGEoXCJ0ZXh0L3BsYWluXCIsIGl0ZW0uZmlsZVBhdGgpO1xuICAgICAgICAgIGV2ZW50LmRhdGFUcmFuc2Zlcj8uc2V0RGF0YShcImFwcGxpY2F0aW9uL3NoZXJsb2NrLXRhc2tcIiwgaXRlbS5maWxlUGF0aCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQocm93LCBcImRibGNsaWNrXCIsIGFzeW5jICgpID0+IHRoaXMucGx1Z2luLm9wZW5QYXRoKGl0ZW0uZmlsZVBhdGgpKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IGJvYXJkID0gcGxhbm5lci5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2std2Vlay1ib2FyZFwiIH0pO1xuICAgIGNvbnN0IGhlYWRlciA9IGJvYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay13ZWVrLWhlYWRlclwiIH0pO1xuICAgIGhlYWRlci5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stY29ybmVyLWNlbGxcIiB9KTtcbiAgICBXRUVLX0RBWVMuZm9yRWFjaCgoZGF5KSA9PiB7XG4gICAgICBjb25zdCBkYXRlID0gdGhpcy5yZXNvbHZlV2Vla0RhdGUoZGF5Lm9mZnNldCk7XG4gICAgICBjb25zdCBjZWxsID0gaGVhZGVyLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1kYXktaGVhZGVyXCIgfSk7XG4gICAgICBjZWxsLmNyZWF0ZUVsKFwic3Ryb25nXCIsIHsgdGV4dDogZGF5LmxhYmVsIH0pO1xuICAgICAgY2VsbC5jcmVhdGVFbChcInNwYW5cIiwgeyBjbHM6IFwic2hlcmxvY2stbWV0YVwiLCB0ZXh0OiBkYXRlIH0pO1xuICAgIH0pO1xuXG4gICAgY29uc3Qgc2NoZWR1bGVJbmRleCA9IHRoaXMuaW5kZXhTY2hlZHVsZXMoZGF0YS5zY2hlZHVsZXMpO1xuXG4gICAgVElNRV9TTE9UUy5mb3JFYWNoKChzbG90KSA9PiB7XG4gICAgICBjb25zdCByb3cgPSBib2FyZC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2std2Vlay1yb3dcIiB9KTtcbiAgICAgIHJvdy5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stdGltZS1sYWJlbFwiLCB0ZXh0OiBzbG90IH0pO1xuXG4gICAgICBXRUVLX0RBWVMuZm9yRWFjaCgoZGF5KSA9PiB7XG4gICAgICAgIGNvbnN0IGRhdGUgPSB0aGlzLnJlc29sdmVXZWVrRGF0ZShkYXkub2Zmc2V0KTtcbiAgICAgICAgY29uc3Qga2V5ID0gYCR7ZGF0ZX18JHtzbG90fWA7XG4gICAgICAgIGNvbnN0IGNlbGwgPSByb3cuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWRyb3AtY2VsbFwiIH0pO1xuICAgICAgICBjb25zdCBlbnRyaWVzID0gc2NoZWR1bGVJbmRleC5nZXQoa2V5KSA/PyBbXTtcbiAgICAgICAgaWYgKGVudHJpZXMubGVuZ3RoID4gMSkge1xuICAgICAgICAgIGNlbGwuYWRkQ2xhc3MoXCJoYXMtY29uZmxpY3RcIik7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoY2VsbCwgXCJkcmFnb3ZlclwiLCAoZXZlbnQ6IERyYWdFdmVudCkgPT4ge1xuICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgY2VsbC5hZGRDbGFzcyhcImlzLWRyYWdvdmVyXCIpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KGNlbGwsIFwiZHJhZ2xlYXZlXCIsICgpID0+IHtcbiAgICAgICAgICBjZWxsLnJlbW92ZUNsYXNzKFwiaXMtZHJhZ292ZXJcIik7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoY2VsbCwgXCJkcm9wXCIsIGFzeW5jIChldmVudDogRHJhZ0V2ZW50KSA9PiB7XG4gICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBjZWxsLnJlbW92ZUNsYXNzKFwiaXMtZHJhZ292ZXJcIik7XG4gICAgICAgICAgY29uc3Qgc2NoZWR1bGVQYXRoID0gZXZlbnQuZGF0YVRyYW5zZmVyPy5nZXREYXRhKFwiYXBwbGljYXRpb24vc2hlcmxvY2stc2NoZWR1bGVcIik7XG4gICAgICAgICAgaWYgKHNjaGVkdWxlUGF0aCkge1xuICAgICAgICAgICAgY29uc3Qgc2NoZWR1bGUgPSBkYXRhLnNjaGVkdWxlcy5maW5kKChpdGVtKSA9PiBpdGVtLmZpbGVQYXRoID09PSBzY2hlZHVsZVBhdGgpO1xuICAgICAgICAgICAgY29uc3QgZHVyYXRpb24gPSBzY2hlZHVsZT8uZHVyYXRpb25NaW51dGVzID8/IHRoaXMucmVzb2x2ZVNjaGVkdWxlRHVyYXRpb24odW5kZWZpbmVkKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLm1vdmVTY2hlZHVsZUVudHJ5KHNjaGVkdWxlUGF0aCwgZGF0ZSwgc2xvdCwgdGhpcy5yZXNvbHZlU2NoZWR1bGVFbmQoc2xvdCwgZHVyYXRpb24pKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgdGFza1BhdGggPVxuICAgICAgICAgICAgZXZlbnQuZGF0YVRyYW5zZmVyPy5nZXREYXRhKFwiYXBwbGljYXRpb24vc2hlcmxvY2stdGFza1wiKSB8fFxuICAgICAgICAgICAgZXZlbnQuZGF0YVRyYW5zZmVyPy5nZXREYXRhKFwidGV4dC9wbGFpblwiKTtcbiAgICAgICAgICBpZiAoIXRhc2tQYXRoKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNjaGVkdWxlVGFza0Zyb21EYXNoYm9hcmQodGFza1BhdGgsIGRhdGUsIHNsb3QsIHRoaXMucmVzb2x2ZVNjaGVkdWxlRW5kKHNsb3QsIERFRkFVTFRfU0NIRURVTEVfRFVSQVRJT05fTUlOVVRFUykpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KGNlbGwsIFwiZGJsY2xpY2tcIiwgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmNyZWF0ZVF1aWNrU2NoZWR1bGUoZGF0ZSwgc2xvdCwgdGhpcy5yZXNvbHZlU2NoZWR1bGVFbmQoc2xvdCwgREVGQVVMVF9TQ0hFRFVMRV9EVVJBVElPTl9NSU5VVEVTKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChlbnRyaWVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIGNlbGwuY3JlYXRlRWwoXCJzcGFuXCIsIHsgY2xzOiBcInNoZXJsb2NrLXNsb3QtaGludFwiLCB0ZXh0OiBcIkRvdWJsZS1jbGljayBvciBkcm9wIHRhc2tcIiB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoZW50cmllcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICBjb25zdCBjb25mbGljdEJhciA9IGNlbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWNvbmZsaWN0LWJhclwiIH0pO1xuICAgICAgICAgICAgY29uc3Qgd2FybmluZyA9IGNvbmZsaWN0QmFyLmNyZWF0ZUVsKFwic3BhblwiLCB7XG4gICAgICAgICAgICAgIGNsczogXCJzaGVybG9jay1jb25mbGljdC1oaW50XCIsXG4gICAgICAgICAgICAgIHRleHQ6IGAke2VudHJpZXMubGVuZ3RofSBpdGVtcyBvdmVybGFwYFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB3YXJuaW5nLnNldEF0dHJpYnV0ZShcInRpdGxlXCIsIFwiXHU4RkQ5XHU0RTJBXHU2NUY2XHU5NUY0XHU2ODNDXHU2NzA5XHU1OTFBXHU2NzYxXHU1Qjg5XHU2MzkyXHVGRjBDXHU0RTBCXHU0RTAwXHU2QjY1XHU1M0VGXHU0RUU1XHU1MkEwXHU1MTY1XHU1MUIyXHU3QTgxXHU4OUUzXHU1MUIzXHU5MDNCXHU4RjkxXHUzMDAyXCIpO1xuICAgICAgICAgICAgY29uc3QgcmVzb2x2ZUJ1dHRvbiA9IGNvbmZsaWN0QmFyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcbiAgICAgICAgICAgICAgY2xzOiBcInNoZXJsb2NrLW1pbmktYnV0dG9uXCIsXG4gICAgICAgICAgICAgIHRleHQ6IFwiXHU5ODdBXHU1RUY2XHU0RTAwXHU2NzYxXCJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KHJlc29sdmVCdXR0b24sIFwiY2xpY2tcIiwgYXN5bmMgKGV2ZW50OiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICBjb25zdCBtb3ZhYmxlID0gZW50cmllc1tlbnRyaWVzLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5tb3ZlU2NoZWR1bGVUb05leHRGcmVlU2xvdChtb3ZhYmxlLmZpbGVQYXRoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbnRyaWVzLmZvckVhY2goKGVudHJ5KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBwaWxsID0gY2VsbC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stc2NoZWR1bGUtcGlsbFwiIH0pO1xuICAgICAgICAgICAgcGlsbC5zZXRBdHRyaWJ1dGUoXCJkcmFnZ2FibGVcIiwgXCJ0cnVlXCIpO1xuICAgICAgICAgICAgcGlsbC5zdHlsZS5taW5IZWlnaHQgPSBgJHt0aGlzLnJlc29sdmVTY2hlZHVsZVBpbGxIZWlnaHQoZW50cnkuZHVyYXRpb25NaW51dGVzKX1weGA7XG4gICAgICAgICAgICBjb25zdCB0b3AgPSBwaWxsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1waWxsLXRvcFwiIH0pO1xuICAgICAgICAgICAgdG9wLmNyZWF0ZUVsKFwic3Ryb25nXCIsIHsgdGV4dDogZW50cnkucmVsYXRlZFRhc2sgPz8gZW50cnkubmFtZSB9KTtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRyb2xzID0gdG9wLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1waWxsLWNvbnRyb2xzXCIgfSk7XG4gICAgICAgICAgICBjb25zdCBzaHJpbmtCdXR0b24gPSBjb250cm9scy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzaGVybG9jay1taW5pLWJ1dHRvblwiLCB0ZXh0OiBcIi0zMG1cIiB9KTtcbiAgICAgICAgICAgIGNvbnN0IGV4dGVuZEJ1dHRvbiA9IGNvbnRyb2xzLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1pbmktYnV0dG9uXCIsIHRleHQ6IFwiKzMwbVwiIH0pO1xuICAgICAgICAgICAgY29uc3QgZGVsZXRlQnV0dG9uID0gY29udHJvbHMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwic2hlcmxvY2stbWluaS1idXR0b24gZGFuZ2VyXCIsIHRleHQ6IFwiXHU1MjIwXHU5NjY0XCIgfSk7XG4gICAgICAgICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoc2hyaW5rQnV0dG9uLCBcImNsaWNrXCIsIGFzeW5jIChldmVudDogTW91c2VFdmVudCkgPT4ge1xuICAgICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uYWRqdXN0U2NoZWR1bGVEdXJhdGlvbihlbnRyeS5maWxlUGF0aCwgLTMwKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KGV4dGVuZEJ1dHRvbiwgXCJjbGlja1wiLCBhc3luYyAoZXZlbnQ6IE1vdXNlRXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmFkanVzdFNjaGVkdWxlRHVyYXRpb24oZW50cnkuZmlsZVBhdGgsIDMwKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KGRlbGV0ZUJ1dHRvbiwgXCJjbGlja1wiLCBhc3luYyAoZXZlbnQ6IE1vdXNlRXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmRlbGV0ZVBhdGgoZW50cnkuZmlsZVBhdGgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBwaWxsLmNyZWF0ZUVsKFwic3BhblwiLCB7XG4gICAgICAgICAgICAgIGNsczogXCJzaGVybG9jay1tZXRhXCIsXG4gICAgICAgICAgICAgIHRleHQ6IGAke2VudHJ5LnN0YXJ0ID8/IHNsb3R9LSR7ZW50cnkuZW5kID8/IHRoaXMucmVzb2x2ZVNjaGVkdWxlRW5kKHNsb3QsIHRoaXMucmVzb2x2ZVNjaGVkdWxlRHVyYXRpb24oZW50cnkuZHVyYXRpb25NaW51dGVzKSl9JHtlbnRyeS5kdXJhdGlvbk1pbnV0ZXMgPyBgIC8gJHtlbnRyeS5kdXJhdGlvbk1pbnV0ZXN9bWAgOiBcIlwifWBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKGVudHJ5LnJlbGF0ZWRUYXNrUGF0aCkge1xuICAgICAgICAgICAgICBwaWxsLmNyZWF0ZUVsKFwic3BhblwiLCB7IGNsczogXCJzaGVybG9jay1tZXRhXCIsIHRleHQ6IFwiTGlua2VkIHRhc2tcIiB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChwaWxsLCBcImRyYWdzdGFydFwiLCAoZXZlbnQ6IERyYWdFdmVudCkgPT4ge1xuICAgICAgICAgICAgICBldmVudC5kYXRhVHJhbnNmZXI/LnNldERhdGEoXCJhcHBsaWNhdGlvbi9zaGVybG9jay1zY2hlZHVsZVwiLCBlbnRyeS5maWxlUGF0aCk7XG4gICAgICAgICAgICAgIGV2ZW50LmRhdGFUcmFuc2Zlcj8uc2V0RGF0YShcInRleHQvcGxhaW5cIiwgZW50cnkuZmlsZVBhdGgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQocGlsbCwgXCJjbGlja1wiLCBhc3luYyAoKSA9PiB0aGlzLnBsdWdpbi5vcGVuUGF0aChlbnRyeS5maWxlUGF0aCkpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlTWV0cmljKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIGxhYmVsOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBjb25zdCBtZXRyaWMgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLW1ldHJpY1wiIH0pO1xuICAgIG1ldHJpYy5jcmVhdGVFbChcImRpdlwiLCB7IGNsczogXCJzaGVybG9jay1tZXRyaWMtbGFiZWxcIiwgdGV4dDogbGFiZWwgfSk7XG4gICAgbWV0cmljLmNyZWF0ZUVsKFwiZGl2XCIsIHsgY2xzOiBcInNoZXJsb2NrLW1ldHJpYy12YWx1ZVwiLCB0ZXh0OiB2YWx1ZSB9KTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlQXJjaGl2ZVN0YXQoY29udGFpbmVyOiBIVE1MRWxlbWVudCwgbGFiZWw6IHN0cmluZywgdmFsdWU6IG51bWJlcik6IHZvaWQge1xuICAgIGNvbnN0IHN0YXQgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWFyY2hpdmUtc3RhdFwiIH0pO1xuICAgIHN0YXQuY3JlYXRlRWwoXCJzdHJvbmdcIiwgeyB0ZXh0OiBTdHJpbmcodmFsdWUpIH0pO1xuICAgIHN0YXQuY3JlYXRlRWwoXCJzcGFuXCIsIHsgdGV4dDogbGFiZWwgfSk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZUFjdGlvbihjb250YWluZXI6IEhUTUxFbGVtZW50LCBsYWJlbDogc3RyaW5nLCBvbkNsaWNrOiAoKSA9PiBQcm9taXNlPHVua25vd24+LCBzZWNvbmRhcnkgPSBmYWxzZSk6IHZvaWQge1xuICAgIGNvbnN0IGJ1dHRvbiA9IGNvbnRhaW5lci5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogYHNoZXJsb2NrLWJ1dHRvbiR7c2Vjb25kYXJ5ID8gXCIgc2Vjb25kYXJ5XCIgOiBcIlwifWAsIHRleHQ6IGxhYmVsIH0pO1xuICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChidXR0b24sIFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgb25DbGljaygpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgICAgIG5ldyBOb3RpY2UoYFNoZXJsb2NrIE9TIFx1NjRDRFx1NEY1Q1x1NTkzMVx1OEQyNTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFwiXHU2NzJBXHU3N0U1XHU5NTE5XHU4QkVGXCJ9YCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVXZWVrRGF0ZShvZmZzZXQ6IG51bWJlcik6IHN0cmluZyB7XG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgICBjb25zdCBkYXkgPSBub3cuZ2V0RGF5KCk7XG4gICAgY29uc3QgbW9uZGF5RGVsdGEgPSBkYXkgPT09IDAgPyAtNiA6IDEgLSBkYXk7XG4gICAgY29uc3QgdGFyZ2V0ID0gbmV3IERhdGUobm93KTtcbiAgICB0YXJnZXQuc2V0RGF0ZShub3cuZ2V0RGF0ZSgpICsgbW9uZGF5RGVsdGEgKyBvZmZzZXQpO1xuICAgIHJldHVybiB0aGlzLmZvcm1hdExvY2FsRGF0ZSh0YXJnZXQpO1xuICB9XG5cbiAgcHJpdmF0ZSByZXNvbHZlU2NoZWR1bGVEdXJhdGlvbihkdXJhdGlvbk1pbnV0ZXM/OiBudW1iZXIpOiBudW1iZXIge1xuICAgIHJldHVybiBNYXRoLm1heCgzMCwgTWF0aC5taW4oMjQwLCBkdXJhdGlvbk1pbnV0ZXMgPz8gREVGQVVMVF9TQ0hFRFVMRV9EVVJBVElPTl9NSU5VVEVTKSk7XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVTY2hlZHVsZUVuZChzdGFydDogc3RyaW5nLCBkdXJhdGlvbk1pbnV0ZXM/OiBudW1iZXIpOiBzdHJpbmcge1xuICAgIGNvbnN0IGR1cmF0aW9uID0gdGhpcy5yZXNvbHZlU2NoZWR1bGVEdXJhdGlvbihkdXJhdGlvbk1pbnV0ZXMpO1xuICAgIGNvbnN0IFtob3VyLCBtaW51dGVdID0gc3RhcnQuc3BsaXQoXCI6XCIpLm1hcChOdW1iZXIpO1xuICAgIGNvbnN0IGVuZE1pbnV0ZXMgPSBNYXRoLm1pbihob3VyICogNjAgKyBtaW51dGUgKyBkdXJhdGlvbiwgMjMgKiA2MCArIDMwKTtcbiAgICBjb25zdCBlbmRIb3VyID0gTWF0aC5mbG9vcihlbmRNaW51dGVzIC8gNjApO1xuICAgIGNvbnN0IGVuZE1pbnV0ZSA9IGVuZE1pbnV0ZXMgJSA2MDtcbiAgICByZXR1cm4gYCR7U3RyaW5nKGVuZEhvdXIpLnBhZFN0YXJ0KDIsIFwiMFwiKX06JHtTdHJpbmcoZW5kTWludXRlKS5wYWRTdGFydCgyLCBcIjBcIil9YDtcbiAgfVxuXG4gIHByaXZhdGUgcmVzb2x2ZVNjaGVkdWxlUGlsbEhlaWdodChkdXJhdGlvbk1pbnV0ZXM/OiBudW1iZXIpOiBudW1iZXIge1xuICAgIGNvbnN0IHN0ZXBzID0gdGhpcy5yZXNvbHZlU2NoZWR1bGVEdXJhdGlvbihkdXJhdGlvbk1pbnV0ZXMpIC8gMzA7XG4gICAgcmV0dXJuIDQ0ICsgc3RlcHMgKiAyNjtcbiAgfVxuXG4gIHByaXZhdGUgcmVzb2x2ZU1hcFBvaW50KHBsYWNlOiBTaGVybG9ja1BsYWNlKTogeyB4OiBudW1iZXI7IHk6IG51bWJlciB9IHtcbiAgICBjb25zdCBsYXRpdHVkZSA9IHBsYWNlLmxhdGl0dWRlID8/IDA7XG4gICAgY29uc3QgbG9uZ2l0dWRlID0gcGxhY2UubG9uZ2l0dWRlID8/IE1BUF9DRU5URVJfTE9OR0lUVURFO1xuICAgIC8vIEJhY2stZW5kIHByb2plY3Rpb24gY29udHJhY3Q6IHNpZ25lZCBsb25naXR1ZGUgdXNlcyBlYXN0IHBvc2l0aXZlIGFuZCB3ZXN0IG5lZ2F0aXZlO1xuICAgIC8vIHNpZ25lZCBsYXRpdHVkZSB1c2VzIG5vcnRoIHBvc2l0aXZlIGFuZCBzb3V0aCBuZWdhdGl2ZS4gVGhlIG1hcCBpcyBjZW50ZXJlZCBvbiBDaGluYS5cbiAgICBjb25zdCB3cmFwcGVkTG9uZ2l0dWRlID0gKChsb25naXR1ZGUgLSBNQVBfQ0VOVEVSX0xPTkdJVFVERSArIDU0MCkgJSAzNjApIC0gMTgwO1xuICAgIGNvbnN0IHggPSAoKHdyYXBwZWRMb25naXR1ZGUgKyAxODApIC8gMzYwKSAqIDEwMDtcbiAgICBjb25zdCB5ID0gKCg5MCAtIGxhdGl0dWRlKSAvIDE4MCkgKiAxMDA7XG4gICAgcmV0dXJuIHtcbiAgICAgIHg6IE1hdGgubWF4KDQsIE1hdGgubWluKDk2LCB4KSksXG4gICAgICB5OiBNYXRoLm1heCg4LCBNYXRoLm1pbig5MiwgeSkpXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgaW5kZXhTY2hlZHVsZXMoaXRlbXM6IFNoZXJsb2NrU2NoZWR1bGVbXSk6IE1hcDxzdHJpbmcsIFNoZXJsb2NrU2NoZWR1bGVbXT4ge1xuICAgIGNvbnN0IGluZGV4ID0gbmV3IE1hcDxzdHJpbmcsIFNoZXJsb2NrU2NoZWR1bGVbXT4oKTtcbiAgICBpdGVtcy5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICBpZiAoIWl0ZW0uZGF5IHx8ICFpdGVtLnN0YXJ0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGtleSA9IGAke2l0ZW0uZGF5fXwke2l0ZW0uc3RhcnR9YDtcbiAgICAgIGNvbnN0IGV4aXN0aW5nID0gaW5kZXguZ2V0KGtleSkgPz8gW107XG4gICAgICBleGlzdGluZy5wdXNoKGl0ZW0pO1xuICAgICAgaW5kZXguc2V0KGtleSwgZXhpc3RpbmcpO1xuICAgIH0pO1xuICAgIHJldHVybiBpbmRleDtcbiAgfVxuXG4gIHByaXZhdGUgcGx1Z2luVGFza0NvdW50KGNhc2VQYXRoOiBzdHJpbmcpOiBudW1iZXIge1xuICAgIGNvbnN0IHBsdWdpbiA9IHRoaXMucGx1Z2luO1xuICAgIGNvbnN0IGNhY2hlZCA9IChwbHVnaW4gYXMgU2hlcmxvY2tPU1BsdWdpbiAmIHtcbiAgICAgIGxhdGVzdFdvcmtzcGFjZURhdGE/OiBTaGVybG9ja1dvcmtzcGFjZURhdGE7XG4gICAgfSkubGF0ZXN0V29ya3NwYWNlRGF0YTtcbiAgICBpZiAoIWNhY2hlZCkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIHJldHVybiBjYWNoZWQudGFza3MuZmlsdGVyKCh0YXNrKSA9PiB0YXNrLmNhc2VQYXRoID09PSBjYXNlUGF0aCkubGVuZ3RoO1xuICB9XG5cbiAgcHJpdmF0ZSByZXNvbHZlQ2FzZVByb2dyZXNzKGNhc2VQYXRoOiBzdHJpbmcpOiBudW1iZXIge1xuICAgIGNvbnN0IGNhY2hlZCA9ICh0aGlzLnBsdWdpbiBhcyBTaGVybG9ja09TUGx1Z2luICYge1xuICAgICAgbGF0ZXN0V29ya3NwYWNlRGF0YT86IFNoZXJsb2NrV29ya3NwYWNlRGF0YTtcbiAgICB9KS5sYXRlc3RXb3Jrc3BhY2VEYXRhO1xuICAgIGlmICghY2FjaGVkKSB7XG4gICAgICByZXR1cm4gNjtcbiAgICB9XG4gICAgY29uc3QgbGlua2VkID0gY2FjaGVkLnRhc2tzLmZpbHRlcigodGFzaykgPT4gdGFzay5jYXNlUGF0aCA9PT0gY2FzZVBhdGgpO1xuICAgIGlmIChsaW5rZWQubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gNjtcbiAgICB9XG4gICAgY29uc3QgZG9uZSA9IGxpbmtlZC5maWx0ZXIoKHRhc2spID0+IHRhc2suc3RhdHVzID09PSBcImRvbmVcIikubGVuZ3RoO1xuICAgIHJldHVybiBNYXRoLm1heCgxMiwgTWF0aC5yb3VuZCgoZG9uZSAvIGxpbmtlZC5sZW5ndGgpICogMTAwKSk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlclByaW9yaXR5TGFiZWwocHJpb3JpdHk/OiBcImxvd1wiIHwgXCJtZWRpdW1cIiB8IFwiaGlnaFwiKTogc3RyaW5nIHtcbiAgICBpZiAocHJpb3JpdHkgPT09IFwiaGlnaFwiKSB7XG4gICAgICByZXR1cm4gXCJIXCI7XG4gICAgfVxuICAgIGlmIChwcmlvcml0eSA9PT0gXCJsb3dcIikge1xuICAgICAgcmV0dXJuIFwiTFwiO1xuICAgIH1cbiAgICByZXR1cm4gXCJNXCI7XG4gIH1cblxuICBwcml2YXRlIGNvdW50VmF1bHRGaWxlcyhleHRlbnNpb25zOiBzdHJpbmdbXSk6IG51bWJlciB7XG4gICAgY29uc3Qgbm9ybWFsaXplZCA9IG5ldyBTZXQoZXh0ZW5zaW9ucy5tYXAoKGl0ZW0pID0+IGl0ZW0udG9Mb3dlckNhc2UoKSkpO1xuICAgIHJldHVybiB0aGlzLmFwcC52YXVsdC5nZXRGaWxlcygpLmZpbHRlcigoZmlsZSkgPT4gbm9ybWFsaXplZC5oYXMoZmlsZS5leHRlbnNpb24udG9Mb3dlckNhc2UoKSkpLmxlbmd0aDtcbiAgfVxuXG4gIHByaXZhdGUgZm9ybWF0TG9jYWxEYXRlKGRhdGU6IERhdGUpOiBzdHJpbmcge1xuICAgIGNvbnN0IHllYXIgPSBkYXRlLmdldEZ1bGxZZWFyKCk7XG4gICAgY29uc3QgbW9udGggPSBTdHJpbmcoZGF0ZS5nZXRNb250aCgpICsgMSkucGFkU3RhcnQoMiwgXCIwXCIpO1xuICAgIGNvbnN0IGRheSA9IFN0cmluZyhkYXRlLmdldERhdGUoKSkucGFkU3RhcnQoMiwgXCIwXCIpO1xuICAgIHJldHVybiBgJHt5ZWFyfS0ke21vbnRofS0ke2RheX1gO1xuICB9XG5cbiAgcHJpdmF0ZSByZXNvbHZlUGVyaW9kKCk6IFwiZGF5XCIgfCBcIm5pZ2h0XCIge1xuICAgIGNvbnN0IGhvdXIgPSBuZXcgRGF0ZSgpLmdldEhvdXJzKCk7XG4gICAgcmV0dXJuIGhvdXIgPj0gNyAmJiBob3VyIDwgMTggPyBcImRheVwiIDogXCJuaWdodFwiO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVQYXJsb3JCYWNrZHJvcChzaGVsbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICBjb25zdCBiYWNrZHJvcCA9IHNoZWxsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1wYXJsb3ItYmFja2Ryb3BcIiB9KTtcbiAgICBiYWNrZHJvcC5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2UgPSBgdXJsKFwiJHt0aGlzLnBsdWdpbi5nZXRQYXJsb3JJbWFnZVVybCgpfVwiKWA7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckZhbGxiYWNrKGVycm9yOiB1bmtub3duKTogdm9pZCB7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICB0aGlzLmNvbnRlbnRFbC5hZGRDbGFzcyhcInNoZXJsb2NrLW9zLXZpZXdcIik7XG4gICAgY29uc3QgcGFuZWwgPSB0aGlzLmNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stcGFuZWxcIiB9KTtcbiAgICBwYW5lbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJTaGVybG9jayBPUyBcdTY2ODJcdTY1RjZcdTY3MkFcdTgwRkRcdTZFMzJcdTY3RDNcIiB9KTtcbiAgICBwYW5lbC5jcmVhdGVFbChcInBcIiwge1xuICAgICAgdGV4dDogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBcIlVua25vd24gcmVuZGVyIGVycm9yXCJcbiAgICB9KTtcbiAgICBwYW5lbC5jcmVhdGVFbChcInBcIiwge1xuICAgICAgdGV4dDogXCJcdThDMDNcdThCRDVcdTY1RTVcdTVGRDdcdTVERjJcdTUxOTlcdTUxNjUgL3RtcC9zaGVybG9jay1vcy1kZWJ1Zy5sb2dcIlxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBmaW5kQ2FzZUV2aWRlbmNlKGN1cnJlbnRDYXNlOiBTaGVybG9ja0Nhc2UpOiBTaGVybG9ja0V2aWRlbmNlSXRlbVtdIHtcbiAgICBjb25zdCBldmlkZW5jZVJvb3QgPSBgJHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmlkZW5jZUZvbGRlci5yZXBsYWNlKC9cXC8kLywgXCJcIil9L2A7XG4gICAgY29uc3QgY2FzZVRva2VucyA9IFtcbiAgICAgIGN1cnJlbnRDYXNlLm5hbWUsXG4gICAgICBjdXJyZW50Q2FzZS5maWxlUGF0aCxcbiAgICAgIGN1cnJlbnRDYXNlLmZpbGVQYXRoLnNwbGl0KFwiL1wiKS5wb3AoKT8ucmVwbGFjZSgvXFwubWQkL2ksIFwiXCIpXG4gICAgXVxuICAgICAgLmZpbHRlcigodmFsdWUpOiB2YWx1ZSBpcyBzdHJpbmcgPT4gQm9vbGVhbih2YWx1ZSkpXG4gICAgICAubWFwKCh2YWx1ZSkgPT4gdGhpcy5ub3JtYWxpemVFdmlkZW5jZVRva2VuKHZhbHVlKSk7XG5cbiAgICByZXR1cm4gdGhpcy5hcHAudmF1bHQuZ2V0RmlsZXMoKVxuICAgICAgLmZpbHRlcigoZmlsZSkgPT4gZmlsZS5wYXRoLnN0YXJ0c1dpdGgoZXZpZGVuY2VSb290KSlcbiAgICAgIC5maWx0ZXIoKGZpbGUpID0+IHtcbiAgICAgICAgY29uc3QgY2FjaGUgPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKTtcbiAgICAgICAgY29uc3QgZnJvbnRtYXR0ZXIgPSBjYWNoZT8uZnJvbnRtYXR0ZXI7XG4gICAgICAgIGlmIChmcm9udG1hdHRlcj8uY2FzZVBhdGggPT09IGN1cnJlbnRDYXNlLmZpbGVQYXRoIHx8IGZyb250bWF0dGVyPy5jYXNlID09PSBjdXJyZW50Q2FzZS5uYW1lKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgbm9ybWFsaXplZFBhdGggPSB0aGlzLm5vcm1hbGl6ZUV2aWRlbmNlVG9rZW4oZmlsZS5wYXRoKTtcbiAgICAgICAgcmV0dXJuIGNhc2VUb2tlbnMuc29tZSgodG9rZW4pID0+IHRva2VuLmxlbmd0aCA+IDAgJiYgbm9ybWFsaXplZFBhdGguaW5jbHVkZXModG9rZW4pKTtcbiAgICAgIH0pXG4gICAgICAubWFwKChmaWxlKSA9PiAoeyBmaWxlLCBraW5kOiB0aGlzLnJlc29sdmVFdmlkZW5jZUtpbmQoZmlsZS5leHRlbnNpb24pIH0pKVxuICAgICAgLnNvcnQoKGEsIGIpID0+IGEuZmlsZS5iYXNlbmFtZS5sb2NhbGVDb21wYXJlKGIuZmlsZS5iYXNlbmFtZSkpO1xuICB9XG5cbiAgcHJpdmF0ZSByZXNvbHZlRXZpZGVuY2VLaW5kKGV4dGVuc2lvbjogc3RyaW5nKTogU2hlcmxvY2tFdmlkZW5jZUtpbmQge1xuICAgIGNvbnN0IGV4dCA9IGV4dGVuc2lvbi50b0xvd2VyQ2FzZSgpO1xuICAgIGlmIChleHQgPT09IFwibWRcIikge1xuICAgICAgcmV0dXJuIFwibWFya2Rvd25cIjtcbiAgICB9XG4gICAgaWYgKGV4dCA9PT0gXCJwZGZcIikge1xuICAgICAgcmV0dXJuIFwicGRmXCI7XG4gICAgfVxuICAgIGlmIChbXCJwbmdcIiwgXCJqcGdcIiwgXCJqcGVnXCIsIFwiZ2lmXCIsIFwid2VicFwiLCBcInN2Z1wiXS5pbmNsdWRlcyhleHQpKSB7XG4gICAgICByZXR1cm4gXCJpbWFnZVwiO1xuICAgIH1cbiAgICByZXR1cm4gXCJsb2NhbFwiO1xuICB9XG5cbiAgcHJpdmF0ZSBub3JtYWxpemVFdmlkZW5jZVRva2VuKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiB2YWx1ZS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1tcXHMvX1xcXFwuLV0rL2csIFwiXCIpO1xuICB9XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQUFBQSxtQkFVTztBQUNQLGdCQUE2QztBQUM3QyxrQkFBcUI7QUFDckIsc0JBQXNCOzs7QUNidEIsc0JBQTBDO0FBYTFDLElBQU0sZUFBcUMsQ0FBQyxRQUFRLFFBQVEsWUFBWSxjQUFjLFlBQVksT0FBTztBQUV6RyxlQUFzQixjQUFjLEtBQVUsVUFBaUQ7QUFDN0YsUUFBTSxVQUFVO0FBQUEsSUFDZCxTQUFTO0FBQUEsSUFDVCxTQUFTO0FBQUEsSUFDVCxTQUFTO0FBQUEsSUFDVCxTQUFTO0FBQUEsSUFDVCxTQUFTO0FBQUEsSUFDVCxTQUFTO0FBQUEsRUFDWDtBQUVBLGFBQVcsVUFBVSxTQUFTO0FBQzVCLFVBQU0saUJBQWEsK0JBQWMsTUFBTTtBQUN2QyxVQUFNLFdBQVcsV0FBVyxNQUFNLEdBQUcsRUFBRSxPQUFPLE9BQU87QUFDckQsUUFBSSxVQUFVO0FBRWQsZUFBVyxXQUFXLFVBQVU7QUFDOUIsZ0JBQVUsVUFBVSxHQUFHLE9BQU8sSUFBSSxPQUFPLEtBQUs7QUFDOUMsWUFBTSxrQkFBYywrQkFBYyxPQUFPO0FBQ3pDLFVBQUksSUFBSSxNQUFNLHNCQUFzQixXQUFXLEdBQUc7QUFDaEQ7QUFBQSxNQUNGO0FBRUEsVUFBSTtBQUNGLGNBQU0sSUFBSSxNQUFNLGFBQWEsV0FBVztBQUFBLE1BQzFDLFNBQVMsT0FBTztBQUNkLGNBQU0sVUFBVSxpQkFBaUIsUUFBUSxNQUFNLFVBQVUsT0FBTyxLQUFLO0FBQ3JFLFlBQUksQ0FBQyxRQUFRLFNBQVMsdUJBQXVCLEdBQUc7QUFDOUMsZ0JBQU07QUFBQSxRQUNSO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0Y7QUFFTyxTQUFTLGlCQUFpQixNQUEwQixPQUFlLFNBQWlDLENBQUMsR0FBVztBQUNySCxRQUFNLFdBQVUsb0JBQUksS0FBSyxHQUFFLFlBQVk7QUFDdkMsUUFBTSxRQUFRO0FBQUEsSUFDWjtBQUFBLElBQ0EsU0FBUyxJQUFJO0FBQUEsSUFDYixXQUFXLE1BQU0sUUFBUSxNQUFNLEtBQUssQ0FBQztBQUFBLElBQ3JDLFlBQVksT0FBTztBQUFBLElBQ25CLFlBQVksT0FBTztBQUFBLEVBQ3JCO0FBRUEsU0FBTyxRQUFRLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQyxLQUFLLEtBQUssTUFBTTtBQUMvQyxVQUFNLEtBQUssR0FBRyxHQUFHLEtBQUssS0FBSyxFQUFFO0FBQUEsRUFDL0IsQ0FBQztBQUVELFFBQU0sS0FBSyxPQUFPLEVBQUU7QUFDcEIsU0FBTyxNQUFNLEtBQUssSUFBSTtBQUN4QjtBQUVPLFNBQVMsa0JBQWtCLE9BQXVCO0FBQ3ZELFNBQU8sR0FBRyxpQkFBaUIsUUFBUSxPQUFPO0FBQUEsSUFDeEMsUUFBUTtBQUFBLElBQ1IsVUFBVTtBQUFBLElBQ1YsTUFBTTtBQUFBLEVBQ1IsQ0FBQyxDQUFDLEtBQUssS0FBSztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQWFkO0FBRU8sU0FBUyxrQkFBa0IsT0FBdUI7QUFDdkQsU0FBTyxHQUFHLGlCQUFpQixRQUFRLE9BQU87QUFBQSxJQUN4QyxRQUFRO0FBQUEsSUFDUixVQUFVO0FBQUEsSUFDVixNQUFNO0FBQUEsSUFDTixVQUFVO0FBQUEsRUFDWixDQUFDLENBQUMsS0FBSyxLQUFLO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFRZDtBQUVPLFNBQVMsc0JBQXNCLE9BQXVCO0FBQzNELFNBQU8sR0FBRyxpQkFBaUIsWUFBWSxPQUFPO0FBQUEsSUFDNUMsS0FBSyxJQUFJLGdCQUFnQixvQkFBSSxLQUFLLENBQUMsQ0FBQztBQUFBLElBQ3BDLE9BQU87QUFBQSxJQUNQLEtBQUs7QUFBQSxJQUNMLGlCQUFpQjtBQUFBLElBQ2pCLGFBQWE7QUFBQSxJQUNiLGlCQUFpQjtBQUFBLEVBQ25CLENBQUMsQ0FBQyxLQUFLLEtBQUs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBTWQ7QUFFTyxTQUFTLHdCQUF3QixPQUF1QjtBQUM3RCxTQUFPLEdBQUcsaUJBQWlCLGNBQWMsT0FBTztBQUFBLElBQzlDLFFBQVE7QUFBQSxJQUNSLFFBQVE7QUFBQSxJQUNSLE1BQU07QUFBQSxJQUNOLFVBQVU7QUFBQSxJQUNWLFFBQVE7QUFBQSxFQUNWLENBQUMsQ0FBQyxLQUFLLEtBQUs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFVZDtBQUVPLFNBQVMsc0JBQXNCLE9BQWUsV0FBVyxJQUFJLFdBQVcsSUFBWTtBQUN6RixTQUFPLEdBQUcsaUJBQWlCLFlBQVksT0FBTztBQUFBLElBQzVDLE1BQU0sSUFBSSxTQUFTLFFBQVEsTUFBTSxLQUFLLENBQUM7QUFBQSxJQUN2QyxVQUFVLElBQUksU0FBUyxRQUFRLE1BQU0sS0FBSyxDQUFDO0FBQUEsSUFDM0MsUUFBUTtBQUFBLEVBQ1YsQ0FBQyxDQUFDLEtBQUssS0FBSztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFRVixZQUFZLG9CQUFLO0FBQUE7QUFFckI7QUFFTyxTQUFTLG1CQUNkLE9BQ0EsVUFDQSxXQUNBLHFCQUFxQixJQUNyQixzQkFBc0IsSUFDZDtBQUNSLFNBQU8sR0FBRyxpQkFBaUIsU0FBUyxPQUFPO0FBQUEsSUFDekMsTUFBTSxJQUFJLE1BQU0sUUFBUSxNQUFNLEtBQUssQ0FBQztBQUFBLElBQ3BDLFNBQVM7QUFBQSxJQUNULFVBQVUsYUFBYSxTQUFZLE9BQU8sT0FBTyxRQUFRO0FBQUEsSUFDekQsV0FBVyxjQUFjLFNBQVksT0FBTyxPQUFPLFNBQVM7QUFBQSxJQUM1RCxvQkFBb0IsSUFBSSxrQkFBa0I7QUFBQSxJQUMxQyxxQkFBcUIsSUFBSSxtQkFBbUI7QUFBQSxJQUM1QyxXQUFXLElBQUksZ0JBQWdCLG9CQUFJLEtBQUssQ0FBQyxDQUFDO0FBQUEsSUFDMUMsT0FBTztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sVUFBVTtBQUFBLEVBQ1osQ0FBQyxDQUFDLEtBQUssS0FBSztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQVVkO0FBRUEsZUFBc0IscUJBQXFCLEtBQTBDO0FBQ25GLFFBQU0sUUFBUSxJQUFJLE1BQU0saUJBQWlCO0FBQ3pDLFFBQU0sUUFBd0IsQ0FBQztBQUMvQixRQUFNLFFBQXdCLENBQUM7QUFDL0IsUUFBTSxZQUFnQyxDQUFDO0FBQ3ZDLFFBQU0sY0FBb0MsQ0FBQztBQUMzQyxRQUFNLFdBQStCLENBQUM7QUFDdEMsUUFBTSxTQUEwQixDQUFDO0FBRWpDLGFBQVcsUUFBUSxPQUFPO0FBQ3hCLFVBQU0sUUFBUSxJQUFJLGNBQWMsYUFBYSxJQUFJO0FBQ2pELFVBQU0sY0FBYyxPQUFPO0FBQzNCLFVBQU0sT0FBTyxhQUFhO0FBRTFCLFFBQUksQ0FBQyxhQUFhLFNBQVMsSUFBSSxHQUFHO0FBQ2hDO0FBQUEsSUFDRjtBQUVBLFVBQU0sT0FBTztBQUFBLE1BQ1gsVUFBVSxLQUFLO0FBQUEsTUFDZixNQUFNLE9BQU8sYUFBYSxTQUFTLEtBQUssUUFBUTtBQUFBLE1BQ2hEO0FBQUEsTUFDQSxTQUFTLFNBQVMsYUFBYSxPQUFPO0FBQUEsTUFDdEMsU0FBUyxTQUFTLGFBQWEsT0FBTztBQUFBLElBQ3hDO0FBRUEsUUFBSSxTQUFTLFFBQVE7QUFDbkIsWUFBTSxLQUFLO0FBQUEsUUFDVCxHQUFHO0FBQUEsUUFDSDtBQUFBLFFBQ0EsUUFBUSxhQUFhLGFBQWEsTUFBTTtBQUFBLFFBQ3hDLFVBQVUsV0FBVyxhQUFhLFFBQVE7QUFBQSxRQUMxQyxVQUFVLFNBQVMsYUFBYSxRQUFRO0FBQUEsUUFDeEMsTUFBTSxNQUFNLFFBQVEsYUFBYSxJQUFJLElBQUksWUFBWSxLQUFLLElBQUksTUFBTSxJQUFJLENBQUM7QUFBQSxNQUMzRSxDQUFDO0FBQUEsSUFDSDtBQUVBLFFBQUksU0FBUyxRQUFRO0FBQ25CLFlBQU0sS0FBSztBQUFBLFFBQ1QsR0FBRztBQUFBLFFBQ0g7QUFBQSxRQUNBLFFBQVEsYUFBYSxhQUFhLE1BQU07QUFBQSxRQUN4QyxNQUFNLFNBQVMsYUFBYSxJQUFJO0FBQUEsUUFDaEMsVUFBVSxTQUFTLGFBQWEsUUFBUTtBQUFBLFFBQ3hDLFVBQVUsV0FBVyxhQUFhLFFBQVE7QUFBQSxRQUMxQyxLQUFLLFNBQVMsYUFBYSxHQUFHO0FBQUEsTUFDaEMsQ0FBQztBQUFBLElBQ0g7QUFFQSxRQUFJLFNBQVMsWUFBWTtBQUN2QixnQkFBVSxLQUFLO0FBQUEsUUFDYixHQUFHO0FBQUEsUUFDSDtBQUFBLFFBQ0EsS0FBSyxTQUFTLGFBQWEsR0FBRztBQUFBLFFBQzlCLE9BQU8sU0FBUyxhQUFhLEtBQUs7QUFBQSxRQUNsQyxLQUFLLFNBQVMsYUFBYSxHQUFHO0FBQUEsUUFDOUIsaUJBQWlCLFNBQVMsYUFBYSxlQUFlO0FBQUEsUUFDdEQsYUFBYSxTQUFTLGFBQWEsV0FBVztBQUFBLFFBQzlDLGlCQUFpQixTQUFTLGFBQWEsZUFBZTtBQUFBLE1BQ3hELENBQUM7QUFBQSxJQUNIO0FBRUEsUUFBSSxTQUFTLGNBQWM7QUFDekIsa0JBQVksS0FBSztBQUFBLFFBQ2YsR0FBRztBQUFBLFFBQ0g7QUFBQSxRQUNBLFFBQVEsbUJBQW1CLGFBQWEsTUFBTTtBQUFBLFFBQzlDLFFBQVEsbUJBQW1CLGFBQWEsTUFBTTtBQUFBLFFBQzlDLE1BQU0sU0FBUyxhQUFhLElBQUk7QUFBQSxRQUNoQyxVQUFVLFNBQVMsYUFBYSxRQUFRO0FBQUEsUUFDeEMsUUFBUSxTQUFTLGFBQWEsTUFBTTtBQUFBLE1BQ3RDLENBQUM7QUFBQSxJQUNIO0FBRUEsUUFBSSxTQUFTLFlBQVk7QUFDdkIsZUFBUyxLQUFLO0FBQUEsUUFDWixHQUFHO0FBQUEsUUFDSDtBQUFBLFFBQ0EsTUFBTSxTQUFTLGFBQWEsSUFBSTtBQUFBLFFBQ2hDLFVBQVUsU0FBUyxhQUFhLFFBQVE7QUFBQSxRQUN4QyxRQUFRLFNBQVMsYUFBYSxNQUFNO0FBQUEsTUFDdEMsQ0FBQztBQUFBLElBQ0g7QUFFQSxRQUFJLFNBQVMsU0FBUztBQUNwQixhQUFPLEtBQUs7QUFBQSxRQUNWLEdBQUc7QUFBQSxRQUNIO0FBQUEsUUFDQSxNQUFNLFNBQVMsYUFBYSxJQUFJO0FBQUEsUUFDaEMsU0FBUyxTQUFTLGFBQWEsT0FBTztBQUFBLFFBQ3RDLFVBQVUsU0FBUyxhQUFhLFFBQVE7QUFBQSxRQUN4QyxXQUFXLFNBQVMsYUFBYSxTQUFTO0FBQUEsUUFDMUMsV0FBVyxTQUFTLGFBQWEsU0FBUztBQUFBLFFBQzFDLE9BQU8sU0FBUyxhQUFhLEtBQUs7QUFBQSxRQUNsQyxNQUFNLFNBQVMsYUFBYSxJQUFJO0FBQUEsUUFDaEMsVUFBVSxTQUFTLGFBQWEsUUFBUTtBQUFBLE1BQzFDLENBQUM7QUFBQSxJQUNIO0FBQUEsRUFDRjtBQUVBLFFBQU0sS0FBSyxhQUFhO0FBQ3hCLFFBQU0sS0FBSyxhQUFhO0FBQ3hCLFlBQVUsS0FBSyxhQUFhO0FBQzVCLGNBQVksS0FBSyxhQUFhO0FBQzlCLFdBQVMsS0FBSyxhQUFhO0FBQzNCLFNBQU8sS0FBSyxhQUFhO0FBRXpCLFNBQU8sRUFBRSxPQUFPLE9BQU8sV0FBVyxhQUFhLFVBQVUsT0FBTztBQUNsRTtBQUVPLFNBQVMsZ0JBQWdCLE1BQW9CO0FBQ2xELFFBQU0sT0FBTyxLQUFLLFlBQVk7QUFDOUIsUUFBTSxRQUFRLE9BQU8sS0FBSyxTQUFTLElBQUksQ0FBQyxFQUFFLFNBQVMsR0FBRyxHQUFHO0FBQ3pELFFBQU0sTUFBTSxPQUFPLEtBQUssUUFBUSxDQUFDLEVBQUUsU0FBUyxHQUFHLEdBQUc7QUFDbEQsU0FBTyxHQUFHLElBQUksSUFBSSxLQUFLLElBQUksR0FBRztBQUNoQztBQUVBLGVBQXNCLGdCQUNwQixLQUNBLFFBQ0EsT0FDQSxVQUNnQjtBQUNoQixRQUFNLFdBQVcsTUFBTSxRQUFRLGlCQUFpQixHQUFHLEVBQUUsS0FBSyxLQUFLO0FBQy9ELFFBQU0sZUFBVywrQkFBYyxHQUFHLE1BQU0sSUFBSSxRQUFRLEtBQUs7QUFDekQsUUFBTSxXQUFXLElBQUksTUFBTSxzQkFBc0IsUUFBUTtBQUN6RCxNQUFJLG9CQUFvQix1QkFBTztBQUM3QixXQUFPO0FBQUEsRUFDVDtBQUNBLFNBQU8sSUFBSSxNQUFNLE9BQU8sVUFBVSxRQUFRO0FBQzVDO0FBRUEsU0FBUyxTQUFTLE9BQW9DO0FBQ3BELFNBQU8sT0FBTyxVQUFVLFdBQVcsUUFBUTtBQUM3QztBQUVBLFNBQVMsV0FBVyxPQUF1RDtBQUN6RSxTQUFPLFVBQVUsU0FBUyxVQUFVLFlBQVksVUFBVSxTQUFTLFFBQVE7QUFDN0U7QUFFQSxTQUFTLFNBQVMsT0FBb0M7QUFDcEQsTUFBSSxPQUFPLFVBQVUsVUFBVTtBQUM3QixXQUFPO0FBQUEsRUFDVDtBQUNBLE1BQUksT0FBTyxVQUFVLFVBQVU7QUFDN0IsVUFBTSxTQUFTLE9BQU8sS0FBSztBQUMzQixXQUFPLE9BQU8sU0FBUyxNQUFNLElBQUksU0FBUztBQUFBLEVBQzVDO0FBQ0EsU0FBTztBQUNUO0FBRUEsU0FBUyxhQUFhLE9BQWdEO0FBQ3BFLFNBQU8sVUFBVSxZQUFZLFVBQVUsYUFBYSxRQUFRO0FBQzlEO0FBRUEsU0FBUyxhQUFhLE9BQWtEO0FBQ3RFLFNBQU8sVUFBVSxlQUFlLFVBQVUsU0FBUyxRQUFRO0FBQzdEO0FBRUEsU0FBUyxtQkFBbUIsT0FBK0Q7QUFDekYsU0FBTyxVQUFVLFlBQVksVUFBVSxhQUFhLFVBQVUsYUFBYSxRQUFRO0FBQ3JGO0FBRUEsU0FBUyxtQkFBbUIsT0FBeUY7QUFDbkgsU0FBTyxVQUFVLFVBQVUsVUFBVSxXQUFXLFVBQVUsWUFBWSxVQUFVLFdBQVcsVUFBVSxhQUFhLFVBQVUsVUFDeEgsUUFDQTtBQUNOO0FBRUEsU0FBUyxjQUE4QyxHQUFNLEdBQWM7QUFDekUsVUFBUSxFQUFFLFdBQVcsSUFBSSxjQUFjLEVBQUUsV0FBVyxFQUFFO0FBQ3hEOzs7QUNwV0EsSUFBQUMsbUJBQStDO0FBR3hDLElBQU0scUJBQU4sY0FBaUMsa0NBQWlCO0FBQUEsRUFHdkQsWUFBWSxLQUFVLFFBQTBCO0FBQzlDLFVBQU0sS0FBSyxNQUFNO0FBQ2pCLFNBQUssU0FBUztBQUFBLEVBQ2hCO0FBQUEsRUFFQSxVQUFnQjtBQUNkLFVBQU0sRUFBRSxZQUFZLElBQUk7QUFDeEIsZ0JBQVksTUFBTTtBQUNsQixnQkFBWSxTQUFTLE1BQU0sRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRTNELFNBQUssZUFBZSxhQUFhLGtDQUFTLEtBQUssT0FBTyxTQUFTLFlBQVksT0FBTyxVQUFVO0FBQzFGLFdBQUssT0FBTyxTQUFTLGFBQWEsTUFBTSxLQUFLLEtBQUs7QUFDbEQsWUFBTSxLQUFLLE9BQU8sYUFBYTtBQUFBLElBQ2pDLENBQUM7QUFFRCxTQUFLLGVBQWUsYUFBYSxrQ0FBUyxLQUFLLE9BQU8sU0FBUyxZQUFZLE9BQU8sVUFBVTtBQUMxRixXQUFLLE9BQU8sU0FBUyxhQUFhLE1BQU0sS0FBSyxLQUFLO0FBQ2xELFlBQU0sS0FBSyxPQUFPLGFBQWE7QUFBQSxJQUNqQyxDQUFDO0FBRUQsU0FBSyxlQUFlLGFBQWEsa0NBQVMsS0FBSyxPQUFPLFNBQVMsZ0JBQWdCLE9BQU8sVUFBVTtBQUM5RixXQUFLLE9BQU8sU0FBUyxpQkFBaUIsTUFBTSxLQUFLLEtBQUs7QUFDdEQsWUFBTSxLQUFLLE9BQU8sYUFBYTtBQUFBLElBQ2pDLENBQUM7QUFFRCxRQUFJLHlCQUFRLFdBQVcsRUFDcEIsUUFBUSwwQkFBTSxFQUNkLFFBQVEsMEVBQWMsRUFDdEI7QUFBQSxNQUFVLENBQUMsV0FDVixPQUFPLFVBQVUsR0FBRyxLQUFLLENBQUMsRUFBRSxTQUFTLEtBQUssT0FBTyxTQUFTLFVBQVUsRUFBRSxrQkFBa0IsRUFBRSxTQUFTLE9BQU8sVUFBVTtBQUNsSCxhQUFLLE9BQU8sU0FBUyxhQUFhO0FBQ2xDLGNBQU0sS0FBSyxPQUFPLGFBQWE7QUFBQSxNQUNqQyxDQUFDO0FBQUEsSUFDSDtBQUVGLFFBQUkseUJBQVEsV0FBVyxFQUNwQixRQUFRLDBCQUFNLEVBQ2QsUUFBUSxrR0FBa0IsRUFDMUI7QUFBQSxNQUFVLENBQUMsV0FDVixPQUFPLFVBQVUsR0FBRyxLQUFLLENBQUMsRUFBRSxTQUFTLEtBQUssT0FBTyxTQUFTLGVBQWUsRUFBRSxrQkFBa0IsRUFBRSxTQUFTLE9BQU8sVUFBVTtBQUN2SCxhQUFLLE9BQU8sU0FBUyxrQkFBa0I7QUFDdkMsY0FBTSxLQUFLLE9BQU8sYUFBYTtBQUFBLE1BQ2pDLENBQUM7QUFBQSxJQUNIO0FBQUEsRUFDSjtBQUFBLEVBRVEsZUFBZSxhQUEwQixNQUFjLE9BQWUsVUFBa0Q7QUFDOUgsUUFBSSx5QkFBUSxXQUFXLEVBQ3BCLFFBQVEsSUFBSSxFQUNaLFFBQVEsQ0FBQyxTQUFTLEtBQUssZUFBZSxLQUFLLEVBQUUsU0FBUyxLQUFLLEVBQUUsU0FBUyxRQUFRLENBQUM7QUFBQSxFQUNwRjtBQUNGOzs7QUN6REEsSUFBQUMsbUJBQXVEO0FBSWhELElBQU0scUJBQXFCO0FBQzNCLElBQU0sNEJBQTRCO0FBUXpDLElBQU0sc0JBQXNCO0FBQzVCLElBQU0sb0NBQW9DO0FBQzFDLElBQU0sdUJBQXVCO0FBQzdCLElBQU0sWUFBWTtBQUFBLEVBQ2hCLEVBQUUsT0FBTyxPQUFPLFFBQVEsRUFBRTtBQUFBLEVBQzFCLEVBQUUsT0FBTyxPQUFPLFFBQVEsRUFBRTtBQUFBLEVBQzFCLEVBQUUsT0FBTyxPQUFPLFFBQVEsRUFBRTtBQUFBLEVBQzFCLEVBQUUsT0FBTyxPQUFPLFFBQVEsRUFBRTtBQUFBLEVBQzFCLEVBQUUsT0FBTyxPQUFPLFFBQVEsRUFBRTtBQUFBLEVBQzFCLEVBQUUsT0FBTyxPQUFPLFFBQVEsRUFBRTtBQUFBLEVBQzFCLEVBQUUsT0FBTyxPQUFPLFFBQVEsRUFBRTtBQUM1QjtBQUNBLElBQU0sYUFBYSxDQUFDLFNBQVMsU0FBUyxTQUFTLFNBQVMsU0FBUyxPQUFPO0FBRWpFLElBQU0sd0JBQU4sY0FBb0MsMEJBQVM7QUFBQSxFQU9sRCxZQUFZLE1BQXFCLFFBQTBCO0FBQ3pELFVBQU0sSUFBSTtBQU5aLFNBQVEsU0FBeUI7QUFFakMsU0FBUSxhQUFhO0FBS25CLFNBQUssU0FBUztBQUFBLEVBQ2hCO0FBQUEsRUFFQSxjQUFzQjtBQUNwQixXQUFPO0FBQUEsRUFDVDtBQUFBLEVBRUEsaUJBQXlCO0FBQ3ZCLFdBQU87QUFBQSxFQUNUO0FBQUEsRUFFQSxVQUFrQjtBQUNoQixXQUFPO0FBQUEsRUFDVDtBQUFBLEVBRUEsTUFBTSxTQUF3QjtBQUM1QixRQUFJO0FBQ0YsV0FBSyxVQUFVLE1BQU07QUFDckIsV0FBSyxVQUFVLFNBQVMsa0JBQWtCO0FBQzFDLFlBQU0sS0FBSyxhQUFhO0FBQUEsSUFDMUIsU0FBUyxPQUFPO0FBQ2QsV0FBSyxPQUFPLFNBQVMscUJBQXFCLGlCQUFpQixRQUFRLE1BQU0sU0FBUyxNQUFNLFVBQVUsT0FBTyxLQUFLLENBQUMsRUFBRTtBQUNqSCxXQUFLLGVBQWUsS0FBSztBQUFBLElBQzNCO0FBQUEsRUFDRjtBQUFBLEVBRUEsTUFBTSxVQUF5QjtBQUM3QixRQUFJLEtBQUssWUFBWTtBQUNuQixhQUFPLGFBQWEsS0FBSyxVQUFVO0FBQ25DLFdBQUssYUFBYTtBQUFBLElBQ3BCO0FBQUEsRUFDRjtBQUFBLEVBRUEsTUFBTSxVQUF5QjtBQUM3QixRQUFJO0FBQ0YsWUFBTSxLQUFLLG9CQUFvQjtBQUFBLElBQ2pDLFNBQVMsT0FBTztBQUNkLFdBQUssT0FBTyxTQUFTLHNCQUFzQixpQkFBaUIsUUFBUSxNQUFNLFNBQVMsTUFBTSxVQUFVLE9BQU8sS0FBSyxDQUFDLEVBQUU7QUFDbEgsV0FBSyxlQUFlLEtBQUs7QUFBQSxJQUMzQjtBQUFBLEVBQ0Y7QUFBQSxFQUVBLE1BQU0sZUFBOEI7QUFDbEMsUUFBSSxLQUFLLFlBQVk7QUFDbkIsYUFBTyxhQUFhLEtBQUssVUFBVTtBQUNuQyxXQUFLLGFBQWE7QUFBQSxJQUNwQjtBQUNBLFNBQUssbUJBQW1CO0FBQ3hCLFNBQUssYUFBYTtBQUNsQixTQUFLLFNBQVM7QUFDZCxVQUFNLEtBQUssb0JBQW9CO0FBQUEsRUFDakM7QUFBQSxFQUVBLE1BQWMsc0JBQXFDO0FBQ2pELFFBQUksS0FBSyxXQUFXLFdBQVcsQ0FBQyxLQUFLLFlBQVk7QUFDL0MsV0FBSyxrQkFBa0I7QUFDdkI7QUFBQSxJQUNGO0FBRUEsUUFBSSxLQUFLLFdBQVcsVUFBVSxLQUFLLGtCQUFrQjtBQUNuRCxZQUFNLEtBQUssb0JBQW9CLEtBQUssZ0JBQWdCO0FBQ3BEO0FBQUEsSUFDRjtBQUVBLFFBQUksS0FBSyxXQUFXLFNBQVM7QUFDM0IsWUFBTSxLQUFLLGVBQWU7QUFDMUI7QUFBQSxJQUNGO0FBRUEsUUFBSSxLQUFLLFdBQVcsV0FBVztBQUM3QixZQUFNLEtBQUssa0JBQWtCO0FBQzdCO0FBQUEsSUFDRjtBQUVBLFFBQUksS0FBSyxXQUFXLGNBQWM7QUFDaEMsWUFBTSxLQUFLLG9CQUFvQjtBQUMvQjtBQUFBLElBQ0Y7QUFFQSxVQUFNLEtBQUssV0FBVztBQUFBLEVBQ3hCO0FBQUEsRUFFUSxvQkFBMEI7QUFDaEMsU0FBSyxVQUFVLE1BQU07QUFDckIsVUFBTSxXQUFXLEtBQUssT0FBTyxpQkFBaUI7QUFDOUMsVUFBTSxRQUFRLEtBQUssVUFBVSxVQUFVLEVBQUUsS0FBSyxtQ0FBbUMsQ0FBQztBQUNsRixVQUFNLE1BQU0sa0JBQWtCLDRFQUE0RSxRQUFRO0FBQ2xILFVBQU0sVUFBVSxFQUFFLEtBQUsseUJBQXlCLENBQUM7QUFDakQsVUFBTSxVQUFVLEVBQUUsS0FBSyx1QkFBdUIsQ0FBQztBQUMvQyxVQUFNLFVBQVUsRUFBRSxLQUFLLHNCQUFzQixDQUFDO0FBQzlDLFVBQU0sYUFBYSxNQUFNLFNBQVMsVUFBVTtBQUFBLE1BQzFDLEtBQUs7QUFBQSxNQUNMLE1BQU07QUFBQSxRQUNKLGNBQWM7QUFBQSxNQUNoQjtBQUFBLElBQ0YsQ0FBQztBQUNELGVBQVcsV0FBVyxFQUFFLEtBQUssc0JBQXNCLENBQUM7QUFDcEQsZUFBVyxXQUFXLEVBQUUsS0FBSyx1QkFBdUIsQ0FBQztBQUNyRCxVQUFNLFVBQVUsTUFBTSxVQUFVLEVBQUUsS0FBSyx5QkFBeUIsQ0FBQztBQUNqRSxZQUFRLFNBQVMsUUFBUSxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQzdDLFlBQVEsU0FBUyxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUN2RCxVQUFNLE9BQU8sTUFBTSxVQUFVLEVBQUUsS0FBSyxzQkFBc0IsQ0FBQztBQUMzRCxTQUFLLFFBQVEsMEVBQWM7QUFFM0IsVUFBTSxVQUFVLElBQUksTUFBTTtBQUMxQixZQUFRLE1BQU07QUFDZCxVQUFNLGFBQWEsUUFBUSxTQUFTLFFBQVEsT0FBTyxJQUFJLFFBQVEsUUFBUTtBQUN2RSxlQUNHLEtBQUssTUFBTSxNQUFNLFNBQVMsVUFBVSxDQUFDLEVBQ3JDLE1BQU0sTUFBTSxNQUFNLFNBQVMsVUFBVSxDQUFDO0FBRXpDLFFBQUksV0FBVztBQUNmLFNBQUssaUJBQWlCLFlBQVksU0FBUyxNQUFNO0FBQy9DLFVBQUksVUFBVTtBQUNaO0FBQUEsTUFDRjtBQUNBLGlCQUFXO0FBQ1gsaUJBQVcsYUFBYSxZQUFZLE1BQU07QUFDMUMsYUFBTyxzQkFBc0IsTUFBTTtBQUNqQyxjQUFNLFlBQVksWUFBWTtBQUM5QixjQUFNLFNBQVMsYUFBYTtBQUFBLE1BQzlCLENBQUM7QUFDRCxXQUFLLGFBQWEsT0FBTyxXQUFXLFlBQVk7QUFDOUMsYUFBSyxhQUFhO0FBQ2xCLGFBQUssU0FBUztBQUNkLGNBQU0sS0FBSyxXQUFXO0FBQUEsTUFDeEIsR0FBRyxtQkFBbUI7QUFBQSxJQUN4QixDQUFDO0FBQUEsRUFDSDtBQUFBLEVBRUEsTUFBYyxhQUE0QjtBQUN4QyxTQUFLLE9BQU8sU0FBUyxtQkFBbUI7QUFDeEMsVUFBTSxPQUFPLE1BQU0sS0FBSyxPQUFPLGlCQUFpQjtBQUNoRCxTQUFLLFVBQVUsTUFBTTtBQUVyQixVQUFNQyxTQUFRLEtBQUssVUFBVSxVQUFVLEVBQUUsS0FBSyxxQ0FBcUMsQ0FBQztBQUNwRixJQUFBQSxPQUFNLFFBQVEsU0FBUyxLQUFLLGNBQWM7QUFDMUMsU0FBSyxxQkFBcUJBLE1BQUs7QUFDL0IsSUFBQUEsT0FBTSxVQUFVLEVBQUUsS0FBSyx5Q0FBeUMsQ0FBQztBQUNqRSxJQUFBQSxPQUFNLFVBQVUsRUFBRSxLQUFLLDJDQUEyQyxDQUFDO0FBQ25FLElBQUFBLE9BQU0sVUFBVSxFQUFFLEtBQUsseUNBQXlDLENBQUM7QUFDakUsVUFBTSxPQUFPQSxPQUFNLFVBQVUsRUFBRSxLQUFLLG1DQUFtQyxDQUFDO0FBQ3hFLFVBQU0sT0FBTyxLQUFLLFVBQVU7QUFDNUIsU0FBSyxTQUFTLEtBQUssRUFBRSxLQUFLLG1CQUFtQixNQUFNLGdDQUFnQyxDQUFDO0FBQ3BGLFNBQUssU0FBUyxNQUFNLEVBQUUsS0FBSyxrQkFBa0IsTUFBTSxXQUFXLENBQUM7QUFDL0QsU0FBSyxTQUFTLEtBQUs7QUFBQSxNQUNqQixLQUFLO0FBQUEsTUFDTCxNQUFNLEtBQUssY0FBYyxNQUFNLFVBQzNCLHVOQUNBO0FBQUEsSUFDTixDQUFDO0FBRUQsVUFBTSxNQUFNQSxPQUFNLFVBQVUsRUFBRSxLQUFLLG9CQUFvQixDQUFDO0FBQ3hELFNBQUssaUJBQWlCLEtBQUs7QUFBQSxNQUN6QixPQUFPO0FBQUEsTUFDUCxPQUFPO0FBQUEsTUFDUCxNQUFNLGdCQUFNLEtBQUssTUFBTSxNQUFNLDRCQUFRLEtBQUssTUFBTSxPQUFPLENBQUMsU0FBUyxLQUFLLFdBQVcsTUFBTSxFQUFFLE1BQU0seUNBQVcsS0FBSyxVQUFVLE1BQU07QUFBQSxNQUMvSCxRQUFRO0FBQUEsTUFDUixRQUFRO0FBQUEsTUFDUixNQUFNO0FBQUEsSUFDUixDQUFDO0FBQ0QsU0FBSyxpQkFBaUIsS0FBSztBQUFBLE1BQ3pCLE9BQU87QUFBQSxNQUNQLE9BQU87QUFBQSxNQUNQLE1BQU0sNEJBQVEsS0FBSyxZQUFZLE9BQU8sQ0FBQyxTQUFTLEtBQUssV0FBVyxVQUFVLEVBQUUsTUFBTSwrQ0FBWSxLQUFLLFNBQVMsTUFBTTtBQUFBLE1BQ2xILFFBQVE7QUFBQSxNQUNSLFFBQVE7QUFBQSxNQUNSLE1BQU07QUFBQSxJQUNSLENBQUM7QUFDRCxTQUFLLGlCQUFpQixLQUFLO0FBQUEsTUFDekIsT0FBTztBQUFBLE1BQ1AsT0FBTztBQUFBLE1BQ1AsTUFBTSxHQUFHLEtBQUssT0FBTyxNQUFNO0FBQUEsTUFDM0IsUUFBUTtBQUFBLE1BQ1IsUUFBUTtBQUFBLE1BQ1IsTUFBTTtBQUFBLElBQ1IsQ0FBQztBQUNELFNBQUssT0FBTyxTQUFTLHNCQUFzQjtBQUFBLEVBQzdDO0FBQUEsRUFFQSxNQUFjLGlCQUFnQztBQUM1QyxVQUFNLE9BQU8sTUFBTSxLQUFLLE9BQU8saUJBQWlCO0FBQ2hELFNBQUssVUFBVSxNQUFNO0FBQ3JCLFVBQU1BLFNBQVEsS0FBSyxnQkFBZ0IsMEJBQTBCO0FBQzdELFNBQUssaUJBQWlCQSxRQUFPLGdCQUFnQiwwREFBYSxzUUFBK0M7QUFBQSxNQUN2RyxFQUFFLE9BQU8sNEJBQVEsUUFBUSxZQUFZLEtBQUssT0FBTyxlQUFlLEVBQUU7QUFBQSxNQUNsRSxFQUFFLE9BQU8sNEJBQVEsUUFBUSxZQUFZLEtBQUssT0FBTyxlQUFlLEVBQUU7QUFBQSxNQUNsRSxFQUFFLE9BQU8sNEJBQVEsUUFBUSxZQUFZLEtBQUssT0FBTyxtQkFBbUIsR0FBRyxXQUFXLEtBQUs7QUFBQSxJQUN6RixDQUFDO0FBQ0QsVUFBTSxPQUFPQSxPQUFNLFVBQVUsRUFBRSxLQUFLLG1DQUFtQyxDQUFDO0FBQ3hFLFNBQUssZ0JBQWdCLE1BQU0sS0FBSyxLQUFLO0FBQ3JDLFNBQUssNkJBQTZCLE1BQU0sSUFBSTtBQUFBLEVBQzlDO0FBQUEsRUFFQSxNQUFjLG9CQUFtQztBQUMvQyxVQUFNLE9BQU8sTUFBTSxLQUFLLE9BQU8saUJBQWlCO0FBQ2hELFNBQUssVUFBVSxNQUFNO0FBQ3JCLFVBQU1BLFNBQVEsS0FBSyxnQkFBZ0IsNkJBQTZCO0FBQ2hFLFNBQUssaUJBQWlCQSxRQUFPLGdCQUFnQixvREFBWSw0VEFBd0Q7QUFBQSxNQUMvRyxFQUFFLE9BQU8sNEJBQVEsUUFBUSxZQUFZLEtBQUssT0FBTyxxQkFBcUIsRUFBRTtBQUFBLE1BQ3hFLEVBQUUsT0FBTyw0QkFBUSxRQUFRLFlBQVksS0FBSyxPQUFPLG1CQUFtQixHQUFHLFdBQVcsS0FBSztBQUFBLElBQ3pGLENBQUM7QUFDRCxVQUFNLE9BQU9BLE9BQU0sVUFBVSxFQUFFLEtBQUssbUNBQW1DLENBQUM7QUFDeEUsU0FBSyxvQkFBb0IsTUFBTSxJQUFJO0FBQ25DLFNBQUssb0JBQW9CLE1BQU0sSUFBSTtBQUFBLEVBQ3JDO0FBQUEsRUFFQSxNQUFjLHNCQUFxQztBQUNqRCxVQUFNLE9BQU8sTUFBTSxLQUFLLE9BQU8saUJBQWlCO0FBQ2hELFNBQUssVUFBVSxNQUFNO0FBQ3JCLFVBQU1BLFNBQVEsS0FBSyxnQkFBZ0IsK0JBQStCO0FBQ2xFLFNBQUssaUJBQWlCQSxRQUFPLGNBQWMsNEJBQVEscVBBQTZDO0FBQUEsTUFDOUYsRUFBRSxPQUFPLDRCQUFRLFFBQVEsWUFBWSxLQUFLLE9BQU8sZ0JBQWdCLEVBQUU7QUFBQSxJQUNyRSxDQUFDO0FBQ0QsU0FBSyxzQkFBc0JBLFFBQU8sSUFBSTtBQUFBLEVBQ3hDO0FBQUEsRUFFQSxNQUFjLFdBQVcsUUFBa0U7QUFDekYsU0FBSyxTQUFTO0FBQ2QsU0FBSyxtQkFBbUI7QUFDeEIsVUFBTSxLQUFLLG9CQUFvQjtBQUFBLEVBQ2pDO0FBQUEsRUFFUSxpQkFDTixXQUNBLFFBUU07QUFDTixVQUFNLFNBQVMsVUFBVSxTQUFTLFVBQVUsRUFBRSxLQUFLLHdCQUF3QixPQUFPLElBQUksR0FBRyxDQUFDO0FBQzFGLFdBQU8sU0FBUyxRQUFRLEVBQUUsS0FBSyx3QkFBd0IsTUFBTSxPQUFPLE1BQU0sQ0FBQztBQUMzRSxXQUFPLFNBQVMsVUFBVSxFQUFFLE1BQU0sT0FBTyxNQUFNLENBQUM7QUFDaEQsV0FBTyxTQUFTLEtBQUssRUFBRSxNQUFNLE9BQU8sS0FBSyxDQUFDO0FBQzFDLFdBQU8sU0FBUyxLQUFLLEVBQUUsTUFBTSxPQUFPLE9BQU8sQ0FBQztBQUM1QyxTQUFLLGlCQUFpQixRQUFRLFNBQVMsWUFBWSxLQUFLLFdBQVcsT0FBTyxNQUFNLENBQUM7QUFBQSxFQUNuRjtBQUFBLEVBRVEsZ0JBQWdCLFlBQWlDO0FBQ3ZELFVBQU1BLFNBQVEsS0FBSyxVQUFVLFVBQVUsRUFBRSxLQUFLLHNDQUFzQyxVQUFVLEdBQUcsQ0FBQztBQUNsRyxJQUFBQSxPQUFNLFFBQVEsU0FBUyxLQUFLLGNBQWM7QUFDMUMsSUFBQUEsT0FBTSxVQUFVLEVBQUUsS0FBSyx5Q0FBeUMsQ0FBQztBQUNqRSxJQUFBQSxPQUFNLFVBQVUsRUFBRSxLQUFLLDJDQUEyQyxDQUFDO0FBQ25FLFdBQU9BO0FBQUEsRUFDVDtBQUFBLEVBRVEsaUJBQ05BLFFBQ0EsUUFDQSxPQUNBLFVBQ0EsU0FDTTtBQUNOLFVBQU0sU0FBU0EsT0FBTSxVQUFVLEVBQUUsS0FBSyx1QkFBdUIsQ0FBQztBQUM5RCxVQUFNLGFBQWEsT0FBTyxTQUFTLFVBQVUsRUFBRSxLQUFLLHdCQUF3QixNQUFNLFNBQUksQ0FBQztBQUN2RixTQUFLLGlCQUFpQixZQUFZLFNBQVMsWUFBWSxLQUFLLFdBQVcsTUFBTSxDQUFDO0FBQzlFLFVBQU0sT0FBTyxPQUFPLFVBQVUsRUFBRSxLQUFLLHdCQUF3QixDQUFDO0FBQzlELFNBQUssU0FBUyxRQUFRLEVBQUUsS0FBSyxtQkFBbUIsTUFBTSxPQUFPLENBQUM7QUFDOUQsU0FBSyxTQUFTLE1BQU0sRUFBRSxNQUFNLE1BQU0sQ0FBQztBQUNuQyxTQUFLLFNBQVMsS0FBSyxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBQ3JDLFVBQU0sY0FBYyxPQUFPLFVBQVUsRUFBRSxLQUFLLHlDQUF5QyxDQUFDO0FBQ3RGLFlBQVEsUUFBUSxDQUFDLFdBQVc7QUFDMUIsV0FBSyxhQUFhLGFBQWEsT0FBTyxPQUFPLE9BQU8sUUFBUSxPQUFPLFNBQVM7QUFBQSxJQUM5RSxDQUFDO0FBQUEsRUFDSDtBQUFBLEVBRVEsZ0JBQWdCLFdBQXdCLE9BQTZCO0FBQzNFLFVBQU0sT0FBTyxVQUFVLFVBQVUsRUFBRSxLQUFLLG9DQUFvQyxDQUFDO0FBQzdFLFVBQU0sU0FBUyxLQUFLLFVBQVUsRUFBRSxLQUFLLHdCQUF3QixDQUFDO0FBQzlELFVBQU0sYUFBYSxPQUFPLFVBQVU7QUFDcEMsZUFBVyxTQUFTLE1BQU0sRUFBRSxNQUFNLDJCQUFPLENBQUM7QUFDMUMsZUFBVyxTQUFTLEtBQUssRUFBRSxNQUFNLHVJQUF5QixDQUFDO0FBQzNELFVBQU0sZ0JBQWdCLE9BQU8sU0FBUyxVQUFVLEVBQUUsS0FBSyxvREFBb0QsTUFBTSxXQUFXLENBQUM7QUFDN0gsU0FBSyxpQkFBaUIsZUFBZSxTQUFTLFlBQVksS0FBSyxPQUFPLGVBQWUsQ0FBQztBQUN0RixVQUFNLFFBQVEsS0FBSyxVQUFVLEVBQUUsS0FBSyxpQkFBaUIsQ0FBQztBQUV0RCxTQUFLLGlCQUFpQixPQUFPLFFBQVEsTUFBTSxPQUFPLENBQUMsU0FBUyxLQUFLLFdBQVcsTUFBTSxDQUFDO0FBQ25GLFNBQUssaUJBQWlCLE9BQU8sVUFBVSxNQUFNLE9BQU8sQ0FBQyxTQUFTLEtBQUssV0FBVyxRQUFRLENBQUM7QUFDdkYsU0FBSyxpQkFBaUIsT0FBTyxZQUFZLE1BQU0sT0FBTyxDQUFDLFNBQVMsS0FBSyxXQUFXLFVBQVUsQ0FBQztBQUFBLEVBQzdGO0FBQUEsRUFFUSxpQkFBaUIsV0FBd0IsT0FBZSxPQUE2QjtBQUMzRixVQUFNLFNBQVMsVUFBVSxVQUFVLEVBQUUsS0FBSyx3QkFBd0IsQ0FBQztBQUNuRSxVQUFNLGVBQWUsT0FBTyxVQUFVLEVBQUUsS0FBSywrQkFBK0IsQ0FBQztBQUM3RSxpQkFBYSxTQUFTLE1BQU0sRUFBRSxNQUFNLE1BQU0sQ0FBQztBQUMzQyxpQkFBYSxTQUFTLFFBQVEsRUFBRSxNQUFNLE9BQU8sTUFBTSxNQUFNLEVBQUUsQ0FBQztBQUM1RCxRQUFJLE1BQU0sV0FBVyxHQUFHO0FBQ3RCLGFBQU8sU0FBUyxLQUFLLEVBQUUsS0FBSyxrQkFBa0IsTUFBTSwyQkFBTyxDQUFDO0FBQzVEO0FBQUEsSUFDRjtBQUVBLFVBQU0sT0FBTyxPQUFPLFNBQVMsTUFBTSxFQUFFLEtBQUssZ0JBQWdCLENBQUM7QUFDM0QsVUFBTSxNQUFNLEdBQUcsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxTQUFTO0FBQ2xDLFlBQU0sTUFBTSxLQUFLLFNBQVMsTUFBTSxFQUFFLEtBQUssdUNBQXVDLENBQUM7QUFDL0UsWUFBTSxPQUFPLElBQUksVUFBVSxFQUFFLEtBQUsscUJBQXFCLENBQUM7QUFDeEQsV0FBSyxTQUFTLFVBQVUsRUFBRSxNQUFNLEtBQUssS0FBSyxDQUFDO0FBQzNDLFlBQU0sY0FBYyxLQUFLLGdCQUFnQixLQUFLLFFBQVE7QUFDdEQsV0FBSyxTQUFTLFFBQVE7QUFBQSxRQUNwQixLQUFLO0FBQUEsUUFDTCxNQUFNLEtBQUssV0FBVyxnQkFBTSxLQUFLLFFBQVEsS0FBSyxLQUFLO0FBQUEsTUFDckQsQ0FBQztBQUNELFdBQUssU0FBUyxRQUFRO0FBQUEsUUFDcEIsS0FBSztBQUFBLFFBQ0wsTUFBTSxjQUFjLElBQUksR0FBRyxXQUFXLGVBQWUsY0FBYyxJQUFJLE1BQU0sRUFBRSxLQUFLO0FBQUEsTUFDdEYsQ0FBQztBQUNELFlBQU0sV0FBVyxLQUFLLFVBQVUsRUFBRSxLQUFLLHlCQUF5QixDQUFDO0FBQ2pFLFlBQU0sZUFBZSxTQUFTLFVBQVU7QUFDeEMsbUJBQWEsTUFBTSxRQUFRLEdBQUcsS0FBSyxvQkFBb0IsS0FBSyxRQUFRLENBQUM7QUFDckUsV0FBSyxTQUFTLFFBQVEsRUFBRSxLQUFLLDJCQUEyQixNQUFNLDBCQUEwQixDQUFDO0FBQ3pGLFlBQU0sT0FBTyxJQUFJLFVBQVUsRUFBRSxLQUFLLHdCQUF3QixDQUFDO0FBQzNELFdBQUssU0FBUyxRQUFRLEVBQUUsS0FBSywwQkFBMEIsS0FBSyxZQUFZLFFBQVEsSUFBSSxNQUFNLEtBQUssb0JBQW9CLEtBQUssUUFBUSxFQUFFLENBQUM7QUFDbkksWUFBTSxTQUFTLEtBQUssU0FBUyxVQUFVLEVBQUUsS0FBSyx3QkFBd0IsTUFBTSxRQUFRLENBQUM7QUFDckYsWUFBTSxPQUFPLEtBQUssU0FBUyxVQUFVLEVBQUUsS0FBSyx3QkFBd0IsTUFBTSxlQUFLLENBQUM7QUFDaEYsWUFBTSxTQUFTLEtBQUssU0FBUyxVQUFVLEVBQUUsS0FBSywrQkFBK0IsTUFBTSxlQUFLLENBQUM7QUFDekYsV0FBSyxpQkFBaUIsUUFBUSxTQUFTLE9BQU8sVUFBc0I7QUFDbEUsY0FBTSxnQkFBZ0I7QUFDdEIsY0FBTSxLQUFLLE9BQU8sbUJBQW1CLEtBQUssUUFBUTtBQUFBLE1BQ3BELENBQUM7QUFDRCxXQUFLLGlCQUFpQixNQUFNLFNBQVMsT0FBTyxVQUFzQjtBQUNoRSxjQUFNLGdCQUFnQjtBQUN0QixjQUFNLEtBQUssT0FBTyxTQUFTLEtBQUssUUFBUTtBQUFBLE1BQzFDLENBQUM7QUFDRCxXQUFLLGlCQUFpQixRQUFRLFNBQVMsT0FBTyxVQUFzQjtBQUNsRSxjQUFNLGdCQUFnQjtBQUN0QixjQUFNLEtBQUssT0FBTyxXQUFXLEtBQUssUUFBUTtBQUFBLE1BQzVDLENBQUM7QUFDRCxXQUFLLGlCQUFpQixLQUFLLFNBQVMsWUFBWTtBQUM5QyxhQUFLLG1CQUFtQixLQUFLO0FBQzdCLGFBQUssU0FBUztBQUNkLGNBQU0sS0FBSyxvQkFBb0I7QUFBQSxNQUNqQyxDQUFDO0FBQ0QsV0FBSyxpQkFBaUIsS0FBSyxZQUFZLFlBQVksS0FBSyxPQUFPLFNBQVMsS0FBSyxRQUFRLENBQUM7QUFBQSxJQUN4RixDQUFDO0FBQUEsRUFDSDtBQUFBLEVBRUEsTUFBYyxvQkFBb0IsVUFBaUM7QUFDakUsU0FBSyxPQUFPLFNBQVMsd0JBQXdCO0FBQzdDLFVBQU0sT0FBTyxNQUFNLEtBQUssT0FBTyxpQkFBaUI7QUFDaEQsVUFBTSxjQUFjLEtBQUssTUFBTSxLQUFLLENBQUMsU0FBUyxLQUFLLGFBQWEsUUFBUTtBQUN4RSxRQUFJLENBQUMsYUFBYTtBQUNoQixXQUFLLFNBQVM7QUFDZCxZQUFNLEtBQUssZUFBZTtBQUMxQjtBQUFBLElBQ0Y7QUFFQSxVQUFNLFlBQVksS0FBSyxNQUFNLE9BQU8sQ0FBQyxTQUFTLEtBQUssYUFBYSxZQUFZLFFBQVE7QUFDcEYsVUFBTSxnQkFBZ0IsS0FBSyxVQUFVLE9BQU8sQ0FBQyxhQUFhO0FBQ3hELFVBQUksQ0FBQyxTQUFTLGlCQUFpQjtBQUM3QixlQUFPO0FBQUEsTUFDVDtBQUNBLGFBQU8sVUFBVSxLQUFLLENBQUMsU0FBUyxLQUFLLGFBQWEsU0FBUyxlQUFlO0FBQUEsSUFDNUUsQ0FBQztBQUVELFNBQUssVUFBVSxNQUFNO0FBQ3JCLFVBQU1BLFNBQVEsS0FBSyxVQUFVLFVBQVUsRUFBRSxLQUFLLHFDQUFxQyxDQUFDO0FBQ3BGLElBQUFBLE9BQU0sUUFBUSxTQUFTLEtBQUssY0FBYztBQUMxQyxJQUFBQSxPQUFNLFVBQVUsRUFBRSxLQUFLLHlDQUF5QyxDQUFDO0FBQ2pFLElBQUFBLE9BQU0sVUFBVSxFQUFFLEtBQUssMkNBQTJDLENBQUM7QUFFbkUsVUFBTSxTQUFTQSxPQUFNLFVBQVUsRUFBRSxLQUFLLHVCQUF1QixDQUFDO0FBQzlELFVBQU0sYUFBYSxPQUFPLFNBQVMsVUFBVSxFQUFFLEtBQUssd0JBQXdCLE1BQU0sU0FBSSxDQUFDO0FBQ3ZGLFNBQUssaUJBQWlCLFlBQVksU0FBUyxZQUFZO0FBQ3JELFdBQUssU0FBUztBQUNkLFdBQUssbUJBQW1CO0FBQ3hCLFlBQU0sS0FBSyxlQUFlO0FBQUEsSUFDNUIsQ0FBQztBQUNELFVBQU0sYUFBYSxPQUFPLFVBQVUsRUFBRSxLQUFLLDRCQUE0QixDQUFDO0FBQ3hFLGVBQVcsU0FBUyxRQUFRLEVBQUUsS0FBSyxtQkFBbUIsTUFBTSxpQkFBaUIsQ0FBQztBQUM5RSxlQUFXLFNBQVMsTUFBTSxFQUFFLE1BQU0sWUFBWSxLQUFLLENBQUM7QUFDcEQsZUFBVyxTQUFTLEtBQUs7QUFBQSxNQUN2QixNQUFNLENBQUMsWUFBWSxRQUFRLFlBQVksV0FBVyxHQUFHLFlBQVksUUFBUSxjQUFjLFFBQVcsWUFBWSxXQUFXLE9BQU8sWUFBWSxRQUFRLEtBQUssTUFBUyxFQUMvSixPQUFPLE9BQU8sRUFDZCxLQUFLLEtBQUs7QUFBQSxJQUNmLENBQUM7QUFDRCxVQUFNLFVBQVUsT0FBTyxVQUFVLEVBQUUsS0FBSyx3QkFBd0IsQ0FBQztBQUNqRSxTQUFLLGFBQWEsU0FBUyx3Q0FBVSxZQUFZLEtBQUssT0FBTyxtQkFBbUIsWUFBWSxRQUFRLENBQUM7QUFDckcsU0FBSyxhQUFhLFNBQVMsd0NBQVUsWUFBWSxLQUFLLE9BQU8sU0FBUyxZQUFZLFFBQVEsR0FBRyxJQUFJO0FBRWpHLFVBQU0sT0FBT0EsT0FBTSxVQUFVLEVBQUUsS0FBSyxxQkFBcUIsQ0FBQztBQUMxRCxTQUFLLG1CQUFtQixNQUFNLGFBQWEsV0FBVyxhQUFhO0FBQ25FLFNBQUssZ0JBQWdCLE1BQU0sYUFBYSxTQUFTO0FBQ2pELFNBQUssbUJBQW1CLE1BQU0sYUFBYTtBQUMzQyxTQUFLLG1CQUFtQixNQUFNLFdBQVc7QUFDekMsU0FBSyxtQkFBbUIsTUFBTSxhQUFhLFdBQVcsYUFBYTtBQUNuRSxTQUFLLE9BQU8sU0FBUywyQkFBMkI7QUFBQSxFQUNsRDtBQUFBLEVBRVEsbUJBQW1CLFdBQXdCLGFBQTJCLE9BQXVCLFdBQXFDO0FBQ3hJLFVBQU0sUUFBUSxVQUFVLFVBQVUsRUFBRSxLQUFLLHdDQUF3QyxDQUFDO0FBQ2xGLFVBQU0sU0FBUyxNQUFNLEVBQUUsTUFBTSwyQkFBTyxDQUFDO0FBQ3JDLFVBQU0sUUFBUSxNQUFNLFVBQVUsRUFBRSxLQUFLLHNCQUFzQixDQUFDO0FBQzVELFNBQUssYUFBYSxPQUFPLGdCQUFNLE9BQU8sTUFBTSxNQUFNLENBQUM7QUFDbkQsU0FBSyxhQUFhLE9BQU8sc0JBQU8sT0FBTyxVQUFVLE1BQU0sQ0FBQztBQUN4RCxTQUFLLGFBQWEsT0FBTyxnQkFBTSxZQUFZLE1BQU07QUFDakQsVUFBTSxRQUFRLE1BQU0sVUFBVSxFQUFFLEtBQUssc0JBQXNCLENBQUM7QUFDNUQsVUFBTSxTQUFTLEtBQUssRUFBRSxNQUFNLCtKQUE2QixDQUFDO0FBQUEsRUFDNUQ7QUFBQSxFQUVRLGdCQUFnQixXQUF3QixhQUEyQixPQUE2QjtBQUN0RyxVQUFNLFFBQVEsVUFBVSxVQUFVLEVBQUUsS0FBSyxxQ0FBcUMsQ0FBQztBQUMvRSxVQUFNLFNBQVMsTUFBTSxFQUFFLE1BQU0sMkJBQU8sQ0FBQztBQUNyQyxVQUFNLE9BQU8sTUFBTSxTQUFTLE1BQU0sRUFBRSxLQUFLLGdCQUFnQixDQUFDO0FBQzFELFFBQUksTUFBTSxXQUFXLEdBQUc7QUFDdEIsWUFBTSxNQUFNLEtBQUssU0FBUyxNQUFNLEVBQUUsS0FBSyxpQkFBaUIsQ0FBQztBQUN6RCxVQUFJLFFBQVEsOERBQVk7QUFDeEIsWUFBTSxTQUFTLE1BQU0sU0FBUyxVQUFVLEVBQUUsS0FBSyxtQkFBbUIsTUFBTSw2Q0FBVSxDQUFDO0FBQ25GLFdBQUssaUJBQWlCLFFBQVEsU0FBUyxZQUFZLEtBQUssT0FBTyxtQkFBbUIsWUFBWSxRQUFRLENBQUM7QUFDdkc7QUFBQSxJQUNGO0FBRUEsVUFBTSxRQUFRLENBQUMsU0FBUztBQUN0QixZQUFNLE1BQU0sS0FBSyxTQUFTLE1BQU0sRUFBRSxLQUFLLHFCQUFxQixDQUFDO0FBQzdELFlBQU0sT0FBTyxJQUFJLFVBQVU7QUFDM0IsV0FBSyxTQUFTLFVBQVUsRUFBRSxNQUFNLEtBQUssS0FBSyxDQUFDO0FBQzNDLFdBQUssU0FBUyxRQUFRLEVBQUUsS0FBSyxpQkFBaUIsTUFBTSxDQUFDLEtBQUssUUFBUSxLQUFLLFVBQVUsS0FBSyxHQUFHLEVBQUUsT0FBTyxPQUFPLEVBQUUsS0FBSyxLQUFLLEVBQUUsQ0FBQztBQUN4SCxZQUFNLE9BQU8sSUFBSSxVQUFVLEVBQUUsS0FBSyx3QkFBd0IsQ0FBQztBQUMzRCxXQUFLLFNBQVMsUUFBUSxFQUFFLEtBQUsseUJBQXlCLE1BQU0sS0FBSyxPQUFPLENBQUM7QUFDekUsWUFBTSxPQUFPLEtBQUssU0FBUyxVQUFVLEVBQUUsS0FBSyx3QkFBd0IsTUFBTSxlQUFLLENBQUM7QUFDaEYsWUFBTSxTQUFTLEtBQUssU0FBUyxVQUFVLEVBQUUsS0FBSywrQkFBK0IsTUFBTSxlQUFLLENBQUM7QUFDekYsV0FBSyxpQkFBaUIsTUFBTSxTQUFTLE9BQU8sVUFBc0I7QUFDaEUsY0FBTSxnQkFBZ0I7QUFDdEIsY0FBTSxLQUFLLE9BQU8sU0FBUyxLQUFLLFFBQVE7QUFBQSxNQUMxQyxDQUFDO0FBQ0QsV0FBSyxpQkFBaUIsUUFBUSxTQUFTLE9BQU8sVUFBc0I7QUFDbEUsY0FBTSxnQkFBZ0I7QUFDdEIsY0FBTSxLQUFLLE9BQU8sV0FBVyxLQUFLLFFBQVE7QUFBQSxNQUM1QyxDQUFDO0FBQ0QsV0FBSyxpQkFBaUIsS0FBSyxTQUFTLFlBQVksS0FBSyxPQUFPLFNBQVMsS0FBSyxRQUFRLENBQUM7QUFBQSxJQUNyRixDQUFDO0FBQUEsRUFDSDtBQUFBLEVBRVEsbUJBQW1CLFdBQXdCLFdBQXFDO0FBQ3RGLFVBQU0sUUFBUSxVQUFVLFVBQVUsRUFBRSxLQUFLLHFDQUFxQyxDQUFDO0FBQy9FLFVBQU0sU0FBUyxNQUFNLEVBQUUsTUFBTSwyQkFBTyxDQUFDO0FBQ3JDLFVBQU0sT0FBTyxNQUFNLFNBQVMsTUFBTSxFQUFFLEtBQUssZ0JBQWdCLENBQUM7QUFDMUQsUUFBSSxVQUFVLFdBQVcsR0FBRztBQUMxQixXQUFLLFNBQVMsTUFBTSxFQUFFLEtBQUssa0JBQWtCLE1BQU0sK0pBQTZCLENBQUM7QUFDakY7QUFBQSxJQUNGO0FBRUEsY0FBVSxRQUFRLENBQUMsYUFBYTtBQUM5QixZQUFNLE1BQU0sS0FBSyxTQUFTLE1BQU0sRUFBRSxLQUFLLHFCQUFxQixDQUFDO0FBQzdELFlBQU0sT0FBTyxJQUFJLFVBQVU7QUFDM0IsV0FBSyxTQUFTLFVBQVUsRUFBRSxNQUFNLFNBQVMsZUFBZSxTQUFTLEtBQUssQ0FBQztBQUN2RSxXQUFLLFNBQVMsUUFBUSxFQUFFLEtBQUssaUJBQWlCLE1BQU0sQ0FBQyxTQUFTLEtBQUssU0FBUyxTQUFTLFNBQVMsTUFBTSxHQUFHLFNBQVMsS0FBSyxJQUFJLFNBQVMsR0FBRyxLQUFLLE1BQVMsRUFBRSxPQUFPLE9BQU8sRUFBRSxLQUFLLEtBQUssRUFBRSxDQUFDO0FBQ2xMLFlBQU0sT0FBTyxJQUFJLFVBQVUsRUFBRSxLQUFLLHdCQUF3QixDQUFDO0FBQzNELFlBQU0sT0FBTyxLQUFLLFNBQVMsVUFBVSxFQUFFLEtBQUssd0JBQXdCLE1BQU0sZUFBSyxDQUFDO0FBQ2hGLFlBQU0sU0FBUyxLQUFLLFNBQVMsVUFBVSxFQUFFLEtBQUssK0JBQStCLE1BQU0sZUFBSyxDQUFDO0FBQ3pGLFdBQUssaUJBQWlCLE1BQU0sU0FBUyxPQUFPLFVBQXNCO0FBQ2hFLGNBQU0sZ0JBQWdCO0FBQ3RCLGNBQU0sS0FBSyxPQUFPLFNBQVMsU0FBUyxRQUFRO0FBQUEsTUFDOUMsQ0FBQztBQUNELFdBQUssaUJBQWlCLFFBQVEsU0FBUyxPQUFPLFVBQXNCO0FBQ2xFLGNBQU0sZ0JBQWdCO0FBQ3RCLGNBQU0sS0FBSyxPQUFPLFdBQVcsU0FBUyxRQUFRO0FBQUEsTUFDaEQsQ0FBQztBQUNELFdBQUssaUJBQWlCLEtBQUssU0FBUyxZQUFZLEtBQUssT0FBTyxTQUFTLFNBQVMsUUFBUSxDQUFDO0FBQUEsSUFDekYsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUVRLG1CQUFtQixXQUF3QixhQUFpQztBQUNsRixVQUFNLFFBQVEsVUFBVSxVQUFVLEVBQUUsS0FBSyxxQ0FBcUMsQ0FBQztBQUMvRSxVQUFNLFNBQVMsTUFBTSxVQUFVLEVBQUUsS0FBSyx5QkFBeUIsQ0FBQztBQUNoRSxXQUFPLFNBQVMsTUFBTSxFQUFFLE1BQU0scUJBQU0sQ0FBQztBQUNyQyxVQUFNLFVBQVUsT0FBTyxVQUFVLEVBQUUsS0FBSywwQkFBMEIsQ0FBQztBQUNuRSxVQUFNLGVBQWUsUUFBUSxTQUFTLFVBQVUsRUFBRSxLQUFLLHdCQUF3QixNQUFNLGlDQUFRLENBQUM7QUFDOUYsVUFBTSxpQkFBaUIsUUFBUSxTQUFTLFVBQVUsRUFBRSxLQUFLLHdCQUF3QixNQUFNLDJCQUFPLENBQUM7QUFDL0YsU0FBSyxpQkFBaUIsY0FBYyxTQUFTLFlBQVksS0FBSyxPQUFPLDRCQUE0QixZQUFZLFFBQVEsQ0FBQztBQUN0SCxTQUFLLGlCQUFpQixnQkFBZ0IsU0FBUyxZQUFZLEtBQUssT0FBTyx1QkFBdUIsWUFBWSxRQUFRLENBQUM7QUFFbkgsVUFBTSxXQUFXLEtBQUssaUJBQWlCLFdBQVc7QUFDbEQsVUFBTSxVQUFVLE1BQU0sVUFBVSxFQUFFLEtBQUssNEJBQTRCLENBQUM7QUFDcEU7QUFBQSxNQUNFLEVBQUUsT0FBTyxZQUFZLE1BQU0sV0FBb0I7QUFBQSxNQUMvQyxFQUFFLE9BQU8sT0FBTyxNQUFNLE1BQWU7QUFBQSxNQUNyQyxFQUFFLE9BQU8sVUFBVSxNQUFNLFFBQWlCO0FBQUEsTUFDMUMsRUFBRSxPQUFPLGVBQWUsTUFBTSxRQUFpQjtBQUFBLElBQ2pELEVBQUUsUUFBUSxDQUFDLEVBQUUsT0FBTyxLQUFLLE1BQU07QUFDN0IsWUFBTSxRQUFRLFNBQVMsT0FBTyxDQUFDQyxVQUFTQSxNQUFLLFNBQVMsSUFBSTtBQUMxRCxZQUFNLE9BQU8sUUFBUSxVQUFVLEVBQUUsS0FBSyx5QkFBeUIsQ0FBQztBQUNoRSxXQUFLLFNBQVMsVUFBVSxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBQ3ZDLFdBQUssU0FBUyxRQUFRLEVBQUUsTUFBTSxNQUFNLFNBQVMsSUFBSSxHQUFHLE1BQU0sTUFBTSxRQUFRLE1BQU0sU0FBUyxJQUFJLE1BQU0sRUFBRSxLQUFLLFFBQVEsQ0FBQztBQUNqSCxZQUFNLE9BQU8sS0FBSyxTQUFTLE1BQU0sRUFBRSxLQUFLLHlCQUF5QixDQUFDO0FBQ2xFLFlBQU0sTUFBTSxHQUFHLENBQUMsRUFBRSxRQUFRLENBQUMsaUJBQWlCO0FBQzFDLGNBQU0sTUFBTSxLQUFLLFNBQVMsSUFBSTtBQUM5QixjQUFNLE9BQU8sSUFBSSxTQUFTLFVBQVUsRUFBRSxLQUFLLDBCQUEwQixNQUFNLGFBQWEsS0FBSyxTQUFTLENBQUM7QUFDdkcsY0FBTSxTQUFTLElBQUksU0FBUyxVQUFVLEVBQUUsS0FBSywrQkFBK0IsTUFBTSxlQUFLLENBQUM7QUFDeEYsYUFBSyxpQkFBaUIsTUFBTSxTQUFTLFlBQVksS0FBSyxPQUFPLFNBQVMsYUFBYSxLQUFLLElBQUksQ0FBQztBQUM3RixhQUFLLGlCQUFpQixRQUFRLFNBQVMsWUFBWSxLQUFLLE9BQU8sV0FBVyxhQUFhLEtBQUssSUFBSSxDQUFDO0FBQUEsTUFDbkcsQ0FBQztBQUFBLElBQ0gsQ0FBQztBQUNELFVBQU0sU0FBUyxNQUFNLFVBQVUsRUFBRSxLQUFLLGtCQUFrQixDQUFDO0FBQ3pELFdBQU8sU0FBUyxRQUFRO0FBQUEsTUFDdEIsTUFBTSxTQUFTLFNBQVMsSUFDcEIsR0FBRyxTQUFTLE1BQU0sa0VBQ2xCO0FBQUEsSUFDTixDQUFDO0FBQUEsRUFDSDtBQUFBLEVBRVEsbUJBQW1CLFdBQXdCLGFBQTJCLE9BQXVCLFdBQXFDO0FBQ3hJLFVBQU0sUUFBUSxVQUFVLFVBQVUsRUFBRSxLQUFLLGtFQUFrRSxDQUFDO0FBQzVHLFVBQU0sU0FBUyxNQUFNLEVBQUUsTUFBTSxpQ0FBUSxDQUFDO0FBQ3RDLFVBQU0sV0FBVyxNQUFNLFVBQVUsRUFBRSxLQUFLLG9CQUFvQixDQUFDO0FBQzdELFVBQU0sU0FBUztBQUFBLE1BQ2IsRUFBRSxPQUFPLDRCQUFRLE9BQU8sWUFBWSxXQUFXLFVBQVU7QUFBQSxNQUN6RCxHQUFHLE1BQU0sTUFBTSxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLE9BQU8saUJBQU8sS0FBSyxJQUFJLElBQUksT0FBTyxLQUFLLFdBQVcsS0FBSyxXQUFXLEtBQUssT0FBTyxFQUFFO0FBQUEsTUFDdEgsR0FBRyxVQUFVLE1BQU0sR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxPQUFPLGlCQUFPLFNBQVMsZUFBZSxTQUFTLElBQUksSUFBSSxPQUFPLENBQUMsU0FBUyxLQUFLLFNBQVMsS0FBSyxFQUFFLE9BQU8sT0FBTyxFQUFFLEtBQUssR0FBRyxFQUFFLEVBQUU7QUFBQSxJQUN6SztBQUVBLFdBQU8sUUFBUSxDQUFDLFVBQVU7QUFDeEIsWUFBTSxNQUFNLFNBQVMsVUFBVSxFQUFFLEtBQUssd0JBQXdCLENBQUM7QUFDL0QsVUFBSSxXQUFXLEVBQUUsS0FBSyx3QkFBd0IsQ0FBQztBQUMvQyxZQUFNLE9BQU8sSUFBSSxVQUFVO0FBQzNCLFdBQUssU0FBUyxVQUFVLEVBQUUsTUFBTSxNQUFNLE1BQU0sQ0FBQztBQUM3QyxXQUFLLFNBQVMsUUFBUSxFQUFFLEtBQUssaUJBQWlCLE1BQU0sTUFBTSxNQUFNLENBQUM7QUFBQSxJQUNuRSxDQUFDO0FBQUEsRUFDSDtBQUFBLEVBRVEsb0JBQW9CLFdBQXdCLE1BQW1DO0FBQ3JGLFVBQU0sZUFBZSxLQUFLLFlBQVksT0FBTyxDQUFDLFNBQVMsS0FBSyxXQUFXLFVBQVU7QUFDakYsVUFBTSxPQUFPLFVBQVUsVUFBVSxFQUFFLEtBQUssb0NBQW9DLENBQUM7QUFDN0UsVUFBTSxTQUFTLEtBQUssVUFBVSxFQUFFLEtBQUsseUJBQXlCLENBQUM7QUFDL0QsV0FBTyxTQUFTLE1BQU0sRUFBRSxNQUFNLDJCQUFPLENBQUM7QUFDdEMsVUFBTSxZQUFZLE9BQU8sU0FBUyxVQUFVLEVBQUUsS0FBSyx3QkFBd0IsTUFBTSx1Q0FBUyxDQUFDO0FBQzNGLFNBQUssaUJBQWlCLFdBQVcsU0FBUyxZQUFZLEtBQUssT0FBTyxxQkFBcUIsQ0FBQztBQUN4RixTQUFLLFNBQVMsS0FBSztBQUFBLE1BQ2pCLEtBQUs7QUFBQSxNQUNMLE1BQU07QUFBQSxJQUNSLENBQUM7QUFDRCxVQUFNLE9BQU8sS0FBSyxTQUFTLE1BQU0sRUFBRSxLQUFLLGdCQUFnQixDQUFDO0FBQ3pELFFBQUksYUFBYSxXQUFXLEdBQUc7QUFDN0IsV0FBSyxTQUFTLE1BQU0sRUFBRSxLQUFLLGtCQUFrQixNQUFNLDJLQUErQixDQUFDO0FBQ25GO0FBQUEsSUFDRjtBQUNBLGlCQUFhLE1BQU0sR0FBRyxFQUFFLEVBQUUsUUFBUSxDQUFDLFNBQVM7QUFDMUMsWUFBTSxNQUFNLEtBQUssU0FBUyxNQUFNLEVBQUUsS0FBSyxxQkFBcUIsQ0FBQztBQUM3RCxZQUFNLE9BQU8sSUFBSSxVQUFVLEVBQUUsS0FBSyxxQkFBcUIsQ0FBQztBQUN4RCxXQUFLLFNBQVMsVUFBVSxFQUFFLE1BQU0sS0FBSyxLQUFLLENBQUM7QUFDM0MsV0FBSyxTQUFTLFFBQVEsRUFBRSxLQUFLLGlCQUFpQixNQUFNLENBQUMsS0FBSyxVQUFVLGNBQWMsS0FBSyxVQUFVLFFBQVEsRUFBRSxLQUFLLEtBQUssRUFBRSxDQUFDO0FBQ3hILFlBQU0sT0FBTyxJQUFJLFVBQVUsRUFBRSxLQUFLLHdCQUF3QixDQUFDO0FBQzNELFdBQUssU0FBUyxRQUFRLEVBQUUsS0FBSyx5QkFBeUIsTUFBTSxLQUFLLFVBQVUsT0FBTyxDQUFDO0FBQ25GLFlBQU0sVUFBVSxLQUFLLFNBQVMsVUFBVSxFQUFFLEtBQUssd0JBQXdCLE1BQU0saUNBQVEsQ0FBQztBQUN0RixZQUFNLE9BQU8sS0FBSyxTQUFTLFVBQVUsRUFBRSxLQUFLLHdCQUF3QixNQUFNLHFCQUFNLENBQUM7QUFDakYsWUFBTSxTQUFTLEtBQUssU0FBUyxVQUFVLEVBQUUsS0FBSywrQkFBK0IsTUFBTSxlQUFLLENBQUM7QUFDekYsV0FBSyxpQkFBaUIsU0FBUyxTQUFTLE9BQU8sVUFBc0I7QUFDbkUsY0FBTSxnQkFBZ0I7QUFDdEIsY0FBTSxLQUFLLE9BQU8sNEJBQTRCLEtBQUssUUFBUTtBQUFBLE1BQzdELENBQUM7QUFDRCxXQUFLLGlCQUFpQixNQUFNLFNBQVMsT0FBTyxVQUFzQjtBQUNoRSxjQUFNLGdCQUFnQjtBQUN0QixjQUFNLEtBQUssT0FBTyxTQUFTLEtBQUssUUFBUTtBQUFBLE1BQzFDLENBQUM7QUFDRCxXQUFLLGlCQUFpQixRQUFRLFNBQVMsT0FBTyxVQUFzQjtBQUNsRSxjQUFNLGdCQUFnQjtBQUN0QixjQUFNLEtBQUssT0FBTyxXQUFXLEtBQUssUUFBUTtBQUFBLE1BQzVDLENBQUM7QUFDRCxXQUFLLGlCQUFpQixLQUFLLFNBQVMsWUFBWSxLQUFLLE9BQU8sU0FBUyxLQUFLLFFBQVEsQ0FBQztBQUFBLElBQ3JGLENBQUM7QUFBQSxFQUNIO0FBQUEsRUFFUSxvQkFBb0IsV0FBd0IsTUFBbUM7QUFDckYsVUFBTSxPQUFPLFVBQVUsVUFBVSxFQUFFLEtBQUssb0NBQW9DLENBQUM7QUFDN0UsVUFBTSxTQUFTLEtBQUssVUFBVSxFQUFFLEtBQUsseUJBQXlCLENBQUM7QUFDL0QsV0FBTyxTQUFTLE1BQU0sRUFBRSxNQUFNLHFCQUFNLENBQUM7QUFDckMsVUFBTSxZQUFZLE9BQU8sU0FBUyxVQUFVLEVBQUUsS0FBSyx3QkFBd0IsTUFBTSwyQkFBTyxDQUFDO0FBQ3pGLFNBQUssaUJBQWlCLFdBQVcsU0FBUyxZQUFZLEtBQUssT0FBTyxtQkFBbUIsQ0FBQztBQUN0RixVQUFNLFVBQVUsS0FBSyxVQUFVLEVBQUUsS0FBSyx3QkFBd0IsQ0FBQztBQUMvRCxTQUFLLGtCQUFrQixTQUFTLFlBQVksS0FBSyxTQUFTLE9BQU8sQ0FBQyxTQUFTLEtBQUssU0FBUyxTQUFTLEtBQUssQ0FBQyxFQUFFLE1BQU07QUFDaEgsU0FBSyxrQkFBa0IsU0FBUyxzQkFBWSxLQUFLLGdCQUFnQixDQUFDLE9BQU8sT0FBTyxPQUFPLFFBQVEsTUFBTSxDQUFDLENBQUM7QUFDdkcsU0FBSyxrQkFBa0IsU0FBUyw0QkFBUSxLQUFLLFNBQVMsT0FBTyxDQUFDLFNBQVMsS0FBSyxRQUFRLEVBQUUsTUFBTTtBQUM1RixTQUFLLFNBQVMsS0FBSztBQUFBLE1BQ2pCLEtBQUs7QUFBQSxNQUNMLE1BQU07QUFBQSxJQUNSLENBQUM7QUFDRCxVQUFNLE9BQU8sS0FBSyxTQUFTLE1BQU0sRUFBRSxLQUFLLHNDQUFzQyxDQUFDO0FBQy9FLFFBQUksS0FBSyxTQUFTLFdBQVcsR0FBRztBQUM5QixXQUFLLFNBQVMsTUFBTSxFQUFFLEtBQUssa0JBQWtCLE1BQU0saUxBQWdDLENBQUM7QUFDcEY7QUFBQSxJQUNGO0FBQ0EsU0FBSyxTQUFTLE1BQU0sR0FBRyxFQUFFLEVBQUUsUUFBUSxDQUFDLFNBQVM7QUFDM0MsWUFBTSxNQUFNLEtBQUssU0FBUyxNQUFNLEVBQUUsS0FBSyxxQkFBcUIsQ0FBQztBQUM3RCxZQUFNLE9BQU8sSUFBSSxVQUFVLEVBQUUsS0FBSyxxQkFBcUIsQ0FBQztBQUN4RCxXQUFLLFNBQVMsVUFBVSxFQUFFLE1BQU0sS0FBSyxLQUFLLENBQUM7QUFDM0MsV0FBSyxTQUFTLFFBQVEsRUFBRSxLQUFLLGlCQUFpQixNQUFNLENBQUMsS0FBSyxPQUFPLGlCQUFPLEtBQUssSUFBSSxLQUFLLFFBQVcsS0FBSyxTQUFTLGlCQUFPLEtBQUssTUFBTSxLQUFLLE1BQVMsRUFBRSxPQUFPLE9BQU8sRUFBRSxLQUFLLEtBQUssS0FBSyxLQUFLLFNBQVMsQ0FBQztBQUMvTCxZQUFNLE9BQU8sSUFBSSxVQUFVLEVBQUUsS0FBSyx3QkFBd0IsQ0FBQztBQUMzRCxZQUFNLE9BQU8sS0FBSyxTQUFTLFVBQVUsRUFBRSxLQUFLLHdCQUF3QixNQUFNLGVBQUssQ0FBQztBQUNoRixZQUFNLFNBQVMsS0FBSyxTQUFTLFVBQVUsRUFBRSxLQUFLLCtCQUErQixNQUFNLGVBQUssQ0FBQztBQUN6RixXQUFLLGlCQUFpQixNQUFNLFNBQVMsT0FBTyxVQUFzQjtBQUNoRSxjQUFNLGdCQUFnQjtBQUN0QixjQUFNLEtBQUssT0FBTyxTQUFTLEtBQUssUUFBUTtBQUFBLE1BQzFDLENBQUM7QUFDRCxXQUFLLGlCQUFpQixRQUFRLFNBQVMsT0FBTyxVQUFzQjtBQUNsRSxjQUFNLGdCQUFnQjtBQUN0QixjQUFNLEtBQUssT0FBTyxXQUFXLEtBQUssUUFBUTtBQUFBLE1BQzVDLENBQUM7QUFDRCxXQUFLLGlCQUFpQixLQUFLLFNBQVMsWUFBWSxLQUFLLE9BQU8sU0FBUyxLQUFLLFFBQVEsQ0FBQztBQUFBLElBQ3JGLENBQUM7QUFBQSxFQUNIO0FBQUEsRUFFUSxzQkFBc0IsV0FBd0IsTUFBbUM7QUFDdkYsVUFBTSxPQUFPLFVBQVUsVUFBVSxFQUFFLEtBQUssMkJBQTJCLENBQUM7QUFDcEUsVUFBTSxTQUFTLEtBQUssVUFBVSxFQUFFLEtBQUsseUJBQXlCLENBQUM7QUFDL0QsV0FBTyxTQUFTLE1BQU0sRUFBRSxNQUFNLDJCQUFPLENBQUM7QUFDdEMsVUFBTSxZQUFZLE9BQU8sU0FBUyxVQUFVLEVBQUUsS0FBSyx3QkFBd0IsTUFBTSwyQkFBTyxDQUFDO0FBQ3pGLFNBQUssaUJBQWlCLFdBQVcsU0FBUyxZQUFZLEtBQUssT0FBTyxnQkFBZ0IsQ0FBQztBQUNuRixVQUFNLE1BQU0sS0FBSyxVQUFVLEVBQUUsS0FBSyx5QkFBeUIsQ0FBQztBQUM1RCxRQUFJLE1BQU0sa0JBQWtCLDhFQUE4RSxLQUFLLE9BQU8sb0JBQW9CLENBQUM7QUFDM0ksVUFBTSxTQUFTLEtBQUssT0FDakIsT0FBTyxDQUFDLFVBQVUsT0FBTyxNQUFNLGFBQWEsWUFBWSxPQUFPLE1BQU0sY0FBYyxRQUFRLEVBQzNGLE1BQU0sR0FBRyxFQUFFO0FBQ2QsUUFBSSxPQUFPLFdBQVcsR0FBRztBQUN2QixVQUFJLFNBQVMsS0FBSyxFQUFFLEtBQUsscUNBQXFDLE1BQU0scUtBQThCLENBQUM7QUFBQSxJQUNyRztBQUNBLFdBQU8sUUFBUSxDQUFDLFVBQVU7QUFDeEIsWUFBTSxXQUFXLEtBQUssZ0JBQWdCLEtBQUs7QUFDM0MsWUFBTSxRQUFRLENBQUMsTUFBTSxRQUFRLE1BQU0sTUFBTSxNQUFNLFNBQVMsTUFBTSxTQUFTLEVBQUUsT0FBTyxPQUFPLEVBQUUsS0FBSyxLQUFLO0FBQ25HLFlBQU0sUUFBUSxJQUFJLFNBQVMsVUFBVSxFQUFFLEtBQUssc0JBQXNCLE1BQU0sU0FBSSxDQUFDO0FBQzdFLFlBQU0sTUFBTSxPQUFPLEdBQUcsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQzNDLFlBQU0sTUFBTSxNQUFNLEdBQUcsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQzFDLFlBQU0sYUFBYSxjQUFjLFNBQVMsTUFBTSxJQUFJO0FBQ3BELFlBQU0sYUFBYSxTQUFTLENBQUMsTUFBTSxNQUFNLE1BQU0sU0FBUyxNQUFNLFNBQVMsRUFBRSxPQUFPLE9BQU8sRUFBRSxLQUFLLEtBQUssS0FBSyxNQUFNLElBQUk7QUFDbEgsV0FBSyxpQkFBaUIsT0FBTyxTQUFTLFlBQVksS0FBSyxPQUFPLFNBQVMsTUFBTSxRQUFRLENBQUM7QUFDdEYsV0FBSyxpQkFBaUIsT0FBTyxlQUFlLE9BQU8sVUFBc0I7QUFDdkUsY0FBTSxlQUFlO0FBQ3JCLGNBQU0sS0FBSyxPQUFPLFdBQVcsTUFBTSxRQUFRO0FBQUEsTUFDN0MsQ0FBQztBQUFBLElBQ0gsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUVRLDZCQUE2QixXQUF3QixNQUFtQztBQUM5RixVQUFNLE9BQU8sVUFBVSxVQUFVLEVBQUUsS0FBSyxvQ0FBb0MsQ0FBQztBQUM3RSxTQUFLLFNBQVMsTUFBTSxFQUFFLE1BQU0sMkJBQU8sQ0FBQztBQUNwQyxTQUFLLFNBQVMsS0FBSztBQUFBLE1BQ2pCLEtBQUs7QUFBQSxNQUNMLE1BQU07QUFBQSxJQUNSLENBQUM7QUFFRCxVQUFNLFVBQVUsS0FBSyxVQUFVLEVBQUUsS0FBSyxtQkFBbUIsQ0FBQztBQUMxRCxVQUFNLFVBQVUsUUFBUSxVQUFVLEVBQUUsS0FBSywyQkFBMkIsQ0FBQztBQUNyRSxZQUFRLFNBQVMsTUFBTSxFQUFFLE1BQU0saUNBQVEsQ0FBQztBQUV4QyxVQUFNLGNBQWMsUUFBUSxTQUFTLE1BQU0sRUFBRSxLQUFLLGdCQUFnQixDQUFDO0FBQ25FLFVBQU0sZUFBZSxLQUFLLE1BQU0sT0FBTyxDQUFDLFNBQVMsS0FBSyxXQUFXLE1BQU07QUFDdkUsUUFBSSxhQUFhLFdBQVcsR0FBRztBQUM3QixrQkFBWSxTQUFTLE1BQU0sRUFBRSxLQUFLLGtCQUFrQixNQUFNLDJIQUF1QixDQUFDO0FBQUEsSUFDcEYsT0FBTztBQUNMLG1CQUFhLE1BQU0sR0FBRyxDQUFDLEVBQUUsUUFBUSxDQUFDLFNBQVM7QUFDekMsY0FBTSxNQUFNLFlBQVksU0FBUyxNQUFNLEVBQUUsS0FBSyw2Q0FBNkMsQ0FBQztBQUM1RixZQUFJLGFBQWEsYUFBYSxNQUFNO0FBQ3BDLFlBQUksU0FBUyxVQUFVLEVBQUUsTUFBTSxLQUFLLEtBQUssQ0FBQztBQUMxQyxZQUFJLFNBQVMsUUFBUSxFQUFFLEtBQUssaUJBQWlCLE1BQU0sS0FBSyxXQUFXLGNBQWMseUZBQW1CLG1EQUFXLENBQUM7QUFDaEgsYUFBSyxpQkFBaUIsS0FBSyxhQUFhLENBQUMsVUFBcUI7QUFDNUQsZ0JBQU0sY0FBYyxRQUFRLGNBQWMsS0FBSyxRQUFRO0FBQ3ZELGdCQUFNLGNBQWMsUUFBUSw2QkFBNkIsS0FBSyxRQUFRO0FBQUEsUUFDeEUsQ0FBQztBQUNELGFBQUssaUJBQWlCLEtBQUssWUFBWSxZQUFZLEtBQUssT0FBTyxTQUFTLEtBQUssUUFBUSxDQUFDO0FBQUEsTUFDeEYsQ0FBQztBQUFBLElBQ0g7QUFFQSxVQUFNLFFBQVEsUUFBUSxVQUFVLEVBQUUsS0FBSyxzQkFBc0IsQ0FBQztBQUM5RCxVQUFNLFNBQVMsTUFBTSxVQUFVLEVBQUUsS0FBSyx1QkFBdUIsQ0FBQztBQUM5RCxXQUFPLFVBQVUsRUFBRSxLQUFLLHVCQUF1QixDQUFDO0FBQ2hELGNBQVUsUUFBUSxDQUFDLFFBQVE7QUFDekIsWUFBTSxPQUFPLEtBQUssZ0JBQWdCLElBQUksTUFBTTtBQUM1QyxZQUFNLE9BQU8sT0FBTyxVQUFVLEVBQUUsS0FBSyxzQkFBc0IsQ0FBQztBQUM1RCxXQUFLLFNBQVMsVUFBVSxFQUFFLE1BQU0sSUFBSSxNQUFNLENBQUM7QUFDM0MsV0FBSyxTQUFTLFFBQVEsRUFBRSxLQUFLLGlCQUFpQixNQUFNLEtBQUssQ0FBQztBQUFBLElBQzVELENBQUM7QUFFRCxVQUFNLGdCQUFnQixLQUFLLGVBQWUsS0FBSyxTQUFTO0FBRXhELGVBQVcsUUFBUSxDQUFDLFNBQVM7QUFDM0IsWUFBTSxNQUFNLE1BQU0sVUFBVSxFQUFFLEtBQUssb0JBQW9CLENBQUM7QUFDeEQsVUFBSSxVQUFVLEVBQUUsS0FBSyx1QkFBdUIsTUFBTSxLQUFLLENBQUM7QUFFeEQsZ0JBQVUsUUFBUSxDQUFDLFFBQVE7QUFDekIsY0FBTSxPQUFPLEtBQUssZ0JBQWdCLElBQUksTUFBTTtBQUM1QyxjQUFNLE1BQU0sR0FBRyxJQUFJLElBQUksSUFBSTtBQUMzQixjQUFNLE9BQU8sSUFBSSxVQUFVLEVBQUUsS0FBSyxxQkFBcUIsQ0FBQztBQUN4RCxjQUFNLFVBQVUsY0FBYyxJQUFJLEdBQUcsS0FBSyxDQUFDO0FBQzNDLFlBQUksUUFBUSxTQUFTLEdBQUc7QUFDdEIsZUFBSyxTQUFTLGNBQWM7QUFBQSxRQUM5QjtBQUVBLGFBQUssaUJBQWlCLE1BQU0sWUFBWSxDQUFDLFVBQXFCO0FBQzVELGdCQUFNLGVBQWU7QUFDckIsZUFBSyxTQUFTLGFBQWE7QUFBQSxRQUM3QixDQUFDO0FBQ0QsYUFBSyxpQkFBaUIsTUFBTSxhQUFhLE1BQU07QUFDN0MsZUFBSyxZQUFZLGFBQWE7QUFBQSxRQUNoQyxDQUFDO0FBQ0QsYUFBSyxpQkFBaUIsTUFBTSxRQUFRLE9BQU8sVUFBcUI7QUFDOUQsZ0JBQU0sZUFBZTtBQUNyQixlQUFLLFlBQVksYUFBYTtBQUM5QixnQkFBTSxlQUFlLE1BQU0sY0FBYyxRQUFRLCtCQUErQjtBQUNoRixjQUFJLGNBQWM7QUFDaEIsa0JBQU0sV0FBVyxLQUFLLFVBQVUsS0FBSyxDQUFDLFNBQVMsS0FBSyxhQUFhLFlBQVk7QUFDN0Usa0JBQU0sV0FBVyxVQUFVLG1CQUFtQixLQUFLLHdCQUF3QixNQUFTO0FBQ3BGLGtCQUFNLEtBQUssT0FBTyxrQkFBa0IsY0FBYyxNQUFNLE1BQU0sS0FBSyxtQkFBbUIsTUFBTSxRQUFRLENBQUM7QUFDckc7QUFBQSxVQUNGO0FBQ0EsZ0JBQU0sV0FDSixNQUFNLGNBQWMsUUFBUSwyQkFBMkIsS0FDdkQsTUFBTSxjQUFjLFFBQVEsWUFBWTtBQUMxQyxjQUFJLENBQUMsVUFBVTtBQUNiO0FBQUEsVUFDRjtBQUNBLGdCQUFNLEtBQUssT0FBTywwQkFBMEIsVUFBVSxNQUFNLE1BQU0sS0FBSyxtQkFBbUIsTUFBTSxpQ0FBaUMsQ0FBQztBQUFBLFFBQ3BJLENBQUM7QUFDRCxhQUFLLGlCQUFpQixNQUFNLFlBQVksWUFBWTtBQUNsRCxnQkFBTSxLQUFLLE9BQU8sb0JBQW9CLE1BQU0sTUFBTSxLQUFLLG1CQUFtQixNQUFNLGlDQUFpQyxDQUFDO0FBQUEsUUFDcEgsQ0FBQztBQUVELFlBQUksUUFBUSxXQUFXLEdBQUc7QUFDeEIsZUFBSyxTQUFTLFFBQVEsRUFBRSxLQUFLLHNCQUFzQixNQUFNLDRCQUE0QixDQUFDO0FBQUEsUUFDeEYsT0FBTztBQUNMLGNBQUksUUFBUSxTQUFTLEdBQUc7QUFDdEIsa0JBQU0sY0FBYyxLQUFLLFVBQVUsRUFBRSxLQUFLLHdCQUF3QixDQUFDO0FBQ25FLGtCQUFNLFVBQVUsWUFBWSxTQUFTLFFBQVE7QUFBQSxjQUMzQyxLQUFLO0FBQUEsY0FDTCxNQUFNLEdBQUcsUUFBUSxNQUFNO0FBQUEsWUFDekIsQ0FBQztBQUNELG9CQUFRLGFBQWEsU0FBUyx3SkFBMkI7QUFDekQsa0JBQU0sZ0JBQWdCLFlBQVksU0FBUyxVQUFVO0FBQUEsY0FDbkQsS0FBSztBQUFBLGNBQ0wsTUFBTTtBQUFBLFlBQ1IsQ0FBQztBQUNELGlCQUFLLGlCQUFpQixlQUFlLFNBQVMsT0FBTyxVQUFzQjtBQUN6RSxvQkFBTSxnQkFBZ0I7QUFDdEIsb0JBQU0sVUFBVSxRQUFRLFFBQVEsU0FBUyxDQUFDO0FBQzFDLG9CQUFNLEtBQUssT0FBTywyQkFBMkIsUUFBUSxRQUFRO0FBQUEsWUFDL0QsQ0FBQztBQUFBLFVBQ0g7QUFDQSxrQkFBUSxRQUFRLENBQUMsVUFBVTtBQUN6QixrQkFBTSxPQUFPLEtBQUssVUFBVSxFQUFFLEtBQUsseUJBQXlCLENBQUM7QUFDN0QsaUJBQUssYUFBYSxhQUFhLE1BQU07QUFDckMsaUJBQUssTUFBTSxZQUFZLEdBQUcsS0FBSywwQkFBMEIsTUFBTSxlQUFlLENBQUM7QUFDL0Usa0JBQU0sTUFBTSxLQUFLLFVBQVUsRUFBRSxLQUFLLG9CQUFvQixDQUFDO0FBQ3ZELGdCQUFJLFNBQVMsVUFBVSxFQUFFLE1BQU0sTUFBTSxlQUFlLE1BQU0sS0FBSyxDQUFDO0FBQ2hFLGtCQUFNLFdBQVcsSUFBSSxVQUFVLEVBQUUsS0FBSyx5QkFBeUIsQ0FBQztBQUNoRSxrQkFBTSxlQUFlLFNBQVMsU0FBUyxVQUFVLEVBQUUsS0FBSyx3QkFBd0IsTUFBTSxPQUFPLENBQUM7QUFDOUYsa0JBQU0sZUFBZSxTQUFTLFNBQVMsVUFBVSxFQUFFLEtBQUssd0JBQXdCLE1BQU0sT0FBTyxDQUFDO0FBQzlGLGtCQUFNLGVBQWUsU0FBUyxTQUFTLFVBQVUsRUFBRSxLQUFLLCtCQUErQixNQUFNLGVBQUssQ0FBQztBQUNuRyxpQkFBSyxpQkFBaUIsY0FBYyxTQUFTLE9BQU8sVUFBc0I7QUFDeEUsb0JBQU0sZ0JBQWdCO0FBQ3RCLG9CQUFNLEtBQUssT0FBTyx1QkFBdUIsTUFBTSxVQUFVLEdBQUc7QUFBQSxZQUM5RCxDQUFDO0FBQ0QsaUJBQUssaUJBQWlCLGNBQWMsU0FBUyxPQUFPLFVBQXNCO0FBQ3hFLG9CQUFNLGdCQUFnQjtBQUN0QixvQkFBTSxLQUFLLE9BQU8sdUJBQXVCLE1BQU0sVUFBVSxFQUFFO0FBQUEsWUFDN0QsQ0FBQztBQUNELGlCQUFLLGlCQUFpQixjQUFjLFNBQVMsT0FBTyxVQUFzQjtBQUN4RSxvQkFBTSxnQkFBZ0I7QUFDdEIsb0JBQU0sS0FBSyxPQUFPLFdBQVcsTUFBTSxRQUFRO0FBQUEsWUFDN0MsQ0FBQztBQUNELGlCQUFLLFNBQVMsUUFBUTtBQUFBLGNBQ3BCLEtBQUs7QUFBQSxjQUNMLE1BQU0sR0FBRyxNQUFNLFNBQVMsSUFBSSxJQUFJLE1BQU0sT0FBTyxLQUFLLG1CQUFtQixNQUFNLEtBQUssd0JBQXdCLE1BQU0sZUFBZSxDQUFDLENBQUMsR0FBRyxNQUFNLGtCQUFrQixNQUFNLE1BQU0sZUFBZSxNQUFNLEVBQUU7QUFBQSxZQUMvTCxDQUFDO0FBQ0QsZ0JBQUksTUFBTSxpQkFBaUI7QUFDekIsbUJBQUssU0FBUyxRQUFRLEVBQUUsS0FBSyxpQkFBaUIsTUFBTSxjQUFjLENBQUM7QUFBQSxZQUNyRTtBQUNBLGlCQUFLLGlCQUFpQixNQUFNLGFBQWEsQ0FBQyxVQUFxQjtBQUM3RCxvQkFBTSxjQUFjLFFBQVEsaUNBQWlDLE1BQU0sUUFBUTtBQUMzRSxvQkFBTSxjQUFjLFFBQVEsY0FBYyxNQUFNLFFBQVE7QUFBQSxZQUMxRCxDQUFDO0FBQ0QsaUJBQUssaUJBQWlCLE1BQU0sU0FBUyxZQUFZLEtBQUssT0FBTyxTQUFTLE1BQU0sUUFBUSxDQUFDO0FBQUEsVUFDdkYsQ0FBQztBQUFBLFFBQ0g7QUFBQSxNQUNGLENBQUM7QUFBQSxJQUNILENBQUM7QUFBQSxFQUNIO0FBQUEsRUFFUSxhQUFhLFdBQXdCLE9BQWUsT0FBcUI7QUFDL0UsVUFBTSxTQUFTLFVBQVUsVUFBVSxFQUFFLEtBQUssa0JBQWtCLENBQUM7QUFDN0QsV0FBTyxTQUFTLE9BQU8sRUFBRSxLQUFLLHlCQUF5QixNQUFNLE1BQU0sQ0FBQztBQUNwRSxXQUFPLFNBQVMsT0FBTyxFQUFFLEtBQUsseUJBQXlCLE1BQU0sTUFBTSxDQUFDO0FBQUEsRUFDdEU7QUFBQSxFQUVRLGtCQUFrQixXQUF3QixPQUFlLE9BQXFCO0FBQ3BGLFVBQU0sT0FBTyxVQUFVLFVBQVUsRUFBRSxLQUFLLHdCQUF3QixDQUFDO0FBQ2pFLFNBQUssU0FBUyxVQUFVLEVBQUUsTUFBTSxPQUFPLEtBQUssRUFBRSxDQUFDO0FBQy9DLFNBQUssU0FBUyxRQUFRLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFBQSxFQUN2QztBQUFBLEVBRVEsYUFBYSxXQUF3QixPQUFlLFNBQWlDLFlBQVksT0FBYTtBQUNwSCxVQUFNLFNBQVMsVUFBVSxTQUFTLFVBQVUsRUFBRSxLQUFLLGtCQUFrQixZQUFZLGVBQWUsRUFBRSxJQUFJLE1BQU0sTUFBTSxDQUFDO0FBQ25ILFNBQUssaUJBQWlCLFFBQVEsU0FBUyxZQUFZO0FBQ2pELFVBQUk7QUFDRixjQUFNLFFBQVE7QUFBQSxNQUNoQixTQUFTLE9BQU87QUFDZCxnQkFBUSxNQUFNLEtBQUs7QUFDbkIsWUFBSSx3QkFBTyx5Q0FBcUIsaUJBQWlCLFFBQVEsTUFBTSxVQUFVLDBCQUFNLEVBQUU7QUFBQSxNQUNuRjtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUVRLGdCQUFnQixRQUF3QjtBQUM5QyxVQUFNLE1BQU0sb0JBQUksS0FBSztBQUNyQixVQUFNLE1BQU0sSUFBSSxPQUFPO0FBQ3ZCLFVBQU0sY0FBYyxRQUFRLElBQUksS0FBSyxJQUFJO0FBQ3pDLFVBQU0sU0FBUyxJQUFJLEtBQUssR0FBRztBQUMzQixXQUFPLFFBQVEsSUFBSSxRQUFRLElBQUksY0FBYyxNQUFNO0FBQ25ELFdBQU8sS0FBSyxnQkFBZ0IsTUFBTTtBQUFBLEVBQ3BDO0FBQUEsRUFFUSx3QkFBd0IsaUJBQWtDO0FBQ2hFLFdBQU8sS0FBSyxJQUFJLElBQUksS0FBSyxJQUFJLEtBQUssbUJBQW1CLGlDQUFpQyxDQUFDO0FBQUEsRUFDekY7QUFBQSxFQUVRLG1CQUFtQixPQUFlLGlCQUFrQztBQUMxRSxVQUFNLFdBQVcsS0FBSyx3QkFBd0IsZUFBZTtBQUM3RCxVQUFNLENBQUMsTUFBTSxNQUFNLElBQUksTUFBTSxNQUFNLEdBQUcsRUFBRSxJQUFJLE1BQU07QUFDbEQsVUFBTSxhQUFhLEtBQUssSUFBSSxPQUFPLEtBQUssU0FBUyxVQUFVLEtBQUssS0FBSyxFQUFFO0FBQ3ZFLFVBQU0sVUFBVSxLQUFLLE1BQU0sYUFBYSxFQUFFO0FBQzFDLFVBQU0sWUFBWSxhQUFhO0FBQy9CLFdBQU8sR0FBRyxPQUFPLE9BQU8sRUFBRSxTQUFTLEdBQUcsR0FBRyxDQUFDLElBQUksT0FBTyxTQUFTLEVBQUUsU0FBUyxHQUFHLEdBQUcsQ0FBQztBQUFBLEVBQ2xGO0FBQUEsRUFFUSwwQkFBMEIsaUJBQWtDO0FBQ2xFLFVBQU0sUUFBUSxLQUFLLHdCQUF3QixlQUFlLElBQUk7QUFDOUQsV0FBTyxLQUFLLFFBQVE7QUFBQSxFQUN0QjtBQUFBLEVBRVEsZ0JBQWdCLE9BQWdEO0FBQ3RFLFVBQU0sV0FBVyxNQUFNLFlBQVk7QUFDbkMsVUFBTSxZQUFZLE1BQU0sYUFBYTtBQUdyQyxVQUFNLG9CQUFxQixZQUFZLHVCQUF1QixPQUFPLE1BQU87QUFDNUUsVUFBTSxLQUFNLG1CQUFtQixPQUFPLE1BQU87QUFDN0MsVUFBTSxLQUFNLEtBQUssWUFBWSxNQUFPO0FBQ3BDLFdBQU87QUFBQSxNQUNMLEdBQUcsS0FBSyxJQUFJLEdBQUcsS0FBSyxJQUFJLElBQUksQ0FBQyxDQUFDO0FBQUEsTUFDOUIsR0FBRyxLQUFLLElBQUksR0FBRyxLQUFLLElBQUksSUFBSSxDQUFDLENBQUM7QUFBQSxJQUNoQztBQUFBLEVBQ0Y7QUFBQSxFQUVRLGVBQWUsT0FBNEQ7QUFDakYsVUFBTSxRQUFRLG9CQUFJLElBQWdDO0FBQ2xELFVBQU0sUUFBUSxDQUFDLFNBQVM7QUFDdEIsVUFBSSxDQUFDLEtBQUssT0FBTyxDQUFDLEtBQUssT0FBTztBQUM1QjtBQUFBLE1BQ0Y7QUFDQSxZQUFNLE1BQU0sR0FBRyxLQUFLLEdBQUcsSUFBSSxLQUFLLEtBQUs7QUFDckMsWUFBTSxXQUFXLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQztBQUNwQyxlQUFTLEtBQUssSUFBSTtBQUNsQixZQUFNLElBQUksS0FBSyxRQUFRO0FBQUEsSUFDekIsQ0FBQztBQUNELFdBQU87QUFBQSxFQUNUO0FBQUEsRUFFUSxnQkFBZ0IsVUFBMEI7QUFDaEQsVUFBTSxTQUFTLEtBQUs7QUFDcEIsVUFBTSxTQUFVLE9BRWI7QUFDSCxRQUFJLENBQUMsUUFBUTtBQUNYLGFBQU87QUFBQSxJQUNUO0FBQ0EsV0FBTyxPQUFPLE1BQU0sT0FBTyxDQUFDLFNBQVMsS0FBSyxhQUFhLFFBQVEsRUFBRTtBQUFBLEVBQ25FO0FBQUEsRUFFUSxvQkFBb0IsVUFBMEI7QUFDcEQsVUFBTSxTQUFVLEtBQUssT0FFbEI7QUFDSCxRQUFJLENBQUMsUUFBUTtBQUNYLGFBQU87QUFBQSxJQUNUO0FBQ0EsVUFBTSxTQUFTLE9BQU8sTUFBTSxPQUFPLENBQUMsU0FBUyxLQUFLLGFBQWEsUUFBUTtBQUN2RSxRQUFJLE9BQU8sV0FBVyxHQUFHO0FBQ3ZCLGFBQU87QUFBQSxJQUNUO0FBQ0EsVUFBTSxPQUFPLE9BQU8sT0FBTyxDQUFDLFNBQVMsS0FBSyxXQUFXLE1BQU0sRUFBRTtBQUM3RCxXQUFPLEtBQUssSUFBSSxJQUFJLEtBQUssTUFBTyxPQUFPLE9BQU8sU0FBVSxHQUFHLENBQUM7QUFBQSxFQUM5RDtBQUFBLEVBRVEsb0JBQW9CLFVBQThDO0FBQ3hFLFFBQUksYUFBYSxRQUFRO0FBQ3ZCLGFBQU87QUFBQSxJQUNUO0FBQ0EsUUFBSSxhQUFhLE9BQU87QUFDdEIsYUFBTztBQUFBLElBQ1Q7QUFDQSxXQUFPO0FBQUEsRUFDVDtBQUFBLEVBRVEsZ0JBQWdCLFlBQThCO0FBQ3BELFVBQU0sYUFBYSxJQUFJLElBQUksV0FBVyxJQUFJLENBQUMsU0FBUyxLQUFLLFlBQVksQ0FBQyxDQUFDO0FBQ3ZFLFdBQU8sS0FBSyxJQUFJLE1BQU0sU0FBUyxFQUFFLE9BQU8sQ0FBQyxTQUFTLFdBQVcsSUFBSSxLQUFLLFVBQVUsWUFBWSxDQUFDLENBQUMsRUFBRTtBQUFBLEVBQ2xHO0FBQUEsRUFFUSxnQkFBZ0IsTUFBb0I7QUFDMUMsVUFBTSxPQUFPLEtBQUssWUFBWTtBQUM5QixVQUFNLFFBQVEsT0FBTyxLQUFLLFNBQVMsSUFBSSxDQUFDLEVBQUUsU0FBUyxHQUFHLEdBQUc7QUFDekQsVUFBTSxNQUFNLE9BQU8sS0FBSyxRQUFRLENBQUMsRUFBRSxTQUFTLEdBQUcsR0FBRztBQUNsRCxXQUFPLEdBQUcsSUFBSSxJQUFJLEtBQUssSUFBSSxHQUFHO0FBQUEsRUFDaEM7QUFBQSxFQUVRLGdCQUFpQztBQUN2QyxVQUFNLFFBQU8sb0JBQUksS0FBSyxHQUFFLFNBQVM7QUFDakMsV0FBTyxRQUFRLEtBQUssT0FBTyxLQUFLLFFBQVE7QUFBQSxFQUMxQztBQUFBLEVBRVEscUJBQXFCRCxRQUEwQjtBQUNyRCxVQUFNLFdBQVdBLE9BQU0sVUFBVSxFQUFFLEtBQUssMkJBQTJCLENBQUM7QUFDcEUsYUFBUyxNQUFNLGtCQUFrQixRQUFRLEtBQUssT0FBTyxrQkFBa0IsQ0FBQztBQUFBLEVBQzFFO0FBQUEsRUFFUSxlQUFlLE9BQXNCO0FBQzNDLFNBQUssVUFBVSxNQUFNO0FBQ3JCLFNBQUssVUFBVSxTQUFTLGtCQUFrQjtBQUMxQyxVQUFNLFFBQVEsS0FBSyxVQUFVLFVBQVUsRUFBRSxLQUFLLGlCQUFpQixDQUFDO0FBQ2hFLFVBQU0sU0FBUyxNQUFNLEVBQUUsTUFBTSxtREFBcUIsQ0FBQztBQUNuRCxVQUFNLFNBQVMsS0FBSztBQUFBLE1BQ2xCLE1BQU0saUJBQWlCLFFBQVEsTUFBTSxVQUFVO0FBQUEsSUFDakQsQ0FBQztBQUNELFVBQU0sU0FBUyxLQUFLO0FBQUEsTUFDbEIsTUFBTTtBQUFBLElBQ1IsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUVRLGlCQUFpQixhQUFtRDtBQUMxRSxVQUFNLGVBQWUsR0FBRyxLQUFLLE9BQU8sU0FBUyxlQUFlLFFBQVEsT0FBTyxFQUFFLENBQUM7QUFDOUUsVUFBTSxhQUFhO0FBQUEsTUFDakIsWUFBWTtBQUFBLE1BQ1osWUFBWTtBQUFBLE1BQ1osWUFBWSxTQUFTLE1BQU0sR0FBRyxFQUFFLElBQUksR0FBRyxRQUFRLFVBQVUsRUFBRTtBQUFBLElBQzdELEVBQ0csT0FBTyxDQUFDLFVBQTJCLFFBQVEsS0FBSyxDQUFDLEVBQ2pELElBQUksQ0FBQyxVQUFVLEtBQUssdUJBQXVCLEtBQUssQ0FBQztBQUVwRCxXQUFPLEtBQUssSUFBSSxNQUFNLFNBQVMsRUFDNUIsT0FBTyxDQUFDLFNBQVMsS0FBSyxLQUFLLFdBQVcsWUFBWSxDQUFDLEVBQ25ELE9BQU8sQ0FBQyxTQUFTO0FBQ2hCLFlBQU0sUUFBUSxLQUFLLElBQUksY0FBYyxhQUFhLElBQUk7QUFDdEQsWUFBTSxjQUFjLE9BQU87QUFDM0IsVUFBSSxhQUFhLGFBQWEsWUFBWSxZQUFZLGFBQWEsU0FBUyxZQUFZLE1BQU07QUFDNUYsZUFBTztBQUFBLE1BQ1Q7QUFDQSxZQUFNLGlCQUFpQixLQUFLLHVCQUF1QixLQUFLLElBQUk7QUFDNUQsYUFBTyxXQUFXLEtBQUssQ0FBQyxVQUFVLE1BQU0sU0FBUyxLQUFLLGVBQWUsU0FBUyxLQUFLLENBQUM7QUFBQSxJQUN0RixDQUFDLEVBQ0EsSUFBSSxDQUFDLFVBQVUsRUFBRSxNQUFNLE1BQU0sS0FBSyxvQkFBb0IsS0FBSyxTQUFTLEVBQUUsRUFBRSxFQUN4RSxLQUFLLENBQUMsR0FBRyxNQUFNLEVBQUUsS0FBSyxTQUFTLGNBQWMsRUFBRSxLQUFLLFFBQVEsQ0FBQztBQUFBLEVBQ2xFO0FBQUEsRUFFUSxvQkFBb0IsV0FBeUM7QUFDbkUsVUFBTSxNQUFNLFVBQVUsWUFBWTtBQUNsQyxRQUFJLFFBQVEsTUFBTTtBQUNoQixhQUFPO0FBQUEsSUFDVDtBQUNBLFFBQUksUUFBUSxPQUFPO0FBQ2pCLGFBQU87QUFBQSxJQUNUO0FBQ0EsUUFBSSxDQUFDLE9BQU8sT0FBTyxRQUFRLE9BQU8sUUFBUSxLQUFLLEVBQUUsU0FBUyxHQUFHLEdBQUc7QUFDOUQsYUFBTztBQUFBLElBQ1Q7QUFDQSxXQUFPO0FBQUEsRUFDVDtBQUFBLEVBRVEsdUJBQXVCLE9BQXVCO0FBQ3BELFdBQU8sTUFBTSxZQUFZLEVBQUUsUUFBUSxnQkFBZ0IsRUFBRTtBQUFBLEVBQ3ZEO0FBQ0Y7OztBSC84QkEsSUFBTSxtQkFBMkM7QUFBQSxFQUMvQyxZQUFZO0FBQUEsRUFDWixZQUFZO0FBQUEsRUFDWixnQkFBZ0I7QUFBQSxFQUNoQixrQkFBa0I7QUFBQSxFQUNsQixnQkFBZ0I7QUFBQSxFQUNoQixhQUFhO0FBQUEsRUFDYixZQUFZO0FBQUEsRUFDWixpQkFBaUI7QUFBQSxFQUNqQixVQUFVO0FBQ1o7QUFFQSxJQUFxQixtQkFBckIsY0FBOEMsd0JBQU87QUFBQSxFQUluRCxZQUFZLEtBQVUsVUFBMEI7QUFDOUMsVUFBTSxLQUFLLFFBQVE7QUFKckIsb0JBQW1DO0FBQUEsRUFLbkM7QUFBQSxFQUVBLE1BQU0sU0FBd0I7QUFDNUIsUUFBSTtBQUNGLFdBQUssU0FBUyxjQUFjO0FBQzVCLFlBQU0sS0FBSyxhQUFhO0FBQ3hCLFdBQUssU0FBUyx3QkFBd0I7QUFDdEMsV0FBSyxrQkFBa0I7QUFDdkIsWUFBTSxjQUFjLEtBQUssS0FBSyxLQUFLLFFBQVE7QUFDM0MsV0FBSyxTQUFTLHdCQUF3QjtBQUN0QyxZQUFNLEtBQUssaUJBQWlCO0FBQzVCLFdBQUssU0FBUyw0QkFBNEI7QUFDMUMsWUFBTSxLQUFLLGtCQUFrQjtBQUM3QixXQUFLLFNBQVMsNkJBQTZCO0FBQzNDLFlBQU0sS0FBSyxvQkFBb0I7QUFDL0IsV0FBSyxTQUFTLGdDQUFnQztBQUU5QyxXQUFLO0FBQUEsUUFDSDtBQUFBLFFBQ0EsQ0FBQyxTQUFTLElBQUksc0JBQXNCLE1BQU0sSUFBSTtBQUFBLE1BQ2hEO0FBQ0EsV0FBSztBQUFBLFFBQ0g7QUFBQSxRQUNBLENBQUMsU0FBUyxJQUFJLHNCQUFzQixNQUFNLElBQUk7QUFBQSxNQUNoRDtBQUVBLFdBQUssY0FBYyxnQkFBZ0IsaUJBQWlCLFlBQVk7QUFDOUQsY0FBTSxLQUFLLHNCQUFzQjtBQUFBLE1BQ25DLENBQUM7QUFFRCxXQUFLLFdBQVc7QUFBQSxRQUNkLElBQUk7QUFBQSxRQUNKLE1BQU07QUFBQSxRQUNOLFVBQVUsWUFBWSxLQUFLLHNCQUFzQjtBQUFBLE1BQ25ELENBQUM7QUFFRCxXQUFLLFdBQVc7QUFBQSxRQUNkLElBQUk7QUFBQSxRQUNKLE1BQU07QUFBQSxRQUNOLFVBQVUsWUFBWSxLQUFLLGVBQWU7QUFBQSxNQUM1QyxDQUFDO0FBRUQsV0FBSyxXQUFXO0FBQUEsUUFDZCxJQUFJO0FBQUEsUUFDSixNQUFNO0FBQUEsUUFDTixVQUFVLFlBQVksS0FBSyxlQUFlO0FBQUEsTUFDNUMsQ0FBQztBQUVELFdBQUssV0FBVztBQUFBLFFBQ2QsSUFBSTtBQUFBLFFBQ0osTUFBTTtBQUFBLFFBQ04sVUFBVSxZQUFZLEtBQUssd0JBQXdCO0FBQUEsTUFDckQsQ0FBQztBQUVELFdBQUssV0FBVztBQUFBLFFBQ2QsSUFBSTtBQUFBLFFBQ0osTUFBTTtBQUFBLFFBQ04sVUFBVSxZQUFZLEtBQUssNEJBQTRCO0FBQUEsTUFDekQsQ0FBQztBQUVELFdBQUssV0FBVztBQUFBLFFBQ2QsSUFBSTtBQUFBLFFBQ0osTUFBTTtBQUFBLFFBQ04sVUFBVSxZQUFZLEtBQUssbUJBQW1CO0FBQUEsTUFDaEQsQ0FBQztBQUVELFdBQUssV0FBVztBQUFBLFFBQ2QsSUFBSTtBQUFBLFFBQ0osTUFBTTtBQUFBLFFBQ04sVUFBVSxZQUFZLEtBQUsscUJBQXFCO0FBQUEsTUFDbEQsQ0FBQztBQUVELFdBQUssV0FBVztBQUFBLFFBQ2QsSUFBSTtBQUFBLFFBQ0osTUFBTTtBQUFBLFFBQ04sVUFBVSxZQUFZLEtBQUssZ0JBQWdCO0FBQUEsTUFDN0MsQ0FBQztBQUVELFdBQUssY0FBYyxJQUFJLG1CQUFtQixLQUFLLEtBQUssSUFBSSxDQUFDO0FBRXpELFdBQUssY0FBYyxLQUFLLElBQUksTUFBTSxHQUFHLFVBQVUsTUFBTSxLQUFLLGlCQUFpQixDQUFDLENBQUM7QUFDN0UsV0FBSyxjQUFjLEtBQUssSUFBSSxNQUFNLEdBQUcsVUFBVSxNQUFNLEtBQUssaUJBQWlCLENBQUMsQ0FBQztBQUM3RSxXQUFLLGNBQWMsS0FBSyxJQUFJLE1BQU0sR0FBRyxVQUFVLE1BQU0sS0FBSyxpQkFBaUIsQ0FBQyxDQUFDO0FBQzdFLFdBQUssSUFBSSxVQUFVLGNBQWMsTUFBTTtBQUNyQyxhQUFLLFNBQVMsdUJBQXVCO0FBQ3JDLGFBQUssSUFBSSxVQUFVLG1CQUFtQix5QkFBeUI7QUFDL0QsYUFBSyxLQUFLLHNCQUFzQjtBQUFBLE1BQ2xDLENBQUM7QUFDRCxXQUFLLFNBQVMsaUJBQWlCO0FBQUEsSUFDakMsU0FBUyxPQUFPO0FBQ2QsV0FBSyxTQUFTLGdCQUFnQixpQkFBaUIsUUFBUSxNQUFNLFNBQVMsTUFBTSxVQUFVLE9BQU8sS0FBSyxDQUFDLEVBQUU7QUFDckcsWUFBTTtBQUFBLElBQ1I7QUFBQSxFQUNGO0FBQUEsRUFFQSxNQUFNLFdBQTBCO0FBQzlCLGFBQVMsS0FBSyxVQUFVLE9BQU8sdUJBQXVCO0FBQ3RELFNBQUssSUFBSSxVQUFVLG1CQUFtQix5QkFBeUI7QUFDL0QsU0FBSyxJQUFJLFVBQVUsbUJBQW1CLGtCQUFrQjtBQUFBLEVBQzFEO0FBQUEsRUFFQSxNQUFNLGVBQThCO0FBQ2xDLFNBQUssV0FBVztBQUFBLE1BQ2QsR0FBRztBQUFBLE1BQ0gsR0FBSSxNQUFNLEtBQUssU0FBUztBQUFBLElBQzFCO0FBQUEsRUFDRjtBQUFBLEVBRUEsTUFBTSxlQUE4QjtBQUNsQyxVQUFNLEtBQUssU0FBUyxLQUFLLFFBQVE7QUFDakMsVUFBTSxjQUFjLEtBQUssS0FBSyxLQUFLLFFBQVE7QUFDM0MsVUFBTSxLQUFLLGlCQUFpQjtBQUFBLEVBQzlCO0FBQUEsRUFFQSxNQUFNLG1CQUFtRDtBQUN2RCxRQUFJO0FBQ0YsV0FBSyxzQkFBc0IsTUFBTSxxQkFBcUIsS0FBSyxHQUFHO0FBQzlELGFBQU8sS0FBSztBQUFBLElBQ2QsU0FBUyxPQUFPO0FBQ2QsV0FBSyxTQUFTLDBCQUEwQixpQkFBaUIsUUFBUSxNQUFNLFNBQVMsTUFBTSxVQUFVLE9BQU8sS0FBSyxDQUFDLEVBQUU7QUFDL0csWUFBTTtBQUFBLElBQ1I7QUFBQSxFQUNGO0FBQUEsRUFFQSxNQUFNLHdCQUF1QztBQUMzQyxRQUFJO0FBQ0YsWUFBTSxFQUFFLFVBQVUsSUFBSSxLQUFLO0FBQzNCLFdBQUssU0FBUyxnQkFBZ0I7QUFDOUIsVUFBSSxPQUFPLFVBQVUsZ0JBQWdCLGtCQUFrQixFQUFFLENBQUMsS0FBSztBQUUvRCxVQUFJLENBQUMsTUFBTTtBQUNULGFBQUssU0FBUyxzQkFBc0I7QUFDcEMsZUFBTyxVQUFVLFFBQVEsS0FBSztBQUFBLE1BQ2hDO0FBRUEsVUFBSSxDQUFDLE1BQU07QUFDVCxZQUFJLHdCQUFPLDZFQUFzQjtBQUNqQyxhQUFLLFNBQVMsa0JBQWtCO0FBQ2hDO0FBQUEsTUFDRjtBQUVBLFdBQUssU0FBUywrQkFBK0I7QUFDN0MsWUFBTSxLQUFLLGFBQWEsRUFBRSxNQUFNLG9CQUFvQixPQUFPLENBQUMsR0FBRyxRQUFRLEtBQUssQ0FBQztBQUM3RSxXQUFLLFNBQVMsa0NBQWtDO0FBQ2hELGdCQUFVLGNBQWMsTUFBTSxFQUFFLE9BQU8sS0FBSyxDQUFDO0FBQzdDLGdCQUFVLFdBQVcsSUFBSTtBQUN6QixZQUFNLE9BQU8sS0FBSztBQUNsQixVQUFJLGdCQUFnQix1QkFBdUI7QUFDekMsYUFBSyxTQUFTLDRCQUE0QjtBQUMxQyxjQUFNLEtBQUssYUFBYTtBQUN4QixhQUFLLFNBQVMsK0JBQStCO0FBQUEsTUFDL0MsT0FBTztBQUNMLGFBQUssU0FBUyw0QkFBNEIsS0FBSyxZQUFZLENBQUMsRUFBRTtBQUM5RCxjQUFNLEtBQUssaUJBQWlCO0FBQUEsTUFDOUI7QUFDQSxXQUFLLFNBQVMscUJBQXFCLEtBQUssS0FBSyxZQUFZLENBQUMsRUFBRTtBQUFBLElBQzlELFNBQVMsT0FBTztBQUNkLFdBQUssU0FBUyxrQkFBa0IsaUJBQWlCLFFBQVEsTUFBTSxTQUFTLE1BQU0sVUFBVSxPQUFPLEtBQUssQ0FBQyxFQUFFO0FBQ3ZHLFVBQUksd0JBQU8sc0NBQWtCLGlCQUFpQixRQUFRLE1BQU0sVUFBVSwwQkFBTSxFQUFFO0FBQUEsSUFDaEY7QUFBQSxFQUNGO0FBQUEsRUFFQSxNQUFNLG1CQUFrQztBQUN0QyxVQUFNLFNBQVM7QUFBQSxNQUNiLEdBQUcsS0FBSyxJQUFJLFVBQVUsZ0JBQWdCLGtCQUFrQjtBQUFBLE1BQ3hELEdBQUcsS0FBSyxJQUFJLFVBQVUsZ0JBQWdCLHlCQUF5QjtBQUFBLElBQ2pFO0FBQ0EsVUFBTSxRQUFRO0FBQUEsTUFDWixPQUFPLElBQUksT0FBTyxTQUFTO0FBQ3pCLGNBQU0sT0FBTyxLQUFLO0FBQ2xCLFlBQUksZ0JBQWdCLHVCQUF1QjtBQUN6QyxnQkFBTSxLQUFLLFFBQVE7QUFBQSxRQUNyQjtBQUFBLE1BQ0YsQ0FBQztBQUFBLElBQ0g7QUFBQSxFQUNGO0FBQUEsRUFFQSxNQUFNLGVBQWUsUUFBUSxLQUFLLGFBQWEsVUFBVSxHQUFtQjtBQUMxRSxVQUFNLE9BQU8sTUFBTTtBQUFBLE1BQ2pCLEtBQUs7QUFBQSxNQUNMLEtBQUssU0FBUztBQUFBLE1BQ2Q7QUFBQSxNQUNBLGtCQUFrQixLQUFLO0FBQUEsSUFDekI7QUFDQSxVQUFNLEtBQUssU0FBUyxJQUFJO0FBQ3hCLFdBQU87QUFBQSxFQUNUO0FBQUEsRUFFQSxNQUFNLGVBQWUsUUFBUSxLQUFLLGFBQWEsVUFBVSxHQUFtQjtBQUMxRSxVQUFNLE9BQU8sTUFBTTtBQUFBLE1BQ2pCLEtBQUs7QUFBQSxNQUNMLEtBQUssU0FBUztBQUFBLE1BQ2Q7QUFBQSxNQUNBLGtCQUFrQixLQUFLO0FBQUEsSUFDekI7QUFDQSxVQUFNLEtBQUssU0FBUyxJQUFJO0FBQ3hCLFdBQU87QUFBQSxFQUNUO0FBQUEsRUFFQSxNQUFNLG1CQUFtQixVQUFrQixPQUFnQztBQUN6RSxVQUFNLFdBQVcsS0FBSyxJQUFJLE1BQU0sc0JBQXNCLFFBQVE7QUFDOUQsUUFBSSxFQUFFLG9CQUFvQix5QkFBUTtBQUNoQyxZQUFNLElBQUksTUFBTSw4REFBWTtBQUFBLElBQzlCO0FBRUEsVUFBTSxZQUFZLFNBQVMsR0FBRyxTQUFTLFFBQVEsVUFBUyxvQkFBSSxLQUFLLEdBQUUsWUFBWSxFQUFFLE1BQU0sSUFBSSxFQUFFLENBQUM7QUFDOUYsVUFBTSxPQUFPLE1BQU07QUFBQSxNQUNqQixLQUFLO0FBQUEsTUFDTCxLQUFLLFNBQVM7QUFBQSxNQUNkO0FBQUEsTUFDQSxrQkFBa0IsU0FBUztBQUFBLElBQzdCO0FBRUEsVUFBTSxLQUFLLElBQUksWUFBWSxtQkFBbUIsTUFBTSxDQUFDLGdCQUFnQjtBQUNuRSxrQkFBWSxPQUFPO0FBQ25CLGtCQUFZLE9BQU8sU0FBUztBQUM1QixrQkFBWSxXQUFXLFNBQVM7QUFDaEMsa0JBQVksV0FBVSxvQkFBSSxLQUFLLEdBQUUsWUFBWTtBQUFBLElBQy9DLENBQUM7QUFFRCxVQUFNLEtBQUssU0FBUyxJQUFJO0FBQ3hCLFdBQU87QUFBQSxFQUNUO0FBQUEsRUFFQSxNQUFNLDBCQUF5QztBQUM3QyxVQUFNLGFBQWEsS0FBSyxJQUFJLFVBQVUsY0FBYztBQUNwRCxRQUFJLENBQUMsWUFBWTtBQUNmLFVBQUksd0JBQU8sb0VBQWE7QUFDeEI7QUFBQSxJQUNGO0FBRUEsVUFBTSxRQUFRLEtBQUssSUFBSSxjQUFjLGFBQWEsVUFBVTtBQUM1RCxRQUFJLE9BQU8sYUFBYSxTQUFTLFFBQVE7QUFDdkMsVUFBSSx3QkFBTywwRUFBYztBQUN6QjtBQUFBLElBQ0Y7QUFFQSxVQUFNLEtBQUssbUJBQW1CLFdBQVcsSUFBSTtBQUFBLEVBQy9DO0FBQUEsRUFFQSxNQUFNLHVCQUF1QixVQUFrQixPQUFnQztBQUM3RSxVQUFNLFdBQVcsS0FBSyxJQUFJLE1BQU0sc0JBQXNCLFFBQVE7QUFDOUQsUUFBSSxFQUFFLG9CQUFvQix5QkFBUTtBQUNoQyxZQUFNLElBQUksTUFBTSw4REFBWTtBQUFBLElBQzlCO0FBRUEsVUFBTSxnQkFBZ0IsU0FBUyxHQUFHLFNBQVMsUUFBUSxjQUFhLG9CQUFJLEtBQUssR0FBRSxZQUFZLEVBQUUsTUFBTSxJQUFJLEVBQUUsQ0FBQztBQUN0RyxVQUFNLE9BQU8sTUFBTTtBQUFBLE1BQ2pCLEtBQUs7QUFBQSxNQUNMLEtBQUssU0FBUztBQUFBLE1BQ2Q7QUFBQSxNQUNBLHNCQUFzQixlQUFlLFNBQVMsVUFBVSxTQUFTLElBQUk7QUFBQSxJQUN2RTtBQUVBLFVBQU0sS0FBSyxTQUFTLElBQUk7QUFDeEIsV0FBTztBQUFBLEVBQ1Q7QUFBQSxFQUVBLE1BQU0sbUJBQW1CLFFBQVEsS0FBSyxhQUFhLGNBQWMsR0FBbUI7QUFDbEYsVUFBTSxPQUFPLE1BQU07QUFBQSxNQUNqQixLQUFLO0FBQUEsTUFDTCxLQUFLLFNBQVM7QUFBQSxNQUNkO0FBQUEsTUFDQSxzQkFBc0IsS0FBSztBQUFBLElBQzdCO0FBQ0EsVUFBTSxLQUFLLFNBQVMsSUFBSTtBQUN4QixXQUFPO0FBQUEsRUFDVDtBQUFBLEVBRUEsTUFBTSw0QkFBNEIsZ0JBQStDO0FBQy9FLFVBQU0sV0FBVyxLQUFLLElBQUksTUFBTSxzQkFBc0IsY0FBYztBQUNwRSxRQUFJLEVBQUUsb0JBQW9CLHlCQUFRO0FBQ2hDLFVBQUksd0JBQU8sMEVBQWM7QUFDekIsYUFBTztBQUFBLElBQ1Q7QUFFQSxVQUFNLGVBQWUsT0FBTyxRQUFRLGVBQUssU0FBUyxRQUFRO0FBQUE7QUFBQSw2SkFBdUM7QUFDakcsUUFBSSxDQUFDLGNBQWM7QUFDakIsYUFBTztBQUFBLElBQ1Q7QUFDQSxVQUFNLGdCQUFnQixPQUFPLFFBQVEsNkNBQVUsU0FBUyxRQUFRLDhEQUFZO0FBQzVFLFFBQUksQ0FBQyxlQUFlO0FBQ2xCLGFBQU87QUFBQSxJQUNUO0FBRUEsVUFBTSxRQUFRLEtBQUssSUFBSSxjQUFjLGFBQWEsUUFBUTtBQUMxRCxVQUFNLGNBQWMsT0FBTztBQUMzQixVQUFNLFFBQVEsR0FBRyxTQUFTLFFBQVE7QUFDbEMsVUFBTSxhQUFhLE1BQU0sS0FBSyxJQUFJLE1BQU0sV0FBVyxRQUFRO0FBQzNELFVBQU0sT0FBTyxNQUFNO0FBQUEsTUFDakIsS0FBSztBQUFBLE1BQ0wsS0FBSyxTQUFTO0FBQUEsTUFDZDtBQUFBLE1BQ0EsR0FBRyxzQkFBc0IsT0FBTyxPQUFPLGFBQWEsUUFBUSxFQUFFLEdBQUcsT0FBTyxhQUFhLFlBQVksRUFBRSxDQUFDLENBQUM7QUFBQTtBQUFBLG9DQUVoRyxTQUFTLFFBQVE7QUFBQSxrQ0FDbkIsU0FBUyxJQUFJO0FBQUE7QUFBQTtBQUFBLEVBR3BCLFdBQVcsUUFBUSxzQkFBc0IsRUFBRSxFQUFFLEtBQUssS0FBSyxJQUFJO0FBQUE7QUFBQSxJQUV6RDtBQUVBLFVBQU0sS0FBSyxJQUFJLFlBQVksbUJBQW1CLE1BQU0sQ0FBQyx3QkFBd0I7QUFDM0UsMEJBQW9CLE9BQU87QUFDM0IsMEJBQW9CLFNBQVMsU0FBUztBQUN0QywwQkFBb0IsT0FBTyxPQUFPLGFBQWEsU0FBUyxXQUFXLFlBQVksT0FBTztBQUN0RiwwQkFBb0IsV0FBVyxPQUFPLGFBQWEsYUFBYSxXQUFXLFlBQVksV0FBVztBQUNsRywwQkFBb0IsV0FBVSxvQkFBSSxLQUFLLEdBQUUsWUFBWTtBQUFBLElBQ3ZELENBQUM7QUFFRCxVQUFNLEtBQUssSUFBSSxZQUFZLG1CQUFtQixVQUFVLENBQUMsMEJBQTBCO0FBQ2pGLDRCQUFzQixPQUFPO0FBQzdCLDRCQUFzQixTQUFTO0FBQy9CLDRCQUFzQixXQUFVLG9CQUFJLEtBQUssR0FBRSxZQUFZO0FBQUEsSUFDekQsQ0FBQztBQUVELFFBQUksd0JBQU8seUNBQVcsS0FBSyxRQUFRLEVBQUU7QUFDckMsVUFBTSxLQUFLLGlCQUFpQjtBQUM1QixVQUFNLEtBQUssU0FBUyxJQUFJO0FBQ3hCLFdBQU87QUFBQSxFQUNUO0FBQUEsRUFFQSxNQUFNLDRCQUE0QixVQUFtQztBQUNuRSxVQUFNLFdBQVcsS0FBSyxJQUFJLE1BQU0sc0JBQXNCLFFBQVE7QUFDOUQsUUFBSSxFQUFFLG9CQUFvQix5QkFBUTtBQUNoQyxZQUFNLElBQUksTUFBTSw4REFBWTtBQUFBLElBQzlCO0FBRUEsVUFBTSxXQUFXLFNBQVMsU0FBUyxRQUFRLGlCQUFpQixHQUFHLEVBQUUsS0FBSyxLQUFLO0FBQzNFLFVBQU0sYUFBYSxHQUFHLEtBQUssU0FBUyxlQUFlLFFBQVEsT0FBTyxFQUFFLENBQUMsSUFBSSxRQUFRO0FBQ2pGLFFBQUksQ0FBQyxLQUFLLElBQUksTUFBTSxzQkFBc0IsVUFBVSxHQUFHO0FBQ3JELFlBQU0sS0FBSyxJQUFJLE1BQU0sYUFBYSxVQUFVO0FBQUEsSUFDOUM7QUFDQSxRQUFJLHdCQUFPLHFEQUFhLFVBQVUsRUFBRTtBQUNwQyxVQUFNLEtBQUssaUJBQWlCO0FBQzVCLFdBQU87QUFBQSxFQUNUO0FBQUEsRUFFQSxNQUFNLDRCQUE0QixVQUFpQztBQUNqRSxVQUFNLGFBQWEsTUFBTSxLQUFLLDRCQUE0QixRQUFRO0FBQ2xFLFVBQU0sVUFBVSxLQUFLLElBQUksTUFBTTtBQUMvQixVQUFNLFdBQVcsUUFBUSxjQUFjO0FBQ3ZDLFFBQUksQ0FBQyxVQUFVO0FBQ2IsVUFBSSx3QkFBTyxxREFBYSxVQUFVLEVBQUU7QUFDcEM7QUFBQSxJQUNGO0FBQ0EsVUFBTSxzQkFBTSxhQUFTLGtCQUFLLFVBQVUsVUFBVSxDQUFDO0FBQUEsRUFDakQ7QUFBQSxFQUVBLE1BQU0sOEJBQTZDO0FBQ2pELFVBQU0sYUFBYSxLQUFLLElBQUksVUFBVSxjQUFjO0FBQ3BELFFBQUksQ0FBQyxZQUFZO0FBQ2YsVUFBSSx3QkFBTyxvRUFBYTtBQUN4QjtBQUFBLElBQ0Y7QUFFQSxVQUFNLFFBQVEsS0FBSyxJQUFJLGNBQWMsYUFBYSxVQUFVO0FBQzVELFFBQUksT0FBTyxhQUFhLFNBQVMsUUFBUTtBQUN2QyxVQUFJLHdCQUFPLDBFQUFjO0FBQ3pCO0FBQUEsSUFDRjtBQUVBLFVBQU0sS0FBSyx1QkFBdUIsV0FBVyxJQUFJO0FBQUEsRUFDbkQ7QUFBQSxFQUVBLE1BQU0sbUJBQW1CLFFBQVEsS0FBSyxhQUFhLGNBQWMsR0FBbUI7QUFDbEYsVUFBTSxPQUFPLE1BQU07QUFBQSxNQUNqQixLQUFLO0FBQUEsTUFDTCxLQUFLLFNBQVM7QUFBQSxNQUNkO0FBQUEsTUFDQSxzQkFBc0IsS0FBSztBQUFBLElBQzdCO0FBQ0EsVUFBTSxLQUFLLFNBQVMsSUFBSTtBQUN4QixXQUFPO0FBQUEsRUFDVDtBQUFBLEVBRUEsTUFBTSxxQkFBcUIsUUFBUSxLQUFLLGFBQWEsZ0JBQWdCLEdBQW1CO0FBQ3RGLFVBQU0sT0FBTyxNQUFNO0FBQUEsTUFDakIsS0FBSztBQUFBLE1BQ0wsS0FBSyxTQUFTO0FBQUEsTUFDZDtBQUFBLE1BQ0Esd0JBQXdCLEtBQUs7QUFBQSxJQUMvQjtBQUNBLFVBQU0sS0FBSyxTQUFTLElBQUk7QUFDeEIsV0FBTztBQUFBLEVBQ1Q7QUFBQSxFQUVBLE1BQU0sa0JBQXlDO0FBQzdDLFVBQU0sUUFBUSxNQUFNLGtCQUFrQixRQUFRLEtBQUssR0FBRztBQUN0RCxRQUFJLENBQUMsT0FBTztBQUNWLGFBQU87QUFBQSxJQUNUO0FBQ0EsUUFBSTtBQUNGLFlBQU0sT0FBTyxNQUFNO0FBQUEsUUFDakIsS0FBSztBQUFBLFFBQ0wsS0FBSyxTQUFTO0FBQUEsUUFDZCxNQUFNO0FBQUEsUUFDTjtBQUFBLFVBQ0UsTUFBTTtBQUFBLFVBQ04sTUFBTTtBQUFBLFVBQ04sTUFBTTtBQUFBLFVBQ04sTUFBTTtBQUFBLFVBQ04sTUFBTTtBQUFBLFFBQ1I7QUFBQSxNQUNGO0FBQ0EsWUFBTSxLQUFLLFNBQVMsSUFBSTtBQUN4QixhQUFPO0FBQUEsSUFDVCxTQUFTLE9BQU87QUFDZCxXQUFLLFNBQVMseUJBQXlCLGlCQUFpQixRQUFRLE1BQU0sU0FBUyxNQUFNLFVBQVUsT0FBTyxLQUFLLENBQUMsRUFBRTtBQUM5RyxVQUFJLHdCQUFPLHlDQUFXLGlCQUFpQixRQUFRLE1BQU0sVUFBVSwwQkFBTSxFQUFFO0FBQ3ZFLGFBQU87QUFBQSxJQUNUO0FBQUEsRUFDRjtBQUFBLEVBRUEsTUFBTSxvQkFBb0IsS0FBYSxPQUFlLEtBQTZCO0FBQ2pGLFVBQU0sUUFBUSxHQUFHLEdBQUcsSUFBSSxLQUFLO0FBQzdCLFVBQU0sT0FBTyxNQUFNO0FBQUEsTUFDakIsS0FBSztBQUFBLE1BQ0wsS0FBSyxTQUFTO0FBQUEsTUFDZDtBQUFBLE1BQ0Esc0JBQXNCLEtBQUs7QUFBQSxJQUM3QjtBQUVBLFVBQU0sS0FBSyxJQUFJLFlBQVksbUJBQW1CLE1BQU0sQ0FBQyxnQkFBZ0I7QUFDbkUsa0JBQVksTUFBTTtBQUNsQixrQkFBWSxRQUFRO0FBQ3BCLGtCQUFZLE1BQU07QUFDbEIsa0JBQVksa0JBQWtCLEtBQUssWUFBWSxPQUFPLEdBQUc7QUFDekQsa0JBQVksV0FBVSxvQkFBSSxLQUFLLEdBQUUsWUFBWTtBQUM3QyxVQUFJLE9BQU8sWUFBWSxnQkFBZ0IsVUFBVTtBQUMvQyxvQkFBWSxjQUFjO0FBQUEsTUFDNUI7QUFDQSxVQUFJLE9BQU8sWUFBWSxvQkFBb0IsVUFBVTtBQUNuRCxvQkFBWSxrQkFBa0I7QUFBQSxNQUNoQztBQUFBLElBQ0YsQ0FBQztBQUVELFVBQU0sS0FBSyxTQUFTLElBQUk7QUFDeEIsV0FBTztBQUFBLEVBQ1Q7QUFBQSxFQUVBLE1BQU0sMEJBQTBCLFVBQWtCLEtBQWEsT0FBZSxLQUE0QjtBQUN4RyxVQUFNLFdBQVcsS0FBSyxJQUFJLE1BQU0sc0JBQXNCLFFBQVE7QUFDOUQsUUFBSSxFQUFFLG9CQUFvQix5QkFBUTtBQUNoQyxZQUFNLElBQUksTUFBTSwwRUFBYztBQUFBLElBQ2hDO0FBRUEsVUFBTSxXQUFXO0FBQ2pCLFVBQU0sZ0JBQWdCLEdBQUcsR0FBRyxJQUFJLEtBQUssSUFBSSxTQUFTLFFBQVE7QUFDMUQsVUFBTSxlQUFlLE1BQU07QUFBQSxNQUN6QixLQUFLO0FBQUEsTUFDTCxLQUFLLFNBQVM7QUFBQSxNQUNkO0FBQUEsTUFDQSxzQkFBc0IsYUFBYTtBQUFBLElBQ3JDO0FBRUEsVUFBTSxLQUFLLElBQUksWUFBWSxtQkFBbUIsY0FBYyxDQUFDLGdCQUFnQjtBQUMzRSxrQkFBWSxNQUFNO0FBQ2xCLGtCQUFZLFFBQVE7QUFDcEIsa0JBQVksTUFBTTtBQUNsQixrQkFBWSxrQkFBa0IsS0FBSyxZQUFZLE9BQU8sR0FBRztBQUN6RCxrQkFBWSxjQUFjLFNBQVM7QUFDbkMsa0JBQVksa0JBQWtCLFNBQVM7QUFDdkMsa0JBQVksV0FBVSxvQkFBSSxLQUFLLEdBQUUsWUFBWTtBQUFBLElBQy9DLENBQUM7QUFFRCxVQUFNLEtBQUssSUFBSSxZQUFZLG1CQUFtQixVQUFVLENBQUMsZ0JBQWdCO0FBQ3ZFLGtCQUFZLE9BQU87QUFDbkIsa0JBQVksU0FBUztBQUNyQixrQkFBWSxXQUFVLG9CQUFJLEtBQUssR0FBRSxZQUFZO0FBQUEsSUFDL0MsQ0FBQztBQUVELFFBQUksd0JBQU8sZ0JBQU0sU0FBUyxRQUFRLHVCQUFRLEdBQUcsSUFBSSxLQUFLLEVBQUU7QUFDeEQsVUFBTSxLQUFLLGlCQUFpQjtBQUFBLEVBQzlCO0FBQUEsRUFFQSxNQUFNLGtCQUFrQixjQUFzQixLQUFhLE9BQWUsS0FBNEI7QUFDcEcsVUFBTSxXQUFXLEtBQUssSUFBSSxNQUFNLHNCQUFzQixZQUFZO0FBQ2xFLFFBQUksRUFBRSxvQkFBb0IseUJBQVE7QUFDaEMsWUFBTSxJQUFJLE1BQU0sMEVBQWM7QUFBQSxJQUNoQztBQUVBLFVBQU0sS0FBSyxJQUFJLFlBQVksbUJBQW1CLFVBQVUsQ0FBQyxnQkFBZ0I7QUFDdkUsa0JBQVksT0FBTztBQUNuQixrQkFBWSxNQUFNO0FBQ2xCLGtCQUFZLFFBQVE7QUFDcEIsa0JBQVksTUFBTTtBQUNsQixrQkFBWSxrQkFBa0IsS0FBSyxZQUFZLE9BQU8sR0FBRztBQUN6RCxrQkFBWSxXQUFVLG9CQUFJLEtBQUssR0FBRSxZQUFZO0FBQUEsSUFDL0MsQ0FBQztBQUVELFFBQUksd0JBQU8sd0NBQVUsR0FBRyxJQUFJLEtBQUssRUFBRTtBQUNuQyxVQUFNLEtBQUssaUJBQWlCO0FBQUEsRUFDOUI7QUFBQSxFQUVBLE1BQU0sdUJBQXVCLGNBQXNCLGNBQXFDO0FBQ3RGLFVBQU0sV0FBVyxLQUFLLElBQUksTUFBTSxzQkFBc0IsWUFBWTtBQUNsRSxRQUFJLEVBQUUsb0JBQW9CLHlCQUFRO0FBQ2hDLFlBQU0sSUFBSSxNQUFNLHNGQUFnQjtBQUFBLElBQ2xDO0FBRUEsVUFBTSxLQUFLLElBQUksWUFBWSxtQkFBbUIsVUFBVSxDQUFDLGdCQUFnQjtBQUN2RSxZQUFNLFFBQVEsT0FBTyxZQUFZLFVBQVUsV0FBVyxZQUFZLFFBQVE7QUFDMUUsWUFBTSxrQkFDSixPQUFPLFlBQVksb0JBQW9CLFdBQ25DLFlBQVksa0JBQ1osS0FBSztBQUFBLFFBQ0g7QUFBQSxRQUNBLE9BQU8sWUFBWSxRQUFRLFdBQVcsWUFBWSxNQUFNLEtBQUssV0FBVyxPQUFPLEVBQUU7QUFBQSxNQUNuRjtBQUNOLFlBQU0sZUFBZSxLQUFLLElBQUksSUFBSSxLQUFLLElBQUksS0FBSyxrQkFBa0IsWUFBWSxDQUFDO0FBQy9FLGtCQUFZLFFBQVE7QUFDcEIsa0JBQVksa0JBQWtCO0FBQzlCLGtCQUFZLE1BQU0sS0FBSyxXQUFXLE9BQU8sWUFBWTtBQUNyRCxrQkFBWSxXQUFVLG9CQUFJLEtBQUssR0FBRSxZQUFZO0FBQUEsSUFDL0MsQ0FBQztBQUVELFVBQU0sS0FBSyxpQkFBaUI7QUFBQSxFQUM5QjtBQUFBLEVBRUEsTUFBTSwyQkFBMkIsY0FBcUM7QUFDcEUsVUFBTSxXQUFXLEtBQUssSUFBSSxNQUFNLHNCQUFzQixZQUFZO0FBQ2xFLFFBQUksRUFBRSxvQkFBb0IseUJBQVE7QUFDaEMsWUFBTSxJQUFJLE1BQU0sMEVBQWM7QUFBQSxJQUNoQztBQUVBLFVBQU0sUUFBUSxLQUFLLElBQUksY0FBYyxhQUFhLFFBQVE7QUFDMUQsVUFBTSxjQUFjLE9BQU87QUFDM0IsVUFBTSxhQUFhLE9BQU8sYUFBYSxRQUFRLFdBQVcsWUFBWSxPQUFNLG9CQUFJLEtBQUssR0FBRSxZQUFZLEVBQUUsTUFBTSxHQUFHLEVBQUU7QUFDaEgsVUFBTSxlQUFlLE9BQU8sYUFBYSxVQUFVLFdBQVcsWUFBWSxRQUFRO0FBQ2xGLFVBQU0sV0FDSixPQUFPLGFBQWEsb0JBQW9CLFdBQ3BDLFlBQVksa0JBQ1osS0FBSztBQUFBLE1BQ0g7QUFBQSxNQUNBLE9BQU8sYUFBYSxRQUFRLFdBQVcsWUFBWSxNQUFNLEtBQUssV0FBVyxjQUFjLEVBQUU7QUFBQSxJQUMzRjtBQUVOLFVBQU0sZ0JBQWdCLE1BQU0sS0FBSyxpQkFBaUI7QUFDbEQsVUFBTSxZQUFZLEtBQUssaUJBQWlCLFlBQVksY0FBYyxVQUFVLGNBQWMsV0FBVyxZQUFZO0FBQ2pILFFBQUksQ0FBQyxXQUFXO0FBQ2QsVUFBSSx3QkFBTyxnRkFBZTtBQUMxQjtBQUFBLElBQ0Y7QUFFQSxVQUFNLEtBQUssa0JBQWtCLGNBQWMsVUFBVSxLQUFLLFVBQVUsT0FBTyxVQUFVLEdBQUc7QUFBQSxFQUMxRjtBQUFBLEVBRUEsTUFBTSxTQUFTLE1BQTZCO0FBQzFDLFVBQU0sV0FBaUMsS0FBSyxJQUFJLE1BQU0sc0JBQXNCLElBQUk7QUFDaEYsUUFBSSxFQUFFLG9CQUFvQix5QkFBUTtBQUNoQyxVQUFJLHdCQUFPLGtEQUFVO0FBQ3JCO0FBQUEsSUFDRjtBQUNBLFVBQU0sS0FBSyxJQUFJLFVBQVUsUUFBUSxJQUFJLEVBQUUsU0FBUyxRQUFRO0FBQUEsRUFDMUQ7QUFBQSxFQUVBLE1BQU0sV0FBVyxNQUE2QjtBQUM1QyxVQUFNLFdBQWlDLEtBQUssSUFBSSxNQUFNLHNCQUFzQixJQUFJO0FBQ2hGLFFBQUksRUFBRSxvQkFBb0IseUJBQVE7QUFDaEMsVUFBSSx3QkFBTyxnRkFBZTtBQUMxQjtBQUFBLElBQ0Y7QUFDQSxVQUFNLFlBQVksT0FBTyxRQUFRLGlDQUFRLFNBQVMsUUFBUSxzRkFBZ0I7QUFDMUUsUUFBSSxDQUFDLFdBQVc7QUFDZDtBQUFBLElBQ0Y7QUFDQSxVQUFNLEtBQUssSUFBSSxNQUFNLE1BQU0sVUFBVSxJQUFJO0FBQ3pDLFFBQUksd0JBQU8sc0JBQU8sU0FBUyxRQUFRLEVBQUU7QUFDckMsVUFBTSxLQUFLLGlCQUFpQjtBQUFBLEVBQzlCO0FBQUEsRUFFQSxNQUFjLFNBQVMsTUFBNEI7QUFDakQsVUFBTSxLQUFLLElBQUksVUFBVSxRQUFRLElBQUksRUFBRSxTQUFTLElBQUk7QUFDcEQsUUFBSSx3QkFBTyxrQ0FBbUIsS0FBSyxRQUFRLEVBQUU7QUFDN0MsVUFBTSxLQUFLLGlCQUFpQjtBQUFBLEVBQzlCO0FBQUEsRUFFUSxhQUFhLFFBQXdCO0FBQzNDLFVBQU0sU0FBUSxvQkFBSSxLQUFLLEdBQUUsWUFBWSxFQUFFLFFBQVEsS0FBSyxHQUFHLEVBQUUsTUFBTSxHQUFHLEVBQUU7QUFDcEUsV0FBTyxHQUFHLE1BQU0sSUFBSSxLQUFLO0FBQUEsRUFDM0I7QUFBQSxFQUVRLFlBQVksT0FBZSxLQUFxQjtBQUN0RCxVQUFNLGVBQWUsS0FBSyxjQUFjLEtBQUs7QUFDN0MsVUFBTSxhQUFhLEtBQUssY0FBYyxHQUFHO0FBQ3pDLFdBQU8sS0FBSyxJQUFJLElBQUksYUFBYSxZQUFZO0FBQUEsRUFDL0M7QUFBQSxFQUVRLFdBQVcsT0FBZSxRQUF3QjtBQUN4RCxVQUFNLE9BQU8sS0FBSyxJQUFJLEtBQUssY0FBYyxLQUFLLElBQUksUUFBUSxLQUFLLEtBQUssRUFBRTtBQUN0RSxVQUFNLFFBQVEsS0FBSyxNQUFNLE9BQU8sRUFBRTtBQUNsQyxVQUFNLFVBQVUsT0FBTztBQUN2QixXQUFPLEdBQUcsT0FBTyxLQUFLLEVBQUUsU0FBUyxHQUFHLEdBQUcsQ0FBQyxJQUFJLE9BQU8sT0FBTyxFQUFFLFNBQVMsR0FBRyxHQUFHLENBQUM7QUFBQSxFQUM5RTtBQUFBLEVBRVEsY0FBYyxPQUF1QjtBQUMzQyxVQUFNLENBQUMsT0FBTyxPQUFPLElBQUksTUFBTSxNQUFNLEdBQUcsRUFBRSxJQUFJLE1BQU07QUFDcEQsV0FBTyxRQUFRLEtBQUs7QUFBQSxFQUN0QjtBQUFBLEVBRVEsaUJBQ04sWUFDQSxjQUNBLFVBQ0EsV0FDQSxhQUNvRDtBQUNwRCxVQUFNLFFBQVEsQ0FBQyxTQUFTLFNBQVMsU0FBUyxTQUFTLFNBQVMsT0FBTztBQUNuRSxVQUFNLE9BQU8sS0FBSyxpQkFBaUI7QUFDbkMsVUFBTSxlQUFlLEtBQUssVUFBVSxDQUFDLFFBQVEsUUFBUSxVQUFVO0FBQy9ELFVBQU0sY0FBYyxnQkFBZ0IsSUFBSSxDQUFDLEdBQUcsS0FBSyxNQUFNLFlBQVksR0FBRyxHQUFHLEtBQUssTUFBTSxHQUFHLFlBQVksQ0FBQyxJQUFJO0FBRXhHLGVBQVcsT0FBTyxhQUFhO0FBQzdCLGlCQUFXLFFBQVEsT0FBTztBQUN4QixZQUFJLFFBQVEsY0FBYyxLQUFLLGNBQWMsSUFBSSxLQUFLLEtBQUssY0FBYyxZQUFZLEdBQUc7QUFDdEY7QUFBQSxRQUNGO0FBQ0EsY0FBTSxXQUFXLFVBQVUsS0FBSyxDQUFDLFNBQVMsS0FBSyxhQUFhLGVBQWUsS0FBSyxRQUFRLE9BQU8sS0FBSyxVQUFVLElBQUk7QUFDbEgsWUFBSSxDQUFDLFVBQVU7QUFDYixpQkFBTyxFQUFFLEtBQUssT0FBTyxNQUFNLEtBQUssS0FBSyxXQUFXLE1BQU0sUUFBUSxFQUFFO0FBQUEsUUFDbEU7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUVBLFdBQU87QUFBQSxFQUNUO0FBQUEsRUFFUSxtQkFBNkI7QUFDbkMsVUFBTSxNQUFNLG9CQUFJLEtBQUs7QUFDckIsVUFBTSxNQUFNLElBQUksT0FBTztBQUN2QixVQUFNLGNBQWMsUUFBUSxJQUFJLEtBQUssSUFBSTtBQUN6QyxVQUFNLFNBQVMsSUFBSSxLQUFLLEdBQUc7QUFDM0IsV0FBTyxRQUFRLElBQUksUUFBUSxJQUFJLFdBQVc7QUFDMUMsV0FBTyxNQUFNLEtBQUssRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLEdBQUcsVUFBVTtBQUM3QyxZQUFNLFNBQVMsSUFBSSxLQUFLLE1BQU07QUFDOUIsYUFBTyxRQUFRLE9BQU8sUUFBUSxJQUFJLEtBQUs7QUFDdkMsYUFBTyxnQkFBZ0IsTUFBTTtBQUFBLElBQy9CLENBQUM7QUFBQSxFQUNIO0FBQUEsRUFFQSxTQUFTLFNBQXVCO0FBQzlCLFFBQUk7QUFDRixvQ0FBZSw4QkFBOEIsS0FBSSxvQkFBSSxLQUFLLEdBQUUsWUFBWSxDQUFDLEtBQUssT0FBTztBQUFBLENBQUk7QUFBQSxJQUMzRixTQUFTLFFBQVE7QUFBQSxJQUVqQjtBQUFBLEVBQ0Y7QUFBQSxFQUVRLG9CQUEwQjtBQUNoQyxhQUFTLEtBQUssVUFBVSxJQUFJLHVCQUF1QjtBQUFBLEVBQ3JEO0FBQUEsRUFFQSxtQkFBMkI7QUFDekIsV0FBTyxLQUFLLElBQUksTUFBTSxRQUFRLGdCQUFnQix1Q0FBdUM7QUFBQSxFQUN2RjtBQUFBLEVBRUEsb0JBQTRCO0FBQzFCLFdBQU8sS0FBSyxJQUFJLE1BQU0sUUFBUSxnQkFBZ0Isd0NBQXdDO0FBQUEsRUFDeEY7QUFBQSxFQUVBLHNCQUE4QjtBQUM1QixXQUFPLEtBQUssSUFBSSxNQUFNLFFBQVEsZ0JBQWdCLDJDQUEyQztBQUFBLEVBQzNGO0FBQUEsRUFFQSxNQUFjLG1CQUFrQztBQUM5QyxVQUFNLFVBQVUsS0FBSyxJQUFJLE1BQU07QUFDL0IsUUFBSSxDQUFDLEtBQUssSUFBSSxNQUFNLHNCQUFzQixvQkFBb0IsR0FBRztBQUMvRCxVQUFJO0FBQ0YsY0FBTSxLQUFLLElBQUksTUFBTSxhQUFhLG9CQUFvQjtBQUFBLE1BQ3hELFNBQVMsT0FBTztBQUNkLGNBQU0sVUFBVSxpQkFBaUIsUUFBUSxNQUFNLFVBQVUsT0FBTyxLQUFLO0FBQ3JFLFlBQUksQ0FBQyxRQUFRLFNBQVMsdUJBQXVCLEdBQUc7QUFDOUMsZ0JBQU07QUFBQSxRQUNSO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFFQSxVQUFNLGFBQWE7QUFDbkIsUUFBSSxNQUFNLFFBQVEsT0FBTyxVQUFVLEdBQUc7QUFDcEM7QUFBQSxJQUNGO0FBRUEsUUFBSTtBQUNGLFlBQU0sb0JBQW9CO0FBQzFCLFlBQU0sV0FBVyxrQkFBa0IsY0FBYztBQUNqRCxVQUFJLENBQUMsVUFBVTtBQUNiLGFBQUssU0FBUywrQkFBK0I7QUFDN0M7QUFBQSxNQUNGO0FBRUEsWUFBTSxzQkFBa0I7QUFBQSxRQUN0QjtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQSxLQUFLLFNBQVM7QUFBQSxRQUNkO0FBQUEsUUFDQTtBQUFBLE1BQ0Y7QUFDQSxZQUFNLGFBQVMsd0JBQWEsZUFBZTtBQUMzQyxZQUFNLE9BQU8sT0FBTyxPQUFPLE1BQU0sT0FBTyxZQUFZLE9BQU8sYUFBYSxPQUFPLFVBQVU7QUFDekYsWUFBTSxRQUFRLFlBQVksWUFBWSxJQUFJO0FBQUEsSUFDNUMsU0FBUyxPQUFPO0FBQ2QsWUFBTSxVQUFVLGlCQUFpQixRQUFRLE1BQU0sU0FBUyxNQUFNLFVBQVUsT0FBTyxLQUFLO0FBQ3BGLFdBQUssU0FBUyxvQkFBb0IsT0FBTyxFQUFFO0FBQUEsSUFDN0M7QUFBQSxFQUNGO0FBQUEsRUFFQSxNQUFjLG9CQUFtQztBQUMvQyxVQUFNLEtBQUssbUJBQW1CLHVCQUF1QixjQUFjO0FBQUEsRUFDckU7QUFBQSxFQUVBLE1BQWMsc0JBQXFDO0FBQ2pELFVBQU0sS0FBSyxtQkFBbUIsMEJBQTBCLGlCQUFpQjtBQUFBLEVBQzNFO0FBQUEsRUFFQSxNQUFjLG1CQUFtQixVQUFrQixXQUFrQztBQUNuRixVQUFNLFVBQVUsS0FBSyxJQUFJLE1BQU07QUFDL0IsUUFBSSxDQUFDLEtBQUssSUFBSSxNQUFNLHNCQUFzQixvQkFBb0IsR0FBRztBQUMvRCxVQUFJO0FBQ0YsY0FBTSxLQUFLLElBQUksTUFBTSxhQUFhLG9CQUFvQjtBQUFBLE1BQ3hELFNBQVMsT0FBTztBQUNkLGNBQU0sVUFBVSxpQkFBaUIsUUFBUSxNQUFNLFVBQVUsT0FBTyxLQUFLO0FBQ3JFLFlBQUksQ0FBQyxRQUFRLFNBQVMsdUJBQXVCLEdBQUc7QUFDOUMsZ0JBQU07QUFBQSxRQUNSO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFFQSxVQUFNLGFBQWEsc0JBQXNCLFFBQVE7QUFFakQsUUFBSTtBQUNGLFlBQU0sb0JBQW9CO0FBQzFCLFlBQU0sV0FBVyxrQkFBa0IsY0FBYztBQUNqRCxVQUFJLENBQUMsVUFBVTtBQUNiLGFBQUssU0FBUyxHQUFHLFNBQVMsb0JBQW9CO0FBQzlDO0FBQUEsTUFDRjtBQUVBLFlBQU0sc0JBQWtCO0FBQUEsUUFDdEI7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0EsS0FBSyxTQUFTO0FBQUEsUUFDZDtBQUFBLFFBQ0E7QUFBQSxNQUNGO0FBQ0EsWUFBTSxhQUFTLHdCQUFhLGVBQWU7QUFDM0MsWUFBTSxPQUFPLE9BQU8sT0FBTyxNQUFNLE9BQU8sWUFBWSxPQUFPLGFBQWEsT0FBTyxVQUFVO0FBQ3pGLFlBQU0sUUFBUSxZQUFZLFlBQVksSUFBSTtBQUFBLElBQzVDLFNBQVMsT0FBTztBQUNkLFlBQU0sVUFBVSxpQkFBaUIsUUFBUSxNQUFNLFNBQVMsTUFBTSxVQUFVLE9BQU8sS0FBSztBQUNwRixXQUFLLFNBQVMsR0FBRyxTQUFTLFNBQVMsT0FBTyxFQUFFO0FBQUEsSUFDOUM7QUFBQSxFQUNGO0FBQ0Y7QUFVQSxJQUFNLG9CQUFOLE1BQU0sMkJBQTBCLHVCQUFNO0FBQUEsRUFBdEM7QUFBQTtBQUNFLFNBQVEsYUFBYTtBQUNyQixTQUFRLHNCQUFpQztBQUN6QyxTQUFRLGdCQUFnQjtBQUN4QixTQUFRLHFCQUFnQztBQUN4QyxTQUFRLGlCQUFpQjtBQUFBO0FBQUEsRUFHekIsT0FBTyxRQUFRLEtBQTZDO0FBQzFELFdBQU8sSUFBSSxRQUFRLENBQUMsWUFBWTtBQUM5QixZQUFNLFFBQVEsSUFBSSxtQkFBa0IsR0FBRztBQUN2QyxZQUFNLGVBQWU7QUFDckIsWUFBTSxLQUFLO0FBQUEsSUFDYixDQUFDO0FBQUEsRUFDSDtBQUFBLEVBRUEsU0FBZTtBQUNiLFNBQUssU0FBUywwQkFBTTtBQUNwQixTQUFLLFVBQVUsTUFBTTtBQUVyQixRQUFJLHlCQUFRLEtBQUssU0FBUyxFQUN2QixRQUFRLDBCQUFNLEVBQ2QsUUFBUSxDQUFDLFNBQVMsS0FBSyxlQUFlLHFDQUFpQixFQUFFLFNBQVMsQ0FBQyxVQUFVO0FBQzVFLFdBQUssYUFBYSxNQUFNLEtBQUs7QUFBQSxJQUMvQixDQUFDLENBQUM7QUFFSixRQUFJLHlCQUFRLEtBQUssU0FBUyxFQUN2QixRQUFRLDBCQUFNLEVBQ2QsWUFBWSxDQUFDLGFBQWEsU0FDeEIsVUFBVSxLQUFLLGdCQUFNLEVBQ3JCLFVBQVUsS0FBSyxnQkFBTSxFQUNyQixTQUFTLEtBQUssbUJBQW1CLEVBQ2pDLFNBQVMsQ0FBQyxVQUFVO0FBQ25CLFdBQUssc0JBQXNCLFVBQVUsTUFBTSxNQUFNO0FBQUEsSUFDbkQsQ0FBQyxDQUFDO0FBRU4sUUFBSSx5QkFBUSxLQUFLLFNBQVMsRUFDdkIsUUFBUSxjQUFJLEVBQ1osUUFBUSw2RkFBdUIsRUFDL0IsUUFBUSxDQUFDLFNBQVMsS0FBSyxlQUFlLE9BQU8sRUFBRSxTQUFTLENBQUMsVUFBVTtBQUNsRSxXQUFLLGlCQUFpQixNQUFNLEtBQUs7QUFBQSxJQUNuQyxDQUFDLENBQUM7QUFFSixRQUFJLHlCQUFRLEtBQUssU0FBUyxFQUN2QixRQUFRLDBCQUFNLEVBQ2QsWUFBWSxDQUFDLGFBQWEsU0FDeEIsVUFBVSxLQUFLLGdCQUFNLEVBQ3JCLFVBQVUsS0FBSyxnQkFBTSxFQUNyQixTQUFTLEtBQUssa0JBQWtCLEVBQ2hDLFNBQVMsQ0FBQyxVQUFVO0FBQ25CLFdBQUsscUJBQXFCLFVBQVUsTUFBTSxNQUFNO0FBQUEsSUFDbEQsQ0FBQyxDQUFDO0FBRU4sUUFBSSx5QkFBUSxLQUFLLFNBQVMsRUFDdkIsUUFBUSxjQUFJLEVBQ1osUUFBUSw0RkFBc0IsRUFDOUIsUUFBUSxDQUFDLFNBQVMsS0FBSyxlQUFlLE9BQU8sRUFBRSxTQUFTLENBQUMsVUFBVTtBQUNsRSxXQUFLLGdCQUFnQixNQUFNLEtBQUs7QUFBQSxJQUNsQyxDQUFDLENBQUM7QUFFSixRQUFJLHlCQUFRLEtBQUssU0FBUyxFQUN2QixVQUFVLENBQUMsV0FBVyxPQUFPLGNBQWMsY0FBSSxFQUFFLFFBQVEsTUFBTTtBQUM5RCxXQUFLLGVBQWUsSUFBSTtBQUN4QixXQUFLLE1BQU07QUFBQSxJQUNiLENBQUMsQ0FBQyxFQUNELFVBQVUsQ0FBQyxXQUFXLE9BQU8sT0FBTyxFQUFFLGNBQWMsY0FBSSxFQUFFLFFBQVEsTUFBTTtBQUN2RSxZQUFNLFFBQVEsS0FBSyxXQUFXO0FBQzlCLFVBQUksQ0FBQyxPQUFPO0FBQ1Y7QUFBQSxNQUNGO0FBQ0EsV0FBSyxlQUFlLEtBQUs7QUFDekIsV0FBSyxNQUFNO0FBQUEsSUFDYixDQUFDLENBQUM7QUFBQSxFQUNOO0FBQUEsRUFFQSxVQUFnQjtBQUNkLFNBQUssVUFBVSxNQUFNO0FBQUEsRUFDdkI7QUFBQSxFQUVRLGFBQXVDO0FBQzdDLFFBQUksQ0FBQyxLQUFLLFlBQVk7QUFDcEIsVUFBSSx3QkFBTyx3REFBVztBQUN0QixhQUFPO0FBQUEsSUFDVDtBQUNBLFVBQU0scUJBQXFCLEtBQUssZ0JBQWdCLEtBQUssZ0JBQWdCLEdBQUcsS0FBSyxjQUFJO0FBQ2pGLFFBQUksdUJBQXVCLE1BQU07QUFDL0IsYUFBTztBQUFBLElBQ1Q7QUFDQSxVQUFNLG9CQUFvQixLQUFLLGdCQUFnQixLQUFLLGVBQWUsR0FBRyxJQUFJLGNBQUk7QUFDOUUsUUFBSSxzQkFBc0IsTUFBTTtBQUM5QixhQUFPO0FBQUEsSUFDVDtBQUNBLFVBQU0sWUFBWSxLQUFLLGdCQUFnQixvQkFBb0IsS0FBSyxtQkFBbUI7QUFDbkYsVUFBTSxXQUFXLEtBQUssZ0JBQWdCLG1CQUFtQixLQUFLLGtCQUFrQjtBQUNoRixXQUFPO0FBQUEsTUFDTCxPQUFPLEtBQUs7QUFBQSxNQUNaO0FBQUEsTUFDQTtBQUFBLE1BQ0Esb0JBQW9CLEtBQUs7QUFBQSxNQUN6QixxQkFBcUIsS0FBSztBQUFBLElBQzVCO0FBQUEsRUFDRjtBQUFBLEVBRVEsZ0JBQWdCLEtBQWEsS0FBYSxLQUFhLE9BQThCO0FBQzNGLFVBQU0sUUFBUSxPQUFPLEdBQUc7QUFDeEIsUUFBSSxDQUFDLE9BQU8sU0FBUyxLQUFLLEtBQUssUUFBUSxPQUFPLFFBQVEsS0FBSztBQUN6RCxVQUFJLHdCQUFPLEdBQUcsS0FBSyw0QkFBUSxHQUFHLFdBQU0sR0FBRyx1Q0FBUztBQUNoRCxhQUFPO0FBQUEsSUFDVDtBQUNBLFdBQU8sS0FBSyxNQUFNLFFBQVEsR0FBRyxJQUFJO0FBQUEsRUFDbkM7QUFBQSxFQUVRLGdCQUFnQixPQUFlLFlBQTJDO0FBQ2hGLFVBQU0sU0FBUyxlQUFlLE9BQU8sZUFBZSxNQUFNLENBQUMsUUFBUTtBQUNuRSxXQUFPLEtBQUssTUFBTSxTQUFTLEdBQUcsSUFBSTtBQUFBLEVBQ3BDO0FBQ0Y7IiwKICAibmFtZXMiOiBbImltcG9ydF9vYnNpZGlhbiIsICJpbXBvcnRfb2JzaWRpYW4iLCAiaW1wb3J0X29ic2lkaWFuIiwgInNoZWxsIiwgIml0ZW0iXQp9Cg==
