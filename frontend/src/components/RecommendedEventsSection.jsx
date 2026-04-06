import { useCallback, useEffect, useRef, useState } from 'react';
import EventCard from './EventCard';
import Loader from './Loader';
import AlertMessage from './AlertMessage';
import EmptyState from './EmptyState';

const RecommendedEventsSection = ({
  title = 'Рекомендуем вам',
  events = [],
  isLoading = false,
  error = '',
  onCloseError,
  emptyMessage = 'Пока нет рекомендаций для показа.',
  onFavoriteClick,
  favoriteIds = [],
  favoriteActionEventId = null,
  action = null
}) => {
  const carouselRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const container = carouselRef.current;
    if (!container) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const maxScrollLeft = Math.max(container.scrollWidth - container.clientWidth, 0);
    setCanScrollLeft(container.scrollLeft > 8);
    setCanScrollRight(container.scrollLeft < maxScrollLeft - 8);
  }, []);

  useEffect(() => {
    updateScrollState();
  }, [events.length, updateScrollState]);

  useEffect(() => {
    const onResize = () => updateScrollState();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [updateScrollState]);

  const scrollByPage = (direction) => {
    const container = carouselRef.current;
    if (!container) {
      return;
    }
    const shift = Math.max(container.clientWidth * 0.86, 280);
    container.scrollBy({
      left: direction === 'right' ? shift : -shift,
      behavior: 'smooth'
    });
  };

  return (
    <section className="recommended-events">
      <div className="page-header-row recommended-events__header">
        <h2>{title}</h2>
        <div className="recommended-events__header-actions">
          {action}
          {!isLoading && !error && events.length > 0 && (
            <div className="recommended-events__controls">
              <button
                type="button"
                className="recommended-events__control-btn"
                onClick={() => scrollByPage('left')}
                disabled={!canScrollLeft}
                aria-label="Листать рекомендации влево"
              >
                {'<'}
              </button>
              <button
                type="button"
                className="recommended-events__control-btn"
                onClick={() => scrollByPage('right')}
                disabled={!canScrollRight}
                aria-label="Листать рекомендации вправо"
              >
                {'>'}
              </button>
            </div>
          )}
        </div>
      </div>

      {isLoading && <Loader text="Подбираем рекомендации..." />}
      {error && <AlertMessage type="error" message={error} onClose={onCloseError} />}
      {!isLoading && !error && events.length === 0 && <EmptyState message={emptyMessage} />}
      {!isLoading && !error && events.length > 0 && (
        <div
          ref={carouselRef}
          className="recommended-events__carousel"
          onScroll={updateScrollState}
        >
          {events.map((event) => (
            <div key={event.id} className="recommended-events__item">
              <EventCard
                event={event}
                onFavoriteClick={onFavoriteClick}
                favoriteButtonText={favoriteIds.includes(event.id) ? 'В избранном' : 'В избранное'}
                isFavoriteButtonLoading={favoriteActionEventId === event.id}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default RecommendedEventsSection;
