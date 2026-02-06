/**
 * S2T Accelerators - Tool Handlers
 * Extracted for testability
 */

export interface ApiClient {
  callApi(endpoint: string, method?: string, body?: object): Promise<unknown>;
}

// Embed response types
export interface EmbedChunk {
  text: string;
  metadata: { word_count: number };
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

// CloudFormation response types
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
  usage: { estimated_cost: number };
}

// OAuth response types
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

// Catalog response types
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

// Usage response types
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

// IAM Policy response types
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
  scoped_alternatives?: Record<string, { read: string[]; write: string[]; admin: string[] }>;
  metadata: {
    policy_version: string;
    processing_time_ms: number;
  };
}

// Handler implementations
export async function handleEmbed(
  args: Record<string, unknown>,
  apiClient: ApiClient
): Promise<string> {
  const result = await apiClient.callApi("/embed", "POST", {
    text: args.text,
    model: args.model || "amazon.titan-embed-text-v2:0",
    chunk_size: args.chunk_size || 512,
    chunk_overlap: args.chunk_overlap || 50,
  });

  const response = result as EmbedResponse;

  return JSON.stringify(
    {
      summary: `Generated ${response.summary.total_chunks} embedding(s) using ${response.summary.model}`,
      dimensions: response.summary.dimensions,
      chunks: response.chunks.map((c, i) => ({
        index: i,
        text_preview:
          c.text.substring(0, 100) + (c.text.length > 100 ? "..." : ""),
        word_count: c.metadata.word_count,
        has_embedding: true,
      })),
      usage: response.usage,
      note: "Full embeddings available in API response. Use for vector database indexing.",
    },
    null,
    2
  );
}

export async function handleCloudFormation(
  args: Record<string, unknown>,
  apiClient: ApiClient
): Promise<string> {
  const result = await apiClient.callApi("/generate/cloudformation", "POST", {
    description: args.description,
    format: args.format || "sam",
    include_parameters: args.include_parameters ?? true,
    include_outputs: args.include_outputs ?? true,
  });

  const response = result as CloudFormationResponse;

  let output = `# Generated ${response.metadata.format.toUpperCase()} Template\n\n`;
  output += `Resources created: ${response.metadata.resource_count}\n`;
  output += response.metadata.resources
    .map((r) => `- ${r.logical_id} (${r.type})`)
    .join("\n");
  output += "\n\n";

  if (response.warnings.length > 0) {
    output += "## Warnings\n";
    response.warnings.forEach((w) => {
      output += `- ${w.message}\n  Recommendation: ${w.recommendation}\n`;
    });
    output += "\n";
  }

  output += "## Template\n\n```yaml\n";
  output += response.template;
  output += "\n```\n";

  return output;
}

export async function handleOAuthValidate(
  args: Record<string, unknown>,
  apiClient: ApiClient
): Promise<string> {
  const result = await apiClient.callApi("/validate/oauth", "POST", {
    provider: args.provider,
    client_id: args.client_id,
    redirect_uris: args.redirect_uris,
    scopes: args.scopes,
    token_endpoint: args.token_endpoint,
    authorization_endpoint: args.authorization_endpoint,
  });

  const response = result as OAuthResponse;

  let output = `# OAuth Configuration Validation: ${response.provider}\n\n`;
  output += `**Status:** ${response.valid ? "VALID" : "INVALID"}\n\n`;

  if (response.validation.errors.length > 0) {
    output += "## Errors\n";
    response.validation.errors.forEach((e) => {
      output += `- [${e.code}] ${e.message}\n`;
    });
    output += "\n";
  }

  if (response.validation.warnings.length > 0) {
    output += "## Warnings\n";
    response.validation.warnings.forEach((w) => {
      output += `- [${w.code}] ${w.message}\n`;
    });
    output += "\n";
  }

  if (response.recommendations.length > 0) {
    output += "## Recommendations\n";
    response.recommendations.forEach((r) => {
      output += `- **${r.field}:** \`${r.value}\`\n  ${r.reason}\n`;
    });
    output += "\n";
  }

  output += "## Endpoints\n";
  output += `- Authorization: ${response.configuration.authorization_endpoint}\n`;
  output += `- Token: ${response.configuration.token_endpoint}\n`;

  return output;
}

export async function handleCatalog(apiClient: ApiClient): Promise<string> {
  const result = await apiClient.callApi("/catalog", "GET");

  const response = result as CatalogResponse;

  let output = "# S2T Accelerator Catalog\n\n";
  output += `**Your Tier:** ${response.your_tier}\n\n`;

  output += "## Available Accelerators\n\n";
  response.accelerators.forEach((acc) => {
    output += `### ${acc.name} (${acc.id})\n`;
    output += `${acc.description}\n`;
    output += `- Endpoint: \`${acc.endpoint}\`\n`;
    output += `- Available in: ${acc.tier_access.join(", ")}\n\n`;
  });

  output += "## Pricing Tiers\n\n";
  Object.entries(response.tiers).forEach(([, tier]) => {
    output += `- **${tier.name}:** $${tier.price}/mo - ${tier.limits.requestsPerMinute} req/min, ${tier.limits.requestsPerMonth || "unlimited"}/mo\n`;
  });

  return output;
}

