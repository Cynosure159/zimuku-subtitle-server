import { useContext } from 'react';
import { MediaPollingContext, type MediaPollingContextValue } from '../contexts/mediaPollingContext.shared';

export function useMediaPollingContext(): MediaPollingContextValue {
  const context = useContext(MediaPollingContext);
  if (!context) {
    throw new Error('useMediaPollingContext must be used within MediaPollingProvider');
  }
  return context;
}
