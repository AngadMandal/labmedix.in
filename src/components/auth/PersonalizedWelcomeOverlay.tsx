import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '../../types';
import { LabMedixLogo } from '../common/LabMedixLogo';
import { ShieldCheck, Sparkles, ArrowRight, Volume2, VolumeX } from 'lucide-react';

export interface PersonalizedWelcomeOverlayProps {
  user: User;
  onComplete: () => void;
}

export const PersonalizedWelcomeOverlay: React.FC<PersonalizedWelcomeOverlayProps> = ({ user, onComplete }) => {
  const [speechActive, setSpeechActive] = useState<boolean>(true);
  const [speechFailed, setSpeechFailed] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(3.5);
  const hasSpokenRef = useRef<boolean>(false);
  const timerRef = useRef<any>(null);

  // Derive staff display name safely
  const staffName = (user.fullName || user.username || 'Authorized Staff').trim();
  const roleDisplay = (user.designation || user.role || 'Staff').replace(/_/g, ' ').toUpperCase();

  // Voice Greeting via Web Speech API
  useEffect(() => {
    if (hasSpokenRef.current) return;
    hasSpokenRef.current = true;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel(); // Stop any pending speech

        const greetingText = `Welcome to Labmedix, ${staffName}.`;
        const utterance = new SpeechSynthesisUtterance(greetingText);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;

        // Try to pick a natural English voice
        const pickVoice = () => {
          const voices = window.speechSynthesis.getVoices();
          const preferred = voices.find(v => (v.lang.includes('en') || v.lang.includes('EN')) && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Karen')));
          if (preferred) {
            utterance.voice = preferred;
          }
        };

        if (window.speechSynthesis.getVoices().length > 0) {
          pickVoice();
        } else {
          window.speechSynthesis.onvoiceschanged = pickVoice;
        }

        utterance.onend = () => {
          setSpeechActive(false);
        };
        utterance.onerror = (e) => {
          console.warn('[WelcomeVoice] Audio greeting notice:', e);
          setSpeechFailed(true);
          setSpeechActive(false);
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('[WelcomeVoice] Speech synthesis blocked or unavailable:', err);
        setSpeechFailed(true);
        setSpeechActive(false);
      }
    } else {
      setSpeechFailed(true);
      setSpeechActive(false);
    }

    // Auto-dismiss after 3.5 seconds
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 0.2) {
          clearInterval(interval);
          return 0;
        }
        return Number((prev - 0.1).toFixed(1));
      });
    }, 100);

    timerRef.current = setTimeout(() => {
      onComplete();
    }, 3500);

    return () => {
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [staffName, onComplete]);

  const handleSkip = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    onComplete();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-3xl overflow-hidden p-4 select-none"
      >
        {/* Dynamic 3D Ambient Lighting Orbs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-teal-500/20 rounded-full blur-[140px] pointer-events-none animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-600/20 rounded-full blur-[140px] pointer-events-none animate-pulse" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(13,148,136,0.08)_0,transparent_70%)] pointer-events-none" />

        {/* 3D Glassmorphic Card Container */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative max-w-lg w-full bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-teal-500/30 rounded-3xl p-8 sm:p-10 shadow-[0_25px_70px_rgba(0,0,0,0.8),0_0_50px_rgba(13,148,136,0.25)] text-center text-white space-y-6"
        >
          {/* Animated 3D Floating Rings & Brand Monogram */}
          <div className="relative mx-auto w-28 h-28 flex items-center justify-center">
            {/* Outer 3D Gyro Rings */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 16, ease: 'linear' }}
              className="absolute inset-0 rounded-full border-2 border-dashed border-teal-400/40 pointer-events-none"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 22, ease: 'linear' }}
              className="absolute -inset-2 rounded-full border border-blue-400/30 pointer-events-none"
            />
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
              className="absolute inset-2 rounded-2xl bg-teal-500/20 blur-md pointer-events-none"
            />

            {/* Central Monogram */}
            <div className="relative z-10 w-20 h-20 rounded-2xl bg-white p-2 shadow-2xl flex items-center justify-center border border-teal-500/40">
              <LabMedixLogo variant="monogram" size="md" theme="teal" />
            </div>
          </div>

          {/* Primary Welcome Title */}
          <div className="space-y-2">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-950/80 border border-teal-500/40 text-teal-300 text-[11px] font-mono font-bold tracking-widest uppercase"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>AUTHENTICATED CLEARANCE</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="text-2xl sm:text-3xl font-black tracking-tight uppercase font-display bg-gradient-to-r from-white via-slate-100 to-teal-200 bg-clip-text text-transparent"
            >
              WELCOME TO LABMEDIX
            </motion.h1>

            {/* Dynamic Staff Name */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="pt-1"
            >
              <p className="text-lg sm:text-xl font-bold text-teal-300 flex items-center justify-center gap-2">
                <span>Welcome,</span>
                <span className="text-white underline decoration-teal-400/50 decoration-2 underline-offset-4">
                  {staffName}
                </span>
              </p>
              <p className="text-xs text-slate-400 font-mono mt-1">
                {roleDisplay} • Staff ID: {user.staffId || user.employeeNo || 'LMDX-STF'}
              </p>
            </motion.div>
          </div>

          {/* Voice Greeting Telemetry Pill */}
          <div className="flex items-center justify-center gap-2 text-xs font-mono text-slate-400">
            {speechActive && !speechFailed ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 animate-pulse">
                <Volume2 className="w-3.5 h-3.5 text-teal-400" />
                <span>Voice Greeting Playing...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700 text-slate-400">
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                <span>Audio Complete</span>
              </div>
            )}
          </div>

          {/* Auto-Dismiss Progress Bar & Skip Action */}
          <div className="pt-2 space-y-3">
            <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden border border-slate-700">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 3.5, ease: 'linear' }}
                className="h-full bg-gradient-to-r from-teal-400 to-blue-500 rounded-full"
              />
            </div>

            <button
              type="button"
              onClick={handleSkip}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-teal-500/20 transition-all hover:scale-105 active:scale-95"
            >
              <span>Open Dashboard Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
