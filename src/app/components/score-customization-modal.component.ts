import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CriterionDefinition, CriterionState, MetricKey } from '../types';

@Component({
  selector: 'app-score-customization-modal',
  imports: [FormsModule],
  templateUrl: './score-customization-modal.component.html'
})
export class ScoreCustomizationModalComponent {
  readonly criteriaDefinitions = input<CriterionDefinition[]>([]);
  readonly criteriaState = input<Record<MetricKey, CriterionState>>({} as Record<MetricKey, CriterionState>);
  readonly presetNameDraft = input('');

  readonly close = output<void>();
  readonly presetNameDraftChange = output<string>();
  readonly enabledChange = output<{ metricKey: MetricKey; enabled: boolean }>();
  readonly weightChange = output<{ metricKey: MetricKey; rawWeight: string }>();
  readonly directionChange = output<{ metricKey: MetricKey; direction: 'minimize' | 'maximize' }>();
  readonly apply = output<void>();
  readonly save = output<void>();
}
