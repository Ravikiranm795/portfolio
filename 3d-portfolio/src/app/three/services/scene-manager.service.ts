import { Injectable } from '@angular/core';
import * as THREE from 'three';

@Injectable({ providedIn: 'root' })
export class SceneManagerService {

  private scene!: THREE.Scene;
  private currentTheme: 'dark' | 'light' = 'dark';

  private warpStars!: THREE.Points;
  private warpPositions!: Float32Array;
  private warpBaseSpeeds!: Float32Array;
  private warpSpeedMultiplier = 1;

  private starField!: THREE.Points;
  private galaxies: THREE.Points[] = [];
  private dust!: THREE.Points;
  private planets: { mesh: THREE.Mesh; orbitRadius: number; orbitSpeed: number; orbitAngle: number; orbitY: number }[] = [];

  // cosmic events
  private supernovas: { mesh: THREE.Mesh; born: number; life: number }[] = [];
  private shootingStars: { line: THREE.Line; born: number; life: number; vel: THREE.Vector3 }[] = [];
  private nextEventTime = 0;

  // mouse parallax — set from engine
  mouseX = 0;
  mouseY = 0;

  // separate parallax layers
  private layerNear!: THREE.Group;  // warp stars, dust — move most with mouse
  private layerMid!: THREE.Group;   // nebulae, planets
  private layerFar!: THREE.Group;   // star field, galaxies — barely move

  initializeScenes(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#00000a');
    this.scene.fog = new THREE.FogExp2('#00000a', 0.005);

    this.layerNear = new THREE.Group();
    this.layerMid  = new THREE.Group();
    this.layerFar  = new THREE.Group();

    this.scene.add(this.layerFar, this.layerMid, this.layerNear);

    this.createLights();
    this.createStarField();
    this.createWarpStars();
    this.createPlanets();
    this.createGalaxies();
    this.createCosmicDust();
  }

  setTheme(theme: 'dark' | 'light'): void {
    this.currentTheme = theme;
    this.applyThemeColors();
  }

  setRenderer(renderer: THREE.WebGLRenderer): void {
    this._renderer = renderer;
  }

  private _renderer?: THREE.WebGLRenderer;

  getActiveScene(): THREE.Scene {
    return this.scene;
  }

  setWarpSpeed(multiplier: number): void {
    this.warpSpeedMultiplier = multiplier;
  }

  tick(elapsed: number, delta: number): void {
    this.animateWarpStars(delta);
    this.animateGalaxies(elapsed);
    this.animateDust(elapsed);
    this.animatePlanets(elapsed);
    this.animateCosmicEvents(elapsed);
    this.scheduleCosmicEvent(elapsed);
    this.animateParallaxLayers();
  }

  // ─── circle texture ───────────────────────────────────────────────────────

