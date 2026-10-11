import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Sale, Customer, Installment, PaymentRecord } from '../types';

export interface ComprovanteVendaOptions {
  sale: Sale;
  customer?: Customer;
  installments?: Installment[];
  payments?: PaymentRecord[];
  operatorName?: string;
  currentUser?: string;
  company?: {
    name?: string;
    document?: string;
    phone?: string;
    city?: string;
  };
}

/**
 * Gera o Comprovante de Venda Oficial da UZE DOCTOR em PDF
 * Documento comercial com identificação explícita de "DOCUMENTO NÃO FISCAL"
 */
export const generateSaleReceiptPdf = async ({
  sale,
  customer,
  installments = [],
  payments = [],
  operatorName,
  currentUser,
}: ComprovanteVendaOptions): Promise<boolean> => {
  const actualOperator = currentUser || operatorName || 'Sistema UZE DOCTOR';
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    // Cores da Marca UZE DOCTOR
    const COLOR_NAVY = [23, 62, 117] as const; // #173E75
    const COLOR_GOLD = [198, 154, 67] as const; // #C69A43
    const COLOR_DARK = [16, 24, 40] as const; // #101828
    const COLOR_MUTED = [100, 116, 139] as const; // #64748B
    const COLOR_LIGHT_BG = [248, 250, 252] as const; // #F8FAFC
    const COLOR_BORDER = [226, 232, 240] as const; // #E2E8F0

    let currentY = margin;

    // =========================================================================
    // 1. CABEÇALHO DO DOCUMENTO
    // =========================================================================
    // Faixa Superior / Brand Tag
    doc.setFillColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
    doc.roundedRect(margin, currentY, 28, 8, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('UZE DOCTOR', margin + 3.5, currentY + 5.5);

    // Aviso Não Fiscal em destaque
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(180, 35, 24); // Red warning
    doc.text('DOCUMENTO NÃO FISCAL', pageWidth - margin, currentY + 5.5, { align: 'right' });

    currentY += 13;

    // Título Principal
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
    doc.text('COMPROVANTE DE VENDA', margin, currentY);

    // Número da Venda e Data de Emissão
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
    const saleNumDisplay = sale.saleNumber || `#${sale.id}`;
    doc.text(
      `Pedido / Identificador: ${saleNumDisplay} • Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      margin,
      currentY + 5
    );

    currentY += 10;

    // Linha dourada decorativa
    doc.setDrawColor(COLOR_GOLD[0], COLOR_GOLD[1], COLOR_GOLD[2]);
    doc.setLineWidth(0.8);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 6;

    // =========================================================================
    // 2. DADOS DA VENDA E DO CLIENTE
    // =========================================================================
    doc.setFillColor(COLOR_LIGHT_BG[0], COLOR_LIGHT_BG[1], COLOR_LIGHT_BG[2]);
    doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 26, 2, 2, 'FD');

    // Coluna 1: Dados do Cliente
    const col1X = margin + 4;
    const col2X = margin + ((pageWidth - (margin * 2)) / 2) + 4;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(COLOR_GOLD[0], COLOR_GOLD[1], COLOR_GOLD[2]);
    doc.text('DADOS DO CLIENTE', col1X, currentY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
    doc.text(sale.customerName || customer?.name || 'Cliente Avulso', col1X, currentY + 10.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);

    const contactParts = [];
    if (customer?.phone) contactParts.push(`WhatsApp/Tel: ${customer.phone}`);
    if (customer?.document) contactParts.push(`CPF/CNPJ: ${customer.document}`);
    doc.text(contactParts.join(' • ') || 'Contato não informado', col1X, currentY + 15.5);

    const addressParts = [];
    if (customer?.city) addressParts.push(customer.city);
    if (customer?.state) addressParts.push(customer.state);
    doc.text(addressParts.length > 0 ? `Cidade: ${addressParts.join(' / ')}` : 'Localidade não informada', col1X, currentY + 20);

    // Coluna 2: Dados Comerciais
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(COLOR_GOLD[0], COLOR_GOLD[1], COLOR_GOLD[2]);
    doc.text('DADOS DA OPERAÇÃO', col2X, currentY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
    doc.text(`Data da Compra: ${sale.date || new Date().toISOString().slice(0, 10)}`, col2X, currentY + 10.5);
    doc.text(`Vendedor(a): ${sale.sellerName || 'Equipe UZE DOCTOR'}`, col2X, currentY + 15.5);
    doc.text(`Status: ${sale.status} • Forma: ${sale.paymentMethod}`, col2X, currentY + 20);

    currentY += 31;

    // =========================================================================
    // 3. TABELA DE ITENS DA VENDA
    // =========================================================================
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
    doc.text('PRODUTOS / ITENS DO PEDIDO', margin, currentY);
    currentY += 3;

    const itemsRows = (sale.items || []).map((item, index) => [
      String(index + 1),
      item.productName || 'Produto',
      item.colorName || '-',
      item.size || '-',
      `${item.quantity} un`,
      `R$ ${item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      `R$ ${(item.subtotal ?? (item.quantity * item.unitPrice)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Produto', 'Cor', 'Tam.', 'Qtd.', 'Unitário', 'Total']],
      body: itemsRows,
      theme: 'grid',
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: [23, 62, 117],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'left',
      },
      styles: {
        fontSize: 8,
        textColor: [16, 24, 40],
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
        cellPadding: 2.2,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 26 },
        3: { halign: 'center', cellWidth: 14 },
        4: { halign: 'center', cellWidth: 16 },
        5: { halign: 'right', cellWidth: 24 },
        6: { halign: 'right', cellWidth: 26, fontStyle: 'bold' },
      },
      didDrawPage: () => {},
    });

    // @ts-expect-error autoTable adds lastAutoTable to jsPDF instance
    currentY = doc.lastAutoTable.finalY + 6;

    // =========================================================================
    // 4. RESUMO FINANCEIRO (Subtotal, Desconto, Frete, Total Líquido)
    // =========================================================================
    const summaryBoxWidth = 85;
    const summaryBoxX = pageWidth - margin - summaryBoxWidth;

    doc.setFillColor(COLOR_LIGHT_BG[0], COLOR_LIGHT_BG[1], COLOR_LIGHT_BG[2]);
    doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
    doc.roundedRect(summaryBoxX, currentY, summaryBoxWidth, 25, 2, 2, 'FD');

    let sumY = currentY + 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
    doc.text('Subtotal:', summaryBoxX + 4, sumY);
    doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
    doc.text(`R$ ${sale.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, summaryBoxX + summaryBoxWidth - 4, sumY, { align: 'right' });

    if (sale.discount > 0) {
      sumY += 4.5;
      doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
      doc.text('Desconto Especial:', summaryBoxX + 4, sumY);
      doc.setTextColor(180, 35, 24); // Red
      doc.text(`- R$ ${sale.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, summaryBoxX + summaryBoxWidth - 4, sumY, { align: 'right' });
    }

    if (sale.shipping > 0) {
      sumY += 4.5;
      doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
      doc.text('Frete / Entrega:', summaryBoxX + 4, sumY);
      doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
      doc.text(`+ R$ ${sale.shipping.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, summaryBoxX + summaryBoxWidth - 4, sumY, { align: 'right' });
    }

    sumY += 5.5;
    doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
    doc.line(summaryBoxX + 4, sumY - 1.5, summaryBoxX + summaryBoxWidth - 4, sumY - 1.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
    doc.text('TOTAL LÍQUIDO:', summaryBoxX + 4, sumY + 2);
    doc.text(`R$ ${sale.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, summaryBoxX + summaryBoxWidth - 4, sumY + 2, { align: 'right' });

    // Informação de Indicação e Observações no lado esquerdo do resumo
    const leftBoxWidth = summaryBoxX - margin - 6;
    if (sale.referralName || sale.notes) {
      let infoY = currentY + 4;
      if (sale.referralName) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
        doc.text(`Indicação de Venda: ${sale.referralName}`, margin, infoY);
        infoY += 4.5;
      }
      if (sale.notes) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
        const splitNotes = doc.splitTextToSize(`Observações: ${sale.notes}`, leftBoxWidth);
        doc.text(splitNotes, margin, infoY);
      }
    }

    currentY += 31;

    // =========================================================================
    // 5. PARCELAS / CARNÊ (Se for PIX Parcelado ou possuir parcelas)
    // =========================================================================
    const saleInstallments = installments
      .filter(i => i.saleId === sale.id)
      .sort((a, b) => a.installmentNumber - b.installmentNumber);

    if (saleInstallments.length > 0) {
      // Checar quebra de página se necessário
      if (currentY + 50 > pageHeight - margin) {
        doc.addPage();
        currentY = margin;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
      doc.text(`CONDIÇÃO DE PAGAMENTO: ${sale.paymentMethod} (${saleInstallments.length}x)`, margin, currentY);
      currentY += 3;

      const instRows = saleInstallments.map(inst => [
        `Parcela ${inst.installmentNumber}/${inst.totalInstallments}`,
        `R$ ${inst.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        new Date(inst.dueDate).toLocaleDateString('pt-BR'),
        `R$ ${(inst.paidAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${(inst.remainingAmount ?? inst.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        inst.status,
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Parcela', 'Valor Original', 'Vencimento', 'Valor Pago', 'Saldo Restante', 'Status']],
        body: instRows,
        theme: 'grid',
        margin: { left: margin, right: margin },
        headStyles: {
          fillColor: [7, 16, 31],
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: 'bold',
          halign: 'center',
        },
        styles: {
          fontSize: 7.5,
          halign: 'center',
          cellPadding: 2,
        },
        columnStyles: {
          0: { halign: 'left', fontStyle: 'bold' },
          1: { halign: 'right' },
          2: { halign: 'center' },
          3: { halign: 'right', textColor: [2, 122, 72] },
          4: { halign: 'right', fontStyle: 'bold', textColor: [180, 35, 24] },
          5: { halign: 'center', fontStyle: 'bold' },
        },
      });

      // @ts-expect-error autoTable adds lastAutoTable
      currentY = doc.lastAutoTable.finalY + 5;
    }

    // =========================================================================
    // 6. POSIÇÃO FINANCEIRA CONSOLIDADA (Total Pago vs Saldo a Receber)
    // =========================================================================
    // Calcular pagamentos reais da venda
    const totalPaymentsReceived = payments
      .filter(p => p.saleId === sale.id)
      .reduce((sum, p) => sum + p.amount, 0);

    const effectivePaid = sale.paymentMethod === 'PIX Parcelado'
      ? totalPaymentsReceived
      : sale.total;

    const remainingDue = Math.max(0, sale.total - effectivePaid);

    if (currentY + 22 > pageHeight - margin) {
      doc.addPage();
      currentY = margin;
    }

    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 12, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
    doc.text(`Situação Financeira desta Venda em ${new Date().toLocaleDateString('pt-BR')}:`, margin + 4, currentY + 7.5);

    doc.setTextColor(2, 122, 72); // Green
    doc.text(`Total Pago: R$ ${effectivePaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + 90, currentY + 7.5);

    doc.setTextColor(remainingDue > 0 ? 180 : 2, remainingDue > 0 ? 35 : 122, remainingDue > 0 ? 24 : 72);
    doc.text(`Saldo a Receber: R$ ${remainingDue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + 140, currentY + 7.5);

    currentY += 18;

    // =========================================================================
    // 7. RODAPÉ INSTITUCIONAL (Não Fiscal & Auditoria)
    // =========================================================================
    const footerY = pageHeight - margin - 4;
    doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
    doc.text('UZE DOCTOR • Confecção Especializada em Jalecos e Vestuário Profissional', margin, footerY);

    doc.setFont('helvetica', 'normal');
    doc.text(
      'Este documento não possui valor fiscal e destina-se exclusivamente para conferência de compra e controle de carnê.',
      margin,
      footerY + 3.5
    );

    doc.text(
      `Gerado por: ${actualOperator}`,
      pageWidth - margin,
      footerY,
      { align: 'right' }
    );

    // Salvar o arquivo PDF
    const safeNum = (sale.saleNumber || sale.id).replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`uze-doctor-venda-${safeNum}.pdf`);
    return true;
  } catch (error) {
    console.error('Erro ao gerar Comprovante de Venda em PDF:', error);
    return false;
  }
};
