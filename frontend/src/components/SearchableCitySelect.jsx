import { useEffect, useMemo, useState } from 'react';
import Loader from './Loader';
import ErrorMessage from './ErrorMessage';
import { cityService } from '../services/cityService';

const MIN_QUERY_LENGTH = 2;

const SearchableCitySelect = ({
  label = 'Город',
  placeholder = 'Введите название города',
  selectedCity = null,
  onSelect,
  onClear,
  disabled = false
}) => {
  const [query, setQuery] = useState(selectedCity?.name || '');
  const [options, setOptions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setQuery(selectedCity?.name || '');
  }, [selectedCity?.id, selectedCity?.name]);

  const canSearch = useMemo(() => query.trim().length >= MIN_QUERY_LENGTH, [query]);

  useEffect(() => {
    if (!isOpen || !canSearch) {
      setOptions([]);
      return;
    }

    let isActive = true;
    const timer = setTimeout(async () => {
      try {
        setIsLoading(true);
        setError('');
        const response = await cityService.searchCities({ q: query.trim(), limit: 25 });
        if (isActive) {
          setOptions(Array.isArray(response) ? response : []);
        }
      } catch (err) {
        if (isActive) {
          setError(err.message || 'Не удалось загрузить города.');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }, 250);

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [isOpen, canSearch, query]);

  return (
    <div className="searchable-city-select">
      <label>
        {label}
        <div className="searchable-city-select__control">
          <input
            type="text"
            value={query}
            placeholder={placeholder}
            disabled={disabled}
            onFocus={() => setIsOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsOpen(true);
            }}
            onBlur={() => {
              setTimeout(() => setIsOpen(false), 120);
            }}
          />
          {selectedCity && (
            <button
              type="button"
              className="btn btn--ghost searchable-city-select__clear"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setQuery('');
                onClear?.();
              }}
              disabled={disabled}
            >
              Очистить
            </button>
          )}
        </div>
      </label>

      {error && <ErrorMessage message={error} />}
      {isOpen && (
        <div className="searchable-city-select__dropdown">
          {!canSearch && <p className="muted">Введите минимум 2 символа для поиска.</p>}
          {canSearch && isLoading && <Loader text="Ищем города..." />}
          {canSearch && !isLoading && options.length === 0 && <p className="muted">Города не найдены.</p>}
          {canSearch && !isLoading && options.length > 0 && (
            <ul className="searchable-city-select__list">
              {options.map((city) => (
                <li key={city.id}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onSelect?.(city);
                      setQuery(city.name);
                      setIsOpen(false);
                    }}
                  >
                    <span>{city.name}</span>
                    <small>{[city.region, city.country].filter(Boolean).join(', ')}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableCitySelect;
