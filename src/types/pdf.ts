export interface ExtractedPdfPage {
  pageNumber: number;
  text: string;
}

export interface PdfCandidate {
  id: string;
  title: string;
  course: string;
  description: string;
  dueAt: string;
  sourceFileName: string;
  sourcePage: number;
  sourceExcerpt: string;
  confidence: "high" | "medium" | "low";
}