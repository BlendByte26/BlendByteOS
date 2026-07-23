import type {
  Client,
  CommercialOpportunity,
  CommercialQuote,
  CommercialQuoteItem,
  CommercialService,
  CompanyContact,
  ContentComment,
  ContentItem,
  ContentReviewAsset,
  ContentReviewAssetItem,
  ContentReviewBlock,
  ContentReviewBlockItem,
  ContentReviewRound,
  Invest2030Newsletter,
  Invest2030Request,
  QuickNote,
  QuickTodo,
  Task,
  TaskComment,
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
      commercial_services: {
        Row: CommercialService;
        Insert: Partial<
          Pick<
            CommercialService,
            "id" | "summary" | "price_status" | "version_label" | "inclusions" | "exclusions" | "internal_notes" | "active" | "sort_order" | "created_at" | "updated_at"
          >
        > &
          Pick<CommercialService, "code" | "category" | "name" | "unit" | "standard_price" | "minimum_price">;
        Update: Partial<Omit<CommercialService, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      commercial_opportunities: {
        Row: CommercialOpportunity;
        Insert: Partial<
          Pick<
            CommercialOpportunity,
            "id" | "contact_name" | "contact_email" | "contact_phone" | "source" | "source_detail" | "status" | "owner_profile_key" | "client_id" | "is_funded" | "funding_program" | "funding_notice" | "eligible_marketing_budget" | "execution_start" | "execution_end" | "objectives" | "notes" | "created_at" | "updated_at"
          >
        > &
          Pick<CommercialOpportunity, "company_name">;
        Update: Partial<Omit<CommercialOpportunity, "id" | "owner_profile_key" | "created_at" | "updated_at" | "clients">>;
        Relationships: [
          {
            foreignKeyName: "commercial_opportunities_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      commercial_quotes: {
        Row: CommercialQuote;
        Insert: Partial<
          Pick<
            CommercialQuote,
            "id" | "status" | "valid_until" | "currency" | "funding_notes" | "commercial_conditions" | "internal_notes" | "created_by_profile_key" | "created_at" | "updated_at"
          >
        > &
          Pick<CommercialQuote, "opportunity_id" | "reference" | "title">;
        Update: Partial<Omit<CommercialQuote, "id" | "opportunity_id" | "reference" | "created_by_profile_key" | "created_at" | "updated_at" | "commercial_opportunities">>;
        Relationships: [
          {
            foreignKeyName: "commercial_quotes_opportunity_id_fkey";
            columns: ["opportunity_id"];
            isOneToOne: false;
            referencedRelation: "commercial_opportunities";
            referencedColumns: ["id"];
          },
        ];
      };
      commercial_quote_items: {
        Row: CommercialQuoteItem;
        Insert: Partial<
          Pick<
            CommercialQuoteItem,
            "id" | "service_id" | "position" | "description" | "price_override_reason" | "eligible_category" | "evidence_notes" | "internal_notes" | "created_at" | "updated_at"
          >
        > &
          Pick<CommercialQuoteItem, "quote_id" | "service_code" | "service_name" | "category" | "unit" | "quantity" | "unit_price" | "standard_unit_price">;
        Update: Partial<Omit<CommercialQuoteItem, "id" | "quote_id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "commercial_quote_items_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "commercial_quotes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "commercial_quote_items_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "commercial_services";
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
      content_review_rounds: {
        Row: ContentReviewRound;
        Insert: Partial<
          Pick<
            ContentReviewRound,
            "id" | "status" | "recipient_name" | "recipient_email" | "approval_deadline" | "introduction" | "submitted_by_name" | "submitted_by_email" | "published_at" | "submitted_at" | "archived_at" | "archived_by_profile_key" | "archived_by_name" | "created_at" | "updated_at"
          >
        > &
          Omit<
            ContentReviewRound,
            "id" | "status" | "recipient_name" | "recipient_email" | "approval_deadline" | "introduction" | "submitted_by_name" | "submitted_by_email" | "published_at" | "submitted_at" | "archived_at" | "archived_by_profile_key" | "archived_by_name" | "created_at" | "updated_at"
          >;
        Update: Partial<Omit<ContentReviewRound, "id" | "client_id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "content_review_rounds_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      content_review_blocks: {
        Row: ContentReviewBlock;
        Insert: Partial<
          Pick<ContentReviewBlock, "id" | "decision" | "client_comment" | "feedback_submitted_at" | "revision_task_id" | "revision_started_at" | "created_at" | "updated_at">
        > &
          Omit<ContentReviewBlock, "id" | "decision" | "client_comment" | "feedback_submitted_at" | "revision_task_id" | "revision_started_at" | "created_at" | "updated_at">;
        Update: Partial<Omit<ContentReviewBlock, "id" | "round_id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "content_review_blocks_round_id_fkey";
            columns: ["round_id"];
            isOneToOne: false;
            referencedRelation: "content_review_rounds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "content_review_blocks_revision_task_id_fkey";
            columns: ["revision_task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      content_review_block_items: {
        Row: ContentReviewBlockItem;
        Insert: Partial<Pick<ContentReviewBlockItem, "id" | "content_item_id" | "publish_date" | "publish_time" | "format" | "copy_text" | "description" | "content_updated_at" | "created_at" | "updated_at">> &
          Omit<ContentReviewBlockItem, "id" | "content_item_id" | "publish_date" | "publish_time" | "format" | "copy_text" | "description" | "content_updated_at" | "created_at" | "updated_at">;
        Update: Partial<Omit<ContentReviewBlockItem, "id" | "block_id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "content_review_block_items_block_id_fkey";
            columns: ["block_id"];
            isOneToOne: false;
            referencedRelation: "content_review_blocks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "content_review_block_items_content_item_id_fkey";
            columns: ["content_item_id"];
            isOneToOne: false;
            referencedRelation: "content_items";
            referencedColumns: ["id"];
          },
        ];
      };
      content_review_assets: {
        Row: ContentReviewAsset;
        Insert: Partial<Pick<ContentReviewAsset, "id" | "created_at" | "updated_at">> &
          Omit<ContentReviewAsset, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ContentReviewAsset, "id" | "block_id" | "storage_path" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "content_review_assets_block_id_fkey";
            columns: ["block_id"];
            isOneToOne: false;
            referencedRelation: "content_review_blocks";
            referencedColumns: ["id"];
          },
        ];
      };
      content_review_asset_items: {
        Row: ContentReviewAssetItem;
        Insert: Partial<Pick<ContentReviewAssetItem, "created_at">> & Omit<ContentReviewAssetItem, "created_at">;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "content_review_asset_items_asset_id_fkey";
            columns: ["asset_id"];
            isOneToOne: false;
            referencedRelation: "content_review_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "content_review_asset_items_block_item_id_fkey";
            columns: ["block_item_id"];
            isOneToOne: false;
            referencedRelation: "content_review_block_items";
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
      task_comments: {
        Row: TaskComment;
        Insert: Partial<Pick<TaskComment, "id" | "created_at" | "updated_at" | "mentioned_profile_keys">> &
          Omit<TaskComment, "id" | "created_at" | "updated_at" | "mentioned_profile_keys">;
        Update: Updatable<TaskComment>;
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
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
