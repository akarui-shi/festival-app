const AdminTabs = ({ tabs, activeTab, onChange }) => {
  return (
    <div className="admin-tabs" role="tablist" aria-label="Разделы админ-панели">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`admin-tab ${activeTab === tab.key ? 'admin-tab--active' : ''}`}
          onClick={() => onChange(tab.key)}
          role="tab"
          aria-selected={activeTab === tab.key}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default AdminTabs;

