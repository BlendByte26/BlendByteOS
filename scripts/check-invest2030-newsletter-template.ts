import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import path from "node:path";
import {
  buildInvest2030GptBriefing,
  generateInvest2030WebinarHtml,
  generateInvest2030NewsletterHtml,
  INVEST2030_DEFAULT_CTA_URL,
  INVEST2030_WEBINAR_SECONDARY_URL,
  isInvest2030NewsletterTask,
  isInvest2030SocialContentTask,
  isInvest2030WebinarTask,
  parseInvest2030TaskNotes,
  parseInvest2030NewsletterJson,
  parseInvest2030WebinarJson,
  safeInvest2030CtaUrl,
  safeInvest2030WebinarRegistrationUrl,
  validateInvest2030Webinar,
  validateInvest2030Newsletter,
  type Invest2030NewsletterContent,
  type Invest2030WebinarContent,
} from "../src/lib/invest2030-newsletter.ts";
import { invest2030GptUrls } from "../src/lib/invest2030-gpts.ts";

type Box = { x: number; y: number; width: number; height: number };
type LocatorLike = {
  boundingBox: () => Promise<Box | null>;
  count: () => Promise<number>;
  evaluate: <T>(callback: (element: Element) => T) => Promise<T>;
  nth: (index: number) => LocatorLike;
};
type PageLike = {
  setViewportSize: (size: { width: number; height: number }) => Promise<void>;
  setContent: (html: string, options?: { waitUntil?: "load" }) => Promise<void>;
  locator: (selector: string) => LocatorLike;
};
type BrowserLike = {
  newPage: () => Promise<PageLike>;
  close: () => Promise<void>;
};

const approvedTemplatePath =
  process.env.INVEST2030_TEMPLATE_SOURCE ??
  path.join(homedir(), "Downloads", "invest2030-newsletter-template-final.html");

const sourceContent: Invest2030NewsletterContent = {
  subject: "Apoios Contratação de Recursos Humanos para a Região Centro",
  preheader:
    "O CENTRO 2030 financia 50% dos custos salariais a fundo perdido para contratação de recursos humanos qualificados na Região Centro.",
  eyebrow: "Apoio à contratação",
  hero_title: "RECURSOS HUMANOS QUALIFICADOS",
  hero_subtitle: "Região Centro: 50% dos custos salariais a fundo perdido",
  stats: [
    { label: "Região", value: "Centro\n2030" },
    { label: "Apoio", value: "50%\nFSE+" },
    { label: "Duração", value: "Até 36\nmeses" },
    { label: "Prazo", value: "31 de\njulho" },
  ],
  intro_paragraphs: [
    "A sua empresa está na **Região Centro** e quer reforçar a equipa com talento qualificado?",
    "O **CENTRO 2030** financia **50% dos custos salariais a fundo perdido** para a contratação de licenciados, mestres, doutores ou pós-doutorados com pelo menos 5 anos de experiência profissional.",
    "A **Fase 1 encerra a 31 de julho de 2026**. Se existe intenção de contratar ou reforçar competências internas, este é o momento para validar o enquadramento da candidatura.",
  ],
  benefits_title: "O que este apoio pode financiar:",
  benefits: [
    "50% dos custos salariais financiados a fundo perdido, através do FSE+",
    "Contratação de licenciados, mestres, doutores ou pós-doutorados com pelo menos 5 anos de experiência profissional",
    "Contratos de trabalho a tempo inteiro, com possibilidade de teletrabalho parcial quando o regime presencial seja predominante",
    "Salários elegíveis entre 1.762,31 € e 2.462,31 €/mês para licenciados ou mestres",
    "Salários elegíveis entre 2.245,48 € e 3.827,36 €/mês para doutorados ou pós-doutorados",
    "Encargos sociais, subsídio de férias e subsídio de Natal associados à contratação",
  ],
  audience_section_title: "Para quem faz sentido:",
  audience_title: "PME com estabelecimento na Região Centro",
  audience_body:
    "Este apoio dirige-se a empresas da indústria e serviços elegíveis que pretendam contratar recursos humanos qualificados e reforçar competências internas.",
  exclusions:
    "Existem setores excluídos, incluindo agricultura e produção vegetal/animal, silvicultura, pesca e aquicultura, comércio de combustíveis, alojamento local, banca, seguros, atividades financeiras, lotarias e jogos de fortuna ou azar.",
  closing_paragraphs: [
    "Se a sua empresa está a planear contratar talento qualificado, a Invest2030 pode ajudar a perceber se existe enquadramento, quais os requisitos críticos e que passos deve preparar antes do prazo da Fase 1.",
    "O prazo encerra a **31 de julho de 2026**. Não deixe a validação para os últimos dias.",
  ],
  primary_cta_label: "Marcar reunião →",
  secondary_cta_label: "Avaliar enquadramento →",
  cta_url: "https://www.invest2030.pt/pt/incentivo/MTEy",
};

