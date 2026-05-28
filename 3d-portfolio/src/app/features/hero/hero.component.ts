import {
  AfterViewInit,
  Component,
} from '@angular/core';

import gsap from 'gsap';

import { PORTFOLIO_DATA } from
'../../shared/data/portfolio.data';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss',
})
export class HeroComponent
  implements AfterViewInit {

  data = PORTFOLIO_DATA.personal;

  ngAfterViewInit(): void {
    const tl = gsap.timeline();

    tl.from('.intro', {
      opacity: 0,
      y: 30,
      duration: 1,
    })
      .from('.hero-title', {
        opacity: 0,
        y: 60,
        duration: 1,
      })
      .from('.hero-subtitle', {
        opacity: 0,
        y: 40,
        duration: 1,
      });
  }

  downloadResume(): void {
    window.open(this.data.resume, '_blank');
  }
}