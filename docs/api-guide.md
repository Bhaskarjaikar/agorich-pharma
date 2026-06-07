# Agorich Pharma API Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [Error Codes](#error-codes)
5. [API Reference](#api-reference)
6. [Code Examples](#code-examples)
7. [Common Use Cases](#common-use-cases)

---

## Getting Started

### Base URL

| Environment | Base URL |
|-------------|----------|
| Production | `https://api.agorichpharma.com` |
| Staging | `https://staging-api.agorichpharma.com` |
| Local | `http://localhost:3000` |

### API Version

Current version: **v1** (implicit in URL path)

### Making Your First Request

```bash
# Get overdue AR list (requires Agent API Key)
curl -X GET "https://api.agorichpharma.com/api/agent-connect/ar-overdue" \
  -H "x-agent-api-key: your-api-key-here"
```

---

## Authentication

### Authentication Methods

Agorich Pharma API supports three authentication methods:

#### 1. Agent API Key (Backend-to-Backend)

Used for server-to-server communication between backend services.

```bash
curl -X GET "https://api.agorichpharma.com/api/agent-connect/ar-overdue" \
  -H "x-agent-api-key: your-agent-api-key"
```

#### 2. Admin API Key (Administrative Operations)

Used for administrative operations like emergency stops.

```bash
curl -X POST "https://api.agorichpharma.com/api/admin/emergency/stop" \
  -H "x-admin-api-key: your-admin-api-key" \
  -H "Content-Type: application/json" \
  -d '{"level": "FULL_STOP", "reason": "System maintenance"}'
```

#### 3. JWT Bearer Token (User Authentication)

Used for user-facing applications. Tokens are obtained through Supabase Auth.

```bash
curl -X GET "https://api.agorichpharma.com/api/invoices" \
  -H "Authorization: Bearer your-jwt-token"
```

### Getting API Keys

| Key Type | Where to Get |
|----------|--------------|
| Agent API Key | Environment variable `AGENT_API_KEY` |
| Admin API Key | Environment variable `ADMIN_API_KEY` |
| JWT Token | Supabase Auth (`/auth/v1/token`) |

---

## Rate Limiting

### Limits by Endpoint Type

| Endpoint Type | Limit |
|---------------|-------|
| General API | 100 requests/minute |
| AI Endpoints | 20 requests/minute |
| Webhook Endpoints | 200 requests/minute |

### Rate Limit Headers

Response headers include rate limit information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

### Handling Rate Limits

When rate limited, you receive a `429 Too Many Requests` response:

```json
{
  "success": false,
  "error": "Rate limit exceeded. Please retry after 60 seconds."
}
```

**Best Practice:** Implement exponential backoff with jitter:

```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || 60;
      await sleep(retryAfter * 1000 * Math.pow(2, i) + Math.random() * 1000);
      continue;
    }

    return response;
  }
  throw new Error('Max retries exceeded');
}
```

---

## Error Codes

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid or missing authentication |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

### Error Response Format

```json
{
  "success": false,
  "error": "Descriptive error message"
}
```

### Common Error Codes

| Error | Cause | Solution |
|-------|-------|----------|
| `Unauthorized: Invalid API key` | Wrong or expired API key | Verify your API key is correct |
| `Unauthorized` | Missing authentication | Add auth header to request |
| `Forbidden` | Insufficient permissions | Check user role permissions |
| `Not found` | Resource doesn't exist | Verify resource ID |
| `Rate limit exceeded` | Too many requests | Wait and retry with backoff |
| `Server configuration error` | Backend misconfiguration | Check server environment |

---

## API Reference

### Agent Connect

#### Get Overdue AR

```http
GET /api/agent-connect/ar-overdue
```

Retrieves all customers with overdue payments for collection calls.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "customer_id": "cust-123",
      "business_name": "Apollo Pharmacy",
      "name": "Rajesh Kumar",
      "phone": "+919876543210",
      "overdue_amount": 45000,
      "overdue_invoices_count": 3
    }
  ],
  "count": 1
}
```

#### Trigger Collection Calls

```http
POST /api/cron/trigger-vapi-calls
```

Triggers VAPI AI agent calls to all overdue customers.

### Command Center

#### Chat with AI

```http
POST /api/command-center/chat
```

Natural language interface to query business data.

**Request Body:**
```json
{
  "message": "Show me top 5 retailers with highest overdue",
  "context": {
    "region": "Maharashtra",
    "timeframe": "30days"
  }
}
```

### Admin

#### Emergency Stop

```http
POST /api/admin/emergency/stop
```

**Levels:**
- `FULL_STOP` - Complete system shutdown
- `AGENT_PAUSE` - Pause AI agents only
- `APPROVAL_MODE` - Require approval for all actions

### Approvals

#### Submit for Approval

```http
POST /api/approvals/queue
```

Actions exceeding certain thresholds require approval.

---

## Code Examples

### cURL

#### GET Request

```bash
# Get overdue AR
curl -X GET "http://localhost:3000/api/agent-connect/ar-overdue" \
  -H "x-agent-api-key: your-api-key"

