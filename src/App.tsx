/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, Component } from 'react';
import { 
  LayoutDashboard, 
  Plus, 
  ChevronRight,
  TrendingUp,
  Users,
  Calendar,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Settings,
  Trash2,
  Edit2,
  Image as ImageIcon,
  Copy,
  ChevronLeft,
  ChevronDown,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  BrainCircuit,
  Award,
  BarChart3,
  UserPlus,
  Heart,
  MessageSquare,
  ClipboardList,
  Menu,
  X,
  GripVertical,
  GripHorizontal,
  Mail,
  Key,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  ZAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  LabelList,
  Cell
} from 'recharts';
import { format, parse, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ReactSortable } from "react-sortablejs";
import { db } from './lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { cn } from './lib/utils';
import { Toaster, toast } from 'sonner';
import { UserManagement } from './components/UserManagement';
import { 
  SECTORS, 
  Sector, 
  Month, 
  Collaborator, 
  Indicator, 
  DataValue, 
  OperationDate,
  IndicatorType,
  SectorHighlight,
  DevelopmentEvaluation,
  DevelopmentClassification,
  TECHNICAL_QUESTIONS,
  BEHAVIORAL_QUESTIONS,
  User,
  UserRole
} from './types';

// --- Helpers ---

const formatValue = (val: any, type: IndicatorType) => {
  if (val === '-' || val === undefined || val === null || val === '') return '-';
  
  if (type === 'time') {
    const num = Number(val);
    if (isNaN(num)) return val;
    const h = Math.floor(num / 3600);
    const m = Math.floor((num % 3600) / 60);
    const s = Math.floor(num % 60);
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
  }

  const num = Number(val);
  if (isNaN(num)) return val;
  
  if (type === 'percentage') return `${num}%`;
  if (type === 'currency') return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return num.toLocaleString('pt-BR');
};

