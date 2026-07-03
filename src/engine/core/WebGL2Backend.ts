import type { BackendCaps, Dab, RGB } from "../types";
import { getTipCanvas, getTipEpoch, type RendererBackend, type StrokeContext } from "./backend";
import { applyPaperGrain, applyWetEdge } from "./paper";
import type { TipKind } from "../brushes/BrushBase";

/*
 * WebGL2Backend: GPU 가속 dab 스탬핑.
 * 실패(컨텍스트 없음/셰이더 컴파일 오류) 시 CanvasManager가 Canvas2D로 폴백한다.
 *
 * 렌더 모델:
 *  - strokeFbo: 현재 스트로크를 누적(브러시 composite 내 겹침 통제)
 *  - endStroke에서 strokeFbo를 (종이 결 모듈레이션 후) 레이어 캔버스에 2D drawImage로 합성
 *
 * ⚠️ 과거 wet-map 확산 시뮬은 제거됨: dab 루프 도중 injectWet이 framebuffer/VAO를
 * 오염시켜 배치당 첫 dab만 화면에 남는 "점선 수채" 버그의 원인이었고,
 * 확산 결과는 어디에도 렌더되지 않는 죽은 코드였다. 수채 look은
 * wet 팁(edge darkening 베이크) + 종이 결로 표현한다.
 */

const QUAD_VS = `#version 300 es
in vec2 a_pos;      // -0.5..0.5 quad
in vec2 a_uv;
uniform vec2 u_resolution;
uniform vec2 u_center;   // px
uniform float u_size;    // px
uniform float u_rot;
out vec2 v_uv;
void main() {
  float c = cos(u_rot); float s = sin(u_rot);
  vec2 p = vec2(a_pos.x * c - a_pos.y * s, a_pos.x * s + a_pos.y * c) * u_size;
  vec2 px = u_center + p;
  vec2 clip = (px / u_resolution) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  v_uv = a_uv;
}`;

const DAB_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_tip;
uniform vec4 u_color;   // premultiplied rgb + alpha
out vec4 frag;
void main() {
  float a = texture(u_tip, v_uv).a * u_color.a;
  frag = vec4(u_color.rgb * a, a);  // premultiplied
}`;

const FULLSCREEN_VS = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const COPY_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_tex;
out vec4 frag;
void main() { frag = texture(u_tex, v_uv); }`;

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`셰이더 컴파일 실패: ${log}`);
  }
  return sh;
}

function link(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(p);
    gl.deleteProgram(p);
    throw new Error(`프로그램 링크 실패: ${log}`);
  }
  return p;
}

interface Fbo {
  fb: WebGLFramebuffer;
  tex: WebGLTexture;
}

export class WebGL2Backend implements RendererBackend {
  readonly caps: BackendCaps;
  private gl: WebGL2RenderingContext;
  private glCanvas: HTMLCanvasElement;

  private dabProg: WebGLProgram;
  private copyProg: WebGLProgram;

  private quadVao: WebGLVertexArrayObject;
  private fsVao: WebGLVertexArrayObject;

  private strokeFbo: Fbo;
  private tipTextures = new Map<TipKind, { tex: WebGLTexture; epoch: number }>();

  private ctx: StrokeContext | null = null;
  /** 종이 결 모듈레이션 등 2D 포스트프로세스용(지연 생성) */
  private post2d: CanvasRenderingContext2D | null = null;

  constructor(
    private readonly width: number,
    private readonly height: number,
  ) {
    const glCanvas = document.createElement("canvas");
    glCanvas.width = width;
    glCanvas.height = height;
    const gl = glCanvas.getContext("webgl2", { premultipliedAlpha: true, alpha: true });
    if (!gl) throw new Error("WebGL2 컨텍스트 생성 실패");
    this.gl = gl;
    this.glCanvas = glCanvas;

    this.dabProg = link(gl, QUAD_VS, DAB_FS);
    this.copyProg = link(gl, FULLSCREEN_VS, COPY_FS);

    this.quadVao = this.makeQuadVao(this.dabProg);
    this.fsVao = this.makeFsVao(this.copyProg);

    this.strokeFbo = this.makeFbo(gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE);

    this.caps = { webgl2: true };
  }

