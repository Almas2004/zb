import type { ControlDate } from '../types';
import { StatusBadge } from './StatusBadge';

export function ControlDatesGrid({ controlDates }: { controlDates: ControlDate[] }) {
  return (
    <div className="control-grid">
      {controlDates.map((item) => (
        <div className={`control-card control-${item.status}`} key={item.key}>
          <div>
            <span>{item.shortLabel}</span>
            <strong>{item.dueDate || '-'}</strong>
          </div>
          <StatusBadge status={item.status} />
          {item.acknowledgedAt && (
            <small>
              Подтвердил: {item.acknowledgedBy || 'Telegram'}, {new Date(item.acknowledgedAt).toLocaleString('ru-RU')}
            </small>
          )}
        </div>
      ))}
    </div>
  );
}
