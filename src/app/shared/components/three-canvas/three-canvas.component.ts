import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
} from '@angular/core';

import { ThreeEngineService } from '../../../three/services/three-engine.service';

@Component({
  selector: 'app-three-canvas',
  standalone: true,
  imports: [],
  templateUrl: './three-canvas.component.html',
  styleUrl: './three-canvas.component.scss',
})
export class ThreeCanvasComponent implements AfterViewInit {
  @ViewChild('canvasContainer')
  canvasRef!: ElementRef<HTMLCanvasElement>;

  constructor(private threeEngine: ThreeEngineService) {}

  ngAfterViewInit(): void {
    this.threeEngine.init(this.canvasRef.nativeElement);
  }
}