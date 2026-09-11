import { User, Role, Permission } from '../types';
import { checkUserPermission, checkUserModuleAccess, SystemModuleKey } from '../constants/roles';
import { StorageService } from './storage';
import { AuditService } from './auditService';

export type RecordOwnershipLevel =
  | 'own'
  | 'department'
  | 'assigned'
  | 'organization'
  | 'restricted';

export interface WorkflowRecordContext {
  id?: string;
  type?: 'patient' | 'card_request' | 'card' | 'appointment' | 'lab_order' | 'report' | 'bill' | 'transaction' | 'pharmacy_order';
  ownerId?: string;
  submittedBy?: string;
  department?: string;
  assignedTo?: string;
  doctorId?: string;
  status?: string;
  isFinalized?: boolean;
  isApproved?: boolean;
}

export interface WorkflowActionCheckResult {
  allowed: boolean;
  reason?: string;
  ruleViolated?: string;
}

export class WorkflowPermissionService {
  /**
   * Evaluates if the authenticated user has a specific granular permission.
   * Handles Super Admin override and custom per-user permissions.
   */
  public static can(user: User | null | undefined, permission: Permission): boolean {
    if (!user) return false;
    if (user.status === 'inactive') return false;
    return checkUserPermission(user, permission);
  }

  /**
   * Evaluates if the authenticated user can access a module.
   * Enforces: Module access does NOT confer action permissions.
   */
  public static canAccessModule(user: User | null | undefined, moduleKey: SystemModuleKey): boolean {
    if (!user) return false;
    if (user.status === 'inactive') return false;
    return checkUserModuleAccess(user, moduleKey);
  }

  /**
   * Evaluates whether a user can perform an action in a specific workflow context.
   * Applies the core sequence:
   * LOGIN -> ROLE -> PERMISSION -> WORKFLOW STATUS -> RECORD OWNERSHIP -> SECURITY RULE
   */
  public static canPerformAction(
    user: User | null | undefined,
    permission: Permission,
    context?: WorkflowRecordContext
  ): WorkflowActionCheckResult {
    if (!user) {
      return { allowed: false, reason: 'Authentication required. Please log in.' };
    }

    if (user.status === 'inactive') {
      return { allowed: false, reason: 'Staff account has been deactivated by Super Administrator.' };
    }

    // Super Admin has unrestricted operational authority
    if (user.role === 'super_admin') {
      return { allowed: true };
    }

    // 1. Basic permission check
    const hasBasePermission = this.can(user, permission);
    if (!hasBasePermission) {
      return {
        allowed: false,
        reason: `Your role (${user.role}) does not have permission '${permission}'.`,
        ruleViolated: 'MISSING_PERMISSION'
      };
    }

    // If no record context, base permission is sufficient
    if (!context) {
      return { allowed: true };
    }

    // 2. Health Card Request Self-Approval Check
    if (
      (permission === 'card_request_approve' || permission === 'card_issue') &&
      context.type === 'card_request'
    ) {
      if (context.submittedBy && (context.submittedBy === user.id || context.submittedBy === user.username)) {
        return {
          allowed: false,
          reason: 'Separation of Duties: You cannot approve or issue a Health Card request you submitted yourself.',
          ruleViolated: 'NO_SELF_APPROVAL'
        };
      }
    }

    // 3. Finalized Diagnostic Report Protection
    if (
      (permission === 'result_enter' || permission === 'lab_order_manage') &&
      context.type === 'report' &&
      context.isFinalized
    ) {
      return {
        allowed: false,
        reason: 'Finalized reports are cryptographically locked. Any corrections require authorized amendment workflow with doctor verification.',
        ruleViolated: 'FINALIZED_REPORT_LOCKED'
      };
    }

    // 4. Financial Record Protection
    if (
      (permission === 'bill_cancel' || permission === 'refund_approve') &&
      context.type === 'bill' &&
      context.status === 'voided'
    ) {
      return {
        allowed: false,
        reason: 'This bill has already been voided/refunded and cannot be modified.',
        ruleViolated: 'RECORD_ALREADY_CLOSED'
      };
    }

    return { allowed: true };
  }

