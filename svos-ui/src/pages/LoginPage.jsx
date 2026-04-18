import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

const LoginPage = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!auth) throw new Error("Authentication service is currently unavailable. Please check your configuration.");
      if (!googleProvider) throw new Error("Google Provider not configured");
      await signInWithPopup(auth, googleProvider);
      onLoginSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!auth) throw new Error("Authentication service is currently unavailable.");
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onLoginSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden font-inter">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-600/10 blur-[120px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-10">
          <motion.h1 
            initial={{ tracking: "0.5em" }}
            animate={{ tracking: "0.1em" }}
            className="text-4xl font-black text-white mb-2 tracking-tighter"
          >
            SVOS <span className="text-blue-500">CORE</span>
          </motion.h1>
          <p className="text-slate-400 text-xs font-black uppercase tracking-[0.3em]">
            Tactical Venue Orchestration
          </p>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-3xl p-8 shadow-2xl relative">
          {/* Header Status */}
          <div className="flex items-center gap-2 mb-8 bg-black/40 w-fit px-3 py-1 rounded-full border border-white/5">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Secure Terminal Active</span>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Access Identity</label>
              <input
                type="email"
                placeholder="EMAIL_ADDRESS"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Security Key</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all font-mono"
                required
              />
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-rose-400 text-[11px] font-medium"
                >
                  <span className="font-black uppercase mr-2 text-[9px]">Error:</span> {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-[11px] py-4 rounded-xl transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(37,99,235,0.3)] disabled:opacity-50"
            >
              {loading ? 'Processing...' : isRegistering ? 'Initialize Clearance' : 'Authorize Access'}
            </button>
          </form>

          <div className="mt-8 flex flex-col gap-4">
            <div className="relative flex items-center">
              <div className="flex-grow border-t border-white/5"></div>
              <span className="flex-shrink mx-4 text-[9px] font-black text-slate-600 uppercase tracking-widest">Or Multi-Factor Auth</span>
              <div className="flex-grow border-t border-white/5"></div>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase tracking-widest text-[11px] py-4 rounded-xl transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" className="mr-1">
                <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0c-4.182 0-7.818 2.236-9.818 5.618l3.084 4.147z" />
                <path fill="#4285F4" d="M23.491 12.273c0-.796-.064-1.609-.191-2.4h-11.3v4.545h6.455c-.282 1.518-1.145 2.8-2.436 3.664l3.873 3c2.264-2.091 3.591-5.173 3.591-8.809z" />
                <path fill="#34A853" d="M12 24c3.245 0 5.973-1.082 7.964-2.918l-3.873-3c-1.082.727-2.464 1.164-4.091 1.164-3.155 0-5.827-2.127-6.782-5.009L2.136 17.382C4.136 21.764 7.773 24 12 24z" />
                <path fill="#FBBC05" d="M5.218 14.236A6.99 6.99 0 0 1 4.909 12c0-.782.136-1.536.382-2.236L2.209 5.618A12.01 12.01 0 0 0 0 12c0 2.373.691 4.582 1.882 6.445l3.336-2.209z" />
              </svg>
              Google Identity
            </button>
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-[10px] font-black text-slate-500 hover:text-blue-400 uppercase tracking-widest transition-colors"
            >
              {isRegistering ? 'Return to Access Gate' : 'New Agent? Request Clearance'}
            </button>
          </div>
        </div>

        <div className="mt-8 text-center text-[9px] font-medium text-slate-600 uppercase tracking-[0.4em]">
          Protocol SVOS-4 // End-to-End Encryption
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
