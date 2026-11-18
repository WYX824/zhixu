import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type {
  ExtractedPdfPage,
  PdfCandidate,
} from "../types/pdf";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  pdfWorkerUrl;

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_PAGE_COUNT = 100;

interface TextItemLike {
  str?: unknown;
  hasEOL?: unknown;
}

export interface PdfExtractionResult {
  pages: ExtractedPdfPage[];
  candidates: PdfCandidate[];
}

export interface PdfProgress {
  currentPage: number;
  totalPages: number;
  message: string;
}

export function validatePdfFile(file: File) {
  const isPdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    throw new Error("请选择 PDF 文件。");
  }

  if (file.size === 0) {
    throw new Error("PDF 文件为空。");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("PDF 文件不能超过 20 MB。");
  }
}

function normalizePageText(
  items: TextItemLike[],
) {
  let text = "";

  for (const item of items) {
    if (typeof item.str !== "string") {
      continue;
    }

    text += item.str;

    if (item.hasEOL === true) {
      text += "\n";
    } else {
      text += " ";
    }
  }

  return text
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getExcerpt(
  text: string,
  matchIndex: number,
) {
  const start = Math.max(0, matchIndex - 180);
  const end = Math.min(
    text.length,
    matchIndex + 420,
  );

  return text
    .slice(start, end)
    .replace(/\s+/g, " ")
    .trim();
}

function cleanCandidateTitle(value: string) {
  return value
    .replace(
      /^(?:assignment|assessment|project|essay|report|proposal|quiz|exam)\s*[:：-]?\s*/i,
      "",
    )
    .replace(
      /\b(?:deadline|due date|due|submission date|submit by)\b.*$/i,
      "",
    )
    .replace(
      /(?:截止日期|截止时间|截止|提交日期|提交时间|提交截止).*$/,
      "",
    )
    .replace(/\s+/g, " ")
    .replace(/[：:;,，。.\-\s]+$/g, "")
    .trim();
}

function getCandidateTitle(excerpt: string) {
  const labeledTitlePatterns = [
    /(?:assignment|assessment)\s*[:：-]\s*([^\n.!?。！？]{3,100})/i,
    /(?:project|essay|report|proposal|quiz|exam)\s*[:：-]\s*([^\n.!?。！？]{3,100})/i,
    /(?:作业|论文|报告|项目|测验|考试)\s*[:：-]\s*([^\n。！？]{2,80})/i,
  ];

  for (const pattern of labeledTitlePatterns) {
    const match = excerpt.match(pattern);

    if (!match?.[1]) {
      continue;
    }

    const cleanedTitle = cleanCandidateTitle(
      match[1],
    );

    if (cleanedTitle.length >= 2) {
      return cleanedTitle.slice(0, 80);
    }
  }

  const keywordTitlePattern =
    /(?:assignment|assessment|project|essay|report|proposal|quiz|exam|作业|论文|报告|项目|测验|考试)[^.!?。！？\n]{0,80}/i;

  const keywordMatch =
    excerpt.match(keywordTitlePattern);

  if (keywordMatch) {
    const cleanedTitle = cleanCandidateTitle(
      keywordMatch[0],
    );

    if (cleanedTitle.length >= 2) {
      return cleanedTitle.slice(0, 80);
    }
  }

  return "核对 PDF 中的学习任务";
}

function createHongKongDate(
  year: number,
  month: number,
  day: number,
  hour = 23,
  minute = 59,
) {
  const date = new Date(
    Date.UTC(
      year,
      month,
      day,
      hour - 8,
      minute,
      0,
      0,
    ),
  );

  if (
    !Number.isFinite(date.getTime()) ||
    month < 0 ||
    month > 11 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return date;
}

function parseEnglishMonthDate(text: string) {
  const monthMap: Record<string, number> = {
    january: 0,
    jan: 0,
    february: 1,
    feb: 1,
    march: 2,
    mar: 2,
    april: 3,
    apr: 3,
    may: 4,
    june: 5,
    jun: 5,
    july: 6,
    jul: 6,
    august: 7,
    aug: 7,
    september: 8,
    sep: 8,
    sept: 8,
    october: 9,
    oct: 9,
    november: 10,
    nov: 10,
    december: 11,
    dec: 11,
  };

  const monthNames =
    "January|February|March|April|May|June|" +
    "July|August|September|October|November|December|" +
    "Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec";

  const dayFirstPattern = new RegExp(
    "\\b(\\d{1,2})\\s+(" +
      monthNames +
      ")\\s+(20\\d{2})" +
      "(?:\\s*(?:at|,)?\\s*(\\d{1,2})[:.](\\d{2}))?\\b",
    "i",
  );

  const monthFirstPattern = new RegExp(
    "\\b(" +
      monthNames +
      ")\\s+(\\d{1,2})\\s*[,，]?\\s*(20\\d{2})" +
      "(?:\\s*(?:at|,)?\\s*(\\d{1,2})[:.](\\d{2}))?\\b",
    "i",
  );

  const dayFirstMatch = text.match(dayFirstPattern);

  if (dayFirstMatch) {
    const day = Number(dayFirstMatch[1]);
    const month =
      monthMap[dayFirstMatch[2].toLowerCase()];
    const year = Number(dayFirstMatch[3]);
    const hour = Number(dayFirstMatch[4] ?? 23);
    const minute = Number(dayFirstMatch[5] ?? 59);

    return createHongKongDate(
      year,
      month,
      day,
      hour,
      minute,
    );
  }

  const monthFirstMatch = text.match(monthFirstPattern);

  if (monthFirstMatch) {
    const month =
      monthMap[monthFirstMatch[1].toLowerCase()];
    const day = Number(monthFirstMatch[2]);
    const year = Number(monthFirstMatch[3]);
    const hour = Number(monthFirstMatch[4] ?? 23);
    const minute = Number(monthFirstMatch[5] ?? 59);

    return createHongKongDate(
      year,
      month,
      day,
      hour,
      minute,
    );
  }

  return null;
}

function parseNumericDate(text: string) {
  const pattern = new RegExp(
    "\\b(20\\d{2})[-/.](\\d{1,2})[-/.](\\d{1,2})" +
      "(?:\\s+(\\d{1,2})[:：](\\d{2}))?\\b",
  );

  const match = text.match(pattern);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const hour = Number(match[4] ?? 23);
  const minute = Number(match[5] ?? 59);

  return createHongKongDate(
    year,
    month,
    day,
    hour,
    minute,
  );
}

function parseChineseDate(text: string) {
  const pattern = new RegExp(
    "(?:(20\\d{2})年)?" +
      "(\\d{1,2})月" +
      "(\\d{1,2})日?" +
      "(?:\\s*(上午|下午|晚上)?" +
      "\\s*(\\d{1,2})(?:点|时|[:：])" +
      "(\\d{1,2})?)?",
  );

  const match = text.match(pattern);

  if (!match) {
    return null;
  }

  const currentHongKongYear = Number(
    new Intl.DateTimeFormat("en", {
      timeZone: "Asia/Hong_Kong",
      year: "numeric",
    }).format(new Date()),
  );

  const year = Number(
    match[1] ?? currentHongKongYear,
  );

  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const period = match[4] ?? "";

  let hour = Number(match[5] ?? 23);
  const minute = Number(match[6] ?? 59);

  if (
    (period === "下午" || period === "晚上") &&
    hour < 12
  ) {
    hour += 12;
  }

  if (period === "上午" && hour === 12) {
    hour = 0;
  }

  return createHongKongDate(
    year,
    month,
    day,
    hour,
    minute,
  );
}

function findDueDate(text: string) {
  const date =
    parseNumericDate(text) ??
    parseEnglishMonthDate(text) ??
    parseChineseDate(text);

  if (
    !date ||
    Number.isNaN(date.getTime())
  ) {
    return "";
  }

  return date.toISOString();
}

function buildCandidates(
  fileName: string,
  pages: ExtractedPdfPage[],
) {
  const candidates: PdfCandidate[] = [];

  const keywordPattern =
    /\b(?:deadline|due date|due|submission date|submit by)\b|截止(?:日期|时间)?|提交(?:日期|时间|截止)?/gi;

  for (const page of pages) {
    const matches = [
      ...page.text.matchAll(keywordPattern),
    ];

    for (const match of matches) {
      const matchIndex = match.index ?? 0;
      const excerpt = getExcerpt(
        page.text,
        matchIndex,
      );

      const dueDate = findDueDate(excerpt);

      candidates.push({
        id: crypto.randomUUID(),
        title: getCandidateTitle(excerpt),
        course: "",
        description: excerpt.slice(0, 1000),
        dueAt: dueDate,
        sourceFileName: fileName,
        sourcePage: page.pageNumber,
        sourceExcerpt: excerpt,
        confidence: dueDate
          ? "high"
          : "low",
      });
    }
  }

  const uniqueCandidates =
    candidates.filter(
      (candidate, index, allCandidates) =>
        allCandidates.findIndex(
          (otherCandidate) =>
            otherCandidate.sourcePage ===
              candidate.sourcePage &&
            otherCandidate.dueAt ===
              candidate.dueAt &&
            otherCandidate.sourceExcerpt ===
              candidate.sourceExcerpt,
        ) === index,
    );

  return uniqueCandidates.slice(0, 20);
}

export async function extractPdf(
  file: File,
  onProgress?: (
    progress: PdfProgress,
  ) => void,
): Promise<PdfExtractionResult> {
  validatePdfFile(file);

  onProgress?.({
    currentPage: 0,
    totalPages: 0,
    message: "正在打开 PDF……",
  });

  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
  });

  const pdfDocument = await loadingTask.promise;
  const totalPages = pdfDocument.numPages;

  if (totalPages > MAX_PAGE_COUNT) {
    throw new Error(
      `PDF 共 ${totalPages} 页，第一版最多处理 ${MAX_PAGE_COUNT} 页。`,
    );
  }

  if (totalPages <= 0) {
    throw new Error("PDF 中没有可读取的页面。");
  }

  const pages: ExtractedPdfPage[] = [];

  for (
    let pageNumber = 1;
    pageNumber <= totalPages;
    pageNumber += 1
  ) {
    onProgress?.({
      currentPage: pageNumber,
      totalPages,
      message:
        `正在读取第 ${pageNumber} / ` +
        `${totalPages} 页`,
    });

    const pdfPage =
      await pdfDocument.getPage(pageNumber);

    const textContent =
      await pdfPage.getTextContent();

    const pageText = normalizePageText(
      textContent.items as TextItemLike[],
    );

    pages.push({
      pageNumber,
      text: pageText,
    });

    pdfPage.cleanup();
  }

  const extractedCharacterCount =
    pages.reduce(
      (
        total: number,
        page: ExtractedPdfPage,
      ) => total + page.text.length,
      0,
    );

  if (extractedCharacterCount < 20) {
    throw new Error(
      "没有提取到足够的文字。这可能是扫描版 PDF，第一版暂不支持 OCR。",
    );
  }

  onProgress?.({
    currentPage: totalPages,
    totalPages,
    message: "正在生成候选任务……",
  });

  const candidates = buildCandidates(
    file.name,
    pages,
  );

  return {
    pages,
    candidates,
  };
}