import { Component } from '@angular/core';

import { PORTFOLIO_DATA } from
'../../shared/data/portfolio.data';

@Component({
  selector: 'app-startup-ideas',
  standalone: true,
  imports: [],
  templateUrl:
    './startup-ideas.component.html',

  styleUrl:
    './startup-ideas.component.scss',
})
export class StartupIdeasComponent {
  ideas =
    PORTFOLIO_DATA.startupIdeas;
}