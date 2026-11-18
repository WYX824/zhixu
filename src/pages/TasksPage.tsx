import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link, useLocation, useNavigate } from "react-router";
import { db } from "../db/database";
import type { Task } from "../types/task";

type FilterType =
  | "all"
  | "today"
  | "week"
  | "overdue"
  | "completed";

function formatDateTime(isoDate: string) {
  return new Intl.DateTimeFormat("zh-HK", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(isoDate));
}

function getTaskTimeGroup(task: Task) {
  if (task.status === "completed") {
    return "completed";
  }

  const now = new Date();
  const dueDate = new Date(task.dueAt);

  if (dueDate.getTime() < now.getTime()) {
    return "overdue";
  }

  const hongKongDateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const parts = Object.fromEntries(
    hongKongDateParts.map((part) => [part.type, part.value]),
  );

  const todayStart = new Date(
    `${parts.year}-${parts.month}-${parts.day}T00:00:00+08:00`,
  );

  const tomorrowStart = new Date(
    todayStart.getTime() + 24 * 60 * 60 * 1000,
  );

  const weekEnd = new Date(
    todayStart.getTime() + 7 * 24 * 60 * 60 * 1000,
  );

  if (dueDate < tomorrowStart) {
    return "today";
  }

  if (dueDate < weekEnd) {
    return "week";
  }

  return "later";
}

function getPriorityText(priority: Task["priority"]) {
  if (priority === "high") {
    return "高";
  }

  if (priority === "low") {
    return "低";
  }

  return "普通";
}

export default function TasksPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const tasks = useLiveQuery(
    () => db.tasks.orderBy("dueAt").toArray(),
    [],
    [],
  );

  const [filter, setFilter] = useState<FilterType>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const flashMessage =
    (
      location.state as
        | {
            message?: string;
          }
        | null
    )?.message ?? "";

  const filteredTasks = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return tasks.filter((task) => {
      const group = getTaskTimeGroup(task);

      const matchesSearch =
        !normalizedSearch ||
        task.title.toLowerCase().includes(normalizedSearch) ||
        task.course.toLowerCase().includes(normalizedSearch);

      if (!matchesSearch) {
        return false;
      }

      if (filter === "all") {
        return true;
      }

      if (filter === "week") {
        return group === "today" || group === "week";
      }

      return group === filter;
    });
  }, [tasks, filter, searchTerm]);

  const statistics = useMemo(
    () => ({
      todo: tasks.filter((task) => task.status === "todo").length,
      today: tasks.filter(
        (task) => getTaskTimeGroup(task) === "today",
      ).length,
      overdue: tasks.filter(
        (task) => getTaskTimeGroup(task) === "overdue",
      ).length,
      completed: tasks.filter(
        (task) => task.status === "completed",
      ).length,
    }),
    [tasks],
  );

  async function toggleTask(task: Task) {
    const isCompleting = task.status === "todo";

    await db.tasks.update(task.id, {
      status: isCompleting ? "completed" : "todo",
      completedAt: isCompleting
        ? new Date().toISOString()
        : undefined,
      updatedAt: new Date().toISOString(),
    });
  }

  async function deleteTask(task: Task) {
    const shouldDelete = window.confirm(
      `确定删除“${task.title}”吗？`,
    );

    if (!shouldDelete) {
      return;
    }

    await db.tasks.delete(task.id);
  }

  function clearFlashMessage() {
    if (flashMessage) {
      navigate(location.pathname, {
        replace: true,
        state: null,
      });
    }
  }

  return (
    <section onClick={clearFlashMessage}>
      <header className="page-header">
        <div>
          <h1>全部任务</h1>
          <p>搜索、筛选和管理学习任务。</p>
        </div>

        <Link className="primary-button" to="/tasks/new">
          新建任务
        </Link>
      </header>

      {flashMessage && (
        <div className="success-message" role="status">
          {flashMessage}
        </div>
      )}

      <div className="task-statistics">
        <div className="stat-card">
          <strong>{statistics.todo}</strong>
          <span>未完成</span>
        </div>

        <div className="stat-card">
          <strong>{statistics.today}</strong>
          <span>今天截止</span>
        </div>

        <div className="stat-card">
          <strong>{statistics.overdue}</strong>
          <span>已经逾期</span>
        </div>

        <div className="stat-card">
          <strong>{statistics.completed}</strong>
          <span>已完成</span>
        </div>
      </div>

      <div className="task-toolbar">
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="搜索任务名称或课程"
          aria-label="搜索任务"
        />
      </div>

      <div className="filter-tabs" aria-label="任务筛选">
        {[
          ["all", "全部"],
          ["today", "今天"],
          ["week", "未来 7 天"],
          ["overdue", "逾期"],
          ["completed", "已完成"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={
              filter === value
                ? "filter-button active"
                : "filter-button"
            }
            onClick={() => setFilter(value as FilterType)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="task-list">
        {filteredTasks.length === 0 ? (
          <div className="empty-state">
            <strong>当前没有匹配的任务</strong>
            <p>可以新建任务，或调整搜索和筛选条件。</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const group = getTaskTimeGroup(task);

            return (
              <article
                className={[
                  "task-item",
                  group === "overdue" ? "overdue" : "",
                  task.status === "completed" ? "completed" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={task.id}
              >
                <button
                  type="button"
                  className="task-check"
                  onClick={() => void toggleTask(task)}
                  aria-label={
                    task.status === "completed"
                      ? "恢复任务"
                      : "标记任务完成"
                  }
                >
                  {task.status === "completed" ? "✓" : ""}
                </button>

                <div className="task-information">
                  <div className="task-title-row">
                    <h2>{task.title}</h2>

                    {group === "overdue" && (
                      <span className="task-badge overdue-badge">
                        已逾期
                      </span>
                    )}

                    {group === "today" && (
                      <span className="task-badge">
                        今天截止
                      </span>
                    )}
                  </div>

                  <p>
                    {task.course} · 截止{" "}
                    {formatDateTime(task.dueAt)}
                  </p>

                  <p>
                    优先级：{getPriorityText(task.priority)} ·
                    预计 {task.estimatedMinutes} 分钟
                  </p>
                </div>

                <div className="task-actions">
                  <Link
                    className="small-button"
                    to={`/tasks/${task.id}/edit`}
                  >
                    编辑
                  </Link>

                  <button
                    type="button"
                    className="small-button delete-button"
                    onClick={() => void deleteTask(task)}
                  >
                    删除
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}