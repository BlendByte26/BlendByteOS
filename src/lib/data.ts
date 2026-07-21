import { getSupabase, isSupabaseConfigured, isSupabaseSchemaError } from "./supabase";
import { compareClients } from "./client-display";
import { contentMonthRange, isPublishDateInMonth, isValidContentMonth } from "./content-month";
import { getClientMissingSetup } from "./onboarding";
import {
  INVEST2030_NEWSLETTER_TEMPLATE_VERSION,
  INVEST2030_WEBINAR_TEMPLATE_VERSION,
  type Invest2030CampaignVariant,
} from "./invest2030-newsletter";
import { sampleClients, sampleContent, sampleTasks } from "./sample-data";
import type { OperationalProfileKey } from "./operational-profiles";
import type {
  Client,
  CompanyContact,
  ContentComment,
  ContentMention,
  ContentItem,
  ContentStatus,
  Invest2030Newsletter,
  Invest2030Request,
  QuickNote,
  QuickTodo,
  QuickTodoView,
  Task,
  TaskComment,
  TaskMention,
  TaskPriority,
  TaskStatus,
  TeamMember,
  UsefulLink,
  VacationBalance,
  VacationRequest,
  CustomHoliday,
} from "./types";

export type ContentFilters = {
  assignee?: string;
  client?: string;
  month?: string;
  year?: string;
  status?: string | string[];
  platform?: string;
  publishUntil?: string;
};

export type TaskFilters = {
  assignee?: string;
  client?: string;
  priority?: string;
  status?: string;
  due?: string;
};

export type Invest2030RequestFilters = {
  search?: string;
  actionType?: string;
  requestedBy?: string;
  mainGoal?: string;
  informationStatus?: string;
  month?: string;
};

const sampleTeamMembers: TeamMember[] = [
  {
    id: "sample-guilherme",
    name: "Guilherme",
    email: null,
    phone: null,
    role: "Direção / Operações",
    links: [],
    active: true,
    display_order: 1,
    created_at: "",
    updated_at: "",
  },
  {
    id: "sample-carlota",
    name: "Carlota",
    email: null,
    phone: null,
    role: "Design",
    links: [],
    active: true,
    display_order: 2,
    created_at: "",
    updated_at: "",
  },
  {
    id: "sample-carolina",
    name: "Carolina",
    email: null,
    phone: null,
    role: "Design",
    links: [],
    active: true,
    display_order: 3,
    created_at: "",
    updated_at: "",
  },
  {
    id: "sample-design",
    name: "Estagiário Design",
    email: null,
    phone: null,
    role: "Design",
    links: [],
    active: true,
    display_order: 4,
    created_at: "",
    updated_at: "",
  },
  {
    id: "sample-marketing",
    name: "Sofia",
    email: null,
    phone: null,
    role: "Marketing / Client Ops",
    links: [],
    active: true,
    display_order: 5,
    created_at: "",
    updated_at: "",
  },
];

const sampleQuickTodos: QuickTodo[] = [
  {
    id: "sample-marketing-todo",
    view: "marketing",
    profile_key: "sofia",
    text: "Confirmar prioridades da semana",
    item_type: "todo",
    done: false,
    created_at: "",
    updated_at: "",
  },
  {
    id: "sample-design-todo",
    view: "design",
    profile_key: "carlota",
    text: "Validar criativos em aberto",
    item_type: "todo",
    done: false,
    created_at: "",
    updated_at: "",
  },
];

const sampleQuickNotes: QuickNote[] = [];
const sampleContentComments: ContentComment[] = [];
const sampleTaskComments: TaskComment[] = [];
const sampleCompanyContacts: CompanyContact[] = [];
const sampleUsefulLinks: UsefulLink[] = [];
const sampleInvest2030Requests: Invest2030Request[] = [];
const sampleInvest2030Newsletters: Invest2030Newsletter[] = [];

function getToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12));
}

function toDate(value: string | null) {
  return value ? new Date(`${value}T12:00:00.000Z`) : null;
}

