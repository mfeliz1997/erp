export type NcfType = "B01" | "B02" | "B04" | "B14" | "B15";

export interface NcfSequence {
  id: string;
  tenant_id: string;
  type: NcfType;
  prefix: string;
  current_sequence: number;
  max_limit: number;
  valid_until: string | null;
  created_at: string;
}
