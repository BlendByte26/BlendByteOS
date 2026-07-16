import {
  Circle,
  Document,
  Font,
  Image,
  Page,
  Rect,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";
import type { ViewProps } from "@react-pdf/renderer";
import type {
  ContentPlanningExportData,
  ContentPlanningExportItem,
  ContentPlanningLanguage,
} from "@/lib/content-planning-export";

Font.registerHyphenationCallback((word) => [word]);

const pageSize = "A4";
const acid = "#A8FF3E";
const ink = "#080808";
const paper = "#F7F7F3";
const soft = "#EFEFEB";
const muted = "#6B6B67";
const line = "#D7D7D0";
const calendarRowsPerPage = 9;
const fragmentLineBudget = 14;
const fragmentCharactersPerLine = 58;
const fragmentCharacterLimit = 390;

const labels = {
  pt: {
    contents: "conteúdos",
    platforms: "Plataformas",
    monthlyObjective: "Objetivo do mês",
    keyThemes: "Temas principais",
    calendar: "Calendário geral",
    date: "Data",
    content: "Conteúdo",
    format: "Formato",
    platform: "Plataforma",
    objective: "Objetivo",
    noObjective: "Objetivo por definir",
    hashtags: "Hashtags",
    approvalComments: "Aprovação / comentários",
    approvalTitle: "Aprovação do planeamento",
    approvalDeadline: "Data limite de aprovação",
    clientContact: "Contacto do cliente",
    noDate: "Sem data",
    noContent: "Conteúdo por preencher.",
    continuation: "Continuação",
    plan: "Planeamento de Conteúdos",
  },
  en: {
    contents: "contents",
    platforms: "Platforms",
    monthlyObjective: "Monthly objective",
    keyThemes: "Key themes",
    calendar: "General calendar",
    date: "Date",
    content: "Content",
    format: "Format",
    platform: "Platform",
    objective: "Objective",
    noObjective: "Objective to be defined",
    hashtags: "Hashtags",
    approvalComments: "Approval / comments",
    approvalTitle: "Content plan approval",
    approvalDeadline: "Approval deadline",
    clientContact: "Client contact",
    noDate: "No date",
    noContent: "Content to be completed.",
    continuation: "Continuation",
    plan: "Content Plan",
  },
} satisfies Record<ContentPlanningLanguage, Record<string, string>>;

type SheetFragment = {
  id: string;
  label: string | null;
  text: string;
  marker?: boolean;
  muted?: boolean;
  lines: number;
};

type PlannedSheet = {
  item: ContentPlanningExportItem;
  pageIndex: number;
  pageCount: number;
  columns: [SheetFragment[], SheetFragment[]];
};

function t(data: ContentPlanningExportData) {
  return labels[data.language];
}

function uppercase(value: string) {
  return value.toLocaleUpperCase("pt-PT");
}

function formatDate(value: string | null, language: ContentPlanningLanguage) {
  if (!value) return labels[language].noDate;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function platformList(platforms: string[], language: ContentPlanningLanguage) {
  const uniquePlatforms = Array.from(
    new Map(
      platforms
        .flatMap((platform) => platform.split(/\s*(?:·|,|\/|\||\+)\s*/))
        .map((platform) => platform.trim())
        .filter(Boolean)
        .map((platform) => [platform.toLocaleLowerCase("pt-PT"), platform]),
    ).values(),
  );
  return uniquePlatforms.length ? uniquePlatforms.join(" · ") : labels[language].platform;
}

function truncateText(value: string, limit: number) {
  if (value.length <= limit) return value;
  return `${value.slice(0, Math.max(0, limit - 3)).trimEnd()}...`;
}

function textParagraphs(value: string | null | undefined) {
  return (value ?? "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function splitLongToken(token: string, limit: number) {
  if (token.length <= limit) return [token];
  const parts: string[] = [];
  for (let index = 0; index < token.length; index += limit) {
    parts.push(token.slice(index, index + limit));
  }
  return parts;
}

function splitTextForSheet(value: string) {
  const chunks: string[] = [];
  let current = "";
  const tokens = value
    .split(/(\s+)/)
    .flatMap((token) => (token.trim() ? splitLongToken(token, fragmentCharacterLimit) : [token]));

  for (const token of tokens) {
    if (current && current.length + token.length > fragmentCharacterLimit) {
      chunks.push(current.trim());
      current = token.trimStart();
    } else {
      current += token;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [value];
}

function estimateFragmentLines(text: string, hasLabel: boolean) {
  const textLines = text.split("\n").reduce((total, row) => {
    return total + Math.max(1, Math.ceil(row.length / fragmentCharactersPerLine));
  }, 0);
  return textLines + (hasLabel ? 2 : 1);
}

function fragmentsFromText({
  id,
  text,
  label,
  continuationLabel,
  marker = false,
  muted = false,
}: {
  id: string;
  text: string;
  label: string | null;
  continuationLabel?: string | null;
  marker?: boolean;
  muted?: boolean;
}) {
  return splitTextForSheet(text).map<SheetFragment>((chunk, index) => {
    const chunkLabel = index === 0 ? label : (continuationLabel ?? label);
    return {
      id: `${id}-${index}`,
      label: chunkLabel,
      text: chunk,
      marker,
      muted,
      lines: estimateFragmentLines(chunk, Boolean(chunkLabel)),
    };
  });
}

function itemFragments(item: ContentPlanningExportItem, language: ContentPlanningLanguage) {
  const copy = labels[language];
  const fragments: SheetFragment[] = [];
  const continuationSuffix = " (cont.)";

  fragments.push(
    ...fragmentsFromText({
      id: `${item.id}-objective`,
      text: item.objective || copy.noObjective,
      label: copy.objective,
      continuationLabel: `${copy.objective}${continuationSuffix}`,
      muted: !item.objective,
    }),
  );

  for (const [index, block] of item.copyBlocks.entries()) {
    const label = block.kind === "marker" ? block.label : null;
    fragments.push(
      ...fragmentsFromText({
        id: `${item.id}-creative-${index}`,
        text: block.text,
        label,
        continuationLabel: label ? `${label}${continuationSuffix}` : null,
        marker: block.kind === "marker",
      }),
    );
  }

  for (const [index, paragraph] of item.captionParagraphs.entries()) {
    fragments.push(
      ...fragmentsFromText({
        id: `${item.id}-post-${index}`,
        text: paragraph,
        label: null,
      }),
    );
  }

  if (!item.copyBlocks.length && !item.captionParagraphs.length) {
    fragments.push(
      ...fragmentsFromText({
        id: `${item.id}-empty`,
        text: copy.noContent,
        label: null,
        muted: true,
      }),
    );
  }

  if (item.hashtags) {
    fragments.push(
      ...fragmentsFromText({
        id: `${item.id}-hashtags`,
        text: item.hashtags,
        label: copy.hashtags,
        continuationLabel: `${copy.hashtags}${continuationSuffix}`,
      }),
    );
  }

  return fragments;
}

function planItemSheets(item: ContentPlanningExportItem, language: ContentPlanningLanguage) {
  const pages: Array<{ columns: [SheetFragment[], SheetFragment[]]; weights: [number, number] }> = [];
  let page = { columns: [[], []] as [SheetFragment[], SheetFragment[]], weights: [0, 0] as [number, number] };
  let columnIndex: 0 | 1 = 0;

  for (const fragment of itemFragments(item, language)) {
    if (page.weights[columnIndex] + fragment.lines > fragmentLineBudget) {
      if (columnIndex === 0) {
        columnIndex = 1;
      } else {
        pages.push(page);
        page = { columns: [[], []], weights: [0, 0] };
        columnIndex = 0;
      }
    }

    page.columns[columnIndex].push(fragment);
    page.weights[columnIndex] += fragment.lines;
  }

  if (page.columns[0].length || page.columns[1].length) pages.push(page);

  return pages.map<PlannedSheet>((plannedPage, pageIndex) => ({
    item,
    pageIndex,
    pageCount: pages.length,
    columns: plannedPage.columns,
  }));
}

function plannedContentSheets(data: ContentPlanningExportData) {
  return data.items.flatMap((item) => planItemSheets(item, data.language));
}

function ClientMark({ data }: { data: ContentPlanningExportData }) {
  if (data.logoDataUrl) {
    // eslint-disable-next-line jsx-a11y/alt-text
    return <Image src={data.logoDataUrl} style={styles.clientLogo} />;
  }

  return (
    <View style={styles.clientInitials}>
      <Text>{data.client.short_name || data.client.client_code || data.client.name.slice(0, 6)}</Text>
    </View>
  );
}

function CoverPage({ data }: { data: ContentPlanningExportData }) {
  const copy = t(data);

  return (
    <Page size={pageSize} orientation="landscape" style={styles.coverPage}>
      <Svg style={styles.coverCircle} viewBox="0 0 220 220">
        <Circle cx="110" cy="110" r="108" stroke="#78B63F" strokeWidth="2" fill="none" />
      </Svg>
      <Svg style={styles.coverAccent} viewBox="0 0 250 110">
        <Rect x="18" y="36" width="190" height="64" rx="9" fill={acid} />
        <Rect x="70" y="16" width="118" height="82" rx="7" fill="none" stroke="#FFFFFF" strokeWidth="2" />
      </Svg>

      <View style={styles.coverTop}>
        <Text style={styles.coverBrand}>BlendByte</Text>
        <View style={styles.coverClientHeader}>
          <ClientMark data={data} />
          <Text style={styles.coverClientName}>{data.client.name}</Text>
        </View>
      </View>

      <View style={styles.coverMain}>
        <Text style={styles.coverEyebrow}>{uppercase(copy.plan)}</Text>
        <Text style={styles.coverTitle}>{data.documentTitle}</Text>
        <Text style={styles.coverClientLarge}>{data.client.name}</Text>
        <View style={styles.coverPills}>
          <View style={styles.monthPill}>
            <Text>{uppercase(data.monthLabel)}</Text>
          </View>
          <View style={styles.platformPill}>
            <Text>{uppercase(platformList(data.platforms, data.language))}</Text>
          </View>
        </View>
      </View>

      <View style={styles.coverCount}>
        <Text style={styles.coverCountNumber}>{data.total}</Text>
        <Text style={styles.coverCountLabel}>{uppercase(copy.contents)}</Text>
      </View>
    </Page>
  );
}

function ExecutiveSummaryPage({ data }: { data: ContentPlanningExportData }) {
  const copy = t(data);

  return (
    <Page size={pageSize} orientation="landscape" style={styles.lightPage}>
      <PageHeader data={data} title={copy.monthlyObjective} />
      <View style={styles.summaryLayout}>
        <View style={styles.summaryMain}>
          <Text style={styles.summaryTitle}>{copy.monthlyObjective}</Text>
          <Paragraphs paragraphs={textParagraphs(data.monthlyObjective)} style={styles.summaryText} />
        </View>
        {data.monthlyThemes ? (
          <View style={styles.summarySide}>
            <Text style={styles.summarySideTitle}>{copy.keyThemes}</Text>
            <Paragraphs paragraphs={textParagraphs(data.monthlyThemes)} style={styles.summarySideText} />
          </View>
        ) : null}
      </View>
      <PageFooter data={data} />
    </Page>
  );
}

function CalendarPage({
  data,
  items,
  pageIndex,
  pageCount,
}: {
  data: ContentPlanningExportData;
  items: ContentPlanningExportItem[];
  pageIndex: number;
  pageCount: number;
}) {
  const copy = t(data);
  const pageTitle = pageCount > 1 ? `${copy.calendar} · ${pageIndex + 1}/${pageCount}` : copy.calendar;

  return (
    <Page size={pageSize} orientation="landscape" style={styles.lightPage}>
      <PageHeader data={data} title={pageTitle} />
      <View style={styles.calendarTable}>
        <View style={styles.calendarHeader}>
          <CalendarCell style={styles.calendarDate} value={copy.date} />
          <CalendarCell style={styles.calendarContent} value={copy.content} />
          <CalendarCell style={styles.calendarFormat} value={copy.format} />
          <CalendarCell style={styles.calendarPlatform} value={copy.platform} />
        </View>
        {items.map((item, index) => (
          <View key={item.id} style={index % 2 ? [styles.calendarRow, styles.calendarRowAlt] : styles.calendarRow}>
            <CalendarCell
              style={styles.calendarDate}
              value={`${formatDate(item.publishDate, data.language)}${item.publishTime ? ` · ${item.publishTime}` : ""}`}
            />
            <CalendarCell
              style={styles.calendarContent}
              value={`#${String(item.sequence).padStart(2, "0")} ${item.title}`}
              maxLines={2}
            />
            <CalendarCell style={styles.calendarFormat} value={item.format ?? "-"} maxLines={2} />
            <CalendarCell style={styles.calendarPlatform} value={item.platform} maxLines={2} />
          </View>
        ))}
      </View>
      <PageFooter data={data} />
    </Page>
  );
}

function CalendarCell({
  style,
  value,
  maxLines = 1,
}: {
  style: ViewProps["style"];
  value: string;
  maxLines?: number;
}) {
  const characterLimit = maxLines === 1 ? 48 : 96;
  return (
    <View style={[styles.calendarCell, style as never]}>
      <Text>{truncateText(value, characterLimit)}</Text>
    </View>
  );
}

function ContentSheetPage({ data, sheet }: { data: ContentPlanningExportData; sheet: PlannedSheet }) {
  const copy = t(data);
  const { item, pageIndex, pageCount, columns } = sheet;
  const continuation = pageCount > 1 ? `${copy.continuation} ${pageIndex + 1}/${pageCount}` : null;

  return (
    <Page size={pageSize} orientation="landscape" style={styles.lightPage}>
      <PageHeader data={data} title={data.documentTitle} />
      <View style={styles.contentSheet}>
        <View style={styles.sheetTop}>
          <View style={styles.sheetIdentity}>
            <Text style={styles.sheetNumber}>#{String(item.sequence).padStart(2, "0")}</Text>
            <Text style={styles.sheetDate}>
              {formatDate(item.publishDate, data.language)}{item.publishTime ? ` · ${item.publishTime}` : ""}
            </Text>
            {continuation ? <Text style={styles.sheetContinuation}>{uppercase(continuation)}</Text> : null}
          </View>
          <View style={styles.sheetMetaGrid}>
            <SheetMeta label={copy.format} value={item.format ?? "-"} />
            <SheetMeta label={copy.platform} value={item.platform} />
          </View>
        </View>

        <Text style={item.title.length > 90 ? styles.sheetTitleLong : styles.sheetTitle}>
          {truncateText(item.title, 150)}
        </Text>
        <Text style={styles.contentLabel}>{uppercase(copy.content)}</Text>

        <View style={styles.sheetBodyColumns}>
          {columns.map((fragments, columnIndex) => (
            <View key={`${item.id}-${pageIndex}-${columnIndex}`} style={styles.sheetBodyColumn}>
              {fragments.map((fragment) => (
                <SheetFragmentView key={fragment.id} fragment={fragment} />
              ))}
            </View>
          ))}
        </View>

        {pageIndex === pageCount - 1 ? <ApprovalBox label={copy.approvalComments} /> : <View style={styles.approvalSlot} />}
      </View>
      <PageFooter data={data} />
    </Page>
  );
}

function SheetMeta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.sheetMetaCell}>
      <Text style={styles.sheetMetaLabel}>{uppercase(label)}</Text>
      <Text style={styles.sheetMetaValue}>{truncateText(uppercase(value), 58)}</Text>
    </View>
  );
}

function SheetFragmentView({ fragment }: { fragment: SheetFragment }) {
  return (
    <View style={fragment.marker ? styles.markerFragment : styles.sheetFragment}>
      {fragment.label ? <Text style={styles.fragmentLabel}>{uppercase(fragment.label)}</Text> : null}
      <Text style={fragment.muted ? styles.fragmentTextMuted : styles.fragmentText}>{fragment.text}</Text>
    </View>
  );
}

function ApprovalBox({ label }: { label: string }) {
  return (
    <View style={styles.approvalBox}>
      <Text style={styles.approvalLabel}>{uppercase(label)}</Text>
      <View style={styles.approvalLines}>
        <View style={styles.approvalLine} />
        <View style={styles.approvalLine} />
      </View>
    </View>
  );
}

function FinalPage({ data }: { data: ContentPlanningExportData }) {
  const copy = t(data);

  return (
    <Page size={pageSize} orientation="landscape" style={styles.finalPage}>
      <View style={styles.finalTop}>
        <Text style={styles.coverBrand}>BlendByte</Text>
        <Text style={styles.finalClient}>{uppercase(data.client.name)}</Text>
      </View>

      <View style={styles.finalLayout}>
        <View style={styles.finalCopy}>
          <Text style={styles.finalTitle}>{copy.approvalTitle}</Text>
          <Paragraphs paragraphs={textParagraphs(data.approvalInstructions)} style={styles.finalText} />
        </View>
        <View style={styles.finalPanel}>
          {data.approvalDeadlineLabel ? <MetaLine label={copy.approvalDeadline} value={data.approvalDeadlineLabel} /> : null}
          {data.clientContactName ? <MetaLine label={copy.clientContact} value={data.clientContactName} /> : null}
          <MetaLine label="Website" value={data.website} />
          <View style={styles.finalBrandBlock}>
            <Text style={styles.finalBrandSmall}>BlendByte</Text>
            <Text style={styles.finalBrandText}>{data.documentTitle}</Text>
          </View>
        </View>
      </View>
    </Page>
  );
}

function MetaLine({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.metaLine}>
      <Text style={styles.metaLabel}>{uppercase(label)}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function Paragraphs({ paragraphs, style }: { paragraphs: string[]; style: object }) {
  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <Text key={`${paragraph}-${index}`} style={index > 0 ? [style as never, styles.paragraphSpacing] : (style as never)}>
          {paragraph}
        </Text>
      ))}
    </>
  );
}

