import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type {
  AuthError,
  Session,
  User,
} from "@supabase/supabase-js";

import { supabase } from "../lib/supabase";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authError: string;
  clearAuthError: () => void;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext =
  createContext<AuthContextValue | null>(null);

function getAuthErrorMessage(
  error: AuthError | Error,
) {
  const message = error.message.toLowerCase();

  if (
    message.includes(
      "invalid login credentials",
    )
  ) {
    return "邮箱或密码不正确。";
  }

  if (
    message.includes(
      "email not confirmed",
    )
  ) {
    return "邮箱尚未验证，请先打开验证邮件。";
  }

  if (
    message.includes(
      "user already registered",
    )
  ) {
    return "该邮箱已经注册，请直接登录。";
  }

  if (
    message.includes(
      "email rate limit exceeded",
    )
  ) {
    return "验证邮件发送过于频繁，请稍后再试。";
  }

  if (
    message.includes(
      "signup is disabled",
    )
  ) {
    return "当前项目未开启邮箱注册。";
  }

  if (
    message.includes(
      "invalid path specified",
    )
  ) {
    return "认证回调地址无效，请检查 Supabase Redirect URLs。";
  }

  return error.message;
}

function shouldMoveToAccountPage() {
  const currentHash =
    window.location.hash;

  return (
    !currentHash ||
    currentHash === "#" ||
    currentHash === "#/" ||
    currentHash.startsWith(
      "#/login",
    ) ||
    currentHash.startsWith(
      "#/register",
    )
  );
}

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [session, setSession] =
    useState<Session | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [authError, setAuthError] =
    useState("");

  function clearAuthError() {
    setAuthError("");
  }

  async function refreshSession() {
    try {
      const {
        data,
        error,
      } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      setSession(data.session);
      setAuthError("");
    } catch (error) {
      console.error(
        "读取 Supabase 会话失败：",
        error,
      );

      if (error instanceof Error) {
        setAuthError(
          getAuthErrorMessage(error),
        );
      } else {
        setAuthError(
          "无法读取账户会话。",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let componentIsActive = true;

    async function initializeAuth() {
      try {
        const {
          data,
          error,
        } =
          await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (componentIsActive) {
          setSession(data.session);
          setAuthError("");
        }
      } catch (error) {
        console.error(
          "初始化 Supabase 会话失败：",
          error,
        );

        if (
          componentIsActive &&
          error instanceof Error
        ) {
          setAuthError(
            getAuthErrorMessage(error),
          );
        }
      } finally {
        if (componentIsActive) {
          setLoading(false);
        }
      }
    }

    void initializeAuth();

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (event, nextSession) => {
          if (!componentIsActive) {
            return;
          }

          setSession(nextSession);
          setLoading(false);
          setAuthError("");

          if (
            (
              event === "SIGNED_IN" ||
              event ===
                "PASSWORD_RECOVERY"
            ) &&
            nextSession &&
            shouldMoveToAccountPage()
          ) {
            window.location.hash =
              "#/account";
          }

          if (
            event === "SIGNED_OUT"
          ) {
            const currentHash =
              window.location.hash;

            if (
              currentHash.startsWith(
                "#/account",
              )
            ) {
              window.location.hash =
                "#/login";
            }
          }
        },
      );

    return () => {
      componentIsActive = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    setAuthError("");

    try {
      const {
        error,
      } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      setSession(null);
    } catch (error) {
      console.error(
        "退出 Supabase 账户失败：",
        error,
      );

      if (error instanceof Error) {
        const message =
          getAuthErrorMessage(error);

        setAuthError(message);
        throw new Error(message);
      }

      setAuthError(
        "退出登录失败，请稍后重试。",
      );

      throw new Error(
        "退出登录失败，请稍后重试。",
      );
    }
  }

  const value =
    useMemo<AuthContextValue>(
      () => ({
        user: session?.user ?? null,
        session,
        loading,
        authError,
        clearAuthError,
        refreshSession,
        signOut,
      }),
      [
        session,
        loading,
        authError,
      ],
    );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth 必须在 AuthProvider 内使用。",
    );
  }

  return context;
}