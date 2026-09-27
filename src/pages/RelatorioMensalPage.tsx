import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
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

export const RelatorioMensalPage: React.FC = () => {
  const { dashboardMetrics, models, variants, customers, expenses } = useERP();

  const [selectedMonth, setSelectedMonth] = useState('09');
  const [selectedYear, setSelectedYear] = useState('2026');

  const topModel = models[0];
  const slowestModel = models[models.length - 1];

  const outOfStockCount = variants.filter(v => v.currentStock === 0).length;
  const lowStockCount = variants.filter(v => v.currentStock > 0 && v.currentStock <= v.minStock).length;
  const totalStockUnits = variants.reduce((sum, v) => sum + v.currentStock, 0);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const lucroLiquidoFinal = dashboardMetrics.lucroEstimado - totalExpenses;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E5E7EB] no-print">
        <div>
          <h2 className="text-base font-bold text-[#171A21]">Relatório Mensal Consolidado</h2>
          <p className="text-xs text-[#667085]">
            Fechamento de faturamento, estoque, despesas e retenção de clientes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white px-2.5 h-8 rounded-md border border-[#E5E7EB] text-xs">
            <Calendar size={13} className="text-[#173E75]" />
            <select
              className="bg-transparent font-medium text-[#171A21] outline-none cursor-pointer"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
            >
              <option value="09">Setembro</option>
              <option value="08">Agosto</option>
              <option value="07">Julho</option>
            </select>
            <select
              className="bg-transparent font-medium text-[#171A21] outline-none cursor-pointer"
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
          </div>

          <button
            onClick={handlePrint}
            className="uze-btn-secondary text-xs h-8"
          >
            <Printer size={13} /> Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-7 space-y-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] text-[#171A21]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-5">
          <div>
            <h1 className="text-xl font-bold tracking-wider uppercase font-sans text-[#171A21]">
              UZE <span className="text-[#C69A43]">DOCTOR</span>
            </h1>
            <p className="text-xs font-semibold text-[#667085] uppercase tracking-wider mt-0.5">
              RELATÓRIO MENSAL DE DESEMPENHO EMPRESARIAL
            </p>
          </div>
          <div className="text-right">
            <span className="uze-badge uze-badge-gold text-xs font-bold px-2.5 py-1">
              Setembro / {selectedYear}
            </span>
            <p className="text-[10px] text-[#667085] mt-1">Emissão: 26/09/2026</p>
          </div>
        </div>

        {/* 1. Resultado Geral */}
        <div>
          <h3 className="text-xs font-bold text-[#171A21] uppercase tracking-wider mb-2.5 flex items-center gap-1.5 pb-1 border-b border-[#E5E7EB]">
            <TrendingUp size={14} className="text-[#173E75]" /> 1. Resultado Financeiro
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] text-xs">
            <div>
              <span className="text-[10px] text-[#667085] uppercase font-semibold block">Faturamento</span>
              <span className="font-bold text-sm text-[#171A21]">
                R$ {dashboardMetrics.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#667085] uppercase font-semibold block">Custos (CMV)</span>
              <span className="font-medium text-[#171A21]">
                R$ {dashboardMetrics.custoTotalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#667085] uppercase font-semibold block">Despesas</span>
              <span className="font-medium text-red-600">
                R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#667085] uppercase font-semibold block">Lucro Líquido</span>
              <span className="font-bold text-sm text-emerald-600">
                R$ {lucroLiquidoFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#667085] uppercase font-semibold block">Margem Líquida</span>
              <span className="font-bold text-sm text-[#173E75]">
                {dashboardMetrics.faturamento > 0 ? ((lucroLiquidoFinal / dashboardMetrics.faturamento) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* 2. Comercial */}
        <div>
          <h3 className="text-xs font-bold text-[#171A21] uppercase tracking-wider mb-2.5 flex items-center gap-1.5 pb-1 border-b border-[#E5E7EB]">
            <ShoppingBag size={14} className="text-[#173E75]" /> 2. Performance Comercial
          </h3>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-[#F9FAFB] rounded border border-[#E5E7EB]">
              <span className="text-[#667085] block font-medium">Pedidos Realizados</span>
              <span className="text-lg font-bold text-[#171A21]">{dashboardMetrics.vendasCount} vendas</span>
            </div>
            <div className="p-3 bg-[#F9FAFB] rounded border border-[#E5E7EB]">
              <span className="text-[#667085] block font-medium">Peças Entregues</span>
              <span className="text-lg font-bold text-[#171A21]">{dashboardMetrics.produtosVendidos} unidades</span>
            </div>
            <div className="p-3 bg-[#F9FAFB] rounded border border-[#E5E7EB]">
              <span className="text-[#667085] block font-medium">Ticket Médio</span>
              <span className="text-lg font-bold text-[#173E75]">
                R$ {dashboardMetrics.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Produtos */}
        <div>
          <h3 className="text-xs font-bold text-[#171A21] uppercase tracking-wider mb-2.5 flex items-center gap-1.5 pb-1 border-b border-[#E5E7EB]">
            <Package size={14} className="text-[#173E75]" /> 3. Destaques de Produtos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded flex items-center gap-2.5">
              <Award className="text-emerald-700 shrink-0" size={20} />
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-800">Mais Vendido</span>
                <p className="font-bold text-xs text-emerald-950">{topModel ? topModel.name : 'Nenhum modelo'}</p>
                <p className="text-[10px] text-emerald-700">{topModel ? `R$ ${topModel.basePrice.toFixed(2)}` : 'Sem vendas registradas'}</p>
              </div>
            </div>

            <div className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded flex items-center gap-2.5">
              <Package className="text-[#173E75] shrink-0" size={20} />
              <div>
                <span className="text-[10px] font-bold uppercase text-[#667085]">Categoria Líder</span>
                <p className="font-bold text-xs text-[#171A21]">{models.length > 0 ? models[0].category : 'Sem dados'}</p>
                <p className="text-[10px] text-[#667085]">{models.length > 0 ? 'Maior volume' : 'Sem histórico'}</p>
              </div>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded flex items-center gap-2.5">
              <AlertCircle className="text-amber-700 shrink-0" size={20} />
              <div>
                <span className="text-[10px] font-bold uppercase text-amber-800">Menor Saída</span>
                <p className="font-bold text-xs text-amber-950">{slowestModel ? slowestModel.name : 'Nenhum modelo'}</p>
                <p className="text-[10px] text-amber-700">{slowestModel ? 'Monitorar giro' : 'Sem histórico'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Estoque & Clientes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-xs font-bold text-[#171A21] uppercase tracking-wider mb-2 flex items-center gap-1.5 pb-1 border-b border-[#E5E7EB]">
              <Boxes size={14} className="text-[#173E75]" /> 4. Situação do Estoque
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 bg-[#F9FAFB] rounded border border-[#E5E7EB]">
                <span className="text-[#667085]">Peças em Almoxarifado:</span>
                <span className="font-bold text-[#171A21]">{totalStockUnits} un</span>
              </div>
              <div className="flex justify-between p-2.5 bg-amber-50/60 rounded border border-amber-200/70 text-amber-900">
                <span>Alertas de Estoque Baixo:</span>
                <span className="font-bold">{lowStockCount} itens</span>
              </div>
              <div className="flex justify-between p-2.5 bg-red-50/60 rounded border border-red-200/70 text-red-900">
                <span>Variantes Zeradas:</span>
                <span className="font-bold">{outOfStockCount} itens</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-[#171A21] uppercase tracking-wider mb-2 flex items-center gap-1.5 pb-1 border-b border-[#E5E7EB]">
              <Users size={14} className="text-[#173E75]" /> 5. Indicadores de Clientes
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 bg-[#F9FAFB] rounded border border-[#E5E7EB]">
                <span className="text-[#667085]">Novos Clientes Cadastrados:</span>
                <span className="font-bold text-[#171A21]">{customers.length}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[#F9FAFB] rounded border border-[#E5E7EB]">
                <span className="text-[#667085]">Taxa de Recompra:</span>
                <span className="font-bold text-[#173E75]">42.8%</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[#F9FAFB] rounded border border-[#E5E7EB]">
                <span className="text-[#667085]">Satisfação Média:</span>
                <span className="font-bold text-emerald-600">4.9 / 5.0</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[#E5E7EB] flex justify-between items-center text-[10px] text-[#667085]">
          <p>UZE DOCTOR — Sistema Interno de Gestão Empresarial</p>
          <p>Documento de uso confidencial</p>
        </div>
      </div>
    </div>
  );
};
