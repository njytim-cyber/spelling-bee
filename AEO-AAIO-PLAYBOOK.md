# AEO / AAIO Instrumentation Playbook

How to measure whether AI platforms are discovering, citing, and recommending Spelling Bee.

## What We've Deployed

| File | Purpose |
|------|---------|
| `index.html` | JSON-LD: `WebApplication` + `FAQPage` schema, SEO meta tags, canonical URL |
| `public/robots.txt` | Crawler guidance, sitemap pointer |
| `public/sitemap.xml` | Main page + privacy + terms |
| `public/llms.txt` | Quick-reference for AI agents (emerging standard) |
| `public/llms-full.txt` | Full app documentation for RAG systems |

**When we get a custom domain**: find-and-replace `spelling-bee-prod.web.app` in `index.html`, `sitemap.xml`, `llms.txt`, and `llms-full.txt`.

---

## Free Measurement Tools (Use These Now)

### 1. Google Search Console (GSC)
- **URL**: https://search.google.com/search-console
- **What it tells you**: Whether Google indexed your structured data, search performance, errors
- **Key sections**:
  - **Enhancements** → look for "Software Apps", "FAQs" entries
  - **URL Inspection** → paste your URL to see what Google indexed
  - **Performance** → clicks, impressions, position for your keywords
- **Setup**: Verify domain ownership, submit `sitemap.xml`

### 2. Google Rich Results Test
- **URL**: https://search.google.com/test/rich-results
- **What it tells you**: Whether your JSON-LD qualifies for rich results
- **Use**: Paste `https://spelling-bee-prod.web.app` after deploy to validate schema

### 3. Schema.org Validator
- **URL**: https://validator.schema.org
- **What it tells you**: Whether your JSON-LD is syntactically correct (not Google-specific)

### 4. HubSpot AEO Grader
- **URL**: https://www.hubspot.com/aeo-grader
- **What it tells you**: AI visibility score across ChatGPT, Perplexity, Gemini
- **Reports**: Share of voice score, competitor comparison, sentiment, which platforms mention you
- **Cost**: Free

### 5. Semrush Free AI Checkers
- **AI Search Visibility**: https://www.semrush.com/free-tools/ai-search-visibility-checker/ (10 checks/day)
- **AI Overviews**: https://www.semrush.com/free-tools/ai-overviews-visibility-checker/
- **What they tell you**: Whether your domain appears in AI-generated answers and Google AI Overviews

### 6. GA4 AI Referral Tracking
Track traffic arriving from AI platforms. **Setup in GA4**:

1. Admin → Data Display → Channel Groups
2. Create new channel or edit default
3. Add channel called **"AI Referral"**
4. Rule: Source matches regex below AND Medium = "referral"

```regex
(chatgpt\.com|chat\.openai\.com|openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|copilot\.microsoft\.com|you\.com|search\.brave\.com)
```

**Known AI referrer domains**:
| Platform | Referrer |
|----------|----------|
| ChatGPT | `chatgpt.com`, `chat.openai.com` |
| Perplexity | `perplexity.ai` |
| Claude | `claude.ai` |
| Gemini | `gemini.google.com` |
| Copilot | `copilot.microsoft.com` |

**Caveat**: ~34% of AI-referred traffic shows up as "Direct" (free ChatGPT users don't send referrer headers). No way to recover this.

### 7. DIY Manual AI Visibility Test (Monthly, 30 min)
1. Write 15-20 questions your target users would ask AI ("best spelling app for kids", "how to prepare for a spelling bee", "free spelling practice app")
2. Ask each question in ChatGPT, Perplexity, Gemini, Copilot
3. Record: mentioned (yes/no), position, citation type, sentiment, source URL
4. Track in a spreadsheet. Repeat monthly.

---

## Paid Tools (If/When Needed)

| Tool | Price | What It Adds |
|------|-------|-------------|
| **Otterly.ai** | $29/mo | 15 tracked prompts across ChatGPT/Perplexity/AIO, weekly reports |
| **Peec AI** | ~89 EUR/mo | Prompt-level AI search analytics |
| **Semrush One** | Paid (7-day trial) | Full AI Visibility Toolkit + traditional SEO |
| **Profound** | $499/mo | Enterprise. Citation patterns across 6+ AI platforms |

---

## AI Crawler User-Agents to Monitor in Server Logs

Check Firebase/Cloudflare access logs for these requesting `/llms.txt` and `/llms-full.txt`:

```
GPTBot           # OpenAI training crawler
OAI-SearchBot    # OpenAI search
ChatGPT-User     # ChatGPT browsing (no longer respects robots.txt)
Googlebot        # Google (including AI Overviews)
anthropic-ai     # Anthropic
ClaudeBot        # Claude
PerplexityBot    # Perplexity
cohere-ai        # Cohere
```

---

## What's Real vs. Theoretical

| Category | Available Now | Not Yet Measurable |
|----------|-------------|-------------------|
| AI mention tracking | HubSpot AEO Grader, Semrush free, DIY manual | Real-time automated alerts |
| AI referral traffic | GA4 with regex channel groups | Recovering hidden "Direct" traffic |
| Schema validation | Rich Results Test, GSC Enhancements | — |
| Featured snippet tracking | Manual + GSC (limited) | Free automated snippet tracking |
| llms.txt impact | Can deploy, can monitor fetches | Whether any LLM actually reads it for discovery |
| AAIO agent tracking | Server logs for AI user-agents | Dedicated AAIO analytics dashboards |

**Honest assessment**: AEO measurement is maturing fast — free tools from HubSpot and Semrush work today. AAIO measurement barely exists as a distinct discipline; it collapses into AEO + server log analysis. The `llms.txt` standard has ~10% adoption and zero confirmed LLM providers reading it, but costs nothing to maintain.

---

## Key Context

- **FAQPage rich results**: Google restricted these to gov/health sites in Aug 2023. Our FAQ schema won't show expandable snippets in SERPs, but still helps AI platforms parse our content structure.
- **Featured snippets declining**: Dropped 64% in visibility (2025) as Google replaces them with AI Overviews. Our content targets AI Overviews more than traditional snippets.
- **AI referral traffic converts 23x more** than traditional organic (Ahrefs study). Even small volumes matter.
- **Perplexity cites 6-10 sources per answer** (95% citation rate) vs ChatGPT's 2-4 (60% rate). Perplexity is easier to get cited in.

---

## Monthly Routine (All Free, ~45 min/month)

| Cadence | Task | Time |
|---------|------|------|
| Weekly | Check GA4 AI referral channel | 5 min |
| Monthly | DIY manual AI visibility test (15-20 prompts) | 30 min |
| Monthly | Run HubSpot AEO Grader + Semrush free checker | 5 min |
| Monthly | Check GSC Enhancements for structured data status | 5 min |
| Quarterly | Review server logs for AI crawler activity on llms.txt | 15 min |
| As needed | Validate schema changes with Rich Results Test | 5 min |
