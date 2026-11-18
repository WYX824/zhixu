import { NavLink, Outlet } from "react-router";
import ReminderWatcher from "./ReminderWatcher";

const navigation = [
  {
    to: "/",
    label: "首页",
    end: true,
  },
  {
    to: "/tasks",
    label: "任务",
    end: false,
  },
  {
    to: "/pdf-import",
    label: "PDF 导入",
    end: false,
  },
  {
    to: "/settings",
    label: "设置",
    end: false,
  },
];

export default function AppLayout() {
  return (
    <>
      <ReminderWatcher />

      <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">知序</div>

        <nav aria-label="主导航">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="local-note">
          <strong>本地模式</strong>
          <span>数据仅保存在当前浏览器</span>
        </div>
      </aside>

      <main className="page-content">
        <Outlet />
      </main>
      </div>
    </>
  );
}