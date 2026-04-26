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

// App primary: hsl(16 48% 48%) ≈ #B55F40, dark: hsl(16 52% 36%) ≈ #8B452C
const MARKER_COLOR = '#B55F40';
const MARKER_STROKE = '#8B452C';
const CLUSTER_COLOR = '#B55F40';
const CLUSTER_STROKE = '#8B452C';

function buildMarkerSvg(): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">` +
    `<path d="M14 0C6.27 0 0 6.27 0 14c0 9.6 14 22 14 22S28 23.6 28 14C28 6.27 21.73 0 14 0z" fill="${MARKER_COLOR}"/>` +
    `<path d="M14 1C6.82 1 1 6.82 1 14c0 9 13 21 13 21S27 23 27 14C27 6.82 21.18 1 14 1z" fill="none" stroke="${MARKER_STROKE}" stroke-width="1.5"/>` +
    `<circle cx="14" cy="13.5" r="5.5" fill="rgba(255,255,255,0.92)"/>` +
    `</svg>`
  );
}

const MARKER_HREF = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(buildMarkerSvg())}`;

export function createPlacemarkOptions(): Record<string, unknown> {
  return {
    iconLayout: 'default#image',
    iconImageHref: MARKER_HREF,
    iconImageSize: [28, 36],
    iconImageOffset: [-14, -36],
    hasBalloon: false,
    hasHint: true,
  };
}

export function createClustererOptions(ymaps: any): Record<string, unknown> {
  const ClusterLayout = ymaps.templateLayoutFactory.createClass(
    `<div style="width:36px;height:36px;background:${CLUSTER_COLOR};border:2.5px solid ${CLUSTER_STROKE};border-radius:50%;` +
    `display:flex;align-items:center;justify-content:center;` +
    `font:700 13px/1 system-ui,sans-serif;color:#fff;` +
    `box-shadow:0 2px 8px rgba(0,0,0,0.28);cursor:pointer">` +
    `$[properties.geoObjects.length]</div>`,
  );
  return {
    clusterIconLayout: ClusterLayout,
    clusterIconShape: { type: 'Circle', coordinates: [18, 18], radius: 18 },
    groupByCoordinates: false,
    hasBalloon: false,
  };
}
