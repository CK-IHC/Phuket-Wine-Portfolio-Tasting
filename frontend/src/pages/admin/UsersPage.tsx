import { useEffect, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import type { AdminUser } from '../../lib/types';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Field } from '../../components/ui/Field';

export function UsersPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', phone: '', role: 'Staff' as AdminUser['role'] });

  useEffect(() => {
    api.getUsers()
      .then((data) => { setUsers(data); setLoading(false); })
      .catch((err) => { setLoadError(err instanceof Error ? err.message : String(err)); setLoading(false); });
  }, []);

  const toggleActive = async (u: AdminUser) => {
    await api.updateUser(u.phone, { active: !u.active });
    setUsers((prev) => prev.map((x) => (x.phone === u.phone ? { ...x, active: !x.active } : x)));
  };

  const remove = async (u: AdminUser) => {
    await api.deleteUser(u.phone);
    setUsers((prev) => prev.filter((x) => x.phone !== u.phone));
    toast(t('toastUserDeleted'));
  };

  const save = async () => {
    if (!newUser.name.trim() || !newUser.phone.trim()) return;
    await api.addUser({ ...newUser, active: true });
    setUsers((prev) => [...prev, { ...newUser, id: String(Date.now()), active: true, joined: 'Today' }]);
    setAddOpen(false);
    setNewUser({ name: '', phone: '', role: 'Staff' });
    toast(t('toastUserAdded'));
  };

  if (loading) return <p className="text-muted">{t('loading')}</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ margin: 0 }}>{t('usersTitle')}</h2>
        <Button variant="primary" onClick={() => setAddOpen(true)}>{t('addUserBtn')}</Button>
      </div>
      {loadError && (
        <div style={{ color: 'var(--color-accent-900)', background: 'var(--color-accent-100)', border: '1px solid var(--color-accent-300)', padding: '10px 12px', borderRadius: 'var(--radius-md)', fontSize: 13, marginBottom: 14 }}>
          {t('loadErrorMessage')} ({loadError})
        </div>
      )}
      {!loadError && users.length === 0 && <p className="text-muted">{t('noRecords')}</p>}
      {users.length > 0 && (
      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>{t('colUserName')}</th><th>{t('colPhone')}</th><th>{t('colRole')}</th>
              <th>{t('colStatusU')}</th><th>{t('colJoined')}</th><th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.phone}</td>
                <td>{u.role}</td>
                <td>
                  <span
                    className={`tag ${u.active ? 'tag-status-approved' : 'tag-status-rejected'}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleActive(u)}
                  >
                    {u.active ? 'active' : 'inactive'}
                  </span>
                </td>
                <td>{u.joined}</td>
                <td><button className="btn btn-ghost" onClick={() => remove(u)}>{t('deleteBtn')}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {addOpen && (
        <Dialog
          title={t('addUserTitle')}
          onClose={() => setAddOpen(false)}
          actions={<>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>{t('cancelBtn')}</Button>
            <Button variant="primary" onClick={save}>{t('saveBtn')}</Button>
          </>}
        >
          <Field label={t('nameLabel')}><input className="input" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} /></Field>
          <Field label={t('phoneLabelShort')}><input className="input" value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} /></Field>
          <Field label={t('colRole')}>
            <select className="input" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as AdminUser['role'] })}>
              <option value="Admin">Admin</option>
              <option value="Staff">Staff</option>
            </select>
          </Field>
        </Dialog>
      )}
    </div>
  );
}
