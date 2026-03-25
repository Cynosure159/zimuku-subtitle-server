import axios from 'axios';
import { API_BASE } from './config';

export const apiClient = axios.create({
  baseURL: API_BASE,
});
