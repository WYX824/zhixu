import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { db } from "../db/database";
import type {
  Task,
  TaskPriority,
} from "../types/task";

function createDefaultDueTime() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(23, 59, 0, 0);

  const timezoneOffset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffset)
    .toISOString()
    .slice(0, 16);
}

function toDateTimeLocal(isoDate: string) {
  const date = new Date(isoDate);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffset)
    .toISOString()
    .slice(0, 16);
}

export default function TaskEditorPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();

  const isEditing = Boolean(taskId);

  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState(createDefaultDueTime);
  const [priority, setPriority] =
    useState<TaskPriority>("normal");

  const [estimatedMinutes, setEstimatedMinutes] = useState(60);

  const [sourceType, setSourceType] =
    useState<Task["sourceType"]>("manual");

  const [sourceFileName, setSourceFileName] =
    useState("");

  const [sourcePage, setSourcePage] =
    useState<number | undefined>(undefined);

  const [sourceExcerpt, setSourceExcerpt] =
    useState("");

  const [remindThreeDays, setRemindThreeDays] = useState(true);
  const [remindOneDay, setRemindOneDay] = useState(true);
  const [remindTwoHours, setRemindTwoHours] = useState(true);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!taskId) {
      return;
    }

    async function loadTask() {
      const existingTask = await db.tasks.get(taskId!);

      if (!existingTask) {
        setError("没有找到这个任务，任务可能已经被删除。");
        setLoading(false);
        return;
      }

      setTitle(existingTask.title);
      setCourse(existingTask.course);
      setDescription(existingTask.description);
      setDueAt(toDateTimeLocal(existingTask.dueAt));
      setPriority(existingTask.priority);
      setEstimatedMinutes(existingTask.estimatedMinutes);

      setSourceType(existingTask.sourceType);
      setSourceFileName(
        existingTask.sourceFileName ?? "",
      ); 
      setSourcePage(existingTask.sourcePage);
      setSourceExcerpt(
        existingTask.sourceExcerpt ?? "",
      );

      setRemindThreeDays(
        existingTask.reminderOffsets.includes(4320),
      );
      setRemindOneDay(
        existingTask.reminderOffsets.includes(1440),
      );
      setRemindTwoHours(
        existingTask.reminderOffsets.includes(120),
      );

      setLoading(false);
    }

    void loadTask();
  }, [taskId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const cleanTitle = title.trim();
    const cleanCourse = course.trim() || "未分类";

    if (!cleanTitle) {
      setError("请填写任务名称。");
      return;
    }

    if (!dueAt) {
      setError("请设置截止时间。");
      return;
    }

    const dueDate = new Date(dueAt);

    if (Number.isNaN(dueDate.getTime())) {
      setError("截止时间格式不正确。");
      return;
    }

    if (!isEditing && dueDate.getTime() <= Date.now()) {
      setError("新任务的截止时间必须晚于当前时间。");
      return;
    }

    if (
      !Number.isFinite(estimatedMinutes) ||
      estimatedMinutes < 5 ||
      estimatedMinutes > 1440
    ) {
      setError("预计用时必须在 5 至 1440 分钟之间。");
      return;
    }

    const reminderOffsets: number[] = [];

    if (remindThreeDays) {
      reminderOffsets.push(4320);
    }

    if (remindOneDay) {
      reminderOffsets.push(1440);
    }

    if (remindTwoHours) {
      reminderOffsets.push(120);
    }

    setSaving(true);

    try {
      const now = new Date().toISOString();

      if (isEditing && taskId) {
        const existingTask = await db.tasks.get(taskId);

        if (!existingTask) {
          setError("无法保存，因为这个任务已经不存在。");
          return;
        }

        const updatedTask: Task = {
          ...existingTask,
          title: cleanTitle,
          course: cleanCourse,
          description: description.trim(),
          dueAt: dueDate.toISOString(),
          priority,
          estimatedMinutes,
          reminderOffsets,
          updatedAt: now,
        };

        await db.tasks.put(updatedTask);
      } else {
        const newTask: Task = {
          id: crypto.randomUUID(),
          title: cleanTitle,
          course: cleanCourse,
          description: description.trim(),
          dueAt: dueDate.toISOString(),
          status: "todo",
          priority,
          estimatedMinutes,
          reminderOffsets,
          sourceType: "manual",
          createdAt: now,
          updatedAt: now,
        };

        await db.tasks.add(newTask);
      }

      navigate("/tasks", {
        replace: true,
        state: {
          message: isEditing
            ? "任务修改已保存。"
            : "新任务已保存。",
        },
      });
    } catch (saveError) {
      console.error(saveError);
      setError("保存失败，请检查浏览器控制台中的错误。");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section>
        <div className="placeholder-card">正在读取任务……</div>
      </section>
    );
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>{isEditing ? "编辑任务" : "新建任务"}</h1>
          <p>
            任务名称和截止时间为必填项，其他信息可以稍后补充。
          </p>
        </div>

        <Link className="secondary-button" to="/tasks">
          取消
        </Link>
      </header>

      <form className="task-form" onSubmit={handleSubmit}>
        <div className="form-card">
          <h2>基本信息</h2>

          <div className="form-field">
            <label htmlFor="task-title">
              任务名称 <span className="required">*</span>
            </label>

            <input
              id="task-title"
              type="text"
              maxLength={80}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例如：完成统计学作业 3"
              autoFocus
            />

            <small>{title.length}/80</small>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="task-course">课程</label>

              <input
                id="task-course"
                type="text"
                maxLength={40}
                value={course}
                onChange={(event) => setCourse(event.target.value)}
                placeholder="例如：STAT 201"
              />
            </div>

            <div className="form-field">
              <label htmlFor="task-priority">优先级</label>

              <select
                id="task-priority"
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value as TaskPriority)
                }
              >
                <option value="low">低</option>
                <option value="normal">普通</option>
                <option value="high">高</option>
              </select>
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="task-description">任务说明</label>

            <textarea
              id="task-description"
              maxLength={1000}
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              placeholder="填写提交要求、字数、章节或其他说明"
            />

            <small>{description.length}/1000</small>
          </div>
        </div>

      {sourceType === "pdf" && (
        <div className="form-card">
          <h2>PDF 来源</h2>

          <div className="pdf-source-box">
            <strong>
              来源：{sourceFileName || "未知文件"}
              {sourcePage
                ? `，第 ${sourcePage} 页`
                : ""}
            </strong>

            <p>
              {sourceExcerpt || "没有保存来源摘录。"}
            </p>
          </div>

          <p className="form-help">
            来源内容仅供核对。修改任务不会改变原 PDF。
          </p>
        </div>
      )}

        <div className="form-card">
          <h2>时间安排</h2>

          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="task-due">
                截止时间 <span className="required">*</span>
              </label>

              <input
                id="task-due"
                type="datetime-local"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="task-estimate">
                预计用时（分钟）
              </label>

              <input
                id="task-estimate"
                type="number"
                min={5}
                max={1440}
                step={5}
                value={estimatedMinutes}
                onChange={(event) =>
                  setEstimatedMinutes(Number(event.target.value))
                }
              />
            </div>
          </div>
        </div>

        <div className="form-card">
          <h2>提醒</h2>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={remindThreeDays}
              onChange={(event) =>
                setRemindThreeDays(event.target.checked)
              }
            />
            <span>截止前 3 天提醒</span>
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={remindOneDay}
              onChange={(event) =>
                setRemindOneDay(event.target.checked)
              }
            />
            <span>截止前 1 天提醒</span>
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={remindTwoHours}
              onChange={(event) =>
                setRemindTwoHours(event.target.checked)
              }
            />
            <span>截止前 2 小时提醒</span>
          </label>

          <p className="form-help">
            网页版只有在页面运行时才能可靠检查提醒。
          </p>
        </div>

        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        <div className="form-actions">
          <Link className="secondary-button" to="/tasks">
            取消
          </Link>

          <button
            type="submit"
            className="primary-button form-submit"
            disabled={saving}
          >
            {saving
              ? "正在保存……"
              : isEditing
                ? "保存修改"
                : "保存任务"}
          </button>
        </div>
      </form>
    </section>
  );
}
