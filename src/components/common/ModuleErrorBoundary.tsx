import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, LayoutDashboard, ChevronDown, ChevronUp, ShieldAlert, Sparkles } from 'lucide-react';
import { AutoHealingService } from '../../services/autoHealingService';

interface Props {
  children: ReactNode;
  moduleName?: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  retryCount: number;
}

export class ModuleErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
    retryCount: 0
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[LABMEDIX Module Guard] Render irregularity caught in ${this.props.moduleName || 'Workspace Module'}:`, error, errorInfo);

    const errorMessage = error?.message || 'Unknown module render irregularity';

    AutoHealingService.recordHealingEvent({
      subsystem: 'UI',
      severity: 'WARNING',
      issueDescription: `Module [${this.props.moduleName || 'Workspace'}] Error: ${errorMessage.slice(0, 150)}`,
      actionTaken: 'Isolated failure within workspace. Main application, navigation, and user session preserved.',
      recoveredSuccessfully: true
    });

    this.setState({ errorInfo });
  }

  private handleRetry = () => {
    this.setState(prev => ({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      retryCount: prev.retryCount + 1
    }));
  };

  private handleGoDashboard = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.hash = '#/dashboard';
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || 'A transient irregularity occurred while displaying this module.';
      const moduleTitle = this.props.moduleName || 'Workspace Module';

      return (
        <div className="p-6 sm:p-8 max-w-2xl mx-auto my-8 rounded-3xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-500/40 shadow-xl space-y-6 text-slate-800 dark:text-slate-100">
          {/* Header Banner */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-500/40 shadow-md">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60">
              <ShieldAlert className="w-3.5 h-3.5" />
              Module Crash Isolated • Session & Data Safe
            </div>

            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              {moduleTitle} Encountered an Issue
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
              The rest of the hospital application and your central Firestore data remain safe and unaffected. You can retry rendering this view or return to the main dashboard.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Retry Module {this.state.retryCount > 0 ? `(${this.state.retryCount})` : ''}
            </button>

            <button
              type="button"
              onClick={this.handleGoDashboard}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4" />
              Return to Dashboard
            </button>

            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Full Reload
            </button>
          </div>

          {/* Diagnostic Info Toggle */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-center">
            <button
              type="button"
              onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
              className="text-[11px] font-mono text-slate-500 hover:text-slate-700 dark:hover:text-slate-400 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Diagnostic Technical Details</span>
              {this.state.showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {this.state.showDetails && (
              <div className="mt-3 text-left p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-rose-600 dark:text-rose-400 overflow-x-auto max-h-40">
                <p className="font-bold">{errorMessage}</p>
                {this.state.error?.stack && (
                  <pre className="mt-1 whitespace-pre-wrap text-[10px] text-slate-500 leading-normal">
                    {this.state.error.stack.slice(0, 500)}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