# Get invoices
curl -X GET "http://localhost:3000/api/invoices?page=1&limit=20" \
  -H "Authorization: Bearer your-jwt-token"
```

#### POST Request

```bash
# Apply discount
curl -X POST "http://localhost:3000/api/agent-connect/apply-discount" \
  -H "x-agent-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice_id": "inv-123",
    "discount_type": "percentage",
    "discount_value": 10,
    "reason": "Loyalty discount"
  }'

# Emergency stop
curl -X POST "http://localhost:3000/api/admin/emergency/stop" \
  -H "x-admin-api-key: your-admin-key" \
  -H "Content-Type: application/json" \
  -d '{
    "level": "AGENT_PAUSE",
    "reason": "Scheduled maintenance"
  }'
```

### JavaScript (Fetch)

```javascript
// Base configuration
const API_BASE = 'http://localhost:3000';

async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
}

// Get Overdue AR
async function getOverdueAR() {
  return apiRequest('/api/agent-connect/ar-overdue', {
    headers: { 'x-agent-api-key': process.env.AGENT_API_KEY },
  });
}

// Trigger Collection Calls
async function triggerCollectionCalls() {
  return apiRequest('/api/cron/trigger-vapi-calls', {
    method: 'POST',
    headers: { 'x-agent-api-key': process.env.AGENT_API_KEY },
  });
}

// Apply Discount
async function applyDiscount(invoiceId, discountType, value, reason) {
  return apiRequest('/api/agent-connect/apply-discount', {
    method: 'POST',
    headers: { 'x-agent-api-key': process.env.AGENT_API_KEY },
    body: JSON.stringify({
      invoice_id: invoiceId,
      discount_type: discountType,
      discount_value: value,
      reason: reason,
    }),
  });
}

// Emergency Stop
async function emergencyStop(level, reason) {
  return apiRequest('/api/admin/emergency/stop', {
    method: 'POST',
    headers: { 'x-admin-api-key': process.env.ADMIN_API_KEY },
    body: JSON.stringify({ level, reason }),
  });
}

