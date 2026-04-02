const CitySelector = ({
  selectedCity,
  suggestedCity,
  isLoading = false,
  onClick
}) => {
  const cityName = (selectedCity?.name || suggestedCity?.name || '').trim();
  const displayValue = cityName || 'Выбрать город';

  return (
    <button
      type="button"
      className="header-city-switch"
      onClick={onClick}
      disabled={isLoading}
      aria-label={cityName ? `Текущий город: ${cityName}` : 'Выбрать город'}
      title={displayValue}
    >
      <span className="header-city-switch__value">{displayValue}</span>
    </button>
  );
};

export default CitySelector;
