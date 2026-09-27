import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Trophy, ArrowUpDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ExportMenu } from '../components/common/ExportMenu';
import { exportReportToPdf } from '../services/pdfExportService';
import { excelService } from '../services/excelService';

export const DesempenhoPage: React.FC = () => {
  const { models, sales, periodFilter } = useERP();
  const { user, hasPermission } = useAuth();
  const canReadCosts = hasPermission('products.cost.read');

  const [sortKey, setSortKey] = useState<'unitsSold' | 'revenue' | 'profit' | 'margin'>('revenue');
  const [sortAsc, setSortAsc] = useState(false);

  const modelRanking = models.map(model => {
    let unitsSold = 0;
    let revenue = 0;
    let cost = 0;

    sales.forEach(sale => {
      if (sale.status !== 'Cancelado') {
        sale.items.forEach(item => {
          if (item.modelId === model.id) {
            unitsSold += item.quantity;
            revenue += item.subtotal;
            cost += item.unitCost * item.quantity;
          }
        });
      }
    });

    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return {
      model,
      unitsSold,
      revenue,
      cost,
      profit,
      margin,
    };
  });

  const sortedRanking = [...modelRanking].sort((a, b) => {
    const valA = a[sortKey];
    const valB = b[sortKey];
    return sortAsc ? valA - valB : valB - valA;
  });

  const handleSort = (key: 'unitsSold' | 'revenue' | 'profit' | 'margin') => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const modelChartData = modelRanking.map(item => ({
    name: item.model.name.replace('Jaleco ', '').replace('Scrub ', ''),
    Faturamento: item.revenue,
    Lucro: item.profit,
  }));

  const handleExportPdf = async () => {
    const totalUnitsSold = sortedRanking.reduce((sum, item) => sum + item.unitsSold, 0);
    const totalRevenue = sortedRanking.reduce((sum, item) => sum + item.revenue, 0);
    const totalProfit = sortedRanking.reduce((sum, item) => sum + item.profit, 0);

    const kpis = [
      { label: 'Modelos Avaliados', value: `${sortedRanking.length} produtos` },
      { label: 'Unidades Comercializadas', value: `${totalUnitsSold} un` },
      { label: 'Faturamento Total', value: `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
      ...(canReadCosts ? [{ label: 'Lucro Bruto', value: `R$ ${totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` }] : []),
    ];

    const pdfColumns = [
      { header: 'Posição', dataKey: 'position', align: 'center' as const, width: 18 },
      { header: 'Modelo / Produto', dataKey: 'name' },
      { header: 'Categoria', dataKey: 'category', width: 30 },
      { header: 'Unidades Vendidas', dataKey: 'unitsSoldStr', align: 'right' as const, width: 28 },
      { header: 'Faturamento (R$)', dataKey: 'revenueStr', align: 'right' as const, width: 32 },
      ...(canReadCosts ? [
        { header: 'Custo Total (R$)', dataKey: 'costStr', align: 'right' as const, width: 30 },
        { header: 'Lucro Bruto (R$)', dataKey: 'profitStr', align: 'right' as const, width: 30 },
        { header: 'Margem (%)', dataKey: 'marginStr', align: 'right' as const, width: 24 },
      ] : []),
    ];

    const rows = sortedRanking.map((item, idx) => ({
      position: `${idx + 1}º`,
      name: item.model.name,
      category: item.model.category,
      unitsSoldStr: `${item.unitsSold} un`,
      revenueStr: item.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      ...(canReadCosts ? {
        costStr: item.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        profitStr: item.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        marginStr: `${item.margin.toFixed(1)}%`,
      } : {}),
    }));

    await exportReportToPdf({
      title: 'Relatório Oficial de Desempenho & Ranking por Modelo',
      subtitle: canReadCosts ? 'Curva ABC comercial e lucratividade por produto' : 'Ranking comercial de vendas por produto',
      period: periodFilter,
      operatorName: user?.name,
      orientation: 'landscape',
      filename: `uze-doctor-desempenho-${new Date().toISOString().slice(0, 10)}.pdf`,
      kpis,
      columns: pdfColumns,
      rows,
    });
  };

  const handleExportExcel = async () => {
    const excelColumns = [
      { header: 'Posição', key: 'position', width: 10 },
      { header: 'Modelo / Produto', key: 'name', width: 28 },
      { header: 'Categoria', key: 'category', width: 16 },
      { header: 'Unidades Vendidas (un)', key: 'unitsSold', width: 22 },
      { header: 'Faturamento (R$)', key: 'revenue', width: 18 },
      ...(canReadCosts ? [
        { header: 'Custo Total (R$)', key: 'cost', width: 18 },
        { header: 'Lucro Bruto (R$)', key: 'profit', width: 18 },
        { header: 'Margem (%)', key: 'margin', width: 14 },
      ] : []),
    ];

    const excelData = sortedRanking.map((item, idx) => ({
      position: idx + 1,
      name: item.model.name,
      category: item.model.category,
      unitsSold: item.unitsSold,
      revenue: item.revenue,
      ...(canReadCosts ? {
        cost: item.cost,
        profit: item.profit,
        margin: Number(item.margin.toFixed(2)),
      } : {}),
    }));

    await excelService.exportToExcel({
      filename: `uze-doctor-desempenho-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Ranking de Modelos',
      columns: excelColumns,
      data: excelData,
      reportInfo: {
        title: 'Relatório de Desempenho & Curva ABC por Modelo',
        user: user?.name,
        filters: `Período: ${periodFilter} | Ordenação: ${sortKey}`,
        recordCount: sortedRanking.length,
      },
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#D0D5DD]">
        <div>
          <h2 className="text-base font-bold text-[#101828]">Desempenho por Modelo</h2>
          <p className="text-xs text-[#475467] font-medium">
            Ranking de faturamento, margem e lucratividade de cada modelo comercializado
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportMenu onExportPdf={handleExportPdf} onExportExcel={handleExportExcel} />
        </div>
      </div>

      {models.length === 0 ? (
        <div className="bg-white border border-[#D0D5DD] rounded-lg p-12 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-[#EFF4FF] border border-[#D0D5DD] flex items-center justify-center text-[#173E75]">
            <Trophy size={28} />
          </div>
          <h3 className="text-base font-bold text-[#101828]">Nenhum dado de desempenho disponível</h3>
          <p className="text-xs text-[#475467] font-medium max-w-md leading-relaxed">
            Cadastre modelos de produtos e registre pedidos para acompanhar o ranking comercial, margens brutas e lucratividade por linha.
          </p>
        </div>
      ) : (
        <>
          {/* 2 Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-[#D0D5DD] rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <h3 className="text-sm font-bold text-[#101828] mb-0.5">Faturamento por Linha</h3>
          <p className="text-xs text-[#475467] font-medium mb-4">Volume total gerado por modelo</p>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modelChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E7EC" />
                <XAxis dataKey="name" stroke="#475467" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#475467" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#07101F',
                    border: '1px solid #173E75',
                    borderRadius: '6px',
                    color: '#FFF',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [`R$ ${Number(val).toFixed(2)}`, 'Faturamento']}
                />
                <Bar dataKey="Faturamento" fill="#173E75" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-[#D0D5DD] rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <h3 className="text-sm font-bold text-[#101828] mb-0.5">Lucro Estimado</h3>
          <p className="text-xs text-[#475467] font-medium mb-4">Retorno financeiro líquido por modelo</p>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modelChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E7EC" />
                <XAxis dataKey="name" stroke="#475467" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#475467" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#07101F',
                    border: '1px solid #C69A43',
                    borderRadius: '6px',
                    color: '#FFF',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [`R$ ${Number(val).toFixed(2)}`, 'Lucro']}
                />
                <Bar dataKey="Lucro" fill="#C69A43" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Ranking Table */}
      <div className="bg-white border border-[#D0D5DD] rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#D0D5DD]">
          <Trophy size={16} className="text-[#C69A43]" />
          <div>
            <h3 className="text-sm font-bold text-[#101828]">Ranking Comercial</h3>
            <p className="text-xs text-[#475467] font-medium">Clique nas colunas para reordenar por métrica</p>
          </div>
        </div>

        <div className="uze-table-container">
          <table className="uze-table text-xs">
            <thead>
              <tr>
                <th>Posição & Modelo</th>
                <th 
                  className="cursor-pointer select-none text-right hover:bg-gray-100"
                  onClick={() => handleSort('unitsSold')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Peças Vendidas</span> <ArrowUpDown size={11} />
                  </div>
                </th>
                <th 
                  className="cursor-pointer select-none text-right hover:bg-gray-100"
                  onClick={() => handleSort('revenue')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Faturamento</span> <ArrowUpDown size={11} />
                  </div>
                </th>
                <th className="text-right">Custo Total</th>
                <th 
                  className="cursor-pointer select-none text-right hover:bg-gray-100"
                  onClick={() => handleSort('profit')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Lucro Estimado</span> <ArrowUpDown size={11} />
                  </div>
                </th>
                <th 
                  className="cursor-pointer select-none text-center hover:bg-gray-100"
                  onClick={() => handleSort('margin')}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Margem %</span> <ArrowUpDown size={11} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRanking.map((item, idx) => (
                <tr key={item.model.id}>
                  <td className="font-medium flex items-center gap-2.5 py-3">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      idx === 0 ? 'bg-[#C69A43] text-white' : 'bg-[#F2F4F7] text-[#344054] border border-[#D0D5DD]'
                    }`}>
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="text-[#101828] font-semibold">{item.model.name}</p>
                      <span className="text-[10px] text-[#475467] font-medium">{item.model.category}</span>
                    </div>
                  </td>
                  <td className="text-right font-bold text-xs text-[#101828]">{item.unitsSold} peças</td>
                  <td className="text-right font-black text-xs text-[#173E75]">
                    R$ {item.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="text-right text-[#475467] font-medium">
                    R$ {item.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="text-right font-bold text-xs text-[#027A48]">
                    R$ {item.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="text-center font-bold text-[#027A48]">
                    {item.margin.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}
    </div>
  );
};
