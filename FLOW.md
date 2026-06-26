# VkTori Legal — System Flow

## 1. Public Website Flow
1. Visitor lands on Victoria Tulsidas Law website.
2. Visitor browses firm information and services.
3. Visitor either:
   - submits contact/intake form, or
   - enters client portal login.
4. Contact/intake form creates a Lead.

## 2. Lead / Intake Flow
1. Lead is created from website or internal manual entry.
2. Admin reviews lead.
3. Lead status moves through:
   - `new`
   - `screening`
   - `consultation_set`
   - `retained`
   - `declined`
   - `archived`
4. If retained, lead is converted to Client.
5. Admin may create a Matter immediately after conversion.

## 3. Client Flow
1. Client record is created.
2. Portal user may be linked to client.
3. Client can later log in and only see their own matters and related client-safe data.

## 4. Matter Flow
1. Admin/Lawyer creates matter.
2. Matter is assigned to a client and optionally a lawyer.
3. Matter status lifecycle:
   - `pending`
   - `active`
   - `completed`
4. All docs, messages, invoices, payments, drafts, and activity are attached to matter.

## 5. Matter Workspace Flow
### Internal workspace (Admin/Lawyer)
Tabs:
- Overview
- Documents
- Communications / Messages
- Billing
- Activity
- Templates / Drafts

### Client workspace
Tabs/features:
- Overview
- Documents
- Billing
- Messages
- Pending signatures/shared drafts

## 6. Documents Flow
1. User uploads document to matter.
2. Document is stored as internal or client-shared.
3. Client portal shows only client-shared documents.
4. Activity log records upload/share actions.

## 7. Communications Flow
1. Admin/Lawyer sends message on matter.
2. Communication is linked to matter.
3. Internal-only notes stay hidden from client.
4. Client-visible messages appear in client portal.
5. Activity log records communication events.

## 8. Billing Flow
1. Admin/Lawyer creates invoice for matter.
2. Invoice status starts as `draft` or `pending`.
3. Client can view invoice in portal.
4. Payment is recorded against invoice.
5. Invoice/payment state updates matter billing summary.

## 9. Draft / Template Flow
1. Admin/Lawyer creates draft inside matter.
2. Draft starts as `draft`.
3. Draft may move to `ready`.
4. Admin/Lawyer sends draft for signature.
5. Draft status becomes `sent_for_signature`.

## 10. Client Signature Flow
1. Client sees pending signature item in portal.
2. Client opens Review & Sign.
3. Client signs via digital signature pad.
4. Draft status becomes `signed`.
5. Signature metadata is stored.
6. Activity log records sign event.

## 11. Dashboard Flow
### Admin dashboard
Aggregates from:
- leads
- matters
- invoices
- activities
- communications
- deadlines (future)

### Lawyer dashboard
Aggregates from:
- assigned matters
- recent activity
- matter messages
- billing summaries

### Client dashboard
Aggregates from:
- own matters
- upcoming updates
- outstanding invoices
- pending signatures

## 12. Marketing Flow
1. Website visit / channel generates lead.
2. Lead stores source.
3. Lead may convert to retained client.
4. Matter may later tie to revenue.
5. Reporting can attribute revenue/conversion back to source.
