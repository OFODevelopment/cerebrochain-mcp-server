/**
 * CerebroChain API Client
 * Wraps the REST API for MCP tool calls.
 */
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
export declare class CerebroChainClient {
    private config;
    private jwtToken;
    private tokenExpiry;
    constructor();
    get isAuthenticated(): boolean;
    /**
     * Authenticate with email/password to get JWT (for agents that don't have API keys)
     */
    authenticate(email: string, password: string): Promise<boolean>;
    /**
     * Make an API request to CerebroChain
     */
    request<T = unknown>(options: RequestOptions): Promise<ApiResponse<T>>;
    get<T = unknown>(path: string, query?: Record<string, string>): Promise<ApiResponse<T>>;
    post<T = unknown>(path: string, body?: Record<string, unknown>): Promise<ApiResponse<T>>;
    getPublic<T = unknown>(path: string, query?: Record<string, string>): Promise<ApiResponse<T>>;
    postPublic<T = unknown>(path: string, body?: Record<string, unknown>): Promise<ApiResponse<T>>;
}
export {};
