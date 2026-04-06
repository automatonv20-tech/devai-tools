#!/usr/bin/env node
/**
 * x402 AI SERVICES — Complete Hub
 * Port 4001 — single public URL via Cloudflare tunnel
 * Marketing site: https://automatonv20-tech.github.io
 *
 * CRYPTO PRICES (x402, 90% off regular price):
 *   POST /review          $0.05  — code review       (regular $0.99)
 *   POST /audit/contract  $0.50  — smart contract audit (regular $9.99)
 *   POST /generate/readme $0.15  — README generator  (regular $1.99)
 *   POST /generate/tests  $0.20  — test generator    (regular $2.99)
 *   POST /explain/code    $0.10  — code explanation  (regular $0.99)
 *   POST /optimize/sql    $0.15  — SQL optimizer     (regular $1.49)
 *   POST /generate/apidocs $0.20 — API docs generator (regular $2.99)
 *
 * STRIPE PRICES (credit card, coming soon):
 *   POST /pay/stripe/create-session — create Stripe Checkout session
 */

const express = require('express');
const https = require('https');
const { HTTPFacilitatorClient } = require('@x402/core/server');
const { ExactEvmScheme } = require('@x402/evm/exact/server');
const { paymentMiddleware, x402ResourceServer } = require('@x402/express');

const PORT = 4001;
const RECEIVER = process.env.RECEIVER_WALLET;
const GROQ_KEY = process.env.GROQ_API_KEY;
const BASE_URL = process.env.BASE_URL || 'http://localhost:4001';
const MARKETING_URL = 'https://automatonv20-tech.github.io';
// TODO: Set STRIPE_SECRET_KEY environment variable when Stripe account is ready
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || null;

// ─── GROQ INFERENCE ──────────────────────────────────────────────────────────

async function groq(model, prompt, maxTokens = 1024) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model, max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    });
    const req = https.request({
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try { resolve(JSON.parse(d).choices[0].message.content); }
          catch(e) { reject(new Error('Parse error')); }
        } else { reject(new Error(`Groq ${res.statusCode}: ${d.slice(0,300)}`)); }
      });
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

// ─── EXPRESS + x402 ──────────────────────────────────────────────────────────

const app = express();
app.use(express.json({ limit: '500kb' }));

const facilitatorClient = new HTTPFacilitatorClient({ url: 'https://facilitator.payai.network' });
const resourceServer = new x402ResourceServer(facilitatorClient)
  .register('eip155:8453', new ExactEvmScheme());

app.use(paymentMiddleware({
  'POST /review': {
    accepts: { scheme: 'exact', price: '$0.05', network: 'eip155:8453', payTo: RECEIVER },
    description: 'AI code review: bugs, security issues, and improvements. Returns 3-5 actionable suggestions. x402 crypto price $0.05 (90% off regular $0.99). See ' + MARKETING_URL,
    mimeType: 'application/json',
  },
  'POST /audit/contract': {
    accepts: { scheme: 'exact', price: '$0.50', network: 'eip155:8453', payTo: RECEIVER },
    description: 'Solidity smart contract security audit. Detects reentrancy, overflow, access control issues, and critical vulnerabilities. x402 crypto price $0.50 (90% off regular $9.99). See ' + MARKETING_URL,
    mimeType: 'application/json',
  },
  'POST /generate/readme': {
    accepts: { scheme: 'exact', price: '$0.15', network: 'eip155:8453', payTo: RECEIVER },
    description: 'Generate a professional README.md for any project. Includes badges, installation, usage, API docs. x402 crypto price $0.15 (90% off regular $1.99). See ' + MARKETING_URL,
    mimeType: 'application/json',
  },
  'POST /generate/tests': {
    accepts: { scheme: 'exact', price: '$0.20', network: 'eip155:8453', payTo: RECEIVER },
    description: 'Generate comprehensive unit tests for any function or module. Supports Jest, pytest, Go test, Rust. x402 crypto price $0.20 (90% off regular $2.99). See ' + MARKETING_URL,
    mimeType: 'application/json',
  },
  'POST /explain/code': {
    accepts: { scheme: 'exact', price: '$0.10', network: 'eip155:8453', payTo: RECEIVER },
    description: 'Plain-English explanation of complex code. Covers logic, complexity, patterns, and potential issues. x402 crypto price $0.10 (90% off regular $0.99). See ' + MARKETING_URL,
    mimeType: 'application/json',
  },
  'POST /optimize/sql': {
    accepts: { scheme: 'exact', price: '$0.15', network: 'eip155:8453', payTo: RECEIVER },
    description: 'Optimize SQL queries for performance. Suggests indexes, rewrites, and explains query plan improvements. x402 crypto price $0.15 (90% off regular $1.49). See ' + MARKETING_URL,
    mimeType: 'application/json',
  },
  'POST /generate/apidocs': {
    accepts: { scheme: 'exact', price: '$0.20', network: 'eip155:8453', payTo: RECEIVER },
    description: 'Generate OpenAPI 3.0 documentation from code. Produces complete spec with schemas, examples, descriptions. x402 crypto price $0.20 (90% off regular $2.99). See ' + MARKETING_URL,
    mimeType: 'application/json',
  },
}, resourceServer));

