import {
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/database";
import { clearSentReminderHistory } from "../services/reminderService";
import type { Task } from "../types/task";
import type { NotificationPermissionState } from "../types/notification";

const BACKUP_VERSION = 1;
const MAX_IMPORT_SIZE = 5 * 1024 * 1024;
const LAST_BACKUP_KEY = "zhixu-last-backup";

interface BackupData {
  version: number;
  application: "zhixu";
  exportedAt: string;
  tasks: Task[];
  settings: Array<{
    key: string;
    value: unknown;
  }>;
}

function getInitialPermission(): NotificationPermissionState {
  if (!("Notification" in window)) {
    return "unsupported";
  }

  return Notification.permission;
}

function getPermissionText(
  permission: NotificationPermissionState,
) {
  if (permission === "granted") {
    return "通知已开启";
  }

  if (permission === "denied") {
    return "通知已被浏览器阻止";
  }

  if (permission === "unsupported") {
    return "当前浏览器不支持通知";
  }

  return "尚未请求通知权限";
}

function getPermissionDescription(
  permission: NotificationPermissionState,
) {
  if (permission === "granted") {
    return "知序可以在网页运行期间发送任务提醒。";
  }

  if (permission === "denied") {
    return "请在浏览器地址栏左侧的网站设置中重新允许通知。";
  }

  if (permission === "unsupported") {
    return "请尝试最新版 Microsoft Edge 或 Google Chrome。";
  }

  return "点击开启通知后，浏览器会显示权限提示。";
}

function isNumberArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "number" &&
        Number.isFinite(item),
    )
  );
}

function isValidTask(value: unknown): value is Task {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const task = value as Record<string, unknown>;

  const validStatus =
    task.status === "todo" ||
    task.status === "completed";

  const validPriority =
    task.priority === "low" ||
    task.priority === "normal" ||
    task.priority === "high";

  const validSource =
    task.sourceType === "manual" ||
    task.sourceType === "pdf";

  const requiredStrings = [
    task.id,
    task.title,
    task.course,
    task.description,
    task.dueAt,
    task.createdAt,
    task.updatedAt,
  ];

  return (
    requiredStrings.every(
      (item) => typeof item === "string",
    ) &&
    task.title !== "" &&
    validStatus &&
    validPriority &&
    validSource &&
    typeof task.estimatedMinutes === "number" &&
    task.estimatedMinutes >= 5 &&
    task.estimatedMinutes <= 1440 &&
    isNumberArray(task.reminderOffsets) &&
    !Number.isNaN(
      new Date(task.dueAt as string).getTime(),
    )
  );
}

