import type { Invest2030Request } from "./types";

export type Invest2030TaskSummaryFields = {
  campaignName: string;
  actionType: string;
  requestedBy: string;
  periodLabel: string;
  mainGoal: string;
  targetAudience: string;
  mainCta: string;
  mainLink: string | null;
  mainMessage: string;
  mandatoryInfo: string;
  informationStatus: string;
  notes: string | null;
};

export function buildInvest2030TaskSummary({
  campaignName,
  actionType,
  requestedBy,
  periodLabel,
  mainGoal,
  targetAudience,
  mainCta,
  mainLink,
  mainMessage,
  mandatoryInfo,
  informationStatus,
  notes,
}: Invest2030TaskSummaryFields) {
  return `Pedido recebido via Form Invest2030

Nome da campanha:
${campaignName}

Tipo de ação:
${actionType}

Quem está a pedir:
${requestedBy}

Período:
${periodLabel}

Objetivo principal:
${mainGoal}

Público-alvo / segmentação:
${targetAudience}

Texto do botão principal:
${mainCta}

Link do botão principal:
${mainLink ?? "Sem link definido"}

Tema / mensagem principal:
${mainMessage}

Informação obrigatória a mencionar:
${mandatoryInfo}

Estado da informação:
${informationStatus}

Observações:
${notes ?? "Sem observações"}`;
}

function normalizeNoteBlock(value: string) {
  return value.replace(/\r\n/g, "\n").trim();
}

export function visibleInvest2030InternalNotes(request: Invest2030Request) {
  const taskNotes = normalizeNoteBlock(request.tasks?.notes ?? "");
  if (!taskNotes) return null;

  const summary = normalizeNoteBlock(
    buildInvest2030TaskSummary({
      campaignName: request.campaign_name,
      actionType: request.action_type,
      requestedBy: request.requested_by,
      periodLabel: request.period_label,
      mainGoal: request.main_goal,
      targetAudience: request.target_audience,
      mainCta: request.main_cta,
      mainLink: request.main_link,
      mainMessage: request.main_message,
      mandatoryInfo: request.mandatory_info,
      informationStatus: request.information_status,
      notes: request.notes,
    }),
  );
  const withoutExactSummary = normalizeNoteBlock(taskNotes.replace(summary, ""));
  if (withoutExactSummary !== taskNotes) return withoutExactSummary || null;

  if (!taskNotes.startsWith("Pedido recebido via Form Invest2030")) {
    return taskNotes;
  }

  const lastAutomaticLabel = "\nObservações:\n";
  const observationsIndex = taskNotes.lastIndexOf(lastAutomaticLabel);
  if (observationsIndex === -1) return null;

  const observations = normalizeNoteBlock(request.notes ?? "Sem observações");
  const afterObservations = taskNotes.slice(observationsIndex + lastAutomaticLabel.length);
  if (observations && afterObservations.startsWith(observations)) {
    const remaining = normalizeNoteBlock(afterObservations.slice(observations.length));
    return remaining || null;
  }

  return null;
}