function handleSupabaseReadError<T>(error: unknown, fallback: T, context: string) {
  if (isSupabaseSchemaError(error)) {
    console.warn(`Schema Supabase incompleto ao carregar ${context}`, error);
    return fallback;
  }

  console.error(`Erro Supabase ao carregar ${context}`, error);
  return fallback;
}

export async function getClients() {
  const supabase = await getSupabase();

  if (!supabase) {
    return sampleClients.sort(compareClients);
  }

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("client_code", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (error) {
    return handleSupabaseReadError(error, sampleClients.sort(compareClients), "clientes");
  }

  return data;
}

export async function getClient(id: string) {
  const supabase = await getSupabase();

  if (!supabase) {
    const clients = await getClients();
    return clients.find((client) => client.id === id) ?? null;
  }

  const { data, error } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();

  if (error) {
    return handleSupabaseReadError(error, null, "cliente");
  }

  return data as Client | null;
}

export async function getTeamMembers() {
  const supabase = await getSupabase();

  if (!supabase) {
    return sampleTeamMembers;
  }

  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("active", true)
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (error) {
    return handleSupabaseReadError(error, sampleTeamMembers, "equipa");
  }

  return data as TeamMember[];
}

export async function getCompanyContacts() {
  const supabase = await getSupabase();

  if (!supabase) {
    return sampleCompanyContacts;
  }

  const { data, error } = await supabase
    .from("company_contacts")
    .select("*")
    .order("label", { ascending: true });

  if (error) {
    return handleSupabaseReadError(error, sampleCompanyContacts, "contactos gerais");
  }

  return data as CompanyContact[];
}

export async function getUsefulLinks() {
  const supabase = await getSupabase();

  if (!supabase) {
    return sampleUsefulLinks;
  }

  const { data, error } = await supabase
    .from("useful_links")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return handleSupabaseReadError(error, sampleUsefulLinks, "links úteis");
  }

  return data as UsefulLink[];
}

export async function getTeamMember(id: string) {
  const supabase = await getSupabase();

  if (!supabase) {
    return sampleTeamMembers.find((member) => member.id === id) ?? null;
  }

  const { data, error } = await supabase.from("team_members").select("*").eq("id", id).maybeSingle();

  if (error) {
    return handleSupabaseReadError(error, null, "membro da equipa");
  }

  return data as TeamMember | null;
}

export async function getVacationData(year: number, profileKey: OperationalProfileKey) {
  const supabase = await getSupabase();
  if (!supabase) return { balances: [] as VacationBalance[], requests: [] as VacationRequest[], holidays: [] as CustomHoliday[] };
  const [balancesResult, requestsResult, holidaysResult] = await Promise.all([
    supabase.from("vacation_balances").select("*").eq("year", year),
    supabase.from("vacation_requests").select("*").gte("start_date", `${year}-01-01`).lte("start_date", `${year}-12-31`).order("start_date"),
    supabase.from("custom_holidays").select("*").gte("holiday_date", `${year}-01-01`).lte("holiday_date", `${year}-12-31`).order("holiday_date"),
  ]);
  const error = balancesResult.error ?? requestsResult.error ?? holidaysResult.error;
  if (error) {
    if (isSupabaseSchemaError(error)) return { balances: [], requests: [], holidays: [] };
    throw new Error(error.message);
  }
  const requests = requestsResult.data as VacationRequest[];
  if (profileKey === "guilherme") return { balances: balancesResult.data as VacationBalance[], requests, holidays: holidaysResult.data as CustomHoliday[] };
  const member = (await getTeamMembers()).find((item) => item.name.toLocaleLowerCase("pt") === profileKey);
  return {
    balances: (balancesResult.data as VacationBalance[]).filter((item) => item.team_member_id === member?.id).map((item) => ({ ...item, admin_notes: null })),
    requests: requests.filter((item) => item.team_member_id === member?.id),
    holidays: holidaysResult.data as CustomHoliday[],
  };
}

