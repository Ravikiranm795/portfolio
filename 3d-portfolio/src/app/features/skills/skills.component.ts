import { Component } from '@angular/core';

import { PORTFOLIO_DATA } from '../../shared/data/portfolio.data';

@Component({
  selector: 'app-skills',
  imports: [],
  templateUrl: './skills.component.html',
  styleUrl: './skills.component.scss'
})
export class SkillsComponent {
  skills = PORTFOLIO_DATA.skills;

  pillars = [
    {
      title: 'Frontend Architecture',
      copy: 'Standalone Angular systems, RxJS flows, design systems, and scalable feature boundaries.',
    },
    {
      title: 'Cinematic Interaction',
      copy: 'Three.js scenes, GSAP timelines, scroll choreography, and premium motion restraint.',
    },
    {
      title: 'Product Engineering',
      copy: 'API integration, backend collaboration, CI pipelines, and AI platform concept execution.',
    },
  ];
}
