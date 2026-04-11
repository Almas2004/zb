import { ArrowLeft, Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, getApiUrl } from '../api/client';
import { ControlDatesGrid } from '../components/ControlDatesGrid';
import type { CaseRecord } from '../types';

type CaseDocument = {
  key: string;
  title: string;
  shortTitle: string;
  requiredFields: string[];
  missingFields: string[];
  generatedDocxUrl: string;
  generatedPdfUrl: string;
};

export function CaseDetailPage() {
  const { id } = useParams();
  const [record, setRecord] = useState<CaseRecord | null>(null);
  const [documents, setDocuments] = useState<CaseDocument[]>([]);

  async function downloadDocument(url: string) {
    const response = await fetch(getApiUrl(url), {
      headers: { Authorization: `Bearer ${localStorage.getItem('crm_token')}` }
    });
    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    const fileName = match?.[1] || 'document';
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(objectUrl);
  }

  useEffect(() => {
    if (id) {
      api.getCase(id).then((data) => setRecord(data as CaseRecord));
      fetch(getApiUrl(`/api/cases/${id}/documents`), {
        headers: { Authorization: `Bearer ${localStorage.getItem('crm_token')}` }
      })
        .then((response) => response.json())
        .then((data) => setDocuments(data as CaseDocument[]));
    }
  }, [id]);

  if (!record) return <div className="page">Загрузка...</div>;

  const fields = [
    ['ДГД', record.dgd],
    ['Наименование суда', record.courtName],
    ['ФИО должника', record.debtorFullName],
    ['ИИН должника', record.debtorIin],
    ['Адрес регистрации', record.registrationAddress],
    ['Контакты должника', record.debtorContacts],
    ['Язык производства', record.productionLanguage],
    ['Статус работы', record.workStatus],
    ['ФИО представителя должника', record.representativeFullName],
    ['Контакты представителя', record.representativeContacts],
    ['Дата оплаты услуг ФУ', record.fuServicePaymentDate],
    ['Кол-во оплат услуг ФУ', record.fuServicePaymentCount],
    ['Статус определения суда', record.courtDecisionStatus],
    ['Дата определения суда', record.courtDecisionDate]
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link className="back-link" to="/"><ArrowLeft size={16} /> Назад</Link>
          <h1>{record.debtorFullName}</h1>
          <p>{record.dgd} · {record.debtorIin}</p>
        </div>
        <Link className="primary-button" to={`/cases/${record.id}/edit`}>
          <Pencil size={18} /> Редактировать
        </Link>
      </div>

      <section className="details-grid">
        {fields.map(([label, value]) => (
          <div className="detail-item" key={String(label)}>
            <span>{label}</span>
            <strong>{value || '-'}</strong>
          </div>
        ))}
      </section>

      <section className="page-section">
        <h2>Контрольные даты</h2>
        <ControlDatesGrid controlDates={record.controlDates} />
      </section>

      <section className="page-section">
        <h2>Документы по должнику</h2>
        <div className="documents-grid">
          {documents.map((doc) => (
            <div className="document-card" key={doc.key}>
              <div className="document-copy">
                <strong>{doc.shortTitle}</strong>
                {doc.missingFields.length > 0 ? (
                  <span>Незаполненные поля: {doc.missingFields.join(', ')}</span>
                ) : (
                  <span>Готов к генерации из карточки должника</span>
                )}
              </div>
              <div className="document-actions">
                <button className="ghost-button" onClick={() => downloadDocument(doc.generatedDocxUrl)}>
                  Скачать DOCX
                </button>
                <button className="ghost-button" onClick={() => downloadDocument(doc.generatedPdfUrl)}>
                  Скачать PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
