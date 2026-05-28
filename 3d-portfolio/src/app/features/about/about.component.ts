import { Component } from '@angular/core';

import { PORTFOLIO_DATA } from '../../shared/data/portfolio.data';

@Component({
  selector: 'app-about',
  imports: [],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss'
})
export class AboutComponent {
  about = PORTFOLIO_DATA.about.trim();

  metrics = [
    { value: '4+', label: 'Years engineering enterprise products' },
    { value: '6', label: 'Core stacks across frontend and backend' },
    { value: 'AI', label: 'Product platforms and automation concepts' },
  ];
}
