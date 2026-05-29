/**
 * BUSINESS-FINISHING-1 Phase G — Read-only role × permission matrix.
 *
 * Renders the static RBAC catalog from
 * @/modules/workspace/permissions/catalog. Display only —
 * RLS + has_permission RPCs remain authoritative.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Minus } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  WORKSPACE_ROLES,
  WORKSPACE_PERMISSIONS,
  ROLE_PERMISSION_DEFAULTS,
  type WorkspaceRole,
  type WorkspacePermission,
} from '@/modules/workspace/permissions/catalog';

export interface PermissionMatrixCell {
  role: WorkspaceRole;
  permission: WorkspacePermission;
  granted: boolean;
}

/** Pure: derive the full role × permission matrix from the catalog. */
export function buildPermissionMatrix(): PermissionMatrixCell[] {
  const out: PermissionMatrixCell[] = [];
  for (const role of WORKSPACE_ROLES) {
    const defaults = new Set<string>(ROLE_PERMISSION_DEFAULTS[role] ?? []);
    for (const permission of WORKSPACE_PERMISSIONS) {
      out.push({ role, permission, granted: defaults.has(permission) });
    }
  }
  return out;
}

export const PermissionMatrix: React.FC<{ className?: string }> = ({ className }) => {
  const { isRTL } = useLanguage();
  return (
    <Card className={className} data-testid="permission-matrix">
      <CardHeader>
        <CardTitle className="text-sm">
          {isRTL ? 'مصفوفة الصلاحيات' : 'Permission matrix'}
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/40">
              <th className="text-start py-1.5 ps-1 pe-3 sticky start-0 bg-card">
                {isRTL ? 'الصلاحية' : 'Permission'}
              </th>
              {WORKSPACE_ROLES.map((role) => (
                <th key={role} className="text-center py-1.5 px-2 font-medium">
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WORKSPACE_PERMISSIONS.map((permission) => (
              <tr key={permission} className="border-b border-border/20 hover:bg-muted/30">
                <td className="py-1.5 ps-1 pe-3 font-mono tech-content sticky start-0 bg-card">
                  {permission}
                </td>
                {WORKSPACE_ROLES.map((role) => {
                  const granted = (ROLE_PERMISSION_DEFAULTS[role] ?? []).includes(permission);
                  return (
                    <td key={role} className="text-center py-1.5 px-2" data-testid={`pm-${role}-${permission}`}>
                      {granted
                        ? <Check className="w-3.5 h-3.5 inline text-success" />
                        : <Minus className="w-3.5 h-3.5 inline text-muted-foreground/40" />}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};

export default PermissionMatrix;