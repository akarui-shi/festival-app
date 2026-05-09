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
// Активная метка — золотисто-жёлтая, чтобы выделяться на тёплом фоне.
const MARKER_ACTIVE_COLOR = '#E8B14B';
const MARKER_ACTIVE_STROKE = '#A47214';
const CLUSTER_COLOR = '#B55F40';
const CLUSTER_STROKE = '#8B452C';

/**
 * Рисует SVG-метку, опционально с бейджем-цифрой в правом верхнем углу
 * (когда в одной точке несколько событий).
 */
function buildMarkerSvg(fill: string, stroke: string, scale = 1, count = 1): string {
  const baseW = 28;
  const baseH = 36;
  // Если есть бейдж — расширяем viewBox: кружок cx=6 r=8 у translate(baseW−4); правый край ≈ baseW + 10 + stroke.
  const padR = count > 1 ? 12 : 0;
  const padT = count > 1 ? 6 : 0;
  const vbW = baseW + padR;
  const vbH = baseH + padT;
  const w = Math.round(vbW * scale);
  const h = Math.round(vbH * scale);
  const badge = count > 1
    ? `<g transform="translate(${baseW - 4},${padT - 2})">` +
      `<circle cx="6" cy="6" r="8" fill="#FFFFFF" stroke="${stroke}" stroke-width="1.5"/>` +
      `<text x="6" y="9" text-anchor="middle" font-family="system-ui,sans-serif" font-size="9" font-weight="700" fill="${stroke}">${count > 99 ? '99+' : count}</text>` +
      `</g>`
    : '';
  // Сам пин рисуется со сдвигом на padT вниз внутри увеличенного viewBox.
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${vbW} ${vbH}">` +
    `<g transform="translate(0,${padT})">` +
    `<path d="M14 0C6.27 0 0 6.27 0 14c0 9.6 14 22 14 22S28 23.6 28 14C28 6.27 21.73 0 14 0z" fill="${fill}"/>` +
    `<path d="M14 1C6.82 1 1 6.82 1 14c0 9 13 21 13 21S27 23 27 14C27 6.82 21.18 1 14 1z" fill="none" stroke="${stroke}" stroke-width="1.5"/>` +
    `<circle cx="14" cy="13.5" r="5.5" fill="rgba(255,255,255,0.92)"/>` +
    `</g>` +
    badge +
    `</svg>`
  );
}

/**
 * Опции метки: можно передать active (увеличенная золотая) и count (число
 * событий в той же точке — рисуется бейдж).
 */
export function createPlacemarkOptions(opts?: { active?: boolean; count?: number }): Record<string, unknown> {
  const active = opts?.active ?? false;
  const count = Math.max(1, opts?.count ?? 1);
  const fill = active ? MARKER_ACTIVE_COLOR : MARKER_COLOR;
  const stroke = active ? MARKER_ACTIVE_STROKE : MARKER_STROKE;
  const scale = active ? 1.25 : 1;

  // Размеры в пикселях для правильного позиционирования в Яндекс.Картах.
  // Учитываем расширение viewBox под бейдж, чтобы кончик пина оставался в anchor-точке.
  const baseW = 28;
  const baseH = 36;
  const padR = count > 1 ? 12 : 0;
  const padT = count > 1 ? 6 : 0;
  const w = Math.round((baseW + padR) * scale);
  const h = Math.round((baseH + padT) * scale);
  // Anchor — кончик пина, который сдвинут на padT*scale вниз в SVG.
  const offsetX = -Math.round((baseW * scale) / 2);
  const offsetY = -h;

  const href = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(buildMarkerSvg(fill, stroke, scale, count))}`;

  return {
    iconLayout: 'default#image',
    iconImageHref: href,
    iconImageSize: [w, h],
    iconImageOffset: [offsetX, offsetY],
    hasBalloon: false,
    hasHint: true,
    zIndex: active ? 1000 : 100,
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
