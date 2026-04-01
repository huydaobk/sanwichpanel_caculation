import { useReducer, useCallback } from 'react';
import { 
  createDefaultConfig, 
  createVariant, 
  COMPARE_VARIANT_LABELS, 
  getSafeLocalStorage, 
  STORAGE_KEYS, 
  normalizePresetLibrary 
} from '../utils/appLogic';

const initialState = {
  // config uses initial factory during init
  config: null, 
  compareVariants: [],
  compareModeEnabled: false,
  compareActiveVariantId: 'variant-a',
  snapshotWorkflowMessage: '',
  presetLibraryWarning: '',
  presetLibrary: [],
  presetDraftName: '',
  presetDraftNote: '',
  activeTab: 'input',
  printMode: false,
  updateStatus: null,
  appVersion: '',
};

function init(initialStateObj) {
  const state = { ...initialStateObj };
  
  state.config = createDefaultConfig();
  state.compareVariants = [createVariant('variant-a', COMPARE_VARIANT_LABELS[0], createDefaultConfig())];

  const storage = getSafeLocalStorage();
  if (storage) {
    try {
      const raw = storage.getItem(STORAGE_KEYS.presetLibrary);
      if (raw) {
        state.presetLibrary = normalizePresetLibrary(JSON.parse(raw));
      }
    } catch (e) {
      console.warn('Failed to hydrate preset library state', e);
      try { storage.removeItem(STORAGE_KEYS.presetLibrary); } catch { /* ignore */ }
    }
  }
  return state;
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_STATE':
      return { ...state, ...action.payload };
    case 'SET_FIELD': {
      const { field, value } = action.payload;
      const nextValue = typeof value === 'function' ? value(state[field]) : value;
      return state[field] === nextValue ? state : { ...state, [field]: nextValue };
    }
    default:
      return state;
  }
}

export function useAppState() {
  const [state, dispatch] = useReducer(reducer, initialState, init);

  const createSetter = useCallback((field) => (value) => {
    dispatch({ type: 'SET_FIELD', payload: { field, value } });
  }, []);

  return {
    state,
    setState: (payload) => dispatch({ type: 'SET_STATE', payload }),
    setConfig: createSetter('config'),
    setCompareVariants: createSetter('compareVariants'),
    setCompareModeEnabled: createSetter('compareModeEnabled'),
    setCompareActiveVariantId: createSetter('compareActiveVariantId'),
    setSnapshotWorkflowMessage: createSetter('snapshotWorkflowMessage'),
    setPresetLibraryWarning: createSetter('presetLibraryWarning'),
    setPresetLibrary: createSetter('presetLibrary'),
    setPresetDraftName: createSetter('presetDraftName'),
    setPresetDraftNote: createSetter('presetDraftNote'),
    setActiveTab: createSetter('activeTab'),
    setPrintMode: createSetter('printMode'),
    setUpdateStatus: createSetter('updateStatus'),
    setAppVersion: createSetter('appVersion'),
  };
}
