import { AlertTriangle, Bell, BriefcaseBusiness, CalendarCheck2, Scale } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';

type DashboardResponse = {
  summary: {
    totalCases: number;
    overdueControlDates: number;
    acknowledgedControlDates: number;
    tomorrowControlDates: number;
    withCourtDecisionDate: number;
  };
  byStatus: Array<{ label: string; value: number }>;
  byDgd: Array<{ label: string; value: number }>;
  upcomingControlDates: Array<{
    caseId: string;
    dgd: string;
    courtName: string | null;
    debtorFullName: string;
    debtorIin: string;
    workStatus: string | null;
    controlDate: {
      shortLabel: string;
      dueDate: string | null;
      status: 'empty' | 'future' | 'tomorrow' | 'overdue' | 'acknowledged';
    };
  }>;
};

const cards = [
  { key: 'totalCases', label: 'Всего дел', icon: BriefcaseBusiness },
  { key: 'withCourtDecisionDate', label: 'С датой определения суда', icon: Scale },
  { key: 'overdueControlDates', label: 'Просроченные контрольные даты', icon: AlertTriangle },
  { key: 'tomorrowControlDates', label: 'Срок завтра', icon: Bell },
  { key: 'acknowledgedControlDates', label: 'Подтверждено в Telegram', icon: CalendarCheck2 }
] as const;

export function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);

  useEffect(() => {
    api.dashboard().then((result) => setData(result as DashboardResponse));
  }, []);

  if (!data) return <div className="page">Загрузка...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Дашборд</p>
          <h1>Сводка по делам</h1>
          <p>Ключевые показатели, дедлайны и структура базы по текущим кейсам.</p>
        </div>
      </div>

      <section className="dashboard-cards">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div className="metric-card" key={card.key}>
              <div className="metric-head">
                <span>{card.label}</span>
                <Icon size={18} />
              </div>
              <strong>{data.summary[card.key]}</strong>
            </div>
          );
        })}
      </section>

      <section className="dashboard-grid">
        <div className="page-section">
          <h2>По статусам работы</h2>
          <div className="stat-list">
            {data.byStatus.map((item) => (
              <div className="stat-row" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="page-section">
          <h2>По ДГД</h2>
          <div className="stat-list">
            {data.byDgd.map((item) => (
              <div className="stat-row" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="page-section">
        <h2>Ближайшие контрольные даты</h2>
        <div className="upcoming-list">
          {data.upcomingControlDates.map((item) => (
            <Link className="upcoming-card" key={`${item.caseId}-${item.controlDate.shortLabel}-${item.controlDate.dueDate}`} to={`/cases/${item.caseId}`}>
              <div className="upcoming-top">
                <div>
                  <span>{item.controlDate.shortLabel}</span>
                  <strong>{item.controlDate.dueDate || '-'}</strong>
                </div>
                <StatusBadge status={item.controlDate.status} />
              </div>
              <div className="upcoming-meta">
                <b>{item.debtorFullName}</b>
                <span>{item.dgd}{item.courtName ? ` · ${item.courtName}` : ''}</span>
                <span>{item.debtorIin}</span>
                <span>{item.workStatus || '-'}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
