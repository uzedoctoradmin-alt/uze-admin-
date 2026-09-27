import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Inbox } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  searchField?: (item: T) => string;
  filterOptions?: {
    label: string;
    key: string;
    options: { value: string; label: string }[];
    filterFn: (item: T, selectedValue: string) => boolean;
  }[];
  actions?: (item: T) => React.ReactNode;
  pageSize?: number;
  isLoading?: boolean;
  emptyText?: string;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  searchPlaceholder = 'Buscar registros...',
  searchField,
  filterOptions = [],
  actions,
  pageSize = 10,
  isLoading = false,
  emptyText = 'Nenhum registro encontrado.',
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({});
  const [sortColumnIndex, setSortColumnIndex] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter Data
  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        let matches = false;
        if (searchField) {
          matches = searchField(item).toLowerCase().includes(query);
        } else {
          matches = JSON.stringify(item).toLowerCase().includes(query);
        }
        if (!matches) return false;
      }

      for (const filter of filterOptions) {
        const selectedVal = selectedFilters[filter.key];
        if (selectedVal && selectedVal !== 'ALL') {
          if (!filter.filterFn(item, selectedVal)) return false;
        }
      }

      return true;
    });
  }, [data, searchTerm, selectedFilters, filterOptions, searchField]);

  // Sort Data
  const sortedData = useMemo(() => {
    if (sortColumnIndex === null) return filteredData;
    const col = columns[sortColumnIndex];
    if (!col || !col.accessorKey) return filteredData;

    const key = col.accessorKey;
    return [...filteredData].sort((a, b) => {
      const valA = a[key];
      const valB = b[key];

      if (valA === valB) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortDirection === 'asc' 
        ? strA.localeCompare(strB) 
        : strB.localeCompare(strA);
    });
  }, [filteredData, sortColumnIndex, sortDirection, columns]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (index: number) => {
    if (sortColumnIndex === index) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else setSortColumnIndex(null);
    } else {
      setSortColumnIndex(index);
      setSortDirection('asc');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Controls Bar: Search & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-[#D0D5DD] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475467]" />
          <input
            type="text"
            className="w-full h-8 pl-8 pr-3 text-xs bg-[#F9FAFB] border border-[#D0D5DD] rounded-md outline-none focus:border-[#173E75] focus:ring-2 focus:ring-[#173E75]/15 focus:bg-white transition-all text-[#101828] placeholder:text-[#667085] font-medium"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        {filterOptions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {filterOptions.map(filter => (
              <select
                key={filter.key}
                className="h-8 px-2.5 text-xs bg-[#F9FAFB] border border-[#D0D5DD] rounded-md outline-none text-[#101828] font-medium cursor-pointer hover:border-[#173E75] focus:border-[#173E75] focus:ring-2 focus:ring-[#173E75]/15 transition-all"
                value={selectedFilters[filter.key] || 'ALL'}
                onChange={e => {
                  setSelectedFilters(prev => ({ ...prev, [filter.key]: e.target.value }));
                  setCurrentPage(1);
                }}
              >
                <option value="ALL">Todos os {filter.label}</option>
                {filter.options.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ))}
          </div>
        )}
      </div>

      {/* Table Surface */}
      <div className="uze-table-container">
        <table className="uze-table">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th 
                  key={idx} 
                  style={{ width: col.width, textAlign: col.align || 'left' }}
                  className={col.sortable ? 'cursor-pointer select-none hover:bg-gray-100 transition-colors' : ''}
                  onClick={() => col.sortable && handleSort(idx)}
                >
                  <div className={`flex items-center gap-1.5 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}`}>
                    <span>{col.header}</span>
                    {col.sortable && (
                      <ArrowUpDown size={11} className={`text-[#667085] ${sortColumnIndex === idx ? 'text-[#173E75]' : ''}`} />
                    )}
                  </div>
                </th>
              ))}
              {actions && <th style={{ textAlign: 'right' }}>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#173E75] border-t-transparent"></div>
                  <p className="text-xs text-[#475467] font-medium mt-2">Carregando registros...</p>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center text-[#475467]">
                    <Inbox size={32} className="mb-1.5 text-[#98A2B3]" />
                    <p className="text-xs font-bold text-[#101828]">{emptyText}</p>
                    <p className="text-[11px] mt-0.5 text-[#475467]">Tente ajustar a busca ou os filtros aplicados.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map(item => (
                <tr key={item.id}>
                  {columns.map((col, idx) => (
                    <td key={idx} style={{ textAlign: col.align || 'left' }}>
                      {col.cell 
                        ? col.cell(item) 
                        : col.accessorKey 
                          ? String(item[col.accessorKey] ?? '') 
                          : null}
                    </td>
                  ))}
                  {actions && (
                    <td style={{ textAlign: 'right' }}>
                      {actions(item)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between px-1 text-xs text-[#475467] font-medium">
        <div>
          Mostrando <span className="font-bold text-[#101828]">{sortedData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> a{' '}
          <span className="font-bold text-[#101828]">{Math.min(currentPage * pageSize, sortedData.length)}</span> de{' '}
          <span className="font-bold text-[#101828]">{sortedData.length}</span> resultados
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 border border-[#D0D5DD] rounded bg-white text-[#344054] hover:bg-[#F2F4F7] hover:text-[#173E75] disabled:bg-[#F2F4F7] disabled:text-[#98A2B3] disabled:border-[#D0D5DD] disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#173E75]/20"
              aria-label="Página anterior"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2 font-bold text-[#101828]">
              {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 border border-[#D0D5DD] rounded bg-white text-[#344054] hover:bg-[#F2F4F7] hover:text-[#173E75] disabled:bg-[#F2F4F7] disabled:text-[#98A2B3] disabled:border-[#D0D5DD] disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#173E75]/20"
              aria-label="Próxima página"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
