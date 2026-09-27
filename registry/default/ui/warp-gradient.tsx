"use client";

import { useEffect, useMemo, useRef, type ComponentProps, type Ref } from "react";

import { useInView } from "@/registry/default/hooks/use-in-view";
import { cn } from "@/registry/default/lib/utils";

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}

const MAX_COLORS = 5;

const VERTEX = `#version 300 es
in vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`;

// Gradient noise, layered and fed back into itself (domain warping), sets
// the flow; a simple pattern read through that flow picks the colours.
const FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 u_size;
uniform float u_dpr;
uniform float u_clock;
uniform float u_scale;
uniform float u_turn;
uniform vec4 u_palette[${MAX_COLORS}];
uniform int u_count;
uniform int u_pattern;
uniform float u_density;
uniform float u_softness;
uniform float u_warp;
uniform float u_turbulence;
out vec4 outColor;

float hash(vec2 cell) {
  return fract(sin(dot(cell, vec2(41.37, 289.13))) * 17853.217);
}

// The corner's random slope, followed from the corner to the point.
float lean(vec2 cell, vec2 offset) {
  float angle = 6.2831853 * hash(cell);
  return dot(vec2(cos(angle), sin(angle)), offset);
}

// Gradient noise with quintic fades, roughly -0.7 to 0.7.
float noise(vec2 p) {
  vec2 cell = floor(p);
  vec2 f = p - cell;
  vec2 fade = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float bottom = mix(lean(cell, f), lean(cell + vec2(1.0, 0.0), f - vec2(1.0, 0.0)), fade.x);
  float top = mix(lean(cell + vec2(0.0, 1.0), f - vec2(0.0, 1.0)), lean(cell + 1.0, f - 1.0), fade.x);
  return mix(bottom, top, fade.y);
}

// Each layer is finer, fainter and turned, so the layers never line up.
const mat2 TURN = mat2(0.8776, 0.4794, -0.4794, 0.8776);

float layered(vec2 p, int layers) {
  float sum = 0.0;
  float weight = 0.55;
  for (int i = 0; i < 5; i++) {
    if (i >= layers) break;
    sum += weight * noise(p);
    p = TURN * p * 1.97 + vec2(3.7, -1.9);
    weight *= 0.5;
  }
  return sum;
}

