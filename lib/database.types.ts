export type Json = string | number | boolean | null | {
  [key: string]: Json | undefined;
} | Json[];

export type Database = {
  "graphql_public": {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      "graphql": {
        Args: {
          "extensions"?: Json;
          "operationName"?: string;
          "query"?: string;
          "variables"?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  "public": {
    Tables: {
      "best_efforts": {
        Row: {
          "distance_label": string;
          "distance_m": number;
          "elapsed_s": number;
          "is_pb": boolean;
          "kind": string;
          "start_offset_s": number | null;
          "user_id": string;
          "workout_id": string;
        };
        Insert: {
          "distance_label": string;
          "distance_m": number;
          "elapsed_s": number;
          "is_pb"?: boolean;
          "kind": string;
          "start_offset_s"?: number | null;
          "user_id": string;
          "workout_id": string;
        };
        Update: {
          "distance_label"?: string;
          "distance_m"?: number;
          "elapsed_s"?: number;
          "is_pb"?: boolean;
          "kind"?: string;
          "start_offset_s"?: number | null;
          "user_id"?: string;
          "workout_id"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "best_efforts_workout_id_fkey";
            columns: ["workout_id"];
            isOneToOne: false;
            referencedRelation: "workouts";
            referencedColumns: ["id"];
          },
        ];
      };
      "import_jobs": {
        Row: {
          "created_at": string;
          "error": Json | null;
          "id": string;
          "kind": string;
          "progress": number;
          "status": string;
          "total": number | null;
          "user_id": string;
        };
        Insert: {
          "created_at"?: string;
          "error"?: Json | null;
          "id"?: string;
          "kind": string;
          "progress"?: number;
          "status"?: string;
          "total"?: number | null;
          "user_id": string;
        };
        Update: {
          "created_at"?: string;
          "error"?: Json | null;
          "id"?: string;
          "kind"?: string;
          "progress"?: number;
          "status"?: string;
          "total"?: number | null;
          "user_id"?: string;
        };
        Relationships: [];
      };
      "insights": {
        Row: {
          "created_at": string;
          "id": string;
          "input_tokens": number | null;
          "model": string;
          "output_tokens": number | null;
          "payload": NonNullable<Json>;
          "status": string;
          "trigger": string;
          "user_id": string;
          "week_start": string;
        };
        Insert: {
          "created_at"?: string;
          "id"?: string;
          "input_tokens"?: number | null;
          "model": string;
          "output_tokens"?: number | null;
          "payload": NonNullable<Json>;
          "status"?: string;
          "trigger"?: string;
          "user_id": string;
          "week_start": string;
        };
        Update: {
          "created_at"?: string;
          "id"?: string;
          "input_tokens"?: number | null;
          "model"?: string;
          "output_tokens"?: number | null;
          "payload"?: NonNullable<Json>;
          "status"?: string;
          "trigger"?: string;
          "user_id"?: string;
          "week_start"?: string;
        };
        Relationships: [];
      };
      "loops": {
        Row: {
          "created_at": string;
          "id": string;
          "name": string;
          "signature": NonNullable<Json>;
          "typical_distance_m": number;
          "user_id": string;
        };
        Insert: {
          "created_at"?: string;
          "id"?: string;
          "name": string;
          "signature": NonNullable<Json>;
          "typical_distance_m": number;
          "user_id": string;
        };
        Update: {
          "created_at"?: string;
          "id"?: string;
          "name"?: string;
          "signature"?: NonNullable<Json>;
          "typical_distance_m"?: number;
          "user_id"?: string;
        };
        Relationships: [];
      };
      "profiles": {
        Row: {
          "created_at": string;
          "goal_10k_pace_s_per_km": number;
          "goal_5k_pace_s_per_km": number;
          "goal_custom_distance_m": number | null;
          "goal_custom_pace_s_per_km": number | null;
          "max_hr": number | null;
          "reported_5k_pace_s_per_km": number | null;
          "resting_hr": number | null;
          "units": string;
          "user_id": string;
          "weekly_km_target_max": number;
          "weekly_km_target_min": number;
          "zone_bounds": (number)[];
        };
        Insert: {
          "created_at"?: string;
          "goal_10k_pace_s_per_km"?: number;
          "goal_5k_pace_s_per_km"?: number;
          "goal_custom_distance_m"?: number | null;
          "goal_custom_pace_s_per_km"?: number | null;
          "max_hr"?: number | null;
          "reported_5k_pace_s_per_km"?: number | null;
          "resting_hr"?: number | null;
          "units"?: string;
          "user_id": string;
          "weekly_km_target_max"?: number;
          "weekly_km_target_min"?: number;
          "zone_bounds"?: (number)[];
        };
        Update: {
          "created_at"?: string;
          "goal_10k_pace_s_per_km"?: number;
          "goal_5k_pace_s_per_km"?: number;
          "goal_custom_distance_m"?: number | null;
          "goal_custom_pace_s_per_km"?: number | null;
          "max_hr"?: number | null;
          "reported_5k_pace_s_per_km"?: number | null;
          "resting_hr"?: number | null;
          "units"?: string;
          "user_id"?: string;
          "weekly_km_target_max"?: number;
          "weekly_km_target_min"?: number;
          "zone_bounds"?: (number)[];
        };
        Relationships: [];
      };
      "splits": {
        Row: {
          "avg_hr": number | null;
          "km_index": number;
          "pace_s_per_km": number;
          "user_id": string;
          "workout_id": string;
        };
        Insert: {
          "avg_hr"?: number | null;
          "km_index": number;
          "pace_s_per_km": number;
          "user_id": string;
          "workout_id": string;
        };
        Update: {
          "avg_hr"?: number | null;
          "km_index"?: number;
          "pace_s_per_km"?: number;
          "user_id"?: string;
          "workout_id"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "splits_workout_id_fkey";
            columns: ["workout_id"];
            isOneToOne: false;
            referencedRelation: "workouts";
            referencedColumns: ["id"];
          },
        ];
      };
      "strava_connections": {
        Row: {
          "access_secret_id": string | null;
          "athlete_id": number;
          "connected_at": string;
          "expires_at": string | null;
          "refresh_secret_id": string | null;
          "revoked_at": string | null;
          "scopes": string;
          "user_id": string;
          "webhook_subscription_id": number | null;
        };
        Insert: {
          "access_secret_id"?: string | null;
          "athlete_id": number;
          "connected_at"?: string;
          "expires_at"?: string | null;
          "refresh_secret_id"?: string | null;
          "revoked_at"?: string | null;
          "scopes": string;
          "user_id": string;
          "webhook_subscription_id"?: number | null;
        };
        Update: {
          "access_secret_id"?: string | null;
          "athlete_id"?: number;
          "connected_at"?: string;
          "expires_at"?: string | null;
          "refresh_secret_id"?: string | null;
          "revoked_at"?: string | null;
          "scopes"?: string;
          "user_id"?: string;
          "webhook_subscription_id"?: number | null;
        };
        Relationships: [];
      };
      "strength_sets": {
        Row: {
          "exercise_name": string;
          "muscle_groups": (string)[];
          "reps": number | null;
          "reps_unit_raw": string | null;
          "set_index": number;
          "user_id": string;
          "weight_kg": number | null;
          "weight_unit_raw": string | null;
          "workout_id": string;
        };
        Insert: {
          "exercise_name": string;
          "muscle_groups"?: (string)[];
          "reps"?: number | null;
          "reps_unit_raw"?: string | null;
          "set_index": number;
          "user_id": string;
          "weight_kg"?: number | null;
          "weight_unit_raw"?: string | null;
          "workout_id": string;
        };
        Update: {
          "exercise_name"?: string;
          "muscle_groups"?: (string)[];
          "reps"?: number | null;
          "reps_unit_raw"?: string | null;
          "set_index"?: number;
          "user_id"?: string;
          "weight_kg"?: number | null;
          "weight_unit_raw"?: string | null;
          "workout_id"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "strength_sets_workout_id_fkey";
            columns: ["workout_id"];
            isOneToOne: false;
            referencedRelation: "workouts";
            referencedColumns: ["id"];
          },
        ];
      };
      "sync_log": {
        Row: {
          "count": number;
          "error": string | null;
          "id": number;
          "received_at": string;
          "source": string;
          "status": string;
          "user_id": string;
        };
        Insert: {
          "count"?: number;
          "error"?: string | null;
          "id"?: never;
          "received_at"?: string;
          "source": string;
          "status": string;
          "user_id": string;
        };
        Update: {
          "count"?: number;
          "error"?: string | null;
          "id"?: never;
          "received_at"?: string;
          "source"?: string;
          "status"?: string;
          "user_id"?: string;
        };
        Relationships: [];
      };
      "sync_queue": {
        Row: {
          "aspect": string;
          "attempts": number;
          "created_at": string;
          "event_time": number;
          "id": number;
          "last_error": string | null;
          "not_before": string;
          "object_id": number;
          "object_type": string;
          "status": string;
          "user_id": string;
        };
        Insert: {
          "aspect": string;
          "attempts"?: number;
          "created_at"?: string;
          "event_time": number;
          "id"?: never;
          "last_error"?: string | null;
          "not_before"?: string;
          "object_id": number;
          "object_type": string;
          "status"?: string;
          "user_id": string;
        };
        Update: {
          "aspect"?: string;
          "attempts"?: number;
          "created_at"?: string;
          "event_time"?: number;
          "id"?: never;
          "last_error"?: string | null;
          "not_before"?: string;
          "object_id"?: number;
          "object_type"?: string;
          "status"?: string;
          "user_id"?: string;
        };
        Relationships: [];
      };
      "weekly_summaries": {
        Row: {
          "avg_efficiency": number | null;
          "duration_s": number;
          "km": number;
          "load": number | null;
          "long_run_km": number | null;
          "run_count": number;
          "user_id": string;
          "week_start": string;
          "zone_seconds": (number)[] | null;
        };
        Insert: {
          "avg_efficiency"?: number | null;
          "duration_s"?: number;
          "km"?: number;
          "load"?: number | null;
          "long_run_km"?: number | null;
          "run_count"?: number;
          "user_id": string;
          "week_start": string;
          "zone_seconds"?: (number)[] | null;
        };
        Update: {
          "avg_efficiency"?: number | null;
          "duration_s"?: number;
          "km"?: number;
          "load"?: number | null;
          "long_run_km"?: number | null;
          "run_count"?: number;
          "user_id"?: string;
          "week_start"?: string;
          "zone_seconds"?: (number)[] | null;
        };
        Relationships: [];
      };
      "workout_loops": {
        Row: {
          "closure_m": number | null;
          "loop_id": string;
          "similarity": number;
          "user_id": string;
          "workout_id": string;
        };
        Insert: {
          "closure_m"?: number | null;
          "loop_id": string;
          "similarity": number;
          "user_id": string;
          "workout_id": string;
        };
        Update: {
          "closure_m"?: number | null;
          "loop_id"?: string;
          "similarity"?: number;
          "user_id"?: string;
          "workout_id"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_loops_loop_id_fkey";
            columns: ["loop_id"];
            isOneToOne: false;
            referencedRelation: "loops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_loops_workout_id_fkey";
            columns: ["workout_id"];
            isOneToOne: true;
            referencedRelation: "workouts";
            referencedColumns: ["id"];
          },
        ];
      };
      "workout_samples": {
        Row: {
          "alt": (number)[] | null;
          "d": (number)[];
          "hr": (number)[] | null;
          "lat": (number)[] | null;
          "lon": (number)[] | null;
          "moving": (boolean)[] | null;
          "t": (number)[];
          "user_id": string;
          "v": (number)[] | null;
          "workout_id": string;
        };
        Insert: {
          "alt"?: (number)[] | null;
          "d": (number)[];
          "hr"?: (number)[] | null;
          "lat"?: (number)[] | null;
          "lon"?: (number)[] | null;
          "moving"?: (boolean)[] | null;
          "t": (number)[];
          "user_id": string;
          "v"?: (number)[] | null;
          "workout_id": string;
        };
        Update: {
          "alt"?: (number)[] | null;
          "d"?: (number)[];
          "hr"?: (number)[] | null;
          "lat"?: (number)[] | null;
          "lon"?: (number)[] | null;
          "moving"?: (boolean)[] | null;
          "t"?: (number)[];
          "user_id"?: string;
          "v"?: (number)[] | null;
          "workout_id"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_samples_workout_id_fkey";
            columns: ["workout_id"];
            isOneToOne: true;
            referencedRelation: "workouts";
            referencedColumns: ["id"];
          },
        ];
      };
      "workouts": {
        Row: {
          "avg_hr": number | null;
          "distance_m": number;
          "duration_s": number;
          "efficiency": number | null;
          "elevation_gain_m": number | null;
          "energy_kcal": number | null;
          "has_hr": boolean;
          "has_route": boolean;
          "id": string;
          "is_leg_day": boolean;
          "leg_day_source": string;
          "load": number | null;
          "max_hr": number | null;
          "moving_s": number | null;
          "name": string | null;
          "origin": string;
          "raw_ref": Json | null;
          "run_kind": string | null;
          "source": string;
          "source_id": string;
          "start_at": string;
          "type": string;
          "updated_at": string;
          "user_id": string;
          "zone_seconds": (number)[] | null;
        };
        Insert: {
          "avg_hr"?: number | null;
          "distance_m"?: number;
          "duration_s": number;
          "efficiency"?: number | null;
          "elevation_gain_m"?: number | null;
          "energy_kcal"?: number | null;
          "has_hr"?: boolean;
          "has_route"?: boolean;
          "id"?: string;
          "is_leg_day"?: boolean;
          "leg_day_source"?: string;
          "load"?: number | null;
          "max_hr"?: number | null;
          "moving_s"?: number | null;
          "name"?: string | null;
          "origin": string;
          "raw_ref"?: Json | null;
          "run_kind"?: string | null;
          "source": string;
          "source_id": string;
          "start_at": string;
          "type": string;
          "updated_at"?: string;
          "user_id": string;
          "zone_seconds"?: (number)[] | null;
        };
        Update: {
          "avg_hr"?: number | null;
          "distance_m"?: number;
          "duration_s"?: number;
          "efficiency"?: number | null;
          "elevation_gain_m"?: number | null;
          "energy_kcal"?: number | null;
          "has_hr"?: boolean;
          "has_route"?: boolean;
          "id"?: string;
          "is_leg_day"?: boolean;
          "leg_day_source"?: string;
          "load"?: number | null;
          "max_hr"?: number | null;
          "moving_s"?: number | null;
          "name"?: string | null;
          "origin"?: string;
          "raw_ref"?: Json | null;
          "run_kind"?: string | null;
          "source"?: string;
          "source_id"?: string;
          "start_at"?: string;
          "type"?: string;
          "updated_at"?: string;
          "user_id"?: string;
          "zone_seconds"?: (number)[] | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      "is_owner": { Args: { "row_user": string }; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema =
  DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  } ? keyof (
      & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
        "Tables"
      ]
      & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
        "Views"
      ]
    )
    : never = never,
> = DefaultSchemaTableNameOrOptions extends
  { schema: keyof DatabaseWithoutInternals } ? (
    & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
      "Tables"
    ]
    & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
      "Views"
    ]
  )[TableName] extends {
    Row: infer R;
  } ? R
  : never
  : DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[
      DefaultSchemaTableNameOrOptions
    ] extends {
      Row: infer R;
    } ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  } ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
      "Tables"
    ]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends
  { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
    "Tables"
  ][TableName] extends {
    Insert: infer I;
  } ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    } ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  } ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
      "Tables"
    ]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends
  { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
    "Tables"
  ][TableName] extends {
    Update: infer U;
  } ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    } ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  } ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]][
      "Enums"
    ]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends
  { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][
    EnumName
  ]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  } ? keyof DatabaseWithoutInternals[
      PublicCompositeTypeNameOrOptions["schema"]
    ]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends
  { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]][
    "CompositeTypes"
  ][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  "graphql_public": {
    Enums: {},
  },
  "public": {
    Enums: {},
  },
} as const;
