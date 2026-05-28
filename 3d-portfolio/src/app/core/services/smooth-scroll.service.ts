import { Injectable, NgZone } from '@angular/core';

import Lenis from '@studio-freight/lenis';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

@Injectable({
  providedIn: 'root',
})
export class SmoothScrollService {
  private lenis!: Lenis;

  constructor(private ngZone: NgZone) {}

  init(): void {
    this.ngZone.runOutsideAngular(() => {
      this.lenis = new Lenis({
        lerp: 0.08,
        smoothWheel: true,
      });

      this.lenis.on('scroll', ScrollTrigger.update);

      gsap.ticker.add((time) => {
        this.lenis.raf(time * 1000);
      });

      gsap.ticker.lagSmoothing(0);
    });
  }

  get instance(): Lenis {
    return this.lenis;
  }
}