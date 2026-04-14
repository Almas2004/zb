export type ControlStatus = 'empty' | 'future' | 'tomorrow' | 'overdue' | 'acknowledged';

export type ControlDate = {
  id: string;
  key: string;
  label: string;
  shortLabel: string;
  dueDate: string | null;
  acknowledged: boolean;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  acknowledgedTelegramUserId: string | null;
  status: ControlStatus;
};

export type SessionUser = {
  id: string;
  name: string;
  username: string;
  role: string;
};

export type CaseRecord = {
  id: string;
  dgd: string;
  courtName: string | null;
  debtorFullName: string;
  debtorIin: string;
  registrationAddress: string | null;
  debtorContacts: string | null;
  productionLanguage: string | null;
  workStatus: string | null;
  representativeFullName: string | null;
  representativeContacts: string | null;
  fuServicePaymentDate: string | null;
  fuServicePaymentCount: number | null;
  courtDecisionStatus: string | null;
  courtDecisionDate: string | null;
  controlDates: ControlDate[];
  createdAt?: string;
  updatedAt?: string;
};

export type CasePayload = Omit<CaseRecord, 'id' | 'controlDates' | 'createdAt' | 'updatedAt'>;