export async function handleUsage(apiClient: ApiClient): Promise<string> {
  const result = await apiClient.callApi("/usage", "GET");

  const response = result as UsageResponse;

  let output = "# S2T API Usage\n\n";
  output += `**Account:** ${response.email}\n`;
  output += `**Tier:** ${response.tier}\n`;
  output += `**Period:** ${response.period}\n\n`;

  output += "## Usage\n";
  output += `- Requests this month: ${response.usage.requests}\n`;
  output += `- Remaining: ${response.remaining.requests_this_month}\n`;
  output += `- Rate limit: ${response.limits.requests_per_minute}/min\n`;
  output += `- Monthly limit: ${response.limits.requests_per_month}\n\n`;

  output += "## Billing\n";
  output += `- Tier price: $${response.billing.tier_price}\n`;
  output += `- Usage charges: $${response.billing.usage_charges}\n`;
  output += `- Period total: $${response.billing.period_total}\n`;

  return output;
}

// MFA Compliance response types
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

// DynamoDB Design response types
export interface DynamoDbDesignResponse {
  design: {
    table_name: string;
    key_schema: object;
    gsis: Array<{ name: string; partition_key: object; sort_key?: object }>;
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

// Error Patterns response types
export interface ErrorPatternGroup {
  type: string;
  category: string;
  severity: string;
  count: number;
  percentage: number;
  common_causes: string[];
  remediation: string[];
  sample_errors: Array<{ message: string; timestamp?: string }>;
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

// Data Lake Readiness response types
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
  category_scores: Record<string, { score: number; passed: number; failed: number }>;
  recommendations: Array<{
    priority: number;
    category: string;
    title: string;
    items: Array<{ check: string; recommendation: string }>;
  }>;
}

export async function handleMfaCompliance(
  args: Record<string, unknown>,
  apiClient: ApiClient
): Promise<string> {
  const result = await apiClient.callApi("/validate/mfa-compliance", "POST", {
    users: args.users,
    root_account: args.root_account,
    policies: args.policies,
  });

  const response = result as MfaComplianceResponse;

  const statusEmoji = response.status === "COMPLIANT" ? "✅" :
                      response.status === "AT_RISK" ? "⚠️" :
                      response.status === "REVIEW_REQUIRED" ? "🔍" : "❌";

  let output = `# MFA Compliance Report\n\n`;
  output += `**Status:** ${statusEmoji} ${response.status}\n`;
  output += `**Compliance Score:** ${response.compliance_score}/100\n\n`;

  output += "## Summary\n";
  output += `- Users checked: ${response.summary.users_checked}\n`;
  output += `- Policies checked: ${response.summary.policies_checked}\n`;
  output += `- Root account checked: ${response.summary.root_checked ? 'Yes' : 'No'}\n`;
  output += `- Total findings: ${response.summary.total_findings}\n`;
  if (response.summary.critical > 0) output += `- 🔴 Critical: ${response.summary.critical}\n`;
  if (response.summary.high > 0) output += `- 🟠 High: ${response.summary.high}\n`;
  if (response.summary.medium > 0) output += `- 🟡 Medium: ${response.summary.medium}\n`;
  output += "\n";

  if (response.findings.length > 0) {
    output += "## Findings\n\n";
    for (const finding of response.findings) {
      const emoji = finding.severity === "CRITICAL" ? "🔴" :
                    finding.severity === "HIGH" ? "🟠" : "🟡";
      output += `${emoji} **[${finding.rule_id}]** ${finding.finding}\n`;
      output += `   - Fix: ${finding.recommendation}\n`;
    }
    output += "\n";
  }

  if (response.recommendations.length > 0) {
    output += "## Recommendations\n\n";
    for (const rec of response.recommendations) {
      output += `### ${rec.title}\n`;
      output += `${rec.description}\n`;
      if (rec.actions) {
        output += "Steps:\n";
        rec.actions.forEach((a, i) => output += `${i + 1}. ${a}\n`);
      }
      output += "\n";
    }
  }

  return output;
}

export async function handleDynamoDbDesign(
  args: Record<string, unknown>,
  apiClient: ApiClient
): Promise<string> {
  const result = await apiClient.callApi("/generate/dynamodb-design", "POST", {
    entities: args.entities,
    access_patterns: args.access_patterns,
    options: args.options,
  });

  const response = result as DynamoDbDesignResponse;

  let output = `# DynamoDB Single-Table Design\n\n`;
  output += `**Table Name:** ${response.design.table_name}\n`;
  output += `**Entities:** ${response.summary.entities}\n`;
  output += `**Access Patterns:** ${response.summary.access_patterns}\n`;
  output += `**GSIs Required:** ${response.summary.gsis_required}\n\n`;

  output += "## Key Schema\n";
  output += "```json\n";
  output += JSON.stringify(response.design.key_schema, null, 2);
  output += "\n```\n\n";

  if (response.design.gsis && response.design.gsis.length > 0) {
    output += "## Global Secondary Indexes\n";
    for (const gsi of response.design.gsis) {
      output += `- **${gsi.name}**: PK=${JSON.stringify(gsi.partition_key)}`;
      if (gsi.sort_key) output += `, SK=${JSON.stringify(gsi.sort_key)}`;
      output += "\n";
    }
    output += "\n";
  }

  output += "## Entity Mappings\n";
  output += "```json\n";
  output += JSON.stringify(response.design.entity_mappings, null, 2);
  output += "\n```\n\n";

  output += "## Access Pattern Mappings\n";
  output += "```json\n";
  output += JSON.stringify(response.design.access_pattern_mappings, null, 2);
  output += "\n```\n\n";

  output += "## CloudFormation Template\n";
  output += "```json\n";
  output += JSON.stringify(response.cloudformation_template, null, 2);
  output += "\n```\n";

  return output;
}

export async function handleErrorPatterns(
  args: Record<string, unknown>,
  apiClient: ApiClient
): Promise<string> {
  const result = await apiClient.callApi("/analyze/error-patterns", "POST", {
    errors: args.errors,
    include_ai_analysis: args.include_ai_analysis ?? true,
  });

  const response = result as ErrorPatternsResponse;

  const trendEmoji = response.summary.trend === "increasing" ? "📈" :
                     response.summary.trend === "decreasing" ? "📉" : "➡️";

  let output = `# Error Pattern Analysis\n\n`;
  output += `**Total Errors:** ${response.summary.total_errors}\n`;
  output += `**Unique Patterns:** ${response.summary.unique_patterns}\n`;
  output += `**Trend:** ${trendEmoji} ${response.summary.trend} (${response.summary.trend_change_percent > 0 ? '+' : ''}${response.summary.trend_change_percent}%)\n`;
  output += `**Critical Issues:** ${response.summary.critical_count}\n`;
  output += `**High Issues:** ${response.summary.high_count}\n\n`;

  if (response.patterns.length > 0) {
    output += "## Error Patterns\n\n";
    for (const pattern of response.patterns.slice(0, 10)) {
      const emoji = pattern.severity === "HIGH" ? "🔴" :
                    pattern.severity === "MEDIUM" ? "🟠" : "🟡";
      output += `### ${emoji} ${pattern.type.toUpperCase()} (${pattern.count} errors, ${pattern.percentage}%)\n`;
      output += `**Category:** ${pattern.category}\n`;
      output += `**Common Causes:** ${pattern.common_causes.join(", ")}\n`;
      output += `**Remediation:** ${pattern.remediation.join("; ")}\n\n`;
    }
  }

  if (response.recommendations.length > 0) {
    output += "## Priority Actions\n\n";
    for (const rec of response.recommendations) {
      output += `${rec.priority}. **${rec.issue}** (${rec.category})\n`;
      if (rec.actions) {
        rec.actions.forEach(a => output += `   - ${a}\n`);
      }
    }
  }

  return output;
}

export async function handleDataLakeReadiness(
  args: Record<string, unknown>,
  apiClient: ApiClient
): Promise<string> {
  const result = await apiClient.callApi("/check/data-lake-readiness", "POST", {
    storage: args.storage,
    catalog: args.catalog,
    security: args.security,
    performance: args.performance,
    operations: args.operations,
  });

  const response = result as DataLakeReadinessResponse;

  const statusEmoji = response.status === "READY" ? "✅" :
                      response.status === "MOSTLY_READY" ? "🟢" :
                      response.status === "PARTIALLY_READY" ? "🟡" : "❌";

  let output = `# Data Lake Readiness Assessment\n\n`;
  output += `**Status:** ${statusEmoji} ${response.status}\n`;
  output += `**Overall Score:** ${response.overall_score}/100\n`;
  output += `**Production Ready:** ${response.summary.ready_for_production ? 'Yes' : 'No'}\n\n`;

  output += "## Summary\n";
  output += `- Categories evaluated: ${response.summary.categories_evaluated}\n`;
  output += `- Total checks: ${response.summary.total_checks}\n`;
  output += `- Passed: ${response.summary.passed}\n`;
  output += `- Failed: ${response.summary.failed}\n`;
  output += `- Warnings: ${response.summary.warnings}\n\n`;

  output += "## Category Scores\n\n";
  for (const [category, scores] of Object.entries(response.category_scores)) {
    const catEmoji = scores.score >= 80 ? "✅" : scores.score >= 60 ? "🟡" : "❌";
    output += `- ${catEmoji} **${category.toUpperCase()}:** ${scores.score}/100 (${scores.passed} passed, ${scores.failed} failed)\n`;
  }
  output += "\n";

  if (response.recommendations.length > 0) {
    output += "## Recommendations\n\n";
    for (const rec of response.recommendations) {
      output += `### P${rec.priority}: ${rec.title}\n`;
      for (const item of rec.items) {
        output += `- **${item.check}:** ${item.recommendation}\n`;
      }
      output += "\n";
    }
  }

  return output;
}

export async function handleIamPolicyValidate(
  args: Record<string, unknown>,
  apiClient: ApiClient
): Promise<string> {
  const result = await apiClient.callApi("/validate/iam-policy", "POST", {
    policy_document: args.policy_document,
    resource_type: args.resource_type || "general",
    suggest_improvements: args.suggest_improvements ?? true,
  });

  const response = result as IamPolicyResponse;

  // Build status emoji
  const statusEmoji = response.status === "PASS" ? "✅" :
                      response.status === "WARN" ? "⚠️" :
                      response.status === "FAIL" ? "❌" : "🔍";

  let output = `# IAM Policy Validation Report\n\n`;
  output += `**Status:** ${statusEmoji} ${response.status}\n`;
  output += `**Security Score:** ${response.score}/100\n\n`;

  output += "## Summary\n";
  output += `- Statements analyzed: ${response.summary.statements_analyzed}\n`;
  output += `- Total findings: ${response.summary.total_findings}\n`;
  if (response.summary.critical > 0) output += `- 🔴 Critical: ${response.summary.critical}\n`;
  if (response.summary.high > 0) output += `- 🟠 High: ${response.summary.high}\n`;
  if (response.summary.medium > 0) output += `- 🟡 Medium: ${response.summary.medium}\n`;
  if (response.summary.low > 0) output += `- 🟢 Low: ${response.summary.low}\n`;
  output += "\n";

  // Group findings by severity for display
  if (response.findings.length > 0) {
    output += "## Findings\n\n";

    const criticalFindings = response.findings.filter(f => f.severity === "CRITICAL");
    const highFindings = response.findings.filter(f => f.severity === "HIGH");
    const mediumFindings = response.findings.filter(f => f.severity === "MEDIUM");

    if (criticalFindings.length > 0) {
      output += "### 🔴 Critical\n";
      criticalFindings.forEach(f => {
        output += `- **[${f.code}]** ${f.message}\n`;
        if (f.action) output += `  - Action: \`${f.action}\`\n`;
        if (f.resource) output += `  - Resource: \`${f.resource}\`\n`;
        output += `  - Fix: ${f.recommendation}\n`;
      });
      output += "\n";
    }

    if (highFindings.length > 0) {
      output += "### 🟠 High\n";
      highFindings.forEach(f => {
        output += `- **[${f.code}]** ${f.message}\n`;
        if (f.action) output += `  - Action: \`${f.action}\`\n`;
        if (f.resource) output += `  - Resource: \`${f.resource}\`\n`;
        output += `  - Fix: ${f.recommendation}\n`;
      });
      output += "\n";
    }

    if (mediumFindings.length > 0) {
      output += "### 🟡 Medium\n";
      mediumFindings.forEach(f => {
        output += `- **[${f.code}]** ${f.message}\n`;
        if (f.action) output += `  - Action: \`${f.action}\`\n`;
        output += `  - Fix: ${f.recommendation}\n`;
      });
      output += "\n";
    }
  }

  // Suggestions
  if (response.suggestions.length > 0) {
    output += "## Recommendations\n\n";
    response.suggestions.forEach((s, i) => {
      output += `${i + 1}. **${s.title}**\n`;
      output += `   ${s.description}\n`;
      if (s.actions && s.actions.length > 0) {
        output += `   Actions: ${s.actions.slice(0, 5).map(a => `\`${a}\``).join(", ")}\n`;
      }
    });
    output += "\n";
  }

  // Scoped alternatives
  if (response.scoped_alternatives && Object.keys(response.scoped_alternatives).length > 0) {
    output += "## Scoped Alternatives\n\n";
    output += "Replace wildcard permissions with these scoped alternatives:\n\n";

    for (const [wildcard, alternatives] of Object.entries(response.scoped_alternatives)) {
      output += `### \`${wildcard}\`\n`;
      output += `- **Read-only:** ${alternatives.read.slice(0, 4).map(a => `\`${a}\``).join(", ")}\n`;
      output += `- **Write:** ${alternatives.write.slice(0, 4).map(a => `\`${a}\``).join(", ")}\n`;
      output += `- **Admin:** ${alternatives.admin.slice(0, 3).map(a => `\`${a}\``).join(", ")}\n`;
      output += "\n";
    }
  }

  output += `---\n*Processed in ${response.metadata.processing_time_ms}ms | Policy version: ${response.metadata.policy_version}*\n`;

  return output;
}

// ============================================================================
// Footer constants for new accelerator tools
// ============================================================================

const FOOTER_RISK = `\n\n---\n*Powered by S2T Consulting | 55 Battle-Tested Accelerators*\n*Full implementation: Agent Governance Kit (ACC-ACI-002) -- $5,000 | [Browse all](https://www.s2tconsulting.com/accelerators) | [Book a call](https://calendly.com/shaun-s2t)*\n`;
const FOOTER_ROUTING = `\n\n---\n*Powered by S2T Consulting | 55 Battle-Tested Accelerators*\n*Full implementation: Agent Coordination Suite (ACC-ACI-004) -- $7,500 | [Browse all](https://www.s2tconsulting.com/accelerators) | [Book a call](https://calendly.com/shaun-s2t)*\n`;
const FOOTER_PREDICT = `\n\n---\n*Powered by S2T Consulting | 55 Battle-Tested Accelerators*\n*Full implementation: Agent Resilience Engine (ACC-ACI-003) -- $3,500 | [Browse all](https://www.s2tconsulting.com/accelerators) | [Book a call](https://calendly.com/shaun-s2t)*\n`;
const FOOTER_RECOVERY = `\n\n---\n*Powered by S2T Consulting | 55 Battle-Tested Accelerators*\n*Full implementation: Agent Resilience Engine (ACC-ACI-003) -- $3,500 | [Browse all](https://www.s2tconsulting.com/accelerators) | [Book a call](https://calendly.com/shaun-s2t)*\n`;
const FOOTER_RESILIENCE = `\n\n---\n*Powered by S2T Consulting | 55 Battle-Tested Accelerators*\n*Full implementation: Agent Resilience Engine (ACC-ACI-003) -- $3,500 | [Browse all](https://www.s2tconsulting.com/accelerators) | [Book a call](https://calendly.com/shaun-s2t)*\n`;
const FOOTER_MEMORY = `\n\n---\n*Powered by S2T Consulting | 55 Battle-Tested Accelerators*\n*Full implementation: Agent Coordination Suite (ACC-ACI-004) -- $7,500 | [Browse all](https://www.s2tconsulting.com/accelerators) | [Book a call](https://calendly.com/shaun-s2t)*\n`;
const FOOTER_TASK = `\n\n---\n*Powered by S2T Consulting | 55 Battle-Tested Accelerators*\n*Full implementation: Agent Coordination Suite (ACC-ACI-004) -- $7,500 | [Browse all](https://www.s2tconsulting.com/accelerators) | [Book a call](https://calendly.com/shaun-s2t)*\n`;
const FOOTER_TRACE = `\n\n---\n*Powered by S2T Consulting | 55 Battle-Tested Accelerators*\n*Full implementation: Agent Coordination Suite (ACC-ACI-004) -- $7,500 | [Browse all](https://www.s2tconsulting.com/accelerators) | [Book a call](https://calendly.com/shaun-s2t)*\n`;
const FOOTER_LOCK = `\n\n---\n*Powered by S2T Consulting | 55 Battle-Tested Accelerators*\n*Full implementation: Agent Coordination Suite (ACC-ACI-004) -- $7,500 | [Browse all](https://www.s2tconsulting.com/accelerators) | [Book a call](https://calendly.com/shaun-s2t)*\n`;
const FOOTER_CLI = `\n\n---\n*Powered by S2T Consulting | 55 Battle-Tested Accelerators*\n*Full implementation: Agent Governance Kit (ACC-ACI-002) -- $5,000 | [Browse all](https://www.s2tconsulting.com/accelerators) | [Book a call](https://calendly.com/shaun-s2t)*\n`;

// ============================================================================
// Tool 1: Risk Classification
// ============================================================================

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
  metadata: { processing_time_ms: number; model_version: string };
}

export async function handleRiskClassify(
  args: Record<string, unknown>,
  apiClient: ApiClient
): Promise<string> {
  // Validate required parameters
  if (!args.action || typeof args.action !== "string") {
    throw new Error("Required parameter 'action' must be a non-empty string");
  }

  const result = await apiClient.callApi("/accelerators/risk/classify", "POST", {
    action: args.action,
    environment: args.environment || "local",
    context: args.context || "development",
  });

  const response = result as RiskClassificationResponse;

  const riskEmoji = response.risk_level === "LOW" ? "🟢" :
                    response.risk_level === "MEDIUM" ? "🟡" :
                    response.risk_level === "HIGH" ? "🟠" : "🔴";

  let output = `# Action Risk Classification\n\n`;
  output += `**Risk Level:** ${riskEmoji} ${response.risk_level}\n`;
  output += `**Score:** ${response.score}/100\n`;
  output += `**Auto-Approve:** ${response.auto_approve ? "Yes" : "No"}\n\n`;

  if (response.factors.length > 0) {
    output += "## Risk Factors\n\n";
    output += "| Factor | Value | Weight | Contribution |\n";
    output += "|--------|-------|--------|--------------|\n";
    for (const factor of response.factors) {
      output += `| ${factor.name} | ${factor.value} | ${factor.weight} | ${factor.contribution} |\n`;
    }
    output += "\n";
  }

  output += "## Recommendation\n\n";
  output += `${response.recommendation}\n`;

  output += `\n---\n*Processed in ${response.metadata.processing_time_ms}ms | Model: ${response.metadata.model_version}*\n`;

  output += FOOTER_RISK;
  return output;
}

// ============================================================================
// Tool 2: Task Routing
// ============================================================================

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
  metadata: { agents_evaluated: number; processing_time_ms: number };
}

export async function handleTaskRouting(
  args: Record<string, unknown>,
  apiClient: ApiClient
): Promise<string> {
  // Validate required parameters
  if (!args.task_description || typeof args.task_description !== "string") {
    throw new Error("Required parameter 'task_description' must be a non-empty string");
  }

  const result = await apiClient.callApi("/accelerators/agent/route", "POST", {
    task_description: args.task_description,
    top_k: args.top_k || 5,
    include_capabilities: args.include_capabilities ?? true,
  });

  const response = result as TaskRoutingResponse;

  const confidenceEmoji = response.confidence >= 0.8 ? "🟢" :
                          response.confidence >= 0.5 ? "🟡" : "🔴";

  let output = `# Task Routing Result\n\n`;
  output += `**Best Match:** ${response.best_match.name} (${Math.round(response.best_match.similarity_score * 100)}%)\n`;
  output += `**Agent ID:** \`${response.best_match.agent_id}\`\n`;
  output += `**Domain:** ${response.best_match.domain}\n`;
  output += `**Confidence:** ${confidenceEmoji} ${Math.round(response.confidence * 100)}%\n`;
  output += `**Routing Method:** ${response.routing_method}\n\n`;

  if (response.best_match.capabilities.length > 0) {
    output += "## Best Match Capabilities\n\n";
    response.best_match.capabilities.forEach(cap => {
      output += `- ${cap}\n`;
    });
    output += "\n";
  }

  if (response.candidates.length > 1) {
    output += "## All Candidates\n\n";
    output += "| Rank | Agent | Domain | Similarity |\n";
    output += "|------|-------|--------|------------|\n";
    response.candidates.forEach((candidate, i) => {
      output += `| ${i + 1} | ${candidate.name} | ${candidate.domain} | ${Math.round(candidate.similarity_score * 100)}% |\n`;
    });
    output += "\n";
  }

  output += `---\n*Evaluated ${response.metadata.agents_evaluated} agents in ${response.metadata.processing_time_ms}ms*\n`;

  output += FOOTER_ROUTING;
  return output;
}

// ============================================================================
// Tool 3: System Issue Prediction
// ============================================================================

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
  summary: { total_predictions: number; critical: number; high: number; medium: number; low: number };
  metadata: { analysis_window_days: number; processing_time_ms: number };
}

export async function handlePredictIssues(
  args: Record<string, unknown>,
  apiClient: ApiClient
): Promise<string> {
  const result = await apiClient.callApi("/accelerators/predict/issues", "POST", {
    system_state: args.system_state,
    analysis_window_days: args.analysis_window_days || 30,
  });

  const response = result as SystemPredictionResponse;

  const healthEmoji = response.health_score >= 80 ? "🟢" :
                      response.health_score >= 60 ? "🟡" :
                      response.health_score >= 40 ? "🟠" : "🔴";

  let output = `# System Issue Predictions\n\n`;
  output += `**Health Score:** ${healthEmoji} ${response.health_score}/100\n`;
  output += `**Analysis Window:** ${response.metadata.analysis_window_days} days\n`;
  output += `**Total Predictions:** ${response.summary.total_predictions}\n\n`;

  output += "## Summary\n";
  if (response.summary.critical > 0) output += `- 🔴 Critical: ${response.summary.critical}\n`;
  if (response.summary.high > 0) output += `- 🟠 High: ${response.summary.high}\n`;
  if (response.summary.medium > 0) output += `- 🟡 Medium: ${response.summary.medium}\n`;
  if (response.summary.low > 0) output += `- 🟢 Low: ${response.summary.low}\n`;
  output += "\n";

  if (response.issues.length > 0) {
    output += "## Predicted Issues\n\n";
    for (const issue of response.issues) {
      const sevEmoji = issue.severity === "CRITICAL" ? "🔴" :
                       issue.severity === "HIGH" ? "🟠" :
                       issue.severity === "MEDIUM" ? "🟡" : "🟢";
      output += `### ${sevEmoji} ${issue.category}\n`;
      output += `- **Severity:** ${issue.severity}\n`;
      output += `- **Description:** ${issue.description}\n`;
      output += `- **Predicted Date:** ${issue.predicted_date}\n`;
      output += `- **Confidence:** ${Math.round(issue.confidence * 100)}%\n`;
      output += `- **Recommended Action:** ${issue.recommended_action}\n\n`;
    }
  }

  output += `---\n*Processed in ${response.metadata.processing_time_ms}ms*\n`;

  output += FOOTER_PREDICT;
  return output;
}

// ============================================================================
// Tool 4: Auto-Recovery
// ============================================================================

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
  metadata: { patterns_checked: number; processing_time_ms: number };
}

