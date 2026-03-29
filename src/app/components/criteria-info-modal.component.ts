import { Component, input, output } from '@angular/core';
import { CriterionDefinition } from '../types';

@Component({
  selector: 'app-criteria-info-modal',
  templateUrl: './criteria-info-modal.component.html'
})
export class CriteriaInfoModalComponent {
  readonly criteriaDefinitions = input<CriterionDefinition[]>([]);
  readonly close = output<void>();
}
