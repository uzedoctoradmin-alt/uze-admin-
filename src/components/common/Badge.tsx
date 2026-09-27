import React from 'react';
import type { SaleStatus, MovementType } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'gold' | 'navy' | 'success' | 'warning' | 'danger' | 'info' | 'grey';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'navy', className = '' }) => {
  return (
    <span className={`uze-badge uze-badge-${variant} ${className}`}>
      {children}
    </span>
  );
};

export const SaleStatusBadge: React.FC<{ status: SaleStatus }> = ({ status }) => {
  switch (status) {
    case 'Concluído':
    case 'Pago':
      return <span className="uze-badge uze-badge-success">{status}</span>;
    case 'Em produção':
    case 'Pendente':
      return <span className="uze-badge uze-badge-warning">{status}</span>;
    case 'Enviado':
      return <span className="uze-badge uze-badge-info">{status}</span>;
    case 'Orçamento':
      return <span className="uze-badge uze-badge-navy">{status}</span>;
    case 'Cancelado':
      return <span className="uze-badge uze-badge-danger">{status}</span>;
    default:
      return <span className="uze-badge uze-badge-navy">{status}</span>;
  }
};

export const StockStatusBadge: React.FC<{ currentStock: number; minStock: number }> = ({ currentStock, minStock }) => {
  if (currentStock === 0) {
    return <span className="uze-badge uze-badge-danger">Sem Estoque</span>;
  }
  if (currentStock <= minStock) {
    return <span className="uze-badge uze-badge-warning">Estoque Baixo ({currentStock})</span>;
  }
  return <span className="uze-badge uze-badge-success">Disponível ({currentStock})</span>;
};

export const MovementTypeBadge: React.FC<{ type: MovementType }> = ({ type }) => {
  switch (type) {
    case 'Entrada':
    case 'Devolução':
      return <span className="uze-badge uze-badge-success">{type}</span>;
    case 'Venda':
      return <span className="uze-badge uze-badge-navy">{type}</span>;
    case 'Ajuste':
    case 'Troca':
      return <span className="uze-badge uze-badge-warning">{type}</span>;
    case 'Perda':
      return <span className="uze-badge uze-badge-danger">{type}</span>;
    default:
      return <span className="uze-badge uze-badge-navy">{type}</span>;
  }
};
