const EXTRA_CONTROLS_TO_REMOVE = [
  'searchControl',
  'routeButtonControl',
  'trafficControl',
  'typeSelector',
  'geolocationControl',
  'rulerControl',
];

export const YANDEX_MAP_MINIMAL_OPTIONS: Record<string, unknown> = {
  suppressMapOpenBlock: true,
  suppressObsoleteBrowserNotifier: true,
  yandexMapDisablePoiInteractivity: true,
  yandexMapAutoSwitch: false,
  yandexMapDisablePanoramas: true,
};

export function applyMinimalYandexMapUi(map: any): void {
  EXTRA_CONTROLS_TO_REMOVE.forEach((control) => {
    try {
      map.controls.remove(control);
    } catch {
      // control may be absent for this map instance
    }
  });

  try {
    map.options.set(YANDEX_MAP_MINIMAL_OPTIONS);
  } catch {
    // non-critical; keep map interactive even if an option is unsupported
  }
}
