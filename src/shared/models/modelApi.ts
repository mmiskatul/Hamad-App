import { apiRequest } from '@/shared/api/client';
import { readAuthSession } from '@/shared/auth';
import type { Plan } from '@/shared/plan';

import { findModel, type ModelId, type ModelInfo } from './catalogue';
import { useModelStore } from './modelStore';

type ModelCatalogueResponse = {
  models: Array<{
    id: ModelId;
    name: string;
    vendor: string;
    minPlan: Plan;
    available: boolean;
    configuredModel: string;
  }>;
};

export async function fetchModelCatalogue(): Promise<readonly ModelInfo[]> {
  const response = await apiRequest<ModelCatalogueResponse>('/models', { authenticated: true });
  return response.models.map((model) => {
    const fallback = findModel(model.id);
    return {
      ...fallback,
      name: model.name,
      vendor: model.vendor,
      minPlan: model.minPlan,
      available: model.available,
    };
  });
}

export async function refreshModelCatalogue(): Promise<readonly ModelInfo[] | null> {
  const session = await readAuthSession();
  if (!session) return null;

  const catalogue = await fetchModelCatalogue();
  useModelStore.getState().setCatalogue(catalogue);
  return catalogue;
}