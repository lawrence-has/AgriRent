import { create } from 'zustand';

const STORAGE_KEY = 'agrirent_saved_equipment_v1';

const readSavedEquipment = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  } catch {
    return {};
  }
};

const persistSavedEquipment = (savedByUser) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedByUser));
  } catch {
    // Keep the current session interactive if browser storage is unavailable.
  }
};

const useSavedEquipmentStore = create((set, get) => ({
  savedByUser: readSavedEquipment(),
  toggleSaved: (userId, equipmentId) => {
    if (!userId || !equipmentId) return false;
    const key = String(userId);
    const saved = get().savedByUser;
    const current = saved[key] || [];
    const id = Number(equipmentId);
    const isSaved = current.some((item) => Number(item) === id);
    const next = isSaved
      ? current.filter((item) => Number(item) !== id)
      : [...current, id];
    const savedByUser = { ...saved, [key]: next };
    persistSavedEquipment(savedByUser);
    set({ savedByUser });
    return !isSaved;
  },
}));

export default useSavedEquipmentStore;
