import type { OperationalProfileKey } from "./operational-profiles";

export const clientTypes = ["internal", "external", "grupo_investe", "partner"] as const;
export const clientStatuses = ["setup", "active", "paused", "archived"] as const;
export const clientColorKeys = [
  "slate",
  "blue",
  "cyan",
  "green",
  "emerald",
  "lime",
  "yellow",
  "orange",
  "red",
  "pink",
  "purple",
  "violet",
] as const;
export const serviceTypes = [
  "Gestão de Redes Sociais",
  "Marketing de Performance",
  "Website / Landing Page",
  "Branding",
  "Newsletter / Email Marketing",
  "Design Editorial / Apresentações",
  "Consultoria / Automação",
  "Evento / Cobertura",
  "Outro",
] as const;
export const contentStatuses = [
  "idea",
  "todo",
  "in_progress",
  "ready_to_publish",
  "published",
  "archived",
] as const;
export const taskStatuses = ["todo", "in_progress", "done", "archived"] as const;
export const taskTypes = [
  "design",
  "copy",
  "publishing",
  "reporting",
  "operations",
  "other",
] as const;
export const taskPriorities = ["low", "normal", "urgent"] as const;
export const invest2030ActionTypes = [
  "Webinar",
  "Newsletter",
  "Reenvio",
  "Follow-up",
  "Campanha para reuniões",
  "Diretrizes de conteúdo",
  "Outro",
] as const;
export const invest2030Requesters = ["André Loureiro", "Ricardo Carvalho", "Outra"] as const;
export const invest2030PeriodTypes = [
  "Dia específico",
  "Semana",
  "Mês",
  "Período personalizado",
] as const;
export const invest2030MainGoals = [
  "Gerar inscrições no webinar",
  "Gerar reuniões",
  "Divulgar incentivo",
  "Reativar leads",
  "Fazer follow-up",
  "Informar base de dados",
  "Orientar criação de conteúdo",
  "Outro",
] as const;
export const invest2030MainCtas = [
  "Inscrever no webinar",
  "Marcar reunião",
  "Pedir avaliação de enquadramento",
  "Ver página",
  "Responder ao email",
  "Outro",
] as const;
export const invest2030InformationStatuses = [
  "Informação completa",
  "Falta link",
  "Falta validar dados do incentivo",
  "Falta definir melhor a segmentação",
  "Ainda é só uma ideia",
] as const;

export type ClientType = (typeof clientTypes)[number];
export type ClientStatus = (typeof clientStatuses)[number];
export type ClientColorKey = (typeof clientColorKeys)[number];
export type ServiceType = (typeof serviceTypes)[number];
export type ContentStatus = (typeof contentStatuses)[number];
export type TaskStatus = (typeof taskStatuses)[number];
export type TaskType = (typeof taskTypes)[number];
export type TaskPriority = (typeof taskPriorities)[number];
export type Invest2030ActionType = (typeof invest2030ActionTypes)[number];
export type Invest2030Requester = (typeof invest2030Requesters)[number];
export type Invest2030PeriodType = (typeof invest2030PeriodTypes)[number];
export type Invest2030MainGoal = (typeof invest2030MainGoals)[number];
export type Invest2030MainCta = (typeof invest2030MainCtas)[number];
export type Invest2030InformationStatus = (typeof invest2030InformationStatuses)[number];

export type SetupChecklistItem = {
  label: string;
  done: boolean;
};

