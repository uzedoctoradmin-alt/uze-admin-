export type PeriodFilter = 'Hoje' | '7d' | '30d' | 'Este mês' | 'Mês anterior' | 'Personalizado';

export type ProductStatus = 'Ativo' | 'Inativo' | 'Arquivado';
export type GenderCategory = 'Feminino' | 'Masculino' | 'Unissex';
export type VariantSize = 'PP' | 'P' | 'M' | 'G' | 'GG' | 'XGG' | 'Único';

export interface ProductColor {
  id?: string;
  name: string;
  hex: string;
  isFavorite?: boolean;
}

export interface ColorItem {
  id: string;
  name: string;
  hexCode: string;
  isFavorite: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductModel {
  id: string;
  name: string;
  category: string;
  description: string;
  basePrice: number;
  baseCost: number;
  gender: GenderCategory;
  status: ProductStatus;
  imageUrl: string;
  imagePath?: string;
  availableColors?: ProductColor[];
  availableSizes?: VariantSize[];
  createdAt: string;
}

export interface ProductVariant {
  id: string;
  modelId: string;
  sku: string;
  colorId?: string;
  colorName: string;
  colorHex: string;
  size: VariantSize;
  currentStock: number;
  minStock: number;
  costPrice?: number;
  salePrice?: number;
  status?: string;
}

export type MovementType = 'Entrada' | 'Venda' | 'Ajuste' | 'Devolução' | 'Perda' | 'Troca' | 'Correção';

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
  direction?: 'ENTRADA' | 'SAIDA';
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
  | 'PIX Parcelado'
  | 'Dinheiro'
  | 'Cartão de Crédito' 
  | 'Cartão de Débito'
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
  installments?: number;
  installmentDetails?: {
    count: number;
    downPayment?: number;
    firstDueDate: string;
    periodicity?: 'mensal';
  };
  status: SaleStatus;
  notes?: string;
}

// ==========================================
// PARCELAMENTO / CARNÊ / RECEBÍVEIS
// ==========================================

export type InstallmentStatus = 'Pendente' | 'Pago' | 'Atrasado' | 'Cancelado' | 'Parcial';

export interface InstallmentPayment {
  id: string;
  installmentId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

export interface Installment {
  id: string;
  receivableId?: string;
  saleId: string;
  customerId: string;
  customerName?: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  dueDate: string;
  status: InstallmentStatus;
  paidAmount: number;
  remainingAmount: number;
  paymentDate?: string;
  paymentMethod?: PaymentMethod;
  payments?: InstallmentPayment[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentAllocation {
  id: string;
  paymentId: string;
  installmentId: string;
  installmentNumber?: number;
  amount: number;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  saleId: string;
  customerId: string;
  customerName?: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  allocations: PaymentAllocation[];
}

export interface Receivable {
  id: string;
  saleId: string;
  customerId: string;
  customerName: string;
  totalAmount: number;
  installmentsCount: number;
  status: 'Pendente' | 'Parcial' | 'Pago' | 'Cancelado';
  createdAt: string;
  updatedAt?: string;
}

// ==========================================
// FORNECEDORES & ENTRADAS / COMPRAS
// ==========================================

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  status: 'Ativo' | 'Inativo';
  createdAt?: string;
  updatedAt?: string;
}

export interface PurchaseItem {
  id: string;
  purchaseId?: string;
  variantId: string;
  productName: string;
  colorName?: string;
  size?: string;
  sku?: string;
  unitCost: number;
  quantity: number;
  totalCost: number;
}

export interface PurchaseEntry {
  id: string;
  entryNumber: string; // ex: ENT-00001
  supplierId?: string;
  supplierName: string;
  date: string;
  items: PurchaseItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  notes?: string;
  status: 'Concluído' | 'Cancelado';
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
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
  | 'produtos'
  | 'modelos'
  | 'estoque'
  | 'entradas'
  | 'movimentacoes'
  | 'financeiro'
  | 'financeiro-visao'
  | 'financeiro-receitas'
  | 'financeiro-despesas'
  | 'financeiro-receber'
  | 'relatorio-mensal'
  | 'desempenho'
  | 'configuracoes'
  | 'administracao'
  | 'funcionarios';

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
  | 'sales.delete'
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
  | 'purchases.read'
  | 'purchases.create'
  | 'purchases.edit'
  | 'purchases.delete'
  | 'installments.manage'
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

