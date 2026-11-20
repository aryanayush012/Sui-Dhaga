export type GarmentType = 'pant' | 'shirt' | 'suit' | 'blouse' | 'other'
export type PaymentMethod = 'cash' | 'upi' | 'other'
export type SpecialState = 'cancelled' | 'delivered'
export type CommKind = 'created' | 'date_changed' | 'ready'
export type GarmentInput = { id?: string; type: GarmentType; qty: number;
  cloth_photo_path?: string | null; measurement_photo_path?: string | null;
  measurements?: Record<string, string>; instructions?: string | null }
export type NewOrderInput = { customer_name: string; customer_mobile: string; due_date: string;
  rack?: string | null; assignee_id?: string | null; total_amount?: number | null;
  notes?: string | null; garments: GarmentInput[];
  advance?: { amount: number; method: PaymentMethod } | null }
export type BoardOrder = { id: string; slip_no: number; customer_name: string;
  customer_mobile: string | null; due_date: string; stage_id: string; stage_name: string;
  stage_position: number; is_ready: boolean; special_state: SpecialState | null;
  rack: string | null; assignee_id: string | null; assignee_name: string | null;
  total_amount: number | null; paid_amount: number; garment_summary: string;
  tracking_token: string | null; tracking_enabled: boolean;
  comm_kind: CommKind | null; communicated: boolean; created_at: string; updated_at: string }