export async function handleAutoRecovery(
  args: Record<string, unknown>,
  apiClient: ApiClient
): Promise<string> {
  // Validate required parameters
  if (!args.error_message || typeof args.error_message !== "string") {
    throw new Error("Required parameter 'error_message' must be a non-empty string");
  }

  const result = await apiClient.callApi("/accelerators/recovery/attempt", "POST", {
    error_message: args.error_message,
    error_source: args.error_source,
    stack_trace: args.stack_trace,
    auto_execute: args.auto_execute ?? false,
  });

  const response = result as RecoveryResponse;

  const matchEmoji = response.matched ? "✅" : "❌";
  const confidenceEmoji = response.confidence >= 0.8 ? "🟢" :
                          response.confidence >= 0.5 ? "🟡" : "🔴";

  let output = `# Auto-Recovery Analysis\n\n`;
  output += `**Match:** ${matchEmoji} ${response.matched ? "Pattern Found" : "No Match"}\n`;
  output += `**Error Type:** ${response.error_type}\n`;
  output += `**Confidence:** ${confidenceEmoji} ${Math.round(response.confidence * 100)}%\n`;
  output += `**Historical Success Rate:** ${Math.round(response.historical_success_rate * 100)}%\n`;
  if (response.pattern_id) {
    output += `**Pattern ID:** \`${response.pattern_id}\`\n`;
  }
  output += "\n";

  if (response.recovery_steps.length > 0) {
    output += "## Recovery Steps\n\n";
    for (const step of response.recovery_steps) {
      output += `### Step ${step.step}: ${step.action}\n`;
      if (step.command) {
        output += `\`\`\`bash\n${step.command}\n\`\`\`\n`;
      }
      output += `**Expected Outcome:** ${step.expected_outcome}\n\n`;
    }
  }

  output += `---\n*Checked ${response.metadata.patterns_checked} patterns in ${response.metadata.processing_time_ms}ms*\n`;

  output += FOOTER_RECOVERY;
  return output;
}

