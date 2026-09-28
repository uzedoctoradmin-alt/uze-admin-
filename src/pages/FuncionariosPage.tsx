import React, { useState, useMemo } from 'react';
import { useERP } from '../context/ERPContext';
import { useAuth } from '../context/AuthContext';
import type { Employee } from '../types';
import { 
  UserCheck, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  Briefcase, 
  Edit, 
  Trash2, 
  Archive, 
  RotateCcw, 
  X,
  Sparkles,
  AlertTriangle,
  BadgeCheck,
  ShieldAlert
} from 'lucide-react';

type FilterType = 'all' | 'sellers' | 'admin' | 'inactive';

export const FuncionariosPage: React.FC = () => {
  const { 
    employees, 
    addEmployee, 
    updateEmployee, 
    archiveEmployee, 
    reactivateEmployee, 
    deleteEmployee 
  } = useERP();
  
  const { hasPermission } = useAuth();

  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [jobTitle, setJobTitle] = useState('Vendedora');
  const [isSeller, setIsSeller] = useState(true);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'Ativo' | 'Inativo'>('Ativo');
  const [formError, setFormError] = useState('');

  // Delete/Archive confirmation modal
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const canCreate = hasPermission('employees.create');
  const canEdit = hasPermission('employees.edit');
  const canDelete = hasPermission('employees.delete');

  // Metrics
  const metrics = useMemo(() => {
    const total = employees.length;
    const sellers = employees.filter(e => e.isSeller && e.status === 'Ativo').length;
    const administrative = employees.filter(e => !e.isSeller && e.status === 'Ativo').length;
    const inactive = employees.filter(e => e.status === 'Inativo').length;
    return { total, sellers, administrative, inactive };
  }, [employees]);

  // Filtered list
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = emp.name.toLowerCase().includes(q);
        const matchJob = emp.jobTitle.toLowerCase().includes(q);
        const matchEmail = emp.email?.toLowerCase().includes(q);
        const matchPhone = emp.phone?.toLowerCase().includes(q);
        if (!matchName && !matchJob && !matchEmail && !matchPhone) return false;
      }

      // Tab filter
      if (activeFilter === 'sellers') {
        return emp.isSeller && emp.status === 'Ativo';
      }
      if (activeFilter === 'admin') {
        return !emp.isSeller && emp.status === 'Ativo';
      }
      if (activeFilter === 'inactive') {
        return emp.status === 'Inativo';
      }

      return true;
    });
  }, [employees, search, activeFilter]);

  const handleOpenCreateModal = () => {
    setEditingEmployee(null);
    setName('');
    setJobTitle('Vendedora');
    setIsSeller(true);
    setPhone('');
    setEmail('');
    setNotes('');
    setStatus('Ativo');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setName(emp.name);
    setJobTitle(emp.jobTitle);
    setIsSeller(emp.isSeller);
    setPhone(emp.phone || '');
    setEmail(emp.email || '');
    setNotes(emp.notes || '');
    setStatus(emp.status);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('O nome do colaborador é obrigatório.');
      return;
    }
    if (!jobTitle.trim()) {
      setFormError('O cargo / função é obrigatório.');
      return;
    }

    if (editingEmployee) {
      updateEmployee(editingEmployee.id, {
        name: name.trim(),
        jobTitle: jobTitle.trim(),
        isSeller,
        phone: phone.trim() || undefined,
        email: email.trim().toLowerCase() || undefined,
        notes: notes.trim() || undefined,
        status,
      });
    } else {
      addEmployee({
        name: name.trim(),
        jobTitle: jobTitle.trim(),
        isSeller,
        phone: phone.trim() || undefined,
        email: email.trim().toLowerCase() || undefined,
        notes: notes.trim() || undefined,
        status,
      });
    }

    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const res = deleteEmployee(deleteTarget.id);
    if (!res.success) {
      setDeleteError(res.reason || 'Não foi possível excluir.');
    } else {
      setDeleteTarget(null);
      setDeleteError('');
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Equipe & Vendedores
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#173E75]/10 text-[#173E75]">
              {employees.length} cadastrados
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerencie colaboradores, consultores e vendedores vinculados às vendas da UZE DOCTOR.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#173E75] hover:bg-[#122e56] text-white text-xs font-bold transition-all shadow-sm cursor-pointer shrink-0"
          >
            <Plus size={16} />
            <span>Novo Colaborador</span>
          </button>
        )}
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Total de Colaboradores</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Vendedores Ativos
          </p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{metrics.sellers}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Equipe Administrativa
          </p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{metrics.administrative}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            Inativos / Arquivados
          </p>
          <p className="text-2xl font-bold text-slate-500 mt-1">{metrics.inactive}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
              activeFilter === 'all'
                ? 'bg-[#173E75] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({metrics.total})
          </button>
          <button
            onClick={() => setActiveFilter('sellers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
              activeFilter === 'sellers'
                ? 'bg-[#C69A43] text-[#07101F] shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Vendedores ({metrics.sellers})
          </button>
          <button
            onClick={() => setActiveFilter('admin')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
              activeFilter === 'admin'
                ? 'bg-[#173E75] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Administrativos ({metrics.administrative})
          </button>
          <button
            onClick={() => setActiveFilter('inactive')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
              activeFilter === 'inactive'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Inativos ({metrics.inactive})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, cargo, e-mail..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#C69A43] focus:ring-1 focus:ring-[#C69A43] outline-none"
          />
        </div>
      </div>

      {/* Employees Grid / Table */}
      {filteredEmployees.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <UserCheck size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-700">Nenhum colaborador encontrado</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {search ? 'Tente ajustar os termos da busca ou mudar o filtro selecionado.' : 'Cadastre os membros da sua equipe para vinculá-los às vendas.'}
          </p>
          {canCreate && !search && (
            <button
              onClick={handleOpenCreateModal}
              className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#173E75] text-white text-xs font-bold hover:bg-[#122e56] transition-colors cursor-pointer"
            >
              <Plus size={15} />
              <span>Cadastrar Primeiro Colaborador</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredEmployees.map(emp => {
            const isInactive = emp.status === 'Inativo';
            return (
              <div
                key={emp.id}
                className={`bg-white rounded-2xl border p-5 transition-all duration-200 flex flex-col justify-between shadow-xs ${
                  isInactive 
                    ? 'border-slate-200 bg-slate-50/60 opacity-75' 
                    : 'border-slate-200/90 hover:border-[#C69A43]/50 hover:shadow-md'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                        emp.isSeller
                          ? 'bg-[#173E75] text-[#C69A43] border border-[#C69A43]/40'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {emp.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 truncate flex items-center gap-1.5">
                          {emp.name}
                          {emp.isSeller && (
                            <span title="Vendedor autorizado">
                              <BadgeCheck size={16} className="text-[#C69A43] shrink-0" />
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium truncate flex items-center gap-1 mt-0.5">
                          <Briefcase size={12} className="shrink-0 text-slate-400" />
                          {emp.jobTitle}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                      emp.status === 'Ativo'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-200 text-slate-600 border border-slate-300'
                    }`}>
                      {emp.status}
                    </span>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1.5 py-3 border-t border-slate-100 text-xs text-slate-600">
                    {emp.phone ? (
                      <div className="flex items-center gap-2">
                        <Phone size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">{emp.phone}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-400">
                        <Phone size={13} className="shrink-0" />
                        <span>Telefone não informado</span>
                      </div>
                    )}

                    {emp.email ? (
                      <div className="flex items-center gap-2">
                        <Mail size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">{emp.email}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-400">
                        <Mail size={13} className="shrink-0" />
                        <span>E-mail não informado</span>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {emp.notes && (
                    <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 line-clamp-2 mt-1">
                      {emp.notes}
                    </p>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 font-mono">
                    ID: {emp.id}
                  </span>

                  <div className="flex items-center gap-1">
                    {canEdit && (
                      <button
                        onClick={() => handleOpenEditModal(emp)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-[#173E75] hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Editar colaborador"
                      >
                        <Edit size={15} />
                      </button>
                    )}

                    {canEdit && (
                      emp.status === 'Ativo' ? (
                        <button
                          onClick={() => archiveEmployee(emp.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                          title="Desativar colaborador"
                        >
                          <Archive size={15} />
                        </button>
                      ) : (
                        <button
                          onClick={() => reactivateEmployee(emp.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="Reativar colaborador"
                        >
                          <RotateCcw size={15} />
                        </button>
                      )
                    )}

                    {canDelete && (
                      <button
                        onClick={() => {
                          setDeleteTarget(emp);
                          setDeleteError('');
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Excluir colaborador"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#173E75] text-[#C69A43] flex items-center justify-center font-bold">
                  <UserCheck size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {editingEmployee ? 'Editar Colaborador' : 'Novo Colaborador'}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {editingEmployee ? 'Atualize as informações da equipe.' : 'Cadastre um novo membro ou vendedor.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <ShieldAlert size={16} className="shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Maria Eduarda Silva"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-[#C69A43] focus:ring-1 focus:ring-[#C69A43] outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Cargo / Função *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Vendedora Sênior, Gerente..."
                    value={jobTitle}
                    onChange={e => setJobTitle(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-[#C69A43] focus:ring-1 focus:ring-[#C69A43] outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as 'Ativo' | 'Inativo')}
                    className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-[#C69A43] focus:ring-1 focus:ring-[#C69A43] outline-none font-medium"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
              </div>

              {/* Is Seller Toggle Switch */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-[#C69A43]" />
                    Habilitar como Vendedor(a)
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Permite selecionar este colaborador como responsável direto pelas vendas.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSeller}
                    onChange={e => setIsSeller(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#173E75]"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-[#C69A43] focus:ring-1 focus:ring-[#C69A43] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    placeholder="colaborador@exemplo.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-[#C69A43] focus:ring-1 focus:ring-[#C69A43] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Observações Internas
                </label>
                <textarea
                  rows={2}
                  placeholder="Informações adicionais sobre o colaborador..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-[#C69A43] focus:ring-1 focus:ring-[#C69A43] outline-none resize-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#173E75] hover:bg-[#122e56] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  {editingEmployee ? 'Salvar Alterações' : 'Cadastrar Colaborador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 animate-fadeIn">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <AlertTriangle size={24} />
            </div>

            <h3 className="text-base font-bold text-slate-900 text-center">
              Excluir Colaborador
            </h3>
            <p className="text-xs text-slate-600 text-center mt-1">
              Tem certeza que deseja excluir <strong>{deleteTarget.name}</strong>?
            </p>

            {deleteError && (
              <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{deleteError}</span>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError('');
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Fechar
              </button>

              {!deleteError && (
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Confirmar Exclusão
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
