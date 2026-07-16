import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Svg,
  Text,
  View,
  Circle,
  Rect,
} from "@react-pdf/renderer";
import type {
  ContentPlanningExportData,
  ContentPlanningExportItem,
  ContentPlanningLanguage,
  TextBlock,
} from "@/lib/content-planning-export";

Font.registerHyphenationCallback((word) => [word]);

const pageSize = "A4";
const acid = "#A8FF3E";
const ink = "#080808";
const paper = "#F7F7F3";
const soft = "#EFEFEB";
const muted = "#6B6B67";
const line = "#D7D7D0";

const labels = {
  pt: {
    preparedBy: "Preparado por",
    generatedAt: "Data de geração",
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
    creativeText: "Texto do criativo",
    caption: "Legenda",
    hashtags: "Hashtags",
    approvalComments: "Aprovação / comentários",
    approvalTitle: "Aprovação do planeamento",
    approvalDeadline: "Data limite de aprovação",
    noDate: "Sem data",
    noCopy: "Texto do criativo por preencher.",
    noCaption: "Legenda por preencher.",
    plan: "Planeamento de Conteúdos",
  },
  en: {
    preparedBy: "Prepared by",
    generatedAt: "Generation date",
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
    creativeText: "Creative text",
    caption: "Caption",
    hashtags: "Hashtags",
    approvalComments: "Approval / comments",
    approvalTitle: "Content plan approval",
    approvalDeadline: "Approval deadline",
    noDate: "No date",
    noCopy: "Creative text to be completed.",
    noCaption: "Caption to be completed.",
    plan: "Content Plan",
  },
} satisfies Record<ContentPlanningLanguage, Record<string, string>>;

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
  return platforms.length ? platforms.join(" · ") : labels[language].platform;
}

function textParagraphs(value: string | null | undefined) {
  return (value ?? "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function estimatedItemWeight(item: ContentPlanningExportItem) {
  return [
    item.title,
    item.objective,
    item.copy,
    item.caption,
    item.hashtags,
  ].filter(Boolean).join(" ").length + item.copyBlocks.length * 120 + item.captionParagraphs.length * 90;
}

function contentGroups(items: ContentPlanningExportItem[]) {
  const groups: ContentPlanningExportItem[][] = [];
  let index = 0;

  while (index < items.length) {
    const current = items[index]!;
    const next = items[index + 1];
    if (next && current.isShort && next.isShort && estimatedItemWeight(current) + estimatedItemWeight(next) < 1300) {
      groups.push([current, next]);
      index += 2;
      continue;
    }

    groups.push([current]);
    index += 1;
  }

  return groups;
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

      <View style={styles.coverMeta}>
        <MetaLine label={copy.preparedBy} value={data.preparedByName} dark />
        <MetaLine label={copy.generatedAt} value={data.generatedAtLabel} dark />
      </View>

      <View style={styles.coverCount}>
        <Text style={styles.coverCountNumber}>{data.total}</Text>
        <Text style={styles.coverCountLabel}>{uppercase(copy.contents)}</Text>
      </View>
    </Page>
  );
}

