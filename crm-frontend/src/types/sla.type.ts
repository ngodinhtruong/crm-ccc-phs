export type SlaSelectOption = {
  id: number;
  [key: string]: unknown;
};

export type SlaTimeUnit = "MINUTE" | "HOUR" | "DAY";

export type SlaStatusTab = "active" | "inactive";

export type SlaListParams = {
  q?: string;
  status?: string;
  ticket_category?: string;
  processing_unit?: string;
};

export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type SlaCreateFormState = {
  policyName: string;
  ticketCategory: string;
  targetTimeValue: string;
  targetTimeUnit: SlaTimeUnit;
  processingUnit: string;
  assignedTo: string;
  assignedToLabel: string;
  description: string;
};

export type SlaPolicyPayload = {
  sla_name: string;
  support_category: number;
  processing_unit: number;
  resolution_time_minutes: number;
  assigned_to_user: number;
  description?: string;
  status?: string;
  is_active?: boolean;
};

export type SlaPolicyItem = {
  id: number;

  sla_code?: string | null;
  sla_name?: string | null;
  description?: string | null;

  support_category?: number | null;
  support_category_name?: string | null;

  processing_unit?: number | null;
  processing_unit_name?: string | null;

  resolution_time_minutes?: number | null;

  assigned_to_user?: number | null;
  assigned_to_user_name?: string | null;

  created_by_user?: number | null;
  created_by_user_name?: string | null;

  status?: string | null;
  is_active?: boolean;
};