function PageHeader({ data, title }: { data: ContentPlanningExportData; title: string }) {
  return (
    <View style={styles.pageHeader}>
      <View>
        <Text style={styles.pageEyebrow}>{uppercase(data.documentTitle)}</Text>
        <Text style={styles.pageTitle}>{title}</Text>
      </View>
      <View style={styles.pageHeaderRight}>
        <Text style={styles.pageClient}>{uppercase(data.client.name)}</Text>
        <Text style={styles.pageSubhead}>{data.monthLabel}</Text>
      </View>
    </View>
  );
}

function PageFooter({ data }: { data: ContentPlanningExportData }) {
  return (
    <View style={styles.pageFooter}>
      <Text>
        <Text style={styles.footerBrand}>BlendByte</Text> · {data.documentTitle}
      </Text>
      <Text render={({ pageNumber, totalPages }) => `${String(pageNumber).padStart(2, "0")} / ${String(totalPages).padStart(2, "0")}`} />
    </View>
  );
}

export function ContentPlanningPdfDocument({ data }: { data: ContentPlanningExportData }) {
  const calendarPages = chunkArray(data.items, calendarRowsPerPage);
  const contentSheets = plannedContentSheets(data);

  return (
    <Document
      title={`${data.documentTitle} - ${data.client.name} - ${data.monthLabel}`}
      author="BlendByte"
      subject={data.documentTitle}
      creator="BlendByteOS"
      producer="BlendByteOS"
    >
      <CoverPage data={data} />
      <ExecutiveSummaryPage data={data} />
      {calendarPages.map((items, pageIndex) => (
        <CalendarPage
          key={`calendar-${pageIndex}`}
          data={data}
          items={items}
          pageIndex={pageIndex}
          pageCount={calendarPages.length}
        />
      ))}
      {contentSheets.map((sheet) => (
        <ContentSheetPage key={`${sheet.item.id}-${sheet.pageIndex}`} data={data} sheet={sheet} />
      ))}
      <FinalPage data={data} />
    </Document>
  );
}

