import {
  NavLink,
  Outlet,
  useLocation,
} from "react-router";

import { useAuth } from "../contexts/AuthContext";
import InstallAppButton from "./InstallAppButton";
import ReminderWatcher from "./ReminderWatcher";

interface NavigationItem {
  to: string;
  label: string;
  icon: string;
  end: boolean;
}

const mainNavigation: NavigationItem[] = [
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

function getUserDisplayName(
  user: ReturnType<typeof useAuth>["user"],
) {
  if (!user) {
    return "登录";
  }

  const metadataName =
    user.user_metadata?.display_name;

  if (
    typeof metadataName === "string" &&
    metadataName.trim()
  ) {
    return metadataName.trim();
  }

  if (user.email) {
    return user.email.split("@")[0];
  }

  return "账户";
}

export default function AppLayout() {
  const location = useLocation();

  const {
    user,
    loading,
  } = useAuth();

  const accountNavigation: NavigationItem = {
    to: user ? "/account" : "/login",
    label: loading
      ? "账户"
      : getUserDisplayName(user),
    icon: user ? "●" : "○",
    end: false,
  };

  const navigation = [
    ...mainNavigation,
    accountNavigation,
  ];

  return (
    <>
      <ReminderWatcher />

      <div
        className="app-background"
        aria-hidden="true"
      >
        <span className="background-orb orb-one" />

        <span className="background-orb orb-two" />

        <span className="background-orb orb-three" />

        <span className="background-grid" />
      </div>

      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <span
              className="brand-mark"
              aria-hidden="true"
            >
              知
            </span>

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
                className={({ isActive }) => {
                  const classes = [
                    "nav-link",
                  ];

                  if (isActive) {
                    classes.push("active");
                  }

                  if (
                    item.to === "/account" ||
                    item.to === "/login"
                  ) {
                    classes.push("account-link");
                  }

                  return classes.join(" ");
                }}
              >
                <span
                  className="nav-icon"
                  aria-hidden="true"
                >
                  {item.icon}
                </span>

                <span className="nav-label">
                  {item.label}
                </span>
              </NavLink>
            ))}
          </nav>

          <div className="install-section">
            <InstallAppButton />
          </div>

          <div className="local-note">
            <span
              className="local-status-dot"
              aria-hidden="true"
            />

            <div>
              <strong>
                {user
                  ? "账户已登录"
                  : "本地安全模式"}
              </strong>

              <span>
                {user
                  ? "云端账户服务已连接"
                  : "数据仅保存在当前浏览器"}
              </span>
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