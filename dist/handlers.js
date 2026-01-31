/**
 * S2T Accelerators - Tool Handlers
 * Extracted for testability
 */
// Handler implementations
export async function handleEmbed(args, apiClient) {
    const result = await apiClient.callApi("/embed", "POST", {
        text: args.text,
        model: args.model || "amazon.titan-embed-text-v2:0",
        chunk_size: args.chunk_size || 512,
        chunk_overlap: args.chunk_overlap || 50,
    });
    const response = result;
    return JSON.stringify({
        summary: `Generated ${response.summary.total_chunks} embedding(s) using ${response.summary.model}`,
        dimensions: response.summary.dimensions,
        chunks: response.chunks.map((c, i) => ({
            index: i,
            text_preview: c.text.substring(0, 100) + (c.text.length > 100 ? "..." : ""),
            word_count: c.metadata.word_count,
            has_embedding: true,
        })),
        usage: response.usage,
        note: "Full embeddings available in API response. Use for vector database indexing.",
    }, null, 2);
}
export async function handleCloudFormation(args, apiClient) {
    const result = await apiClient.callApi("/generate/cloudformation", "POST", {
        description: args.description,
        format: args.format || "sam",
        include_parameters: args.include_parameters ?? true,
        include_outputs: args.include_outputs ?? true,
    });
    const response = result;
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
export async function handleOAuthValidate(args, apiClient) {
    const result = await apiClient.callApi("/validate/oauth", "POST", {
        provider: args.provider,
        client_id: args.client_id,
        redirect_uris: args.redirect_uris,
        scopes: args.scopes,
        token_endpoint: args.token_endpoint,
        authorization_endpoint: args.authorization_endpoint,
    });
    const response = result;
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
export async function handleCatalog(apiClient) {
    const result = await apiClient.callApi("/catalog", "GET");
    const response = result;
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
export async function handleUsage(apiClient) {
    const result = await apiClient.callApi("/usage", "GET");
    const response = result;
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
