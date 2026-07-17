import type {
  Client,
  CompanyContact,
  ContentComment,
  ContentItem,
  Invest2030Newsletter,
  Invest2030Request,
  QuickNote,
  QuickTodo,
  Task,
  TeamMember,
  UsefulLink,
  UserProfile,
} from "./types";
import type { CustomHoliday, VacationBalance, VacationRequest } from "./vacations";

type Insertable<T> = Omit<T, "id" | "created_at" | "updated_at" | "clients" | "source_task">;
type Updatable<T> = Partial<Insertable<T>>;

export type Database = {
  public: {
    Tables: {
      clients: {
        Row: Client;
        Insert: Partial<Pick<Client, "id" | "created_at" | "updated_at">> &
          Insertable<Client>;
        Update: Updatable<Client>;
        Relationships: [];
      };
      content_items: {
        Row: ContentItem;
        Insert: Partial<Pick<ContentItem, "id" | "created_at" | "updated_at">> &
          Insertable<ContentItem>;
        Update: Updatable<ContentItem>;
        Relationships: [
          {
            foreignKeyName: "content_items_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "content_items_source_task_id_fkey";
            columns: ["source_task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      content_comments: {
        Row: ContentComment;
        Insert: Partial<Pick<ContentComment, "id" | "created_at" | "updated_at" | "mentioned_profile_keys">> &
          Omit<ContentComment, "id" | "created_at" | "updated_at" | "mentioned_profile_keys">;
        Update: Updatable<ContentComment>;
        Relationships: [
          {
            foreignKeyName: "content_comments_content_id_fkey";
            columns: ["content_id"];
            isOneToOne: false;
            referencedRelation: "content_items";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: Task;
        Insert: Partial<Pick<Task, "id" | "created_at" | "updated_at" | "links">> &
          Omit<Insertable<Task>, "links">;
        Update: Updatable<Task>;
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      invest2030_requests: {
        Row: Invest2030Request;
        Insert: Partial<Pick<Invest2030Request, "id" | "created_at" | "updated_at" | "submission_key" | "task_id" | "notes" | "webinar_date" | "webinar_time">> &
          Omit<Invest2030Request, "id" | "created_at" | "updated_at" | "submission_key" | "task_id" | "notes" | "webinar_date" | "webinar_time" | "tasks">;
        Update: Updatable<Invest2030Request>;
        Relationships: [
          {
            foreignKeyName: "invest2030_requests_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      invest2030_newsletters: {
        Row: Invest2030Newsletter;
        Insert: Partial<
          Pick<
            Invest2030Newsletter,
            | "id"
            | "created_at"
            | "updated_at"
            | "status"
            | "scheduled_at"
            | "sent_at"
            | "scheduled_note"
            | "scheduled_by"
            | "scheduled_recorded_at"
            | "sent_by"
            | "sent_recorded_at"
            | "created_by"
            | "updated_by"
          >
        > &
          Omit<
            Invest2030Newsletter,
            | "id"
            | "created_at"
            | "updated_at"
            | "status"
            | "scheduled_at"
            | "sent_at"
            | "scheduled_note"
            | "scheduled_by"
            | "scheduled_recorded_at"
            | "sent_by"
            | "sent_recorded_at"
            | "created_by"
            | "updated_by"
          >;
        Update: Updatable<Invest2030Newsletter>;
        Relationships: [
          {
            foreignKeyName: "invest2030_newsletters_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: true;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      quick_todos: {
        Row: QuickTodo;
        Insert: Partial<Pick<QuickTodo, "id" | "created_at" | "updated_at" | "done" | "item_type">> &
          Omit<QuickTodo, "id" | "created_at" | "updated_at" | "done" | "item_type">;
        Update: Updatable<QuickTodo>;
        Relationships: [];
      };
      quick_notes: {
        Row: QuickNote;
        Insert: Partial<Pick<QuickNote, "id" | "created_at" | "updated_at">> &
          Omit<QuickNote, "id" | "created_at" | "updated_at">;
        Update: Updatable<QuickNote>;
        Relationships: [];
      };
      team_members: {
        Row: TeamMember;
        Insert: Partial<
          Pick<TeamMember, "id" | "created_at" | "updated_at" | "email" | "phone" | "role" | "links" | "active" | "display_order">
        > &
          Pick<TeamMember, "name">;
        Update: Updatable<TeamMember>;
        Relationships: [];
      };
      vacation_balances: {
        Row: VacationBalance;
        Insert: Partial<Pick<VacationBalance, "id" | "created_at" | "updated_at" | "entitled_days" | "carried_over_days" | "adjustment_days" | "admin_notes">> & Pick<VacationBalance, "team_member_id" | "year">;
        Update: Updatable<VacationBalance>;
        Relationships: [];
      };
      vacation_requests: {
        Row: VacationRequest;
        Insert: Partial<Pick<VacationRequest, "id" | "created_at" | "updated_at" | "status" | "employee_note" | "admin_note" | "decided_by_profile" | "decided_at">> & Pick<VacationRequest, "team_member_id" | "start_date" | "end_date" | "working_days" | "requested_by_profile">;
        Update: Updatable<VacationRequest>;
        Relationships: [];
      };
      custom_holidays: {
        Row: CustomHoliday;
        Insert: Partial<Pick<CustomHoliday, "id" | "created_at" | "updated_at" | "active">> & Pick<CustomHoliday, "holiday_date" | "name" | "holiday_type" | "created_by_profile">;
        Update: Updatable<CustomHoliday>;
        Relationships: [];
      };
      company_contacts: {
        Row: CompanyContact;
        Insert: Partial<Pick<CompanyContact, "id" | "created_at" | "updated_at" | "phone" | "links">> &
          Pick<CompanyContact, "label" | "email">;
        Update: Updatable<CompanyContact>;
        Relationships: [];
      };
      useful_links: {
        Row: UsefulLink;
        Insert: Partial<Pick<UsefulLink, "id" | "sort_order" | "created_at" | "updated_at">> &
          Pick<UsefulLink, "name" | "url">;
        Update: Updatable<UsefulLink>;
        Relationships: [];
      };
      user_profiles: {
        Row: UserProfile;
        Insert: Partial<Pick<UserProfile, "id" | "created_at" | "updated_at" | "active">> &
          Omit<UserProfile, "id" | "created_at" | "updated_at" | "active">;
        Update: Partial<Omit<UserProfile, "id" | "created_at" | "updated_at" | "auth_user_id">>;
        Relationships: [
          {
            foreignKeyName: "user_profiles_auth_user_id_fkey";
            columns: ["auth_user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
