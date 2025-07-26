# Dashboard Troubleshooting Guide

## Common Issues and Solutions

### 1. Dashboard Showing No Data (0, NaN, -Infinity Values)

**Symptoms:**
- Dashboard displays 0 GPU units
- Charts show NaN or -Infinity values
- All metrics appear empty despite API being functional

**Root Cause:**
Frontend making relative API calls that fail on Cloudflare Pages deployment.

**Solution:**
Ensure frontend uses absolute URLs for API calls:

```typescript
// ❌ INCORRECT (fails on Cloudflare Pages)
fetch('/api/market/gpu-stats')

// ✅ CORRECT (works on Cloudflare Pages)
const API_BASE = 'https://gpuscout-platform.nenad-a7c.workers.dev'
fetch(`${API_BASE}/api/market/gpu-stats`)
```

**File to Check:** `frontend/src/app/dashboard/page.tsx:37`

---

### 2. CORS Errors When Accessing API

**Symptoms:**
- Console errors: "Access to fetch at '...' has been blocked by CORS policy"
- API endpoints work in browser but fail from frontend

**Root Cause:**
Missing or incorrect CORS headers in API responses.

**Solution:**
Ensure CORS headers are properly set in `src/api/marketDataRouter.ts`:

```typescript
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};
```

---

### 3. API Endpoints Returning Empty Data

**Symptoms:**
- API responds with success: true but empty data arrays
- Database appears empty despite cron jobs running

**Root Cause:**
Table name mismatches or data collection failures.

**Common Fixes:**

1. **Check table names in queries:**
   ```sql
   -- ❌ INCORRECT
   SELECT * FROM gpu_offers
   
   -- ✅ CORRECT
   SELECT * FROM gpu_marketplace_offers
   ```

2. **Verify cron jobs are running:**
   ```bash
   # Check job status via API
   curl https://gpuscout-platform.nenad-a7c.workers.dev/api/scheduled/status
   ```

3. **Trigger manual data collection:**
   ```bash
   curl -X POST https://gpuscout-platform.nenad-a7c.workers.dev/api/scheduled/trigger?job=collection
   ```

---

### 4. Frontend Build or Deployment Issues

**Symptoms:**
- Deployment fails during build process
- Static generation errors
- Missing environment variables

**Solutions:**

1. **Ensure Next.js is configured for static export:**
   ```javascript
   // next.config.js
   const nextConfig = {
     output: 'export',
     trailingSlash: true,
     images: { unoptimized: true }
   };
   ```

2. **Build and deploy commands:**
   ```bash
   cd frontend
   npm run build
   wrangler pages deploy dist --project-name=gpuscout-frontend
   ```

3. **Check Cloudflare Pages deployment logs** for specific error messages.

---

### 5. Slow Dashboard Loading

**Symptoms:**
- Dashboard takes >5 seconds to load
- Charts take long time to render
- High memory usage in browser

**Optimizations:**

1. **Implement data pagination:**
   ```typescript
   const limit = 100; // Limit API responses
   const endpoint = `${API_BASE}/api/market/offers?limit=${limit}`;
   ```

2. **Add loading states:**
   ```typescript
   const [loading, setLoading] = useState(true);
   // Show loading spinner while data loads
   ```

3. **Optimize chart data structures:**
   ```typescript
   // Pre-process data for charts to reduce rendering time
   const chartData = gpuData.map(item => ({
     name: item.model,
     value: item.total_all_count
   }));
   ```

---

### 6. API Rate Limiting Issues

**Symptoms:**
- HTTP 429 responses
- "Too Many Requests" errors
- API calls being rejected

**Solutions:**

1. **Implement exponential backoff:**
   ```typescript
   const fetchWithRetry = async (url, retries = 3) => {
     try {
       const response = await fetch(url);
       if (response.status === 429 && retries > 0) {
         await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
         return fetchWithRetry(url, retries - 1);
       }
       return response;
     } catch (error) {
       if (retries > 0) {
         await new Promise(resolve => setTimeout(resolve, 1000));
         return fetchWithRetry(url, retries - 1);
       }
       throw error;
     }
   };
   ```

2. **Reduce API call frequency:**
   - Cache responses locally
   - Implement request debouncing
   - Use longer cache TTL values

---

## Diagnostic Commands

### Check API Health
```bash
curl https://gpuscout-platform.nenad-a7c.workers.dev/health
```

### Test Specific Endpoints
```bash
# GPU Stats
curl https://gpuscout-platform.nenad-a7c.workers.dev/api/market/gpu-stats

# Offers
curl https://gpuscout-platform.nenad-a7c.workers.dev/api/market/offers?limit=10

# Hosts  
curl https://gpuscout-platform.nenad-a7c.workers.dev/api/market/hosts
```

### Check Cron Job Status
```bash
curl https://gpuscout-platform.nenad-a7c.workers.dev/api/scheduled/status
```

### Manual Data Collection
```bash
curl -X POST https://gpuscout-platform.nenad-a7c.workers.dev/api/scheduled/trigger?job=collection
```

---

## Environment Verification

### Cloudflare Workers
- **URL**: https://gpuscout-platform.nenad-a7c.workers.dev
- **Database**: D1 database properly connected
- **KV**: Cache namespace configured
- **Cron Jobs**: 5 scheduled jobs active

### Cloudflare Pages  
- **URL**: https://b2e4c0f5.gpuscout-frontend.pages.dev/
- **Build**: Next.js static export
- **API Integration**: Absolute URLs to Workers backend

---

## Getting Help

If issues persist after following this guide:

1. **Check console logs** in browser developer tools
2. **Review Cloudflare dashboard** for deployment errors
3. **Test APIs directly** using curl commands above
4. **Verify data collection** is running via status endpoint

## Recent Fixes Applied

### July 26, 2025 - Frontend API Integration Fix
- **Issue**: Relative API URLs failing on Cloudflare Pages
- **Fix**: Updated `frontend/src/app/dashboard/page.tsx` to use absolute URLs
- **Result**: Dashboard now displays live data from 14,879 GPU units across 81 models

This troubleshooting guide covers the most common issues encountered during dashboard deployment and operation. Keep this updated as new issues are discovered and resolved.