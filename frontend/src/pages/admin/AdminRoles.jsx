import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Plus, Trash2, UserPlus } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../utils/api';
import toast from 'react-hot-toast';

// Lets a super-admin define exactly what a role of admin can do in the
// dashboard (see backend/models/AdminRole.js ADMIN_PERMISSIONS for the
// fixed list), then create team-member admin accounts under that role.
// A role with no explicit grant simply can't touch that part of the
// dashboard — enforced server-side by requirePermission(), not just hidden
// in the UI.
const PERMISSION_LABELS = {
  'sellers.view': 'View sellers', 'sellers.create': 'Create sellers', 'sellers.edit': 'Edit sellers',
  'sellers.approve': 'Approve sellers', 'sellers.delete': 'Delete sellers',
  'products.view': 'View products', 'products.create': 'Create products', 'products.edit': 'Edit products', 'products.delete': 'Delete products',
  'verification.review': 'Review NIN verifications', 'broadcast.send': 'Send broadcast emails',
  'monitoring.view': 'View monitoring/analytics', 'payments.view': 'View revenue & transactions',
  'plans.manage': 'Manage seller plans & pricing', 'settings.edit': 'Edit platform settings',
  'roles.manage': 'Manage admin roles & team (sensitive)',
};

export default function AdminRoles() {
  const [permissions, setPermissions] = useState([]);
  const [roles, setRoles] = useState([]);
  const [team, setTeam] = useState([]);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [roleForm, setRoleForm] = useState({ name: '', description: '', permissions: [] });
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [teamForm, setTeamForm] = useState({ username: '', password: '', email: '', roleId: '' });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [permsRes, rolesRes, teamRes] = await Promise.all([
        api.get('/admin-roles/permissions'),
        api.get('/admin-roles'),
        api.get('/admin-roles/team').catch(() => ({ data: { admins: [] } })), // requires roles.manage; fine if it 403s
      ]);
      setPermissions(permsRes.data.permissions);
      setRoles(rolesRes.data.roles);
      setTeam(teamRes.data.admins || []);
    } catch (err) {
      toast.error('Failed to load roles');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const togglePermission = (perm) => {
    setRoleForm(f => ({
      ...f,
      permissions: f.permissions.includes(perm) ? f.permissions.filter(p => p !== perm) : [...f.permissions, perm],
    }));
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin-roles', roleForm);
      toast.success('Role created');
      setShowRoleForm(false);
      setRoleForm({ name: '', description: '', permissions: [] });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create role');
    }
  };

  const handleDeleteRole = async (id) => {
    if (!confirm('Delete this role?')) return;
    try {
      await api.delete(`/admin-roles/${id}`);
      toast.success('Role deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete role');
    }
  };

  const handleCreateTeamMember = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin-roles/team', teamForm);
      toast.success('Admin account created');
      setShowTeamForm(false);
      setTeamForm({ username: '', password: '', email: '', roleId: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create admin');
    }
  };

  const handleReassignRole = async (adminId, roleId) => {
    try {
      await api.put(`/admin-roles/team/${adminId}/role`, { roleId });
      toast.success('Role updated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reassign role');
    }
  };

  if (loading) return <AdminLayout title="Roles & Team"><p>Loading…</p></AdminLayout>;

  return (
    <AdminLayout title="Roles & Team">
      <div className="fade-up" style={{ display: 'grid', gap: '1.5rem' }}>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3><ShieldCheck size={16} style={{ verticalAlign: 'middle' }} /> Admin Roles</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowRoleForm(v => !v)}><Plus size={14} /> New Role</button>
          </div>

          {showRoleForm && (
            <form onSubmit={handleCreateRole} style={{ marginTop: '1rem', border: '1px solid #eee', borderRadius: 8, padding: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Role Name</label>
                <input className="form-control" required value={roleForm.name} onChange={e => setRoleForm({ ...roleForm, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input className="form-control" value={roleForm.description} onChange={e => setRoleForm({ ...roleForm, description: e.target.value })} />
              </div>
              <label className="form-label">What can this role do?</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.4rem', margin: '0.5rem 0' }}>
                {permissions.map(p => (
                  <label key={p} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
                    <input type="checkbox" checked={roleForm.permissions.includes(p)} onChange={() => togglePermission(p)} />
                    {PERMISSION_LABELS[p] || p}
                  </label>
                ))}
              </div>
              <button className="btn btn-primary btn-sm" type="submit">Create Role</button>
            </form>
          )}

          <div style={{ marginTop: '1rem', display: 'grid', gap: '0.5rem' }}>
            {roles.map(r => (
              <div key={r._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #eee', borderRadius: 8, padding: '0.6rem 0.8rem' }}>
                <div>
                  <strong>{r.name}</strong>
                  <p style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', margin: 0 }}>{r.permissions.length} permission{r.permissions.length === 1 ? '' : 's'}</p>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => handleDeleteRole(r._id)}><Trash2 size={13} /></button>
              </div>
            ))}
            {roles.length === 0 && <p style={{ color: 'var(--ink-muted)', fontSize: '0.85rem' }}>No custom roles yet — every admin currently has full access.</p>}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Admin Team</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowTeamForm(v => !v)} disabled={roles.length === 0}>
              <UserPlus size={14} /> Add Admin
            </button>
          </div>
          {roles.length === 0 && <p style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>Create a role first before adding team members.</p>}

          {showTeamForm && (
            <form onSubmit={handleCreateTeamMember} style={{ marginTop: '1rem', border: '1px solid #eee', borderRadius: 8, padding: '1rem' }}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input className="form-control" required value={teamForm.username} onChange={e => setTeamForm({ ...teamForm, username: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input type="password" className="form-control" required value={teamForm.password} onChange={e => setTeamForm({ ...teamForm, password: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-control" required value={teamForm.roleId} onChange={e => setTeamForm({ ...teamForm, roleId: e.target.value })}>
                  <option value="">Select a role…</option>
                  {roles.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                </select>
              </div>
              <button className="btn btn-primary btn-sm" type="submit">Create Admin</button>
            </form>
          )}

          <div style={{ marginTop: '1rem', display: 'grid', gap: '0.5rem' }}>
            {team.map(a => (
              <div key={a._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #eee', borderRadius: 8, padding: '0.6rem 0.8rem' }}>
                <span>{a.username} {a.role?.isSuperAdmin && <em style={{ color: 'var(--gold)' }}>(super admin)</em>}</span>
                <select
                  className="form-control"
                  style={{ width: 'auto' }}
                  value={a.role?._id || ''}
                  onChange={e => handleReassignRole(a._id, e.target.value)}
                 // disabled={!a.role || a.role.isSuperAdmin}
                >
                  <option value="">No role (legacy full access)</option>
                  {roles.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