// ============================================================================
// Tool 5: Resilience Execution
// ============================================================================

export interface ResilienceResult {
  success: boolean;
  attempts: number;
  total_latency_ms: number;
  circuit_breaker_state: "closed" | "open" | "half-open";
  last_error: string | null;
  metadata: { retry_config: { max_retries: number; base_delay_ms: number; max_delay_ms: number } };
}

export async function handleResilienceExecute(
  args: Record<string, unknown>,
  apiClient: ApiClient
): Promise<string> {
  // Validate required parameters
  if (!args.operation_id || typeof args.operation_id !== "string") {
    throw new Error("Required parameter 'operation_id' must be a non-empty string");
  }

  const result = await apiClient.callApi("/accelerators/resilience/execute", "POST", {
    operation_id: args.operation_id,
    max_retries: args.max_retries || 3,
    base_delay_ms: args.base_delay_ms || 1000,
    circuit_breaker_threshold: args.circuit_breaker_threshold || 5,
  });

  const response = result as ResilienceResult;

  const statusEmoji = response.success ? "✅" : "❌";
  const cbEmoji = response.circuit_breaker_state === "closed" ? "🟢" :
                  response.circuit_breaker_state === "half-open" ? "🟡" : "🔴";

  let output = `# Resilience Execution Report\n\n`;
  output += `**Status:** ${statusEmoji} ${response.success ? "SUCCESS" : "FAILED"}\n`;
  output += `**Attempts:** ${response.attempts}\n`;
  output += `**Total Latency:** ${response.total_latency_ms}ms\n`;
  output += `**Circuit Breaker:** ${cbEmoji} ${response.circuit_breaker_state}\n`;
  if (response.last_error) {
    output += `**Last Error:** ${response.last_error}\n`;
  }
  output += "\n";

  output += "## Retry Configuration\n\n";
  output += `- Max retries: ${response.metadata.retry_config.max_retries}\n`;
  output += `- Base delay: ${response.metadata.retry_config.base_delay_ms}ms\n`;
  output += `- Max delay: ${response.metadata.retry_config.max_delay_ms}ms\n`;

  output += FOOTER_RESILIENCE;
  return output;
}

