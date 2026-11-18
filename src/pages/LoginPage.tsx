import {
  useState,
  type FormEvent,
} from "react";
import {
  Link,
  Navigate,
  useNavigate,
} from "react-router";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const {
    user,
    loading,
  } = useAuth();

  const navigate = useNavigate();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  if (loading) {
    return (
      <div className="auth-loading">
        正在检查账户状态……
      </div>
    );
  }

  if (user) {
    return <Navigate to="/account" replace />;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError("");

    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError("请输入邮箱和密码。");
      return;
    }

    setSubmitting(true);

    try {
      const {
        error: signInError,
      } =
        await supabase.auth
          .signInWithPassword({
            email: cleanEmail,
            password,
          });

      if (signInError) {
        throw signInError;
      }

      navigate("/", {
        replace: true,
      });
    } catch (loginError) {
      console.error(loginError);

      setError(
        loginError instanceof Error
          ? loginError.message
          : "登录失败，请稍后重试。",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-panel">
        <div className="auth-brand">
          <span className="auth-brand-mark">
            知
          </span>

          <div>
            <strong>登录知序</strong>
            <span>
              继续管理学习任务
            </span>
          </div>
        </div>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          <label>
            <span>邮箱</span>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              autoComplete="email"
              placeholder="name@example.com"
              autoFocus
            />
          </label>

          <label>
            <span>密码</span>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
              autoComplete="current-password"
              placeholder="输入密码"
            />
          </label>

          {error && (
            <div
              className="auth-message error"
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={submitting}
          >
            {submitting
              ? "正在登录……"
              : "登录"}
          </button>
        </form>

        <p className="auth-switch">
          还没有账户？{" "}
          <Link to="/register">
            免费注册
          </Link>
        </p>

        <p className="auth-privacy">
          未登录时，本机任务仍保存在当前浏览器。
        </p>
      </section>
    </div>
  );
}