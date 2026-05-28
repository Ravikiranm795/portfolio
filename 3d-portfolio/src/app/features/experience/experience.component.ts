import { Component } from '@angular/core';

import { PORTFOLIO_DATA } from
'../../shared/data/portfolio.data';

@Component({
  selector: 'app-experience',
  standalone: true,
  imports: [],
  templateUrl: './experience.component.html',
  styleUrl: './experience.component.scss',
})
export class ExperienceComponent {
  experience =
    PORTFOLIO_DATA.experience;
}