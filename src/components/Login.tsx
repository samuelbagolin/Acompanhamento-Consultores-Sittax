import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, resetPassword } = useAuth();

  const handleAuthError = (error: any) => {
    switch (error.code) {
      case "auth/operation-not-allowed":
        toast.error("Login por Email/Senha não habilitado no Firebase.");
        break;
      case "auth/invalid-credential":
        toast.error("Email ou senha inválidos.");
        break;
      case "auth/user-not-found":
        toast.error("Usuário não encontrado.");
        break;
      case "auth/wrong-password":
        toast.error("Senha incorreta.");
        break;
      default:
        toast.error(error.message || "Erro ao realizar login.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.log("INICIANDO LOGIN para:", email);
    try {
      const userCredential = await login(email, password);
      console.log("LOGIN OK", (userCredential as any)?.user);
      toast.success("Bem-vindo ao Sittax!");
    } catch (err: any) {
      console.log("ERROR CODE:", err.code);
      console.log("ERROR MESSAGE:", err.message);
      console.log("FULL ERROR:", err);
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast.warning('Digite seu e-mail para recuperar a senha.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email);
      toast.success('E-mail de recuperação enviado!');
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao enviar e-mail de recuperação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-[#FF6B00] rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200 mx-auto">
            <TrendingUp className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Sittax</h1>
          <p className="text-gray-500 font-medium lowercase tracking-wide">Acompanhamento de Performance</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] transition-all text-gray-900"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] transition-all text-gray-900"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#FF6B00] text-white rounded-2xl font-bold text-lg hover:bg-[#E66000] active:scale-[0.98] transition-all shadow-lg shadow-orange-100 flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Entrar'}
          </button>
        </form>

        <div className="text-center pt-2">
          <button 
            onClick={handleResetPassword}
            className="text-sm font-semibold text-[#FF6B00] hover:text-[#E66000] hover:underline transition-all"
          >
            Esqueceu a senha?
          </button>
        </div>
      </motion.div>
    </div>
  );
};
