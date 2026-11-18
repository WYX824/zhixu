export type TaskStatus = "todo" | "completed";
export type TaskSource = "manual" | "pdf";
export type TaskPriority = "low" | "normal" | "high";

export interface Task {
  id: string;
  title: string;
  course: string;
  description: string;
  dueAt: string;
  status: TaskStatus;
  priority: TaskPriority;
  estimatedMinutes: number;
  reminderOffsets: number[];

  sourceType: TaskSource;
  sourceFileName?: string;
  sourcePage?: number;
  sourceExcerpt?: string;

  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}