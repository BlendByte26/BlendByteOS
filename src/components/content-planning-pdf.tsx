import {
  Document,
  Image,
  Page,
  StyleSheet,
  Svg,
  Text,
  View,
  Circle,
  Rect,
} from "@react-pdf/renderer";
import type { ContentPlanningExportData, ContentPlanningExportItem } from "@/lib/content-planning-export";

const pageSize = "A4";
const acid = "#A8FF3E";
const ink = "#080808";
const paper = "#F7F7F3";
const muted = "#6B6B67";

function uppercase(value: string) {
  return value.toLocaleUpperCase("pt-PT");
}

function formatDateParts(value: string | null) {
  if (!value) return { day: "--", month: "Sem data" };
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return { day: value, month: "" };

  const label = new Intl.DateTimeFormat("pt-PT", { month: "long" }).format(
    new Date(Number(year), Number(month) - 1, 1),
  );

  return { day, month: uppercase(label) };
}

function formatPlatformList(platforms: string[]) {
  return platforms.length ? platforms.join(" · ") : "Sem plataforma";
}

function sectionText(value: string) {
  return value.split("\n").map((line, index) => (
    <Text key={`${line}-${index}`} style={index > 0 ? styles.paragraphLine : undefined}>
      {line}
    </Text>
  ));
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
        <Text style={styles.coverEyebrow}>Planeamento textual</Text>
        <Text style={styles.coverTitle}>Planeamento de{"\n"}Conteúdos</Text>
        <View style={styles.coverPills}>
          <View style={styles.monthPill}>
            <Text>{uppercase(data.monthLabel)}</Text>
          </View>
          <View style={styles.platformPill}>
            <Text>{uppercase(formatPlatformList(data.platforms))}</Text>
          </View>
        </View>
      </View>

      <View style={styles.coverBottomLeft}>
        <Text>Preparado pela BlendByte</Text>
        <Text>Documento textual para validação de planeamento</Text>
        <Text>Os criativos visuais são apresentados separadamente</Text>
      </View>

      <View style={styles.coverCount}>
        <Text style={styles.coverCountNumber}>{data.total}</Text>
        <Text style={styles.coverCountLabel}>CONTEUDOS PREVISTOS</Text>
      </View>
    </Page>
  );
}

