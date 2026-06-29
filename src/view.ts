import { ItemView, Notice, TFile, WorkspaceLeaf } from "obsidian";
import type SherlockOSPlugin from "./main";
import type { SherlockCase, SherlockPlace, SherlockSchedule, SherlockTask, SherlockWorkspaceData } from "./types";

export const SHERLOCK_VIEW_TYPE = "sherlock-os-dashboard";
export const LEGACY_SHERLOCK_VIEW_TYPE = "sherlock-os-workspace";
type SherlockScreen = "entry" | "home" | "cases" | "reading" | "footprints" | "case";
type SherlockEvidenceKind = "markdown" | "pdf" | "image" | "local";
interface SherlockEvidenceItem {
  file: TFile;
  kind: SherlockEvidenceKind;
}

const ENTRY_TRANSITION_MS = 2600;
const DEFAULT_SCHEDULE_DURATION_MINUTES = 60;
const MAP_CENTER_LONGITUDE = 105;
const WEEK_DAYS = [
  { label: "Mon", offset: 0 },
  { label: "Tue", offset: 1 },
  { label: "Wed", offset: 2 },
  { label: "Thu", offset: 3 },
  { label: "Fri", offset: 4 },
  { label: "Sat", offset: 5 },
  { label: "Sun", offset: 6 }
] as const;
const TIME_SLOTS = ["08:00", "10:00", "12:00", "14:00", "16:00", "19:00"];

export class SherlockWorkspaceView extends ItemView {
  plugin: SherlockOSPlugin;
  private screen: SherlockScreen = "entry";
  private selectedCasePath?: string;
  private hasEntered = false;
  private entryTimer?: number;

  constructor(leaf: WorkspaceLeaf, plugin: SherlockOSPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return SHERLOCK_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Sherlock";
  }

  getIcon(): string {
    return "search-check";
  }

  async onOpen(): Promise<void> {
    try {
      this.contentEl.empty();
      this.contentEl.addClass("sherlock-os-view");
      await this.resetToEntry();
    } catch (error) {
      this.plugin.debugLog(`view:onOpen:error:${error instanceof Error ? error.stack ?? error.message : String(error)}`);
      this.renderFallback(error);
    }
  }

  async onClose(): Promise<void> {
    if (this.entryTimer) {
      window.clearTimeout(this.entryTimer);
      this.entryTimer = undefined;
    }
  }

  async refresh(): Promise<void> {
    try {
      await this.renderCurrentScreen();
    } catch (error) {
      this.plugin.debugLog(`view:refresh:error:${error instanceof Error ? error.stack ?? error.message : String(error)}`);
      this.renderFallback(error);
    }
  }

  async resetToEntry(): Promise<void> {
    if (this.entryTimer) {
      window.clearTimeout(this.entryTimer);
      this.entryTimer = undefined;
    }
    this.selectedCasePath = undefined;
    this.hasEntered = false;
    this.screen = "entry";
    await this.renderCurrentScreen();
  }