function MetaLine({ label, value, dark = false }: { label: string; value: string | null; dark?: boolean }) {
  if (!value) return null;
  return (
    <View style={styles.metaLine}>
      <Text style={dark ? styles.metaLabelDark : styles.metaLabel}>{uppercase(label)}</Text>
      <Text style={dark ? styles.metaValueDark : styles.metaValue}>{value}</Text>
    </View>
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

function CalendarPage({ data }: { data: ContentPlanningExportData }) {
  const copy = t(data);

  return (
    <Page size={pageSize} orientation="landscape" style={styles.lightPage} wrap>
      <PageHeader data={data} title={copy.calendar} fixed />
      <View style={styles.calendarTable}>
        <View style={styles.calendarHeader} fixed>
          <Text style={[styles.calendarCell, styles.calendarDate]}>{copy.date}</Text>
          <Text style={[styles.calendarCell, styles.calendarContent]}>{copy.content}</Text>
          <Text style={[styles.calendarCell, styles.calendarFormat]}>{copy.format}</Text>
          <Text style={[styles.calendarCell, styles.calendarPlatform]}>{copy.platform}</Text>
          <Text style={[styles.calendarCell, styles.calendarObjective]}>{copy.objective}</Text>
        </View>
        {data.items.map((item, index) => (
          <View key={item.id} style={index % 2 ? [styles.calendarRow, styles.calendarRowAlt] : styles.calendarRow} wrap={false}>
            <Text style={[styles.calendarCell, styles.calendarDate]}>{formatDate(item.publishDate, data.language)}{item.publishTime ? ` · ${item.publishTime}` : ""}</Text>
            <Text style={[styles.calendarCell, styles.calendarContent]}>#{String(item.sequence).padStart(2, "0")} {item.title}</Text>
            <Text style={[styles.calendarCell, styles.calendarFormat]}>{item.format ?? "-"}</Text>
            <Text style={[styles.calendarCell, styles.calendarPlatform]}>{item.platform}</Text>
            <Text style={[styles.calendarCell, styles.calendarObjective]}>{item.objective ?? copy.noObjective}</Text>
          </View>
        ))}
      </View>
      <PageFooter data={data} fixed />
    </Page>
  );
}

function ContentSheetPage({ data, items }: { data: ContentPlanningExportData; items: ContentPlanningExportItem[] }) {
  return (
    <Page size={pageSize} orientation="landscape" style={styles.lightPage}>
      <PageHeader data={data} title={data.documentTitle} />
      <View style={items.length === 2 ? styles.sheetGrid : styles.sheetSingle}>
        {items.map((item) => (
          <ContentSheet key={item.id} data={data} item={item} compact={items.length === 2} />
        ))}
      </View>
      <PageFooter data={data} />
    </Page>
  );
}

function ContentSheet({
  data,
  item,
  compact,
}: {
  data: ContentPlanningExportData;
  item: ContentPlanningExportItem;
  compact: boolean;
}) {
  const copy = t(data);

  return (
    <View style={compact ? styles.contentSheetCompact : styles.contentSheet} wrap={false}>
      <View style={styles.sheetTop}>
        <View>
          <Text style={styles.sheetNumber}>#{String(item.sequence).padStart(2, "0")}</Text>
          <Text style={styles.sheetDate}>
            {formatDate(item.publishDate, data.language)}{item.publishTime ? ` · ${item.publishTime}` : ""}
          </Text>
        </View>
        <View style={styles.sheetTags}>
          {item.format ? <Text style={styles.sheetTag}>{uppercase(item.format)}</Text> : null}
          <Text style={styles.sheetTagDark}>{uppercase(item.platform)}</Text>
        </View>
      </View>

      <Text style={compact ? styles.sheetTitleCompact : styles.sheetTitle}>{item.title}</Text>
      {compact ? (
        <>
          <InfoBlock label={copy.objective} fallback={copy.noObjective} value={item.objective} />
          <CreativeBlock label={copy.creativeText} fallback={copy.noCopy} blocks={item.copyBlocks} />
          <CaptionBlock data={data} item={item} />
          <ApprovalBox label={copy.approvalComments} />
        </>
      ) : (
        <View style={styles.sheetBodyColumns}>
          <View style={styles.sheetBodyColumn}>
            <InfoBlock label={copy.objective} fallback={copy.noObjective} value={item.objective} />
            <CreativeBlock label={copy.creativeText} fallback={copy.noCopy} blocks={item.copyBlocks} />
          </View>
          <View style={styles.sheetBodyColumn}>
            <CaptionBlock data={data} item={item} compactTop />
            <ApprovalBox label={copy.approvalComments} />
          </View>
        </View>
      )}
    </View>
  );
}

function InfoBlock({ label, value, fallback }: { label: string; value: string | null; fallback: string }) {
  return (
    <View style={styles.infoBlock}>
      <Text style={styles.blockLabel}>{uppercase(label)}</Text>
      <Text style={styles.bodyText}>{value || fallback}</Text>
    </View>
  );
}

function CreativeBlock({ label, blocks, fallback }: { label: string; blocks: TextBlock[]; fallback: string }) {
  return (
    <View style={styles.infoBlock}>
      <Text style={styles.blockLabel}>{uppercase(label)}</Text>
      {blocks.length ? blocks.map((block, index) => <TextBlockView key={`${block.kind}-${index}`} block={block} />) : <Text style={styles.bodyTextMuted}>{fallback}</Text>}
    </View>
  );
}

function TextBlockView({ block }: { block: TextBlock }) {
  if (block.kind === "marker") {
    return (
      <View style={styles.markerBlock}>
        <Text style={styles.markerLabel}>{block.label}</Text>
        {block.text ? <Paragraphs paragraphs={textParagraphs(block.text)} style={styles.bodyText} /> : null}
      </View>
    );
  }

  return <Paragraphs paragraphs={textParagraphs(block.text)} style={styles.bodyText} />;
}

function ApprovalBox({ label }: { label: string }) {
  return (
    <View style={styles.approvalBox}>
      <Text style={styles.approvalLabel}>{label}</Text>
      <View style={styles.approvalLine} />
      <View style={styles.approvalLine} />
    </View>
  );
}

function CaptionBlock({
  data,
  item,
  compactTop = false,
}: {
  data: ContentPlanningExportData;
  item: ContentPlanningExportItem;
  compactTop?: boolean;
}) {
  const copy = t(data);

  return (
    <View style={compactTop ? styles.captionBlockCompactTop : styles.captionBlock}>
      <Text style={styles.blockLabel}>{uppercase(copy.caption)}</Text>
      {item.captionParagraphs.length ? <Paragraphs paragraphs={item.captionParagraphs} style={styles.captionText} /> : <Text style={styles.bodyTextMuted}>{copy.noCaption}</Text>}
      {item.hashtags ? (
        <View style={styles.hashtagBox}>
          <Text style={styles.hashtagLabel}>{uppercase(copy.hashtags)}</Text>
          <Text style={styles.hashtagText}>{item.hashtags}</Text>
        </View>
      ) : null}
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
          <Text style={styles.finalEyebrow}>{uppercase(copy.approvalTitle)}</Text>
          <Text style={styles.finalTitle}>{copy.approvalTitle}</Text>
          <Paragraphs paragraphs={textParagraphs(data.approvalInstructions)} style={styles.finalText} />
        </View>
        <View style={styles.finalPanel}>
          {data.approvalDeadlineLabel ? <MetaLine label={copy.approvalDeadline} value={data.approvalDeadlineLabel} /> : null}
          <MetaLine label={copy.preparedBy} value={data.preparedByName} />
          <MetaLine label="Email" value={data.preparedByEmail} />
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

function PageHeader({
  data,
  title,
  fixed = false,
}: {
  data: ContentPlanningExportData;
  title: string;
  fixed?: boolean;
}) {
  return (
    <View style={styles.pageHeader} fixed={fixed}>
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

function PageFooter({ data, fixed = false }: { data: ContentPlanningExportData; fixed?: boolean }) {
  return (
    <View style={styles.pageFooter} fixed={fixed}>
      <Text>
        <Text style={styles.footerBrand}>BlendByte</Text> · {data.documentTitle}
      </Text>
      <Text render={({ pageNumber, totalPages }) => `${String(pageNumber).padStart(2, "0")} / ${String(totalPages).padStart(2, "0")}`} />
    </View>
  );
}

export function ContentPlanningPdfDocument({ data }: { data: ContentPlanningExportData }) {
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
      <CalendarPage data={data} />
      {contentGroups(data.items).map((items) => (
        <ContentSheetPage key={items.map((item) => item.id).join("-")} data={data} items={items} />
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
  coverMeta: {
    position: "absolute",
    left: 48,
    bottom: 48,
    flexDirection: "row",
    gap: 34,
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
    minHeight: 360,
    padding: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    border: `1 solid ${line}`,
  },
  summarySide: {
    flex: 0.85,
    minHeight: 360,
    padding: 24,
    borderRadius: 14,
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
    border: `1 solid ${line}`,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  calendarHeader: {
    flexDirection: "row",
    backgroundColor: ink,
    color: "#FFFFFF",
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },
  calendarRow: {
    flexDirection: "row",
    borderTop: `1 solid ${line}`,
    minHeight: 40,
    fontSize: 9.3,
    lineHeight: 1.32,
  },
  calendarRowAlt: {
    backgroundColor: soft,
  },
  calendarCell: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  calendarDate: {
    width: "15%",
  },
  calendarContent: {
    width: "31%",
  },
  calendarFormat: {
    width: "13%",
  },
  calendarPlatform: {
    width: "18%",
  },
  calendarObjective: {
    width: "23%",
  },
  sheetGrid: {
    flexDirection: "row",
    gap: 18,
  },
  sheetSingle: {
    flexDirection: "column",
  },
  contentSheet: {
    minHeight: 0,
    padding: 20,
    border: "1.4 solid #111111",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  contentSheetCompact: {
    width: "49%",
    minHeight: 382,
    padding: 16,
    border: "1.4 solid #111111",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  sheetBodyColumns: {
    flexDirection: "row",
    gap: 20,
    alignItems: "flex-start",
  },
  sheetBodyColumn: {
    width: "49%",
  },
  sheetTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  sheetNumber: {
    color: acid,
    fontSize: 24,
    lineHeight: 1,
    fontFamily: "Helvetica-Bold",
  },
  sheetDate: {
    marginTop: 4,
    color: muted,
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
  },
  sheetTags: {
    alignItems: "flex-end",
    gap: 6,
  },
  sheetTag: {
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 10,
    border: "1 solid #111111",
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
  },
  sheetTagDark: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 11,
    backgroundColor: ink,
    color: "#FFFFFF",
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
  },
  sheetTitle: {
    marginTop: 14,
    marginBottom: 12,
    fontSize: 20,
    lineHeight: 1.12,
    fontFamily: "Helvetica-Bold",
  },
  sheetTitleCompact: {
    marginTop: 14,
    marginBottom: 12,
    fontSize: 16,
    lineHeight: 1.15,
    fontFamily: "Helvetica-Bold",
  },
  infoBlock: {
    marginTop: 11,
  },
  captionBlock: {
    marginTop: 18,
    paddingTop: 14,
    borderTop: `1 solid ${line}`,
  },
  captionBlockCompactTop: {
    marginTop: 11,
  },
  blockLabel: {
    color: muted,
    fontSize: 8.2,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.6,
    marginBottom: 7,
  },
  bodyText: {
    fontSize: 10.3,
    lineHeight: 1.34,
  },
  bodyTextMuted: {
    color: muted,
    fontSize: 10.3,
    lineHeight: 1.34,
  },
  captionText: {
    fontSize: 10.4,
    lineHeight: 1.36,
  },
  markerBlock: {
    marginTop: 7,
    paddingTop: 7,
    borderTop: `1 solid ${line}`,
  },
  markerLabel: {
    color: ink,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.2,
    marginBottom: 5,
  },
  hashtagBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 9,
    backgroundColor: soft,
  },
  hashtagLabel: {
    color: muted,
    fontSize: 7.8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.3,
    marginBottom: 5,
  },
  hashtagText: {
    fontSize: 10,
    lineHeight: 1.35,
  },
  approvalBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 9,
    backgroundColor: "#FAFAF7",
    border: `1 solid ${line}`,
  },
  approvalLabel: {
    color: muted,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  approvalLine: {
    height: 1,
    backgroundColor: line,
    marginTop: 12,
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
    marginTop: 58,
    flexDirection: "row",
    gap: 34,
  },
  finalCopy: {
    flex: 1,
  },
  finalEyebrow: {
    color: acid,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2.8,
    marginBottom: 18,
  },
  finalTitle: {
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
    padding: 22,
    borderRadius: 12,
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
  metaLabelDark: {
    color: "#9E9E99",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.4,
    marginBottom: 5,
  },
  metaValueDark: {
    color: "#FFFFFF",
    fontSize: 11,
    lineHeight: 1.25,
    fontFamily: "Helvetica-Bold",
  },
  finalBrandBlock: {
    marginTop: 70,
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
