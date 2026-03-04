export type IndicatorType = 'number' | 'percentage' | 'currency';

export interface Sector {
  id: string;
  name: string;
  logoUrl?: string;
  color: string;
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
}

export interface DataValue {
  id: string;
  monthId: string;
  indicatorId: string;
  collaboratorId: string; // Can be 'sector' for the sector total if manual, but usually calculated
  value: number | string;
}

export const SECTORS: Sector[] = [
  { id: 'agendamento', name: 'Agendamento', color: '#FF6B00' },
  { id: 'onboarding', name: 'Onboarding', color: '#3B82F6' },
  { id: 'ongoing', name: 'Ongoing', color: '#10B981' },
  { id: 'retencao', name: 'Retenção', color: '#F43F5E' },
  { id: 'chat', name: 'Chat', color: '#8B5CF6' },
];
