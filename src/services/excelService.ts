import * as XLSX from 'xlsx';

export type TemplateType = 'produtos' | 'variantes' | 'clientes' | 'despesas' | 'receitas';

export interface RowValidationError {
  line: number;
  field: string;
  value: any;
  error: string;
  suggestion: string;
}

export interface ExcelValidationResult<T = any> {
  valid: boolean;
  totalFound: number;
  validRows: T[];
  invalidRows: RowValidationError[];
  warnings: string[];
}

export const excelService = {
  /**
   * Gera e baixa os modelos oficiais de importação Excel (.xlsx) da UZE DOCTOR
   */
  downloadTemplate(type: TemplateType) {
    const wb = XLSX.utils.book_new();

    switch (type) {
      case 'produtos': {
        const headers = ['nome', 'categoria', 'colecao', 'genero', 'preco_venda', 'custo_base', 'descricao'];
        const sampleRows = [
          {
            nome: 'Jaleco Florence Linho Puro',
            categoria: 'Jalecos Femininos',
            colecao: 'Coleção Royale 2026',
            genero: 'Feminino',
            preco_venda: 489.90,
            custo_base: 185.00,
            descricao: 'Jaleco confeccionado em alfaiataria premium de linho com detalhes em dourado.',
          },
          {
            nome: 'Scrub Milano Tech',
            categoria: 'Scrubs Cirúrgicos',
            colecao: 'Linha Comfort Tech',
            genero: 'Unissex',
            preco_venda: 329.00,
            custo_base: 110.00,
            descricao: 'Conjunto cirúrgico com tecido elastano 4-way stretch respirável.',
          },
        ];
        const ws = XLSX.utils.json_to_sheet(sampleRows, { header: headers });
        XLSX.utils.book_append_sheet(wb, ws, 'Modelos_Produtos');
        XLSX.writeFile(wb, 'uze-doctor-modelo-produtos.xlsx');
        break;
      }

      case 'variantes': {
        const headers = ['sku_modelo', 'sku_variante', 'cor_nome', 'cor_hex', 'tamanho', 'estoque_inicial', 'estoque_minimo'];
        const sampleRows = [
          {
            sku_modelo: 'JAL-FLO-01',
            sku_variante: 'FLO-WHT-P',
            cor_nome: 'Branco Clássico',
            cor_hex: '#FFFFFF',
            tamanho: 'P',
            estoque_inicial: 25,
            estoque_minimo: 5,
          },
          {
            sku_modelo: 'JAL-FLO-01',
            sku_variante: 'FLO-WHT-M',
            cor_nome: 'Branco Clássico',
            cor_hex: '#FFFFFF',
            tamanho: 'M',
            estoque_inicial: 40,
            estoque_minimo: 8,
          },
        ];
        const ws = XLSX.utils.json_to_sheet(sampleRows, { header: headers });
        XLSX.utils.book_append_sheet(wb, ws, 'Variantes_Estoque');
        XLSX.writeFile(wb, 'uze-doctor-modelo-variantes-estoque.xlsx');
        break;
      }

      case 'clientes': {
        const headers = ['nome', 'email', 'telefone', 'documento', 'cidade', 'estado', 'observacoes'];
        const sampleRows = [
          {
            nome: 'Dra. Camila Vasconcelos',
            email: 'camila.vasconcelos@hospital.com.br',
            telefone: '(11) 98765-4321',
            documento: '123.456.789-00',
            cidade: 'São Paulo',
            estado: 'SP',
            observacoes: 'Médica cirurgiã plástica. Preferência por bordado dourado.',
          },
          {
            nome: 'Dr. Rodrigo Albuquerque',
            email: 'rodrigo.albuquerque@clinica.com.br',
            telefone: '(21) 99123-4567',
            documento: '234.567.890-11',
            cidade: 'Rio de Janeiro',
            estado: 'RJ',
            observacoes: 'Dermatologista. Pedidos trimestrais de scrubs.',
          },
        ];
        const ws = XLSX.utils.json_to_sheet(sampleRows, { header: headers });
        XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
        XLSX.writeFile(wb, 'uze-doctor-modelo-clientes.xlsx');
        break;
      }

      case 'despesas': {
        const headers = ['data', 'descricao', 'categoria', 'valor', 'forma_pagamento', 'observacoes'];
        const sampleRows = [
          {
            data: '2026-09-25',
            descricao: 'Fornecedor Tecidos Finos São Paulo',
            categoria: 'Matéria-prima',
            valor: 3450.00,
            forma_pagamento: 'PIX',
            observacoes: 'Aquisição de rolos de gabardine importada.',
          },
          {
            data: '2026-09-26',
            descricao: 'Transportadora Express Logística',
            categoria: 'Transporte',
            valor: 420.50,
            forma_pagamento: 'Boleto',
            observacoes: 'Envio de 15 pedidos comerciais para Minas Gerais.',
          },
        ];
        const ws = XLSX.utils.json_to_sheet(sampleRows, { header: headers });
        XLSX.utils.book_append_sheet(wb, ws, 'Despesas');
        XLSX.writeFile(wb, 'uze-doctor-modelo-despesas.xlsx');
        break;
      }

      case 'receitas': {
        const headers = ['data', 'origem', 'categoria', 'valor', 'forma_pagamento'];
        const sampleRows = [
          {
            data: '2026-09-25',
            origem: 'Venda Corporativa Clínica Vitae',
            categoria: 'Vendas Atacado',
            valor: 8900.00,
            forma_pagamento: 'Transferência',
          },
        ];
        const ws = XLSX.utils.json_to_sheet(sampleRows, { header: headers });
        XLSX.utils.book_append_sheet(wb, ws, 'Receitas');
        XLSX.writeFile(wb, 'uze-doctor-modelo-receitas.xlsx');
        break;
      }
    }
  },

  /**
   * Interpreta o arquivo Excel enviado e valida linha a linha
   */
  async parseAndValidate(file: File, type: TemplateType): Promise<ExcelValidationResult> {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: 'array' });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

    const validRows: any[] = [];
    const invalidRows: RowValidationError[] = [];
    const warnings: string[] = [];

    if (rows.length === 0) {
      return {
        valid: false,
        totalFound: 0,
        validRows: [],
        invalidRows: [
          {
            line: 1,
            field: 'Geral',
            value: null,
            error: 'Planilha vazia ou sem linhas de dados identificadas.',
            suggestion: 'Utilize o modelo oficial para preencher os dados.',
          }
        ],
        warnings: [],
      };
    }

    const validSizes = ['PP', 'P', 'M', 'G', 'GG', 'XGG'];

    rows.forEach((row, index) => {
      const lineNum = index + 2; // header is line 1

      switch (type) {
        case 'produtos': {
          const nome = String(row.nome || '').trim();
          const categoria = String(row.categoria || '').trim();
          const preco = Number(row.preco_venda);
          const custo = Number(row.custo_base || 0);

          if (!nome) {
            invalidRows.push({
              line: lineNum,
              field: 'nome',
              value: row.nome,
              error: 'Nome do produto/modelo é obrigatório.',
              suggestion: 'Informe o nome comercial (ex: Jaleco Florence).',
            });
            return;
          }

          if (!categoria) {
            invalidRows.push({
              line: lineNum,
              field: 'categoria',
              value: row.categoria,
              error: 'Categoria é obrigatória.',
              suggestion: 'Informe a categoria (ex: Jalecos Femininos, Scrubs).',
            });
            return;
          }

          if (isNaN(preco) || preco <= 0) {
            invalidRows.push({
              line: lineNum,
              field: 'preco_venda',
              value: row.preco_venda,
              error: 'Preço de venda inválido ou negativo.',
              suggestion: 'Informe um número positivo (ex: 489.90).',
            });
            return;
          }

          validRows.push({
            name: nome,
            category: categoria,
            collection: String(row.colecao || 'Coleção Regular').trim(),
            gender: String(row.genero || 'Feminino').trim(),
            basePrice: preco,
            baseCost: isNaN(custo) ? 0 : Math.max(0, custo),
            description: String(row.descricao || '').trim(),
            status: 'Ativo',
          });
          break;
        }

        case 'variantes': {
          const skuVariante = String(row.sku_variante || '').trim().toUpperCase();
          const tamanho = String(row.tamanho || '').trim().toUpperCase();
          const estoque = Number(row.estoque_inicial);
          const minEstoque = Number(row.estoque_minimo || 5);

          if (!skuVariante) {
            invalidRows.push({
              line: lineNum,
              field: 'sku_variante',
              value: row.sku_variante,
              error: 'SKU da variante é obrigatório e deve ser único.',
              suggestion: 'Informe o SKU (ex: FLO-WHT-M).',
            });
            return;
          }

          if (!validSizes.includes(tamanho)) {
            invalidRows.push({
              line: lineNum,
              field: 'tamanho',
              value: row.tamanho,
              error: `Tamanho inválido '${row.tamanho}'.`,
              suggestion: 'Use apenas: PP, P, M, G, GG ou XGG.',
            });
            return;
          }

          if (isNaN(estoque) || !Number.isInteger(estoque) || estoque < 0) {
            invalidRows.push({
              line: lineNum,
              field: 'estoque_inicial',
              value: row.estoque_inicial,
              error: 'Estoque inicial deve ser um número inteiro maior ou igual a zero.',
              suggestion: 'Informe quantidade inteira positiva (ex: 20). Não são permitidos decimais.',
            });
            return;
          }

          validRows.push({
            skuModel: String(row.sku_modelo || '').trim(),
            sku: skuVariante,
            colorName: String(row.cor_nome || 'Branco').trim(),
            colorHex: String(row.cor_hex || '#FFFFFF').trim(),
            size: tamanho,
            currentStock: estoque,
            minStock: isNaN(minEstoque) ? 5 : minEstoque,
          });
          break;
        }

        case 'clientes': {
          const nome = String(row.nome || '').trim();
          if (!nome) {
            invalidRows.push({
              line: lineNum,
              field: 'nome',
              value: row.nome,
              error: 'Nome do cliente é obrigatório.',
              suggestion: 'Informe o nome completo do médico/profissional.',
            });
            return;
          }

          validRows.push({
            name: nome,
            email: String(row.email || '').trim().toLowerCase(),
            phone: String(row.telefone || '').trim(),
            document: String(row.documento || '').trim(),
            city: String(row.cidade || '').trim(),
            state: String(row.estado || '').trim().toUpperCase(),
            notes: String(row.observacoes || '').trim(),
          });
          break;
        }

        case 'despesas': {
          const descricao = String(row.descricao || '').trim();
          const valor = Number(row.valor);
          const dataStr = String(row.data || new Date().toISOString().split('T')[0]).trim();

          if (!descricao) {
            invalidRows.push({
              line: lineNum,
              field: 'descricao',
              value: row.descricao,
              error: 'Descrição da despesa é obrigatória.',
              suggestion: 'Informe fornecedor ou serviço (ex: Compra de Tecidos).',
            });
            return;
          }

          if (isNaN(valor) || valor <= 0) {
            invalidRows.push({
              line: lineNum,
              field: 'valor',
              value: row.valor,
              error: 'Valor da despesa deve ser um número positivo.',
              suggestion: 'Informe o valor em reais (ex: 1250.00).',
            });
            return;
          }

          validRows.push({
            date: dataStr,
            description: descricao,
            category: String(row.categoria || 'Outras').trim(),
            amount: valor,
            paymentMethod: String(row.forma_pagamento || 'PIX').trim(),
            notes: String(row.observacoes || '').trim(),
          });
          break;
        }

        case 'receitas': {
          const origem = String(row.origem || '').trim();
          const valor = Number(row.valor);
          const dataStr = String(row.data || new Date().toISOString().split('T')[0]).trim();

          if (!origem) {
            invalidRows.push({
              line: lineNum,
              field: 'origem',
              value: row.origem,
              error: 'Origem da receita é obrigatória.',
              suggestion: 'Informe a procedência do recurso.',
            });
            return;
          }

          if (isNaN(valor) || valor <= 0) {
            invalidRows.push({
              line: lineNum,
              field: 'valor',
              value: row.valor,
              error: 'Valor da receita deve ser um número positivo.',
              suggestion: 'Informe o valor em reais (ex: 3500.00).',
            });
            return;
          }

          validRows.push({
            date: dataStr,
            source: origem,
            category: String(row.categoria || 'Vendas Diretas').trim(),
            amount: valor,
            paymentMethod: String(row.forma_pagamento || 'PIX').trim(),
          });
          break;
        }
      }
    });

    return {
      valid: invalidRows.length === 0,
      totalFound: rows.length,
      validRows,
      invalidRows,
      warnings,
    };
  },

  /**
   * Gera e baixa uma planilha contendo a auditoria e orientações de correção dos erros de importação
   */
  downloadErrorReport(errors: RowValidationError[]) {
    const wb = XLSX.utils.book_new();
    const rows = errors.map(e => ({
      'Linha Planilha': e.line,
      'Campo com Falha': e.field,
      'Valor Recebido': e.value !== null && e.value !== undefined ? String(e.value) : '[Vazio]',
      'Erro Identificado': e.error,
      'Como Corrigir': e.suggestion,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Erros_Importacao');
    XLSX.writeFile(wb, `uze-doctor-erros-importacao-${new Date().toISOString().slice(0, 10)}.xlsx`);
  },

  /**
   * Exporta conjunto de dados tabular estruturado para arquivo Excel (.xlsx) com metadados
   */
  exportToExcel(options: {
    filename: string;
    sheetName?: string;
    data: Record<string, any>[];
    columns: Array<{ header: string; dataKey?: string; key?: string; width?: number }>;
    metadata?: {
      title: string;
      period?: string;
      operator?: string;
      filters?: string;
    };
    reportInfo?: {
      title: string;
      period?: string;
      user?: string;
      operator?: string;
      filters?: string;
      recordCount?: number;
    };
  }) {
    const wb = XLSX.utils.book_new();

    // 1. Aba de Metadados / Resumo Executivo
    const meta = options.metadata || (options.reportInfo ? {
      title: options.reportInfo.title,
      period: options.reportInfo.period,
      operator: options.reportInfo.user || options.reportInfo.operator,
      filters: options.reportInfo.filters,
    } : undefined);

    if (meta) {
      const metaRows = [
        { 'Propriedade': 'Sistema', 'Valor': 'UZE DOCTOR - Gestão ERP' },
        { 'Propriedade': 'Relatório', 'Valor': meta.title },
        { 'Propriedade': 'Data de Geração', 'Valor': new Date().toLocaleString('pt-BR') },
        { 'Propriedade': 'Operador Responsável', 'Valor': meta.operator || 'Sistema' },
        { 'Propriedade': 'Período', 'Valor': meta.period || 'Integral' },
        { 'Propriedade': 'Filtros Aplicados', 'Valor': meta.filters || 'Nenhum' },
        { 'Propriedade': 'Total de Registros', 'Valor': options.data.length },
      ];
      const metaWs = XLSX.utils.json_to_sheet(metaRows);
      XLSX.utils.book_append_sheet(wb, metaWs, 'Informações');
    }

    // 2. Aba Principal com Dados Normalizados
    const formattedData = options.data.map(row => {
      const obj: Record<string, any> = {};
      options.columns.forEach(col => {
        const k = col.dataKey || col.key || '';
        obj[col.header] = row[k] ?? '-';
      });
      return obj;
    });

    const ws = XLSX.utils.json_to_sheet(formattedData);
    XLSX.utils.book_append_sheet(wb, ws, options.sheetName || 'Dados');

    XLSX.writeFile(wb, options.filename.endsWith('.xlsx') ? options.filename : `${options.filename}.xlsx`);
  }
};
