import { Injectable, NgZone } from '@angular/core';
import gsap from 'gsap';
import * as THREE from 'three';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';

import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';

import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
gsap.registerPlugin(ScrollTrigger);
@Injectable({
  providedIn: 'root',
})
export class ThreeEngineService {
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;
  composer!: EffectComposer;
  private animationFrameId = 0;

  constructor(private ngZone: NgZone) {}

  init(canvas: HTMLCanvasElement): void {
    this.ngZone.runOutsideAngular(() => {
      this.createScene();
      this.createCamera();
      this.createRenderer(canvas);
      this.setupPostProcessing();
      this.createLights();
      this.createObjects();
      this.setupScrollAnimations();
      this.animate();

      window.addEventListener('resize', () => this.onResize());

      window.addEventListener('mousemove', (event) => {
        const x = (event.clientX / window.innerWidth - 0.5) * 2;

        const y = (event.clientY / window.innerHeight - 0.5) * 2;

        gsap.to(this.camera.position, {
          x: x * 0.5,
          y: -y * 0.5,
          duration: 1.2,
          ease: 'power3.out',
        });
      });
    });
  }

  private createScene(): void {
    this.scene = new THREE.Scene();

    this.scene.background = null;

    this.scene.fog = new THREE.Fog('#020617', 8, 24);
  }

  private createCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.camera.position.set(0, 0, 6);
  }

  private createRenderer(canvas: HTMLCanvasElement): void {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.renderer.setClearColor(0x020617, 0);

    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    this.renderer.toneMappingExposure = 1.05;
  }

  private createLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);

    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8);

    directionalLight.position.set(5, 5, 5);

    this.scene.add(directionalLight);
    const purpleLight = new THREE.PointLight('#a855f7', 4.5, 20);

    purpleLight.position.set(2.2, 1.8, 3.2);

    this.scene.add(purpleLight);

    const blueLight = new THREE.PointLight('#0ea5e9', 4, 18);

    blueLight.position.set(4.8, -0.2, 2);

    this.scene.add(blueLight);
  }

  private createObjects(): void {
    const geometry = new THREE.TorusKnotGeometry(1, 0.3, 100, 16);

    const material = new THREE.MeshPhysicalMaterial({
      color: '#6d28d9',

      metalness: 0.9,

      roughness: 0.15,

      clearcoat: 1,

      clearcoatRoughness: 0.1,

      emissive: '#312e81',

      emissiveIntensity: 0.4,
    });

    const mesh = new THREE.Mesh(geometry, material);

    mesh.scale.set(0.94, 0.94, 0.94);

    mesh.position.set(2.25, 0.12, 0);

    mesh.name = 'main-object';

    this.scene.add(mesh);

    const ringGeometry = new THREE.TorusGeometry(2.2, 0.006, 16, 200);

    const ringMaterial = new THREE.MeshPhysicalMaterial({
      color: '#8b5cf6',
      transparent: true,
      opacity: 0.4,
      emissive: '#8b5cf6',
      emissiveIntensity: 0.3,
    });

    const ring = new THREE.Mesh(ringGeometry, ringMaterial);

    ring.rotation.x = 1.15;

    ring.position.set(2.25, 0.12, 0);

    ring.name = 'orbit-ring';

    this.scene.add(ring);

    const particlesGeometry = new THREE.BufferGeometry();

    const particlesCount = 1200;

    const posArray = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 20;
    }

    particlesGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(posArray, 3)
    );

    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.003,
      color: '#8b5cf6',
      transparent: true,
      opacity: 0.25,
    });

    const particlesMesh = new THREE.Points(
      particlesGeometry,
      particlesMaterial
    );

    particlesMesh.name = 'particles';

    this.scene.add(particlesMesh);

    const platformGeometry = new THREE.CylinderGeometry(1.45, 2.25, 0.34, 96);

    const platformMaterial = new THREE.MeshPhysicalMaterial({
      color: '#0b1025',
      metalness: 0.35,
      roughness: 0.48,
      clearcoat: 0.5,
      emissive: '#1d0f3f',
      emissiveIntensity: 0.24,
    });

    const platform = new THREE.Mesh(platformGeometry, platformMaterial);

    platform.position.set(2.25, -1.48, -0.32);

    platform.scale.set(1.3, 0.5, 0.36);

    platform.name = 'hero-platform';

    this.scene.add(platform);

    const accentMaterial = new THREE.MeshPhysicalMaterial({
      color: '#2563eb',
      metalness: 0.55,
      roughness: 0.28,
      clearcoat: 1,
      emissive: '#0f172a',
      emissiveIntensity: 0.35,
    });

    [
      { position: [3.55, 1.9, -0.8], scale: 0.26 },
      { position: [4.55, -0.2, -0.4], scale: 0.22 },
      { position: [1.05, -0.5, -1.1], scale: 0.07 },
    ].forEach((accent, index) => {
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(accent.scale, 32, 32),
        accentMaterial
      );

      orb.position.set(
        accent.position[0],
        accent.position[1],
        accent.position[2]
      );

      orb.name = `accent-orb-${index}`;

      this.scene.add(orb);
    });
  }

  private animate(): void {
    const clock = new THREE.Clock();

    const tick = () => {
      const elapsedTime = clock.getElapsedTime();

      const object = this.scene.getObjectByName('main-object');

      if (object) {
        object.rotation.x += 0.003;
        object.rotation.y += 0.005;

        object.position.y = 0.12 + Math.sin(elapsedTime) * 0.12;
      }

      const particles = this.scene.getObjectByName('particles');

      if (particles) {
        particles.rotation.y = elapsedTime * 0.02;
      }

      const ring = this.scene.getObjectByName('orbit-ring');

      if (ring) {
        ring.position.y = 0.12 + Math.sin(elapsedTime) * 0.12;
        ring.rotation.z += 0.002;
      }

      this.scene.children.forEach((child, index) => {
        if (child.name.includes('accent-orb')) {
          child.position.y += Math.sin(elapsedTime + index) * 0.0008;
          child.rotation.y += 0.004;
        }
      });

      this.composer.render();

      this.animationFrameId = requestAnimationFrame(tick);
    };

    tick();
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;

    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  private setupScrollAnimations(): void {
    const object = this.scene.getObjectByName('main-object');

    if (!object) return;

    gsap.to(this.camera.position, {
      z: 3,

      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    });

    gsap.to(object.rotation, {
      x: Math.PI * 2,
      y: Math.PI * 2,

      scrollTrigger: {
        trigger: '#about',
        start: 'top center',
        end: 'bottom center',
        scrub: true,
      },
    });

    gsap.to(this.camera.position, {
      x: 2,
      y: 1,
      z: 4,

      scrollTrigger: {
        trigger: '#skills',
        start: 'top center',
        end: 'bottom center',
        scrub: true,
      },
    });

    gsap.to(object.position, {
      x: -2,
      y: 1,

      scrollTrigger: {
        trigger: '#projects',
        start: 'top center',
        end: 'bottom center',
        scrub: true,
      },
    });

    gsap.to(this.camera.position, {
      x: 0,
      y: 0,
      z: 7,

      scrollTrigger: {
        trigger: '#contact',
        start: 'top center',
        end: 'bottom center',
        scrub: true,
      },
    });
  }
  private setupPostProcessing(): void {
    this.composer = new EffectComposer(this.renderer);

    const renderPass = new RenderPass(this.scene, this.camera);

    this.composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(
        window.innerWidth,
        window.innerHeight
      ),
      0.45,
      0.6,
      0.85
    );

    this.composer.addPass(bloomPass);
  }
}
