# MCP Directory Submission Templates

Package: `s2t-mcp-accelerators` v1.4.2
Date: 2026-02-15

---

## 1. Official MCP Registry (registry.modelcontextprotocol.io)

**Submission URL:** https://registry.modelcontextprotocol.io

**Method:** Submit `server.json` to the registry. The file already exists at `C:\S2T\accelerators-mcp\server.json` and follows the `2025-12-11` schema.

**Server Name:** `io.github.S2TConsulting/accelerators`

**Description:** 36 enterprise-grade MCP tools: vector embeddings, CloudFormation generation, DynamoDB design, IAM policy validation, MFA compliance checking, OAuth validation, error pattern analysis, data lake readiness assessment, agent orchestration, resilience patterns, stakeholder interviews, and 12 ACI governance tools for AI agent safety.

**Category:** Developer Tools, Cloud Infrastructure, Security, AI/ML

**npm Package:** `s2t-mcp-accelerators`

**Repository:** https://github.com/S2TConsulting/accelerators-mcp

**Transport:** stdio, http

**Tools Count:** 36

---

## 2. GitHub MCP Registry

**Repository:** https://github.com/modelcontextprotocol/registry

**Method:** Submit a Pull Request adding an entry to the servers directory.

**Entry:**

```json
{
  "name": "s2t-accelerators",
  "display_name": "S2T Accelerators",
  "description": "36 enterprise-grade tools for AWS infrastructure, security compliance, AI workflows, agent governance, and operational resilience. Includes IAM policy validation, MFA compliance, CloudFormation generation, DynamoDB single-table design, OAuth validation, vector embeddings, error pattern analysis, data lake readiness, risk classification, task routing, 12 ACI governance tools for AI agent safety, and stakeholder interview automation.",
  "repository": "https://github.com/S2TConsulting/accelerators-mcp",
  "npm": "s2t-mcp-accelerators",
  "author": "S2T Consulting",
  "license": "MIT",
  "categories": ["cloud-infrastructure", "security", "developer-tools", "ai-ml", "agent-governance"],
  "transport": "stdio"
}
```

**PR Title:** `Add S2T Accelerators MCP Server (36 enterprise tools for AWS/Security/AI/Agent Governance)`

**PR Description:**
Adds the S2T Accelerators MCP server, providing 36 enterprise tools:
- Security: IAM Policy Validator, MFA Compliance Checker, OAuth Validator
- AWS: CloudFormation Generator, DynamoDB Designer, Data Lake Readiness
- AI: Vector Embeddings (Amazon Bedrock Titan), Error Pattern Analyzer
- Agent Governance: 12 ACI tools (decision classification, financial gates, compliance checks, blast radius estimation, rollback generation)
- Consulting: 4 stakeholder interview tools (runs locally, no API key needed)
- Resilience: Circuit breaker, auto-recovery, task routing, issue prediction
- Published on npm as `s2t-mcp-accelerators` v1.4.2

---

## 3. awesome-mcp-servers (GitHub PR)

**Repository:** https://github.com/punkpeye/awesome-mcp-servers

**Method:** Submit a Pull Request adding an entry under the appropriate section.

**Section:** Cloud Platforms / Developer Tools

**Entry (Markdown table row):**

```markdown
| [S2T Accelerators](https://github.com/S2TConsulting/accelerators-mcp) | 36 enterprise tools: IAM policy validation, MFA compliance, CloudFormation generation, DynamoDB design, OAuth validation, vector embeddings, error analysis, 12 AI agent governance tools, stakeholder interviews, resilience patterns, and more | [npm](https://www.npmjs.com/package/s2t-mcp-accelerators) |
```

**PR Title:** `Add S2T Accelerators (36 enterprise tools for AWS/Security/AI/Agent Governance)`

**PR Description:**
Adding S2T Accelerators MCP server with 36 tools across security, AWS infrastructure, AI, agent governance, and operations categories. Published on npm as v1.4.2, MIT licensed, supports Claude Desktop, Cursor, Windsurf, and VS Code. Includes a unique suite of 12 ACI governance tools for AI agent safety and 4 local stakeholder interview tools that require no API key.

---

## 4. PulseMCP

**Submission URL:** https://www.pulsemcp.com/submit

**Title:** S2T Accelerators

