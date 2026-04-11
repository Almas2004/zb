import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { CaseForm } from '../components/CaseForm';
import type { CasePayload, CaseRecord } from '../types';

export function CaseFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState<CaseRecord | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode === 'edit' && id) api.getCase(id).then((data) => setRecord(data as CaseRecord));
  }, [mode, id]);

  async function submit(payload: CasePayload) {
    setSubmitting(true);
    setError('');
    try {
      const result = mode === 'create' ? await api.createCase(payload) : await api.updateCase(id!, payload);
      navigate(`/cases/${(result as CaseRecord).id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link className="back-link" to="/"><ArrowLeft size={16} /> Назад</Link>
          <h1>{mode === 'create' ? 'Новая запись' : 'Редактирование записи'}</h1>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      {mode === 'edit' && !record ? <p>Загрузка...</p> : <CaseForm initial={record} onSubmit={submit} submitting={submitting} />}
    </div>
  );
}
