# Integração UZE DOCTOR com Supabase

Este projeto está integrado ao **Supabase Database & Realtime**:

- **Project Name:** `uzedoctoradmin-alt's Project`
- **Project ID:** `xpjlixvifoytxgplesnq`
- **Supabase URL:** `https://xpjlixvifoytxgplesnq.supabase.co`
- **Publishable Key:** `sb_publishable_7_giSIHoHNZ6CeuVDo5sFQ_BpTvyE_D`

## Como criar as tabelas no Supabase

1. Acesse o painel do seu projeto no Supabase:
   👉 **https://supabase.com/dashboard/project/xpjlixvifoytxgplesnq**
2. No menu lateral esquerdo, clique no ícone **SQL Editor** (ícone de terminal `>_`).
3. Clique em **"New query"**.
4. Abra o arquivo [`schema.sql`](./schema.sql) deste repositório, copie todo o seu conteúdo e cole no editor do Supabase.
5. Clique no botão verde **Run** (ou pressione `Ctrl + Enter`).
6. Pronto! Todas as 7 tabelas com Row Level Security (RLS) estarão criadas e prontas para uso.

## Estrutura das Tabelas Criadas:

1. **`models`**: Modelos de jalecos e scrubs (nome, categoria, coleção, preço base, custo base, gênero, imagem, status).
2. **`variants`**: Variações por modelo (SKU único, cor, hex, tamanho PP/P/M/G/GG/XGG, estoque atual, estoque mínimo).
3. **`customers`**: Cadastro de clientes (nome, e-mail, telefone, CPF/CNPJ, cidade, estado, histórico de compras).
4. **`sales`**: Pedidos e vendas (cliente, itens em JSONB, subtotal, frete, desconto, total, custo, lucro, status).
5. **`stock_movements`**: Histórico auditável de movimentações (entrada, venda, devolução, ajuste, operador, quantidade).
6. **`revenues`**: Registro de receitas operacionais e entradas financeiras.
7. **`expenses`**: Registro de despesas e custos operacionais.
