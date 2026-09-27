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

// Beams fanning down from a point above the top edge. Their pattern is
// smooth 1D noise over the angle, in two layers drifting against each other,
// with a haze around the source and a fade with distance.
const FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_origin;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform float u_intensity;
uniform float u_density;
uniform float u_reach;
uniform float u_spread;
out vec4 fragColor;

float hash(float n) { return fract(sin(n * 127.1) * 43758.5453123); }
float noise(float x) {
  float i = floor(x);
  float f = fract(x);
  return mix(hash(i), hash(i + 1.0), f * f * (3.0 - 2.0 * f));
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y);
  vec2 d = p - u_origin;
  float dist = length(d);
  float across = atan(d.x, d.y) / u_spread;
  float beams = 0.65 * noise(across * u_density + u_time * 0.35)
    + 0.35 * noise(across * u_density * 2.3 - u_time * 0.5 + 17.0);
  beams = smoothstep(0.2, 1.0, beams);
  float diagonal = length(u_resolution);
  float fade = 1.0 - smoothstep(0.0, max(u_reach, 0.05) * diagonal, dist);
  fade *= fade;
  float fan = 1.0 - smoothstep(0.7, 1.0, abs(across));
  float haze = 0.3 * exp(-dist / (0.2 * diagonal));
  float strength = clamp((beams * fan + haze) * fade * u_intensity, 0.0, 1.0);
  vec3 color = mix(u_color1, u_color2, clamp(across * 0.5 + 0.5, 0.0, 1.0));
  fragColor = vec4(color * strength, strength);
}`;

/** Any CSS colour, theme variables included, as 0–1 RGB. */
function resolveColor(color: string, probe: HTMLElement): [number, number, number] {
  probe.style.color = color;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const context = canvas.getContext("2d");
  if (!context) return [1, 1, 1];
  context.fillStyle = getComputedStyle(probe).color;
  context.fillRect(0, 0, 1, 1);
  const [r = 255, g = 255, b = 255] = context.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
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

interface LightRaysSettings {
  intensity: number;
  density: number;
  reach: number;
  origin: number;
  spread: number;
  speed: number;
}

interface LightRaysProps
  extends Omit<ComponentProps<"div">, "children">, Partial<LightRaysSettings> {
  /** One colour for every beam, or two to shade the fan from left to right. Theme variables work. */
  colors?: string | [string, string];
  /**
   * Rendering scale against CSS pixels. Soft light loses nothing at half
   * resolution and costs a quarter of the work.
   */
  resolution?: number;
}

/**
 * Soft beams of light falling from above, drawn by a small WebGL2 shader on
 * a transparent canvas, so it sits on whatever background its container
 * has. Put it inside a positioned element; it fills it. It pauses off
 * screen and in background tabs, draws a single still frame with
 * `prefers-reduced-motion`, and falls back to a soft CSS glow where WebGL2
 * is unavailable.
 *
 * - `intensity`: brightness of the beams, from 0 to 1.
 * - `density`: how many beams fit in the fan; higher is finer.
 * - `reach`: how far down the light reaches, as a share of the diagonal.
 * - `origin`: where the source sits across the top, from 0 (left) to 1 (right).
 * - `spread`: how wide the fan opens, in degrees either side of straight down.
 * - `speed`: pace of the drift; 0 holds it still.
 *
 * @example
 * <section className="relative isolate overflow-hidden bg-neutral-950">
 *   <LightRays colors="#6fb3c2" />
 *   <h2 className="relative">Chart your own course</h2>
 * </section>
 */
function LightRays({
  colors = "#ffffff",
  intensity = 0.6,
  density = 12,
  reach = 0.8,
  origin = 0.5,
  spread = 60,
  speed = 1,
  resolution = 0.5,
  className,
  style,
  ref,
  ...props
}: LightRaysProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const fallback = useRef<HTMLDivElement>(null);
  const [observe, inView] = useInView<HTMLDivElement>({ rootMargin: "100px" });
  const mergedRef = useMemo(() => mergeRefs(ref, observe), [ref, observe]);
  const [first = "#ffffff", second = first] = Array.isArray(colors) ? colors : [colors];

  // The render loop reads the latest props from here, without restarting WebGL.
  const settings = useRef<LightRaysSettings>({ intensity, density, reach, origin, spread, speed });
  const visible = useRef(false);
  const wake = useRef<() => void>(() => {});

  useEffect(() => {
    const element = canvas.current;
    const gl = element?.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
    });
    if (!element || !gl) return;
    const program = compile(gl);
    if (!program) return;
    const glow = fallback.current;
    if (glow) glow.hidden = true;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    // One triangle that covers the whole canvas.
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.useProgram(program);
    const at = (name: string) => gl.getUniformLocation(program, name);
    const u = {
      resolution: at("u_resolution"),
      time: at("u_time"),
      origin: at("u_origin"),
      color1: at("u_color1"),
      color2: at("u_color2"),
      intensity: at("u_intensity"),
      density: at("u_density"),
      reach: at("u_reach"),
      spread: at("u_spread"),
    };

    const probe = document.createElement("span");
    probe.style.display = "none";
    element.after(probe);
    const paint = () => {
      gl.uniform3fv(u.color1, resolveColor(first, probe));
      gl.uniform3fv(u.color2, resolveColor(second, probe));
    };

    let time = 0;
    const draw = () => {
      const s = settings.current;
      gl.uniform2f(u.resolution, element.width, element.height);
      gl.uniform1f(u.time, time);
      // The source sits a little above the top edge, so the beams enter already spread.
      gl.uniform2f(u.origin, s.origin * element.width, -0.25 * element.height);
      gl.uniform1f(u.intensity, Math.min(Math.max(s.intensity, 0), 1));
      gl.uniform1f(u.density, Math.max(s.density, 1));
      gl.uniform1f(u.reach, s.reach);
      gl.uniform1f(u.spread, (Math.min(Math.max(s.spread, 5), 89) * Math.PI) / 180);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const resize = () => {
      const scale =
        Math.min(window.devicePixelRatio || 1, 2) * Math.min(Math.max(resolution, 0.1), 2);
      element.width = Math.max(1, Math.round(element.clientWidth * scale));
      element.height = Math.max(1, Math.round(element.clientHeight * scale));
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

    paint();
    resize();
    const resizer = new ResizeObserver(resize);
    resizer.observe(element);
    // Theme switches change what colour variables resolve to.
    const theme = new MutationObserver(() => {
      paint();
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
      resizer.disconnect();
      theme.disconnect();
      probe.remove();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      if (glow) glow.hidden = false;
    };
  }, [first, second, resolution]);

  // Hand the latest props to the loop, and restart it when it is back on screen.
  useEffect(() => {
    settings.current = { intensity, density, reach, origin, spread, speed };
    visible.current = inView;
    wake.current();
  }, [intensity, density, reach, origin, spread, speed, inView]);

  return (
    <div
      ref={mergedRef}
      aria-hidden="true"
      data-slot="light-rays"
      className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}
      style={style}
      {...props}
    >
      {/* Stands in for the beams where WebGL2 is unavailable. */}
      <div
        ref={fallback}
        data-slot="light-rays-fallback"
        className="absolute inset-x-0 top-0 h-3/4 opacity-40"
        style={{
          background: `radial-gradient(ellipse 60% 80% at ${origin * 100}% 0%, ${first}, transparent 70%)`,
        }}
      />
      <canvas ref={canvas} className="block size-full" />
    </div>
  );
}

export { LightRays, type LightRaysProps };