// ============================================================================
// Tool 6: Agent Memory
// ============================================================================

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
  metadata: { storage_used_bytes: number; processing_time_ms: number };
}

export async function handleAgentMemory(
  args: Record<string, unknown>,
  apiClient: ApiClient
): Promise<string> {
  // Validate required parameters
  if (!args.operation || typeof args.operation !== "string") {
    throw new Error("Required parameter 'operation' must be a non-empty string");
  }
  if (!args.agent_id || typeof args.agent_id !== "string") {
    throw new Error("Required parameter 'agent_id' must be a non-empty string");
  }

  const result = await apiClient.callApi("/accelerators/agent/memory", "POST", {
    operation: args.operation,
    agent_id: args.agent_id,
    key: args.key,
    value: args.value,
    namespace: args.namespace || "default",
    search_query: args.search_query,
  });

  const response = result as AgentMemoryResponse;

  const statusEmoji = response.success ? "✅" : "❌";
  const opEmoji = response.operation === "store" ? "💾" :
                  response.operation === "retrieve" ? "📖" :
                  response.operation === "search" ? "🔍" : "🗑️";

  let output = `# Agent Memory Operation\n\n`;
  output += `**Operation:** ${opEmoji} ${response.operation}\n`;
  output += `**Status:** ${statusEmoji} ${response.success ? "Success" : "Failed"}\n`;
  output += `**Namespace:** ${response.namespace}\n`;
  output += `**Total Entries:** ${response.total_entries}\n`;
  output += `**Storage Used:** ${response.metadata.storage_used_bytes} bytes\n\n`;

  if (response.entries.length > 0) {
    output += "## Entries\n\n";
    for (const entry of response.entries) {
      output += `### \`${entry.key}\`\n`;
      output += `- **Namespace:** ${entry.namespace}\n`;
      output += `- **Created:** ${entry.created_at}\n`;
      output += `- **Updated:** ${entry.updated_at}\n`;
      if (entry.ttl) output += `- **TTL:** ${entry.ttl}s\n`;
      output += `- **Value:**\n\`\`\`json\n${JSON.stringify(entry.value, null, 2)}\n\`\`\`\n\n`;
    }
  }

  output += `---\n*Processed in ${response.metadata.processing_time_ms}ms*\n`;

  output += FOOTER_MEMORY;
  return output;
}

