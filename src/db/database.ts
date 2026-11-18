import Dexie, { type EntityTable } from "dexie";
import type { Task } from "../types/task";

export interface AppSetting {
  key: string;
  value: unknown;
}

export interface ImportRecord {
  id: string;
  fileName: string;
  importedAt: string;
  candidateCount: number;
}

export const db = new Dexie("ZhixuDatabase") as Dexie & {
  tasks: EntityTable<Task, "id">;
  settings: EntityTable<AppSetting, "key">;
  importRecords: EntityTable<ImportRecord, "id">;
};

db.version(1).stores({
  tasks: "id, dueAt, status, course, sourceType, createdAt",
  settings: "key",
  importRecords: "id, fileName, importedAt",
});