const webinarContent: Invest2030WebinarContent = {
  subject: "Webinar Invest2030: Incentivos Base Territorial",
  preheader: "Sessão gratuita para perceber apoios, prazos e próximos passos.",
  eyebrow: "Webinar gratuito",
  hero_title: "Incentivos Base Territorial",
  hero_subtitle: "O que precisa de saber antes de avançar",
  stats: [
    { label: "Data", value: "24 de julho" },
    { label: "Hora", value: "11h00" },
    { label: "Apoio", value: "Até 60%" },
    { label: "Prazo", value: "31 de julho" },
  ],
  intro_paragraphs: [
    "Nesta sessão vamos clarificar o enquadramento dos apoios e os passos críticos para preparar uma candidatura.",
  ],
  session_section_title: "// O que vai ficar claro nesta sessão:",
  session_topics: [
    "Quem pode beneficiar dos incentivos",
    "Que despesas podem ser elegíveis",
    "Que informação deve estar preparada antes do prazo",
  ],
  speaker: {
    name: "André Loureiro",
    organisation: "Invest2030",
    image_url: "",
  },
  closing_paragraphs: [
    "Reserve o seu lugar e traga as suas dúvidas para a sessão.",
  ],
};

const webinarBriefing = `Pedido recebido via Form Invest2030

Nome da campanha:
Webinar Incentivos Base Territorial

Tipo de ação:
Webinar, Redes Sociais

Quem está a pedir:
André Loureiro

Período:
Mês — Julho 2026 · Webinar — 24/07/2026 às 11:00

Data/hora do webinar:
24/07/2026 às 11:00

Objetivo principal:
Gerar inscrições no webinar

Público-alvo / segmentação:
PME

Texto do botão principal:
Inscrever-me

Link do botão principal:
https://www.invest2030.pt/pt/webinar/incentivos

Tema / mensagem principal:
Incentivos Base Territorial

Informação obrigatória a mencionar:
Data, hora, apoio e prazo

Estado da informação:
Informação validada

Observações:
Não omitir notas internas relevantes.`;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function stripWebVersion(html: string) {
  return html
    .replace(/\s*\|\s*<a href="" style="color:#ffffff; text-decoration:underline;" target="_blank">Ver no navegador<\/a>/g, "")
    .replace(/Ver no navegador/g, "");
}

function normalizeStaticHtml(html: string) {
  return stripWebVersion(html)
    .replace(/<br\s*\/?>/gi, "<br>")
    .replace(/<img([^>]*?)\s*\/>/gi, "<img$1>")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .replace(/>\s+/g, ">")
    .replace(/\s+</g, "<")
    .trim();
}

function firstDifference(left: string, right: string) {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    if (left[index] !== right[index]) return index;
  }
  return length;
}

function assertStaticTemplateMatchesSource(generatedHtml: string) {
  assert(existsSync(approvedTemplatePath), `Source final não encontrada: ${approvedTemplatePath}`);
  const approvedSource = readFileSync(approvedTemplatePath, "utf8");
  const normalizedGenerated = normalizeStaticHtml(generatedHtml);
  const normalizedApproved = normalizeStaticHtml(approvedSource);

  if (normalizedGenerated !== normalizedApproved) {
    const index = firstDifference(normalizedGenerated, normalizedApproved);
    throw new Error(
      [
        "O template gerado diverge da source final aprovada.",
        `Primeira diferença no índice ${index}.`,
        `Gerado: ${normalizedGenerated.slice(Math.max(0, index - 120), index + 220)}`,
        `Source: ${normalizedApproved.slice(Math.max(0, index - 120), index + 220)}`,
      ].join("\n"),
    );
  }
}

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  const candidates = [
    path.join(homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"),
    "playwright",
  ];

  for (const candidate of candidates) {
    try {
      return require(candidate) as {
        chromium: { launch: (options: { headless: boolean }) => Promise<BrowserLike> };
      };
    } catch {
      continue;
    }
  }

  throw new Error("Playwright não está disponível para o teste visual.");
}