  private makeQuadVao(prog: WebGLProgram): WebGLVertexArrayObject {
    const gl = this.gl;
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    // pos(-0.5..0.5) + uv(0..1)
    const data = new Float32Array([
      -0.5, -0.5, 0, 0, 0.5, -0.5, 1, 0, -0.5, 0.5, 0, 1,
      -0.5, 0.5, 0, 1, 0.5, -0.5, 1, 0, 0.5, 0.5, 1, 1,
    ]);
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "a_pos");
    const aUv = gl.getAttribLocation(prog, "a_uv");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(aUv);
    gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 16, 8);
    gl.bindVertexArray(null);
    return vao;
  }

  private makeFsVao(prog: WebGLProgram): WebGLVertexArrayObject {
    const gl = this.gl;
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const data = new Float32Array([-1, -1, 3, -1, -1, 3]);
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    return vao;
  }

  private makeFbo(internal: number, format: number, type: number): Fbo {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, this.width, this.height, 0, format, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fb, tex };
  }

  private tipTexture(kind: TipKind): WebGLTexture {
    const gl = this.gl;
    const epoch = getTipEpoch();
    let entry = this.tipTextures.get(kind);
    // AI 알파맵이 늦게 로드되면 epoch가 올라간다 → 캐시된 텍스처 재생성
    if (entry && entry.epoch !== epoch) {
      gl.deleteTexture(entry.tex);
      this.tipTextures.delete(kind);
      entry = undefined;
    }
    if (!entry) {
      const src = getTipCanvas(kind);
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      entry = { tex, epoch };
      this.tipTextures.set(kind, entry);
    }
    return entry.tex;
  }

  beginStroke(ctx: StrokeContext): void {
    this.ctx = ctx;
    const gl = this.gl;
    // 스트로크 버퍼 클리어
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.strokeFbo.fb);
    gl.viewport(0, 0, this.width, this.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  drawDabs(dabs: Dab[]): void {
    if (!this.ctx) return;
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.strokeFbo.fb);
    gl.viewport(0, 0, this.width, this.height);
    gl.useProgram(this.dabProg);
    gl.bindVertexArray(this.quadVao);
    gl.enable(gl.BLEND);
    // wash: 픽셀별 최대 알파만 유지(MAX) → 겹침 포화 없이 팁 붓결이 획 전체에 보존.
    // (premultiplied + 스트로크 내 단색이라 채널별 max가 일관됨. 무지개 같은
    //  dab별 색 변화 브러시는 buildup을 유지해야 한다.)
    if (this.ctx.wash) {
      gl.blendEquation(gl.MAX);
      gl.blendFunc(gl.ONE, gl.ONE);
    } else if (this.ctx.composite === "lighter") {
      gl.blendEquation(gl.FUNC_ADD);
      gl.blendFunc(gl.ONE, gl.ONE);
    } else {
      gl.blendEquation(gl.FUNC_ADD);
      gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    }

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tipTexture(this.ctx.tip));
    gl.uniform1i(gl.getUniformLocation(this.dabProg, "u_tip"), 0);
    gl.uniform2f(gl.getUniformLocation(this.dabProg, "u_resolution"), this.width, this.height);
    const uCenter = gl.getUniformLocation(this.dabProg, "u_center");
    const uSize = gl.getUniformLocation(this.dabProg, "u_size");
    const uRot = gl.getUniformLocation(this.dabProg, "u_rot");
    const uColor = gl.getUniformLocation(this.dabProg, "u_color");

    for (const dab of dabs) {
      const col = dab.color ?? this.ctx.color;
      gl.uniform2f(uCenter, dab.x, dab.y);
      gl.uniform1f(uSize, dab.size);
      gl.uniform1f(uRot, dab.rotation);
      gl.uniform4f(uColor, col.r / 255, col.g / 255, col.b / 255, dab.alpha);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    gl.bindVertexArray(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  tick(): boolean {
    return false; // 시간 진행 시뮬 없음
  }

  /** strokeFbo → glCanvas(기본 프레임버퍼) 복사 — 프리뷰/합성 공용 */
  private blitStrokeToScreen(): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.copyProg);
    gl.bindVertexArray(this.fsVao);
    gl.disable(gl.BLEND);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.strokeFbo.tex);
    gl.uniform1i(gl.getUniformLocation(this.copyProg, "u_tex"), 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  presentStroke(target: CanvasRenderingContext2D): void {
    if (!this.ctx) return;
    this.blitStrokeToScreen();
    const c = this.ctx.composite;
    target.save();
    target.globalAlpha = this.ctx.strokeOpacity; // wash 획 전체 불투명도(프리뷰=최종)
    target.globalCompositeOperation =
      c === "destination-out"
        ? "destination-out"
        : c === "multiply"
          ? "multiply"
          : c === "lighter"
            ? "lighter"
            : "source-over";
    target.drawImage(this.glCanvas, 0, 0);
    target.restore();
  }

  endStroke(): void {
    if (!this.ctx) return;
    // 스트로크 버퍼(premultiplied)를 화면 캔버스로 복사해 2D 레이어에 합성
    this.blitStrokeToScreen();

    // 종이 결 침식·wet edge는 2D 경유(지우개엔 미적용)
    let src: HTMLCanvasElement = this.glCanvas;
    const needPost = this.ctx.paperGrain > 0 || this.ctx.wetEdge > 0;
    if (needPost && this.ctx.composite !== "destination-out") {
      if (!this.post2d) {
        const c = document.createElement("canvas");
        c.width = this.width;
        c.height = this.height;
        this.post2d = c.getContext("2d")!;
      }
      this.post2d.clearRect(0, 0, this.width, this.height);
      this.post2d.drawImage(this.glCanvas, 0, 0);
      if (this.ctx.wetEdge > 0)
        applyWetEdge(this.post2d, this.width, this.height, this.ctx.wetEdge);
      if (this.ctx.paperGrain > 0)
        applyPaperGrain(this.post2d, this.width, this.height, this.ctx.paperGrain);
      src = this.post2d.canvas;
    }

    const layerCtx = (this.ctx.layerCanvas as HTMLCanvasElement).getContext("2d")!;
    layerCtx.save();
    layerCtx.globalAlpha = this.ctx.strokeOpacity;
    if (this.ctx.composite === "destination-out") {
      layerCtx.globalCompositeOperation = "destination-out";
    } else if (this.ctx.composite === "multiply") {
      layerCtx.globalCompositeOperation = "multiply";
    } else if (this.ctx.composite === "lighter") {
      layerCtx.globalCompositeOperation = "lighter";
    }
    layerCtx.drawImage(src, 0, 0);
    layerCtx.restore();
    this.ctx = null;
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteProgram(this.dabProg);
    gl.deleteProgram(this.copyProg);
    this.tipTextures.forEach((t) => gl.deleteTexture(t.tex));
    this.tipTextures.clear();
    gl.deleteFramebuffer(this.strokeFbo.fb);
    gl.deleteTexture(this.strokeFbo.tex);
    const lose = gl.getExtension("WEBGL_lose_context");
    lose?.loseContext();
  }
}

export function tryCreateWebGL2Backend(
  width: number,
  height: number,
  allowSoftware = false,
): WebGL2Backend | null {
  try {
    // 소프트웨어 렌더러(SwiftShader) 감지 → 폴백 유도 (?backend=gl 테스트 시엔 허용)
    const probe = document.createElement("canvas").getContext("webgl2");
    if (!probe) return null;
    let software = false;
    const dbg = probe.getExtension("WEBGL_debug_renderer_info");
    if (dbg) {
      const renderer = String(probe.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? "");
      software = /swiftshader|software|llvmpipe/i.test(renderer);
    }
    // probe 컨텍스트는 즉시 반납(마운트 반복 시 브라우저 GL 컨텍스트 한도 잠식 방지)
    probe.getExtension("WEBGL_lose_context")?.loseContext();
    if (software && !allowSoftware) return null;
    return new WebGL2Backend(width, height);
  } catch {
    return null;
  }
}
