/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
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
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parse, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
import { 
  SECTORS, 
  Sector, 
  Month, 
  Collaborator, 
  Indicator, 
  DataValue, 
  IndicatorType 
} from './types';

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

const Card = ({ children, className, title, subtitle, action, noPadding = false, onClick }: { children: React.ReactNode, className?: string, title?: string, subtitle?: string, action?: React.ReactNode, noPadding?: boolean, onClick?: () => void }) => (
  <div 
    className={cn('bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden', className)}
    onClick={onClick}
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
  <div className="space-y-1.5">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <input 
      className={cn(
        'w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] transition-all',
        error && 'border-red-500 focus:ring-red-500/20 focus:border-red-500',
        props.className
      )}
      {...props}
    />
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

const Select = ({ label, options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string, options: { value: string, label: string }[] }) => (
  <div className="space-y-1.5">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <div className="relative">
      <select 
        className={cn(
          'w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] transition-all appearance-none',
          props.className
        )}
        {...props}
      >
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
        <ChevronRight className="rotate-90 w-4 h-4" />
      </div>
    </div>
  </div>
);

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <Plus className="rotate-45 w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [loading, setLoading] = useState(true);
  const [activeSectorId, setActiveSectorId] = useState<string>('onboarding');
  const [months, setMonths] = useState<Month[]>([]);
  const [selectedMonthId, setSelectedMonthId] = useState<string>('');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [dataValues, setDataValues] = useState<DataValue[]>([]);
  
  // Modals state
  const [isNewMonthModalOpen, setIsNewMonthModalOpen] = useState(false);
  const [isCollaboratorModalOpen, setIsCollaboratorModalOpen] = useState(false);
  const [isIndicatorModalOpen, setIsIndicatorModalOpen] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState<Collaborator | null>(null);
  const [editingIndicator, setEditingIndicator] = useState<Indicator | null>(null);

  const [sectorOverrides, setSectorOverrides] = useState<Record<string, Partial<Sector>>>({});
  const [isSectorModalOpen, setIsSectorModalOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<Sector | null>(null);

  const activeSector = useMemo(() => {
    const base = SECTORS.find(s => s.id === activeSectorId) || SECTORS[0];
    const override = sectorOverrides[activeSectorId];
    return override ? { ...base, ...override } : base;
  }, [activeSectorId, sectorOverrides]);

  const selectedMonth = useMemo(() => months.find(m => m.id === selectedMonthId), [months, selectedMonthId]);

  useEffect(() => {
    const init = async () => {
      await Promise.all([
        fetchMonths(),
        fetchSectorOverrides()
      ]);
      setLoading(false);
    };
    init();
  }, []);

  const fetchSectorOverrides = async () => {
    const snapshot = await getDocs(collection(db, 'sectorOverrides'));
    const overrides: Record<string, Partial<Sector>> = {};
    snapshot.docs.forEach(doc => {
      overrides[doc.id] = doc.data() as Partial<Sector>;
    });
    setSectorOverrides(overrides);
  };

  useEffect(() => {
    if (selectedMonthId) {
      fetchMonthData(selectedMonthId);
    }
  }, [selectedMonthId]);

  const fetchMonths = async () => {
    const q = query(collection(db, 'months'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const monthsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Month));
    
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
      setMonths(monthsData);
      setSelectedMonthId(monthsData[0].id);
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
    const [colSnap, indSnap, valSnap] = await Promise.all([
      getDocs(query(collection(db, 'collaborators'), where('monthId', '==', monthId))),
      getDocs(query(collection(db, 'indicators'), where('monthId', '==', monthId))),
      getDocs(query(collection(db, 'dataValues'), where('monthId', '==', monthId)))
    ]);

    setCollaborators(colSnap.docs.map(d => ({ id: d.id, ...d.data() } as Collaborator)));
    setIndicators(indSnap.docs.map(d => ({ id: d.id, ...d.data() } as Indicator)).sort((a, b) => a.order - b.order));
    setDataValues(valSnap.docs.map(d => ({ id: d.id, ...d.data() } as DataValue)));
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

  const handleSaveValue = async (indicatorId: string, collaboratorId: string, value: string | number) => {
    const existing = dataValues.find(v => v.indicatorId === indicatorId && v.collaboratorId === collaboratorId && v.monthId === selectedMonthId);
    
    if (existing) {
      await updateDoc(doc(db, 'dataValues', existing.id), { value });
    } else {
      await addDoc(collection(db, 'dataValues'), {
        monthId: selectedMonthId,
        indicatorId,
        collaboratorId,
        value
      });
    }
    fetchMonthData(selectedMonthId);
  };

  const handleAddCollaborator = async (data: Partial<Collaborator>) => {
    if (editingCollaborator) {
      await updateDoc(doc(db, 'collaborators', editingCollaborator.id), data);
    } else {
      await addDoc(collection(db, 'collaborators'), {
        ...data,
        monthId: selectedMonthId,
        sectorId: activeSectorId
      });
    }
    fetchMonthData(selectedMonthId);
    setIsCollaboratorModalOpen(false);
    setEditingCollaborator(null);
  };

  const handleAddIndicator = async (data: Partial<Indicator>) => {
    if (editingIndicator) {
      await updateDoc(doc(db, 'indicators', editingIndicator.id), data);
    } else {
      const sectorIndicators = indicators.filter(i => i.sectorId === activeSectorId);
      await addDoc(collection(db, 'indicators'), {
        ...data,
        monthId: selectedMonthId,
        sectorId: activeSectorId,
        order: sectorIndicators.length
      });
    }
    fetchMonthData(selectedMonthId);
    setIsIndicatorModalOpen(false);
    setEditingIndicator(null);
  };

  const handleDeleteCollaborator = async (id: string) => {
    if (confirm('Deseja remover este colaborador?')) {
      await deleteDoc(doc(db, 'collaborators', id));
      fetchMonthData(selectedMonthId);
    }
  };

  const handleDeleteIndicator = async (id: string) => {
    if (confirm('Deseja remover este indicador?')) {
      await deleteDoc(doc(db, 'indicators', id));
      fetchMonthData(selectedMonthId);
    }
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
    
    const headers = ['Setor', 'Indicador', 'Colaborador', 'Valor'];
    const rows = dataValues
      .filter(v => v.monthId === selectedMonthId)
      .map(v => {
        const sector = SECTORS.find(s => s.id === (collaborators.find(c => c.id === v.collaboratorId)?.sectorId || indicators.find(i => i.id === v.indicatorId)?.sectorId));
        const indicator = indicators.find(i => i.id === v.indicatorId);
        const collaborator = collaborators.find(c => c.id === v.collaboratorId);
        return [
          sector?.name || '-',
          indicator?.name || '-',
          collaborator?.name || 'Setor',
          v.value
        ];
      });

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sittax_performance_${selectedMonth.name.replace('/', '-')}.csv`;
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
    <div className="min-h-screen bg-[#F8F9FA] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col fixed h-full z-20">
        <div className="p-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF6B00] rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
              <TrendingUp className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-xl text-gray-900 tracking-tight">Sittax</h1>
              <p className="text-[10px] uppercase tracking-widest text-[#FF6B00] font-bold">Performance Hub</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="Visão Geral" 
            active={activeSectorId === 'overview'} 
            onClick={() => setActiveSectorId('overview')} 
          />
          <div className="pt-4 pb-2 px-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Setores</p>
          </div>
          {SECTORS.map(sector => (
            <div key={sector.id}>
              <NavItem 
                icon={<div className="w-2 h-2 rounded-full" style={{ backgroundColor: sector.color }} />} 
                label={sector.name} 
                active={activeSectorId === sector.id} 
                onClick={() => setActiveSectorId(sector.id)} 
              />
            </div>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <div className="bg-orange-50 rounded-2xl p-4">
            <p className="text-xs font-semibold text-[#FF6B00] uppercase mb-1">Status</p>
            <p className="text-sm font-bold text-gray-900">Dashboard Ativo</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Calendar className="text-gray-400 w-5 h-5" />
              <select 
                value={selectedMonthId}
                onChange={(e) => setSelectedMonthId(e.target.value)}
                className="bg-transparent font-bold text-gray-900 focus:outline-none cursor-pointer hover:text-[#FF6B00] transition-colors"
              >
                {months.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="h-6 w-px bg-gray-100" />
            <div className="flex bg-gray-50 p-1 rounded-lg">
               <button 
                 onClick={handleNextMonth}
                 className={cn(
                   "px-3 py-1 text-xs font-bold rounded-md transition-all",
                   months.findIndex(m => m.id === selectedMonthId) === 0 
                    ? "text-gray-900 bg-white shadow-sm" 
                    : "text-gray-400 hover:text-gray-600"
                 )}
               >
                 Mês Atual
               </button>
               <button 
                 onClick={handlePrevMonth}
                 className={cn(
                   "px-3 py-1 text-xs font-bold rounded-md transition-all",
                   months.findIndex(m => m.id === selectedMonthId) > 0 
                    ? "text-gray-900 bg-white shadow-sm" 
                    : "text-gray-400 hover:text-gray-600"
                 )}
               >
                 Mês Anterior
               </button>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setIsNewMonthModalOpen(true)}>
              <Plus size={16} />
              Novo Mês
            </Button>
            <Button size="sm" onClick={handleExport}>
              <Download size={16} />
              Exportar
            </Button>
          </div>
        </header>

        <div className="p-8 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSectorId + selectedMonthId}
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
                  onNavigate={setActiveSectorId}
                />
              ) : (
                <SectorDashboard 
                  sector={activeSector}
                  monthId={selectedMonthId}
                  indicators={indicators.filter(i => i.sectorId === activeSectorId)}
                  collaborators={collaborators.filter(c => c.sectorId === activeSectorId)}
                  dataValues={dataValues}
                  onSaveValue={handleSaveValue}
                  onAddCollaborator={() => setIsCollaboratorModalOpen(true)}
                  onEditCollaborator={(c) => { setEditingCollaborator(c); setIsCollaboratorModalOpen(true); }}
                  onDeleteCollaborator={handleDeleteCollaborator}
                  onAddIndicator={() => setIsIndicatorModalOpen(true)}
                  onEditIndicator={(i) => { setEditingIndicator(i); setIsIndicatorModalOpen(true); }}
                  onDeleteIndicator={handleDeleteIndicator}
                  onEditSector={() => { setEditingSector(activeSector); setIsSectorModalOpen(true); }}
                />
              )}
            </motion.div>
          </AnimatePresence>
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

      <Modal 
        isOpen={isCollaboratorModalOpen} 
        onClose={() => { setIsCollaboratorModalOpen(false); setEditingCollaborator(null); }} 
        title={editingCollaborator ? "Editar Colaborador" : "Novo Colaborador"}
      >
        <CollaboratorForm 
          initialData={editingCollaborator || undefined}
          onSubmit={handleAddCollaborator}
          onCancel={() => { setIsCollaboratorModalOpen(false); setEditingCollaborator(null); }}
        />
      </Modal>

      <Modal 
        isOpen={isIndicatorModalOpen} 
        onClose={() => { setIsIndicatorModalOpen(false); setEditingIndicator(null); }} 
        title={editingIndicator ? "Editar Indicador" : "Novo Indicador"}
      >
        <IndicatorForm 
          initialData={editingIndicator || undefined}
          onSubmit={handleAddIndicator}
          onCancel={() => { setIsIndicatorModalOpen(false); setEditingIndicator(null); }}
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
    </div>
  );
}

// --- Sub-Views ---

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
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

function SectorDashboard({ 
  sector, 
  monthId, 
  indicators, 
  collaborators, 
  dataValues, 
  onSaveValue,
  onAddCollaborator,
  onEditCollaborator,
  onDeleteCollaborator,
  onAddIndicator,
  onEditIndicator,
  onDeleteIndicator,
  onEditSector
}: { 
  sector: Sector, 
  monthId: string,
  indicators: Indicator[], 
  collaborators: Collaborator[], 
  dataValues: DataValue[],
  onSaveValue: (indId: string, colId: string, val: string | number) => void,
  onAddCollaborator: () => void,
  onEditCollaborator: (c: Collaborator) => void,
  onDeleteCollaborator: (id: string) => void,
  onAddIndicator: () => void,
  onEditIndicator: (i: Indicator) => void,
  onDeleteIndicator: (id: string) => void,
  onEditSector: () => void
}) {
  const formatValue = (val: any, type: IndicatorType) => {
    if (val === '-' || val === undefined || val === null || val === '') return '-';
    const num = Number(val);
    if (isNaN(num)) return val;
    
    if (type === 'percentage') return `${num}%`;
    if (type === 'currency') return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return num.toLocaleString('pt-BR');
  };

  const getRowTotal = (indicator: Indicator) => {
    const values = collaborators.map(c => {
      const v = dataValues.find(dv => dv.indicatorId === indicator.id && dv.collaboratorId === c.id)?.value;
      return v === undefined || v === '-' || v === '' ? 0 : Number(v);
    });
    const total = values.reduce((a, b) => a + b, 0);
    
    if (indicator.type === 'percentage') {
       return collaborators.length > 0 ? Math.round(total / collaborators.length) : 0;
    }
    return total;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-3 h-8 rounded-full" style={{ backgroundColor: sector.color }} />
            <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">{sector.name}</h2>
          </div>
          <p className="text-gray-500 font-medium">Gestão de indicadores e performance individual da equipe.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onAddIndicator}>
            <Settings size={18} />
            Configurar Indicadores
          </Button>
          <Button onClick={onAddCollaborator}>
            <Plus size={18} />
            Novo Colaborador
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <div className="xl:col-span-3">
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-2xl shadow-gray-200/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#FF6B00] text-white">
                    <th className="p-6 text-left border-r border-white/10 min-w-[240px]">
                      <span className="text-xs font-black uppercase tracking-widest opacity-80">Indicador</span>
                    </th>
                    {collaborators.map(c => (
                      <th key={c.id} className="p-6 border-r border-white/10 min-w-[140px] group relative">
                        <div className="flex flex-col items-center gap-3">
                          <div className="relative">
                            <img 
                              src={c.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.name}`} 
                              alt={c.name} 
                              className="w-16 h-16 rounded-2xl border-4 border-white/20 bg-white/10 object-cover shadow-lg"
                              referrerPolicy="no-referrer"
                            />
                            <button 
                              onClick={() => onEditCollaborator(c)}
                              className="absolute -top-1 -right-1 bg-white text-gray-900 p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Edit2 size={10} />
                            </button>
                          </div>
                          <div className="text-center">
                            <span className="text-[10px] font-black uppercase tracking-tighter block leading-none mb-1">{c.name}</span>
                            {c.meta && <span className="text-[9px] font-bold opacity-60">META: {c.meta}</span>}
                          </div>
                        </div>
                      </th>
                    ))}
                    <th className="p-6 bg-[#E66000] min-w-[140px]">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                          <TrendingUp size={24} />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest">Setor</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {indicators.map(indicator => {
                    const rowTotal = getRowTotal(indicator);
                    const isNegative = indicator.name.toLowerCase().includes('perdido') || indicator.name.toLowerCase().includes('cancelamento');
                    
                    return (
                      <tr key={indicator.id} className="hover:bg-orange-50/30 transition-colors group">
                        <td className="p-5 border-r border-gray-50 bg-gray-50/30 relative">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-700">{indicator.name}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => onEditIndicator(indicator)} className="p-1 text-gray-400 hover:text-blue-600"><Edit2 size={12} /></button>
                              <button onClick={() => onDeleteIndicator(indicator.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={12} /></button>
                            </div>
                          </div>
                        </td>
                        {collaborators.map(c => {
                          const val = dataValues.find(dv => dv.indicatorId === indicator.id && dv.collaboratorId === c.id)?.value;
                          const isMetaMet = c.meta && !isNaN(Number(val)) && Number(val) >= c.meta;
                          
                          return (
                            <td key={c.id} className="p-0 border-r border-gray-50 relative">
                              <input 
                                type="text"
                                className={cn(
                                  "w-full h-full p-5 text-center text-sm font-bold focus:bg-white focus:outline-none transition-colors",
                                  isNegative && Number(val) > 0 ? "text-red-600" : 
                                  isMetaMet ? "text-[#FF6B00]" : "text-gray-600"
                                )}
                                defaultValue={val || ''}
                                onBlur={(e) => onSaveValue(indicator.id, c.id, e.target.value)}
                                placeholder="-"
                              />
                              {isMetaMet && (
                                <div className="absolute top-1 right-1">
                                  <CheckCircle2 size={10} className="text-[#FF6B00]" />
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td className="p-5 text-center bg-orange-50/50">
                          <span className={cn(
                            "text-sm font-black",
                            isNegative && rowTotal > 0 ? "text-red-600" : "text-[#FF6B00]"
                          )}>
                            {formatValue(rowTotal, indicator.type)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {indicators.length === 0 && (
                    <tr>
                      <td colSpan={collaborators.length + 2} className="p-20 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                            <Settings size={32} />
                          </div>
                          <p className="text-gray-400 font-medium">Nenhum indicador configurado para este setor.</p>
                          <Button variant="outline" size="sm" onClick={onAddIndicator}>Adicionar Primeiro Indicador</Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          {/* Brasão do Time */}
          <Card 
            className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-[#FF6B00] border-none relative overflow-hidden group cursor-pointer"
            onClick={onEditSector}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <Edit2 size={14} />
              </Button>
            </div>
            <div className="relative z-10 space-y-8 w-full flex flex-col items-center">
              <div className="w-full max-w-[320px] aspect-square flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                <div className="w-full h-full flex items-center justify-center">
                   {sector.logoUrl ? (
                     <img src={sector.logoUrl} alt={sector.name} className="w-full h-full object-contain drop-shadow-2xl" referrerPolicy="no-referrer" />
                   ) : (
                     <div className="text-center p-8 bg-white/10 rounded-[2rem] border border-white/20 backdrop-blur-sm">
                       <p className="text-white font-black text-4xl leading-none tracking-tighter mb-1">{sector.name.toUpperCase()}</p>
                       <p className="text-white font-bold text-xl leading-none tracking-widest opacity-60">SITTAX</p>
                     </div>
                   )}
                </div>
              </div>
              <div>
                <h3 className="text-white font-black text-3xl uppercase tracking-widest mb-2">{sector.name}</h3>
                <div className="w-16 h-1.5 bg-white mx-auto rounded-full" />
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          </Card>

          <Card title="Resumo do Setor" subtitle="Métricas consolidadas do mês">
            <div className="space-y-4 mt-4">
               <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <span className="text-xs font-bold text-gray-500 uppercase">Colaboradores</span>
                  <span className="text-lg font-black text-gray-900">{collaborators.length}</span>
               </div>
               <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <span className="text-xs font-bold text-gray-500 uppercase">Indicadores</span>
                  <span className="text-lg font-black text-gray-900">{indicators.length}</span>
               </div>
               <div className="flex items-center justify-between p-4 bg-orange-50 rounded-2xl">
                  <span className="text-xs font-bold text-[#FF6B00] uppercase">Performance Geral</span>
                  <span className="text-lg font-black text-[#FF6B00]">84%</span>
               </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function OverviewView({ sectors, indicators, dataValues, collaborators, onNavigate }: { sectors: Sector[], indicators: Indicator[], dataValues: DataValue[], collaborators: Collaborator[], onNavigate: (id: string) => void }) {
  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter mb-2">Visão Geral</h2>
          <p className="text-gray-500 font-medium">Acompanhamento consolidado de todos os setores da empresa.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sectors.map(sector => {
          const sectorColabs = collaborators.filter(c => c.sectorId === sector.id);
          const sectorInds = indicators.filter(i => i.sectorId === sector.id);
          
          return (
            <div key={sector.id}>
              <Card 
                className="hover:shadow-xl transition-shadow cursor-pointer group"
                onClick={() => onNavigate(sector.id)}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg overflow-hidden bg-white/10" style={{ backgroundColor: sector.color }}>
                      {sector.logoUrl ? (
                        <img src={sector.logoUrl} alt={sector.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <LayoutDashboard size={24} />
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900">{sector.name}</h3>
                  </div>
                  <ChevronRight size={18} className="text-gray-300 group-hover:text-[#FF6B00] transition-colors" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Equipe</p>
                    <p className="text-xl font-black text-gray-900">{sectorColabs.length}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">KPIs</p>
                    <p className="text-xl font-black text-gray-900">{sectorInds.length}</p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {sectorColabs.slice(0, 3).map((c, i) => (
                      <img 
                        key={c.id} 
                        src={c.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.name}`} 
                        className="w-8 h-8 rounded-lg border-2 border-white bg-gray-100" 
                        alt={c.name}
                        referrerPolicy="no-referrer"
                      />
                    ))}
                    {sectorColabs.length > 3 && (
                      <div className="w-8 h-8 rounded-lg border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                        +{sectorColabs.length - 3}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-bold text-[#FF6B00] flex items-center gap-1">
                    <ArrowUpRight size={14} />
                    +12% este mês
                  </span>
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
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(name, copyFromId); }} className="space-y-6">
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
      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" type="button" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">Criar Mês</Button>
      </div>
    </form>
  );
}

function CollaboratorForm({ initialData, onSubmit, onCancel }: { initialData?: Collaborator, onSubmit: (data: Partial<Collaborator>) => void, onCancel: () => void }) {
  const [name, setName] = useState(initialData?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(initialData?.avatarUrl || '');
  const [meta, setMeta] = useState(initialData?.meta?.toString() || '');

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ name, avatarUrl, meta: Number(meta) }); }} className="space-y-6">
      <Input label="Nome Completo" value={name} onChange={(e) => setName(e.target.value)} required />
      <Input label="URL da Imagem / Avatar" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
      <Input label="Meta Individual" type="number" value={meta} onChange={(e) => setMeta(e.target.value)} />
      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" type="button" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">{initialData ? 'Salvar Alterações' : 'Adicionar Colaborador'}</Button>
      </div>
    </form>
  );
}

function IndicatorForm({ initialData, onSubmit, onCancel }: { initialData?: Indicator, onSubmit: (data: Partial<Indicator>) => void, onCancel: () => void }) {
  const [name, setName] = useState(initialData?.name || '');
  const [type, setType] = useState<IndicatorType>(initialData?.type || 'number');

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ name, type }); }} className="space-y-6">
      <Input label="Nome do Indicador" value={name} onChange={(e) => setName(e.target.value)} required />
      <Select 
        label="Tipo de Dado" 
        value={type}
        onChange={(e) => setType(e.target.value as IndicatorType)}
        options={[
          { value: 'number', label: 'Numérico' },
          { value: 'percentage', label: 'Percentual (%)' },
          { value: 'currency', label: 'Valor em R$' },
        ]}
      />
      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" type="button" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">{initialData ? 'Salvar Alterações' : 'Adicionar Indicador'}</Button>
      </div>
    </form>
  );
}

function SectorForm({ initialData, onSubmit, onCancel }: { initialData?: Sector, onSubmit: (data: Partial<Sector>) => void, onCancel: () => void }) {
  const [name, setName] = useState(initialData?.name || '');
  const [logoUrl, setLogoUrl] = useState(initialData?.logoUrl || '');

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ name, logoUrl }); }} className="space-y-6">
      <Input label="Nome do Setor" value={name} onChange={(e) => setName(e.target.value)} required />
      <Input label="URL do Brasão / Logo" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" type="button" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">Salvar Alterações</Button>
      </div>
    </form>
  );
}