**Short Description:** 36 enterprise-grade MCP tools for AWS infrastructure, security compliance, AI workflows, agent governance, and operational resilience.

**Long Description:**
Give your AI assistant access to battle-tested enterprise tools. Validate IAM policies with security scoring, check MFA compliance across your AWS org, generate CloudFormation/SAM templates from natural language, design optimal DynamoDB single-table schemas, validate OAuth configurations, generate vector embeddings, analyze error patterns, and assess data lake readiness. Plus 12 unique ACI governance tools for AI agent safety: classify decisions, enforce financial gates, check compliance, estimate blast radius, generate rollback plans, and audit agent behavior. 4 local stakeholder interview tools run without any API key. Built from patterns deployed across production AWS environments.

**npm Package:** s2t-mcp-accelerators

**Repository URL:** https://github.com/S2TConsulting/accelerators-mcp

**Website:** https://www.s2tconsulting.com/accelerators

**Categories:** Cloud Infrastructure, Security, Developer Tools, AI/ML, Agent Governance

**Tags:** aws, iam, cloudformation, dynamodb, oauth, embeddings, security, compliance, mfa, data-lake, error-analysis, sam, agent-governance, aci, ai-safety

**Pricing:** Free tier available (100 req/month), paid tiers from $29/month

---

## 5. MCP.so

**Submission URL:** https://mcp.so/submit

**Server Name:** S2T Accelerators

**One-Line Description:** 36 enterprise tools for AWS security, infrastructure generation, AI workflows, and AI agent governance.

**Full Description:**
S2T Accelerators provides 36 production-grade tools accessible through any MCP-compatible IDE. Security tools validate IAM policies and check MFA compliance. Infrastructure tools generate CloudFormation templates and design DynamoDB schemas. AI tools create vector embeddings via Amazon Bedrock. Operations tools analyze error patterns and assess data lake readiness. 12 ACI governance tools provide AI agent safety: decision classification, financial gating, compliance checks, blast radius estimation, rollback generation, and behavioral auditing. 4 local stakeholder interview tools run with zero API cost. Free tier includes 100 requests per month.

**Install Command:** `npx -y s2t-mcp-accelerators`

**npm:** s2t-mcp-accelerators

**GitHub:** https://github.com/S2TConsulting/accelerators-mcp

**Category:** Cloud Platforms, Security, Infrastructure as Code, AI/ML, Agent Governance

**Tags:** aws, security, iam, cloudformation, dynamodb, oauth, embeddings, mcp, claude, agent-governance, ai-safety, aci

---

## 6. Smithery

**Submission URL:** https://smithery.ai/submit

**Method:** Smithery auto-detects from the `smithery.yaml` file in the repository root. Ensure the file is committed and pushed to the public GitHub repository.

**Package Name:** s2t-mcp-accelerators

**Display Name:** S2T Accelerators

**Description:** Enterprise-grade MCP tools for AWS infrastructure, security compliance, AI workflows, and AI agent governance. 36 tools including IAM policy validation, MFA compliance, CloudFormation generation, DynamoDB design, OAuth validation, vector embeddings, error analysis, data lake readiness, risk classification, task routing, 12 ACI governance tools for agent safety, and 4 local stakeholder interview tools.

**Configuration:** Single required field `S2T_API_KEY` (string, secret).

**Tags:** aws, security, infrastructure, ai, embeddings, cloudformation, dynamodb, oauth, iam, compliance, agent-governance, ai-safety

**Pricing:** Free tier (100/month), Developer ($29), Business ($99), Enterprise ($299)

---

## 7. Glama

**Submission URL:** https://glama.ai/mcp/submit

**Server Name:** S2T Accelerators

**Description:** 36 enterprise MCP tools for AWS infrastructure generation, security compliance validation, AI workflows, agent governance, and operational resilience. Includes IAM policy validation with security scoring, MFA compliance auditing, CloudFormation/SAM template generation, DynamoDB single-table design, OAuth configuration validation, vector embedding generation, error pattern analysis, data lake readiness assessment, risk classification, task routing, 12 ACI governance tools for AI agent safety (decision classification, financial gates, compliance checks, blast radius estimation, rollback generation), and 4 local stakeholder interview tools.

**npm Package:** s2t-mcp-accelerators

**Repository:** https://github.com/S2TConsulting/accelerators-mcp

**Author:** S2T Consulting

