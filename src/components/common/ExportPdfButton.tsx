import React, { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';

interface ExportPdfButtonProps {
  onExport: () => Promise<boolean | void> | boolean | void;
  label?: string;
  disabled?: boolean;
  className?: string;
  title?: string;
}

export const ExportPdfButton: React.FC<ExportPdfButtonProps> = ({
  onExport,
  label = 'Exportar PDF',
  disabled = false,
  className = '',
  title = 'Exportar relatório oficial em PDF',
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleClick = async () => {
    if (disabled || isExporting) return;
    try {
      setIsExporting(true);
      await onExport();
    } catch (err) {
      console.error('[ExportPdfButton] Falha na geração do PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isExporting}
      title={title}
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold border transition-all cursor-pointer select-none ${
        disabled
          ? 'bg-[#F2F4F7] text-[#98A2B3] border-[#EAECF0] cursor-not-allowed'
          : isExporting
          ? 'bg-[#F9FAFB] text-[#173E75] border-[#173E75]/30 cursor-wait'
          : 'bg-white hover:bg-[#F9FAFB] text-[#173E75] hover:text-[#07101F] border-[#D0D5DD] hover:border-[#173E75] shadow-xs active:scale-[0.98]'
      } ${className}`}
    >
      {isExporting ? (
        <Loader2 size={14} className="animate-spin text-[#173E75] shrink-0" />
      ) : (
        <FileDown size={14} className="text-[#173E75] shrink-0" />
      )}
      <span>{isExporting ? 'Gerando PDF...' : label}</span>
    </button>
  );
};
