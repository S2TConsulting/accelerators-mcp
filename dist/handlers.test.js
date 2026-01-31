/**
 * S2T Accelerators MCP Server - Unit Tests
 *
 * Tests all 5 tool handlers with mocked API responses
 */
import { describe, it, expect, vi } from "vitest";
import { handleEmbed, handleCloudFormation, handleOAuthValidate, handleCatalog, handleUsage, } from "./handlers.js";
// Mock API client factory
function createMockApiClient(mockResponse) {
    return {
        callApi: vi.fn().mockResolvedValue(mockResponse),
    };
}
describe("handleEmbed", () => {
    const mockEmbedResponse = {
        chunks: [
            {
                text: "This is a test sentence for embedding generation.",
                metadata: { word_count: 8 },
            },
        ],
        summary: {
            total_chunks: 1,
            model: "amazon.titan-embed-text-v2:0",
            dimensions: 1024,
            processing_time_ms: 150,
        },
        usage: {
            tokens_used: 12,
            estimated_cost: 0.0001,
        },
    };
    it("should generate embeddings with default parameters", async () => {
        const mockClient = createMockApiClient(mockEmbedResponse);
        const result = await handleEmbed({ text: "Test text" }, mockClient);
        const parsed = JSON.parse(result);
        expect(mockClient.callApi).toHaveBeenCalledWith("/embed", "POST", {
            text: "Test text",
            model: "amazon.titan-embed-text-v2:0",
            chunk_size: 512,
            chunk_overlap: 50,
        });
        expect(parsed.summary).toBe("Generated 1 embedding(s) using amazon.titan-embed-text-v2:0");
        expect(parsed.dimensions).toBe(1024);
        expect(parsed.chunks).toHaveLength(1);
        expect(parsed.chunks[0].has_embedding).toBe(true);
        expect(parsed.usage.tokens_used).toBe(12);
    });
    it("should use custom model when specified", async () => {
        const mockClient = createMockApiClient(mockEmbedResponse);
        await handleEmbed({ text: "Test", model: "amazon.titan-embed-text-v1" }, mockClient);
        expect(mockClient.callApi).toHaveBeenCalledWith("/embed", "POST", {
            text: "Test",
            model: "amazon.titan-embed-text-v1",
            chunk_size: 512,
            chunk_overlap: 50,
        });
    });
    it("should use custom chunk settings when specified", async () => {
        const mockClient = createMockApiClient(mockEmbedResponse);
        await handleEmbed({ text: "Test", chunk_size: 256, chunk_overlap: 25 }, mockClient);
        expect(mockClient.callApi).toHaveBeenCalledWith("/embed", "POST", {
            text: "Test",
            model: "amazon.titan-embed-text-v2:0",
            chunk_size: 256,
            chunk_overlap: 25,
        });
    });
    it("should truncate long text previews", async () => {
        const longText = "A".repeat(150);
        const responseWithLongText = {
            ...mockEmbedResponse,
            chunks: [{ text: longText, metadata: { word_count: 1 } }],
        };
        const mockClient = createMockApiClient(responseWithLongText);
        const result = await handleEmbed({ text: longText }, mockClient);
        const parsed = JSON.parse(result);
        expect(parsed.chunks[0].text_preview).toHaveLength(103); // 100 + "..."
        expect(parsed.chunks[0].text_preview.endsWith("...")).toBe(true);
    });
    it("should handle multiple chunks", async () => {
        const multiChunkResponse = {
            ...mockEmbedResponse,
            chunks: [
                { text: "Chunk 1", metadata: { word_count: 2 } },
                { text: "Chunk 2", metadata: { word_count: 2 } },
                { text: "Chunk 3", metadata: { word_count: 2 } },
            ],
            summary: { ...mockEmbedResponse.summary, total_chunks: 3 },
        };
        const mockClient = createMockApiClient(multiChunkResponse);
        const result = await handleEmbed({ text: "Long text" }, mockClient);
        const parsed = JSON.parse(result);
        expect(parsed.chunks).toHaveLength(3);
        expect(parsed.chunks[0].index).toBe(0);
        expect(parsed.chunks[1].index).toBe(1);
        expect(parsed.chunks[2].index).toBe(2);
    });
});
describe("handleCloudFormation", () => {
    const mockCfnResponse = {
        template: `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyFunction:
    Type: AWS::Lambda::Function`,
        metadata: {
            format: "sam",
            resource_count: 1,
            resources: [{ logical_id: "MyFunction", type: "AWS::Lambda::Function" }],
        },
        warnings: [],
        usage: { estimated_cost: 0.01 },
    };
    it("should generate CloudFormation template with default parameters", async () => {
        const mockClient = createMockApiClient(mockCfnResponse);
        const result = await handleCloudFormation({ description: "A Lambda function" }, mockClient);
        expect(mockClient.callApi).toHaveBeenCalledWith("/generate/cloudformation", "POST", {
            description: "A Lambda function",
            format: "sam",
            include_parameters: true,
            include_outputs: true,
        });
        expect(result).toContain("# Generated SAM Template");
        expect(result).toContain("Resources created: 1");
        expect(result).toContain("MyFunction (AWS::Lambda::Function)");
        expect(result).toContain("```yaml");
    });
    it("should use cloudformation format when specified", async () => {
        const mockClient = createMockApiClient(mockCfnResponse);
        await handleCloudFormation({ description: "Test", format: "cloudformation" }, mockClient);
        expect(mockClient.callApi).toHaveBeenCalledWith("/generate/cloudformation", "POST", expect.objectContaining({ format: "cloudformation" }));
    });
    it("should exclude parameters when specified", async () => {
        const mockClient = createMockApiClient(mockCfnResponse);
        await handleCloudFormation({ description: "Test", include_parameters: false }, mockClient);
        expect(mockClient.callApi).toHaveBeenCalledWith("/generate/cloudformation", "POST", expect.objectContaining({ include_parameters: false }));
    });
    it("should include warnings when present", async () => {
        const responseWithWarnings = {
            ...mockCfnResponse,
            warnings: [
                {
                    code: "DEPRECATED_RUNTIME",
                    message: "nodejs12.x is deprecated",
                    recommendation: "Use nodejs18.x or nodejs20.x",
                },
            ],
        };
        const mockClient = createMockApiClient(responseWithWarnings);
        const result = await handleCloudFormation({ description: "Test" }, mockClient);
        expect(result).toContain("## Warnings");
        expect(result).toContain("nodejs12.x is deprecated");
        expect(result).toContain("Use nodejs18.x or nodejs20.x");
    });
    it("should handle multiple resources", async () => {
        const multiResourceResponse = {
            ...mockCfnResponse,
            metadata: {
                format: "sam",
                resource_count: 3,
                resources: [
                    { logical_id: "MyFunction", type: "AWS::Lambda::Function" },
                    { logical_id: "MyTable", type: "AWS::DynamoDB::Table" },
                    { logical_id: "MyBucket", type: "AWS::S3::Bucket" },
                ],
            },
        };
        const mockClient = createMockApiClient(multiResourceResponse);
        const result = await handleCloudFormation({ description: "Test" }, mockClient);
        expect(result).toContain("Resources created: 3");
        expect(result).toContain("MyFunction (AWS::Lambda::Function)");
        expect(result).toContain("MyTable (AWS::DynamoDB::Table)");
        expect(result).toContain("MyBucket (AWS::S3::Bucket)");
    });
});
describe("handleOAuthValidate", () => {
    const mockOAuthResponse = {
        valid: true,
        provider: "Google",
        configuration: {
            authorization_endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
            token_endpoint: "https://oauth2.googleapis.com/token",
        },
        validation: {
            errors: [],
            warnings: [],
        },
        recommendations: [],
    };
    it("should validate OAuth configuration", async () => {
        const mockClient = createMockApiClient(mockOAuthResponse);
        const result = await handleOAuthValidate({
            provider: "google",
            client_id: "123.apps.googleusercontent.com",
            redirect_uris: ["https://example.com/callback"],
            scopes: ["openid", "email"],
        }, mockClient);
        expect(mockClient.callApi).toHaveBeenCalledWith("/validate/oauth", "POST", {
            provider: "google",
            client_id: "123.apps.googleusercontent.com",
            redirect_uris: ["https://example.com/callback"],
            scopes: ["openid", "email"],
            token_endpoint: undefined,
            authorization_endpoint: undefined,
        });
        expect(result).toContain("# OAuth Configuration Validation: Google");
        expect(result).toContain("**Status:** VALID");
        expect(result).toContain("## Endpoints");
    });
    it("should show errors when validation fails", async () => {
        const invalidResponse = {
            ...mockOAuthResponse,
            valid: false,
            validation: {
                errors: [
                    {
                        code: "INVALID_CLIENT_ID",
                        message: "Client ID format is invalid",
                    },
                ],
                warnings: [],
            },
        };
        const mockClient = createMockApiClient(invalidResponse);
        const result = await handleOAuthValidate({
            provider: "google",
            client_id: "invalid",
            redirect_uris: ["https://example.com/callback"],
            scopes: ["openid"],
        }, mockClient);
        expect(result).toContain("**Status:** INVALID");
        expect(result).toContain("## Errors");
        expect(result).toContain("[INVALID_CLIENT_ID] Client ID format is invalid");
    });
    it("should show warnings", async () => {
        const responseWithWarnings = {
            ...mockOAuthResponse,
            validation: {
                errors: [],
                warnings: [
                    {
                        code: "LOCALHOST_ONLY",
                        message: "Only localhost redirect URI configured",
                    },
                ],
            },
        };
        const mockClient = createMockApiClient(responseWithWarnings);
        const result = await handleOAuthValidate({
            provider: "google",
            client_id: "123.apps.googleusercontent.com",
            redirect_uris: ["http://localhost:3000/callback"],
            scopes: ["openid"],
        }, mockClient);
        expect(result).toContain("## Warnings");
        expect(result).toContain("[LOCALHOST_ONLY]");
    });
    it("should show recommendations", async () => {
        const responseWithRecommendations = {
            ...mockOAuthResponse,
            recommendations: [
                {
                    field: "scopes",
                    value: "profile",
                    reason: "Add profile scope for user name access",
                },
            ],
        };
        const mockClient = createMockApiClient(responseWithRecommendations);
        const result = await handleOAuthValidate({
            provider: "google",
            client_id: "123.apps.googleusercontent.com",
            redirect_uris: ["https://example.com/callback"],
            scopes: ["openid"],
        }, mockClient);
        expect(result).toContain("## Recommendations");
        expect(result).toContain("**scopes:** `profile`");
        expect(result).toContain("Add profile scope for user name access");
    });
    it("should pass custom endpoints for generic provider", async () => {
        const mockClient = createMockApiClient(mockOAuthResponse);
        await handleOAuthValidate({
            provider: "generic",
            client_id: "my-client",
            redirect_uris: ["https://example.com/callback"],
            scopes: ["read", "write"],
            token_endpoint: "https://custom.auth/token",
            authorization_endpoint: "https://custom.auth/authorize",
        }, mockClient);
        expect(mockClient.callApi).toHaveBeenCalledWith("/validate/oauth", "POST", {
            provider: "generic",
            client_id: "my-client",
            redirect_uris: ["https://example.com/callback"],
            scopes: ["read", "write"],
            token_endpoint: "https://custom.auth/token",
            authorization_endpoint: "https://custom.auth/authorize",
        });
    });
});
describe("handleCatalog", () => {
    const mockCatalogResponse = {
        accelerators: [
            {
                id: "ACC-AI-001",
                name: "Vector Embeddings",
                endpoint: "/embed",
                description: "Generate vector embeddings",
                tier_access: ["free", "developer", "business", "enterprise"],
            },
            {
                id: "ACC-AWS-001",
                name: "CloudFormation Generator",
                endpoint: "/generate/cloudformation",
                description: "Generate CloudFormation templates",
                tier_access: ["developer", "business", "enterprise"],
            },
        ],
        tiers: {
            free: {
                name: "Free",
                price: 0,
                limits: { requestsPerMinute: 10, requestsPerMonth: 100 },
            },
            developer: {
                name: "Developer",
                price: 29,
                limits: { requestsPerMinute: 60, requestsPerMonth: 5000 },
            },
        },
        your_tier: "developer",
    };
    it("should return catalog with accelerators and tiers", async () => {
        const mockClient = createMockApiClient(mockCatalogResponse);
        const result = await handleCatalog(mockClient);
        expect(mockClient.callApi).toHaveBeenCalledWith("/catalog", "GET");
        expect(result).toContain("# S2T Accelerator Catalog");
        expect(result).toContain("**Your Tier:** developer");
        expect(result).toContain("## Available Accelerators");
        expect(result).toContain("### Vector Embeddings (ACC-AI-001)");
        expect(result).toContain("- Endpoint: `/embed`");
        expect(result).toContain("- Available in: free, developer, business, enterprise");
        expect(result).toContain("## Pricing Tiers");
        expect(result).toContain("**Free:** $0/mo - 10 req/min, 100/mo");
        expect(result).toContain("**Developer:** $29/mo - 60 req/min, 5000/mo");
    });
    it("should handle unlimited monthly requests", async () => {
        const unlimitedResponse = {
            ...mockCatalogResponse,
            tiers: {
                enterprise: {
                    name: "Enterprise",
                    price: 299,
                    limits: { requestsPerMinute: 1000, requestsPerMonth: null },
                },
            },
        };
        const mockClient = createMockApiClient(unlimitedResponse);
        const result = await handleCatalog(mockClient);
        expect(result).toContain("**Enterprise:** $299/mo - 1000 req/min, unlimited/mo");
    });
});
describe("handleUsage", () => {
    const mockUsageResponse = {
        tier: "developer",
        email: "test@example.com",
        period: "2026-01",
        usage: {
            requests: 150,
            last_request: "2026-01-24T10:30:00Z",
        },
        limits: {
            requests_per_minute: 60,
            requests_per_month: 5000,
        },
        remaining: {
            requests_this_month: 4850,
        },
        billing: {
            tier_price: 29,
            usage_charges: 0.5,
            period_total: 29.5,
        },
    };
    it("should return usage statistics", async () => {
        const mockClient = createMockApiClient(mockUsageResponse);
        const result = await handleUsage(mockClient);
        expect(mockClient.callApi).toHaveBeenCalledWith("/usage", "GET");
        expect(result).toContain("# S2T API Usage");
        expect(result).toContain("**Account:** test@example.com");
        expect(result).toContain("**Tier:** developer");
        expect(result).toContain("**Period:** 2026-01");
        expect(result).toContain("## Usage");
        expect(result).toContain("- Requests this month: 150");
        expect(result).toContain("- Remaining: 4850");
        expect(result).toContain("- Rate limit: 60/min");
        expect(result).toContain("- Monthly limit: 5000");
        expect(result).toContain("## Billing");
        expect(result).toContain("- Tier price: $29");
        expect(result).toContain("- Usage charges: $0.5");
        expect(result).toContain("- Period total: $29.5");
    });
    it("should handle zero usage", async () => {
        const zeroUsageResponse = {
            ...mockUsageResponse,
            usage: { requests: 0, last_request: null },
            remaining: { requests_this_month: 5000 },
            billing: { tier_price: 29, usage_charges: 0, period_total: 29 },
        };
        const mockClient = createMockApiClient(zeroUsageResponse);
        const result = await handleUsage(mockClient);
        expect(result).toContain("- Requests this month: 0");
        expect(result).toContain("- Remaining: 5000");
        expect(result).toContain("- Usage charges: $0");
    });
});
describe("Error handling", () => {
    it("should propagate API errors", async () => {
        const mockClient = {
            callApi: vi.fn().mockRejectedValue(new Error("API rate limit exceeded")),
        };
        await expect(handleEmbed({ text: "Test" }, mockClient)).rejects.toThrow("API rate limit exceeded");
    });
    it("should handle network errors", async () => {
        const mockClient = {
            callApi: vi.fn().mockRejectedValue(new Error("Network error")),
        };
        await expect(handleCatalog(mockClient)).rejects.toThrow("Network error");
    });
});