async function box(locator: LocatorLike, label: string) {
  const result = await locator.boundingBox();
  assert(result, `Elemento sem caixa visual: ${label}`);
  return result;
}

function centersMatch(left: Box, right: Box, tolerance = 8) {
  return Math.abs((left.x + left.width / 2) - (right.x + right.width / 2)) <= tolerance;
}

async function assertCentered(locator: LocatorLike, container: Box, label: string) {
  const current = await box(locator, label);
  assert(centersMatch(current, container, 12), `${label} não está centrado no hero.`);
}

async function assertDesktopVisual(page: PageLike, html: string) {
  await page.setViewportSize({ width: 680, height: 1200 });
  await page.setContent(html, { waitUntil: "load" });

  const hero = await box(page.locator('table[style*="background-color:#18182d"]').nth(0), "hero");
  await assertCentered(page.locator('img[alt="Invest2030"]'), hero, "Logo");
  await assertCentered(page.locator('div[style*="letter-spacing:4px"]').nth(0), hero, "Eyebrow");
  await assertCentered(page.locator(".hero-title"), hero, "Título do hero");
  await assertCentered(page.locator(".hero-subtitle"), hero, "Subtítulo do hero");

  const statCount = await page.locator(".stack-column").count();
  assert(statCount === 4, "Desktop deve renderizar quatro indicadores no hero.");

  const statBoxes = await Promise.all([0, 1, 2, 3].map((index) => box(page.locator(".stack-column").nth(index), `Indicador ${index + 1}`)));
  const firstY = statBoxes[0].y;
  assert(statBoxes.every((current) => Math.abs(current.y - firstY) <= 4), "Os quatro indicadores desktop devem estar na mesma linha.");
  assert(statBoxes.every((current) => current.y >= hero.y && current.y + current.height <= hero.y + hero.height), "Os indicadores devem ficar dentro do hero.");
}

async function assertMobileVisual(page: PageLike, html: string) {
  await page.setViewportSize({ width: 375, height: 1400 });
  await page.setContent(html, { waitUntil: "load" });

  const statBoxes = await Promise.all([0, 1, 2, 3].map((index) => box(page.locator(".stack-column").nth(index), `Indicador mobile ${index + 1}`)));
  assert(statBoxes[1].y > statBoxes[0].y, "No mobile, o segundo indicador deve ficar abaixo do primeiro.");
  assert(statBoxes[2].y > statBoxes[1].y, "No mobile, o terceiro indicador deve ficar abaixo do segundo.");
  assert(statBoxes[3].y > statBoxes[2].y, "No mobile, o quarto indicador deve ficar abaixo do terceiro.");
}

function assertWorkspaceResponsiveSource() {
  const workspace = readFileSync(path.join(process.cwd(), "src/components/invest2030-newsletter-workspace.tsx"), "utf8");
  assert(workspace.includes('const [activeTab, setActiveTab] = useState<TabKey>(newsletter ? "summary" : "import")'), "Workspace deve aguardar importação antes de abrir o Resumo.");
  assert(workspace.includes("Aguardando conteúdo do GPT"), "Workspace deve explicitar o estado awaiting_import.");
  assert(workspace.includes("visibleTabs = hasImported"), "Workspace deve mudar separadores consoante a importação.");
  assert(workspace.includes("aria-label={tabAriaLabel}"), "Workspace deve ter separadores acessíveis.");
  assert(workspace.includes("Abrir GPT Newsletter Invest2030"), "Newsletter deve ter atalho direto para o GPT próprio.");
  assert(workspace.includes("Abrir GPT Webinar Invest2030"), "Webinar deve manter atalho direto para o GPT próprio.");
  assert(workspace.includes("Gerar/importar conteúdo"), "Importação JSON deve estar disponível no resumo.");
  assert(workspace.includes('role="dialog"'), "Importação e texto original devem abrir em modal acessível.");
  assert(workspace.includes("max-h-[620px] overflow-auto"), "Preview deve ter scroll interno compacto.");
  assert(workspace.includes('aria-expanded={open}'), "Accordions devem expor estado para tecnologias assistivas.");
  assert(!workspace.includes("<h2 className=\"mb-3 text-sm font-extrabold text-[var(--bb-charcoal)]\">Preparação para GPT</h2>"), "Preparação GPT não deve ocupar espaço permanente na página.");
  assert(!workspace.includes("<h2 className=\"mb-3 text-sm font-extrabold text-[var(--bb-charcoal)]\">Colar resposta do GPT</h2>"), "Importação JSON não deve ocupar espaço permanente na página.");
  assert(!workspace.includes("xl:grid-cols-[minmax(260px,0.9fr)_minmax(360px,1.25fr)_minmax(320px,1fr)]"), "Workspace ainda usa a grelha antiga de três colunas em 13 polegadas.");
}

