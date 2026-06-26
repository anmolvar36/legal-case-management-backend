# VkTori Legal — API Specification

## Base URL
`/api`

## Auth
### POST /api/auth/login
Login with email and password.

#### body
```json
{
  "email": "admin@example.com",
  "password": "secret123"
}
```

### GET /api/auth/me
Return current authenticated user profile.

---

## Dashboard
### GET /api/dashboard/admin
Returns admin dashboard aggregates.

### GET /api/dashboard/lawyer
Returns lawyer-specific dashboard data.

### GET /api/dashboard/client
Returns client-specific dashboard data.

---

## Leads / Intake
### POST /api/leads
Create a new lead from website or internal intake.

### GET /api/leads
List leads with filters.

### GET /api/leads/:id
Fetch a single lead.

### PUT /api/leads/:id
Update lead details or status.

### POST /api/leads/:id/convert
Convert retained lead into client and optionally create matter.

---

## Clients
### POST /api/clients
Create a client manually.

### GET /api/clients
List clients.

### GET /api/clients/:id
Fetch client detail.

### PUT /api/clients/:id
Update client profile.

---

## Matters
### POST /api/matters
Create a matter.

### GET /api/matters
List matters with role-aware filtering.

### GET /api/matters/:id
Fetch matter detail.

### PUT /api/matters/:id
Update matter detail.

### PATCH /api/matters/:id/status
Update matter status.

### GET /api/matters/:id/overview
Matter overview payload.

### GET /api/matters/:id/activity
Matter activity timeline.

---

## Documents
### POST /api/matters/:id/documents
Upload a document metadata/file.

### GET /api/matters/:id/documents
List matter documents.

### GET /api/documents/:id
Fetch single document metadata.

### PATCH /api/documents/:id/share
Mark document as client-shared or internal.

---

## Communications
### POST /api/matters/:id/messages
Create a matter communication/message.

### GET /api/matters/:id/messages
List matter messages/communications.

### POST /api/matters/:id/notes
Create internal note (admin/lawyer only).

---

## Billing
### POST /api/matters/:id/invoices
Create invoice for a matter.

### GET /api/matters/:id/invoices
List invoices for a matter.

### GET /api/invoices/:id
Fetch invoice detail.

### PATCH /api/invoices/:id/status
Update invoice status.

### POST /api/invoices/:id/payments
Record payment against invoice.

### GET /api/matters/:id/billing-summary
Matter billing summary.

---

## Drafts / Templates
### POST /api/matters/:id/drafts
Create matter draft.

### GET /api/matters/:id/drafts
List drafts for matter.

### GET /api/drafts/:id
Fetch draft detail.

### PUT /api/drafts/:id
Update draft content/status.

### PATCH /api/drafts/:id/send-for-signature
Update draft status to `sent_for_signature`.

### PATCH /api/drafts/:id/sign
Complete client sign action and mark signed.

---

## Client Portal
### GET /api/client/matters
Return only client-owned matters.

### GET /api/client/matters/:id
Return client-safe matter detail.

### GET /api/client/matters/:id/documents
Return client-shared docs only.

### GET /api/client/matters/:id/invoices
Return client invoices for that matter.

### GET /api/client/matters/:id/messages
Return client-visible messages.

### GET /api/client/matters/:id/pending-signatures
Return pending signature items.

---

## Marketing
### GET /api/marketing/overview
Marketing overview stats.

### GET /api/marketing/sources
List marketing sources and counts.

---

## Conflicts (Phase 2)
### POST /api/conflicts/check
Run conflict check against lead/client/opposing party input.

## Notes
- Use `matters` terminology instead of `cases`
- Use `communications` terminology instead of only `email`
- All role-sensitive endpoints must enforce authorization
