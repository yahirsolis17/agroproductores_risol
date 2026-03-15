import apiClient from '../../../global/api/apiClient';
import { ensureSuccess } from '../../../global/utils/backendEnvelope';

export interface DashboardMetric {
  id: string;
  label: string;
  value: number;
  display: string;
  helper: string;
  tone: string;
  icon: string;
}

export interface DashboardAction {
  id: string;
  title: string;
  description: string;
  to: string;
  tone: string;
  icon: string;
}

export interface DashboardAlert {
  id: string;
  source: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
  to?: string | null;
  cta?: string;
}

export interface DashboardInsight {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  tone: string;
  to?: string | null;
  cta?: string;
}

export interface DashboardComparison {
  id: string;
  label: string;
  current_label: string;
  previous_label: string;
  current_display: string;
  previous_display: string;
  current: number;
  previous: number;
  delta: number;
  delta_pct: number | null;
  direction: 'up' | 'down' | 'flat';
  helper: string;
  tone: string;
  to?: string | null;
}

export interface DashboardTimelineItem {
  id: number;
  title: string;
  description: string;
  category: string;
  severity: string;
  created_at: string;
  user_name: string;
  to?: string | null;
}

export interface DashboardModule {
  id: string;
  label: string;
  summary: string;
  metrics: DashboardMetric[];
  primary_action: DashboardAction;
  secondary_actions: DashboardAction[];
}

export interface DashboardContextLink {
  id: number;
  label: string;
  to: string;
}

export interface DashboardOverview {
  generated_at: string;
  hero: {
    headline: string;
    support: string;
    badges: string[];
    stats: DashboardMetric[];
  };
  today: {
    title: string;
    subtitle: string;
    cards: DashboardMetric[];
  };
  next_action: DashboardAction & { alternatives: DashboardAction[] };
  alerts: DashboardAlert[];
  insights: DashboardInsight[];
  comparisons: DashboardComparison[];
  timeline: DashboardTimelineItem[];
  modules: DashboardModule[];
  contexts: {
    featured_temporada: DashboardContextLink | null;
    featured_bodega: DashboardContextLink | null;
  };
}

export interface DashboardSearchResult {
  id: string;
  group: string;
  kind: string;
  title: string;
  subtitle: string;
  meta: string;
  to: string;
}

const OVERVIEW_TTL_MS = 30_000;
const SEARCH_TTL_MS = 45_000;
const SEARCH_CACHE_LIMIT = 24;

type CacheEntry<T> = {
  expiresAt: number;
  data: T;
};

let overviewCache: CacheEntry<DashboardOverview> | null = null;
let overviewInFlight: Promise<DashboardOverview> | null = null;
const searchCache = new Map<string, CacheEntry<DashboardSearchResult[]>>();
const searchInFlight = new Map<string, Promise<DashboardSearchResult[]>>();

const isFresh = (entry?: CacheEntry<unknown> | null) =>
  !!entry && entry.expiresAt > Date.now();

const setSearchCache = (query: string, data: DashboardSearchResult[]) => {
  if (searchCache.has(query)) {
    searchCache.delete(query);
  }
  searchCache.set(query, {
    data,
    expiresAt: Date.now() + SEARCH_TTL_MS,
  });

  while (searchCache.size > SEARCH_CACHE_LIMIT) {
    const oldestKey = searchCache.keys().next().value;
    if (!oldestKey) break;
    searchCache.delete(oldestKey);
  }
};

const dashboardService = {
  async getOverview(force = false): Promise<DashboardOverview> {
    if (!force && overviewCache && isFresh(overviewCache)) {
      return overviewCache.data;
    }

    if (!force && overviewInFlight) {
      return overviewInFlight;
    }

    overviewInFlight = apiClient
      .get('/usuarios/dashboard/overview/')
      .then((response) => ensureSuccess<DashboardOverview>(response.data).data)
      .then((data) => {
        overviewCache = {
          data,
          expiresAt: Date.now() + OVERVIEW_TTL_MS,
        };
        return data;
      })
      .finally(() => {
        overviewInFlight = null;
      });

    return overviewInFlight;
  },

  async search(query: string): Promise<DashboardSearchResult[]> {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length < 2) {
      return [];
    }

    const cached = searchCache.get(normalizedQuery);
    if (cached && isFresh(cached)) {
      return cached.data;
    }

    const existingRequest = searchInFlight.get(normalizedQuery);
    if (existingRequest) {
      return existingRequest;
    }

    const request = apiClient
      .get('/usuarios/dashboard/search/', {
        params: { q: normalizedQuery },
      })
      .then((response) => ensureSuccess<{ results: DashboardSearchResult[] }>(response.data).data.results ?? [])
      .then((results) => {
        setSearchCache(normalizedQuery, results);
        return results;
      })
      .finally(() => {
        searchInFlight.delete(normalizedQuery);
      });

    searchInFlight.set(normalizedQuery, request);
    return request;
  },

  invalidate() {
    overviewCache = null;
    overviewInFlight = null;
    searchCache.clear();
    searchInFlight.clear();
  },
};

export default dashboardService;