function assertJsonImportStates() {
  const emptyCta = parseInvest2030NewsletterJson(JSON.stringify({ ...sourceContent, cta_url: "" }));
  assert(emptyCta.content?.cta_url === "", "cta_url vazio deve permanecer vazio no JSON importado.");
  assert(safeInvest2030CtaUrl(emptyCta.content?.cta_url).url === INVEST2030_DEFAULT_CTA_URL, "cta_url vazio deve aplicar fallback de contacto na camada final.");

  const customUrl = "https://example.com/contactos/";
  const validCta = parseInvest2030NewsletterJson(JSON.stringify({ ...sourceContent, cta_url: customUrl }));
  assert(validCta.content?.cta_url === customUrl, "URL válido do JSON deve ser preservado.");

  const invalid = parseInvest2030NewsletterJson("{invalid");
  assert(!invalid.content && invalid.errors.length > 0, "JSON inválido deve devolver erro claro.");

  const editedContent = {
    ...sourceContent,
    subject: "Assunto editado",
    cta_url: customUrl,
  };
  const editedHtml = generateInvest2030NewsletterHtml(editedContent);
  assert(editedHtml.includes("Assunto editado"), "Edição após importação deve regenerar o HTML.");
  assert(editedHtml.startsWith("<!doctype html>") && editedHtml.trimEnd().endsWith("</html>"), "HTML copiado deve ser documento completo.");
}

function assertOriginalBriefingsStayOpaque() {
  const validContent: Invest2030NewsletterContent = {
    ...sourceContent,
    cta_url: "https://www.invest2030.pt/pt/contactos/",
  };
  const briefings = [
    "Objetivo diferente:\nGerar reuniões\n\nSubtítulo com dois pontos: Norte: Ave\n\nNewsletter",
    "Briefing livre\n- ponto A\n- ponto B: com dois pontos\n\nVariante 1\nVariante 2\nVariante 3\nNewsletter",
    "Texto sem qualquer estrutura, mas com intenção de newsletter e um URL https://example.com/contactos.",
    "Secção adicional desconhecida:\nConteúdo extra\n\nMarketing:\nCopy especial\n\nNewsletter",
    "Newsletter\n\nVariantes:\nA\nB\nC\nD\nE\n\nNotas finais: manter integral.",
  ];

  for (const briefing of briefings) {
    const parsed = parseInvest2030TaskNotes(briefing);
    assert(parsed.originalNotes === briefing, "Briefing original deve ser preservado integralmente.");
    assert(parsed.missingFields.length === 0, "Briefing não deve gerar campos obrigatórios em falta.");
    assert(parsed.unrecognizedHeadings.length === 0, "Briefing não deve gerar títulos inesperados.");
    assert(buildInvest2030GptBriefing(parsed).includes(briefing), "Briefing copiado para GPT deve conter o texto original sem omissões.");
    assert(!buildInvest2030GptBriefing(parsed).includes("Schema obrigatório"), "Briefing copiado não deve repetir o schema.");

    const validation = validateInvest2030Newsletter(validContent, parsed);
    assert(validation.blockers.length === 0, "Estrutura do briefing original não deve gerar bloqueios.");
    assert(validation.warnings.length === 0, "Estrutura do briefing original não deve gerar avisos.");
  }
}

