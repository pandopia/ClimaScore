import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ScorePreset } from '../types';

@Component({
  selector: 'app-controls-panel',
  imports: [FormsModule],
  templateUrl: './controls-panel.component.html'
})
export class ControlsPanelComponent {
  readonly criteriaAvailable = input(false);
  readonly activeCriteriaCount = input(0);
  readonly query = input('');
  readonly showOnlyFavorites = input(false);
  readonly favoriteCount = input(0);
  readonly presets = input<ScorePreset[]>([]);
  readonly selectedPresetId = input('');
  readonly presetFeedback = input<string | null>(null);
  readonly presetFeedbackKind = input<'success' | 'error' | null>(null);

  readonly criteriaInfoOpen = output<void>();
  readonly queryChange = output<string>();
  readonly showOnlyFavoritesChange = output<boolean>();
  readonly presetSelect = output<string>();
  readonly presetDelete = output<string>();
  readonly scoreCustomizationOpen = output<void>();
  readonly climateFinderOpen = output<void>();

  canDeletePreset(preset: ScorePreset) {
    return !preset.isDefault && preset.id.startsWith('saved-');
  }

  deletePreset(presetId: string, event: Event) {
    event.stopPropagation();
    this.presetDelete.emit(presetId);
  }
}