export type Client = {
  id: string;
  name: string;
  client_code: string | null;
  short_name: string | null;
  display_order: number | null;
  logo_url: string | null;
  color_key: ClientColorKey | null;
  type: ClientType;
  status: ClientStatus;
  owner_name: string | null;
  service_type: ServiceType | null;
  service_types: string[] | null;
  monthly_value: number | null;
  contract_value: string | null;
  start_date: string | null;
  contract_duration: string | null;
  platforms: string[] | null;
  website_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  linkedin_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  metricool_url: string | null;
  crm_newsletter_url: string | null;
  platform_other_url: string | null;
  drive_url: string | null;
  figma_url: string | null;
  meta_url: string | null;
  google_drive_url: string | null;
  onedrive_url: string | null;
  figma_project_url: string | null;
  content_calendar_url: string | null;
  final_deliverables_url: string | null;
  proposal_url: string | null;
  contract_url: string | null;
  adjudication_url: string | null;
  budget_url: string | null;
  other_documents_url: string | null;
  brand_assets_url: string | null;
  setup_checklist: SetupChecklistItem[] | null;
  reporting_url: string | null;
  initial_briefing_url: string | null;
  conditions_url: string | null;
  linkedin_campaign_manager_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type TeamMember = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  active: boolean;
  display_order: number | null;
  created_at: string;
  updated_at: string;
};

export type CompanyContact = {
  id: string;
  label: string;
  email: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

export type QuickTodoView = "marketing" | "design";
export type QuickTodoItemType = "todo" | "reminder";

export type QuickTodo = {
  id: string;
  view: QuickTodoView;
  profile_key: OperationalProfileKey;
  text: string;
  item_type: QuickTodoItemType;
  done: boolean;
  created_at: string;
  updated_at: string;
};

export type QuickNote = {
  id: string;
  view: QuickTodoView;
  profile_key: OperationalProfileKey;
  text: string;
  created_at: string;
  updated_at: string;
};

export type ContentItem = {
  id: string;
  client_id: string;
  month: string;
  publish_date: string | null;
  publish_time: string | null;
  design_due_date: string | null;
  copy_due_date: string | null;
  approval_due_date: string | null;
  publishing_due_date: string | null;
  design_status: string | null;
  copy_status: string | null;
  approval_status: string | null;
  publishing_status: string | null;
  needs_design: boolean;
  needs_copy: boolean;
  needs_client_approval: boolean;
  platform: string;
  format: string | null;
  title: string;
  creative_brief: string | null;
  copy_text: string | null;
  status: ContentStatus;
  assignee_name: string | null;
  media_url: string | null;
  brief_url: string | null;
  media_folder_url: string | null;
  figma_url: string | null;
  export_url: string | null;
  delivery_url: string | null;
  inspiration_url: string | null;
  published_url: string | null;
  internal_review_notes: string | null;
  client_feedback: string | null;
  is_blocked: boolean;
  blocker_reason: string | null;
  recording_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  clients?: Pick<Client, "id" | "name" | "client_code" | "short_name" | "display_order" | "logo_url" | "color_key"> | null;
};

export type ContentComment = {
  id: string;
  content_id: string;
  author_profile_key: string;
  author_name: string;
  body: string;
  mentioned_profile_keys: string[];
  created_at: string;
  updated_at: string;
};

export type ContentMention = ContentComment & {
  content_items?: Pick<ContentItem, "id" | "title" | "client_id"> & {
    clients?: Pick<Client, "id" | "name" | "client_code" | "short_name" | "display_order" | "logo_url" | "color_key"> | null;
  };
};

export type Task = {
  id: string;
  client_id: string | null;
  title: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_name: string | null;
  due_date: string | null;
  related_url: string | null;
  is_blocked: boolean;
  blocker_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  clients?: Pick<Client, "id" | "name" | "client_code" | "short_name" | "display_order" | "logo_url" | "color_key"> | null;
};

export type Invest2030Request = {
  id: string;
  task_id: string | null;
  campaign_name: string;
  action_type: Invest2030ActionType | string;
  requested_by: Invest2030Requester | string;
  period_type: Invest2030PeriodType | string;
  period_start: string;
  period_end: string;
  period_label: string;
  main_goal: Invest2030MainGoal | string;
  target_audience: string;
  main_cta: Invest2030MainCta | string;
  main_link: string;
  main_message: string;
  mandatory_info: string;
  information_status: Invest2030InformationStatus | string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  tasks?: Pick<Task, "id" | "title" | "status" | "priority" | "is_blocked" | "due_date"> | null;
};

export type Option = {
  value: string;
  label: string;
};
