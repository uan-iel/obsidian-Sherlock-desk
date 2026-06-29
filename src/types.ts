export type SherlockEntityType = "case" | "task" | "schedule" | "collection" | "evidence" | "place";

export interface SherlockPluginSettings {
  caseFolder: string;
  taskFolder: string;
  scheduleFolder: string;
  collectionFolder: string;
  evidenceFolder: string;
  placeFolder: string;
  fogDensity: number;
  motionIntensity: number;
  lampGlow: number;
}

export interface SherlockEntityBase {
  filePath: string;
  name: string;
  type: SherlockEntityType;
  created?: string;
  updated?: string;
}

export interface SherlockCase extends SherlockEntityBase {
  type: "case";
  status: "open" | "active" | "archived";
  priority?: "low" | "medium" | "high";
  deadline?: string;
  tags: string[];
}

export interface SherlockTask extends SherlockEntityBase {
  type: "task";
  status: "backlog" | "scheduled" | "done";
  case?: string;
  casePath?: string;
  priority?: "low" | "medium" | "high";
  due?: string;
}

export interface SherlockSchedule extends SherlockEntityBase {
  type: "schedule";
  day?: string;
  start?: string;
  end?: string;
  durationMinutes?: number;
  relatedTask?: string;
  relatedTaskPath?: string;
}

export interface SherlockCollection extends SherlockEntityBase {
  type: "collection";
  status?: "queued" | "reading" | "finished";
  medium?: "book" | "movie" | "series" | "album" | "article" | "other";
  case?: string;
  casePath?: string;
  rating?: number;
}

export interface SherlockEvidence extends SherlockEntityBase {
  type: "evidence";
  case?: string;
  casePath?: string;
  source?: string;
}

export interface SherlockPlace extends SherlockEntityBase {
  type: "place";
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  visitedAt?: string;
  cover?: string;
  case?: string;
  casePath?: string;
}

export interface SherlockWorkspaceData {
  cases: SherlockCase[];
  tasks: SherlockTask[];
  schedules: SherlockSchedule[];
  collections: SherlockCollection[];
  evidence: SherlockEvidence[];
  places: SherlockPlace[];
}
