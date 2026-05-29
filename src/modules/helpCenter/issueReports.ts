import { supabase } from '@/integrations/supabase/client';
import type { HelpIssueReport, HelpIssuePriority, HelpIssueStatus, HelpIssueType } from './types';

export interface SubmitIssueReportInput {
  page_key: string;
  issue_type: HelpIssueType;
  priority: HelpIssuePriority;
  title: string;
  description?: string;
  screenshot_url?: string;
}

export async function submitIssueReport(input: SubmitIssueReportInput): Promise<HelpIssueReport> {
  const { data, error } = await supabase
    .from('help_issue_reports')
    .insert({
      page_key: input.page_key,
      issue_type: input.issue_type,
      priority: input.priority,
      title: input.title,
      description: input.description ?? null,
      screenshot_url: input.screenshot_url ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as HelpIssueReport;
}

export async function listMyIssueReports(): Promise<HelpIssueReport[]> {
  const { data, error } = await supabase
    .from('help_issue_reports')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as HelpIssueReport[];
}

export async function adminListAllIssueReports(filters: { status?: HelpIssueStatus } = {}): Promise<HelpIssueReport[]> {
  let q = supabase.from('help_issue_reports').select('*').order('created_at', { ascending: false });
  if (filters.status) q = q.eq('status', filters.status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as HelpIssueReport[];
}

export async function adminUpdateIssueStatus(id: string, status: HelpIssueStatus): Promise<void> {
  const { error } = await supabase.from('help_issue_reports').update({ status }).eq('id', id);
  if (error) throw error;
}