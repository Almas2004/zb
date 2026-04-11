import type { ControlStatus } from '../types';

const labels: Record<ControlStatus, string> = {
  empty: 'Нет даты',
  future: 'В работе',
  tomorrow: 'Завтра',
  overdue: 'Не подтверждено',
  acknowledged: 'Прочитано'
};

export function StatusBadge({ status }: { status: ControlStatus }) {
  return <span className={`status status-${status}`}>{labels[status]}</span>;
}
