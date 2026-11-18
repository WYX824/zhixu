import {
  Navigate,
  useNavigate,
} from "react-router";
import { useAuth } from "../contexts/AuthContext";

export default function AccountPage() {
  const {
    user,
    loading,
    signOut,
  } = useAuth();

  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="placeholder-card">
        正在读取账户……
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  async function handleSignOut() {
    try {
      await signOut();

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      console.error(error);
      alert("退出失败，请稍后重试。");
    }
  }

  const displayName =
    user.user_metadata.display_name ||
    "知序用户";

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>账户</h1>
          <p>
            管理个人资料和云端同步。
          </p>
        </div>
      </header>

      <div className="account-layout">
        <section className="account-card">
          <div className="account-avatar">
            {String(displayName)
              .slice(0, 1)
              .toUpperCase()}
          </div>

          <div className="account-identity">
            <strong>{displayName}</strong>
            <span>
              {user.email ??
                "没有邮箱信息"}
            </span>
          </div>

          <span className="account-status">
            已登录
          </span>
        </section>

        <section className="account-card">
          <h2>账户信息</h2>

          <dl className="account-details">
            <div>
              <dt>用户 ID</dt>
              <dd>{user.id}</dd>
            </div>

            <div>
              <dt>邮箱验证</dt>
              <dd>
                {user.email_confirmed_at
                  ? "已验证"
                  : "尚未验证"}
              </dd>
            </div>

            <div>
              <dt>账户创建时间</dt>
              <dd>
                {new Intl.DateTimeFormat(
                  "zh-HK",
                  {
                    timeZone:
                      "Asia/Hong_Kong",
                    dateStyle: "medium",
                    timeStyle: "short",
                  },
                ).format(
                  new Date(
                    user.created_at,
                  ),
                )}
              </dd>
            </div>
          </dl>
        </section>

        <section className="account-card">
          <h2>数据状态</h2>

          <p className="account-description">
            当前任务仍保存在本机 IndexedDB。
            下一步会提供“迁移到此账户”功能，
            然后在多台设备间同步。
          </p>
        </section>

        <section className="account-card danger-zone">
          <h2>退出账户</h2>

          <p>
            退出不会删除本机任务，也不会删除
            Supabase 中的账户资料。
          </p>

          <button
            type="button"
            className="danger-button"
            onClick={() =>
              void handleSignOut()
            }
          >
            退出登录
          </button>
        </section>
      </div>
    </section>
  );
}