export async function getQuickTodos(view: QuickTodoView, profileKey: OperationalProfileKey) {
  const supabase = await getSupabase();

  if (!supabase) {
    return sampleQuickTodos.filter((todo) => todo.view === view && todo.profile_key === profileKey);
  }

  const { data, error } = await supabase
    .from("quick_todos")
    .select("*")
    .eq("view", view)
    .eq("profile_key", profileKey)
    .order("done", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    return handleSupabaseReadError(
      error,
      sampleQuickTodos.filter((todo) => todo.view === view && todo.profile_key === profileKey),
      "to-dos rápidos",
    );
  }

  return data as QuickTodo[];
}

export async function getQuickNotes(view: QuickTodoView, profileKey: OperationalProfileKey) {
  const supabase = await getSupabase();

  if (!supabase) {
    return sampleQuickNotes.filter((note) => note.view === view && note.profile_key === profileKey);
  }

  const { data, error } = await supabase
    .from("quick_notes")
    .select("*")
    .eq("view", view)
    .eq("profile_key", profileKey)
    .order("created_at", { ascending: false });

  if (error) {
    return handleSupabaseReadError(
      error,
      sampleQuickNotes.filter((note) => note.view === view && note.profile_key === profileKey),
      "notas rápidas",
    );
  }

  return data as QuickNote[];
}

export async function getPersonalQuickTodos(profileKey: OperationalProfileKey) {
  const [marketing, design] = await Promise.all([
    getQuickTodos("marketing", profileKey),
    getQuickTodos("design", profileKey),
  ]);

  return Array.from(new Map([...marketing, ...design].map((todo) => [todo.id, todo])).values()).sort(
    (first, second) => {
      if (first.done !== second.done) return Number(first.done) - Number(second.done);
      return second.created_at.localeCompare(first.created_at);
    },
  );
}

export async function getPersonalQuickNotes(profileKey: OperationalProfileKey) {
  const [marketing, design] = await Promise.all([
    getQuickNotes("marketing", profileKey),
    getQuickNotes("design", profileKey),
  ]);

  return Array.from(new Map([...marketing, ...design].map((note) => [note.id, note])).values()).sort(
    (first, second) => second.updated_at.localeCompare(first.updated_at),
  );
}

