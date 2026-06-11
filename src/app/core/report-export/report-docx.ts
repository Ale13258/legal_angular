import {
  Document,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

const HEADER_FILL = '6B3CC8';
const HEADER_TEXT = 'FFFFFF';

export function buildHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, bold: true, size: 32 })],
  });
}

export function buildSubheading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, size: 22 })],
  });
}

export function buildParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text, size: 20 })],
  });
}

export function buildKeyValueLines(pairs: [string, string][]): Paragraph[] {
  return pairs.map(
    ([label, value]) =>
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({ text: `${label}: `, bold: label === 'Deuda a la fecha', size: 20 }),
          new TextRun({ text: value, bold: label === 'Deuda a la fecha', size: 20 }),
        ],
      })
  );
}

export function buildTable(headers: string[], rows: string[][]): Table {
  const headerRow = new TableRow({
    children: headers.map(
      (header) =>
        new TableCell({
          shading: { type: ShadingType.CLEAR, fill: HEADER_FILL, color: 'auto' },
          children: [
            new Paragraph({
              children: [new TextRun({ text: header, bold: true, color: HEADER_TEXT, size: 18 })],
            }),
          ],
        })
    ),
  });

  const bodyRows = rows.map(
    (row) =>
      new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: cell, size: 16 })],
                }),
              ],
            })
        ),
      })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...bodyRows],
  });
}

export function buildSpacer(): Paragraph {
  return new Paragraph({ spacing: { after: 120 }, children: [] });
}

export async function saveDocx(
  filename: string,
  children: (Paragraph | Table)[]
): Promise<void> {
  const doc = new Document({
    sections: [{ children }],
  });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.endsWith('.docx') ? filename : `${filename}.docx`;
  anchor.click();
  URL.revokeObjectURL(url);
}
