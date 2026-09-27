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

export const DesempenhoPage: React.FC = () => {
  const { models, sales } = useERP();

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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="pb-2 border-b border-[#E5E7EB]">
        <h2 className="text-base font-bold text-[#171A21]">Desempenho por Modelo</h2>
        <p className="text-xs text-[#667085]">
          Ranking de faturamento, margem e lucratividade de cada modelo comercializado
        </p>
      </div>

      {models.length === 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-12 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-[#173E75]">
            <Trophy size={28} className="opacity-60" />
          </div>
          <h3 className="text-base font-bold text-[#171A21]">Nenhum dado de desempenho disponível</h3>
          <p className="text-xs text-[#667085] max-w-md leading-relaxed">
            Cadastre modelos de produtos e registre pedidos para acompanhar o ranking comercial, margens brutas e lucratividade por linha.
          </p>
        </div>
      ) : (
        <>
          {/* 2 Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <h3 className="text-sm font-bold text-[#171A21] mb-0.5">Faturamento por Linha</h3>
          <p className="text-xs text-[#667085] mb-4">Volume total gerado por modelo</p>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modelChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F2F5" />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
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

        <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <h3 className="text-sm font-bold text-[#171A21] mb-0.5">Lucro Estimado</h3>
          <p className="text-xs text-[#667085] mb-4">Retorno financeiro líquido por modelo</p>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modelChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F2F5" />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
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
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#F3F4F6]">
          <Trophy size={16} className="text-[#C69A43]" />
          <div>
            <h3 className="text-sm font-bold text-[#171A21]">Ranking Comercial</h3>
            <p className="text-xs text-[#667085]">Clique nas colunas para reordenar por métrica</p>
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
                      idx === 0 ? 'bg-[#C69A43] text-white' : 'bg-gray-100 text-[#667085]'
                    }`}>
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="text-[#171A21] font-semibold">{item.model.name}</p>
                      <span className="text-[10px] text-[#667085]">{item.model.category}</span>
                    </div>
                  </td>
                  <td className="text-right font-medium text-xs text-[#171A21]">{item.unitsSold} peças</td>
                  <td className="text-right font-bold text-xs text-[#173E75]">
                    R$ {item.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="text-right text-[#667085]">
                    R$ {item.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="text-right font-bold text-xs text-emerald-600">
                    R$ {item.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="text-center font-semibold text-emerald-700">
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