export async function getContentItems(filters: ContentFilters = {}) {
  const supabase = await getSupabase();
  const filteredMonth = isValidContentMonth(filters.month) ? filters.month : "";
  const filteredYear = !filteredMonth && filters.year && /^\d{4}$/.test(filters.year) ? filters.year : "";
  const filteredStatuses = (Array.isArray(filters.status) ? filters.status : [filters.status])
    .filter(Boolean) as ContentStatus[];

  if (!supabase) {
    return sampleContent.filter((item) => {
      return (
        (!filters.client || item.client_id === filters.client) &&
        (!filters.assignee ||
          item.assignee_name?.toLowerCase().includes(filters.assignee.toLowerCase())) &&
        (!filteredMonth || isPublishDateInMonth(item.publish_date, filteredMonth)) &&
        (!filteredYear || item.publish_date?.startsWith(`${filteredYear}-`)) &&
        (!filteredStatuses.length || filteredStatuses.includes(item.status)) &&
        (!filters.platform || item.platform === filters.platform) &&
        (!filters.publishUntil ||
          (Boolean(item.publish_date) && item.publish_date! <= filters.publishUntil))
      );
    });
  }

  let query = supabase
    .from("content_items")
    .select("*, clients(*)")
    .order("publish_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (filters.client) query = query.eq("client_id", filters.client);
  if (filters.assignee) query = query.ilike("assignee_name", `%${filters.assignee}%`);
  if (filteredMonth) {
    const range = contentMonthRange(filteredMonth);
    query = query.gte("publish_date", range.start).lt("publish_date", range.end);
  } else if (filteredYear) {
    query = query
      .gte("publish_date", `${filteredYear}-01-01`)
      .lt("publish_date", `${Number(filteredYear) + 1}-01-01`);
  }
  if (filteredStatuses.length) query = query.in("status", filteredStatuses);
  if (filters.platform) query = query.ilike("platform", filters.platform);
  if (filters.publishUntil) query = query.lte("publish_date", filters.publishUntil);

  const { data, error } = await query;

  if (error) {
    return handleSupabaseReadError(
      error,
      sampleContent.filter((item) => {
        return (
          (!filters.client || item.client_id === filters.client) &&
          (!filters.assignee ||
            item.assignee_name?.toLowerCase().includes(filters.assignee.toLowerCase())) &&
          (!filteredMonth || isPublishDateInMonth(item.publish_date, filteredMonth)) &&
          (!filteredYear || item.publish_date?.startsWith(`${filteredYear}-`)) &&
          (!filteredStatuses.length || filteredStatuses.includes(item.status)) &&
          (!filters.platform || item.platform === filters.platform) &&
          (!filters.publishUntil ||
            (Boolean(item.publish_date) && item.publish_date! <= filters.publishUntil))
        );
      }),
      "conteúdos",
    );
  }

  return data as ContentItem[];
}

export async function getContentItem(id: string) {
  const items = await getContentItems();
  return items.find((item) => item.id === id) ?? null;
}

export async function getContentComments(contentId: string) {
  const supabase = await getSupabase();

  if (!supabase) {
    return sampleContentComments.filter((comment) => comment.content_id === contentId);
  }

  const { data, error } = await supabase
    .from("content_comments")
    .select("*")
    .eq("content_id", contentId)
    .order("created_at", { ascending: true });

  if (error) {
    return handleSupabaseReadError(
      error,
      sampleContentComments.filter((comment) => comment.content_id === contentId),
      "comentários de conteúdo",
    );
  }

  return data as ContentComment[];
}

export async function getMentionedContentComments(profileKey: OperationalProfileKey, limit = 5) {
  const supabase = await getSupabase();

  if (!supabase) {
    return sampleContentComments
      .filter((comment) => comment.mentioned_profile_keys.includes(profileKey))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit) as ContentMention[];
  }

  const { data, error } = await supabase
    .from("content_comments")
    .select(`
      *,
      content_items(
        id,
        title,
        client_id,
        clients(*)
      )
    `)
    .contains("mentioned_profile_keys", [profileKey])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return handleSupabaseReadError(error, [], "menções em comentários");
  }

  return data as ContentMention[];
}

export async function getTasks(filters: TaskFilters = {}) {
  const supabase = await getSupabase();

  if (!supabase) {
    return sampleTasks.filter((task) => {
      return (
        (!filters.assignee ||
          task.assignee_name?.toLowerCase().includes(filters.assignee.toLowerCase())) &&
        (!filters.client || task.client_id === filters.client) &&
        (!filters.priority || task.priority === filters.priority) &&
        (!filters.status || task.status === filters.status) &&
        (!filters.due || (Boolean(task.due_date) && task.due_date! <= filters.due))
      );
    });
  }

  let query = supabase
    .from("tasks")
    .select("*, clients(*)")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (filters.assignee) query = query.ilike("assignee_name", `%${filters.assignee}%`);
  if (filters.client) query = query.eq("client_id", filters.client);
  if (filters.priority) query = query.eq("priority", filters.priority as TaskPriority);
  if (filters.status) query = query.eq("status", filters.status as TaskStatus);
  if (filters.due) query = query.lte("due_date", filters.due);

  const { data, error } = await query;

  if (error) {
    return handleSupabaseReadError(
      error,
      sampleTasks.filter((task) => {
        return (
          (!filters.assignee ||
            task.assignee_name?.toLowerCase().includes(filters.assignee.toLowerCase())) &&
          (!filters.client || task.client_id === filters.client) &&
          (!filters.priority || task.priority === filters.priority) &&
          (!filters.status || task.status === filters.status) &&
          (!filters.due || (Boolean(task.due_date) && task.due_date! <= filters.due))
        );
      }),
      "tarefas",
    );
  }

  return data as Task[];
}

