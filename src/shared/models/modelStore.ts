import { create } from 'zustand';

import { MODELS, type ModelInfo } from './catalogue';

export type ModelCatalogueState = {
  catalogue: readonly ModelInfo[];
  hasLoaded: boolean;
  setCatalogue: (catalogue: readonly ModelInfo[]) => void;
  reset: () => void;
};

const MODEL_ORDER = new Map(MODELS.map((model, index) => [model.id, index]));

function sortCatalogue(catalogue: readonly ModelInfo[]): readonly ModelInfo[] {
  return [...catalogue].sort(
    (left, right) => (MODEL_ORDER.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (MODEL_ORDER.get(right.id) ?? Number.MAX_SAFE_INTEGER),
  );
}

export const useModelStore = create<ModelCatalogueState>()((set) => ({
  catalogue: MODELS,
  hasLoaded: false,
  setCatalogue: (catalogue) => set({ catalogue: sortCatalogue(catalogue), hasLoaded: true }),
  reset: () => set({ catalogue: MODELS, hasLoaded: false }),
}));

export function useModelCatalogue(): readonly ModelInfo[] {
  return useModelStore((state) => state.catalogue);
}