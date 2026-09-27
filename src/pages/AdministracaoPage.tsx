import React, { useState } from 'react';
import { 
  Users, 
  History, 
  UserPlus, 
  Key, 
  Edit3, 
  UserCheck, 
  UserX, 
  ShieldCheck, 
  Search, 
  AlertCircle,
  CheckCircle2,
  X,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { User, UserRole, UserStatus } from '../types';

export const AdministracaoPage: React.FC = () => {
  const { 
    user: currentUser, 
    usersList, 
    auditLogs, 
    createUser, 
    updateUser, 
    resetUserPassword 
  } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'usuarios' | 'auditoria'>('usuarios');
  const [searchTerm, setSearchTerm] = useState('');

  // Modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resettingUser, setResettingUser] = useState<User | null>(null);

  // Formulário de Criação
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('VENDEDOR');
  const [newStatus, setNewStatus] = useState<UserStatus>('Ativo');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');

  // Formulário de Edição
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('VENDEDOR');
  const [editStatus, setEditStatus] = useState<UserStatus>('Ativo');

  // Formulário de Reset de Senha
  const [tempPassword, setTempPassword] = useState('');
  const [tempPasswordConfirm, setTempPasswordConfirm] = useState('');

  // Mensagens
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Filtragem de Usuários
  const filteredUsers = usersList.filter(u => {
    const q = searchTerm.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  // Handle Create User
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== newPasswordConfirm) {
      showFeedback('error', 'As senhas digitadas não coincidem.');
      return;
    }
    if (newPassword.length < 6) {
      showFeedback('error', 'A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    const res = await createUser({
      name: newName,
      email: newEmail,
      role: newRole,
      status: newStatus,
      initialPassword: newPassword,
    });

    if (res.success) {
      showFeedback('success', `Usuário ${newName} criado com sucesso!`);
      setIsCreateModalOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewPasswordConfirm('');
      setNewRole('VENDEDOR');
    } else {
      showFeedback('error', res.error || 'Erro ao criar usuário.');
    }
  };

  // Handle Open Edit
  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditRole(user.role);
    setEditStatus(user.status);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const res = await updateUser(editingUser.id, {
      name: editName,
      role: editRole,
      status: editStatus,
    });

    if (res.success) {
      showFeedback('success', 'Cadastro do usuário atualizado com sucesso.');
      setEditingUser(null);
    } else {
      showFeedback('error', res.error || 'Falha ao atualizar usuário.');
    }
  };

  // Handle Quick Toggle Status
  const handleToggleStatus = async (user: User) => {
    const newStatus: UserStatus = user.status === 'Ativo' ? 'Inativo' : 'Ativo';
    const res = await updateUser(user.id, {
      name: user.name,
      role: user.role,
      status: newStatus,
    });

    if (res.success) {
      showFeedback('success', `Status do usuário alterado para ${newStatus}.`);
    } else {
      showFeedback('error', res.error || 'Erro ao alterar status.');
    }
  };

  // Handle Reset Password Submit
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;

    if (tempPassword !== tempPasswordConfirm) {
      showFeedback('error', 'As senhas não coincidem.');
      return;
    }
    if (tempPassword.length < 6) {
      showFeedback('error', 'A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    const res = await resetUserPassword(resettingUser.id, tempPassword);
    if (res.success) {
      showFeedback('success', `Nova senha temporária definida para ${resettingUser.name}. Ele deverá alterá-la no próximo login.`);
      setResettingUser(null);
      setTempPassword('');
      setTempPasswordConfirm('');
    } else {
      showFeedback('error', res.error || 'Falha ao redefinir senha.');
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMINISTRADOR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#173E75]/10 text-[#173E75] border border-[#173E75]/30">
            <ShieldCheck size={12} className="text-[#C69A43]" />
            Administrador
          </span>
        );
      case 'VENDEDOR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            Vendedor
          </span>
        );
      case 'VISUALIZACAO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            Visualização
          </span>
        );
    }
  };

  const getStatusBadge = (status: UserStatus) => {
    if (status === 'Ativo') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Ativo
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-300">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        Inativo
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D0D5DD]">
        <div>
          <h2 className="text-base font-bold text-[#101828]">Administração & Controle de Acessos</h2>
          <p className="text-xs text-[#475467] font-medium">
            Gerencie usuários da equipe UZE DOCTOR, perfis de permissão e histórico auditável de acessos
          </p>
        </div>

        {activeSubTab === 'usuarios' && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="uze-btn-primary text-xs shadow-sm flex items-center gap-1.5 self-start sm:self-auto"
          >
            <UserPlus size={15} />
            <span>Novo Usuário</span>
          </button>
        )}
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 animate-fadeIn ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border border-emerald-300' 
            : 'bg-rose-50 text-rose-900 border border-rose-300'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 size={16} className="text-[#027A48] shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Tabs Selector */}
      <div className="flex items-center gap-2 border-b border-[#D0D5DD]">
        <button
          onClick={() => setActiveSubTab('usuarios')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-[2px] ${
            activeSubTab === 'usuarios'
              ? 'border-[#173E75] text-[#173E75]'
              : 'border-transparent text-[#475467] hover:text-[#101828]'
          }`}
        >
          <Users size={15} />
          <span>Usuários ({usersList.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('auditoria')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-[2px] ${
            activeSubTab === 'auditoria'
              ? 'border-[#173E75] text-[#173E75]'
              : 'border-transparent text-[#475467] hover:text-[#101828]'
          }`}
        >
          <History size={15} />
          <span>Registro de Auditoria ({auditLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: USUÁRIOS */}
      {activeSubTab === 'usuarios' && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475467]" />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail ou perfil..."
              className="uze-input pl-9 text-xs"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white border border-[#D0D5DD] rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F9FAFB] border-b border-[#D0D5DD] text-[#344054] font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Nome do Profissional</th>
                  <th className="py-3 px-4">Usuário / E-mail</th>
                  <th className="py-3 px-4">Perfil</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Último Acesso</th>
                  <th className="py-3 px-4">Criado em</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D0D5DD] text-[#101828]">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-[#475467]">
                      Nenhum usuário encontrado com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(userItem => (
                    <tr key={userItem.id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="py-3 px-4 font-bold flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#07101F] text-[#C69A43] flex items-center justify-center text-[10px] font-bold border border-[#C69A43]/40">
                          {userItem.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span>{userItem.name}</span>
                          {currentUser?.id === userItem.id && (
                            <span className="ml-1.5 text-[10px] text-[#C69A43] font-bold">(Você)</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#475467]">
                        {userItem.email}
                      </td>
                      <td className="py-3 px-4">
                        {getRoleBadge(userItem.role)}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(userItem.status)}
                      </td>
                      <td className="py-3 px-4 text-[#475467] text-[11px]">
                        {userItem.lastLoginAt ? userItem.lastLoginAt.replace('T', ' ').slice(0, 16) : 'Nunca acessou'}
                      </td>
                      <td className="py-3 px-4 text-[#475467] text-[11px]">
                        {userItem.createdAt ? userItem.createdAt.slice(0, 10) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(userItem)}
                            className="p-1.5 text-[#344054] hover:text-[#173E75] hover:bg-[#F2F4F7] rounded-md transition-colors"
                            title="Editar usuário"
                          >
                            <Edit3 size={15} />
                          </button>

                          <button
                            onClick={() => setResettingUser(userItem)}
                            className="p-1.5 text-[#344054] hover:text-[#C69A43] hover:bg-[#F2F4F7] rounded-md transition-colors"
                            title="Redefinir senha"
                          >
                            <Key size={15} />
                          </button>

                          <button
                            onClick={() => handleToggleStatus(userItem)}
                            className={`p-1.5 rounded-md transition-colors ${
                              userItem.status === 'Ativo'
                                ? 'text-rose-600 hover:bg-rose-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={userItem.status === 'Ativo' ? 'Desativar conta' : 'Reativar conta'}
                          >
                            {userItem.status === 'Ativo' ? <UserX size={15} /> : <UserCheck size={15} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="md:hidden space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="bg-white border border-[#D0D5DD] rounded-xl p-6 text-center text-xs text-[#475467]">
                Nenhum usuário encontrado.
              </div>
            ) : (
              filteredUsers.map(userItem => (
                <div key={userItem.id} className="bg-white border border-[#D0D5DD] rounded-xl p-4 space-y-3 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#07101F] text-[#C69A43] flex items-center justify-center text-xs font-bold border border-[#C69A43]/40">
                        {userItem.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#101828]">
                          {userItem.name} {currentUser?.id === userItem.id && <span className="text-[#C69A43] font-bold text-[10px]">(Você)</span>}
                        </h4>
                        <p className="text-[11px] text-[#475467] font-mono">{userItem.email}</p>
                      </div>
                    </div>
                    {getStatusBadge(userItem.status)}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[#D0D5DD]">
                    <div>
                      <span className="text-[10px] text-[#475467] block uppercase font-bold">Perfil</span>
                      {getRoleBadge(userItem.role)}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[#475467] block uppercase font-bold">Último Acesso</span>
                      <span className="text-[11px] font-medium text-[#101828]">
                        {userItem.lastLoginAt ? userItem.lastLoginAt.slice(0, 10) : 'Nunca'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D0D5DD]">
                    <button
                      onClick={() => handleOpenEdit(userItem)}
                      className="px-2.5 py-1 text-xs font-semibold text-[#173E75] bg-[#173E75]/10 rounded-md flex items-center gap-1"
                    >
                      <Edit3 size={13} /> Editar
                    </button>
                    <button
                      onClick={() => setResettingUser(userItem)}
                      className="px-2.5 py-1 text-xs font-semibold text-[#C69A43] bg-[#C69A43]/15 rounded-md flex items-center gap-1"
                    >
                      <Key size={13} /> Senha
                    </button>
                    <button
                      onClick={() => handleToggleStatus(userItem)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1 ${
                        userItem.status === 'Ativo'
                          ? 'text-rose-700 bg-rose-50'
                          : 'text-emerald-700 bg-emerald-50'
                      }`}
                    >
                      {userItem.status === 'Ativo' ? <UserX size={13} /> : <UserCheck size={13} />}
                      {userItem.status === 'Ativo' ? 'Desativar' : 'Reativar'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: AUDITORIA / LOGS */}
      {activeSubTab === 'auditoria' && (
        <div className="bg-white border border-[#D0D5DD] rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-[#D0D5DD] flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-[#101828]">Histórico Auditável de Operações de Segurança</h3>
              <p className="text-[11px] text-[#475467]">Ações executadas por usuários, alterações de perfil e tentativas de login</p>
            </div>
            <span className="text-[11px] font-mono text-[#173E75] font-semibold">{auditLogs.length} eventos gravados</span>
          </div>

          <div className="divide-y divide-[#D0D5DD] max-h-[500px] overflow-y-auto">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#475467]">Nenhum registro de auditoria no momento.</div>
            ) : (
              auditLogs.map(log => (
                <div key={log.id} className="p-3.5 hover:bg-[#F9FAFB] transition-colors text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 bg-[#F2F4F7] text-[#101828] rounded border border-[#D0D5DD]">
                        {log.action}
                      </span>
                      <span className="font-bold text-[#101828]">{log.actorName}</span>
                      <span className="text-[11px] text-[#475467] font-mono">({log.actorEmail})</span>
                    </div>
                    {log.targetName && (
                      <p className="text-[11px] text-[#475467]">
                        Alvo da ação: <strong className="text-[#101828]">{log.targetName}</strong>
                      </p>
                    )}
                  </div>
                  <div className="text-[11px] text-[#475467] font-mono shrink-0">
                    {log.createdAt ? log.createdAt.replace('T', ' ').slice(0, 19) : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: CRIAR NOVO USUÁRIO */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#07101F]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D0D5DD] rounded-2xl max-w-lg w-full p-6 shadow-xl animate-fadeIn space-y-4">
            <div className="flex items-center justify-between border-b border-[#D0D5DD] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#173E75]/10 text-[#173E75]">
                  <UserPlus size={18} />
                </div>
                <h3 className="text-sm font-bold text-[#101828]">Criar Novo Usuário</h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-[#475467] hover:text-[#101828]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#344054] mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Mariana Silva"
                  className="uze-input text-xs"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-bold text-[#344054] mb-1">E-mail Corporativo (Usuário de Login) *</label>
                <input
                  type="email"
                  required
                  placeholder="mariana@uzedoctor.com.br"
                  className="uze-input text-xs"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#344054] mb-1">Perfil de Acesso *</label>
                  <select
                    className="uze-input text-xs"
                    value={newRole}
                    onChange={e => setNewRole(e.target.value as UserRole)}
                  >
                    <option value="VENDEDOR">Vendedor</option>
                    <option value="ADMINISTRADOR">Administrador</option>
                    <option value="VISUALIZACAO">Visualização</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#344054] mb-1">Status Inicial</label>
                  <select
                    className="uze-input text-xs"
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value as UserStatus)}
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[#D0D5DD]">
                <div>
                  <label className="block font-bold text-[#344054] mb-1">Senha Inicial Temporária *</label>
                  <input
                    type="password"
                    required
                    placeholder="Mínimo 6 dígitos"
                    className="uze-input text-xs"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#344054] mb-1">Confirmar Senha *</label>
                  <input
                    type="password"
                    required
                    placeholder="Repita a senha"
                    className="uze-input text-xs"
                    value={newPasswordConfirm}
                    onChange={e => setNewPasswordConfirm(e.target.value)}
                  />
                </div>
              </div>

              <p className="text-[11px] text-[#475467] italic">
                * O usuário será obrigado a redefinir esta senha no primeiro login antes de acessar o sistema.
              </p>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#D0D5DD]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-[#D0D5DD] rounded-lg text-xs font-semibold text-[#344054] hover:bg-[#F2F4F7]"
                >
                  Cancelar
                </button>
                <button type="submit" className="uze-btn-primary text-xs">
                  Criar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDITAR USUÁRIO */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-[#07101F]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D0D5DD] rounded-2xl max-w-md w-full p-6 shadow-xl animate-fadeIn space-y-4">
            <div className="flex items-center justify-between border-b border-[#D0D5DD] pb-3">
              <h3 className="text-sm font-bold text-[#101828]">Editar Usuário</h3>
              <button onClick={() => setEditingUser(null)} className="text-[#475467] hover:text-[#101828]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#344054] mb-1">E-mail (Identificador imutável)</label>
                <input
                  type="text"
                  disabled
                  className="uze-input text-xs bg-slate-100 font-mono text-slate-600"
                  value={editingUser.email}
                />
              </div>

              <div>
                <label className="block font-bold text-[#344054] mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  className="uze-input text-xs"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-bold text-[#344054] mb-1">Perfil de Acesso</label>
                <select
                  className="uze-input text-xs"
                  value={editRole}
                  onChange={e => setEditRole(e.target.value as UserRole)}
                >
                  <option value="VENDEDOR">Vendedor</option>
                  <option value="ADMINISTRADOR">Administrador</option>
                  <option value="VISUALIZACAO">Visualização</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#344054] mb-1">Status da Conta</label>
                <select
                  className="uze-input text-xs"
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value as UserStatus)}
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#D0D5DD]">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-[#D0D5DD] rounded-lg text-xs font-semibold text-[#344054] hover:bg-[#F2F4F7]"
                >
                  Cancelar
                </button>
                <button type="submit" className="uze-btn-primary text-xs">
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: REDEFINIR SENHA */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 bg-[#07101F]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D0D5DD] rounded-2xl max-w-md w-full p-6 shadow-xl animate-fadeIn space-y-4">
            <div className="flex items-center justify-between border-b border-[#D0D5DD] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#C69A43]/15 text-[#C69A43]">
                  <Lock size={18} />
                </div>
                <h3 className="text-sm font-bold text-[#101828]">Redefinir Senha de {resettingUser.name}</h3>
              </div>
              <button onClick={() => setResettingUser(null)} className="text-[#475467] hover:text-[#101828]">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-[#475467]">
              Defina uma nova senha temporária. Ao efetuar login com ela, o usuário precisará cadastrar sua própria senha.
            </p>

            <form onSubmit={handleResetSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#344054] mb-1">Nova Senha Temporária *</label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 6 dígitos"
                  className="uze-input text-xs"
                  value={tempPassword}
                  onChange={e => setTempPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-bold text-[#344054] mb-1">Confirmar Senha *</label>
                <input
                  type="password"
                  required
                  placeholder="Repita a senha"
                  className="uze-input text-xs"
                  value={tempPasswordConfirm}
                  onChange={e => setTempPasswordConfirm(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#D0D5DD]">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="px-4 py-2 border border-[#D0D5DD] rounded-lg text-xs font-semibold text-[#344054] hover:bg-[#F2F4F7]"
                >
                  Cancelar
                </button>
                <button type="submit" className="uze-btn-primary text-xs">
                  Atualizar Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
