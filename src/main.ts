import {
  App,
  Notice,
  Plugin,
  PluginManifest,
  TAbstractFile,
  TFile,
  WorkspaceLeaf
} from "obsidian";
import { appendFileSync, readFileSync } from "fs";
import { join } from "path";
import { shell } from "electron";
import {
  buildCaseTemplate,
  buildCollectionTemplate,
  buildEvidenceTemplate,
  buildPlaceTemplate,
  buildScheduleTemplate,
  buildTaskTemplate,
  collectWorkspaceData,
  createTypedNote,
  ensureFolders,
  formatLocalDate
} from "./data";
import { SherlockSettingTab } from "./settings";
import type { SherlockPluginSettings, SherlockWorkspaceData } from "./types";
import { LEGACY_SHERLOCK_VIEW_TYPE, SherlockWorkspaceView, SHERLOCK_VIEW_TYPE } from "./view";

const DEFAULT_SETTINGS: SherlockPluginSettings = {
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

export default class SherlockOSPlugin extends Plugin {
  settings: SherlockPluginSettings = DEFAULT_SETTINGS;
  latestWorkspaceData?: SherlockWorkspaceData;

  constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);
  }

  async onload(): Promise<void> {
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

  async onunload(): Promise<void> {
    document.body.classList.remove("sherlock-global-style");
    this.app.workspace.detachLeavesOfType(LEGACY_SHERLOCK_VIEW_TYPE);
    this.app.workspace.detachLeavesOfType(SHERLOCK_VIEW_TYPE);
  }

  async loadSettings(): Promise<void> {
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(await this.loadData())
    };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    await ensureFolders(this.app, this.settings);
    await this.refreshWorkspace();
  }

  async getWorkspaceData(): Promise<SherlockWorkspaceData> {
    try {
      this.latestWorkspaceData = await collectWorkspaceData(this.app);
      return this.latestWorkspaceData;
    } catch (error) {
      this.debugLog(`getWorkspaceData:error:${error instanceof Error ? error.stack ?? error.message : String(error)}`);
      throw error;
    }
  }

  async activateWorkspaceView(): Promise<void> {
    try {
      const { workspace } = this.app;
      this.debugLog("activate:start");
      let leaf = workspace.getLeavesOfType(SHERLOCK_VIEW_TYPE)[0] ?? null;

      if (!leaf) {
        this.debugLog("activate:create-leaf");
        leaf = workspace.getLeaf("tab");
      }

      if (!leaf) {
        new Notice("Sherlock 无法打开主工作区视图。");
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
      new Notice(`Sherlock 打开失败: ${error instanceof Error ? error.message : "未知错误"}`);
    }
  }

  async refreshWorkspace(): Promise<void> {
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

  async createCaseNote(title = this.defaultTitle("New Case")): Promise<TFile> {
    const file = await createTypedNote(
      this.app,
      this.settings.caseFolder,
      title,
      buildCaseTemplate(title)
    );
    await this.openFile(file);
    return file;
  }

  async createTaskNote(title = this.defaultTitle("New Task")): Promise<TFile> {
    const file = await createTypedNote(
      this.app,
      this.settings.taskFolder,
      title,
      buildTaskTemplate(title)
    );
    await this.openFile(file);
    return file;
  }

  async createTaskFromCase(casePath: string, title?: string): Promise<TFile> {
    const abstract = this.app.vault.getAbstractFileByPath(casePath);
    if (!(abstract instanceof TFile)) {
      throw new Error("找不到对应案件文件。");
    }

    const taskTitle = title ?? `${abstract.basename} Lead ${new Date().toISOString().slice(11, 16)}`;
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
      frontmatter.updated = new Date().toISOString();
    });

    await this.openFile(file);
    return file;
  }

  async createTaskForActiveCase(): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      new Notice("请先打开一个案件文件。");
      return;
    }

    const cache = this.app.metadataCache.getFileCache(activeFile);
    if (cache?.frontmatter?.type !== "case") {
      new Notice("当前打开的不是案件文件。");
      return;
    }

    await this.createTaskFromCase(activeFile.path);
  }

  async createEvidenceFromCase(casePath: string, title?: string): Promise<TFile> {
    const abstract = this.app.vault.getAbstractFileByPath(casePath);
    if (!(abstract instanceof TFile)) {
      throw new Error("找不到对应案件文件。");
    }

    const evidenceTitle = title ?? `${abstract.basename} Evidence ${new Date().toISOString().slice(11, 16)}`;
    const file = await createTypedNote(
      this.app,
      this.settings.evidenceFolder,
      evidenceTitle,
      buildEvidenceTemplate(evidenceTitle, abstract.basename, abstract.path)
    );

    await this.openFile(file);
    return file;
  }

  async createEvidenceNote(title = this.defaultTitle("New Evidence")): Promise<TFile> {
    const file = await createTypedNote(
      this.app,
      this.settings.evidenceFolder,
      title,
      buildEvidenceTemplate(title)
    );
    await this.openFile(file);
    return file;
  }

  async archiveCollectionAsEvidence(collectionPath: string): Promise<TFile | null> {
    const abstract = this.app.vault.getAbstractFileByPath(collectionPath);
    if (!(abstract instanceof TFile)) {
      new Notice("找不到要归档的研读条目。");
      return null;
    }

    const firstConfirm = window.confirm(`将「${abstract.basename}」加入证物柜？\n\n这会创建一份可继续编辑的证物笔记，原研读条目会保留。`);
    if (!firstConfirm) {
      return null;
    }
    const secondConfirm = window.confirm(`再次确认：把「${abstract.basename}」沉淀为证物柜条目？`);
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
## 来源研读
- 原始条目：[[${abstract.basename}]]
- 原始路径：${abstract.path}

## 原始笔记摘录
${sourceBody.replace(/^---[\s\S]*?---\s*/, "").trim() || "- "}
`
    );

    await this.app.fileManager.processFrontMatter(file, (evidenceFrontmatter) => {
      evidenceFrontmatter.type = "evidence";
      evidenceFrontmatter.source = abstract.path;
      evidenceFrontmatter.case = typeof frontmatter?.case === "string" ? frontmatter.case : "";
      evidenceFrontmatter.casePath = typeof frontmatter?.casePath === "string" ? frontmatter.casePath : "";
      evidenceFrontmatter.updated = new Date().toISOString();
    });

    await this.app.fileManager.processFrontMatter(abstract, (collectionFrontmatter) => {
      collectionFrontmatter.type = "collection";
      collectionFrontmatter.status = "finished";
      collectionFrontmatter.updated = new Date().toISOString();
    });

    new Notice(`已加入证物柜: ${file.basename}`);
    await this.refreshWorkspace();
    await this.openFile(file);
    return file;
  }

  async ensureEvidenceFolderForCase(casePath: string): Promise<string> {
    const abstract = this.app.vault.getAbstractFileByPath(casePath);
    if (!(abstract instanceof TFile)) {
      throw new Error("找不到对应案件文件。");
    }

    const safeName = abstract.basename.replace(/[\\/:*?"<>|]/g, "-").trim() || "Untitled Case";
    const folderPath = `${this.settings.evidenceFolder.replace(/\/$/, "")}/${safeName}`;
    if (!this.app.vault.getAbstractFileByPath(folderPath)) {
      await this.app.vault.createFolder(folderPath);
    }
    new Notice(`已建立案件资料夹: ${folderPath}`);
    await this.refreshWorkspace();
    return folderPath;
  }

  async revealEvidenceFolderForCase(casePath: string): Promise<void> {
    const folderPath = await this.ensureEvidenceFolderForCase(casePath);
    const adapter = this.app.vault.adapter as unknown as { getBasePath?: () => string };
    const basePath = adapter.getBasePath?.();
    if (!basePath) {
      new Notice(`案件资料夹已建立: ${folderPath}`);
      return;
    }
    await shell.openPath(join(basePath, folderPath));
  }

  async createEvidenceForActiveCase(): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      new Notice("请先打开一个案件文件。");
      return;
    }

    const cache = this.app.metadataCache.getFileCache(activeFile);
    if (cache?.frontmatter?.type !== "case") {
      new Notice("当前打开的不是案件文件。");
      return;
    }

    await this.createEvidenceFromCase(activeFile.path);
  }

  async createScheduleNote(title = this.defaultTitle("New Schedule")): Promise<TFile> {
    const file = await createTypedNote(
      this.app,
      this.settings.scheduleFolder,
      title,
      buildScheduleTemplate(title)
    );
    await this.openFile(file);
    return file;
  }

  async createCollectionNote(title = this.defaultTitle("New Collection")): Promise<TFile> {
    const file = await createTypedNote(
      this.app,
      this.settings.collectionFolder,
      title,
      buildCollectionTemplate(title)
    );
    await this.openFile(file);
    return file;
  }

  async createPlaceNote(): Promise<TFile | null> {
    return this.createPlaceWithTitleAtMapPercent(this.defaultPlaceTitle(), 50, 50);
  }

  async createPlaceFromMapClick(xPercent: number, yPercent: number): Promise<TFile | null> {
    return this.createPlaceWithTitleAtMapPercent(this.defaultPlaceTitle(), xPercent, yPercent);
  }

  private async createPlaceWithTitleAtMapPercent(title: string, xPercent: number, yPercent: number): Promise<TFile | null> {
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
      new Notice(`无法创建足迹: ${error instanceof Error ? error.message : "未知错误"}`);
      return null;
    }
  }

  private defaultPlaceTitle(): string {
    const now = new Date();
    const stamp = now.toISOString().replace("T", " ").slice(0, 19).replace(/:/g, "-");
    const ms = String(now.getMilliseconds()).padStart(3, "0");
    return `Footprint ${stamp} ${ms}`;
  }

  private ensureUniquePlaceTitle(title: string): string {
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

  private convertMapPercentToCoordinates(xPercent: number, yPercent: number): {
    latitude: number;
    longitude: number;
    latitudeHemisphere: "N" | "S";
    longitudeHemisphere: "E" | "W";
  } {
    const clampedX = Math.max(0, Math.min(100, xPercent));
    const clampedY = Math.max(0, Math.min(100, yPercent));
    const rawLongitude = (clampedX / 100) * 360 - 180 + 105;
    const normalizedLongitude = ((rawLongitude + 180) % 360 + 360) % 360 - 180;
    const rawLatitude = 90 - (clampedY / 100) * 180;
    const latitudeHemisphere = rawLatitude >= 0 ? "N" : "S";
    const longitudeHemisphere = normalizedLongitude >= 0 ? "E" : "W";
    return {
      latitude: Math.round(Math.abs(rawLatitude) * 100) / 100,
      longitude: Math.round(Math.abs(normalizedLongitude) * 100) / 100,
      latitudeHemisphere,
      longitudeHemisphere
    };
  }

  async createQuickSchedule(day: string, start: string, end: string): Promise<TFile> {
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
      frontmatter.updated = new Date().toISOString();
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

  async scheduleTaskFromDashboard(taskPath: string, day: string, start: string, end: string): Promise<void> {
    const abstract = this.app.vault.getAbstractFileByPath(taskPath);
    if (!(abstract instanceof TFile)) {
      throw new Error("找不到要安排的任务文件。");
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
      frontmatter.updated = new Date().toISOString();
    });

    await this.app.fileManager.processFrontMatter(taskFile, (frontmatter) => {
      frontmatter.type = "task";
      frontmatter.status = "scheduled";
      frontmatter.updated = new Date().toISOString();
    });

    new Notice(`已将 ${taskFile.basename} 安排到 ${day} ${start}`);
    await this.refreshWorkspace();
  }

  async moveScheduleEntry(schedulePath: string, day: string, start: string, end: string): Promise<void> {
    const abstract = this.app.vault.getAbstractFileByPath(schedulePath);
    if (!(abstract instanceof TFile)) {
      throw new Error("找不到要移动的排期文件。");
    }

    await this.app.fileManager.processFrontMatter(abstract, (frontmatter) => {
      frontmatter.type = "schedule";
      frontmatter.day = day;
      frontmatter.start = start;
      frontmatter.end = end;
      frontmatter.durationMinutes = this.diffMinutes(start, end);
      frontmatter.updated = new Date().toISOString();
    });

    new Notice(`已调整排期到 ${day} ${start}`);
    await this.refreshWorkspace();
  }

  async adjustScheduleDuration(schedulePath: string, deltaMinutes: number): Promise<void> {
    const abstract = this.app.vault.getAbstractFileByPath(schedulePath);
    if (!(abstract instanceof TFile)) {
      throw new Error("找不到要调整时长的排期文件。");
    }

    await this.app.fileManager.processFrontMatter(abstract, (frontmatter) => {
      const start = typeof frontmatter.start === "string" ? frontmatter.start : "09:00";
      const currentDuration =
        typeof frontmatter.durationMinutes === "number"
          ? frontmatter.durationMinutes
          : this.diffMinutes(
              start,
              typeof frontmatter.end === "string" ? frontmatter.end : this.addMinutes(start, 60)
            );
      const nextDuration = Math.max(30, Math.min(240, currentDuration + deltaMinutes));
      frontmatter.start = start;
      frontmatter.durationMinutes = nextDuration;
      frontmatter.end = this.addMinutes(start, nextDuration);
      frontmatter.updated = new Date().toISOString();
    });

    await this.refreshWorkspace();
  }

  async moveScheduleToNextFreeSlot(schedulePath: string): Promise<void> {
    const abstract = this.app.vault.getAbstractFileByPath(schedulePath);
    if (!(abstract instanceof TFile)) {
      throw new Error("找不到要顺延的排期文件。");
    }

    const cache = this.app.metadataCache.getFileCache(abstract);
    const frontmatter = cache?.frontmatter;
    const currentDay = typeof frontmatter?.day === "string" ? frontmatter.day : new Date().toISOString().slice(0, 10);
    const currentStart = typeof frontmatter?.start === "string" ? frontmatter.start : "08:00";
    const duration =
      typeof frontmatter?.durationMinutes === "number"
        ? frontmatter.durationMinutes
        : this.diffMinutes(
            currentStart,
            typeof frontmatter?.end === "string" ? frontmatter.end : this.addMinutes(currentStart, 60)
          );

    const workspaceData = await this.getWorkspaceData();
    const candidate = this.findNextFreeSlot(currentDay, currentStart, duration, workspaceData.schedules, schedulePath);
    if (!candidate) {
      new Notice("本周没有找到可顺延的空档。");
      return;
    }

    await this.moveScheduleEntry(schedulePath, candidate.day, candidate.start, candidate.end);
  }

  async openPath(path: string): Promise<void> {
    const abstract: TAbstractFile | null = this.app.vault.getAbstractFileByPath(path);
    if (!(abstract instanceof TFile)) {
      new Notice("对应文件不存在。");
      return;
    }
    await this.app.workspace.getLeaf(true).openFile(abstract);
  }

  async deletePath(path: string): Promise<void> {
    const abstract: TAbstractFile | null = this.app.vault.getAbstractFileByPath(path);
    if (!(abstract instanceof TFile)) {
      new Notice("对应文件不存在，无法删除。");
      return;
    }
    const confirmed = window.confirm(`确定删除「${abstract.basename}」吗？文件会移到系统废纸篓。`);
    if (!confirmed) {
      return;
    }
    await this.app.vault.trash(abstract, true);
    new Notice(`已删除 ${abstract.basename}`);
    await this.refreshWorkspace();
  }

  private async openFile(file: TFile): Promise<void> {
    await this.app.workspace.getLeaf(true).openFile(file);
    new Notice(`Sherlock OS 已打开 ${file.basename}`);
    await this.refreshWorkspace();
  }

  private defaultTitle(prefix: string): string {
    const stamp = new Date().toISOString().replace("T", " ").slice(0, 16);
    return `${prefix} ${stamp}`;
  }

  private diffMinutes(start: string, end: string): number {
    const startMinutes = this.timeToMinutes(start);
    const endMinutes = this.timeToMinutes(end);
    return Math.max(30, endMinutes - startMinutes);
  }

  private addMinutes(start: string, amount: number): string {
    const next = Math.min(this.timeToMinutes(start) + amount, 23 * 60 + 30);
    const hours = Math.floor(next / 60);
    const minutes = next % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  private timeToMinutes(value: string): number {
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
  }

  private findNextFreeSlot(
    currentDay: string,
    currentStart: string,
    duration: number,
    schedules: SherlockWorkspaceData["schedules"],
    ignoredPath: string
  ): { day: string; start: string; end: string } | null {
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

  private buildCurrentWeek(): string[] {
    const now = new Date();
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

  debugLog(message: string): void {
    try {
      appendFileSync("/tmp/sherlock-os-debug.log", `[${new Date().toISOString()}] ${message}\n`);
    } catch (_error) {
      // Ignore logging failures so diagnostics never break the plugin itself.
    }
  }

  private enableGlobalStyle(): void {
    document.body.classList.add("sherlock-global-style");
  }

  getEntryImageUrl(): string {
    return this.app.vault.adapter.getResourcePath("Sherlock OS/Assets/sherlock-entry.png");
  }

  getParlorImageUrl(): string {
    return this.app.vault.adapter.getResourcePath("Sherlock OS/Assets/sherlock-parlor.png");
  }

  getWorldMapImageUrl(): string {
    return this.app.vault.adapter.getResourcePath("Sherlock OS/Assets/sherlock-world-map.png");
  }

  private async ensureEntryAsset(): Promise<void> {
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
      const fileSystemAdapter = adapter as unknown as { getBasePath?: () => string };
      const basePath = fileSystemAdapter.getBasePath?.();
      if (!basePath) {
        this.debugLog("entry-asset:skip:no-base-path");
        return;
      }

      const pluginAssetPath = join(
        basePath,
        ".obsidian",
        "plugins",
        this.manifest.id,
        "assets",
        "sherlock-entry.png"
      );
      const source = readFileSync(pluginAssetPath);
      const data = source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
      await adapter.writeBinary(targetPath, data);
    } catch (error) {
      const message = error instanceof Error ? error.stack ?? error.message : String(error);
      this.debugLog(`entry-asset:skip:${message}`);
    }
  }

  private async ensureParlorAsset(): Promise<void> {
    await this.ensureBundledAsset("sherlock-parlor.png", "parlor-asset");
  }

  private async ensureWorldMapAsset(): Promise<void> {
    await this.ensureBundledAsset("sherlock-world-map.png", "world-map-asset");
  }

  private async ensureBundledAsset(fileName: string, logPrefix: string): Promise<void> {
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
      const fileSystemAdapter = adapter as unknown as { getBasePath?: () => string };
      const basePath = fileSystemAdapter.getBasePath?.();
      if (!basePath) {
        this.debugLog(`${logPrefix}:skip:no-base-path`);
        return;
      }

      const pluginAssetPath = join(
        basePath,
        ".obsidian",
        "plugins",
        this.manifest.id,
        "assets",
        fileName
      );
      const source = readFileSync(pluginAssetPath);
      const data = source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
      await adapter.writeBinary(targetPath, data);
    } catch (error) {
      const message = error instanceof Error ? error.stack ?? error.message : String(error);
      this.debugLog(`${logPrefix}:skip:${message}`);
    }
  }
}


