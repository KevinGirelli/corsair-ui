"use client";

import type { Font } from "opentype.js";
import { useEffect, useState } from "react";

import { Signature, type SignatureProps } from "@/registry/default/ui/signature";

// One download and parse per font, however many signatures use it.
const fonts = new Map<string, Promise<Font>>();

function loadFont(url: string) {
  let font = fonts.get(url);
  if (!font) {
    font = (async () => {
      const [{ parse }, response] = await Promise.all([import("opentype.js"), fetch(url)]);
      if (!response.ok) throw new Error(`Could not load the font at ${url} (${response.status}).`);
      return parse(await response.arrayBuffer());
    })();
    // A failed download can be retried by the next signature that asks.
    font.catch(() => fonts.delete(url));
    fonts.set(url, font);
  }
  return font;
}

/** One outline per glyph, in writing order, and a viewBox that fits them all. */
function lettering(font: Font, text: string, fontSize: number) {
  const baseline = font.ascender * (fontSize / font.unitsPerEm);
  const glyphs = font.getPaths(text, 0, baseline, fontSize, { kerning: true });
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const paths: string[] = [];
  for (const glyph of glyphs) {
    const d = glyph.toPathData(2);
    if (!d) continue;
    const box = glyph.getBoundingBox();
    minX = Math.min(minX, box.x1);
    minY = Math.min(minY, box.y1);
    maxX = Math.max(maxX, box.x2);
    maxY = Math.max(maxY, box.y2);
    paths.push(d);
  }
  if (paths.length === 0) return null;
  // A margin keeps the pen's round caps and the ink inside the box.
  const margin = fontSize * 0.08;
  const viewBox = [minX - margin, minY - margin, maxX - minX + margin * 2, maxY - minY + margin * 2]
    .map((value) => Math.round(value * 100) / 100)
    .join(" ");
  return { paths, viewBox };
}

interface TextSignatureProps extends Omit<SignatureProps, "paths" | "viewBox"> {
  /** What to write. */
  text: string;
  /**
   * URL of a TTF, OTF or WOFF font (not WOFF2, which opentype.js cannot
   * read). Script and handwriting fonts look the part. It is fetched in the
   * browser, so it has to be served from your site or allow CORS.
   */
  font: string;
  /** Size of the lettering in viewBox units; the SVG itself scales with CSS. */
  fontSize?: number;
}

/**
 * Writes any text in any font as a signature: the glyph outlines are drawn
 * by the pen and filled with ink behind it. The font is parsed in the
 * browser with opentype.js, loaded on demand so it only costs the pages that
 * use it. The SVG is named by the text for screen readers, and until the
 * font arrives it keeps its size and shows nothing.
 *
 * @example
 * <TextSignature text="Anne Bonny" font="/fonts/handwriting.ttf" className="h-16 w-auto" />
 */
function TextSignature({
  text,
  font,
  fontSize = 72,
  ink = true,
  strokeWidth = 1,
  inkWidth,
  "aria-label": label,
  ...props
}: TextSignatureProps) {
  const [lettered, setLettered] = useState<{
    key: string;
    paths: string[];
    viewBox: string;
  } | null>(null);
  const key = `${font}\u0000${fontSize}\u0000${text}`;

  useEffect(() => {
    let cancelled = false;
    loadFont(font)
      .then((parsed) => {
        const result = lettering(parsed, text, fontSize);
        if (!cancelled) setLettered(result ? { key, ...result } : null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLettered(null);
        console.error(error);
      });
    return () => {
      cancelled = true;
    };
  }, [font, fontSize, text, key]);

  const ready = lettered?.key === key ? lettered : null;

  return (
    <Signature
      // A new outline set is a new drawing: remount so the pen starts over.
      key={ready?.key ?? "blank"}
      paths={ready?.paths ?? []}
      viewBox={ready?.viewBox ?? `0 0 ${fontSize * Math.max(text.length, 1) * 0.5} ${fontSize}`}
      ink={ink}
      inkWidth={inkWidth ?? fontSize * 0.18}
      strokeWidth={strokeWidth}
      aria-label={label ?? text}
      {...props}
    />
  );
}

export { TextSignature, type TextSignatureProps };