void main() {
  // Pattern space counts CSS pixels from the centre, so the flow keeps its
  // size on any canvas and any screen density.
  vec2 p = (gl_FragCoord.xy - 0.5 * u_size) / u_dpr * mix(0.0065, 0.0012, u_scale);
  float c = cos(u_turn);
  float s = sin(u_turn);
  p = mat2(c, s, -s, c) * p;

  float t = 0.15 * u_clock;
  int layers = 1 + int(u_turbulence * 4.0 + 0.5);
  vec2 drift = vec2(t, -0.6 * t);
  // The flow is broader than the pattern, so it bends bands instead of folding them.
  vec2 q = 0.6 * p;
  vec2 first = vec2(layered(q + drift, layers), layered(q + vec2(5.3, -2.1) - drift, layers));
  vec2 second = vec2(
    layered(q + 1.8 * first + vec2(-4.6, 7.2) + drift.yx, layers),
    layered(q + 1.8 * first + vec2(8.1, 1.4) - 0.5 * drift, layers)
  );
  vec2 w = p + 1.8 * u_warp * second;

  float field;
  if (u_pattern == 0) {
    field = 0.5 + 0.5 * sin(3.14159265 * mix(0.5, 3.5, u_density) * w.y);
  } else if (u_pattern == 1) {
    float k = mix(1.0, 5.0, u_density);
    field = 0.5 + 0.5 * sin(k * w.x) * sin(k * w.y);
  } else {
    float spread = mix(2.5, 0.1, u_density);
    field = smoothstep(-spread, spread, w.y);
  }

  vec4 a = u_palette[0];
  vec4 color = vec4(a.rgb * a.a, a.a);
  if (u_count > 1) {
    float x = clamp(field, 0.0, 1.0) * float(u_count - 1);
    int i = min(int(x), u_count - 2);
    float reach = 0.5 * u_softness + fwidth(x);
    float blend = smoothstep(0.5 - reach, 0.5 + reach, x - float(i));
    vec4 from = u_palette[i];
    vec4 to = u_palette[i + 1];
    color = mix(vec4(from.rgb * from.a, from.a), vec4(to.rgb * to.a, to.a), blend);
  }
  // Dither by a fraction of a level so slow gradients do not band.
  color.rgb += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  outColor = color;
}`;

type WarpPattern = "bands" | "cells" | "split";

interface WarpSettings {
  colors: string[];
  /** What the colours are laid on: soft bands, a grid of cells, or one divide. */
  pattern: WarpPattern;
  /** From 0 to 1: how many bands or cells fit; for "split", how sharp the divide is. */
  density: number;
  /** From 0 to 1: 0 keeps crisp borders between colours, 1 melts them together. */
  softness: number;
  /** From 0 to 1: how far the flow pushes the pattern around. */
  warp: number;
  /** From 0 to 1: fine detail in the flow. */
  turbulence: number;
  /** From 0 to 1: size of the flow; larger is broader. */
  scale: number;
  /** Turn of the whole field, in degrees. */
  rotation: number;
  /** Pace of the flow; 0 holds it still. */
  speed: number;
}

const PRESETS = {
  tide: {
    colors: ["#04090f", "#1f5f72", "#6fb3c2"],
    pattern: "bands",
    density: 0.4,
    softness: 1,
    warp: 0.8,
    turbulence: 0.2,
    scale: 0.6,
    rotation: -20,
    speed: 0.5,
  },
  brass: {
    colors: ["#0b0907", "#7a5b2a", "#d9b06a"],
    pattern: "split",
    density: 0.55,
    softness: 0.9,
    warp: 0.8,
    turbulence: 0.25,
    scale: 0.6,
    rotation: 110,
    speed: 0.5,
  },
  abyss: {
    colors: ["#020308", "#102447", "#3a6ea5", "#020308"],
    pattern: "bands",
    density: 0.3,
    softness: 1,
    warp: 0.9,
    turbulence: 0.2,
    scale: 0.5,
    rotation: 0,
    speed: 0.4,
  },
  dusk: {
    colors: ["#100a18", "#6d63c9", "#e07a5f"],
    pattern: "cells",
    density: 0.45,
    softness: 1,
    warp: 0.7,
    turbulence: 0.1,
    scale: 0.5,
    rotation: 45,
    speed: 0.5,
  },
  fog: {
    colors: ["#fafaf9", "#e7e5e4", "#a8a29e", "#fafaf9"],
    pattern: "bands",
    density: 0.35,
    softness: 1,
    warp: 0.8,
    turbulence: 0.25,
    scale: 0.55,
    rotation: 30,
    speed: 0.3,
  },
} satisfies Record<string, WarpSettings>;

/** Any CSS colour, theme variables included, as 0–1 RGBA. */
function resolveColor(color: string, probe: HTMLElement): [number, number, number, number] {
  probe.style.color = color;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const context = canvas.getContext("2d");
  if (!context) return [0, 0, 0, 1];
  context.fillStyle = getComputedStyle(probe).color;
  context.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0, a = 255] = context.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255, a / 255];
}

function compile(gl: WebGL2RenderingContext) {
  const program = gl.createProgram();
  for (const [type, source] of [
    [gl.VERTEX_SHADER, VERTEX],
    [gl.FRAGMENT_SHADER, FRAGMENT],
  ] as const) {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}

const PATTERNS: Record<WarpPattern, number> = { bands: 0, cells: 1, split: 2 };

const unit = (value: number) => Math.min(Math.max(value, 0), 1);

// Film grain from an SVG noise filter: a few hundred bytes, no image to load.
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 1 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E")`;

interface WarpGradientProps extends Omit<ComponentProps<"div">, "children">, Partial<WarpSettings> {
  /** A starting point; any setting passed alongside overrides it. */
  preset?: keyof typeof PRESETS;
  /** Film grain over the colours, from 0 to 1. */
  grain?: number;
}

/**
 * A slow, liquid field of colour: two to five colours laid over bands,
 * cells or a single divide, then carried along by layered noise. It is one
 * WebGL2 fragment shader. Put it inside a positioned element; it fills it.
 * Colours can be theme variables and follow theme switches. It pauses off
 * screen and in background tabs, draws one still frame with
 * `prefers-reduced-motion`, and falls back to a CSS gradient of the same
 * colours where WebGL2 is unavailable.
 *
 * @example
 * <section className="relative isolate overflow-hidden rounded-2xl p-12">
 *   <WarpGradient preset="tide" grain={0.25} />
 *   <h2 className="relative text-white">Into the blue</h2>
 * </section>
 */
