# Próximos passos — LivHub

## Estado atual resumido

O LivHub já tem a estrutura SaaS/white-label funcionando em grande parte:

- **Autenticação e multi-tenant**: login, cadastro, `tenants`, `tenant_members`, RLS, detecção por host (`psi.livhub.cloud` e subdomínios).
- **Painel do terapeuta**: sidebar colapsável, tema dark/claro, rotas para Dashboard, Mensagens, Contatos, Pacientes, Kanban, Agendamento, Calendário, Fluxos, Perfil Público, Pagamentos, Notificações, Clínica & Equipe, Configurações.
- **Painel Super Admin**: console separado em `/admin` com Tenants, Planos, Faturamento, Domínios, Usuários & Roles, Sistema, Suporte.
- **Dados reais**: Kanban, Contatos, Pacientes, Agendamento, Mensagens/Inbox, Fluxos, Perfil Público e Checkout já leem/escrevem no banco e usam Supabase Realtime.
- **Pagamentos**: Stripe e Mercado Pago com webhooks, criação de cobrança e confirmação pós-pagamento.
- **Notificações**: engine com templates por evento (WhatsApp/e-mail) e fila via Postgres.
- **White-label**: perfil público publicável em `/p/:slug`, com 7 templates, foto IA e planos de terapia.

## Bloqueios críticos para produção

1. **Super Admin não consegue entrar / recuperar senha**
   - A conta `terapeutawelder@gmail.com` (ou `livhub.pro@gmail.com`) precisa de fluxo de recuperação funcional e/ou redefinição manual segura.
   - O login em `/admin/login` verifica `super_admin`, mas sem recuperação de senha o acesso fica travado.

2. **Dashboard do terapeuta ainda usa dados fictícios**
   - KPIs, gráficos e próximas sessões estão hardcoded. Isso quebra a credibilidade do produto no primeiro login.

3. **Configurações do consultório não persistem**
   - As abas "Perfil" e "Consultório" em `/configuracoes` usam `defaultValue` em campos não controlados; alterações não são salvas no banco.

4. **Módulo "Agentes IA" está vazio**
   - A rota `/agentes` só tem metadados. A funcionalidade de IA triagem/orquestrador precisa de interface.

5. **Google Calendar / Meet ainda não está integrado de ponta a ponta**
   - O agendamento salva `meeting_url`, mas a integração OAuth com Google Calendar e geração automática de link Google Meet não foi ativada.

## Plano recomendado

### Fase 1 — Produção estável (fazer primeiro)

1. **Corrigir acesso Super Admin**
   - Adicionar botão "Esqueci a senha" em `/admin/login` usando `supabase.auth.resetPasswordForEmail`.
   - Criar rota `/admin/reset-password` para redefinir senha de conta com role `super_admin`.
   - Garantir que o trigger `handle_new_user` atribua `super_admin` ao e-mail correto do dono da plataforma.

2. **Dashboard real do terapeuta**
   - Substituir os dados hardcoded por consultas ao banco:
     - Mensagens (últimos 7 dias, respondidas, tempo médio) a partir de `whatsapp_messages`.
     - Faturamento a partir de `payment_orders` com status `paid`.
     - Próximas sessões a partir de `appointments`.
   - Manter o layout e o card dourado de boas-vindas.

3. **Persistir Configurações do consultório**
   - Criar tabela `tenant_settings` (ou usar `tenants.settings` JSONB) para salvar nome, CNPJ, endereço, duração/valor padrão, modalidades, bio pública, etc.
   - Tornar os painéis "Perfil" e "Consultório" controlados com `useMutation`.

4. **Validar trial/freemium**
   - Verificar se `trial-banner.tsx` lê corretamente os limites (dias, contatos, mensagens).
   - Garantir que RLS e server functions bloqueiem ações após o trial expirado.

### Fase 2 — Agendamento e pagamento confiáveis

5. **Integração Google Calendar + Meet**
   - Adicionar aba "Google Agenda" em `/configuracoes` com OAuth flow.
   - Criar server function para criar evento no Google Calendar e retornar link do Google Meet ao salvar agendamento.
   - Atualizar `meeting_url` automaticamente quando a sessão for confirmada.

6. **Testar e ajustar o fluxo de reserva pública**
   - Paciente escolhe serviço → horário → plano de terapia → checkout → pagamento → confirmação automática → WhatsApp com link da sala.
   - Corrigir eventuais falhas no webhook e no envio da notificação.

### Fase 3 — Automação e IA

7. **Módulo Agentes IA**
   - Implementar a interface em `/agentes` (a rota lazy `agentes.lazy.tsx` já existe; a rota principal está vazia).
   - Conectar o orquestrador master (`ai-orchestrator.functions.ts`) à criação automática de agentes.
   - Permitir que agentes respondam automaticamente no Inbox quando ativados.

### Fase 4 — Escalar o SaaS

8. **Domínios customizados Fase B**
   - Automatizar a criação de registros DNS/SSL via Cloudflare for SaaS a partir das solicitações em `/admin/dominios`.

9. **Marketing site público**
   - Criar landing page de captação em `/` para visitantes não logados, explicando o LivHub com CTA para cadastro.

10. **Analytics consolidado no Super Admin**
    - Dashboard de MRR, churn, mensagens enviadas e agendamentos cross-tenant.

## Pergunta de priorização

Quer que eu execute a **Fase 1 completa** primeiro (acesso admin + dashboard real + configurações persistentes + validação do trial), ou prefere priorizar um item específico, como a **integração Google Calendar/Meet** ou o **módulo Agentes IA**?
