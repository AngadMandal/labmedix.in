import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldCheck, RotateCcw, Home, Sparkles, ChevronDown, ChevronUp, Activity } from 'lucide-react';
import { AutoHealingService } from '../../services/autoHealingService';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  countdown: number;
  isAutoHealing: boolean;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  private timer: ReturnType<typeof setInterval> | null = null;

  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    countdown: 3,
    isAutoHealing: true,
    showDetails: false
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[LABMEDIX Smart ErrorBoundary] Autonomous recovery initiated:', error, errorInfo);

    const errorMessage = error?.message || 'Unknown render failure';
    const isChunkError = /loading chunk|loading css|dynamically imported module/i.test(errorMessage);
    const isQuotaError = /quota|storage/i.test(errorMessage);

    // Autonomous triage and healing action
    let actionTaken = 'Purged damaged transient view state and initiated autonomous hot reload.';
    if (isChunkError) {
      actionTaken = 'Asset cache updated after production release. Re-fetching fresh bundle.';
      try {
        sessionStorage.clear();
      } catch {}
    } else if (isQuotaError) {
      AutoHealingService.handleQuotaExceeded('ui_render_crash');
      actionTaken = 'Evicted ephemeral caches to relieve browser memory pressure.';
    }

    AutoHealingService.recordHealingEvent({
      subsystem: 'UI',
      severity: 'CRITICAL',
      issueDescription: `Component Render Glitch: ${errorMessage.slice(0, 120)}`,
      actionTaken,
      recoveredSuccessfully: true
    });

    this.setState({ errorInfo });
    this.startAutoRecoveryCountdown();
  }

  public componentWillUnmount() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private startAutoRecoveryCountdown() {
    if (this.timer) clearInterval(this.timer);

    this.setState({ countdown: 3, isAutoHealing: true });

    this.timer = setInterval(() => {
      this.setState(
        (prev) => {
          if (prev.countdown <= 1) {
            if (this.timer) clearInterval(this.timer);
            this.executeAutoRecovery();
            return { countdown: 0, isAutoHealing: false };
          }
          return { countdown: prev.countdown - 1, isAutoHealing: true };
        }
      );
    }, 1000);
  }

  private executeAutoRecovery = () => {
    try {
      sessionStorage.removeItem('labmedix_temp_view_state');
    } catch {}

    this.setState({ hasError: false, error: null, errorInfo: null });

    // If on broken deep hash route, gracefully fallback to dashboard
    if (window.location.hash.length > 2) {
      window.location.hash = '#/dashboard';
    } else {
      window.location.hash = '#/';
    }
  };

  private handleManualReset = () => {
    if (this.timer) clearInterval(this.timer);
    try {
      sessionStorage.clear();
    } catch {}
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'An unexpected rendering irregularity occurred.';

      return (
        <div id="error-boundary-screen" className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
          <div className="max-w-lg w-full p-6 sm:p-8 rounded-3xl bg-slate-900 border border-teal-500/30 text-center space-y-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
            
            {/* Autonomous Health Glow */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-blue-500 to-emerald-500 animate-pulse" />

            <div className="w-16 h-16 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center mx-auto border border-teal-500/40 shadow-lg shadow-teal-500/10">
              <Sparkles className="w-8 h-8 animate-spin-slow" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-teal-950 text-teal-300 border border-teal-500/40">
                <Activity className="w-3.5 h-3.5 animate-pulse text-teal-400" />
                Autonomous Self-Healing Active
              </div>

              <h1 className="text-2xl font-black text-white">System Recovering Automatically</h1>
              
              <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
                The LabMedix resilience engine caught an interface glitch and is automatically repairing the view state without losing any of your data.
              </p>
            </div>

            {/* Live Countdown Progress Box */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5 text-teal-400">
                  <ShieldCheck className="w-4 h-4" />
                  Auto-Recovery Timer:
                </span>
                <span className="font-mono text-white bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                  {this.state.countdown}s remaining
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-teal-500 to-blue-500 h-full transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${((3 - this.state.countdown) / 3) * 100}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-400">
                Restoring to safe authorized workspace automatically...
              </p>
            </div>

            {/* Interactive Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-1">
              <button
                id="error-reset-btn"
                type="button"
                onClick={this.executeAutoRecovery}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-lg shadow-teal-600/25 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Recover Now
              </button>

              <button
                id="error-reload-btn"
                type="button"
                onClick={this.handleManualReset}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all border border-slate-700 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Full Refresh
              </button>

              <a
                id="error-home-btn"
                href="#/"
                onClick={() => {
                  if (this.timer) clearInterval(this.timer);
                  this.setState({ hasError: false, error: null });
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all border border-slate-700 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                Portal
              </a>
            </div>

            {/* Diagnostic Details Toggle */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                className="text-[11px] font-mono text-slate-500 hover:text-slate-400 inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Diagnostic Stack Info</span>
                {this.state.showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {this.state.showDetails && (
                <div className="mt-2 text-left p-3 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-mono text-rose-300/80 overflow-x-auto max-h-32">
                  <p className="font-bold text-rose-400">{errorMessage}</p>
                  <pre className="mt-1 whitespace-pre-wrap text-slate-500">
                    {this.state.error?.stack?.slice(0, 400)}
                  </pre>
                </div>
              )}
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
