
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "garments": {
                  Row: {
                    "cloth_photo_path": string | null,"id": string,"instructions": string | null,"measurement_photo_path": string | null,"measurements": NonNullable<Json>,"order_id": string,"qty": number,"shop_id": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cloth_photo_path"?: string | null,"id"?: string,"instructions"?: string | null,"measurement_photo_path"?: string | null,"measurements"?: NonNullable<Json>,"order_id": string,"qty"?: number,"shop_id": string,"type": string
                  }
                  Update: {
                    "cloth_photo_path"?: string | null,"id"?: string,"instructions"?: string | null,"measurement_photo_path"?: string | null,"measurements"?: NonNullable<Json>,"order_id"?: string,"qty"?: number,"shop_id"?: string,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "garments_order_id_shop_id_fkey"
      columns: ["order_id","shop_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id","shop_id"]
    },{
      foreignKeyName: "garments_shop_id_fkey"
      columns: ["shop_id"]
isOneToOne: false
      referencedRelation: "shops"
      referencedColumns: ["id"]
    }
                  ]
                },"members": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"mobile": string,"name": string,"role": string,"shop_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id": string,"is_active"?: boolean,"mobile": string,"name": string,"role": string,"shop_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"mobile"?: string,"name"?: string,"role"?: string,"shop_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "members_shop_id_fkey"
      columns: ["shop_id"]