  private makeCircleTexture(size = 64): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const r   = size / 2;
    const g   = ctx.createRadialGradient(r, r, 0, r, r, r);
    g.addColorStop(0,   'rgba(255,255,255,1)');
    g.addColorStop(0.45,'rgba(255,255,255,0.7)');
    g.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(r, r, r, 0, Math.PI * 2);
    ctx.fill();
    return new THREE.CanvasTexture(canvas);
  }

  // ─── lights ───────────────────────────────────────────────────────────────

  private createLights(): void {
    this.scene.add(new THREE.AmbientLight('#04040f', 4));

    const blue = new THREE.PointLight('#1a3aff', 5, 100);
    blue.position.set(-12, 6, -18);
    this.layerMid.add(blue);

    const purple = new THREE.PointLight('#6d28d9', 4, 90);
    purple.position.set(14, -5, -22);
    this.layerMid.add(purple);

    const teal = new THREE.PointLight('#0891b2', 3, 80);
    teal.position.set(0, 10, -10);
    this.layerMid.add(teal);
  }

  // ─── star field (far layer) ───────────────────────────────────────────────

  private createStarField(): void {
    const count  = 5000;
    const pos    = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const palette = [
      new THREE.Color('#ffffff'),
      new THREE.Color('#b0c8ff'),
      new THREE.Color('#ffd6a5'),
      new THREE.Color('#d4b6ff'),
      new THREE.Color('#a8f0e0'),
      new THREE.Color('#ffe4e1'),
    ];

    for (let i = 0; i < count; i++) {
      const r     = 80 + Math.random() * 160;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);

      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3]     = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.16,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      map: this.makeCircleTexture(),
      alphaTest: 0.01,
      depthWrite: false,
    });

    this.starField = new THREE.Points(geo, mat);
    this.starField.name = 'star-field';
    this.layerFar.add(this.starField);
  }

  // ─── warp stars (near layer) ──────────────────────────────────────────────

  private createWarpStars(): void {
    const count = 400;
    this.warpPositions  = new Float32Array(count * 3);
    this.warpBaseSpeeds = new Float32Array(count);

    for (let i = 0; i < count; i++) this.resetWarpStar(i, true);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.warpPositions, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.1,
      color: '#c8ddff',
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true,
      map: this.makeCircleTexture(),
      alphaTest: 0.01,
      depthWrite: false,
    });

    this.warpStars = new THREE.Points(geo, mat);
    this.warpStars.name = 'warp-stars';
    this.layerNear.add(this.warpStars);
  }

  private resetWarpStar(i: number, randomZ = false): void {
    const angle  = Math.random() * Math.PI * 2;
    const radius = 1.5 + Math.random() * 8;

    this.warpPositions[i * 3]     = Math.cos(angle) * radius;
    this.warpPositions[i * 3 + 1] = Math.sin(angle) * radius;
    this.warpPositions[i * 3 + 2] = randomZ ? (Math.random() - 0.5) * 90 : -80;

    // very slow — 0.06 to 0.16 units/sec at multiplier=1
    this.warpBaseSpeeds[i] = 0.06 + Math.random() * 0.10;
  }

  private animateWarpStars(delta: number): void {
    for (let i = 0; i < this.warpBaseSpeeds.length; i++) {
      this.warpPositions[i * 3 + 2] += this.warpBaseSpeeds[i] * this.warpSpeedMultiplier * delta;
      if (this.warpPositions[i * 3 + 2] > 14) this.resetWarpStar(i);
    }
    (this.warpStars.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  }

  // ─── planets (mid layer) ──────────────────────────────────────────────────

  private createPlanets(): void {
    const configs: {
      color: string; emissive: string; radius: number;
      pos: [number,number,number]; orbitRadius: number;
      orbitSpeed: number; orbitY: number; ring?: boolean; ringColor?: string;
    }[] = [
      { color: '#3a5a8a', emissive: '#0a1a2a', radius: 2.2,  pos: [-28, -4, -55], orbitRadius: 30, orbitSpeed: 0.0018, orbitY: -4,  ring: true,  ringColor: '#4a7aaa' },
      { color: '#8a4a2a', emissive: '#2a0a00', radius: 1.4,  pos: [ 32,  6, -70], orbitRadius: 36, orbitSpeed: 0.0012, orbitY:  6  },
      { color: '#2a6a4a', emissive: '#001a0a', radius: 1.8,  pos: [  8, -8, -85], orbitRadius: 42, orbitSpeed: 0.0008, orbitY: -8,  ring: true,  ringColor: '#3a8a5a' },
      { color: '#6a3a8a', emissive: '#1a0028', radius: 1.0,  pos: [-18, 10, -45], orbitRadius: 22, orbitSpeed: 0.0025, orbitY: 10  },
      { color: '#8a7a2a', emissive: '#1a1400', radius: 0.7,  pos: [ 20, -2, -38], orbitRadius: 24, orbitSpeed: 0.0030, orbitY: -2  },
    ];

    configs.forEach((cfg, idx) => {
      const geo = new THREE.SphereGeometry(cfg.radius, 32, 32);
      const mat = new THREE.MeshPhongMaterial({
        color: cfg.color,
        emissive: cfg.emissive,
        shininess: 18,
        specular: '#222244',
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...cfg.pos);
      mesh.name = `planet-${idx}`;

      if (cfg.ring) {
        const ringGeo = new THREE.TorusGeometry(cfg.radius * 1.7, cfg.radius * 0.18, 4, 80);
        const ringMat = new THREE.MeshBasicMaterial({
          color: cfg.ringColor!,
          transparent: true,
          opacity: 0.35,
          side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI * 0.42;
        mesh.add(ring);
      }

      this.layerMid.add(mesh);
      this.planets.push({
        mesh,
        orbitRadius: cfg.orbitRadius,
        orbitSpeed:  cfg.orbitSpeed,
        orbitAngle:  Math.random() * Math.PI * 2,
        orbitY:      cfg.orbitY,
      });
    });
  }

  private animatePlanets(elapsed: number): void {
    this.planets.forEach(p => {
      p.orbitAngle += p.orbitSpeed;
      p.mesh.position.x = Math.cos(p.orbitAngle) * p.orbitRadius;
      p.mesh.position.z = Math.sin(p.orbitAngle) * p.orbitRadius * 0.3 - 55;
      p.mesh.position.y = p.orbitY + Math.sin(elapsed * 0.05 + p.orbitAngle) * 1.5;
      p.mesh.rotation.y += 0.0008;
    });
  }

  // ─── galaxies (far layer) ─────────────────────────────────────────────────

  private createGalaxies(): void {
    const cfgs: { pos: [number,number,number]; color: string; count: number }[] = [
      { pos: [-24,  8, -90], color: '#3355ff', count: 350 },
      { pos: [ 26, -6,-105], color: '#ff5533', count: 280 },
      { pos: [  7, 15, -98], color: '#33ffcc', count: 220 },
    ];

    cfgs.forEach((cfg, idx) => {
      const pos = new Float32Array(cfg.count * 3);
      for (let i = 0; i < cfg.count; i++) {
        const arm   = Math.floor(Math.random() * 3);
        const angle = (arm / 3) * Math.PI * 2 + Math.random() * 0.9;
        const r     = Math.pow(Math.random(), 0.5) * 5;
        pos[i * 3]     = Math.cos(angle) * r + (Math.random() - 0.5) * 1.4;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
        pos[i * 3 + 2] = Math.sin(angle) * r + (Math.random() - 0.5) * 1.4;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

      const mat = new THREE.PointsMaterial({
        size: 0.07,
        color: cfg.color,
        transparent: true,
        opacity: 0.45,
        sizeAttenuation: true,
        map: this.makeCircleTexture(32),
        alphaTest: 0.01,
        depthWrite: false,
      });

      const galaxy = new THREE.Points(geo, mat);
      galaxy.position.set(...cfg.pos);
      galaxy.name = `galaxy-${idx}`;
      this.galaxies.push(galaxy);
      this.layerFar.add(galaxy);
    });
  }

  private animateGalaxies(elapsed: number): void {
    this.galaxies.forEach((g, i) => {
      g.rotation.y = elapsed * 0.008 * (i % 2 === 0 ? 1 : -1);
    });
  }

  // ─── cosmic dust (near layer) ─────────────────────────────────────────────

  private createCosmicDust(): void {
    const count = 1200;
    const pos   = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 50;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 25;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 70;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.035,
      color: '#5566aa',
      transparent: true,
      opacity: 0.15,
      sizeAttenuation: true,
      map: this.makeCircleTexture(16),
      alphaTest: 0.01,
      depthWrite: false,
    });

    this.dust = new THREE.Points(geo, mat);
    this.dust.name = 'cosmic-dust';
    this.layerNear.add(this.dust);
  }

  private animateDust(elapsed: number): void {
    this.dust.rotation.y = elapsed * 0.003;
    this.dust.rotation.x = elapsed * 0.001;
  }

  // ─── mouse parallax layers ────────────────────────────────────────────────

  private animateParallaxLayers(): void {
    // near layer moves most — gives strong depth feel
    this.layerNear.rotation.y += (this.mouseX * 0.25  - this.layerNear.rotation.y) * 0.05;
    this.layerNear.rotation.x += (-this.mouseY * 0.15 - this.layerNear.rotation.x) * 0.05;

    // mid layer moves moderately
    this.layerMid.rotation.y  += (this.mouseX * 0.12  - this.layerMid.rotation.y)  * 0.04;
    this.layerMid.rotation.x  += (-this.mouseY * 0.07 - this.layerMid.rotation.x)  * 0.04;

    // far layer barely moves — feels infinitely distant
    this.layerFar.rotation.y  += (this.mouseX * 0.03  - this.layerFar.rotation.y)  * 0.03;
    this.layerFar.rotation.x  += (-this.mouseY * 0.02 - this.layerFar.rotation.x)  * 0.03;
  }

  // ─── cosmic events ────────────────────────────────────────────────────────

  private scheduleCosmicEvent(elapsed: number): void {
    if (elapsed < this.nextEventTime) return;
    this.nextEventTime = elapsed + 5 + Math.random() * 8;
    Math.random() < 0.5 ? this.spawnSupernova() : this.spawnShootingStar();
  }

  private spawnSupernova(): void {
    const geo  = new THREE.SphereGeometry(0.06, 8, 8);
    const mat  = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 1 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      (Math.random() - 0.5) * 30,
      (Math.random() - 0.5) * 14,
      -12 - Math.random() * 28
    );
    this.layerMid.add(mesh);
    this.supernovas.push({ mesh, born: performance.now() / 1000, life: 2.8 });
  }

  private spawnShootingStar(): void {
    const start = new THREE.Vector3(
      (Math.random() - 0.5) * 40,
      6 + Math.random() * 10,
      -6 - Math.random() * 18
    );
    const dir = new THREE.Vector3(
      (Math.random() - 0.5) * 10,
      -3 - Math.random() * 5,
      Math.random() * 3
    );
    const end = start.clone().add(dir);
    const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
    const mat = new THREE.LineBasicMaterial({ color: '#ddeeff', transparent: true, opacity: 1 });
    const line = new THREE.Line(geo, mat);
    const vel  = dir.clone().normalize().multiplyScalar(0.28);
    this.layerNear.add(line);
    this.shootingStars.push({ line, born: performance.now() / 1000, life: 1.4, vel });
  }

  private animateCosmicEvents(elapsed: number): void {
    const now = performance.now() / 1000;

    this.supernovas = this.supernovas.filter(ev => {
      const t = (now - ev.born) / ev.life;
      if (t >= 1) {
        this.layerMid.remove(ev.mesh);
        ev.mesh.geometry.dispose();
        (ev.mesh.material as THREE.MeshBasicMaterial).dispose();
        return false;
      }
      ev.mesh.scale.setScalar(1 + t * 20);
      (ev.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - t;
      (ev.mesh.material as THREE.MeshBasicMaterial).color.setHSL(0.08 - t * 0.08, 1, 0.65 + t * 0.35);
      return true;
    });

    this.shootingStars = this.shootingStars.filter(ev => {
      const t = (now - ev.born) / ev.life;
      if (t >= 1) {
        this.layerNear.remove(ev.line);
        ev.line.geometry.dispose();
        (ev.line.material as THREE.LineBasicMaterial).dispose();
        return false;
      }
      ev.line.position.addScaledVector(ev.vel, 0.5);
      (ev.line.material as THREE.LineBasicMaterial).opacity = 1 - t;
      return true;
    });
  }

  // ─── theme ────────────────────────────────────────────────────────────────

  private applyThemeColors(): void {
    const lights = this.layerMid.children.filter(c => c instanceof THREE.PointLight) as THREE.PointLight[];
    const starMat = this.starField.material as THREE.PointsMaterial;
    const warpMat = this.warpStars.material as THREE.PointsMaterial;
    const dustMat = this.dust.material as THREE.PointsMaterial;

    this.layerFar.visible  = true;
    this.layerMid.visible  = true;
    this.layerNear.visible = true;

    if (this.currentTheme === 'light') {
      this.scene.background = new THREE.Color('#1a0500');
      this.scene.fog = new THREE.FogExp2('#1a0500', 0.004);
      this._renderer?.setClearColor('#1a0500', 1);

      if (lights[0]) { lights[0].color.set('#ff6600'); lights[0].intensity = 6; }
      if (lights[1]) { lights[1].color.set('#ff3300'); lights[1].intensity = 4; }
      if (lights[2]) { lights[2].color.set('#ffaa00'); lights[2].intensity = 4; }

      starMat.color.set('#ffd580'); starMat.opacity = 0.9; starMat.size = 0.15;
      warpMat.color.set('#ffcc66'); warpMat.opacity = 0.55;
      dustMat.color.set('#aa5500'); dustMat.opacity = 0.25;

      const lp = ['#aa4400', '#cc6600', '#882200', '#bb5500', '#993300'];
      this.planets.forEach((p, i) => {
        (p.mesh.material as THREE.MeshPhongMaterial).color.set(lp[i % lp.length]);
        (p.mesh.material as THREE.MeshPhongMaterial).emissive.set('#1a0500');
      });

      const lg = ['#ff6600', '#ffaa00', '#ff3300'];
      this.galaxies.forEach((g, i) => {
        (g.material as THREE.PointsMaterial).color.set(lg[i % lg.length]);
        (g.material as THREE.PointsMaterial).opacity = 0.55;
      });

    } else {
      this.scene.background = new THREE.Color('#00000a');
      this.scene.fog = new THREE.FogExp2('#00000a', 0.005);
      this._renderer?.setClearColor('#00000a', 1);

      if (lights[0]) { lights[0].color.set('#1a3aff'); lights[0].intensity = 5; }
      if (lights[1]) { lights[1].color.set('#6d28d9'); lights[1].intensity = 4; }
      if (lights[2]) { lights[2].color.set('#0891b2'); lights[2].intensity = 3; }

      starMat.color.set('#ffffff'); starMat.opacity = 0.9; starMat.size = 0.16;
      warpMat.color.set('#c8ddff'); warpMat.opacity = 0.5;
      dustMat.color.set('#5566aa'); dustMat.opacity = 0.15;

      const dp = ['#3a5a8a', '#8a4a2a', '#2a6a4a', '#6a3a8a', '#8a7a2a'];
      this.planets.forEach((p, i) => {
        (p.mesh.material as THREE.MeshPhongMaterial).color.set(dp[i % dp.length]);
        (p.mesh.material as THREE.MeshPhongMaterial).emissive.set('#0a1a2a');
      });

      const dg = ['#3355ff', '#ff5533', '#33ffcc'];
      this.galaxies.forEach((g, i) => {
        (g.material as THREE.PointsMaterial).color.set(dg[i % dg.length]);
        (g.material as THREE.PointsMaterial).opacity = 0.45;
      });
    }
  }
}
