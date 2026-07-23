create table public.commercial_services (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  category text not null,
  name text not null,
  summary text,
  unit text not null,
  standard_price numeric(12, 2) not null,
  minimum_price numeric(12, 2) not null,
  price_status text not null default 'draft',
  version_label text not null default 'v0.1',
  inclusions text,
  exclusions text,
  internal_notes text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commercial_services_code_not_blank check (btrim(code) <> ''),
  constraint commercial_services_name_not_blank check (btrim(name) <> ''),
  constraint commercial_services_unit_not_blank check (btrim(unit) <> ''),
  constraint commercial_services_prices_check check (
    standard_price >= 0
    and minimum_price >= 0
    and minimum_price <= standard_price
  ),
  constraint commercial_services_price_status_check
    check (price_status in ('draft', 'approved', 'archived'))
);

create table public.commercial_opportunities (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  source text not null default 'direct',
  source_detail text,
  status text not null default 'qualification',
  owner_profile_key text not null default 'guilherme',
  client_id uuid references public.clients(id) on delete set null,
  is_funded boolean not null default false,
  funding_program text,
  funding_notice text,
  eligible_marketing_budget numeric(12, 2),
  execution_start date,
  execution_end date,
  objectives text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commercial_opportunities_company_not_blank check (btrim(company_name) <> ''),
  constraint commercial_opportunities_source_check
    check (source in ('direct', 'referral', 'invest2030', 'partner', 'other')),
  constraint commercial_opportunities_status_check
    check (status in ('qualification', 'quoting', 'negotiation', 'won', 'lost')),
  constraint commercial_opportunities_owner_check
    check (owner_profile_key = 'guilherme'),
  constraint commercial_opportunities_budget_check
    check (eligible_marketing_budget is null or eligible_marketing_budget >= 0),
  constraint commercial_opportunities_dates_check
    check (execution_end is null or execution_start is null or execution_end >= execution_start)
);

create table public.commercial_quotes (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.commercial_opportunities(id) on delete restrict,
  reference text unique not null,
  title text not null,
  status text not null default 'draft',
  valid_until date,
  currency text not null default 'EUR',
  funding_notes text,
  commercial_conditions text,
  internal_notes text,
  created_by_profile_key text not null default 'guilherme',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commercial_quotes_reference_not_blank check (btrim(reference) <> ''),
  constraint commercial_quotes_title_not_blank check (btrim(title) <> ''),
  constraint commercial_quotes_status_check
    check (status in ('draft', 'ready', 'sent', 'accepted', 'rejected', 'expired')),
  constraint commercial_quotes_currency_check check (currency = 'EUR'),
  constraint commercial_quotes_creator_check check (created_by_profile_key = 'guilherme')
);

create table public.commercial_quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.commercial_quotes(id) on delete cascade,
  service_id uuid references public.commercial_services(id) on delete set null,
  position integer not null default 0,
  service_code text not null,
  service_name text not null,
  category text not null,
  unit text not null,
  description text,
  quantity numeric(12, 2) not null default 1,
  unit_price numeric(12, 2) not null,
  standard_unit_price numeric(12, 2) not null,
  price_override_reason text,
  eligible_category text,
  evidence_notes text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commercial_quote_items_service_name_not_blank check (btrim(service_name) <> ''),
  constraint commercial_quote_items_quantity_check check (quantity > 0),
  constraint commercial_quote_items_prices_check
    check (unit_price >= 0 and standard_unit_price >= 0)
);

create index commercial_services_category_active_idx
  on public.commercial_services(category, active, sort_order);
create index commercial_opportunities_status_created_idx
  on public.commercial_opportunities(status, created_at desc);
create index commercial_opportunities_client_idx
  on public.commercial_opportunities(client_id);
create index commercial_quotes_opportunity_created_idx
  on public.commercial_quotes(opportunity_id, created_at desc);
create index commercial_quotes_status_idx
  on public.commercial_quotes(status);
create index commercial_quote_items_quote_position_idx
  on public.commercial_quote_items(quote_id, position, created_at);
create index commercial_quote_items_service_idx
  on public.commercial_quote_items(service_id);

