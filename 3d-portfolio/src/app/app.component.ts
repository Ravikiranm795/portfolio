import { Component, OnInit } from '@angular/core';

import { HeroComponent } from './features/hero/hero.component';
import { AboutComponent } from './features/about/about.component';
import { SkillsComponent } from './features/skills/skills.component';
import { ProjectsComponent } from './features/projects/projects.component';
import { ExperienceComponent } from './features/experience/experience.component';
import { ContactComponent } from './features/contact/contact.component';
import { ThreeCanvasComponent } from './shared/components/three-canvas/three-canvas.component';
import { SmoothScrollService } from './core/services/smooth-scroll.service';
import { ThemeService } from './core/services/theme.service';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { StartupIdeasComponent } from './features/startup-ideas/startup-ideas.component';
import { NavbarComponent } from './layout/navbar/navbar.component';
gsap.registerPlugin(ScrollTrigger);
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    HeroComponent,
    AboutComponent,
    SkillsComponent,
    ProjectsComponent,
    ExperienceComponent,
    ContactComponent,
    ThreeCanvasComponent,
    StartupIdeasComponent,
    NavbarComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  constructor(
    private smoothScroll: SmoothScrollService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.themeService.initializeTheme();
    this.smoothScroll.init();
    setTimeout(() => {
      gsap.utils.toArray('.section-shell, .glass-panel, .project-card, .timeline-card, .idea-card, .skill-card').forEach((section: any) => {
        gsap.from(section, {
          opacity: 0,
          y: 80,

          duration: 1.1,
          ease: 'power3.out',

          scrollTrigger: {
            trigger: section,
            start: 'top 84%',
          },
        });
      });
    });

    gsap.to('.scroll-progress', {
      scaleX: 1,

      ease: 'none',

      scrollTrigger: {
        scrub: 0.3,
      },
    });
  }
}
