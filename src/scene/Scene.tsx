import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as T from "three/webgpu";
import {
  pass,
  uniform,
  positionLocal,
  mix,
  attribute,
  vec3,
  vec4,
  screenUV,
  smoothstep,
} from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { S, sectionAt } from "../state";

function band(r: number, w: number, h: number, arc = Math.PI * 2) {
  const points: T.Vector2[] = [];
  for (let k = 0; k < 4; k++)
    for (let j = 0; j <= 5; j++) {
      const a = ((k + j / 5) * Math.PI) / 2;
      points.push(
        new T.Vector2(
          r + [1, -1, -1, 1][k] * (w - 0.024) + 0.024 * Math.cos(a),
          [1, 1, -1, -1][k] * (h - 0.024) + 0.024 * Math.sin(a),
        ),
      );
    }
  points.push(points[0]);
  return new T.LatheGeometry(points, 128, 0, arc);
}
function Model({ tier }: { tier: string }) {
  const { gl: g, scene, camera, viewport } = useThree();
  const gl = g as unknown as T.WebGPURenderer;
  const group = useRef<T.Group>(null!);
  const dust = useRef<T.InstancedMesh>(null!);
  const progress = useRef(S.p);
  const poses = useMemo(
    () =>
      new T.CatmullRomCurve3(
        [
          [0, 0.6, 6],
          [0.4, 1, 7],
          [-0.7, 1.4, 6],
          [0.8, 0.8, 7],
          [0.3, 1, 5.8],
          [-0.3, 0.3, 7],
          [0, 0.7, 6],
          [0, 0.4, 7],
        ].map((v) => new T.Vector3(...v)),
      ),
    [],
  );
  const assets = useMemo(() => {
    const geos = [
      band(1.21, 0.071, 0.228),
      band(1.085, 0.065, 0.205),
      band(1.006, 0.027, 0.15, Math.PI * 1.84),
    ];
    const mats = [
      new T.MeshPhysicalNodeMaterial({
        color: 0xf2efe9,
        metalness: 1,
        roughness: 0.23,
      }),
      new T.MeshPhysicalNodeMaterial({
        color: 0xaab4d4,
        metalness: 0.79,
        roughness: 0.27,
        transparent: true,
        opacity: 0.88,
      }),
      new T.MeshStandardNodeMaterial({
        color: 0xaab4d4,
        metalness: 0.88,
        roughness: 0.3,
      }),
    ];
    const morph = uniform(0);
    const count = tier === "high" ? 1000 : 380;
    const dots = new T.IcosahedronGeometry(0.009, 0);
    const start = [],
      end = [];
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const noise = (v: number) => (Math.sin((i + 1) * v) * 43758.54) % 1;
      start.push(noise(3) * 2, noise(4), noise(8) * 0.6);
      end.push(
        4 * t - 2,
        0.4 * Math.sin(t * 14) + 0.18 * Math.sin(t * 34) + 0.05 * noise(2),
        0,
      );
    }
    dots.setAttribute(
      "dustStart",
      new T.InstancedBufferAttribute(new Float32Array(start), 3),
    );
    dots.setAttribute(
      "dustEnd",
      new T.InstancedBufferAttribute(new Float32Array(end), 3),
    );
    const particleMat = new T.MeshBasicNodeMaterial({ color: 0x8fa8ff });
    particleMat.positionNode = positionLocal.add(
      mix(attribute("dustStart", "vec3"), attribute("dustEnd", "vec3"), morph),
    );
    return { geos, mats, morph, count, dots, particleMat };
  }, [tier]);
  const pipeline = useMemo(() => {
    const pipe = new T.RenderPipeline(gl);
    const base = pass(scene, camera).getTextureNode();
    const glow = bloom(base, 0.16, 0.2, 0.85);
    const shaded = base.rgb.add(glow.rgb);
    const edge = smoothstep(0.2, 0.78, screenUV.sub(0.5).length())
      .mul(0.1)
      .oneMinus();
    pipe.outputNode = vec4(tier === "high" ? shaded.mul(edge) : shaded, base.a);
    return pipe;
  }, [gl, scene, camera, tier]);
  useEffect(() => {
    const room = new T.Scene();
    room.background = new T.Color("#0E1220");
    const geo = new T.PlaneGeometry(1, 1);
    const mat = new T.MeshBasicMaterial({
      color: new T.Color(5, 5, 5),
      side: T.DoubleSide,
    });
    for (const [x, y, z, w, h] of [
      [-3, 2, 2, 1.2, 5],
      [3, 1, -1, 2, 5],
      [0, 4, 1, 6, 1],
      [0, -2, -3, 5, 0.6],
    ]) {
      const strip = new T.Mesh(geo, mat);
      strip.position.set(x, y, z);
      strip.scale.set(w, h, 1);
      strip.lookAt(0, 0, 0);
      room.add(strip);
    }
    const gen = new T.PMREMGenerator(gl);
    const env = gen.fromScene(room);
    scene.environment = env.texture;
    gen.dispose();
    geo.dispose();
    mat.dispose();
    const identity = new T.Matrix4();
    for (let i = 0; i < assets.count; i++)
      dust.current.setMatrixAt(i, identity);
    dust.current.instanceMatrix.needsUpdate = true;
    return () => {
      scene.environment = null;
      env.dispose();
      pipeline.dispose();
      assets.geos.forEach((v) => v.dispose());
      assets.mats.forEach((v) => v.dispose());
      assets.dots.dispose();
      assets.particleMat.dispose();
      document.documentElement.classList.remove("live3d");
    };
  }, [gl, scene, assets, pipeline]);
  useFrame((state, dt) => {
    progress.current = T.MathUtils.damp(
      progress.current,
      S.p,
      12,
      Math.min(dt, 0.1),
    );
    const phase = sectionAt(progress.current);
    const u = Math.min(1, phase / 7);
    camera.position.copy(poses.getPointAt(u));
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const q = group.current;
    const mobile = innerWidth < 720;
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-product]"),
    );
    const node = nodes
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .sort(
        (a, b) =>
          Math.abs(a.r.top + a.r.height / 2 - innerHeight / 2) -
          Math.abs(b.r.top + b.r.height / 2 - innerHeight / 2),
      )[0];
    if (!node) return;
    const { r, el } = node;
    gl.domElement.style.clipPath =
      "inset(" +
      Math.max(0, r.top) +
      "px " +
      Math.max(0, innerWidth - r.right) +
      "px " +
      Math.max(0, innerHeight - r.bottom) +
      "px " +
      Math.max(0, r.left) +
      "px)";
    const rect = viewport.getCurrentViewport(camera, new T.Vector3());
    const center = new T.Vector3(
      ((r.left + r.width / 2) / innerWidth) * 2 - 1,
      1 - ((r.top + r.height / 2) / innerHeight) * 2,
      0,
    );
    center.unproject(camera);
    const dir = center.sub(camera.position).normalize();
    const normal = camera.getWorldDirection(new T.Vector3());
    q.position
      .copy(camera.position)
      .addScaledVector(dir, camera.position.length() / dir.dot(normal));
    q.quaternion.copy(camera.quaternion);
    q.rotateZ(0.48 + 0.14 * Math.sin(u * 6));
    q.rotateX(0.57 + 0.15 * Math.sin(phase) + 0.025 * S.pointerY);
    q.rotateY(
      0.08 * Math.sin(state.clock.elapsedTime * 0.22) + 0.03 * S.pointerX,
    );
    const scale =
      (Math.min(r.width * 0.39, r.height * 0.44) * rect.width) /
      innerWidth /
      1.28;
    q.scale.setScalar(scale);
    const exp =
      phase >= 2 && phase < 3
        ? Math.sin(
            Math.PI *
              T.MathUtils.clamp(
                (progress.current - S.stops[2]) / S.pinSpan,
                0,
                1,
              ),
          )
        : 0;
    assets.mats[0].color.lerp(
      new T.Color([0xf2efe9, 0x575c68, 0xffc48a][phase < 3 ? 0 : S.finish]),
      1 - Math.exp(-dt * 8),
    );
    S.anchors = q.children.map((mesh, i) => {
      mesh.position.y = exp * [0.85, 0, -0.85][i];
      q.updateMatrixWorld(true);
      const v = mesh
        .localToWorld(new T.Vector3(mobile ? 0 : 1.12, 0, 0))
        .project(camera);
      return {
        x: ((v.x + 1) * innerWidth) / 2,
        y: ((1 - v.y) * innerHeight) / 2,
      };
    });
    q.visible = el.dataset.product !== "science";
    dust.current.visible = !q.visible;
    dust.current.position.copy(q.position);
    dust.current.quaternion.copy(camera.quaternion);
    const worldPerPixel = rect.width / innerWidth;
    dust.current.translateX(28 * worldPerPixel);
    dust.current.scale.set(
      (Math.max(1, r.width - 104) * worldPerPixel) / 4,
      r.height * worldPerPixel * 0.69,
      scale,
    );
    assets.morph.value = T.MathUtils.smoothstep(
      progress.current,
      S.stops[3] -
        (innerHeight * 0.7) /
          (document.documentElement.scrollHeight - innerHeight),
      S.stops[3],
    );
    gl.info.autoReset=false;
    gl.info.reset();
    pipeline.render();
    S.draws = Math.max(S.draws, gl.info.render.drawCalls);
    S.frames++;
    S.backend = "isWebGPUBackend" in gl.backend ? "webgpu" : "webgl2";
    document.documentElement.classList.add("live3d");
  }, 1);
  return (
    <>
      <group ref={group}>
        {assets.geos.map((geo, i) => (
          <mesh key={i} geometry={geo} material={assets.mats[i]} />
        ))}
      </group>
      <instancedMesh
        ref={dust}
        args={[assets.dots, assets.particleMat, assets.count]}
        frustumCulled={false}
      />
    </>
  );
}
export default function Scene({ tier }: { tier: string }) {
  const [on, setOn] = useState(S.active);
  useEffect(() => {
    const fn = () => setOn(S.active);
    window.addEventListener("lumo-active", fn);
    return () => window.removeEventListener("lumo-active", fn);
  }, []);
  return (
    <Canvas
      frameloop={on ? "always" : "never"}
      dpr={[1, innerWidth < 720 ? 1.5 : 2]}
      camera={{ fov: 36 }}
      gl={async (opts) => {
        const renderer = new T.WebGPURenderer({
          canvas: opts.canvas as HTMLCanvasElement,
          alpha: true,
          antialias: true,
          forceWebGL:
            new URLSearchParams(location.search).get("renderer") === "webgl",
        });
        await renderer.init();
        renderer.setClearColor(0, 0);
        return renderer as never;
      }}
    >
      <Model tier={tier} />
    </Canvas>
  );
}