// ============================================================================
// Tool 7: Agent Task Submission
// ============================================================================

export interface TaskSubmissionResponse {
  task_id: string;
  agent_id: string;
  status: "queued" | "rejected";
  queue_position: number;
  estimated_wait_ms: number;
  metadata: { queue_depth: number; processing_time_ms: number };
}

export async function handleAgentTask(
  args: Record<string, unknown>,
  apiClient: ApiClient
): Promise<string> {
  // Validate required parameters
  if (!args.agent_id || typeof args.agent_id !== "string") {
    throw new Error("Required parameter 'agent_id' must be a non-empty string");
  }
  if (!args.prompt || typeof args.prompt !== "string") {
    throw new Error("Required parameter 'prompt' must be a non-empty string");
  }

  const result = await apiClient.callApi("/accelerators/agent/task", "POST", {
    agent_id: args.agent_id,
    prompt: args.prompt,
    priority: args.priority || "normal",
    trace_id: args.trace_id,
  });

  const response = result as TaskSubmissionResponse;

  const statusEmoji = response.status === "queued" ? "✅" : "❌";

  let output = `# Agent Task Submission\n\n`;
  output += `**Task ID:** \`${response.task_id}\`\n`;
  output += `**Agent ID:** \`${response.agent_id}\`\n`;
  output += `**Status:** ${statusEmoji} ${response.status.toUpperCase()}\n`;
  output += `**Queue Position:** ${response.queue_position}\n`;
  output += `**Estimated Wait:** ${response.estimated_wait_ms}ms\n`;
  output += `**Queue Depth:** ${response.metadata.queue_depth}\n\n`;

  if (response.status === "queued") {
    output += "> Task has been queued for execution. Use the task ID to check status.\n";
  } else {
    output += "> Task was rejected. Check agent availability and try again.\n";
  }

  output += `\n---\n*Processed in ${response.metadata.processing_time_ms}ms*\n`;

  output += FOOTER_TASK;
  return output;
}