// Submit for Approval
async function submitForApproval(actionType, actionData, requestedBy) {
  return apiRequest('/api/approvals/queue', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getAuthToken()}` },
    body: JSON.stringify({ actionType, actionData, requestedBy }),
  });
}

// Example usage
async function main() {
  try {
    // Get overdue AR
    const overdue = await getOverdueAR();
    console.log('Overdue customers:', overdue.data.length);

    // Trigger calls
    const result = await triggerCollectionCalls();
    console.log('Calls initiated:', result.callsInitiated);
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

### Python (requests)

```python
import requests
import os
from typing import Optional, Dict, Any

API_BASE = "http://localhost:3000"

class AgorichAPI:
    def __init__(self, agent_api_key: str = None, admin_api_key: str = None):
        self.agent_api_key = agent_api_key or os.getenv("AGENT_API_KEY")
        self.admin_api_key = admin_api_key or os.getenv("ADMIN_API_KEY")
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})

    def _request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        url = f"{API_BASE}{endpoint}"

        if "x-agent-api-key" in kwargs.get("headers", {}):
            self.session.headers.update(kwargs.pop("headers"))
        elif self.agent_api_key:
            self.session.headers.update({"x-agent-api-key": self.agent_api_key})

        response = self.session.request(method, url, **kwargs)
        response.raise_for_status()
        return response.json()

    def get_overdue_ar(self) -> Dict[str, Any]:
        """Get all overdue accounts receivable."""
        return self._request("GET", "/api/agent-connect/ar-overdue")

    def trigger_collection_calls(self) -> Dict[str, Any]:
        """Trigger VAPI collection calls."""
        return self._request("POST", "/api/cron/trigger-vapi-calls")

    def apply_discount(
        self,
        invoice_id: str,
        discount_type: str,
        discount_value: float,
        reason: str
    ) -> Dict[str, Any]:
        """Apply discount to invoice."""
        return self._request("POST", "/api/agent-connect/apply-discount", json={
            "invoice_id": invoice_id,
            "discount_type": discount_type,
            "discount_value": discount_value,
            "reason": reason
        })

    def emergency_stop(self, level: str, reason: str) -> Dict[str, Any]:
        """Activate emergency stop."""
        headers = {"x-admin-api-key": self.admin_api_key}
        return self._request("POST", "/api/admin/emergency/stop", json={
            "level": level,
            "reason": reason
        }, headers=headers)

    def get_approval_queue(self, status: str = "pending") -> Dict[str, Any]:
        """Get approval queue."""
        return self._request("GET", f"/api/approvals/queue?status={status}")

    def approve_request(self, approval_id: str, approved_by: str) -> Dict[str, Any]:
        """Approve a pending request."""
        return self._request("POST", f"/api/approvals/{approval_id}/approve", json={
            "approvedBy": approved_by
        })

    def get_invoices(self, page: int = 1, limit: int = 20) -> Dict[str, Any]:
        """Get paginated invoices."""
        return self._request("GET", f"/api/invoices?page={page}&limit={limit}")

    def chat_command(self, message: str, context: dict = None) -> Dict[str, Any]:
        """Chat with command center AI."""
        return self._request("POST", "/api/command-center/chat", json={
            "message": message,
            "context": context or {}
        })


# Example usage
if __name__ == "__main__":
    api = AgorichAPI()

    try:
        # Get overdue AR
        overdue = api.get_overdue_ar()
        print(f"Overdue customers: {overdue['count']}")

        # Trigger collection calls
        result = api.trigger_collection_calls()
        print(f"Calls initiated: {result.get('callsInitiated', 0)}")

        # Emergency stop
        result = api.emergency_stop("AGENT_PAUSE", "Scheduled maintenance")
        print(f"Emergency stop: {result['message']}")

    except requests.exceptions.HTTPError as e:
        print(f"HTTP Error: {e}")
        if e.response:
            print(e.response.json())
```

### Postman

#### Environment Setup

```json
{
  "id": "agorich-api-env",
  "name": "Agorich API",
  "values": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000",
      "type": "default"
    },
    {
      "key": "agentApiKey",
      "value": "your-agent-api-key",
      "type": "secret"
    },
    {
      "key": "adminApiKey",
      "value": "your-admin-api-key",
      "type": "secret"
    },
    {
      "key": "authToken",
      "value": "your-jwt-token",
      "type": "secret"
    }
  ]
}
```

#### Collection Variables (Pre-request Script)

```javascript
// Set default headers for all requests
pm.request.headers.add({
    key: "x-agent-api-key",
    value: pm.environment.get("agentApiKey")
});
```

#### Test Script Example

```javascript
// Test: Verify response is successful
pm.test("Response is successful", function() {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});

