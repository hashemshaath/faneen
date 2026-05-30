import { supabase } from '@/integrations/supabase/client';

export interface ContractVersionRow {
  id: string;
  contract_id: string;
  version_number: number;
  kind: string;
  snapshot: Record<string, unknown>;
  document_hash: string;
  prev_version_id: string | null;
  created_at: string;
  created_by: string | null;
}

export async function listContractVersions(contractId: string): Promise<ContractVersionRow[]> {
  const { data, error } = await supabase
    .from('contract_versions')
    .select('*')
    .eq('contract_id', contractId)
    .order('version_number', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ContractVersionRow[];
}

export interface FieldDiff {
  key: string;
  before: unknown;
  after: unknown;
  changed: boolean;
}

function flatten(obj: unknown, prefix = ''): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!obj || typeof obj !== 'object') {
    out[prefix || '(root)'] = obj;
    return out;
  }
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}

export function diffSnapshots(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): FieldDiff[] {
  const a = flatten(before ?? {});
  const b = flatten(after ?? {});
  const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)])).sort();
  return keys.map((k) => {
    const va = a[k];
    const vb = b[k];
    const changed = JSON.stringify(va) !== JSON.stringify(vb);
    return { key: k, before: va, after: vb, changed };
  });
}