**License:** MIT

**Transport:** stdio, http

**Categories:** Cloud Infrastructure, Security, AI/ML, Developer Tools, Agent Governance

**Tags:** aws, iam, mfa, cloudformation, sam, dynamodb, oauth, embeddings, error-analysis, data-lake, security-compliance, agent-governance, aci, ai-safety

---

## 8. mcpservers.org

**Submission URL:** https://mcpservers.org/submit

**Title:** S2T Accelerators MCP Server

**Description:** Enterprise-grade MCP server with 36 tools spanning AWS infrastructure, security compliance, AI workflows, agent governance, and operational resilience. Validate IAM policies, audit MFA compliance, generate CloudFormation templates, design DynamoDB schemas, validate OAuth configs, create vector embeddings, analyze error patterns, assess data lake readiness, classify risks, route tasks, predict issues, auto-recover, govern AI agent decisions with 12 ACI tools, and run stakeholder interviews locally. Built by S2T Consulting from production AWS deployment patterns.

**Install Method:** npx

**Install Command:** `npx -y s2t-mcp-accelerators`

**npm URL:** https://www.npmjs.com/package/s2t-mcp-accelerators

**GitHub URL:** https://github.com/S2TConsulting/accelerators-mcp

**Documentation URL:** https://www.s2tconsulting.com/accelerators

**Categories:** AWS, Security, Infrastructure as Code, AI/ML, Developer Tools, Agent Governance

**Tags:** aws, iam-policy, mfa, cloudformation, sam, dynamodb, single-table-design, oauth, vector-embeddings, error-analysis, data-lake, security, compliance, agent-governance, aci, ai-safety

**License:** MIT

**Pricing Model:** Freemium (Free: 100 req/month, Developer: $29/mo, Business: $99/mo, Enterprise: $299/mo)

---

## Submission Checklist

| Directory | Status | Priority | Notes |
|-----------|--------|----------|-------|
| Official MCP Registry | LIVE | P1 | Published 2026-02-13. Verified via API 2026-02-18. `curl registry.modelcontextprotocol.io/v0.1/servers/io.github.S2TConsulting%2Faccelerators/versions/1.4.2` |
| GitHub MCP Registry | TODO | P1 | PR to modelcontextprotocol/registry (no public PR process found yet) |
| awesome-mcp-servers | SUBMITTED | P1 | PR #1978 open. Duplicate entry fixed & pushed 2026-02-18. https://github.com/punkpeye/awesome-mcp-servers/pull/1978 |
| PulseMCP | LIVE | P2 | Auto-indexed from Official MCP Registry. Confirmed live 2026-02-18. |
| MCP.so | LIVE | P2 | Published 2026-02-18. Listing: https://mcp.so/server/s2t-accelerators. Signed in via GitHub OAuth, submitted with full description, tags, and config JSON. |
| Smithery | LISTED | P2 | Server page created 2026-02-18 at https://smithery.ai/servers/s2tconsulting/accelerators. Namespace `s2tconsulting` created. Display name, description, homepage configured. Listed (not unlisted). Full deployment blocked: hosted/stdio requires paid Smithery plan; URL-based requires live HTTP endpoint (roadmap Q2 2026). `createSandboxServer` export added to `src/index.ts` for future CLI publish. |
| Glama | SUBMITTED | P2 | Submitted for review 2026-02-18 via GitHub OAuth. Name, description (332 chars), and GitHub URL provided. Pending Glama team approval before public listing. |
| mcpservers.org | SUBMITTED | P3 | Submitted 2026-02-18. Success message confirmed. Category: cloud-service. Contact: shaun@s2tconsulting.com. Pending approval — email notification expected. |

### Pre-Submission Requirements

- [x] Package published on npm (`s2t-mcp-accelerators@1.4.2`)
- [x] README.md with installation instructions for all IDEs
- [x] LICENSE file (MIT)
- [x] server.json with MCP registry schema
- [x] smithery.yaml for Smithery auto-detection
- [x] Public GitHub repository accessible at https://github.com/S2TConsulting/accelerators-mcp
- [x] npm package page verified at https://www.npmjs.com/package/s2t-mcp-accelerators
- [x] All tool counts updated to 36 (from 20)
- [x] Version updated to 1.4.2 (from 1.2.0)
- [x] ACI governance tools and interview tools included in descriptions
