# Correção do exportador JSON (somente backup)

Escopo restrito a `src/lib/backup.functions.ts` e `src/routes/_authenticated.admin.dados.tsx`. Nenhuma alteração em banco, migrations, RLS, dados ou outros módulos.

## Observação importante sobre o item 1

Verifiquei a lista real de tabelas do banco: existem 43 tabelas no schema público.

- `user_roles` — existe e está faltando na exportação. Será adicionada.
- `whatsapp_evolution_instances` — não existe no banco.
- `whatsapp_evolution_webhooks` — não existe no banco.

O canal EvolutionGo hoje é armazenado dentro de `whatsapp_channels` / `tenant_channels`, sem tabelas próprias. Essas duas tabelas entrarão na lista esperada apenas como entradas registradas no manifest com `error: "tabela inexistente"` — ou podem ser simplesmente omitidas. Digo qual comportamento aplico conforme sua preferência (por padrão: registrar no manifest como ausentes, sem quebrar o backup).

## O que será corrigido

### 1. Lista de tabelas
Lista derivada das 43 tabelas reais, incluindo `user_roles`.

### 2. Paginação real
Cada tabela é lida em lotes de 500 registros (`range(offset, offset+499)`), repetindo até o lote voltar vazio ou menor que 500. Nada mais depende de um único `select *`.

### 3. Relatório por tabela
Antes de paginar, é feita uma contagem exata (`head: true, count: 'exact'`). Cada tabela retorna:
`table_name`, `database_count`, `exported_count`, `complete`, `error` (quando houver).

### 4. Manifest
O JSON passa a ter um bloco `manifest`:
- `generated_at` (UTC ISO), `format_version: "2"`, `kind` (`full` ou `tenant`)
- `tables[]` com o relatório do item 3
- `expected_total`, `exported_total`
- `missing_tables`, `truncated_tables`, `failed_tables`
- `contains_encrypted_credentials: true`

### 5. Rótulo "Backup completo"
A tela só exibe "Backup completo" quando todas as tabelas tiverem `complete: true`. Caso contrário, mostra aviso de backup parcial listando as tabelas com divergência, e o arquivo é nomeado `...-parcial.json`.

### 6. Aviso de credenciais
Bloco de aviso na tela e campo no manifest informando que o arquivo pode conter campos criptografados de credenciais (tokens de canais, chaves de IA, credenciais de pagamento). Nenhum secret de ambiente (service role, chaves de API do servidor) é lido ou incluído — a service role continua apenas no servidor.

### 7 e 8. Backup por tenant filtrado no banco
Cada tabela passa a ter uma estratégia explícita de filtro aplicada na consulta, sem carregar tudo em memória:
- filtro direto `tenant_id` (maioria das tabelas)
- `tenants`: `id = tenantId`
- `tenant_settings`, `message_credit_wallets`, `notification_settings`, `payment_settings`, `zernio_profiles`: `tenant_id`
- `profiles`: `id in (user_ids de tenant_members do tenant)`
- `user_roles`: `user_id in (mesmos user_ids)`
- tabelas globais sem vínculo de tenant (`feature_flags`, `platform_settings`, `subscription_plans`, `message_credit_packages`): marcadas como `scope: "global"` e exportadas só se o usuário marcar a opção "incluir tabelas globais"; por padrão ficam fora do backup por tenant.
A regra genérica atual comparando `id`/`owner_id` com `tenantId` é removida.

### 9. Divisão do backup grande
Limite seguro por resposta: ~8 MB serializados. A exportação completa passa a ser feita por partes:
- uma chamada inicial retorna o manifest e a lista de tabelas com contagens;
- o front busca as tabelas em chamadas subsequentes (`exportTableChunk`), agrupando até o limite;
- se o conjunto couber num arquivo só, baixa um único JSON; caso contrário, baixa `manifest.json` + `parte-01.json`, `parte-02.json`… (cada parte com as tabelas que cabem no limite).
Mesma lógica vale para o backup por tenant.

### 10. Segurança
Mantidos `requireSupabaseAuth` e a verificação server-side de `super_admin` em `user_roles` em todas as novas funções, inclusive `exportTableChunk`. A service role continua sendo importada apenas dentro do handler.

### 11. Verificação
Rodo typecheck e build ao final e informo os arquivos alterados.

## Arquivos previstos

- `src/lib/backup.functions.ts` — reescrita das funções de exportação (contagem, paginação, filtros por tenant, manifest, chunking).
- `src/routes/_authenticated.admin.dados.tsx` — orquestração das chamadas em partes, validação de completude, avisos e download de múltiplos arquivos.
