import {
  useState,
  type FormEvent,
} from "react";
import {
  Link,
  Navigate,
} from "react-router";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

export default function RegisterPage() {
  const { user, loading } = useAuth();

  const [displayName, setDisplayName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
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
    setSuccess("");

    const cleanName = displayName.trim();
    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanName) {
      setError("请输入昵称。");
      return;
    }

    if (!cleanEmail) {
      setError("请输入邮箱地址。");
      return;
    }

    if (password.length < 8) {
      setError("密码至少需要 8 个字符。");
      return;
    }

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致。");
      return;
    }

    setSubmitting(true);

    try {
      const redirectUrl = new URL(
        import.meta.env.BASE_URL,
        window.location.origin,
      ).toString();

      const {
        data,
        error: signUpError,
      } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            display_name: cleanName,
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      if (data.session) {
        setSuccess(
          "注册成功，账户已自动登录。",
        );
      } else {
        setSuccess(
          "注册申请已提交。请检查邮箱并点击验证链接，然后返回知序登录。",
        );
      }

      setPassword("");
      setConfirmPassword("");
    } catch (registerError) {
      console.error(registerError);

      setError(
        registerError instanceof Error
          ? registerError.message
          : "注册失败，请稍后重试。",
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
            <strong>创建知序账户</strong>
            <span>
              在不同设备同步学习任务
            </span>
          </div>
        </div>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          <label>
            <span>昵称</span>

            <input
              type="text"
              value={displayName}
              onChange={(event) =>
                setDisplayName(
                  event.target.value,
                )
              }
              maxLength={80}
              autoComplete="name"
              placeholder="例如：Yuxuan"
              autoFocus
            />
          </label>

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
              autoComplete="new-password"
              placeholder="至少 8 个字符"
            />
          </label>

          <label>
            <span>确认密码</span>

            <input
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value,
                )
              }
              autoComplete="new-password"
              placeholder="再次输入密码"
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

          {success && (
            <div
              className="auth-message success"
              role="status"
            >
              {success}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={submitting}
          >
            {submitting
              ? "正在注册……"
              : "注册账户"}
          </button>
        </form>

        <p className="auth-switch">
          已经有账户？{" "}
          <Link to="/login">
            前往登录
          </Link>
        </p>

        <p className="auth-privacy">
          第一版只使用邮箱完成身份验证；
          昵称及学习资料由用户自行维护。
        </p>
      </section>
    </div>
  );
}