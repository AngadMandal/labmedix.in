import React from 'react';
import { Permission } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { WorkflowPermissionService, WorkflowRecordContext, RecordOwnershipLevel } from '../../services/workflowPermissionService';

export interface ActionGuardProps {
  action: Permission;
  context?: WorkflowRecordContext;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Declarative component for guarding workflow actions.
 * Enforces: Module access does NOT confer action permissions.
 * Example:
 * <ActionGuard action="card_request_approve" context={{ type: 'card_request', submittedBy: req.submittedByUserId }}>
 *    <Button onClick={handleApprove}>Approve</Button>
 * </ActionGuard>
 */
export const ActionGuard: React.FC<ActionGuardProps> = ({
  action,
  context,
  children,
  fallback = null
}) => {
  const { currentUser } = useAuth();
  const check = WorkflowPermissionService.canPerformAction(currentUser, action, context);

  if (!check.allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * Convenient React hook for component logic requiring workflow authorization checks.
 */
export const useWorkflowPermission = () => {
  const { currentUser } = useAuth();

  return {
    currentUser,
    can: (permission: Permission) => WorkflowPermissionService.can(currentUser, permission),
    canAction: (permission: Permission, context?: WorkflowRecordContext) =>
      WorkflowPermissionService.canPerformAction(currentUser, permission, context),
    isRecordAccessible: (record: WorkflowRecordContext, level: RecordOwnershipLevel = 'own') =>
      WorkflowPermissionService.isRecordAccessible(currentUser, record, level),
    canOverrideDiscount: () => WorkflowPermissionService.canOverrideDiscount(currentUser),
    canApproveCardRequest: (request: { submittedByUserId?: string; staffId?: string }) =>
      WorkflowPermissionService.canApproveCardRequest(currentUser, request)
  };
};