  /**
   * Enforces Record Ownership & Visibility:
   * A user must never access another user's restricted records by changing URL/IDs.
   */
  public static isRecordAccessible(
    user: User | null | undefined,
    record: WorkflowRecordContext,
    requiredLevel: RecordOwnershipLevel = 'own'
  ): boolean {
    if (!user) return false;
    if (user.status === 'inactive') return false;

    // Super Admin & Admin have full organization-wide visibility
    if (user.role === 'super_admin' || user.role === 'admin') {
      return true;
    }

    // Organization level: visible to all authenticated staff if permitted
    if (requiredLevel === 'organization') {
      return true;
    }

    // Restricted level: only explicitly authorized roles
    if (requiredLevel === 'restricted') {
      return false;
    }

    // Own level: User must be the owner, creator, or submitter
    if (requiredLevel === 'own') {
      const isOwner =
        record.ownerId === user.id ||
        record.submittedBy === user.id ||
        record.submittedBy === user.username;
      if (isOwner) return true;

      // If user has view_all permission, grant access
      if (
        (record.type === 'card_request' && this.can(user, 'card_request_view_all')) ||
        (record.type === 'bill' && this.can(user, 'bill_view_all')) ||
        (record.type === 'transaction' && this.can(user, 'card_transactions_view_all'))
      ) {
        return true;
      }

      return false;
    }

    // Department level: Record must match user's department
    if (requiredLevel === 'department') {
      if (user.department && record.department && user.department.toLowerCase() === record.department.toLowerCase()) {
        return true;
      }
      return false;
    }

    // Assigned level: Record assigned to current user
    if (requiredLevel === 'assigned') {
      return (
        record.assignedTo === user.id ||
        record.doctorId === user.id ||
        record.doctorId === user.staffId
      );
    }

    return false;
  }

  /**
   * Enforces Health Card discount override rule:
   * Automatic card discount calculations cannot be manually overridden without explicit permission.
   */
  public static canOverrideDiscount(user: User | null | undefined): boolean {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return this.can(user, 'discount_override');
  }

  /**
   * Enforces self-approval restriction on card applications.
   */
  public static canApproveCardRequest(
    user: User | null | undefined,
    request?: any
  ): boolean {
    if (!user || !request) return false;
    if (user.role === 'super_admin') return true;
    if (!this.can(user, 'card_request_approve')) return false;

    // Disallow approving own request
    const staffId = request.submittedByStaffId || request.staffId || request.submittedByUserId || request.submittedBy;
    const staffName = request.submittedByStaffName;
    const isOwn =
      (staffId && (staffId === user.id || staffId === (user as any).uid || staffId === user.staffId)) ||
      (staffName && user.fullName && staffName.toLowerCase() === user.fullName.toLowerCase());

    return !isOwn;
  }

  /**
   * Audits sensitive workflow actions.
   * Format: User ID -> Staff ID -> Role -> Action -> Record ID -> Timestamp
   */
  public static auditWorkflowAction(params: {
    user: User | null | undefined;
    action: string;
    recordId: string;
    recordType: string;
    details: string;
    metadata?: Record<string, any>;
  }): void {
    const { user, action, recordId, recordType, details, metadata } = params;
    const userId = user?.id || 'unauthenticated';
    const staffId = user?.staffId || 'NO_STAFF_ID';
    const role = user?.role || 'anonymous';

    AuditService.log(
      action.toUpperCase(),
      recordType as any,
      `[Workflow Action: ${action}] by User ${userId} (Staff: ${staffId}, Role: ${role}) on ${recordType} ${recordId}: ${details}`,
      recordId
    );
  }
}