// ============================================================================
// Tool 8: Trace Context
// ============================================================================

export interface TraceContextResponse {
  traceparent: string;
  trace_id: string;
  span_id: string;
  version: string;
  created_at: string;
  metadata: { format: string };
}

export async function handleTraceContext(
  args: Record<string, unknown>,
  apiClient: ApiClient
): Promise<string> {
  const result = await apiClient.callApi("/accelerators/trace/create", "POST", {
    parent_traceparent: args.parent_traceparent,
    service_name: args.service_name || "s2t-agent",
  });

  const response = result as TraceContextResponse;

  let output = `# Trace Context Created\n\n`;
  output += `**Traceparent:** \`${response.traceparent}\`\n`;
  output += `**Trace ID:** \`${response.trace_id}\`\n`;
  output += `**Span ID:** \`${response.span_id}\`\n`;
  output += `**Version:** ${response.version}\n`;
  output += `**Created At:** ${response.created_at}\n`;
  output += `**Format:** ${response.metadata.format}\n\n`;

  output += "## Usage\n\n";
  output += "Pass the `traceparent` header in downstream requests for distributed tracing:\n\n";
  output += "```\ntraceparent: " + response.traceparent + "\n```\n";

  output += FOOTER_TRACE;
  return output;
}

// ============================================================================
// Tool 9: File Lock
// ============================================================================