function ContentCard({ item }: { item: ContentPlanningExportItem }) {
  const date = formatDateParts(item.publishDate);
  const cardStyles = item.isLong ? [styles.contentCard, styles.contentCardWide] : styles.contentCard;
  const hasCopy = Boolean(item.copy);
  const hasDescription = Boolean(item.description);

  return (
    <View style={cardStyles} wrap={false}>
      <View style={styles.cardStripe} />
      <View style={styles.cardTop}>
        <View style={styles.cardDateGroup}>
          <Text style={styles.cardNumber}>{String(item.sequence).padStart(2, "0")}</Text>
          <View>
            <Text style={styles.cardDay}>{date.day}</Text>
            <Text style={styles.cardMonth}>{date.month}</Text>
            {item.publishTime ? <Text style={styles.cardTime}>{item.publishTime}</Text> : null}
          </View>
        </View>
        <View style={styles.cardTags}>
          {item.format ? (
            <View style={styles.formatTag}>
              <Text>{uppercase(item.format)}</Text>
            </View>
          ) : null}
          <View style={styles.platformTag}>
            <Text>{uppercase(item.platform)}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.cardTitle}>{item.title}</Text>

      {hasCopy || hasDescription ? (
        <View style={styles.cardBody}>
          {hasCopy ? (
            <View style={hasDescription ? styles.cardColumn : styles.cardColumnFull}>
              <Text style={styles.sectionLabel}>TEXTO DO CRIATIVO</Text>
              <Text style={styles.sectionBody}>{sectionText(item.copy!)}</Text>
            </View>
          ) : null}
          {hasCopy && hasDescription ? <View style={styles.columnDivider} /> : null}
          {hasDescription ? (
            <View style={hasCopy ? styles.cardColumn : styles.cardColumnFull}>
              <Text style={styles.sectionLabel}>DESCRIÇÃO DA PUBLICAÇÃO</Text>
              <Text style={styles.sectionBody}>{sectionText(item.description!)}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {item.objective ? (
        <View style={styles.objective}>
          <Text>Objetivo: {item.objective}</Text>
        </View>
      ) : null}
    </View>
  );
}

function ContentPages({ data }: { data: ContentPlanningExportData }) {
  return (
    <Page size={pageSize} orientation="landscape" style={styles.contentPage} wrap>
      <View style={styles.contentHeader} fixed>
        <View>
          <Text style={styles.contentEyebrow}>PLANEAMENTO TEXTUAL</Text>
          <Text style={styles.contentHeading}>Conteúdos{"\n"}previstos</Text>
        </View>
        <View style={styles.contentHeaderRight}>
          <Text style={styles.contentClient}>{uppercase(data.client.name)}</Text>
          <Text style={styles.contentSubhead}>
            {data.monthLabel} · {data.total} conteúdos
          </Text>
        </View>
      </View>
      <View style={styles.headerLine} fixed />

      <View style={styles.cardsGrid}>
        {data.items.map((item) => (
          <ContentCard key={item.id} item={item} />
        ))}
      </View>

      <View style={styles.contentFooter} fixed>
        <Text>
          <Text style={styles.footerBrand}>BlendByte</Text> · Planeamento de Conteúdos
        </Text>
        <Text render={({ pageNumber, totalPages }) => `${String(pageNumber).padStart(2, "0")} / ${String(totalPages).padStart(2, "0")}`} />
      </View>
    </Page>
  );
}

function FinalPage({ data }: { data: ContentPlanningExportData }) {
  return (
    <Page size={pageSize} orientation="landscape" style={styles.finalPage}>
      <View style={styles.finalTop}>
        <Text style={styles.coverBrand}>BlendByte</Text>
        <Text style={styles.finalClient}>{uppercase(data.client.name)}</Text>
      </View>

      <View style={styles.finalMain}>
        <View style={styles.finalCopy}>
          <Text style={styles.finalEyebrow}>VALIDACAO DO PLANEAMENTO</Text>
          <Text style={styles.finalTitle}>Próximo passo:{"\n"}aprovar ou comentar.</Text>
          <Text style={styles.finalText}>
            Este documento apresenta o planeamento previsto para {data.monthLabel}. Comentários,
            alterações ou aprovação devem ser enviados por resposta ao email.
          </Text>

          <View style={styles.preparerGrid}>
            <View style={styles.preparerBox}>
              <View style={styles.preparerRule} />
              <Text style={styles.preparerLabel}>PREPARADO POR</Text>
              <Text style={styles.preparerValue}>{data.preparedByName}</Text>
            </View>
            <View style={styles.preparerBox}>
              <View style={styles.preparerRule} />
              <Text style={styles.preparerLabel}>EMAIL</Text>
              <Text style={styles.preparerValue}>{data.preparedByEmail}</Text>
            </View>
            <View style={styles.preparerBox}>
              <View style={styles.preparerRule} />
              <Text style={styles.preparerLabel}>WEBSITE</Text>
              <Text style={styles.preparerValue}>{data.website}</Text>
            </View>
          </View>
        </View>

        <View style={styles.finalSummary}>
          <Text style={styles.finalSummaryNumber}>{data.total}</Text>
          <Text style={styles.finalSummaryLabel}>conteúdos{"\n"}previstos</Text>
          <View style={styles.summaryLine} />
          <Text style={styles.finalSummaryText}>{data.monthLabel}</Text>
          <Text style={styles.finalSummaryText}>{formatPlatformList(data.platforms)}</Text>
          <View style={styles.summaryLineBottom} />
          <Text style={styles.finalPrepared}>Preparado pela{"\n"}BlendByte</Text>
        </View>
      </View>
    </Page>
  );
}

export function ContentPlanningPdfDocument({ data }: { data: ContentPlanningExportData }) {
  return (
    <Document
      title={`Planeamento de Conteúdos - ${data.client.name} - ${data.monthLabel}`}
      author="BlendByte"
      subject="Planeamento de Conteúdos"
      creator="BlendByteOS"
      producer="BlendByteOS"
    >
      <CoverPage data={data} />
      <ContentPages data={data} />
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
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
  },
  coverClientHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  clientLogo: {
    width: 42,
    height: 42,
    objectFit: "contain",
  },
  clientInitials: {
    minWidth: 42,
    height: 42,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    border: "1.5 solid #FFFFFF",
    borderRadius: 8,
  },
  coverClientName: {
    maxWidth: 250,
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
  },
  coverMain: {
    marginTop: 76,
  },
  coverEyebrow: {
    color: acid,
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 3,
    marginBottom: 26,
  },
  coverTitle: {
    fontSize: 50,
    lineHeight: 0.9,
    fontFamily: "Helvetica-Bold",
    marginBottom: 44,
  },
  coverPills: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  monthPill: {
    minWidth: 132,
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderRadius: 28,
    backgroundColor: acid,
    color: ink,
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  platformPill: {
    minWidth: 250,
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: 28,
    border: "1.4 solid #FFFFFF",
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  coverBottomLeft: {
    position: "absolute",
    left: 48,
    bottom: 48,
    color: "#A7A7A4",
    fontSize: 9,
    lineHeight: 1.35,
  },
  coverCount: {
    position: "absolute",
    right: 48,
    bottom: 50,
    alignItems: "flex-end",
  },
  coverCountNumber: {
    color: acid,
    fontSize: 38,
    lineHeight: 0.9,
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
    bottom: 96,
    width: 220,
    height: 96,
    transform: "rotate(-8deg)",
  },
  contentPage: {
    paddingTop: 106,
    paddingHorizontal: 36,
    paddingBottom: 44,
    backgroundColor: paper,
    color: ink,
    fontFamily: "Helvetica",
  },
  contentHeader: {
    position: "absolute",
    left: 36,
    right: 36,
    top: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  contentEyebrow: {
    color: muted,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 3,
    marginBottom: 6,
  },
  contentHeading: {
    fontSize: 19,
    lineHeight: 0.92,
    fontFamily: "Helvetica-Bold",
  },
  contentHeaderRight: {
    alignItems: "flex-end",
    marginTop: 18,
  },
  contentClient: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
  },
  contentSubhead: {
    marginTop: 4,
    color: muted,
    fontSize: 9,
  },
  headerLine: {
    position: "absolute",
    left: 36,
    right: 36,
    top: 84,
    height: 1.5,
    backgroundColor: ink,
  },
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
  },
  contentCard: {
    position: "relative",
    width: "49%",
    minHeight: 154,
    marginBottom: 14,
    paddingTop: 20,
    paddingHorizontal: 15,
    paddingBottom: 14,
    border: "1.35 solid #111111",
    borderRadius: 9,
    backgroundColor: paper,
  },
  contentCardWide: {
    width: "100%",
  },
  cardStripe: {
    position: "absolute",
    top: -1,
    left: 24,
    width: 84,
    height: 4,
    backgroundColor: acid,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardDateGroup: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  cardNumber: {
    color: acid,
    fontSize: 17,
    lineHeight: 1,
    fontFamily: "Helvetica-Bold",
  },
  cardDay: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },
  cardMonth: {
    marginTop: 2,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },
  cardTime: {
    marginTop: 3,
    color: muted,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
  },
  cardTags: {
    alignItems: "flex-end",
    gap: 5,
  },
  formatTag: {
    minWidth: 48,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 9,
    border: "1 solid #111111",
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  platformTag: {
    minWidth: 72,
    maxWidth: 148,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: ink,
    color: "#FFFFFF",
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  cardTitle: {
    marginTop: 12,
    marginBottom: 16,
    fontSize: 15,
    lineHeight: 1.05,
    fontFamily: "Helvetica-Bold",
  },
  cardBody: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  cardColumn: {
    width: "48%",
  },
  cardColumnFull: {
    width: "100%",
  },
  columnDivider: {
    width: 1,
    marginHorizontal: 12,
    backgroundColor: "#D5D5D0",
  },
  sectionLabel: {
    color: muted,
    fontSize: 6.7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.6,
    marginBottom: 6,
  },
  sectionBody: {
    fontSize: 8.2,
    lineHeight: 1.35,
  },
  paragraphLine: {
    marginTop: 3,
  },
  objective: {
    marginTop: 12,
    paddingTop: 7,
    borderTop: "1 solid #D8D8D2",
    color: muted,
    fontSize: 7.5,
  },
  contentFooter: {
    position: "absolute",
    left: 36,
    right: 36,
    bottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    color: muted,
    fontSize: 7.5,
  },
  footerBrand: {
    color: ink,
    fontFamily: "Helvetica-Bold",
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
    letterSpacing: 1,
  },
  finalMain: {
    marginTop: 70,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  finalCopy: {
    width: "68%",
  },
  finalEyebrow: {
    color: acid,
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 3,
    marginBottom: 22,
  },
  finalTitle: {
    fontSize: 40,
    lineHeight: 0.94,
    fontFamily: "Helvetica-Bold",
    marginBottom: 28,
  },
  finalText: {
    width: 560,
    color: "#D8D8D4",
    fontSize: 15,
    lineHeight: 1.35,
  },
  preparerGrid: {
    marginTop: 34,
    flexDirection: "row",
    gap: 10,
  },
  preparerBox: {
    width: "31%",
  },
  preparerRule: {
    height: 1,
    backgroundColor: "#666663",
    marginBottom: 12,
  },
  preparerLabel: {
    color: "#8B8B87",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
    marginBottom: 7,
  },
  preparerValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },
  finalSummary: {
    width: 178,
    minHeight: 372,
    padding: 24,
    borderRadius: 10,
    backgroundColor: acid,
    color: ink,
  },
  finalSummaryNumber: {
    fontSize: 42,
    lineHeight: 0.95,
  },
  finalSummaryLabel: {
    fontSize: 9,
    lineHeight: 1.15,
  },
  summaryLine: {
    height: 1.5,
    backgroundColor: ink,
    marginTop: 54,
    marginBottom: 52,
  },
  summaryLineBottom: {
    height: 1.5,
    backgroundColor: ink,
    marginTop: 70,
    marginBottom: 50,
  },
  finalSummaryText: {
    fontSize: 9,
    marginBottom: 3,
  },
  finalPrepared: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.2,
  },
});
