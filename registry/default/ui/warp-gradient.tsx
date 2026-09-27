"use client";

import { useEffect, useMemo, useRef, type ComponentProps, type Ref } from "react";

import { useInView } from "@/registry/default/hooks/use-in-view";
import { cn } from "@/registry/default/lib/utils";

/*
 * The shader is adapted from the Warp shader of Paper Shaders
 * (https://github.com/paper-design/shaders, Apache License 2.0, "Powered by
 * Paper Shaders: https://shaders.paper.design"), partly by way of Spell UI's
 * animated gradient (MIT). Changes: a standalone WebGL2 program, hashed
 * noise instead of a noise texture, a fixed pattern space in CSS pixels,
 * two to five colours and Corsair's own presets.
 */

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

const FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform float u_time;
uniform float u_scale;
uniform float u_rotation;
uniform vec4 u_colors[${MAX_COLORS}];
uniform float u_colorsCount;
uniform float u_proportion;
uniform float u_softness;
uniform float u_shape;
uniform float u_shapeScale;
uniform float u_distortion;
uniform float u_swirl;
uniform float u_swirlIterations;
out vec4 fragColor;

#define TWO_PI 6.28318530718

vec2 rotate(vec2 uv, float th) {
  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}
float random(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}
float valueNoise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

void main() {
  float zoom = 0.0005 + 0.006 * u_scale;
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_pixelRatio * zoom;
  uv = rotate(uv, u_rotation) + 0.5;
  float t = 0.5 * u_time;

  float n1 = valueNoise(uv + t);
  float n2 = valueNoise(uv * 2.0 - t);
  float angle = n1 * TWO_PI;
  uv += 4.0 * u_distortion * n2 * vec2(cos(angle), sin(angle));

  for (int i = 1; i <= 20; i++) {
    if (i >= int(u_swirlIterations)) break;
    float k = float(i);
    uv.x += u_swirl / k * cos(t + k * 1.5 * uv.y);
    uv.y += u_swirl / k * cos(t + k * uv.x);
  }

  float proportion = clamp(u_proportion, 0.0, 1.0);
  float lean = 0.48 * sign(proportion - 0.5) * pow(abs(proportion - 0.5), 0.5);
  float shape;
  if (u_shape < 0.5) {
    vec2 checks = uv * (0.5 + 3.5 * u_shapeScale);
    shape = 0.5 + 0.5 * sin(checks.x) * cos(checks.y) + lean;
  } else if (u_shape < 1.5) {
    float f = fract(uv.y * (0.25 + 3.0 * u_shapeScale));
    shape = smoothstep(0.0, 0.55, f) * (1.0 - smoothstep(0.45, 1.0, f)) + lean;
  } else {
    // One split through the middle, wide enough that the swirls bend it
    // rather than break it into blocks; a smaller shapeScale softens it.
    float width = 5.0 * (1.0 - clamp(u_shapeScale, 0.0, 1.0));
    shape = smoothstep(0.45 - width, 0.55 + width, 1.0 - uv.y + 0.3 * (proportion - 0.5));
  }

  float mixer = clamp(shape, 0.0, 1.0) * (u_colorsCount - 1.0);
  vec4 gradient = u_colors[0];
  gradient.rgb *= gradient.a;
  float aa = fwidth(shape);
  for (int i = 1; i < ${MAX_COLORS}; i++) {
    if (i >= int(u_colorsCount)) break;
    float m = clamp(mixer - float(i - 1), 0.0, 1.0);
    float start = floor(m);
    float soft = 0.5 * u_softness + fwidth(m);
    float smoothed = smoothstep(max(0.0, 0.5 - soft - aa), min(1.0, 0.5 + soft + aa), m - start);
    m = mix(start + smoothed, m, u_softness);
    vec4 c = u_colors[i];
    c.rgb *= c.a;
    gradient = mix(gradient, c, m);
  }
  vec3 color = gradient.rgb;
  // A whisper of noise hides banding in slow gradients.
  color += 1.0 / 256.0 * (fract(sin(dot(0.014 * gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453123) - 0.5);
  fragColor = vec4(color, gradient.a);
}`;

type WarpShape = "checks" | "stripes" | "edge";

interface WarpSettings {
  colors: string[];
  shape: WarpShape;
  /** Balance between the colours, from 0 to 1; 0.5 gives each the same room. */
  proportion: number;
  /** 0 draws hard edges between colours, 1 blends them smoothly. */
  softness: number;
  /** Size of the base pattern, from 0 to 1; for "edge", how sharp the split is. */
  shapeScale: number;
  /** Noise that bends the pattern, from 0 to 1. */
  distortion: number;
  /** Strength of the swirls, from 0 to 1. */
  swirl: number;
  /** Swirl passes, from 1 to 20; more is busier. */
  swirlIterations: number;
  /** Zoom of the whole field, from 0 to 1. */
  scale: number;
  /** Turn of the whole field, in degrees. */
  rotation: number;
  /** Pace of the flow; 0 holds it still. */
  speed: number;
}

const PRESETS = {
  tide: {
    colors: ["#04090f", "#1f5f72", "#6fb3c2"],
    shape: "checks",
    proportion: 0.45,
    softness: 1,
    shapeScale: 0.35,
    distortion: 0.12,
    swirl: 0.7,
    swirlIterations: 8,
    scale: 0.45,
    rotation: -20,
    speed: 0.5,
  },
  brass: {
    colors: ["#0b0907", "#7a5b2a", "#d9b06a"],
    shape: "edge",
    proportion: 0.5,
    softness: 0.9,
    shapeScale: 0.75,
    distortion: 0.2,
    swirl: 0.35,
    swirlIterations: 12,
    scale: 0.5,
    rotation: 110,
    speed: 0.5,
  },
  abyss: {
    colors: ["#020308", "#102447", "#3a6ea5", "#020308"],
    shape: "stripes",
    proportion: 0.5,
    softness: 1,
    shapeScale: 0.25,
    distortion: 0.1,
    swirl: 0.9,
    swirlIterations: 4,
    scale: 0.4,
    rotation: 0,
    speed: 0.4,
  },
  dusk: {
    colors: ["#100a18", "#6d63c9", "#e07a5f"],
    shape: "checks",
    proportion: 0.6,
    softness: 1,
    shapeScale: 0.5,
    distortion: 0.08,
    swirl: 0.6,
    swirlIterations: 6,
    scale: 0.6,
    rotation: 45,
    speed: 0.5,
  },
  fog: {
    colors: ["#fafaf9", "#e7e5e4", "#a8a29e", "#fafaf9"],
    shape: "stripes",
    proportion: 0.45,
    softness: 1,
    shapeScale: 0.25,
    distortion: 0.15,
    swirl: 0.5,
    swirlIterations: 8,
    scale: 0.4,
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

const SHAPES: Record<WarpShape, number> = { checks: 0, stripes: 1, edge: 2 };

// Film grain from an SVG noise filter: a few hundred bytes, no image to load.
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 1 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E")`;

interface WarpGradientProps extends Omit<ComponentProps<"div">, "children">, Partial<WarpSettings> {
  /** A starting point; any setting passed alongside overrides it. */
  preset?: keyof typeof PRESETS;
  /** Film grain over the colours, from 0 to 1. */
  grain?: number;
}

/**
 * A slow, liquid field of colour: two to five colours laid over checks,
 * stripes or a split edge, then warped by noise and swirls. It is one
 * WebGL2 fragment shader, adapted from Paper Shaders' Warp. Put it inside a
 * positioned element; it fills it. Colours can be theme variables and
 * follow theme switches. It pauses off screen and in background tabs,
 * draws one still frame with `prefers-reduced-motion`, and falls back to a
 * CSS gradient of the same colours where WebGL2 is unavailable.
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
  shape,
  proportion,
  softness,
  shapeScale,
  distortion,
  swirl,
  swirlIterations,
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
    const at = (name: string) => gl.getUniformLocation(program, name);
    const names = [
      "u_resolution",
      "u_pixelRatio",
      "u_time",
      "u_scale",
      "u_rotation",
      "u_colors",
      "u_colorsCount",
      "u_proportion",
      "u_softness",
      "u_shape",
      "u_shapeScale",
      "u_distortion",
      "u_swirl",
      "u_swirlIterations",
    ] as const;
    const u = Object.fromEntries(names.map((name) => [name, at(name)])) as Record<
      (typeof names)[number],
      WebGLUniformLocation | null
    >;

    const probe = document.createElement("span");
    probe.style.display = "none";
    element.after(probe);
    recolor.current = () => {
      const current = settings.current.colors;
      const values = new Float32Array(MAX_COLORS * 4);
      current.forEach((color, index) => values.set(resolveColor(color, probe), index * 4));
      gl.uniform4fv(u.u_colors, values);
      gl.uniform1f(u.u_colorsCount, Math.max(current.length, 1));
    };

    let time = 0;
    let ratio = 1;
    const draw = () => {
      const s = settings.current;
      gl.uniform2f(u.u_resolution, element.width, element.height);
      gl.uniform1f(u.u_pixelRatio, ratio);
      gl.uniform1f(u.u_time, time);
      gl.uniform1f(u.u_scale, s.scale);
      gl.uniform1f(u.u_rotation, (s.rotation * Math.PI) / 180);
      gl.uniform1f(u.u_proportion, s.proportion);
      gl.uniform1f(u.u_softness, s.softness);
      gl.uniform1f(u.u_shape, SHAPES[s.shape]);
      gl.uniform1f(u.u_shapeScale, s.shapeScale);
      gl.uniform1f(u.u_distortion, s.distortion);
      gl.uniform1f(u.u_swirl, s.swirl);
      gl.uniform1f(u.u_swirlIterations, s.swirl === 0 ? 0 : s.swirlIterations);
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
      if (moving && last) time += ((now - last) / 1000) * settings.current.speed;
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
      shape: shape ?? base.shape,
      proportion: proportion ?? base.proportion,
      softness: softness ?? base.softness,
      shapeScale: shapeScale ?? base.shapeScale,
      distortion: distortion ?? base.distortion,
      swirl: swirl ?? base.swirl,
      swirlIterations: Math.min(
        Math.max(Math.round(swirlIterations ?? base.swirlIterations), 1),
        20
      ),
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
    shape,
    proportion,
    softness,
    shapeScale,
    distortion,
    swirl,
    swirlIterations,
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
