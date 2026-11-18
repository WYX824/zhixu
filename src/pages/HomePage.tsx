import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router";
import { db } from "../db/database";
import type { Task } from "../types/task";

const HONG_KONG_TIME_ZONE = "Asia/Hong_Kong";
const ONE_DAY = 24 * 60 * 60 * 1000;

function formatDateTime(isoDate: string) {
  return new Intl.DateTimeFormat("zh-HK", {
    timeZone: HONG_KONG_TIME_ZONE,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(isoDate));
}

function getHongKongTodayStart() {
  const now = new Date();

  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: HONG_KONG_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const parts = Object.fromEntries(
    dateParts.map((part) => [part.type, part.value]),
  );

  return new Date(
    `${parts.year}-${parts.month}-${parts.day}T00:00:00+08:00`,
  );
}

function getTaskGroup(task: Task) {
  if (task.status === "completed") {
    return "completed";
  }

  const dueTime = new Date(task.dueAt).getTime();
  const nowTime = Date.now();

  if (dueTime < nowTime) {
    return "overdue";
  }

  const todayStart = getHongKongTodayStart();
  const tomorrowStart = new Date(todayStart.getTime() + ONE_DAY);
  const sevenDaysEnd = new Date(
    todayStart.getTime() + 7 * ONE_DAY,
  );

  if (dueTime < tomorrowStart.getTime()) {
    return "today";
  }

  if (dueTime < sevenDaysEnd.getTime()) {
    return "week";
  }

  return "later";
}

function getPriorityText(priority: Task["priority"]) {
  if (priority === "high") {
    return "高优先级";
  }

  if (priority === "low") {
    return "低优先级";
  }

  return "普通优先级";
}

function getGreeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: HONG_KONG_TIME_ZONE,
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  );

  if (hour < 6) {
    return "夜深了";
  }

  if (hour < 12) {
    return "早上好";
  }

  if (hour < 18) {
    return "下午好";
  }

  return "晚上好";
}

export default function HomePage() {
  const tasks = useLiveQuery(
    () => db.tasks.orderBy("dueAt").toArray(),
    [],
    [],
  );

  const unfinishedTasks = tasks.filter(
    (task) => task.status === "todo",
  );

  const todayTasks = unfinishedTasks.filter(
    (task) => getTaskGroup(task) === "today",
  );

  const weekTasks = unfinishedTasks.filter((task) => {
    const group = getTaskGroup(task);

    return group === "today" || group === "week";
  });

  const overdueTasks = unfinishedTasks.filter(
    (task) => getTaskGroup(task) === "overdue",
  );

  const nextTask = unfinishedTasks
    .filter(
      (task) => new Date(task.dueAt).getTime() >= Date.now(),
    )
    .sort(
      (firstTask, secondTask) =>
        new Date(firstTask.dueAt).getTime() -
        new Date(secondTask.dueAt).getTime(),
    )[0];

  const displayTasks = [
    ...overdueTasks,
    ...todayTasks.filter(
      (task) =>
        !overdueTasks.some(
          (overdueTask) => overdueTask.id === task.id,
        ),
    ),
  ].slice(0, 5);

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>{getGreeting()}</h1>
          <p>查看今天和即将截止的学习任务。</p>
        </div>

        <div className="header-actions">
          <Link className="secondary-button" to="/pdf-import">
            导入 PDF
          </Link>

          <Link className="primary-button" to="/tasks/new">
            新建任务
          </Link>
        </div>
      </header>

      <div className="home-statistics">
        <Link className="home-stat-card" to="/tasks">
          <strong>{unfinishedTasks.length}</strong>
          <span>未完成任务</span>
        </Link>

        <Link className="home-stat-card" to="/tasks">
          <strong>{todayTasks.length}</strong>
          <span>今天截止</span>
        </Link>

        <Link className="home-stat-card" to="/tasks">
          <strong>{weekTasks.length}</strong>
          <span>未来 7 天</span>
        </Link>

        <Link
          className={
            overdueTasks.length > 0
              ? "home-stat-card warning"
              : "home-stat-card"
          }
          to="/tasks"
        >
          <strong>{overdueTasks.length}</strong>
          <span>已经逾期</span>
        </Link>
      </div>

      <div className="home-layout">
        <section className="dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <h2>今天需要关注</h2>
              <p>优先处理逾期和今天截止的任务。</p>
            </div>

            <Link className="text-link" to="/tasks">
              查看全部
            </Link>
          </div>

          {displayTasks.length === 0 ? (
            <div className="home-empty-state">
              <strong>今天没有紧急任务</strong>
              <p>可以提前处理未来几天的学习事项。</p>

              <Link className="secondary-button" to="/tasks">
                查看未来任务
              </Link>
            </div>
          ) : (
            <div className="home-task-list">
              {displayTasks.map((task) => {
                const group = getTaskGroup(task);

                return (
                  <article
                    className={[
                      "home-task-item",
                      group === "overdue" ? "overdue" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    key={task.id}
                  >
                    <div className="home-task-main">
                      <div className="home-task-title">
                        <h3>{task.title}</h3>

                        {group === "overdue" && (
                          <span className="home-task-badge danger">
                            已逾期
                          </span>
                        )}

                        {group === "today" && (
                          <span className="home-task-badge">
                            今天截止
                          </span>
                        )}
                      </div>

                      <p>
                        {task.course} ·{" "}
                        {formatDateTime(task.dueAt)}
                      </p>

                      <p>
                        {getPriorityText(task.priority)} · 预计{" "}
                        {task.estimatedMinutes} 分钟
                      </p>
                    </div>

                    <Link
                      className="small-button"
                      to={`/tasks/${task.id}/edit`}
                    >
                      编辑
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="home-side-column">
          <section className="dashboard-card">
            <h2>最近截止</h2>

            {nextTask ? (
              <div className="next-task-card">
                <span>下一项</span>
                <strong>{nextTask.title}</strong>
                <p>{nextTask.course}</p>
                <p>
                  截止：{formatDateTime(nextTask.dueAt)}
                </p>

                <Link
                  className="secondary-button"
                  to={`/tasks/${nextTask.id}/edit`}
                >
                  查看任务
                </Link>
              </div>
            ) : (
              <div className="home-empty-small">
                暂无未完成任务
              </div>
            )}
          </section>

          <section className="dashboard-card">
            <h2>快速导入</h2>

            <p className="dashboard-description">
              上传课程说明或作业要求 PDF，提取截止日期和任务内容。
            </p>

            <Link className="secondary-button" to="/pdf-import">
              前往 PDF 导入
            </Link>
          </section>

          <section className="dashboard-card">
            <h2>本地数据</h2>

            <p className="dashboard-description">
              当前任务保存在浏览器 IndexedDB 中。清理浏览器数据前应先导出备份。
            </p>

            <Link className="text-link" to="/settings">
              管理数据备份
            </Link>
          </section>
        </aside>
      </div>
    </section>
  );
}