// ─── FREE DISCOVERY ENDPOINTS ─────────────────────────────────────────────────

// ─── STRIPE PRICING (credit card, regular prices) ────────────────────────────
const STRIPE_PRICES = {
  review:          { amount: 99,   name: 'Code Review',             description: 'AI code review: bugs, security, improvements (3-5 suggestions)' },
  'audit/contract':{ amount: 999,  name: 'Smart Contract Audit',    description: 'Full Solidity security audit with CVSS-rated findings' },
  'generate/readme':{ amount: 199, name: 'README Generator',        description: 'Professional README.md with badges, installation, usage' },
  'generate/tests':{ amount: 299,  name: 'Test Suite Generator',    description: 'Comprehensive unit tests: happy path, edge cases, errors' },
  'explain/code':  { amount: 99,   name: 'Code Explanation',        description: 'Plain-English breakdown of complex code' },
  'optimize/sql':  { amount: 149,  name: 'SQL Optimizer',           description: 'Query optimization with index suggestions and rewrites' },
  'generate/apidocs':{ amount: 299, name: 'API Docs Generator',     description: 'Complete OpenAPI 3.0 specification from your code' },
};

// ─── STRIPE CHECKOUT SESSION ENDPOINT ────────────────────────────────────────
app.post('/pay/stripe/create-session', async (req, res) => {
  if (!STRIPE_SECRET_KEY) {
    return res.status(503).json({
      error: 'Stripe payments not yet configured',
      message: 'Credit card payments are coming soon. Use x402 crypto payments for now.',
      crypto_url: BASE_URL,
      marketing_url: MARKETING_URL,
    });
  }

  const { service, success_url, cancel_url } = req.body;
  if (!service || !STRIPE_PRICES[service]) {
    return res.status(400).json({
      error: 'Invalid service',
      valid_services: Object.keys(STRIPE_PRICES),
    });
  }

  // TODO: Uncomment when STRIPE_SECRET_KEY is configured
  // const stripe = require('stripe')(STRIPE_SECRET_KEY);
  // const session = await stripe.checkout.sessions.create({
  //   payment_method_types: ['card'],
  //   line_items: [{
  //     price_data: {
  //       currency: 'usd',
  //       product_data: {
  //         name: STRIPE_PRICES[service].name,
  //         description: STRIPE_PRICES[service].description,
  //       },
  //       unit_amount: STRIPE_PRICES[service].amount,
  //     },
  //     quantity: 1,
  //   }],
  //   mode: 'payment',
  //   success_url: success_url || MARKETING_URL + '?payment=success',
  //   cancel_url: cancel_url || MARKETING_URL,
  //   metadata: { service, api_endpoint: BASE_URL + '/' + service },
  // });
  // res.json({ session_id: session.id, url: session.url });

  res.status(503).json({ error: 'Stripe not configured yet — coming soon' });
});

