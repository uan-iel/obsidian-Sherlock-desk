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
      const message = error instanceof Error ? error.stack ?? error.message : String(error);
      this.debugLog(`onload:error:${message}`);
      new import_obsidian4.Notice(`Sherlock OS \u52A0\u8F7D\u5931\u8D25\uFF1A${message}`);
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
    console.log(`[Sherlock OS] ${message}`);
  }
  enableGlobalStyle() {
    document.body.classList.add("sherlock-global-style");
  }
  getEntryImageUrl() {
    return this.app.vault.adapter.getResourcePath(
      `.obsidian/plugins/${this.manifest.id}/assets/sherlock-entry.png`
    );
  }
  getParlorImageUrl() {
    return this.app.vault.adapter.getResourcePath(
      `.obsidian/plugins/${this.manifest.id}/assets/sherlock-parlor.png`
    );
  }
  getWorldMapImageUrl() {
    return this.app.vault.adapter.getResourcePath(
      `.obsidian/plugins/${this.manifest.id}/assets/sherlock-world-map.png`
    );
  }
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2RhdGEudHMiLCAic3JjL3NldHRpbmdzLnRzIiwgInNyYy92aWV3LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQge1xuICBBcHAsXG4gIE5vdGljZSxcbiAgUGx1Z2luLFxuICBQbHVnaW5NYW5pZmVzdCxcbiAgVEFic3RyYWN0RmlsZSxcbiAgVEZpbGUsXG4gIFdvcmtzcGFjZUxlYWZcbn0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSBcInBhdGhcIjtcbmltcG9ydCB7IHNoZWxsIH0gZnJvbSBcImVsZWN0cm9uXCI7XG5pbXBvcnQge1xuICBidWlsZENhc2VUZW1wbGF0ZSxcbiAgYnVpbGRDb2xsZWN0aW9uVGVtcGxhdGUsXG4gIGJ1aWxkRXZpZGVuY2VUZW1wbGF0ZSxcbiAgYnVpbGRQbGFjZVRlbXBsYXRlLFxuICBidWlsZFNjaGVkdWxlVGVtcGxhdGUsXG4gIGJ1aWxkVGFza1RlbXBsYXRlLFxuICBjb2xsZWN0V29ya3NwYWNlRGF0YSxcbiAgY3JlYXRlVHlwZWROb3RlLFxuICBlbnN1cmVGb2xkZXJzLFxuICBmb3JtYXRMb2NhbERhdGVcbn0gZnJvbSBcIi4vZGF0YVwiO1xuaW1wb3J0IHsgU2hlcmxvY2tTZXR0aW5nVGFiIH0gZnJvbSBcIi4vc2V0dGluZ3NcIjtcbmltcG9ydCB0eXBlIHsgU2hlcmxvY2tQbHVnaW5TZXR0aW5ncywgU2hlcmxvY2tXb3Jrc3BhY2VEYXRhIH0gZnJvbSBcIi4vdHlwZXNcIjtcbmltcG9ydCB7IExFR0FDWV9TSEVSTE9DS19WSUVXX1RZUEUsIFNoZXJsb2NrV29ya3NwYWNlVmlldywgU0hFUkxPQ0tfVklFV19UWVBFIH0gZnJvbSBcIi4vdmlld1wiO1xuXG5jb25zdCBERUZBVUxUX1NFVFRJTkdTOiBTaGVybG9ja1BsdWdpblNldHRpbmdzID0ge1xuICBjYXNlRm9sZGVyOiBcIlNoZXJsb2NrIE9TL0Nhc2VzXCIsXG4gIHRhc2tGb2xkZXI6IFwiU2hlcmxvY2sgT1MvVGFza3NcIixcbiAgc2NoZWR1bGVGb2xkZXI6IFwiU2hlcmxvY2sgT1MvU2NoZWR1bGVzXCIsXG4gIGNvbGxlY3Rpb25Gb2xkZXI6IFwiU2hlcmxvY2sgT1MvQ29sbGVjdGlvbnNcIixcbiAgZXZpZGVuY2VGb2xkZXI6IFwiU2hlcmxvY2sgT1MvRXZpZGVuY2VcIixcbiAgcGxhY2VGb2xkZXI6IFwiU2hlcmxvY2sgT1MvUGxhY2VzXCIsXG4gIGZvZ0RlbnNpdHk6IDQ4LFxuICBtb3Rpb25JbnRlbnNpdHk6IDM2LFxuICBsYW1wR2xvdzogNThcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNoZXJsb2NrT1NQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuICBzZXR0aW5nczogU2hlcmxvY2tQbHVnaW5TZXR0aW5ncyA9IERFRkFVTFRfU0VUVElOR1M7XG4gIGxhdGVzdFdvcmtzcGFjZURhdGE/OiBTaGVybG9ja1dvcmtzcGFjZURhdGE7XG5cbiAgY29uc3RydWN0b3IoYXBwOiBBcHAsIG1hbmlmZXN0OiBQbHVnaW5NYW5pZmVzdCkge1xuICAgIHN1cGVyKGFwcCwgbWFuaWZlc3QpO1xuICB9XG5cbiAgYXN5bmMgb25sb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICB0aGlzLmRlYnVnTG9nKFwib25sb2FkOnN0YXJ0XCIpO1xuICAgICAgYXdhaXQgdGhpcy5sb2FkU2V0dGluZ3MoKTtcbiAgICAgIHRoaXMuZGVidWdMb2coXCJvbmxvYWQ6c2V0dGluZ3MtbG9hZGVkXCIpO1xuICAgICAgdGhpcy5lbmFibGVHbG9iYWxTdHlsZSgpO1xuICAgICAgYXdhaXQgZW5zdXJlRm9sZGVycyh0aGlzLmFwcCwgdGhpcy5zZXR0aW5ncyk7XG4gICAgICB0aGlzLmRlYnVnTG9nKFwib25sb2FkOmZvbGRlcnMtZW5zdXJlZFwiKTtcblxuICAgICAgdGhpcy5yZWdpc3RlclZpZXcoXG4gICAgICAgIFNIRVJMT0NLX1ZJRVdfVFlQRSxcbiAgICAgICAgKGxlYWYpID0+IG5ldyBTaGVybG9ja1dvcmtzcGFjZVZpZXcobGVhZiwgdGhpcylcbiAgICAgICk7XG4gICAgICB0aGlzLnJlZ2lzdGVyVmlldyhcbiAgICAgICAgTEVHQUNZX1NIRVJMT0NLX1ZJRVdfVFlQRSxcbiAgICAgICAgKGxlYWYpID0+IG5ldyBTaGVybG9ja1dvcmtzcGFjZVZpZXcobGVhZiwgdGhpcylcbiAgICAgICk7XG5cbiAgICAgIHRoaXMuYWRkUmliYm9uSWNvbihcInNlYXJjaC1jaGVja1wiLCBcIk9wZW4gU2hlcmxvY2tcIiwgYXN5bmMgKCkgPT4ge1xuICAgICAgICBhd2FpdCB0aGlzLmFjdGl2YXRlV29ya3NwYWNlVmlldygpO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgIGlkOiBcIm9wZW4tc2hlcmxvY2std29ya3NwYWNlXCIsXG4gICAgICAgIG5hbWU6IFwiT3BlbiBTaGVybG9jayB3b3Jrc3BhY2VcIixcbiAgICAgICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHRoaXMuYWN0aXZhdGVXb3Jrc3BhY2VWaWV3KClcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICBpZDogXCJjcmVhdGUtY2FzZS1maWxlXCIsXG4gICAgICAgIG5hbWU6IFwiQ3JlYXRlIGEgbmV3IGNhc2UgZmlsZVwiLFxuICAgICAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4gdGhpcy5jcmVhdGVDYXNlTm90ZSgpXG4gICAgICB9KTtcblxuICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgaWQ6IFwiY3JlYXRlLXRhc2stZmlsZVwiLFxuICAgICAgICBuYW1lOiBcIkNyZWF0ZSBhIG5ldyB0YXNrIGZpbGVcIixcbiAgICAgICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHRoaXMuY3JlYXRlVGFza05vdGUoKVxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgIGlkOiBcImNyZWF0ZS10YXNrLWZvci1hY3RpdmUtY2FzZVwiLFxuICAgICAgICBuYW1lOiBcIkNyZWF0ZSBhIHRhc2sgZm9yIHRoZSBjdXJyZW50IGNhc2VcIixcbiAgICAgICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHRoaXMuY3JlYXRlVGFza0ZvckFjdGl2ZUNhc2UoKVxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgIGlkOiBcImNyZWF0ZS1ldmlkZW5jZS1mb3ItYWN0aXZlLWNhc2VcIixcbiAgICAgICAgbmFtZTogXCJDcmVhdGUgZXZpZGVuY2UgZm9yIHRoZSBjdXJyZW50IGNhc2VcIixcbiAgICAgICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHRoaXMuY3JlYXRlRXZpZGVuY2VGb3JBY3RpdmVDYXNlKClcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICBpZDogXCJjcmVhdGUtc2NoZWR1bGUtZmlsZVwiLFxuICAgICAgICBuYW1lOiBcIkNyZWF0ZSBhIG5ldyBzY2hlZHVsZSBmaWxlXCIsXG4gICAgICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB0aGlzLmNyZWF0ZVNjaGVkdWxlTm90ZSgpXG4gICAgICB9KTtcblxuICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgaWQ6IFwiY3JlYXRlLWNvbGxlY3Rpb24tZmlsZVwiLFxuICAgICAgICBuYW1lOiBcIkNyZWF0ZSBhIG5ldyBjb2xsZWN0aW9uIGl0ZW1cIixcbiAgICAgICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHRoaXMuY3JlYXRlQ29sbGVjdGlvbk5vdGUoKVxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgIGlkOiBcImNyZWF0ZS1wbGFjZS1maWxlXCIsXG4gICAgICAgIG5hbWU6IFwiQ3JlYXRlIGEgbmV3IGZvb3RwcmludCBwbGFjZVwiLFxuICAgICAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4gdGhpcy5jcmVhdGVQbGFjZU5vdGUoKVxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuYWRkU2V0dGluZ1RhYihuZXcgU2hlcmxvY2tTZXR0aW5nVGFiKHRoaXMuYXBwLCB0aGlzKSk7XG5cbiAgICAgIHRoaXMucmVnaXN0ZXJFdmVudCh0aGlzLmFwcC52YXVsdC5vbihcImNyZWF0ZVwiLCAoKSA9PiB0aGlzLnJlZnJlc2hXb3Jrc3BhY2UoKSkpO1xuICAgICAgdGhpcy5yZWdpc3RlckV2ZW50KHRoaXMuYXBwLnZhdWx0Lm9uKFwibW9kaWZ5XCIsICgpID0+IHRoaXMucmVmcmVzaFdvcmtzcGFjZSgpKSk7XG4gICAgICB0aGlzLnJlZ2lzdGVyRXZlbnQodGhpcy5hcHAudmF1bHQub24oXCJkZWxldGVcIiwgKCkgPT4gdGhpcy5yZWZyZXNoV29ya3NwYWNlKCkpKTtcbiAgICAgIHRoaXMuYXBwLndvcmtzcGFjZS5vbkxheW91dFJlYWR5KCgpID0+IHtcbiAgICAgICAgdGhpcy5kZWJ1Z0xvZyhcImxheW91dC1yZWFkeTphY3RpdmF0ZVwiKTtcbiAgICAgICAgdGhpcy5hcHAud29ya3NwYWNlLmRldGFjaExlYXZlc09mVHlwZShMRUdBQ1lfU0hFUkxPQ0tfVklFV19UWVBFKTtcbiAgICAgICAgdm9pZCB0aGlzLmFjdGl2YXRlV29ya3NwYWNlVmlldygpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLmRlYnVnTG9nKFwib25sb2FkOmNvbXBsZXRlXCIpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLnN0YWNrID8/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xuICAgICAgdGhpcy5kZWJ1Z0xvZyhgb25sb2FkOmVycm9yOiR7bWVzc2FnZX1gKTtcbiAgICAgIG5ldyBOb3RpY2UoYFNoZXJsb2NrIE9TIFx1NTJBMFx1OEY3RFx1NTkzMVx1OEQyNVx1RkYxQSR7bWVzc2FnZX1gKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBvbnVubG9hZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5yZW1vdmUoXCJzaGVybG9jay1nbG9iYWwtc3R5bGVcIik7XG4gICAgdGhpcy5hcHAud29ya3NwYWNlLmRldGFjaExlYXZlc09mVHlwZShMRUdBQ1lfU0hFUkxPQ0tfVklFV19UWVBFKTtcbiAgICB0aGlzLmFwcC53b3Jrc3BhY2UuZGV0YWNoTGVhdmVzT2ZUeXBlKFNIRVJMT0NLX1ZJRVdfVFlQRSk7XG4gIH1cblxuICBhc3luYyBsb2FkU2V0dGluZ3MoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5zZXR0aW5ncyA9IHtcbiAgICAgIC4uLkRFRkFVTFRfU0VUVElOR1MsXG4gICAgICAuLi4oYXdhaXQgdGhpcy5sb2FkRGF0YSgpKVxuICAgIH07XG4gIH1cblxuICBhc3luYyBzYXZlU2V0dGluZ3MoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5zYXZlRGF0YSh0aGlzLnNldHRpbmdzKTtcbiAgICBhd2FpdCBlbnN1cmVGb2xkZXJzKHRoaXMuYXBwLCB0aGlzLnNldHRpbmdzKTtcbiAgICBhd2FpdCB0aGlzLnJlZnJlc2hXb3Jrc3BhY2UoKTtcbiAgfVxuXG4gIGFzeW5jIGdldFdvcmtzcGFjZURhdGEoKTogUHJvbWlzZTxTaGVybG9ja1dvcmtzcGFjZURhdGE+IHtcbiAgICB0cnkge1xuICAgICAgdGhpcy5sYXRlc3RXb3Jrc3BhY2VEYXRhID0gYXdhaXQgY29sbGVjdFdvcmtzcGFjZURhdGEodGhpcy5hcHApO1xuICAgICAgcmV0dXJuIHRoaXMubGF0ZXN0V29ya3NwYWNlRGF0YTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5kZWJ1Z0xvZyhgZ2V0V29ya3NwYWNlRGF0YTplcnJvcjoke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5zdGFjayA/PyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGFjdGl2YXRlV29ya3NwYWNlVmlldygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyB3b3Jrc3BhY2UgfSA9IHRoaXMuYXBwO1xuICAgICAgdGhpcy5kZWJ1Z0xvZyhcImFjdGl2YXRlOnN0YXJ0XCIpO1xuICAgICAgbGV0IGxlYWYgPSB3b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKFNIRVJMT0NLX1ZJRVdfVFlQRSlbMF0gPz8gbnVsbDtcblxuICAgICAgaWYgKCFsZWFmKSB7XG4gICAgICAgIHRoaXMuZGVidWdMb2coXCJhY3RpdmF0ZTpjcmVhdGUtbGVhZlwiKTtcbiAgICAgICAgbGVhZiA9IHdvcmtzcGFjZS5nZXRMZWFmKFwidGFiXCIpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWxlYWYpIHtcbiAgICAgICAgbmV3IE5vdGljZShcIlNoZXJsb2NrIFx1NjVFMFx1NkNENVx1NjI1M1x1NUYwMFx1NEUzQlx1NURFNVx1NEY1Q1x1NTMzQVx1ODlDNlx1NTZGRVx1MzAwMlwiKTtcbiAgICAgICAgdGhpcy5kZWJ1Z0xvZyhcImFjdGl2YXRlOm5vLWxlYWZcIik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdGhpcy5kZWJ1Z0xvZyhcImFjdGl2YXRlOnNldC12aWV3LXN0YXRlOnN0YXJ0XCIpO1xuICAgICAgYXdhaXQgbGVhZi5zZXRWaWV3U3RhdGUoeyB0eXBlOiBTSEVSTE9DS19WSUVXX1RZUEUsIHN0YXRlOiB7fSwgYWN0aXZlOiB0cnVlIH0pO1xuICAgICAgdGhpcy5kZWJ1Z0xvZyhcImFjdGl2YXRlOnNldC12aWV3LXN0YXRlOmNvbXBsZXRlXCIpO1xuICAgICAgd29ya3NwYWNlLnNldEFjdGl2ZUxlYWYobGVhZiwgeyBmb2N1czogdHJ1ZSB9KTtcbiAgICAgIHdvcmtzcGFjZS5yZXZlYWxMZWFmKGxlYWYpO1xuICAgICAgY29uc3QgdmlldyA9IGxlYWYudmlldztcbiAgICAgIGlmICh2aWV3IGluc3RhbmNlb2YgU2hlcmxvY2tXb3Jrc3BhY2VWaWV3KSB7XG4gICAgICAgIHRoaXMuZGVidWdMb2coXCJhY3RpdmF0ZTpyZXNldC1lbnRyeTpzdGFydFwiKTtcbiAgICAgICAgYXdhaXQgdmlldy5yZXNldFRvRW50cnkoKTtcbiAgICAgICAgdGhpcy5kZWJ1Z0xvZyhcImFjdGl2YXRlOnJlc2V0LWVudHJ5OmNvbXBsZXRlXCIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5kZWJ1Z0xvZyhgYWN0aXZhdGU6dW5leHBlY3RlZC12aWV3OiR7dmlldy5nZXRWaWV3VHlwZSgpfWApO1xuICAgICAgICBhd2FpdCB0aGlzLnJlZnJlc2hXb3Jrc3BhY2UoKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuZGVidWdMb2coYGFjdGl2YXRlOmNvbXBsZXRlOiR7bGVhZi52aWV3LmdldFZpZXdUeXBlKCl9YCk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMuZGVidWdMb2coYGFjdGl2YXRlOmVycm9yOiR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLnN0YWNrID8/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgICAgbmV3IE5vdGljZShgU2hlcmxvY2sgXHU2MjUzXHU1RjAwXHU1OTMxXHU4RDI1OiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogXCJcdTY3MkFcdTc3RTVcdTk1MTlcdThCRUZcIn1gKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyByZWZyZXNoV29ya3NwYWNlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGxlYXZlcyA9IFtcbiAgICAgIC4uLnRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoU0hFUkxPQ0tfVklFV19UWVBFKSxcbiAgICAgIC4uLnRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoTEVHQUNZX1NIRVJMT0NLX1ZJRVdfVFlQRSlcbiAgICBdO1xuICAgIGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgbGVhdmVzLm1hcChhc3luYyAobGVhZikgPT4ge1xuICAgICAgICBjb25zdCB2aWV3ID0gbGVhZi52aWV3O1xuICAgICAgICBpZiAodmlldyBpbnN0YW5jZW9mIFNoZXJsb2NrV29ya3NwYWNlVmlldykge1xuICAgICAgICAgIGF3YWl0IHZpZXcucmVmcmVzaCgpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICk7XG4gIH1cblxuICBhc3luYyBjcmVhdGVDYXNlTm90ZSh0aXRsZSA9IHRoaXMuZGVmYXVsdFRpdGxlKFwiTmV3IENhc2VcIikpOiBQcm9taXNlPFRGaWxlPiB7XG4gICAgY29uc3QgZmlsZSA9IGF3YWl0IGNyZWF0ZVR5cGVkTm90ZShcbiAgICAgIHRoaXMuYXBwLFxuICAgICAgdGhpcy5zZXR0aW5ncy5jYXNlRm9sZGVyLFxuICAgICAgdGl0bGUsXG4gICAgICBidWlsZENhc2VUZW1wbGF0ZSh0aXRsZSlcbiAgICApO1xuICAgIGF3YWl0IHRoaXMub3BlbkZpbGUoZmlsZSk7XG4gICAgcmV0dXJuIGZpbGU7XG4gIH1cblxuICBhc3luYyBjcmVhdGVUYXNrTm90ZSh0aXRsZSA9IHRoaXMuZGVmYXVsdFRpdGxlKFwiTmV3IFRhc2tcIikpOiBQcm9taXNlPFRGaWxlPiB7XG4gICAgY29uc3QgZmlsZSA9IGF3YWl0IGNyZWF0ZVR5cGVkTm90ZShcbiAgICAgIHRoaXMuYXBwLFxuICAgICAgdGhpcy5zZXR0aW5ncy50YXNrRm9sZGVyLFxuICAgICAgdGl0bGUsXG4gICAgICBidWlsZFRhc2tUZW1wbGF0ZSh0aXRsZSlcbiAgICApO1xuICAgIGF3YWl0IHRoaXMub3BlbkZpbGUoZmlsZSk7XG4gICAgcmV0dXJuIGZpbGU7XG4gIH1cblxuICBhc3luYyBjcmVhdGVUYXNrRnJvbUNhc2UoY2FzZVBhdGg6IHN0cmluZywgdGl0bGU/OiBzdHJpbmcpOiBQcm9taXNlPFRGaWxlPiB7XG4gICAgY29uc3QgYWJzdHJhY3QgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoY2FzZVBhdGgpO1xuICAgIGlmICghKGFic3RyYWN0IGluc3RhbmNlb2YgVEZpbGUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJcdTYyN0VcdTRFMERcdTUyMzBcdTVCRjlcdTVFOTRcdTY4NDhcdTRFRjZcdTY1ODdcdTRFRjZcdTMwMDJcIik7XG4gICAgfVxuXG4gICAgY29uc3QgdGFza1RpdGxlID0gdGl0bGUgPz8gYCR7YWJzdHJhY3QuYmFzZW5hbWV9IExlYWQgJHtuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc2xpY2UoMTEsIDE2KX1gO1xuICAgIGNvbnN0IGZpbGUgPSBhd2FpdCBjcmVhdGVUeXBlZE5vdGUoXG4gICAgICB0aGlzLmFwcCxcbiAgICAgIHRoaXMuc2V0dGluZ3MudGFza0ZvbGRlcixcbiAgICAgIHRhc2tUaXRsZSxcbiAgICAgIGJ1aWxkVGFza1RlbXBsYXRlKHRhc2tUaXRsZSlcbiAgICApO1xuXG4gICAgYXdhaXQgdGhpcy5hcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGZpbGUsIChmcm9udG1hdHRlcikgPT4ge1xuICAgICAgZnJvbnRtYXR0ZXIudHlwZSA9IFwidGFza1wiO1xuICAgICAgZnJvbnRtYXR0ZXIuY2FzZSA9IGFic3RyYWN0LmJhc2VuYW1lO1xuICAgICAgZnJvbnRtYXR0ZXIuY2FzZVBhdGggPSBhYnN0cmFjdC5wYXRoO1xuICAgICAgZnJvbnRtYXR0ZXIudXBkYXRlZCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICB9KTtcblxuICAgIGF3YWl0IHRoaXMub3BlbkZpbGUoZmlsZSk7XG4gICAgcmV0dXJuIGZpbGU7XG4gIH1cblxuICBhc3luYyBjcmVhdGVUYXNrRm9yQWN0aXZlQ2FzZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBhY3RpdmVGaWxlID0gdGhpcy5hcHAud29ya3NwYWNlLmdldEFjdGl2ZUZpbGUoKTtcbiAgICBpZiAoIWFjdGl2ZUZpbGUpIHtcbiAgICAgIG5ldyBOb3RpY2UoXCJcdThCRjdcdTUxNDhcdTYyNTNcdTVGMDBcdTRFMDBcdTRFMkFcdTY4NDhcdTRFRjZcdTY1ODdcdTRFRjZcdTMwMDJcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgY2FjaGUgPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShhY3RpdmVGaWxlKTtcbiAgICBpZiAoY2FjaGU/LmZyb250bWF0dGVyPy50eXBlICE9PSBcImNhc2VcIikge1xuICAgICAgbmV3IE5vdGljZShcIlx1NUY1M1x1NTI0RFx1NjI1M1x1NUYwMFx1NzY4NFx1NEUwRFx1NjYyRlx1Njg0OFx1NEVGNlx1NjU4N1x1NEVGNlx1MzAwMlwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLmNyZWF0ZVRhc2tGcm9tQ2FzZShhY3RpdmVGaWxlLnBhdGgpO1xuICB9XG5cbiAgYXN5bmMgY3JlYXRlRXZpZGVuY2VGcm9tQ2FzZShjYXNlUGF0aDogc3RyaW5nLCB0aXRsZT86IHN0cmluZyk6IFByb21pc2U8VEZpbGU+IHtcbiAgICBjb25zdCBhYnN0cmFjdCA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChjYXNlUGF0aCk7XG4gICAgaWYgKCEoYWJzdHJhY3QgaW5zdGFuY2VvZiBURmlsZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlx1NjI3RVx1NEUwRFx1NTIzMFx1NUJGOVx1NUU5NFx1Njg0OFx1NEVGNlx1NjU4N1x1NEVGNlx1MzAwMlwiKTtcbiAgICB9XG5cbiAgICBjb25zdCBldmlkZW5jZVRpdGxlID0gdGl0bGUgPz8gYCR7YWJzdHJhY3QuYmFzZW5hbWV9IEV2aWRlbmNlICR7bmV3IERhdGUoKS50b0lTT1N0cmluZygpLnNsaWNlKDExLCAxNil9YDtcbiAgICBjb25zdCBmaWxlID0gYXdhaXQgY3JlYXRlVHlwZWROb3RlKFxuICAgICAgdGhpcy5hcHAsXG4gICAgICB0aGlzLnNldHRpbmdzLmV2aWRlbmNlRm9sZGVyLFxuICAgICAgZXZpZGVuY2VUaXRsZSxcbiAgICAgIGJ1aWxkRXZpZGVuY2VUZW1wbGF0ZShldmlkZW5jZVRpdGxlLCBhYnN0cmFjdC5iYXNlbmFtZSwgYWJzdHJhY3QucGF0aClcbiAgICApO1xuXG4gICAgYXdhaXQgdGhpcy5vcGVuRmlsZShmaWxlKTtcbiAgICByZXR1cm4gZmlsZTtcbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZUV2aWRlbmNlTm90ZSh0aXRsZSA9IHRoaXMuZGVmYXVsdFRpdGxlKFwiTmV3IEV2aWRlbmNlXCIpKTogUHJvbWlzZTxURmlsZT4ge1xuICAgIGNvbnN0IGZpbGUgPSBhd2FpdCBjcmVhdGVUeXBlZE5vdGUoXG4gICAgICB0aGlzLmFwcCxcbiAgICAgIHRoaXMuc2V0dGluZ3MuZXZpZGVuY2VGb2xkZXIsXG4gICAgICB0aXRsZSxcbiAgICAgIGJ1aWxkRXZpZGVuY2VUZW1wbGF0ZSh0aXRsZSlcbiAgICApO1xuICAgIGF3YWl0IHRoaXMub3BlbkZpbGUoZmlsZSk7XG4gICAgcmV0dXJuIGZpbGU7XG4gIH1cblxuICBhc3luYyBhcmNoaXZlQ29sbGVjdGlvbkFzRXZpZGVuY2UoY29sbGVjdGlvblBhdGg6IHN0cmluZyk6IFByb21pc2U8VEZpbGUgfCBudWxsPiB7XG4gICAgY29uc3QgYWJzdHJhY3QgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoY29sbGVjdGlvblBhdGgpO1xuICAgIGlmICghKGFic3RyYWN0IGluc3RhbmNlb2YgVEZpbGUpKSB7XG4gICAgICBuZXcgTm90aWNlKFwiXHU2MjdFXHU0RTBEXHU1MjMwXHU4OTgxXHU1RjUyXHU2ODYzXHU3Njg0XHU3ODE0XHU4QkZCXHU2NzYxXHU3NkVFXHUzMDAyXCIpO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgZmlyc3RDb25maXJtID0gd2luZG93LmNvbmZpcm0oYFx1NUMwNlx1MzAwQyR7YWJzdHJhY3QuYmFzZW5hbWV9XHUzMDBEXHU1MkEwXHU1MTY1XHU4QkMxXHU3MjY5XHU2N0RDXHVGRjFGXFxuXFxuXHU4RkQ5XHU0RjFBXHU1MjFCXHU1RUZBXHU0RTAwXHU0RUZEXHU1M0VGXHU3RUU3XHU3RUVEXHU3RjE2XHU4RjkxXHU3Njg0XHU4QkMxXHU3MjY5XHU3QjE0XHU4QkIwXHVGRjBDXHU1MzlGXHU3ODE0XHU4QkZCXHU2NzYxXHU3NkVFXHU0RjFBXHU0RkREXHU3NTU5XHUzMDAyYCk7XG4gICAgaWYgKCFmaXJzdENvbmZpcm0pIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBzZWNvbmRDb25maXJtID0gd2luZG93LmNvbmZpcm0oYFx1NTE4RFx1NkIyMVx1Nzg2RVx1OEJBNFx1RkYxQVx1NjI4QVx1MzAwQyR7YWJzdHJhY3QuYmFzZW5hbWV9XHUzMDBEXHU2Qzg5XHU2REMwXHU0RTNBXHU4QkMxXHU3MjY5XHU2N0RDXHU2NzYxXHU3NkVFXHVGRjFGYCk7XG4gICAgaWYgKCFzZWNvbmRDb25maXJtKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBjYWNoZSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGFic3RyYWN0KTtcbiAgICBjb25zdCBmcm9udG1hdHRlciA9IGNhY2hlPy5mcm9udG1hdHRlcjtcbiAgICBjb25zdCB0aXRsZSA9IGAke2Fic3RyYWN0LmJhc2VuYW1lfSBFdmlkZW5jZWA7XG4gICAgY29uc3Qgc291cmNlQm9keSA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNhY2hlZFJlYWQoYWJzdHJhY3QpO1xuICAgIGNvbnN0IGZpbGUgPSBhd2FpdCBjcmVhdGVUeXBlZE5vdGUoXG4gICAgICB0aGlzLmFwcCxcbiAgICAgIHRoaXMuc2V0dGluZ3MuZXZpZGVuY2VGb2xkZXIsXG4gICAgICB0aXRsZSxcbiAgICAgIGAke2J1aWxkRXZpZGVuY2VUZW1wbGF0ZSh0aXRsZSwgU3RyaW5nKGZyb250bWF0dGVyPy5jYXNlID8/IFwiXCIpLCBTdHJpbmcoZnJvbnRtYXR0ZXI/LmNhc2VQYXRoID8/IFwiXCIpKX1cbiMjIFx1Njc2NVx1NkU5MFx1NzgxNFx1OEJGQlxuLSBcdTUzOUZcdTU5Q0JcdTY3NjFcdTc2RUVcdUZGMUFbWyR7YWJzdHJhY3QuYmFzZW5hbWV9XV1cbi0gXHU1MzlGXHU1OUNCXHU4REVGXHU1Rjg0XHVGRjFBJHthYnN0cmFjdC5wYXRofVxuXG4jIyBcdTUzOUZcdTU5Q0JcdTdCMTRcdThCQjBcdTY0NThcdTVGNTVcbiR7c291cmNlQm9keS5yZXBsYWNlKC9eLS0tW1xcc1xcU10qPy0tLVxccyovLCBcIlwiKS50cmltKCkgfHwgXCItIFwifVxuYFxuICAgICk7XG5cbiAgICBhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoZmlsZSwgKGV2aWRlbmNlRnJvbnRtYXR0ZXIpID0+IHtcbiAgICAgIGV2aWRlbmNlRnJvbnRtYXR0ZXIudHlwZSA9IFwiZXZpZGVuY2VcIjtcbiAgICAgIGV2aWRlbmNlRnJvbnRtYXR0ZXIuc291cmNlID0gYWJzdHJhY3QucGF0aDtcbiAgICAgIGV2aWRlbmNlRnJvbnRtYXR0ZXIuY2FzZSA9IHR5cGVvZiBmcm9udG1hdHRlcj8uY2FzZSA9PT0gXCJzdHJpbmdcIiA/IGZyb250bWF0dGVyLmNhc2UgOiBcIlwiO1xuICAgICAgZXZpZGVuY2VGcm9udG1hdHRlci5jYXNlUGF0aCA9IHR5cGVvZiBmcm9udG1hdHRlcj8uY2FzZVBhdGggPT09IFwic3RyaW5nXCIgPyBmcm9udG1hdHRlci5jYXNlUGF0aCA6IFwiXCI7XG4gICAgICBldmlkZW5jZUZyb250bWF0dGVyLnVwZGF0ZWQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoYWJzdHJhY3QsIChjb2xsZWN0aW9uRnJvbnRtYXR0ZXIpID0+IHtcbiAgICAgIGNvbGxlY3Rpb25Gcm9udG1hdHRlci50eXBlID0gXCJjb2xsZWN0aW9uXCI7XG4gICAgICBjb2xsZWN0aW9uRnJvbnRtYXR0ZXIuc3RhdHVzID0gXCJmaW5pc2hlZFwiO1xuICAgICAgY29sbGVjdGlvbkZyb250bWF0dGVyLnVwZGF0ZWQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgfSk7XG5cbiAgICBuZXcgTm90aWNlKGBcdTVERjJcdTUyQTBcdTUxNjVcdThCQzFcdTcyNjlcdTY3REM6ICR7ZmlsZS5iYXNlbmFtZX1gKTtcbiAgICBhd2FpdCB0aGlzLnJlZnJlc2hXb3Jrc3BhY2UoKTtcbiAgICBhd2FpdCB0aGlzLm9wZW5GaWxlKGZpbGUpO1xuICAgIHJldHVybiBmaWxlO1xuICB9XG5cbiAgYXN5bmMgZW5zdXJlRXZpZGVuY2VGb2xkZXJGb3JDYXNlKGNhc2VQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IGFic3RyYWN0ID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGNhc2VQYXRoKTtcbiAgICBpZiAoIShhYnN0cmFjdCBpbnN0YW5jZW9mIFRGaWxlKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiXHU2MjdFXHU0RTBEXHU1MjMwXHU1QkY5XHU1RTk0XHU2ODQ4XHU0RUY2XHU2NTg3XHU0RUY2XHUzMDAyXCIpO1xuICAgIH1cblxuICAgIGNvbnN0IHNhZmVOYW1lID0gYWJzdHJhY3QuYmFzZW5hbWUucmVwbGFjZSgvW1xcXFwvOio/XCI8PnxdL2csIFwiLVwiKS50cmltKCkgfHwgXCJVbnRpdGxlZCBDYXNlXCI7XG4gICAgY29uc3QgZm9sZGVyUGF0aCA9IGAke3RoaXMuc2V0dGluZ3MuZXZpZGVuY2VGb2xkZXIucmVwbGFjZSgvXFwvJC8sIFwiXCIpfS8ke3NhZmVOYW1lfWA7XG4gICAgaWYgKCF0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoZm9sZGVyUGF0aCkpIHtcbiAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZUZvbGRlcihmb2xkZXJQYXRoKTtcbiAgICB9XG4gICAgbmV3IE5vdGljZShgXHU1REYyXHU1RUZBXHU3QUNCXHU2ODQ4XHU0RUY2XHU4RDQ0XHU2NTk5XHU1OTM5OiAke2ZvbGRlclBhdGh9YCk7XG4gICAgYXdhaXQgdGhpcy5yZWZyZXNoV29ya3NwYWNlKCk7XG4gICAgcmV0dXJuIGZvbGRlclBhdGg7XG4gIH1cblxuICBhc3luYyByZXZlYWxFdmlkZW5jZUZvbGRlckZvckNhc2UoY2FzZVBhdGg6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGZvbGRlclBhdGggPSBhd2FpdCB0aGlzLmVuc3VyZUV2aWRlbmNlRm9sZGVyRm9yQ2FzZShjYXNlUGF0aCk7XG4gICAgY29uc3QgYWRhcHRlciA9IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIgYXMgdW5rbm93biBhcyB7IGdldEJhc2VQYXRoPzogKCkgPT4gc3RyaW5nIH07XG4gICAgY29uc3QgYmFzZVBhdGggPSBhZGFwdGVyLmdldEJhc2VQYXRoPy4oKTtcbiAgICBpZiAoIWJhc2VQYXRoKSB7XG4gICAgICBuZXcgTm90aWNlKGBcdTY4NDhcdTRFRjZcdThENDRcdTY1OTlcdTU5MzlcdTVERjJcdTVFRkFcdTdBQ0I6ICR7Zm9sZGVyUGF0aH1gKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgYXdhaXQgc2hlbGwub3BlblBhdGgoam9pbihiYXNlUGF0aCwgZm9sZGVyUGF0aCkpO1xuICB9XG5cbiAgYXN5bmMgY3JlYXRlRXZpZGVuY2VGb3JBY3RpdmVDYXNlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGFjdGl2ZUZpbGUgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlRmlsZSgpO1xuICAgIGlmICghYWN0aXZlRmlsZSkge1xuICAgICAgbmV3IE5vdGljZShcIlx1OEJGN1x1NTE0OFx1NjI1M1x1NUYwMFx1NEUwMFx1NEUyQVx1Njg0OFx1NEVGNlx1NjU4N1x1NEVGNlx1MzAwMlwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBjYWNoZSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGFjdGl2ZUZpbGUpO1xuICAgIGlmIChjYWNoZT8uZnJvbnRtYXR0ZXI/LnR5cGUgIT09IFwiY2FzZVwiKSB7XG4gICAgICBuZXcgTm90aWNlKFwiXHU1RjUzXHU1MjREXHU2MjUzXHU1RjAwXHU3Njg0XHU0RTBEXHU2NjJGXHU2ODQ4XHU0RUY2XHU2NTg3XHU0RUY2XHUzMDAyXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMuY3JlYXRlRXZpZGVuY2VGcm9tQ2FzZShhY3RpdmVGaWxlLnBhdGgpO1xuICB9XG5cbiAgYXN5bmMgY3JlYXRlU2NoZWR1bGVOb3RlKHRpdGxlID0gdGhpcy5kZWZhdWx0VGl0bGUoXCJOZXcgU2NoZWR1bGVcIikpOiBQcm9taXNlPFRGaWxlPiB7XG4gICAgY29uc3QgZmlsZSA9IGF3YWl0IGNyZWF0ZVR5cGVkTm90ZShcbiAgICAgIHRoaXMuYXBwLFxuICAgICAgdGhpcy5zZXR0aW5ncy5zY2hlZHVsZUZvbGRlcixcbiAgICAgIHRpdGxlLFxuICAgICAgYnVpbGRTY2hlZHVsZVRlbXBsYXRlKHRpdGxlKVxuICAgICk7XG4gICAgYXdhaXQgdGhpcy5vcGVuRmlsZShmaWxlKTtcbiAgICByZXR1cm4gZmlsZTtcbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZUNvbGxlY3Rpb25Ob3RlKHRpdGxlID0gdGhpcy5kZWZhdWx0VGl0bGUoXCJOZXcgQ29sbGVjdGlvblwiKSk6IFByb21pc2U8VEZpbGU+IHtcbiAgICBjb25zdCBmaWxlID0gYXdhaXQgY3JlYXRlVHlwZWROb3RlKFxuICAgICAgdGhpcy5hcHAsXG4gICAgICB0aGlzLnNldHRpbmdzLmNvbGxlY3Rpb25Gb2xkZXIsXG4gICAgICB0aXRsZSxcbiAgICAgIGJ1aWxkQ29sbGVjdGlvblRlbXBsYXRlKHRpdGxlKVxuICAgICk7XG4gICAgYXdhaXQgdGhpcy5vcGVuRmlsZShmaWxlKTtcbiAgICByZXR1cm4gZmlsZTtcbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZVBsYWNlTm90ZSgpOiBQcm9taXNlPFRGaWxlIHwgbnVsbD4ge1xuICAgIHJldHVybiB0aGlzLmNyZWF0ZVBsYWNlV2l0aFRpdGxlQXRNYXBQZXJjZW50KHRoaXMuZGVmYXVsdFBsYWNlVGl0bGUoKSwgNTAsIDUwKTtcbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZVBsYWNlRnJvbU1hcENsaWNrKHhQZXJjZW50OiBudW1iZXIsIHlQZXJjZW50OiBudW1iZXIpOiBQcm9taXNlPFRGaWxlIHwgbnVsbD4ge1xuICAgIHJldHVybiB0aGlzLmNyZWF0ZVBsYWNlV2l0aFRpdGxlQXRNYXBQZXJjZW50KHRoaXMuZGVmYXVsdFBsYWNlVGl0bGUoKSwgeFBlcmNlbnQsIHlQZXJjZW50KTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgY3JlYXRlUGxhY2VXaXRoVGl0bGVBdE1hcFBlcmNlbnQodGl0bGU6IHN0cmluZywgeFBlcmNlbnQ6IG51bWJlciwgeVBlcmNlbnQ6IG51bWJlcik6IFByb21pc2U8VEZpbGUgfCBudWxsPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgbGF0aXR1ZGUsIGxvbmdpdHVkZSwgbGF0aXR1ZGVIZW1pc3BoZXJlLCBsb25naXR1ZGVIZW1pc3BoZXJlIH0gPSB0aGlzLmNvbnZlcnRNYXBQZXJjZW50VG9Db29yZGluYXRlcyh4UGVyY2VudCwgeVBlcmNlbnQpO1xuICAgICAgY29uc3QgdW5pcXVlVGl0bGUgPSB0aGlzLmVuc3VyZVVuaXF1ZVBsYWNlVGl0bGUodGl0bGUpO1xuICAgICAgY29uc3QgZmlsZSA9IGF3YWl0IGNyZWF0ZVR5cGVkTm90ZShcbiAgICAgICAgdGhpcy5hcHAsXG4gICAgICAgIHRoaXMuc2V0dGluZ3MucGxhY2VGb2xkZXIsXG4gICAgICAgIHVuaXF1ZVRpdGxlLFxuICAgICAgICBidWlsZFBsYWNlVGVtcGxhdGUodW5pcXVlVGl0bGUsIGxhdGl0dWRlLCBsb25naXR1ZGUsIGxhdGl0dWRlSGVtaXNwaGVyZSwgbG9uZ2l0dWRlSGVtaXNwaGVyZSlcbiAgICAgICk7XG4gICAgICBhd2FpdCB0aGlzLm9wZW5GaWxlKGZpbGUpO1xuICAgICAgcmV0dXJuIGZpbGU7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMuZGVidWdMb2coYGNyZWF0ZVBsYWNlTm90ZTplcnJvcjoke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5zdGFjayA/PyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgICAgIG5ldyBOb3RpY2UoYFx1NjVFMFx1NkNENVx1NTIxQlx1NUVGQVx1OERCM1x1OEZGOTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFwiXHU2NzJBXHU3N0U1XHU5NTE5XHU4QkVGXCJ9YCk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGRlZmF1bHRQbGFjZVRpdGxlKCk6IHN0cmluZyB7XG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgICBjb25zdCBzdGFtcCA9IG5vdy50b0lTT1N0cmluZygpLnJlcGxhY2UoXCJUXCIsIFwiIFwiKS5zbGljZSgwLCAxOSkucmVwbGFjZSgvOi9nLCBcIi1cIik7XG4gICAgY29uc3QgbXMgPSBTdHJpbmcobm93LmdldE1pbGxpc2Vjb25kcygpKS5wYWRTdGFydCgzLCBcIjBcIik7XG4gICAgcmV0dXJuIGBGb290cHJpbnQgJHtzdGFtcH0gJHttc31gO1xuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVVbmlxdWVQbGFjZVRpdGxlKHRpdGxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IGZvbGRlciA9IHRoaXMuc2V0dGluZ3MucGxhY2VGb2xkZXIucmVwbGFjZSgvXFwvJC8sIFwiXCIpO1xuICAgIGNvbnN0IHNhZmVOYW1lID0gdGl0bGUucmVwbGFjZSgvW1xcXFwvOio/XCI8PnxdL2csIFwiLVwiKS50cmltKCkgfHwgXCJVbnRpdGxlZFwiO1xuICAgIGxldCBjYW5kaWRhdGUgPSBzYWZlTmFtZTtcbiAgICBsZXQgaW5kZXggPSAxO1xuICAgIHdoaWxlICh0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoYCR7Zm9sZGVyfS8ke2NhbmRpZGF0ZX0ubWRgKSkge1xuICAgICAgaW5kZXggKz0gMTtcbiAgICAgIGNhbmRpZGF0ZSA9IGAke3NhZmVOYW1lfSAke2luZGV4fWA7XG4gICAgfVxuICAgIHJldHVybiBjYW5kaWRhdGU7XG4gIH1cblxuICBwcml2YXRlIGNvbnZlcnRNYXBQZXJjZW50VG9Db29yZGluYXRlcyh4UGVyY2VudDogbnVtYmVyLCB5UGVyY2VudDogbnVtYmVyKToge1xuICAgIGxhdGl0dWRlOiBudW1iZXI7XG4gICAgbG9uZ2l0dWRlOiBudW1iZXI7XG4gICAgbGF0aXR1ZGVIZW1pc3BoZXJlOiBcIk5cIiB8IFwiU1wiO1xuICAgIGxvbmdpdHVkZUhlbWlzcGhlcmU6IFwiRVwiIHwgXCJXXCI7XG4gIH0ge1xuICAgIGNvbnN0IGNsYW1wZWRYID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oMTAwLCB4UGVyY2VudCkpO1xuICAgIGNvbnN0IGNsYW1wZWRZID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oMTAwLCB5UGVyY2VudCkpO1xuICAgIGNvbnN0IHJhd0xvbmdpdHVkZSA9IChjbGFtcGVkWCAvIDEwMCkgKiAzNjAgLSAxODAgKyAxMDU7XG4gICAgY29uc3Qgbm9ybWFsaXplZExvbmdpdHVkZSA9ICgocmF3TG9uZ2l0dWRlICsgMTgwKSAlIDM2MCArIDM2MCkgJSAzNjAgLSAxODA7XG4gICAgY29uc3QgcmF3TGF0aXR1ZGUgPSA5MCAtIChjbGFtcGVkWSAvIDEwMCkgKiAxODA7XG4gICAgY29uc3QgbGF0aXR1ZGVIZW1pc3BoZXJlID0gcmF3TGF0aXR1ZGUgPj0gMCA/IFwiTlwiIDogXCJTXCI7XG4gICAgY29uc3QgbG9uZ2l0dWRlSGVtaXNwaGVyZSA9IG5vcm1hbGl6ZWRMb25naXR1ZGUgPj0gMCA/IFwiRVwiIDogXCJXXCI7XG4gICAgcmV0dXJuIHtcbiAgICAgIGxhdGl0dWRlOiBNYXRoLnJvdW5kKHJhd0xhdGl0dWRlICogMTAwKSAvIDEwMCxcbiAgICAgIGxvbmdpdHVkZTogTWF0aC5yb3VuZChub3JtYWxpemVkTG9uZ2l0dWRlICogMTAwKSAvIDEwMCxcbiAgICAgIGxhdGl0dWRlSGVtaXNwaGVyZSxcbiAgICAgIGxvbmdpdHVkZUhlbWlzcGhlcmVcbiAgICB9O1xuICB9XG5cbiAgYXN5bmMgY3JlYXRlUXVpY2tTY2hlZHVsZShkYXk6IHN0cmluZywgc3RhcnQ6IHN0cmluZywgZW5kOiBzdHJpbmcpOiBQcm9taXNlPFRGaWxlPiB7XG4gICAgY29uc3QgdGl0bGUgPSBgJHtkYXl9ICR7c3RhcnR9IEludmVzdGlnYXRpb25gO1xuICAgIGNvbnN0IGZpbGUgPSBhd2FpdCBjcmVhdGVUeXBlZE5vdGUoXG4gICAgICB0aGlzLmFwcCxcbiAgICAgIHRoaXMuc2V0dGluZ3Muc2NoZWR1bGVGb2xkZXIsXG4gICAgICB0aXRsZSxcbiAgICAgIGJ1aWxkU2NoZWR1bGVUZW1wbGF0ZSh0aXRsZSlcbiAgICApO1xuXG4gICAgYXdhaXQgdGhpcy5hcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGZpbGUsIChmcm9udG1hdHRlcikgPT4ge1xuICAgICAgZnJvbnRtYXR0ZXIuZGF5ID0gZGF5O1xuICAgICAgZnJvbnRtYXR0ZXIuc3RhcnQgPSBzdGFydDtcbiAgICAgIGZyb250bWF0dGVyLmVuZCA9IGVuZDtcbiAgICAgIGZyb250bWF0dGVyLmR1cmF0aW9uTWludXRlcyA9IHRoaXMuZGlmZk1pbnV0ZXMoc3RhcnQsIGVuZCk7XG4gICAgICBmcm9udG1hdHRlci51cGRhdGVkID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgaWYgKHR5cGVvZiBmcm9udG1hdHRlci5yZWxhdGVkVGFzayAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgICBmcm9udG1hdHRlci5yZWxhdGVkVGFzayA9IFwiXCI7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIGZyb250bWF0dGVyLnJlbGF0ZWRUYXNrUGF0aCAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgICBmcm9udG1hdHRlci5yZWxhdGVkVGFza1BhdGggPSBcIlwiO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgYXdhaXQgdGhpcy5vcGVuRmlsZShmaWxlKTtcbiAgICByZXR1cm4gZmlsZTtcbiAgfVxuXG4gIGFzeW5jIHNjaGVkdWxlVGFza0Zyb21EYXNoYm9hcmQodGFza1BhdGg6IHN0cmluZywgZGF5OiBzdHJpbmcsIHN0YXJ0OiBzdHJpbmcsIGVuZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgYWJzdHJhY3QgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgodGFza1BhdGgpO1xuICAgIGlmICghKGFic3RyYWN0IGluc3RhbmNlb2YgVEZpbGUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJcdTYyN0VcdTRFMERcdTUyMzBcdTg5ODFcdTVCODlcdTYzOTJcdTc2ODRcdTRFRkJcdTUyQTFcdTY1ODdcdTRFRjZcdTMwMDJcIik7XG4gICAgfVxuXG4gICAgY29uc3QgdGFza0ZpbGUgPSBhYnN0cmFjdDtcbiAgICBjb25zdCBzY2hlZHVsZVRpdGxlID0gYCR7ZGF5fSAke3N0YXJ0fSAke3Rhc2tGaWxlLmJhc2VuYW1lfWA7XG4gICAgY29uc3Qgc2NoZWR1bGVGaWxlID0gYXdhaXQgY3JlYXRlVHlwZWROb3RlKFxuICAgICAgdGhpcy5hcHAsXG4gICAgICB0aGlzLnNldHRpbmdzLnNjaGVkdWxlRm9sZGVyLFxuICAgICAgc2NoZWR1bGVUaXRsZSxcbiAgICAgIGJ1aWxkU2NoZWR1bGVUZW1wbGF0ZShzY2hlZHVsZVRpdGxlKVxuICAgICk7XG5cbiAgICBhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoc2NoZWR1bGVGaWxlLCAoZnJvbnRtYXR0ZXIpID0+IHtcbiAgICAgIGZyb250bWF0dGVyLmRheSA9IGRheTtcbiAgICAgIGZyb250bWF0dGVyLnN0YXJ0ID0gc3RhcnQ7XG4gICAgICBmcm9udG1hdHRlci5lbmQgPSBlbmQ7XG4gICAgICBmcm9udG1hdHRlci5kdXJhdGlvbk1pbnV0ZXMgPSB0aGlzLmRpZmZNaW51dGVzKHN0YXJ0LCBlbmQpO1xuICAgICAgZnJvbnRtYXR0ZXIucmVsYXRlZFRhc2sgPSB0YXNrRmlsZS5iYXNlbmFtZTtcbiAgICAgIGZyb250bWF0dGVyLnJlbGF0ZWRUYXNrUGF0aCA9IHRhc2tGaWxlLnBhdGg7XG4gICAgICBmcm9udG1hdHRlci51cGRhdGVkID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgdGhpcy5hcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKHRhc2tGaWxlLCAoZnJvbnRtYXR0ZXIpID0+IHtcbiAgICAgIGZyb250bWF0dGVyLnR5cGUgPSBcInRhc2tcIjtcbiAgICAgIGZyb250bWF0dGVyLnN0YXR1cyA9IFwic2NoZWR1bGVkXCI7XG4gICAgICBmcm9udG1hdHRlci51cGRhdGVkID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgIH0pO1xuXG4gICAgbmV3IE5vdGljZShgXHU1REYyXHU1QzA2ICR7dGFza0ZpbGUuYmFzZW5hbWV9IFx1NUI4OVx1NjM5Mlx1NTIzMCAke2RheX0gJHtzdGFydH1gKTtcbiAgICBhd2FpdCB0aGlzLnJlZnJlc2hXb3Jrc3BhY2UoKTtcbiAgfVxuXG4gIGFzeW5jIG1vdmVTY2hlZHVsZUVudHJ5KHNjaGVkdWxlUGF0aDogc3RyaW5nLCBkYXk6IHN0cmluZywgc3RhcnQ6IHN0cmluZywgZW5kOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBhYnN0cmFjdCA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChzY2hlZHVsZVBhdGgpO1xuICAgIGlmICghKGFic3RyYWN0IGluc3RhbmNlb2YgVEZpbGUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJcdTYyN0VcdTRFMERcdTUyMzBcdTg5ODFcdTc5RkJcdTUyQThcdTc2ODRcdTYzOTJcdTY3MUZcdTY1ODdcdTRFRjZcdTMwMDJcIik7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5hcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGFic3RyYWN0LCAoZnJvbnRtYXR0ZXIpID0+IHtcbiAgICAgIGZyb250bWF0dGVyLnR5cGUgPSBcInNjaGVkdWxlXCI7XG4gICAgICBmcm9udG1hdHRlci5kYXkgPSBkYXk7XG4gICAgICBmcm9udG1hdHRlci5zdGFydCA9IHN0YXJ0O1xuICAgICAgZnJvbnRtYXR0ZXIuZW5kID0gZW5kO1xuICAgICAgZnJvbnRtYXR0ZXIuZHVyYXRpb25NaW51dGVzID0gdGhpcy5kaWZmTWludXRlcyhzdGFydCwgZW5kKTtcbiAgICAgIGZyb250bWF0dGVyLnVwZGF0ZWQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgfSk7XG5cbiAgICBuZXcgTm90aWNlKGBcdTVERjJcdThDMDNcdTY1NzRcdTYzOTJcdTY3MUZcdTUyMzAgJHtkYXl9ICR7c3RhcnR9YCk7XG4gICAgYXdhaXQgdGhpcy5yZWZyZXNoV29ya3NwYWNlKCk7XG4gIH1cblxuICBhc3luYyBhZGp1c3RTY2hlZHVsZUR1cmF0aW9uKHNjaGVkdWxlUGF0aDogc3RyaW5nLCBkZWx0YU1pbnV0ZXM6IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGFic3RyYWN0ID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHNjaGVkdWxlUGF0aCk7XG4gICAgaWYgKCEoYWJzdHJhY3QgaW5zdGFuY2VvZiBURmlsZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlx1NjI3RVx1NEUwRFx1NTIzMFx1ODk4MVx1OEMwM1x1NjU3NFx1NjVGNlx1OTU3Rlx1NzY4NFx1NjM5Mlx1NjcxRlx1NjU4N1x1NEVGNlx1MzAwMlwiKTtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoYWJzdHJhY3QsIChmcm9udG1hdHRlcikgPT4ge1xuICAgICAgY29uc3Qgc3RhcnQgPSB0eXBlb2YgZnJvbnRtYXR0ZXIuc3RhcnQgPT09IFwic3RyaW5nXCIgPyBmcm9udG1hdHRlci5zdGFydCA6IFwiMDk6MDBcIjtcbiAgICAgIGNvbnN0IGN1cnJlbnREdXJhdGlvbiA9XG4gICAgICAgIHR5cGVvZiBmcm9udG1hdHRlci5kdXJhdGlvbk1pbnV0ZXMgPT09IFwibnVtYmVyXCJcbiAgICAgICAgICA/IGZyb250bWF0dGVyLmR1cmF0aW9uTWludXRlc1xuICAgICAgICAgIDogdGhpcy5kaWZmTWludXRlcyhcbiAgICAgICAgICAgICAgc3RhcnQsXG4gICAgICAgICAgICAgIHR5cGVvZiBmcm9udG1hdHRlci5lbmQgPT09IFwic3RyaW5nXCIgPyBmcm9udG1hdHRlci5lbmQgOiB0aGlzLmFkZE1pbnV0ZXMoc3RhcnQsIDYwKVxuICAgICAgICAgICAgKTtcbiAgICAgIGNvbnN0IG5leHREdXJhdGlvbiA9IE1hdGgubWF4KDMwLCBNYXRoLm1pbigyNDAsIGN1cnJlbnREdXJhdGlvbiArIGRlbHRhTWludXRlcykpO1xuICAgICAgZnJvbnRtYXR0ZXIuc3RhcnQgPSBzdGFydDtcbiAgICAgIGZyb250bWF0dGVyLmR1cmF0aW9uTWludXRlcyA9IG5leHREdXJhdGlvbjtcbiAgICAgIGZyb250bWF0dGVyLmVuZCA9IHRoaXMuYWRkTWludXRlcyhzdGFydCwgbmV4dER1cmF0aW9uKTtcbiAgICAgIGZyb250bWF0dGVyLnVwZGF0ZWQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCB0aGlzLnJlZnJlc2hXb3Jrc3BhY2UoKTtcbiAgfVxuXG4gIGFzeW5jIG1vdmVTY2hlZHVsZVRvTmV4dEZyZWVTbG90KHNjaGVkdWxlUGF0aDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgYWJzdHJhY3QgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoc2NoZWR1bGVQYXRoKTtcbiAgICBpZiAoIShhYnN0cmFjdCBpbnN0YW5jZW9mIFRGaWxlKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiXHU2MjdFXHU0RTBEXHU1MjMwXHU4OTgxXHU5ODdBXHU1RUY2XHU3Njg0XHU2MzkyXHU2NzFGXHU2NTg3XHU0RUY2XHUzMDAyXCIpO1xuICAgIH1cblxuICAgIGNvbnN0IGNhY2hlID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoYWJzdHJhY3QpO1xuICAgIGNvbnN0IGZyb250bWF0dGVyID0gY2FjaGU/LmZyb250bWF0dGVyO1xuICAgIGNvbnN0IGN1cnJlbnREYXkgPSB0eXBlb2YgZnJvbnRtYXR0ZXI/LmRheSA9PT0gXCJzdHJpbmdcIiA/IGZyb250bWF0dGVyLmRheSA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKS5zbGljZSgwLCAxMCk7XG4gICAgY29uc3QgY3VycmVudFN0YXJ0ID0gdHlwZW9mIGZyb250bWF0dGVyPy5zdGFydCA9PT0gXCJzdHJpbmdcIiA/IGZyb250bWF0dGVyLnN0YXJ0IDogXCIwODowMFwiO1xuICAgIGNvbnN0IGR1cmF0aW9uID1cbiAgICAgIHR5cGVvZiBmcm9udG1hdHRlcj8uZHVyYXRpb25NaW51dGVzID09PSBcIm51bWJlclwiXG4gICAgICAgID8gZnJvbnRtYXR0ZXIuZHVyYXRpb25NaW51dGVzXG4gICAgICAgIDogdGhpcy5kaWZmTWludXRlcyhcbiAgICAgICAgICAgIGN1cnJlbnRTdGFydCxcbiAgICAgICAgICAgIHR5cGVvZiBmcm9udG1hdHRlcj8uZW5kID09PSBcInN0cmluZ1wiID8gZnJvbnRtYXR0ZXIuZW5kIDogdGhpcy5hZGRNaW51dGVzKGN1cnJlbnRTdGFydCwgNjApXG4gICAgICAgICAgKTtcblxuICAgIGNvbnN0IHdvcmtzcGFjZURhdGEgPSBhd2FpdCB0aGlzLmdldFdvcmtzcGFjZURhdGEoKTtcbiAgICBjb25zdCBjYW5kaWRhdGUgPSB0aGlzLmZpbmROZXh0RnJlZVNsb3QoY3VycmVudERheSwgY3VycmVudFN0YXJ0LCBkdXJhdGlvbiwgd29ya3NwYWNlRGF0YS5zY2hlZHVsZXMsIHNjaGVkdWxlUGF0aCk7XG4gICAgaWYgKCFjYW5kaWRhdGUpIHtcbiAgICAgIG5ldyBOb3RpY2UoXCJcdTY3MkNcdTU0NjhcdTZDQTFcdTY3MDlcdTYyN0VcdTUyMzBcdTUzRUZcdTk4N0FcdTVFRjZcdTc2ODRcdTdBN0FcdTY4NjNcdTMwMDJcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5tb3ZlU2NoZWR1bGVFbnRyeShzY2hlZHVsZVBhdGgsIGNhbmRpZGF0ZS5kYXksIGNhbmRpZGF0ZS5zdGFydCwgY2FuZGlkYXRlLmVuZCk7XG4gIH1cblxuICBhc3luYyBvcGVuUGF0aChwYXRoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBhYnN0cmFjdDogVEFic3RyYWN0RmlsZSB8IG51bGwgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgocGF0aCk7XG4gICAgaWYgKCEoYWJzdHJhY3QgaW5zdGFuY2VvZiBURmlsZSkpIHtcbiAgICAgIG5ldyBOb3RpY2UoXCJcdTVCRjlcdTVFOTRcdTY1ODdcdTRFRjZcdTRFMERcdTVCNThcdTU3MjhcdTMwMDJcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGF3YWl0IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWFmKHRydWUpLm9wZW5GaWxlKGFic3RyYWN0KTtcbiAgfVxuXG4gIGFzeW5jIGRlbGV0ZVBhdGgocGF0aDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgYWJzdHJhY3Q6IFRBYnN0cmFjdEZpbGUgfCBudWxsID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHBhdGgpO1xuICAgIGlmICghKGFic3RyYWN0IGluc3RhbmNlb2YgVEZpbGUpKSB7XG4gICAgICBuZXcgTm90aWNlKFwiXHU1QkY5XHU1RTk0XHU2NTg3XHU0RUY2XHU0RTBEXHU1QjU4XHU1NzI4XHVGRjBDXHU2NUUwXHU2Q0Q1XHU1MjIwXHU5NjY0XHUzMDAyXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBjb25maXJtZWQgPSB3aW5kb3cuY29uZmlybShgXHU3ODZFXHU1QjlBXHU1MjIwXHU5NjY0XHUzMDBDJHthYnN0cmFjdC5iYXNlbmFtZX1cdTMwMERcdTU0MTdcdUZGMUZcdTY1ODdcdTRFRjZcdTRGMUFcdTc5RkJcdTUyMzBcdTdDRkJcdTdFREZcdTVFOUZcdTdFQjhcdTdCRDNcdTMwMDJgKTtcbiAgICBpZiAoIWNvbmZpcm1lZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC50cmFzaChhYnN0cmFjdCwgdHJ1ZSk7XG4gICAgbmV3IE5vdGljZShgXHU1REYyXHU1MjIwXHU5NjY0ICR7YWJzdHJhY3QuYmFzZW5hbWV9YCk7XG4gICAgYXdhaXQgdGhpcy5yZWZyZXNoV29ya3NwYWNlKCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIG9wZW5GaWxlKGZpbGU6IFRGaWxlKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5hcHAud29ya3NwYWNlLmdldExlYWYodHJ1ZSkub3BlbkZpbGUoZmlsZSk7XG4gICAgbmV3IE5vdGljZShgU2hlcmxvY2sgT1MgXHU1REYyXHU2MjUzXHU1RjAwICR7ZmlsZS5iYXNlbmFtZX1gKTtcbiAgICBhd2FpdCB0aGlzLnJlZnJlc2hXb3Jrc3BhY2UoKTtcbiAgfVxuXG4gIHByaXZhdGUgZGVmYXVsdFRpdGxlKHByZWZpeDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCBzdGFtcCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKS5yZXBsYWNlKFwiVFwiLCBcIiBcIikuc2xpY2UoMCwgMTYpO1xuICAgIHJldHVybiBgJHtwcmVmaXh9ICR7c3RhbXB9YDtcbiAgfVxuXG4gIHByaXZhdGUgZGlmZk1pbnV0ZXMoc3RhcnQ6IHN0cmluZywgZW5kOiBzdHJpbmcpOiBudW1iZXIge1xuICAgIGNvbnN0IHN0YXJ0TWludXRlcyA9IHRoaXMudGltZVRvTWludXRlcyhzdGFydCk7XG4gICAgY29uc3QgZW5kTWludXRlcyA9IHRoaXMudGltZVRvTWludXRlcyhlbmQpO1xuICAgIHJldHVybiBNYXRoLm1heCgzMCwgZW5kTWludXRlcyAtIHN0YXJ0TWludXRlcyk7XG4gIH1cblxuICBwcml2YXRlIGFkZE1pbnV0ZXMoc3RhcnQ6IHN0cmluZywgYW1vdW50OiBudW1iZXIpOiBzdHJpbmcge1xuICAgIGNvbnN0IG5leHQgPSBNYXRoLm1pbih0aGlzLnRpbWVUb01pbnV0ZXMoc3RhcnQpICsgYW1vdW50LCAyMyAqIDYwICsgMzApO1xuICAgIGNvbnN0IGhvdXJzID0gTWF0aC5mbG9vcihuZXh0IC8gNjApO1xuICAgIGNvbnN0IG1pbnV0ZXMgPSBuZXh0ICUgNjA7XG4gICAgcmV0dXJuIGAke1N0cmluZyhob3VycykucGFkU3RhcnQoMiwgXCIwXCIpfToke1N0cmluZyhtaW51dGVzKS5wYWRTdGFydCgyLCBcIjBcIil9YDtcbiAgfVxuXG4gIHByaXZhdGUgdGltZVRvTWludXRlcyh2YWx1ZTogc3RyaW5nKTogbnVtYmVyIHtcbiAgICBjb25zdCBbaG91cnMsIG1pbnV0ZXNdID0gdmFsdWUuc3BsaXQoXCI6XCIpLm1hcChOdW1iZXIpO1xuICAgIHJldHVybiBob3VycyAqIDYwICsgbWludXRlcztcbiAgfVxuXG4gIHByaXZhdGUgZmluZE5leHRGcmVlU2xvdChcbiAgICBjdXJyZW50RGF5OiBzdHJpbmcsXG4gICAgY3VycmVudFN0YXJ0OiBzdHJpbmcsXG4gICAgZHVyYXRpb246IG51bWJlcixcbiAgICBzY2hlZHVsZXM6IFNoZXJsb2NrV29ya3NwYWNlRGF0YVtcInNjaGVkdWxlc1wiXSxcbiAgICBpZ25vcmVkUGF0aDogc3RyaW5nXG4gICk6IHsgZGF5OiBzdHJpbmc7IHN0YXJ0OiBzdHJpbmc7IGVuZDogc3RyaW5nIH0gfCBudWxsIHtcbiAgICBjb25zdCBzbG90cyA9IFtcIjA4OjAwXCIsIFwiMTA6MDBcIiwgXCIxMjowMFwiLCBcIjE0OjAwXCIsIFwiMTY6MDBcIiwgXCIxOTowMFwiXTtcbiAgICBjb25zdCB3ZWVrID0gdGhpcy5idWlsZEN1cnJlbnRXZWVrKCk7XG4gICAgY29uc3QgY3VycmVudEluZGV4ID0gd2Vlay5maW5kSW5kZXgoKGRheSkgPT4gZGF5ID09PSBjdXJyZW50RGF5KTtcbiAgICBjb25zdCBvcmRlcmVkRGF5cyA9IGN1cnJlbnRJbmRleCA+PSAwID8gWy4uLndlZWsuc2xpY2UoY3VycmVudEluZGV4KSwgLi4ud2Vlay5zbGljZSgwLCBjdXJyZW50SW5kZXgpXSA6IHdlZWs7XG5cbiAgICBmb3IgKGNvbnN0IGRheSBvZiBvcmRlcmVkRGF5cykge1xuICAgICAgZm9yIChjb25zdCBzbG90IG9mIHNsb3RzKSB7XG4gICAgICAgIGlmIChkYXkgPT09IGN1cnJlbnREYXkgJiYgdGhpcy50aW1lVG9NaW51dGVzKHNsb3QpIDw9IHRoaXMudGltZVRvTWludXRlcyhjdXJyZW50U3RhcnQpKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgb2NjdXBpZWQgPSBzY2hlZHVsZXMuc29tZSgoaXRlbSkgPT4gaXRlbS5maWxlUGF0aCAhPT0gaWdub3JlZFBhdGggJiYgaXRlbS5kYXkgPT09IGRheSAmJiBpdGVtLnN0YXJ0ID09PSBzbG90KTtcbiAgICAgICAgaWYgKCFvY2N1cGllZCkge1xuICAgICAgICAgIHJldHVybiB7IGRheSwgc3RhcnQ6IHNsb3QsIGVuZDogdGhpcy5hZGRNaW51dGVzKHNsb3QsIGR1cmF0aW9uKSB9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBwcml2YXRlIGJ1aWxkQ3VycmVudFdlZWsoKTogc3RyaW5nW10ge1xuICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgY29uc3QgZGF5ID0gbm93LmdldERheSgpO1xuICAgIGNvbnN0IG1vbmRheURlbHRhID0gZGF5ID09PSAwID8gLTYgOiAxIC0gZGF5O1xuICAgIGNvbnN0IG1vbmRheSA9IG5ldyBEYXRlKG5vdyk7XG4gICAgbW9uZGF5LnNldERhdGUobm93LmdldERhdGUoKSArIG1vbmRheURlbHRhKTtcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh7IGxlbmd0aDogNyB9LCAoXywgaW5kZXgpID0+IHtcbiAgICAgIGNvbnN0IHRhcmdldCA9IG5ldyBEYXRlKG1vbmRheSk7XG4gICAgICB0YXJnZXQuc2V0RGF0ZShtb25kYXkuZ2V0RGF0ZSgpICsgaW5kZXgpO1xuICAgICAgcmV0dXJuIGZvcm1hdExvY2FsRGF0ZSh0YXJnZXQpO1xuICAgIH0pO1xuICB9XG5cbiAgZGVidWdMb2cobWVzc2FnZTogc3RyaW5nKTogdm9pZCB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhgW1NoZXJsb2NrIE9TXSAke21lc3NhZ2V9YCk7XG4gIH1cblxuICBwcml2YXRlIGVuYWJsZUdsb2JhbFN0eWxlKCk6IHZvaWQge1xuICAgIGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LmFkZChcInNoZXJsb2NrLWdsb2JhbC1zdHlsZVwiKTtcbiAgfVxuXG4gIGdldEVudHJ5SW1hZ2VVcmwoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5hcHAudmF1bHQuYWRhcHRlci5nZXRSZXNvdXJjZVBhdGgoXG4gICAgICBgLm9ic2lkaWFuL3BsdWdpbnMvJHt0aGlzLm1hbmlmZXN0LmlkfS9hc3NldHMvc2hlcmxvY2stZW50cnkucG5nYFxuICAgICk7XG4gIH1cblxuICBnZXRQYXJsb3JJbWFnZVVybCgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLmdldFJlc291cmNlUGF0aChcbiAgICAgIGAub2JzaWRpYW4vcGx1Z2lucy8ke3RoaXMubWFuaWZlc3QuaWR9L2Fzc2V0cy9zaGVybG9jay1wYXJsb3IucG5nYFxuICAgICk7XG4gIH1cblxuICBnZXRXb3JsZE1hcEltYWdlVXJsKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIuZ2V0UmVzb3VyY2VQYXRoKFxuICAgICAgYC5vYnNpZGlhbi9wbHVnaW5zLyR7dGhpcy5tYW5pZmVzdC5pZH0vYXNzZXRzL3NoZXJsb2NrLXdvcmxkLW1hcC5wbmdgXG4gICAgKTtcbiAgfVxufVxuXG5cbiIsICJpbXBvcnQgeyBBcHAsIFRGaWxlLCBub3JtYWxpemVQYXRoIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgdHlwZSB7XG4gIFNoZXJsb2NrQ2FzZSxcbiAgU2hlcmxvY2tDb2xsZWN0aW9uLFxuICBTaGVybG9ja0V2aWRlbmNlLFxuICBTaGVybG9ja0VudGl0eVR5cGUsXG4gIFNoZXJsb2NrUGxhY2UsXG4gIFNoZXJsb2NrUGx1Z2luU2V0dGluZ3MsXG4gIFNoZXJsb2NrU2NoZWR1bGUsXG4gIFNoZXJsb2NrVGFzayxcbiAgU2hlcmxvY2tXb3Jrc3BhY2VEYXRhXG59IGZyb20gXCIuL3R5cGVzXCI7XG5cbmNvbnN0IEVOVElUWV9UWVBFUzogU2hlcmxvY2tFbnRpdHlUeXBlW10gPSBbXCJjYXNlXCIsIFwidGFza1wiLCBcInNjaGVkdWxlXCIsIFwiY29sbGVjdGlvblwiLCBcImV2aWRlbmNlXCIsIFwicGxhY2VcIl07XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBlbnN1cmVGb2xkZXJzKGFwcDogQXBwLCBzZXR0aW5nczogU2hlcmxvY2tQbHVnaW5TZXR0aW5ncyk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBmb2xkZXJzID0gW1xuICAgIHNldHRpbmdzLmNhc2VGb2xkZXIsXG4gICAgc2V0dGluZ3MudGFza0ZvbGRlcixcbiAgICBzZXR0aW5ncy5zY2hlZHVsZUZvbGRlcixcbiAgICBzZXR0aW5ncy5jb2xsZWN0aW9uRm9sZGVyLFxuICAgIHNldHRpbmdzLmV2aWRlbmNlRm9sZGVyLFxuICAgIHNldHRpbmdzLnBsYWNlRm9sZGVyXG4gIF07XG5cbiAgZm9yIChjb25zdCBmb2xkZXIgb2YgZm9sZGVycykge1xuICAgIGNvbnN0IG5vcm1hbGl6ZWQgPSBub3JtYWxpemVQYXRoKGZvbGRlcik7XG4gICAgY29uc3Qgc2VnbWVudHMgPSBub3JtYWxpemVkLnNwbGl0KFwiL1wiKS5maWx0ZXIoQm9vbGVhbik7XG4gICAgbGV0IGN1cnJlbnQgPSBcIlwiO1xuXG4gICAgZm9yIChjb25zdCBzZWdtZW50IG9mIHNlZ21lbnRzKSB7XG4gICAgICBjdXJyZW50ID0gY3VycmVudCA/IGAke2N1cnJlbnR9LyR7c2VnbWVudH1gIDogc2VnbWVudDtcbiAgICAgIGNvbnN0IGN1cnJlbnRQYXRoID0gbm9ybWFsaXplUGF0aChjdXJyZW50KTtcbiAgICAgIGlmIChhcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGN1cnJlbnRQYXRoKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgYXBwLnZhdWx0LmNyZWF0ZUZvbGRlcihjdXJyZW50UGF0aCk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xuICAgICAgICBpZiAoIW1lc3NhZ2UuaW5jbHVkZXMoXCJGb2xkZXIgYWxyZWFkeSBleGlzdHNcIikpIHtcbiAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRGcm9udG1hdHRlcih0eXBlOiBTaGVybG9ja0VudGl0eVR5cGUsIHRpdGxlOiBzdHJpbmcsIGV4dHJhczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9KTogc3RyaW5nIHtcbiAgY29uc3QgY3JlYXRlZCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgY29uc3QgbGluZXMgPSBbXG4gICAgXCItLS1cIixcbiAgICBgdHlwZTogJHt0eXBlfWAsXG4gICAgYHRpdGxlOiBcIiR7dGl0bGUucmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpfVwiYCxcbiAgICBgY3JlYXRlZDogJHtjcmVhdGVkfWAsXG4gICAgYHVwZGF0ZWQ6ICR7Y3JlYXRlZH1gXG4gIF07XG5cbiAgT2JqZWN0LmVudHJpZXMoZXh0cmFzKS5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcbiAgICBsaW5lcy5wdXNoKGAke2tleX06ICR7dmFsdWV9YCk7XG4gIH0pO1xuXG4gIGxpbmVzLnB1c2goXCItLS1cIiwgXCJcIik7XG4gIHJldHVybiBsaW5lcy5qb2luKFwiXFxuXCIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRDYXNlVGVtcGxhdGUodGl0bGU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBgJHtidWlsZEZyb250bWF0dGVyKFwiY2FzZVwiLCB0aXRsZSwge1xuICAgIHN0YXR1czogXCJvcGVuXCIsXG4gICAgcHJpb3JpdHk6IFwibWVkaXVtXCIsXG4gICAgdGFnczogXCJbXVwiXG4gIH0pfSMgJHt0aXRsZX1cblxuIyMgXHU2ODQ4XHU2MEM1XHU2OTgyXHU4OUM4XG4tIFx1ODBDQ1x1NjY2Rlx1RkYxQVxuLSBcdTVGNTNcdTUyNERcdTc2RUVcdTY4MDdcdUZGMUFcbi0gXHU0RTBCXHU0RTAwXHU2QjY1XHU2M0E4XHU3NDA2XHVGRjFBXG5cbiMjIFx1NzZGOFx1NTE3M1x1N0VCRlx1N0QyMlxuLSBcblxuIyMgXHU1MTczXHU4MDU0XHU4RDQ0XHU2NTk5XG4tIFxuYDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkVGFza1RlbXBsYXRlKHRpdGxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYCR7YnVpbGRGcm9udG1hdHRlcihcInRhc2tcIiwgdGl0bGUsIHtcbiAgICBzdGF0dXM6IFwiYmFja2xvZ1wiLFxuICAgIHByaW9yaXR5OiBcIm1lZGl1bVwiLFxuICAgIGNhc2U6ICdcIlwiJyxcbiAgICBjYXNlUGF0aDogJ1wiXCInXG4gIH0pfSMgJHt0aXRsZX1cblxuIyMgXHU0RUZCXHU1MkExXHU4QkY0XHU2NjBFXG4tIFxuXG4jIyBcdTYyNDBcdTVDNUVcdTY4NDhcdTRFRjZcbi0gXG5gO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRTY2hlZHVsZVRlbXBsYXRlKHRpdGxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYCR7YnVpbGRGcm9udG1hdHRlcihcInNjaGVkdWxlXCIsIHRpdGxlLCB7XG4gICAgZGF5OiBgXCIke2Zvcm1hdExvY2FsRGF0ZShuZXcgRGF0ZSgpKX1cImAsXG4gICAgc3RhcnQ6ICdcIjA5OjAwXCInLFxuICAgIGVuZDogJ1wiMTA6MDBcIicsXG4gICAgZHVyYXRpb25NaW51dGVzOiBcIjYwXCIsXG4gICAgcmVsYXRlZFRhc2s6ICdcIlwiJyxcbiAgICByZWxhdGVkVGFza1BhdGg6ICdcIlwiJ1xuICB9KX0jICR7dGl0bGV9XG5cbiMjIFx1OEMwM1x1NjdFNVx1NUI4OVx1NjM5MlxuLSBcdTc2RUVcdTY4MDdcdUZGMUFcbi0gXHU1MUM2XHU1OTA3XHU0RThCXHU5ODc5XHVGRjFBXG5gO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRDb2xsZWN0aW9uVGVtcGxhdGUodGl0bGU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBgJHtidWlsZEZyb250bWF0dGVyKFwiY29sbGVjdGlvblwiLCB0aXRsZSwge1xuICAgIHN0YXR1czogXCJyZWFkaW5nXCIsXG4gICAgbWVkaXVtOiBcImJvb2tcIixcbiAgICBjYXNlOiAnXCJcIicsXG4gICAgY2FzZVBhdGg6ICdcIlwiJyxcbiAgICByYXRpbmc6IFwiMFwiXG4gIH0pfSMgJHt0aXRsZX1cblxuIyMgXHU3ODE0XHU4QkZCXHU4QkIwXHU1RjU1XG4tIFx1NjQ1OFx1NjI4NFx1RkYxQVxuLSBcdTg5QzJcdTcwQjlcdUZGMUFcbi0gXHU1OTBEXHU3NkQ4XHVGRjFBXG5cbiMjIFx1Njg0OFx1NEVGNlx1NTE3M1x1ODA1NFxuLSBcbmA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZEV2aWRlbmNlVGVtcGxhdGUodGl0bGU6IHN0cmluZywgY2FzZU5hbWUgPSBcIlwiLCBjYXNlUGF0aCA9IFwiXCIpOiBzdHJpbmcge1xuICByZXR1cm4gYCR7YnVpbGRGcm9udG1hdHRlcihcImV2aWRlbmNlXCIsIHRpdGxlLCB7XG4gICAgY2FzZTogYFwiJHtjYXNlTmFtZS5yZXBsYWNlKC9cIi9nLCAnXFxcXFwiJyl9XCJgLFxuICAgIGNhc2VQYXRoOiBgXCIke2Nhc2VQYXRoLnJlcGxhY2UoL1wiL2csICdcXFxcXCInKX1cImAsXG4gICAgc291cmNlOiAnXCJcIidcbiAgfSl9IyAke3RpdGxlfVxuXG4jIyBcdThCQzFcdTcyNjlcdThCRjRcdTY2MEVcbi0gXHU2NzY1XHU2RTkwXHVGRjFBXG4tIFx1ODlDMlx1NUJERlx1RkYxQVxuLSBcdTYzQThcdThCQkFcdUZGMUFcblxuIyMgXHU1MTczXHU4MDU0XHU2ODQ4XHU0RUY2XG4tICR7Y2FzZU5hbWUgfHwgXCJcdTY3MkFcdTUxNzNcdTgwNTRcIn1cbmA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFBsYWNlVGVtcGxhdGUoXG4gIHRpdGxlOiBzdHJpbmcsXG4gIGxhdGl0dWRlPzogbnVtYmVyLFxuICBsb25naXR1ZGU/OiBudW1iZXIsXG4gIGxhdGl0dWRlSGVtaXNwaGVyZSA9IFwiXCIsXG4gIGxvbmdpdHVkZUhlbWlzcGhlcmUgPSBcIlwiXG4pOiBzdHJpbmcge1xuICByZXR1cm4gYCR7YnVpbGRGcm9udG1hdHRlcihcInBsYWNlXCIsIHRpdGxlLCB7XG4gICAgY2l0eTogYFwiJHt0aXRsZS5yZXBsYWNlKC9cIi9nLCAnXFxcXFwiJyl9XCJgLFxuICAgIGNvdW50cnk6ICdcIlwiJyxcbiAgICBsYXRpdHVkZTogbGF0aXR1ZGUgPT09IHVuZGVmaW5lZCA/ICdcIlwiJyA6IFN0cmluZyhsYXRpdHVkZSksXG4gICAgbG9uZ2l0dWRlOiBsb25naXR1ZGUgPT09IHVuZGVmaW5lZCA/ICdcIlwiJyA6IFN0cmluZyhsb25naXR1ZGUpLFxuICAgIGxhdGl0dWRlSGVtaXNwaGVyZTogYFwiJHtsYXRpdHVkZUhlbWlzcGhlcmV9XCJgLFxuICAgIGxvbmdpdHVkZUhlbWlzcGhlcmU6IGBcIiR7bG9uZ2l0dWRlSGVtaXNwaGVyZX1cImAsXG4gICAgdmlzaXRlZEF0OiBgXCIke2Zvcm1hdExvY2FsRGF0ZShuZXcgRGF0ZSgpKX1cImAsXG4gICAgY292ZXI6ICdcIlwiJyxcbiAgICBjYXNlOiAnXCJcIicsXG4gICAgY2FzZVBhdGg6ICdcIlwiJ1xuICB9KX0jICR7dGl0bGV9XG5cbiMjIFx1NTIzMFx1OEJCRlx1OEJCMFx1NUY1NVxuLSBcdTY1RjZcdTk1RjRcdUZGMUFcbi0gXHU3MTY3XHU3MjQ3XHVGRjFBXG4tIFx1OEJCMFx1NUZDNlx1RkYxQVxuXG4jIyBcdTUxNzNcdTgwNTRcbi0gXG5gO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY29sbGVjdFdvcmtzcGFjZURhdGEoYXBwOiBBcHApOiBQcm9taXNlPFNoZXJsb2NrV29ya3NwYWNlRGF0YT4ge1xuICBjb25zdCBmaWxlcyA9IGFwcC52YXVsdC5nZXRNYXJrZG93bkZpbGVzKCk7XG4gIGNvbnN0IGNhc2VzOiBTaGVybG9ja0Nhc2VbXSA9IFtdO1xuICBjb25zdCB0YXNrczogU2hlcmxvY2tUYXNrW10gPSBbXTtcbiAgY29uc3Qgc2NoZWR1bGVzOiBTaGVybG9ja1NjaGVkdWxlW10gPSBbXTtcbiAgY29uc3QgY29sbGVjdGlvbnM6IFNoZXJsb2NrQ29sbGVjdGlvbltdID0gW107XG4gIGNvbnN0IGV2aWRlbmNlOiBTaGVybG9ja0V2aWRlbmNlW10gPSBbXTtcbiAgY29uc3QgcGxhY2VzOiBTaGVybG9ja1BsYWNlW10gPSBbXTtcblxuICBmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcbiAgICBjb25zdCBjYWNoZSA9IGFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKTtcbiAgICBjb25zdCBmcm9udG1hdHRlciA9IGNhY2hlPy5mcm9udG1hdHRlcjtcbiAgICBjb25zdCB0eXBlID0gZnJvbnRtYXR0ZXI/LnR5cGU7XG5cbiAgICBpZiAoIUVOVElUWV9UWVBFUy5pbmNsdWRlcyh0eXBlKSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgY29uc3QgYmFzZSA9IHtcbiAgICAgIGZpbGVQYXRoOiBmaWxlLnBhdGgsXG4gICAgICBuYW1lOiBTdHJpbmcoZnJvbnRtYXR0ZXI/LnRpdGxlID8/IGZpbGUuYmFzZW5hbWUpLFxuICAgICAgdHlwZSxcbiAgICAgIGNyZWF0ZWQ6IGFzU3RyaW5nKGZyb250bWF0dGVyPy5jcmVhdGVkKSxcbiAgICAgIHVwZGF0ZWQ6IGFzU3RyaW5nKGZyb250bWF0dGVyPy51cGRhdGVkKVxuICAgIH07XG5cbiAgICBpZiAodHlwZSA9PT0gXCJjYXNlXCIpIHtcbiAgICAgIGNhc2VzLnB1c2goe1xuICAgICAgICAuLi5iYXNlLFxuICAgICAgICB0eXBlLFxuICAgICAgICBzdGF0dXM6IGFzQ2FzZVN0YXR1cyhmcm9udG1hdHRlcj8uc3RhdHVzKSxcbiAgICAgICAgcHJpb3JpdHk6IGFzUHJpb3JpdHkoZnJvbnRtYXR0ZXI/LnByaW9yaXR5KSxcbiAgICAgICAgZGVhZGxpbmU6IGFzU3RyaW5nKGZyb250bWF0dGVyPy5kZWFkbGluZSksXG4gICAgICAgIHRhZ3M6IEFycmF5LmlzQXJyYXkoZnJvbnRtYXR0ZXI/LnRhZ3MpID8gZnJvbnRtYXR0ZXIudGFncy5tYXAoU3RyaW5nKSA6IFtdXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAodHlwZSA9PT0gXCJ0YXNrXCIpIHtcbiAgICAgIHRhc2tzLnB1c2goe1xuICAgICAgICAuLi5iYXNlLFxuICAgICAgICB0eXBlLFxuICAgICAgICBzdGF0dXM6IGFzVGFza1N0YXR1cyhmcm9udG1hdHRlcj8uc3RhdHVzKSxcbiAgICAgICAgY2FzZTogYXNTdHJpbmcoZnJvbnRtYXR0ZXI/LmNhc2UpLFxuICAgICAgICBjYXNlUGF0aDogYXNTdHJpbmcoZnJvbnRtYXR0ZXI/LmNhc2VQYXRoKSxcbiAgICAgICAgcHJpb3JpdHk6IGFzUHJpb3JpdHkoZnJvbnRtYXR0ZXI/LnByaW9yaXR5KSxcbiAgICAgICAgZHVlOiBhc1N0cmluZyhmcm9udG1hdHRlcj8uZHVlKVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGUgPT09IFwic2NoZWR1bGVcIikge1xuICAgICAgc2NoZWR1bGVzLnB1c2goe1xuICAgICAgICAuLi5iYXNlLFxuICAgICAgICB0eXBlLFxuICAgICAgICBkYXk6IGFzU3RyaW5nKGZyb250bWF0dGVyPy5kYXkpLFxuICAgICAgICBzdGFydDogYXNTdHJpbmcoZnJvbnRtYXR0ZXI/LnN0YXJ0KSxcbiAgICAgICAgZW5kOiBhc1N0cmluZyhmcm9udG1hdHRlcj8uZW5kKSxcbiAgICAgICAgZHVyYXRpb25NaW51dGVzOiBhc051bWJlcihmcm9udG1hdHRlcj8uZHVyYXRpb25NaW51dGVzKSxcbiAgICAgICAgcmVsYXRlZFRhc2s6IGFzU3RyaW5nKGZyb250bWF0dGVyPy5yZWxhdGVkVGFzayksXG4gICAgICAgIHJlbGF0ZWRUYXNrUGF0aDogYXNTdHJpbmcoZnJvbnRtYXR0ZXI/LnJlbGF0ZWRUYXNrUGF0aClcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0eXBlID09PSBcImNvbGxlY3Rpb25cIikge1xuICAgICAgY29sbGVjdGlvbnMucHVzaCh7XG4gICAgICAgIC4uLmJhc2UsXG4gICAgICAgIHR5cGUsXG4gICAgICAgIHN0YXR1czogYXNDb2xsZWN0aW9uU3RhdHVzKGZyb250bWF0dGVyPy5zdGF0dXMpLFxuICAgICAgICBtZWRpdW06IGFzQ29sbGVjdGlvbk1lZGl1bShmcm9udG1hdHRlcj8ubWVkaXVtKSxcbiAgICAgICAgY2FzZTogYXNTdHJpbmcoZnJvbnRtYXR0ZXI/LmNhc2UpLFxuICAgICAgICBjYXNlUGF0aDogYXNTdHJpbmcoZnJvbnRtYXR0ZXI/LmNhc2VQYXRoKSxcbiAgICAgICAgcmF0aW5nOiBhc051bWJlcihmcm9udG1hdHRlcj8ucmF0aW5nKVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGUgPT09IFwiZXZpZGVuY2VcIikge1xuICAgICAgZXZpZGVuY2UucHVzaCh7XG4gICAgICAgIC4uLmJhc2UsXG4gICAgICAgIHR5cGUsXG4gICAgICAgIGNhc2U6IGFzU3RyaW5nKGZyb250bWF0dGVyPy5jYXNlKSxcbiAgICAgICAgY2FzZVBhdGg6IGFzU3RyaW5nKGZyb250bWF0dGVyPy5jYXNlUGF0aCksXG4gICAgICAgIHNvdXJjZTogYXNTdHJpbmcoZnJvbnRtYXR0ZXI/LnNvdXJjZSlcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0eXBlID09PSBcInBsYWNlXCIpIHtcbiAgICAgIHBsYWNlcy5wdXNoKHtcbiAgICAgICAgLi4uYmFzZSxcbiAgICAgICAgdHlwZSxcbiAgICAgICAgY2l0eTogYXNTdHJpbmcoZnJvbnRtYXR0ZXI/LmNpdHkpLFxuICAgICAgICBjb3VudHJ5OiBhc1N0cmluZyhmcm9udG1hdHRlcj8uY291bnRyeSksXG4gICAgICAgIGxhdGl0dWRlOiBhc051bWJlcihmcm9udG1hdHRlcj8ubGF0aXR1ZGUpLFxuICAgICAgICBsb25naXR1ZGU6IGFzTnVtYmVyKGZyb250bWF0dGVyPy5sb25naXR1ZGUpLFxuICAgICAgICB2aXNpdGVkQXQ6IGFzU3RyaW5nKGZyb250bWF0dGVyPy52aXNpdGVkQXQpLFxuICAgICAgICBjb3ZlcjogYXNTdHJpbmcoZnJvbnRtYXR0ZXI/LmNvdmVyKSxcbiAgICAgICAgY2FzZTogYXNTdHJpbmcoZnJvbnRtYXR0ZXI/LmNhc2UpLFxuICAgICAgICBjYXNlUGF0aDogYXNTdHJpbmcoZnJvbnRtYXR0ZXI/LmNhc2VQYXRoKVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgY2FzZXMuc29ydChieVVwZGF0ZWREZXNjKTtcbiAgdGFza3Muc29ydChieVVwZGF0ZWREZXNjKTtcbiAgc2NoZWR1bGVzLnNvcnQoYnlVcGRhdGVkRGVzYyk7XG4gIGNvbGxlY3Rpb25zLnNvcnQoYnlVcGRhdGVkRGVzYyk7XG4gIGV2aWRlbmNlLnNvcnQoYnlVcGRhdGVkRGVzYyk7XG4gIHBsYWNlcy5zb3J0KGJ5VXBkYXRlZERlc2MpO1xuXG4gIHJldHVybiB7IGNhc2VzLCB0YXNrcywgc2NoZWR1bGVzLCBjb2xsZWN0aW9ucywgZXZpZGVuY2UsIHBsYWNlcyB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0TG9jYWxEYXRlKGRhdGU6IERhdGUpOiBzdHJpbmcge1xuICBjb25zdCB5ZWFyID0gZGF0ZS5nZXRGdWxsWWVhcigpO1xuICBjb25zdCBtb250aCA9IFN0cmluZyhkYXRlLmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCBcIjBcIik7XG4gIGNvbnN0IGRheSA9IFN0cmluZyhkYXRlLmdldERhdGUoKSkucGFkU3RhcnQoMiwgXCIwXCIpO1xuICByZXR1cm4gYCR7eWVhcn0tJHttb250aH0tJHtkYXl9YDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZVR5cGVkTm90ZShcbiAgYXBwOiBBcHAsXG4gIGZvbGRlcjogc3RyaW5nLFxuICB0aXRsZTogc3RyaW5nLFxuICB0ZW1wbGF0ZTogc3RyaW5nXG4pOiBQcm9taXNlPFRGaWxlPiB7XG4gIGNvbnN0IHNhZmVOYW1lID0gdGl0bGUucmVwbGFjZSgvW1xcXFwvOio/XCI8PnxdL2csIFwiLVwiKS50cmltKCkgfHwgXCJVbnRpdGxlZFwiO1xuICBjb25zdCBmaWxlUGF0aCA9IG5vcm1hbGl6ZVBhdGgoYCR7Zm9sZGVyfS8ke3NhZmVOYW1lfS5tZGApO1xuICBjb25zdCBleGlzdGluZyA9IGFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoZmlsZVBhdGgpO1xuICBpZiAoZXhpc3RpbmcgaW5zdGFuY2VvZiBURmlsZSkge1xuICAgIHJldHVybiBleGlzdGluZztcbiAgfVxuICByZXR1cm4gYXBwLnZhdWx0LmNyZWF0ZShmaWxlUGF0aCwgdGVtcGxhdGUpO1xufVxuXG5mdW5jdGlvbiBhc1N0cmluZyh2YWx1ZTogdW5rbm93bik6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgPyB2YWx1ZSA6IHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gYXNQcmlvcml0eSh2YWx1ZTogdW5rbm93bik6IFwibG93XCIgfCBcIm1lZGl1bVwiIHwgXCJoaWdoXCIgfCB1bmRlZmluZWQge1xuICByZXR1cm4gdmFsdWUgPT09IFwibG93XCIgfHwgdmFsdWUgPT09IFwibWVkaXVtXCIgfHwgdmFsdWUgPT09IFwiaGlnaFwiID8gdmFsdWUgOiB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIGFzTnVtYmVyKHZhbHVlOiB1bmtub3duKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJudW1iZXJcIikge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuICBpZiAodHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiKSB7XG4gICAgY29uc3QgcGFyc2VkID0gTnVtYmVyKHZhbHVlKTtcbiAgICByZXR1cm4gTnVtYmVyLmlzRmluaXRlKHBhcnNlZCkgPyBwYXJzZWQgOiB1bmRlZmluZWQ7XG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gYXNDYXNlU3RhdHVzKHZhbHVlOiB1bmtub3duKTogXCJvcGVuXCIgfCBcImFjdGl2ZVwiIHwgXCJhcmNoaXZlZFwiIHtcbiAgcmV0dXJuIHZhbHVlID09PSBcImFjdGl2ZVwiIHx8IHZhbHVlID09PSBcImFyY2hpdmVkXCIgPyB2YWx1ZSA6IFwib3BlblwiO1xufVxuXG5mdW5jdGlvbiBhc1Rhc2tTdGF0dXModmFsdWU6IHVua25vd24pOiBcImJhY2tsb2dcIiB8IFwic2NoZWR1bGVkXCIgfCBcImRvbmVcIiB7XG4gIHJldHVybiB2YWx1ZSA9PT0gXCJzY2hlZHVsZWRcIiB8fCB2YWx1ZSA9PT0gXCJkb25lXCIgPyB2YWx1ZSA6IFwiYmFja2xvZ1wiO1xufVxuXG5mdW5jdGlvbiBhc0NvbGxlY3Rpb25TdGF0dXModmFsdWU6IHVua25vd24pOiBcInF1ZXVlZFwiIHwgXCJyZWFkaW5nXCIgfCBcImZpbmlzaGVkXCIgfCB1bmRlZmluZWQge1xuICByZXR1cm4gdmFsdWUgPT09IFwicXVldWVkXCIgfHwgdmFsdWUgPT09IFwicmVhZGluZ1wiIHx8IHZhbHVlID09PSBcImZpbmlzaGVkXCIgPyB2YWx1ZSA6IHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gYXNDb2xsZWN0aW9uTWVkaXVtKHZhbHVlOiB1bmtub3duKTogXCJib29rXCIgfCBcIm1vdmllXCIgfCBcInNlcmllc1wiIHwgXCJhbGJ1bVwiIHwgXCJhcnRpY2xlXCIgfCBcIm90aGVyXCIgfCB1bmRlZmluZWQge1xuICByZXR1cm4gdmFsdWUgPT09IFwiYm9va1wiIHx8IHZhbHVlID09PSBcIm1vdmllXCIgfHwgdmFsdWUgPT09IFwic2VyaWVzXCIgfHwgdmFsdWUgPT09IFwiYWxidW1cIiB8fCB2YWx1ZSA9PT0gXCJhcnRpY2xlXCIgfHwgdmFsdWUgPT09IFwib3RoZXJcIlxuICAgID8gdmFsdWVcbiAgICA6IHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gYnlVcGRhdGVkRGVzYzxUIGV4dGVuZHMgeyB1cGRhdGVkPzogc3RyaW5nIH0+KGE6IFQsIGI6IFQpOiBudW1iZXIge1xuICByZXR1cm4gKGIudXBkYXRlZCA/PyBcIlwiKS5sb2NhbGVDb21wYXJlKGEudXBkYXRlZCA/PyBcIlwiKTtcbn1cbiIsICJpbXBvcnQgeyBBcHAsIFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmcgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB0eXBlIFNoZXJsb2NrT1NQbHVnaW4gZnJvbSBcIi4vbWFpblwiO1xuXG5leHBvcnQgY2xhc3MgU2hlcmxvY2tTZXR0aW5nVGFiIGV4dGVuZHMgUGx1Z2luU2V0dGluZ1RhYiB7XG4gIHBsdWdpbjogU2hlcmxvY2tPU1BsdWdpbjtcblxuICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBTaGVybG9ja09TUGx1Z2luKSB7XG4gICAgc3VwZXIoYXBwLCBwbHVnaW4pO1xuICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICB9XG5cbiAgZGlzcGxheSgpOiB2b2lkIHtcbiAgICBjb25zdCB7IGNvbnRhaW5lckVsIH0gPSB0aGlzO1xuICAgIGNvbnRhaW5lckVsLmVtcHR5KCk7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwiU2hlcmxvY2sgT1MgU2V0dGluZ3NcIiB9KTtcblxuICAgIHRoaXMuYWRkVGV4dFNldHRpbmcoY29udGFpbmVyRWwsIFwiXHU2ODQ4XHU0RUY2XHU2NTg3XHU0RUY2XHU1OTM5XCIsIHRoaXMucGx1Z2luLnNldHRpbmdzLmNhc2VGb2xkZXIsIGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuY2FzZUZvbGRlciA9IHZhbHVlLnRyaW0oKSB8fCBcIlNoZXJsb2NrIE9TL0Nhc2VzXCI7XG4gICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICB9KTtcblxuICAgIHRoaXMuYWRkVGV4dFNldHRpbmcoY29udGFpbmVyRWwsIFwiXHU0RUZCXHU1MkExXHU2NTg3XHU0RUY2XHU1OTM5XCIsIHRoaXMucGx1Z2luLnNldHRpbmdzLnRhc2tGb2xkZXIsIGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudGFza0ZvbGRlciA9IHZhbHVlLnRyaW0oKSB8fCBcIlNoZXJsb2NrIE9TL1Rhc2tzXCI7XG4gICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICB9KTtcblxuICAgIHRoaXMuYWRkVGV4dFNldHRpbmcoY29udGFpbmVyRWwsIFwiXHU2MzkyXHU2NzFGXHU2NTg3XHU0RUY2XHU1OTM5XCIsIHRoaXMucGx1Z2luLnNldHRpbmdzLnNjaGVkdWxlRm9sZGVyLCBhc3luYyAodmFsdWUpID0+IHtcbiAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnNjaGVkdWxlRm9sZGVyID0gdmFsdWUudHJpbSgpIHx8IFwiU2hlcmxvY2sgT1MvU2NoZWR1bGVzXCI7XG4gICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICB9KTtcblxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJcdTk2RkVcdTZDMTRcdTVGM0FcdTVFQTZcIilcbiAgICAgIC5zZXREZXNjKFwiXHU2M0E3XHU1MjM2XHU5OTk2XHU5ODc1XHU2QzFCXHU1NkY0XHU1QzQyXHU3Njg0XHU1QjU4XHU1NzI4XHU2MTFGXHUzMDAyXCIpXG4gICAgICAuYWRkU2xpZGVyKChzbGlkZXIpID0+XG4gICAgICAgIHNsaWRlci5zZXRMaW1pdHMoMCwgMTAwLCAxKS5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5mb2dEZW5zaXR5KS5zZXREeW5hbWljVG9vbHRpcCgpLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmZvZ0RlbnNpdHkgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSlcbiAgICAgICk7XG5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiXHU1MkE4XHU2MDAxXHU1RjNBXHU1RUE2XCIpXG4gICAgICAuc2V0RGVzYyhcIlx1NEUzQVx1NTQwRVx1N0VFRFx1OTk5Nlx1OTg3NVx1NTJBOFx1NjAwMVx1NTQ4Q1x1NTQ2OFx1NjM5Mlx1NjcxRlx1NTJBOFx1NzUzQlx1OTg4NFx1NzU1OVx1MzAwMlwiKVxuICAgICAgLmFkZFNsaWRlcigoc2xpZGVyKSA9PlxuICAgICAgICBzbGlkZXIuc2V0TGltaXRzKDAsIDEwMCwgMSkuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MubW90aW9uSW50ZW5zaXR5KS5zZXREeW5hbWljVG9vbHRpcCgpLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLm1vdGlvbkludGVuc2l0eSA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KVxuICAgICAgKTtcbiAgfVxuXG4gIHByaXZhdGUgYWRkVGV4dFNldHRpbmcoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50LCBuYW1lOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcsIG9uQ2hhbmdlOiAodmFsdWU6IHN0cmluZykgPT4gUHJvbWlzZTx2b2lkPik6IHZvaWQge1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUobmFtZSlcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PiB0ZXh0LnNldFBsYWNlaG9sZGVyKHZhbHVlKS5zZXRWYWx1ZSh2YWx1ZSkub25DaGFuZ2Uob25DaGFuZ2UpKTtcbiAgfVxufVxuIiwgImltcG9ydCB7IEl0ZW1WaWV3LCBOb3RpY2UsIFRGaWxlLCBXb3Jrc3BhY2VMZWFmIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgdHlwZSBTaGVybG9ja09TUGx1Z2luIGZyb20gXCIuL21haW5cIjtcbmltcG9ydCB0eXBlIHsgU2hlcmxvY2tDYXNlLCBTaGVybG9ja1BsYWNlLCBTaGVybG9ja1NjaGVkdWxlLCBTaGVybG9ja1Rhc2ssIFNoZXJsb2NrV29ya3NwYWNlRGF0YSB9IGZyb20gXCIuL3R5cGVzXCI7XG5cbmV4cG9ydCBjb25zdCBTSEVSTE9DS19WSUVXX1RZUEUgPSBcInNoZXJsb2NrLW9zLWRhc2hib2FyZFwiO1xuZXhwb3J0IGNvbnN0IExFR0FDWV9TSEVSTE9DS19WSUVXX1RZUEUgPSBcInNoZXJsb2NrLW9zLXdvcmtzcGFjZVwiO1xudHlwZSBTaGVybG9ja1NjcmVlbiA9IFwiZW50cnlcIiB8IFwiaG9tZVwiIHwgXCJjYXNlc1wiIHwgXCJyZWFkaW5nXCIgfCBcImZvb3RwcmludHNcIiB8IFwiY2FzZVwiO1xudHlwZSBTaGVybG9ja0V2aWRlbmNlS2luZCA9IFwibWFya2Rvd25cIiB8IFwicGRmXCIgfCBcImltYWdlXCIgfCBcImxvY2FsXCI7XG5pbnRlcmZhY2UgU2hlcmxvY2tFdmlkZW5jZUl0ZW0ge1xuICBmaWxlOiBURmlsZTtcbiAga2luZDogU2hlcmxvY2tFdmlkZW5jZUtpbmQ7XG59XG5cbmNvbnN0IEVOVFJZX1RSQU5TSVRJT05fTVMgPSAyNjAwO1xuY29uc3QgREVGQVVMVF9TQ0hFRFVMRV9EVVJBVElPTl9NSU5VVEVTID0gNjA7XG5jb25zdCBNQVBfQ0VOVEVSX0xPTkdJVFVERSA9IDEwNTtcbmNvbnN0IFdFRUtfREFZUyA9IFtcbiAgeyBsYWJlbDogXCJNb25cIiwgb2Zmc2V0OiAwIH0sXG4gIHsgbGFiZWw6IFwiVHVlXCIsIG9mZnNldDogMSB9LFxuICB7IGxhYmVsOiBcIldlZFwiLCBvZmZzZXQ6IDIgfSxcbiAgeyBsYWJlbDogXCJUaHVcIiwgb2Zmc2V0OiAzIH0sXG4gIHsgbGFiZWw6IFwiRnJpXCIsIG9mZnNldDogNCB9LFxuICB7IGxhYmVsOiBcIlNhdFwiLCBvZmZzZXQ6IDUgfSxcbiAgeyBsYWJlbDogXCJTdW5cIiwgb2Zmc2V0OiA2IH1cbl0gYXMgY29uc3Q7XG5jb25zdCBUSU1FX1NMT1RTID0gW1wiMDg6MDBcIiwgXCIxMDowMFwiLCBcIjEyOjAwXCIsIFwiMTQ6MDBcIiwgXCIxNjowMFwiLCBcIjE5OjAwXCJdO1xuXG5leHBvcnQgY2xhc3MgU2hlcmxvY2tXb3Jrc3BhY2VWaWV3IGV4dGVuZHMgSXRlbVZpZXcge1xuICBwbHVnaW46IFNoZXJsb2NrT1NQbHVnaW47XG4gIHByaXZhdGUgc2NyZWVuOiBTaGVybG9ja1NjcmVlbiA9IFwiZW50cnlcIjtcbiAgcHJpdmF0ZSBzZWxlY3RlZENhc2VQYXRoPzogc3RyaW5nO1xuICBwcml2YXRlIGhhc0VudGVyZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSBlbnRyeVRpbWVyPzogbnVtYmVyO1xuXG4gIGNvbnN0cnVjdG9yKGxlYWY6IFdvcmtzcGFjZUxlYWYsIHBsdWdpbjogU2hlcmxvY2tPU1BsdWdpbikge1xuICAgIHN1cGVyKGxlYWYpO1xuICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICB9XG5cbiAgZ2V0Vmlld1R5cGUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gU0hFUkxPQ0tfVklFV19UWVBFO1xuICB9XG5cbiAgZ2V0RGlzcGxheVRleHQoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gXCJTaGVybG9ja1wiO1xuICB9XG5cbiAgZ2V0SWNvbigpOiBzdHJpbmcge1xuICAgIHJldHVybiBcInNlYXJjaC1jaGVja1wiO1xuICB9XG5cbiAgYXN5bmMgb25PcGVuKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgICAgdGhpcy5jb250ZW50RWwuYWRkQ2xhc3MoXCJzaGVybG9jay1vcy12aWV3XCIpO1xuICAgICAgYXdhaXQgdGhpcy5yZXNldFRvRW50cnkoKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5wbHVnaW4uZGVidWdMb2coYHZpZXc6b25PcGVuOmVycm9yOiR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLnN0YWNrID8/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgICAgdGhpcy5yZW5kZXJGYWxsYmFjayhlcnJvcik7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgb25DbG9zZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5lbnRyeVRpbWVyKSB7XG4gICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHRoaXMuZW50cnlUaW1lcik7XG4gICAgICB0aGlzLmVudHJ5VGltZXIgPSB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcmVmcmVzaCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5yZW5kZXJDdXJyZW50U2NyZWVuKCk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMucGx1Z2luLmRlYnVnTG9nKGB2aWV3OnJlZnJlc2g6ZXJyb3I6JHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3Iuc3RhY2sgPz8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgICB0aGlzLnJlbmRlckZhbGxiYWNrKGVycm9yKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyByZXNldFRvRW50cnkoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMuZW50cnlUaW1lcikge1xuICAgICAgd2luZG93LmNsZWFyVGltZW91dCh0aGlzLmVudHJ5VGltZXIpO1xuICAgICAgdGhpcy5lbnRyeVRpbWVyID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB0aGlzLnNlbGVjdGVkQ2FzZVBhdGggPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5oYXNFbnRlcmVkID0gZmFsc2U7XG4gICAgdGhpcy5zY3JlZW4gPSBcImVudHJ5XCI7XG4gICAgYXdhaXQgdGhpcy5yZW5kZXJDdXJyZW50U2NyZWVuKCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlbmRlckN1cnJlbnRTY3JlZW4oKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMuc2NyZWVuID09PSBcImVudHJ5XCIgJiYgIXRoaXMuaGFzRW50ZXJlZCkge1xuICAgICAgdGhpcy5yZW5kZXJFbnRyeVNjcmVlbigpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnNjcmVlbiA9PT0gXCJjYXNlXCIgJiYgdGhpcy5zZWxlY3RlZENhc2VQYXRoKSB7XG4gICAgICBhd2FpdCB0aGlzLnJlbmRlckNhc2VXb3Jrc3BhY2UodGhpcy5zZWxlY3RlZENhc2VQYXRoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5zY3JlZW4gPT09IFwiY2FzZXNcIikge1xuICAgICAgYXdhaXQgdGhpcy5yZW5kZXJDYXNlRGVzaygpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnNjcmVlbiA9PT0gXCJyZWFkaW5nXCIpIHtcbiAgICAgIGF3YWl0IHRoaXMucmVuZGVyUmVhZGluZ0Rlc2soKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5zY3JlZW4gPT09IFwiZm9vdHByaW50c1wiKSB7XG4gICAgICBhd2FpdCB0aGlzLnJlbmRlckZvb3RwcmludERlc2soKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLnJlbmRlckhvbWUoKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyRW50cnlTY3JlZW4oKTogdm9pZCB7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICBjb25zdCBpbWFnZVVybCA9IHRoaXMucGx1Z2luLmdldEVudHJ5SW1hZ2VVcmwoKTtcbiAgICBjb25zdCBlbnRyeSA9IHRoaXMuY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1lbnRyeS1zY3JlZW4gaXMtd2FybWluZ1wiIH0pO1xuICAgIGVudHJ5LnN0eWxlLmJhY2tncm91bmRJbWFnZSA9IGBsaW5lYXItZ3JhZGllbnQoMTgwZGVnLCByZ2JhKDcsIDksIDExLCAwLjA4KSwgcmdiYSg2LCA3LCA4LCAwLjI4KSksIHVybChcIiR7aW1hZ2VVcmx9XCIpYDtcbiAgICBlbnRyeS5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stZW50cnktYW1iaWVudFwiIH0pO1xuICAgIGVudHJ5LmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1lbnRyeS1mcmFtZVwiIH0pO1xuICAgIGVudHJ5LmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1lbnRyeS12ZWlsXCIgfSk7XG4gICAgY29uc3QgYm9va0J1dHRvbiA9IGVudHJ5LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcbiAgICAgIGNsczogXCJzaGVybG9jay1lbnRyeS1ib29rXCIsXG4gICAgICBhdHRyOiB7XG4gICAgICAgIFwiYXJpYS1sYWJlbFwiOiBcIkVudGVyIFNoZXJsb2NrIE9TXCJcbiAgICAgIH1cbiAgICB9KTtcbiAgICBib29rQnV0dG9uLmNyZWF0ZVNwYW4oeyBjbHM6IFwic2hlcmxvY2stZW50cnktcmluZ1wiIH0pO1xuICAgIGJvb2tCdXR0b24uY3JlYXRlU3Bhbih7IGNsczogXCJzaGVybG9jay1lbnRyeS1vcmJpdFwiIH0pO1xuICAgIGNvbnN0IGNhcHRpb24gPSBlbnRyeS5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stZW50cnktY2FwdGlvblwiIH0pO1xuICAgIGNhcHRpb24uY3JlYXRlRWwoXCJzcGFuXCIsIHsgdGV4dDogXCJTaGVybG9ja1wiIH0pO1xuICAgIGNhcHRpb24uY3JlYXRlRWwoXCJzbWFsbFwiLCB7IHRleHQ6IFwiMjIxQiBjYXNlIGNvbnNvbGVcIiB9KTtcbiAgICBjb25zdCBoaW50ID0gZW50cnkuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWVudHJ5LWhpbnRcIiB9KTtcbiAgICBoaW50LnNldFRleHQoXCJcdTcwQjlcdTUxRkJcdTRFMkRcdTU5MkVcdTUzNzdcdTVCOTdcdUZGMENcdTcwQjlcdTRFQUVcdTY4NDhcdTRFRjZcdTY4NENcIik7XG5cbiAgICBjb25zdCBwcmVsb2FkID0gbmV3IEltYWdlKCk7XG4gICAgcHJlbG9hZC5zcmMgPSBpbWFnZVVybDtcbiAgICBjb25zdCBpbWFnZVJlYWR5ID0gcHJlbG9hZC5kZWNvZGUgPyBwcmVsb2FkLmRlY29kZSgpIDogUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgaW1hZ2VSZWFkeVxuICAgICAgLnRoZW4oKCkgPT4gZW50cnkuYWRkQ2xhc3MoXCJpcy1yZWFkeVwiKSlcbiAgICAgIC5jYXRjaCgoKSA9PiBlbnRyeS5hZGRDbGFzcyhcImlzLXJlYWR5XCIpKTtcblxuICAgIGxldCBlbnRlcmluZyA9IGZhbHNlO1xuICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChib29rQnV0dG9uLCBcImNsaWNrXCIsICgpID0+IHtcbiAgICAgIGlmIChlbnRlcmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBlbnRlcmluZyA9IHRydWU7XG4gICAgICBib29rQnV0dG9uLnNldEF0dHJpYnV0ZShcImRpc2FibGVkXCIsIFwidHJ1ZVwiKTtcbiAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgICAgICBlbnRyeS5yZW1vdmVDbGFzcyhcImlzLXdhcm1pbmdcIik7XG4gICAgICAgIGVudHJ5LmFkZENsYXNzKFwiaXMtZW50ZXJpbmdcIik7XG4gICAgICB9KTtcbiAgICAgIHRoaXMuZW50cnlUaW1lciA9IHdpbmRvdy5zZXRUaW1lb3V0KGFzeW5jICgpID0+IHtcbiAgICAgICAgdGhpcy5oYXNFbnRlcmVkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5zY3JlZW4gPSBcImhvbWVcIjtcbiAgICAgICAgYXdhaXQgdGhpcy5yZW5kZXJIb21lKCk7XG4gICAgICB9LCBFTlRSWV9UUkFOU0lUSU9OX01TKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcmVuZGVySG9tZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLnBsdWdpbi5kZWJ1Z0xvZyhcInZpZXc6cmVuZGVyOnN0YXJ0XCIpO1xuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCB0aGlzLnBsdWdpbi5nZXRXb3Jrc3BhY2VEYXRhKCk7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcblxuICAgIGNvbnN0IHNoZWxsID0gdGhpcy5jb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLXNoZWxsIHNoZXJsb2NrLWhvbWUtc2hlbGxcIiB9KTtcbiAgICBzaGVsbC5kYXRhc2V0LnBlcmlvZCA9IHRoaXMucmVzb2x2ZVBlcmlvZCgpO1xuICAgIHRoaXMuY3JlYXRlUGFybG9yQmFja2Ryb3Aoc2hlbGwpO1xuICAgIHNoZWxsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1hdG1vc3BoZXJlIHNoZXJsb2NrLWZvZy1sYXllclwiIH0pO1xuICAgIHNoZWxsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1hdG1vc3BoZXJlIHNoZXJsb2NrLWdyYWluLWxheWVyXCIgfSk7XG4gICAgc2hlbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWF0bW9zcGhlcmUgc2hlcmxvY2stbWFwLWxheWVyXCIgfSk7XG4gICAgY29uc3QgaGVybyA9IHNoZWxsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1oZXJvIHNoZXJsb2NrLWhvbWUtaGVyb1wiIH0pO1xuICAgIGNvbnN0IGNvcHkgPSBoZXJvLmNyZWF0ZURpdigpO1xuICAgIGNvcHkuY3JlYXRlRWwoXCJwXCIsIHsgY2xzOiBcInNoZXJsb2NrLWtpY2tlclwiLCB0ZXh0OiBcIjIyMUIgQmFrZXIgU3RyZWV0IC8gSG9tZSBIYWxsXCIgfSk7XG4gICAgY29weS5jcmVhdGVFbChcImgxXCIsIHsgY2xzOiBcInNoZXJsb2NrLXRpdGxlXCIsIHRleHQ6IFwiU2hlcmxvY2tcIiB9KTtcbiAgICBjb3B5LmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICBjbHM6IFwic2hlcmxvY2stZWRpdG9yaWFsLW5vdGVcIixcbiAgICAgIHRleHQ6IHRoaXMucmVzb2x2ZVBlcmlvZCgpID09PSBcIm5pZ2h0XCJcbiAgICAgICAgPyBcIlx1NTkxQ1x1ODI3Mlx1OTFDQ1x1NzY4NFx1NEYyNlx1NjU2Nlx1NjZGNFx1OTAwMlx1NTQwOFx1NjNBOFx1NzQwNlx1MzAwMlx1NjI4QVx1N0VCRlx1N0QyMlx1MzAwMVx1NjVFNVx1N0EwQlx1ODg2OFx1MzAwMVx1NzgxNFx1N0E3Nlx1NEUwRVx1NTZERVx1NUZDNlx1NjU3NFx1NzQwNlx1OEZEQlx1NTQwQ1x1NEUwMFx1NUYyMFx1Njg0OFx1NEVGNlx1Njg0Q1x1MzAwMlwiXG4gICAgICAgIDogXCJcdTc2N0RcdTY2M0NcdTkwMDJcdTU0MDhcdTVGNTJcdTY4NjNcdTRFMEVcdTYzOTJcdTdBMEJcdTMwMDJcdThCQTlcdTRGNjBcdTc2ODRcdTdCMTRcdThCQjBcdTMwMDFcdTRFOEJcdTUyQTFcdTRFMEVcdThENDRcdTY1OTlcdTUwQ0ZcdTY4NDhcdTUzNzdcdTRFMDBcdTY4MzdcdTg4QUJcdTdDRkJcdTdFREZcdTY1NzRcdTc0MDZcdTMwMDJcIlxuICAgIH0pO1xuXG4gICAgY29uc3QgaHViID0gc2hlbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWhvbWUtaHViXCIgfSk7XG4gICAgdGhpcy5jcmVhdGVIb21lUG9ydGFsKGh1Yiwge1xuICAgICAgbGFiZWw6IFwiUFJPSkVDVCBERVNLXCIsXG4gICAgICB0aXRsZTogXCJcdTY4NDhcdTRFRjZcdTUzNzdcdTVCOTdcdTRFMEVcdThDMDNcdTY3RTVcdTYzOTJcdTY3MUZcIixcbiAgICAgIHRleHQ6IGBcdTdCQTFcdTc0MDYgJHtkYXRhLmNhc2VzLmxlbmd0aH0gXHU1Qjk3XHU2ODQ4XHU0RUY2XHUzMDAxJHtkYXRhLnRhc2tzLmZpbHRlcigoaXRlbSkgPT4gaXRlbS5zdGF0dXMgIT09IFwiZG9uZVwiKS5sZW5ndGh9IFx1Njc2MVx1N0VCRlx1N0QyMlx1NEVGQlx1NTJBMVx1NTQ4QyAke2RhdGEuc2NoZWR1bGVzLmxlbmd0aH0gXHU2NzYxXHU2MzkyXHU2NzFGXHUzMDAyYCxcbiAgICAgIGJ1dHRvbjogXCJcdTYyNTNcdTVGMDBcdTY4NDhcdTRFRjZcdTY4NENcIixcbiAgICAgIHNjcmVlbjogXCJjYXNlc1wiLFxuICAgICAgdG9uZTogXCJib2FyZFwiXG4gICAgfSk7XG4gICAgdGhpcy5jcmVhdGVIb21lUG9ydGFsKGh1Yiwge1xuICAgICAgbGFiZWw6IFwiQVJDSElWRSBERVNLXCIsXG4gICAgICB0aXRsZTogXCJcdThCQzFcdTcyNjlcdTc4MTRcdThCRkJcdTRFMEVcdTY4NjNcdTY4NDhcdTY3RENcIixcbiAgICAgIHRleHQ6IGBcdTZCNjNcdTU3MjhcdTc4MTRcdThCRkIgJHtkYXRhLmNvbGxlY3Rpb25zLmZpbHRlcigoaXRlbSkgPT4gaXRlbS5zdGF0dXMgIT09IFwiZmluaXNoZWRcIikubGVuZ3RofSBcdTk4NzlcdUZGMENcdThCQzFcdTcyNjlcdTY3RENcdTVERjJcdTY3MDkgJHtkYXRhLmV2aWRlbmNlLmxlbmd0aH0gXHU0RUZEXHU1M0VGXHU3RjE2XHU4RjkxXHU2ODYzXHU2ODQ4XHUzMDAyYCxcbiAgICAgIGJ1dHRvbjogXCJcdTYyNTNcdTVGMDBcdTY4NjNcdTY4NDhcdTY4NENcIixcbiAgICAgIHNjcmVlbjogXCJyZWFkaW5nXCIsXG4gICAgICB0b25lOiBcInN0dWR5XCJcbiAgICB9KTtcbiAgICB0aGlzLmNyZWF0ZUhvbWVQb3J0YWwoaHViLCB7XG4gICAgICBsYWJlbDogXCJNRU1PUlkgTUFQXCIsXG4gICAgICB0aXRsZTogXCJcdThEQjNcdThGRjlcdTU3MzBcdTU2RkVcIixcbiAgICAgIHRleHQ6IGAke2RhdGEucGxhY2VzLmxlbmd0aH0gXHU0RTJBXHU1N0NFXHU1RTAyXHU1MTQ5XHU3MEI5XHUzMDAyXHU2QkNGXHU2QjIxXHU1MjMwXHU4QkJGXHU5MEZEXHU1M0VGXHU0RUU1XHU2Qzg5XHU2REMwXHU2MjEwXHU3MTY3XHU3MjQ3XHUzMDAxXHU2NUU1XHU2NzFGXHU0RTBFXHU3QjE0XHU4QkIwXHUzMDAyYCxcbiAgICAgIGJ1dHRvbjogXCJcdTYyNTNcdTVGMDBcdTU3MzBcdTU2RkVcIixcbiAgICAgIHNjcmVlbjogXCJmb290cHJpbnRzXCIsXG4gICAgICB0b25lOiBcIm1hcFwiXG4gICAgfSk7XG4gICAgdGhpcy5wbHVnaW4uZGVidWdMb2coXCJ2aWV3OnJlbmRlcjpjb21wbGV0ZVwiKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcmVuZGVyQ2FzZURlc2soKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHRoaXMucGx1Z2luLmdldFdvcmtzcGFjZURhdGEoKTtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIGNvbnN0IHNoZWxsID0gdGhpcy5jcmVhdGVEZXNrU2hlbGwoXCJzaGVybG9jay1jYXNlLWRlc2stc2hlbGxcIik7XG4gICAgdGhpcy5yZW5kZXJEZXNrSGVhZGVyKHNoZWxsLCBcIlByb2plY3QgRGVza1wiLCBcIlx1Njg0OFx1NEVGNlx1NTM3N1x1NUI5N1x1NEUwRVx1OEMwM1x1NjdFNVx1NjM5Mlx1NjcxRlwiLCBcIlx1Njg0OFx1NEVGNlx1MzAwMVx1NEVGQlx1NTJBMVx1NTQ4Q1x1NjcyQ1x1NTQ2OFx1OEMwM1x1NjdFNVx1NjM5Mlx1NjcxRlx1NjUzRVx1NTcyOFx1NTQwQ1x1NEUwMFx1NEUyQVx1NURFNVx1NEY1Q1x1NTNGMFx1OTFDQ1x1RkYwQ1x1NTE0OFx1OTAwOVx1Njg0OFx1NEVGNlx1RkYwQ1x1NTE4RFx1NjI4QVx1NzcxRlx1NkI2M1x1ODk4MVx1NjI2N1x1ODg0Q1x1NzY4NFx1N0VCRlx1N0QyMlx1NjI5NVx1OTAxMlx1NTIzMFx1NTQ2OFx1Njc3Rlx1MzAwMlwiLCBbXG4gICAgICB7IGxhYmVsOiBcIlx1NjVCMFx1NUVGQVx1Njg0OFx1NEVGNlwiLCBhY3Rpb246IGFzeW5jICgpID0+IHRoaXMucGx1Z2luLmNyZWF0ZUNhc2VOb3RlKCkgfSxcbiAgICAgIHsgbGFiZWw6IFwiXHU2NUIwXHU1RUZBXHU0RUZCXHU1MkExXCIsIGFjdGlvbjogYXN5bmMgKCkgPT4gdGhpcy5wbHVnaW4uY3JlYXRlVGFza05vdGUoKSB9LFxuICAgICAgeyBsYWJlbDogXCJcdTY1QjBcdTVFRkFcdTYzOTJcdTY3MUZcIiwgYWN0aW9uOiBhc3luYyAoKSA9PiB0aGlzLnBsdWdpbi5jcmVhdGVTY2hlZHVsZU5vdGUoKSwgc2Vjb25kYXJ5OiB0cnVlIH1cbiAgICBdKTtcbiAgICBjb25zdCBncmlkID0gc2hlbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWdyaWQgc2hlcmxvY2stZGVzay1ncmlkXCIgfSk7XG4gICAgdGhpcy5yZW5kZXJDYXNlQm9hcmQoZ3JpZCwgZGF0YS5jYXNlcyk7XG4gICAgdGhpcy5yZW5kZXJJbnZlc3RpZ2F0aW9uU2NoZWR1bGVyKGdyaWQsIGRhdGEpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyByZW5kZXJSZWFkaW5nRGVzaygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgdGhpcy5wbHVnaW4uZ2V0V29ya3NwYWNlRGF0YSgpO1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgY29uc3Qgc2hlbGwgPSB0aGlzLmNyZWF0ZURlc2tTaGVsbChcInNoZXJsb2NrLXJlYWRpbmctZGVzay1zaGVsbFwiKTtcbiAgICB0aGlzLnJlbmRlckRlc2tIZWFkZXIoc2hlbGwsIFwiQXJjaGl2ZSBEZXNrXCIsIFwiXHU4QkMxXHU3MjY5XHU3ODE0XHU4QkZCXHU0RTBFXHU2ODYzXHU2ODQ4XHU2N0RDXCIsIFwiXHU2QjYzXHU1NzI4XHU4QkZCXHUzMDAxXHU2QjYzXHU1NzI4XHU3NzBCXHUzMDAxXHU2QjYzXHU1NzI4XHU3ODE0XHU3QTc2XHU3Njg0XHU1MTg1XHU1QkI5XHU1MTQ4XHU3NTU5XHU1NzI4XHU4QkMxXHU3MjY5XHU3ODE0XHU4QkZCXHVGRjFCXHU3ODZFXHU4QkE0XHU2Qzg5XHU2REMwXHU1NDBFXHVGRjBDXHU0RTAwXHU5NTJFXHU1RjUyXHU1MTY1XHU4QkMxXHU3MjY5XHU2N0RDXHVGRjBDXHU0RTRCXHU1NDBFXHU0RUNEXHU1M0VGXHU3RjE2XHU4RjkxXHUzMDAxXHU1MjIwXHU5NjY0XHU1NDhDXHU1MTczXHU4MDU0XHU2ODQ4XHU0RUY2XHUzMDAyXCIsIFtcbiAgICAgIHsgbGFiZWw6IFwiXHU2NUIwXHU1RUZBXHU3ODE0XHU4QkZCXCIsIGFjdGlvbjogYXN5bmMgKCkgPT4gdGhpcy5wbHVnaW4uY3JlYXRlQ29sbGVjdGlvbk5vdGUoKSB9LFxuICAgICAgeyBsYWJlbDogXCJcdTY1QjBcdTVFRkFcdThCQzFcdTcyNjlcIiwgYWN0aW9uOiBhc3luYyAoKSA9PiB0aGlzLnBsdWdpbi5jcmVhdGVFdmlkZW5jZU5vdGUoKSwgc2Vjb25kYXJ5OiB0cnVlIH1cbiAgICBdKTtcbiAgICBjb25zdCBncmlkID0gc2hlbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWdyaWQgc2hlcmxvY2stZGVzay1ncmlkXCIgfSk7XG4gICAgdGhpcy5yZW5kZXJSZWFkaW5nTW9kdWxlKGdyaWQsIGRhdGEpO1xuICAgIHRoaXMucmVuZGVyQXJjaGl2ZU1vZHVsZShncmlkLCBkYXRhKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcmVuZGVyRm9vdHByaW50RGVzaygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgdGhpcy5wbHVnaW4uZ2V0V29ya3NwYWNlRGF0YSgpO1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgY29uc3Qgc2hlbGwgPSB0aGlzLmNyZWF0ZURlc2tTaGVsbChcInNoZXJsb2NrLWZvb3RwcmludC1kZXNrLXNoZWxsXCIpO1xuICAgIHRoaXMucmVuZGVyRGVza0hlYWRlcihzaGVsbCwgXCJNZW1vcnkgTWFwXCIsIFwiXHU4REIzXHU4RkY5XHU1NzMwXHU1NkZFXCIsIFwiXHU1N0NFXHU1RTAyXHU2NjJGXHU4QkIwXHU1RkM2XHU1NzUwXHU2ODA3XHUzMDAyXHU3MEI5XHU1RjAwXHU0RTAwXHU2QjIxXHU1MjMwXHU4QkJGXHVGRjBDXHU1QzMxXHU4MEZEXHU3RUU3XHU3RUVEXHU4ODY1XHU1QzAxXHU5NzYyXHUzMDAxXHU3MTY3XHU3MjQ3XHU1ODk5XHUzMDAxXHU2NUY2XHU5NUY0XHUzMDAxXHU3QjE0XHU4QkIwXHU1NDhDXHU2ODQ4XHU0RUY2L1x1OTYwNVx1OEJGQlx1NTE3M1x1ODA1NFx1MzAwMlwiLCBbXSk7XG4gICAgdGhpcy5yZW5kZXJGb290cHJpbnRNb2R1bGUoc2hlbGwsIGRhdGEpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBuYXZpZ2F0ZVRvKHNjcmVlbjogRXhjbHVkZTxTaGVybG9ja1NjcmVlbiwgXCJlbnRyeVwiIHwgXCJjYXNlXCI+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5zY3JlZW4gPSBzY3JlZW47XG4gICAgdGhpcy5zZWxlY3RlZENhc2VQYXRoID0gdW5kZWZpbmVkO1xuICAgIGF3YWl0IHRoaXMucmVuZGVyQ3VycmVudFNjcmVlbigpO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVIb21lUG9ydGFsKFxuICAgIGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsXG4gICAgY29uZmlnOiB7XG4gICAgICBsYWJlbDogc3RyaW5nO1xuICAgICAgdGl0bGU6IHN0cmluZztcbiAgICAgIHRleHQ6IHN0cmluZztcbiAgICAgIGJ1dHRvbjogc3RyaW5nO1xuICAgICAgc2NyZWVuOiBFeGNsdWRlPFNoZXJsb2NrU2NyZWVuLCBcImVudHJ5XCIgfCBcImNhc2VcIiB8IFwiaG9tZVwiPjtcbiAgICAgIHRvbmU6IFwic3R1ZHlcIiB8IFwiYm9hcmRcIiB8IFwibWFwXCI7XG4gICAgfVxuICApOiB2b2lkIHtcbiAgICBjb25zdCBwb3J0YWwgPSBjb250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IGBzaGVybG9jay1ob21lLXBvcnRhbCAke2NvbmZpZy50b25lfWAgfSk7XG4gICAgcG9ydGFsLmNyZWF0ZUVsKFwic3BhblwiLCB7IGNsczogXCJzaGVybG9jay1zdGFnZS1sYWJlbFwiLCB0ZXh0OiBjb25maWcubGFiZWwgfSk7XG4gICAgcG9ydGFsLmNyZWF0ZUVsKFwic3Ryb25nXCIsIHsgdGV4dDogY29uZmlnLnRpdGxlIH0pO1xuICAgIHBvcnRhbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBjb25maWcudGV4dCB9KTtcbiAgICBwb3J0YWwuY3JlYXRlRWwoXCJiXCIsIHsgdGV4dDogY29uZmlnLmJ1dHRvbiB9KTtcbiAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQocG9ydGFsLCBcImNsaWNrXCIsIGFzeW5jICgpID0+IHRoaXMubmF2aWdhdGVUbyhjb25maWcuc2NyZWVuKSk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZURlc2tTaGVsbChleHRyYUNsYXNzOiBzdHJpbmcpOiBIVE1MRWxlbWVudCB7XG4gICAgY29uc3Qgc2hlbGwgPSB0aGlzLmNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IGBzaGVybG9jay1zaGVsbCBzaGVybG9jay1kZXNrLXNoZWxsICR7ZXh0cmFDbGFzc31gIH0pO1xuICAgIHNoZWxsLmRhdGFzZXQucGVyaW9kID0gdGhpcy5yZXNvbHZlUGVyaW9kKCk7XG4gICAgc2hlbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWF0bW9zcGhlcmUgc2hlcmxvY2stZm9nLWxheWVyXCIgfSk7XG4gICAgc2hlbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWF0bW9zcGhlcmUgc2hlcmxvY2stZ3JhaW4tbGF5ZXJcIiB9KTtcbiAgICByZXR1cm4gc2hlbGw7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckRlc2tIZWFkZXIoXG4gICAgc2hlbGw6IEhUTUxFbGVtZW50LFxuICAgIGtpY2tlcjogc3RyaW5nLFxuICAgIHRpdGxlOiBzdHJpbmcsXG4gICAgc3VidGl0bGU6IHN0cmluZyxcbiAgICBhY3Rpb25zOiBBcnJheTx7IGxhYmVsOiBzdHJpbmc7IGFjdGlvbjogKCkgPT4gUHJvbWlzZTx1bmtub3duPjsgc2Vjb25kYXJ5PzogYm9vbGVhbiB9PlxuICApOiB2b2lkIHtcbiAgICBjb25zdCBoZWFkZXIgPSBzaGVsbC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stZGVzay1oZWFkZXJcIiB9KTtcbiAgICBjb25zdCBiYWNrQnV0dG9uID0gaGVhZGVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLWljb24tYnV0dG9uXCIsIHRleHQ6IFwiXHUyMTkwXCIgfSk7XG4gICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KGJhY2tCdXR0b24sIFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4gdGhpcy5uYXZpZ2F0ZVRvKFwiaG9tZVwiKSk7XG4gICAgY29uc3QgY29weSA9IGhlYWRlci5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stZGVzay1oZWFkaW5nXCIgfSk7XG4gICAgY29weS5jcmVhdGVFbChcInNwYW5cIiwgeyBjbHM6IFwic2hlcmxvY2sta2lja2VyXCIsIHRleHQ6IGtpY2tlciB9KTtcbiAgICBjb3B5LmNyZWF0ZUVsKFwiaDFcIiwgeyB0ZXh0OiB0aXRsZSB9KTtcbiAgICBjb3B5LmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IHN1YnRpdGxlIH0pO1xuICAgIGNvbnN0IGFjdGlvbkdyb3VwID0gaGVhZGVyLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1hY3Rpb25zIHNoZXJsb2NrLWRlc2stYWN0aW9uc1wiIH0pO1xuICAgIGFjdGlvbnMuZm9yRWFjaCgoYWN0aW9uKSA9PiB7XG4gICAgICB0aGlzLmNyZWF0ZUFjdGlvbihhY3Rpb25Hcm91cCwgYWN0aW9uLmxhYmVsLCBhY3Rpb24uYWN0aW9uLCBhY3Rpb24uc2Vjb25kYXJ5KTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyQ2FzZUJvYXJkKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIGNhc2VzOiBTaGVybG9ja0Nhc2VbXSk6IHZvaWQge1xuICAgIGNvbnN0IGNhcmQgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLXBhbmVsIHNoZXJsb2NrLWNhcmQgZnVsbFwiIH0pO1xuICAgIGNvbnN0IGhlYWRlciA9IGNhcmQuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWNhcmQtaGVhZGluZ1wiIH0pO1xuICAgIGNvbnN0IHRpdGxlQmxvY2sgPSBoZWFkZXIuY3JlYXRlRGl2KCk7XG4gICAgdGl0bGVCbG9jay5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJcdTY4NDhcdTRFRjZcdTUzNzdcdTVCOTdcIiB9KTtcbiAgICB0aXRsZUJsb2NrLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IFwiXHU2MzA5XHU3MkI2XHU2MDAxXHU2NTc0XHU3NDA2XHU2MjQwXHU2NzA5XHU2ODQ4XHU0RUY2XHVGRjBDXHU3MEI5XHU1MUZCXHU4RkRCXHU1MTY1XHU2ODQ4XHU0RUY2XHU4QkU2XHU2MEM1XHU1REU1XHU0RjVDXHU1M0YwXHUzMDAyXCIgfSk7XG4gICAgY29uc3QgbmV3Q2FzZUJ1dHRvbiA9IGhlYWRlci5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzaGVybG9jay1taW5pLWJ1dHRvbiBzaGVybG9jay1taW5pLWJ1dHRvbi1zdHJvbmdcIiwgdGV4dDogXCJOZXcgQ2FzZVwiIH0pO1xuICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChuZXdDYXNlQnV0dG9uLCBcImNsaWNrXCIsIGFzeW5jICgpID0+IHRoaXMucGx1Z2luLmNyZWF0ZUNhc2VOb3RlKCkpO1xuICAgIGNvbnN0IGJvYXJkID0gY2FyZC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stYm9hcmRcIiB9KTtcblxuICAgIHRoaXMucmVuZGVyQ2FzZUNvbHVtbihib2FyZCwgXCJPcGVuXCIsIGNhc2VzLmZpbHRlcigoaXRlbSkgPT4gaXRlbS5zdGF0dXMgPT09IFwib3BlblwiKSk7XG4gICAgdGhpcy5yZW5kZXJDYXNlQ29sdW1uKGJvYXJkLCBcIkFjdGl2ZVwiLCBjYXNlcy5maWx0ZXIoKGl0ZW0pID0+IGl0ZW0uc3RhdHVzID09PSBcImFjdGl2ZVwiKSk7XG4gICAgdGhpcy5yZW5kZXJDYXNlQ29sdW1uKGJvYXJkLCBcIkFyY2hpdmVkXCIsIGNhc2VzLmZpbHRlcigoaXRlbSkgPT4gaXRlbS5zdGF0dXMgPT09IFwiYXJjaGl2ZWRcIikpO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJDYXNlQ29sdW1uKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIHRpdGxlOiBzdHJpbmcsIGl0ZW1zOiBTaGVybG9ja0Nhc2VbXSk6IHZvaWQge1xuICAgIGNvbnN0IGNvbHVtbiA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stYm9hcmQtY29sdW1uXCIgfSk7XG4gICAgY29uc3QgY29sdW1uSGVhZGVyID0gY29sdW1uLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1ib2FyZC1jb2x1bW4taGVhZGVyXCIgfSk7XG4gICAgY29sdW1uSGVhZGVyLmNyZWF0ZUVsKFwiaDRcIiwgeyB0ZXh0OiB0aXRsZSB9KTtcbiAgICBjb2x1bW5IZWFkZXIuY3JlYXRlRWwoXCJzcGFuXCIsIHsgdGV4dDogU3RyaW5nKGl0ZW1zLmxlbmd0aCkgfSk7XG4gICAgaWYgKGl0ZW1zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgY29sdW1uLmNyZWF0ZUVsKFwicFwiLCB7IGNsczogXCJzaGVybG9jay1lbXB0eVwiLCB0ZXh0OiBcIlx1NjY4Mlx1NjVFMFx1OEJCMFx1NUY1NVwiIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGxpc3QgPSBjb2x1bW4uY3JlYXRlRWwoXCJ1bFwiLCB7IGNsczogXCJzaGVybG9jay1saXN0XCIgfSk7XG4gICAgaXRlbXMuc2xpY2UoMCwgNCkuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgY29uc3Qgcm93ID0gbGlzdC5jcmVhdGVFbChcImxpXCIsIHsgY2xzOiBcInNoZXJsb2NrLWxpc3QtaXRlbSBzaGVybG9jay1jYXNlLXJvd1wiIH0pO1xuICAgICAgY29uc3QgYm9keSA9IHJvdy5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stbGlzdC1jb3B5XCIgfSk7XG4gICAgICBib2R5LmNyZWF0ZUVsKFwic3Ryb25nXCIsIHsgdGV4dDogaXRlbS5uYW1lIH0pO1xuICAgICAgY29uc3QgbGlua2VkVGFza3MgPSB0aGlzLnBsdWdpblRhc2tDb3VudChpdGVtLmZpbGVQYXRoKTtcbiAgICAgIGJvZHkuY3JlYXRlRWwoXCJzcGFuXCIsIHtcbiAgICAgICAgY2xzOiBcInNoZXJsb2NrLW1ldGFcIixcbiAgICAgICAgdGV4dDogaXRlbS5kZWFkbGluZSA/IGBcdTYyMkFcdTZCNjIgJHtpdGVtLmRlYWRsaW5lfWAgOiBpdGVtLmZpbGVQYXRoXG4gICAgICB9KTtcbiAgICAgIGJvZHkuY3JlYXRlRWwoXCJzcGFuXCIsIHtcbiAgICAgICAgY2xzOiBcInNoZXJsb2NrLW1ldGFcIixcbiAgICAgICAgdGV4dDogbGlua2VkVGFza3MgPiAwID8gYCR7bGlua2VkVGFza3N9IGxpbmtlZCB0YXNrJHtsaW5rZWRUYXNrcyA+IDEgPyBcInNcIiA6IFwiXCJ9YCA6IFwiTm8gbGlua2VkIHRhc2tzIHlldFwiXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHByb2dyZXNzID0gYm9keS5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stY2FzZS1wcm9ncmVzc1wiIH0pO1xuICAgICAgY29uc3QgcHJvZ3Jlc3NGaWxsID0gcHJvZ3Jlc3MuY3JlYXRlRGl2KCk7XG4gICAgICBwcm9ncmVzc0ZpbGwuc3R5bGUud2lkdGggPSBgJHt0aGlzLnJlc29sdmVDYXNlUHJvZ3Jlc3MoaXRlbS5maWxlUGF0aCl9JWA7XG4gICAgICBib2R5LmNyZWF0ZUVsKFwic3BhblwiLCB7IGNsczogXCJzaGVybG9jay1yb3ctYWZmb3JkYW5jZVwiLCB0ZXh0OiBcIkNsaWNrIHRvIG9wZW4gd29ya3NwYWNlXCIgfSk7XG4gICAgICBjb25zdCBzaWRlID0gcm93LmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1saXN0LWFjdGlvbnNcIiB9KTtcbiAgICAgIHNpZGUuY3JlYXRlRWwoXCJzcGFuXCIsIHsgY2xzOiBgc2hlcmxvY2stY2hpcCBwcmlvcml0eS0ke2l0ZW0ucHJpb3JpdHkgPz8gXCJtZWRpdW1cIn1gLCB0ZXh0OiB0aGlzLnJlbmRlclByaW9yaXR5TGFiZWwoaXRlbS5wcmlvcml0eSkgfSk7XG4gICAgICBjb25zdCBhY3Rpb24gPSBzaWRlLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1pbmktYnV0dG9uXCIsIHRleHQ6IFwiK1Rhc2tcIiB9KTtcbiAgICAgIGNvbnN0IGVkaXQgPSBzaWRlLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1pbmktYnV0dG9uXCIsIHRleHQ6IFwiXHU3RjE2XHU4RjkxXCIgfSk7XG4gICAgICBjb25zdCByZW1vdmUgPSBzaWRlLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1pbmktYnV0dG9uIGRhbmdlclwiLCB0ZXh0OiBcIlx1NTIyMFx1OTY2NFwiIH0pO1xuICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KGFjdGlvbiwgXCJjbGlja1wiLCBhc3luYyAoZXZlbnQ6IE1vdXNlRXZlbnQpID0+IHtcbiAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmNyZWF0ZVRhc2tGcm9tQ2FzZShpdGVtLmZpbGVQYXRoKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KGVkaXQsIFwiY2xpY2tcIiwgYXN5bmMgKGV2ZW50OiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5vcGVuUGF0aChpdGVtLmZpbGVQYXRoKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KHJlbW92ZSwgXCJjbGlja1wiLCBhc3luYyAoZXZlbnQ6IE1vdXNlRXZlbnQpID0+IHtcbiAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmRlbGV0ZVBhdGgoaXRlbS5maWxlUGF0aCk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChyb3csIFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4ge1xuICAgICAgICB0aGlzLnNlbGVjdGVkQ2FzZVBhdGggPSBpdGVtLmZpbGVQYXRoO1xuICAgICAgICB0aGlzLnNjcmVlbiA9IFwiY2FzZVwiO1xuICAgICAgICBhd2FpdCB0aGlzLnJlbmRlckN1cnJlbnRTY3JlZW4oKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KHJvdywgXCJkYmxjbGlja1wiLCBhc3luYyAoKSA9PiB0aGlzLnBsdWdpbi5vcGVuUGF0aChpdGVtLmZpbGVQYXRoKSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlbmRlckNhc2VXb3Jrc3BhY2UoY2FzZVBhdGg6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMucGx1Z2luLmRlYnVnTG9nKFwidmlldzpjYXNlOnJlbmRlcjpzdGFydFwiKTtcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgdGhpcy5wbHVnaW4uZ2V0V29ya3NwYWNlRGF0YSgpO1xuICAgIGNvbnN0IGN1cnJlbnRDYXNlID0gZGF0YS5jYXNlcy5maW5kKChpdGVtKSA9PiBpdGVtLmZpbGVQYXRoID09PSBjYXNlUGF0aCk7XG4gICAgaWYgKCFjdXJyZW50Q2FzZSkge1xuICAgICAgdGhpcy5zY3JlZW4gPSBcImNhc2VzXCI7XG4gICAgICBhd2FpdCB0aGlzLnJlbmRlckNhc2VEZXNrKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgY2FzZVRhc2tzID0gZGF0YS50YXNrcy5maWx0ZXIoKHRhc2spID0+IHRhc2suY2FzZVBhdGggPT09IGN1cnJlbnRDYXNlLmZpbGVQYXRoKTtcbiAgICBjb25zdCBjYXNlU2NoZWR1bGVzID0gZGF0YS5zY2hlZHVsZXMuZmlsdGVyKChzY2hlZHVsZSkgPT4ge1xuICAgICAgaWYgKCFzY2hlZHVsZS5yZWxhdGVkVGFza1BhdGgpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGNhc2VUYXNrcy5zb21lKCh0YXNrKSA9PiB0YXNrLmZpbGVQYXRoID09PSBzY2hlZHVsZS5yZWxhdGVkVGFza1BhdGgpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICBjb25zdCBzaGVsbCA9IHRoaXMuY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1zaGVsbCBzaGVybG9jay1jYXNlLXNoZWxsXCIgfSk7XG4gICAgc2hlbGwuZGF0YXNldC5wZXJpb2QgPSB0aGlzLnJlc29sdmVQZXJpb2QoKTtcbiAgICBzaGVsbC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stYXRtb3NwaGVyZSBzaGVybG9jay1mb2ctbGF5ZXJcIiB9KTtcbiAgICBzaGVsbC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stYXRtb3NwaGVyZSBzaGVybG9jay1ncmFpbi1sYXllclwiIH0pO1xuXG4gICAgY29uc3QgaGVhZGVyID0gc2hlbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWNhc2UtaGVhZGVyXCIgfSk7XG4gICAgY29uc3QgYmFja0J1dHRvbiA9IGhlYWRlci5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzaGVybG9jay1pY29uLWJ1dHRvblwiLCB0ZXh0OiBcIlx1MjE5MFwiIH0pO1xuICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChiYWNrQnV0dG9uLCBcImNsaWNrXCIsIGFzeW5jICgpID0+IHtcbiAgICAgIHRoaXMuc2NyZWVuID0gXCJjYXNlc1wiO1xuICAgICAgdGhpcy5zZWxlY3RlZENhc2VQYXRoID0gdW5kZWZpbmVkO1xuICAgICAgYXdhaXQgdGhpcy5yZW5kZXJDYXNlRGVzaygpO1xuICAgIH0pO1xuICAgIGNvbnN0IHRpdGxlQmxvY2sgPSBoZWFkZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWNhc2UtdGl0bGUtYmxvY2tcIiB9KTtcbiAgICB0aXRsZUJsb2NrLmNyZWF0ZUVsKFwic3BhblwiLCB7IGNsczogXCJzaGVybG9jay1raWNrZXJcIiwgdGV4dDogXCJDYXNlIFdvcmtzcGFjZVwiIH0pO1xuICAgIHRpdGxlQmxvY2suY3JlYXRlRWwoXCJoMVwiLCB7IHRleHQ6IGN1cnJlbnRDYXNlLm5hbWUgfSk7XG4gICAgdGl0bGVCbG9jay5jcmVhdGVFbChcInBcIiwge1xuICAgICAgdGV4dDogW2N1cnJlbnRDYXNlLnN0YXR1cywgY3VycmVudENhc2UucHJpb3JpdHkgPyBgJHtjdXJyZW50Q2FzZS5wcmlvcml0eX0gcHJpb3JpdHlgIDogdW5kZWZpbmVkLCBjdXJyZW50Q2FzZS5kZWFkbGluZSA/IGBkdWUgJHtjdXJyZW50Q2FzZS5kZWFkbGluZX1gIDogdW5kZWZpbmVkXVxuICAgICAgICAuZmlsdGVyKEJvb2xlYW4pXG4gICAgICAgIC5qb2luKFwiIC8gXCIpXG4gICAgfSk7XG4gICAgY29uc3QgYWN0aW9ucyA9IGhlYWRlci5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stY2FzZS1hY3Rpb25zXCIgfSk7XG4gICAgdGhpcy5jcmVhdGVBY3Rpb24oYWN0aW9ucywgXCJcdTY1QjBcdTVFRkFcdTdFQkZcdTdEMjJcdTRFRkJcdTUyQTFcIiwgYXN5bmMgKCkgPT4gdGhpcy5wbHVnaW4uY3JlYXRlVGFza0Zyb21DYXNlKGN1cnJlbnRDYXNlLmZpbGVQYXRoKSk7XG4gICAgdGhpcy5jcmVhdGVBY3Rpb24oYWN0aW9ucywgXCJcdTYyNTNcdTVGMDBcdTY4NDhcdTRFRjZcdTY1ODdcdTRFRjZcIiwgYXN5bmMgKCkgPT4gdGhpcy5wbHVnaW4ub3BlblBhdGgoY3VycmVudENhc2UuZmlsZVBhdGgpLCB0cnVlKTtcblxuICAgIGNvbnN0IGJvZHkgPSBzaGVsbC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stY2FzZS1ncmlkXCIgfSk7XG4gICAgdGhpcy5yZW5kZXJDYXNlT3ZlcnZpZXcoYm9keSwgY3VycmVudENhc2UsIGNhc2VUYXNrcywgY2FzZVNjaGVkdWxlcyk7XG4gICAgdGhpcy5yZW5kZXJDYXNlVGFza3MoYm9keSwgY3VycmVudENhc2UsIGNhc2VUYXNrcyk7XG4gICAgdGhpcy5yZW5kZXJDYXNlU2NoZWR1bGUoYm9keSwgY2FzZVNjaGVkdWxlcyk7XG4gICAgdGhpcy5yZW5kZXJDYXNlRXZpZGVuY2UoYm9keSwgY3VycmVudENhc2UpO1xuICAgIHRoaXMucmVuZGVyQ2FzZVRpbWVsaW5lKGJvZHksIGN1cnJlbnRDYXNlLCBjYXNlVGFza3MsIGNhc2VTY2hlZHVsZXMpO1xuICAgIHRoaXMucGx1Z2luLmRlYnVnTG9nKFwidmlldzpjYXNlOnJlbmRlcjpjb21wbGV0ZVwiKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyQ2FzZU92ZXJ2aWV3KGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIGN1cnJlbnRDYXNlOiBTaGVybG9ja0Nhc2UsIHRhc2tzOiBTaGVybG9ja1Rhc2tbXSwgc2NoZWR1bGVzOiBTaGVybG9ja1NjaGVkdWxlW10pOiB2b2lkIHtcbiAgICBjb25zdCBwYW5lbCA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stcGFuZWwgc2hlcmxvY2stY2FzZS1vdmVydmlld1wiIH0pO1xuICAgIHBhbmVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIlx1Njg0OFx1NjBDNVx1NEUyRFx1NjdBMlwiIH0pO1xuICAgIGNvbnN0IHN0YXRzID0gcGFuZWwuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLW1ldHJpYy1yb3dcIiB9KTtcbiAgICB0aGlzLmNyZWF0ZU1ldHJpYyhzdGF0cywgXCJcdTRFRkJcdTUyQTFcIiwgU3RyaW5nKHRhc2tzLmxlbmd0aCkpO1xuICAgIHRoaXMuY3JlYXRlTWV0cmljKHN0YXRzLCBcIlx1NURGMlx1NjM5Mlx1NjcxRlwiLCBTdHJpbmcoc2NoZWR1bGVzLmxlbmd0aCkpO1xuICAgIHRoaXMuY3JlYXRlTWV0cmljKHN0YXRzLCBcIlx1NzJCNlx1NjAwMVwiLCBjdXJyZW50Q2FzZS5zdGF0dXMpO1xuICAgIGNvbnN0IG5vdGVzID0gcGFuZWwuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWNhc2UtYnJpZWZcIiB9KTtcbiAgICBub3Rlcy5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIlx1Njg0OFx1NEVGNlx1NjU4N1x1NEVGNlx1MzAwMVx1NEVGQlx1NTJBMVx1N0VCRlx1N0QyMlx1MzAwMVx1OEMwM1x1NjdFNVx1NjM5Mlx1NjcxRlx1NTQ4Q1x1OEQ0NFx1NjU5OVx1NTE2NVx1NTNFM1x1NEYxQVx1NTcyOFx1OEZEOVx1OTFDQ1x1NkM0N1x1NTQwOFx1MzAwMlwiIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJDYXNlVGFza3MoY29udGFpbmVyOiBIVE1MRWxlbWVudCwgY3VycmVudENhc2U6IFNoZXJsb2NrQ2FzZSwgdGFza3M6IFNoZXJsb2NrVGFza1tdKTogdm9pZCB7XG4gICAgY29uc3QgcGFuZWwgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLXBhbmVsIHNoZXJsb2NrLWNhc2UtcGFuZWxcIiB9KTtcbiAgICBwYW5lbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJcdTdFQkZcdTdEMjJcdTRFRkJcdTUyQTFcIiB9KTtcbiAgICBjb25zdCBsaXN0ID0gcGFuZWwuY3JlYXRlRWwoXCJ1bFwiLCB7IGNsczogXCJzaGVybG9jay1saXN0XCIgfSk7XG4gICAgaWYgKHRhc2tzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgY29uc3Qgcm93ID0gbGlzdC5jcmVhdGVFbChcImxpXCIsIHsgY2xzOiBcInNoZXJsb2NrLWVtcHR5XCIgfSk7XG4gICAgICByb3cuc2V0VGV4dChcIlx1OEZEOVx1NEUyQVx1Njg0OFx1NEVGNlx1OEZEOFx1NkNBMVx1NjcwOVx1NEVGQlx1NTJBMVx1MzAwMlwiKTtcbiAgICAgIGNvbnN0IGJ1dHRvbiA9IHBhbmVsLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLWJ1dHRvblwiLCB0ZXh0OiBcIlx1NTIxQlx1NUVGQVx1N0IyQ1x1NEUwMFx1Njc2MVx1N0VCRlx1N0QyMlwiIH0pO1xuICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KGJ1dHRvbiwgXCJjbGlja1wiLCBhc3luYyAoKSA9PiB0aGlzLnBsdWdpbi5jcmVhdGVUYXNrRnJvbUNhc2UoY3VycmVudENhc2UuZmlsZVBhdGgpKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0YXNrcy5mb3JFYWNoKCh0YXNrKSA9PiB7XG4gICAgICBjb25zdCByb3cgPSBsaXN0LmNyZWF0ZUVsKFwibGlcIiwgeyBjbHM6IFwic2hlcmxvY2stbGlzdC1pdGVtXCIgfSk7XG4gICAgICBjb25zdCBib2R5ID0gcm93LmNyZWF0ZURpdigpO1xuICAgICAgYm9keS5jcmVhdGVFbChcInN0cm9uZ1wiLCB7IHRleHQ6IHRhc2submFtZSB9KTtcbiAgICAgIGJvZHkuY3JlYXRlRWwoXCJzcGFuXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1ldGFcIiwgdGV4dDogW3Rhc2suc3RhdHVzLCB0YXNrLnByaW9yaXR5LCB0YXNrLmR1ZV0uZmlsdGVyKEJvb2xlYW4pLmpvaW4oXCIgLyBcIikgfSk7XG4gICAgICBjb25zdCBzaWRlID0gcm93LmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1saXN0LWFjdGlvbnNcIiB9KTtcbiAgICAgIHNpZGUuY3JlYXRlRWwoXCJzcGFuXCIsIHsgY2xzOiBcInNoZXJsb2NrLWNoaXAgY29tcGFjdFwiLCB0ZXh0OiB0YXNrLnN0YXR1cyB9KTtcbiAgICAgIGNvbnN0IGVkaXQgPSBzaWRlLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1pbmktYnV0dG9uXCIsIHRleHQ6IFwiXHU3RjE2XHU4RjkxXCIgfSk7XG4gICAgICBjb25zdCByZW1vdmUgPSBzaWRlLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1pbmktYnV0dG9uIGRhbmdlclwiLCB0ZXh0OiBcIlx1NTIyMFx1OTY2NFwiIH0pO1xuICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KGVkaXQsIFwiY2xpY2tcIiwgYXN5bmMgKGV2ZW50OiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5vcGVuUGF0aCh0YXNrLmZpbGVQYXRoKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KHJlbW92ZSwgXCJjbGlja1wiLCBhc3luYyAoZXZlbnQ6IE1vdXNlRXZlbnQpID0+IHtcbiAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmRlbGV0ZVBhdGgodGFzay5maWxlUGF0aCk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChyb3csIFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4gdGhpcy5wbHVnaW4ub3BlblBhdGgodGFzay5maWxlUGF0aCkpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJDYXNlU2NoZWR1bGUoY29udGFpbmVyOiBIVE1MRWxlbWVudCwgc2NoZWR1bGVzOiBTaGVybG9ja1NjaGVkdWxlW10pOiB2b2lkIHtcbiAgICBjb25zdCBwYW5lbCA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stcGFuZWwgc2hlcmxvY2stY2FzZS1wYW5lbFwiIH0pO1xuICAgIHBhbmVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIlx1OEMwM1x1NjdFNVx1NjM5Mlx1NjcxRlwiIH0pO1xuICAgIGNvbnN0IGxpc3QgPSBwYW5lbC5jcmVhdGVFbChcInVsXCIsIHsgY2xzOiBcInNoZXJsb2NrLWxpc3RcIiB9KTtcbiAgICBpZiAoc2NoZWR1bGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgbGlzdC5jcmVhdGVFbChcImxpXCIsIHsgY2xzOiBcInNoZXJsb2NrLWVtcHR5XCIsIHRleHQ6IFwiXHU2NjgyXHU2NUUwXHU2MzkyXHU2NzFGXHUzMDAyXHU2MjhBXHU0RUZCXHU1MkExXHU2MkQ2XHU4RkRCXHU1NDY4XHU2NzdGXHU1NDBFXHVGRjBDXHU4RkQ5XHU5MUNDXHU0RjFBXHU4MUVBXHU1MkE4XHU1MUZBXHU3M0IwXHU1MTczXHU4MDU0XHU4QkIwXHU1RjU1XHUzMDAyXCIgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgc2NoZWR1bGVzLmZvckVhY2goKHNjaGVkdWxlKSA9PiB7XG4gICAgICBjb25zdCByb3cgPSBsaXN0LmNyZWF0ZUVsKFwibGlcIiwgeyBjbHM6IFwic2hlcmxvY2stbGlzdC1pdGVtXCIgfSk7XG4gICAgICBjb25zdCBib2R5ID0gcm93LmNyZWF0ZURpdigpO1xuICAgICAgYm9keS5jcmVhdGVFbChcInN0cm9uZ1wiLCB7IHRleHQ6IHNjaGVkdWxlLnJlbGF0ZWRUYXNrID8/IHNjaGVkdWxlLm5hbWUgfSk7XG4gICAgICBib2R5LmNyZWF0ZUVsKFwic3BhblwiLCB7IGNsczogXCJzaGVybG9jay1tZXRhXCIsIHRleHQ6IFtzY2hlZHVsZS5kYXksIHNjaGVkdWxlLnN0YXJ0ICYmIHNjaGVkdWxlLmVuZCA/IGAke3NjaGVkdWxlLnN0YXJ0fS0ke3NjaGVkdWxlLmVuZH1gIDogdW5kZWZpbmVkXS5maWx0ZXIoQm9vbGVhbikuam9pbihcIiAvIFwiKSB9KTtcbiAgICAgIGNvbnN0IHNpZGUgPSByb3cuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWxpc3QtYWN0aW9uc1wiIH0pO1xuICAgICAgY29uc3QgZWRpdCA9IHNpZGUuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwic2hlcmxvY2stbWluaS1idXR0b25cIiwgdGV4dDogXCJcdTdGMTZcdThGOTFcIiB9KTtcbiAgICAgIGNvbnN0IHJlbW92ZSA9IHNpZGUuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwic2hlcmxvY2stbWluaS1idXR0b24gZGFuZ2VyXCIsIHRleHQ6IFwiXHU1MjIwXHU5NjY0XCIgfSk7XG4gICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoZWRpdCwgXCJjbGlja1wiLCBhc3luYyAoZXZlbnQ6IE1vdXNlRXZlbnQpID0+IHtcbiAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLm9wZW5QYXRoKHNjaGVkdWxlLmZpbGVQYXRoKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KHJlbW92ZSwgXCJjbGlja1wiLCBhc3luYyAoZXZlbnQ6IE1vdXNlRXZlbnQpID0+IHtcbiAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmRlbGV0ZVBhdGgoc2NoZWR1bGUuZmlsZVBhdGgpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQocm93LCBcImNsaWNrXCIsIGFzeW5jICgpID0+IHRoaXMucGx1Z2luLm9wZW5QYXRoKHNjaGVkdWxlLmZpbGVQYXRoKSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckNhc2VFdmlkZW5jZShjb250YWluZXI6IEhUTUxFbGVtZW50LCBjdXJyZW50Q2FzZTogU2hlcmxvY2tDYXNlKTogdm9pZCB7XG4gICAgY29uc3QgcGFuZWwgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLXBhbmVsIHNoZXJsb2NrLWNhc2UtcGFuZWxcIiB9KTtcbiAgICBjb25zdCBoZWFkZXIgPSBwYW5lbC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stcGFuZWwtaGVhZGluZ1wiIH0pO1xuICAgIGhlYWRlci5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJcdThCQzFcdTcyNjlcdTY3RENcIiB9KTtcbiAgICBjb25zdCBhY3Rpb25zID0gaGVhZGVyLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1pbmxpbmUtYWN0aW9uc1wiIH0pO1xuICAgIGNvbnN0IGZvbGRlckJ1dHRvbiA9IGFjdGlvbnMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwic2hlcmxvY2stbWluaS1idXR0b25cIiwgdGV4dDogXCJcdTYyNTNcdTVGMDBcdThENDRcdTY1OTlcdTU5MzlcIiB9KTtcbiAgICBjb25zdCBldmlkZW5jZUJ1dHRvbiA9IGFjdGlvbnMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwic2hlcmxvY2stbWluaS1idXR0b25cIiwgdGV4dDogXCJcdTY1QjBcdTVFRkFcdThCQzFcdTcyNjlcIiB9KTtcbiAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoZm9sZGVyQnV0dG9uLCBcImNsaWNrXCIsIGFzeW5jICgpID0+IHRoaXMucGx1Z2luLnJldmVhbEV2aWRlbmNlRm9sZGVyRm9yQ2FzZShjdXJyZW50Q2FzZS5maWxlUGF0aCkpO1xuICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChldmlkZW5jZUJ1dHRvbiwgXCJjbGlja1wiLCBhc3luYyAoKSA9PiB0aGlzLnBsdWdpbi5jcmVhdGVFdmlkZW5jZUZyb21DYXNlKGN1cnJlbnRDYXNlLmZpbGVQYXRoKSk7XG5cbiAgICBjb25zdCBldmlkZW5jZSA9IHRoaXMuZmluZENhc2VFdmlkZW5jZShjdXJyZW50Q2FzZSk7XG4gICAgY29uc3QgY2FiaW5ldCA9IHBhbmVsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1ldmlkZW5jZS1jYWJpbmV0XCIgfSk7XG4gICAgW1xuICAgICAgeyBsYWJlbDogXCJNYXJrZG93blwiLCBraW5kOiBcIm1hcmtkb3duXCIgYXMgY29uc3QgfSxcbiAgICAgIHsgbGFiZWw6IFwiUERGXCIsIGtpbmQ6IFwicGRmXCIgYXMgY29uc3QgfSxcbiAgICAgIHsgbGFiZWw6IFwiSW1hZ2VzXCIsIGtpbmQ6IFwiaW1hZ2VcIiBhcyBjb25zdCB9LFxuICAgICAgeyBsYWJlbDogXCJMb2NhbCBmaWxlc1wiLCBraW5kOiBcImxvY2FsXCIgYXMgY29uc3QgfVxuICAgIF0uZm9yRWFjaCgoeyBsYWJlbCwga2luZCB9KSA9PiB7XG4gICAgICBjb25zdCBmaWxlcyA9IGV2aWRlbmNlLmZpbHRlcigoaXRlbSkgPT4gaXRlbS5raW5kID09PSBraW5kKTtcbiAgICAgIGNvbnN0IGl0ZW0gPSBjYWJpbmV0LmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1ldmlkZW5jZS1zbG90XCIgfSk7XG4gICAgICBpdGVtLmNyZWF0ZUVsKFwic3Ryb25nXCIsIHsgdGV4dDogbGFiZWwgfSk7XG4gICAgICBpdGVtLmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IGZpbGVzLmxlbmd0aCA+IDAgPyBgJHtmaWxlcy5sZW5ndGh9IGl0ZW0ke2ZpbGVzLmxlbmd0aCA+IDEgPyBcInNcIiA6IFwiXCJ9YCA6IFwiZW1wdHlcIiB9KTtcbiAgICAgIGNvbnN0IGxpc3QgPSBpdGVtLmNyZWF0ZUVsKFwidWxcIiwgeyBjbHM6IFwic2hlcmxvY2stZXZpZGVuY2UtbGlzdFwiIH0pO1xuICAgICAgZmlsZXMuc2xpY2UoMCwgMykuZm9yRWFjaCgoZXZpZGVuY2VJdGVtKSA9PiB7XG4gICAgICAgIGNvbnN0IHJvdyA9IGxpc3QuY3JlYXRlRWwoXCJsaVwiKTtcbiAgICAgICAgY29uc3QgbGluayA9IHJvdy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzaGVybG9jay1ldmlkZW5jZS1saW5rXCIsIHRleHQ6IGV2aWRlbmNlSXRlbS5maWxlLmJhc2VuYW1lIH0pO1xuICAgICAgICBjb25zdCByZW1vdmUgPSByb3cuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwic2hlcmxvY2stbWluaS1idXR0b24gZGFuZ2VyXCIsIHRleHQ6IFwiXHU1MjIwXHU5NjY0XCIgfSk7XG4gICAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChsaW5rLCBcImNsaWNrXCIsIGFzeW5jICgpID0+IHRoaXMucGx1Z2luLm9wZW5QYXRoKGV2aWRlbmNlSXRlbS5maWxlLnBhdGgpKTtcbiAgICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KHJlbW92ZSwgXCJjbGlja1wiLCBhc3luYyAoKSA9PiB0aGlzLnBsdWdpbi5kZWxldGVQYXRoKGV2aWRlbmNlSXRlbS5maWxlLnBhdGgpKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIGNvbnN0IGZvb3RlciA9IHBhbmVsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1mb290ZXJcIiB9KTtcbiAgICBmb290ZXIuY3JlYXRlRWwoXCJzcGFuXCIsIHtcbiAgICAgIHRleHQ6IGV2aWRlbmNlLmxlbmd0aCA+IDBcbiAgICAgICAgPyBgJHtldmlkZW5jZS5sZW5ndGh9IFx1NEVGRFx1OEQ0NFx1NjU5OVx1NURGMlx1NTE3M1x1ODA1NFx1NTIzMFx1NkI2NFx1Njg0OFx1NEVGNmBcbiAgICAgICAgOiBcIlx1NjI4QVx1OEQ0NFx1NjU5OVx1NjUzRVx1NTE2NSBFdmlkZW5jZSBcdTY1ODdcdTRFRjZcdTU5MzlcdUZGMENcdTYyMTZcdTY1QjBcdTVFRkFcdThCQzFcdTcyNjlcdTdCMTRcdThCQjBcdTVGMDBcdTU5Q0JcdTVGNTJcdTY4NjNcIlxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJDYXNlVGltZWxpbmUoY29udGFpbmVyOiBIVE1MRWxlbWVudCwgY3VycmVudENhc2U6IFNoZXJsb2NrQ2FzZSwgdGFza3M6IFNoZXJsb2NrVGFza1tdLCBzY2hlZHVsZXM6IFNoZXJsb2NrU2NoZWR1bGVbXSk6IHZvaWQge1xuICAgIGNvbnN0IHBhbmVsID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1wYW5lbCBzaGVybG9jay1jYXNlLXBhbmVsIHNoZXJsb2NrLWNhc2UtdGltZWxpbmUtcGFuZWxcIiB9KTtcbiAgICBwYW5lbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJcdTY4NDhcdTRFRjZcdTY1RjZcdTk1RjRcdTdFQkZcIiB9KTtcbiAgICBjb25zdCB0aW1lbGluZSA9IHBhbmVsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay10aW1lbGluZVwiIH0pO1xuICAgIGNvbnN0IGV2ZW50cyA9IFtcbiAgICAgIHsgbGFiZWw6IFwiXHU2ODQ4XHU0RUY2XHU1MjFCXHU1RUZBXCIsIHZhbHVlOiBjdXJyZW50Q2FzZS5jcmVhdGVkID8/IFwidW5rbm93blwiIH0sXG4gICAgICAuLi50YXNrcy5zbGljZSgwLCA0KS5tYXAoKHRhc2spID0+ICh7IGxhYmVsOiBgXHU0RUZCXHU1MkExOiAke3Rhc2submFtZX1gLCB2YWx1ZTogdGFzay51cGRhdGVkID8/IHRhc2suY3JlYXRlZCA/PyB0YXNrLnN0YXR1cyB9KSksXG4gICAgICAuLi5zY2hlZHVsZXMuc2xpY2UoMCwgNCkubWFwKChzY2hlZHVsZSkgPT4gKHsgbGFiZWw6IGBcdTYzOTJcdTY3MUY6ICR7c2NoZWR1bGUucmVsYXRlZFRhc2sgPz8gc2NoZWR1bGUubmFtZX1gLCB2YWx1ZTogW3NjaGVkdWxlLmRheSwgc2NoZWR1bGUuc3RhcnRdLmZpbHRlcihCb29sZWFuKS5qb2luKFwiIFwiKSB9KSlcbiAgICBdO1xuXG4gICAgZXZlbnRzLmZvckVhY2goKGV2ZW50KSA9PiB7XG4gICAgICBjb25zdCByb3cgPSB0aW1lbGluZS5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stdGltZWxpbmUtcm93XCIgfSk7XG4gICAgICByb3cuY3JlYXRlU3Bhbih7IGNsczogXCJzaGVybG9jay10aW1lbGluZS1kb3RcIiB9KTtcbiAgICAgIGNvbnN0IGNvcHkgPSByb3cuY3JlYXRlRGl2KCk7XG4gICAgICBjb3B5LmNyZWF0ZUVsKFwic3Ryb25nXCIsIHsgdGV4dDogZXZlbnQubGFiZWwgfSk7XG4gICAgICBjb3B5LmNyZWF0ZUVsKFwic3BhblwiLCB7IGNsczogXCJzaGVybG9jay1tZXRhXCIsIHRleHQ6IGV2ZW50LnZhbHVlIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJSZWFkaW5nTW9kdWxlKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIGRhdGE6IFNoZXJsb2NrV29ya3NwYWNlRGF0YSk6IHZvaWQge1xuICAgIGNvbnN0IHJlYWRpbmdJdGVtcyA9IGRhdGEuY29sbGVjdGlvbnMuZmlsdGVyKChpdGVtKSA9PiBpdGVtLnN0YXR1cyAhPT0gXCJmaW5pc2hlZFwiKTtcbiAgICBjb25zdCBjYXJkID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1wYW5lbCBzaGVybG9jay1jYXJkIHdpZGVcIiB9KTtcbiAgICBjb25zdCBoZWFkZXIgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1wYW5lbC1oZWFkaW5nXCIgfSk7XG4gICAgaGVhZGVyLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIlx1OEJDMVx1NzI2OVx1NzgxNFx1OEJGQlwiIH0pO1xuICAgIGNvbnN0IGFkZEJ1dHRvbiA9IGhlYWRlci5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzaGVybG9jay1taW5pLWJ1dHRvblwiLCB0ZXh0OiBcIlx1NjVCMFx1NUVGQVx1NzgxNFx1OEJGQlx1Njc2MVx1NzZFRVwiIH0pO1xuICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChhZGRCdXR0b24sIFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4gdGhpcy5wbHVnaW4uY3JlYXRlQ29sbGVjdGlvbk5vdGUoKSk7XG4gICAgY2FyZC5jcmVhdGVFbChcInBcIiwge1xuICAgICAgY2xzOiBcInNoZXJsb2NrLW1pbmktY29weVwiLFxuICAgICAgdGV4dDogXCJcdThGRDlcdTkxQ0NcdTY1M0VcdTZCNjNcdTU3MjhcdThCRkJcdTMwMDFcdTZCNjNcdTU3MjhcdTc3MEJcdTMwMDFcdTZCNjNcdTU3MjhcdTc4MTRcdTdBNzZcdTc2ODRcdTUxODVcdTVCQjlcdTMwMDJcdTZCQ0ZcdTY3NjFcdTkwRkRcdTgwRkRcdTk2OEZcdTY1RjZcdTg4NjVcdTdCMTRcdThCQjBcdUZGMUJcdTc4NkVcdThCQTRcdThCRkJcdTVCOENcdTU0MEVcdUZGMENcdTUxOERcdTVGNTJcdTUxNjVcdTY4NjNcdTY4NDhcdTY3RENcdTMwMDJcIlxuICAgIH0pO1xuICAgIGNvbnN0IGxpc3QgPSBjYXJkLmNyZWF0ZUVsKFwidWxcIiwgeyBjbHM6IFwic2hlcmxvY2stbGlzdFwiIH0pO1xuICAgIGlmIChyZWFkaW5nSXRlbXMubGVuZ3RoID09PSAwKSB7XG4gICAgICBsaXN0LmNyZWF0ZUVsKFwibGlcIiwgeyBjbHM6IFwic2hlcmxvY2stZW1wdHlcIiwgdGV4dDogXCJcdThGRDhcdTZDQTFcdTY3MDlcdTZCNjNcdTU3MjhcdTc4MTRcdThCRkJcdTc2ODRcdTY3NjFcdTc2RUVcdTMwMDJcdTUzRUZcdTRFRTVcdTRFQ0VcdTRFNjZcdTdDNERcdTMwMDFcdTc1MzVcdTVGNzFcdTMwMDFcdTY1ODdcdTdBRTBcdTYyMTZcdTRFMTNcdThGOTFcdTVGMDBcdTU5Q0JcdTMwMDJcIiB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmVhZGluZ0l0ZW1zLnNsaWNlKDAsIDEwKS5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICBjb25zdCByb3cgPSBsaXN0LmNyZWF0ZUVsKFwibGlcIiwgeyBjbHM6IFwic2hlcmxvY2stbGlzdC1pdGVtXCIgfSk7XG4gICAgICBjb25zdCBjb3B5ID0gcm93LmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1saXN0LWNvcHlcIiB9KTtcbiAgICAgIGNvcHkuY3JlYXRlRWwoXCJzdHJvbmdcIiwgeyB0ZXh0OiBpdGVtLm5hbWUgfSk7XG4gICAgICBjb3B5LmNyZWF0ZUVsKFwic3BhblwiLCB7IGNsczogXCJzaGVybG9jay1tZXRhXCIsIHRleHQ6IFtpdGVtLm1lZGl1bSA/PyBcImNvbGxlY3Rpb25cIiwgaXRlbS5zdGF0dXMgPz8gXCJxdWV1ZWRcIl0uam9pbihcIiAvIFwiKSB9KTtcbiAgICAgIGNvbnN0IHNpZGUgPSByb3cuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWxpc3QtYWN0aW9uc1wiIH0pO1xuICAgICAgc2lkZS5jcmVhdGVFbChcInNwYW5cIiwgeyBjbHM6IFwic2hlcmxvY2stY2hpcCBjb21wYWN0XCIsIHRleHQ6IGl0ZW0ubWVkaXVtID8/IFwiaXRlbVwiIH0pO1xuICAgICAgY29uc3QgYXJjaGl2ZSA9IHNpZGUuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwic2hlcmxvY2stbWluaS1idXR0b25cIiwgdGV4dDogXCJcdTVGNTJcdTUxNjVcdThCQzFcdTcyNjlcdTY3RENcIiB9KTtcbiAgICAgIGNvbnN0IGVkaXQgPSBzaWRlLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1pbmktYnV0dG9uXCIsIHRleHQ6IFwiXHU4ODY1XHU3QjE0XHU4QkIwXCIgfSk7XG4gICAgICBjb25zdCByZW1vdmUgPSBzaWRlLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1pbmktYnV0dG9uIGRhbmdlclwiLCB0ZXh0OiBcIlx1NTIyMFx1OTY2NFwiIH0pO1xuICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KGFyY2hpdmUsIFwiY2xpY2tcIiwgYXN5bmMgKGV2ZW50OiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5hcmNoaXZlQ29sbGVjdGlvbkFzRXZpZGVuY2UoaXRlbS5maWxlUGF0aCk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChlZGl0LCBcImNsaWNrXCIsIGFzeW5jIChldmVudDogTW91c2VFdmVudCkgPT4ge1xuICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4ub3BlblBhdGgoaXRlbS5maWxlUGF0aCk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChyZW1vdmUsIFwiY2xpY2tcIiwgYXN5bmMgKGV2ZW50OiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5kZWxldGVQYXRoKGl0ZW0uZmlsZVBhdGgpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQocm93LCBcImNsaWNrXCIsIGFzeW5jICgpID0+IHRoaXMucGx1Z2luLm9wZW5QYXRoKGl0ZW0uZmlsZVBhdGgpKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyQXJjaGl2ZU1vZHVsZShjb250YWluZXI6IEhUTUxFbGVtZW50LCBkYXRhOiBTaGVybG9ja1dvcmtzcGFjZURhdGEpOiB2b2lkIHtcbiAgICBjb25zdCBjYXJkID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1wYW5lbCBzaGVybG9jay1jYXJkIHdpZGVcIiB9KTtcbiAgICBjb25zdCBoZWFkZXIgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1wYW5lbC1oZWFkaW5nXCIgfSk7XG4gICAgaGVhZGVyLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIlx1Njg2M1x1Njg0OFx1NjdEQ1wiIH0pO1xuICAgIGNvbnN0IGFkZEJ1dHRvbiA9IGhlYWRlci5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzaGVybG9jay1taW5pLWJ1dHRvblwiLCB0ZXh0OiBcIlx1NjVCMFx1NUVGQVx1OEJDMVx1NzI2OVwiIH0pO1xuICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChhZGRCdXR0b24sIFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4gdGhpcy5wbHVnaW4uY3JlYXRlRXZpZGVuY2VOb3RlKCkpO1xuICAgIGNvbnN0IGNhYmluZXQgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1hcmNoaXZlLWdyaWRcIiB9KTtcbiAgICB0aGlzLmNyZWF0ZUFyY2hpdmVTdGF0KGNhYmluZXQsIFwiTWFya2Rvd25cIiwgZGF0YS5ldmlkZW5jZS5maWx0ZXIoKGl0ZW0pID0+IGl0ZW0uZmlsZVBhdGguZW5kc1dpdGgoXCIubWRcIikpLmxlbmd0aCk7XG4gICAgdGhpcy5jcmVhdGVBcmNoaXZlU3RhdChjYWJpbmV0LCBcIlBERiAvIFx1NTZGRVx1NzI0N1wiLCB0aGlzLmNvdW50VmF1bHRGaWxlcyhbXCJwZGZcIiwgXCJwbmdcIiwgXCJqcGdcIiwgXCJqcGVnXCIsIFwid2VicFwiXSkpO1xuICAgIHRoaXMuY3JlYXRlQXJjaGl2ZVN0YXQoY2FiaW5ldCwgXCJcdTY4NDhcdTRFRjZcdTUxNzNcdTgwNTRcIiwgZGF0YS5ldmlkZW5jZS5maWx0ZXIoKGl0ZW0pID0+IGl0ZW0uY2FzZVBhdGgpLmxlbmd0aCk7XG4gICAgY2FyZC5jcmVhdGVFbChcInBcIiwge1xuICAgICAgY2xzOiBcInNoZXJsb2NrLW1pbmktY29weVwiLFxuICAgICAgdGV4dDogXCJcdThGRDlcdTkxQ0NcdTY2M0VcdTc5M0FcdTVERjJcdTdFQ0ZcdTZDODlcdTZEQzBcdThGREJcdThCQzFcdTcyNjlcdTY3RENcdTc2ODRcdTY3NjFcdTc2RUVcdUZGMUJcdTZCQ0ZcdTRFMDBcdTY3NjFcdTkwRkRcdTY2MkYgVmF1bHQgXHU0RTJEXHU3NzFGXHU1QjlFIE1hcmtkb3duIFx1NjU4N1x1NEVGNlx1RkYwQ1x1NTNFRlx1OTY4Rlx1NjVGNlx1N0VFN1x1N0VFRFx1N0YxNlx1OEY5MVx1NjIxNlx1NTIyMFx1OTY2NFx1MzAwMlwiXG4gICAgfSk7XG4gICAgY29uc3QgbGlzdCA9IGNhcmQuY3JlYXRlRWwoXCJ1bFwiLCB7IGNsczogXCJzaGVybG9jay1saXN0IHNoZXJsb2NrLWFyY2hpdmUtbGlzdFwiIH0pO1xuICAgIGlmIChkYXRhLmV2aWRlbmNlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgbGlzdC5jcmVhdGVFbChcImxpXCIsIHsgY2xzOiBcInNoZXJsb2NrLWVtcHR5XCIsIHRleHQ6IFwiXHU4QkMxXHU3MjY5XHU2N0RDXHU4RkQ4XHU2NjJGXHU3QTdBXHU3Njg0XHUzMDAyXHU1M0VGXHU0RUU1XHU0RUNFXHU4QkMxXHU3MjY5XHU3ODE0XHU4QkZCXHU0RTJEXHU1RjUyXHU2ODYzXHVGRjBDXHU0RTVGXHU1M0VGXHU0RUU1XHU3NkY0XHU2M0E1XHU2NUIwXHU1RUZBXHU4QkMxXHU3MjY5XHUzMDAyXCIgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGRhdGEuZXZpZGVuY2Uuc2xpY2UoMCwgMTApLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgIGNvbnN0IHJvdyA9IGxpc3QuY3JlYXRlRWwoXCJsaVwiLCB7IGNsczogXCJzaGVybG9jay1saXN0LWl0ZW1cIiB9KTtcbiAgICAgIGNvbnN0IGNvcHkgPSByb3cuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWxpc3QtY29weVwiIH0pO1xuICAgICAgY29weS5jcmVhdGVFbChcInN0cm9uZ1wiLCB7IHRleHQ6IGl0ZW0ubmFtZSB9KTtcbiAgICAgIGNvcHkuY3JlYXRlRWwoXCJzcGFuXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1ldGFcIiwgdGV4dDogW2l0ZW0uY2FzZSA/IGBcdTY4NDhcdTRFRjY6ICR7aXRlbS5jYXNlfWAgOiB1bmRlZmluZWQsIGl0ZW0uc291cmNlID8gYFx1Njc2NVx1NkU5MDogJHtpdGVtLnNvdXJjZX1gIDogdW5kZWZpbmVkXS5maWx0ZXIoQm9vbGVhbikuam9pbihcIiAvIFwiKSB8fCBpdGVtLmZpbGVQYXRoIH0pO1xuICAgICAgY29uc3Qgc2lkZSA9IHJvdy5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stbGlzdC1hY3Rpb25zXCIgfSk7XG4gICAgICBjb25zdCBlZGl0ID0gc2lkZS5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzaGVybG9jay1taW5pLWJ1dHRvblwiLCB0ZXh0OiBcIlx1N0YxNlx1OEY5MVwiIH0pO1xuICAgICAgY29uc3QgcmVtb3ZlID0gc2lkZS5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzaGVybG9jay1taW5pLWJ1dHRvbiBkYW5nZXJcIiwgdGV4dDogXCJcdTUyMjBcdTk2NjRcIiB9KTtcbiAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChlZGl0LCBcImNsaWNrXCIsIGFzeW5jIChldmVudDogTW91c2VFdmVudCkgPT4ge1xuICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4ub3BlblBhdGgoaXRlbS5maWxlUGF0aCk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChyZW1vdmUsIFwiY2xpY2tcIiwgYXN5bmMgKGV2ZW50OiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5kZWxldGVQYXRoKGl0ZW0uZmlsZVBhdGgpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQocm93LCBcImNsaWNrXCIsIGFzeW5jICgpID0+IHRoaXMucGx1Z2luLm9wZW5QYXRoKGl0ZW0uZmlsZVBhdGgpKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyRm9vdHByaW50TW9kdWxlKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIGRhdGE6IFNoZXJsb2NrV29ya3NwYWNlRGF0YSk6IHZvaWQge1xuICAgIGNvbnN0IGNhcmQgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWZvb3RwcmludC1wYW5lbFwiIH0pO1xuICAgIGNvbnN0IGhlYWRlciA9IGNhcmQuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLXBhbmVsLWhlYWRpbmdcIiB9KTtcbiAgICBoZWFkZXIuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiXHU4REIzXHU4RkY5XHU1NzMwXHU1NkZFXCIgfSk7XG4gICAgY29uc3QgaGludCA9IGhlYWRlci5jcmVhdGVFbChcInNwYW5cIiwgeyBjbHM6IFwic2hlcmxvY2stbWFwLWhpbnRcIiwgdGV4dDogXCJcdTcwQjlcdTUxRkJcdTU3MzBcdTU2RkVcdTRFRkJcdTYxMEZcdTRGNERcdTdGNkVcdTUyMUJcdTVFRkFcdThEQjNcdThGRjlcIiB9KTtcbiAgICBoaW50LnNldEF0dHJpYnV0ZShcImFyaWEtbGFiZWxcIiwgXCJcdTcwQjlcdTUxRkJcdTU3MzBcdTU2RkVcdTRFRkJcdTYxMEZcdTRGNERcdTdGNkVcdTUyMUJcdTVFRkFcdThEQjNcdThGRjlcIik7XG4gICAgY29uc3QgbWFwID0gY2FyZC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stZm9vdHByaW50LW1hcFwiIH0pO1xuICAgIG1hcC5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2UgPSBgbGluZWFyLWdyYWRpZW50KDE4MGRlZywgcmdiYSg0NywgMjUsIDksIDAuMSksIHJnYmEoNDcsIDI1LCA5LCAwLjIyKSksIHVybChcIiR7dGhpcy5wbHVnaW4uZ2V0V29ybGRNYXBJbWFnZVVybCgpfVwiKSwgbGluZWFyLWdyYWRpZW50KDEzNWRlZywgI2IzOGE1MiwgI2Q1Yjc3OCA0MiUsICM5YzZjMzUpYDtcblxuICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChtYXAsIFwiY2xpY2tcIiwgYXN5bmMgKGV2ZW50OiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICBpZiAoKGV2ZW50LnRhcmdldCBhcyBIVE1MRWxlbWVudCkuY2xvc2VzdChcIi5zaGVybG9jay1tYXAtcG9pbnRcIikpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgY29uZmlybWVkID0gd2luZG93LmNvbmZpcm0oXCJcdTY2MkZcdTU0MjZcdTc4NkVcdThCQTRcdTUyMUJcdTVFRkFcdThEQjNcdThGRjlcdUZGMUZcIik7XG4gICAgICBpZiAoIWNvbmZpcm1lZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCByZWN0ID0gbWFwLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgY29uc3QgeCA9ICgoZXZlbnQuY2xpZW50WCAtIHJlY3QubGVmdCkgLyByZWN0LndpZHRoKSAqIDEwMDtcbiAgICAgIGNvbnN0IHkgPSAoKGV2ZW50LmNsaWVudFkgLSByZWN0LnRvcCkgLyByZWN0LmhlaWdodCkgKiAxMDA7XG4gICAgICBjb25zdCBwcmV2aWV3ID0gbWFwLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1hcC1wb2ludCBzaGVybG9jay1tYXAtcG9pbnQtcHJldmlld1wiLCB0ZXh0OiBcIlx1MjcxM1wiIH0pO1xuICAgICAgcHJldmlldy5zdHlsZS5sZWZ0ID0gYCR7eC50b0ZpeGVkKDIpfSVgO1xuICAgICAgcHJldmlldy5zdHlsZS50b3AgPSBgJHt5LnRvRml4ZWQoMil9JWA7XG4gICAgICBwcmV2aWV3LnNldEF0dHJpYnV0ZShcImFyaWEtbGFiZWxcIiwgXCJcdTZCNjNcdTU3MjhcdTUyMUJcdTVFRkFcdThEQjNcdThGRjlcIik7XG4gICAgICBwcmV2aWV3LnNldEF0dHJpYnV0ZShcInRpdGxlXCIsIFwiXHU2QjYzXHU1NzI4XHU1MjFCXHU1RUZBXHU4REIzXHU4RkY5XCIpO1xuICAgICAgcHJldmlldy5zZXRBdHRyaWJ1dGUoXCJkaXNhYmxlZFwiLCBcInRydWVcIik7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5jcmVhdGVQbGFjZUZyb21NYXBDbGljayh4LCB5KTtcbiAgICAgIH0gZmluYWxseSB7XG4gICAgICAgIHByZXZpZXcucmVtb3ZlKCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zdCBwbGFjZXMgPSBkYXRhLnBsYWNlc1xuICAgICAgLmZpbHRlcigocGxhY2UpID0+IHR5cGVvZiBwbGFjZS5sYXRpdHVkZSA9PT0gXCJudW1iZXJcIiAmJiB0eXBlb2YgcGxhY2UubG9uZ2l0dWRlID09PSBcIm51bWJlclwiKVxuICAgICAgLnNsaWNlKDAsIDgwKTtcbiAgICBpZiAocGxhY2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgbWFwLmNyZWF0ZUVsKFwicFwiLCB7IGNsczogXCJzaGVybG9jay1lbXB0eSBzaGVybG9jay1tYXAtZW1wdHlcIiwgdGV4dDogXCJcdThGRDhcdTZDQTFcdTY3MDlcdThEQjNcdThGRjlcdTMwMDJcdTcwQjlcdTUxRkJcdTU3MzBcdTU2RkVcdTRFRkJcdTYxMEZcdTRGNERcdTdGNkVcdTUzNzNcdTUzRUZcdTUyMUJcdTVFRkFcdTUyMzBcdThCQkZcdThCQjBcdTVGNTVcdTMwMDJcIiB9KTtcbiAgICB9XG4gICAgcGxhY2VzLmZvckVhY2goKHBsYWNlKSA9PiB7XG4gICAgICBjb25zdCBwb3NpdGlvbiA9IHRoaXMucmVzb2x2ZU1hcFBvaW50KHBsYWNlKTtcbiAgICAgIGNvbnN0IGxhYmVsID0gW3BsYWNlLmNpdHkgPz8gcGxhY2UubmFtZSwgcGxhY2UuY291bnRyeSwgcGxhY2UudmlzaXRlZEF0XS5maWx0ZXIoQm9vbGVhbikuam9pbihcIiAvIFwiKTtcbiAgICAgIGNvbnN0IHBvaW50ID0gbWFwLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1hcC1wb2ludFwiLCB0ZXh0OiBcIlx1MjcxM1wiIH0pO1xuICAgICAgcG9pbnQuc3R5bGUubGVmdCA9IGAke3Bvc2l0aW9uLngudG9GaXhlZCgyKX0lYDtcbiAgICAgIHBvaW50LnN0eWxlLnRvcCA9IGAke3Bvc2l0aW9uLnkudG9GaXhlZCgyKX0lYDtcbiAgICAgIHBvaW50LnNldEF0dHJpYnV0ZShcImFyaWEtbGFiZWxcIiwgbGFiZWwgfHwgcGxhY2UubmFtZSk7XG4gICAgICBwb2ludC5zZXRBdHRyaWJ1dGUoXCJ0aXRsZVwiLCBbcGxhY2UuY2l0eSwgcGxhY2UuY291bnRyeSwgcGxhY2UudmlzaXRlZEF0XS5maWx0ZXIoQm9vbGVhbikuam9pbihcIiAvIFwiKSB8fCBwbGFjZS5uYW1lKTtcbiAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChwb2ludCwgXCJjbGlja1wiLCBhc3luYyAoKSA9PiB0aGlzLnBsdWdpbi5vcGVuUGF0aChwbGFjZS5maWxlUGF0aCkpO1xuICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KHBvaW50LCBcImNvbnRleHRtZW51XCIsIGFzeW5jIChldmVudDogTW91c2VFdmVudCkgPT4ge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5kZWxldGVQYXRoKHBsYWNlLmZpbGVQYXRoKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJJbnZlc3RpZ2F0aW9uU2NoZWR1bGVyKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIGRhdGE6IFNoZXJsb2NrV29ya3NwYWNlRGF0YSk6IHZvaWQge1xuICAgIGNvbnN0IGNhcmQgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLXBhbmVsIHNoZXJsb2NrLWNhcmQgZnVsbFwiIH0pO1xuICAgIGNhcmQuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiXHU4QzAzXHU2N0U1XHU2MzkyXHU2NzFGXCIgfSk7XG4gICAgY2FyZC5jcmVhdGVFbChcInBcIiwge1xuICAgICAgY2xzOiBcInNoZXJsb2NrLXN1YnRpdGxlIHNoZXJsb2NrLW1pbmktY29weVwiLFxuICAgICAgdGV4dDogXCJcdTYyRDZcdTUyQThcdTVERTZcdTRGQTdcdTRFRkJcdTUyQTFcdTUyMzBcdTY1RjZcdTk1RjRcdTY4M0NcdTUzNzNcdTUzRUZcdTYzOTJcdTUxNjVcdTY3MkNcdTU0NjhcdThDMDNcdTY3RTVcdUZGMUJcdTUzQ0NcdTUxRkJcdTRFRkJcdTYxMEZcdTY1RjZcdTk1RjRcdTY4M0NcdTRGMUFcdTVGRUJcdTkwMUZcdTY1QjBcdTVFRkFcdTRFMDBcdTY3NjFcdTY1RTVcdTdBMEJcdTg4NjhcdThCQjBcdTVGNTVcdTMwMDJcdTYzOTJcdThGREJcdTUzQkJcdTU0MEVcdTUzRUZcdTRFRTVcdTk2OEZcdTY1RjZcdTYyOEFcdTRFRkJcdTUyQTFcdTU3NTdcdTY1M0VcdTk1N0ZcdTMwMDFcdTY1M0VcdTc3RURcdTMwMDJcIlxuICAgIH0pO1xuXG4gICAgY29uc3QgcGxhbm5lciA9IGNhcmQuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLXBsYW5uZXJcIiB9KTtcbiAgICBjb25zdCBiYWNrbG9nID0gcGxhbm5lci5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stcGxhbm5lci1iYWNrbG9nXCIgfSk7XG4gICAgYmFja2xvZy5jcmVhdGVFbChcImg0XCIsIHsgdGV4dDogXCJcdTVGODVcdTVCODlcdTYzOTJcdTRFRkJcdTUyQTFcIiB9KTtcblxuICAgIGNvbnN0IGJhY2tsb2dMaXN0ID0gYmFja2xvZy5jcmVhdGVFbChcInVsXCIsIHsgY2xzOiBcInNoZXJsb2NrLWxpc3RcIiB9KTtcbiAgICBjb25zdCBiYWNrbG9nVGFza3MgPSBkYXRhLnRhc2tzLmZpbHRlcigoaXRlbSkgPT4gaXRlbS5zdGF0dXMgIT09IFwiZG9uZVwiKTtcbiAgICBpZiAoYmFja2xvZ1Rhc2tzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgYmFja2xvZ0xpc3QuY3JlYXRlRWwoXCJsaVwiLCB7IGNsczogXCJzaGVybG9jay1lbXB0eVwiLCB0ZXh0OiBcIlx1NjI0MFx1NjcwOVx1NEU4Qlx1OTg3OVx1OTBGRFx1NTkwNFx1NzQwNlx1NUI4Q1x1NEU4Nlx1RkYwQ1x1NjIxNlx1ODAwNVx1NTE0OFx1NjVCMFx1NUVGQVx1NEUwMFx1Njc2MVx1NEVGQlx1NTJBMVx1MzAwMlwiIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBiYWNrbG9nVGFza3Muc2xpY2UoMCwgOCkuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgICBjb25zdCByb3cgPSBiYWNrbG9nTGlzdC5jcmVhdGVFbChcImxpXCIsIHsgY2xzOiBcInNoZXJsb2NrLWxpc3QtaXRlbSBzaGVybG9jay1kcmFnZ2FibGUtdGFza1wiIH0pO1xuICAgICAgICByb3cuc2V0QXR0cmlidXRlKFwiZHJhZ2dhYmxlXCIsIFwidHJ1ZVwiKTtcbiAgICAgICAgcm93LmNyZWF0ZUVsKFwic3Ryb25nXCIsIHsgdGV4dDogaXRlbS5uYW1lIH0pO1xuICAgICAgICByb3cuY3JlYXRlRWwoXCJzcGFuXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1ldGFcIiwgdGV4dDogaXRlbS5zdGF0dXMgPT09IFwic2NoZWR1bGVkXCIgPyBcIlx1NURGMlx1NjM5Mlx1NTE2NVx1NTQ2OFx1Njc3Rlx1RkYwQ1x1NTNFRlx1NTE4RFx1NkIyMVx1NjJENlx1NTJBOFx1NjUzOVx1Njg2M1x1NjcxRlwiIDogXCJcdTYyRDZcdTUyQThcdTUyMzBcdTUzRjNcdTRGQTdcdTY1RjZcdTk1RjRcdTY4M0NcIiB9KTtcbiAgICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KHJvdywgXCJkcmFnc3RhcnRcIiwgKGV2ZW50OiBEcmFnRXZlbnQpID0+IHtcbiAgICAgICAgICBldmVudC5kYXRhVHJhbnNmZXI/LnNldERhdGEoXCJ0ZXh0L3BsYWluXCIsIGl0ZW0uZmlsZVBhdGgpO1xuICAgICAgICAgIGV2ZW50LmRhdGFUcmFuc2Zlcj8uc2V0RGF0YShcImFwcGxpY2F0aW9uL3NoZXJsb2NrLXRhc2tcIiwgaXRlbS5maWxlUGF0aCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQocm93LCBcImRibGNsaWNrXCIsIGFzeW5jICgpID0+IHRoaXMucGx1Z2luLm9wZW5QYXRoKGl0ZW0uZmlsZVBhdGgpKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IGJvYXJkID0gcGxhbm5lci5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2std2Vlay1ib2FyZFwiIH0pO1xuICAgIGNvbnN0IGhlYWRlciA9IGJvYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay13ZWVrLWhlYWRlclwiIH0pO1xuICAgIGhlYWRlci5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stY29ybmVyLWNlbGxcIiB9KTtcbiAgICBXRUVLX0RBWVMuZm9yRWFjaCgoZGF5KSA9PiB7XG4gICAgICBjb25zdCBkYXRlID0gdGhpcy5yZXNvbHZlV2Vla0RhdGUoZGF5Lm9mZnNldCk7XG4gICAgICBjb25zdCBjZWxsID0gaGVhZGVyLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1kYXktaGVhZGVyXCIgfSk7XG4gICAgICBjZWxsLmNyZWF0ZUVsKFwic3Ryb25nXCIsIHsgdGV4dDogZGF5LmxhYmVsIH0pO1xuICAgICAgY2VsbC5jcmVhdGVFbChcInNwYW5cIiwgeyBjbHM6IFwic2hlcmxvY2stbWV0YVwiLCB0ZXh0OiBkYXRlIH0pO1xuICAgIH0pO1xuXG4gICAgY29uc3Qgc2NoZWR1bGVJbmRleCA9IHRoaXMuaW5kZXhTY2hlZHVsZXMoZGF0YS5zY2hlZHVsZXMpO1xuXG4gICAgVElNRV9TTE9UUy5mb3JFYWNoKChzbG90KSA9PiB7XG4gICAgICBjb25zdCByb3cgPSBib2FyZC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2std2Vlay1yb3dcIiB9KTtcbiAgICAgIHJvdy5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stdGltZS1sYWJlbFwiLCB0ZXh0OiBzbG90IH0pO1xuXG4gICAgICBXRUVLX0RBWVMuZm9yRWFjaCgoZGF5KSA9PiB7XG4gICAgICAgIGNvbnN0IGRhdGUgPSB0aGlzLnJlc29sdmVXZWVrRGF0ZShkYXkub2Zmc2V0KTtcbiAgICAgICAgY29uc3Qga2V5ID0gYCR7ZGF0ZX18JHtzbG90fWA7XG4gICAgICAgIGNvbnN0IGNlbGwgPSByb3cuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWRyb3AtY2VsbFwiIH0pO1xuICAgICAgICBjb25zdCBlbnRyaWVzID0gc2NoZWR1bGVJbmRleC5nZXQoa2V5KSA/PyBbXTtcbiAgICAgICAgaWYgKGVudHJpZXMubGVuZ3RoID4gMSkge1xuICAgICAgICAgIGNlbGwuYWRkQ2xhc3MoXCJoYXMtY29uZmxpY3RcIik7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoY2VsbCwgXCJkcmFnb3ZlclwiLCAoZXZlbnQ6IERyYWdFdmVudCkgPT4ge1xuICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgY2VsbC5hZGRDbGFzcyhcImlzLWRyYWdvdmVyXCIpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KGNlbGwsIFwiZHJhZ2xlYXZlXCIsICgpID0+IHtcbiAgICAgICAgICBjZWxsLnJlbW92ZUNsYXNzKFwiaXMtZHJhZ292ZXJcIik7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoY2VsbCwgXCJkcm9wXCIsIGFzeW5jIChldmVudDogRHJhZ0V2ZW50KSA9PiB7XG4gICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBjZWxsLnJlbW92ZUNsYXNzKFwiaXMtZHJhZ292ZXJcIik7XG4gICAgICAgICAgY29uc3Qgc2NoZWR1bGVQYXRoID0gZXZlbnQuZGF0YVRyYW5zZmVyPy5nZXREYXRhKFwiYXBwbGljYXRpb24vc2hlcmxvY2stc2NoZWR1bGVcIik7XG4gICAgICAgICAgaWYgKHNjaGVkdWxlUGF0aCkge1xuICAgICAgICAgICAgY29uc3Qgc2NoZWR1bGUgPSBkYXRhLnNjaGVkdWxlcy5maW5kKChpdGVtKSA9PiBpdGVtLmZpbGVQYXRoID09PSBzY2hlZHVsZVBhdGgpO1xuICAgICAgICAgICAgY29uc3QgZHVyYXRpb24gPSBzY2hlZHVsZT8uZHVyYXRpb25NaW51dGVzID8/IHRoaXMucmVzb2x2ZVNjaGVkdWxlRHVyYXRpb24odW5kZWZpbmVkKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLm1vdmVTY2hlZHVsZUVudHJ5KHNjaGVkdWxlUGF0aCwgZGF0ZSwgc2xvdCwgdGhpcy5yZXNvbHZlU2NoZWR1bGVFbmQoc2xvdCwgZHVyYXRpb24pKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgdGFza1BhdGggPVxuICAgICAgICAgICAgZXZlbnQuZGF0YVRyYW5zZmVyPy5nZXREYXRhKFwiYXBwbGljYXRpb24vc2hlcmxvY2stdGFza1wiKSB8fFxuICAgICAgICAgICAgZXZlbnQuZGF0YVRyYW5zZmVyPy5nZXREYXRhKFwidGV4dC9wbGFpblwiKTtcbiAgICAgICAgICBpZiAoIXRhc2tQYXRoKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNjaGVkdWxlVGFza0Zyb21EYXNoYm9hcmQodGFza1BhdGgsIGRhdGUsIHNsb3QsIHRoaXMucmVzb2x2ZVNjaGVkdWxlRW5kKHNsb3QsIERFRkFVTFRfU0NIRURVTEVfRFVSQVRJT05fTUlOVVRFUykpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KGNlbGwsIFwiZGJsY2xpY2tcIiwgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmNyZWF0ZVF1aWNrU2NoZWR1bGUoZGF0ZSwgc2xvdCwgdGhpcy5yZXNvbHZlU2NoZWR1bGVFbmQoc2xvdCwgREVGQVVMVF9TQ0hFRFVMRV9EVVJBVElPTl9NSU5VVEVTKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChlbnRyaWVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIGNlbGwuY3JlYXRlRWwoXCJzcGFuXCIsIHsgY2xzOiBcInNoZXJsb2NrLXNsb3QtaGludFwiLCB0ZXh0OiBcIkRvdWJsZS1jbGljayBvciBkcm9wIHRhc2tcIiB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoZW50cmllcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICBjb25zdCBjb25mbGljdEJhciA9IGNlbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWNvbmZsaWN0LWJhclwiIH0pO1xuICAgICAgICAgICAgY29uc3Qgd2FybmluZyA9IGNvbmZsaWN0QmFyLmNyZWF0ZUVsKFwic3BhblwiLCB7XG4gICAgICAgICAgICAgIGNsczogXCJzaGVybG9jay1jb25mbGljdC1oaW50XCIsXG4gICAgICAgICAgICAgIHRleHQ6IGAke2VudHJpZXMubGVuZ3RofSBpdGVtcyBvdmVybGFwYFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB3YXJuaW5nLnNldEF0dHJpYnV0ZShcInRpdGxlXCIsIFwiXHU4RkQ5XHU0RTJBXHU2NUY2XHU5NUY0XHU2ODNDXHU2NzA5XHU1OTFBXHU2NzYxXHU1Qjg5XHU2MzkyXHVGRjBDXHU0RTBCXHU0RTAwXHU2QjY1XHU1M0VGXHU0RUU1XHU1MkEwXHU1MTY1XHU1MUIyXHU3QTgxXHU4OUUzXHU1MUIzXHU5MDNCXHU4RjkxXHUzMDAyXCIpO1xuICAgICAgICAgICAgY29uc3QgcmVzb2x2ZUJ1dHRvbiA9IGNvbmZsaWN0QmFyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcbiAgICAgICAgICAgICAgY2xzOiBcInNoZXJsb2NrLW1pbmktYnV0dG9uXCIsXG4gICAgICAgICAgICAgIHRleHQ6IFwiXHU5ODdBXHU1RUY2XHU0RTAwXHU2NzYxXCJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KHJlc29sdmVCdXR0b24sIFwiY2xpY2tcIiwgYXN5bmMgKGV2ZW50OiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICBjb25zdCBtb3ZhYmxlID0gZW50cmllc1tlbnRyaWVzLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5tb3ZlU2NoZWR1bGVUb05leHRGcmVlU2xvdChtb3ZhYmxlLmZpbGVQYXRoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbnRyaWVzLmZvckVhY2goKGVudHJ5KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBwaWxsID0gY2VsbC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stc2NoZWR1bGUtcGlsbFwiIH0pO1xuICAgICAgICAgICAgcGlsbC5zZXRBdHRyaWJ1dGUoXCJkcmFnZ2FibGVcIiwgXCJ0cnVlXCIpO1xuICAgICAgICAgICAgcGlsbC5zdHlsZS5taW5IZWlnaHQgPSBgJHt0aGlzLnJlc29sdmVTY2hlZHVsZVBpbGxIZWlnaHQoZW50cnkuZHVyYXRpb25NaW51dGVzKX1weGA7XG4gICAgICAgICAgICBjb25zdCB0b3AgPSBwaWxsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1waWxsLXRvcFwiIH0pO1xuICAgICAgICAgICAgdG9wLmNyZWF0ZUVsKFwic3Ryb25nXCIsIHsgdGV4dDogZW50cnkucmVsYXRlZFRhc2sgPz8gZW50cnkubmFtZSB9KTtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRyb2xzID0gdG9wLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1waWxsLWNvbnRyb2xzXCIgfSk7XG4gICAgICAgICAgICBjb25zdCBzaHJpbmtCdXR0b24gPSBjb250cm9scy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzaGVybG9jay1taW5pLWJ1dHRvblwiLCB0ZXh0OiBcIi0zMG1cIiB9KTtcbiAgICAgICAgICAgIGNvbnN0IGV4dGVuZEJ1dHRvbiA9IGNvbnRyb2xzLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNoZXJsb2NrLW1pbmktYnV0dG9uXCIsIHRleHQ6IFwiKzMwbVwiIH0pO1xuICAgICAgICAgICAgY29uc3QgZGVsZXRlQnV0dG9uID0gY29udHJvbHMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwic2hlcmxvY2stbWluaS1idXR0b24gZGFuZ2VyXCIsIHRleHQ6IFwiXHU1MjIwXHU5NjY0XCIgfSk7XG4gICAgICAgICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoc2hyaW5rQnV0dG9uLCBcImNsaWNrXCIsIGFzeW5jIChldmVudDogTW91c2VFdmVudCkgPT4ge1xuICAgICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uYWRqdXN0U2NoZWR1bGVEdXJhdGlvbihlbnRyeS5maWxlUGF0aCwgLTMwKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KGV4dGVuZEJ1dHRvbiwgXCJjbGlja1wiLCBhc3luYyAoZXZlbnQ6IE1vdXNlRXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmFkanVzdFNjaGVkdWxlRHVyYXRpb24oZW50cnkuZmlsZVBhdGgsIDMwKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KGRlbGV0ZUJ1dHRvbiwgXCJjbGlja1wiLCBhc3luYyAoZXZlbnQ6IE1vdXNlRXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmRlbGV0ZVBhdGgoZW50cnkuZmlsZVBhdGgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBwaWxsLmNyZWF0ZUVsKFwic3BhblwiLCB7XG4gICAgICAgICAgICAgIGNsczogXCJzaGVybG9jay1tZXRhXCIsXG4gICAgICAgICAgICAgIHRleHQ6IGAke2VudHJ5LnN0YXJ0ID8/IHNsb3R9LSR7ZW50cnkuZW5kID8/IHRoaXMucmVzb2x2ZVNjaGVkdWxlRW5kKHNsb3QsIHRoaXMucmVzb2x2ZVNjaGVkdWxlRHVyYXRpb24oZW50cnkuZHVyYXRpb25NaW51dGVzKSl9JHtlbnRyeS5kdXJhdGlvbk1pbnV0ZXMgPyBgIC8gJHtlbnRyeS5kdXJhdGlvbk1pbnV0ZXN9bWAgOiBcIlwifWBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKGVudHJ5LnJlbGF0ZWRUYXNrUGF0aCkge1xuICAgICAgICAgICAgICBwaWxsLmNyZWF0ZUVsKFwic3BhblwiLCB7IGNsczogXCJzaGVybG9jay1tZXRhXCIsIHRleHQ6IFwiTGlua2VkIHRhc2tcIiB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChwaWxsLCBcImRyYWdzdGFydFwiLCAoZXZlbnQ6IERyYWdFdmVudCkgPT4ge1xuICAgICAgICAgICAgICBldmVudC5kYXRhVHJhbnNmZXI/LnNldERhdGEoXCJhcHBsaWNhdGlvbi9zaGVybG9jay1zY2hlZHVsZVwiLCBlbnRyeS5maWxlUGF0aCk7XG4gICAgICAgICAgICAgIGV2ZW50LmRhdGFUcmFuc2Zlcj8uc2V0RGF0YShcInRleHQvcGxhaW5cIiwgZW50cnkuZmlsZVBhdGgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQocGlsbCwgXCJjbGlja1wiLCBhc3luYyAoKSA9PiB0aGlzLnBsdWdpbi5vcGVuUGF0aChlbnRyeS5maWxlUGF0aCkpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlTWV0cmljKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIGxhYmVsOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBjb25zdCBtZXRyaWMgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLW1ldHJpY1wiIH0pO1xuICAgIG1ldHJpYy5jcmVhdGVFbChcImRpdlwiLCB7IGNsczogXCJzaGVybG9jay1tZXRyaWMtbGFiZWxcIiwgdGV4dDogbGFiZWwgfSk7XG4gICAgbWV0cmljLmNyZWF0ZUVsKFwiZGl2XCIsIHsgY2xzOiBcInNoZXJsb2NrLW1ldHJpYy12YWx1ZVwiLCB0ZXh0OiB2YWx1ZSB9KTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlQXJjaGl2ZVN0YXQoY29udGFpbmVyOiBIVE1MRWxlbWVudCwgbGFiZWw6IHN0cmluZywgdmFsdWU6IG51bWJlcik6IHZvaWQge1xuICAgIGNvbnN0IHN0YXQgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNoZXJsb2NrLWFyY2hpdmUtc3RhdFwiIH0pO1xuICAgIHN0YXQuY3JlYXRlRWwoXCJzdHJvbmdcIiwgeyB0ZXh0OiBTdHJpbmcodmFsdWUpIH0pO1xuICAgIHN0YXQuY3JlYXRlRWwoXCJzcGFuXCIsIHsgdGV4dDogbGFiZWwgfSk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZUFjdGlvbihjb250YWluZXI6IEhUTUxFbGVtZW50LCBsYWJlbDogc3RyaW5nLCBvbkNsaWNrOiAoKSA9PiBQcm9taXNlPHVua25vd24+LCBzZWNvbmRhcnkgPSBmYWxzZSk6IHZvaWQge1xuICAgIGNvbnN0IGJ1dHRvbiA9IGNvbnRhaW5lci5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogYHNoZXJsb2NrLWJ1dHRvbiR7c2Vjb25kYXJ5ID8gXCIgc2Vjb25kYXJ5XCIgOiBcIlwifWAsIHRleHQ6IGxhYmVsIH0pO1xuICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChidXR0b24sIFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgb25DbGljaygpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgICAgIG5ldyBOb3RpY2UoYFNoZXJsb2NrIE9TIFx1NjRDRFx1NEY1Q1x1NTkzMVx1OEQyNTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFwiXHU2NzJBXHU3N0U1XHU5NTE5XHU4QkVGXCJ9YCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVXZWVrRGF0ZShvZmZzZXQ6IG51bWJlcik6IHN0cmluZyB7XG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgICBjb25zdCBkYXkgPSBub3cuZ2V0RGF5KCk7XG4gICAgY29uc3QgbW9uZGF5RGVsdGEgPSBkYXkgPT09IDAgPyAtNiA6IDEgLSBkYXk7XG4gICAgY29uc3QgdGFyZ2V0ID0gbmV3IERhdGUobm93KTtcbiAgICB0YXJnZXQuc2V0RGF0ZShub3cuZ2V0RGF0ZSgpICsgbW9uZGF5RGVsdGEgKyBvZmZzZXQpO1xuICAgIHJldHVybiB0aGlzLmZvcm1hdExvY2FsRGF0ZSh0YXJnZXQpO1xuICB9XG5cbiAgcHJpdmF0ZSByZXNvbHZlU2NoZWR1bGVEdXJhdGlvbihkdXJhdGlvbk1pbnV0ZXM/OiBudW1iZXIpOiBudW1iZXIge1xuICAgIHJldHVybiBNYXRoLm1heCgzMCwgTWF0aC5taW4oMjQwLCBkdXJhdGlvbk1pbnV0ZXMgPz8gREVGQVVMVF9TQ0hFRFVMRV9EVVJBVElPTl9NSU5VVEVTKSk7XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVTY2hlZHVsZUVuZChzdGFydDogc3RyaW5nLCBkdXJhdGlvbk1pbnV0ZXM/OiBudW1iZXIpOiBzdHJpbmcge1xuICAgIGNvbnN0IGR1cmF0aW9uID0gdGhpcy5yZXNvbHZlU2NoZWR1bGVEdXJhdGlvbihkdXJhdGlvbk1pbnV0ZXMpO1xuICAgIGNvbnN0IFtob3VyLCBtaW51dGVdID0gc3RhcnQuc3BsaXQoXCI6XCIpLm1hcChOdW1iZXIpO1xuICAgIGNvbnN0IGVuZE1pbnV0ZXMgPSBNYXRoLm1pbihob3VyICogNjAgKyBtaW51dGUgKyBkdXJhdGlvbiwgMjMgKiA2MCArIDMwKTtcbiAgICBjb25zdCBlbmRIb3VyID0gTWF0aC5mbG9vcihlbmRNaW51dGVzIC8gNjApO1xuICAgIGNvbnN0IGVuZE1pbnV0ZSA9IGVuZE1pbnV0ZXMgJSA2MDtcbiAgICByZXR1cm4gYCR7U3RyaW5nKGVuZEhvdXIpLnBhZFN0YXJ0KDIsIFwiMFwiKX06JHtTdHJpbmcoZW5kTWludXRlKS5wYWRTdGFydCgyLCBcIjBcIil9YDtcbiAgfVxuXG4gIHByaXZhdGUgcmVzb2x2ZVNjaGVkdWxlUGlsbEhlaWdodChkdXJhdGlvbk1pbnV0ZXM/OiBudW1iZXIpOiBudW1iZXIge1xuICAgIGNvbnN0IHN0ZXBzID0gdGhpcy5yZXNvbHZlU2NoZWR1bGVEdXJhdGlvbihkdXJhdGlvbk1pbnV0ZXMpIC8gMzA7XG4gICAgcmV0dXJuIDQ0ICsgc3RlcHMgKiAyNjtcbiAgfVxuXG4gIHByaXZhdGUgcmVzb2x2ZU1hcFBvaW50KHBsYWNlOiBTaGVybG9ja1BsYWNlKTogeyB4OiBudW1iZXI7IHk6IG51bWJlciB9IHtcbiAgICBjb25zdCBsYXRpdHVkZSA9IHBsYWNlLmxhdGl0dWRlID8/IDA7XG4gICAgY29uc3QgbG9uZ2l0dWRlID0gcGxhY2UubG9uZ2l0dWRlID8/IE1BUF9DRU5URVJfTE9OR0lUVURFO1xuICAgIC8vIEJhY2stZW5kIHByb2plY3Rpb24gY29udHJhY3Q6IHNpZ25lZCBsb25naXR1ZGUgdXNlcyBlYXN0IHBvc2l0aXZlIGFuZCB3ZXN0IG5lZ2F0aXZlO1xuICAgIC8vIHNpZ25lZCBsYXRpdHVkZSB1c2VzIG5vcnRoIHBvc2l0aXZlIGFuZCBzb3V0aCBuZWdhdGl2ZS4gVGhlIG1hcCBpcyBjZW50ZXJlZCBvbiBDaGluYS5cbiAgICBjb25zdCB3cmFwcGVkTG9uZ2l0dWRlID0gKChsb25naXR1ZGUgLSBNQVBfQ0VOVEVSX0xPTkdJVFVERSArIDU0MCkgJSAzNjApIC0gMTgwO1xuICAgIGNvbnN0IHggPSAoKHdyYXBwZWRMb25naXR1ZGUgKyAxODApIC8gMzYwKSAqIDEwMDtcbiAgICBjb25zdCB5ID0gKCg5MCAtIGxhdGl0dWRlKSAvIDE4MCkgKiAxMDA7XG4gICAgcmV0dXJuIHtcbiAgICAgIHg6IE1hdGgubWF4KDQsIE1hdGgubWluKDk2LCB4KSksXG4gICAgICB5OiBNYXRoLm1heCg4LCBNYXRoLm1pbig5MiwgeSkpXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgaW5kZXhTY2hlZHVsZXMoaXRlbXM6IFNoZXJsb2NrU2NoZWR1bGVbXSk6IE1hcDxzdHJpbmcsIFNoZXJsb2NrU2NoZWR1bGVbXT4ge1xuICAgIGNvbnN0IGluZGV4ID0gbmV3IE1hcDxzdHJpbmcsIFNoZXJsb2NrU2NoZWR1bGVbXT4oKTtcbiAgICBpdGVtcy5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICBpZiAoIWl0ZW0uZGF5IHx8ICFpdGVtLnN0YXJ0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGtleSA9IGAke2l0ZW0uZGF5fXwke2l0ZW0uc3RhcnR9YDtcbiAgICAgIGNvbnN0IGV4aXN0aW5nID0gaW5kZXguZ2V0KGtleSkgPz8gW107XG4gICAgICBleGlzdGluZy5wdXNoKGl0ZW0pO1xuICAgICAgaW5kZXguc2V0KGtleSwgZXhpc3RpbmcpO1xuICAgIH0pO1xuICAgIHJldHVybiBpbmRleDtcbiAgfVxuXG4gIHByaXZhdGUgcGx1Z2luVGFza0NvdW50KGNhc2VQYXRoOiBzdHJpbmcpOiBudW1iZXIge1xuICAgIGNvbnN0IHBsdWdpbiA9IHRoaXMucGx1Z2luO1xuICAgIGNvbnN0IGNhY2hlZCA9IChwbHVnaW4gYXMgU2hlcmxvY2tPU1BsdWdpbiAmIHtcbiAgICAgIGxhdGVzdFdvcmtzcGFjZURhdGE/OiBTaGVybG9ja1dvcmtzcGFjZURhdGE7XG4gICAgfSkubGF0ZXN0V29ya3NwYWNlRGF0YTtcbiAgICBpZiAoIWNhY2hlZCkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIHJldHVybiBjYWNoZWQudGFza3MuZmlsdGVyKCh0YXNrKSA9PiB0YXNrLmNhc2VQYXRoID09PSBjYXNlUGF0aCkubGVuZ3RoO1xuICB9XG5cbiAgcHJpdmF0ZSByZXNvbHZlQ2FzZVByb2dyZXNzKGNhc2VQYXRoOiBzdHJpbmcpOiBudW1iZXIge1xuICAgIGNvbnN0IGNhY2hlZCA9ICh0aGlzLnBsdWdpbiBhcyBTaGVybG9ja09TUGx1Z2luICYge1xuICAgICAgbGF0ZXN0V29ya3NwYWNlRGF0YT86IFNoZXJsb2NrV29ya3NwYWNlRGF0YTtcbiAgICB9KS5sYXRlc3RXb3Jrc3BhY2VEYXRhO1xuICAgIGlmICghY2FjaGVkKSB7XG4gICAgICByZXR1cm4gNjtcbiAgICB9XG4gICAgY29uc3QgbGlua2VkID0gY2FjaGVkLnRhc2tzLmZpbHRlcigodGFzaykgPT4gdGFzay5jYXNlUGF0aCA9PT0gY2FzZVBhdGgpO1xuICAgIGlmIChsaW5rZWQubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gNjtcbiAgICB9XG4gICAgY29uc3QgZG9uZSA9IGxpbmtlZC5maWx0ZXIoKHRhc2spID0+IHRhc2suc3RhdHVzID09PSBcImRvbmVcIikubGVuZ3RoO1xuICAgIHJldHVybiBNYXRoLm1heCgxMiwgTWF0aC5yb3VuZCgoZG9uZSAvIGxpbmtlZC5sZW5ndGgpICogMTAwKSk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlclByaW9yaXR5TGFiZWwocHJpb3JpdHk/OiBcImxvd1wiIHwgXCJtZWRpdW1cIiB8IFwiaGlnaFwiKTogc3RyaW5nIHtcbiAgICBpZiAocHJpb3JpdHkgPT09IFwiaGlnaFwiKSB7XG4gICAgICByZXR1cm4gXCJIXCI7XG4gICAgfVxuICAgIGlmIChwcmlvcml0eSA9PT0gXCJsb3dcIikge1xuICAgICAgcmV0dXJuIFwiTFwiO1xuICAgIH1cbiAgICByZXR1cm4gXCJNXCI7XG4gIH1cblxuICBwcml2YXRlIGNvdW50VmF1bHRGaWxlcyhleHRlbnNpb25zOiBzdHJpbmdbXSk6IG51bWJlciB7XG4gICAgY29uc3Qgbm9ybWFsaXplZCA9IG5ldyBTZXQoZXh0ZW5zaW9ucy5tYXAoKGl0ZW0pID0+IGl0ZW0udG9Mb3dlckNhc2UoKSkpO1xuICAgIHJldHVybiB0aGlzLmFwcC52YXVsdC5nZXRGaWxlcygpLmZpbHRlcigoZmlsZSkgPT4gbm9ybWFsaXplZC5oYXMoZmlsZS5leHRlbnNpb24udG9Mb3dlckNhc2UoKSkpLmxlbmd0aDtcbiAgfVxuXG4gIHByaXZhdGUgZm9ybWF0TG9jYWxEYXRlKGRhdGU6IERhdGUpOiBzdHJpbmcge1xuICAgIGNvbnN0IHllYXIgPSBkYXRlLmdldEZ1bGxZZWFyKCk7XG4gICAgY29uc3QgbW9udGggPSBTdHJpbmcoZGF0ZS5nZXRNb250aCgpICsgMSkucGFkU3RhcnQoMiwgXCIwXCIpO1xuICAgIGNvbnN0IGRheSA9IFN0cmluZyhkYXRlLmdldERhdGUoKSkucGFkU3RhcnQoMiwgXCIwXCIpO1xuICAgIHJldHVybiBgJHt5ZWFyfS0ke21vbnRofS0ke2RheX1gO1xuICB9XG5cbiAgcHJpdmF0ZSByZXNvbHZlUGVyaW9kKCk6IFwiZGF5XCIgfCBcIm5pZ2h0XCIge1xuICAgIGNvbnN0IGhvdXIgPSBuZXcgRGF0ZSgpLmdldEhvdXJzKCk7XG4gICAgcmV0dXJuIGhvdXIgPj0gNyAmJiBob3VyIDwgMTggPyBcImRheVwiIDogXCJuaWdodFwiO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVQYXJsb3JCYWNrZHJvcChzaGVsbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICBjb25zdCBiYWNrZHJvcCA9IHNoZWxsLmNyZWF0ZURpdih7IGNsczogXCJzaGVybG9jay1wYXJsb3ItYmFja2Ryb3BcIiB9KTtcbiAgICBiYWNrZHJvcC5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2UgPSBgdXJsKFwiJHt0aGlzLnBsdWdpbi5nZXRQYXJsb3JJbWFnZVVybCgpfVwiKWA7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckZhbGxiYWNrKGVycm9yOiB1bmtub3duKTogdm9pZCB7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICB0aGlzLmNvbnRlbnRFbC5hZGRDbGFzcyhcInNoZXJsb2NrLW9zLXZpZXdcIik7XG4gICAgY29uc3QgcGFuZWwgPSB0aGlzLmNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwic2hlcmxvY2stcGFuZWxcIiB9KTtcbiAgICBwYW5lbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJTaGVybG9jayBPUyBcdTY2ODJcdTY1RjZcdTY3MkFcdTgwRkRcdTZFMzJcdTY3RDNcIiB9KTtcbiAgICBwYW5lbC5jcmVhdGVFbChcInBcIiwge1xuICAgICAgdGV4dDogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBcIlVua25vd24gcmVuZGVyIGVycm9yXCJcbiAgICB9KTtcbiAgICBwYW5lbC5jcmVhdGVFbChcInBcIiwge1xuICAgICAgdGV4dDogXCJcdThDMDNcdThCRDVcdTY1RTVcdTVGRDdcdTVERjJcdTUxOTlcdTUxNjUgL3RtcC9zaGVybG9jay1vcy1kZWJ1Zy5sb2dcIlxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBmaW5kQ2FzZUV2aWRlbmNlKGN1cnJlbnRDYXNlOiBTaGVybG9ja0Nhc2UpOiBTaGVybG9ja0V2aWRlbmNlSXRlbVtdIHtcbiAgICBjb25zdCBldmlkZW5jZVJvb3QgPSBgJHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmlkZW5jZUZvbGRlci5yZXBsYWNlKC9cXC8kLywgXCJcIil9L2A7XG4gICAgY29uc3QgY2FzZVRva2VucyA9IFtcbiAgICAgIGN1cnJlbnRDYXNlLm5hbWUsXG4gICAgICBjdXJyZW50Q2FzZS5maWxlUGF0aCxcbiAgICAgIGN1cnJlbnRDYXNlLmZpbGVQYXRoLnNwbGl0KFwiL1wiKS5wb3AoKT8ucmVwbGFjZSgvXFwubWQkL2ksIFwiXCIpXG4gICAgXVxuICAgICAgLmZpbHRlcigodmFsdWUpOiB2YWx1ZSBpcyBzdHJpbmcgPT4gQm9vbGVhbih2YWx1ZSkpXG4gICAgICAubWFwKCh2YWx1ZSkgPT4gdGhpcy5ub3JtYWxpemVFdmlkZW5jZVRva2VuKHZhbHVlKSk7XG5cbiAgICByZXR1cm4gdGhpcy5hcHAudmF1bHQuZ2V0RmlsZXMoKVxuICAgICAgLmZpbHRlcigoZmlsZSkgPT4gZmlsZS5wYXRoLnN0YXJ0c1dpdGgoZXZpZGVuY2VSb290KSlcbiAgICAgIC5maWx0ZXIoKGZpbGUpID0+IHtcbiAgICAgICAgY29uc3QgY2FjaGUgPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKTtcbiAgICAgICAgY29uc3QgZnJvbnRtYXR0ZXIgPSBjYWNoZT8uZnJvbnRtYXR0ZXI7XG4gICAgICAgIGlmIChmcm9udG1hdHRlcj8uY2FzZVBhdGggPT09IGN1cnJlbnRDYXNlLmZpbGVQYXRoIHx8IGZyb250bWF0dGVyPy5jYXNlID09PSBjdXJyZW50Q2FzZS5uYW1lKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgbm9ybWFsaXplZFBhdGggPSB0aGlzLm5vcm1hbGl6ZUV2aWRlbmNlVG9rZW4oZmlsZS5wYXRoKTtcbiAgICAgICAgcmV0dXJuIGNhc2VUb2tlbnMuc29tZSgodG9rZW4pID0+IHRva2VuLmxlbmd0aCA+IDAgJiYgbm9ybWFsaXplZFBhdGguaW5jbHVkZXModG9rZW4pKTtcbiAgICAgIH0pXG4gICAgICAubWFwKChmaWxlKSA9PiAoeyBmaWxlLCBraW5kOiB0aGlzLnJlc29sdmVFdmlkZW5jZUtpbmQoZmlsZS5leHRlbnNpb24pIH0pKVxuICAgICAgLnNvcnQoKGEsIGIpID0+IGEuZmlsZS5iYXNlbmFtZS5sb2NhbGVDb21wYXJlKGIuZmlsZS5iYXNlbmFtZSkpO1xuICB9XG5cbiAgcHJpdmF0ZSByZXNvbHZlRXZpZGVuY2VLaW5kKGV4dGVuc2lvbjogc3RyaW5nKTogU2hlcmxvY2tFdmlkZW5jZUtpbmQge1xuICAgIGNvbnN0IGV4dCA9IGV4dGVuc2lvbi50b0xvd2VyQ2FzZSgpO1xuICAgIGlmIChleHQgPT09IFwibWRcIikge1xuICAgICAgcmV0dXJuIFwibWFya2Rvd25cIjtcbiAgICB9XG4gICAgaWYgKGV4dCA9PT0gXCJwZGZcIikge1xuICAgICAgcmV0dXJuIFwicGRmXCI7XG4gICAgfVxuICAgIGlmIChbXCJwbmdcIiwgXCJqcGdcIiwgXCJqcGVnXCIsIFwiZ2lmXCIsIFwid2VicFwiLCBcInN2Z1wiXS5pbmNsdWRlcyhleHQpKSB7XG4gICAgICByZXR1cm4gXCJpbWFnZVwiO1xuICAgIH1cbiAgICByZXR1cm4gXCJsb2NhbFwiO1xuICB9XG5cbiAgcHJpdmF0ZSBub3JtYWxpemVFdmlkZW5jZVRva2VuKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiB2YWx1ZS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1tcXHMvX1xcXFwuLV0rL2csIFwiXCIpO1xuICB9XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQUFBQSxtQkFRTztBQUNQLGtCQUFxQjtBQUNyQixzQkFBc0I7OztBQ1Z0QixzQkFBMEM7QUFhMUMsSUFBTSxlQUFxQyxDQUFDLFFBQVEsUUFBUSxZQUFZLGNBQWMsWUFBWSxPQUFPO0FBRXpHLGVBQXNCLGNBQWMsS0FBVSxVQUFpRDtBQUM3RixRQUFNLFVBQVU7QUFBQSxJQUNkLFNBQVM7QUFBQSxJQUNULFNBQVM7QUFBQSxJQUNULFNBQVM7QUFBQSxJQUNULFNBQVM7QUFBQSxJQUNULFNBQVM7QUFBQSxJQUNULFNBQVM7QUFBQSxFQUNYO0FBRUEsYUFBVyxVQUFVLFNBQVM7QUFDNUIsVUFBTSxpQkFBYSwrQkFBYyxNQUFNO0FBQ3ZDLFVBQU0sV0FBVyxXQUFXLE1BQU0sR0FBRyxFQUFFLE9BQU8sT0FBTztBQUNyRCxRQUFJLFVBQVU7QUFFZCxlQUFXLFdBQVcsVUFBVTtBQUM5QixnQkFBVSxVQUFVLEdBQUcsT0FBTyxJQUFJLE9BQU8sS0FBSztBQUM5QyxZQUFNLGtCQUFjLCtCQUFjLE9BQU87QUFDekMsVUFBSSxJQUFJLE1BQU0sc0JB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R0FBRyxZQUFZLENBQUMsSUFBSTtBQUV4RyxlQUFXLE9BQU8sYUFBYTtBQUM3QixpQkFBVyxRQUFRLE9BQU87QUFDeEIsWUFBSSxRQUFRLGNBQWMsS0FBSyxjQUFjLElBQUksS0FBSyxLQUFLLGNBQWMsWUFBWSxHQUFHO0FBQ3RGO0FBQUEsUUFDRjtBQUNBLGNBQU0sV0FBVyxVQUFVLEtBQUssQ0FBQyxTQUFTLEtBQUssYUFBYSxlQUFlLEtBQUssUUFBUSxPQUFPLEtBQUssVUFBVSxJQUFJO0FBQ2xILFlBQUksQ0FBQyxVQUFVO0FBQ2IsaUJBQU8sRUFBRSxLQUFLLE9BQU8sTUFBTSxLQUFLLEtBQUssV0FBVyxNQUFNLFFBQVEsRUFBRTtBQUFBLFFBQ2xFO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFFQSxXQUFPO0FBQUEsRUFDVDtBQUFBLEVBRVEsbUJBQTZCO0FBQ25DLFVBQU0sTUFBTSxvQkFBSSxLQUFLO0FBQ3JCLFVBQU0sTUFBTSxJQUFJLE9BQU87QUFDdkIsVUFBTSxjQUFjLFFBQVEsSUFBSSxLQUFLLElBQUk7QUFDekMsVUFBTSxTQUFTLElBQUksS0FBSyxHQUFHO0FBQzNCLFdBQU8sUUFBUSxJQUFJLFFBQVEsSUFBSSxXQUFXO0FBQzFDLFdBQU8sTUFBTSxLQUFLLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxHQUFHLFVBQVU7QUFDN0MsWUFBTSxTQUFTLElBQUksS0FBSyxNQUFNO0FBQzlCLGFBQU8sUUFBUSxPQUFPLFFBQVEsSUFBSSxLQUFLO0FBQ3ZDLGFBQU8sZ0JBQWdCLE1BQU07QUFBQSxJQUMvQixDQUFDO0FBQUEsRUFDSDtBQUFBLEVBRUEsU0FBUyxTQUF1QjtBQUU5QixZQUFRLElBQUksaUJBQWlCLE9BQU8sRUFBRTtBQUFBLEVBQ3hDO0FBQUEsRUFFUSxvQkFBMEI7QUFDaEMsYUFBUyxLQUFLLFVBQVUsSUFBSSx1QkFBdUI7QUFBQSxFQUNyRDtBQUFBLEVBRUEsbUJBQTJCO0FBQ3pCLFdBQU8sS0FBSyxJQUFJLE1BQU0sUUFBUTtBQUFBLE1BQzVCLHFCQUFxQixLQUFLLFNBQVMsRUFBRTtBQUFBLElBQ3ZDO0FBQUEsRUFDRjtBQUFBLEVBRUEsb0JBQTRCO0FBQzFCLFdBQU8sS0FBSyxJQUFJLE1BQU0sUUFBUTtBQUFBLE1BQzVCLHFCQUFxQixLQUFLLFNBQVMsRUFBRTtBQUFBLElBQ3ZDO0FBQUEsRUFDRjtBQUFBLEVBRUEsc0JBQThCO0FBQzVCLFdBQU8sS0FBSyxJQUFJLE1BQU0sUUFBUTtBQUFBLE1BQzVCLHFCQUFxQixLQUFLLFNBQVMsRUFBRTtBQUFBLElBQ3ZDO0FBQUEsRUFDRjtBQUNGOyIsCiAgIm5hbWVzIjogWyJpbXBvcnRfb2JzaWRpYW4iLCAiaW1wb3J0X29ic2lkaWFuIiwgImltcG9ydF9vYnNpZGlhbiIsICJzaGVsbCIsICJpdGVtIl0KfQo=
