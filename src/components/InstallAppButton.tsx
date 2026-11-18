import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;

  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

function isStandaloneMode() {
  return (
    window.matchMedia(
      "(display-mode: standalone)",
    ).matches ||
    (
      "standalone" in window.navigator &&
      (
        window.navigator as Navigator & {
          standalone?: boolean;
        }
      ).standalone === true
    )
  );
}

function isIosDevice() {
  return /iPhone|iPad|iPod/i.test(
    window.navigator.userAgent,
  );
}

export default function InstallAppButton() {
  const [installPrompt, setInstallPrompt] =
    useState<InstallPromptEvent | null>(null);

  const [installed, setInstalled] =
    useState(isStandaloneMode);

  const [showIosHelp, setShowIosHelp] =
    useState(false);

  useEffect(() => {
    function handleBeforeInstallPrompt(
      event: Event,
    ) {
      event.preventDefault();

      setInstallPrompt(
        event as InstallPromptEvent,
      );
    }

    function handleInstalled() {
      setInstalled(true);
      setInstallPrompt(null);
      setShowIosHelp(false);
    }

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt,
    );

    window.addEventListener(
      "appinstalled",
      handleInstalled,
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );

      window.removeEventListener(
        "appinstalled",
        handleInstalled,
      );
    };
  }, []);

  async function installApplication() {
    if (installed) {
      return;
    }

    if (installPrompt) {
      await installPrompt.prompt();

      const choice =
        await installPrompt.userChoice;

      if (choice.outcome === "accepted") {
        setInstalled(true);
      }

      setInstallPrompt(null);
      return;
    }

    if (isIosDevice()) {
      setShowIosHelp(true);
      return;
    }

    setShowIosHelp(true);
  }

  if (installed) {
    return (
      <div className="install-complete">
        <span aria-hidden="true">✓</span>
        已安装
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className="install-app-button"
        onClick={() =>
          void installApplication()
        }
      >
        <span aria-hidden="true">＋</span>
        安装到手机
      </button>

      {showIosHelp && (
        <div
          className="install-help-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-help-title"
          onClick={() =>
            setShowIosHelp(false)
          }
        >
          <div
            className="install-help-card"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="install-help-close"
              aria-label="关闭安装说明"
              onClick={() =>
                setShowIosHelp(false)
              }
            >
              ×
            </button>

            <h2 id="install-help-title">
              安装知序
            </h2>

            {isIosDevice() ? (
              <>
                <p>
                  请使用 Safari 打开当前网页：
                </p>

                <ol>
                  <li>
                    点击底部的“分享”按钮。
                  </li>
                  <li>
                    向下滑动，选择“添加到主屏幕”。
                  </li>
                  <li>
                    点击右上角“添加”。
                  </li>
                </ol>
              </>
            ) : (
              <>
                <p>
                  如果浏览器没有立即显示安装窗口：
                </p>

                <ol>
                  <li>
                    打开浏览器右上角菜单。
                  </li>
                  <li>
                    选择“安装应用”或
                    “添加到主屏幕”。
                  </li>
                  <li>
                    返回页面后再次尝试。
                  </li>
                </ol>
              </>
            )}

            <button
              type="button"
              className="primary-button settings-button"
              onClick={() =>
                setShowIosHelp(false)
              }
            >
              知道了
            </button>
          </div>
        </div>
      )}
    </>
  );
}