import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Subscription } from 'rxjs';
import { PORTFOLIO_DATA } from '../../shared/data/portfolio.data';
import { ThemeService } from '../../core/services/theme.service';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss',
})
export class HeroComponent implements AfterViewInit, OnDestroy {
  @ViewChild('moonCanvas')  moonCanvasRef!:  ElementRef<HTMLCanvasElement>;
  @ViewChild('moonWrapper') moonWrapperRef!: ElementRef<HTMLDivElement>;

  data = PORTFOLIO_DATA.personal;

  private renderer!: THREE.WebGLRenderer;
  private scene!:    THREE.Scene;
  private camera!:   THREE.PerspectiveCamera;
  private bodyGroup!: THREE.Group;
  private rafId = 0;

  private isDragging = false;
  private prevMouse  = { x: 0, y: 0 };
  private dragVelX   = 0;
  private dragVelY   = 0;
  private mouseNX    = 0;
  private mouseNY    = 0;
  private themeSub!: Subscription;

  constructor(private themeService: ThemeService) {}

  ngAfterViewInit(): void {
    // defer until browser has painted and canvas has real dimensions
    requestAnimationFrame(() => {
      this.initScene();
      this.setupScrollZoom();
      this.animateEntrance();
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
    this.renderer?.dispose();
    this.themeSub?.unsubscribe();
  }

  // ─── scene ────────────────────────────────────────────────────────────────

  private initScene(): void {
    const canvas = this.moonCanvasRef.nativeElement;

    // get real dimensions — try multiple methods
    const rect = canvas.getBoundingClientRect();
    const w = rect.width  || canvas.offsetWidth  || canvas.parentElement?.offsetWidth  || 480;
    const h = rect.height || canvas.offsetHeight || canvas.parentElement?.offsetHeight || 480;

    // set canvas pixel size explicitly so WebGL has a real surface
    canvas.width  = Math.round(w * Math.min(devicePixelRatio, 2));
    canvas.height = Math.round(h * Math.min(devicePixelRatio, 2));
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(w, h, false);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled  = true;
    this.renderer.shadowMap.type     = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping        = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.scene  = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
    this.camera.position.set(0, 0, 4.8);

    this.bodyGroup = new THREE.Group();
    this.scene.add(this.bodyGroup);

    const isLight = this.themeService.theme === 'light';
    this.buildLights(isLight);
    this.loadGLB(isLight);

    this.setupDrag(canvas);
    window.addEventListener('mousemove', e => {
      this.mouseNX = (e.clientX / window.innerWidth)  - 0.5;
      this.mouseNY = (e.clientY / window.innerHeight) - 0.5;
    });
    new ResizeObserver(() => this.onResize()).observe(canvas);
    this.renderLoop();

    this.themeSub = this.themeService.themeChange$.subscribe(theme => {
      const light = theme === 'light';
      // clear lights
      this.scene.children
        .filter(c => c instanceof THREE.Light)
        .forEach(c => this.scene.remove(c));
      this.buildLights(light);
      this.loadGLB(light);
    });
  }

  // ─── lights ───────────────────────────────────────────────────────────────

  private buildLights(isLight: boolean): void {
    if (isLight) {
      // warm ambient for sun scene
      this.scene.add(new THREE.AmbientLight('#1a0800', 1.2));

      const key = new THREE.DirectionalLight('#fff4cc', 2.5);
      key.position.set(6, 5, 8);
      this.scene.add(key);

      // warm fill
      const fill = new THREE.DirectionalLight('#ff8800', 0.8);
      fill.position.set(-4, -2, -3);
      this.scene.add(fill);

    } else {
      // cool dark ambient for moon scene
      this.scene.add(new THREE.AmbientLight('#04040e', 0.6));

      const key = new THREE.DirectionalLight('#d8eaff', 4.2);
      key.name = 'key';
      key.position.set(5, 4, 6);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      this.scene.add(key);

      // dim blue fill — dark side not totally black
      const fill = new THREE.DirectionalLight('#1a2a6a', 0.22);
      fill.position.set(-5, -3, -4);
      this.scene.add(fill);

      // blue rim glow
      const rim = new THREE.PointLight('#3355cc', 1.4, 14);
      rim.position.set(-3, 2, 2);
      this.scene.add(rim);
    }
  }

  // ─── moon ─────────────────────────────────────────────────────────────────

  private buildMoon(): void {
    const geo = new THREE.SphereGeometry(1.4, 128, 128);
    const mat = new THREE.MeshStandardMaterial({
      map:       this.makeMoonColorMap(),
      bumpMap:   this.makeMoonBumpMap(),
      bumpScale: 0.065,
      roughness: 0.97,
      metalness: 0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow    = true;
    mesh.receiveShadow = true;
    this.bodyGroup.add(mesh);
  }

  // ─── sun ──────────────────────────────────────────────────────────────────

  private buildSun(): void {
    // core sphere with emissive surface
    const coreGeo = new THREE.SphereGeometry(1.38, 64, 64);
    const colorMap = this.makeSunColorMap();
    const coreMat = new THREE.MeshStandardMaterial({
      map:               colorMap,
      emissiveMap:       colorMap,
      emissive:          new THREE.Color('#ff5500'),
      emissiveIntensity: 1.4,
      roughness:         1,
      metalness:         0,
    });
    this.bodyGroup.add(new THREE.Mesh(coreGeo, coreMat));

    // corona layers — 4 BackSide spheres getting dimmer outward
    const coronaColors  = ['#ffcc00', '#ff8800', '#ff4400', '#cc2200'];
    const coronaRadii   = [1.50, 1.65, 1.84, 2.10];
    const coronaOpacity = [0.18, 0.10, 0.055, 0.025];
    coronaColors.forEach((col, i) => {
      const cGeo = new THREE.SphereGeometry(coronaRadii[i], 32, 32);
      const cMat = new THREE.MeshBasicMaterial({
        color: col, transparent: true, opacity: coronaOpacity[i],
        side: THREE.BackSide, depthWrite: false,
      });
      this.bodyGroup.add(new THREE.Mesh(cGeo, cMat));
    });

    // solar flare rings — tilted tori
    [
      { r: 1.7, tube: 0.04, rot: [0.4, 0.2, 0],    col: '#ffaa00', op: 0.18 },
      { r: 2.0, tube: 0.03, rot: [-0.3, 0.5, 0.1], col: '#ff6600', op: 0.12 },
      { r: 2.4, tube: 0.02, rot: [0.6, -0.3, 0.2], col: '#ff3300', op: 0.07 },
    ].forEach(f => {
      const tGeo = new THREE.TorusGeometry(f.r, f.tube, 8, 80);
      const tMat = new THREE.MeshBasicMaterial({ color: f.col, transparent: true, opacity: f.op });
      const t = new THREE.Mesh(tGeo, tMat);
      t.rotation.set(f.rot[0], f.rot[1], f.rot[2]);
      this.bodyGroup.add(t);
    });
  }

  // ─── moon textures ────────────────────────────────────────────────────────

  private makeMoonColorMap(): THREE.CanvasTexture {
    const S = 1024;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d')!;

    // base: radial gradient lighter on lit side
    const bg = ctx.createRadialGradient(S * 0.62, S * 0.38, 0, S * 0.5, S * 0.5, S * 0.75);
    bg.addColorStop(0,   '#ccd4dc');
    bg.addColorStop(0.45,'#9aa4b0');
    bg.addColorStop(1,   '#626e7a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, S, S);

    // fine surface noise
    for (let i = 0; i < 14000; i++) {
      const x = Math.random() * S, y = Math.random() * S;
      const r = 0.3 + Math.random() * 2.2;
      const v = 75 + Math.floor(Math.random() * 110);
      ctx.fillStyle = `rgba(${v},${v + 2},${v + 6},0.13)`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }

    // dark maria patches
    [
      { x: 0.33, y: 0.27, rx: 0.21, ry: 0.16 },
      { x: 0.65, y: 0.38, rx: 0.14, ry: 0.11 },
      { x: 0.19, y: 0.65, rx: 0.16, ry: 0.13 },
      { x: 0.75, y: 0.72, rx: 0.12, ry: 0.09 },
      { x: 0.50, y: 0.57, rx: 0.10, ry: 0.08 },
    ].forEach(m => {
      const gx = m.x * S, gy = m.y * S, gr = m.rx * S;
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      g.addColorStop(0,    'rgba(38, 46, 58, 0.72)');
      g.addColorStop(0.55, 'rgba(38, 46, 58, 0.30)');
      g.addColorStop(1,    'rgba(38, 46, 58, 0)');
      ctx.save();
      ctx.scale(1, m.ry / m.rx);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(gx, gy * (m.rx / m.ry), gr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // craters: shadow bowl + bright rim highlight
    [
      ...Array.from({ length: 5  }, () => 22 + Math.random() * 28),
      ...Array.from({ length: 14 }, () =>  8 + Math.random() * 16),
      ...Array.from({ length: 38 }, () =>  2 + Math.random() *  7),
    ].forEach(r => {
      const x = Math.random() * S, y = Math.random() * S;
      const sh = ctx.createRadialGradient(x, y, 0, x, y, r);
      sh.addColorStop(0,    'rgba(22, 28, 36, 0.82)');
      sh.addColorStop(0.48, 'rgba(22, 28, 36, 0.35)');
      sh.addColorStop(0.85, 'rgba(22, 28, 36, 0.06)');
      sh.addColorStop(1,    'rgba(22, 28, 36, 0)');
      ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();

      const hx = x - r * 0.3, hy = y - r * 0.3;
      const hl = ctx.createRadialGradient(hx, hy, 0, hx, hy, r * 0.52);
      hl.addColorStop(0,   'rgba(218, 228, 238, 0.65)');
      hl.addColorStop(0.6, 'rgba(218, 228, 238, 0.15)');
      hl.addColorStop(1,   'rgba(218, 228, 238, 0)');
      ctx.fillStyle = hl; ctx.beginPath(); ctx.arc(hx, hy, r * 0.52, 0, Math.PI * 2); ctx.fill();
    });

    return new THREE.CanvasTexture(c);
  }

  private makeMoonBumpMap(): THREE.CanvasTexture {
    const S = 512;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 150; i++) {
      const x = Math.random() * S, y = Math.random() * S, r = 1.5 + Math.random() * 24;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0,    '#222222');
      g.addColorStop(0.55, '#585858');
      g.addColorStop(0.88, '#bcbcbc');
      g.addColorStop(1,    '#808080');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    return new THREE.CanvasTexture(c);
  }

  // ─── sun texture ──────────────────────────────────────────────────────────

  private makeSunColorMap(): THREE.CanvasTexture {
    const S = 512;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d')!;

    // base radial: bright white-yellow core → deep orange edge
    const bg = ctx.createRadialGradient(S * 0.5, S * 0.5, 0, S * 0.5, S * 0.5, S * 0.5);
    bg.addColorStop(0,    '#fff8c0');
    bg.addColorStop(0.25, '#ffe040');
    bg.addColorStop(0.55, '#ff9900');
    bg.addColorStop(0.82, '#ff5500');
    bg.addColorStop(1,    '#cc2200');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, S, S);

    // solar granulation — convection cells
    for (let i = 0; i < 800; i++) {
      const x = Math.random() * S, y = Math.random() * S;
      const r = 5 + Math.random() * 18;
      const bright = Math.random() > 0.45;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      if (bright) {
        g.addColorStop(0,   'rgba(255, 248, 160, 0.52)');
        g.addColorStop(0.5, 'rgba(255, 200, 40,  0.18)');
      } else {
        g.addColorStop(0,   'rgba(160, 40, 0, 0.48)');
        g.addColorStop(0.5, 'rgba(160, 40, 0, 0.12)');
      }
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }

    // sunspots — dark magnetic regions
    for (let i = 0; i < 7; i++) {
      const x = S * 0.18 + Math.random() * S * 0.64;
      const y = S * 0.18 + Math.random() * S * 0.64;
      const r = 10 + Math.random() * 22;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0,   'rgba(30, 8, 0, 0.82)');
      g.addColorStop(0.5, 'rgba(80, 20, 0, 0.42)');
      g.addColorStop(1,   'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }

    return new THREE.CanvasTexture(c);
  }

  // ─── render loop ──────────────────────────────────────────────────────────

  private renderLoop(): void {
    const isLight = this.themeService.theme === 'light';
    // sun rotates faster and wobbles more
    const rotY = isLight ? 0.0022 : 0.0013;
    const rotX = isLight ? 0.0006 : 0.0003;

    const tick = () => {
      this.rafId = requestAnimationFrame(tick);

      this.bodyGroup.rotation.y += rotY + this.dragVelX;
      this.bodyGroup.rotation.x += rotX + this.dragVelY;
      this.dragVelX *= 0.93;
      this.dragVelY *= 0.93;

      this.camera.position.x += (this.mouseNX * 1.1  - this.camera.position.x) * 0.055;
      this.camera.position.y += (-this.mouseNY * 0.7 - this.camera.position.y) * 0.055;
      this.camera.lookAt(0, 0, 0);

      this.renderer.render(this.scene, this.camera);
    };
    tick();
  }

  // ─── scroll zoom ──────────────────────────────────────────────────────────

  private setupScrollZoom(): void {
    const wrapper = this.moonWrapperRef.nativeElement;
    ScrollTrigger.create({
      trigger: '#hero',
      start:   'top top',
      end:     'bottom top',
      scrub:   1.6,
      onUpdate: self => {
        const p = self.progress;
        wrapper.style.transform = `scale(${1 + p * 1.8})`;
        const op = p > 0.6 ? Math.max(0, 1 - (p - 0.6) / 0.4) : 1;
        wrapper.style.opacity = String(op);
      },
    });
  }

  // ─── drag ─────────────────────────────────────────────────────────────────

  private setupDrag(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('mousedown',  e => this.onDragStart(e.clientX, e.clientY));
    canvas.addEventListener('mousemove',  e => this.onDragMove(e.clientX, e.clientY));
    canvas.addEventListener('mouseup',    () => this.onDragEnd());
    canvas.addEventListener('mouseleave', () => this.onDragEnd());
    canvas.addEventListener('touchstart', e => { e.preventDefault(); this.onDragStart(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
    canvas.addEventListener('touchmove',  e => { e.preventDefault(); this.onDragMove(e.touches[0].clientX, e.touches[0].clientY); },  { passive: false });
    canvas.addEventListener('touchend',   () => this.onDragEnd());
  }

  private onDragStart(x: number, y: number): void {
    this.isDragging = true;
    this.prevMouse  = { x, y };
    this.dragVelX = this.dragVelY = 0;
    this.moonCanvasRef.nativeElement.style.cursor = 'grabbing';
  }

  private onDragMove(x: number, y: number): void {
    if (!this.isDragging) return;
    this.dragVelX = (x - this.prevMouse.x) * 0.007;
    this.dragVelY = (y - this.prevMouse.y) * 0.007;
    this.bodyGroup.rotation.y += this.dragVelX;
    this.bodyGroup.rotation.x += this.dragVelY;
    this.prevMouse = { x, y };
  }

  private onDragEnd(): void {
    this.isDragging = false;
    this.moonCanvasRef.nativeElement.style.cursor = 'grab';
  }

  // ─── resize ───────────────────────────────────────────────────────────────

  private onResize(): void {
    const canvas = this.moonCanvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width  || canvas.offsetWidth;
    const h = rect.height || canvas.offsetHeight;
    if (!w || !h) return;
    canvas.width  = Math.round(w * Math.min(devicePixelRatio, 2));
    canvas.height = Math.round(h * Math.min(devicePixelRatio, 2));
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  // ─── entrance ─────────────────────────────────────────────────────────────

  private animateEntrance(): void {
    gsap.timeline()
      .from('.intro',         { opacity: 0, y: 30,  duration: 1 })
      .from('.hero-title',    { opacity: 0, y: 60,  duration: 1 }, '-=0.5')
      .from('.hero-subtitle', { opacity: 0, y: 40,  duration: 1 }, '-=0.5')
      .from('.moon-wrapper',  { opacity: 0, scale: 0.7, duration: 1.8, ease: 'power3.out' }, '-=0.8');
  }

  downloadResume(): void {
    window.open(this.data.resume, '_blank');
  }

  private loadGLB(isLight: boolean): void {
    const loader = new GLTFLoader();

    const modelPath = isLight
      ? 'assets/models/sun.glb'
      : 'assets/models/moon.glb';

    loader.load(
      modelPath,

      (gltf) => {
        while (this.bodyGroup.children.length > 0)
          this.bodyGroup.remove(this.bodyGroup.children[0]);

        const model = gltf.scene;

        model.traverse((obj: any) => {
          if (obj.isMesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
            // recompute smooth vertex normals to remove hard-edge lines
            obj.geometry.computeVertexNormals();
            if (obj.material) {
              obj.material.flatShading = false;
              obj.material.side = THREE.FrontSide;
              obj.material.needsUpdate = true;
              if (isLight) {
                obj.material.emissive = new THREE.Color('#ff6600');
                obj.material.emissiveIntensity = 0.4;
              }
            }
          }
        });

        // center then normalize size
        const box = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        box.getCenter(center);
        model.position.sub(center);

        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        model.scale.setScalar(2.8 / maxDim);

        this.bodyGroup.add(model);
      },

      undefined,

      (error) => {
        console.error('Error loading GLB:', error);

        // fallback to procedural objects
        if (isLight) {
          this.buildSun();
        } else {
          this.buildMoon();
        }
      }
    );
  }
}
