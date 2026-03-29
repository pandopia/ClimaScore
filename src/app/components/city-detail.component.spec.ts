import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CityDetailComponent } from './city-detail.component';

const originalMatchMedia = globalThis.matchMedia;

function setMatchMedia(matches: boolean) {
  Object.defineProperty(globalThis, 'matchMedia', {
    configurable: true,
    writable: true,
    value: () => ({
      matches,
      addEventListener() {},
      removeEventListener() {}
    })
  });
}

function restoreMatchMedia() {
  if (originalMatchMedia) {
    Object.defineProperty(globalThis, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia
    });
    return;
  }

  delete (globalThis as { matchMedia?: typeof globalThis.matchMedia }).matchMedia;
}

async function createComponent(matches: boolean) {
  setMatchMedia(matches);
  await TestBed.configureTestingModule({
    imports: [CityDetailComponent]
  }).compileComponents();

  return TestBed.createComponent(CityDetailComponent).componentInstance;
}

function createAnchor() {
  const anchor = document.createElement('button');
  vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue({
    x: 120,
    y: 240,
    width: 24,
    height: 24,
    top: 240,
    right: 144,
    bottom: 264,
    left: 120,
    toJSON() {
      return {};
    }
  } as DOMRect);
  return anchor;
}

describe('CityDetailComponent', () => {
  afterEach(() => {
    restoreMatchMedia();
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it('uses a hover preview on fine pointers', async () => {
    const component = await createComponent(true);

    component.showTrendPreview('sunnyDaysAvg', createAnchor());

    expect(component.prefersHoverTrend()).toBe(true);
    expect(component.hoverTrend()?.metricKey).toBe('sunnyDaysAvg');

    component.openTrend('sunnyDaysAvg', new Event('click'));

    expect(component.trendMetricKey()).toBeNull();
  });

  it('falls back to click on touch devices', async () => {
    const component = await createComponent(false);

    component.showTrendPreview('sunnyDaysAvg', createAnchor());

    expect(component.prefersHoverTrend()).toBe(false);
    expect(component.hoverTrend()).toBeNull();

    component.openTrend('sunnyDaysAvg', new Event('click'));

    expect(component.trendMetricKey()).toBe('sunnyDaysAvg');
  });
});