app.get('/health', (req, res) => res.json({
  status: 'ok', service: 'x402-ai-services', version: '2.1',
  endpoints: 7, network: 'base', wallet: RECEIVER,
  marketing_site: MARKETING_URL,
  payment_methods: { crypto: 'active (x402/USDC on Base)', stripe: 'coming soon' }
}));

app.get('/.well-known/x402', (req, res) => res.json({
  version: 1,
  resources: [
    'POST /review', 'POST /audit/contract', 'POST /generate/readme',
    'POST /generate/tests', 'POST /explain/code', 'POST /optimize/sql',
    'POST /generate/apidocs'
  ],
  base_url: BASE_URL,
  description: 'AI developer tools hub — x402 crypto prices (90% off regular): code review $0.05 (regular $0.99), smart contract audit $0.50 (regular $9.99), README $0.15, tests $0.20, explanation $0.10, SQL $0.15, API docs $0.20. USDC on Base. No signup. See ' + MARKETING_URL,
  wallet: RECEIVER, network: 'base',
  marketing_site: MARKETING_URL
}));

app.get('/.well-known/agent.json', (req, res) => res.json({
  name: 'AI Developer Services',
  description: '7 AI-powered developer tools. Pay per use in USDC on Base via x402. No API key, no signup.',
  url: BASE_URL, wallet: RECEIVER, network: 'base',
  skills: [
    { name: 'code_review', endpoint: '/review', price_usdc: '0.05' },
    { name: 'contract_audit', endpoint: '/audit/contract', price_usdc: '0.50' },
    { name: 'readme_generator', endpoint: '/generate/readme', price_usdc: '0.15' },
    { name: 'test_generator', endpoint: '/generate/tests', price_usdc: '0.20' },
    { name: 'code_explanation', endpoint: '/explain/code', price_usdc: '0.10' },
    { name: 'sql_optimizer', endpoint: '/optimize/sql', price_usdc: '0.15' },
    { name: 'api_docs', endpoint: '/generate/apidocs', price_usdc: '0.20' },
  ]
}));