function assertWebinarIdentificationAndBriefing() {
  const investClient = {
    id: "invest",
    name: "Invest2030",
    client_code: "02_I2030",
    short_name: "I2030",
    display_order: 2,
    logo_url: null,
    color_key: "green" as const,
  };
  const webinarOnly = webinarBriefing.replace("Webinar, Redes Sociais", "Webinar");
  const socialFirst = webinarBriefing.replace("Webinar, Redes Sociais", "Redes Sociais, Webinar");
  const socialAnd = webinarBriefing.replace("Webinar, Redes Sociais", "Webinar e Redes Sociais");
  const newsletterOnly = webinarBriefing.replace("Webinar, Redes Sociais", "Newsletter");

  assert(isInvest2030WebinarTask({ client_id: "invest", clients: investClient, notes: webinarOnly }), "Pedido Webinar deve mostrar Preparar webinar.");
  assert(isInvest2030WebinarTask({ client_id: "invest", clients: investClient, notes: socialFirst }), "Pedido Redes Sociais, Webinar deve mostrar Preparar webinar.");
  assert(isInvest2030WebinarTask({ client_id: "invest", clients: investClient, notes: socialAnd }), "Pedido Webinar e Redes Sociais deve mostrar Preparar webinar.");
  assert(isInvest2030SocialContentTask({ client_id: "invest", clients: investClient, notes: socialAnd }), "Pedido Webinar e Redes Sociais deve manter Criar conteúdo.");
  assert(!isInvest2030NewsletterTask({ client_id: "invest", clients: investClient, notes: webinarOnly }), "Pedido apenas Webinar não deve mostrar Preparar newsletter.");
  assert(isInvest2030NewsletterTask({ client_id: "invest", clients: investClient, notes: newsletterOnly }), "Pedido Newsletter não deve regredir.");

  const parsed = parseInvest2030TaskNotes(webinarBriefing);
  const copied = buildInvest2030GptBriefing(parsed, "webinar");
  assert(copied.startsWith("Gera o JSON desta campanha de webinar"), "Prompt de webinar deve usar o texto específico.");
  assert(copied.includes(webinarBriefing), "Prompt de webinar deve copiar o briefing integral.");
  assert(copied.includes("Data/hora do webinar"), "Prompt de webinar deve incluir Data/hora do webinar.");
  assert(!copied.includes("Schema obrigatório"), "Prompt de webinar não deve repetir schema.");
  assert(safeInvest2030WebinarRegistrationUrl(parsed).valid, "Link de inscrição estruturado deve ser válido.");
}

function assertGptUrlConfiguration() {
  assert(
    invest2030GptUrls.newsletter === "https://chatgpt.com/g/g-6a567bd8b7248191a1bd1cd62d3c79e8-gerador-de-newsletters-invest2030",
    "URL do GPT Newsletter Invest2030 deve estar configurado centralmente.",
  );
  assert(
    invest2030GptUrls.webinar === "https://chatgpt.com/g/g-6a58bb2fb24c81918ea2247f4694f8f6-webinar-invest2030-gerador-json",
    "URL do GPT Webinar Invest2030 deve estar configurado centralmente.",
  );
}

