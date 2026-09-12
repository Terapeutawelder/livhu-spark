# Exportação de dados do banco (JSON)

## Objetivo
Permitir que o super admin baixe uma cópia dos dados do Lovable Cloud em JSON diretamente pelo painel `/admin`, já que não existe acesso direto ao PostgreSQL fora do app.

## O que será entregue
1. Nova página `/admin/dados` no painel Super Admin com:
   - Botão **Exportar tudo** (todas as tabelas do schema `public`).
   - Botão **Exportar dados do tenant selecionado** (filtro por cliente).
   - Indicador de progresso e download automático de um arquivo `.json`.
2. Server function protegida para super admin que lê as tabelas com service role e monta o objeto JSON.
3. Link no menu lateral do Super Admin (`Dados & Backup`).

## Escopo técnico
- Criar `src/routes/_authenticated.admin.dados.tsx`.
- Criar `src/lib/backup.functions.ts` com:
  - `exportAllData()` — super admin, service role, retorna JSON com todas as tabelas públicas.
  - `exportTenantData(tenantId)` — super admin, service role, retorna apenas linhas que pertencem ao tenant (via `tenant_id` ou `owner_id` quando aplicável).
- Usar `supabaseAdmin` dentro do handler, após verificar `super_admin` via `context.supabase` + `user_roles`.
- Tabelas incluídas na exportação: todas as tabelas do schema `public` listadas no banco (`tenants`, `profiles`, `contacts`, `appointments`, `invoices`, `flows`, `whatsapp_messages`, etc.).
- Dados sensíveis de autenticação (`auth.users`, hashes, tokens) **não** entram na exportação.
- O download acontece no browser via `URL.createObjectURL` a partir do JSON retornado.

## Fora de escopo
- Backup agendado automático.
- Importação de volta (restore).
- Exportação individual por usuário não-admin.

## Critérios de aceitação
- Super admin consegue acessar `/admin/dados` e baixar o JSON completo.
- Arquivo JSON contém todas as tabelas públicas do projeto.
- Exportação por tenant filtra corretamente os dados daquele cliente.
- Nenhum dado do schema `auth` é exposto.
- Build passa sem erros e a nova rota aparece na navegação do Super Admin.
