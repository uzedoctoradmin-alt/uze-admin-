export type PeriodFilter = 'Hoje' | '7d' | '30d' | 'Este mês' | 'Mês anterior' | 'Personalizado';

export type ProductStatus = 'Ativo' | 'Inativo';
export type GenderCategory = 'Feminino' | 'Masculino' | 'Unissex';
export type VariantSize = 'PP' | 'P' | 'M' | 'G' | 'GG' | 'XGG';

export interface ProductModel {
  id: string;
  name: string;
  category: string;
  collection: string;
  description: string;
  basePrice: number;
  baseCost: number;
  gender: GenderCategory;
  status: ProductStatus;
  imageUrl: string;
  createdAt: string;
}

export interface ProductVariant {
  id: string;
  modelId: string;
  sku: string;
  colorName: string;
  colorHex: string;
  size: VariantSize;
  currentStock: number;
  minStock: number;
}

export type MovementType = 'Entrada' | 'Venda' | 'Ajuste' | 'Devolução' | 'Perda' | 'Troca';

export interface StockMovement {
  id: string;
  date: string;
  variantId: string;
  productName: string;
  sku: string;
  colorName: string;
  size: string;
  type: MovementType;
  quantity: number;
  reason: string;
  user: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  document: string;
  city: string;
  state: string;
  firstPurchaseDate: string;
  lastPurchaseDate: string;
  totalOrders: number;
  totalSpent: number;
}

export interface SaleItem {
  id: string;
  variantId: string;
  modelId: string;
  productName: string;
  colorName: string;
  size: string;
  sku: string;
  unitPrice: number;
  unitCost: number;
  quantity: number;
  subtotal: number;
}

export type SaleStatus = 
  | 'Orçamento' 
  | 'Pendente' 
  | 'Pago' 
  | 'Em produção' 
  | 'Enviado' 
  | 'Concluído' 
  | 'Cancelado';

export type PaymentMethod = 
  | 'PIX' 
  | 'Cartão de Crédito' 
  | 'Boleto' 
  | 'Transferência';

export interface Sale {
  id: string;
  date: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  totalCost: number;
  estimatedProfit: number;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
}

export type RevenueCategory = 
  | 'Vendas Diretas' 
  | 'Vendas Atacado' 
  | 'Personalização/Bordado' 
  | 'Outras Receitas';

export interface Revenue {
  id: string;
  date: string;
  source: string;
  referenceId?: string;
  category: RevenueCategory;
  amount: number;
  paymentMethod: string;
}

export type ExpenseCategory = 
  | 'Fornecedores' 
  | 'Matéria-prima' 
  | 'Confecção' 
  | 'Embalagens' 
  | 'Transporte' 
  | 'Marketing' 
  | 'Aluguel' 
  | 'Serviços' 
  | 'Impostos' 
  | 'Outras';

export interface Expense {
  id: string;
  date: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  paymentMethod: string;
  notes?: string;
}

export type ViewTab = 
  | 'dashboard'
  | 'vendas'
  | 'clientes'
  | 'produtos'
  | 'modelos'
  | 'estoque'
  | 'movimentacoes'
  | 'financeiro-visao'
  | 'financeiro-receitas'
  | 'financeiro-despesas'
  | 'relatorio-mensal'
  | 'desempenho'
  | 'configuracoes';