function isValidBackup(
  value: unknown,
): value is BackupData {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const backup = value as Record<string, unknown>;

  if (
    backup.version !== BACKUP_VERSION ||
    backup.application !== "zhixu" ||
    typeof backup.exportedAt !== "string" ||
    !Array.isArray(backup.tasks) ||
    !Array.isArray(backup.settings)
  ) {
    return false;
  }

  const tasksAreValid =
    backup.tasks.every(isValidTask);

  const settingsAreValid =
    backup.settings.every((setting) => {
      if (
        typeof setting !== "object" ||
        setting === null
      ) {
        return false;
      }

      return (
        "key" in setting &&
        typeof setting.key === "string" &&
        "value" in setting
      );
    });

  return tasksAreValid && settingsAreValid;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "尚未导出";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "尚未导出";
  }

  return new Intl.DateTimeFormat("zh-HK", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function getBackupFileName() {
  const now = new Date();

  const dateText = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Hong_Kong",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).format(now);

  return `zhixu-backup-${dateText}.json`;
}

export default function SettingsPage() {
  const taskCount = useLiveQuery(
    () => db.tasks.count(),
    [],
    0,
  );

  const importInputRef =
    useRef<HTMLInputElement>(null);

  const [permission, setPermission] =
    useState<NotificationPermissionState>(
      getInitialPermission,
    );

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState<"info" | "success" | "error">(
      "info",
    );

  const [importMode, setImportMode] =
    useState<"merge" | "replace">("merge");

  const [importing, setImporting] =
    useState(false);

  const [clearConfirmation, setClearConfirmation] =
    useState("");

  const [lastBackupAt, setLastBackupAt] =
    useState<string | null>(
      localStorage.getItem(LAST_BACKUP_KEY),
    );

  function showMessage(
    text: string,
    type: "info" | "success" | "error" = "info",
  ) {
    setMessage(text);
    setMessageType(type);
  }

  async function requestNotificationPermission() {
    setMessage("");

    if (!("Notification" in window)) {
      setPermission("unsupported");
      showMessage(
        "当前浏览器不支持系统通知。",
        "error",
      );
      return;
    }

    try {
      const result =
        await Notification.requestPermission();

      setPermission(result);

      if (result === "granted") {
        showMessage(
          "通知权限已开启，可以发送测试通知。",
          "success",
        );
      } else if (result === "denied") {
        showMessage(
          "通知已被阻止，请在浏览器网站设置中手动修改权限。",
          "error",
        );
      } else {
        showMessage(
          "尚未授予通知权限。",
          "info",
        );
      }
    } catch (error) {
      console.error(error);
      showMessage(
        "请求通知权限失败。",
        "error",
      );
    }
  }

  function sendTestNotification() {
    setMessage("");

    if (!("Notification" in window)) {
      showMessage(
        "当前浏览器不支持系统通知。",
        "error",
      );
      return;
    }

    if (Notification.permission !== "granted") {
      showMessage(
        "请先开启通知权限。",
        "error",
      );
      return;
    }

    const notification = new Notification(
      "知序通知测试",
      {
        body:
          "如果看到这条通知，说明浏览器通知功能工作正常。",
        tag: "zhixu-test-notification",
      },
    );

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    showMessage(
      "测试通知已发送。",
      "success",
    );
  }

  function resetReminderHistory() {
    clearSentReminderHistory();

    showMessage(
      "提醒发送历史已清除，正式提醒可以重新触发。",
      "success",
    );
  }

  async function exportBackup() {
    try {
      const [tasks, settings] =
        await Promise.all([
          db.tasks.toArray(),
          db.settings.toArray(),
        ]);

      const backup: BackupData = {
        version: BACKUP_VERSION,
        application: "zhixu",
        exportedAt: new Date().toISOString(),
        tasks,
        settings,
      };

      const jsonText = JSON.stringify(
        backup,
        null,
        2,
      );

      const blob = new Blob([jsonText], {
        type: "application/json;charset=utf-8",
      });

      const url = URL.createObjectURL(blob);
      const downloadLink =
        document.createElement("a");

      downloadLink.href = url;
      downloadLink.download =
        getBackupFileName();

      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();

      URL.revokeObjectURL(url);

      localStorage.setItem(
        LAST_BACKUP_KEY,
        backup.exportedAt,
      );

      setLastBackupAt(backup.exportedAt);

      showMessage(
        `备份已导出，共包含 ${tasks.length} 项任务。`,
        "success",
      );
    } catch (error) {
      console.error(error);

      showMessage(
        "导出失败，请查看浏览器控制台。",
        "error",
      );
    }
  }

  function openImportPicker() {
    importInputRef.current?.click();
  }

  async function handleImportFile(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    if (
      !file.name.toLowerCase().endsWith(".json")
    ) {
      showMessage(
        "请选择扩展名为 .json 的备份文件。",
        "error",
      );
      return;
    }

    if (file.size > MAX_IMPORT_SIZE) {
      showMessage(
        "导入失败：备份文件不能超过 5 MB。",
        "error",
      );
      return;
    }

    setImporting(true);
    setMessage("");

    try {
      const text = await file.text();
      const parsedValue: unknown =
        JSON.parse(text);

      if (!isValidBackup(parsedValue)) {
        showMessage(
          "导入失败：文件不是有效的知序 v1 备份。",
          "error",
        );
        return;
      }

      if (importMode === "replace") {
        const shouldReplace = window.confirm(
          `覆盖导入会先删除当前 ${taskCount} 项任务，再导入 ${parsedValue.tasks.length} 项任务。确定继续吗？`,
        );

        if (!shouldReplace) {
          showMessage(
            "已取消覆盖导入。",
            "info",
          );
          return;
        }
      }

      await db.transaction(
        "rw",
        db.tasks,
        db.settings,
        async () => {
          if (importMode === "replace") {
            await db.tasks.clear();
            await db.settings.clear();
          }

          await db.tasks.bulkPut(
            parsedValue.tasks,
          );

          await db.settings.bulkPut(
            parsedValue.settings,
          );
        },
      );

      showMessage(
        importMode === "replace"
          ? `恢复完成，当前已导入 ${parsedValue.tasks.length} 项任务。`
          : `合并完成，已处理 ${parsedValue.tasks.length} 项任务；相同 ID 的任务已更新。`,
        "success",
      );
    } catch (error) {
      console.error(error);

      if (error instanceof SyntaxError) {
        showMessage(
          `导入失败：JSON 语法错误。${error.message}`,
          "error",
       );
      } else {
        showMessage(
          "导入失败，请查看浏览器控制台。",
          "error",
        );
      }
    } finally {
      setImporting(false);
    }
  }

  async function clearAllData() {
    if (clearConfirmation !== "清除全部数据") {
      showMessage(
        "请输入“清除全部数据”后再执行。",
        "error",
      );
      return;
    }

    const shouldClear = window.confirm(
      `即将永久删除当前 ${taskCount} 项任务和全部设置。此操作无法撤销，确定继续吗？`,
    );

    if (!shouldClear) {
      showMessage(
        "已取消清除操作。",
        "info",
      );
      return;
    }

    try {
      await db.transaction(
        "rw",
        db.tasks,
        db.settings,
        db.importRecords,
        async () => {
          await db.tasks.clear();
          await db.settings.clear();
          await db.importRecords.clear();
        },
      );

      clearSentReminderHistory();
      setClearConfirmation("");

      showMessage(
        "本地任务、设置和导入记录已全部清除。",
        "success",
      );
    } catch (error) {
      console.error(error);

      showMessage(
        "清除失败，请查看浏览器控制台。",
        "error",
      );
    }
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>提醒与数据设置</h1>
          <p>
            管理浏览器通知、本地备份和数据恢复。
          </p>
        </div>
      </header>

      <div className="settings-layout">
        <section className="settings-card">
          <h2>浏览器通知</h2>

          <div className="notification-status">
            <span
              className={[
                "notification-dot",
                permission === "granted"
                  ? "granted"
                  : "",
                permission === "denied"
                  ? "denied"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-hidden="true"
            />

            <div>
              <strong>
                {getPermissionText(permission)}
              </strong>

              <p>
                {getPermissionDescription(permission)}
              </p>
            </div>
          </div>

          <div className="settings-actions">
            <button
              type="button"
              className="primary-button settings-button"
              onClick={() =>
                void requestNotificationPermission()
              }
              disabled={
                permission === "granted" ||
                permission === "unsupported"
              }
            >
              {permission === "granted"
                ? "通知已开启"
                : "开启通知"}
            </button>

            <button
              type="button"
              className="secondary-button settings-button"
              onClick={sendTestNotification}
            >
              发送测试通知
            </button>

            <button
              type="button"
              className="secondary-button settings-button"
              onClick={resetReminderHistory}
            >
              清除提醒历史
            </button>
          </div>
        </section>

        <section className="settings-card">
          <h2>数据备份</h2>

          <div className="data-summary">
            <div>
              <span>当前任务数量</span>
              <strong>{taskCount} 项</strong>
            </div>

            <div>
              <span>备份格式</span>
              <strong>知序 JSON v1</strong>
            </div>

            <div>
              <span>最近一次导出</span>
              <strong>
                {formatDateTime(lastBackupAt)}
              </strong>
            </div>
          </div>

          <p className="settings-description">
            导出文件包含任务、提醒节点、PDF
            来源字段和应用设置，不包含 PDF 文件本身。
          </p>

          <button
            type="button"
            className="primary-button settings-button"
            onClick={() => void exportBackup()}
          >
            导出 JSON 备份
          </button>
        </section>

        <section className="settings-card">
          <h2>恢复数据</h2>

          <div className="import-mode">
            <label>
              <input
                type="radio"
                name="import-mode"
                value="merge"
                checked={importMode === "merge"}
                onChange={() =>
                  setImportMode("merge")
                }
              />

              <span>
                <strong>合并导入</strong>
                <small>
                  保留现有任务；相同 ID
                  的任务使用备份版本更新。
                </small>
              </span>
            </label>

            <label>
              <input
                type="radio"
                name="import-mode"
                value="replace"
                checked={importMode === "replace"}
                onChange={() =>
                  setImportMode("replace")
                }
              />

              <span>
                <strong>覆盖导入</strong>
                <small>
                  先清空当前任务和设置，再恢复备份。
                </small>
              </span>
            </label>
          </div>

          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            onChange={(event) =>
              void handleImportFile(event)
            }
            hidden
          />

          <button
            type="button"
            className="secondary-button settings-button"
            onClick={openImportPicker}
            disabled={importing}
          >
            {importing
              ? "正在导入……"
              : "选择 JSON 备份"}
          </button>

          <p className="settings-description">
            仅接受知序 v1 JSON，文件大小不得超过
            5 MB。导入前会检查任务结构和日期字段。
          </p>
        </section>

        <section className="settings-card warning-card">
          <h2>网页版限制</h2>

          <p>
            关闭网页、退出浏览器或让电脑进入睡眠后，
            提醒可能不会触发。清除浏览器网站数据也会删除
            IndexedDB 中的任务，因此建议定期导出备份。
          </p>
        </section>

        <section className="settings-card danger-zone">
          <h2>清除全部本地数据</h2>

          <p>
            此操作会永久删除任务、设置、PDF 导入记录和
            提醒历史。建议先导出 JSON 备份。
          </p>

          <label
            className="danger-confirmation"
            htmlFor="clear-confirmation"
          >
            输入“清除全部数据”以确认
          </label>

          <input
            id="clear-confirmation"
            className="danger-input"
            type="text"
            value={clearConfirmation}
            onChange={(event) =>
              setClearConfirmation(
                event.target.value,
              )
            }
            autoComplete="off"
          />

          <button
            type="button"
            className="danger-button"
            onClick={() => void clearAllData()}
            disabled={
              clearConfirmation !==
              "清除全部数据"
            }
          >
            永久清除全部数据
          </button>
        </section>

        {message && (
          <div
            className={`settings-message ${messageType}`}
            role="status"
          >
            {message}
          </div>
        )}
      </div>
    </section>
  );
}