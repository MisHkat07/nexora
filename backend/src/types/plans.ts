export type PlanName = 'free' | 'starter' | 'pro';

export interface PlanLimits {
  invoicesPerMonth: number | null;
  seats: number | null;
}

export const planNames: PlanName[] = ['free', 'starter', 'pro'];
