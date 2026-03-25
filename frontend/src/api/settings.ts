import { API_ENDPOINTS } from '../lib/config';
import { apiClient } from '../lib/apiClient';
import type { Setting } from '../types/api';

export const listSettings = async (): Promise<Setting[]> => {
  const response = await apiClient.get(API_ENDPOINTS.SETTINGS);
  return response.data;
};

export const updateSetting = async (
  key: string,
  value: string,
  description?: string
): Promise<void> => {
  const response = await apiClient.post(API_ENDPOINTS.SETTINGS, { key, value, description });
  return response.data;
};
