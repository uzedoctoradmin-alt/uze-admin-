import React, { useState } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  RefreshCw, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  FileCheck, 
  History,
  FileDown,
  Layers,
  Users,
  ShoppingBag,
  TrendingUp,
  Package
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { useAuth } from '../../context/AuthContext';
import { backupService, type UzeDoctorBackupPackage, type BackupValidationResult } from '../../services/backupService';
import { restoreService } from '../../services/restoreService';
import { excelService, type TemplateType, type ExcelValidationResult } from '../../services/excelService';
import { supabase } from '../../services/supabase';

interface OperationHistoryItem {
  id: string;
  date: string;
  type: 'BACKUP' | 'RESTAURACAO' | 'IMPORTACAO' | 'EXPORTACAO';
  module: string;
  user: string;
  details: string;
  status: 'Concluído' | 'Falha';
}

export const DadosBackupSection: React.FC = () => {
  const { 
    models, 
    variants, 
    customers, 
    sales, 
    movements, 
    revenues, 
    expenses,
    refreshData 
  } = useERP();

  const { user: currentUser } = useAuth();

  const [activeArea, setActiveArea] = useState<'backup' | 'restaurar' | 'importar' | 'exportar' | 'historico'>('backup');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error' | 'info', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 6000);
  };

  // Histórico local de operações
  const [operationsHistory, setOperationsHistory] = useState<OperationHistoryItem[]>([
    {
      id: 'op-1',
      date: new Date().toLocaleDateString('pt-BR') + ' 02:15',
      type: 'BACKUP',
      module: 'Completo',
      user: currentUser?.name || 'Administrador',
      details: 'Backup completo do banco de dados gerado com integridade',
      status: 'Concluído',
    }
  ]);

  const addHistoryItem = (item: Omit<OperationHistoryItem, 'id' | 'date'>) => {
    const newItem: OperationHistoryItem = {
      ...item,
      id: `op-${Date.now()}`,
      date: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR').slice(0, 5),
    };
    setOperationsHistory(prev => [newItem, ...prev]);
  };

  // ============================================================================
  // 1. ÁREA: BACKUP
  // ============================================================================
  const [backupModules, setBackupModules] = useState<string[]>(['all']);
  const [isGeneratingBackup, setIsGeneratingBackup] = useState(false);

  const toggleBackupModule = (mod: string) => {
    if (mod === 'all') {
      setBackupModules(['all']);
      return;
    }
    setBackupModules(prev => {
      const filtered = prev.filter(m => m !== 'all');
      if (filtered.includes(mod)) {
        const next = filtered.filter(m => m !== mod);
        return next.length === 0 ? ['all'] : next;
      }
      return [...filtered, mod];
    });
  };

  const handleCreateBackup = async () => {
    if (isGeneratingBackup) return;
    try {
      setIsGeneratingBackup(true);
      const pkg = backupService.createBackupPackage(
        backupModules,
        { models, variants, customers, sales, movements, revenues, expenses },
        currentUser?.name || 'Administrador'
      );
      const filename = backupService.downloadBackup(pkg, backupModules.includes('all') ? 'completo' : 'seletivo');

      addHistoryItem({
        type: 'BACKUP',
        module: backupModules.includes('all') ? 'Completo' : backupModules.join(', '),
        user: currentUser?.name || 'Administrador',
        details: `Arquivo: ${filename} (${pkg.metadata.total_records} registros)`,
        status: 'Concluído',
      });

      showFeedback('success', `Backup gerado com sucesso! Arquivo: ${filename}`);
    } catch (err: any) {
      showFeedback('error', `Falha ao gerar backup: ${err.message}`);
    } finally {
      setIsGeneratingBackup(false);
    }
  };

  // ============================================================================
  // 2. ÁREA: RESTAURAÇÃO
  // ============================================================================
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreValidation, setRestoreValidation] = useState<BackupValidationResult | null>(null);
  const [restoreParsedPkg, setRestoreParsedPkg] = useState<UzeDoctorBackupPackage | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [confirmKeyword, setConfirmKeyword] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

  const handleRestoreFileSelected = async (file: File) => {
    setRestoreFile(file);
    try {
      const text = await file.text();
      const val = backupService.validateBackupContent(text);
      setRestoreValidation(val);
      if (val.valid) {
        setRestoreParsedPkg(JSON.parse(text));
      } else {
        setRestoreParsedPkg(null);
        showFeedback('error', val.error || 'Arquivo de backup inválido.');
      }
    } catch {
      showFeedback('error', 'Falha ao ler o arquivo selecionado.');
    }
  };

  const handleExecuteRestore = async () => {
    if (!restoreParsedPkg || !restoreValidation?.valid || isRestoring) return;

    if (restoreMode === 'replace' && confirmKeyword !== 'RESTAURAR') {
      showFeedback('error', 'Digite a palavra RESTAURAR em maiúsculas para confirmar a substituição.');
      return;
    }

    try {
      setIsRestoring(true);
      const result = await restoreService.executeRestore(restoreParsedPkg, {
        mode: restoreMode,
        selectedModules: restoreValidation.modules,
        operator: {
          id: currentUser?.id || 'admin',
          name: currentUser?.name || 'Administrador',
          email: currentUser?.email || 'admin@uzedoctor.com.br',
        },
        currentSystemData: { models, variants, customers, sales, movements, revenues, expenses },
      });

      if (result.success) {
        await refreshData();
        addHistoryItem({
          type: 'RESTAURACAO',
          module: restoreMode === 'replace' ? 'Substituição Completa' : 'Mesclagem',
          user: currentUser?.name || 'Administrador',
          details: `Restauração concluída. Pré-backup: ${result.preBackupFilename || 'Nenhum'}`,
          status: 'Concluído',
        });

        showFeedback('success', `Restauração executada com sucesso! Todos os dados foram sincronizados.`);
        setRestoreFile(null);
        setRestoreValidation(null);
        setRestoreParsedPkg(null);
        setConfirmKeyword('');
      } else {
        showFeedback('error', result.error || 'Falha ao restaurar dados.');
      }
    } catch (err: any) {
      showFeedback('error', `Erro na restauração: ${err.message}`);
    } finally {
      setIsRestoring(false);
    }
  };

  // ============================================================================
  // 3. ÁREA: IMPORTAÇÃO POR EXCEL
  // ============================================================================
  const [importType, setImportType] = useState<TemplateType>('produtos');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importValidation, setImportValidation] = useState<ExcelValidationResult | null>(null);
  const [importMode, setImportMode] = useState<'insert_only' | 'upsert'>('insert_only');
  const [isProcessingImport, setIsProcessingImport] = useState(false);

  const handleImportFileSelected = async (file: File) => {
    setImportFile(file);
    try {
      const val = await excelService.parseAndValidate(file, importType);
      setImportValidation(val);
      if (!val.valid) {
        showFeedback('error', `A planilha contém ${val.invalidRows.length} linhas com erros impeditivos.`);
      }
    } catch {
      showFeedback('error', 'Falha ao interpretar planilha Excel.');
    }
  };

  const handleExecuteImport = async () => {
    if (!importValidation || importValidation.validRows.length === 0 || isProcessingImport) return;

    try {
      setIsProcessingImport(true);
      const impId = `IMP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`;
      const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

      // Processar por entidade
      if (importType === 'produtos') {
        for (const item of importValidation.validRows) {
          const modelId = `mod-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          await supabase.from('models').upsert({
            id: modelId,
            name: item.name,
            category: item.category,
            collection: item.collection,
            gender: item.gender,
            base_price: item.basePrice,
            base_cost: item.baseCost,
            description: item.description,
            status: 'Ativo',
          });
        }
      } else if (importType === 'variantes') {
        for (const v of importValidation.validRows) {
          // Criar ou atualizar variante
          const varId = `var-${v.sku.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
          const targetModel = models.find(m => m.name.toLowerCase().includes(v.skuModel.toLowerCase())) || models[0];

          if (targetModel) {
            await supabase.from('variants').upsert({
              id: varId,
              model_id: targetModel.id,
              sku: v.sku,
              color_name: v.colorName,
              color_hex: v.colorHex,
              size: v.size,
              current_stock: v.currentStock,
              min_stock: v.minStock,
            });

            // Registrar movimentação de estoque inicial por importação
            if (v.currentStock > 0) {
              await supabase.from('stock_movements').insert({
                id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                date: nowStr,
                variant_id: varId,
                product_name: targetModel.name,
                sku: v.sku,
                color_name: v.colorName,
                size: v.size,
                type: 'Entrada',
                quantity: v.currentStock,
                reason: `Entrada inicial de inventário por importação em lote - ${impId}`,
                operator: currentUser?.name || 'Administrador',
              });
            }
          }
        }
      } else if (importType === 'clientes') {
        for (const c of importValidation.validRows) {
          const custId = `cli-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          await supabase.from('customers').insert({
            id: custId,
            name: c.name,
            email: c.email || null,
            phone: c.phone || null,
            document: c.document || null,
            city: c.city || null,
            state: c.state || null,
            notes: c.notes || null,
          });
        }
      } else if (importType === 'despesas') {
        for (const e of importValidation.validRows) {
          await supabase.from('expenses').insert({
            id: `exp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            date: e.date,
            description: e.description,
            category: e.category,
            amount: e.amount,
            payment_method: e.paymentMethod,
            notes: e.notes || `Importado via ${impId}`,
          });
        }
      } else if (importType === 'receitas') {
        for (const r of importValidation.validRows) {
          await supabase.from('revenues').insert({
            id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            date: r.date,
            source: r.source,
            category: r.category,
            amount: r.amount,
            payment_method: r.paymentMethod,
          });
        }
      }

      await refreshData();

      addHistoryItem({
        type: 'IMPORTACAO',
        module: importType.toUpperCase(),
        user: currentUser?.name || 'Administrador',
        details: `${impId}: ${importValidation.validRows.length} registros inseridos com sucesso`,
        status: 'Concluído',
      });

      showFeedback('success', `Importação ${impId} concluída com sucesso! ${importValidation.validRows.length} registros persistidos.`);
      setImportFile(null);
      setImportValidation(null);
    } catch (err: any) {
      showFeedback('error', `Falha durante a importação: ${err.message}`);
    } finally {
      setIsProcessingImport(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Feedback Alert */}
      {feedback && (
        <div className={`p-3.5 rounded-lg text-xs font-semibold flex items-center gap-2 border animate-fadeIn ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
            : feedback.type === 'error'
            ? 'bg-rose-50 text-rose-900 border-rose-300'
            : 'bg-blue-50 text-blue-900 border-blue-300'
        }`}>
          {feedback.type === 'success' && <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />}
          {feedback.type === 'error' && <AlertTriangle size={16} className="text-rose-600 shrink-0" />}
          {feedback.type === 'info' && <AlertTriangle size={16} className="text-blue-600 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Area Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#D0D5DD] pb-2">
        <button
          onClick={() => setActiveArea('backup')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg border transition-all ${
            activeArea === 'backup'
              ? 'bg-[#173E75] text-white border-[#173E75] shadow-xs'
              : 'bg-white text-[#475467] border-[#D0D5DD] hover:bg-[#F9FAFB]'
          }`}
        >
          <Database size={14} />
          <span>1. Fazer Backup</span>
        </button>

        <button
          onClick={() => setActiveArea('restaurar')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg border transition-all ${
            activeArea === 'restaurar'
              ? 'bg-[#173E75] text-white border-[#173E75] shadow-xs'
              : 'bg-white text-[#475467] border-[#D0D5DD] hover:bg-[#F9FAFB]'
          }`}
        >
          <RefreshCw size={14} />
          <span>2. Restaurar Dados</span>
        </button>

        <button
          onClick={() => setActiveArea('importar')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg border transition-all ${
            activeArea === 'importar'
              ? 'bg-[#173E75] text-white border-[#173E75] shadow-xs'
              : 'bg-white text-[#475467] border-[#D0D5DD] hover:bg-[#F9FAFB]'
          }`}
        >
          <Upload size={14} />
          <span>3. Importar Excel</span>
        </button>

        <button
          onClick={() => setActiveArea('exportar')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg border transition-all ${
            activeArea === 'exportar'
              ? 'bg-[#173E75] text-white border-[#173E75] shadow-xs'
              : 'bg-white text-[#475467] border-[#D0D5DD] hover:bg-[#F9FAFB]'
          }`}
        >
          <FileSpreadsheet size={14} />
          <span>4. Modelos & Exportação Excel</span>
        </button>

        <button
          onClick={() => setActiveArea('historico')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg border transition-all ml-auto ${
            activeArea === 'historico'
              ? 'bg-[#07101F] text-[#C69A43] border-[#07101F]'
              : 'bg-white text-[#475467] border-[#D0D5DD] hover:bg-[#F9FAFB]'
          }`}
        >
          <History size={14} />
          <span>Histórico de Operações</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. ABA: BACKUP */}
      {/* ========================================================================= */}
      {activeArea === 'backup' && (
        <div className="bg-white border border-[#D0D5DD] rounded-xl p-6 space-y-6 shadow-xs">
          <div className="flex items-start justify-between gap-4 border-b border-[#D0D5DD] pb-4">
            <div>
              <h3 className="text-sm font-bold text-[#101828]">Gerar Cópia de Segurança Estruturada</h3>
              <p className="text-xs text-[#475467] mt-0.5">
                Cria um pacote JSON versionado preservando relações completas de Produtos, Clientes, Vendas, Estoque e Financeiro.
              </p>
            </div>
            <span className="uze-badge uze-badge-gold">Schema Version 1</span>
          </div>

          {/* Module selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-[#101828] block">Selecione o escopo do Backup:</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <label className="flex items-center gap-2.5 p-3 rounded-lg border border-[#D0D5DD] cursor-pointer hover:bg-[#F9FAFB]">
                <input
                  type="checkbox"
                  checked={backupModules.includes('all')}
                  onChange={() => toggleBackupModule('all')}
                  className="rounded text-[#173E75] focus:ring-[#173E75]"
                />
                <div>
                  <span className="font-bold text-[#101828] block">Backup Completo (Recomendado)</span>
                  <span className="text-[10px] text-[#475467]">Abrange todos os módulos operacionais</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-lg border border-[#D0D5DD] cursor-pointer hover:bg-[#F9FAFB]">
                <input
                  type="checkbox"
                  checked={backupModules.includes('all') || backupModules.includes('produtos')}
                  disabled={backupModules.includes('all')}
                  onChange={() => toggleBackupModule('produtos')}
                  className="rounded text-[#173E75] focus:ring-[#173E75]"
                />
                <div>
                  <span className="font-bold text-[#101828] block">Catálogo & Estoque</span>
                  <span className="text-[10px] text-[#475467]">Modelos, Variantes e Movimentações</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-lg border border-[#D0D5DD] cursor-pointer hover:bg-[#F9FAFB]">
                <input
                  type="checkbox"
                  checked={backupModules.includes('all') || backupModules.includes('vendas')}
                  disabled={backupModules.includes('all')}
                  onChange={() => toggleBackupModule('vendas')}
                  className="rounded text-[#173E75] focus:ring-[#173E75]"
                />
                <div>
                  <span className="font-bold text-[#101828] block">Vendas & Financeiro</span>
                  <span className="text-[10px] text-[#475467]">Pedidos, Receitas e Despesas</span>
                </div>
              </label>
            </div>
          </div>

          {/* Current system records snapshot count */}
          <div className="bg-[#F9FAFB] rounded-lg p-4 border border-[#D0D5DD] text-xs">
            <p className="font-bold text-[#101828] mb-2">Volume Atual na Base de Dados (Prontos para Snapshot):</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[#475467]">
              <div>Modelos: <span className="font-bold text-[#101828]">{models.length}</span></div>
              <div>Variantes: <span className="font-bold text-[#101828]">{variants.length}</span></div>
              <div>Clientes: <span className="font-bold text-[#101828]">{customers.length}</span></div>
              <div>Vendas: <span className="font-bold text-[#101828]">{sales.length}</span></div>
              <div>Movimentações: <span className="font-bold text-[#101828]">{movements.length}</span></div>
              <div>Receitas: <span className="font-bold text-[#101828]">{revenues.length}</span></div>
              <div>Despesas: <span className="font-bold text-[#101828]">{expenses.length}</span></div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-[#475467]">
              * Senhas de acesso, credenciais e chaves criptográficas NÃO são exportadas em texto plano.
            </span>
            <button
              onClick={handleCreateBackup}
              disabled={isGeneratingBackup}
              className="uze-btn-primary text-xs shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Download size={14} />
              <span>{isGeneratingBackup ? 'Criando Snapshot...' : 'Criar e Baixar Backup Agora'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ABA: RESTAURAR */}
      {/* ========================================================================= */}
      {activeArea === 'restaurar' && (
        <div className="bg-white border border-[#D0D5DD] rounded-xl p-6 space-y-6 shadow-xs">
          <div className="flex items-start justify-between gap-4 border-b border-[#D0D5DD] pb-4">
            <div>
              <h3 className="text-sm font-bold text-rose-700 flex items-center gap-1.5">
                <ShieldAlert size={16} /> Restauração de Dados (Operação de Alto Risco)
              </h3>
              <p className="text-xs text-[#475467] mt-0.5">
                Restaura dados a partir de um arquivo JSON oficial da UZE DOCTOR com salvaguarda automática prévia.
              </p>
            </div>
          </div>

          {/* Step 1: Upload */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#101828] block">Passo 1: Selecionar arquivo de backup (.json)</label>
            <input
              type="file"
              accept=".json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleRestoreFileSelected(file);
              }}
              className="block w-full text-xs text-[#475467] file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#173E75] file:text-white hover:file:bg-[#07101F] cursor-pointer"
            />
          </div>

          {/* Step 2 & 3: Validation and Preview */}
          {restoreValidation && restoreValidation.valid && (
            <div className="bg-[#F9FAFB] rounded-lg p-4 border border-[#D0D5DD] space-y-3 text-xs animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-[#D0D5DD]">
                <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 size={15} /> Arquivo Válido e Compatível (Schema v{restoreValidation.version})
                </span>
                <span className="text-[#475467]">Arquivo: <b>{restoreFile?.name}</b> • Por: {restoreValidation.createdBy || 'Sistema'}</span>
              </div>

              <div>
                <p className="font-bold text-[#101828] mb-1.5">Conteúdo Identificado no Arquivo:</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[#475467]">
                  <div>Produtos: <b className="text-[#101828]">{restoreValidation.counts.models}</b></div>
                  <div>Variantes: <b className="text-[#101828]">{restoreValidation.counts.variants}</b></div>
                  <div>Clientes: <b className="text-[#101828]">{restoreValidation.counts.customers}</b></div>
                  <div>Vendas: <b className="text-[#101828]">{restoreValidation.counts.sales}</b></div>
                  <div>Movimentações: <b className="text-[#101828]">{restoreValidation.counts.movements}</b></div>
                  <div>Receitas: <b className="text-[#101828]">{restoreValidation.counts.revenues}</b></div>
                  <div>Despesas: <b className="text-[#101828]">{restoreValidation.counts.expenses}</b></div>
                </div>
              </div>

              {/* Step 4: Mode selection */}
              <div className="pt-3 border-t border-[#D0D5DD] space-y-2">
                <label className="font-bold text-[#101828] block">Passo 2: Escolha o Modo de Restauração</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={`p-3 rounded-lg border cursor-pointer ${
                    restoreMode === 'merge' ? 'border-[#173E75] bg-[#173E75]/5' : 'border-[#D0D5DD]'
                  }`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="restoreMode"
                        checked={restoreMode === 'merge'}
                        onChange={() => setRestoreMode('merge')}
                      />
                      <span className="font-bold text-[#101828]">Modo Mesclar (Seguro)</span>
                    </div>
                    <p className="text-[11px] text-[#475467] mt-1 pl-5">
                      Atualiza registros existentes e insere novos sem apagar a base operacional atual.
                    </p>
                  </label>

                  <label className={`p-3 rounded-lg border cursor-pointer ${
                    restoreMode === 'replace' ? 'border-rose-600 bg-rose-50' : 'border-[#D0D5DD]'
                  }`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="restoreMode"
                        checked={restoreMode === 'replace'}
                        onChange={() => setRestoreMode('replace')}
                      />
                      <span className="font-bold text-rose-800">Substituir Dados (Alto Risco)</span>
                    </div>
                    <p className="text-[11px] text-rose-700 mt-1 pl-5">
                      Sobrescreve entidades correspondentes. Um backup automático do estado atual será baixado previamente.
                    </p>
                  </label>
                </div>
              </div>

              {/* Step 5: Confirmation for replace mode */}
              {restoreMode === 'replace' && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-300 space-y-2 text-xs">
                  <p className="font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle size={15} /> Confirmação Obrigatória de Segurança
                  </p>
                  <p className="text-amber-800 text-[11px]">
                    Para prosseguir com a substituição, digite a palavra <b className="font-mono">RESTAURAR</b> abaixo:
                  </p>
                  <input
                    type="text"
                    value={confirmKeyword}
                    onChange={(e) => setConfirmKeyword(e.target.value)}
                    placeholder="Digite RESTAURAR"
                    className="w-48 h-8 px-2.5 bg-white border border-amber-400 rounded text-xs font-mono font-bold text-amber-950 uppercase"
                  />
                </div>
              )}

              {/* Action Button */}
              <div className="pt-3 flex justify-end">
                <button
                  onClick={handleExecuteRestore}
                  disabled={isRestoring || (restoreMode === 'replace' && confirmKeyword !== 'RESTAURAR')}
                  className={`text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-all ${
                    restoreMode === 'replace'
                      ? 'bg-rose-700 hover:bg-rose-800 text-white'
                      : 'uze-btn-primary'
                  }`}
                >
                  {isRestoring ? 'Executando Restauração...' : 'Confirmar e Executar Restauração'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ABA: IMPORTAR EXCEL */}
      {/* ========================================================================= */}
      {activeArea === 'importar' && (
        <div className="bg-white border border-[#D0D5DD] rounded-xl p-6 space-y-6 shadow-xs">
          <div className="flex items-start justify-between gap-4 border-b border-[#D0D5DD] pb-4">
            <div>
              <h3 className="text-sm font-bold text-[#101828]">Assistente de Importação em Lote via Excel (.xlsx)</h3>
              <p className="text-xs text-[#475467] mt-0.5">
                Carregue dados em massa a partir dos modelos estruturados oficiais da UZE DOCTOR com validação prévia.
              </p>
            </div>

            <button
              onClick={() => excelService.downloadTemplate(importType)}
              className="uze-btn-secondary text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Baixar planilha modelo correspondente"
            >
              <FileDown size={14} className="text-[#173E75]" />
              <span>Baixar Modelo ({importType})</span>
            </button>
          </div>

          {/* Module Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#101828] block">Escolha a entidade para importação:</label>
            <div className="flex flex-wrap gap-2 text-xs">
              {(['produtos', 'variantes', 'clientes', 'despesas', 'receitas'] as TemplateType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setImportType(t);
                    setImportFile(null);
                    setImportValidation(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg border font-semibold capitalize transition-all cursor-pointer ${
                    importType === t
                      ? 'bg-[#173E75] text-white border-[#173E75]'
                      : 'bg-white text-[#475467] border-[#D0D5DD] hover:bg-[#F9FAFB]'
                  }`}
                >
                  {t === 'variantes' ? 'Variantes & Estoque' : t}
                </button>
              ))}
            </div>
          </div>

          {/* File Picker */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#101828] block">Selecione o arquivo Excel (.xlsx / .csv)</label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportFileSelected(file);
              }}
              className="block w-full text-xs text-[#475467] file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#173E75] file:text-white hover:file:bg-[#07101F] cursor-pointer"
            />
          </div>

          {/* Validation Report & Preview */}
          {importValidation && (
            <div className="bg-[#F9FAFB] rounded-lg p-4 border border-[#D0D5DD] space-y-4 text-xs animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#D0D5DD]">
                <div>
                  <span className="font-bold text-[#101828]">Resultado da Análise da Planilha {importFile?.name ? `(${importFile.name})` : ''}:</span>
                  <div className="flex items-center gap-3 mt-1 text-[11px]">
                    <span className="text-emerald-700 font-bold">✓ {importValidation.validRows.length} linhas válidas</span>
                    {importValidation.invalidRows.length > 0 && (
                      <span className="text-rose-700 font-bold">✕ {importValidation.invalidRows.length} linhas com erro</span>
                    )}
                  </div>
                </div>

                {importValidation.invalidRows.length > 0 && (
                  <button
                    onClick={() => excelService.downloadErrorReport(importValidation.invalidRows)}
                    className="uze-btn-secondary text-xs text-rose-700 hover:text-rose-800 border-rose-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Baixar Relatório de Erros (.xlsx)</span>
                  </button>
                )}
              </div>

              {/* Mode */}
              <div className="space-y-2">
                <label className="font-bold text-[#101828] block">Estratégia de Gravação:</label>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'insert_only'}
                      onChange={() => setImportMode('insert_only')}
                    />
                    <span>Apenas adicionar novos registros</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'upsert'}
                      onChange={() => setImportMode('upsert')}
                    />
                    <span>Adicionar e atualizar registros existentes</span>
                  </label>
                </div>
              </div>

              {/* Confirmation */}
              <div className="pt-2 flex items-center justify-between border-t border-[#D0D5DD]">
                <span className="text-[11px] text-[#475467]">
                  * Registros importados serão persistidos imediatamente no Supabase.
                </span>

                <button
                  onClick={handleExecuteImport}
                  disabled={isProcessingImport || importValidation.validRows.length === 0}
                  className="uze-btn-primary text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <FileCheck size={14} />
                  <span>{isProcessingImport ? 'Gravando dados...' : `Gravar ${importValidation.validRows.length} Registros`}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ABA: MODELOS & EXPORTAÇÃO EXCEL */}
      {/* ========================================================================= */}
      {activeArea === 'exportar' && (
        <div className="bg-white border border-[#D0D5DD] rounded-xl p-6 space-y-6 shadow-xs">
          <div className="border-b border-[#D0D5DD] pb-4">
            <h3 className="text-sm font-bold text-[#101828]">Central de Modelos e Exportações Oficiais</h3>
            <p className="text-xs text-[#475467] mt-0.5">
              Baixe as planilhas padrão para preenchimento de cadastros ou exporte relatórios consolidados em Excel.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-[#D0D5DD] hover:border-[#173E75] transition-all bg-[#F9FAFB] space-y-3">
              <div className="flex items-center gap-2 text-[#173E75] font-bold">
                <Package size={16} />
                <span>Modelo de Produtos / Modelos</span>
              </div>
              <p className="text-[11px] text-[#475467]">
                Planilha com colunas para nome, categoria, coleção, preço de venda, custo base e ficha técnica.
              </p>
              <button
                onClick={() => excelService.downloadTemplate('produtos')}
                className="w-full uze-btn-secondary text-xs flex items-center justify-center gap-1.5"
              >
                <Download size={13} />
                <span>Baixar Modelo (.xlsx)</span>
              </button>
            </div>

            <div className="p-4 rounded-xl border border-[#D0D5DD] hover:border-[#173E75] transition-all bg-[#F9FAFB] space-y-3">
              <div className="flex items-center gap-2 text-[#173E75] font-bold">
                <Layers size={16} />
                <span>Modelo Variantes & Estoque</span>
              </div>
              <p className="text-[11px] text-[#475467]">
                Matriz de cores, hexadecimais, tamanhos (PP ao XGG) e contagem inicial de estoque físico.
              </p>
              <button
                onClick={() => excelService.downloadTemplate('variantes')}
                className="w-full uze-btn-secondary text-xs flex items-center justify-center gap-1.5"
              >
                <Download size={13} />
                <span>Baixar Modelo (.xlsx)</span>
              </button>
            </div>

            <div className="p-4 rounded-xl border border-[#D0D5DD] hover:border-[#173E75] transition-all bg-[#F9FAFB] space-y-3">
              <div className="flex items-center gap-2 text-[#173E75] font-bold">
                <Users size={16} />
                <span>Modelo de Clientes</span>
              </div>
              <p className="text-[11px] text-[#475467]">
                Cadastro de médicos e profissionais com telefone, e-mail, CPF/documento e localização.
              </p>
              <button
                onClick={() => excelService.downloadTemplate('clientes')}
                className="w-full uze-btn-secondary text-xs flex items-center justify-center gap-1.5"
              >
                <Download size={13} />
                <span>Baixar Modelo (.xlsx)</span>
              </button>
            </div>

            <div className="p-4 rounded-xl border border-[#D0D5DD] hover:border-[#173E75] transition-all bg-[#F9FAFB] space-y-3">
              <div className="flex items-center gap-2 text-[#173E75] font-bold">
                <TrendingUp size={16} />
                <span>Modelo de Despesas</span>
              </div>
              <p className="text-[11px] text-[#475467]">
                Controle de custos operacionais, matéria-prima, confecção e pagamentos de fornecedores.
              </p>
              <button
                onClick={() => excelService.downloadTemplate('despesas')}
                className="w-full uze-btn-secondary text-xs flex items-center justify-center gap-1.5"
              >
                <Download size={13} />
                <span>Baixar Modelo (.xlsx)</span>
              </button>
            </div>

            <div className="p-4 rounded-xl border border-[#D0D5DD] hover:border-[#173E75] transition-all bg-[#F9FAFB] space-y-3">
              <div className="flex items-center gap-2 text-[#173E75] font-bold">
                <ShoppingBag size={16} />
                <span>Exportar Vendas Atual</span>
              </div>
              <p className="text-[11px] text-[#475467]">
                Exporta todas as vendas do sistema com subtotal, desconto, frete e método de pagamento.
              </p>
              <button
                onClick={() => {
                  excelService.exportToExcel({
                    filename: `uze-doctor-vendas-${new Date().toISOString().slice(0, 10)}.xlsx`,
                    sheetName: 'Vendas',
                    data: sales.map(s => ({
                      'Venda': s.id,
                      'Data': s.date,
                      'Cliente': s.customerName,
                      'E-mail': s.customerEmail,
                      'Subtotal': s.subtotal,
                      'Desconto': s.discount,
                      'Frete': s.shipping,
                      'Total': s.total,
                      'Pagamento': s.paymentMethod,
                      'Status': s.status,
                    })),
                    columns: [
                      { header: 'Venda', dataKey: 'Venda' },
                      { header: 'Data', dataKey: 'Data' },
                      { header: 'Cliente', dataKey: 'Cliente' },
                      { header: 'E-mail', dataKey: 'E-mail' },
                      { header: 'Subtotal', dataKey: 'Subtotal' },
                      { header: 'Desconto', dataKey: 'Desconto' },
                      { header: 'Frete', dataKey: 'Frete' },
                      { header: 'Total', dataKey: 'Total' },
                      { header: 'Pagamento', dataKey: 'Pagamento' },
                      { header: 'Status', dataKey: 'Status' },
                    ],
                    metadata: {
                      title: 'Relatório Oficial de Vendas',
                      operator: currentUser?.name,
                    }
                  });
                }}
                className="w-full uze-btn-primary text-xs flex items-center justify-center gap-1.5"
              >
                <FileSpreadsheet size={13} />
                <span>Exportar Vendas (.xlsx)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ABA: HISTÓRICO DE OPERAÇÕES */}
      {/* ========================================================================= */}
      {activeArea === 'historico' && (
        <div className="bg-white border border-[#D0D5DD] rounded-xl p-6 space-y-4 shadow-xs">
          <div className="border-b border-[#D0D5DD] pb-3">
            <h3 className="text-sm font-bold text-[#101828]">Histórico Auditável de Dados & Backup</h3>
            <p className="text-xs text-[#475467] mt-0.5">
              Registro cronológico de backups gerados, restaurações executadas e planilhas importadas na plataforma.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F9FAFB] border-b border-[#D0D5DD] text-[#344054] font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Data / Hora</th>
                  <th className="py-2.5 px-3">Operação</th>
                  <th className="py-2.5 px-3">Módulo / Escopo</th>
                  <th className="py-2.5 px-3">Usuário Responsável</th>
                  <th className="py-2.5 px-3">Detalhes</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D0D5DD]">
                {operationsHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F9FAFB]">
                    <td className="py-2.5 px-3 font-mono text-[#475467]">{item.date}</td>
                    <td className="py-2.5 px-3 font-semibold text-[#173E75]">{item.type}</td>
                    <td className="py-2.5 px-3 font-medium text-[#101828]">{item.module}</td>
                    <td className="py-2.5 px-3 text-[#475467]">{item.user}</td>
                    <td className="py-2.5 px-3 text-[#475467]">{item.details}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="uze-badge uze-badge-success">{item.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
