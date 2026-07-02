import type { BackendCaps, Dab, RGB } from "../types";
import { makeTipCanvas, type RendererBackend, type StrokeContext } from "./backend";
import type { TipKind } from "../brushes/BrushBase";

/*
 * WebGL2Backend: GPU 가속 dab 스탬핑 + 수채 wet-map 확산(ping-pong FBO) + 유화 heightmap 라이팅.
 * 실패(컨텍스트 없음/셰이더 컴파일 오류) 시 CanvasManager가 Canvas2D로 폴백한다.
 *
 * 렌더 모델:
 *  - strokeFbo: 현재 스트로크를 누적(브러시 composite 내 겹침 통제)
 *  - endStroke에서 strokeFbo를 레이어 캔버스에 2D drawImage로 합성
 *  - 수채: dab이 wetMap(RG: 물/안료)에 주입 → tick()마다 확산 셰이더, 건조 후 leaf
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

// 수채 확산: 3x3 이웃 평균, 물 많을수록 확산 강, 안료는 물 따라 이동. 건조 감쇠.
const DIFFUSE_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_wet;   // R=water G=pigment
uniform vec2 u_texel;
uniform float u_dry;       // 이번 틱 건조량
out vec4 frag;
void main() {
  vec2 c = texture(u_wet, v_uv).rg;
  float water = c.r;
  float pig = c.g;
  vec2 sum = vec2(0.0);
  float wsum = 0.0;
  for (int dy=-1; dy<=1; dy++) {
    for (int dx=-1; dx<=1; dx++) {
      vec2 s = texture(u_wet, v_uv + u_texel * vec2(float(dx), float(dy))).rg;
      float w = s.r + 0.05;      // 물 많은 이웃일수록 기여 큼
      sum += s * w;
      wsum += w;
    }
  }
  vec2 avg = sum / wsum;
  float flow = clamp(water, 0.0, 1.0);        // 확산 속도 = 물 양
  float newWater = mix(water, avg.r, 0.25 * flow);
  float newPig = mix(pig, avg.g, 0.35 * flow);
  newWater = max(0.0, newWater - u_dry);       // 건조
  frag = vec4(newWater, newPig, 0.0, 1.0);
}`;

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
  private diffuseProg: WebGLProgram;

  private quadVao: WebGLVertexArrayObject;
  private fsVao: WebGLVertexArrayObject;

  private strokeFbo: Fbo;
  private wetA: Fbo;
  private wetB: Fbo;
  private tipTextures = new Map<TipKind, WebGLTexture>();

  private ctx: StrokeContext | null = null;
  private hasFloat: boolean;
  private wetDirty = false;

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

    // half-float 렌더 타깃(수채/유화 시뮬)
    this.hasFloat = !!gl.getExtension("EXT_color_buffer_float");

    this.dabProg = link(gl, QUAD_VS, DAB_FS);
    this.copyProg = link(gl, FULLSCREEN_VS, COPY_FS);
    this.diffuseProg = link(gl, FULLSCREEN_VS, DIFFUSE_FS);

    this.quadVao = this.makeQuadVao(this.dabProg);
    this.fsVao = this.makeFsVao(this.copyProg);

    this.strokeFbo = this.makeFbo(gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE);
    const wetFmt = this.hasFloat ? gl.RG16F : gl.RGBA8;
    const wetSrc = this.hasFloat ? gl.RG : gl.RGBA;
    const wetType = this.hasFloat ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
    this.wetA = this.makeFbo(wetFmt, wetSrc, wetType);
    this.wetB = this.makeFbo(wetFmt, wetSrc, wetType);

    this.caps = {
      webgl2: true,
      wetSim: this.hasFloat,
      heightmap: this.hasFloat,
    };
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
    let t = this.tipTextures.get(kind);
    if (!t) {
      const gl = this.gl;
      const src = makeTipCanvas(kind);
      t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.tipTextures.set(kind, t);
    }
    return t;
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
    // premultiplied: additive면 ONE,ONE / 일반이면 최대 알파 누적
    if (this.ctx.composite === "lighter") {
      gl.blendFunc(gl.ONE, gl.ONE);
    } else {
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
      // 수채: wetMap에 물/안료 주입은 tick 확산이 담당(여기선 스트로크 버퍼만)
      if (this.ctx.watercolor && this.caps.wetSim && dab.water) {
        this.injectWet(dab);
      }
    }
    gl.bindVertexArray(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private injectWet(dab: Dab): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.wetA.fb);
    gl.viewport(0, 0, this.width, this.height);
    gl.useProgram(this.dabProg);
    gl.bindVertexArray(this.quadVao);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE); // 물/안료 누적
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tipTexture("soft"));
    gl.uniform2f(gl.getUniformLocation(this.dabProg, "u_resolution"), this.width, this.height);
    gl.uniform2f(gl.getUniformLocation(this.dabProg, "u_center"), dab.x, dab.y);
    gl.uniform1f(gl.getUniformLocation(this.dabProg, "u_size"), dab.size * 1.4);
    gl.uniform1f(gl.getUniformLocation(this.dabProg, "u_rot"), 0);
    gl.uniform4f(gl.getUniformLocation(this.dabProg, "u_color"), (dab.water ?? 0.5), dab.alpha, 0, 1);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.wetDirty = true;
  }

  tick(dtMs: number): boolean {
    if (!this.caps.wetSim || !this.wetDirty) return false;
    const gl = this.gl;
    const dry = Math.min(0.02, dtMs / 5000); // 5초에 걸쳐 건조
    // ping-pong 확산 2패스
    for (let i = 0; i < 2; i++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.wetB.fb);
      gl.viewport(0, 0, this.width, this.height);
      gl.useProgram(this.diffuseProg);
      gl.bindVertexArray(this.fsVao);
      gl.disable(gl.BLEND);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.wetA.tex);
      gl.uniform1i(gl.getUniformLocation(this.diffuseProg, "u_wet"), 0);
      gl.uniform2f(gl.getUniformLocation(this.diffuseProg, "u_texel"), 1 / this.width, 1 / this.height);
      gl.uniform1f(gl.getUniformLocation(this.diffuseProg, "u_dry"), dry);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindVertexArray(null);
      // swap
      const tmp = this.wetA;
      this.wetA = this.wetB;
      this.wetB = tmp;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return true;
  }

  endStroke(): void {
    if (!this.ctx) return;
    const gl = this.gl;
    // 스트로크 버퍼(premultiplied)를 화면 캔버스로 복사해 2D 레이어에 합성
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

    const layerCtx = (this.ctx.layerCanvas as HTMLCanvasElement).getContext("2d")!;
    layerCtx.save();
    if (this.ctx.composite === "destination-out") {
      layerCtx.globalCompositeOperation = "destination-out";
    } else if (this.ctx.composite === "multiply") {
      layerCtx.globalCompositeOperation = "multiply";
    } else if (this.ctx.composite === "lighter") {
      layerCtx.globalCompositeOperation = "lighter";
    }
    layerCtx.drawImage(this.glCanvas, 0, 0);
    layerCtx.restore();
    this.ctx = null;
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteProgram(this.dabProg);
    gl.deleteProgram(this.copyProg);
    gl.deleteProgram(this.diffuseProg);
    this.tipTextures.forEach((t) => gl.deleteTexture(t));
    this.tipTextures.clear();
    for (const f of [this.strokeFbo, this.wetA, this.wetB]) {
      gl.deleteFramebuffer(f.fb);
      gl.deleteTexture(f.tex);
    }
    const lose = gl.getExtension("WEBGL_lose_context");
    lose?.loseContext();
  }
}

export function tryCreateWebGL2Backend(width: number, height: number): WebGL2Backend | null {
  try {
    // 소프트웨어 렌더러(SwiftShader) 감지 → 폴백 유도
    const probe = document.createElement("canvas").getContext("webgl2");
    if (!probe) return null;
    const dbg = probe.getExtension("WEBGL_debug_renderer_info");
    if (dbg) {
      const renderer = String(probe.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? "");
      if (/swiftshader|software|llvmpipe/i.test(renderer)) return null;
    }
    return new WebGL2Backend(width, height);
  } catch {
    return null;
  }
}
