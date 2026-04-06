import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import AlertMessage from '../components/AlertMessage';
import EmptyState from '../components/EmptyState';
import Loader from '../components/Loader';
import AnalyticsKpiCard from '../components/organizer-analytics/AnalyticsKpiCard';
import { organizerAnalyticsService } from '../services/organizerAnalyticsService';
import { toUserErrorMessage } from '../utils/errorMessages';

const PERIOD_OPTIONS = [
  { value: 7, label: '7 дней' },
  { value: 30, label: '30 дней' },
  { value: 90, label: '90 дней' }
];

const SOURCE_COLORS = ['#8b4c3f', '#5c6b5a', '#c4864d', '#497a8d', '#937566', '#a05d52'];

const formatNumber = (value) => new Intl.NumberFormat('ru-RU').format(Number(value || 0));

const formatRating = (value) => {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric.toFixed(1) : '0.0';
};

const toIsoDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toShortDate = (isoDate) => {
  if (!isoDate) return '';
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
};

const buildPeriodParams = (days) => {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - Number(days || 30) + 1);
  return {
    from: toIsoDate(from),
    to: toIsoDate(to)
  };
};

const OrganizerEventAnalyticsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [periodDays, setPeriodDays] = useState(30);
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isCancelled = false;

    const loadAnalytics = async () => {
      try {
        setIsLoading(true);
        setError('');
        const data = await organizerAnalyticsService.getEventAnalytics(id, buildPeriodParams(periodDays));
        if (!isCancelled) {
          setAnalytics(data || null);
        }
      } catch (err) {
        if (isCancelled) {
          return;
        }
        setError(toUserErrorMessage(err, 'Не удалось загрузить аналитику мероприятия.'));
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadAnalytics();
    return () => {
      isCancelled = true;
    };
  }, [id, periodDays]);

  const engagement = analytics?.engagement || null;
  const traffic = analytics?.traffic || null;

  const trendData = useMemo(() => {
    const visits = Array.isArray(traffic?.visitsByDay) ? traffic.visitsByDay : [];
    const registrations = Array.isArray(engagement?.registrationsByDay) ? engagement.registrationsByDay : [];
    const registrationsByDate = new Map(registrations.map((item) => [item.date, Number(item.value || 0)]));

    if (visits.length === 0 && registrations.length === 0) {
      return [];
    }

    const sourceRows = visits.length > 0 ? visits : registrations;
    return sourceRows.map((item) => ({
      shortDate: toShortDate(item.date),
      visits: Number(item.value || 0),
      registrations: registrationsByDate.get(item.date) ?? 0
    }));
  }, [engagement, traffic]);

  const trafficSourceData = useMemo(() => {
    const rows = Array.isArray(traffic?.trafficSources) ? traffic.trafficSources : [];
    return rows.map((item) => ({
      source: item.source || 'Не определено',
      visits: Number(item.visits || 0),
      sharePercent: Number(item.sharePercent || 0)
    }));
  }, [traffic]);

  const sessionLoadData = useMemo(() => {
    const rows = Array.isArray(engagement?.sessionLoads) ? engagement.sessionLoads : [];
    return rows.map((item, index) => ({
      id: item.sessionId || index,
      label: item.label || `Сеанс #${item.sessionId || index + 1}`,
      shortLabel:
        String(item.label || '').length > 34 ? `${String(item.label || '').slice(0, 34)}...` : String(item.label || ''),
      activeParticipants: Number(item.activeParticipants || 0),
      occupancyPercent: Number(item.occupancyPercent || 0)
    }));
  }, [engagement]);

  const metrika = traffic?.metrika || null;

  if (isLoading) {
    return (
      <section className="container page">
        <Loader text="Загружаем аналитику мероприятия..." />
      </section>
    );
  }

  if (error && !analytics) {
    return (
      <section className="container page">
        <AlertMessage type="error" message={error} onClose={() => setError('')} />
      </section>
    );
  }

  if (!analytics || !engagement) {
    return (
      <section className="container page">
        <EmptyState message="Аналитика мероприятия пока недоступна." />
      </section>
    );
  }

  return (
    <section className="container page organizer-event-analytics-page">
      <div className="page-header-row">
        <h1>Аналитика мероприятия: {engagement.eventTitle}</h1>
        <div className="inline-actions">
          <button type="button" className="btn btn--ghost" onClick={() => navigate('/organizer')}>
            Назад в кабинет
          </button>
          <button type="button" className="btn btn--primary" onClick={() => navigate(`/organizer/events/${id}/sessions`)}>
            К сеансам
          </button>
        </div>
      </div>

      <p className="page-subtitle">Сводка внутренних показателей и внешнего трафика по странице мероприятия.</p>

      {error && <AlertMessage type="error" message={error} onClose={() => setError('')} />}

      <div className="organizer-analytics__period organizer-analytics__period--page">
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`period-chip ${periodDays === option.value ? 'period-chip--active' : ''}`}
            onClick={() => setPeriodDays(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="organizer-analytics__kpi-grid">
        <AnalyticsKpiCard label="Просмотры" value={formatNumber(traffic?.pageViews)} accent="primary" />
        <AnalyticsKpiCard label="Уникальные посетители" value={formatNumber(traffic?.uniqueVisitors)} accent="accent" />
        <AnalyticsKpiCard label="Регистрации" value={formatNumber(engagement.registrationsCount)} accent="warm" />
        <AnalyticsKpiCard label="Активные участники" value={formatNumber(engagement.activeParticipants)} />
        <AnalyticsKpiCard label="Избранное" value={formatNumber(engagement.favoritesCount)} />
        <AnalyticsKpiCard label="Средняя оценка" value={formatRating(engagement.averageRating)} hint="по отзывам" />
      </div>

      {metrika && !metrika.available && (
        <AlertMessage type="warning" message={metrika.message || 'Внешняя аналитика временно недоступна.'} />
      )}

      {metrika && metrika.available && Array.isArray(metrika.warnings) && metrika.warnings.length > 0 && (
        <AlertMessage type="info" message={metrika.warnings.join(' ')} />
      )}

      <div className="organizer-analytics__summary-grid">
        <article className="analytics-summary-card">
          <p className="analytics-summary-card__label">Отмены</p>
          <p className="analytics-summary-card__value">{formatNumber(engagement.cancellationsCount)}</p>
        </article>
        <article className="analytics-summary-card">
          <p className="analytics-summary-card__label">Сеансов</p>
          <p className="analytics-summary-card__value">{formatNumber(engagement.sessionsCount)}</p>
        </article>
        <article className="analytics-summary-card">
          <p className="analytics-summary-card__label">Средняя заполняемость</p>
          <p className="analytics-summary-card__value">{formatNumber(engagement.averageSessionOccupancyPercent)}%</p>
        </article>
        <article className="analytics-summary-card">
          <p className="analytics-summary-card__label">Отзывов</p>
          <p className="analytics-summary-card__value">{formatNumber(engagement.reviewsCount)}</p>
        </article>
      </div>

      <div className="organizer-analytics__charts-grid">
        <article className="analytics-chart-card analytics-chart-card--wide">
          <div className="analytics-chart-card__head">
            <h3>Динамика посещений и регистраций</h3>
          </div>
          {trendData.length === 0 ? (
            <EmptyState message="Недостаточно данных для графика динамики." />
          ) : (
            <div className="analytics-chart-card__body">
              <ResponsiveContainer width="100%" height={290}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ebe3d8" />
                  <XAxis dataKey="shortDate" tick={{ fill: '#6b635a', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#6b635a', fontSize: 12 }} />
                  <Tooltip formatter={(value) => formatNumber(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="visits" stroke="#8b4c3f" strokeWidth={2.5} dot={false} name="Просмотры" />
                  <Line type="monotone" dataKey="registrations" stroke="#5c6b5a" strokeWidth={2.5} dot={false} name="Регистрации" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <article className="analytics-chart-card">
          <div className="analytics-chart-card__head">
            <h3>Источники трафика</h3>
          </div>
          {!metrika?.available ? (
            <EmptyState message="Нет подключенных данных Метрики для источников трафика." />
          ) : trafficSourceData.length === 0 ? (
            <EmptyState message="Нет данных по источникам за выбранный период." />
          ) : (
            <div className="analytics-chart-card__body">
              <ResponsiveContainer width="100%" height={290}>
                <PieChart>
                  <Pie data={trafficSourceData} dataKey="visits" nameKey="source" outerRadius={96} innerRadius={54}>
                    {trafficSourceData.map((entry, index) => (
                      <Cell key={`${entry.source}-${index}`} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, _, payload) => [`${formatNumber(value)} (${payload?.payload?.sharePercent || 0}%)`, 'Визиты']} />
                  <Legend formatter={(value) => String(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <article className="analytics-chart-card">
          <div className="analytics-chart-card__head">
            <h3>Загрузка по сеансам</h3>
          </div>
          {sessionLoadData.length === 0 ? (
            <EmptyState message="Сеансы не найдены." />
          ) : (
            <div className="analytics-chart-card__body">
              <ResponsiveContainer width="100%" height={290}>
                <BarChart data={sessionLoadData} margin={{ top: 12, right: 8, left: 0, bottom: 22 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ebe3d8" />
                  <XAxis dataKey="shortLabel" tick={{ fill: '#6b635a', fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fill: '#6b635a', fontSize: 12 }} />
                  <Tooltip
                    formatter={(value, key) => [
                      formatNumber(value),
                      key === 'activeParticipants' ? 'Активные участники' : 'Заполняемость, %'
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="activeParticipants" fill="#8b4c3f" name="Активные участники" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="occupancyPercent" fill="#5c6b5a" name="Заполняемость, %" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>
      </div>
    </section>
  );
};

export default OrganizerEventAnalyticsPage;
