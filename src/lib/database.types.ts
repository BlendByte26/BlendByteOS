import type { Client, CompanyContact, ContentComment, ContentItem, Invest2030Request, QuickNote, QuickTodo, Task, TeamMember } from "./types";

type Insertable<T> = Omit<T, "id" | "created_at" | "updated_at" | "clients">;
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
        Insert: Partial<Pick<Invest2030Request, "id" | "created_at" | "updated_at" | "task_id" | "notes">> &
          Omit<Invest2030Request, "id" | "created_at" | "updated_at" | "task_id" | "notes" | "tasks">;
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
      company_contacts: {
        Row: CompanyContact;
        Insert: Partial<Pick<CompanyContact, "id" | "created_at" | "updated_at" | "phone" | "links">> &
          Pick<CompanyContact, "label" | "email">;
        Update: Updatable<CompanyContact>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