create trigger set_commercial_services_updated_at
before update on public.commercial_services
for each row execute function public.set_updated_at();

create trigger set_commercial_opportunities_updated_at
before update on public.commercial_opportunities
for each row execute function public.set_updated_at();

create trigger set_commercial_quotes_updated_at
before update on public.commercial_quotes
for each row execute function public.set_updated_at();

create trigger set_commercial_quote_items_updated_at
before update on public.commercial_quote_items
for each row execute function public.set_updated_at();

alter table public.commercial_services enable row level security;
alter table public.commercial_opportunities enable row level security;
alter table public.commercial_quotes enable row level security;
alter table public.commercial_quote_items enable row level security;

revoke all on public.commercial_services from anon;
revoke all on public.commercial_opportunities from anon;
revoke all on public.commercial_quotes from anon;
revoke all on public.commercial_quote_items from anon;

grant select, insert, update, delete on public.commercial_services to authenticated, service_role;
grant select, insert, update, delete on public.commercial_opportunities to authenticated, service_role;
grant select, insert, update, delete on public.commercial_quotes to authenticated, service_role;
grant select, insert, update, delete on public.commercial_quote_items to authenticated, service_role;

create policy "Guilherme can read commercial services"
on public.commercial_services for select
to authenticated
using (
  public.current_user_profile_key() = 'guilherme'
  and public.current_user_profile_role() = 'admin'
);

create policy "Guilherme can insert commercial services"
on public.commercial_services for insert
to authenticated
with check (
  public.current_user_profile_key() = 'guilherme'
  and public.current_user_profile_role() = 'admin'
);

create policy "Guilherme can update commercial services"
on public.commercial_services for update
to authenticated
using (
  public.current_user_profile_key() = 'guilherme'
  and public.current_user_profile_role() = 'admin'
)
with check (
  public.current_user_profile_key() = 'guilherme'
  and public.current_user_profile_role() = 'admin'
);

create policy "Guilherme can delete commercial services"
on public.commercial_services for delete
to authenticated
using (
  public.current_user_profile_key() = 'guilherme'
  and public.current_user_profile_role() = 'admin'
);

create policy "Guilherme can read commercial opportunities"
on public.commercial_opportunities for select
to authenticated
using (
  public.current_user_profile_key() = 'guilherme'
  and public.current_user_profile_role() = 'admin'
);

create policy "Guilherme can insert commercial opportunities"
on public.commercial_opportunities for insert
to authenticated
with check (
  public.current_user_profile_key() = 'guilherme'
  and public.current_user_profile_role() = 'admin'
);

create policy "Guilherme can update commercial opportunities"
on public.commercial_opportunities for update
to authenticated
using (
  public.current_user_profile_key() = 'guilherme'
  and public.current_user_profile_role() = 'admin'
)
with check (
  public.current_user_profile_key() = 'guilherme'
  and public.current_user_profile_role() = 'admin'
);

create policy "Guilherme can delete commercial opportunities"
on public.commercial_opportunities for delete
to authenticated
using (
  public.current_user_profile_key() = 'guilherme'
  and public.current_user_profile_role() = 'admin'
);

create policy "Guilherme can read commercial quotes"
on public.commercial_quotes for select
to authenticated
using (
  public.current_user_profile_key() = 'guilherme'
  and public.current_user_profile_role() = 'admin'
);

create policy "Guilherme can insert commercial quotes"
on public.commercial_quotes for insert
to authenticated
with check (
  public.current_user_profile_key() = 'guilherme'
  and public.current_user_profile_role() = 'admin'
);

create policy "Guilherme can update commercial quotes"
on public.commercial_quotes for update
to authenticated
using (
  public.current_user_profile_key() = 'guilherme'
  and public.current_user_profile_role() = 'admin'
)
with check (
  public.current_user_profile_key() = 'guilherme'
  and public.current_user_profile_role() = 'admin'
);

create policy "Guilherme can delete commercial quotes"
on public.commercial_quotes for delete
to authenticated
using (
  public.current_user_profile_key() = 'guilherme'
  and public.current_user_profile_role() = 'admin'
);

