import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { NotificationService } from '../../services/notificationService';
import { StorageService } from '../../services/storage';
import {
  NotificationRecord,
  NotificationChannel,
  NotificationTrigger,
  NotificationStatus,
  Patient,
  HealthCard,
  PatientBill,
  PatientAppointment
} from '../../types';
import { formatDateTime } from '../../utils/formatters';
import { Modal } from '../../components/common/Modal';
import {
  Bell,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Mail,
  MessageSquare,
  Smartphone,
  ExternalLink,
  Repeat,
  Sparkles,
  ShieldCheck,
  Calendar,
  FileText,
  CreditCard,
  Layers,
  ChevronRight,
  TrendingUp,
  User,
  Check,
  Zap
} from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const { currentUser, can } = useAuth();
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState<NotificationRecord[]>(() =>
    NotificationService.getAllNotifications()
  );
  const [patients, setPatients] = useState<Patient[]>(() => StorageService.getPatients());
  const [cards, setCards] = useState<HealthCard[]>(() => StorageService.getCards());

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [triggerFilter, setTriggerFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Compose Modal State
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<NotificationChannel>('whatsapp');
  const [selectedTrigger, setSelectedTrigger] = useState<NotificationTrigger>('custom_broadcast');
  const [title, setTitle] = useState('Hospital Communication');
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Detail Modal State
  const [selectedNotification, setSelectedNotification] = useState<NotificationRecord | null>(null);

  // Sync Listener
  useEffect(() => {
    const handleSync = () => {
      setNotifications(NotificationService.getAllNotifications());
      setPatients(StorageService.getPatients());
      setCards(StorageService.getCards());
    };
    window.addEventListener('labmedix_data_synced', handleSync);
    return () => window.removeEventListener('labmedix_data_synced', handleSync);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setNotifications(NotificationService.getAllNotifications());
      setIsRefreshing(false);
      showToast('info', 'Notifications Refreshed', 'Latest communication logs synchronized.');
    }, 400);
  };

  // KPI Calculations
  const stats = useMemo(() => NotificationService.getNotificationStats(), [notifications]);

  // Filtered List
  const filteredNotifications = useMemo(() => {
    return notifications.filter(item => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        item.recipientName.toLowerCase().includes(q) ||
        item.recipientPhone.includes(q) ||
        (item.recipientEmail && item.recipientEmail.toLowerCase().includes(q)) ||
        item.title.toLowerCase().includes(q) ||
        item.message.toLowerCase().includes(q);

      const matchesChannel = channelFilter === 'all' || item.channel === channelFilter;
      const matchesTrigger = triggerFilter === 'all' || item.trigger === triggerFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

      return matchesSearch && matchesChannel && matchesTrigger && matchesStatus;
    });
  }, [notifications, searchQuery, channelFilter, triggerFilter, statusFilter]);

  // Handle Select Patient in Compose Modal
  const handleSelectPatient = (pId: string) => {
    setSelectedPatientId(pId);
    const p = patients.find(pat => pat.id === pId);
    if (p) {
      setRecipientName(p.fullName);
      setRecipientPhone(p.mobile);
      setRecipientEmail(p.email || '');
    }
  };

  // Preload Templates
  const handleTemplateSelect = (templateType: NotificationTrigger) => {
    setSelectedTrigger(templateType);
    if (templateType === 'appointment_reminder') {
      setTitle('Doctor Appointment Reminder');
      setMessageText('Dear Patient, this is a reminder for your upcoming doctor consultation at LabMedix Hospital. Please arrive 10 minutes prior to your scheduled time.');
    } else if (templateType === 'report_ready') {
      setTitle('Diagnostic Test Report Ready');
      setMessageText('Dear Patient, your pathology test report is verified and ready. You can view or download it directly through your LabMedix Smart Portal.');
    } else if (templateType === 'billing_receipt') {
      setTitle('Official Hospital Bill Receipt');
      setMessageText('Dear Patient, your payment has been credited to your bill. Thank you for choosing LabMedix Healthcare.');
    } else if (templateType === 'card_renewal') {
      setTitle('Health Card Annual Renewal');
      setMessageText('Dear Cardholder, your LabMedix Health Card is due for renewal. Renew today to continue receiving up to 40% diagnostics discount and free OPD benefits.');
    } else {
      setTitle('Hospital Update');
      setMessageText('');
    }
  };

  // Dispatch Notification
  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName || !recipientPhone || !messageText) {
      showToast('error', 'Missing Information', 'Recipient name, phone, and message body are required.');
      return;
    }

    setIsSending(true);
    try {
      await NotificationService.dispatchNotification({
        recipientName,
        recipientPhone,
        recipientEmail: recipientEmail || undefined,
        patientId: selectedPatientId || undefined,
        channel: selectedChannel,
        trigger: selectedTrigger,
        title,
        message: messageText,
        dispatchedBy: currentUser?.fullName || 'Active Staff'
      });

      setNotifications(NotificationService.getAllNotifications());
      setIsComposeModalOpen(false);
      showToast('success', 'Dispatched Successfully', `Notification queued via ${selectedChannel.toUpperCase()}.`);

      // Reset form
      setRecipientName('');
      setRecipientPhone('');
      setRecipientEmail('');
      setMessageText('');
    } catch (err: any) {
      showToast('error', 'Failed to Send', err.message || 'Error dispatching message.');
    } finally {
      setIsSending(false);
    }
  };

  // Quick Resend
  const handleResend = async (id: string) => {
    const res = await NotificationService.resendNotification(id);
    if (res) {
      setNotifications(NotificationService.getAllNotifications());
      showToast('success', 'Message Resent', `Successfully re-dispatched to ${res.recipientName}.`);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-800/50 shadow-2xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                MODULE 24 • COMMUNICATIONS ENGINE
              </span>
              <span className="flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live PostgreSQL Synced
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Bell className="w-8 h-8 text-indigo-400" />
              Notifications & Communication Hub
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl">
              Automated reminders, diagnostic report links, billing receipts, and multi-channel messaging via WhatsApp Click-to-Chat, SMS gateway, and verified server email.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors shadow-sm"
              title="Refresh logs"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
            <button
              onClick={() => setIsComposeModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>Compose Message</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Total Messages</span>
            <Send className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalSent}</p>
          <span className="text-[10px] text-slate-400">All channels combined</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-500/30 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-bold">
            <span>WhatsApp</span>
            <MessageSquare className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.whatsappCount}</p>
          <span className="text-[10px] text-slate-400">Instant Chat & Links</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-blue-500/30 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 text-xs font-bold">
            <span>SMS Alerts</span>
            <Smartphone className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.smsCount}</p>
          <span className="text-[10px] text-slate-400">Direct carrier delivery</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-purple-500/30 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 text-xs font-bold">
            <span>Server Email</span>
            <Mail className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400">{stats.emailCount}</p>
          <span className="text-[10px] text-slate-400">Nodemailer OAuth2</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Success Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.successRatePercent}%</p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">{stats.deliveredCount} Delivered</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by recipient, phone, or text..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Channel Filter */}
          <select
            value={channelFilter}
            onChange={e => setChannelFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            <option value="all">All Channels</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="sms">SMS</option>
            <option value="email">Email</option>
          </select>

          {/* Trigger Filter */}
          <select
            value={triggerFilter}
            onChange={e => setTriggerFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            <option value="all">All Triggers</option>
            <option value="appointment_reminder">Appointment Reminders</option>
            <option value="report_ready">Lab Reports</option>
            <option value="billing_receipt">Billing Receipts</option>
            <option value="card_status">Card Status</option>
            <option value="card_renewal">Card Expiry/Renewal</option>
            <option value="custom_broadcast">Custom Broadcast</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            <option value="all">All Statuses</option>
            <option value="delivered">Delivered</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Notifications Log Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-black text-sm text-slate-900 dark:text-white">Communication Audit Log</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
              {filteredNotifications.length} Records
            </span>
          </div>
        </div>

        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Bell className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-semibold">No notification records match your filters.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setChannelFilter('all');
                setTriggerFilter('all');
                setStatusFilter('all');
              }}
              className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Recipient</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Trigger / Subject</th>
                  <th className="px-4 py-3">Message Preview</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Dispatched At</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredNotifications.map(notif => {
                  const isWhatsApp = notif.channel === 'whatsapp';
                  const isEmail = notif.channel === 'email';
                  const isSms = notif.channel === 'sms';

                  return (
                    <tr key={notif.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 dark:text-white">{notif.recipientName}</div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{notif.recipientPhone}</div>
                        {notif.recipientEmail && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{notif.recipientEmail}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isWhatsApp && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <MessageSquare className="w-3 h-3 text-emerald-500" /> WhatsApp
                          </span>
                        )}
                        {isEmail && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                            <Mail className="w-3 h-3 text-purple-500" /> Email
                          </span>
                        )}
                        {isSms && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                            <Smartphone className="w-3 h-3 text-blue-500" /> SMS
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{notif.title}</div>
                        <span className="text-[10px] font-mono uppercase text-indigo-500 font-bold">
                          {notif.trigger.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-slate-600 dark:text-slate-300 truncate text-[11px]">{notif.message}</p>
                      </td>
                      <td className="px-4 py-3">
                        {notif.status === 'delivered' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Delivered
                          </span>
                        )}
                        {notif.status === 'sent' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            <Clock className="w-3 h-3 text-amber-500" /> Sent
                          </span>
                        )}
                        {notif.status === 'failed' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                            <AlertCircle className="w-3 h-3 text-rose-500" /> Failed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                        {formatDateTime(notif.sentAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {notif.metadata?.whatsappUrl && (
                            <a
                              href={notif.metadata.whatsappUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-600 dark:text-emerald-400 transition-colors"
                              title="Open WhatsApp Chat"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => handleResend(notif.id)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                            title="Resend Notification"
                          >
                            <Repeat className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setSelectedNotification(notif)}
                            className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold transition-colors"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Compose Notification Modal */}
      {isComposeModalOpen && (
        <Modal
          isOpen={isComposeModalOpen}
          onClose={() => setIsComposeModalOpen(false)}
          title="Compose Multi-Channel Notification"
        >
          <form onSubmit={handleDispatch} className="space-y-4 text-xs">
            {/* Template Selector */}
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2">
              <span className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-indigo-500" />
                Select Rapid Template:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: 'appointment_reminder', label: 'Appointment' },
                  { key: 'report_ready', label: 'Lab Report' },
                  { key: 'billing_receipt', label: 'Payment Receipt' },
                  { key: 'card_renewal', label: 'Card Renewal' },
                  { key: 'custom_broadcast', label: 'Custom' }
                ].map(t => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => handleTemplateSelect(t.key as NotificationTrigger)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                      selectedTrigger === t.key
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Registered Patient Lookup (Optional) */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Link to Registered Patient (Optional)
              </label>
              <select
                value={selectedPatientId}
                onChange={e => handleSelectPatient(e.target.value)}
                className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
              >
                <option value="">-- Or enter recipient manually below --</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.mobile}) — ID: {p.id}
                  </option>
                ))}
              </select>
            </div>

            {/* Recipient Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Recipient Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chandra"
                  value={recipientName}
                  onChange={e => setRecipientName(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mobile Number (WhatsApp/SMS) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="10-digit mobile number"
                  value={recipientPhone}
                  onChange={e => setRecipientPhone(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Recipient Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="patient@example.com"
                  value={recipientEmail}
                  onChange={e => setRecipientEmail(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Dispatch Channel *
                </label>
                <select
                  value={selectedChannel}
                  onChange={e => setSelectedChannel(e.target.value as NotificationChannel)}
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-indigo-600 dark:text-indigo-400"
                >
                  <option value="whatsapp">WhatsApp (Direct API Chat / Link)</option>
                  <option value="sms">SMS Gateway</option>
                  <option value="email">Server Email (Nodemailer OAuth2)</option>
                </select>
              </div>
            </div>

            {/* Message Title & Body */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Subject / Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Message Body *
              </label>
              <textarea
                rows={4}
                required
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                placeholder="Write your hospital communication message here..."
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-medium"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>Supports dynamic variables</span>
                <span>{messageText.length} characters</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsComposeModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSending}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSending ? 'Dispatching...' : 'Send Notification'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Details View Modal */}
      {selectedNotification && (
        <Modal
          isOpen={!!selectedNotification}
          onClose={() => setSelectedNotification(null)}
          title="Notification Audit Record"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-mono text-[10px] font-bold text-slate-400">ID: {selectedNotification.id}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  {selectedNotification.channel}
                </span>
              </div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">{selectedNotification.title}</h3>
              <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 font-sans">
                {selectedNotification.message}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div>
                <span className="text-slate-400 block">Recipient:</span>
                <strong className="text-slate-900 dark:text-white">{selectedNotification.recipientName}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Mobile Phone:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{selectedNotification.recipientPhone}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Trigger:</span>
                <span className="font-mono uppercase text-indigo-500 font-bold">{selectedNotification.trigger}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Dispatched By:</span>
                <span className="text-slate-800 dark:text-slate-200">{selectedNotification.dispatchedBy || 'System Automated Engine'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Timestamp:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{formatDateTime(selectedNotification.sentAt)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Delivery Status:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">{selectedNotification.status}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              {selectedNotification.metadata?.whatsappUrl && (
                <a
                  href={selectedNotification.metadata.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Open in WhatsApp</span>
                </a>
              )}
              <button
                onClick={() => setSelectedNotification(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default NotificationsPage;