export async function getTask(id: string) {
  const tasks = await getTasks();
  return tasks.find((task) => task.id === id) ?? null;
}

export async function getTaskComments(taskId: string) {
  const supabase = await getSupabase();

  if (!supabase) {
    return sampleTaskComments.filter((comment) => comment.task_id === taskId);
  }

  const { data, error } = await supabase
    .from("task_comments")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) {
    return handleSupabaseReadError(
      error,
      sampleTaskComments.filter((comment) => comment.task_id === taskId),
      "comentários de tarefas",
    );
  }

  return data as TaskComment[];
}

export async function getMentionedTaskComments(profileKey: OperationalProfileKey, limit = 5) {
  const supabase = await getSupabase();

  if (!supabase) {
    return sampleTaskComments
      .filter((comment) => comment.mentioned_profile_keys.includes(profileKey))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit) as TaskMention[];
  }

  const { data, error } = await supabase
    .from("task_comments")
    .select(`
      *,
      tasks(
        id,
        title,
        client_id,
        clients(*)
      )
    `)
    .contains("mentioned_profile_keys", [profileKey])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return handleSupabaseReadError(error, [], "menções em comentários de tarefas");
  }

  return data as TaskMention[];
}

export async function getInvest2030NewsletterByTaskId(taskId: string) {
  const supabase = await getSupabase();
  if (!supabase) {
    return sampleInvest2030Newsletters.find((newsletter) => newsletter.task_id === taskId) ?? null;
  }

  const { data, error } = await supabase
    .from("invest2030_newsletters")
    .select("*")
    .eq("task_id", taskId)
    .maybeSingle();

  if (error) {
    return handleSupabaseReadError(
      error,
      sampleInvest2030Newsletters.find((newsletter) => newsletter.task_id === taskId) ?? null,
      "newsletter Invest2030",
    );
  }

  return data as Invest2030Newsletter | null;
}

export async function getInvest2030CampaignByTaskId(taskId: string, variant: Invest2030CampaignVariant) {
  const campaign = await getInvest2030NewsletterByTaskId(taskId);
  if (!campaign) return null;

  const expectedVersion =
    variant === "webinar" ? INVEST2030_WEBINAR_TEMPLATE_VERSION : INVEST2030_NEWSLETTER_TEMPLATE_VERSION;

  return campaign.template_version === expectedVersion ? campaign : null;
}

function invest2030RequestMatches(request: Invest2030Request, filters: Invest2030RequestFilters) {
  const search = filters.search?.trim().toLowerCase();
  const actionTypes = request.action_type.split(",").map((value) => value.trim());
  const text = [
    request.campaign_name,
    request.action_type,
    request.requested_by,
    request.period_label,
    request.webinar_date,
    request.webinar_time,
    request.main_goal,
    request.target_audience,
    request.main_cta,
    request.main_link,
    request.main_message,
    request.mandatory_info,
    request.information_status,
    request.notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    (!search || text.includes(search)) &&
    (!filters.actionType || actionTypes.includes(filters.actionType)) &&
    (!filters.requestedBy || request.requested_by === filters.requestedBy) &&
    (!filters.mainGoal || request.main_goal === filters.mainGoal) &&
    (!filters.informationStatus || request.information_status === filters.informationStatus) &&
    (!filters.month || request.period_start.startsWith(filters.month))
  );
}

