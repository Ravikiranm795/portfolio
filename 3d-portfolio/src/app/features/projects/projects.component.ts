import { Component } from '@angular/core';

import { PORTFOLIO_DATA } from
'../../shared/data/portfolio.data';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss',
})
export class ProjectsComponent {
  projects =
    PORTFOLIO_DATA.projects;
}