function assertWebinarJsonAndRendering() {
  const parsed = parseInvest2030TaskNotes(webinarBriefing);
  const accepted = parseInvest2030WebinarJson(JSON.stringify(webinarContent));
  assert(accepted.content, "Schema de webinar válido deve ser aceite.");

  const editedLink = "https://example.com/inscricao-webinar";
  const editedLabel = "Reservar lugar agora";
  const acceptedWithEditedLink = parseInvest2030WebinarJson(JSON.stringify({ ...webinarContent, primary_cta_label: editedLabel, primary_cta_url: editedLink }));
  assert(acceptedWithEditedLink.content?.primary_cta_url === editedLink, "Link principal editado deve ser aceite e preservado.");
  assert(acceptedWithEditedLink.content?.primary_cta_label === editedLabel, "Texto do botão principal editado deve ser aceite e preservado.");
  const editedHtml = generateInvest2030WebinarHtml({ ...webinarContent, primary_cta_label: editedLabel, primary_cta_url: editedLink }, parsed);
  assert(editedHtml.includes(editedLink), "HTML do webinar deve usar o link principal editado.");
  assert(
    editedHtml.includes(`>${editedLabel}</a>`),
    "HTML do webinar deve usar o texto do botão principal editado.",
  );

  const newsletterRejected = parseInvest2030WebinarJson(JSON.stringify(sourceContent));
  assert(!newsletterRejected.content, "Schema da newsletter deve ser rejeitado na página webinar.");
  assert(newsletterRejected.errors.some((error) => error.includes("Campo não previsto")), "Campos adicionais devem ser rejeitados.");

  const extraField = parseInvest2030WebinarJson(JSON.stringify({ ...webinarContent, cta_url: "https://example.com" }));
  assert(!extraField.content, "Campo adicional no webinar deve ser rejeitado.");

  const wrongStats = parseInvest2030WebinarJson(JSON.stringify({
    ...webinarContent,
    stats: [
      { label: "Hora", value: "11h00" },
      { label: "Data", value: "24 de julho" },
      { label: "Apoio", value: "Até 60%" },
      { label: "Prazo", value: "31 de julho" },
    ],
  }));
  assert(!wrongStats.content, "Stats fora de ordem devem ser rejeitados.");

  const ricardo = parseInvest2030WebinarJson(JSON.stringify({
    ...webinarContent,
    speaker: { name: "Ricardo Carvalho", organisation: "Invest2030", image_url: "https://example.com/ricardo.jpg" },
  }));
  assert(ricardo.content?.speaker.name === "Ricardo Carvalho", "Orador Ricardo Carvalho deve ser aceite.");

  const html = generateInvest2030WebinarHtml(webinarContent, parsed);
  assert(html.includes("André Loureiro"), "Orador André Loureiro deve renderizar.");
  assert(!html.includes("<img alt=\"André Loureiro\""), "Sem image_url não deve renderizar imagem partida.");
  assert((html.match(/Garantir a minha vaga/g) ?? []).length === 2, "Template deve renderizar dois botões principais.");
  assert((html.match(/Saber mais/g) ?? []).length === 2, "Template deve renderizar dois botões secundários.");
  assert((html.match(/https:\/\/www\.invest2030\.pt\/pt\/webinar\/incentivos\/?/g) ?? []).length === 2, "Botões principais devem usar o link de inscrição.");
  assert((html.match(new RegExp(INVEST2030_WEBINAR_SECONDARY_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length === 2, "Botões Saber mais devem usar só o URL de contactos.");
  assert(html.includes("[COMPANY_FULL_ADDRESS]") && html.includes("[UNSUBSCRIBE_URL]"), "Footer do webinar deve manter tags obrigatórias.");
  assert(!html.includes("Ver no navegador"), "Webinar não deve reintroduzir Ver no navegador.");

  const noSpeakerHtml = generateInvest2030WebinarHtml({
    ...webinarContent,
    speaker: { name: "", organisation: "", image_url: "" },
  }, parsed);
  assert(!noSpeakerHtml.includes("// Orador"), "Secção de orador deve ser ocultada sem nome e organização.");

  const missingLinkParsed = parseInvest2030TaskNotes(webinarBriefing.replace("https://www.invest2030.pt/pt/webinar/incentivos", "Sem link definido"));
  const missingLinkValidation = validateInvest2030Webinar(webinarContent, missingLinkParsed);
  assert(missingLinkValidation.blockers.includes("Falta definir um link válido para a inscrição no webinar."), "Exportação deve bloquear sem link de inscrição.");

  const validation = validateInvest2030Webinar(webinarContent, parsed);
  assert(validation.blockers.length === 0, `Webinar válido não deve ter bloqueios: ${validation.blockers.join(", ")}`);
}

async function main() {
  const generatedHtml = generateInvest2030NewsletterHtml(sourceContent);
  assert(generatedHtml.startsWith("<!doctype html>"), "HTML gerado deve começar em <!doctype html>.");
  assert(generatedHtml.trimEnd().endsWith("</html>"), "HTML gerado deve terminar em </html>.");
  assert(generatedHtml.includes("[COMPANY_FULL_ADDRESS]"), "MagicSpider [COMPANY_FULL_ADDRESS] em falta.");
  assert(generatedHtml.includes("[UNSUBSCRIBE_URL]"), "MagicSpider [UNSUBSCRIBE_URL] em falta.");
  assert(!generatedHtml.includes("Ver no navegador"), "Link Ver no navegador não deve existir.");
  assert(!generatedHtml.includes('href=""'), "Não devem existir links vazios.");

  assertStaticTemplateMatchesSource(generatedHtml);
  assertWorkspaceResponsiveSource();
  assertJsonImportStates();
  assertOriginalBriefingsStayOpaque();
  assertGptUrlConfiguration();
  assertWebinarIdentificationAndBriefing();
  assertWebinarJsonAndRendering();

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await assertDesktopVisual(page, generatedHtml);
    await assertMobileVisual(page, generatedHtml);
  } finally {
    await browser.close();
  }

  console.log("Invest2030 newsletter template regression passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown Invest2030 newsletter test error");
  process.exit(1);
});
