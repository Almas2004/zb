import { ArrowDownUp, Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import type { CaseRecord } from '../types';

type ListResponse = {
  data: CaseRecord[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

export function CasesPage() {
  const [records, setRecords] = useState<CaseRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [dictionaries, setDictionaries] = useState({ workStatuses: [] as string[], dgds: [] as string[] });
  const [search, setSearch] = useState('');
  const [workStatus, setWorkStatus] = useState('');
  const [dgd, setDgd] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);

  const params = useMemo(() => {
    const value = new URLSearchParams({
      page: String(pagination.page),
      pageSize: String(pagination.pageSize),
      sortBy,
      sortOrder
    });
    if (search) value.set('search', search);
    if (workStatus) value.set('workStatus', workStatus);
    if (dgd) value.set('dgd', dgd);
    return value;
  }, [pagination.page, pagination.pageSize, search, workStatus, dgd, sortBy, sortOrder]);

  async function load() {
    setLoading(true);
    const [list, dict] = await Promise.all([api.listCases(params) as Promise<ListResponse>, api.dictionaries()]);
    setRecords(list.data);
    setPagination(list.pagination);
    setDictionaries(dict);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [params.toString()]);

  async function remove(id: string) {
    if (!confirm('Удалить запись?')) return;
    await api.deleteCase(id);
    load();
  }

  function toggleSort(field: string) {
    if (sortBy === field) {
      setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  }

  return (
    <div className="page cases-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Сводник</p>
          <h1>Дела должников</h1>
        </div>
        <Link className="primary-button" to="/cases/new">
          <Plus size={18} /> Новая запись
        </Link>
      </div>

      <section className="toolbar">
        <input placeholder="Поиск по ДГД, ФИО, ИИН, статусу" value={search} onChange={(event) => setSearch(event.target.value)} />
        <select value={dgd} onChange={(event) => setDgd(event.target.value)}>
          <option value="">Все ДГД</option>
          {dictionaries.dgds.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select value={workStatus} onChange={(event) => setWorkStatus(event.target.value)}>
          <option value="">Все статусы</option>
          {dictionaries.workStatuses.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </section>

      <section className="table-wrap">
        <table>
          <thead>
            <tr>
              <th onClick={() => toggleSort('dgd')}>ДГД <ArrowDownUp size={14} /></th>
              <th>Наименование суда</th>
              <th onClick={() => toggleSort('debtorFullName')}>ФИО <ArrowDownUp size={14} /></th>
              <th onClick={() => toggleSort('debtorIin')}>ИИН <ArrowDownUp size={14} /></th>
              <th onClick={() => toggleSort('workStatus')}>Статус <ArrowDownUp size={14} /></th>
              <th onClick={() => toggleSort('courtDecisionDate')}>Дата определения суда <ArrowDownUp size={14} /></th>
              <th>Контрольные даты</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8}>Загрузка...</td>
              </tr>
            )}
            {!loading &&
              records.map((record) => (
                <tr key={record.id}>
                  <td>{record.dgd}</td>
                  <td>{record.courtName || '-'}</td>
                  <td className="strong-cell">{record.debtorFullName}</td>
                  <td>{record.debtorIin}</td>
                  <td>{record.workStatus || '-'}</td>
                  <td>{record.courtDecisionDate || '-'}</td>
                  <td>
                    <div className="mini-controls">
                      {record.controlDates.map((date) => (
                        <span className={`mini-date mini-${date.status}`} title={`${date.label}: ${date.dueDate || '-'}`} key={date.key}>
                          <small className="mini-date-label">{date.shortLabel}</small>
                          {date.dueDate || '-'}
                          <StatusBadge status={date.status} />
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="row-actions">
                      <Link to={`/cases/${record.id}`}><Eye size={17} /></Link>
                      <Link to={`/cases/${record.id}/edit`}><Pencil size={17} /></Link>
                      <button onClick={() => remove(record.id)}><Trash2 size={17} /></button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>

      <div className="pagination">
        <button disabled={pagination.page <= 1} onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}>
          Назад
        </button>
        <span>
          Страница {pagination.page} из {pagination.totalPages || 1}. Всего: {pagination.total}
        </span>
        <button
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
        >
          Вперед
        </button>
      </div>
    </div>
  );
}
