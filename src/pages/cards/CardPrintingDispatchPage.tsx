import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CardDispatchRecord,
  CardPrintStatus,
  CardDispatchStatus,
  CardCourierPartner,
  CardDispatchPriority,
  CardDispatchBatch
} from '../../types';
import { CardDispatchService, DispatchRecommendation } from '../../services/cardDispatchService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { CardShippingLabelModal } from '../../components/card/CardShippingLabelModal';
import { CardDispatchDetailsModal } from '../../components/card/CardDispatchDetailsModal';
import { CardQcScannerModal } from '../../components/card/CardQcScannerModal';
import { CardBatchManifestModal } from '../../components/card/CardBatchManifestModal';
import { CardManualDispatchModal } from '../../components/card/CardManualDispatchModal';
import {
  Truck,
  Printer,
  ShieldCheck,
  Package,
  Layers,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  FileSpreadsheet,
  QrCode,
  MapPin,
  MessageSquare,
  ArrowRight,
  Eye,
  CheckSquare,
  Square,
  Copy
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';

export const CardPrintingDispatchPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [records, setRecords] = useState<CardDispatchRecord[]>([]);
  const [recommendations, setRecommendations] = useState<DispatchRecommendation[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrintStatus, setSelectedPrintStatus] = useState<string>('all');
  const [selectedDispatchStatus, setSelectedDispatchStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedCourier, setSelectedCourier] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');

  // Modals
  const [activeLabelRecord, setActiveLabelRecord] = useState<CardDispatchRecord | null>(null);
  const [activeLabelRecords, setActiveLabelRecords] = useState<CardDispatchRecord[]>([]);
  const [activeDetailsRecord, setActiveDetailsRecord] = useState<CardDispatchRecord | null>(null);
  const [activeQcRecord, setActiveQcRecord] = useState<CardDispatchRecord | null>(null);
  const [isBatchManifestOpen, setIsBatchManifestOpen] = useState(false);
  const [isManualDispatchOpen, setIsManualDispatchOpen] = useState(false);

  const loadData = () => {
    const list = CardDispatchService.getAll();
    setRecords(list);
    setRecommendations(CardDispatchService.getRecommendedActions());
  };

  useEffect(() => {
    loadData();

    const handleSync = () => {
      loadData();
    };

    window.addEventListener('labmedix_data_synced', handleSync);
    return () => window.removeEventListener('labmedix_data_synced', handleSync);
  }, []);

  const handleSyncCards = () => {
    const res = CardDispatchService.syncAllActiveCards();
    loadData();
    if (res.added > 0) {
      showToast('success', `Synchronized ${res.added} new cards into dispatch pipeline!`);
    } else {
      showToast('info', 'All active health cards are already in the dispatch queue');
    }
  };

  // KPI Metrics Calculation
  const metrics = useMemo(() => {
    const total = records.length;
    const pendingPrint = records.filter(r => r.printStatus === 'pending_print').length;
    const printed = records.filter(r => r.printStatus === 'printed').length;
    const qcPassed = records.filter(r => r.printStatus === 'qc_passed').length;
    const inTransit = records.filter(r => r.dispatchStatus === 'in_transit' || r.dispatchStatus === 'out_for_delivery').length;
    const delivered = records.filter(r => r.dispatchStatus === 'delivered').length;
    const urgent = records.filter(r => r.priority === 'urgent' || r.priority === 'high').length;

    return { total, pendingPrint, printed, qcPassed, inTransit, delivered, urgent };
  }, [records]);

  // Courier counts for carrier pills
  const courierCounts = useMemo(() => {
    const counts: Record<string, number> = {
      speed_post: 0,
      bluedart: 0,
      delhivery: 0,
      dtdc: 0,
      executive_hand: 0
    };
    records.forEach(r => {
      counts[r.courierPartner] = (counts[r.courierPartner] || 0) + 1;
    });
    return counts;
  }, [records]);

  // District list for filter
  const districts = useMemo(() => {
    const distSet = new Set<string>();
    records.forEach(r => {
      if (r.address?.district) distSet.add(r.address.district);
    });
    return Array.from(distSet);
  }, [records]);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = r.patientName.toLowerCase().includes(query);
        const matchesCard = r.cardNumber.toLowerCase().includes(query);
        const matchesAWB = r.consignmentNo.toLowerCase().includes(query);
        const matchesMobile = r.patientMobile.includes(query);
        const matchesPin = r.address?.pinCode?.includes(query);
        if (!matchesName && !matchesCard && !matchesAWB && !matchesMobile && !matchesPin) {
          return false;
        }
      }

      // Print status
      if (selectedPrintStatus !== 'all' && r.printStatus !== selectedPrintStatus) {
        return false;
      }

      // Dispatch status
      if (selectedDispatchStatus !== 'all' && r.dispatchStatus !== selectedDispatchStatus) {
        return false;
      }

      // Priority
      if (selectedPriority !== 'all' && r.priority !== selectedPriority) {
        return false;
      }

      // Courier
      if (selectedCourier !== 'all' && r.courierPartner !== selectedCourier) {
        return false;
      }

      // District
      if (selectedDistrict !== 'all' && r.address?.district !== selectedDistrict) {
        return false;
      }

      return true;
    });
  }, [records, searchQuery, selectedPrintStatus, selectedDispatchStatus, selectedPriority, selectedCourier, selectedDistrict]);

  // Selection handlers
  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRecords.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRecords.map(r => r.id)));
    }
  };

  // Batch Print Action
  const handleBatchPrint = () => {
    if (selectedIds.size === 0) return;
    const count = CardDispatchService.batchMarkAsPrinted(
      Array.from(selectedIds),
      currentUser?.fullName || 'Batch Operator',
      'cr80_pvc'
    );
    loadData();
    setSelectedIds(new Set());
    showToast('success', `Marked ${count} selected cards as printed!`);
  };

  // Recommendation Click Handler
  const handleApplyRecommendation = (rec: DispatchRecommendation) => {
    if (rec.type === 'a4_batch_ready') {
      navigate('/cards/print-sheet');
      return;
    }
    if (rec.id === 'rec-speed-post-labels' && rec.recordIds.length > 0) {
      const recs = records.filter(r => rec.recordIds.includes(r.id));
      if (recs.length > 0) {
        setActiveLabelRecord(recs[0]);
        setActiveLabelRecords(recs);
        showToast('info', 'Speed Post Batch Ready', `Loaded ${recs.length} India Post Speed Post labels ready to print.`);
        return;
      }
    }
    if (rec.filterParam) {
      if (rec.filterParam.printStatus) setSelectedPrintStatus(rec.filterParam.printStatus);
      if (rec.filterParam.dispatchStatus) setSelectedDispatchStatus(rec.filterParam.dispatchStatus);
      if (rec.filterParam.priority) setSelectedPriority(rec.filterParam.priority);
      if (rec.filterParam.district) setSelectedDistrict(rec.filterParam.district);
      if (rec.filterParam.courier) setSelectedCourier(rec.filterParam.courier);
    }
    if (rec.recordIds.length > 0) {
      setSelectedIds(new Set(rec.recordIds));
    }
    showToast('info', `Applied recommendation filter: ${rec.title}`);
  };

  const getPrintBadge = (status: CardPrintStatus) => {
    switch (status) {
      case 'pending_print':
        return <Badge variant="warning" size="sm">Pending Print</Badge>;
      case 'in_print_queue':
        return <Badge variant="info" size="sm">Printing...</Badge>;
      case 'printed':
        return <Badge variant="neutral" size="sm">Printed (Need QC)</Badge>;
      case 'laminated':
        return <Badge variant="blue" size="sm">Laminated</Badge>;
      case 'qc_passed':
        return <Badge variant="purple" size="sm">QC Passed</Badge>;
      case 'qc_failed':
        return <Badge variant="danger" size="sm">QC Failed</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  const getDispatchBadge = (status: CardDispatchStatus) => {
    switch (status) {
      case 'queued':
        return <Badge variant="neutral" size="sm">Queued</Badge>;
      case 'packaged':
        return <Badge variant="warning" size="sm">Packaged</Badge>;
      case 'in_transit':
        return <Badge variant="info" size="sm">In Transit</Badge>;
      case 'out_for_delivery':
        return <Badge variant="purple" size="sm">Out for Delivery</Badge>;
      case 'delivered':
        return <Badge variant="success" size="sm">Delivered</Badge>;
      case 'returned':
        return <Badge variant="danger" size="sm">Returned</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  const selectedRecordsList = useMemo(() => {
    return records.filter(r => selectedIds.has(r.id));
  }, [records, selectedIds]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Card Printing & Doorstep Dispatch Hub
            </h1>
            <span className="bg-brand-blue/10 text-brand-blue text-xs font-black px-2.5 py-0.5 rounded-full border border-brand-blue/20">
              CR80 PVC & Logistics
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            End-to-end PVC smart card thermal production queue, contactless NFC chip QA, batch printing & live courier dispatch management.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncCards}
            className="gap-1.5 shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
            Sync Active Cards
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/cards/print-sheet')}
            className="gap-1.5 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 hover:bg-blue-50"
          >
            <Layers className="w-4 h-4" />
            A4 8-Card Sheet
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/card-studio')}
            className="gap-1.5 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800 hover:bg-purple-50"
          >
            <Printer className="w-4 h-4" />
            Live Card Studio
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsManualDispatchOpen(true)}
            className="gap-1.5 shadow-md"
          >
            <Plus className="w-4 h-4" />
            New Dispatch Order
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider">Total Queue</span>
            <Package className="w-4 h-4 text-brand-blue" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">{metrics.total}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Enrolled smart cards</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-amber-500 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Pending Print</span>
            <Printer className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-amber-600 font-mono">{metrics.pendingPrint}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Awaiting CR80 printer</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-purple-500 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">QC Passed</span>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-purple-600 font-mono">{metrics.qcPassed}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">NFC UID & chip OK</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-blue-500 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">In Transit</span>
            <Truck className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-blue-600 font-mono">{metrics.inTransit}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">With courier partner</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-emerald-500 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Delivered</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">{metrics.delivered}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Acknowledged via OTP</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-rose-500 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Urgent Priority</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-rose-600 font-mono">{metrics.urgent}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Senior / Emergency</div>
        </div>
      </div>

      {/* Operations Recommendation Cards */}
      {recommendations.length > 0 && (
        <div className="bg-gradient-to-r from-blue-900/10 via-purple-900/10 to-indigo-900/10 border border-blue-200 dark:border-blue-900/40 rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-blue animate-pulse" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Production & Dispatch Recommendations
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500">
              {recommendations.length} Active Operational Suggestions
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recommendations.map(rec => (
              <div
                key={rec.id}
                className="bg-white dark:bg-slate-900/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-brand-blue/50 transition-all shadow-xs flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      rec.priority === 'high'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                    }`}>
                      {rec.count} Cards
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{rec.type.replace('_', ' ')}</span>
                  </div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                    {rec.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    {rec.description}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyRecommendation(rec)}
                  className="w-full text-xs font-bold justify-between gap-1 border-brand-blue/30 text-brand-blue hover:bg-brand-blue/10"
                >
                  <span>{rec.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Quick Courier Partner Filter Pills */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 flex items-center gap-2 overflow-x-auto text-xs scrollbar-none">
          <span className="text-[11px] font-black uppercase text-slate-400 pl-2 shrink-0">Carrier:</span>
          <button
            type="button"
            onClick={() => setSelectedCourier('all')}
            className={`px-3 py-1 rounded-xl whitespace-nowrap font-bold transition-all ${
              selectedCourier === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            All Carriers ({records.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCourier('speed_post')}
            className={`px-3 py-1 rounded-xl whitespace-nowrap font-bold transition-all flex items-center gap-1.5 ${
              selectedCourier === 'speed_post'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-400"></span>
            <span>India Post Speed Post (EMS) ({courierCounts.speed_post || 0})</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedCourier('bluedart')}
            className={`px-3 py-1 rounded-xl whitespace-nowrap font-bold transition-all flex items-center gap-1.5 ${
              selectedCourier === 'bluedart'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            <span>Blue Dart ({courierCounts.bluedart || 0})</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedCourier('delhivery')}
            className={`px-3 py-1 rounded-xl whitespace-nowrap font-bold transition-all flex items-center gap-1.5 ${
              selectedCourier === 'delhivery'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Delhivery ({courierCounts.delhivery || 0})</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedCourier('dtdc')}
            className={`px-3 py-1 rounded-xl whitespace-nowrap font-bold transition-all flex items-center gap-1.5 ${
              selectedCourier === 'dtdc'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>DTDC ({courierCounts.dtdc || 0})</span>
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[280px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by patient name, card number, consignment AWB, mobile or PIN..."
              className="w-full pl-9.5 pr-4 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand-blue/30"
            />
          </div>

          {/* Filters Group */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Print Status Filter */}
            <select
              value={selectedPrintStatus}
              onChange={e => setSelectedPrintStatus(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium"
            >
              <option value="all">All Print Status</option>
              <option value="pending_print">Pending Print</option>
              <option value="printed">Printed</option>
              <option value="qc_passed">QC Passed</option>
              <option value="qc_failed">QC Failed</option>
            </select>

            {/* Dispatch Status Filter */}
            <select
              value={selectedDispatchStatus}
              onChange={e => setSelectedDispatchStatus(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium"
            >
              <option value="all">All Dispatch Status</option>
              <option value="queued">Queued</option>
              <option value="packaged">Packaged</option>
              <option value="in_transit">In Transit</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="returned">Returned</option>
            </select>

            {/* Priority Filter */}
            <select
              value={selectedPriority}
              onChange={e => setSelectedPriority(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent / Emergency</option>
              <option value="high">High Priority</option>
              <option value="standard">Standard</option>
            </select>

            {/* Courier Filter */}
            <select
              value={selectedCourier}
              onChange={e => setSelectedCourier(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium"
            >
              <option value="all">All Couriers</option>
              <option value="speed_post">Speed Post</option>
              <option value="bluedart">Blue Dart</option>
              <option value="delhivery">Delhivery</option>
              <option value="dtdc">DTDC</option>
              <option value="executive_hand">Field Agent</option>
            </select>

            {/* District Filter */}
            <select
              value={selectedDistrict}
              onChange={e => setSelectedDistrict(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium"
            >
              <option value="all">All Districts</option>
              {districts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Batch Selection Action Bar */}
        {selectedIds.size > 0 && (
          <div className="px-6 py-3 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-800 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-brand-blue" />
              <span className="font-bold text-slate-900 dark:text-white">
                {selectedIds.size} cards selected
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (selectedRecordsList.length > 0) {
                    setActiveLabelRecord(selectedRecordsList[0]);
                    setActiveLabelRecords(selectedRecordsList);
                  }
                }}
                className="gap-1.5 shadow-sm bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Shipping Labels ({selectedIds.size})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBatchPrint}
                className="gap-1.5 font-bold"
              >
                <Layers className="w-3.5 h-3.5" />
                Batch Mark Printed
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsBatchManifestOpen(true)}
                className="gap-1.5 font-bold"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Create Handover Manifest ({selectedIds.size})
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 text-slate-500 font-black uppercase tracking-wider">
                <th className="p-4 w-10 text-center">
                  <button onClick={toggleSelectAll} className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white">
                    {selectedIds.size === filteredRecords.length && filteredRecords.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-brand-blue" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-4 px-3">Cardholder & Card ID</th>
                <th className="py-4 px-3">Destination & Contact</th>
                <th className="py-4 px-3">Print QC Status</th>
                <th className="py-4 px-3">Consignment / Courier</th>
                <th className="py-4 px-3">Dispatch Lifecycle</th>
                <th className="py-4 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="font-bold">No card dispatch records match the selected filters.</p>
                    <p className="text-xs text-slate-500 mt-1">Try resetting the search query or filters.</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map(record => {
                  const isSelected = selectedIds.has(record.id);
                  return (
                    <tr
                      key={record.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-brand-blue/5 dark:bg-brand-blue/10' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-4 text-center">
                        <button
                          onClick={() => toggleSelect(record.id)}
                          className="p-0.5 rounded text-slate-400 hover:text-brand-blue"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-brand-blue" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Cardholder */}
                      <td className="py-4 px-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={record.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                            alt={record.patientName}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                          <div>
                            <div className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{record.patientName}</span>
                              {record.priority === 'urgent' && (
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-rose-50 text-rose-600 rounded border border-rose-200">
                                  Urgent
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-[11px] font-bold text-brand-blue">
                              {record.cardNumber}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">
                              Tier: {record.membershipName}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Destination */}
                      <td className="py-4 px-3">
                        <div className="text-slate-800 dark:text-slate-200 font-medium truncate max-w-xs">
                          {record.address?.villageArea || record.address?.fullAddress || 'Sector 5, Salt Lake'}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{record.address?.district || 'Kolkata'} - {record.address?.pinCode}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          📱 {record.patientMobile}
                        </div>
                      </td>

                      {/* Print QC Status */}
                      <td className="py-4 px-3">
                        <div className="space-y-1">
                          <div>{getPrintBadge(record.printStatus)}</div>
                          {record.nfcUidVerified && (
                            <div className="text-[10px] font-mono text-purple-600 dark:text-purple-400 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 shrink-0" />
                              <span className="truncate max-w-[120px]">NFC: {record.nfcUidVerified}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Consignment */}
                      <td className="py-4 px-3">
                        <div className="flex items-center gap-1.5 font-mono font-black text-slate-900 dark:text-white text-xs select-all">
                          <span>{record.consignmentNo}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(record.consignmentNo);
                              showToast('info', 'AWB Copied', `${record.consignmentNo} copied to clipboard`);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Copy AWB Consignment Number"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-[11px] font-bold text-slate-500 uppercase mt-0.5 flex items-center gap-1.5">
                          <Truck className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{record.courierPartner.replace('_', ' ')}</span>
                          {record.courierPartner === 'speed_post' && (
                            <span className="text-[9px] bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300 font-mono px-1 rounded font-black">
                              EMS
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Dispatch Lifecycle */}
                      <td className="py-4 px-3">
                        <div className="space-y-1">
                          <div>{getDispatchBadge(record.dispatchStatus)}</div>
                          <div className="text-[10px] text-slate-400">
                            {record.deliveredAt ? `Delivered ${formatDate(record.deliveredAt)}` : record.dispatchedAt ? `Dispatched ${formatDate(record.dispatchedAt)}` : `Queued ${formatDate(record.createdAt)}`}
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Label Sticker */}
                          <button
                            onClick={() => {
                              setActiveLabelRecord(record);
                              setActiveLabelRecords([record]);
                            }}
                            title="Print Postal Shipping Label & Envelope Sticker"
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-brand-blue dark:text-blue-300 transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* QC Scanner */}
                          <button
                            onClick={() => setActiveQcRecord(record)}
                            title="Run NFC Quality Control Test"
                            className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-600 dark:text-purple-300 transition-colors"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>

                          {/* Details */}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setActiveDetailsRecord(record)}
                            className="text-xs gap-1 py-1 px-2.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Track
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between text-xs text-slate-500 font-medium">
          <div>
            Showing <strong className="text-slate-800 dark:text-slate-200">{filteredRecords.length}</strong> of <strong className="text-slate-800 dark:text-slate-200">{records.length}</strong> card production orders
          </div>
          <div className="flex items-center gap-3">
            <span>High-Speed Thermal Dye Sublimation CR80 Compatible</span>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CardShippingLabelModal
        isOpen={!!activeLabelRecord || activeLabelRecords.length > 0}
        onClose={() => {
          setActiveLabelRecord(null);
          setActiveLabelRecords([]);
        }}
        record={activeLabelRecord}
        records={activeLabelRecords}
      />

      <CardDispatchDetailsModal
        isOpen={!!activeDetailsRecord}
        onClose={() => setActiveDetailsRecord(null)}
        record={activeDetailsRecord}
        onUpdated={updated => {
          setRecords(prev => prev.map(r => (r.id === updated.id ? updated : r)));
          setActiveDetailsRecord(updated);
        }}
        onOpenLabel={rec => setActiveLabelRecord(rec)}
        onOpenQc={rec => setActiveQcRecord(rec)}
      />

      <CardQcScannerModal
        isOpen={!!activeQcRecord}
        onClose={() => setActiveQcRecord(null)}
        record={activeQcRecord}
        onPassed={updated => {
          setRecords(prev => prev.map(r => (r.id === updated.id ? updated : r)));
          if (activeDetailsRecord?.id === updated.id) {
            setActiveDetailsRecord(updated);
          }
        }}
      />

      <CardBatchManifestModal
        isOpen={isBatchManifestOpen}
        onClose={() => setIsBatchManifestOpen(false)}
        selectedRecords={selectedRecordsList}
        onBatchCreated={() => {
          loadData();
          setSelectedIds(new Set());
        }}
      />

      <CardManualDispatchModal
        isOpen={isManualDispatchOpen}
        onClose={() => setIsManualDispatchOpen(false)}
        onCreated={() => {
          loadData();
        }}
      />
    </div>
  );
};
