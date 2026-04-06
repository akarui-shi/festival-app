import { useEffect, useMemo, useState } from 'react';
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
import AlertMessage from '../AlertMessage';
import EmptyState from '../EmptyState';
import Loader from '../Loader';
import { organizerAnalyticsService } from '../../services/organizerAnalyticsService';
import { toUserErrorMessage } from '../../utils/errorMessages';
import AnalyticsKpiCard from './AnalyticsKpiCard';

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

const OrganizerAnalyticsOverviewSection = () => {
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
        const data = await organizerAnalyticsService.getOverview(buildPeriodParams(periodDays));
        if (!isCancelled) {
          setAnalytics(data || null);
        }
      } catch (err) {
        if (isCancelled) {
          return;
        }
        setError(toUserErrorMessage(err, 'Не удалось загрузить аналитику организатора.'));
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
  }, [periodDays]);

  const trendData = useMemo(() => {
    const visits = Array.isArray(analytics?.visitsByDay) ? analytics.visitsByDay : [];
    const registrations = Array.isArray(analytics?.registrationsByDay) ? analytics.registrationsByDay : [];
    const registrationsByDate = new Map(registrations.map((item) => [item.date, Number(item.value || 0)]));

    if (visits.length === 0 && registrations.length === 0) {
      return [];
    }

    const sourceRows = visits.length > 0 ? visits : registrations;
    return sourceRows.map((item) => ({
      date: item.date,
      shortDate: toShortDate(item.date),
      visits: Number(item.value || 0),
      registrations: registrationsByDate.get(item.date) ?? 0
    }));
  }, [analytics]);

  const trafficSourceData = useMemo(() => {
    const rows = Array.isArray(analytics?.trafficSources) ? analytics.trafficSources : [];
    return rows.map((item) => ({
      source: item.source || 'Не определено',
      visits: Number(item.visits || 0),
      sharePercent: Number(item.sharePercent || 0)
    }));
  }, [analytics]);

  const sessionLoadData = useMemo(() => {
    const rows = Array.isArray(analytics?.sessionLoads) ? analytics.sessionLoads : [];
    return rows.map((item, index) => ({
      id: item.sessionId || index,
      label: item.label || `Сеанс #${item.sessionId || index + 1}`,
      shortLabel:
        String(item.label || '').length > 34 ? `${String(item.label || '').slice(0, 34)}...` : String(item.label || ''),
      activeParticipants: Number(item.activeParticipants || 0),
      occupancyPercent: Number(item.occupancyPercent || 0)
    }));
  }, [analytics]);

  const metrika = analytics?.metrika || null;

  return (
    <section className="panel organizer-analytics">
      <div className="organizer-analytics__header">
        <div>
          <h2>Аналитика кабинета</h2>
          <p className="organizer-analytics__subtitle">Внутренние метрики системы и данные Яндекс Метрики в едином дашборде.</p>
        </div>
        <div className="organizer-analytics__period">
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
      </div>

      {isLoading && <Loader text="Загружаем расширенную аналитику..." />}
      {error && !isLoading && <AlertMessage type="error" message={error} onClose={() => setError('')} />}

      {!isLoading && !error && !analytics && <EmptyState message="Аналитика пока недоступна." />}

      {!isLoading && !error && analytics && (
        <>
          <div className="organizer-analytics__kpi-grid">
            <AnalyticsKpiCard label="Просмотры" value={formatNumber(analytics?.kpi?.pageViews)} accent="primary" />
            <AnalyticsKpiCard label="Уникальные посетители" value={formatNumber(analytics?.kpi?.uniqueVisitors)} accent="accent" />
            <AnalyticsKpiCard label="Регистрации" value={formatNumber(analytics?.kpi?.registrations)} accent="warm" />
            <AnalyticsKpiCard label="Активные участники" value={formatNumber(analytics?.kpi?.activeParticipants)} />
            <AnalyticsKpiCard label="Избранное" value={formatNumber(analytics?.kpi?.favorites)} />
            <AnalyticsKpiCard label="Средняя оценка" value={formatRating(analytics?.kpi?.averageRating)} hint="из отзывов" />
          </div>

          {metrika && !metrika.available && (
            <AlertMessage
              type="warning"
              message={metrika.message || 'Внешняя аналитика Яндекс Метрики сейчас недоступна.'}
              className="organizer-analytics__alert"
            />
          )}

          {metrika && metrika.available && Array.isArray(metrika.warnings) && metrika.warnings.length > 0 && (
            <AlertMessage
              type="info"
              message={metrika.warnings.join(' ')}
              className="organizer-analytics__alert"
            />
          )}

          <div className="organizer-analytics__charts-grid">
            <article className="analytics-chart-card analytics-chart-card--wide">
              <div className="analytics-chart-card__head">
                <h3>Посещаемость и регистрации по дням</h3>
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
                      <Line
                        type="monotone"
                        dataKey="registrations"
                        stroke="#5c6b5a"
                        strokeWidth={2.5}
                        dot={false}
                        name="Регистрации"
                      />
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
                <EmptyState message="Источник трафика появится после подключения Яндекс Метрики." />
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
                <EmptyState message="Нет сеансов для отображения загрузки." />
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
        </>
      )}
    </section>
  );
};

export default OrganizerAnalyticsOverviewSection;
