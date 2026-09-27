import type { 
  ProductModel, 
  ProductVariant, 
  StockMovement, 
  Customer, 
  Sale, 
  Revenue, 
  Expense 
} from '../types';

// Structural Domain Options (Categorias, Coleções, Tamanhos e Tipos)
export const DOMAIN_CATEGORIES = [
  'Jalecos Femininos',
  'Jalecos Masculinos',
  'Scrubs Cirúrgicos',
  'Acessórios Médicos'
];

export const DOMAIN_COLLECTIONS = [
  'Coleção Royale 2026',
  'Coleção Executive',
  'Linha Comfort Tech',
  'Linha Classic'
];

export const DOMAIN_SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XGG'] as const;

export const DOMAIN_MOVEMENT_TYPES = [
  'Entrada',
  'Venda',
  'Ajuste',
  'Devolução',
  'Perda',
  'Troca'
] as const;

export const DOMAIN_PAYMENT_METHODS = [
  'PIX',
  'Cartão de Crédito',
  'Boleto',
  'Transferência'
] as const;

export const DOMAIN_SALE_STATUSES = [
  'Orçamento',
  'Pendente',
  'Pago',
  'Em produção',
  'Enviado',
  'Concluído',
  'Cancelado'
] as const;

// Base inicial totalmente vazia de dados operacionais/demonstrativos
export const INITIAL_MODELS: ProductModel[] = [];
export const INITIAL_VARIANTS: ProductVariant[] = [];
export const INITIAL_CUSTOMERS: Customer[] = [];
export const INITIAL_SALES: Sale[] = [];
export const INITIAL_MOVEMENTS: StockMovement[] = [];
export const INITIAL_REVENUES: Revenue[] = [];
export const INITIAL_EXPENSES: Expense[] = [];
