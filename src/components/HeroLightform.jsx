import { useEffect, useRef } from "react";
import * as THREE from "three";

const IDLE_MS = 6000;

function isLowPower() {
  const mobile = window.matchMedia("(max-width: 767px)").matches || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const lowMemory = (navigator.deviceMemory || 8) <= 4;
  return { mobile, lowMemory, reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches };
}

export default function HeroLightform() {
  const mount = useRef(null);

  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    const { mobile, lowMemory, reduced } = isLowPower();
    const lean = mobile || lowMemory;
    const count = lean ? 140 : 420;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: lean ? "low-power" : "high-performance" });
    } catch {
      return;
    }
    renderer.setPixelRatio(lean ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 50);
    camera.position.z = 7;

    const glowGeo = new THREE.PlaneGeometry(14, 9);
    const glowMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: { value: 0 }, uColorA: { value: new THREE.Color("#2fb7b0") }, uColorB: { value: new THREE.Color("#2a6fd6") } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: `
        uniform float uTime; uniform vec3 uColorA; uniform vec3 uColorB; varying vec2 vUv;
        void main(){
          vec2 p = vUv - 0.5;
          float d = length(p * vec2(1.4, 1.0));
          float a = smoothstep(0.7, 0.0, d) * 0.32;
          float wave = 0.5 + 0.5 * sin(uTime * 0.12 + p.x * 3.0 + p.y * 2.0);
          vec3 c = mix(uColorA, uColorB, wave);
          gl_FragColor = vec4(c, a);
        }`,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.z = -2;
    scene.add(glow);

    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 7;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 3;
      seeds[i] = Math.random() * Math.PI * 2;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({ color: 0xbfeee6, size: mobile ? 0.05 : 0.04, transparent: true, opacity: 0.55, depthWrite: false });
    const points = new THREE.Points(pGeo, pMat);
    scene.add(points);

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    let raf = 0;
    let lastInput = performance.now();
    let visible = true;
    let running = false;
    const base = Float32Array.from(positions);

    const resize = () => {
      const w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const onMove = (e) => {
      const r = host.getBoundingClientRect();
      pointer.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      pointer.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      lastInput = performance.now();
      start();
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const frame = (t) => {
      raf = 0;
      const time = t * 0.001;
      glowMat.uniforms.uTime.value = time;
      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;
      const drift = reduced ? 0 : 1;
      const arr = pGeo.attributes.position.array;
      for (let i = 0; i < count; i++) {
        const s = seeds[i];
        arr[i * 3] = base[i * 3] + Math.sin(time * 0.05 + s) * 0.25 * drift + pointer.x * 0.2;
        arr[i * 3 + 1] = base[i * 3 + 1] + Math.cos(time * 0.04 + s) * 0.2 * drift - pointer.y * 0.2;
      }
      pGeo.attributes.position.needsUpdate = true;
      camera.position.x = pointer.x * 0.3 * (reduced ? 0 : 1);
      camera.position.y = -pointer.y * 0.2 * (reduced ? 0 : 1);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);

      // Stop rendering once idle; any input restarts the loop.
      const idle = performance.now() - lastInput > IDLE_MS && Math.abs(pointer.tx - pointer.x) < 0.001;
      if (!idle && visible && !document.hidden) raf = requestAnimationFrame(frame);
      else running = false;
    };
    function start() {
      if (running || !visible || document.hidden) return;
      running = true;
      raf = requestAnimationFrame(frame);
    }

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else if (raf) { cancelAnimationFrame(raf); raf = 0; running = false; }
    });
    io.observe(host);
    const onVis = () => { if (!document.hidden) { lastInput = performance.now(); start(); } else if (raf) { cancelAnimationFrame(raf); raf = 0; running = false; } };
    document.addEventListener("visibilitychange", onVis);
    start();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVis);
      pGeo.dispose();
      pMat.dispose();
      glowGeo.dispose();
      glowMat.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mount} aria-hidden="true" className="absolute inset-0 -z-10 pointer-events-none" />;
}
