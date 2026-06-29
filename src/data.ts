import { App, TFile, normalizePath } from "obsidian";
import type {
  SherlockCase,
  SherlockCollection,
  SherlockEvidence,
  SherlockEntityType,
  SherlockPlace,
  SherlockPluginSettings,
  SherlockSchedule,
  SherlockTask,
  SherlockWorkspaceData
} from "./types";

const ENTITY_TYPES: SherlockEntityType[] = ["case", "task", "schedule", "collection", "evidence", "place"];

export async function ensureFolders(app: App, settings: SherlockPluginSettings): Promise<void> {
  const folders = [
    settings.caseFolder,
    settings.taskFolder,
    settings.scheduleFolder,
    settings.collectionFolder,
    settings.evidenceFolder,
    settings.placeFolder
  ];

  for (const folder of folders) {
    const normalized = normalizePath(folder);
    const segments = normalized.split("/").filter(Boolean);
    let current = "";

    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      const currentPath = normalizePath(current);
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

export function buildFrontmatter(type: SherlockEntityType, title: string, extras: Record<string, string> = {}): string {
  const created = new Date().toISOString();
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

export function buildCaseTemplate(title: string): string {
  return `${buildFrontmatter("case", title, {
    status: "open",
    priority: "medium",
    tags: "[]"
  })}# ${title}

## 案情概览
- 背景：
- 当前目标：
- 下一步推理：

## 相关线索
- 

## 关联资料
- 
`;
}

export function buildTaskTemplate(title: string): string {
  return `${buildFrontmatter("task", title, {
    status: "backlog",
    priority: "medium",
    case: '""',
    casePath: '""'
  })}# ${title}

## 任务说明
- 

## 所属案件
- 
`;
}

export function buildScheduleTemplate(title: string): string {
  return `${buildFrontmatter("schedule", title, {
    day: `"${formatLocalDate(new Date())}"`,
    start: '"09:00"',
    end: '"10:00"',
    durationMinutes: "60",
    relatedTask: '""',
    relatedTaskPath: '""'
  })}# ${title}

## 调查安排
- 目标：
- 准备事项：
`;
}

export function buildCollectionTemplate(title: string): string {
  return `${buildFrontmatter("collection", title, {
    status: "reading",
    medium: "book",
    case: '""',
    casePath: '""',
    rating: "0"
  })}# ${title}

## 研读记录
- 摘抄：
- 观点：
- 复盘：

## 案件关联
- 
`;
}

export function buildEvidenceTemplate(title: string, caseName = "", casePath = ""): string {
  return `${buildFrontmatter("evidence", title, {
    case: `"${caseName.replace(/"/g, '\\"')}"`,
    casePath: `"${casePath.replace(/"/g, '\\"')}"`,
    source: '""'
  })}# ${title}

## 证物说明
- 来源：
- 观察：
- 推论：

## 关联案件
- ${caseName || "未关联"}
`;
}

export function buildPlaceTemplate(
  title: string,
  latitude?: number,
  longitude?: number,
  latitudeHemisphere = "",
  longitudeHemisphere = ""
): string {
  return `${buildFrontmatter("place", title, {
    city: `"${title.replace(/"/g, '\\"')}"`,
    country: '""',
    latitude: latitude === undefined ? '""' : String(latitude),
    longitude: longitude === undefined ? '""' : String(longitude),
    latitudeHemisphere: `"${latitudeHemisphere}"`,
    longitudeHemisphere: `"${longitudeHemisphere}"`,
    visitedAt: `"${formatLocalDate(new Date())}"`,
    cover: '""',
    case: '""',
    casePath: '""'
  })}# ${title}

## 到访记录
- 时间：
- 照片：
- 记忆：

## 关联
- 
`;
}

export async function collectWorkspaceData(app: App): Promise<SherlockWorkspaceData> {
  const files = app.vault.getMarkdownFiles();
  const cases: SherlockCase[] = [];
  const tasks: SherlockTask[] = [];
  const schedules: SherlockSchedule[] = [];
  const collections: SherlockCollection[] = [];
  const evidence: SherlockEvidence[] = [];
  const places: SherlockPlace[] = [];

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

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function createTypedNote(
  app: App,
  folder: string,
  title: string,
  template: string
): Promise<TFile> {
  const safeName = title.replace(/[\\/:*?"<>|]/g, "-").trim() || "Untitled";
  const filePath = normalizePath(`${folder}/${safeName}.md`);
  const existing = app.vault.getAbstractFileByPath(filePath);
  if (existing instanceof TFile) {
    return existing;
  }
  return app.vault.create(filePath, template);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asPriority(value: unknown): "low" | "medium" | "high" | undefined {
  return value === "low" || value === "medium" || value === "high" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function asCaseStatus(value: unknown): "open" | "active" | "archived" {
  return value === "active" || value === "archived" ? value : "open";
}

function asTaskStatus(value: unknown): "backlog" | "scheduled" | "done" {
  return value === "scheduled" || value === "done" ? value : "backlog";
}

function asCollectionStatus(value: unknown): "queued" | "reading" | "finished" | undefined {
  return value === "queued" || value === "reading" || value === "finished" ? value : undefined;
}

function asCollectionMedium(value: unknown): "book" | "movie" | "series" | "album" | "article" | "other" | undefined {
  return value === "book" || value === "movie" || value === "series" || value === "album" || value === "article" || value === "other"
    ? value
    : undefined;
}

function byUpdatedDesc<T extends { updated?: string }>(a: T, b: T): number {
  return (b.updated ?? "").localeCompare(a.updated ?? "");
}
