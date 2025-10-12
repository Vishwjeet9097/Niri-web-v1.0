import { config } from '@/config/environment';
import { apiService } from './api.service';
import { mockAdapter } from './mock.service';
import type { HttpClient } from './api.service';

/**
 * Main HTTP client - automatically switches between mock and real API
 * Toggle via VITE_USE_MOCK environment variable
 */
export const httpClient: HttpClient = config.useMock ? mockAdapter : apiService;