const normalizeId = (id: any) => {
  if (typeof id !== 'string') return '';
  return id.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

const normalizeDate = (d: string) => {
  if (!d) return '';
  if (d.includes('-')) return d; // already YYYY-MM-DD
  const parts = d.split('/');
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return d;
};

// --- Components ---

const Button = ({ 
  children, 
  className, 
  variant = 'primary', 
  size = 'md',
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger', size?: 'sm' | 'md' | 'lg' }) => {
  const variants = {
    primary: 'bg-[#FF6B00] text-white hover:bg-[#E66000] shadow-sm',
    secondary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
    outline: 'border border-gray-200 text-gray-600 hover:bg-gray-50',
    ghost: 'text-gray-500 hover:bg-gray-100 hover:text-gray-900',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button 
      className={cn(
        'rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ 
  children, 
  className, 
  title, 
  subtitle, 
  action, 
  noPadding = false, 
  onClick,
  style
}: { 
  children: React.ReactNode, 
  className?: string, 
  title?: string, 
  subtitle?: string, 
  action?: React.ReactNode, 
  noPadding?: boolean, 
  onClick?: () => void,
  style?: React.CSSProperties
}) => (
  <div 
    className={cn('bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden', className)}
    onClick={onClick}
    style={style}
  >
    {(title || subtitle || action) && (
      <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
        <div>
          {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
    )}
    <div className={cn(noPadding ? '' : 'p-6')}>
      {children}
    </div>
  </div>
);

const Input = ({ label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string, error?: string }) => (
  <div className="space-y-1 sm:space-y-1.5">
    {label && <label className="text-xs sm:text-sm font-medium text-gray-700">{label}</label>}
    <input 
      className={cn(
        'w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-50 border border-gray-200 rounded-lg sm:rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] transition-all',
        error && 'border-red-500 focus:ring-red-500/20 focus:border-red-500',
        props.className
      )}
      {...props}
    />
    {error && <p className="text-[10px] sm:text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

const Select = ({ label, options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string, options: { value: string, label: string }[] }) => (
  <div className="space-y-1 sm:space-y-1.5">
    {label && <label className="text-xs sm:text-sm font-medium text-gray-700">{label}</label>}
    <div className="relative">
      <select 
        className={cn(
          'w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-50 border border-gray-200 rounded-lg sm:rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] transition-all cursor-pointer',
          props.className
        )}
        {...props}
      >
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  </div>
);

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden max-h-[95vh] flex flex-col"
      >
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate pr-4">{title}</h3>
          <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0">
            <Plus className="rotate-45 w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App ---

// --- Error Boundary ---
interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<any, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
              <AlertCircle size={40} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Ops! Algo deu errado</h1>
              <p className="text-gray-600">Ocorreu um erro crítico na aplicação. Tentamos registrar os detalhes para correção.</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-left overflow-auto max-h-40">
              <p className="text-xs font-mono text-red-600 whitespace-pre-wrap">
                {this.state.error?.toString()}
              </p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-[#FF6B00] text-white rounded-xl font-bold hover:bg-[#E66000] transition-colors shadow-lg shadow-orange-200"
            >
              Recarregar Painel
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './components/Login';

// Top-level export with AuthProvider and ErrorBoundary
export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Toaster position="top-right" richColors />
        <AppWrapper />
      </AuthProvider>
    </ErrorBoundary>
  );
}

function AppWrapper() {
  const { currentUser, userProfile, loading: authLoading, logout, isAdmin, isGestor, isColaborador } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeSectorId, setActiveSectorId] = useState<string>('onboarding');
  const [activeOperation, setActiveOperation] = useState<'sittax' | 'openix'>('sittax');
  const [months, setMonths] = useState<Month[]>([]);
  const [selectedMonthId, setSelectedMonthId] = useState<string>('');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [dataValues, setDataValues] = useState<DataValue[]>([]);
  const [evaluations, setEvaluations] = useState<DevelopmentEvaluation[]>([]);
  const [sectorHighlights, setSectorHighlights] = useState<SectorHighlight[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSetoresExpanded, setIsSetoresExpanded] = useState(true);
  const [isGeneralExpanded, setIsGeneralExpanded] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'users'>('dashboard');
  const [operationDates, setOperationDates] = useState<OperationDate[]>([]);

  useEffect(() => {
    if (window.innerWidth > 1024) {
      setIsSidebarOpen(true);
    }
  }, []);
  
  // Modals state
  const [isNewMonthModalOpen, setIsNewMonthModalOpen] = useState(false);
  const [isEditMonthModalOpen, setIsEditMonthModalOpen] = useState(false);
  const [isCollaboratorModalOpen, setIsCollaboratorModalOpen] = useState(false);
  const [isIndicatorModalOpen, setIsIndicatorModalOpen] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState<Collaborator | null>(null);
  const [editingIndicator, setEditingIndicator] = useState<Indicator | null>(null);

  const [sectorOverrides, setSectorOverrides] = useState<Record<string, Partial<Sector>>>({});
  const [isSectorModalOpen, setIsSectorModalOpen] = useState(false);
  const [devSelectedSectorId, setDevSelectedSectorId] = useState<string>(SECTORS[0].id);
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [isDevelopmentModalOpen, setIsDevelopmentModalOpen] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);

  const activeSector = useMemo(() => {
    const base = SECTORS.find(s => s.id === activeSectorId) || SECTORS[0];
    const override = sectorOverrides[activeSectorId];
    return override ? { ...base, ...override } : base;
  }, [activeSectorId, sectorOverrides]);

  const selectedMonth = useMemo(() => months.find(m => m.id === selectedMonthId), [months, selectedMonthId]);

  useEffect(() => {
    if (userProfile?.setor && !isAdmin) {
      const sectorValues = Array.isArray(userProfile.setor) ? userProfile.setor : [userProfile.setor];
      if (sectorValues.length > 0) {
        const firstSectorId = normalizeId(sectorValues[0]);
        setActiveSectorId(firstSectorId);
        setDevSelectedSectorId(firstSectorId);
      }
    }
  }, [userProfile?.setor, isAdmin]);

  useEffect(() => {
    if (!userProfile || authLoading) return;

    const init = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchMonths(),
          fetchSectorOverrides(),
          fetchEvaluations(),
          fetchSectorHighlights(),
          fetchOperationDates(),
        ]);
        if (selectedMonthId) {
          await fetchMonthData(selectedMonthId);
        }
        console.log('App loaded successfully');
      } catch (err) {
        console.error('Error during init:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [userProfile?.uid, authLoading]); // Only re-run when user changes, not on profile object changes if possible

  useEffect(() => {
    if (selectedMonthId && !authLoading && userProfile) {
      fetchMonthData(selectedMonthId);
    }
  }, [selectedMonthId]);

  // Remove the redundant effector at line 455 if it was there (I'll check range)

  const fetchOperationDates = async () => {
    if (!selectedMonthId || !userProfile) return;
    const q = query(collection(db, 'operationDates'), where('monthId', '==', selectedMonthId));
    const snapshot = await getDocs(q);
    setOperationDates(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as OperationDate)));
  };

  const fetchEvaluations = async () => {
    if (!userProfile) return;
    let q = query(collection(db, 'evaluations'));
    if (isColaborador) {
      q = query(q, where('uid', '==', userProfile?.uid));
    } else if (isGestor && userProfile.setor) {
      const sectors = Array.isArray(userProfile.setor) ? userProfile.setor : [userProfile.setor];
      const sectorIds = sectors.map(s => normalizeId(s));
      if (sectorIds.length > 0) {
        q = query(q, where('sectorId', 'in', sectorIds));
      }
    }
    const snapshot = await getDocs(q);
    setEvaluations(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DevelopmentEvaluation)));
  };

  const fetchSectorHighlights = async () => {
    if (!userProfile) return;
    const q = query(collection(db, 'sectorHighlights'));
    const snapshot = await getDocs(q);
    setSectorHighlights(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SectorHighlight)));
  };

  const fetchSectorOverrides = async () => {
    if (!userProfile) return;
    const snapshot = await getDocs(collection(db, 'sectorOverrides'));
    const overrides: Record<string, Partial<Sector>> = {};
    snapshot.docs.forEach(doc => {
      overrides[doc.id] = doc.data() as Partial<Sector>;
    });
    setSectorOverrides(overrides);
  };

  const fetchMonths = async () => {
    if (!userProfile) return;
    const q = query(collection(db, 'months'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const monthsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Month));
    
    // Sort months chronologically (newest first)
    const sortedMonths = monthsData.sort((a, b) => {
      try {
        const dateA = parse(a.name, 'MM/yyyy', new Date());
        const dateB = parse(b.name, 'MM/yyyy', new Date());
        return dateB.getTime() - dateA.getTime();
      } catch (e) {
        return 0;
      }
    });

    if (monthsData.length === 0) {
      // Create initial month if none exists
      const initialMonthName = format(new Date(), 'MM/yyyy');
      const docRef = await addDoc(collection(db, 'months'), {
        name: initialMonthName,
        createdAt: serverTimestamp()
      });
      const newMonth = { id: docRef.id, name: initialMonthName, createdAt: new Date() };
      setMonths([newMonth]);
      setSelectedMonthId(docRef.id);
      await seedOnboardingData(docRef.id);
    } else {
      setMonths(sortedMonths);
      setSelectedMonthId(sortedMonths[0].id);
    }
  };

  const seedOnboardingData = async (monthId: string) => {
    const batch = writeBatch(db);
    
    // Seed Onboarding Indicators
    const onboardingIndicators = [
      { name: 'Clientes Ativos (Simples)', type: 'number', order: 0 },
      { name: 'Clientes Ativos (Recupera)', type: 'number', order: 1 },
      { name: 'Clientes Migrados', type: 'number', order: 2 },
      { name: '% carteira concluída', type: 'percentage', order: 3 },
      { name: 'CSAT médio', type: 'percentage', order: 4 },
      { name: 'Total de Avaliação', type: 'number', order: 5 },
      { name: 'Backlog', type: 'number', order: 6 },
      { name: 'Chamados em Aberto', type: 'number', order: 7 },
      { name: 'Cancelamentos', type: 'number', order: 8 },
      { name: 'Inadimplente', type: 'number', order: 9 },
      { name: 'Cancelamento Automáticos', type: 'number', order: 10 },
      { name: 'Valor Perdido (Setor)', type: 'currency', order: 11 },
      { name: 'Valor Recuperado (Setor)', type: 'currency', order: 12 },
      { name: 'Meta (Migração)', type: 'currency', order: 13 },
      { name: 'Valor Perdido (Total)', type: 'currency', order: 14 },
    ];

    const indicatorRefs: string[] = [];
    for (const ind of onboardingIndicators) {
      const ref = doc(collection(db, 'indicators'));
      batch.set(ref, { ...ind, monthId, sectorId: 'onboarding' });
      indicatorRefs.push(ref.id);
    }

    // Seed Onboarding Collaborators
    const onboardingCollaborators = [
      { name: 'Consultor 1', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix', meta: 100 },
      { name: 'Consultor 2', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka', meta: 100 },
      { name: 'Consultor 3', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sawyer', meta: 100 },
      { name: 'Consultor 4', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jameson', meta: 100 },
      { name: 'Consultor 5', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jocelyn', meta: 100 },
      { name: 'Consultor 6', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=George', meta: 100 },
    ];

    const collaboratorRefs: string[] = [];
    for (const col of onboardingCollaborators) {
      const ref = doc(collection(db, 'collaborators'));
      batch.set(ref, { ...col, monthId, sectorId: 'onboarding' });
      collaboratorRefs.push(ref.id);
    }

    // Seed some random data for Onboarding
    for (let i = 0; i < indicatorRefs.length; i++) {
      for (let j = 0; j < collaboratorRefs.length; j++) {
        const valRef = doc(collection(db, 'dataValues'));
        const isPercentage = onboardingIndicators[i].type === 'percentage';
        const isCurrency = onboardingIndicators[i].type === 'currency';
        let val: any = Math.floor(Math.random() * 50);
        if (isPercentage) val = Math.floor(Math.random() * 100);
        if (isCurrency) val = Math.floor(Math.random() * 2000);
        
        batch.set(valRef, {
          monthId,
          indicatorId: indicatorRefs[i],
          collaboratorId: collaboratorRefs[j],
          value: val
        });
      }
    }

    await batch.commit();
    await fetchMonthData(monthId);
  };

  const fetchMonthData = async (monthId: string) => {
    if (!userProfile || !monthId) return;
    try {
      let colQuery = query(collection(db, 'collaborators'), where('monthId', '==', monthId));
      let indQuery = query(collection(db, 'indicators'), where('monthId', '==', monthId));
      let valQuery = query(collection(db, 'dataValues'), where('monthId', '==', monthId));

      if (isAdmin) {
        // Admin gets all
      } else if (isGestor && userProfile?.setor) {
        const sectors = Array.isArray(userProfile.setor) ? userProfile.setor : [userProfile.setor];
        const sectorIds = sectors.map(s => normalizeId(s));
        if (sectorIds.length > 0) {
          colQuery = query(colQuery, where('sectorId', 'in', sectorIds));
          indQuery = query(indQuery, where('sectorId', 'in', sectorIds));
        }
        console.log("FETCH MONTH DATA (LEADER): SectorIDs", sectorIds);
      } else if (isColaborador) {
        colQuery = query(colQuery, where('uid', '==', userProfile?.uid));
      }

      const [colSnap, indSnap, valSnap, highSnap, dateSnap] = await Promise.all([
        getDocs(colQuery),
        getDocs(indQuery),
        getDocs(valQuery),
        getDocs(query(collection(db, 'sectorHighlights'), where('monthId', '==', monthId))),
        getDocs(query(collection(db, 'operationDates'), where('monthId', '==', monthId)))
      ]);

      const cols = colSnap.docs.map(d => ({ id: d.id, ...d.data() } as Collaborator)).sort((a, b) => (a.order || 0) - (b.order || 0));
      const inds = indSnap.docs.map(d => ({ id: d.id, ...d.data() } as Indicator)).sort((a, b) => (a.order || 0) - (b.order || 0));
      const vals = valSnap.docs.map(d => ({ id: d.id, ...d.data() } as DataValue));
      const highs = highSnap.docs.map(d => ({ id: d.id, ...d.data() } as SectorHighlight));
      const dates = dateSnap.docs.map(d => ({ id: d.id, ...d.data() } as OperationDate));

      setCollaborators(cols);
      setIndicators(inds);
      setDataValues(vals);
      setSectorHighlights(highs);
      setOperationDates(dates);
      
      console.log(`Fetched data for month ${monthId}:`, {
        collaborators: cols.length,
        indicators: inds.length,
        dataValues: vals.length,
        highlights: highs.length,
        dates: dates.length
      });
    } catch (error) {
      console.error('Error fetching month data:', error);
    }
  };

  const handleCreateMonth = async (name: string, copyFromId?: string) => {
    const docRef = await addDoc(collection(db, 'months'), {
      name,
      createdAt: serverTimestamp()
    });
    const newMonthId = docRef.id;

    if (copyFromId) {
      const batch = writeBatch(db);
      
      // Copy indicators
      const prevIndicators = indicators.filter(i => i.monthId === copyFromId);
      const indicatorMap: Record<string, string> = {};
      for (const ind of prevIndicators) {
        const newIndRef = doc(collection(db, 'indicators'));
        const { id, monthId, ...data } = ind;
        batch.set(newIndRef, { ...data, monthId: newMonthId });
        indicatorMap[id] = newIndRef.id;
      }

      // Copy collaborators
      const prevCollaborators = collaborators.filter(c => c.monthId === copyFromId);
      for (const col of prevCollaborators) {
        const newColRef = doc(collection(db, 'collaborators'));
        const { id, monthId, ...data } = col;
        batch.set(newColRef, { ...data, monthId: newMonthId });
      }

      await batch.commit();
    }

    await fetchMonths();
    setIsNewMonthModalOpen(false);
  };

  const handleUpdateMonth = async (id: string, name: string) => {
    await updateDoc(doc(db, 'months', id), { name });
    setMonths(months.map(m => m.id === id ? { ...m, name } : m));
    setIsEditMonthModalOpen(false);
  };

  const handleDeleteMonth = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Mês',
      message: 'Deseja excluir este mês e todos os seus dados? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        const batch = writeBatch(db);
        
        // Delete dataValues
        const valSnap = await getDocs(query(collection(db, 'dataValues'), where('monthId', '==', id)));
        valSnap.docs.forEach(d => batch.delete(d.ref));
        
        // Delete indicators
        const indSnap = await getDocs(query(collection(db, 'indicators'), where('monthId', '==', id)));
        indSnap.docs.forEach(d => batch.delete(d.ref));
        
        // Delete collaborators
        const colSnap = await getDocs(query(collection(db, 'collaborators'), where('monthId', '==', id)));
        colSnap.docs.forEach(d => batch.delete(d.ref));
        
        // Delete month
        batch.delete(doc(db, 'months', id));
        
        await batch.commit();
        
        const remainingMonths = months.filter(m => m.id !== id);
        setMonths(remainingMonths);
        if (remainingMonths.length > 0) {
          setSelectedMonthId(remainingMonths[0].id);
        } else {
          await fetchMonths();
        }
        setIsEditMonthModalOpen(false);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleSaveValue = useCallback(async (indicatorId: string, collaboratorId: string, value: string | number, date?: string) => {
    const indicator = indicators.find(i => i.id === indicatorId);
    let finalValue = value;
    
    if (indicator?.type === 'time' && typeof value === 'string' && value.includes(':')) {
      const parts = value.split(':').reverse();
      let seconds = 0;
      if (parts[0]) seconds += parseInt(parts[0], 10) || 0;
      if (parts[1]) seconds += (parseInt(parts[1], 10) || 0) * 60;
      if (parts[2]) seconds += (parseInt(parts[2], 10) || 0) * 3600;
      finalValue = seconds;
    }

    const existing = dataValues.find(v => 
      v.indicatorId === indicatorId && 
      v.collaboratorId === collaboratorId && 
      v.monthId === selectedMonthId &&
      (v.operation || 'sittax') === activeOperation &&
      (date ? v.date === date : !v.date)
    );
    
    if (existing) {
      await updateDoc(doc(db, 'dataValues', existing.id), { value: finalValue });
    } else {
      await addDoc(collection(db, 'dataValues'), {
        indicatorId,
        collaboratorId,
        monthId: selectedMonthId,
        value: finalValue,
        operation: activeOperation,
        date: date || null
      });
    }
    fetchMonthData(selectedMonthId);
  }, [indicators, dataValues, selectedMonthId, activeOperation]);

  const handleReorderIndicators = useCallback(async (reorderedIndicators: Indicator[]) => {
    const batch = writeBatch(db);
    reorderedIndicators.forEach((ind, index) => {
      const ref = doc(db, 'indicators', ind.id);
      batch.update(ref, { order: index });
    });
    await batch.commit();
    setIndicators(prev => {
      const otherInds = prev.filter(i => !reorderedIndicators.map(r => r.id).includes(i.id));
      return [...otherInds, ...reorderedIndicators.map((ind, index) => ({ ...ind, order: index }))].sort((a, b) => (a.order || 0) - (b.order || 0));
    });
  }, []);

  const handleReorderCollaborators = useCallback(async (reorderedCollaborators: Collaborator[]) => {
    const batch = writeBatch(db);
    reorderedCollaborators.forEach((col, index) => {
      const ref = doc(db, 'collaborators', col.id);
      batch.update(ref, { order: index });
    });
    await batch.commit();
    setCollaborators(prev => {
      const otherCols = prev.filter(c => !reorderedCollaborators.map(r => r.id).includes(c.id));
      return [...otherCols, ...reorderedCollaborators.map((col, index) => ({ ...col, order: index }))].sort((a, b) => (a.order || 0) - (b.order || 0));
    });
  }, []);

  const handleAddDate = async (date: string) => {
    if (!selectedMonthId) return;
    try {
      await addDoc(collection(db, 'operationDates'), {
        monthId: selectedMonthId,
        operation: activeOperation,
        date
      });
      fetchOperationDates();
    } catch (error) {
      console.error('Error adding date:', error);
    }
  };

  const handleDeleteDate = async (dateId: string) => {
    try {
      await deleteDoc(doc(db, 'operationDates', dateId));
      fetchOperationDates();
    } catch (error) {
      console.error('Error deleting date:', error);
    }
  };

  const handleToggleHighlight = useCallback(async (sectorId: string, monthId: string, collaboratorId: string) => {
    const existing = sectorHighlights.find(h => h.sectorId === sectorId && h.monthId === monthId);
    
    if (existing) {
      if (existing.collaboratorId === collaboratorId) {
        // Remove highlight
        await deleteDoc(doc(db, 'sectorHighlights', existing.id));
      } else {
        // Update highlight
        await updateDoc(doc(db, 'sectorHighlights', existing.id), { collaboratorId });
      }
    } else {
      // Create highlight
      await addDoc(collection(db, 'sectorHighlights'), {
        sectorId,
        monthId,
        collaboratorId
      });
    }
    fetchMonthData(monthId);
  }, [sectorHighlights]);
  const handleAddCollaborator = async (data: Partial<Collaborator>) => {
    const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
    if (editingCollaborator) {
      // Sync update to ALL months for this specific collaborator (using UID or name/sector if UID missing)
      const batch = writeBatch(db);
      
      let q;
      if (editingCollaborator.uid) {
        q = query(collection(db, 'collaborators'), where('uid', '==', editingCollaborator.uid));
      } else {
        q = query(collection(db, 'collaborators'), 
          where('name', '==', editingCollaborator.name), 
          where('sectorId', '==', editingCollaborator.sectorId)
        );
      }
      
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(d => {
        batch.update(d.ref, cleanData);
      });
      await batch.commit();
      console.log(`Updated collaborator in ${snapshot.docs.length} months`);
    } else {
      let finalData = { ...cleanData };
      
      // Replicate photo logic
      if (!finalData.avatarUrl && finalData.name) {
        try {
          const q = query(
            collection(db, 'collaborators'),
            where('name', '==', finalData.name),
            where('sectorId', '==', activeSectorId)
          );
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const existingColabs = querySnapshot.docs.map(d => d.data() as Collaborator);
            const withPhoto = existingColabs.find(c => c.avatarUrl);
            if (withPhoto) {
              finalData.avatarUrl = withPhoto.avatarUrl;
            }
          }
        } catch (error) {
          console.error("Error replicating photo:", error);
        }
      }

      // Add to ALL months
      const batch = writeBatch(db);
      for (const m of months) {
        const ref = doc(collection(db, 'collaborators'));
        batch.set(ref, {
          ...finalData,
          monthId: m.id,
          sectorId: activeSectorId,
          createdAt: serverTimestamp()
        });
      }
      await batch.commit();
      console.log(`Added collaborator to ${months.length} months`);
    }
    fetchMonthData(selectedMonthId);
    setIsCollaboratorModalOpen(false);
    setEditingCollaborator(null);
  };

  const handleAddIndicator = async (data: Partial<Indicator>) => {
    const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
    if (editingIndicator) {
      // Sync update to ALL months for this indicator (using name/sector as key)
      const batch = writeBatch(db);
      const q = query(collection(db, 'indicators'), 
        where('name', '==', editingIndicator.name), 
        where('sectorId', '==', editingIndicator.sectorId)
      );
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(d => {
        batch.update(d.ref, cleanData);
      });
      await batch.commit();
      console.log(`Updated indicator in ${snapshot.docs.length} months`);
    } else {
      const targetSectorId = data.sectorId || activeSectorId;
      
      const batch = writeBatch(db);
      for (const m of months) {
        const sectorIndicators = indicators.filter(i => i.sectorId === targetSectorId && i.monthId === m.id);
        const ref = doc(collection(db, 'indicators'));
        batch.set(ref, {
          ...cleanData,
          monthId: m.id,
          sectorId: targetSectorId,
          order: sectorIndicators.length,
          isGeneral: activeSectorId.startsWith('general')
        });
      }
      await batch.commit();
      console.log(`Added indicator to ${months.length} months`);
    }
    fetchMonthData(selectedMonthId);
    setIsIndicatorModalOpen(false);
    setEditingIndicator(null);
  };

  const handleDeleteCollaborator = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remover Colaborador',
      message: 'Deseja realmente remover este colaborador? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        await deleteDoc(doc(db, 'collaborators', id));
        fetchMonthData(selectedMonthId);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeleteIndicator = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remover Indicador',
      message: 'Deseja realmente remover este indicador? Todos os dados vinculados serão perdidos.',
      onConfirm: async () => {
        await deleteDoc(doc(db, 'indicators', id));
        fetchMonthData(selectedMonthId);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleUpdateSector = async (data: Partial<Sector>) => {
    await updateDoc(doc(db, 'sectorOverrides', activeSectorId), data).catch(async () => {
      // If doc doesn't exist, create it
      const { id, ...rest } = data;
      await addDoc(collection(db, 'sectorOverrides'), { ...rest, id: activeSectorId });
      // Wait, addDoc creates random ID. I should use setDoc.
    });
    // Let's use setDoc for better control
  };

  // Corrected handleUpdateSector
  const handleUpdateSectorCorrected = async (data: Partial<Sector>) => {
    const { id, ...rest } = data;
    const ref = doc(db, 'sectorOverrides', activeSectorId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, rest);
    } else {
      const { id: _, ...cleanData } = data;
      // We need to be careful with types here
      const finalData: any = { ...cleanData };
      await writeBatch(db).set(ref, finalData).commit();
    }
    await fetchSectorOverrides();
    setIsSectorModalOpen(false);
  };

  const handleExport = () => {
    if (!selectedMonth) return;
    
    if (activeSectorId === 'development') {
      // Export evaluations
      const headers = ['Colaborador', 'Setor', 'Data Avaliação', 'Skill Técnico', 'Vontade Comportamental', 'Classificação'];
      const rows = evaluations
        .filter(e => {
          const collab = collaborators.find(c => c.id === e.collaboratorId);
          if (isColaborador) return collab?.uid === userProfile?.uid && e.monthId === selectedMonthId;
          if (isGestor) {
            const sectors = Array.isArray(userProfile?.setor) ? userProfile.setor : [userProfile?.setor || ''];
            const sectorIds = sectors.map(s => normalizeId(s));
            return sectorIds.includes(collab?.sectorId || '') && e.monthId === selectedMonthId;
          }
          return e.monthId === selectedMonthId && (devSelectedSectorId === 'all' || collab?.sectorId === devSelectedSectorId);
        })
        .map(e => {
          const collab = collaborators.find(c => c.id === e.collaboratorId);
          const s = SECTORS.find(s => s.id === collab?.sectorId);
          return [
            collab?.name || '-',
            s?.name || '-',
            e.evaluationDate || '-',
            e.technicalAverage.toFixed(2).replace('.', ','),
            e.behavioralAverage.toFixed(2).replace('.', ','),
            e.classification
          ];
        });

      const csvContent = [
        headers.join(';'),
        ...rows.map(r => r.join(';'))
      ].join('\n');

      const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `sittax_avaliacoes_${selectedMonth.name.replace('/', '-')}.csv`;
      link.click();
      return;
    }

    // Matrix export for specific sector
    if (activeSectorId !== 'overview' && !activeSectorId.startsWith('general')) {
      const sector = SECTORS.find(s => s.id === activeSectorId);
      const sectorIndicators = indicators.filter(i => normalizeId(i.sectorId) === normalizeId(activeSectorId));
      const sectorCollaborators = collaborators.filter(c => normalizeId(c.sectorId) === normalizeId(activeSectorId));
      
      const headers = ['Consultor', 'Cargo', 'Setor', 'Nota Evaluation', 'Status', ...sectorIndicators.map(i => i.name)];
      const rows = sectorCollaborators.map(c => {
        const evalData = evaluations.find(e => e.collaboratorId === c.id && e.monthId === selectedMonthId);
        const score = evalData ? (evalData.technicalAverage + evalData.behavioralAverage) / 2 : 0;
        // @ts-ignore
        const cargo = c.cargo || (c.role === 'lider' ? 'Líder' : 'Colaborador');
        const status = 'Ativo';
        
        const indValues = sectorIndicators.map(ind => {
          const val = dataValues.find(v => 
            v.indicatorId === ind.id && 
            v.collaboratorId === c.id &&
            (v.operation === activeOperation || v.operation === 'both' || !v.operation)
          )?.value;
          return val === undefined ? '-' : val;
        });

        return [c.name, cargo, sector?.name || '', score.toFixed(1), status, ...indValues];
      });

      const csvContent = [
        headers.join(';'),
        ...rows.map(r => r.join(';'))
      ].join('\n');

      const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `sittax_${sector?.name.toLowerCase() || 'performance'}_${selectedMonth.name.replace('/', '-')}.csv`;
      link.click();
      return;
    }

    // Case for General Indicator View
    if (activeSectorId.startsWith('general')) {
      const operation = activeOperation;
      const currentDates = operationDates
        .filter(od => od.monthId === selectedMonthId && od.operation === operation)
        .sort((a, b) => a.date.localeCompare(b.date));

      const headers = ['Setor', 'Indicador', ...currentDates.map(od => format(parse(od.date, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy'))];
      
      const rows: string[][] = [];
      
      SECTORS.forEach(sector => {
        const sectorIndicators = indicators.filter(i => 
          i.sectorId === sector.id && 
          i.isGeneral !== false && 
          (i.operation === operation || i.operation === 'both' || !i.operation)
        );
        
        sectorIndicators.forEach(indicator => {
          const row = [
            sector.name,
            indicator.name,
            ...currentDates.map(od => {
              const dv = dataValues.find(d => 
                d.indicatorId === indicator.id && 
                d.collaboratorId === 'sector' && 
                (d.operation === operation || d.operation === 'both' || !d.operation) &&
                normalizeDate(d.date || '') === normalizeDate(od.date)
              );
              return dv?.value !== undefined ? formatValue(dv.value, indicator.type) : '-';
            })
          ];
          rows.push(row);
        });
      });

      const csvContent = [
        headers.join(';'),
        ...rows.map(r => r.join(';'))
      ].join('\n');

      const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `sittax_indicador_geral_${operation}_${selectedMonth.name.replace('/', '-')}.csv`;
      link.click();
      return;
    }

    // Standard performance export for Overview
    const headers = ['Setor', 'Indicador', 'Colaborador', 'Valor'];
    const rows = dataValues
      .filter(v => v.monthId === selectedMonthId)
      .map(v => {
        const indicator = indicators.find(i => i.id === v.indicatorId);
        const collaborator = collaborators.find(c => c.id === v.collaboratorId);
        const sector = SECTORS.find(s => s.id === (collaborator?.sectorId || indicator?.sectorId));
        return [
          sector?.name || '-',
          indicator?.name || '-',
          collaborator?.name || 'Setor',
          formatValue(v.value, indicator?.type || 'number')
        ];
      });

    const csvContent = [
      headers.join(';'),
      ...rows.map(r => r.join(';'))
    ].join('\n');

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sittax_geral_${selectedMonth.name.replace('/', '-')}.csv`;
    link.click();
  };

  const handlePrevMonth = () => {
    if (months.length > 1) {
      const currentIndex = months.findIndex(m => m.id === selectedMonthId);
      if (currentIndex < months.length - 1) {
        setSelectedMonthId(months[currentIndex + 1].id);
      }
    }
  };

  const handleNextMonth = () => {
    const currentIndex = months.findIndex(m => m.id === selectedMonthId);
    if (currentIndex > 0) {
      setSelectedMonthId(months[currentIndex - 1].id);
    }
  };

  if (authLoading) return (
    <div className="h-screen w-full flex items-center justify-center bg-gray-50 font-medium text-gray-500">
      Carregando sessão...
    </div>
  );

  if (currentUser && !userProfile) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto text-red-600">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Acesso não autorizado</h2>
        <p className="text-gray-500">Seu e-mail ({currentUser.email}) não está vinculado a um perfil no sistema. Entre em contato com o administrador.</p>
        <button 
          onClick={() => logout()}
          className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold"
        >
          Voltar para o Login
        </button>
      </div>
    </div>
  );

  if (!userProfile) return <Login />;

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Carregando Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex w-full overflow-hidden">
      {/* Overlay for mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-40 bg-white border-r border-gray-100 transition-all duration-300 flex flex-col",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-0 lg:opacity-0"
      )} style={{ 
        minWidth: isSidebarOpen ? '260px' : '0', 
        width: isSidebarOpen ? '260px' : '0',
        flexShrink: 0, 
        height: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden'
      }}>
        <div className="p-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF6B00] rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
              <TrendingUp className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-xl text-gray-900 tracking-tight">Sittax</h1>
              <p className="text-[10px] uppercase tracking-widest text-[#FF6B00] font-bold">Acompanhamento</p>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto overflow-x-hidden pt-2 pb-8 custom-scrollbar scroll-smooth">
          {(isAdmin || isGestor || isColaborador) && (
            <NavItem 
              icon={<BrainCircuit size={20} />} 
              label={isColaborador ? "Minha Avaliação" : "Avaliação de Equipe"} 
              active={activeSectorId === 'development'} 
              onClick={() => { 
                setActiveSectorId('development'); 
                setActiveView('dashboard');
                if (window.innerWidth < 1024) setIsSidebarOpen(false); 
              }} 
            />
          )}

          {(isAdmin) && (
            <NavItem 
              icon={<LayoutDashboard size={20} />} 
              label={isAdmin ? "Visão Geral" : "Dashboard de Performance"} 
              active={activeSectorId === 'overview'} 
              onClick={() => { 
                setActiveSectorId('overview'); 
                setActiveView('dashboard');
                if (window.innerWidth < 1024) setIsSidebarOpen(false); 
              }} 
            />
          )}

          {isColaborador && (
            <NavItem 
              icon={<Award size={20} />} 
              label="Meu Resultado" 
              active={activeSectorId === 'my-results'} 
              onClick={() => { 
                setActiveSectorId('my-results'); 
                setActiveView('dashboard');
                if (window.innerWidth < 1024) setIsSidebarOpen(false); 
              }} 
            />
          )}
          
          {/* Indicador Geral Expandable */}
          {(isAdmin || isGestor) && (
            <div>
              <button 
                onClick={() => setIsGeneralExpanded(!isGeneralExpanded)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group",
                activeSectorId.startsWith('general') ? "bg-orange-50 text-[#FF6B00]" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <div className="flex items-center gap-3">
                <BarChart3 size={20} />
                <span className="font-bold text-sm">Indicador Geral</span>
              </div>
              <ChevronDown size={16} className={cn("transition-transform", isGeneralExpanded && "rotate-180")} />
            </button>
            <AnimatePresence>
              {isGeneralExpanded && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden ml-4 mt-1 space-y-1"
                >
                  <button 
                    onClick={() => {
                      setActiveSectorId('general-sittax');
                      setActiveOperation('sittax');
                      setActiveView('dashboard');
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                      activeSectorId === 'general-sittax' ? "text-[#FF6B00] bg-orange-50/50" : "text-[#FF6B00]/70 hover:text-[#FF6B00] hover:bg-orange-50/30"
                    )}
                  >
                    <div className="w-5 h-5 flex items-center justify-center bg-white rounded-md overflow-hidden shadow-sm">
                      <img 
                        src="https://i.postimg.cc/GtHcm40C/sittax-profile.jpg" 
                        className="w-full h-full object-cover" 
                        alt="Sittax"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    Sittax
                  </button>
                  <button 
                    onClick={() => {
                      setActiveSectorId('general-openix');
                      setActiveOperation('openix');
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                      activeSectorId === 'general-openix' ? "text-[#FF6B00] bg-orange-50/50" : "text-[#FF6B00]/70 hover:text-[#FF6B00] hover:bg-orange-50/30"
                    )}
                  >
                    <div className="w-5 h-5 flex items-center justify-center bg-white border border-gray-100 rounded-md p-0.5 shadow-sm">
                      <img 
                        src="https://openix.com.br/wp-content/uploads/2024/08/icon-logo.svg" 
                        className="w-full h-full object-contain" 
                        alt="Openix"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    Openix
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          )}

          {/* Setores Expandable */}
          <div>
            <button 
              onClick={() => setIsSetoresExpanded(!isSetoresExpanded)}
              className="w-full flex items-center justify-between px-4 py-3 text-gray-400 hover:text-gray-600 transition-all mt-4"
            >
              <p className="text-[10px] font-bold uppercase tracking-widest">Setores</p>
              <ChevronDown size={14} className={cn("transition-transform", isSetoresExpanded && "rotate-180")} />
            </button>
            <AnimatePresence>
              {isSetoresExpanded && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-1 mt-1"
                >
                  {SECTORS.filter(s => {
                    if (isAdmin) return true;
                    if (isGestor || isColaborador) {
                      const profileSectors = Array.isArray(userProfile?.setor) ? userProfile.setor : [userProfile?.setor || ''];
                      const profileSectorIds = profileSectors.map(s => normalizeId(s));
                      return profileSectorIds.includes(normalizeId(s.name));
                    }
                    return true;
                  }).map(sector => {
                    const IconComponent = {
                      Calendar,
                      UserPlus,
                      TrendingUp,
                      Heart,
                      MessageSquare
                    }[sector.icon || ''] || LayoutDashboard;

                    return (
                      <NavItem 
                        key={sector.id}
                        icon={<IconComponent size={18} style={{ color: sector.color }} />} 
                        label={sector.name} 
                        active={activeSectorId === sector.id} 
                        onClick={() => { 
                          setActiveSectorId(sector.id); 
                          setActiveView('dashboard');
                          if (window.innerWidth < 1024) setIsSidebarOpen(false); 
                        }} 
                      />
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {isAdmin || isGestor ? (
            <div className="pt-6 border-t border-gray-50 mt-6">
              <p className="px-4 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Administração</p>
              <NavItem 
                icon={<Users size={20} />} 
                label="Usuários" 
                active={activeView === 'users'} 
                onClick={() => { 
                  setActiveView('users'); 
                  if (window.innerWidth < 1024) setIsSidebarOpen(false); 
                }} 
              />
            </div>
          ) : null}

          <div className="pt-2">
            <NavItem 
              icon={<Settings size={20} />} 
              label="Configurações" 
              active={activeView === 'settings'} 
              onClick={() => { 
                setActiveView('settings'); 
                if (window.innerWidth < 1024) setIsSidebarOpen(false); 
              }} 
            />
          </div>
        </nav>

        <div className="p-4 mt-auto border-t border-gray-100">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden border border-gray-200">
              <img 
                src={userProfile?.fotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.nome || 'User')}&background=random`} 
                className="w-full h-full object-cover" 
                alt={userProfile?.nome} 
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-gray-900 truncate">{userProfile?.nome}</p>
              <p className="text-[10px] text-gray-500 truncate uppercase font-semibold">{userProfile?.cargo || userProfile?.role}</p>
            </div>
          </div>
          <button 
            onClick={() => logout()}
            className="w-full flex items-center gap-2 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all font-bold text-sm"
          >
            <X size={18} />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto w-full bg-gray-50/30">
        {/* Topbar */}
        <header className="h-auto lg:h-20 bg-white border-b border-gray-100 flex flex-col lg:flex-row items-center justify-between px-4 py-4 lg:py-0 lg:px-8 sticky top-0 z-30 gap-4 lg:gap-0">
          <div className="flex items-center justify-between w-full lg:w-auto gap-4 lg:gap-6">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Menu size={24} className="text-gray-600" />
              </button>
              <div className="flex items-center gap-2">
                <Calendar className="text-gray-400 w-5 h-5 hidden sm:block" />
                <div className="flex items-center gap-1 group">
                  <select 
                    value={selectedMonthId}
                    onChange={(e) => setSelectedMonthId(e.target.value)}
                    className="bg-transparent font-bold text-gray-900 focus:outline-none cursor-pointer hover:text-[#FF6B00] transition-colors text-sm lg:text-base"
                  >
                    {months.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  {isAdmin && (
                    <button 
                      onClick={() => setIsEditMonthModalOpen(true)}
                      className="p-1 text-gray-400 hover:text-[#FF6B00] transition-colors"
                      title="Editar Mês"
                    >
                      <Settings size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex bg-gray-50 p-1 rounded-lg">
               <button 
                 onClick={handleNextMonth}
                 className={cn(
                   "px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-bold rounded-md transition-all",
                   months.findIndex(m => m.id === selectedMonthId) === 0 
                    ? "text-gray-900 bg-white shadow-sm" 
                    : "text-gray-400 hover:text-gray-600"
                 )}
               >
                 Atual
               </button>
               <button 
                 onClick={handlePrevMonth}
                 className={cn(
                   "px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-bold rounded-md transition-all",
                   months.findIndex(m => m.id === selectedMonthId) > 0 
                    ? "text-gray-900 bg-white shadow-sm" 
                    : "text-gray-400 hover:text-gray-600"
                 )}
               >
                 Anterior
               </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto justify-end">
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setIsNewMonthModalOpen(true)} className="flex-1 lg:flex-none text-[10px] sm:text-sm">
                <Plus size={16} />
                <span className="hidden xs:inline">Novo Mês</span>
                <span className="xs:hidden">Novo</span>
              </Button>
            )}
            <Button size="sm" onClick={handleExport} className="flex-1 lg:flex-none text-[10px] sm:text-sm">
              <Download size={16} />
              Exportar
            </Button>
            <div className="flex items-center gap-2 ml-2 pl-4 border-l border-gray-100">
               <div className="hidden sm:flex flex-col items-end text-right">
                  <p className="text-xs font-bold text-gray-900">{userProfile?.nome}</p>
                  <p className="text-[10px] text-[#FF6B00] font-bold uppercase tracking-wider">
                    {Array.isArray(userProfile?.setor) ? userProfile.setor.join(' & ') : userProfile?.setor}
                  </p>
               </div>
               <div className="w-9 h-9 rounded-full border-2 border-[#FF6B00]/20 p-0.5">
                  <img 
                    src={userProfile?.fotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.nome || 'User')}&background=random`} 
                    className="w-full h-full rounded-full object-cover"
                    alt="Profile"
                    referrerPolicy="no-referrer"
                  />
               </div>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 flex-1 max-w-[1920px] mx-auto w-full overflow-y-auto">
          {activeView === 'users' ? (
            <div className="w-full overflow-x-auto">
              <UserManagement />
            </div>
          ) : activeView === 'settings' ? (
            <div className="w-full">
              <SettingsView userProfile={userProfile} />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSectorId + selectedMonthId + activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeSectorId === 'overview' ? (
                <OverviewView 
                  sectors={SECTORS} 
                  indicators={indicators} 
                  dataValues={dataValues} 
                  collaborators={collaborators} 
                  sectorHighlights={sectorHighlights}
                  monthId={selectedMonthId}
                  activeOperation={activeOperation}
                  onNavigate={setActiveSectorId}
                />
              ) : activeSectorId === 'my-results' ? (
                <MyResultsView 
                  userProfile={userProfile}
                  collaborators={collaborators}
                  indicators={indicators}
                  dataValues={dataValues}
                  evaluations={evaluations}
                  monthId={selectedMonthId}
                />
              ) : activeSectorId === 'development' ? (
                <DevelopmentView 
                  sectors={SECTORS}
                  collaborators={collaborators}
                  evaluations={evaluations}
                  monthId={selectedMonthId}
                  selectedSectorId={devSelectedSectorId}
                  onSectorChange={setDevSelectedSectorId}
                  onSaveEvaluation={async (evalData) => {
                    const existing = evaluations.find(e => e.collaboratorId === evalData.collaboratorId && e.monthId === evalData.monthId);
                    const evalDataToUpdate: any = { 
                      ...evalData, 
                      liderId: userProfile?.uid || "",
                      liderNome: userProfile?.nome || "",
                      updatedAt: serverTimestamp() 
                    };
                    
                    // Force null for manualClassification if undefined to avoid Firebase error
                    if (evalDataToUpdate.manualClassification === undefined) {
                      evalDataToUpdate.manualClassification = null;
                    }
                    if (evalDataToUpdate.comments === undefined) {
                      evalDataToUpdate.comments = "";
                    }

                    if (existing) {
                      await updateDoc(doc(db, 'evaluations', existing.id), evalDataToUpdate);
                    } else {
                      const colab = collaborators.find(c => c.id === evalData.collaboratorId);
                      const profileSectors = Array.isArray(userProfile?.setor) ? userProfile.setor : [userProfile?.setor || "onboarding"];
                      const defaultSectorId = normalizeId(profileSectors[0]);
                      const evalDataToAdd: any = { 
                        ...evalData, 
                        uid: colab?.uid || "",
                        liderId: userProfile?.uid || "",
                        liderNome: userProfile?.nome || "",
                        sectorId: colab?.sectorId || defaultSectorId,
                        updatedAt: serverTimestamp() 
                      };
                      
                      if (evalDataToAdd.manualClassification === undefined) {
                        evalDataToAdd.manualClassification = null;
                      }
                      if (evalDataToAdd.comments === undefined) {
                        evalDataToAdd.comments = "";
                      }

                      await addDoc(collection(db, 'evaluations'), evalDataToAdd);
                    }
                    fetchEvaluations();
                  }}
                  onDeleteEvaluation={async (id) => {
                    setConfirmModal({
                      isOpen: true,
                      title: 'Remover Avaliação',
                      message: 'Deseja realmente remover esta avaliação? Esta ação não pode ser desfeita.',
                      onConfirm: async () => {
                        await deleteDoc(doc(db, 'evaluations', id));
                        fetchEvaluations();
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                      }
                    });
                  }}
                  onDeleteCollaborator={handleDeleteCollaborator}
                />
              ) : activeSectorId.startsWith('general') ? (
                <GeneralIndicatorView 
                  indicators={indicators}
                  dataValues={dataValues}
                  monthId={selectedMonthId}
                  operation={activeOperation}
                  operationDates={operationDates}
                  onSaveValue={handleSaveValue}
                  onAddDate={handleAddDate}
                  onDeleteDate={handleDeleteDate}
                  onAddIndicator={() => setIsIndicatorModalOpen(true)}
                  onEditIndicator={(i) => { setEditingIndicator(i); setIsIndicatorModalOpen(true); }}
                  onDeleteIndicator={handleDeleteIndicator}
                  onReorderIndicators={handleReorderIndicators}
                />
              ) : (
                <SectorDashboard 
                  sector={activeSector}
                  activeOperation={activeOperation}
                  monthId={selectedMonthId}
                  indicators={indicators.filter(i => 
                    i.sectorId === activeSectorId && 
                    i.isGeneral !== true && 
                    (i.operation === activeOperation || i.operation === 'both' || !i.operation)
                  )}
                  collaborators={collaborators.filter(c => c.sectorId === activeSectorId)}
                  dataValues={dataValues}
                  evaluations={evaluations}
                  sectorHighlights={sectorHighlights}
                  onSaveValue={handleSaveValue}
                  onToggleHighlight={handleToggleHighlight}
                  onAddCollaborator={() => setIsCollaboratorModalOpen(true)}
                  onEditCollaborator={(c) => { setEditingCollaborator(c); setIsCollaboratorModalOpen(true); }}
                  onDeleteCollaborator={handleDeleteCollaborator}
                  onAddIndicator={() => setIsIndicatorModalOpen(true)}
                  onEditIndicator={(i) => { setEditingIndicator(i); setIsIndicatorModalOpen(true); }}
                  onDeleteIndicator={handleDeleteIndicator}
                  onEditSector={() => { setEditingSector(activeSector); setIsSectorModalOpen(true); }}
                  onEvaluateCollaborator={(c) => {
                    setSelectedCollaborator(c);
                    setIsDevelopmentModalOpen(true);
                  }}
                  onReorderIndicators={handleReorderIndicators}
                  onReorderCollaborators={handleReorderCollaborators}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
      </main>

      {/* Modals */}
      <Modal isOpen={isNewMonthModalOpen} onClose={() => setIsNewMonthModalOpen(false)} title="Criar Novo Mês">
        <NewMonthForm 
          months={months} 
          onSubmit={handleCreateMonth} 
          onCancel={() => setIsNewMonthModalOpen(false)} 
        />
      </Modal>

      <Modal isOpen={isEditMonthModalOpen} onClose={() => setIsEditMonthModalOpen(false)} title="Editar Mês">
        {selectedMonth && (
          <EditMonthForm 
            month={selectedMonth}
            onSubmit={(name) => handleUpdateMonth(selectedMonth.id, name)}
            onDelete={() => handleDeleteMonth(selectedMonth.id)}
            onCancel={() => setIsEditMonthModalOpen(false)}
          />
        )}
      </Modal>

      <Modal 
        isOpen={isCollaboratorModalOpen} 
        onClose={() => { setIsCollaboratorModalOpen(false); setEditingCollaborator(null); }} 
        title={editingCollaborator ? "Editar Colaborador" : "Novo Colaborador"}
      >
        <CollaboratorForm 
          initialData={editingCollaborator || undefined}
          onSubmit={handleAddCollaborator}
          onDelete={editingCollaborator ? () => {
            handleDeleteCollaborator(editingCollaborator.id);
            setIsCollaboratorModalOpen(false);
            setEditingCollaborator(null);
          } : undefined}
          onCancel={() => { setIsCollaboratorModalOpen(false); setEditingCollaborator(null); }}
        />
      </Modal>

      <Modal 
        isOpen={isIndicatorModalOpen} 
        onClose={() => { setIsIndicatorModalOpen(false); setEditingIndicator(null); }} 
        title={editingIndicator ? "Editar Indicador" : "Novo Indicador"}
      >
        <IndicatorForm 
          initialData={editingIndicator || { 
            operation: activeSectorId.startsWith('general') ? activeOperation : 'sector' 
          } as any}
          onSubmit={handleAddIndicator}
          onCancel={() => { setIsIndicatorModalOpen(false); setEditingIndicator(null); }}
          showSectorSelect={activeSectorId.startsWith('general')}
          sectorName={!activeSectorId.startsWith('general') ? activeSector.name : undefined}
        />
      </Modal>

      <Modal 
        isOpen={isSectorModalOpen} 
        onClose={() => { setIsSectorModalOpen(false); setEditingSector(null); }} 
        title="Editar Brasão do Setor"
      >
        <SectorForm 
          initialData={editingSector || undefined}
          onSubmit={handleUpdateSectorCorrected}
          onCancel={() => { setIsSectorModalOpen(false); setEditingSector(null); }}
        />
      </Modal>

      <Modal 
        isOpen={isDevelopmentModalOpen} 
        onClose={() => { setIsDevelopmentModalOpen(false); setSelectedCollaborator(null); }} 
        title={`Avaliação de Desenvolvimento: ${selectedCollaborator?.name}`}
      >
        {selectedCollaborator && (
          <DevelopmentEvaluationForm 
            collaborator={selectedCollaborator}
            monthId={selectedMonthId}
            initialData={evaluations.find(e => e.collaboratorId === selectedCollaborator.id && e.monthId === selectedMonthId)}
            onSubmit={async (evalData) => {
              const existing = evaluations.find(e => e.collaboratorId === evalData.collaboratorId && e.monthId === evalData.monthId);
              if (existing) {
                await updateDoc(doc(db, 'evaluations', existing.id), { ...evalData, updatedAt: serverTimestamp() });
              } else {
                await addDoc(collection(db, 'evaluations'), { ...evalData, updatedAt: serverTimestamp() });
              }
              fetchEvaluations();
              setIsDevelopmentModalOpen(false);
              setSelectedCollaborator(null);
            }}
            onCancel={() => { setIsDevelopmentModalOpen(false); setSelectedCollaborator(null); }}
          />
        )}
      </Modal>

      <Modal 
        isOpen={confirmModal.isOpen} 
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
        title={confirmModal.title}
      >
        <div className="space-y-6">
          <p className="text-gray-600 font-medium">{confirmModal.message}</p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmModal.onConfirm}>Confirmar Exclusão</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// --- My Results View ---

function MyResultsView({ 
  userProfile, 
  collaborators,
  indicators, 
  dataValues, 
  evaluations, 
  monthId 
}: { 
  userProfile: User | null, 
  collaborators: Collaborator[],
  indicators: Indicator[], 
  dataValues: DataValue[], 
  evaluations: DevelopmentEvaluation[],
  monthId: string
}) {
  const myColab = useMemo(() => collaborators.find(c => c.uid === userProfile?.uid && c.monthId === monthId), [collaborators, userProfile, monthId]);
  const myEval = useMemo(() => evaluations.find(e => e.uid === userProfile?.uid && e.monthId === monthId), [userProfile, monthId]);
  
  const myData = useMemo(() => {
    if (!myColab) return [];
    return dataValues.filter(v => v.collaboratorId === myColab.id && v.monthId === monthId);
  }, [myColab, dataValues, monthId]);

  if (!myColab) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
          <Award size={40} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Nenhum dado encontrado</h3>
          <p className="text-gray-500">Você ainda não possui registros para este mês.</p>
        </div>
      </div>
    );
  }

  const getClassificationStyles = (classification: DevelopmentClassification) => {
    switch (classification) {
      case 'DELEGAR': return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', badge: 'bg-green-500' };
      case 'MOTIVAR': return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-500' };
      case 'GUIAR': return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', badge: 'bg-yellow-500' };
      case 'DIRECIONAR': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', badge: 'bg-red-500' };
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter mb-2">Meu Resultado</h2>
          <p className="text-gray-500 font-medium">Acompanhe seu desempenho e avaliações individuais.</p>
        </div>
        {myEval && (
           <div className={cn(
             "px-6 py-3 rounded-2xl border-2 flex items-center gap-3",
             getClassificationStyles(myEval.manualClassification || myEval.classification).bg,
             getClassificationStyles(myEval.manualClassification || myEval.classification).border,
             getClassificationStyles(myEval.manualClassification || myEval.classification).text
           )}>
             <div className={cn("w-3 h-3 rounded-full", getClassificationStyles(myEval.manualClassification || myEval.classification).badge)} />
             <span className="font-black text-lg tracking-widest">{myEval.manualClassification || myEval.classification}</span>
           </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-8 flex flex-col items-center text-center space-y-4">
           <div className="w-24 h-24 rounded-full border-4 border-orange-100 p-1">
              <img 
                src={userProfile?.fotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.nome || 'User')}&background=random`} 
                className="w-full h-full rounded-full object-cover" 
                alt="Me" 
                referrerPolicy="no-referrer"
              />
           </div>
           <div>
              <h3 className="text-xl font-bold text-gray-900">{userProfile?.nome}</h3>
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">{userProfile?.cargo}</p>
           </div>
           <div className="w-full pt-4 border-t border-gray-50 grid grid-cols-2 gap-4">
              <div>
                 <p className="text-[10px] font-bold text-gray-400 uppercase">Setor</p>
                 <p className="text-sm font-bold text-gray-900">{userProfile?.setor}</p>
              </div>
              <div>
                 <p className="text-[10px] font-bold text-gray-400 uppercase">Meta Individual</p>
                 <p className="text-sm font-bold text-gray-900">{myColab.meta}%</p>
              </div>
           </div>
        </Card>

        <Card className="p-8 md:col-span-2">
           <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <TrendingUp className="text-[#FF6B00]" size={20} />
              Principais Indicadores
           </h3>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {indicators.filter(i => {
                const sId = normalizeId(i.sectorId);
                const profileSectors = Array.isArray(userProfile?.setor) ? userProfile.setor : [userProfile?.setor || ''];
                return profileSectors.some(s => normalizeId(s) === sId);
              }).slice(0, 4).map(ind => {
                const val = myData.find(v => v.indicatorId === ind.id);
                return (
                  <div key={ind.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-500 mb-1">{ind.name}</p>
                      <p className="text-xl font-black text-gray-900">
                        {val ? (
                          ind.type === 'percentage' ? `${val.value}%` :
                          ind.type === 'currency' ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val.value)) :
                          val.value
                        ) : '-'}
                      </p>
                    </div>
                  </div>
                );
              })}
           </div>
        </Card>
      </div>

      {myEval && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <Card className="p-8">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                 <Target className="text-[#FF6B00]" size={20} />
                 Média de Competências
              </h3>
              <div className="space-y-6">
                 <div>
                    <div className="flex justify-between mb-2">
                       <span className="text-sm font-bold text-gray-700">Técnico</span>
                       <span className="text-sm font-black text-[#FF6B00]">{myEval.technicalAverage.toFixed(1)} / 4.0</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                       <div className="bg-[#FF6B00] h-full" style={{ width: `${(myEval.technicalAverage / 4) * 100}%` }} />
                    </div>
                 </div>
                 <div>
                    <div className="flex justify-between mb-2">
                       <span className="text-sm font-bold text-gray-700">Comportamental</span>
                       <span className="text-sm font-black text-[#FF6B00]">{myEval.behavioralAverage.toFixed(1)} / 4.0</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                       <div className="bg-[#FF6B00] h-full" style={{ width: `${(myEval.behavioralAverage / 4) * 100}%` }} />
                    </div>
                 </div>
              </div>
           </Card>

           <Card className="p-8 flex flex-col justify-center items-center text-center space-y-4">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center text-[#FF6B00]">
                 <Calendar size={32} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Última Avaliação</p>
                <p className="text-lg font-bold text-gray-900">{format(new Date(myEval.evaluationDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
              </div>
              <p className="text-sm text-gray-500 font-medium px-8 italic">
                "O sucesso é a soma de pequenos esforços repetidos dia após dia."
              </p>
           </Card>
        </div>
      )}
    </div>
  );
}

// --- Development View ---

function DevelopmentView({ 
  sectors, 
  collaborators, 
  evaluations, 
  monthId,
  selectedSectorId,
  onSectorChange,
  onSaveEvaluation,
  onDeleteEvaluation,
  onDeleteCollaborator
}: { 
  sectors: Sector[], 
  collaborators: Collaborator[], 
  evaluations: DevelopmentEvaluation[],
  monthId: string,
  selectedSectorId: string,
  onSectorChange: (id: string) => void,
  onSaveEvaluation: (data: Partial<DevelopmentEvaluation>) => Promise<void>,
  onDeleteEvaluation: (id: string) => Promise<void>,
  onDeleteCollaborator: (id: string) => Promise<void>
}) {
  const { isAdmin, isGestor, isColaborador, userProfile } = useAuth();
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [selectedColab, setSelectedColab] = useState<Collaborator | null>(null);

  const sectorColabs = useMemo(() => {
    let filtered = collaborators.filter(c => c.monthId === monthId);
    if (isColaborador) {
      return filtered.filter(c => c.uid === userProfile?.uid);
    }
    if (isGestor) {
      const sectors = Array.isArray(userProfile?.setor) ? userProfile.setor : [userProfile?.setor || ''];
      const sectorIds = sectors.map(s => normalizeId(s));
      // Ensure we only show collaborators for the leader's sectors and exclude the leader themselves
      filtered = filtered.filter(c => sectorIds.includes(c.sectorId) && c.uid !== userProfile?.uid);
    }
    if (selectedSectorId !== 'all') {
      filtered = filtered.filter(c => c.sectorId === selectedSectorId);
    }
    return filtered.filter(Boolean);
  }, [collaborators, selectedSectorId, monthId, isColaborador, isGestor, userProfile]);

  const sectorEvals = useMemo(() => 
    evaluations.filter(e => e.monthId === monthId && sectorColabs.some(c => c.id === e.collaboratorId)),
    [evaluations, monthId, sectorColabs]
  );

  const chartData = useMemo(() => {
    return sectorEvals.map(e => {
      const colab = sectorColabs.find(c => c.id === e.collaboratorId);
      return {
        x: e.technicalAverage,
        y: e.behavioralAverage,
        name: colab?.name || 'Desconhecido',
        classification: e.manualClassification || e.classification
      };
    });
  }, [sectorEvals, sectorColabs]);

  const getClassificationStyles = (classification: DevelopmentClassification) => {
    switch (classification) {
      case 'DELEGAR': return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', badge: 'bg-green-500' };
      case 'MOTIVAR': return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-500' };
      case 'GUIAR': return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', badge: 'bg-yellow-500' };
      case 'DIRECIONAR': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', badge: 'bg-red-500' };
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter mb-2">Avaliação</h2>
          <p className="text-gray-500 font-medium">Matriz de competências e comportamento por colaborador.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
            <ClipboardList size={16} className="text-[#FF6B00]" />
            <span className="text-sm font-bold text-gray-700">Total: {sectorEvals.length}</span>
          </div>
          {(() => {
            if (!isAdmin && !isGestor) return null;
            
            const availableSectors = isAdmin 
              ? sectors 
              : sectors.filter(s => {
                  const profileSectors = Array.isArray(userProfile?.setor) ? userProfile.setor : [userProfile?.setor || ''];
                  return profileSectors.some(ps => normalizeId(ps) === normalizeId(s.name));
                });

            if (availableSectors.length <= 1 && !isAdmin) return null;

            return (
              <Select 
                label="Filtrar por Setor"
                value={selectedSectorId}
                onChange={(e) => onSectorChange(e.target.value)}
                options={[
                  { value: 'all', label: 'Todos os Setores' },
                  ...availableSectors.map(s => ({ value: s.id, label: s.name }))
                ]}
                className="min-w-[200px]"
              />
            );
          })()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {(['DELEGAR', 'MOTIVAR', 'GUIAR', 'DIRECIONAR'] as const).map(cat => {
          const styles = getClassificationStyles(cat);
          const catEvals = sectorEvals.filter(e => (e.manualClassification || e.classification) === cat);
          return (
            <div key={cat} className={cn("border-t-4 rounded-2xl", 
              cat === 'DELEGAR' ? 'border-t-[#10B981]' :
              cat === 'MOTIVAR' ? 'border-t-[#3B82F6]' :
              cat === 'GUIAR' ? 'border-t-[#F59E0B]' : 'border-t-[#EF4444]'
            )}>
              <Card className="h-full" title={cat} subtitle={`Total: ${catEvals.length}`}>
                <div className="space-y-2 mt-4 max-h-[200px] overflow-y-auto pr-1">
                  {catEvals.length === 0 ? (
                    <p className="text-[10px] text-gray-400 italic">Nenhum colaborador neste quadrante</p>
                  ) : (
                    catEvals.map(e => {
                      const colab = sectorColabs.find(c => c.id === e.collaboratorId);
                      return (
                        <div key={e.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-100">
                          <img 
                            src={colab?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${colab?.name}`} 
                            className="w-6 h-6 rounded-lg object-cover aspect-square"
                            alt={colab?.name}
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-gray-900 truncate">{colab?.name}</p>
                            <p className="text-[8px] text-gray-500">S: {e.technicalAverage.toFixed(1)} | V: {e.behavioralAverage.toFixed(1)}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sectorColabs.map(colab => {
          const evalData = sectorEvals.find(e => e.collaboratorId === colab.id);
          const currentClass = evalData?.manualClassification || evalData?.classification;
          const styles = currentClass ? getClassificationStyles(currentClass) : null;

          return (
            <div 
              key={colab.id} 
              className="border-t-4 rounded-2xl"
              style={{ borderTopColor: styles ? (
                currentClass === 'DELEGAR' ? '#10B981' :
                currentClass === 'MOTIVAR' ? '#3B82F6' :
                currentClass === 'GUIAR' ? '#F59E0B' : '#EF4444'
              ) : '#f3f4f6' }}
            >
              <Card className="group hover:shadow-xl transition-all duration-300 h-full relative">
                <div className="flex flex-col items-center text-center space-y-4">
                  {evalData ? (
                    <div className={cn("px-3 py-1 rounded-full text-[10px] font-black tracking-widest text-white shadow-sm", styles?.badge)}>
                      {currentClass}
                    </div>
                  ) : (
                    <div className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest bg-gray-100 text-gray-400">
                      PENDENTE
                    </div>
                  )}

                  <div className="relative">
                    <img 
                      src={colab.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${colab.name}`} 
                      className="w-20 h-20 rounded-2xl object-cover aspect-square shadow-md border-2 border-white"
                      alt={colab.name}
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-900">{colab.name}</h4>
                    <p className="text-xs text-gray-500">Meta: {colab.meta || '-'}</p>
                    {evalData && <p className="text-[10px] text-gray-400 mt-1">Avaliado em: {format(new Date(evalData.evaluationDate), 'dd/MM/yyyy')}</p>}
                  </div>

                  {evalData && (
                    <div className="grid grid-cols-2 gap-4 w-full pt-2">
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Skill</p>
                        <p className="text-sm font-black text-gray-700">{evalData.technicalAverage?.toFixed(1) || '0.0'}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Vontade</p>
                        <p className="text-sm font-black text-gray-700">{evalData.behavioralAverage?.toFixed(1) || '0.0'}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 w-full">
                    {(isAdmin || isGestor) && colab.uid !== userProfile?.uid ? (
                      <Button 
                        variant={evalData ? "outline" : "primary"} 
                        size="sm" 
                        className="flex-1 text-[10px] sm:text-xs"
                        onClick={() => {
                          setSelectedColab(colab);
                          setIsEvalModalOpen(true);
                        }}
                      >
                        {evalData ? "Editar" : "Avaliar"}
                      </Button>
                    ) : (
                      evalData && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 text-[10px] sm:text-xs"
                          onClick={() => {
                            setSelectedColab(colab);
                            setIsEvalModalOpen(true);
                          }}
                        >
                          Ver Resultado
                        </Button>
                      )
                    )}
                  </div>

                  {(isAdmin || isGestor) && (
                    <div className="flex gap-2 w-full pt-2 border-t border-gray-50">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 text-gray-400 hover:text-red-500 hover:border-red-200"
                        onClick={() => onDeleteCollaborator(colab.id)}
                        title="Remover Colaborador"
                      >
                        <Trash2 size={14} className="mr-1" />
                        Excluir
                      </Button>
                      {evalData && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 text-gray-400 hover:text-red-600 border-dashed"
                          onClick={() => onDeleteEvaluation(evalData.id)}
                          title="Remover Avaliação"
                        >
                          Limpar
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          );
        })}
      </div>

      <Modal 
        isOpen={isEvalModalOpen} 
        onClose={() => { setIsEvalModalOpen(false); setSelectedColab(null); }} 
        title={`Avaliação: ${selectedColab?.name}`}
      >
        {selectedColab && (
          <DevelopmentEvaluationForm 
            collaborator={selectedColab}
            monthId={monthId}
            initialData={sectorEvals.find(e => e.collaboratorId === selectedColab.id)}
            readOnly={isColaborador && !isAdmin && !isGestor}
            onSubmit={async (data) => {
              await onSaveEvaluation(data);
              setIsEvalModalOpen(false);
              setSelectedColab(null);
            }}
            onCancel={() => { setIsEvalModalOpen(false); setSelectedColab(null); }}
          />
        )}
      </Modal>
    </div>
  );
}

function DevelopmentEvaluationForm({ 
  collaborator, 
  monthId, 
  initialData, 
  onSubmit, 
  onCancel,
  readOnly = false
}: { 
  collaborator: Collaborator, 
  monthId: string, 
  initialData?: DevelopmentEvaluation,
  onSubmit: (data: Partial<DevelopmentEvaluation>) => Promise<void>,
  onCancel: () => void,
  readOnly?: boolean
}) {
  const [evaluationDate, setEvaluationDate] = useState(initialData?.evaluationDate || format(new Date(), 'yyyy-MM-dd'));
  const [techScores, setTechScores] = useState<Record<string, number>>(initialData?.technicalScores || {});
  const [behaveScores, setBehaveScores] = useState<Record<string, number>>(initialData?.behavioralScores || {});
  const [manualClassification, setManualClassification] = useState<DevelopmentClassification | undefined>(initialData?.manualClassification);
  const [comments, setComments] = useState(initialData?.comments || '');
  const [step, setStep] = useState<'date' | 'tech' | 'behave' | 'classification'>('date');

  const calculateAverages = () => {
    const techVals = Object.values(techScores) as number[];
    const behaveVals = Object.values(behaveScores) as number[];
    
    const techAvg = techVals.length > 0 ? techVals.reduce((a: number, b: number) => a + b, 0) / TECHNICAL_QUESTIONS.length : 0;
    const behaveAvg = behaveVals.length > 0 ? behaveVals.reduce((a: number, b: number) => a + b, 0) / BEHAVIORAL_QUESTIONS.length : 0;
    
    let classification: DevelopmentClassification = 'DIRECIONAR';
    if (techAvg <= 2.5 && behaveAvg <= 2.5) classification = 'DIRECIONAR';
    else if (techAvg <= 2.5 && behaveAvg > 2.5) classification = 'GUIAR';
    else if (techAvg > 2.5 && behaveAvg <= 2.5) classification = 'MOTIVAR';
    else if (techAvg > 2.5 && behaveAvg > 2.5) classification = 'DELEGAR';

    return { techAvg, behaveAvg, classification };
  };

  const isStepComplete = step === 'date' ? !!evaluationDate : (
    step === 'tech' ? Object.keys(techScores).length === TECHNICAL_QUESTIONS.length :
    step === 'behave' ? Object.keys(behaveScores).length === BEHAVIORAL_QUESTIONS.length :
    true
  );

  return (
    <div className="space-y-4 sm:space-y-6 max-h-[70vh] overflow-y-auto pr-1 sm:pr-2">
      <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-4">
        <div className={cn("flex-1 h-1.5 sm:h-2 rounded-full", step === 'date' ? "bg-[#FF6B00]" : "bg-gray-200")} />
        <div className={cn("flex-1 h-1.5 sm:h-2 rounded-full", step === 'tech' ? "bg-[#FF6B00]" : "bg-gray-200")} />
        <div className={cn("flex-1 h-1.5 sm:h-2 rounded-full", step === 'behave' ? "bg-[#FF6B00]" : "bg-gray-200")} />
        <div className={cn("flex-1 h-1.5 sm:h-2 rounded-full", step === 'classification' ? "bg-[#FF6B00]" : "bg-gray-200")} />
      </div>

      <div className="space-y-4">
        {step === 'date' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-orange-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-orange-100">
              <p className="text-xs sm:text-sm text-[#FF6B00] font-medium">Inicie a avaliação definindo a data do registro.</p>
            </div>
            <Input 
              label="Data da Avaliação" 
              type="date" 
              value={evaluationDate} 
              onChange={(e) => setEvaluationDate(e.target.value)} 
            />
          </div>
        )}

        {(step === 'tech' || step === 'behave') && (
          <>
            <h4 className="font-bold text-gray-900 flex items-center gap-2 text-sm sm:text-base">
              {step === 'tech' ? <Target size={18} className="text-[#FF6B00]" /> : <Users size={18} className="text-[#FF6B00]" />}
              {step === 'tech' ? 'Skill Técnico' : 'Vontade Comportamental'}
            </h4>
            
            {(step === 'tech' ? TECHNICAL_QUESTIONS : BEHAVIORAL_QUESTIONS).map((q, idx) => (
              <div key={q} className="p-3 sm:p-4 bg-gray-50 rounded-xl sm:rounded-2xl space-y-3">
                <p className="text-xs sm:text-sm font-medium text-gray-700">{q}</p>
                <div className="flex gap-1.5 sm:gap-2">
                  {[1, 2, 3, 4].map(score => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => {
                        if (step === 'tech') setTechScores({ ...techScores, [q]: score });
                        else setBehaveScores({ ...behaveScores, [q]: score });
                      }}
                      className={cn(
                        "flex-1 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all",
                        (step === 'tech' ? techScores[q] : behaveScores[q]) === score
                          ? "bg-[#FF6B00] text-white shadow-lg shadow-orange-200"
                          : "bg-white text-gray-400 border border-gray-100 hover:border-orange-200"
                      )}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {step === 'classification' && (
          <div className="space-y-6">
            <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
              <p className="text-sm text-[#FF6B00] font-medium">Revise a classificação automática e ajuste se necessário.</p>
            </div>

            {(() => {
              const { techAvg, behaveAvg, classification: autoClass } = calculateAverages();
              const currentClass = manualClassification || autoClass;
              
              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-2xl text-center">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Média Técnica</p>
                      <p className="text-2xl font-black text-gray-900">{techAvg.toFixed(1)}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl text-center">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Média Comportamental</p>
                      <p className="text-2xl font-black text-gray-900">{behaveAvg.toFixed(1)}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-bold text-gray-700">Quadrante de Desenvolvimento</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['DELEGAR', 'MOTIVAR', 'GUIAR', 'DIRECIONAR'] as const).map(q => (
                        <button
                          key={q}
                          type="button"
                          disabled={readOnly}
                          onClick={() => setManualClassification(q)}
                          className={cn(
                            "p-3 rounded-xl text-[10px] font-black tracking-widest transition-all border-2",
                            currentClass === q
                              ? "bg-[#FF6B00] text-white border-[#FF6B00] shadow-lg shadow-orange-100"
                              : "bg-white text-gray-400 border-gray-100 hover:border-orange-100"
                          )}
                        >
                          {q}
                          {autoClass === q && !manualClassification && (
                            <span className="block text-[8px] opacity-60 mt-1 font-medium">(Calculado)</span>
                          )}
                          {autoClass === q && manualClassification === q && (
                            <span className="block text-[8px] opacity-60 mt-1 font-medium">(Calculado)</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Comentários e Feedbacks</label>
                    <textarea 
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      readOnly={readOnly}
                      className="w-full h-24 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] resize-none"
                      placeholder="Descreva os pontos de melhoria, elogios e planos de ação..."
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      <div className="flex justify-between gap-3 pt-4 sticky bottom-0 bg-white pb-1">
        <Button variant="outline" onClick={step === 'date' ? onCancel : (step === 'tech' ? () => setStep('date') : (step === 'behave' ? () => setStep('tech') : () => setStep('behave')))} size="sm" className="flex-1 sm:flex-none">
          {readOnly ? 'Fechar' : (step === 'date' ? 'Cancelar' : 'Voltar')}
        </Button>
        {!readOnly && (
          <Button 
            size="sm"
            disabled={!isStepComplete}
            className="flex-1 sm:flex-none"
            onClick={async () => {
              if (step === 'date') setStep('tech');
              else if (step === 'tech') setStep('behave');
              else if (step === 'behave') setStep('classification');
              else {
                const { techAvg, behaveAvg, classification } = calculateAverages();
                const evalData: any = {
                  monthId,
                  collaboratorId: collaborator.id,
                  evaluationDate,
                  technicalScores: techScores,
                  behavioralScores: behaveScores,
                  technicalAverage: techAvg,
                  behavioralAverage: behaveAvg,
                  classification,
                  comments
                };
                if (manualClassification) {
                  evalData.manualClassification = manualClassification;
                }
                await onSubmit(evalData);
              }
            }}
          >
            {step === 'classification' ? 'Finalizar' : 'Próximo'}
          </Button>
        )}
      </div>
    </div>
  );
}

// --- Sub-Views ---

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, key?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group',
        active 
          ? 'bg-orange-50 text-[#FF6B00] font-semibold' 
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
      )}
    >
      <span className={cn('transition-colors', active ? 'text-[#FF6B00]' : 'text-gray-400 group-hover:text-gray-600')}>
        {icon}
      </span>
      <span className="text-sm">{label}</span>
      {active && <motion.div layoutId="active-pill" className="ml-auto w-1.5 h-1.5 rounded-full bg-[#FF6B00]" />}
    </button>
  );
}

const SectorDashboard = React.memo(function SectorDashboard({ 
  sector, 
  activeOperation,
  monthId, 
  indicators, 
  collaborators, 
  dataValues, 
  evaluations,
  sectorHighlights,
  onSaveValue,
  onToggleHighlight,
  onAddCollaborator,
  onEditCollaborator,
  onDeleteCollaborator,
  onAddIndicator,
  onEditIndicator,
  onDeleteIndicator,
  onEditSector,
  onEvaluateCollaborator,
  onReorderIndicators,
  onReorderCollaborators
}: { 
  sector: Sector, 
  activeOperation: 'sittax' | 'openix',
  monthId: string,
  indicators: Indicator[], 
  collaborators: Collaborator[], 
  dataValues: DataValue[],
  evaluations: DevelopmentEvaluation[],
  sectorHighlights: SectorHighlight[],
  onSaveValue: (indId: string, colId: string, val: string | number) => void,
  onToggleHighlight: (sectorId: string, monthId: string, colId: string) => void,
  onAddCollaborator: () => void,
  onEditCollaborator: (c: Collaborator) => void,
  onDeleteCollaborator: (id: string) => void,
  onAddIndicator: () => void,
  onEditIndicator: (i: Indicator) => void,
  onDeleteIndicator: (id: string) => void,
  onEditSector: () => void,
  onEvaluateCollaborator: (c: Collaborator) => void,
  onReorderIndicators: (items: Indicator[]) => void,
  onReorderCollaborators: (items: Collaborator[]) => void
}) {
  const { isAdmin, isGestor, isColaborador, userProfile } = useAuth();
  const safeIndicators = useMemo(() => indicators.filter(Boolean), [indicators]);
  const safeCollaborators = useMemo(() => collaborators.filter(Boolean), [collaborators]);

  const getRowTotal = (indicator: Indicator) => {
    const validValues = safeCollaborators.map(c => {
      const v = dataValues.find(dv => 
        dv.indicatorId === indicator.id && 
        dv.collaboratorId === c.id && 
        (dv.operation === activeOperation || dv.operation === 'both' || !dv.operation) &&
        !dv.date
      )?.value;
      if (v === undefined || v === '-' || v === '') return null;
      const num = parseFloat(String(v).replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''));
      return isNaN(num) ? null : num;
    }).filter(v => v !== null) as number[];

    if (validValues.length === 0) return 0;
    const total = validValues.reduce((a, b) => a + b, 0);
    
    if (indicator.resultType === 'average' || indicator.type === 'percentage') {
       return total / validValues.length;
    }
    return total;
  };

  const getSectorDailyTotal = (indicator: Indicator) => {
    const dailyDocs = dataValues.filter(dv => 
      dv.indicatorId === indicator.id && 
      dv.collaboratorId === 'sector' && 
      (dv.operation === activeOperation || dv.operation === 'both' || !dv.operation) &&
      dv.date
    );
    const validValues = dailyDocs.map(dv => {
      const num = parseFloat(String(dv.value).replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''));
      return isNaN(num) ? null : num;
    }).filter(v => v !== null) as number[];

    if (validValues.length === 0) return 0;
    const total = validValues.reduce((acc, v) => acc + v, 0);
    
    if (indicator.resultType === 'average' || indicator.type === 'percentage') {
       return total / validValues.length;
    }
    return total;
  };

  const moveIndicator = (index: number, direction: 'up' | 'down') => {
    const newItems = [...safeIndicators];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newItems.length) {
      [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
      onReorderIndicators(newItems);
    }
  };

  const moveCollaborator = (index: number, direction: 'left' | 'right') => {
    const newItems = [...safeCollaborators];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newItems.length) {
      [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
      onReorderCollaborators(newItems);
    }
  };

  if (!sector) return null;

  console.log('Rendering SectorDashboard:', { sector: sector?.name, indicators: indicators?.length, collaborators: collaborators?.length });

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 sm:w-3 h-6 sm:h-8 rounded-full" style={{ backgroundColor: sector.color }} />
            <h2 className="text-xl sm:text-3xl font-black text-gray-900 uppercase tracking-tighter">{sector.name}</h2>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 font-medium">Gestão de indicadores e performance individual da equipe.</p>
        </div>
        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
          {(isAdmin || isGestor) && (
            <>
              <Button variant="outline" onClick={onAddIndicator} className="flex-1 sm:flex-none text-[10px] sm:text-sm px-2 sm:px-4">
                <Settings size={16} />
                <span className="hidden xs:inline">Configurar Indicadores</span>
                <span className="xs:hidden">KPIs</span>
              </Button>
              <Button onClick={onAddCollaborator} className="flex-1 sm:flex-none text-[10px] sm:text-sm px-2 sm:px-4">
                <Plus size={16} />
                <span className="hidden xs:inline">Novo Colaborador</span>
                <span className="xs:hidden">Novo</span>
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl sm:rounded-[2rem] border border-gray-100 shadow-xl sm:shadow-2xl shadow-gray-200/50 overflow-hidden">
            <div className="overflow-x-auto max-h-[500px] sm:max-h-[700px] scrollbar-thin scrollbar-thumb-gray-200">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-30">
                  <tr className="text-white shadow-md" style={{ backgroundColor: sector.color }}>
                    <th className="p-3 sm:p-6 text-left border-r border-white/10 w-[140px] sm:w-[240px] sticky left-0 z-40" style={{ backgroundColor: sector.color }}>
                      <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest opacity-80">Indicador</span>
                    </th>
                    {safeCollaborators.map((c, idx) => {
                      const evalData = evaluations.find(e => e.collaboratorId === c.id && e.monthId === monthId);
                      const currentClass = evalData?.manualClassification || evalData?.classification;
                      const getBadgeColor = (cls?: DevelopmentClassification) => {
                        switch (cls) {
                          case 'DELEGAR': return 'bg-[#10B981]'; // Verde vibrante
                          case 'MOTIVAR': return 'bg-[#3B82F6]'; // Azul vibrante
                          case 'GUIAR': return 'bg-[#F59E0B]';   // Amarelo vibrante
                          case 'DIRECIONAR': return 'bg-[#EF4444]'; // Vermelho vibrante
                          default: return 'bg-gray-400';
                        }
                      };

                      const isHighlight = sectorHighlights.find(h => h.sectorId === sector.id && h.monthId === monthId && h.collaboratorId === c.id);

                      return (
                        <th key={c.id} className="p-3 sm:p-6 border-r border-white/10 min-w-[120px] sm:min-w-[160px] group relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-30" />
                          
                          {/* Reorder buttons for columns */}
                          <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                            <button 
                              onClick={(e) => { e.stopPropagation(); moveCollaborator(idx, 'left'); }}
                              disabled={idx === 0}
                              className="p-1 rounded-md bg-black/20 hover:bg-black/40 disabled:opacity-0 transition-all"
                            >
                              <ChevronLeft size={10} />
                            </button>
                            <div className="p-1 cursor-grab active:cursor-grabbing">
                               <GripHorizontal size={10} className="text-white/60" />
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); moveCollaborator(idx, 'right'); }}
                              disabled={idx === collaborators.length - 1}
                              className="p-1 rounded-md bg-black/20 hover:bg-black/40 disabled:opacity-0 transition-all"
                            >
                              <ChevronRight size={10} />
                            </button>
                          </div>

                          <div className="relative z-10 flex flex-col items-center gap-2 sm:gap-3 mt-4 sm:mt-2">
                            <div className="relative">
                              <img 
                                src={c.avatarUrl || c.fotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random`} 
                                alt={c.name} 
                                className="w-10 h-10 sm:w-16 h-16 rounded-xl sm:rounded-2xl border-2 sm:border-4 border-white/20 bg-white/10 object-cover aspect-square shadow-lg transition-transform group-hover:scale-105"
                                referrerPolicy="no-referrer"
                              />
                              <div className="flex gap-1 absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {(isAdmin || isGestor) && (
                                  <button 
                                    onClick={() => onEvaluateCollaborator(c)}
                                    className="text-white p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform"
                                    style={{ backgroundColor: sector.color }}
                                    title="Lançar Avaliação"
                                  >
                                    <BrainCircuit size={10} />
                                  </button>
                                )}
                                {(isAdmin || isGestor || c.uid === userProfile?.uid) && (
                                  <button 
                                    onClick={() => onEditCollaborator(c)}
                                    className="bg-white text-gray-900 p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform"
                                    title="Editar"
                                  >
                                    <Edit2 size={10} />
                                  </button>
                                )}
                                {(isAdmin || isGestor) && (
                                  <button 
                                    onClick={() => onDeleteCollaborator(c.id)}
                                    className="bg-white text-red-500 p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform"
                                    title="Remover Colaborador"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="text-center relative flex flex-col items-center w-full">
                              <span className="text-[10px] font-black uppercase tracking-tighter block leading-none mb-1 w-full text-center">{c.name}</span>
                              <div className="flex flex-col items-center w-full">
                                {c.meta && <span className="text-[9px] font-bold opacity-60 w-full text-center">META: {c.meta}</span>}
                                
                                {evalData && (
                                  <div className={cn(
                                    "mt-1 px-2 py-0.5 rounded-md text-[8px] font-black text-white shadow-sm uppercase tracking-wider inline-block",
                                    getBadgeColor(currentClass)
                                  )}>
                                    {currentClass}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Trophy Icon */}
                          {isHighlight && (
                            <div className="absolute top-2 left-2 z-20">
                              <div className="bg-yellow-400 p-1.5 rounded-lg shadow-lg animate-bounce-subtle">
                                <Award size={14} className="text-white" />
                              </div>
                            </div>
                          )}
                          
                          <div className="absolute bottom-2 right-2 z-20">
                            {(isAdmin || isGestor) && (
                              <button 
                                onClick={() => onToggleHighlight(sector.id, monthId, c.id)}
                                className={cn(
                                  "p-1.5 rounded-lg transition-all flex items-center gap-1",
                                  isHighlight ? "bg-white/20" : "opacity-0 group-hover:opacity-100 hover:bg-white/20"
                                )}
                                title="Destaque do Mês"
                              >
                                {!isHighlight && <Award size={16} className="text-white/40" />}
                                {isHighlight && <Settings size={12} className="text-white/60" />}
                              </button>
                            )}
                          </div>
                        </th>
                      );
                    })}
                    <th className="p-3 sm:p-6 min-w-[100px] sm:min-w-[140px] sticky right-0 z-40 shadow-[-4px_0_8px_rgba(0,0,0,0.05)]" style={{ backgroundColor: sector.color, filter: 'brightness(0.9)' }}>
                      <div className="flex flex-col items-center gap-1 sm:gap-2">
                        <div className="w-8 h-8 sm:w-12 h-12 rounded-lg sm:rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                          {(() => {
                            const Icon = {
                              Calendar,
                              UserPlus,
                              TrendingUp,
                              Heart,
                              MessageSquare
                            }[sector.icon || ''] || LayoutDashboard;
                            return <Icon size={window.innerWidth < 640 ? 16 : 24} />;
                          })()}
                        </div>
                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Setor</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                        {collaborators.length > 0 ? (
                          <ReactSortable 
                            list={safeIndicators} 
                            setList={onReorderIndicators} 
                            tag="tbody" 
                            handle=".row-drag-handle"
                            animation={150}
                            className="divide-y divide-gray-100"
                          >
                            {React.Children.toArray(safeIndicators.map((indicator, idx) => {
                              const rowTotal = getRowTotal(indicator);
                              const sectorDailyTotal = getSectorDailyTotal(indicator);
                              const sectorValue = dataValues.find(dv => 
                                dv.indicatorId === indicator.id && 
                                dv.collaboratorId === 'sector' && 
                                (dv.operation === activeOperation || dv.operation === 'both' || !dv.operation) &&
                                !dv.date
                              )?.value;
                              const displayValue = sectorValue !== undefined && sectorValue !== '' ? sectorValue : (indicator.isGeneral ? sectorDailyTotal : rowTotal);
                              const isNegative = indicator.name.toLowerCase().includes('perdido') || indicator.name.toLowerCase().includes('cancelamento');
                              const isSectorOnly = indicator.isSectorOnly || 
                                indicator.name.toLowerCase().includes('(setor)') || 
                                indicator.name.toLowerCase().includes('(total)');
                              
                              return (
                                <tr key={indicator.id} className={cn("transition-colors group", isSectorOnly ? "bg-gray-50/50" : "hover:bg-gray-50/80")}>
                                  <td className="p-3 sm:p-5 border-r border-gray-100 bg-white sticky left-0 z-20 group-hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 overflow-hidden">
                                         <div className="row-drag-handle cursor-grab active:cursor-grabbing p-1 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col">
                                            <button onClick={(e) => { e.stopPropagation(); moveIndicator(idx, 'up'); }} disabled={idx === 0} className="hover:text-[#FF6B00] disabled:opacity-0"><ChevronDown size={12} className="rotate-180" /></button>
                                            <GripVertical size={12} className="text-gray-300" />
                                            <button onClick={(e) => { e.stopPropagation(); moveIndicator(idx, 'down'); }} disabled={idx === safeIndicators.length - 1} className="hover:text-[#FF6B00] disabled:opacity-0"><ChevronDown size={12} /></button>
                                         </div>
                                         <span className="text-xs sm:text-sm font-bold text-gray-700 tracking-tight truncate">{indicator.name}</span>
                                      </div>
                                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {(isAdmin || isGestor) && (
                                          <>
                                            <button onClick={() => onEditIndicator(indicator)} className="p-1 text-gray-400 hover:text-blue-600"><Edit2 size={12} /></button>
                                            <button onClick={() => onDeleteIndicator(indicator.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={12} /></button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  {safeCollaborators.map(c => {
                                    const val = dataValues.find(dv => 
                                      dv.indicatorId === indicator.id && 
                                      dv.collaboratorId === c.id &&
                                      (dv.operation === activeOperation || dv.operation === 'both' || !dv.operation) &&
                                      !dv.date
                                    )?.value;
                                    const isMetaMet = c.meta && !isNaN(Number(val)) && Number(val) >= c.meta;
                                    
                                    if (isSectorOnly) {
                                      return (
                                        <td key={c.id} className="p-0 border-r border-gray-50 bg-gray-50/20 relative">
                                          <div className="w-full h-full p-3 sm:p-5 flex items-center justify-center text-gray-300 font-mono text-xs sm:text-sm">
                                            -
                                          </div>
                                        </td>
                                      );
                                    }

                                    return (
                                      <td key={c.id} className="p-0 border-r border-gray-50 relative group/cell">
                                        <div className="absolute inset-0 bg-gray-50/0 group-hover/cell:bg-gray-50/50 transition-colors" />
                                        <input 
                                          key={`${indicator.id}-${c.id}-${val}-${activeOperation}-${monthId}`}
                                          type="text"
                                          className={cn(
                                            "relative z-10 w-full h-full p-3 sm:p-5 text-center text-xs sm:text-sm font-mono font-bold focus:bg-white focus:outline-none transition-all",
                                            isNegative && Number(val) > 0 ? "text-red-600" : 
                                            isMetaMet ? "" : "text-gray-600"
                                          )}
                                          style={{ color: !isNegative && isMetaMet ? sector.color : undefined }}
                                          defaultValue={formatValue(val, indicator.type)}
                                          onBlur={(e) => onSaveValue(indicator.id, c.id, e.target.value)}
                                          placeholder="-"
                                        />
                                        {isMetaMet && (
                                          <div className="absolute top-1 right-1">
                                            <CheckCircle2 size={10} style={{ color: sector.color }} />
                                          </div>
                                        )}
                                      </td>
                                    );
                                  })}
                                  <td className="p-0 text-center bg-gray-50/30 sticky right-0 z-20 shadow-[-4px_0_8px_rgba(0,0,0,0.02)]">
                                    <input 
                                      type="text"
                                      key={`${indicator.id}-sector-${displayValue}-${monthId}-${activeOperation}`}
                                      className={cn(
                                        "w-full h-full p-3 sm:p-5 text-center text-xs sm:text-sm font-mono font-black focus:bg-white focus:outline-none transition-colors",
                                        isNegative && (parseFloat(String(displayValue)) > 0) ? "text-red-600" : ""
                                      )}
                                      style={{ color: isNegative && (parseFloat(String(displayValue)) > 0) ? undefined : sector.color }}
                                      defaultValue={sectorValue !== undefined && sectorValue !== '' ? formatValue(sectorValue, indicator.type) : formatValue(rowTotal, indicator.type)}
                                      onBlur={(e) => {
                                        const val = e.target.value;
                                        const currentFormatted = formatValue(rowTotal, indicator.type);
                                        const sectorFormatted = sectorValue !== undefined && sectorValue !== '' ? formatValue(sectorValue, indicator.type) : undefined;
                                        
                                        if (val !== currentFormatted && val !== sectorFormatted) {
                                          onSaveValue(indicator.id, 'sector', val);
                                        }
                                      }}
                                      placeholder="-"
                                    />
                                  </td>
                                </tr>
                              );
                            }))}
                          </ReactSortable>
                        ) : null}
                {safeIndicators.length === 0 && (
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td colSpan={safeCollaborators.length + 2} className="p-20 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                            <Settings size={32} />
                          </div>
                          <p className="text-gray-400 font-medium">Nenhum indicador configurado para este setor.</p>
                          <Button variant="outline" size="sm" onClick={onAddIndicator}>Adicionar Primeiro Indicador</Button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                )}
              </table>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-8 sticky top-24 self-start h-fit">
          <div 
            className="flex-1 flex flex-col items-center justify-center text-center group cursor-pointer relative"
            onClick={onEditSector}
          >
            <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity z-20">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:bg-gray-100">
                <Edit2 size={14} />
              </Button>
            </div>
            <motion.div 
              className="relative z-10 w-full flex flex-col items-center"
              animate={{
                y: [0, -15, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
               {sector.logoUrl ? (
                 <div className="relative group">
                   <div className="absolute inset-0 bg-black/20 blur-2xl rounded-full scale-75 opacity-50 group-hover:opacity-70 transition-opacity" />
                   <img 
                     src={sector.logoUrl} 
                     alt={sector.name} 
                     className="max-w-full h-auto object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative z-10" 
                     referrerPolicy="no-referrer" 
                   />
                 </div>
               ) : (
                 <div className="text-center p-8 bg-gray-50 rounded-[2rem] border border-gray-200 backdrop-blur-sm shadow-xl">
                   <p className="text-gray-900 font-black text-4xl leading-none tracking-tighter mb-1">{sector.name.toUpperCase()}</p>
                   <p className="text-[#FF6B00] font-bold text-xl leading-none tracking-widest opacity-80">{activeOperation.toUpperCase()}</p>
                 </div>
               )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
});

const GeneralIndicatorView = React.memo(function GeneralIndicatorView({ 
  indicators, 
  dataValues, 
  monthId,
  operation,
  operationDates,
  onSaveValue,
  onAddDate,
  onDeleteDate,
  onAddIndicator,
  onEditIndicator,
  onDeleteIndicator,
  onReorderIndicators
}: { 
  indicators: Indicator[], 
  dataValues: DataValue[], 
  monthId: string,
  operation: 'sittax' | 'openix',
  operationDates: OperationDate[],
  onSaveValue: (indicatorId: string, collaboratorId: string, value: string | number, date?: string) => void,
  onAddDate: (date: string) => void,
  onDeleteDate: (dateId: string) => void,
  onAddIndicator: () => void,
  onEditIndicator: (indicator: Indicator) => void,
  onDeleteIndicator: (id: string) => void,
  onReorderIndicators: (items: Indicator[]) => void
}) {
  const { isAdmin, userProfile } = useAuth();
  const visibleSectors = useMemo(() => {
    if (isAdmin) return SECTORS;
    const profileSectors = Array.isArray(userProfile?.setor) ? userProfile.setor : [userProfile?.setor || ''];
    const profileSectorIds = profileSectors.map(s => normalizeId(s));
    return SECTORS.filter(s => profileSectorIds.includes(normalizeId(s.name)));
  }, [isAdmin, userProfile?.setor]);

  const safeIndicators = useMemo(() => indicators.filter(Boolean), [indicators]);
  const currentDates = operationDates
    .filter(od => od.monthId === monthId && (od.operation === operation || od.operation === 'both' || !od.operation))
    .sort((a, b) => a.date.localeCompare(b.date));

  const [newDate, setNewDate] = useState('');

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-3xl font-black text-[#FF6B00] uppercase tracking-tighter mb-1">
            Indicador Geral - {operation.toUpperCase()}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 font-medium">Acompanhamento diário consolidado por setor.</p>
        </div>
        <div className="flex flex-col xs:flex-row items-center gap-3 w-full sm:w-auto">
          <Button variant="outline" onClick={onAddIndicator} className="w-full xs:w-auto text-[10px] sm:text-sm px-2 sm:px-4">
            <Settings size={16} />
            <span className="hidden xs:inline">Configurar Indicadores</span>
            <span className="xs:hidden">KPIs</span>
          </Button>
          <div className="flex items-center gap-2 bg-white p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm w-full xs:w-auto">
            <input 
              type="date" 
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="text-[10px] sm:text-sm border-none focus:ring-0 cursor-pointer font-bold text-gray-900 bg-transparent flex-1"
            />
            <Button 
              size="sm" 
              onClick={() => { if (newDate) { onAddDate(newDate); setNewDate(''); } }}
              disabled={!newDate}
              className="text-[10px] sm:text-sm px-2 sm:px-3"
            >
              <Plus size={14} />
              <span className="hidden xs:inline">Adicionar Data</span>
              <span className="xs:hidden">Add</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl sm:rounded-[2rem] border border-gray-100 shadow-xl sm:shadow-2xl shadow-gray-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#FF6B00] text-white">
                <th className="p-3 sm:p-4 text-left text-[8px] sm:text-[10px] font-black uppercase tracking-widest border-r border-white/10 sticky left-0 z-20 bg-[#FF6B00] w-[80px] sm:w-[120px]">Setor</th>
                <th className="p-3 sm:p-4 text-left text-[8px] sm:text-[10px] font-black uppercase tracking-widest border-r border-white/10 sticky left-[80px] sm:left-[120px] z-20 bg-[#FF6B00] w-[100px] sm:w-[180px]">Indicador</th>
                {currentDates.map(od => (
                  <th key={od.id} className="p-3 sm:p-4 text-center text-[8px] sm:text-[10px] font-black uppercase tracking-widest border-r border-white/10 min-w-[80px] sm:min-w-[120px]">
                    <div className="flex flex-col items-center gap-1">
                      <span>{format(parse(od.date, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy')}</span>
                      <button 
                        onClick={() => onDeleteDate(od.id)}
                        className="text-white/60 hover:text-white transition-colors"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            {visibleSectors.map(sector => {
              const sectorIndicators = safeIndicators.filter(i => 
                normalizeId(i.sectorId) === normalizeId(sector.id) && 
                i.isGeneral === true && 
                (i.operation === operation || i.operation === 'both' || !i.operation)
              );
              
              if (sectorIndicators.length === 0) {
                return (
                  <tbody key={sector.id}>
                    <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="p-3 sm:p-4 border-r border-gray-50 font-bold text-[10px] sm:text-xs text-gray-900 sticky left-0 z-10 bg-white">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 sm:w-2 h-3 sm:h-4 rounded-full" style={{ backgroundColor: sector.color }} />
                          <span className="truncate">{sector.name}</span>
                        </div>
                      </td>
                      <td colSpan={currentDates.length + 1} className="p-3 sm:p-4 text-center text-gray-400 text-[8px] sm:text-[10px] font-medium italic">
                        Nenhum indicador configurado.
                      </td>
                    </tr>
                  </tbody>
                );
              }

              return (
                    <ReactSortable
                      // @ts-ignore
                      key={sector.id}
                      list={sectorIndicators}
                      setList={(newList) => {
                        // Need to merge with other indicators
                        const otherInds = safeIndicators.filter(i => 
                          !(normalizeId(i.sectorId) === normalizeId(sector.id) && 
                            i.isGeneral === true && 
                            (i.operation === operation || i.operation === 'both' || !i.operation))
                        );
                        onReorderIndicators([...otherInds, ...newList]);
                      }}
                      tag="tbody"
                      className="divide-y divide-gray-100"
                      handle=".gen-drag-handle"
                      animation={150}
                    >
                    {React.Children.toArray(sectorIndicators.filter(Boolean).map((indicator, idx) => (
                      <tr key={indicator.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        {idx === 0 && (
                          <td className="p-3 sm:p-4 border-r border-gray-50 font-bold text-[10px] sm:text-xs text-gray-900 align-top sticky left-0 z-10 bg-white" rowSpan={sectorIndicators.length}>
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 sm:w-2 h-3 sm:h-4 rounded-full" style={{ backgroundColor: sector.color }} />
                              <span className="truncate">{sector.name}</span>
                            </div>
                          </td>
                        )}
                        <td className="p-3 sm:p-4 border-r border-gray-50 text-[10px] sm:text-xs font-medium text-gray-600 sticky left-[80px] sm:left-[120px] z-10 bg-white group/row">
                          <div className="flex items-center justify-between group/ind">
                            <div className="flex items-center gap-2 overflow-hidden">
                               <div className="gen-drag-handle cursor-grab active:cursor-grabbing opacity-0 group-hover/ind:opacity-100 transition-opacity">
                                  <GripVertical size={10} className="text-gray-300" />
                               </div>
                               <span className="truncate mr-2">{indicator.name}</span>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover/ind:opacity-100 transition-all">
                              <button 
                                onClick={() => onEditIndicator(indicator)}
                                className="text-gray-400 hover:text-[#FF6B00] p-1"
                                title="Editar"
                              >
                                <Edit2 size={10} />
                              </button>
                              <button 
                                onClick={() => onDeleteIndicator(indicator.id)}
                                className="text-red-400 hover:text-red-600 p-1"
                                title="Excluir"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          </div>
                        </td>
                        {currentDates.map(od => {
                          const dv = dataValues.find(d => 
                            d.indicatorId === indicator.id && 
                            d.collaboratorId === 'sector' && 
                            (d.operation === operation || d.operation === 'both' || !d.operation) &&
                            normalizeDate(d.date || '') === normalizeDate(od.date)
                          );
                          return (
                            <td key={od.id} className="p-0 border-r border-gray-50">
                              <input 
                                key={`${indicator.id}-${od.date}-${dv?.value}-${operation}-${monthId}`}
                                type="text"
                                defaultValue={formatValue(dv?.value, indicator.type)}
                                onBlur={(e) => onSaveValue(indicator.id, 'sector', e.target.value, od.date)}
                                className="w-full h-full p-3 sm:p-4 text-center text-[10px] sm:text-xs font-mono font-bold text-gray-900 bg-transparent border-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:bg-orange-50/30 transition-all"
                                placeholder="-"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    )))}
                  </ReactSortable>
                );
              })}
          </table>
        </div>
      </div>
    </div>
  );
});

function OverviewView({ 
  sectors, 
  indicators, 
  dataValues, 
  collaborators, 
  sectorHighlights,
  monthId,
  activeOperation,
  onNavigate 
}: { 
  sectors: Sector[], 
  indicators: Indicator[], 
  dataValues: DataValue[], 
  collaborators: Collaborator[], 
  sectorHighlights: SectorHighlight[],
  monthId: string,
  activeOperation: 'sittax' | 'openix',
  onNavigate: (id: string) => void 
}) {
  const { isAdmin, userProfile } = useAuth();
  const visibleSectors = useMemo(() => {
    if (isAdmin) return sectors;
    const profileSectors = Array.isArray(userProfile?.setor) ? userProfile.setor : [userProfile?.setor || ''];
    const profileSectorIds = profileSectors.map(s => normalizeId(s));
    return sectors.filter(s => profileSectorIds.includes(normalizeId(s.name)));
  }, [isAdmin, userProfile?.setor, sectors]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 uppercase tracking-tighter mb-1 sm:mb-2">Visão Geral</h2>
          <p className="text-xs sm:text-sm text-gray-500 font-medium">Acompanhamento consolidado de todos os setores da empresa.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {visibleSectors.map(sector => {
          const sectorColabs = collaborators.filter(c => c.sectorId === sector.id);
          const sectorInds = indicators.filter(i => i.sectorId === sector.id);
          
          return (
            <div key={sector.id}>
              <Card 
                className="hover:shadow-xl transition-shadow cursor-pointer group h-full flex flex-col"
                onClick={() => onNavigate(sector.id)}
              >
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center text-white shadow-lg overflow-hidden bg-white/10" style={{ backgroundColor: sector.color }}>
                      {sector.logoUrl ? (
                        <img src={sector.logoUrl} alt={sector.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                      ) : (
                        <LayoutDashboard size={20} className="sm:w-6 sm:h-6" />
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate max-w-[120px] sm:max-w-none">{sector.name}</h3>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-600 transition-colors sm:w-[18px] sm:h-[18px]" />
                </div>
                
                <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-auto">
                  <div className="bg-gray-50 p-3 sm:p-4 rounded-xl">
                    <p className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase mb-1">Equipe</p>
                    <p className="text-lg sm:text-xl font-black text-gray-900">{sectorColabs.length}</p>
                  </div>
                  <div className="bg-gray-50 p-3 sm:p-4 rounded-xl">
                    <p className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase mb-1">KPIs</p>
                    <p className="text-lg sm:text-xl font-black text-gray-900">{sectorInds.length}</p>
                  </div>
                </div>

                <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-50 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex -space-x-2">
                    {sectorColabs.slice(0, 3).map((c, i) => (
                      <img 
                        key={c.id} 
                        src={c.avatarUrl || c.fotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random`} 
                        className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg border-2 border-white bg-gray-100 object-cover aspect-square" 
                        alt={c.name}
                        referrerPolicy="no-referrer"
                      />
                    ))}
                    {sectorColabs.length > 3 && (
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg border-2 border-white bg-gray-100 flex items-center justify-center text-[8px] sm:text-[10px] font-bold text-gray-500">
                        +{sectorColabs.length - 3}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end">
                    {(() => {
                      const highlight = sectorHighlights.find(h => h.sectorId === sector.id && h.monthId === monthId);
                      const winner = highlight ? collaborators.find(c => c.id === highlight.collaboratorId) : null;
                      
                      if (winner) {
                        return (
                          <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100 mb-2">
                            <Award size={12} className="text-yellow-600" />
                            <span className="text-[8px] sm:text-[10px] font-bold text-yellow-700 uppercase tracking-tight truncate max-w-[80px]">{winner.name}</span>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {(() => {
                      const csatInd = sectorInds.find(i => i.name.toLowerCase().includes('csat'));
                      let csatDisplay = '-';
                      if (csatInd) {
                        const sectorValues = dataValues.filter(dv => 
                          dv.indicatorId === csatInd.id && 
                          dv.collaboratorId === 'sector' &&
                          (dv.operation === activeOperation || dv.operation === 'both' || !dv.operation)
                        );
                        
                        const monthlyValue = sectorValues.find(dv => !dv.date)?.value;
                        
                        if (monthlyValue !== undefined && monthlyValue !== '' && monthlyValue !== '-') {
                          const valStr = String(monthlyValue);
                          csatDisplay = valStr.endsWith('%') ? valStr : `${valStr}%`;
                        } else {
                          const dailyValues = sectorValues.filter(dv => dv.date);
                          if (dailyValues.length > 0) {
                            const total = dailyValues.reduce((acc, dv) => {
                              const num = parseFloat(String(dv.value).replace(',', '.'));
                              return acc + (isNaN(num) ? 0 : num);
                            }, 0);
                            csatDisplay = `${(total / dailyValues.length).toFixed(1)}%`;
                          } else {
                            const colabValues = sectorColabs.map(c => {
                              const v = dataValues.find(dv => 
                                dv.indicatorId === csatInd.id && 
                                dv.collaboratorId === c.id &&
                                (dv.operation === activeOperation || dv.operation === 'both' || !dv.operation) &&
                                !dv.date
                              )?.value;
                              if (v === undefined || v === '-' || v === '') return 0;
                              const num = parseFloat(String(v).replace(',', '.'));
                              return isNaN(num) ? 0 : num;
                            });
                            const total = colabValues.reduce((a, b) => a + b, 0);
                            const avg = sectorColabs.length > 0 ? total / sectorColabs.length : 0;
                            csatDisplay = avg > 0 ? `${avg.toFixed(1)}%` : '-';
                          }
                        }
                      }
                      return (
                        <div className="flex flex-col items-end">
                          <span className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">CSAT Médio</span>
                          <span className="text-xs sm:text-sm font-black flex items-center gap-1" style={{ color: sector.color }}>
                            <CheckCircle2 size={12} className="sm:w-[14px] sm:h-[14px]" />
                            {csatDisplay}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Forms ---

function NewMonthForm({ months, onSubmit, onCancel }: { months: Month[], onSubmit: (name: string, copyId?: string) => void, onCancel: () => void }) {
  const [name, setName] = useState(format(addMonths(new Date(), 1), 'MM/yyyy'));
  const [copyFromId, setCopyFromId] = useState('');

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(name, copyFromId); }} className="space-y-4 sm:space-y-6">
      <Input 
        label="Nome do Mês (MM/YYYY)" 
        value={name} 
        onChange={(e) => setName(e.target.value)} 
        required 
      />
      <Select 
        label="Copiar estrutura de:" 
        value={copyFromId}
        onChange={(e) => setCopyFromId(e.target.value)}
        options={[
          { value: '', label: 'Não copiar (iniciar em branco)' },
          ...months.map(m => ({ value: m.id, label: m.name }))
        ]}
      />
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
        <Button variant="outline" type="button" onClick={onCancel} className="w-full sm:w-auto">Cancelar</Button>
        <Button type="submit" className="w-full sm:w-auto">Criar Mês</Button>
      </div>
    </form>
  );
}

function EditMonthForm({ month, onSubmit, onDelete, onCancel }: { month: Month, onSubmit: (name: string) => void, onDelete: () => void, onCancel: () => void }) {
  const [name, setName] = useState(month.name);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(name); }} className="space-y-4 sm:space-y-6">
      <Input 
        label="Nome do Mês (MM/YYYY)" 
        value={name} 
        onChange={(e) => setName(e.target.value)} 
        required 
      />
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 pt-4">
        <Button variant="danger" type="button" onClick={onDelete} size="sm" className="w-full sm:w-auto">
          <Trash2 size={14} />
          Excluir Mês
        </Button>
        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <Button variant="outline" type="button" onClick={onCancel} className="w-full sm:w-auto">Cancelar</Button>
          <Button type="submit" className="w-full sm:w-auto">Salvar Alterações</Button>
        </div>
      </div>
    </form>
  );
}

function CollaboratorForm({ initialData, onSubmit, onDelete, onCancel }: { initialData?: Collaborator, onSubmit: (data: Partial<Collaborator>) => void, onDelete?: () => void, onCancel: () => void }) {
  const [name, setName] = useState(initialData?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(initialData?.avatarUrl || '');
  const [meta, setMeta] = useState(initialData?.meta?.toString() || '');

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ name, avatarUrl, meta: Number(meta) }); }} className="space-y-4 sm:space-y-6">
      <Input label="Nome Completo" value={name} onChange={(e) => setName(e.target.value)} required />
      <Input label="URL da Imagem / Avatar" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
      <Input label="Meta Individual" type="number" value={meta} onChange={(e) => setMeta(e.target.value)} />
      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
        {initialData && onDelete && (
          <Button variant="destructive" type="button" onClick={onDelete} className="w-full sm:w-auto sm:mr-auto">
            <Trash2 size={18} className="mr-2" />
            Excluir
          </Button>
        )}
        <div className="flex flex-col-reverse sm:flex-row gap-3 w-full sm:w-auto">
          <Button variant="outline" type="button" onClick={onCancel} className="w-full sm:w-auto">Cancelar</Button>
          <Button type="submit" className="w-full sm:w-auto">{initialData ? 'Salvar Alterações' : 'Adicionar Colaborador'}</Button>
        </div>
      </div>
    </form>
  );
}

function IndicatorForm({ initialData, onSubmit, onCancel, showSectorSelect = false, sectorName }: { initialData?: Indicator, onSubmit: (data: Partial<Indicator>) => void, onCancel: () => void, showSectorSelect?: boolean, sectorName?: string }) {
  const [name, setName] = useState(initialData?.name || '');
  const [type, setType] = useState<IndicatorType>(initialData?.type || 'number');
  const [sectorId, setSectorId] = useState(initialData?.sectorId || SECTORS[0].id);
  const [isSectorOnly, setIsSectorOnly] = useState(initialData?.isSectorOnly || showSectorSelect);
  const [resultType, setResultType] = useState<'sum' | 'average'>(initialData?.resultType || 'sum');
  const [metaSittax, setMetaSittax] = useState(initialData?.metaSittax?.toString() || '');
  const [metaOpenix, setMetaOpenix] = useState(initialData?.metaOpenix?.toString() || '');
  const [operation, setOperation] = useState<'sittax' | 'openix' | 'both' | 'sector'>(
    initialData?.operation === 'both' && initialData?.isGeneral === false ? 'sector' : (initialData?.operation as any) || 'both'
  );

  return (
    <form onSubmit={(e) => { 
      e.preventDefault(); 
      onSubmit({ 
        name, 
        type, 
        sectorId: showSectorSelect ? sectorId : undefined,
        isSectorOnly,
        metaSittax: metaSittax ? parseFloat(metaSittax) : undefined,
        metaOpenix: metaOpenix ? parseFloat(metaOpenix) : undefined,
        operation: operation === 'sector' ? 'both' : operation as any,
        isGeneral: showSectorSelect ? true : false,
        resultType
      }); 
    }} className="space-y-4 sm:space-y-6">
      {showSectorSelect && (
        <Select 
          label="Setor" 
          value={sectorId}
          onChange={(e) => setSectorId(e.target.value)}
          options={SECTORS.map(s => ({ value: s.id, label: s.name }))}
        />
      )}
      <Input label="Nome do Indicador" value={name} onChange={(e) => setName(e.target.value)} required />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select 
          label="Tipo de Dado" 
          value={type}
          onChange={(e) => setType(e.target.value as IndicatorType)}
          options={[
            { value: 'number', label: 'Numérico' },
            { value: 'percentage', label: 'Percentual (%)' },
            { value: 'currency', label: 'Valor em R$' },
            { value: 'time', label: 'Tempo (hh:mm:ss)' },
          ]}
        />
        <Select 
          label="Operação" 
          value={operation}
          onChange={(e) => setOperation(e.target.value as any)}
          options={[
            { value: 'both', label: 'Ambas (Sittax e Openix)' },
            { value: 'sittax', label: 'Apenas Sittax' },
            { value: 'openix', label: 'Apenas Openix' },
            ...(sectorName ? [{ value: 'sector', label: `Apenas ${sectorName}` }] : [])
          ]}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select 
          label="Tipo de Resultado Geral" 
          value={resultType}
          onChange={(e) => setResultType(e.target.value as 'sum' | 'average')}
          options={[
            { value: 'sum', label: 'Soma Geral' },
            { value: 'average', label: 'Média Geral' },
          ]}
        />
        <div />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input 
          label="Meta Sittax" 
          type="number" 
          step="0.01" 
          value={metaSittax} 
          onChange={(e) => setMetaSittax(e.target.value)} 
          placeholder="Ex: 95"
        />
        <Input 
          label="Meta Openix" 
          type="number" 
          step="0.01" 
          value={metaOpenix} 
          onChange={(e) => setMetaOpenix(e.target.value)} 
          placeholder="Ex: 95"
        />
      </div>
      {!showSectorSelect && (
        <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
          <input 
            type="checkbox" 
            id="isSectorOnly" 
            checked={isSectorOnly} 
            onChange={(e) => setIsSectorOnly(e.target.checked)}
            className="w-4 h-4 text-[#FF6B00] border-gray-300 rounded focus:ring-[#FF6B00] cursor-pointer"
          />
          <label htmlFor="isSectorOnly" className="text-xs sm:text-sm font-bold text-gray-700 cursor-pointer select-none">
            Indicador apenas do setor (não pertence a colaboradores)
          </label>
        </div>
      )}
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
        <Button variant="outline" type="button" onClick={onCancel} className="w-full sm:w-auto">Cancelar</Button>
        <Button type="submit" className="w-full sm:w-auto">{initialData ? 'Salvar Alterações' : 'Adicionar Indicador'}</Button>
      </div>
    </form>
  );
}

function SectorForm({ initialData, onSubmit, onCancel }: { initialData?: Sector, onSubmit: (data: Partial<Sector>) => void, onCancel: () => void }) {
  const [name, setName] = useState(initialData?.name || '');
  const [logoUrl, setLogoUrl] = useState(initialData?.logoUrl || '');

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ name, logoUrl }); }} className="space-y-4 sm:space-y-6">
      <Input label="Nome do Setor" value={name} onChange={(e) => setName(e.target.value)} required />
      <Input label="URL do Brasão / Logo" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
        <Button variant="outline" type="button" onClick={onCancel} className="w-full sm:w-auto">Cancelar</Button>
        <Button type="submit" className="w-full sm:w-auto">Salvar Alterações</Button>
      </div>
    </form>
  );
}

function SettingsView({ userProfile }: { userProfile: User | null }) {
  const { resetPassword } = useAuth();
  const [photoURL, setPhotoURL] = useState(userProfile?.fotoURL || '');
  const [saving, setSaving] = useState(false);

  const handleUpdatePhoto = async () => {
    if (!userProfile) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'usuarios', userProfile.uid), { fotoURL: photoURL });
      toast.success('Foto de perfil atualizada com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar foto.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!userProfile?.email) return;
    try {
      await resetPassword(userProfile.email);
      toast.success('E-mail de redefinição de senha enviado!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar e-mail.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter mb-2">Configurações</h2>
        <p className="text-gray-500 font-medium">Gerencie suas informações de perfil e segurança.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card title="Perfil" subtitle="Altere sua imagem de exibição">
          <div className="flex flex-col items-center space-y-6">
            <div className="relative group">
              <div className="w-32 h-32 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                <img 
                  src={photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.nome || 'U')}&background=random`} 
                  alt="Preview" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            
            <div className="w-full space-y-4">
              <Input 
                label="URL da Foto" 
                value={photoURL} 
                onChange={(e) => setPhotoURL(e.target.value)}
                placeholder="https://exemplo.com/foto.jpg"
              />
              <Button 
                onClick={handleUpdatePhoto} 
                disabled={saving} 
                className="w-full"
              >
                {saving ? 'Salvando...' : 'Atualizar Foto'}
              </Button>
            </div>
          </div>
        </Card>

        <Card title="Segurança" subtitle="Gerencie seu acesso">
          <div className="flex flex-col items-center justify-center h-full space-y-6 py-6 font-medium text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center text-[#FF6B00]">
              <Key size={32} />
            </div>
            <div>
              <h4 className="font-bold text-gray-900">Alterar Senha</h4>
              <p className="text-sm text-gray-500 mt-1">Por segurança, enviaremos um link de redefinição para o seu e-mail.</p>
            </div>
            <Button 
              variant="outline" 
              onClick={handlePasswordReset}
              className="w-full border-orange-200 text-[#FF6B00] hover:bg-orange-50"
            >
              <Mail size={18} />
              Enviar E-mail de Redefinição
            </Button>
          </div>
        </Card>
      </div>

      <Card title="Informações da Conta">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Nome</p>
            <p className="font-bold text-gray-900">{userProfile?.nome}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">E-mail</p>
            <p className="font-bold text-gray-900">{userProfile?.email}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Cargo</p>
            <p className="font-bold text-gray-900">{userProfile?.cargo}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Setor</p>
            <p className="font-bold text-gray-900">
              {Array.isArray(userProfile?.setor) ? userProfile.setor.join(' & ') : userProfile?.setor}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
