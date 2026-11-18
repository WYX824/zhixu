import { db } from "../db/database";
import type { Task } from "../types/task";

const SENT_REMINDERS_KEY = "zhixu-sent-reminders";
const REMINDER_WINDOW_MS = 90 * 1000;

interface SentReminderRecord {
  key: string;
  sentAt: string;
}

function readSentReminders(): SentReminderRecord[] {
  try {
    const value = localStorage.getItem(SENT_REMINDERS_KEY);

    if (!value) {
      return [];
    }

    const parsedValue: unknown = JSON.parse(value);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(
      (item): item is SentReminderRecord =>
        typeof item === "object" &&
        item !== null &&
        "key" in item &&
        "sentAt" in item &&
        typeof item.key === "string" &&
        typeof item.sentAt === "string",
    );
  } catch {
    return [];
  }
}

function writeSentReminders(records: SentReminderRecord[]) {
  localStorage.setItem(
    SENT_REMINDERS_KEY,
    JSON.stringify(records),
  );
}

function removeOldReminderRecords(
  records: SentReminderRecord[],
) {
  const retentionTime = 90 * 24 * 60 * 60 * 1000;
  const cutoffTime = Date.now() - retentionTime;

  return records.filter(
    (record) =>
      new Date(record.sentAt).getTime() >= cutoffTime,
  );
}

function createReminderKey(
  taskId: string,
  offsetMinutes: number,
) {
  return `${taskId}:${offsetMinutes}`;
}

function formatDueDate(isoDate: string) {
  return new Intl.DateTimeFormat("zh-HK", {
    timeZone: "Asia/Hong_Kong",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(isoDate));
}

function getReminderLabel(offsetMinutes: number) {
  if (offsetMinutes === 4320) {
    return "3 天";
  }

  if (offsetMinutes === 1440) {
    return "1 天";
  }

  if (offsetMinutes === 120) {
    return "2 小时";
  }

  if (offsetMinutes >= 1440) {
    return `${Math.round(offsetMinutes / 1440)} 天`;
  }

  if (offsetMinutes >= 60) {
    return `${Math.round(offsetMinutes / 60)} 小时`;
  }

  return `${offsetMinutes} 分钟`;
}

function sendTaskNotification(
  task: Task,
  offsetMinutes: number,
) {
  const notification = new Notification(
    `知序提醒：${task.title}`,
    {
      body:
        `${task.course} · 距离截止还有` +
        `${getReminderLabel(offsetMinutes)}\n` +
        `截止：${formatDueDate(task.dueAt)}`,
      tag: createReminderKey(task.id, offsetMinutes),
      requireInteraction: offsetMinutes <= 120,
    },
  );

  notification.onclick = () => {
    window.focus();
    window.location.assign(`/tasks/${task.id}/edit`);
    notification.close();
  };
}

export async function checkTaskReminders() {
  if (
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) {
    return;
  }

  const tasks = await db.tasks
    .where("status")
    .equals("todo")
    .toArray();

  const nowTime = Date.now();

  let sentRecords = removeOldReminderRecords(
    readSentReminders(),
  );

  const sentKeys = new Set(
    sentRecords.map((record) => record.key),
  );

  for (const task of tasks) {
    const dueTime = new Date(task.dueAt).getTime();

    if (!Number.isFinite(dueTime) || dueTime <= nowTime) {
      continue;
    }

    for (const offsetMinutes of task.reminderOffsets) {
      const reminderTime =
        dueTime - offsetMinutes * 60 * 1000;

      const timeSinceReminder = nowTime - reminderTime;

      const isInsideReminderWindow =
        timeSinceReminder >= 0 &&
        timeSinceReminder <= REMINDER_WINDOW_MS;

      const reminderKey = createReminderKey(
        task.id,
        offsetMinutes,
      );

      if (
        isInsideReminderWindow &&
        !sentKeys.has(reminderKey)
      ) {
        sendTaskNotification(task, offsetMinutes);

        sentRecords.push({
          key: reminderKey,
          sentAt: new Date().toISOString(),
        });

        sentKeys.add(reminderKey);
      }
    }
  }

  writeSentReminders(sentRecords);
}

export function clearSentReminderHistory() {
  localStorage.removeItem(SENT_REMINDERS_KEY);
}