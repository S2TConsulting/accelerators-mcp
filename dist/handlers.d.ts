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
export interface IamPolicyFinding {
    severity: string;
    code: string;
    statement: number;
    message: string;
    action?: string;
    resource?: string;
    recommendation: string;
}
export interface IamPolicySuggestion {
    priority: number;
    title: string;
    description: string;
    actions?: string[];
    resources?: string[];
}
export interface IamPolicyResponse {
    status: string;
    score: number;
    summary: {
        statements_analyzed: number;
        total_findings: number;
        critical: number;
        high: number;
        medium: number;
        low: number;
    };
    findings: IamPolicyFinding[];
    suggestions: IamPolicySuggestion[];
    scoped_alternatives?: Record<string, {
        read: string[];
        write: string[];
        admin: string[];
    }>;
    metadata: {
        policy_version: string;
        processing_time_ms: number;
    };
}
export declare function handleEmbed(args: Record<string, unknown>, apiClient: ApiClient): Promise<string>;
export declare function handleCloudFormation(args: Record<string, unknown>, apiClient: ApiClient): Promise<string>;
export declare function handleOAuthValidate(args: Record<string, unknown>, apiClient: ApiClient): Promise<string>;
export declare function handleCatalog(apiClient: ApiClient): Promise<string>;
export declare function handleUsage(apiClient: ApiClient): Promise<string>;
export interface MfaComplianceFinding {
    rule_id: string;
    severity: string;
    user?: string;
    policy?: string;
    finding: string;
    recommendation: string;
}
export interface MfaComplianceResponse {
    status: string;
    compliance_score: number;
    summary: {
        total_findings: number;
        critical: number;
        high: number;
        medium: number;
        low: number;
        users_checked: number;
        policies_checked: number;
        root_checked: boolean;
    };
    findings: MfaComplianceFinding[];
    recommendations: Array<{
        priority: number;
        title: string;
        description: string;
        actions?: string[];
    }>;
}
export interface DynamoDbDesignResponse {
    design: {
        table_name: string;
        key_schema: object;
        gsis: Array<{
            name: string;
            partition_key: object;
            sort_key?: object;
        }>;
        entity_mappings: Array<object>;
        access_pattern_mappings: Array<object>;
        sample_items: Array<object>;
    };
    cloudformation_template: object;
    summary: {
        entities: number;
        access_patterns: number;
        gsis_required: number;
    };
}
export interface ErrorPatternGroup {
    type: string;
    category: string;
    severity: string;
    count: number;
    percentage: number;
    common_causes: string[];
    remediation: string[];
    sample_errors: Array<{
        message: string;
        timestamp?: string;
    }>;
}
export interface ErrorPatternsResponse {
    summary: {
        total_errors: number;
        unique_patterns: number;
        critical_count: number;
        high_count: number;
        trend: string;
        trend_change_percent: number;
    };
    patterns: ErrorPatternGroup[];
    recommendations: Array<{
        priority: number;
        category: string;
        issue: string;
        actions?: string[];
    }>;
}
export interface DataLakeReadinessResponse {
    status: string;
    overall_score: number;
    summary: {
        ready_for_production: boolean;
        categories_evaluated: number;
        total_checks: number;
        passed: number;
        failed: number;
        warnings: number;
    };
    category_scores: Record<string, {
        score: number;
        passed: number;
        failed: number;
    }>;
    recommendations: Array<{
        priority: number;
        category: string;
        title: string;
        items: Array<{
            check: string;
            recommendation: string;
        }>;
    }>;
}
export declare function handleMfaCompliance(args: Record<string, unknown>, apiClient: ApiClient): Promise<string>;
export declare function handleDynamoDbDesign(args: Record<string, unknown>, apiClient: ApiClient): Promise<string>;
export declare function handleErrorPatterns(args: Record<string, unknown>, apiClient: ApiClient): Promise<string>;
export declare function handleDataLakeReadiness(args: Record<string, unknown>, apiClient: ApiClient): Promise<string>;
export declare function handleIamPolicyValidate(args: Record<string, unknown>, apiClient: ApiClient): Promise<string>;
export interface RiskFactor {
    name: string;
    weight: number;
    value: string;
    contribution: number;
}
export interface RiskClassificationResponse {
    risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    score: number;
    factors: RiskFactor[];
    recommendation: string;
    auto_approve: boolean;
    metadata: {
        processing_time_ms: number;
        model_version: string;
    };
}
export declare function handleRiskClassify(args: Record<string, unknown>, apiClient: ApiClient): Promise<string>;
export interface AgentCandidate {
    agent_id: string;
    name: string;
    domain: string;
    similarity_score: number;
    capabilities: string[];
}
export interface TaskRoutingResponse {
    best_match: AgentCandidate;
    candidates: AgentCandidate[];
    routing_method: "semantic" | "keyword" | "fallback";
    confidence: number;
    metadata: {
        agents_evaluated: number;
        processing_time_ms: number;
    };
}
export declare function handleTaskRouting(args: Record<string, unknown>, apiClient: ApiClient): Promise<string>;
export interface PredictedIssue {
    category: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    description: string;
    predicted_date: string;
    confidence: number;
    recommended_action: string;
}
export interface SystemPredictionResponse {
    issues: PredictedIssue[];
    health_score: number;
    summary: {
        total_predictions: number;
        critical: number;
        high: number;
        medium: number;
        low: number;
    };
    metadata: {
        analysis_window_days: number;
        processing_time_ms: number;
    };
}
export declare function handlePredictIssues(args: Record<string, unknown>, apiClient: ApiClient): Promise<string>;
export interface RecoveryStep {
    step: number;
    action: string;
    command?: string;
    expected_outcome: string;
}
export interface RecoveryResponse {
    matched: boolean;
    pattern_id: string | null;
    error_type: string;
    confidence: number;
    recovery_steps: RecoveryStep[];
    historical_success_rate: number;
    metadata: {
        patterns_checked: number;
        processing_time_ms: number;
    };
}
export declare function handleAutoRecovery(args: Record<string, unknown>, apiClient: ApiClient): Promise<string>;
export interface ResilienceResult {
    success: boolean;
    attempts: number;
    total_latency_ms: number;
    circuit_breaker_state: "closed" | "open" | "half-open";
    last_error: string | null;
    metadata: {
        retry_config: {
            max_retries: number;
            base_delay_ms: number;
            max_delay_ms: number;
        };
    };
}
export declare function handleResilienceExecute(args: Record<string, unknown>, apiClient: ApiClient): Promise<string>;
export interface MemoryEntry {
    key: string;
    value: unknown;
    namespace: string;
    created_at: string;
    updated_at: string;
    ttl?: number;
}
export interface AgentMemoryResponse {
    operation: "store" | "retrieve" | "search" | "delete";
    success: boolean;
    entries: MemoryEntry[];
    total_entries: number;
    namespace: string;
    metadata: {
        storage_used_bytes: number;
        processing_time_ms: number;
    };
}
export declare function handleAgentMemory(args: Record<string, unknown>, apiClient: ApiClient): Promise<string>;
export interface TaskSubmissionResponse {
    task_id: string;
    agent_id: string;
    status: "queued" | "rejected";
    queue_position: number;
    estimated_wait_ms: number;
    metadata: {
        queue_depth: number;
        processing_time_ms: number;
    };
}
export declare function handleAgentTask(args: Record<string, unknown>, apiClient: ApiClient): Promise<string>;
export interface TraceContextResponse {
    traceparent: string;
    trace_id: string;
    span_id: string;
    version: string;
    created_at: string;
    metadata: {
        format: string;
    };
}
export declare function handleTraceContext(args: Record<string, unknown>, apiClient: ApiClient): Promise<string>;
export interface FileLockResponse {
    acquired: boolean;
    lock_token: string | null;
    file_path: string;
    holder?: string;
    stale_cleaned: boolean;
    metadata: {
        wait_time_ms: number;
        processing_time_ms: number;
    };
}
export declare function handleFileLock(args: Record<string, unknown>, apiClient: ApiClient): Promise<string>;
export interface CliCheckResult {
    name: string;
    status: "pass" | "fail" | "warn";
    message: string;
    version?: string;
}
export interface CliReadinessResponse {
    ready: boolean;
    checks: CliCheckResult[];
    degradation_mode: string | null;
    recommendations: string[];
    metadata: {
        total_checks: number;
        processing_time_ms: number;
    };
}
export declare function handleCliReadiness(args: Record<string, unknown>, apiClient: ApiClient): Promise<string>;
