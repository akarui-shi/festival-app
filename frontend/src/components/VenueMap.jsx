import { Map, Placemark, YMaps } from '@pbe/react-yandex-maps';
import { buildYandexMapsQuery } from '../utils/config';

const VenueMap = ({ venueName, address, latitude, longitude, height = 320 }) => {
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  return (
    <div className="venue-map-wrap">
      <YMaps query={buildYandexMapsQuery()}>
        <Map
          state={{ center: [lat, lon], zoom: 15, controls: ['zoomControl'] }}
          width="100%"
          height={height}
          className="venue-map"
        >
          <Placemark
            geometry={[lat, lon]}
            properties={{
              balloonContentHeader: venueName || 'Площадка',
              balloonContentBody: address || 'Адрес не указан'
            }}
            options={{
              preset: 'islands#dotIcon',
              iconColor: '#111111'
            }}
          />
        </Map>
      </YMaps>
    </div>
  );
};

export default VenueMap;
