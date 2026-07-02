import type { Client, ContentItem, Task, TeamMember } from "./types";

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
      tasks: {
        Row: Task;
        Insert: Partial<Pick<Task, "id" | "created_at" | "updated_at">> &
          Insertable<Task>;
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
      team_members: {
        Row: TeamMember;
        Insert: Partial<Pick<TeamMember, "id" | "created_at" | "updated_at">> &
          Insertable<TeamMember>;
        Update: Updatable<TeamMember>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