app.get('/openapi.json', (req, res) => res.json({
  openapi: '3.0.0',
  info: {
    title: 'AI Developer Tools — x402',
    version: '2.1.0',
    description: `7 AI-powered developer tools. Pay per use in USDC on Base via x402 protocol.
No API key, no signup, no subscription. Wallet: ${RECEIVER}
x402 crypto prices are 90% off regular card prices — see ${MARKETING_URL} for full pricing.`,
    contact: { url: MARKETING_URL }
  },
  servers: [{ url: BASE_URL }],
  paths: {
    '/review': { post: {
      summary: 'Code review ($0.05 USDC)',
      description: 'AI code review: bugs, security, improvements. Returns 3-5 actionable suggestions.',
      'x-payment': { price: '$0.05', network: 'base', asset: 'USDC', payTo: RECEIVER },
      requestBody: { required: true, content: { 'application/json': { schema: {
        type: 'object', required: ['code'],
        properties: {
          code: { type: 'string', description: 'Source code to review' },
          language: { type: 'string', default: 'unknown' }
        }
      }, example: { code: 'function add(a,b){return a+b}', language: 'javascript' }}}},
      responses: { '200': { description: 'Review with 3-5 suggestions' }, '402': { description: 'Payment required' } }
    }},
    '/audit/contract': { post: {
      summary: 'Smart contract audit ($0.50 USDC)',
      description: 'Solidity security audit: reentrancy, overflow, access control, logic errors.',
      'x-payment': { price: '$0.50', network: 'base', asset: 'USDC', payTo: RECEIVER },
      requestBody: { required: true, content: { 'application/json': { schema: {
        type: 'object', required: ['code'],
        properties: {
          code: { type: 'string', description: 'Solidity contract source' },
          name: { type: 'string', description: 'Contract name' }
        }
      }}}},
      responses: { '200': { description: 'Security audit report' }, '402': { description: 'Payment required' } }
    }},
    '/generate/readme': { post: {
      summary: 'README generator ($0.15 USDC)',
      requestBody: { required: true, content: { 'application/json': { schema: {
        type: 'object', required: ['projectName', 'description'],
        properties: {
          projectName: { type: 'string' }, description: { type: 'string' },
          techStack: { type: 'string' }, features: { type: 'array', items: { type: 'string' } }
        }
      }}}},
      responses: { '200': { description: 'Complete README.md' } }
    }},
    '/generate/tests': { post: {
      summary: 'Unit test generator ($0.20 USDC)',
      requestBody: { required: true, content: { 'application/json': { schema: {
        type: 'object', required: ['code'],
        properties: {
          code: { type: 'string' }, language: { type: 'string', default: 'javascript' },
          framework: { type: 'string', default: 'jest' }
        }
      }}}},
      responses: { '200': { description: 'Complete test suite' } }
    }},
    '/explain/code': { post: {
      summary: 'Code explanation ($0.10 USDC)',
      requestBody: { required: true, content: { 'application/json': { schema: {
        type: 'object', required: ['code'],
        properties: {
          code: { type: 'string' },
          level: { type: 'string', enum: ['beginner','intermediate','expert'], default: 'intermediate' }
        }
      }}}},
      responses: { '200': { description: 'Plain-English explanation' } }
    }},
    '/optimize/sql': { post: {
      summary: 'SQL optimizer ($0.15 USDC)',
      requestBody: { required: true, content: { 'application/json': { schema: {
        type: 'object', required: ['query'],
        properties: { query: { type: 'string' }, dialect: { type: 'string', default: 'postgresql' } }
      }}}},
      responses: { '200': { description: 'Optimized query + index suggestions' } }
    }},
    '/generate/apidocs': { post: {
      summary: 'API docs generator ($0.20 USDC)',
      requestBody: { required: true, content: { 'application/json': { schema: {
        type: 'object', required: ['code'],
        properties: {
          code: { type: 'string' }, framework: { type: 'string', default: 'express' }
        }
      }}}},
      responses: { '200': { description: 'OpenAPI 3.0 specification' } }
    }}
  }
}));

app.get('/llms.txt', (req, res) => {
  res.type('text/plain').send(`# AI Developer Tools — x402

> 7 pay-per-use AI tools for developers. USDC on Base, no signup.
> Marketing site: ${MARKETING_URL}

## Pricing

x402 (crypto) prices shown below — 90% off regular card prices.
Regular prices: review $0.99, audit $9.99, readme $1.99, tests $2.99, explain $0.99, sql $1.49, apidocs $2.99
See ${MARKETING_URL} for full pricing and credit card payments (coming soon).

## Services (x402 crypto prices)

POST ${BASE_URL}/review — Code review, $0.05 USDC (regular $0.99). Input: {code, language}
POST ${BASE_URL}/audit/contract — Solidity audit, $0.50 USDC (regular $9.99). Input: {code, name}
POST ${BASE_URL}/generate/readme — README generator, $0.15 USDC (regular $1.99). Input: {projectName, description, techStack}
POST ${BASE_URL}/generate/tests — Test generator, $0.20 USDC (regular $2.99). Input: {code, language, framework}
POST ${BASE_URL}/explain/code — Code explanation, $0.10 USDC (regular $0.99). Input: {code, level}
POST ${BASE_URL}/optimize/sql — SQL optimizer, $0.15 USDC (regular $1.49). Input: {query, dialect}
POST ${BASE_URL}/generate/apidocs — API docs, $0.20 USDC (regular $2.99). Input: {code, framework}

## Stripe (Credit Card)

POST ${BASE_URL}/pay/stripe/create-session — Create Stripe Checkout session (coming soon)
Input: {service, success_url, cancel_url}

## Payment
Protocol: x402 v2
Network: Base (eip155:8453)
Asset: USDC
Wallet: ${RECEIVER}

## Discovery
${BASE_URL}/.well-known/x402
${BASE_URL}/openapi.json
${MARKETING_URL}
`);
});

