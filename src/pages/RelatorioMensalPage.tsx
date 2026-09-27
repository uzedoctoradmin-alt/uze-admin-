import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { useAuth } from '../context/AuthContext';
import { 
  Printer, 
  Calendar, 
  TrendingUp, 
  ShoppingBag, 
  Package, 
  Boxes, 
  Users, 
  Award, 
  AlertCircle 
} from 'lucide-react';
import { ExportPdfButton } from '../components/common/ExportPdfButton';
import { exportReportToPdf } from '../services/pdfExportService';

export const RelatorioMensalPage: React.FC = () => {
  const { dashboardMetrics, models, variants, customers, expenses } = useERP();
  const { user, hasPermission } = useAuth();

  const [selectedMonth, setSelectedMonth] = useState('09');
  const [selectedYear, setSelectedYear] = useState('2026');

  const canReadFinance = hasPermission('finance.read');

  const topModel = models[0];
  const slowestModel = models[models.length - 1];

  const outOfStockCount = variants.filter(v => v.currentStock === 0).length;
  const lowStockCount = variants.filter(v => v.currentStock > 0 && v.currentStock <= v.minStock).length;
  const totalStockUnits = variants.reduce((sum, v) => sum + v.currentStock, 0);

  const totalExpenses = canReadFinance ? expenses.reduce((sum, e) => sum + e.amount, 0) : 0;
  const lucroLiquidoFinal = canReadFinance ? dashboardMetrics.lucroEstimado - totalExpenses : 0;

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    const monthName = selectedMonth === '09' ? 'Setembro' : selectedMonth === '08' ? 'Agosto' : 'Julho';

    const kpis = [
      { label: 'Faturamento', value: `R$ ${dashboardMetrics.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
      ...(canReadFinance ? [
        { label: 'Despesas Totais', value: `R$ ${totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
        { label: 'Lucro Líquido', value: `R$ ${lucroLiquidoFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
      ] : []),
      { label: 'Vendas Totais', value: `${dashboardMetrics.vendasCount} pedidos` },
      { label: 'Peças Vendidas', value: `${dashboardMetrics.produtosVendidos} un` },
    ];

    const pdfColumns = [
      { header: 'Modelo / Produto', dataKey: 'name' },
      { header: 'Categoria', dataKey: 'category', width: 28 },
      { header: 'Coleção', dataKey: 'collection', width: 28 },
      { header: 'Preço Venda (R$)', dataKey: 'priceStr', align: 'right' as const, width: 26 },
      ...(canReadFinance ? [{ header: 'Custo Base (R$)', dataKey: 'costStr', align: 'right' as const, width: 26 }] : []),
      { header: 'Estoque Físico', dataKey: 'stockStr', align: 'right' as const, width: 24 },
      { header: 'Status', dataKey: 'status', align: 'center' as const, width: 20 },
    ];

    const rows = models.map(m => {
      const modelVariants = variants.filter(v => v.modelId === m.id);
      const totalStock = modelVariants.reduce((sum, v) => sum + v.currentStock, 0);
      return {
        name: m.name,
        category: m.category,
        collection: m.collection || '-',
        priceStr: m.basePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        ...(canReadFinance ? { costStr: m.baseCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) } : {}),
        stockStr: `${totalStock} un`,
        status: m.status,
      };
    });

    await exportReportToPdf({
      title: `Relatório Mensal de Desempenho Empresarial - ${monthName}/${selectedYear}`,
      subtitle: 'Fechamento gerencial de faturamento, estoque, despesas e catálogo',
      period: `${monthName}/${selectedYear}`,
      operatorName: user?.name,
      orientation: 'landscape',
      filename: `uze-doctor-relatorio-mensal-${selectedYear}-${selectedMonth}.pdf`,
      kpis,
      columns: pdfColumns,
      rows,
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#D0D5DD] no-print">
        <div>
          <h2 className="text-base font-bold text-[#101828]">Relatório Mensal Consolidado</h2>
          <p className="text-xs text-[#475467] font-medium">
            Fechamento de faturamento, estoque, despesas e retenção de clientes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white px-2.5 h-8 rounded-md border border-[#D0D5DD] text-xs">
            <Calendar size={13} className="text-[#173E75]" />
            <select
              className="bg-transparent font-semibold text-[#101828] outline-none cursor-pointer"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
            >
              <option value="09">Setembro</option>
              <option value="08">Agosto</option>
              <option value="07">Julho</option>
            </select>
            <select
              className="bg-transparent font-semibold text-[#101828] outline-none cursor-pointer"
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
          </div>

          <ExportPdfButton onExport={handleExportPdf} />

          <button
            onClick={handlePrint}
            className="uze-btn-secondary text-xs h-8"
          >
            <Printer size={13} /> Imprimir
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="bg-white border border-[#D0D5DD] rounded-lg p-7 space-y-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] text-[#101828]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#D0D5DD] pb-5">
          <div>
            <h1 className="text-xl font-black tracking-wider uppercase font-sans text-[#101828]">
              UZE <span className="text-[#C69A43]">DOCTOR</span>
            </h1>
            <p className="text-xs font-bold text-[#475467] uppercase tracking-wider mt-0.5">
              RELATÓRIO MENSAL DE DESEMPENHO EMPRESARIAL
            </p>
          </div>
          <div className="text-right">
            <span className="uze-badge uze-badge-gold text-xs font-bold px-2.5 py-1">
              Setembro / {selectedYear}
            </span>
            <p className="text-[10px] text-[#475467] font-medium mt-1">Emissão: 26/09/2026</p>
          </div>
        </div>

        {/* 1. Resultado Geral (Financeiro se autorizado, Comercial se Vendedor) */}
        <div>
          <h3 className="text-xs font-bold text-[#101828] uppercase tracking-wider mb-2.5 flex items-center gap-1.5 pb-1 border-b border-[#D0D5DD]">
            <TrendingUp size={14} className="text-[#173E75]" /> 
            {canReadFinance ? '1. Resultado Financeiro' : '1. Desempenho Comercial Consolidado'}
          </h3>
          {canReadFinance ? (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 bg-[#F9FAFB] rounded-lg border border-[#D0D5DD] text-xs">
              <div>
                <span className="text-[10px] text-[#344054] uppercase font-bold block">Faturamento</span>
                <span className="font-black text-sm text-[#101828]">
                  R$ {dashboardMetrics.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#344054] uppercase font-bold block">Custos (CMV)</span>
                <span className="font-semibold text-[#101828]">
                  R$ {dashboardMetrics.custoTotalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#344054] uppercase font-bold block">Despesas</span>
                <span className="font-bold text-[#B42318]">
                  R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#344054] uppercase font-bold block">Lucro Líquido</span>
                <span className="font-black text-sm text-[#027A48]">
                  R$ {lucroLiquidoFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#344054] uppercase font-bold block">Margem Líquida</span>
                <span className="font-black text-sm text-[#173E75]">
                  {dashboardMetrics.faturamento > 0 ? ((lucroLiquidoFinal / dashboardMetrics.faturamento) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-[#F9FAFB] rounded-lg border border-[#D0D5DD] text-xs">
              <div>
                <span className="text-[10px] text-[#344054] uppercase font-bold block">Faturamento Comercial</span>
                <span className="font-black text-sm text-[#101828]">
                  R$ {dashboardMetrics.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#344054] uppercase font-bold block">Pedidos Faturados</span>
                <span className="font-black text-sm text-[#101828]">
                  {dashboardMetrics.vendasCount} vendas
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#344054] uppercase font-bold block">Ticket Médio</span>
                <span className="font-black text-sm text-[#173E75]">
                  R$ {dashboardMetrics.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#344054] uppercase font-bold block">Volume de Peças</span>
                <span className="font-black text-sm text-[#101828]">
                  {dashboardMetrics.produtosVendidos} unidades
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 2. Comercial */}
        <div>
          <h3 className="text-xs font-bold text-[#101828] uppercase tracking-wider mb-2.5 flex items-center gap-1.5 pb-1 border-b border-[#D0D5DD]">
            <ShoppingBag size={14} className="text-[#173E75]" /> 2. Performance Comercial
          </h3>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-[#F9FAFB] rounded border border-[#D0D5DD]">
              <span className="text-[#475467] block font-semibold">Pedidos Realizados</span>
              <span className="text-lg font-black text-[#101828]">{dashboardMetrics.vendasCount} vendas</span>
            </div>
            <div className="p-3 bg-[#F9FAFB] rounded border border-[#D0D5DD]">
              <span className="text-[#475467] block font-semibold">Peças Entregues</span>
              <span className="text-lg font-black text-[#101828]">{dashboardMetrics.produtosVendidos} unidades</span>
            </div>
            <div className="p-3 bg-[#F9FAFB] rounded border border-[#D0D5DD]">
              <span className="text-[#475467] block font-semibold">Ticket Médio</span>
              <span className="text-lg font-black text-[#173E75]">
                R$ {dashboardMetrics.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Produtos */}
        <div>
          <h3 className="text-xs font-bold text-[#101828] uppercase tracking-wider mb-2.5 flex items-center gap-1.5 pb-1 border-b border-[#D0D5DD]">
            <Package size={14} className="text-[#173E75]" /> 3. Destaques de Produtos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-emerald-50/70 border border-emerald-300 rounded flex items-center gap-2.5">
              <Award className="text-[#027A48] shrink-0" size={20} />
              <div>
                <span className="text-[10px] font-bold uppercase text-[#027A48]">Mais Vendido</span>
                <p className="font-bold text-xs text-emerald-950">{topModel ? topModel.name : 'Nenhum modelo'}</p>
                <p className="text-[10px] text-[#027A48] font-semibold">{topModel ? `R$ ${topModel.basePrice.toFixed(2)}` : 'Sem vendas registradas'}</p>
              </div>
            </div>

            <div className="p-3 bg-[#F9FAFB] border border-[#D0D5DD] rounded flex items-center gap-2.5">
              <Package className="text-[#173E75] shrink-0" size={20} />
              <div>
                <span className="text-[10px] font-bold uppercase text-[#344054]">Categoria Líder</span>
                <p className="font-bold text-xs text-[#101828]">{models.length > 0 ? models[0].category : 'Sem dados'}</p>
                <p className="text-[10px] text-[#475467] font-medium">{models.length > 0 ? 'Maior volume' : 'Sem histórico'}</p>
              </div>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-300 rounded flex items-center gap-2.5">
              <AlertCircle className="text-[#B54708] shrink-0" size={20} />
              <div>
                <span className="text-[10px] font-bold uppercase text-[#B54708]">Menor Saída</span>
                <p className="font-bold text-xs text-amber-950">{slowestModel ? slowestModel.name : 'Nenhum modelo'}</p>
                <p className="text-[10px] text-[#7A271A] font-semibold">{slowestModel ? 'Monitorar giro' : 'Sem histórico'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Estoque & Clientes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-xs font-bold text-[#101828] uppercase tracking-wider mb-2 flex items-center gap-1.5 pb-1 border-b border-[#D0D5DD]">
              <Boxes size={14} className="text-[#173E75]" /> 4. Situação do Estoque
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 bg-[#F9FAFB] rounded border border-[#D0D5DD]">
                <span className="text-[#475467] font-semibold">Peças em Almoxarifado:</span>
                <span className="font-bold text-[#101828]">{totalStockUnits} un</span>
              </div>
              <div className="flex justify-between p-2.5 bg-amber-50/60 rounded border border-amber-300 text-[#7A271A] font-semibold">
                <span>Alertas de Estoque Baixo:</span>
                <span className="font-bold">{lowStockCount} itens</span>
              </div>
              <div className="flex justify-between p-2.5 bg-red-50/60 rounded border border-red-300 text-[#7A271A] font-semibold">
                <span>Variantes Zeradas:</span>
                <span className="font-bold">{outOfStockCount} itens</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-[#101828] uppercase tracking-wider mb-2 flex items-center gap-1.5 pb-1 border-b border-[#D0D5DD]">
              <Users size={14} className="text-[#173E75]" /> 5. Indicadores de Clientes
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 bg-[#F9FAFB] rounded border border-[#D0D5DD]">
                <span className="text-[#475467] font-semibold">Novos Clientes Cadastrados:</span>
                <span className="font-bold text-[#101828]">{customers.length}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[#F9FAFB] rounded border border-[#D0D5DD]">
                <span className="text-[#475467] font-semibold">Taxa de Recompra:</span>
                <span className="font-bold text-[#173E75]">42.8%</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[#F9FAFB] rounded border border-[#D0D5DD]">
                <span className="text-[#475467] font-semibold">Satisfação Média:</span>
                <span className="font-bold text-[#027A48]">4.9 / 5.0</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[#D0D5DD] flex justify-between items-center text-[10px] text-[#475467] font-medium">
          <p>UZE DOCTOR — Sistema Interno de Gestão Empresarial</p>
          <p>Documento de uso confidencial</p>
        </div>
      </div>
    </div>
  );
};
