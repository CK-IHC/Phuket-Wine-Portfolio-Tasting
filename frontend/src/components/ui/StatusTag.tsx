import type { RegistrationStatus } from '../../lib/types';
import { useLanguage } from '../../i18n/LanguageContext';

const CLASS_MAP: Record<RegistrationStatus, string> = {
  approved: 'tag-status-approved',
  pending: 'tag-status-pending',
  rejected: 'tag-status-rejected',
};

const LABEL_KEY: Record<RegistrationStatus, 'statApproved' | 'statPending' | 'statRejected'> = {
  approved: 'statApproved',
  pending: 'statPending',
  rejected: 'statRejected',
};

export function StatusTag({ status }: { status: RegistrationStatus }) {
  const { t } = useLanguage();
  return <span className={`tag ${CLASS_MAP[status]}`}>{t(LABEL_KEY[status])}</span>;
}
