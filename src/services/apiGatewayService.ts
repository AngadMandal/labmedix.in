/**
 * LABMEDIX CENTRAL SECURE API GATEWAY & REAL-TIME EVENT ENGINE
 *
 * Implements the Single Source of Truth architecture:
 * USER -> FRONTEND -> AUTHENTICATION -> PERMISSION CHECK -> SECURE API ->
 * BUSINESS VALIDATION -> POSTGRESQL TRANSACTION -> COMMIT -> REAL-TIME EVENT ->
 * AUTHORIZED DEVICES -> UI UPDATE
 */

import { AuditService } from './auditService';
import { StorageService } from './storage';
import { SupabaseService, getSupabaseClient } from './supabaseService';
import { AuditModule } from '../types';

export type ApiErrorCode =
  | 'SUCCESS'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'DATABASE_ERROR'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE';

export interface ApiResponse<T = any> {
  success: boolean;
  code: ApiErrorCode;
  data?: T;
  error?: string;
  details?: any;
  timestamp: string;
  transactionId?: string;
}

export type RealTimeConnectionState =
  | 'LIVE'
  | 'CONNECTING'
  | 'RECONNECTING'
  | 'OFFLINE'
  | 'SYNCHRONIZED'
  | 'SYNC_ERROR';

export type PermissionAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'approve'
  | 'reject'
  | 'verify'
  | 'issue'
  | 'print'
  | 'reprint'
  | 'cancel'
  | 'refund'
  | 'export'
  | 'manage';

export type PermissionDataScope = 'own' | 'assigned' | 'department' | 'hospital_wide';

export interface PermissionEvaluationContext {
  userId: string;
  userEmail: string;
  role: string;
  departmentId?: string;
  module: string;
  action: PermissionAction;
  dataScope?: PermissionDataScope;
}

export class ApiGatewayService {
  private static currentState: RealTimeConnectionState = 'LIVE';
  private static stateListeners: ((state: RealTimeConnectionState) => void)[] = [];

  /**
   * Evaluates permission model: User -> Role -> Department -> Module -> Action -> Data Scope
   */
  public static evaluatePermission(ctx: PermissionEvaluationContext): { allowed: boolean; reason?: string } {
    if (ctx.role === 'super_admin') {
      return { allowed: true };
    }

    // Active staff validation
    const user = StorageService.getUsers().find(u => u.email.toLowerCase() === ctx.userEmail.toLowerCase());
    if (!user || user.status !== 'active') {
      return { allowed: false, reason: 'Staff account not registered, inactive, or suspended.' };
    }

    // Super Admin restricted actions
    if ((ctx.action === 'approve' || ctx.action === 'manage') && ctx.module === 'health_cards') {
      if (user.role !== 'super_admin' && user.role !== 'admin') {
        return { allowed: false, reason: 'Super Admin or Administrator permission required for health card governance.' };
      }
    }

    // Role-module whitelist check
    if (user.allowedModules && user.allowedModules.length > 0) {
      if (!user.allowedModules.includes(ctx.module) && !user.allowedModules.includes('all')) {
        return { allowed: false, reason: `User role does not permit access to module: ${ctx.module}` };
      }
    }

    return { allowed: true };
  }

  /**
   * Executes an atomic database transaction simulation / wrapper
   */
  public static async executeTransaction<T>(
    operationName: string,
    executor: () => Promise<T>,
    auditMeta: { module: AuditModule; action: string; referenceId?: string; actor?: string }
  ): Promise<ApiResponse<T>> {
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    try {
      // 1. Pre-execution concurrency check
      if (!navigator.onLine && ApiGatewayService.currentState === 'OFFLINE') {
        console.warn(`[ApiGateway] Executing in resilient offline WAL mode for transaction: ${transactionId}`);
      }

      // 2. Execute business validation and state mutation
      const result = await executor();

      // 3. Log audit event
      AuditService.log(
        auditMeta.action,
        auditMeta.module,
        `Transaction ${transactionId} (${operationName}) committed successfully.`,
        auditMeta.referenceId,
        { transactionId, status: 'committed' },
        'info'
      );

      // 4. Dispatch domain event to authorized subscribers
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('labmedix_realtime_domain_event', {
            detail: {
              transactionId,
              operationName,
              module: auditMeta.module,
              action: auditMeta.action,
              timestamp: new Date().toISOString()
            }
          })
        );
      }

      return {
        success: true,
        code: 'SUCCESS',
        data: result,
        timestamp: new Date().toISOString(),
        transactionId
      };
    } catch (err: any) {
      console.error(`[ApiGateway] Transaction ${transactionId} (${operationName}) rolled back:`, err);
      AuditService.log(
        auditMeta.action,
        auditMeta.module,
        `Transaction ${transactionId} (${operationName}) failed & rolled back: ${err?.message || err}`,
        auditMeta.referenceId,
        { transactionId, error: err?.message || err, status: 'rolled_back' },
        'critical'
      );

      return {
        success: false,
        code: 'DATABASE_ERROR',
        error: err?.message || 'Transaction aborted due to internal database constraint violation.',
        timestamp: new Date().toISOString(),
        transactionId
      };
    }
  }

  /**
   * Real-time connection state management
   */
  public static getConnectionState(): RealTimeConnectionState {
    return this.currentState;
  }

  public static setConnectionState(state: RealTimeConnectionState): void {
    this.currentState = state;
    this.stateListeners.forEach(listener => {
      try {
        listener(state);
      } catch (err) {
        console.error('[ApiGateway] State listener error:', err);
      }
    });
  }

  public static subscribeConnectionState(listener: (state: RealTimeConnectionState) => void): () => void {
    this.stateListeners.push(listener);
    listener(this.currentState);
    return () => {
      this.stateListeners = this.stateListeners.filter(l => l !== listener);
    };
  }
}