app.get('/skill.md', (req, res) => {
  res.type('text/markdown').send(`# AI Developer Tools — x402 Skill

## Overview
7 AI-powered developer tools available as pay-per-use APIs on Base network.

| Endpoint | Price | Description |
|----------|-------|-------------|
| POST /review | $0.05 | Code review: bugs, security, improvements |
| POST /audit/contract | $0.50 | Solidity smart contract security audit |
| POST /generate/readme | $0.15 | Professional README.md generator |
| POST /generate/tests | $0.20 | Unit test suite generator |
| POST /explain/code | $0.10 | Plain-English code explanation |
| POST /optimize/sql | $0.15 | SQL query optimizer |
| POST /generate/apidocs | $0.20 | OpenAPI 3.0 docs generator |

## Usage via agentcash
\`\`\`
npx agentcash discover ${BASE_URL}
npx agentcash fetch "${BASE_URL}/review" -m POST --body '{"code":"...","language":"python"}'
\`\`\`

## Payment
x402 v2 · USDC · Base mainnet · Wallet: ${RECEIVER}
`);
});

// ─── PAID ROUTE HANDLERS ──────────────────────────────────────────────────────

app.post('/review', async (req, res) => {
  const { code, language = 'unknown' } = req.body;
  if (!code) return res.status(400).json({ error: 'Missing code' });
  try {
    const review = await groq('moonshotai/kimi-k2-instruct',
      `Review this ${language} code for bugs, security issues, and improvements:\n\n${code}\n\nProvide 3-5 specific, actionable suggestions.`, 800);
    console.log(`✅ Review: ${language} ${code.length}ch`);
    res.json({ success: true, review, language, code_length: code.length, price_paid: '$0.05', timestamp: new Date().toISOString() });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/audit/contract', async (req, res) => {
  const { code, name = 'Contract' } = req.body;
  if (!code) return res.status(400).json({ error: 'Missing code' });
  try {
    const audit = await groq('moonshotai/kimi-k2-instruct',
      `You are an expert Solidity security auditor. Perform a thorough security audit of this smart contract "${name}".

Check for:
1. Reentrancy vulnerabilities
2. Integer overflow/underflow
3. Access control flaws
4. Logic errors & business logic issues
5. Gas optimization opportunities
6. Front-running vulnerabilities
7. Unchecked external calls
8. Any other security concerns

Contract:
\`\`\`solidity
${code}
\`\`\`

Format:
## Executive Summary
## Critical Vulnerabilities (CVSS 9-10)
## High Severity (CVSS 7-8)
## Medium Severity (CVSS 4-6)
## Low/Informational
## Recommendations`, 1800);
    console.log(`✅ Audit: ${name}`);
    res.json({ success: true, audit, contract: name, price_paid: '$0.50', timestamp: new Date().toISOString() });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/generate/readme', async (req, res) => {
  const { projectName, description, techStack = '', features = [] } = req.body;
  if (!projectName || !description) return res.status(400).json({ error: 'Missing projectName or description' });
  try {
    const readme = await groq('moonshotai/kimi-k2-instruct',
      `Generate a complete, professional README.md for:
Project: ${projectName}
Description: ${description}
Tech Stack: ${techStack}
Features: ${features.join(', ')}

Include: title with badges, overview, features list, prerequisites, installation steps, usage examples with code, configuration, API reference (if applicable), contributing guide, license section. Use proper markdown formatting.`, 2000);
    console.log(`✅ README: ${projectName}`);
    res.json({ success: true, readme, projectName, price_paid: '$0.15', timestamp: new Date().toISOString() });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/generate/tests', async (req, res) => {
  const { code, language = 'javascript', framework = 'jest' } = req.body;
  if (!code) return res.status(400).json({ error: 'Missing code' });
  try {
    const tests = await groq('moonshotai/kimi-k2-instruct',
      `Generate a comprehensive test suite for this ${language} code using ${framework}.

Requirements:
- Happy path tests
- Edge case tests
- Error/exception tests
- Boundary condition tests
- Mock external dependencies where needed

Code:
\`\`\`${language}
${code}
\`\`\`

Return a complete, runnable test file with all imports.`, 1800);
    console.log(`✅ Tests: ${language}/${framework}`);
    res.json({ success: true, tests, language, framework, price_paid: '$0.20', timestamp: new Date().toISOString() });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/explain/code', async (req, res) => {
  const { code, level = 'intermediate' } = req.body;
  if (!code) return res.status(400).json({ error: 'Missing code' });
  try {
    const explanation = await groq('llama-3.3-70b-versatile',
      `Explain this code to a ${level} developer. Cover: what it does, how it works step by step, time/space complexity, design patterns used, potential issues.

\`\`\`
${code}
\`\`\``, 800);
    console.log(`✅ Explain (${level})`);
    res.json({ success: true, explanation, level, price_paid: '$0.10', timestamp: new Date().toISOString() });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/optimize/sql', async (req, res) => {
  const { query, dialect = 'postgresql' } = req.body;
  if (!query) return res.status(400).json({ error: 'Missing query' });
  try {
    const result = await groq('moonshotai/kimi-k2-instruct',
      `You are a database expert. Optimize this ${dialect} SQL query.

Original:
\`\`\`sql
${query}
\`\`\`

Provide:
1. **Optimized Query** (with comments)
2. **Indexes to Create** (CREATE INDEX statements)
3. **Explanation** of what was wrong and what was improved
4. **Expected Performance Gain** (estimate)`, 1000);
    console.log(`✅ SQL optimize`);
    res.json({ success: true, result, dialect, price_paid: '$0.15', timestamp: new Date().toISOString() });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/generate/apidocs', async (req, res) => {
  const { code, framework = 'express' } = req.body;
  if (!code) return res.status(400).json({ error: 'Missing code' });
  try {
    const apidocs = await groq('moonshotai/kimi-k2-instruct',
      `Generate complete OpenAPI 3.0 JSON specification for these ${framework} API routes.
Include all paths, request/response schemas, status codes, examples, and descriptions.

Code:
\`\`\`
${code}
\`\`\`

Return ONLY valid OpenAPI 3.0 JSON, no markdown.`, 2000);
    console.log(`✅ APIDocs: ${framework}`);
    res.json({ success: true, apidocs, framework, price_paid: '$0.20', timestamp: new Date().toISOString() });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// 404
app.use((req, res) => res.status(404).json({
  error: 'Not found',
  available: ['POST /review', 'POST /audit/contract', 'POST /generate/readme',
    'POST /generate/tests', 'POST /explain/code', 'POST /optimize/sql', 'POST /generate/apidocs']
}));

app.listen(PORT, () => {
  console.log(`\n🚀 x402 AI SERVICES v2.1 — port ${PORT}`);
  console.log(`📍 API:       ${BASE_URL}`);
  console.log(`🌐 Marketing: ${MARKETING_URL}`);
  console.log(`💎 Wallet:    ${RECEIVER}`);
  console.log(`\n💰 Services (x402 crypto prices — 90% off regular):`);
  console.log(`   POST /review            $0.05  — code review         (regular $0.99)`);
  console.log(`   POST /audit/contract    $0.50  — Solidity audit       (regular $9.99)`);
  console.log(`   POST /generate/readme   $0.15  — README generator     (regular $1.99)`);
  console.log(`   POST /generate/tests    $0.20  — test generator       (regular $2.99)`);
  console.log(`   POST /explain/code      $0.10  — code explanation     (regular $0.99)`);
  console.log(`   POST /optimize/sql      $0.15  — SQL optimizer        (regular $1.49)`);
  console.log(`   POST /generate/apidocs  $0.20  — API docs             (regular $2.99)`);
  console.log(`\n💳 Stripe: POST /pay/stripe/create-session (coming soon)`);
  console.log(`   Set STRIPE_SECRET_KEY env var to enable\n`);
});
