# RBAC.md

# VkTori Legal — Role-Based Access Control

## Purpose

This file defines role-based access control for the VkTori Legal system based on the current frontend structure, planned backend modules, and the approved project flow.

Public law firm brand: **Victoria Tulsidas Law**  
Internal software/system name: **VkTori**

The system is matter-centric. Access is determined by:
- authenticated user role
- matter ownership/assignment
- module-level permission
- client-safe visibility rules

---

## Core roles

### 1. Admin
Full operational and system access.

### 2. Lawyer
Operational access limited to assigned matters, assigned clients, related documents, communications, and limited billing views/actions.

### 3. Client
Restricted portal access to only their own shared data.

---

## Future roles (not required for MVP, but reserved)

### 4. Intake / Sales / Marketing
Lead capture, screening, consultation scheduling, source tracking.

### 5. Bookkeeper / Billing
Billing, invoice, payment, and financial operations.

### 6. Co-Counsel
Restricted matter-specific collaboration access.

---

## Access model

Access is controlled at 4 levels:

1. Route-level access  
2. Module-level access  
3. Record-level access  
4. Field/view-level access  

---

## Route-level access

### Public routes
Accessible without login:
- Website pages
- Contact form
- Consultation / intake form
- Client portal login page

### Protected routes
Require authentication:
- Admin pages
- Lawyer pages
- Client portal pages
- Matter workspaces
- Internal dashboards
- Billing views
- Communications
- Documents
- Drafts / eSign flows

---

## Role-to-portal mapping

| Role | Primary portal |
|------|----------------|
| Admin | Admin dashboard |
| Lawyer | Lawyer dashboard |
| Client | Client portal |

After login:
- admin → admin routes
- lawyer → lawyer routes
- client → client routes

---

## Module-level permissions

### Dashboard
| Action | Admin | Lawyer | Client |
|--------|-------|--------|--------|
| View own dashboard | Yes | Yes | Yes |
| View firm-wide metrics | Yes | No | No |
| View assigned metrics | Yes | Yes | Limited |

### Leads / Intake
| Action | Admin | Lawyer | Client |
|--------|-------|--------|--------|
| View leads | Yes | Optional/limited | No |
| Create lead manually | Yes | Optional | No |
| Update lead status | Yes | Optional | No |
| Convert lead to client | Yes | No | No |
| Archive/decline lead | Yes | No | No |

### Clients
| Action | Admin | Lawyer | Client |
|--------|-------|--------|--------|
| View client list | Yes | Assigned only | No |
| View client detail | Yes | Assigned only | Own profile only |
| Create client | Yes | No | No |
| Edit client | Yes | Limited assigned only | Own limited profile only |
| Delete client | Yes | No | No |

### Matters
| Action | Admin | Lawyer | Client |
|--------|-------|--------|--------|
| View matter list | Yes | Assigned only | Own only |
| View matter detail | Yes | Assigned only | Own only |
| Create matter | Yes | Optional if allowed | No |
| Assign lawyer | Yes | No | No |
| Update matter status | Yes | Yes on assigned matters | No |
| Edit matter details | Yes | Limited assigned only | No |
| Archive/close matter | Yes | Optional if allowed | No |

### Documents
| Action | Admin | Lawyer | Client |
|--------|-------|--------|--------|
| View documents | Yes | Assigned matter docs | Shared docs only |
| Upload documents | Yes | Yes on assigned matters | Yes if portal upload enabled |
| Delete documents | Yes | Limited assigned only | No |
| Mark document shared with client | Yes | Yes on assigned matters | No |
| Download documents | Yes | Assigned matter docs | Shared docs only |

### Communications
| Action | Admin | Lawyer | Client |
|--------|-------|--------|--------|
| View communications | Yes | Assigned matter only | Own portal-visible only |
| Send message | Yes | Yes | Yes in own portal thread |
| View internal notes | Yes | Assigned only | No |
| View client-visible messages | Yes | Yes | Yes own only |
| Log calls/meetings | Yes | Yes | No |

### Billing / Invoices / Payments
| Action | Admin | Lawyer | Client |
|--------|-------|--------|--------|
| View billing summary | Yes | Assigned matters only | Own matters only |
| Create invoice | Yes | Optional/limited | No |
| Edit invoice | Yes | Limited if allowed | No |
| Mark invoice paid | Yes | No | No |
| View payment status | Yes | Assigned only | Own only |
| View full firm finance | Yes | No | No |

### Drafts / Templates / eSign
| Action | Admin | Lawyer | Client |
|--------|-------|--------|--------|
| View templates | Yes | Yes | No |
| Create draft | Yes | Yes on assigned matters | No |
| View draft | Yes | Yes on assigned matters | Shared/pending-sign docs only |
| Send for signature | Yes | Yes on assigned matters | No |
| Review & sign | No | No | Yes own pending items only |
| View signed artifact | Yes | Assigned matter only | Own signed items only |

