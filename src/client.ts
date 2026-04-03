/**
 * CerebroChain API Client
 * Wraps the REST API for MCP tool calls.
 */

const DEFAULT_API_URL = 'https://cerebrochain.com/api';
const DEFAULT_TIMEOUT = 30_000;

interface ClientConfig {
  apiUrl: string;
  apiKey?: string;
  jwtToken?: string;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: Record<string, unknown>;
  query?: Record<string, string>;
  requiresAuth?: boolean;
}

interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
  error?: string;
}

export class CerebroChainClient {
  private config: ClientConfig;
  private jwtToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.config = {
      apiUrl: process.env.CEREBROCHAIN_API_URL ?? DEFAULT_API_URL,
      apiKey: process.env.CEREBROCHAIN_API_KEY,
      jwtToken: process.env.CEREBROCHAIN_JWT_TOKEN,
    };
  }

  get isAuthenticated(): boolean {
    return !!(this.config.apiKey || this.config.jwtToken || this.jwtToken);
  }

  /**
   * Authenticate with email/password to get JWT (for agents that don't have API keys)
   */
  async authenticate(email: string, password: string): Promise<boolean> {
    const response = await this.request<{ token: string }>({
      method: 'POST',
      path: '/auth/login',
      body: { email, password },
      requiresAuth: false,
    });
    if (response.ok && response.data.token) {
      this.jwtToken = response.data.token;
      this.tokenExpiry = Date.now() + 23 * 60 * 60 * 1000; // ~23 hours
      return true;
    }
    return false;
  }

  /**
   * Make an API request to CerebroChain
   */
  async request<T = unknown>(options: RequestOptions): Promise<ApiResponse<T>> {
    const { method = 'GET', path, body, query, requiresAuth = true } = options;

    // Build URL
    const url = new URL(path.startsWith('/') ? path : `/${path}`, this.config.apiUrl);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== '') {
          url.searchParams.set(key, value);
        }
      }
    }

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'CerebroChain-MCP-Server/1.0',
    };

    if (requiresAuth) {
      if (this.config.apiKey) {
        headers['X-API-Key'] = this.config.apiKey;
      } else if (this.config.jwtToken) {
        headers['Authorization'] = `Bearer ${this.config.jwtToken}`;
      } else if (this.jwtToken) {
        headers['Authorization'] = `Bearer ${this.jwtToken}`;
      }
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

      const response = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const data = await response.json() as T;

      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          data: {} as T,
          error: (data as Record<string, string>)?.message ?? `HTTP ${response.status}`,
        };
      }

      return { ok: true, status: response.status, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return {
        ok: false,
        status: 0,
        data: {} as T,
        error: message.includes('abort') ? 'Request timeout' : message,
      };
    }
  }

  // ── Convenience methods ──

  async get<T = unknown>(path: string, query?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'GET', path, query });
  }

  async post<T = unknown>(path: string, body?: Record<string, unknown>): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'POST', path, body });
  }

  async getPublic<T = unknown>(path: string, query?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'GET', path, query, requiresAuth: false });
  }

  async postPublic<T = unknown>(path: string, body?: Record<string, unknown>): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'POST', path, body, requiresAuth: false });
  }
}
