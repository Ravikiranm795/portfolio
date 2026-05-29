import { Injectable, NgZone } from '@angular/core';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SceneManagerService } from './scene-manager.service';

@Injectable({ providedIn: 'root' })
export class ThreeEngineService {

  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;
  composer!: EffectComposer;

  // mouse target in world units
  private targetX = 0;
  private targetY = 0;

  // scroll warp
  private lastScrollY    = 0;
  private scrollVelocity = 0;
  private warpMultiplier = 1;

  constructor(
    private ngZone: NgZone,
    private sceneManager: SceneManagerService
  ) {}

  init(canvas: HTMLCanvasElement): void {
    this.ngZone.runOutsideAngular(() => {
      this.sceneManager.initializeScenes();
      this.createCamera();
      this.createRenderer(canvas);
      this.sceneManager.setRenderer(this.renderer);
      this.setupPostProcessing();
      this.setupScrollWarp();
      this.setupMouseTracking();
      this.animate();
      window.addEventListener('resize', () => this.onResize());
    });
  }

  private createCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    this.camera.position.set(0, 0, 9);
  }

  private createRenderer(canvas: HTMLCanvasElement): void {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor('#00000a', 1);
  }

  private setupPostProcessing(): void {
    const scene = this.sceneManager.getActiveScene();
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(scene, this.camera));

    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.2,   // strength
      0.55,  // radius
      0.75   // threshold
    );
    this.composer.addPass(bloom);
  }

  private setupScrollWarp(): void {
    window.addEventListener('scroll', () => {
      const current = window.scrollY;
      this.scrollVelocity = Math.abs(current - this.lastScrollY);
      this.lastScrollY    = current;
    }, { passive: true });
  }

  private setupMouseTracking(): void {
    window.addEventListener('mousemove', (e) => {
      // wider range — camera moves ±2.8 on X, ±1.8 on Y
      this.targetX = ((e.clientX / window.innerWidth)  - 0.5) * 5.6;
      this.targetY = ((e.clientY / window.innerHeight) - 0.5) * -3.6;

      this.sceneManager.mouseX = (e.clientX / window.innerWidth)  - 0.5;
      this.sceneManager.mouseY = (e.clientY / window.innerHeight) - 0.5;
    });
  }

  private animate(): void {
    const clock = new THREE.Clock();
    let prev = 0;

    const tick = () => {
      const elapsed = clock.getElapsedTime();
      const delta   = elapsed - prev;
      prev = elapsed;

      // scroll → warp multiplier: idle=1, max ~20 on fast scroll
      this.warpMultiplier += (1 + Math.min(this.scrollVelocity * 0.7, 19) - this.warpMultiplier) * 0.07;
      this.scrollVelocity *= 0.80;
      this.sceneManager.setWarpSpeed(this.warpMultiplier);

      this.sceneManager.tick(elapsed, delta);

      // camera smoothly chases mouse with stronger lerp for snappier feel
      this.camera.position.x += (this.targetX - this.camera.position.x) * 0.055;
      this.camera.position.y += (this.targetY + Math.sin(elapsed * 0.18) * 0.12 - this.camera.position.y) * 0.055;

      // look at a point slightly in front so angle changes are visible
      this.camera.lookAt(0, 0, -8);

      this.composer.render();
      requestAnimationFrame(tick);
    };

    tick();
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }
}
