# VkTori Legal — Product Requirements (Backend-Aligned)

## Product identity
- Public law firm brand: **Victoria Tulsidas Law**
- Internal software/platform/backend name: **VkTori**

## Product summary
VkTori Legal is a matter-centric legal operations platform for Victoria Tulsidas Law. It combines a public law firm website, lead/intake capture, internal matter management, client portal access, communications, documents, billing, templates/drafts, and later e-sign, integrations, and analytics.

## Current frontend-aligned modules
The current frontend structure already reflects these modules:
- Public Website
- Admin Portal
- Lawyer Portal
- Client Portal
- Leads / Intake
- Marketing
- Shared layout components (Sidebar, Topbar, AI assistant)

## Current frontend pages/modules
- `src/App.jsx`
- `src/pages/AdminPages.jsx`
- `src/pages/LawyerPages.jsx`
- `src/pages/ClientPages.jsx`
- `src/pages/LeadPages.jsx`
- `src/pages/MarketingPages.jsx`
- `src/website/pages/WebsitePages.jsx`
- `src/website/WebsiteLayout.jsx`
- `src/components/Sidebar.jsx`
- `src/components/Topbar.jsx`
- `src/components/VyniusAI.jsx`

## Core business flow
1. Visitor lands on public website.
2. Visitor submits contact / consultation / intake form.
3. System creates a Lead.
4. Admin reviews lead and optionally runs conflict checks.
5. Lead is converted into Client.
6. Admin/Lawyer creates a Matter.
7. Matter becomes the central workspace for documents, billing, messages, activity, drafts, and signatures.
8. Client logs in from the website and accesses their secure portal.
9. Client views updates, documents, invoices, messages, and pending signature items.
10. Marketing/reporting tracks source-to-retained-client flow.

## Roles
### Admin
- Full system access
- Reviews leads/intake
- Manages clients and matters
- Assigns lawyers
- Oversees billing, communications, documents, and user access

### Lawyer
- Access to assigned matters and clients
- Updates matter status
- Uploads documents
- Reviews billing items
- Sends drafts for signature
- Communicates with clients

### Client
- Can only access their own matters
- Views status, shared documents, invoices, messages, and pending signatures
- Uploads client-facing documents
- Completes e-sign flow in later phases / mock in current frontend

## Core modules
### 1. Public Website
- Firm branding, service presentation, consultation/contact forms, client portal entry

### 2. Leads / Intake
- Create and track leads
- Intake statuses: `new`, `screening`, `consultation_set`, `retained`, `declined`, `archived`
- Convert retained lead to client and matter

### 3. Clients
- Store client profile and contact details
- Link clients to matters

### 4. Matters
- Central legal workspace
- Includes overview, documents, communications, billing, activity, drafts/templates

### 5. Documents
- Matter-linked documents
- Shared vs internal visibility
- Later: folders, tags, versions, permissions

### 6. Communications
- Matter-linked messages / correspondence
- Later: email, calls, meetings, synced communications

### 7. Billing
- Matter-level invoices and payment status
- Later: timekeeping, payment links, bookkeeping outputs

### 8. Templates / Drafts
- Matter-linked draft documents
- Status flow: `draft -> sent_for_signature -> signed`

### 9. E-Sign
- Current frontend direction: mock client signing flow with digital signature pad
- Later: real signature persistence / audit / document finalization

### 10. Marketing
- Track source of leads and conversion path
- Later: attribution from channel to retained matter/revenue

## Matter workspace tabs
### Internal (Admin / Lawyer)
- Overview
- Documents
- Communications / Messages
- Billing
- Activity
- Templates / Drafts

### Client
- Overview
- Documents
- Billing
- Messages
- Pending signature items / shared drafts (client-safe)

## Status models
### Lead status
- `new`
- `screening`
- `consultation_set`
- `retained`
- `declined`
- `archived`

### Matter status
- `pending`
- `active`
- `completed`

### Draft status
- `draft`
- `ready`
- `sent_for_signature`
- `signed`

### Invoice status
- `draft`
- `pending`
- `paid`
- `overdue`
- `void`

## MVP scope (backend phase 1)
- Auth + JWT + role protection
- Leads / Intake CRUD
- Client CRUD
- Matter CRUD
- Matter detail endpoints
- Documents metadata endpoints
- Messages / communications endpoints
- Invoice/billing basics
- Activity log basics
- Client portal basic access
- Draft/template basics
- Mock-signature state persistence

## Phase 2
- Conflict checks
- Task/workflow automation
- Better document folders/templates
- Payment links
- Timekeeping basics
- Deeper marketing attribution

## Phase 3
- Titan / Outlook / Zoom / Teams integrations
- Bookkeeping enhancements
- Advanced dashboards
- AI summaries/search/automation
- Real document assembly and real e-sign pipeline
