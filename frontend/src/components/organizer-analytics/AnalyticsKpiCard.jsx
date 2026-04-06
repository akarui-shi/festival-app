const AnalyticsKpiCard = ({ label, value, accent = 'default', hint = '' }) => {
  return (
    <article className={`analytics-kpi-card analytics-kpi-card--${accent}`}>
      <p className="analytics-kpi-card__label">{label}</p>
      <p className="analytics-kpi-card__value">{value}</p>
      {hint && <p className="analytics-kpi-card__hint">{hint}</p>}
    </article>
  );
};

export default AnalyticsKpiCard;
