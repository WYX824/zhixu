import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { db } from "../db/database";
import {
  extractPdf,
  type PdfProgress,
} from "../services/pdfService";
import type {
  ExtractedPdfPage,
  PdfCandidate,
} from "../types/pdf";
import type { Task } from "../types/task";

type ImportStatus =
  | "idle"
  | "reading"
  | "review"
  | "finished"
  | "error";

function toDateTimeLocal(isoDate: string) {
  if (!isoDate) {
    return "";
  }

  const date = new Date(isoDate);
  const offset =
    date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 16);
}

function fromDateTimeLocal(value: string) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString();
}

function getConfidenceText(
  confidence: PdfCandidate["confidence"],
) {
  if (confidence === "high") {
    return "已识别截止日期";
  }

  if (confidence === "medium") {
    return "需要核对";
  }

  return "缺少截止日期";
}

export default function PdfImportPage() {
  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const [status, setStatus] =
    useState<ImportStatus>("idle");

  const [fileName, setFileName] =
    useState("");

  const [progress, setProgress] =
    useState<PdfProgress | null>(null);

  const [pages, setPages] =
    useState<ExtractedPdfPage[]>([]);

  const [candidates, setCandidates] =
    useState<PdfCandidate[]>([]);

  const [selectedCandidateId, setSelectedCandidateId] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState("");

  const [isDragging, setIsDragging] =
    useState(false);

  const selectedCandidate =
    candidates.find(
      (candidate) =>
        candidate.id === selectedCandidateId,
    ) ?? null;

  async function processFile(file: File) {
    setStatus("reading");
    setMessage("");
    setFileName(file.name);
    setPages([]);
    setCandidates([]);
    setSelectedCandidateId(null);
    setProgress(null);

    try {
      const result = await extractPdf(
        file,
        setProgress,
      );

      setPages(result.pages);
      setCandidates(result.candidates);

      if (result.candidates.length > 0) {
        setSelectedCandidateId(
          result.candidates[0].id,
        );
      }

      setStatus("review");

      if (result.candidates.length === 0) {
        setMessage(
          "文字提取成功，但没有发现包含截止日期关键词的候选任务。请检查原文，或手动创建任务。",
        );
      }
    } catch (error) {
      console.error(error);

      setStatus("error");

      setMessage(
        error instanceof Error
          ? error.message
          : "PDF 解析失败。",
      );
    }
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (file) {
      void processFile(file);
    }
  }

  function handleDrop(
    event: DragEvent<HTMLDivElement>,
  ) {
    event.preventDefault();
    setIsDragging(false);

    const file =
      event.dataTransfer.files?.[0];

    if (file) {
      void processFile(file);
    }
  }

  function updateCandidate(
    candidateId: string,
    updates: Partial<PdfCandidate>,
  ) {
    setCandidates((currentCandidates) =>
      currentCandidates.map((candidate) =>
        candidate.id === candidateId
          ? {
              ...candidate,
              ...updates,
            }
          : candidate,
      ),
    );
  }

  function ignoreCandidate(
    candidateId: string,
  ) {
    const remainingCandidates =
      candidates.filter(
        (candidate) =>
          candidate.id !== candidateId,
      );

    setCandidates(remainingCandidates);

    setSelectedCandidateId(
      remainingCandidates[0]?.id ?? null,
    );

    if (remainingCandidates.length === 0) {
      setMessage(
        "当前没有待确认的候选任务。",
      );
    }
  }

  async function saveCandidate(
    candidate: PdfCandidate,
  ) {
    const cleanTitle =
      candidate.title.trim();

    if (!cleanTitle) {
      setMessage("请填写任务名称。");
      return;
    }

    if (!candidate.dueAt) {
      setMessage(
        "请核对并填写截止时间。",
      );
      return;
    }

    const dueDate =
      new Date(candidate.dueAt);

    if (Number.isNaN(dueDate.getTime())) {
      setMessage(
        "截止时间格式不正确。",
      );
      return;
    }

    const now =
      new Date().toISOString();

    const task: Task = {
      id: crypto.randomUUID(),
      title: cleanTitle,
      course:
        candidate.course.trim() ||
        "未分类",
      description:
        candidate.description.trim(),
      dueAt: dueDate.toISOString(),
      status: "todo",
      priority: "normal",
      estimatedMinutes: 60,
      reminderOffsets: [
        4320,
        1440,
        120,
      ],
      sourceType: "pdf",
      sourceFileName:
        candidate.sourceFileName,
      sourcePage:
        candidate.sourcePage,
      sourceExcerpt:
        candidate.sourceExcerpt,
      createdAt: now,
      updatedAt: now,
    };

    await db.tasks.add(task);

    await db.importRecords.put({
      id: crypto.randomUUID(),
      fileName:
        candidate.sourceFileName,
      importedAt: now,
      candidateCount: 1,
    });

    ignoreCandidate(candidate.id);

    setMessage(
      `“${cleanTitle}”已保存到任务列表。`,
    );
  }

  function resetImport() {
    setStatus("idle");
    setFileName("");
    setProgress(null);
    setPages([]);
    setCandidates([]);
    setSelectedCandidateId(null);
    setMessage("");
  }

  const progressPercentage =
    progress && progress.totalPages > 0
      ? Math.round(
          (progress.currentPage /
            progress.totalPages) *
            100,
        )
      : 0;

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>PDF 导入</h1>
          <p>
            在浏览器本地读取 PDF，并核对识别出的任务。
          </p>
        </div>

        {status !== "idle" && (
          <button
            type="button"
            className="secondary-button settings-button"
            onClick={resetImport}
          >
            重新选择
          </button>
        )}
      </header>

      {status === "idle" && (
        <section className="pdf-upload-card">
          <div
            className={
              isDragging
                ? "pdf-drop-zone dragging"
                : "pdf-drop-zone"
            }
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
            }}
            onDragLeave={() =>
              setIsDragging(false)
            }
            onDrop={handleDrop}
          >
            <strong>
              拖入课程 PDF
            </strong>

            <p>
              支持含文字层的 PDF，单个文件不超过
              20 MB、100 页。
            </p>

            <button
              type="button"
              className="primary-button settings-button"
              onClick={() =>
                fileInputRef.current?.click()
              }
            >
              选择 PDF
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileChange}
              hidden
            />
          </div>

          <div className="pdf-warning">
            扫描版 PDF 如果没有文字层，第一版无法读取；
            文件不会上传到外部服务器。
          </div>
        </section>
      )}

      {status === "reading" && (
        <section className="pdf-progress-card">
          <h2>正在本地解析</h2>

          <strong>{fileName}</strong>

          <div className="pdf-progress-track">
            <span
              style={{
                width: `${progressPercentage}%`,
              }}
            />
          </div>

          <p>
            {progress?.message ??
              "正在打开 PDF……"}
          </p>
        </section>
      )}

      {status === "error" && (
        <section className="pdf-error-card">
          <h2>无法解析 PDF</h2>
          <p>{message}</p>

          <button
            type="button"
            className="secondary-button settings-button"
            onClick={resetImport}
          >
            选择其他文件
          </button>
        </section>
      )}

      {status === "review" && (
        <>
          <div className="pdf-result-summary">
            <div>
              <strong>{pages.length}</strong>
              <span>已读取页数</span>
            </div>

            <div>
              <strong>
                {candidates.length}
              </strong>
              <span>待确认候选任务</span>
            </div>

            <div>
              <strong>{fileName}</strong>
              <span>当前文件</span>
            </div>
          </div>

          {message && (
            <div
              className="settings-message info"
              role="status"
            >
              {message}
            </div>
          )}

          <div className="pdf-review-layout">
            <section className="pdf-candidate-column">
              <h2>候选任务</h2>

              {candidates.length === 0 ? (
                <div className="empty-state">
                  <strong>
                    没有待确认的候选任务
                  </strong>
                  <p>
                    可以查看右侧原文，或手动创建任务。
                  </p>
                </div>
              ) : (
                <div className="pdf-candidate-list">
                  {candidates.map(
                    (candidate, index) => (
                      <button
                        type="button"
                        key={candidate.id}
                        className={
                          candidate.id ===
                          selectedCandidateId
                            ? "pdf-candidate-button active"
                            : "pdf-candidate-button"
                        }
                        onClick={() =>
                          setSelectedCandidateId(
                            candidate.id,
                          )
                        }
                      >
                        <strong>
                          候选任务 {index + 1}
                        </strong>

                        <span>
                          第 {candidate.sourcePage} 页 ·{" "}
                          {getConfidenceText(
                            candidate.confidence,
                          )}
                        </span>
                      </button>
                    ),
                  )}
                </div>
              )}
            </section>

            <section className="pdf-candidate-editor">
              {selectedCandidate ? (
                <>
                  <h2>核对任务</h2>

                  <label className="form-field">
                    <span>任务名称</span>
                    <input
                      value={
                        selectedCandidate.title
                      }
                      maxLength={80}
                      onChange={(event) =>
                        updateCandidate(
                          selectedCandidate.id,
                          {
                            title:
                              event.target.value,
                          },
                        )
                      }
                    />
                  </label>

                  <label className="form-field">
                    <span>课程</span>
                    <input
                      value={
                        selectedCandidate.course
                      }
                      maxLength={40}
                      placeholder="例如：STAT 201"
                      onChange={(event) =>
                        updateCandidate(
                          selectedCandidate.id,
                          {
                            course:
                              event.target.value,
                          },
                        )
                      }
                    />
                  </label>

                  <label className="form-field">
                    <span>截止时间</span>
                    <input
                      type="datetime-local"
                      value={toDateTimeLocal(
                        selectedCandidate.dueAt,
                      )}
                      onChange={(event) =>
                        updateCandidate(
                          selectedCandidate.id,
                          {
                            dueAt:
                              fromDateTimeLocal(
                                event.target.value,
                              ),
                          },
                        )
                      }
                    />
                  </label>

                  <label className="form-field">
                    <span>任务说明</span>
                    <textarea
                      value={
                        selectedCandidate.description
                      }
                      maxLength={1000}
                      onChange={(event) =>
                        updateCandidate(
                          selectedCandidate.id,
                          {
                            description:
                              event.target.value,
                          },
                        )
                      }
                    />
                  </label>

                  <div className="pdf-source-box">
                    <strong>
                      来源：{
                        selectedCandidate.sourceFileName
                      }，第{" "}
                      {selectedCandidate.sourcePage} 页
                    </strong>

                    <p>
                      {
                        selectedCandidate.sourceExcerpt
                      }
                    </p>
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="secondary-button settings-button"
                      onClick={() =>
                        ignoreCandidate(
                          selectedCandidate.id,
                        )
                      }
                    >
                      忽略
                    </button>

                    <button
                      type="button"
                      className="primary-button settings-button"
                      onClick={() =>
                        void saveCandidate(
                          selectedCandidate,
                        )
                      }
                    >
                      确认并保存
                    </button>
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  请选择一个候选任务。
                </div>
              )}
            </section>

            <aside className="pdf-original-column">
              <h2>逐页原文</h2>

              <div className="pdf-page-list">
                {pages.map((page) => (
                  <details
                    key={page.pageNumber}
                    open={
                      selectedCandidate?.sourcePage ===
                      page.pageNumber
                    }
                  >
                    <summary>
                      第 {page.pageNumber} 页
                    </summary>

                    <pre>
                      {page.text ||
                        "本页没有可提取文字。"}
                    </pre>
                  </details>
                ))}
              </div>
            </aside>
          </div>
        </>
      )}
    </section>
  );
}