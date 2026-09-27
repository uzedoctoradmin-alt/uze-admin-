import React, { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet, Loader2, ChevronDown } from 'lucide-react';

interface ExportMenuProps {
  onExportPdf: () => Promise<boolean | void> | boolean | void;
  onExportExcel: () => Promise<boolean | void> | boolean | void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

export const ExportMenu: React.FC<ExportMenuProps> = ({
  onExportPdf,
  onExportExcel,
  disabled = false,
  className = '',
  label = 'Exportar',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [exportingType, setExportingType] = useState<'pdf' | 'excel' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const handlePdfClick = async () => {
    if (disabled || exportingType) return;
    try {
      setExportingType('pdf');
      setIsOpen(false);
      await onExportPdf();
    } finally {
      setExportingType(null);
    }
  };

  const handleExcelClick = async () => {
    if (disabled || exportingType) return;
    try {
      setExportingType('excel');
      setIsOpen(false);
      await onExportExcel();
    } finally {
      setExportingType(null);
    }
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={menuRef}>
      <button
        type="button"
        onClick={() => !disabled && !exportingType && setIsOpen(!isOpen)}
        disabled={disabled || exportingType !== null}
        className={`inline-flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-md text-xs font-semibold border transition-all cursor-pointer select-none ${
          disabled
            ? 'bg-[#F2F4F7] text-[#98A2B3] border-[#EAECF0] cursor-not-allowed'
            : exportingType
            ? 'bg-[#F9FAFB] text-[#173E75] border-[#173E75]/30 cursor-wait'
            : 'bg-white hover:bg-[#F9FAFB] text-[#173E75] hover:text-[#07101F] border-[#D0D5DD] hover:border-[#173E75] shadow-xs active:scale-[0.98]'
        }`}
        title="Opções de exportação de dados"
      >
        {exportingType ? (
          <Loader2 size={13} className="animate-spin text-[#173E75] shrink-0" />
        ) : (
          <Download size={13} className="text-[#173E75] shrink-0" />
        )}
        <span>
          {exportingType === 'pdf' ? 'Gerando PDF...' : exportingType === 'excel' ? 'Gerando Excel...' : label}
        </span>
        <ChevronDown size={12} className={`text-[#475467] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-1 w-44 rounded-lg bg-white border border-[#D0D5DD] shadow-lg py-1 z-50 animate-fadeIn text-xs">
          <button
            type="button"
            onClick={handlePdfClick}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[#101828] hover:bg-[#F2F4F7] transition-colors text-left font-medium cursor-pointer"
          >
            <FileText size={14} className="text-rose-600 shrink-0" />
            <div className="leading-tight">
              <span className="block font-semibold">Relatório em PDF</span>
              <span className="text-[10px] text-[#475467]">Documento formatado</span>
            </div>
          </button>

          <button
            type="button"
            onClick={handleExcelClick}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[#101828] hover:bg-[#F2F4F7] transition-colors text-left font-medium border-t border-[#F2F4F7] cursor-pointer"
          >
            <FileSpreadsheet size={14} className="text-emerald-700 shrink-0" />
            <div className="leading-tight">
              <span className="block font-semibold">Planilha Excel (.xlsx)</span>
              <span className="text-[10px] text-[#475467]">Dados e análise de tabelas</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
