import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PdfKpiCard {
  label: string;
  value: string;
}

export interface PdfColumn {
  header: string;
  dataKey: string;
  align?: 'left' | 'center' | 'right';
  width?: number;
}

export interface PdfExportOptions {
  title: string;
  subtitle?: string;
  period?: string;
  operatorName?: string;
  orientation?: 'portrait' | 'landscape';
  filename: string;
  kpis?: PdfKpiCard[];
  columns: PdfColumn[];
  rows: Record<string, any>[];
}

/**
 * Universal UZE DOCTOR PDF Report Generator
 * Builds high-fidelity, vectorized, multi-page branded PDF reports.
 */
export const exportReportToPdf = async (options: PdfExportOptions): Promise<boolean> => {
  try {
    const orientation = options.orientation || 'portrait';
    const doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    // Brand Colors
    const COLOR_NAVY = [7, 16, 31] as const; // #07101F
    const COLOR_GOLD = [198, 154, 67] as const; // #C69A43
    const COLOR_TEXT_DARK = [16, 24, 40] as const; // #101828
    const COLOR_TEXT_MUTED = [102, 112, 133] as const; // #667085
    const COLOR_BORDER = [208, 213, 221] as const; // #D0D5DD
    const COLOR_BG_LIGHT = [249, 250, 251] as const; // #F9FAFB

    let currentY = margin;

    // ==========================================
    // 1. BRAND HEADER
    // ==========================================
    // Logo Brand Tag
    doc.setFillColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
    doc.roundedRect(margin, currentY, 24, 7, 1, 1, 'F');
    doc.setTextColor(COLOR_GOLD[0], COLOR_GOLD[1], COLOR_GOLD[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('UZE DOCTOR', margin + 2.5, currentY + 4.8);

    // Title
    doc.setTextColor(COLOR_TEXT_DARK[0], COLOR_TEXT_DARK[1], COLOR_TEXT_DARK[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(options.title.toUpperCase(), margin, currentY + 14);

    // Subtitle & Period
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(COLOR_TEXT_MUTED[0], COLOR_TEXT_MUTED[1], COLOR_TEXT_MUTED[2]);
    const subtitleText = [
      options.subtitle || 'Relatório Analítico Oficial',
      options.period ? `Período: ${options.period}` : '',
    ].filter(Boolean).join('  |  ');
    doc.text(subtitleText, margin, currentY + 19);

    // Metadata Right-aligned
    const emitDate = new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const rightX = pageWidth - margin;
    doc.setFontSize(7.5);
    doc.text(`Emissão: ${emitDate}`, rightX, currentY + 5, { align: 'right' });
    if (options.operatorName) {
      doc.text(`Operador: ${options.operatorName}`, rightX, currentY + 9, { align: 'right' });
    }
    doc.setTextColor(COLOR_GOLD[0], COLOR_GOLD[1], COLOR_GOLD[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('DOCUMENTO OFICIAL AUDITADO', rightX, currentY + 13, { align: 'right' });

    // Gold Accent Line
    currentY += 22;
    doc.setDrawColor(COLOR_GOLD[0], COLOR_GOLD[1], COLOR_GOLD[2]);
    doc.setLineWidth(0.6);
    doc.line(margin, currentY, rightX, currentY);
    currentY += 4;

    // ==========================================
    // 2. EXECUTIVE KPI CARDS BLOCK (IF PROVIDED)
    // ==========================================
    if (options.kpis && options.kpis.length > 0) {
      const kpiCount = Math.min(options.kpis.length, 5);
      const totalAvailableWidth = pageWidth - margin * 2;
      const cardGap = 3;
      const cardWidth = (totalAvailableWidth - cardGap * (kpiCount - 1)) / kpiCount;
      const cardHeight = 13;

      options.kpis.slice(0, 5).forEach((kpi, idx) => {
        const cardX = margin + idx * (cardWidth + cardGap);
        // Card background
        doc.setFillColor(COLOR_BG_LIGHT[0], COLOR_BG_LIGHT[1], COLOR_BG_LIGHT[2]);
        doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
        doc.setLineWidth(0.2);
        doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

        // Card Label
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(COLOR_TEXT_MUTED[0], COLOR_TEXT_MUTED[1], COLOR_TEXT_MUTED[2]);
        doc.text(kpi.label.toUpperCase(), cardX + 3, currentY + 4.5);

        // Card Value
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
        doc.text(kpi.value, cardX + 3, currentY + 10);
      });

      currentY += cardHeight + 5;
    }

    // ==========================================
    // 3. TABLE GENERATION (AUTOTABLE)
    // ==========================================
    const head = [options.columns.map(c => c.header)];
    const body = options.rows.map(row => 
      options.columns.map(c => {
        const val = row[c.dataKey];
        if (val === null || val === undefined) return '-';
        return String(val);
      })
    );

    const columnStyles: Record<number, any> = {};
    options.columns.forEach((col, idx) => {
      columnStyles[idx] = {
        halign: col.align || 'left',
        cellWidth: col.width ? col.width : 'auto',
      };
    });

    autoTable(doc, {
      startY: currentY,
      head: head,
      body: body,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 7.5,
        cellPadding: 2.2,
        textColor: [COLOR_TEXT_DARK[0], COLOR_TEXT_DARK[1], COLOR_TEXT_DARK[2]],
        lineColor: [228, 231, 236],
        lineWidth: 0.15,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        halign: 'left',
      },
      alternateRowStyles: {
        fillColor: [COLOR_BG_LIGHT[0], COLOR_BG_LIGHT[1], COLOR_BG_LIGHT[2]],
      },
      columnStyles: columnStyles,
      margin: { left: margin, right: margin, bottom: 16 },
      didDrawPage: (data) => {
        // Footer on each page
        const pageNum = data.pageNumber;
        const totalPages = (doc.internal as any).getNumberOfPages ? (doc.internal as any).getNumberOfPages() : pageNum;
        
        doc.setDrawColor(228, 231, 236);
        doc.setLineWidth(0.3);
        doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(COLOR_TEXT_MUTED[0], COLOR_TEXT_MUTED[1], COLOR_TEXT_MUTED[2]);
        doc.text('UZE DOCTOR  |  Plataforma de Gestão ERP  |  Confidencial', margin, pageHeight - 6.5);
        doc.text(`Página ${pageNum} de ${totalPages}`, pageWidth - margin, pageHeight - 6.5, { align: 'right' });
      },
    });

    // Save PDF file
    doc.save(options.filename.endsWith('.pdf') ? options.filename : `${options.filename}.pdf`);
    return true;
  } catch (error) {
    console.error('[PdfExportService] Error exporting PDF:', error);
    return false;
  }
};
