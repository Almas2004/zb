import { useEffect, useMemo, useState } from 'react';
import type { CasePayload, CaseRecord } from '../types';

const emptyPayload: CasePayload = {
  dgd: '',
  courtName: '',
  debtorFullName: '',
  debtorIin: '',
  registrationAddress: '',
  debtorContacts: '',
  productionLanguage: '',
  workStatus: '',
  representativeFullName: '',
  representativeContacts: '',
  fuServicePaymentDate: '',
  fuServicePaymentCount: null,
  courtDecisionStatus: '',
  courtDecisionDate: ''
};

function addBusinessDays(date: string, days: number) {
  if (!date) return '';
  const current = new Date(`${date}T00:00:00`);
  let added = 0;
  while (added < days) {
    current.setDate(current.getDate() + 1);
    const day = current.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return current.toISOString().slice(0, 10);
}

export function CaseForm({
  initial,
  onSubmit,
  submitting
}: {
  initial?: CaseRecord;
  onSubmit: (payload: CasePayload) => Promise<void>;
  submitting: boolean;
}) {
  const [form, setForm] = useState<CasePayload>(emptyPayload);

  useEffect(() => {
    if (initial) {
      setForm({
        dgd: initial.dgd || '',
        courtName: initial.courtName || '',
        debtorFullName: initial.debtorFullName || '',
        debtorIin: initial.debtorIin || '',
        registrationAddress: initial.registrationAddress || '',
        debtorContacts: initial.debtorContacts || '',
        productionLanguage: initial.productionLanguage || '',
        workStatus: initial.workStatus || '',
        representativeFullName: initial.representativeFullName || '',
        representativeContacts: initial.representativeContacts || '',
        fuServicePaymentDate: initial.fuServicePaymentDate || '',
        fuServicePaymentCount: initial.fuServicePaymentCount,
        courtDecisionStatus: initial.courtDecisionStatus || '',
        courtDecisionDate: initial.courtDecisionDate || ''
      });
    }
  }, [initial]);

  const preview = useMemo(() => {
    const first = addBusinessDays(form.courtDecisionDate || '', 2);
    const collection = addBusinessDays(first, 20);
    return [
      ['Дата направления в ДГД объявления и сопроводительного письма от ФУ', first],
      ['Направить запросы в гос органы', addBusinessDays(form.courtDecisionDate || '', 5)],
      ['Ответы гос.органы', addBusinessDays(form.courtDecisionDate || '', 10)],
      ['Подготовить заключение', addBusinessDays(form.courtDecisionDate || '', 20)],
      ['Сбор от кредиторов реестра требований кредиторов', collection],
      ['Подача реестра требований кредиторов', addBusinessDays(collection, 10)]
    ];
  }, [form.courtDecisionDate]);

  function setField<K extends keyof CasePayload>(key: K, value: CasePayload[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <form
      className="form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(form);
      }}
    >
      <section className="form-section">
        <h2>Ручные данные</h2>
        <div className="form-grid">
          <label>
            ДГД *
            <input value={form.dgd} onChange={(event) => setField('dgd', event.target.value)} required />
          </label>
          <label>
            Наименование суда
            <input value={form.courtName || ''} onChange={(event) => setField('courtName', event.target.value)} />
          </label>
          <label>
            ФИО должника *
            <input value={form.debtorFullName} onChange={(event) => setField('debtorFullName', event.target.value)} required />
          </label>
          <label>
            ИИН должника *
            <input value={form.debtorIin} onChange={(event) => setField('debtorIin', event.target.value)} required />
          </label>
          <label>
            Адрес регистрации
            <input value={form.registrationAddress || ''} onChange={(event) => setField('registrationAddress', event.target.value)} />
          </label>
          <label>
            Контакты должника
            <input value={form.debtorContacts || ''} onChange={(event) => setField('debtorContacts', event.target.value)} />
          </label>
          <label>
            Язык производства
            <input value={form.productionLanguage || ''} onChange={(event) => setField('productionLanguage', event.target.value)} />
          </label>
          <label>
            Статус работы
            <input value={form.workStatus || ''} onChange={(event) => setField('workStatus', event.target.value)} />
          </label>
          <label>
            ФИО представителя должника
            <input value={form.representativeFullName || ''} onChange={(event) => setField('representativeFullName', event.target.value)} />
          </label>
          <label>
            Контакты представителя
            <input value={form.representativeContacts || ''} onChange={(event) => setField('representativeContacts', event.target.value)} />
          </label>
          <label>
            Дата оплаты услуг ФУ
            <input type="date" value={form.fuServicePaymentDate || ''} onChange={(event) => setField('fuServicePaymentDate', event.target.value)} />
          </label>
          <label>
            Кол-во оплат услуг ФУ
            <input
              type="number"
              min="0"
              value={form.fuServicePaymentCount ?? ''}
              onChange={(event) => setField('fuServicePaymentCount', event.target.value ? Number(event.target.value) : null)}
            />
          </label>
          <label>
            Статус определения суда
            <input value={form.courtDecisionStatus || ''} onChange={(event) => setField('courtDecisionStatus', event.target.value)} />
          </label>
          <label>
            Дата определения суда
            <input type="date" value={form.courtDecisionDate || ''} onChange={(event) => setField('courtDecisionDate', event.target.value)} />
          </label>
        </div>
      </section>

      <section className="form-section readonly-section">
        <h2>Автоматические контрольные даты</h2>
        <div className="readonly-grid">
          {preview.map(([label, value]) => (
            <label key={label}>
              {label}
              <input value={value || ''} readOnly placeholder="Рассчитается после даты суда" />
            </label>
          ))}
        </div>
      </section>

      <div className="form-actions">
        <button className="primary-button" disabled={submitting}>
          {submitting ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </form>
  );
}
