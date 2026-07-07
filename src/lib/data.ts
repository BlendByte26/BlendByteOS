import { getSupabase, isSupabaseConfigured, isSupabaseSchemaError } from "./supabase";
import { compareClients } from "./client-display";
import { getClientMissingSetup } from "./onboarding";
import { sampleClients, sampleContent, sampleTasks } from "./sample-data";
import type { OperationalProfileKey } from "./operational-profiles";
import type {
  Client,
  CompanyContact,
  ContentItem,
  ContentStatus,
  QuickNote,
  QuickTodo,
  QuickTodoView,
  Task,
  TaskPriority,
  TaskStatus,
  TeamMember,
} from "./types";

export type ContentFilters = {
  assignee?: string;
  client?: string;
  month?: string;
  status?: string;
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

const sampleTeamMembers: TeamMember[] = [
  {
    id: "sample-guilherme",
    name: "Guilherme",
    email: null,
    phone: null,
    role: "Direção / Operações",
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
    role: "Client Ops",
    active: true,
    display_order: 2,
    created_at: "",
    updated_at: "",
  },
  {
    id: "sample-design",
    name: "Estagiário Design",
    email: null,
    phone: null,
    role: "Design",
    active: true,
    display_order: 3,
    created_at: "",
    updated_at: "",
  },
  {
    id: "sample-marketing",
    name: "Sofia",
    email: null,
    phone: null,
    role: "Marketing / Client Ops",
    active: true,
    display_order: 4,
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
const sampleCompanyContacts: CompanyContact[] = [];

function getToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12));
}

function toDate(value: string | null) {
  return value ? new Date(`${value}T12:00:00.000Z`) : null;
}

function handleSupabaseReadError<T>(error: unknown, fallback: T, context: string) {
  console.error(`Erro Supabase ao carregar ${context}`, error);

  if (isSupabaseSchemaError(error)) {
    return fallback;
  }

  return fallback;
}

export async function getClients() {
  const supabase = getSupabase();

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
  const supabase = getSupabase();

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
  const supabase = getSupabase();

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
  const supabase = getSupabase();

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

export async function getTeamMember(id: string) {
  const supabase = getSupabase();

  if (!supabase) {
    return sampleTeamMembers.find((member) => member.id === id) ?? null;
  }

  const { data, error } = await supabase.from("team_members").select("*").eq("id", id).maybeSingle();

  if (error) {
    return handleSupabaseReadError(error, null, "membro da equipa");
  }

  return data as TeamMember | null;
}

export async function getQuickTodos(view: QuickTodoView, profileKey: OperationalProfileKey) {
  const supabase = getSupabase();

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
  const supabase = getSupabase();

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

export async function getContentItems(filters: ContentFilters = {}) {
  const supabase = getSupabase();

  if (!supabase) {
    return sampleContent.filter((item) => {
      return (
        (!filters.client || item.client_id === filters.client) &&
        (!filters.assignee ||
          item.assignee_name?.toLowerCase().includes(filters.assignee.toLowerCase())) &&
        (!filters.month || item.month === filters.month) &&
        (!filters.status || item.status === filters.status) &&
        (!filters.platform || item.platform === filters.platform) &&
        (!filters.publishUntil ||
          (Boolean(item.publish_date) && item.publish_date! <= filters.publishUntil))
      );
    });
  }

  let query = supabase
    .from("content_items")
    .select("*, clients(id, name, client_code, short_name, display_order, logo_url)")
    .order("publish_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (filters.client) query = query.eq("client_id", filters.client);
  if (filters.assignee) query = query.ilike("assignee_name", `%${filters.assignee}%`);
  if (filters.month) query = query.eq("month", filters.month);
  if (filters.status) query = query.eq("status", filters.status as ContentStatus);
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
          (!filters.month || item.month === filters.month) &&
          (!filters.status || item.status === filters.status) &&
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

export async function getTasks(filters: TaskFilters = {}) {
  const supabase = getSupabase();

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
    .select("*, clients(id, name, client_code, short_name, display_order, logo_url)")
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