  private async renderCurrentScreen(): Promise<void> {
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

  private renderEntryScreen(): void {
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
    hint.setText("点击中央卷宗，点亮案件桌");

    const preload = new Image();
    preload.src = imageUrl;
    const imageReady = preload.decode ? preload.decode() : Promise.resolve();
    imageReady
      .then(() => entry.addClass("is-ready"))
      .catch(() => entry.addClass("is-ready"));

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

  private async renderHome(): Promise<void> {
    this.plugin.debugLog("view:render:start");
    const data = await this.plugin.getWorkspaceData();
    this.contentEl.empty();

    const shell = this.contentEl.createDiv({ cls: "sherlock-shell sherlock-home-shell" });
    shell.dataset.period = this.resolvePeriod();
    this.createParlorBackdrop(shell);
    shell.createDiv({ cls: "sherlock-atmosphere sherlock-fog-layer" });
    shell.createDiv({ cls: "sherlock-atmosphere sherlock-grain-layer" });
    shell.createDiv({ cls: "sherlock-atmosphere sherlock-map-layer" });
    const hero = shell.createDiv({ cls: "sherlock-hero sherlock-home-hero" });
    const copy = hero.createDiv();
    copy.createEl("p", { cls: "sherlock-kicker", text: "221B Baker Street / Home Hall" });
    copy.createEl("h1", { cls: "sherlock-title", text: "Sherlock" });
    copy.createEl("p", {
      cls: "sherlock-editorial-note",
      text: this.resolvePeriod() === "night"
        ? "夜色里的伦敦更适合推理。把线索、日程表、研究与回忆整理进同一张案件桌。"
        : "白昼适合归档与排程。让你的笔记、事务与资料像案卷一样被系统整理。"
    });

    const hub = shell.createDiv({ cls: "sherlock-home-hub" });
    this.createHomePortal(hub, {
      label: "PROJECT DESK",
      title: "案件卷宗与调查排期",
      text: `管理 ${data.cases.length} 宗案件、${data.tasks.filter((item) => item.status !== "done").length} 条线索任务和 ${data.schedules.length} 条排期。`,
      button: "打开案件桌",
      screen: "cases",
      tone: "board"
    });
    this.createHomePortal(hub, {
      label: "ARCHIVE DESK",
      title: "证物研读与档案柜",
      text: `正在研读 ${data.collections.filter((item) => item.status !== "finished").length} 项，证物柜已有 ${data.evidence.length} 份可编辑档案。`,
      button: "打开档案桌",
      screen: "reading",
      tone: "study"
    });
    this.createHomePortal(hub, {
      label: "MEMORY MAP",
      title: "足迹地图",
      text: `${data.places.length} 个城市光点。每次到访都可以沉淀成照片、日期与笔记。`,
      button: "打开地图",
      screen: "footprints",
      tone: "map"
    });
    this.plugin.debugLog("view:render:complete");
  }

  private async renderCaseDesk(): Promise<void> {
    const data = await this.plugin.getWorkspaceData();
    this.contentEl.empty();
    const shell = this.createDeskShell("sherlock-case-desk-shell");
    this.renderDeskHeader(shell, "Project Desk", "案件卷宗与调查排期", "案件、任务和本周调查排期放在同一个工作台里，先选案件，再把真正要执行的线索投递到周板。", [
      { label: "新建案件", action: async () => this.plugin.createCaseNote() },
      { label: "新建任务", action: async () => this.plugin.createTaskNote() },
      { label: "新建排期", action: async () => this.plugin.createScheduleNote(), secondary: true }
    ]);
    const grid = shell.createDiv({ cls: "sherlock-grid sherlock-desk-grid" });
    this.renderCaseBoard(grid, data.cases);
    this.renderInvestigationScheduler(grid, data);
  }

  private async renderReadingDesk(): Promise<void> {
    const data = await this.plugin.getWorkspaceData();
    this.contentEl.empty();
    const shell = this.createDeskShell("sherlock-reading-desk-shell");
    this.renderDeskHeader(shell, "Archive Desk", "证物研读与档案柜", "正在读、正在看、正在研究的内容先留在证物研读；确认沉淀后，一键归入证物柜，之后仍可编辑、删除和关联案件。", [
      { label: "新建研读", action: async () => this.plugin.createCollectionNote() },
      { label: "新建证物", action: async () => this.plugin.createEvidenceNote(), secondary: true }
    ]);
    const grid = shell.createDiv({ cls: "sherlock-grid sherlock-desk-grid" });
    this.renderReadingModule(grid, data);
    this.renderArchiveModule(grid, data);
  }

  private async renderFootprintDesk(): Promise<void> {
    const data = await this.plugin.getWorkspaceData();
    this.contentEl.empty();
    const shell = this.createDeskShell("sherlock-footprint-desk-shell");
    this.renderDeskHeader(shell, "Memory Map", "足迹地图", "城市是记忆坐标。点开一次到访，就能继续补封面、照片墙、时间、笔记和案件/阅读关联。", [
      { label: "新建足迹", action: async () => this.plugin.createPlaceNote() }
    ]);
    this.renderFootprintModule(shell, data);
  }

  private async navigateTo(screen: Exclude<SherlockScreen, "entry" | "case">): Promise<void> {
    this.screen = screen;
    this.selectedCasePath = undefined;
    await this.renderCurrentScreen();
  }

  private createHomePortal(
    container: HTMLElement,
    config: {
      label: string;
      title: string;
      text: string;
      button: string;
      screen: Exclude<SherlockScreen, "entry" | "case" | "home">;
      tone: "study" | "board" | "map";
    }
  ): void {
    const portal = container.createEl("button", { cls: `sherlock-home-portal ${config.tone}` });
    portal.createEl("span", { cls: "sherlock-stage-label", text: config.label });
    portal.createEl("strong", { text: config.title });
    portal.createEl("p", { text: config.text });
    portal.createEl("b", { text: config.button });
    this.registerDomEvent(portal, "click", async () => this.navigateTo(config.screen));
  }

  private createDeskShell(extraClass: string): HTMLElement {
    const shell = this.contentEl.createDiv({ cls: `sherlock-shell sherlock-desk-shell ${extraClass}` });
    shell.dataset.period = this.resolvePeriod();
    shell.createDiv({ cls: "sherlock-atmosphere sherlock-fog-layer" });
    shell.createDiv({ cls: "sherlock-atmosphere sherlock-grain-layer" });
    return shell;
  }

  private renderDeskHeader(
    shell: HTMLElement,
    kicker: string,
    title: string,
    subtitle: string,
    actions: Array<{ label: string; action: () => Promise<unknown>; secondary?: boolean }>
  ): void {
    const header = shell.createDiv({ cls: "sherlock-desk-header" });
    const backButton = header.createEl("button", { cls: "sherlock-icon-button", text: "←" });
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

  private renderCaseBoard(container: HTMLElement, cases: SherlockCase[]): void {
    const card = container.createDiv({ cls: "sherlock-panel sherlock-card full" });
    const header = card.createDiv({ cls: "sherlock-card-heading" });
    const titleBlock = header.createDiv();
    titleBlock.createEl("h3", { text: "案件卷宗" });
    titleBlock.createEl("p", { text: "按状态整理所有案件，点击进入案件详情工作台。" });
    const newCaseButton = header.createEl("button", { cls: "sherlock-mini-button sherlock-mini-button-strong", text: "New Case" });
    this.registerDomEvent(newCaseButton, "click", async () => this.plugin.createCaseNote());
    const board = card.createDiv({ cls: "sherlock-board" });

    this.renderCaseColumn(board, "Open", cases.filter((item) => item.status === "open"));
    this.renderCaseColumn(board, "Active", cases.filter((item) => item.status === "active"));
    this.renderCaseColumn(board, "Archived", cases.filter((item) => item.status === "archived"));
  }

  private renderCaseColumn(container: HTMLElement, title: string, items: SherlockCase[]): void {
    const column = container.createDiv({ cls: "sherlock-board-column" });
    const columnHeader = column.createDiv({ cls: "sherlock-board-column-header" });
    columnHeader.createEl("h4", { text: title });
    columnHeader.createEl("span", { text: String(items.length) });
    if (items.length === 0) {
      column.createEl("p", { cls: "sherlock-empty", text: "暂无记录" });
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
        text: item.deadline ? `截止 ${item.deadline}` : item.filePath
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
      const edit = side.createEl("button", { cls: "sherlock-mini-button", text: "编辑" });
      const remove = side.createEl("button", { cls: "sherlock-mini-button danger", text: "删除" });
      this.registerDomEvent(action, "click", async (event: MouseEvent) => {
        event.stopPropagation();
        await this.plugin.createTaskFromCase(item.filePath);
      });
      this.registerDomEvent(edit, "click", async (event: MouseEvent) => {
        event.stopPropagation();
        await this.plugin.openPath(item.filePath);
      });
      this.registerDomEvent(remove, "click", async (event: MouseEvent) => {
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

  private async renderCaseWorkspace(casePath: string): Promise<void> {
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
    const shell = this.contentEl.createDiv({ cls: "sherlock-shell sherlock-case-shell" });
    shell.dataset.period = this.resolvePeriod();
    shell.createDiv({ cls: "sherlock-atmosphere sherlock-fog-layer" });
    shell.createDiv({ cls: "sherlock-atmosphere sherlock-grain-layer" });

    const header = shell.createDiv({ cls: "sherlock-case-header" });
    const backButton = header.createEl("button", { cls: "sherlock-icon-button", text: "←" });
    this.registerDomEvent(backButton, "click", async () => {
      this.screen = "cases";
      this.selectedCasePath = undefined;
      await this.renderCaseDesk();
    });
    const titleBlock = header.createDiv({ cls: "sherlock-case-title-block" });
    titleBlock.createEl("span", { cls: "sherlock-kicker", text: "Case Workspace" });
    titleBlock.createEl("h1", { text: currentCase.name });
    titleBlock.createEl("p", {
      text: [currentCase.status, currentCase.priority ? `${currentCase.priority} priority` : undefined, currentCase.deadline ? `due ${currentCase.deadline}` : undefined]
        .filter(Boolean)
        .join(" / ")
    });
    const actions = header.createDiv({ cls: "sherlock-case-actions" });
    this.createAction(actions, "新建线索任务", async () => this.plugin.createTaskFromCase(currentCase.filePath));
    this.createAction(actions, "打开案件文件", async () => this.plugin.openPath(currentCase.filePath), true);

    const body = shell.createDiv({ cls: "sherlock-case-grid" });
    this.renderCaseOverview(body, currentCase, caseTasks, caseSchedules);
    this.renderCaseTasks(body, currentCase, caseTasks);
    this.renderCaseSchedule(body, caseSchedules);
    this.renderCaseEvidence(body, currentCase);
    this.renderCaseTimeline(body, currentCase, caseTasks, caseSchedules);
    this.plugin.debugLog("view:case:render:complete");
  }

  private renderCaseOverview(container: HTMLElement, currentCase: SherlockCase, tasks: SherlockTask[], schedules: SherlockSchedule[]): void {
    const panel = container.createDiv({ cls: "sherlock-panel sherlock-case-overview" });
    panel.createEl("h3", { text: "案情中枢" });
    const stats = panel.createDiv({ cls: "sherlock-metric-row" });
    this.createMetric(stats, "任务", String(tasks.length));
    this.createMetric(stats, "已排期", String(schedules.length));
    this.createMetric(stats, "状态", currentCase.status);
    const notes = panel.createDiv({ cls: "sherlock-case-brief" });
    notes.createEl("p", { text: "案件文件、任务线索、调查排期和资料入口会在这里汇合。" });
  }

  private renderCaseTasks(container: HTMLElement, currentCase: SherlockCase, tasks: SherlockTask[]): void {
    const panel = container.createDiv({ cls: "sherlock-panel sherlock-case-panel" });
    panel.createEl("h3", { text: "线索任务" });
    const list = panel.createEl("ul", { cls: "sherlock-list" });
    if (tasks.length === 0) {
      const row = list.createEl("li", { cls: "sherlock-empty" });
      row.setText("这个案件还没有任务。");
      const button = panel.createEl("button", { cls: "sherlock-button", text: "创建第一条线索" });
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
      const edit = side.createEl("button", { cls: "sherlock-mini-button", text: "编辑" });
      const remove = side.createEl("button", { cls: "sherlock-mini-button danger", text: "删除" });
      this.registerDomEvent(edit, "click", async (event: MouseEvent) => {
        event.stopPropagation();
        await this.plugin.openPath(task.filePath);
      });
      this.registerDomEvent(remove, "click", async (event: MouseEvent) => {
        event.stopPropagation();
        await this.plugin.deletePath(task.filePath);
      });
      this.registerDomEvent(row, "click", async () => this.plugin.openPath(task.filePath));
    });
  }

  private renderCaseSchedule(container: HTMLElement, schedules: SherlockSchedule[]): void {
    const panel = container.createDiv({ cls: "sherlock-panel sherlock-case-panel" });
    panel.createEl("h3", { text: "调查排期" });
    const list = panel.createEl("ul", { cls: "sherlock-list" });
    if (schedules.length === 0) {
      list.createEl("li", { cls: "sherlock-empty", text: "暂无排期。把任务拖进周板后，这里会自动出现关联记录。" });
      return;
    }

    schedules.forEach((schedule) => {
      const row = list.createEl("li", { cls: "sherlock-list-item" });
      const body = row.createDiv();
      body.createEl("strong", { text: schedule.relatedTask ?? schedule.name });
      body.createEl("span", { cls: "sherlock-meta", text: [schedule.day, schedule.start && schedule.end ? `${schedule.start}-${schedule.end}` : undefined].filter(Boolean).join(" / ") });
      const side = row.createDiv({ cls: "sherlock-list-actions" });
      const edit = side.createEl("button", { cls: "sherlock-mini-button", text: "编辑" });
      const remove = side.createEl("button", { cls: "sherlock-mini-button danger", text: "删除" });
      this.registerDomEvent(edit, "click", async (event: MouseEvent) => {
        event.stopPropagation();
        await this.plugin.openPath(schedule.filePath);
      });
      this.registerDomEvent(remove, "click", async (event: MouseEvent) => {
        event.stopPropagation();
        await this.plugin.deletePath(schedule.filePath);
      });
      this.registerDomEvent(row, "click", async () => this.plugin.openPath(schedule.filePath));
    });
  }

  private renderCaseEvidence(container: HTMLElement, currentCase: SherlockCase): void {
    const panel = container.createDiv({ cls: "sherlock-panel sherlock-case-panel" });
    const header = panel.createDiv({ cls: "sherlock-panel-heading" });
    header.createEl("h3", { text: "证物柜" });
    const actions = header.createDiv({ cls: "sherlock-inline-actions" });
    const folderButton = actions.createEl("button", { cls: "sherlock-mini-button", text: "打开资料夹" });
    const evidenceButton = actions.createEl("button", { cls: "sherlock-mini-button", text: "新建证物" });
    this.registerDomEvent(folderButton, "click", async () => this.plugin.revealEvidenceFolderForCase(currentCase.filePath));
    this.registerDomEvent(evidenceButton, "click", async () => this.plugin.createEvidenceFromCase(currentCase.filePath));

    const evidence = this.findCaseEvidence(currentCase);
    const cabinet = panel.createDiv({ cls: "sherlock-evidence-cabinet" });
    [
      { label: "Markdown", kind: "markdown" as const },
      { label: "PDF", kind: "pdf" as const },
      { label: "Images", kind: "image" as const },
      { label: "Local files", kind: "local" as const }
    ].forEach(({ label, kind }) => {
      const files = evidence.filter((item) => item.kind === kind);
      const item = cabinet.createDiv({ cls: "sherlock-evidence-slot" });
      item.createEl("strong", { text: label });
      item.createEl("span", { text: files.length > 0 ? `${files.length} item${files.length > 1 ? "s" : ""}` : "empty" });
      const list = item.createEl("ul", { cls: "sherlock-evidence-list" });
      files.slice(0, 3).forEach((evidenceItem) => {
        const row = list.createEl("li");
        const link = row.createEl("button", { cls: "sherlock-evidence-link", text: evidenceItem.file.basename });
        const remove = row.createEl("button", { cls: "sherlock-mini-button danger", text: "删除" });
        this.registerDomEvent(link, "click", async () => this.plugin.openPath(evidenceItem.file.path));
        this.registerDomEvent(remove, "click", async () => this.plugin.deletePath(evidenceItem.file.path));
      });
    });
    const footer = panel.createDiv({ cls: "sherlock-footer" });
    footer.createEl("span", {
      text: evidence.length > 0
        ? `${evidence.length} 份资料已关联到此案件`
        : "把资料放入 Evidence 文件夹，或新建证物笔记开始归档"
    });
  }

  private renderCaseTimeline(container: HTMLElement, currentCase: SherlockCase, tasks: SherlockTask[], schedules: SherlockSchedule[]): void {
    const panel = container.createDiv({ cls: "sherlock-panel sherlock-case-panel sherlock-case-timeline-panel" });
    panel.createEl("h3", { text: "案件时间线" });
    const timeline = panel.createDiv({ cls: "sherlock-timeline" });
    const events = [
      { label: "案件创建", value: currentCase.created ?? "unknown" },
      ...tasks.slice(0, 4).map((task) => ({ label: `任务: ${task.name}`, value: task.updated ?? task.created ?? task.status })),
      ...schedules.slice(0, 4).map((schedule) => ({ label: `排期: ${schedule.relatedTask ?? schedule.name}`, value: [schedule.day, schedule.start].filter(Boolean).join(" ") }))
    ];

    events.forEach((event) => {
      const row = timeline.createDiv({ cls: "sherlock-timeline-row" });
      row.createSpan({ cls: "sherlock-timeline-dot" });
      const copy = row.createDiv();
      copy.createEl("strong", { text: event.label });
      copy.createEl("span", { cls: "sherlock-meta", text: event.value });
    });
  }

  private renderReadingModule(container: HTMLElement, data: SherlockWorkspaceData): void {
    const readingItems = data.collections.filter((item) => item.status !== "finished");
    const card = container.createDiv({ cls: "sherlock-panel sherlock-card wide" });
    const header = card.createDiv({ cls: "sherlock-panel-heading" });
    header.createEl("h3", { text: "证物研读" });
    const addButton = header.createEl("button", { cls: "sherlock-mini-button", text: "新建研读条目" });
    this.registerDomEvent(addButton, "click", async () => this.plugin.createCollectionNote());
    card.createEl("p", {
      cls: "sherlock-mini-copy",
      text: "这里放正在读、正在看、正在研究的内容。每条都能随时补笔记；确认读完后，再归入档案柜。"
    });
    const list = card.createEl("ul", { cls: "sherlock-list" });
    if (readingItems.length === 0) {
      list.createEl("li", { cls: "sherlock-empty", text: "还没有正在研读的条目。可以从书籍、电影、文章或专辑开始。" });
      return;
    }
    readingItems.slice(0, 10).forEach((item) => {
      const row = list.createEl("li", { cls: "sherlock-list-item" });
      const copy = row.createDiv({ cls: "sherlock-list-copy" });
      copy.createEl("strong", { text: item.name });
      copy.createEl("span", { cls: "sherlock-meta", text: [item.medium ?? "collection", item.status ?? "queued"].join(" / ") });
      const side = row.createDiv({ cls: "sherlock-list-actions" });
      side.createEl("span", { cls: "sherlock-chip compact", text: item.medium ?? "item" });
      const archive = side.createEl("button", { cls: "sherlock-mini-button", text: "归入证物柜" });
      const edit = side.createEl("button", { cls: "sherlock-mini-button", text: "补笔记" });
      const remove = side.createEl("button", { cls: "sherlock-mini-button danger", text: "删除" });
      this.registerDomEvent(archive, "click", async (event: MouseEvent) => {
        event.stopPropagation();
        await this.plugin.archiveCollectionAsEvidence(item.filePath);
      });
      this.registerDomEvent(edit, "click", async (event: MouseEvent) => {
        event.stopPropagation();
        await this.plugin.openPath(item.filePath);
      });
      this.registerDomEvent(remove, "click", async (event: MouseEvent) => {
        event.stopPropagation();
        await this.plugin.deletePath(item.filePath);
      });
      this.registerDomEvent(row, "click", async () => this.plugin.openPath(item.filePath));
    });
  }

  private renderArchiveModule(container: HTMLElement, data: SherlockWorkspaceData): void {
    const card = container.createDiv({ cls: "sherlock-panel sherlock-card wide" });
    const header = card.createDiv({ cls: "sherlock-panel-heading" });
    header.createEl("h3", { text: "档案柜" });
    const addButton = header.createEl("button", { cls: "sherlock-mini-button", text: "新建证物" });
    this.registerDomEvent(addButton, "click", async () => this.plugin.createEvidenceNote());
    const cabinet = card.createDiv({ cls: "sherlock-archive-grid" });
    this.createArchiveStat(cabinet, "Markdown", data.evidence.filter((item) => item.filePath.endsWith(".md")).length);
    this.createArchiveStat(cabinet, "PDF / 图片", this.countVaultFiles(["pdf", "png", "jpg", "jpeg", "webp"]));
    this.createArchiveStat(cabinet, "案件关联", data.evidence.filter((item) => item.casePath).length);
    card.createEl("p", {
      cls: "sherlock-mini-copy",
      text: "这里显示已经沉淀进证物柜的条目；每一条都是 Vault 中真实 Markdown 文件，可随时继续编辑或删除。"
    });
    const list = card.createEl("ul", { cls: "sherlock-list sherlock-archive-list" });
    if (data.evidence.length === 0) {
      list.createEl("li", { cls: "sherlock-empty", text: "证物柜还是空的。可以从证物研读中归档，也可以直接新建证物。" });
      return;
    }
    data.evidence.slice(0, 10).forEach((item) => {
      const row = list.createEl("li", { cls: "sherlock-list-item" });
      const copy = row.createDiv({ cls: "sherlock-list-copy" });
      copy.createEl("strong", { text: item.name });
      copy.createEl("span", { cls: "sherlock-meta", text: [item.case ? `案件: ${item.case}` : undefined, item.source ? `来源: ${item.source}` : undefined].filter(Boolean).join(" / ") || item.filePath });
      const side = row.createDiv({ cls: "sherlock-list-actions" });
      const edit = side.createEl("button", { cls: "sherlock-mini-button", text: "编辑" });
      const remove = side.createEl("button", { cls: "sherlock-mini-button danger", text: "删除" });
      this.registerDomEvent(edit, "click", async (event: MouseEvent) => {
        event.stopPropagation();
        await this.plugin.openPath(item.filePath);
      });
      this.registerDomEvent(remove, "click", async (event: MouseEvent) => {
        event.stopPropagation();
        await this.plugin.deletePath(item.filePath);
      });
      this.registerDomEvent(row, "click", async () => this.plugin.openPath(item.filePath));
    });
  }

  private renderFootprintModule(container: HTMLElement, data: SherlockWorkspaceData): void {
    const card = container.createDiv({ cls: "sherlock-footprint-panel" });
    const header = card.createDiv({ cls: "sherlock-panel-heading" });
    header.createEl("h3", { text: "足迹地图" });
    const hint = header.createEl("span", { cls: "sherlock-map-hint", text: "点击地图任意位置创建足迹" });
    hint.setAttribute("aria-label", "点击地图任意位置创建足迹");
    const map = card.createDiv({ cls: "sherlock-footprint-map" });
    map.style.backgroundImage = `linear-gradient(180deg, rgba(47, 25, 9, 0.1), rgba(47, 25, 9, 0.22)), url("${this.plugin.getWorldMapImageUrl()}"), linear-gradient(135deg, #b38a52, #d5b778 42%, #9c6c35)`;

    this.registerDomEvent(map, "click", async (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest(".sherlock-map-point")) {
        return;
      }
      const rect = map.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      await this.plugin.createPlaceFromMapClick(x, y);
    });

    const places = data.places
      .filter((place) => typeof place.latitude === "number" && typeof place.longitude === "number")
      .slice(0, 80);
    if (places.length === 0) {
      map.createEl("p", { cls: "sherlock-empty sherlock-map-empty", text: "还没有足迹。点击地图任意位置即可创建到访记录。" });
    }
    places.forEach((place) => {
      const position = this.resolveMapPoint(place);
      const label = [place.city ?? place.name, place.country, place.visitedAt].filter(Boolean).join(" / ");
      const point = map.createEl("button", { cls: "sherlock-map-point", text: "✓" });
      point.style.left = `${position.x.toFixed(2)}%`;
      point.style.top = `${position.y.toFixed(2)}%`;
      point.setAttribute("aria-label", label || place.name);
      point.setAttribute("title", [place.city, place.country, place.visitedAt].filter(Boolean).join(" / ") || place.name);
      this.registerDomEvent(point, "click", async () => this.plugin.openPath(place.filePath));
      this.registerDomEvent(point, "contextmenu", async (event: MouseEvent) => {
        event.preventDefault();
        await this.plugin.deletePath(place.filePath);
      });
    });
  }

  private renderInvestigationScheduler(container: HTMLElement, data: SherlockWorkspaceData): void {
    const card = container.createDiv({ cls: "sherlock-panel sherlock-card full" });
    card.createEl("h3", { text: "调查排期" });
    card.createEl("p", {
      cls: "sherlock-subtitle sherlock-mini-copy",
      text: "拖动左侧任务到时间格即可排入本周调查；双击任意时间格会快速新建一条日程表记录。排进去后可以随时把任务块放长、放短。"
    });

    const planner = card.createDiv({ cls: "sherlock-planner" });
    const backlog = planner.createDiv({ cls: "sherlock-planner-backlog" });
    backlog.createEl("h4", { text: "待安排任务" });

    const backlogList = backlog.createEl("ul", { cls: "sherlock-list" });
    const backlogTasks = data.tasks.filter((item) => item.status !== "done");
    if (backlogTasks.length === 0) {
      backlogList.createEl("li", { cls: "sherlock-empty", text: "所有事项都处理完了，或者先新建一条任务。" });
    } else {
      backlogTasks.slice(0, 8).forEach((item) => {
        const row = backlogList.createEl("li", { cls: "sherlock-list-item sherlock-draggable-task" });
        row.setAttribute("draggable", "true");
        row.createEl("strong", { text: item.name });
        row.createEl("span", { cls: "sherlock-meta", text: item.status === "scheduled" ? "已排入周板，可再次拖动改档期" : "拖动到右侧时间格" });
        this.registerDomEvent(row, "dragstart", (event: DragEvent) => {
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

        this.registerDomEvent(cell, "dragover", (event: DragEvent) => {
          event.preventDefault();
          cell.addClass("is-dragover");
        });
        this.registerDomEvent(cell, "dragleave", () => {
          cell.removeClass("is-dragover");
        });
        this.registerDomEvent(cell, "drop", async (event: DragEvent) => {
          event.preventDefault();
          cell.removeClass("is-dragover");
          const schedulePath = event.dataTransfer?.getData("application/sherlock-schedule");
          if (schedulePath) {
            const schedule = data.schedules.find((item) => item.filePath === schedulePath);
            const duration = schedule?.durationMinutes ?? this.resolveScheduleDuration(undefined);
            await this.plugin.moveScheduleEntry(schedulePath, date, slot, this.resolveScheduleEnd(slot, duration));
            return;
          }
          const taskPath =
            event.dataTransfer?.getData("application/sherlock-task") ||
            event.dataTransfer?.getData("text/plain");
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
            warning.setAttribute("title", "这个时间格有多条安排，下一步可以加入冲突解决逻辑。");
            const resolveButton = conflictBar.createEl("button", {
              cls: "sherlock-mini-button",
              text: "顺延一条"
            });
            this.registerDomEvent(resolveButton, "click", async (event: MouseEvent) => {
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
            const deleteButton = controls.createEl("button", { cls: "sherlock-mini-button danger", text: "删除" });
            this.registerDomEvent(shrinkButton, "click", async (event: MouseEvent) => {
              event.stopPropagation();
              await this.plugin.adjustScheduleDuration(entry.filePath, -30);
            });
            this.registerDomEvent(extendButton, "click", async (event: MouseEvent) => {
              event.stopPropagation();
              await this.plugin.adjustScheduleDuration(entry.filePath, 30);
            });
            this.registerDomEvent(deleteButton, "click", async (event: MouseEvent) => {
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
            this.registerDomEvent(pill, "dragstart", (event: DragEvent) => {
              event.dataTransfer?.setData("application/sherlock-schedule", entry.filePath);
              event.dataTransfer?.setData("text/plain", entry.filePath);
            });
            this.registerDomEvent(pill, "click", async () => this.plugin.openPath(entry.filePath));
          });
        }
      });
    });
  }

  private createMetric(container: HTMLElement, label: string, value: string): void {
    const metric = container.createDiv({ cls: "sherlock-metric" });
    metric.createEl("div", { cls: "sherlock-metric-label", text: label });
    metric.createEl("div", { cls: "sherlock-metric-value", text: value });
  }

  private createArchiveStat(container: HTMLElement, label: string, value: number): void {
    const stat = container.createDiv({ cls: "sherlock-archive-stat" });
    stat.createEl("strong", { text: String(value) });
    stat.createEl("span", { text: label });
  }

  private createAction(container: HTMLElement, label: string, onClick: () => Promise<unknown>, secondary = false): void {
    const button = container.createEl("button", { cls: `sherlock-button${secondary ? " secondary" : ""}`, text: label });
    this.registerDomEvent(button, "click", async () => {
      try {
        await onClick();
      } catch (error) {
        console.error(error);
        new Notice(`Sherlock OS 操作失败: ${error instanceof Error ? error.message : "未知错误"}`);
      }
    });
  }

  private resolveWeekDate(offset: number): string {
    const now = new Date();
    const day = now.getDay();
    const mondayDelta = day === 0 ? -6 : 1 - day;
    const target = new Date(now);
    target.setDate(now.getDate() + mondayDelta + offset);
    return this.formatLocalDate(target);
  }

  private resolveScheduleDuration(durationMinutes?: number): number {
    return Math.max(30, Math.min(240, durationMinutes ?? DEFAULT_SCHEDULE_DURATION_MINUTES));
  }

  private resolveScheduleEnd(start: string, durationMinutes?: number): string {
    const duration = this.resolveScheduleDuration(durationMinutes);
    const [hour, minute] = start.split(":").map(Number);
    const endMinutes = Math.min(hour * 60 + minute + duration, 23 * 60 + 30);
    const endHour = Math.floor(endMinutes / 60);
    const endMinute = endMinutes % 60;
    return `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
  }

  private resolveSchedulePillHeight(durationMinutes?: number): number {
    const steps = this.resolveScheduleDuration(durationMinutes) / 30;
    return 44 + steps * 26;
  }

  private resolveMapPoint(place: SherlockPlace): { x: number; y: number } {
    const latitude = place.latitude ?? 0;
    const longitude = place.longitude ?? MAP_CENTER_LONGITUDE;
    // Back-end projection contract: signed longitude uses east positive and west negative;
    // signed latitude uses north positive and south negative. The map is centered on China.
    const wrappedLongitude = ((longitude - MAP_CENTER_LONGITUDE + 540) % 360) - 180;
    const x = ((wrappedLongitude + 180) / 360) * 100;
    const y = ((90 - latitude) / 180) * 100;
    return {
      x: Math.max(4, Math.min(96, x)),
      y: Math.max(8, Math.min(92, y))
    };
  }

  private indexSchedules(items: SherlockSchedule[]): Map<string, SherlockSchedule[]> {
    const index = new Map<string, SherlockSchedule[]>();
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

  private pluginTaskCount(casePath: string): number {
    const plugin = this.plugin;
    const cached = (plugin as SherlockOSPlugin & {
      latestWorkspaceData?: SherlockWorkspaceData;
    }).latestWorkspaceData;
    if (!cached) {
      return 0;
    }
    return cached.tasks.filter((task) => task.casePath === casePath).length;
  }

  private resolveCaseProgress(casePath: string): number {
    const cached = (this.plugin as SherlockOSPlugin & {
      latestWorkspaceData?: SherlockWorkspaceData;
    }).latestWorkspaceData;
    if (!cached) {
      return 6;
    }
    const linked = cached.tasks.filter((task) => task.casePath === casePath);
    if (linked.length === 0) {
      return 6;
    }
    const done = linked.filter((task) => task.status === "done").length;
    return Math.max(12, Math.round((done / linked.length) * 100));
  }

  private renderPriorityLabel(priority?: "low" | "medium" | "high"): string {
    if (priority === "high") {
      return "H";
    }
    if (priority === "low") {
      return "L";
    }
    return "M";
  }

  private countVaultFiles(extensions: string[]): number {
    const normalized = new Set(extensions.map((item) => item.toLowerCase()));
    return this.app.vault.getFiles().filter((file) => normalized.has(file.extension.toLowerCase())).length;
  }

  private formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private resolvePeriod(): "day" | "night" {
    const hour = new Date().getHours();
    return hour >= 7 && hour < 18 ? "day" : "night";
  }

  private createParlorBackdrop(shell: HTMLElement): void {
    const backdrop = shell.createDiv({ cls: "sherlock-parlor-backdrop" });
    backdrop.style.backgroundImage = `url("${this.plugin.getParlorImageUrl()}")`;
  }

  private renderFallback(error: unknown): void {
    this.contentEl.empty();
    this.contentEl.addClass("sherlock-os-view");
    const panel = this.contentEl.createDiv({ cls: "sherlock-panel" });
    panel.createEl("h3", { text: "Sherlock OS 暂时未能渲染" });
    panel.createEl("p", {
      text: error instanceof Error ? error.message : "Unknown render error"
    });
    panel.createEl("p", {
      text: "调试日志已写入 /tmp/sherlock-os-debug.log"
    });
  }

  private findCaseEvidence(currentCase: SherlockCase): SherlockEvidenceItem[] {
    const evidenceRoot = `${this.plugin.settings.evidenceFolder.replace(/\/$/, "")}/`;
    const caseTokens = [
      currentCase.name,
      currentCase.filePath,
      currentCase.filePath.split("/").pop()?.replace(/\.md$/i, "")
    ]
      .filter((value): value is string => Boolean(value))
      .map((value) => this.normalizeEvidenceToken(value));

    return this.app.vault.getFiles()
      .filter((file) => file.path.startsWith(evidenceRoot))
      .filter((file) => {
        const cache = this.app.metadataCache.getFileCache(file);
        const frontmatter = cache?.frontmatter;
        if (frontmatter?.casePath === currentCase.filePath || frontmatter?.case === currentCase.name) {
          return true;
        }
        const normalizedPath = this.normalizeEvidenceToken(file.path);
        return caseTokens.some((token) => token.length > 0 && normalizedPath.includes(token));
      })
      .map((file) => ({ file, kind: this.resolveEvidenceKind(file.extension) }))
      .sort((a, b) => a.file.basename.localeCompare(b.file.basename));
  }

  private resolveEvidenceKind(extension: string): SherlockEvidenceKind {
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

  private normalizeEvidenceToken(value: string): string {
    return value.toLowerCase().replace(/[\s/_\\.-]+/g, "");
  }
}
