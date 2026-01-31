/**
 * S2T Accelerators - Tool Handlers
 * Extracted for testability
 */
export interface ApiClient {
    callApi(endpoint: string, method?: string, body?: object): Promise<unknown>;
}
export interface EmbedChunk {
    text: string;
    metadata: {
        word_count: number;
    };
}
export interface EmbedResponse {
    chunks: EmbedChunk[];
    summary: {
        total_chunks: number;
        model: string;
        dimensions: number;
        processing_time_ms: number;
    };
    usage: {
        tokens_used: number;
        estimated_cost: number;
    };
}
export interface CloudFormationResource {
    logical_id: string;
    type: string;
}
export interface CloudFormationWarning {
    code: string;
    message: string;
    recommendation: string;
}
export interface CloudFormationResponse {
    template: string;
    metadata: {
        format: string;
        resource_count: number;
        resources: CloudFormationResource[];
    };
    warnings: CloudFormationWarning[];
    usage: {
        estimated_cost: number;
    };
}
export interface OAuthValidationItem {
    code: string;
    message: string;
}
export interface OAuthRecommendation {
    field: string;
    value: string;
    reason: string;
}
export interface OAuthResponse {
    valid: boolean;
    provider: string;
    configuration: {
        authorization_endpoint: string;
        token_endpoint: string;
    };
    validation: {
        errors: OAuthValidationItem[];
        warnings: OAuthValidationItem[];
    };
    recommendations: OAuthRecommendation[];
}
export interface Accelerator {
    id: string;
    name: string;
    endpoint: string;
    description: string;
    tier_access: string[];
}
export interface Tier {
    name: string;
    price: number;
    limits: {
        requestsPerMinute: number;
        requestsPerMonth: number | null;
    };
}
export interface CatalogResponse {
    accelerators: Accelerator[];
    tiers: Record<string, Tier>;
    your_tier: string;
}
export interface UsageResponse {
    tier: string;
    email: string;
    period: string;
    usage: {
        requests: number;
        last_request: string | null;
    };
    limits: {
        requests_per_minute: number;
        requests_per_month: number;
    };
    remaining: {
        requests_this_month: number;
    };
    billing: {
        tier_price: number;
        usage_charges: number;
        period_total: number;
    };
}
export declare function handleEmbed(args: Record<string, unknown>, apiClient: ApiClient): Promise<string>;
export declare function handleCloudFormation(args: Record<string, unknown>, apiClient: ApiClient): Promise<string>;
export declare function handleOAuthValidate(args: Record<string, unknown>, apiClient: ApiClient): Promise<string>;
export declare function handleCatalog(apiClient: ApiClient): Promise<string>;
export declare function handleUsage(apiClient: ApiClient): Promise<string>;
