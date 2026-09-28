export type PeriodFilter = 'Hoje' | '7d' | '30d' | 'Este mês' | 'Mês anterior' | 'Personalizado';

export type ProductStatus = 'Ativo' | 'Inativo' | 'Arquivado';
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
  imagePath?: string;
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
  status?: string;
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
  email?: string;
  phone?: string;
  document?: string;
  city?: string;
  state?: string;
  firstPurchaseDate: string;
  lastPurchaseDate: string;
  totalOrders: number;
  totalSpent: number;
  notes?: string;
  status?: 'Ativo' | 'Arquivado' | 'Inativo';
}

export interface Employee {
  id: string;
  name: string;
  jobTitle: string;
  isSeller: boolean;
  phone?: string;
  email?: string;
  notes?: string;
  status: 'Ativo' | 'Inativo';
  userId?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  archivedAt?: string;
}

export interface SaleItem {
  id: string;
  variantId?: string;
  modelId?: string;
  productName: string;
  colorName?: string;
  size?: string;
  sku?: string;
  unitPrice: number;
  unitCost: number;
  quantity: number;
  subtotal: number;
  isCustom?: boolean;
  customDescription?: string;
  notes?: string;
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

export type DiscountType = 'FIXED' | 'PERCENTAGE';

export interface Sale {
  id: string;
  saleNumber?: string;
  date: string;
  saleDate?: string;
  occurredAt?: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  sellerId?: string;
  sellerName?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  discountType?: DiscountType;
  discountValue?: number;
  discountAmount?: number;
  discountNote?: string;
  hasReferral?: boolean;
  referralName?: string;
  referralNote?: string;
  shipping: number;
  total: number;
  totalCost: number;
  estimatedProfit: number;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  notes?: string;
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
  status?: 'Pendente' | 'Pago' | 'Cancelado';
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
  | 'funcionarios'
  | 'produtos'
  | 'modelos'
  | 'estoque'
  | 'movimentacoes'
  | 'financeiro-visao'
  | 'financeiro-receitas'
  | 'financeiro-despesas'
  | 'relatorio-mensal'
  | 'desempenho'
  | 'configuracoes'
  | 'administracao';

// ==========================================
// AUTENTICAÇÃO E CONTROLE DE ACESSO (RBAC)
// ==========================================

export type UserRole = 'ADMINISTRADOR' | 'VENDEDOR' | 'VISUALIZACAO';
export type UserStatus = 'Ativo' | 'Inativo' | 'Bloqueado';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  mustChangePassword: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface DatabaseUser extends User {
  passwordHash: string;
  salt: string;
}

export type Permission = 
  | 'dashboard.read'
  | 'dashboard.financial.read'
  | 'sales.read'
  | 'sales.create'
  | 'sales.edit'
  | 'sales.cancel'
  | 'customers.read'
  | 'customers.create'
  | 'customers.edit'
  | 'customers.delete'
  | 'employees.read'
  | 'employees.create'
  | 'employees.edit'
  | 'employees.delete'
  | 'products.read'
  | 'products.create'
  | 'products.edit'
  | 'products.delete'
  | 'products.cost.read'
  | 'inventory.read'
  | 'inventory.adjust'
  | 'movements.read'
  | 'finance.read'
  | 'finance.manage'
  | 'reports.read'
  | 'reports.financial.read'
  | 'admin.users.manage'
  | 'admin.logs.read'
  | 'settings.manage';

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorEmail: string;
  action: string;
  targetId?: string;
  targetName?: string;
  details?: Record<string, any>;
  createdAt: string;
}

export interface CompanySettings {
  id?: string;
  tradeName?: string;
  legalName?: string;
  taxId?: string;
  commercialAddress?: string;
  corporateEmail?: string;
  defaultMinStock?: number;
  enableLowStockAlert?: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

