import {
  NavLink,
  Outlet,
  useLocation,
} from "react-router";
import ReminderWatcher from "./ReminderWatcher";

const navigation = [
  {
    to: "/",
    label: "首页",
    icon: "⌂",
    end: true,
  },
  {
    to: "/tasks",
    label: "任务",
    icon: "✓",
    end: false,
  },
  {
    to: "/pdf-import",
    label: "PDF 导入",
    icon: "⇧",
    end: false,
  },
  {
    to: "/settings",
    label: "设置",
    icon: "⚙",
    end: false,
  },
];

export default function AppLayout() {
  const location = useLocation();

  return (
    <>
      <ReminderWatcher />

      <div className="app-background" aria-hidden="true">
        <span className="background-orb orb-one" />
        <span className="background-orb orb-two" />
        <span className="background-orb orb-three" />
        <span className="background-grid" />
      </div>

      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-mark">知</span>

            <span className="brand-text">
              <strong>知序</strong>
              <small>Study Flow</small>
            </span>
          </div>

          <nav aria-label="主导航">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  isActive
                    ? "nav-link active"
                    : "nav-link"
                }
              >
                <span
                  className="nav-icon"
                  aria-hidden="true"
                >
                  {item.icon}
                </span>

                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="local-note">
            <span
              className="local-status-dot"
              aria-hidden="true"
            />

            <div>
              <strong>本地安全模式</strong>
              <span>数据仅保存在当前浏览器</span>
            </div>
          </div>
        </aside>

        <main className="page-content">
          <div
            key={location.pathname}
            className="page-transition"
          >
            <Outlet />
          </div>
        </main>
      </div>
    </>
  );
}