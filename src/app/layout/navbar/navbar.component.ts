import {
  AfterViewInit,
  Component,
  HostListener,
} from '@angular/core';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-navbar',
  imports: [],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements AfterViewInit {
  constructor(private themeService: ThemeService) {}
  activeSection = 'hero';

  navItems = [
    { id: 'hero', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'skills', label: 'Skills' },
    { id: 'experience', label: 'Experience' },
    { id: 'projects', label: 'Projects' },
    { id: 'startup-ideas', label: 'Startup Ideas' },
    { id: 'contact', label: 'Contact' },
  ];

  ngAfterViewInit(): void {
    this.updateActiveSection();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.updateActiveSection();
  }

  setActiveSection(sectionId: string): void {
    this.activeSection = sectionId;
  }

  private updateActiveSection(): void {
    const viewportMarker = window.scrollY + window.innerHeight * 0.35;

    const currentSection = this.navItems
      .map((item) => ({
        id: item.id,
        element: document.getElementById(item.id),
      }))
      .filter((item): item is { id: string; element: HTMLElement } =>
        Boolean(item.element)
      )
      .reverse()
      .find((item) => item.element.offsetTop <= viewportMarker);

    if (currentSection) {
      this.activeSection = currentSection.id;
    }
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