const styles = StyleSheet.create({
  coverPage: {
    position: "relative",
    padding: 48,
    backgroundColor: "#000000",
    color: "#FFFFFF",
    fontFamily: "Helvetica",
  },
  coverTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  coverBrand: {
    fontSize: 21,
    fontFamily: "Helvetica-Bold",
  },
  coverClientHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  clientLogo: {
    width: 44,
    height: 44,
    objectFit: "contain",
  },
  clientInitials: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: 7,
    alignItems: "center",
    justifyContent: "center",
    border: "1.5 solid #FFFFFF",
    borderRadius: 8,
    fontFamily: "Helvetica-Bold",
  },
  coverClientName: {
    maxWidth: 280,
    fontSize: 23,
    fontFamily: "Helvetica-Bold",
  },
  coverMain: {
    marginTop: 58,
    width: 560,
  },
  coverEyebrow: {
    color: acid,
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2.8,
    marginBottom: 20,
  },
  coverTitle: {
    fontSize: 46,
    lineHeight: 1,
    fontFamily: "Helvetica-Bold",
    marginBottom: 14,
  },
  coverClientLarge: {
    fontSize: 30,
    lineHeight: 1.1,
    color: "#DADAD5",
    marginBottom: 30,
  },
  coverPills: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  monthPill: {
    minWidth: 132,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 28,
    backgroundColor: acid,
    color: ink,
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  platformPill: {
    minWidth: 260,
    paddingVertical: 15,
    paddingHorizontal: 22,
    borderRadius: 28,
    border: "1.4 solid #FFFFFF",
    color: "#FFFFFF",
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  coverCount: {
    position: "absolute",
    right: 48,
    bottom: 50,
    alignItems: "flex-end",
  },
  coverCountNumber: {
    color: acid,
    fontSize: 42,
    lineHeight: 0.95,
    fontFamily: "Helvetica-Bold",
  },
  coverCountLabel: {
    color: "#CFCFCB",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
  },
  coverCircle: {
    position: "absolute",
    right: -20,
    top: 54,
    width: 190,
    height: 190,
  },
  coverAccent: {
    position: "absolute",
    right: 28,
    bottom: 116,
    width: 220,
    height: 96,
    transform: "rotate(-8deg)",
  },
  lightPage: {
    paddingTop: 92,
    paddingHorizontal: 42,
    paddingBottom: 42,
    backgroundColor: paper,
    color: ink,
    fontFamily: "Helvetica",
  },
  pageHeader: {
    position: "absolute",
    left: 42,
    right: 42,
    top: 28,
    paddingBottom: 14,
    borderBottom: "1.5 solid #111111",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  pageEyebrow: {
    color: muted,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2.6,
    marginBottom: 5,
  },
  pageTitle: {
    fontSize: 20,
    lineHeight: 1,
    fontFamily: "Helvetica-Bold",
  },
  pageHeaderRight: {
    alignItems: "flex-end",
  },
  pageClient: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },
  pageSubhead: {
    marginTop: 4,
    color: muted,
    fontSize: 9,
  },
  pageFooter: {
    position: "absolute",
    left: 42,
    right: 42,
    bottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    color: muted,
    fontSize: 8,
  },
  footerBrand: {
    color: ink,
    fontFamily: "Helvetica-Bold",
  },
  summaryLayout: {
    flexDirection: "row",
    gap: 26,
  },
  summaryMain: {
    flex: 1.3,
    height: 360,
    padding: 28,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    border: `1 solid ${line}`,
  },
  summarySide: {
    flex: 0.85,
    height: 360,
    padding: 24,
    borderRadius: 8,
    backgroundColor: acid,
    color: ink,
  },
  summaryTitle: {
    fontSize: 27,
    lineHeight: 1.08,
    fontFamily: "Helvetica-Bold",
    marginBottom: 18,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 1.38,
  },
  summarySideTitle: {
    fontSize: 19,
    lineHeight: 1.1,
    fontFamily: "Helvetica-Bold",
    marginBottom: 16,
  },
  summarySideText: {
    fontSize: 12.5,
    lineHeight: 1.42,
  },
  paragraphSpacing: {
    marginTop: 8,
  },
  calendarTable: {
    height: 373,
    border: `1 solid ${line}`,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  calendarHeader: {
    height: 40,
    flexDirection: "row",
    backgroundColor: ink,
    color: "#FFFFFF",
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },
  calendarRow: {
    height: 37,
    flexDirection: "row",
    borderTop: `1 solid ${line}`,
    fontSize: 9.2,
    lineHeight: 1.25,
  },
  calendarRowAlt: {
    backgroundColor: soft,
  },
  calendarCell: {
    height: "100%",
    paddingVertical: 7,
    paddingHorizontal: 9,
    justifyContent: "center",
  },
  calendarDate: {
    width: "18%",
  },
  calendarContent: {
    width: "44%",
  },
  calendarFormat: {
    width: "16%",
  },
  calendarPlatform: {
    width: "22%",
  },
  contentSheet: {
    height: 400,
    padding: 17,
    border: "1.4 solid #111111",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },
  sheetTop: {
    height: 43,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "stretch",
  },
  sheetIdentity: {
    width: "46%",
  },
  sheetNumber: {
    color: acid,
    fontSize: 22,
    lineHeight: 0.95,
    fontFamily: "Helvetica-Bold",
  },
  sheetDate: {
    marginTop: 3,
    color: muted,
    fontSize: 8.8,
    fontFamily: "Helvetica-Bold",
  },
  sheetContinuation: {
    marginTop: 3,
    color: muted,
    fontSize: 6.8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.2,
  },
  sheetMetaGrid: {
    width: "49%",
    height: 43,
    flexDirection: "row",
    border: `1 solid ${line}`,
    borderRadius: 5,
    overflow: "hidden",
  },
  sheetMetaCell: {
    width: "50%",
    height: 43,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRight: `1 solid ${line}`,
  },
  sheetMetaLabel: {
    color: muted,
    fontSize: 6.4,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.1,
    textAlign: "center",
    marginBottom: 3,
  },
  sheetMetaValue: {
    fontSize: 7.8,
    lineHeight: 1.05,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  sheetTitle: {
    height: 46,
    marginTop: 7,
    fontSize: 18,
    lineHeight: 1.08,
    fontFamily: "Helvetica-Bold",
  },
  sheetTitleLong: {
    height: 46,
    marginTop: 7,
    fontSize: 14,
    lineHeight: 1.1,
    fontFamily: "Helvetica-Bold",
  },
  contentLabel: {
    height: 13,
    color: muted,
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.5,
  },
  sheetBodyColumns: {
    height: 200,
    flexDirection: "row",
    gap: 20,
  },
  sheetBodyColumn: {
    width: "49%",
    height: 200,
    overflow: "hidden",
  },
  sheetFragment: {
    marginBottom: 7,
  },
  markerFragment: {
    marginBottom: 7,
    paddingTop: 5,
    borderTop: `1 solid ${line}`,
  },
  fragmentLabel: {
    color: muted,
    fontSize: 7.2,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.1,
    marginBottom: 3,
  },
  fragmentText: {
    fontSize: 8.8,
    lineHeight: 1.28,
  },
  fragmentTextMuted: {
    color: muted,
    fontSize: 8.8,
    lineHeight: 1.28,
  },
  approvalSlot: {
    height: 54,
  },
  approvalBox: {
    height: 54,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    backgroundColor: "#FAFAF7",
    border: `1 solid ${line}`,
    borderRadius: 5,
  },
  approvalLabel: {
    width: 145,
    color: muted,
    fontSize: 7.2,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.1,
  },
  approvalLines: {
    flex: 1,
    gap: 12,
  },
  approvalLine: {
    height: 1,
    backgroundColor: line,
  },
  finalPage: {
    padding: 48,
    backgroundColor: "#000000",
    color: "#FFFFFF",
    fontFamily: "Helvetica",
  },
  finalTop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  finalClient: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
  },
  finalLayout: {
    marginTop: 70,
    flexDirection: "row",
    gap: 34,
  },
  finalCopy: {
    flex: 1,
  },
  finalTitle: {
    color: acid,
    fontSize: 34,
    lineHeight: 1,
    fontFamily: "Helvetica-Bold",
    marginBottom: 24,
  },
  finalText: {
    color: "#E7E7E3",
    fontSize: 12.4,
    lineHeight: 1.42,
  },
  finalPanel: {
    width: 230,
    minHeight: 250,
    padding: 22,
    borderRadius: 8,
    backgroundColor: acid,
    color: ink,
  },
  metaLine: {
    marginBottom: 18,
  },
  metaLabel: {
    color: "#4D4D49",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.4,
    marginBottom: 5,
  },
  metaValue: {
    fontSize: 11,
    lineHeight: 1.25,
    fontFamily: "Helvetica-Bold",
  },
  finalBrandBlock: {
    marginTop: 54,
    paddingTop: 18,
    borderTop: "1.5 solid #111111",
  },
  finalBrandSmall: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  finalBrandText: {
    fontSize: 9,
    lineHeight: 1.3,
  },
});
