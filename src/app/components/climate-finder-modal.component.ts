import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClimateFinderAnswers } from '../climate-finder';

@Component({
  selector: 'app-climate-finder-modal',
  imports: [FormsModule],
  templateUrl: './climate-finder-modal.component.html'
})
export class ClimateFinderModalComponent {
  readonly answers = input.required<ClimateFinderAnswers>();

  readonly answerChange = output<{ key: keyof ClimateFinderAnswers; value: ClimateFinderAnswers[keyof ClimateFinderAnswers] }>();
  readonly close = output<void>();
  readonly apply = output<void>();
}