export async function getInvest2030Requests(filters: Invest2030RequestFilters = {}) {
  const supabase = await getSupabase();

  if (!supabase) {
    return sampleInvest2030Requests.filter((request) => invest2030RequestMatches(request, filters));
  }

  let query = supabase
    .from("invest2030_requests")
    .select("*, tasks(id, title, status, priority, is_blocked, due_date, notes)")
    .order("created_at", { ascending: false });

  if (filters.search?.trim()) {
    const search = `%${filters.search.trim()}%`;
    query = query.or(
      [
        `campaign_name.ilike.${search}`,
        `action_type.ilike.${search}`,
        `requested_by.ilike.${search}`,
        `period_label.ilike.${search}`,
        `main_goal.ilike.${search}`,
        `target_audience.ilike.${search}`,
        `main_cta.ilike.${search}`,
        `main_link.ilike.${search}`,
        `main_message.ilike.${search}`,
        `mandatory_info.ilike.${search}`,
        `information_status.ilike.${search}`,
        `notes.ilike.${search}`,
      ].join(","),
    );
  }
  if (filters.actionType) query = query.ilike("action_type", `%${filters.actionType}%`);
  if (filters.requestedBy) query = query.eq("requested_by", filters.requestedBy);
  if (filters.mainGoal) query = query.eq("main_goal", filters.mainGoal);
  if (filters.informationStatus) query = query.eq("information_status", filters.informationStatus);
  if (filters.month) {
    query = query.gte("period_start", `${filters.month}-01`).lt("period_start", nextMonth(filters.month));
  }

  const { data, error } = await query;

  if (error) {
    return handleSupabaseReadError(
      error,
      sampleInvest2030Requests.filter((request) => invest2030RequestMatches(request, filters)),
      "pedidos Invest2030",
    );
  }

  return data as Invest2030Request[];
}

function nextMonth(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  if (!year || !monthIndex) return month;
  const next = new Date(year, monthIndex, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`;
}

export async function getDashboardData() {
  const [clients, content, tasks] = await Promise.all([
    getClients(),
    getContentItems(),
    getTasks(),
  ]);
  const today = getToday();
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);

  const activeContent = content.filter(
    (item) => !["published", "archived"].includes(item.status),
  );
  const activeTasks = tasks.filter((task) => !["done", "archived"].includes(task.status));

  return {
    configured: isSupabaseConfigured(),
    clients,
    blockedContent: activeContent.filter((item) => item.is_blocked),
    blockedTasks: activeTasks.filter((task) => task.is_blocked),
    clientsInSetup: clients
      .filter((client) => ["setup", "active"].includes(client.status))
      .map((client) => ({
        client,
        missing: getClientMissingSetup(client),
      }))
      .filter((row) => row.missing.length > 0),
    dueToday: activeContent.filter(
      (item) => item.publish_date === today.toISOString().slice(0, 10),
    ),
    dueThisWeek: activeContent.filter((item) => {
      const date = toDate(item.publish_date);
      return date && date >= today && date <= weekEnd;
    }),
    overdue: activeContent.filter((item) => {
      const date = toDate(item.publish_date);
      return date && date < today;
    }),
    ready: content.filter((item) => item.status === "ready_to_publish"),
    tasksThisWeek: activeTasks.filter((task) => {
      const date = toDate(task.due_date);
      return date && date >= today && date <= weekEnd;
    }),
    summaryByClient: clients.map((client) => ({
      client,
      content: content.filter((item) => item.client_id === client.id).length,
      tasks: tasks.filter((task) => task.client_id === client.id).length,
      ready: content.filter(
        (item) => item.client_id === client.id && item.status === "ready_to_publish",
      ).length,
      blocked:
        content.filter((item) => item.client_id === client.id && item.is_blocked).length +
        tasks.filter((task) => task.client_id === client.id && task.is_blocked).length,
    })),
  };
}

export async function getArchiveData() {
  const [content, tasks] = await Promise.all([getContentItems(), getTasks()]);
  return {
    content: content.filter((item) => ["published", "archived"].includes(item.status)),
    tasks: tasks.filter((task) => task.status === "archived"),
  };
}

export function uniqueValues<T>(items: T[], getter: (item: T) => string | null | undefined) {
  return Array.from(
    new Set(items.map(getter).filter((value): value is string => Boolean(value))),
  ).sort((a, b) => a.localeCompare(b, "pt"));
}
