export type IndicatorType = 'number' | 'percentage' | 'currency' | 'time';

export interface Sector {
  id: string;
  name: string;
  logoUrl?: string;
  color: string;
  icon?: string;
}

export interface Month {
  id: string;
  name: string; // MM/YYYY
  createdAt: any;
}

export interface Collaborator {
  id: string;
  monthId: string;
  sectorId: string;
  name: string;
  avatarUrl?: string;
  meta?: number;
}

export interface Indicator {
  id: string;
  monthId: string;
  sectorId: string;
  name: string;
  type: IndicatorType;
  order: number;
  isSectorOnly?: boolean;
  isGeneral?: boolean;
  metaSittax?: number;
  metaOpenix?: number;
  operation?: 'sittax' | 'openix' | 'both';
}

export interface DataValue {
  id: string;
  monthId: string;
  indicatorId: string;
  collaboratorId: string; // Can be 'sector' for the sector total if manual, but usually calculated
  value: number | string;
  operation?: 'sittax' | 'openix';
  date?: string; // YYYY-MM-DD
}

export interface OperationDate {
  id: string;
  monthId: string;
  operation: 'sittax' | 'openix';
  date: string; // YYYY-MM-DD
}

export interface SectorHighlight {
  id: string;
  monthId: string;
  sectorId: string;
  collaboratorId: string;
}

export type DevelopmentClassification = 'DIRECIONAR' | 'GUIAR' | 'MOTIVAR' | 'DELEGAR';

export interface DevelopmentEvaluation {
  id: string;
  monthId: string;
  collaboratorId: string;
  evaluationDate: string;
  technicalScores: Record<string, number>;
  behavioralScores: Record<string, number>;
  technicalAverage: number;
  behavioralAverage: number;
  classification: DevelopmentClassification;
  updatedAt: any;
}

export const TECHNICAL_QUESTIONS = [
  'Entrega tarefas sem retrabalho',
  'Cumpre prazos previstos',
  'Domina as atividades do escopo',
  'Gerencia demandas sem ajuda',
  'Atinge metas de entregas/projetos',
  'Melhora continuamente a qualidade das entregas'
];

export const BEHAVIORAL_QUESTIONS = [
  'Mantém postura positiva / otimismo',
  'Lida bem com adversidades',
  'Aceita novos desafios',
  'Reclama com foco em solução',
  'Administra conflitos e stress',
  'Colabora com outras pessoas',
  'É aberto e receptivo a feedback'
];

export const SECTORS: Sector[] = [
  { id: 'agendamento', name: 'Agendamento', color: '#d3a331', icon: 'Calendar' },
  { id: 'onboarding', name: 'Onboarding', color: '#d35c35', icon: 'UserPlus' },
  { id: 'ongoing', name: 'Ongoing', color: '#d35c35', icon: 'TrendingUp' },
  { id: 'retencao', name: 'Retenção', color: '#4cb4eb', icon: 'Heart' },
  { id: 'chat', name: 'Atendimento', color: '#04934c', icon: 'MessageSquare' },
];
