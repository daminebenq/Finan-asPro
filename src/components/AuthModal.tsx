import React, { useState } from 'react';
import { useAppContext } from '@/contexts/app-context';
import { X, Eye, EyeOff, Loader2 } from 'lucide-react';

const formatCPF = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const validateCPF = (cpf: string): boolean => {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  if (parseInt(digits[9]) !== check) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  return parseInt(digits[10]) === check;
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const AuthModal: React.FC = () => {
  const {
    showAuthModal,
    setShowAuthModal,
    authMode,
    setAuthMode,
    signIn,
    signUp,
    resetPassword,
    isPasswordRecovery,
    completePasswordRecovery,
    clearPasswordRecovery,
  } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('beginner');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [forgotPassword, setForgotPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const normalizedEmail = email.trim().toLowerCase();

  if (!showAuthModal) return null;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!normalizedEmail.includes('@')) errs.email = 'Email inválido';
    if (password.length < 6) errs.password = 'Mínimo 6 caracteres';
    if (authMode === 'signup') {
      if (!fullName.trim()) errs.fullName = 'Nome obrigatório';
      if (password !== confirmPassword) errs.confirmPassword = 'Senhas não conferem';
      if (cpf && !validateCPF(cpf)) errs.cpf = 'CPF inválido';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    if (authMode === 'login') {
      await signIn(normalizedEmail, password);
    } else {
      await signUp(normalizedEmail, password, fullName, cpf.replace(/\D/g, ''), phone.replace(/\D/g, ''), experienceLevel);
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!normalizedEmail.includes('@')) {
      setErrors({ email: 'Informe um email válido' });
      return;
    }
    setLoading(true);
    const ok = await resetPassword(normalizedEmail);
    setLoading(false);
    if (ok) {
      setForgotPassword(false);
      setErrors({});
    }
  };

  const handleCompleteRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (newPassword.length < 6) errs.newPassword = 'Mínimo 6 caracteres';
    if (newPassword !== confirmNewPassword) errs.confirmNewPassword = 'Senhas não conferem';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    const ok = await completePasswordRecovery(newPassword);
    setLoading(false);

    if (ok) {
      setNewPassword('');
      setConfirmNewPassword('');
      setErrors({});
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto relative">
        <button onClick={() => { clearPasswordRecovery(); setShowAuthModal(false); }} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
          <X size={24} />
        </button>

        <div className="p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <span className="text-2xl font-bold text-gray-900">Fin<span className="text-emerald-600">BR</span></span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {isPasswordRecovery ? 'Definir nova senha' : forgotPassword ? 'Recuperar Senha' : authMode === 'login' ? 'Entrar na sua conta' : 'Criar sua conta'}
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              {isPasswordRecovery ? 'Digite sua nova senha para concluir a recuperação' : forgotPassword ? 'Informe seu email para recuperar' : authMode === 'login' ? 'Gerencie suas finanças com inteligência' : 'Comece a controlar suas finanças hoje'}
            </p>
          </div>

          {isPasswordRecovery ? (
            <form onSubmit={handleCompleteRecovery} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  placeholder="Mínimo 6 caracteres"
                />
                {errors.newPassword && <p className="text-red-500 text-xs mt-1">{errors.newPassword}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nova senha</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmNewPassword}
                  onChange={e => setConfirmNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  placeholder="Repita sua senha"
                />
                {errors.confirmNewPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmNewPassword}</p>}
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {loading && <Loader2 className="animate-spin" size={18} />}
                Salvar nova senha
              </button>
            </form>
          ) : forgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  placeholder="seu@email.com" />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {loading && <Loader2 className="animate-spin" size={18} />}
                Enviar Link de Recuperação
              </button>
              <button type="button" onClick={() => setForgotPassword(false)} className="w-full text-sm text-gray-500 hover:text-emerald-600">
                Voltar ao login
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {authMode === 'signup' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
                    <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                      placeholder="Seu nome completo" />
                    {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                      <input type="text" value={cpf} onChange={e => setCpf(formatCPF(e.target.value))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                        placeholder="000.000.000-00" />
                      {errors.cpf && <p className="text-red-500 text-xs mt-1">{errors.cpf}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                      <input type="text" value={phone} onChange={e => setPhone(formatPhone(e.target.value))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                        placeholder="(00) 00000-0000" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nível de Experiência</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'beginner', label: 'Iniciante', icon: '🌱' },
                        { value: 'intermediate', label: 'Intermediário', icon: '📈' },
                        { value: 'professional', label: 'Profissional', icon: '🏆' }
                      ].map(level => (
                        <button key={level.value} type="button"
                          onClick={() => setExperienceLevel(level.value)}
                          className={`p-3 rounded-xl border-2 text-center transition-all text-sm ${
                            experienceLevel === level.value
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-600'
                          }`}>
                          <div className="text-lg mb-1">{level.icon}</div>
                          <div className="font-medium">{level.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  placeholder="seu@email.com" />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all pr-12"
                    placeholder="Mínimo 6 caracteres" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              </div>

              {authMode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Senha *</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    placeholder="Repita a senha" />
                  {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {loading && <Loader2 className="animate-spin" size={18} />}
                {authMode === 'login' ? 'Entrar' : 'Criar Conta'}
              </button>

              {authMode === 'login' && (
                <button type="button" onClick={() => setForgotPassword(true)} className="w-full text-sm text-gray-500 hover:text-emerald-600 transition-colors">
                  Esqueceu sua senha?
                </button>
              )}

              <div className="text-center pt-2 border-t border-gray-100">
                <span className="text-sm text-gray-500">
                  {authMode === 'login' ? 'Não tem conta?' : 'Já tem conta?'}
                </span>
                <button type="button" onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setErrors({}); }}
                  className="text-sm text-emerald-600 font-semibold ml-1 hover:text-emerald-700 transition-colors">
                  {authMode === 'login' ? 'Criar conta' : 'Fazer login'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
