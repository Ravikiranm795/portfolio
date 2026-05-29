import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { SceneManagerService } from
'../../three/services/scene-manager.service';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {

  private currentTheme: 'dark' | 'light' = 'dark';
  readonly themeChange$ = new Subject<'dark' | 'light'>();

  constructor(
    private sceneManager:
      SceneManagerService
  ) {}

  get theme() {
    return this.currentTheme;
  }

  initializeTheme(): void {
    this.applyTheme(this.currentTheme);
  }

  toggleTheme(): void {

    this.currentTheme =
      this.currentTheme === 'dark'
        ? 'light'
        : 'dark';

    this.applyTheme(this.currentTheme);
  }

  private applyTheme(theme: 'dark' | 'light'): void {

    document.body.setAttribute(
      'data-theme',
      theme
    );

    document.documentElement.setAttribute(
      'data-theme',
      theme
    );

    this.sceneManager.setTheme(theme);
    this.themeChange$.next(theme);
  }
}
