import type { SaasFeature } from '@/lib/saasAccess';

export const saasFeatureMap: Record<string, SaasFeature> = {
  '/prompts': 'ai',
  '/crm': 'crm',
  '/relatorios': 'reports',
  '/pronto-para-postar': 'socialPosting',
};

export const saasFeatureLabels: Record<SaasFeature, string> = {
  ai: 'IA',
  crm: 'CRM',
  socialPosting: 'Social / Postagem',
  reports: 'Relatorios',
};