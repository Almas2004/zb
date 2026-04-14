import type { ControlDate } from '../types';
import { StatusBadge } from './StatusBadge';

type ControlDatesGridProps = {
  controlDates: ControlDate[];
  onAcknowledge?: (controlDateId: string) => Promise<void> | void;
  acknowledgingIds?: string[];
};

export function ControlDatesGrid({ controlDates, onAcknowledge, acknowledgingIds = [] }: ControlDatesGridProps) {
  return (
    <div className="control-grid">
      {controlDates.map((item) => {
        const isAcknowledging = acknowledgingIds.includes(item.id);
        const canAcknowledge = Boolean(onAcknowledge && item.dueDate && !item.acknowledged);

        return (
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
            {canAcknowledge && (
              <button className="ghost-button control-ack-button" disabled={isAcknowledging} onClick={() => onAcknowledge?.(item.id)}>
                {isAcknowledging ? 'Сохраняем...' : 'Подтвердить в CRM'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