### Marketing / Reports
| Action | Admin | Lawyer | Client |
|--------|-------|--------|--------|
| View marketing analytics | Yes | No | No |
| View intake conversion reports | Yes | No | No |
| View matter-level reports | Yes | Limited assigned only | No |
| View portal activity summary | Yes | No | No |

### User Management
| Action | Admin | Lawyer | Client |
|--------|-------|--------|--------|
| View users | Yes | No | No |
| Create users | Yes | No | No |
| Edit users | Yes | No | No |
| Activate/deactivate users | Yes | No | No |
| Assign roles | Yes | No | No |

### Settings
| Action | Admin | Lawyer | Client |
|--------|-------|--------|--------|
| View own profile/settings | Yes | Yes | Yes |
| Update own password | Yes | Yes | Yes |
| Update system settings | Yes | No | No |

---

## Record-level access rules

### Admin
Admin can access all records unless a future organization/firm partition is added.

### Lawyer
Lawyer can access only:
- matters assigned to them
- clients linked to those matters
- documents attached to assigned matters
- communications attached to assigned matters
- billing summaries for assigned matters
- drafts and signatures for assigned matters

### Client
Client can access only:
- their own profile
- their own matters
- client-safe matter overview
- shared documents
- client-visible messages
- own invoices/payment status
- pending signature items assigned to them
- signed documents shared with them

---

## Field/view-level restrictions

### Client must NOT see
- internal notes
- strategy notes
- private billing notes
- internal communications
- staff-only comments
- other clients or matters
- firm-wide analytics
- internal workflow actions
- lead management screens
- user management

### Lawyer must NOT see
- admin-only user management
- firm-wide system settings
- full marketing analytics
- global revenue dashboards if restricted

---

## Ownership rules

### Matter ownership
A matter belongs to:
- one primary client
- one assigned lawyer (MVP assumption)
- one or more internal/admin users with elevated access

### Document ownership
A document belongs to:
- one matter
- one uploader
- one visibility scope:
  - internal
  - client_shared
  - signature_pending
  - signed_shared

### Communication ownership
A communication belongs to:
- one matter
- one sender
- one visibility scope:
  - internal
  - client_visible

---

## Frontend visibility rules

The frontend should hide UI that the user cannot access, but backend authorization is the source of truth.

### Examples
- Client portal should not render admin/lawyer actions
- Lawyer UI should not show user management
- Admin-only actions should not appear for lawyer/client
- “Send for Signature” should not appear in client portal
- “Review & Sign” should appear only for client pending signature items

---

## Backend authorization rules

The backend must enforce access even if a user manually tries URLs or API requests.

Examples:
- client cannot request another client’s matter
- lawyer cannot access unassigned matter
- client cannot open internal document
- lawyer cannot edit users
- client cannot create invoice

Return:
- 401 for unauthenticated
- 403 for authenticated but unauthorized
- 404 optionally for hidden resource strategy if needed

---

## Suggested middleware design

### authMiddleware
Validates JWT and attaches:
- user id
- role
- profile linkage

### roleMiddleware(...roles)
Allows access only for listed roles.

Example:
- roleMiddleware("admin")
- roleMiddleware("admin", "lawyer")

### matterAccessMiddleware
Checks whether:
- admin can access any matter
- lawyer is assigned to matter
- client owns the matter

### clientSafeViewMiddleware
Filters out internal-only fields before sending response to clients.

---

## Suggested permission constants

```js
export const ROLES = {
  ADMIN: "admin",
  LAWYER: "lawyer",
  CLIENT: "client",
};

export const DOC_VISIBILITY = {
  INTERNAL: "internal",
  CLIENT_SHARED: "client_shared",
  SIGNATURE_PENDING: "signature_pending",
  SIGNED_SHARED: "signed_shared",
};

export const MESSAGE_VISIBILITY = {
  INTERNAL: "internal",
  CLIENT_VISIBLE: "client_visible",
};
```

---

## API protection examples

### Admin-only
- POST /api/users
- PATCH /api/users/:id/role
- POST /api/matters
- POST /api/leads/convert
- GET /api/reports/marketing

### Admin + Lawyer
- GET /api/matters
- GET /api/matters/:id
- PATCH /api/matters/:id/status
- POST /api/documents
- POST /api/drafts
- POST /api/drafts/:id/send-for-signature

### Client-only
- GET /api/client/matters
- GET /api/client/documents
- GET /api/client/invoices
- POST /api/client/signatures/:draftId/sign

---

## Recommended MVP role set

For current build:
- admin
- lawyer
- client

Use only these 3 roles in backend v1.

Future roles can be added later without changing the core RBAC model.

---

## Final rule

Frontend visibility is convenience.  
Backend authorization is security.

Never rely on hidden buttons alone.
