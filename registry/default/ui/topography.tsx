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

const VERTEX = `#version 300 es
in vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`;

// A height field from layered gradient noise, cut into evenly spaced
// levels. Each level is drawn where the field crosses it; fwidth turns the
// distance to the level into pixels, so lines keep one width everywhere.
const FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 u_size;
uniform float u_dpr;
uniform float u_clock;
uniform float u_scale;
uniform float u_density;
uniform float u_thickness;
uniform float u_index;
uniform float u_opacity;
uniform vec4 u_color;
uniform vec2 u_pointer;
uniform float u_pull;
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

float layered(vec2 p) {
  float sum = 0.0;
  float weight = 0.5;
  for (int i = 0; i < 4; i++) {
    sum += weight * noise(p);
    p = TURN * p * 2.03 + vec2(1.7, -3.1);
    weight *= 0.5;
  }
  return sum;
}

void main() {
  // Pattern space counts CSS pixels from the centre, so the terrain keeps
  // its size on any canvas and any screen density.
  vec2 css = (gl_FragCoord.xy - 0.5 * u_size) / u_dpr;
  vec2 p = css * mix(0.006, 0.0012, u_scale);
  float t = 0.05 * u_clock;
  // Two layers drifting apart make the hills change shape, not just slide.
  float height = layered(p + vec2(t, -0.7 * t)) + 0.5 * layered(1.7 * p - vec2(0.4 * t, 0.9 * t) + 11.0);
  // A soft hill under the pointer.
  vec2 toPointer = (gl_FragCoord.xy - u_pointer) / u_dpr;
  height += u_pull * 0.3 * exp(-dot(toPointer, toPointer) / 32400.0);

  float level = height * mix(6.0, 40.0, u_density);
  float f = fract(level);
  float away = min(f, 1.0 - f) / max(fwidth(level), 1e-4);
  float nearest = floor(level + 0.5);
  bool major = u_index > 0.5 && mod(nearest + 0.5, u_index) < 1.0;
  float radius = 0.5 * u_thickness * u_dpr * (major ? 1.8 : 1.0);
  float line = 1.0 - smoothstep(radius - 0.5, radius + 0.5, away);
  float strength = major || u_index < 0.5 ? 1.0 : 0.6;
  float alpha = line * strength * u_opacity * u_color.a;
  outColor = vec4(u_color.rgb * alpha, alpha);
}`;

interface TopographySettings {
  color: string;
  density: number;
  thickness: number;
  indexEvery: number;
  speed: number;
  scale: number;
  opacity: number;
  pointer: boolean;
}

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

const unit = (value: number) => Math.min(Math.max(value, 0), 1);

interface TopographyProps
  extends Omit<ComponentProps<"div">, "children" | "color">, Partial<TopographySettings> {}

/**
 * Contour lines like a topographic map, slowly shifting as the terrain
 * under them changes shape. It is one WebGL2 fragment shader; every
 * `indexEvery`-th line is drawn stronger, like the index lines on a survey
 * map. Put it inside a positioned element; it fills it. The colour can be a
 * theme variable and follows theme switches. With `pointer`, the terrain
 * rises gently under a mouse or pen. It is decorative and hidden from
 * screen readers, pauses off screen and in background tabs, draws one still
 * frame with `prefers-reduced-motion`, and falls back to CSS rings of the
 * same colour where WebGL2 is unavailable.
 *
 * @example
 * <section className="relative isolate overflow-hidden rounded-2xl p-12">
 *   <Topography color="var(--primary)" density={0.6} pointer />
 *   <h2 className="relative">Uncharted waters</h2>
 * </section>
 */
function Topography({
  color = "var(--muted-foreground)",
  density = 0.5,
  thickness = 1,
  indexEvery = 5,
  speed = 0.3,
  scale = 0.5,
  opacity = 0.6,
  pointer = false,
  className,
  style,
  ref,
  ...props
}: TopographyProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const fallback = useRef<HTMLDivElement>(null);
  const [observe, inView] = useInView<HTMLDivElement>({ rootMargin: "100px" });
  const mergedRef = useMemo(() => mergeRefs(ref, observe), [ref, observe]);
  const settings = useRef<TopographySettings>({
    color,
    density,
    thickness,
    indexEvery,
    speed,
    scale,
    opacity,
    pointer,
  });
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
      "u_density",
      "u_thickness",
      "u_index",
      "u_opacity",
      "u_color",
      "u_pointer",
      "u_pull",
    ] as const;
    const u = Object.fromEntries(
      names.map((name) => [name, gl.getUniformLocation(program, name)])
    ) as Record<(typeof names)[number], WebGLUniformLocation | null>;

    const probe = document.createElement("span");
    probe.style.display = "none";
    element.after(probe);
    recolor.current = () => {
      gl.uniform4fv(u.u_color, resolveColor(settings.current.color, probe));
    };

    let clock = 0;
    let ratio = 1;
    // The pointer, in canvas pixels from the bottom left, and how far the hill has risen.
    const hill = { x: 0, y: 0, pull: 0, target: 0 };

    const draw = () => {
      const s = settings.current;
      gl.uniform2f(u.u_size, element.width, element.height);
      gl.uniform1f(u.u_dpr, ratio);
      gl.uniform1f(u.u_clock, clock);
      gl.uniform1f(u.u_scale, unit(s.scale));
      gl.uniform1f(u.u_density, unit(s.density));
      gl.uniform1f(u.u_thickness, Math.max(s.thickness, 0));
      gl.uniform1f(u.u_index, Math.max(Math.round(s.indexEvery), 0));
      gl.uniform1f(u.u_opacity, unit(s.opacity));
      gl.uniform2f(u.u_pointer, hill.x, hill.y);
      gl.uniform1f(u.u_pull, hill.pull);
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
    const fine = window.matchMedia?.("(pointer: fine)");
    let frame = 0;
    let last = 0;
    const loop = (now: number) => {
      frame = 0;
      const live = visible.current && !still?.matches;
      const moving = live && settings.current.speed !== 0;
      const rising = live && Math.abs(hill.target - hill.pull) > 0.001;
      const elapsed = last ? now - last : 0;
      if (moving) clock += (elapsed / 1000) * settings.current.speed;
      if (rising) hill.pull += (hill.target - hill.pull) * (1 - Math.exp(-elapsed / 250));
      last = moving || rising ? now : 0;
      draw();
      if (moving || rising) frame = requestAnimationFrame(loop);
    };
    wake.current = () => {
      if (!frame) frame = requestAnimationFrame(loop);
    };

    // The canvas lets pointer events through, so listen on its parent.
    const host = element.parentElement?.parentElement;
    const follow = (event: PointerEvent) => {
      if (!settings.current.pointer || event.pointerType === "touch" || !fine?.matches) return;
      if (still?.matches) return;
      const bounds = element.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      const inside = x >= 0 && y >= 0 && x <= bounds.width && y <= bounds.height;
      hill.x = x * ratio;
      hill.y = (bounds.height - y) * ratio;
      hill.target = inside ? 1 : 0;
      wake.current();
    };
    const release = () => {
      hill.target = 0;
      wake.current();
    };
    host?.addEventListener("pointermove", follow, { passive: true });
    host?.addEventListener("pointerleave", release);

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
      host?.removeEventListener("pointermove", follow);
      host?.removeEventListener("pointerleave", release);
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
    settings.current = { color, density, thickness, indexEvery, speed, scale, opacity, pointer };
    recolor.current();
    visible.current = inView;
    wake.current();
  }, [color, density, thickness, indexEvery, speed, scale, opacity, pointer, inView]);

  // Rings of the line colour, about as far apart as the shader's lines.
  const gap = Math.round(40 - 30 * unit(density));
  const width = Math.min(Math.max(thickness, 0.5), gap / 2);

  return (
    <div
      ref={mergedRef}
      aria-hidden="true"
      data-slot="topography"
      className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}
      style={style}
      {...props}
    >
      {/* Stands in for the shader where WebGL2 is unavailable. */}
      <div
        ref={fallback}
        data-slot="topography-fallback"
        className="absolute inset-0"
        style={{
          backgroundImage: `repeating-radial-gradient(circle at 30% 40%, transparent 0, transparent ${gap - width}px, ${color} ${gap - width}px, ${color} ${gap}px)`,
          opacity: unit(opacity),
        }}
      />
      <canvas ref={canvas} className="block size-full" />
    </div>
  );
}

export { Topography, type TopographyProps };