create policy "Guilherme can read commercial quote items"
on public.commercial_quote_items for select
to authenticated
using (
  public.current_user_profile_key() = 'guilherme'
  and public.current_user_profile_role() = 'admin'
);

create policy "Guilherme can insert commercial quote items"
on public.commercial_quote_items for insert
to authenticated
with check (
  public.current_user_profile_key() = 'guilherme'
  and public.current_user_profile_role() = 'admin'
);

create policy "Guilherme can update commercial quote items"
on public.commercial_quote_items for update
to authenticated
using (
  public.current_user_profile_key() = 'guilherme'
  and public.current_user_profile_role() = 'admin'
)
with check (
  public.current_user_profile_key() = 'guilherme'
  and public.current_user_profile_role() = 'admin'
);

create policy "Guilherme can delete commercial quote items"
on public.commercial_quote_items for delete
to authenticated
using (
  public.current_user_profile_key() = 'guilherme'
  and public.current_user_profile_role() = 'admin'
);

insert into public.commercial_services (
  code,
  category,
  name,
  summary,
  unit,
  standard_price,
  minimum_price,
  price_status,
  version_label,
  inclusions,
  exclusions,
  sort_order
)
values
  ('SOC-BASE', 'Redes sociais', 'Gestão de redes sociais — Base', 'Presença mensal para duas plataformas com adaptação de conteúdos.', 'mês', 600, 500, 'draft', 'v0.1', '8 conteúdos e 8 stories, copy, agendamento e reporting mensal.', 'Captação presencial, investimento em media e community management intensivo.', 10),
  ('SOC-STD', 'Redes sociais', 'Gestão de redes sociais — Standard', 'Plano mensal para duas plataformas com cadência reforçada.', 'mês', 900, 750, 'draft', 'v0.1', '12 conteúdos e 12 stories, copy, agendamento, community management leve e reporting mensal.', 'Captação presencial e investimento em media.', 20),
  ('SOC-PREM', 'Redes sociais', 'Gestão de redes sociais — Premium', 'Plano mensal intensivo para duas plataformas.', 'mês', 1300, 1100, 'draft', 'v0.1', '16 conteúdos, 20 stories, sessão estratégica, community management e reporting mensal.', 'Produções externas, influenciadores e investimento em media.', 30),
  ('SOC-EXTRA', 'Redes sociais', 'Plataforma social adicional', 'Adaptação e gestão de uma plataforma adicional ao plano principal.', 'mês', 180, 150, 'draft', 'v0.1', 'Adaptação dos conteúdos aprovados ao canal adicional.', 'Criação de uma linha editorial autónoma.', 40),
  ('VID-REEL', 'Conteúdo', 'Reel — edição com material fornecido', 'Edição de vídeo vertical curto a partir de material entregue pelo cliente.', 'peça', 120, 100, 'draft', 'v0.1', 'Edição, legendagem simples e uma ronda de ajustes.', 'Captação, locução, motion avançado e compra de música.', 50),
  ('VID-4', 'Conteúdo', 'Pack de 4 Reels', 'Quatro vídeos verticais curtos com material fornecido.', 'pack', 400, 350, 'draft', 'v0.1', 'Edição, legendagem simples e uma ronda de ajustes por vídeo.', 'Captação e motion avançado.', 60),
  ('VID-CAP', 'Conteúdo', 'Sessão de captação — meia jornada', 'Captação de fotografia e vídeo nas instalações do cliente.', 'sessão', 450, 375, 'draft', 'v0.1', 'Até quatro horas de captação e preparação da shot list.', 'Deslocações fora da área acordada, modelos, espaços e pós-produção.', 70),
  ('BLOG-SEO', 'Conteúdo', 'Artigo de blog SEO', 'Artigo otimizado para pesquisa com estrutura e keywords definidas.', 'artigo', 180, 150, 'draft', 'v0.1', 'Pesquisa, redação, otimização on-page e uma ronda de ajustes.', 'Tradução e publicação em CMS complexo.', 80),
  ('BLOG-4', 'Conteúdo', 'Pack mensal de 4 artigos SEO', 'Planeamento e produção mensal de quatro artigos.', 'mês', 600, 520, 'draft', 'v0.1', 'Quatro artigos, pesquisa de temas e otimização on-page.', 'Backlinks, tradução e alterações técnicas ao website.', 90),
  ('ADS-SETUP', 'Performance', 'Setup de campanhas pagas', 'Preparação inicial de conta, tracking e estrutura de campanhas.', 'projeto', 300, 250, 'draft', 'v0.1', 'Auditoria de conta, estrutura, públicos e configuração base de tracking.', 'Investimento em media e implementação técnica externa.', 100),
  ('ADS-1', 'Performance', 'Gestão de Ads — uma plataforma', 'Gestão e otimização mensal de campanhas numa plataforma.', 'mês', 350, 300, 'draft', 'v0.1', 'Até duas campanhas ativas, otimização e reporting mensal.', 'Investimento em media e produção audiovisual dedicada.', 110),
  ('ADS-2', 'Performance', 'Gestão de Ads — duas plataformas', 'Gestão e otimização mensal em duas plataformas.', 'mês', 650, 550, 'draft', 'v0.1', 'Até quatro campanhas ativas no total, otimização e reporting mensal.', 'Investimento em media e produção audiovisual dedicada.', 120),
  ('SEO-AUD', 'SEO', 'Auditoria SEO', 'Diagnóstico técnico e editorial com prioridades de implementação.', 'projeto', 450, 350, 'draft', 'v0.1', 'Análise técnica, on-page, conteúdos, concorrência e plano de prioridades.', 'Implementação das recomendações.', 130),
  ('SEO-MONTH', 'SEO', 'Acompanhamento SEO mensal', 'Otimização contínua e acompanhamento de desempenho orgânico.', 'mês', 600, 500, 'draft', 'v0.1', 'Otimização on-page, monitorização e reporting mensal.', 'Desenvolvimento técnico complexo, backlinks pagos e conteúdos extensos.', 140),
  ('WEB-LP', 'Web', 'Landing page de conversão', 'Landing page responsiva orientada a uma campanha ou objetivo.', 'projeto', 900, 750, 'draft', 'v0.1', 'Estrutura, design, desenvolvimento, SEO base e duas rondas de ajustes.', 'Copy extensa, tradução, integrações pagas e alojamento.', 150),
  ('WEB-INST', 'Web', 'Website institucional', 'Website institucional responsivo de cinco a sete páginas.', 'projeto', 2200, 1800, 'draft', 'v0.1', 'Arquitetura, design, desenvolvimento, SEO base e duas rondas de ajustes.', 'Tradução, produção de conteúdos, integrações complexas e alojamento.', 160),
  ('WEB-ADV', 'Web', 'Website avançado ou com integrações', 'Projeto web com funcionalidades e integrações a especificar.', 'projeto', 3500, 3000, 'draft', 'v0.1', 'Âmbito funcional definido em proposta própria.', 'Licenças, integrações de terceiros e conteúdos não discriminados.', 170),
  ('WEB-ECOM', 'Web', 'E-commerce', 'Loja online com pagamentos e configuração base de catálogo.', 'projeto', 4000, 3500, 'draft', 'v0.1', 'Arquitetura, design, desenvolvimento, pagamentos, envios e SEO base.', 'ERP complexo, migração massiva de catálogo, licenças e conteúdos.', 180),
  ('BRAND-ESS', 'Branding', 'Branding essencial', 'Identidade visual base para uma marca nova ou renovação simples.', 'projeto', 750, 650, 'draft', 'v0.1', 'Direção visual, logótipo, paleta e tipografia.', 'Naming, estratégia aprofundada, registos e aplicações extensas.', 190),
  ('BRAND-COMP', 'Branding', 'Branding completo', 'Sistema de identidade com posicionamento e aplicações principais.', 'projeto', 1500, 1250, 'draft', 'v0.1', 'Posicionamento, identidade visual, manual e aplicações base.', 'Registos de marca, produção e packaging complexo.', 200),
  ('BRAND-STRAT', 'Branding', 'Branding estratégico', 'Projeto aprofundado de estratégia e sistema de marca.', 'projeto', 2800, 2400, 'draft', 'v0.1', 'Diagnóstico, posicionamento, identidade, manual e plano de ativação.', 'Registos, produção física e campanhas de lançamento.', 210),
  ('EMAIL-SETUP', 'Email marketing', 'Setup de email marketing', 'Configuração de template, listas e estrutura inicial.', 'projeto', 350, 300, 'draft', 'v0.1', 'Template base, configuração de lista e teste de envio.', 'Licenças da plataforma, migração complexa e automações avançadas.', 220),
  ('EMAIL-ONE', 'Email marketing', 'Newsletter', 'Produção de uma newsletter a partir de conteúdos aprovados.', 'envio', 150, 120, 'draft', 'v0.1', 'Copy, montagem em template existente, testes e um envio.', 'Licença, segmentação avançada, automações e criação de landing page.', 230),
  ('EMAIL-4', 'Email marketing', 'Pack mensal de 4 newsletters', 'Produção e envio de até quatro newsletters por mês.', 'mês', 500, 425, 'draft', 'v0.1', 'Copy, montagem, testes, envios e resumo mensal.', 'Licença, automações avançadas e criação de landing pages.', 240),
  ('INF-CAMP', 'Influência', 'Gestão de campanha de influenciadores', 'Coordenação de uma campanha de pequena ou média dimensão.', 'campanha', 600, 500, 'draft', 'v0.1', 'Sourcing, shortlist, contacto, negociação, entregáveis e reporting.', 'Fee dos influenciadores, produção, deslocações e direitos de utilização.', 250),
  ('PRESS-KIT', 'Influência', 'Conceito e coordenação de press kit', 'Conceito, fornecedores e coordenação de um envio de press kits.', 'projeto', 800, 650, 'draft', 'v0.1', 'Conceito, especificação, contacto com fornecedores e coordenação.', 'Produção física, produtos, portes e taxas.', 260),
  ('DES-PRES', 'Design', 'Apresentação institucional', 'Design e paginação de uma apresentação até ao âmbito acordado.', 'projeto', 550, 450, 'draft', 'v0.1', 'Direção visual, paginação e duas rondas de ajustes.', 'Copy, tradução, animações avançadas e dados não estruturados.', 270),
  ('DES-BRO', 'Design', 'Brochura institucional', 'Design e paginação de brochura institucional.', 'projeto', 700, 600, 'draft', 'v0.1', 'Direção visual, paginação e duas rondas de ajustes.', 'Copy, tradução, fotografia e impressão.', 280),
  ('CONS-HOUR', 'Estratégia', 'Consultoria estratégica', 'Sessão ou bloco de consultoria de marketing e comunicação.', 'hora', 90, 90, 'draft', 'v0.1', 'Sessão e resumo de recomendações.', 'Implementação e produção de materiais.', 290),
  ('CONS-WORK', 'Estratégia', 'Workshop estratégico', 'Workshop preparado para alinhamento de marca ou marketing.', 'sessão', 400, 350, 'draft', 'v0.1', 'Preparação, sessão até três horas e síntese de decisões.', 'Deslocações, aluguer de espaço e implementação.', 300),
  ('AUT-BASE', 'Automação', 'Automação de marketing', 'Implementação de um fluxo de automação simples.', 'projeto', 900, 750, 'draft', 'v0.1', 'Mapeamento, configuração e testes de um fluxo.', 'Licenças, integrações complexas e manutenção continuada.', 310),
  ('EVENT-COV', 'Eventos', 'Cobertura de evento', 'Cobertura digital de evento de pequena ou média dimensão.', 'evento', 650, 550, 'draft', 'v0.1', 'Planeamento, cobertura no local e seleção/edição base de conteúdos.', 'Deslocações, estadia, equipamento especializado e equipa adicional.', 320),
  ('EVENT-ACT', 'Eventos', 'Ativação de marca', 'Conceito e coordenação de uma ativação de marca.', 'projeto', 1500, 1250, 'draft', 'v0.1', 'Conceito, plano de produção e coordenação base.', 'Produção física, espaço, licenças, staff e fornecedores.', 330)
on conflict (code) do nothing;
