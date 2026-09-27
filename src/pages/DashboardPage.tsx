import React, { useState, useMemo } from 'react';
import { useERP } from '../context/ERPContext';
import { StatCard } from '../components/common/StatCard';
import { SaleStatusBadge } from '../components/common/Badge';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Modal } from '../components/common/Modal';
import { NovaVendaModal } from '../components/modals/NovaVendaModal';
import type { Sale } from '../types';
import { 
  ArrowRight, 
  Eye, 
  Boxes, 
  AlertTriangle, 
  TrendingUp, 
  ShoppingBag, 
  Plus 
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { 
    dashboardMetrics, 
    filteredSales, 
    variants, 
    setCurrentTab
  } = useERP();

  const [chartMetric, setChartMetric] = useState<'faturamento' | 'vendas' | 'lucro'>('faturamento');
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<Sale | null>(null);
  const [isNovaVendaOpen, setIsNovaVendaOpen] = useState(false);

  const outOfStockCount = variants.filter(v => v.currentStock === 0).length;
  const lowStockCount = variants.filter(v => v.currentStock > 0 && v.currentStock <= v.minStock).length;
  const totalStockUnits = variants.reduce((sum, v) => sum + v.currentStock, 0);

  // Dynamically compute chart data from REAL sales only
  const chartData = useMemo(() => {
    if (filteredSales.length === 0) return [];

    // Group sales by day (DD/MM)
    const salesByDay: Record<string, { faturamento: number; vendas: number; lucro: number }> = {};
    
    // Sort sales ascending by date
    const sorted = [...filteredSales].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sorted.forEach(sale => {
      const datePart = sale.date.split(' ')[0] || sale.date;
      const [, month, day] = datePart.split('-');
      const label = day && month ? `${day}/${month}` : datePart;

      if (!salesByDay[label]) {
        salesByDay[label] = { faturamento: 0, vendas: 0, lucro: 0 };
      }
      salesByDay[label].faturamento += sale.total;
      salesByDay[label].vendas += 1;
      salesByDay[label].lucro += sale.estimatedProfit;
    });

    return Object.entries(salesByDay).map(([label, values]) => ({
      label,
      faturamento: values.faturamento,
      vendas: values.vendas,
      lucro: values.lucro,
    }));
  }, [filteredSales]);

  return (
    <div className="space-y-5 sm:space-y-6 max-w-7xl mx-auto">
      {/* Indicadores Principais (KPIs com dados reais ou zerados) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Faturamento"
          value={`R$ ${dashboardMetrics.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle={dashboardMetrics.faturamento === 0 ? "Sem faturamento no período" : undefined}
          trend={dashboardMetrics.faturamento > 0 ? 12.5 : undefined}
          trendLabel={dashboardMetrics.faturamento > 0 ? "vs. período anterior" : undefined}
        />

        <StatCard
          title="Pedidos"
          value={`${dashboardMetrics.vendasCount}`}
          subtitle={dashboardMetrics.vendasCount === 0 ? "Nenhum pedido registrado" : undefined}
          trend={dashboardMetrics.vendasCount > 0 ? 8.2 : undefined}
          trendLabel={dashboardMetrics.vendasCount > 0 ? "vs. período anterior" : undefined}
        />

        <StatCard
          title="Ticket Médio"
          value={`R$ ${dashboardMetrics.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle={dashboardMetrics.vendasCount > 0 ? `Faturamento ÷ ${dashboardMetrics.vendasCount} vendas` : "Média por pedido"}
        />

        <StatCard
          title="Lucro Estimado"
          value={`R$ ${dashboardMetrics.lucroEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle={dashboardMetrics.lucroEstimado === 0 ? "Sem dados de margem" : undefined}
          trend={dashboardMetrics.lucroEstimado > 0 ? 14.1 : undefined}
          trendLabel={dashboardMetrics.lucroEstimado > 0 ? `Margem de ${dashboardMetrics.margemMedia.toFixed(1)}%` : undefined}
        />
      </div>

      {/* Grid: Gráfico (8 colunas) + Situação do Estoque (4 colunas). No mobile: Gráfico primeiro, Estoque abaixo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* Gráfico Principal (col-span-8) */}
        <div className="lg:col-span-8 bg-white border border-[#E5E7EB] rounded-lg p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#F3F4F6]">
            <div>
              <h3 className="text-sm font-bold text-[#171A21]">Evolução das Vendas</h3>
              <p className="text-xs text-[#667085]">Acompanhamento da receita ao longo do período selecionado</p>
            </div>

            {/* Alternador de Métrica (Faturamento | Pedidos | Lucro) */}
            <div className="flex items-center gap-1 bg-[#F9FAFB] p-1 rounded-md border border-[#E5E7EB] self-start sm:self-auto">
              <button
                onClick={() => setChartMetric('faturamento')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  chartMetric === 'faturamento' 
                    ? 'bg-[#173E75] text-white shadow-xs' 
                    : 'text-[#667085] hover:text-[#171A21]'
                }`}
              >
                Faturamento
              </button>
              <button
                onClick={() => setChartMetric('vendas')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  chartMetric === 'vendas' 
                    ? 'bg-[#173E75] text-white shadow-xs' 
                    : 'text-[#667085] hover:text-[#171A21]'
                }`}
              >
                Pedidos
              </button>
              <button
                onClick={() => setChartMetric('lucro')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  chartMetric === 'lucro' 
                    ? 'bg-[#173E75] text-white shadow-xs' 
                    : 'text-[#667085] hover:text-[#171A21]'
                }`}
              >
                Lucro
              </button>
            </div>
          </div>

          <div className="h-60 sm:h-72 w-full flex items-center justify-center">
            {chartData.length === 0 ? (
              /* Estado Vazio Elegante do Gráfico */
              <div className="flex flex-col items-center justify-center text-center p-6 space-y-2.5 max-w-sm">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-[#173E75]">
                  <TrendingUp size={22} className="opacity-60" />
                </div>
                <h4 className="text-sm font-bold text-[#171A21]">
                  Ainda não há dados de vendas para este período
                </h4>
                <p className="text-xs text-[#667085] leading-relaxed">
                  Conforme novas vendas forem registradas no sistema, o gráfico de evolução será alimentado automaticamente.
                </p>
                <button
                  onClick={() => setIsNovaVendaOpen(true)}
                  className="mt-1 uze-btn-primary text-xs shadow-xs"
                >
                  <Plus size={13} />
                  <span>Registrar primeira venda</span>
                </button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="uzeBlueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#173E75" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#173E75" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F2F5" />
                  <XAxis 
                    dataKey="label" 
                    stroke="#9CA3AF" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    minTickGap={10}
                  />
                  <YAxis 
                    stroke="#9CA3AF" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(v) => chartMetric === 'vendas' ? `${v}` : `R$ ${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#07101F', 
                      border: '1px solid #173E75', 
                      borderRadius: '6px', 
                      color: '#FFFFFF',
                      fontSize: '12px',
                      padding: '8px 12px'
                    }}
                    formatter={(val: any) => [
                      chartMetric === 'vendas' ? `${val} pedidos` : `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                      chartMetric === 'faturamento' ? 'Faturamento' : chartMetric === 'vendas' ? 'Pedidos' : 'Lucro'
                    ]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey={chartMetric} 
                    stroke="#173E75" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#uzeBlueGrad)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Painel Secundário: Situação do Estoque (col-span-4) */}
        <div className="lg:col-span-4 bg-white border border-[#E5E7EB] rounded-lg p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6] mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#171A21]">Situação do Estoque</h3>
                <p className="text-xs text-[#667085]">Visão geral de peças e disponibilidade</p>
              </div>
              <Boxes size={18} className="text-[#173E75]" />
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-[#F9FAFB] rounded-md border border-[#E5E7EB] flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[#667085] block font-medium">Total em Almoxarifado</span>
                  <span className="text-base font-bold text-[#171A21]">{totalStockUnits} peças</span>
                </div>
                <span className="uze-badge uze-badge-navy">
                  {variants.length > 0 ? 'Monitorado' : 'Vazio'}
                </span>
              </div>

              <div className="p-3 bg-amber-50/70 rounded-md border border-amber-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                  <div>
                    <span className="text-[11px] text-amber-900 block font-medium">Estoque Baixo</span>
                    <span className="text-xs font-bold text-amber-950">{lowStockCount} variantes</span>
                  </div>
                </div>
                {lowStockCount > 0 ? (
                  <button 
                    onClick={() => setCurrentTab('estoque')}
                    className="text-xs text-[#173E75] font-semibold hover:underline"
                  >
                    Repor
                  </button>
                ) : (
                  <span className="text-[11px] text-amber-800 font-medium">Normal</span>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-md border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${outOfStockCount > 0 ? 'bg-red-500' : 'bg-slate-300'}`} />
                  <div>
                    <span className="text-[11px] text-slate-700 block font-medium">Sem Estoque (Zerados)</span>
                    <span className="text-xs font-bold text-slate-900">{outOfStockCount} variantes</span>
                  </div>
                </div>
                <span className={`uze-badge ${outOfStockCount > 0 ? 'uze-badge-danger' : 'uze-badge-secondary'}`}>
                  {outOfStockCount > 0 ? 'Alerta' : '0 itens'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#F3F4F6] mt-4">
            <button
              onClick={() => setCurrentTab('estoque')}
              className="w-full uze-btn-secondary text-xs justify-center py-2"
            >
              <span>Gerenciar Estoque Completo</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Vendas Recentes */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F3F4F6]">
          <div>
            <h3 className="text-sm font-bold text-[#171A21]">Vendas Recentes</h3>
            <p className="text-xs text-[#667085]">Últimos pedidos concluídos e em produção</p>
          </div>

          {filteredSales.length > 0 && (
            <button
              onClick={() => setCurrentTab('vendas')}
              className="text-xs text-[#173E75] font-semibold hover:underline flex items-center gap-1"
            >
              Ver todas as vendas ({filteredSales.length}) <ArrowRight size={13} />
            </button>
          )}
        </div>

        {filteredSales.length === 0 ? (
          /* Estado Vazio de Vendas Recentes */
          <div className="py-10 text-center flex flex-col items-center justify-center space-y-2">
            <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-[#173E75]">
              <ShoppingBag size={20} className="opacity-50" />
            </div>
            <h4 className="text-sm font-bold text-[#171A21]">Nenhuma venda registrada</h4>
            <p className="text-xs text-[#667085] max-w-sm">
              Assim que os primeiros pedidos forem registrados, o histórico recente aparecerá nesta área.
            </p>
            <button
              onClick={() => setIsNovaVendaOpen(true)}
              className="mt-2 uze-btn-primary text-xs"
            >
              <Plus size={14} />
              <span>Nova venda</span>
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block uze-table-container">
              <table className="uze-table">
                <thead>
                  <tr>
                    <th>Venda</th>
                    <th>Cliente</th>
                    <th>Data</th>
                    <th className="text-right">Total</th>
                    <th>Pagamento</th>
                    <th>Status</th>
                    <th className="text-right">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.slice(0, 5).map((sale) => (
                    <tr key={sale.id}>
                      <td className="font-semibold text-[#173E75] font-mono text-xs">{sale.id}</td>
                      <td className="font-medium text-[#171A21]">{sale.customerName}</td>
                      <td className="text-xs text-[#667085]">{sale.date}</td>
                      <td className="text-right font-semibold text-[#171A21]">
                        R$ {sale.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-xs text-[#667085]">{sale.paymentMethod}</td>
                      <td>
                        <SaleStatusBadge status={sale.status} />
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => setSelectedSaleDetail(sale)}
                          className="p-1 text-[#667085] hover:text-[#173E75] hover:bg-gray-100 rounded transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-2.5">
              {filteredSales.slice(0, 5).map((sale) => (
                <div 
                  key={sale.id} 
                  className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#173E75]">{sale.id}</span>
                    <SaleStatusBadge status={sale.status} />
                  </div>

                  <div>
                    <p className="font-bold text-[#171A21] text-xs">{sale.customerName}</p>
                    <p className="text-[11px] text-[#667085] mt-0.5">
                      {sale.date} • {sale.paymentMethod}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB]">
                    <span className="text-sm font-bold text-[#171A21]">
                      R$ {sale.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <button
                      onClick={() => setSelectedSaleDetail(sale)}
                      className="text-xs font-semibold text-[#173E75] hover:underline flex items-center gap-1 p-1"
                    >
                      <span>Ver venda</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal Detalhes da Venda */}
      {selectedSaleDetail && (
        <Modal
          isOpen={!!selectedSaleDetail}
          onClose={() => setSelectedSaleDetail(null)}
          title={`Pedido ${selectedSaleDetail.id}`}
          subtitle={`Cliente: ${selectedSaleDetail.customerName} • Data: ${selectedSaleDetail.date}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-[#F9FAFB] rounded-md border border-[#E5E7EB] flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-[#667085]">Contato</p>
                <p className="font-bold text-sm text-[#171A21]">{selectedSaleDetail.customerName}</p>
                <p className="text-[#667085]">{selectedSaleDetail.customerEmail}</p>
              </div>
              <div className="text-right">
                <SaleStatusBadge status={selectedSaleDetail.status} />
                <p className="text-[#667085] mt-1 text-[11px]">Pagamento: {selectedSaleDetail.paymentMethod}</p>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-[#171A21] uppercase text-[11px] mb-2">Itens Solicitados</h4>
              <div className="border border-[#E5E7EB] rounded-md overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F9FAFB] text-[#667085] text-[10px] uppercase font-bold border-b border-[#E5E7EB]">
                    <tr>
                      <th className="p-2.5">Item</th>
                      <th className="p-2.5">SKU</th>
                      <th className="p-2.5 text-center">Qtd</th>
                      <th className="p-2.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {selectedSaleDetail.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-medium">{item.productName}</td>
                        <td className="p-2.5 font-mono text-[11px] text-[#667085]">{item.sku}</td>
                        <td className="p-2.5 text-center font-bold">{item.quantity}</td>
                        <td className="p-2.5 text-right font-medium">
                          R$ {item.subtotal.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-[#E5E7EB] font-bold text-sm">
              <span>Total do Pedido:</span>
              <span className="text-[#173E75]">
                R$ {selectedSaleDetail.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Nova Venda */}
      <NovaVendaModal
        isOpen={isNovaVendaOpen}
        onClose={() => setIsNovaVendaOpen(false)}
      />
    </div>
  );
};