// Test: Verify response has data
pm.test("Has data array", function() {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('data');
});
```

---

## Common Use Cases

### 1. Trigger a Collection Call

```javascript
async function triggerCollectionCall(customerPhone) {
  // Step 1: Get overdue AR
  const overdue = await getOverdueAR();

  // Step 2: Find customer
  const customer = overdue.data.find(c => c.phone === customerPhone);

  if (!customer) {
    throw new Error('Customer not found or not overdue');
  }

  // Step 3: Trigger call via cron endpoint
  const result = await triggerCollectionCalls();

  return {
    customer: customer.business_name,
    amount: customer.overdue_amount,
    callsInitiated: result.callsInitiated
  };
}
```

### 2. Check Inventory Alerts

```javascript
async function checkInventoryAlerts(type = 'all') {
  const response = await apiRequest(
    `/api/agent-connect/inventory-alerts?type=${type}`,
    {
      headers: { 'x-agent-api-key': process.env.AGENT_API_KEY }
    }
  );

  return response.data.filter(alert => {
    if (type !== 'all') return alert.alert_type === type;
    return true;
  });
}

// Usage
const lowStock = await checkInventoryAlerts('low_stock');
const expiring = await checkInventoryAlerts('expiry');
```

### 3. Use Command Center

```javascript
async function queryCommandCenter(question) {
  const response = await apiRequest('/api/command-center/chat', {
    method: 'POST',
    body: JSON.stringify({
      message: question,
      context: {
        region: 'Maharashtra',
        timeframe: '30days'
      }
    })
  });

  return response;
}

// Example queries
const topRetailers = await queryCommandCenter(
  "Show me top 5 retailers with highest overdue payments"
);
const salesReport = await queryCommandCenter(
  "Generate sales report for this month"
);
```

### 4. Approve Pending Actions

```javascript
async function approvePendingAction(approvalId, approvedBy) {
  // Step 1: Get pending approvals
  const queue = await apiRequest('/api/approvals/queue?status=pending');

  // Step 2: Find the specific approval
  const approval = queue.data.find(a => a.id === approvalId);

  if (!approval) {
    throw new Error('Approval not found');
  }

  // Step 3: Approve
  const result = await apiRequest(`/api/approvals/${approvalId}/approve`, {
    method: 'POST',
    body: JSON.stringify({
      approvedBy,
      notes: 'Approved after verification'
    })
  });

  return result;
}

// Or reject
async function rejectApproval(approvalId, rejectedBy, reason) {
  return apiRequest(`/api/approvals/${approvalId}/reject`, {
    method: 'POST',
    body: JSON.stringify({
      rejectedBy,
      reason
    })
  });
}
```

### 5. Emergency Stop Procedures

```javascript
async function activateEmergencyStop(level, reason, adminId) {
  const validLevels = ['FULL_STOP', 'AGENT_PAUSE', 'APPROVAL_MODE'];

  if (!validLevels.includes(level)) {
    throw new Error(`Invalid level. Use: ${validLevels.join(', ')}`);
  }

  return apiRequest('/api/admin/emergency/stop', {
    method: 'POST',
    headers: { 'x-admin-api-key': process.env.ADMIN_API_KEY },
    body: JSON.stringify({ level, reason, adminId })
  });
}

async function resumeOperations(reason, adminId) {
  return apiRequest('/api/admin/emergency/resume', {
    method: 'POST',
    headers: { 'x-admin-api-key': process.env.ADMIN_API_KEY },
    body: JSON.stringify({ reason, adminId })
  });
}

// Usage
await activateEmergencyStop('AGENT_PAUSE', 'Scheduled maintenance 2-4 PM', 'admin-001');
// ... perform maintenance ...
await resumeOperations('Maintenance complete', 'admin-001');
```

---

## Support

- **Email:** tech@agorichpharma.com
- **Documentation:** https://docs.agorichpharma.com
- **API Status:** https://status.agorichpharma.com