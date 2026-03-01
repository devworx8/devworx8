import * as FileSystem from 'expo-file-system/legacy';
import { PDFDocument } from 'pdf-lib';

export type PdfStudyMaterialFile = {
  uri: string;
  name: string;
  sizeBytes: number;
};

export type PdfSplitPart = {
  uri: string;
  name: string;
  mimeType: 'application/pdf';
  size: number;
};

function toSafeBaseName(name: string): string {
  const trimmed = name.replace(/\.pdf$/i, '').trim();
  const normalized = trimmed.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return normalized.length > 0 ? normalized : `material-${Date.now()}`;
}

function estimateBinarySizeFromBase64(base64: string): number {
  const clean = base64.replace(/\s+/g, '');
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
}

function buildOutputPath(baseName: string, partIndex: number): string {
  const outputDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  if (!outputDir) throw new Error('Could not access local storage for PDF split files.');
  return `${outputDir}${baseName}-part-${String(partIndex).padStart(2, '0')}.pdf`;
}

export async function splitPdfToMaxSizeParts(
  file: PdfStudyMaterialFile,
  maxBytesPerPart: number,
): Promise<PdfSplitPart[]> {
  if (!Number.isFinite(maxBytesPerPart) || maxBytesPerPart <= 0) {
    throw new Error('Invalid maximum PDF size configuration.');
  }

  const sourceBase64 = await FileSystem.readAsStringAsync(file.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const source = await PDFDocument.load(sourceBase64);
  const totalPages = source.getPageCount();
  if (totalPages <= 0) throw new Error('The selected PDF does not contain readable pages.');

  const avgPageBytes = Math.max(1, Math.floor(file.sizeBytes / totalPages));
  const initialPagesPerPart = Math.max(1, Math.floor(maxBytesPerPart / avgPageBytes));
  const baseName = toSafeBaseName(file.name);
  const parts: PdfSplitPart[] = [];

  let pageStart = 0;
  let partIndex = 1;

  while (pageStart < totalPages) {
    let pageEnd = Math.min(totalPages - 1, pageStart + initialPagesPerPart - 1);
    let candidate: { end: number; base64: string; sizeBytes: number } | null = null;

    while (pageEnd >= pageStart) {
      const chunkDoc = await PDFDocument.create();
      const pageIndexes = Array.from({ length: pageEnd - pageStart + 1 }, (_, idx) => pageStart + idx);
      const copiedPages = await chunkDoc.copyPages(source, pageIndexes);
      copiedPages.forEach((page) => chunkDoc.addPage(page));

      const chunkBase64 = await chunkDoc.saveAsBase64({ dataUri: false });
      const chunkBytes = estimateBinarySizeFromBase64(chunkBase64);
      candidate = { end: pageEnd, base64: chunkBase64, sizeBytes: chunkBytes };

      if (chunkBytes <= maxBytesPerPart) {
        break;
      }
      pageEnd -= 1;
    }

    if (!candidate) {
      throw new Error('Could not split PDF into smaller parts.');
    }

    if (candidate.sizeBytes > maxBytesPerPart && candidate.end === pageStart) {
      const pageNumber = pageStart + 1;
      throw new Error(
        `Page ${pageNumber} is still too large after splitting. Please compress the PDF and retry.`,
      );
    }

    if (candidate.sizeBytes > maxBytesPerPart) {
      throw new Error('Could not create a PDF part within the upload limit.');
    }

    const outputPath = buildOutputPath(baseName, partIndex);
    await FileSystem.writeAsStringAsync(outputPath, candidate.base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    parts.push({
      uri: outputPath,
      name: `${baseName}-part-${String(partIndex).padStart(2, '0')}.pdf`,
      mimeType: 'application/pdf',
      size: candidate.sizeBytes,
    });

    partIndex += 1;
    pageStart = candidate.end + 1;
  }

  return parts;
}

export async function splitPdfIntoSinglePages(file: PdfStudyMaterialFile): Promise<PdfSplitPart[]> {
  const sourceBase64 = await FileSystem.readAsStringAsync(file.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const source = await PDFDocument.load(sourceBase64);
  const totalPages = source.getPageCount();
  if (totalPages <= 0) throw new Error('The selected PDF does not contain readable pages.');

  const baseName = toSafeBaseName(file.name);
  const parts: PdfSplitPart[] = [];

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
    const pageDoc = await PDFDocument.create();
    const [copiedPage] = await pageDoc.copyPages(source, [pageIndex]);
    pageDoc.addPage(copiedPage);

    const pageBase64 = await pageDoc.saveAsBase64({ dataUri: false });
    const pageBytes = estimateBinarySizeFromBase64(pageBase64);
    const outputPath = buildOutputPath(baseName, pageIndex + 1);
    await FileSystem.writeAsStringAsync(outputPath, pageBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    parts.push({
      uri: outputPath,
      name: `${baseName}-page-${String(pageIndex + 1).padStart(2, '0')}.pdf`,
      mimeType: 'application/pdf',
      size: pageBytes,
    });
  }

  return parts;
}
