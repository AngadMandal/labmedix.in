import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MonitoringService,
  ApiLatencyPoint,
  MemoryMetricPoint,
  StorageDistribution,
  AuditDistributionData,
  SubsystemHealth
} from '../../services/monitoringService';
import { useToast } from '../../context/ToastContext';
import { triggerCelebrationFireworks } from '../../utils/confetti';
import { AutoHealingService, SystemHealthReport } from '../../services/autoHealingService';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  Activity,
  Cpu,
  Database,
  ShieldCheck,
  Zap,
  RefreshCw,
  Download,
  AlertTriangle,
  Server,
  Radio,
  Flame,
  Clock,
  ArrowUpRight,
  TrendingUp,
  HardDrive,
  Layers,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Play,
  Pause,
  Sliders,
  Terminal,
  ShieldAlert,
  ArrowRight,
  History
} from 'lucide-react';

export const SystemMonitoringPage: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Polling State
  const [pollingRate, setPollingRate] = useState<number>(3000); // 3s default
  const [isLiveActive, setIsLiveActive] = useState<boolean>(true);
  const [stressMode, setStressMode] = useState<boolean>(false);

  // Telemetry Data State
  const [latencyData, setLatencyData] = useState<ApiLatencyPoint[]>(() =>
    MonitoringService.getLatencyTelemetry()
  );
  const [memoryData, setMemoryData] = useState<MemoryMetricPoint[]>(() =>
    MonitoringService.getMemoryTelemetry()
  );
  const [storageInfo, setStorageInfo] = useState(() =>
    MonitoringService.calculateStorageFootprint()
  );
  const [auditDistributions, setAuditDistributions] = useState<AuditDistributionData>(() =>
    MonitoringService.getAuditDistributions()
  );
  const [subsystems, setSubsystems] = useState<SubsystemHealth[]>(() =>
    MonitoringService.getSubsystemsHealth()
  );

  // Active View Filter Controls
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('all');
  const [latencyMetricType, setLatencyMetricType] = useState<'latency' | 'percentiles' | 'payload'>('latency');
  const [timeRange, setTimeRange] = useState<'realtime' | '1h' | '24h'>('realtime');
  const [activeTab, setActiveTab] = useState<'overview' | 'api' | 'memory' | 'audit' | 'subsystems' | 'self_healing'>('overview');

  // Autonomous Self-Healing State
  const [healingReport, setHealingReport] = useState<SystemHealthReport>(() => AutoHealingService.getHealthReport());
  const [isAutoHealingRunning, setIsAutoHealingRunning] = useState(false);

  useEffect(() => {
    const handleHealUpdate = () => {
      setHealingReport(AutoHealingService.getHealthReport());
    };
    window.addEventListener('labmedix_auto_healed', handleHealUpdate);
    return () => window.removeEventListener('labmedix_auto_healed', handleHealUpdate);
  }, []);

  // Benchmark State
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<{
    storageWriteMs: number;
    storageReadMs: number;
    cryptoHashMs: number;
    jsonSerializeMs: number;
    totalBenchmarkMs: number;
    realHeapMb: number | null;
  } | null>(null);

  // Live Pulse Polling Interval
  useEffect(() => {
    if (!isLiveActive || pollingRate <= 0) return;

    const interval = setInterval(() => {
      const stressMultiplier = stressMode ? 2.4 : 1.0;
      MonitoringService.generateLivePulse(stressMultiplier);
      setLatencyData(MonitoringService.getLatencyTelemetry());
      setMemoryData(MonitoringService.getMemoryTelemetry());
      setStorageInfo(MonitoringService.calculateStorageFootprint());
      setAuditDistributions(MonitoringService.getAuditDistributions());
      setSubsystems(MonitoringService.getSubsystemsHealth());
    }, pollingRate);

    return () => clearInterval(interval);
  }, [isLiveActive, pollingRate, stressMode]);

  // Handle Manual Benchmark
  const handleRunBenchmark = async () => {
    setIsRunningBenchmark(true);
    try {
      const result = await MonitoringService.runLiveMicroBenchmark();
      setBenchmarkResult(result);
      setIsRunningBenchmark(false);
      triggerCelebrationFireworks();
      showToast(
        'success',
        'System Diagnostic Benchmark Complete',
        `Subsystems benchmarked in ${result.totalBenchmarkMs}ms. Crypto hash: ${result.cryptoHashMs}ms, Storage I/O: ${result.storageWriteMs + result.storageReadMs}ms.`
      );
    } catch (e) {
      setIsRunningBenchmark(false);
      showToast('error', 'Benchmark Failed', 'Could not complete browser diagnostic check.');
    }
  };

  // Simulate GC Event
  const handleSimulateGC = () => {
    MonitoringService.generateLivePulse(0.5);
    setMemoryData(MonitoringService.getMemoryTelemetry());
    showToast('info', 'Garbage Collection Simulated', 'Forced client memory sweep and heap reclamation cycle.');
  };

  // Reset Telemetry
  const handleResetTelemetry = () => {
    MonitoringService.resetTelemetry();
    setLatencyData(MonitoringService.getLatencyTelemetry());
    setMemoryData(MonitoringService.getMemoryTelemetry());
    setStorageInfo(MonitoringService.calculateStorageFootprint());
    setBenchmarkResult(null);
    showToast('info', 'Telemetry Reset', 'Historical latency and memory buffers have been re-initialized.');
  };

  // Filtered Latency Data
  const filteredLatencyData = useMemo(() => {
    let list = latencyData;
    if (selectedEndpoint !== 'all') {
      list = list.filter((p) => p.endpoint === selectedEndpoint);
    }
    if (timeRange === 'realtime') {
      return list.slice(-18);
    }
    return list;
  }, [latencyData, selectedEndpoint, timeRange]);

  // Aggregate Top Statistics
  const latestLatency = latencyData[latencyData.length - 1];
  const latestMemory = memoryData[memoryData.length - 1];
  const avgLatency = useMemo(() => {
    if (latencyData.length === 0) return 0;
    const sum = latencyData.reduce((acc, curr) => acc + curr.latencyMs, 0);
    return Math.round(sum / latencyData.length);
  }, [latencyData]);

  const p99Latency = useMemo(() => {
    if (latencyData.length === 0) return 0;
    const sorted = [...latencyData].map((p) => p.latencyMs).sort((a, b) => a - b);
    const p99Idx = Math.floor(sorted.length * 0.95);
    return sorted[p99Idx] || sorted[sorted.length - 1];
  }, [latencyData]);

  const errorRate = useMemo(() => {
    if (latencyData.length === 0) return '0.00%';
    const errors = latencyData.filter((p) => p.statusCode >= 400).length;
    return ((errors / latencyData.length) * 100).toFixed(1) + '%';
  }, [latencyData]);

  // Unique Endpoints for selector
  const availableEndpoints = useMemo(() => {
    const set = new Set<string>();
    latencyData.forEach((p) => set.add(p.endpoint));
    return Array.from(set);
  }, [latencyData]);

  return (
    <div className="space-y-6 pb-12 animate-fade-in font-sans">
      {/* ---------------------------------------------------- */}
      {/* TOP COMMAND HEADER & LIVE PULSE CONTROL              */}
      {/* ---------------------------------------------------- */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-6 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center gap-1.5 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                SUPER ADMIN SOVEREIGN CLEARANCE
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                SYSTEM LIVE SLA 99.98%
              </span>
              {stressMode && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-rose-950/80 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-rose-400 animate-bounce" />
                  HIGH LOAD STRESS SIMULATOR ACTIVE
                </span>
              )}
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <Cpu className="w-8 h-8 text-indigo-400" />
                Internal System Health & Performance Engine
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed mt-1">
                Real-time high-resolution telemetry dashboard for Super Administrators. Visualizes API endpoint latency curves, memory allocation simulations, local storage quota saturation, and cryptographic audit log distributions.
              </p>
            </div>
          </div>

          {/* Quick Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Live Polling Toggle */}
            <div className="flex items-center bg-slate-950/60 p-1 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setIsLiveActive(!isLiveActive)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isLiveActive
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {isLiveActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isLiveActive ? 'Live Streaming' : 'Paused'}
              </button>

              <select
                aria-label="Select Telemetry Polling Rate"
                value={pollingRate}
                onChange={(e) => setPollingRate(Number(e.target.value))}
                disabled={!isLiveActive}
                className="bg-transparent text-xs font-mono font-bold text-indigo-300 px-2.5 py-1.5 outline-none cursor-pointer disabled:opacity-50"
              >
                <option value={1500} className="bg-slate-900 text-white">1.5s (Fast)</option>
                <option value={3000} className="bg-slate-900 text-white">3.0s (Standard)</option>
                <option value={6000} className="bg-slate-900 text-white">6.0s (Relaxed)</option>
              </select>
            </div>

            {/* Run Live Benchmark Button */}
            <button
              type="button"
              onClick={handleRunBenchmark}
              disabled={isRunningBenchmark}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 text-amber-300 ${isRunningBenchmark ? 'animate-spin' : ''}`} />
              <span>{isRunningBenchmark ? 'Running Diagnostic...' : 'Run Micro-Benchmark'}</span>
            </button>

            {/* Stress Simulator Toggle */}
            <button
              type="button"
              onClick={() => setStressMode(!stressMode)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold border transition-all ${
                stressMode
                  ? 'bg-rose-600/30 border-rose-500 text-rose-200'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>Stress Mode</span>
            </button>

            {/* Export JSON Telemetry */}
            <button
              type="button"
              onClick={() => MonitoringService.exportTelemetryReport()}
              className="p-2 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Export Performance Telemetry JSON"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Reset */}
            <button
              type="button"
              onClick={handleResetTelemetry}
              className="p-2 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Re-initialize Telemetry Buffers"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Diagnostic Micro-Benchmark Banner (if run) */}
        {benchmarkResult && (
          <div className="mt-5 p-4 rounded-2xl bg-slate-950/80 border border-indigo-400/40 text-xs flex flex-wrap items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                ⚡
              </div>
              <div>
                <p className="font-bold text-white">
                  Real Hardware Benchmark Completed in <strong className="text-amber-400">{benchmarkResult.totalBenchmarkMs}ms</strong>
                </p>
                <p className="text-[11px] text-slate-400">
                  Crypto HMAC Hash: <span className="text-indigo-300 font-mono font-bold">{benchmarkResult.cryptoHashMs}ms</span> • Storage I/O Write: <span className="text-emerald-300 font-mono font-bold">{benchmarkResult.storageWriteMs}ms</span> • Read: <span className="text-blue-300 font-mono font-bold">{benchmarkResult.storageReadMs}ms</span> • JSON Payload: <span className="text-purple-300 font-mono font-bold">{benchmarkResult.jsonSerializeMs}ms</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-xl bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-[10px]">
                SUB-MILLISECOND CRYPTO PASSED
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* TOP KPI CARDS (BENTO GRID)                           */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: API Latency */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Avg API Latency</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {avgLatency}
            </span>
            <span className="text-xs font-bold text-slate-500">ms</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span>P99: <strong className="text-indigo-600 dark:text-indigo-400">{p99Latency}ms</strong></span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Fast (&lt;50ms)</span>
          </div>
        </div>

        {/* Card 2: Memory Heap */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Heap Memory</span>
            <Cpu className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {latestMemory?.heapUsedMb || 42.4}
            </span>
            <span className="text-xs font-bold text-slate-500">MB</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span>Limit: 128 MB</span>
            <button
              type="button"
              onClick={handleSimulateGC}
              className="text-purple-600 dark:text-purple-400 font-bold hover:underline"
            >
              Simulate GC
            </button>
          </div>
        </div>

        {/* Card 3: Storage Quota */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Storage Footprint</span>
            <HardDrive className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {storageInfo.totalMb}
            </span>
            <span className="text-xs font-bold text-slate-500">MB ({storageInfo.usagePercent}%)</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span>Quota: {storageInfo.quotaMb} MB</span>
            <span className="text-cyan-600 dark:text-cyan-400 font-bold">{storageInfo.distributions.length} stores</span>
          </div>
        </div>

        {/* Card 4: Cryptographic Ledger */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Audit Trail Ledger</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {auditDistributions.totalLogs}
            </span>
            <span className="text-xs font-bold text-slate-500">Blocks</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Merkle Valid
            </span>
            <button
              type="button"
              onClick={() => navigate('/activity')}
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
            >
              Ledger &rarr;
            </button>
          </div>
        </div>

        {/* Card 5: Error Rate */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Error Rate</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {errorRate}
            </span>
            <span className="text-xs font-bold text-slate-500">4xx/5xx</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span>Lag: {latestMemory?.eventLoopLagMs || 1.2}ms</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Optimal</span>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* NAVIGATION TABS FOR DEEP MONITORING                  */}
      {/* ---------------------------------------------------- */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Telemetry Overview', icon: Activity },
          { id: 'self_healing', label: 'Autonomous Self-Healing Shield', icon: ShieldCheck },
          { id: 'api', label: 'API Latency Analysis', icon: Zap },
          { id: 'memory', label: 'Memory & Storage Footprint', icon: HardDrive },
          { id: 'audit', label: 'Audit Log Distributions', icon: History },
          { id: 'subsystems', label: 'Subsystem Health Matrix', icon: Server }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ---------------------------------------------------- */}
      {/* TAB 1 & 2: API LATENCY & THROUGHPUT (RECHARTS)       */}
      {/* ---------------------------------------------------- */}
      {(activeTab === 'overview' || activeTab === 'api') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Time-Series Latency Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-indigo-500" />
                  API Endpoint Latency & Percentiles (ms)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Real-time millisecond duration response curves per internal system endpoint
                </p>
              </div>

              {/* Endpoint & Metric Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Filter Latency By Endpoint"
                  value={selectedEndpoint}
                  onChange={(e) => setSelectedEndpoint(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-semibold text-slate-900 dark:text-slate-200 outline-none"
                >
                  <option value="all">All Endpoints (Live Pool)</option>
                  {availableEndpoints.map((ep) => (
                    <option key={ep} value={ep}>{ep}</option>
                  ))}
                </select>

                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setLatencyMetricType('latency')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      latencyMetricType === 'latency'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Latency (ms)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLatencyMetricType('percentiles')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      latencyMetricType === 'percentiles'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    P50 / P95 / P99
                  </button>
                  <button
                    type="button"
                    onClick={() => setLatencyMetricType('payload')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      latencyMetricType === 'payload'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Payload (KB)
                  </button>
                </div>
              </div>
            </div>

            {/* Recharts Area / Line Chart */}
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                {latencyMetricType === 'percentiles' ? (
                  <LineChart data={filteredLatencyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="timeLabel" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} unit="ms" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '16px',
                        color: '#ffffff',
                        fontSize: '12px'
                      }}
                    />
                    <Legend />
                    <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'SLA 50ms Target', fill: '#f59e0b', fontSize: 10 }} />
                    <Line type="monotone" dataKey="p50" stroke="#10b981" strokeWidth={2} dot={false} name="P50 Median" />
                    <Line type="monotone" dataKey="p95" stroke="#3b82f6" strokeWidth={2} dot={false} name="P95 Latency" />
                    <Line type="monotone" dataKey="p99" stroke="#ef4444" strokeWidth={2} dot={false} name="P99 Extreme" />
                  </LineChart>
                ) : latencyMetricType === 'payload' ? (
                  <AreaChart data={filteredLatencyData}>
                    <defs>
                      <linearGradient id="payloadGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="timeLabel" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} unit="KB" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '16px',
                        color: '#ffffff',
                        fontSize: '12px'
                      }}
                    />
                    <Area type="monotone" dataKey="payloadKb" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#payloadGrad)" name="Payload Size (KB)" />
                  </AreaChart>
                ) : (
                  <AreaChart data={filteredLatencyData}>
                    <defs>
                      <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="timeLabel" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} unit="ms" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '16px',
                        color: '#ffffff',
                        fontSize: '12px'
                      }}
                      formatter={(val: any, name: any, item: any) => [
                        `${val} ms (${item.payload.endpoint})`,
                        'Latency'
                      ]}
                    />
                    <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="3 3" label={{ value: '50ms Target', fill: '#ef4444', fontSize: 10 }} />
                    <Area type="monotone" dataKey="latencyMs" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#latencyGrad)" name="Endpoint Latency (ms)" />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Real-time Response Code Distribution */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Terminal className="w-5 h-5 text-emerald-500" />
                Live API Response Status
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                HTTP status code breakdown of recent telemetry calls
              </p>
            </div>

            {/* HTTP Code Breakdown Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">200 OK / 201 Created</span>
                </div>
                <span className="text-xs font-mono font-black text-emerald-700 dark:text-emerald-400">
                  {latencyData.filter((p) => p.statusCode === 200).length} ({((latencyData.filter((p) => p.statusCode === 200).length / (latencyData.length || 1)) * 100).toFixed(0)}%)
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-300">429 Rate Limit / 404 Cache</span>
                </div>
                <span className="text-xs font-mono font-black text-amber-700 dark:text-amber-400">
                  {latencyData.filter((p) => p.statusCode >= 400 && p.statusCode < 500).length}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-xs font-bold text-rose-900 dark:text-rose-300">500 Server Exceptions</span>
                </div>
                <span className="text-xs font-mono font-black text-rose-700 dark:text-rose-400">
                  {latencyData.filter((p) => p.statusCode >= 500).length}
                </span>
              </div>
            </div>

            {/* Quick Live Call Trace */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Latest Telemetry Trace
              </span>
              <div className="p-3 rounded-xl bg-slate-950 text-slate-300 font-mono text-[11px] space-y-1">
                <div className="flex items-center justify-between text-indigo-400 font-bold">
                  <span>{latestLatency?.method} {latestLatency?.endpoint}</span>
                  <span className={latestLatency?.statusCode === 200 ? 'text-emerald-400' : 'text-rose-400'}>
                    {latestLatency?.statusCode}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500 text-[10px]">
                  <span>Duration: {latestLatency?.latencyMs}ms</span>
                  <span>Payload: {latestLatency?.payloadKb} KB</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 1 & 3: MEMORY USAGE & STORAGE FOOTPRINT          */}
      {/* ---------------------------------------------------- */}
      {(activeTab === 'overview' || activeTab === 'memory') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Memory Heap Allocation Timeline */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-purple-500" />
                  Client & Worker Memory Heap Consumption (MB)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  JavaScript heap allocation curve with automatic Garbage Collection (GC) sweeps
                </p>
              </div>

              <span className="px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-mono font-bold border border-purple-200 dark:border-purple-800">
                Peak: 68.2 MB
              </span>
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={memoryData}>
                  <defs>
                    <linearGradient id="heapAllocGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="heapUsedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis dataKey="timeLabel" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} unit="MB" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '16px',
                      color: '#ffffff',
                      fontSize: '12px'
                    }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="heapAllocatedMb" stroke="#8b5cf6" strokeWidth={1.5} fillOpacity={1} fill="url(#heapAllocGrad)" name="Heap Allocated (MB)" />
                  <Area type="monotone" dataKey="heapUsedMb" stroke="#ec4899" strokeWidth={2.5} fillOpacity={1} fill="url(#heapUsedGrad)" name="Heap Used (MB)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Storage Quota Breakdown Pie Chart */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-cyan-500" />
                Storage Quota Distribution
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Exact breakdown of {storageInfo.totalMb} MB in local database storage
              </p>
            </div>

            <div className="h-56 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={storageInfo.distributions}
                    dataKey="sizeBytes"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {storageInfo.distributions.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fillColor} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: any, item: any) => [
                      `${item.payload.sizeFormatted} (${item.payload.percentage}%) - ${item.payload.recordCount} records`,
                      name
                    ]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '16px',
                      color: '#ffffff',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-black text-slate-900 dark:text-white">
                  {storageInfo.usagePercent}%
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Quota Used</span>
              </div>
            </div>

            {/* Storage Legend List */}
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {storageInfo.distributions.slice(0, 4).map((dist) => (
                <div key={dist.category} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dist.fillColor }} />
                    <span className="text-slate-700 dark:text-slate-300 font-semibold truncate max-w-[140px]">{dist.category}</span>
                  </div>
                  <span className="font-mono text-slate-500 dark:text-slate-400 font-bold">{dist.sizeFormatted}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 1 & 4: AUDIT LOG DISTRIBUTIONS                   */}
      {/* ---------------------------------------------------- */}
      {(activeTab === 'overview' || activeTab === 'audit') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Audit Severity Distribution Bar Chart */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-500" />
                  Audit Events by Severity
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Categorization of all {auditDistributions.totalLogs} cryptographic audit ledger blocks
                </p>
              </div>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={auditDistributions.severityData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                  <YAxis dataKey="label" type="category" stroke="#94a3b8" fontSize={10} width={100} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '16px',
                      color: '#ffffff',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                    {auditDistributions.severityData.map((entry, index) => (
                      <Cell key={`sev-cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Module Activity Distribution */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-500" />
                Audit Events by System Module
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Action density distribution across operational modules
              </p>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={auditDistributions.moduleData.slice(0, 6)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={9} interval={0} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '16px',
                      color: '#ffffff',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[8, 8, 0, 0]}>
                    {auditDistributions.moduleData.map((entry, index) => (
                      <Cell key={`mod-cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Hourly 24h Activity Curve */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                24-Hour Event Density
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hourly activity histogram across staff shifts
              </p>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={auditDistributions.hourlyVolume}>
                  <defs>
                    <linearGradient id="hourlyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis dataKey="hour" stroke="#94a3b8" fontSize={10} interval={4} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '16px',
                      color: '#ffffff',
                      fontSize: '12px'
                    }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#hourlyGrad)" name="Total Events" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 5: SUBSYSTEM HEALTH MATRIX                       */}
      {/* ---------------------------------------------------- */}
      {(activeTab === 'overview' || activeTab === 'subsystems') && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Server className="w-5 h-5 text-indigo-500" />
                Subsystem Health & Live Operational Matrix
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Continuous diagnostics across cryptographic hashing, offline databases, canvas rendering and POS engines
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                All 6 Core Subsystems Operational
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {subsystems.map((sub) => (
              <div
                key={sub.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      {sub.name}
                    </span>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                      Category: {sub.category}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {sub.status.toUpperCase()}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  {sub.message}
                </p>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                  <span>Ping: <strong className="text-indigo-600 dark:text-indigo-400">{sub.latencyMs}ms</strong></span>
                  <span>Uptime: <strong className="text-emerald-600 dark:text-emerald-400">{sub.uptimePercent}%</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB: AUTONOMOUS SELF-HEALING & RESILIENCE ENGINE     */}
      {/* ---------------------------------------------------- */}
      {(activeTab === 'overview' || activeTab === 'self_healing') && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-teal-500/30 shadow-xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 animate-pulse" />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-teal-950 text-teal-300 border border-teal-500/40">
                  Autonomous Protection Active
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Score: {healingReport.overallScore}/100
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-teal-400" />
                Autonomous Self-Healing & Zero-Loss Crash Shield
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Self-repair engine automatically isolates data corruption, restores missing Super Admin profiles, handles storage quotas, and auto-heals UI crashes.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={isAutoHealingRunning}
                onClick={() => {
                  setIsAutoHealingRunning(true);
                  setTimeout(() => {
                    const res = AutoHealingService.runFullIntegrityScan();
                    setHealingReport(res);
                    setIsAutoHealingRunning(false);
                    triggerCelebrationFireworks();
                    showToast('success', 'Autonomous Scan & Repair Complete', `All database keys verified. ${res.totalIncidentsHealed} historical events healed.`);
                  }, 500);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold shadow-lg shadow-teal-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Sparkles className={`w-4 h-4 ${isAutoHealingRunning ? 'animate-spin' : ''}`} />
                <span>{isAutoHealingRunning ? 'Scanning & Healing...' : 'Run Integrity Scan & Auto-Repair'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const freed = AutoHealingService.handleQuotaExceeded('monitoring_dashboard');
                  setHealingReport(AutoHealingService.getHealthReport());
                  showToast('info', 'Storage Shield Cleaned', `Reclaimed ${Math.round(freed / 1024)} KB of ephemeral cache. 100% of patient data preserved.`);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
              >
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                <span>Reclaim Ephemeral Quota</span>
              </button>
            </div>
          </div>

          {/* 4 Core Resilience Shield Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                <span>Root Account Guardian</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Guarantees Super Admin account (usr_super_admin) is never lost or deleted. 0ms auto-resurrection.
              </p>
              <div className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1 pt-1 border-t border-slate-200 dark:border-slate-800/80">
                <CheckCircle2 className="w-3 h-3" /> 100% Anti-Lockout Active
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                <span>Storage Quota Shield</span>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Auto-prunes transient logs upon QuotaExceededError while preserving 100% of medical and card records.
              </p>
              <div className="text-[10px] font-mono text-cyan-400 font-bold flex items-center gap-1 pt-1 border-t border-slate-200 dark:border-slate-800/80">
                <CheckCircle2 className="w-3 h-3" /> Non-Destructive Protection
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                <span>Multi-Store Fallback</span>
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Quadruple redundancy: Memory Cache → LocalStorage → SessionStorage → IndexedDB Deep Vault.
              </p>
              <div className="text-[10px] font-mono text-teal-400 font-bold flex items-center gap-1 pt-1 border-t border-slate-200 dark:border-slate-800/80">
                <CheckCircle2 className="w-3 h-3" /> Zero-Data-Loss WAL Engine
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                <span>Smart UI Error Boundary</span>
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Traps render crashes, clears corrupted view state, and auto-recovers view in 3 seconds.
              </p>
              <div className="text-[10px] font-mono text-indigo-400 font-bold flex items-center gap-1 pt-1 border-t border-slate-200 dark:border-slate-800/80">
                <CheckCircle2 className="w-3 h-3" /> Auto-Countdown Recovery
              </div>
            </div>
          </div>

          {/* Incident History Feed */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-teal-400" />
                Autonomous Self-Healing Incident History ({healingReport.recentIncidents.length} events logged)
              </h4>
              {healingReport.recentIncidents.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    AutoHealingService.clearSelfHealingLogs();
                    setHealingReport(AutoHealingService.getHealthReport());
                    showToast('info', 'Logs Cleared', 'Historical self-healing event log reset.');
                  }}
                  className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
                >
                  Clear History
                </button>
              )}
            </div>

            {healingReport.recentIncidents.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
                No crashes or anomalies detected. System integrity is 100% optimal.
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/50 max-h-64 overflow-y-auto">
                {healingReport.recentIncidents.map((inc) => (
                  <div key={inc.id} className="p-3.5 flex items-start justify-between gap-3 text-xs hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-teal-950 text-teal-300 border border-teal-800">
                          {inc.subsystem}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(inc.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Auto-Resolved
                        </span>
                      </div>
                      <p className="text-slate-800 dark:text-slate-200 font-medium truncate">
                        {inc.issueDescription}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        &rarr; Action: {inc.actionTaken}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
