import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

const VenueMap = ({ venueName, address, latitude, longitude }) => {
  const position = [latitude, longitude];

  return (
    <div className="venue-map-wrap">
      <MapContainer center={position} zoom={15} scrollWheelZoom={false} className="venue-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}>
          <Popup>
            <strong>{venueName}</strong>
            <br />
            {address || 'Адрес не указан'}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default VenueMap;