function WarpGradient({
  preset = "tide",
  grain = 0,
  colors,
  pattern,
  density,
  softness,
  warp,
  turbulence,
  scale,
  rotation,
  speed,
  className,
  style,
  ref,
  ...props
}: WarpGradientProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const fallback = useRef<HTMLDivElement>(null);
  const [observe, inView] = useInView<HTMLDivElement>({ rootMargin: "100px" });
  const mergedRef = useMemo(() => mergeRefs(ref, observe), [ref, observe]);

  const base: WarpSettings = PRESETS[preset] ?? PRESETS.tide;
  const palette = (colors?.length ? colors : base.colors).slice(0, MAX_COLORS);
  const paletteKey = palette.join("|");
  const settings = useRef<WarpSettings>(base);
  const visible = useRef(false);
  const wake = useRef<() => void>(() => {});
  const recolor = useRef<() => void>(() => {});

  useEffect(() => {
    const element = canvas.current;
    const gl = element?.getContext("webgl2", { alpha: true, premultipliedAlpha: true });
    if (!element || !gl) return;
    const program = compile(gl);
    if (!program) return;
    const flat = fallback.current;
    if (flat) flat.hidden = true;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    // One triangle that covers the whole canvas.
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.useProgram(program);
    const names = [
      "u_size",
      "u_dpr",
      "u_clock",
      "u_scale",
      "u_turn",
      "u_palette",
      "u_count",
      "u_pattern",
      "u_density",
      "u_softness",
      "u_warp",
      "u_turbulence",
    ] as const;
    const u = Object.fromEntries(
      names.map((name) => [name, gl.getUniformLocation(program, name)])
    ) as Record<(typeof names)[number], WebGLUniformLocation | null>;

    const probe = document.createElement("span");
    probe.style.display = "none";
    element.after(probe);
    recolor.current = () => {
      const current = settings.current.colors;
      const values = new Float32Array(MAX_COLORS * 4);
      current.forEach((color, index) => values.set(resolveColor(color, probe), index * 4));
      gl.uniform4fv(u.u_palette, values);
      gl.uniform1i(u.u_count, Math.max(current.length, 1));
    };

    let clock = 0;
    let ratio = 1;
    const draw = () => {
      const s = settings.current;
      gl.uniform2f(u.u_size, element.width, element.height);
      gl.uniform1f(u.u_dpr, ratio);
      gl.uniform1f(u.u_clock, clock);
      gl.uniform1f(u.u_scale, unit(s.scale));
      gl.uniform1f(u.u_turn, (s.rotation * Math.PI) / 180);
      gl.uniform1i(u.u_pattern, PATTERNS[s.pattern] ?? 0);
      gl.uniform1f(u.u_density, unit(s.density));
      gl.uniform1f(u.u_softness, unit(s.softness));
      gl.uniform1f(u.u_warp, unit(s.warp));
      gl.uniform1f(u.u_turbulence, unit(s.turbulence));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const resize = () => {
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      element.width = Math.max(1, Math.round(element.clientWidth * ratio));
      element.height = Math.max(1, Math.round(element.clientHeight * ratio));
      gl.viewport(0, 0, element.width, element.height);
      draw();
    };

    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let last = 0;
    const loop = (now: number) => {
      frame = 0;
      const moving = visible.current && !still?.matches && settings.current.speed !== 0;
      if (moving && last) clock += ((now - last) / 1000) * settings.current.speed;
      last = moving ? now : 0;
      draw();
      if (moving) frame = requestAnimationFrame(loop);
    };
    wake.current = () => {
      if (!frame) frame = requestAnimationFrame(loop);
    };

    recolor.current();
    resize();
    const resizer = new ResizeObserver(resize);
    resizer.observe(element);
    const theme = new MutationObserver(() => {
      recolor.current();
      draw();
    });
    theme.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });
    wake.current();

    return () => {
      cancelAnimationFrame(frame);
      wake.current = () => {};
      recolor.current = () => {};
      resizer.disconnect();
      theme.disconnect();
      probe.remove();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      if (flat) flat.hidden = false;
    };
  }, []);

  // Hand the latest settings to the loop and wake it for a fresh frame.
  useEffect(() => {
    settings.current = {
      colors: paletteKey.split("|"),
      pattern: pattern ?? base.pattern,
      density: density ?? base.density,
      softness: softness ?? base.softness,
      warp: warp ?? base.warp,
      turbulence: turbulence ?? base.turbulence,
      scale: scale ?? base.scale,
      rotation: rotation ?? base.rotation,
      speed: speed ?? base.speed,
    };
    recolor.current();
    visible.current = inView;
    wake.current();
  }, [
    base,
    paletteKey,
    pattern,
    density,
    softness,
    warp,
    turbulence,
    scale,
    rotation,
    speed,
    inView,
  ]);

  return (
    <div
      ref={mergedRef}
      aria-hidden="true"
      data-slot="warp-gradient"
      className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}
      style={style}
      {...props}
    >
      {/* Stands in for the shader where WebGL2 is unavailable. */}
      <div
        ref={fallback}
        data-slot="warp-gradient-fallback"
        className="absolute inset-0"
        style={{
          background: `linear-gradient(${(rotation ?? base.rotation) + 90}deg, ${palette.join(", ")})`,
        }}
      />
      <canvas ref={canvas} className="block size-full" />
      {grain > 0 ? (
        <div
          data-slot="warp-gradient-grain"
          className="absolute inset-0 mix-blend-overlay"
          style={{ backgroundImage: GRAIN, opacity: Math.min(grain, 1) }}
        />
      ) : null}
    </div>
  );
}

export { WarpGradient, type WarpGradientProps };