export interface FileLockResponse {
  acquired: boolean;
  lock_token: string | null;
  file_path: string;
  holder?: string;
  stale_cleaned: boolean;
  metadata: { wait_time_ms: number; processing_time_ms: number };
}

export async function handleFileLock(
  args: Record<string, unknown>,
  apiClient: ApiClient
): Promise<string> {
  // Validate required parameters
  if (!args.file_path || typeof args.file_path !== "string") {
    throw new Error("Required parameter 'file_path' must be a non-empty string");
  }

  const result = await apiClient.callApi("/accelerators/lock/acquire", "POST", {
    file_path: args.file_path,
    operation: args.operation || "acquire",
    lock_token: args.lock_token,
    timeout_ms: args.timeout_ms || 5000,
  });

  const response = result as FileLockResponse;

  const statusEmoji = response.acquired ? "🔒" : "🚫";

  let output = `# File Lock Operation\n\n`;
  output += `**Status:** ${statusEmoji} ${response.acquired ? "ACQUIRED" : "BLOCKED"}\n`;
  output += `**File:** \`${response.file_path}\`\n`;
  if (response.lock_token) {
    output += `**Lock Token:** \`${response.lock_token}\`\n`;
  }
  if (response.holder) {
    output += `**Current Holder:** ${response.holder}\n`;
  }
  output += `**Stale Locks Cleaned:** ${response.stale_cleaned ? "Yes" : "No"}\n`;
  output += `**Wait Time:** ${response.metadata.wait_time_ms}ms\n\n`;

  if (response.acquired) {
    output += "> Lock acquired successfully. Remember to release the lock when done using the lock token.\n";
  } else {
    output += "> Lock could not be acquired. The file is currently locked by another process.\n";
  }

  output += `\n---\n*Processed in ${response.metadata.processing_time_ms}ms*\n`;

  output += FOOTER_LOCK;
  return output;
}

// ============================================================================
// Tool 10: CLI Readiness Validation
// ============================================================================

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
  metadata: { total_checks: number; processing_time_ms: number };
}

export async function handleCliReadiness(
  args: Record<string, unknown>,
  apiClient: ApiClient
): Promise<string> {
  const result = await apiClient.callApi("/accelerators/cli/validate", "POST", {
    cli_tools: args.cli_tools || ["codex"],
    validate_api_keys: args.validate_api_keys ?? true,
  });

  const response = result as CliReadinessResponse;

  const statusEmoji = response.ready ? "✅" : "❌";

  let output = `# CLI Readiness Validation\n\n`;
  output += `**Status:** ${statusEmoji} ${response.ready ? "READY" : "NOT READY"}\n`;
  output += `**Total Checks:** ${response.metadata.total_checks}\n`;
  if (response.degradation_mode) {
    output += `**Degradation Mode:** ⚠️ ${response.degradation_mode}\n`;
  }
  output += "\n";

  if (response.checks.length > 0) {
    output += "## Check Results\n\n";
    output += "| Check | Status | Message | Version |\n";
    output += "|-------|--------|---------|----------|\n";
    for (const check of response.checks) {
      const checkEmoji = check.status === "pass" ? "✅" :
                         check.status === "warn" ? "⚠️" : "❌";
      output += `| ${check.name} | ${checkEmoji} ${check.status.toUpperCase()} | ${check.message} | ${check.version || "-"} |\n`;
    }
    output += "\n";
  }

  if (response.recommendations.length > 0) {
    output += "## Recommendations\n\n";
    response.recommendations.forEach((rec, i) => {
      output += `${i + 1}. ${rec}\n`;
    });
    output += "\n";
  }

  output += `---\n*Processed in ${response.metadata.processing_time_ms}ms*\n`;

  output += FOOTER_CLI;
  return output;
}
