import ts from "typescript";

import { checkClassToken, type RuleId } from "./rules.ts";

export interface SourceFinding {
  file: string;
  line: number;
  column: number;
  rule: RuleId;
  token: string;
  message: string;
}

export const IGNORE_NEXT_LINE = "tailwind-compat-ignore-next-line";
export const IGNORE_FILE = "tailwind-compat-ignore-file";

interface StringChunk {
  text: string;
  /** Offset of the first character of `text` inside the source file. */
  offset: number;
}

/**
 * Every string a class name could live in: plain literals, template chunks,
 * `cn(...)`/`cva(...)` arguments and JSX attributes. Module specifiers and
 * directives are skipped because they are never classes.
 */
function collectStrings(sourceFile: ts.SourceFile): StringChunk[] {
  const chunks: StringChunk[] = [];

  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
    if (ts.isExpressionStatement(node) && ts.isStringLiteral(node.expression)) return;

    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      // +1 skips the opening quote or backtick (or `}` for template middles and tails).
      chunks.push({ text: node.text, offset: node.getStart(sourceFile) + 1 });
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return chunks;
}

function ignoredLines(source: string) {
  const ignored = new Set<number>();
  source.split("\n").forEach((line, index) => {
    // Lines are 1-based in reports; the directive covers the line after it.
    if (line.includes(IGNORE_NEXT_LINE)) ignored.add(index + 2);
  });
  return ignored;
}

export function scanSource(source: string, file: string): SourceFinding[] {
  if (source.includes(IGNORE_FILE)) return [];

  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const ignored = ignoredLines(source);
  const findings: SourceFinding[] = [];

  for (const chunk of collectStrings(sourceFile)) {
    for (const match of chunk.text.matchAll(/\S+/g)) {
      const position = sourceFile.getLineAndCharacterOfPosition(chunk.offset + match.index);
      const line = position.line + 1;
      if (ignored.has(line)) continue;

      for (const finding of checkClassToken(match[0])) {
        findings.push({ file, line, column: position.character + 1, ...finding });
      }
    }
  }

  return findings;
}