isOneToOne: false
      referencedRelation: "shops"
      referencedColumns: ["id"]
    }
                  ]
                },"order_events": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"from_value": string | null,"id": string,"order_id": string,"shop_id": string,"to_value": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"from_value"?: string | null,"id"?: string,"order_id": string,"shop_id": string,"to_value"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"from_value"?: string | null,"id"?: string,"order_id"?: string,"shop_id"?: string,"to_value"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_events_actor_id_shop_id_fkey"
      columns: ["actor_id","shop_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id","shop_id"]
    },{
      foreignKeyName: "order_events_order_id_shop_id_fkey"
      columns: ["order_id","shop_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id","shop_id"]
    },{
      foreignKeyName: "order_events_shop_id_fkey"
      columns: ["shop_id"]
isOneToOne: false
      referencedRelation: "shops"
      referencedColumns: ["id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "assignee_id": string | null,"created_at": string,"created_by": string,"customer_mobile": string,"customer_name": string,"due_date": string,"id": string,"notes": string | null,"rack": string | null,"shop_id": string,"slip_no": number,"special_state": string | null,"stage_id": string,"total_amount": number | null,"tracking_enabled": boolean,"tracking_token": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assignee_id"?: string | null,"created_at"?: string,"created_by": string,"customer_mobile": string,"customer_name": string,"due_date": string,"id"?: string,"notes"?: string | null,"rack"?: string | null,"shop_id": string,"slip_no": number,"special_state"?: string | null,"stage_id": string,"total_amount"?: number | null,"tracking_enabled"?: boolean,"tracking_token": string,"updated_at"?: string
                  }
                  Update: {
                    "assignee_id"?: string | null,"created_at"?: string,"created_by"?: string,"customer_mobile"?: string,"customer_name"?: string,"due_date"?: string,"id"?: string,"notes"?: string | null,"rack"?: string | null,"shop_id"?: string,"slip_no"?: number,"special_state"?: string | null,"stage_id"?: string,"total_amount"?: number | null,"tracking_enabled"?: boolean,"tracking_token"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_assignee_id_shop_id_fkey"
      columns: ["assignee_id","shop_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id","shop_id"]
    },{
      foreignKeyName: "orders_created_by_shop_id_fkey"
      columns: ["created_by","shop_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id","shop_id"]
    },{
      foreignKeyName: "orders_shop_id_fkey"
      columns: ["shop_id"]
isOneToOne: false
      referencedRelation: "shops"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_stage_id_shop_id_fkey"
      columns: ["stage_id","shop_id"]
isOneToOne: false
      referencedRelation: "stages"
      referencedColumns: ["id","shop_id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount": number,"created_at": string,"id": string,"method": string,"note": string | null,"order_id": string,"recorded_by": string,"shop_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"id"?: string,"method": string,"note"?: string | null,"order_id": string,"recorded_by": string,"shop_id": string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"id"?: string,"method"?: string,"note"?: string | null,"order_id"?: string,"recorded_by"?: string,"shop_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_order_id_shop_id_fkey"
      columns: ["order_id","shop_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id","shop_id"]
    },{
      foreignKeyName: "payments_recorded_by_shop_id_fkey"
      columns: ["recorded_by","shop_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id","shop_id"]
    },{
      foreignKeyName: "payments_shop_id_fkey"
      columns: ["shop_id"]
isOneToOne: false
      referencedRelation: "shops"
      referencedColumns: ["id"]
    }
                  ]
                },"shops": {
                  Row: {
                    "address": string | null,"created_at": string,"id": string,"language": string,"logo_url": string | null,"name": string,"slip_counter": number
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"created_at"?: string,"id"?: string,"language"?: string,"logo_url"?: string | null,"name": string,"slip_counter"?: number
                  }
                  Update: {
                    "address"?: string | null,"created_at"?: string,"id"?: string,"language"?: string,"logo_url"?: string | null,"name"?: string,"slip_counter"?: number
                  }
                  Relationships: [
                    
                  ]
                },"stages": {
                  Row: {
                    "id": string,"name": string,"position": number,"shop_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"name": string,"position": number,"shop_id": string
                  }
                  Update: {
                    "id"?: string,"name"?: string,"position"?: number,"shop_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "stages_shop_id_fkey"
      columns: ["shop_id"]
isOneToOne: false
      referencedRelation: "shops"
      referencedColumns: ["id"]
    }
                  ]
                },"whatsapp_sends": {
                  Row: {
                    "created_at": string,"id": string,"kind": string,"opened_by": string,"order_id": string,"shop_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"kind": string,"opened_by": string,"order_id": string,"shop_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"kind"?: string,"opened_by"?: string,"order_id"?: string,"shop_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "whatsapp_sends_opened_by_shop_id_fkey"
      columns: ["opened_by","shop_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id","shop_id"]
    },{
      foreignKeyName: "whatsapp_sends_order_id_shop_id_fkey"
      columns: ["order_id","shop_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id","shop_id"]
    },{
      foreignKeyName: "whatsapp_sends_shop_id_fkey"
      columns: ["shop_id"]
isOneToOne: false
      referencedRelation: "shops"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "board_orders": {
                  Row: {
                    "assignee_id": string | null,"assignee_name": string | null,"comm_kind": string | null,"communicated": boolean | null,"created_at": string,"customer_mobile": string | null,"customer_name": string,"due_date": string,"garment_summary": string | null,"id": string,"is_ready": boolean | null,"paid_amount": number | null,"rack": string | null,"slip_no": number,"special_state": string | null,"stage_id": string,"stage_name": string,"stage_position": number,"total_amount": number | null,"tracking_enabled": boolean,"tracking_token": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "_garment_from_json":
{ Args: { "p": Json }; Returns: {
              "cloth_photo_path": string | null,
"id": string,
"instructions": string | null,
"measurement_photo_path": string | null,
"measurements": NonNullable<Json>,
"order_id": string,
"qty": number,
"shop_id": string,
"type": string
            }
                          SetofOptions: {
        from: "*"
        to: "garments"
        isOneToOne: true
        isSetofReturn: false
      } },
"_log_event":
{ Args: { "o": Omit<Database["public"]['Tables']["orders"]['Row'], Database["public"]['Tables']["orders"]['ComputedFields']>,"p_action": string,"p_from": string,"p_to": string }; Returns: undefined
                           },
"_order_for_write":
{ Args: { "p_order_id": string,"p_owner_only": boolean }; Returns: {
              "assignee_id": string | null,
"created_at": string,
"created_by": string,
"customer_mobile": string,
"customer_name": string,
"due_date": string,
"id": string,
"notes": string | null,
"rack": string | null,
"shop_id": string,
"slip_no": number,
"special_state": string | null,
"stage_id": string,
"total_amount": number | null,
"tracking_enabled": boolean,
"tracking_token": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "orders"
        isOneToOne: true
        isSetofReturn: false
      } },
"add_payment":
{ Args: { "p_amount": number,"p_method": string,"p_note": string,"p_order_id": string }; Returns: string
                           },
"admin_create_shop":
{ Args: { "p_mobile": string,"p_name": string,"p_owner_id": string,"p_owner_name": string }; Returns: string
                           },
"assign_order":
{ Args: { "p_member_id": string,"p_order_id": string }; Returns: undefined
                           },
"change_due_date":
{ Args: { "p_due": string,"p_order_id": string }; Returns: undefined
                           },
"create_order":
{ Args: { "p": Json }; Returns: Json
                           },
"current_member":
{ Args: Record<PropertyKey, never>; Returns: {
              "created_at": string,
"id": string,
"is_active": boolean,
"mobile": string,
"name": string,
"role": string,
"shop_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "members"
        isOneToOne: true
        isSetofReturn: false
      } },
"current_shop_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"delete_garment":
{ Args: { "p_garment_id": string }; Returns: undefined
                           },
"get_tracking":
{ Args: { "p_token": string }; Returns: Json
                           },
"is_owner":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"move_order":
{ Args: { "p_order_id": string,"p_stage_id": string }; Returns: undefined
                           },
"record_whatsapp_send":
{ Args: { "p_kind": string,"p_order_id": string }; Returns: undefined
                           },
"save_garment":
{ Args: { "p": Json,"p_order_id": string }; Returns: string
                           },
"set_member_active":
{ Args: { "p_active": boolean,"p_member_id": string }; Returns: undefined
                           },
"set_paid":
{ Args: { "p_order_id": string,"p_paid": number }; Returns: undefined
                           },
"set_rack":
{ Args: { "p_order_id": string,"p_rack": string }; Returns: undefined
                           },
"set_special_state":
{ Args: { "p_order_id": string,"p_state": string }; Returns: undefined
                           },
"set_status":
{ Args: { "p_order_id": string,"p_target": string }; Returns: undefined
                           },
"set_total":
{ Args: { "p_order_id": string,"p_total": number }; Returns: undefined
                           },
"set_tracking_enabled":
{ Args: { "p_enabled": boolean,"p_order_id": string }; Returns: undefined
                           },
"update_order_info":
{ Args: { "p_mobile": string,"p_name": string,"p_notes": string,"p_order_id": string }; Returns: undefined
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
