# VkTori Legal — Database Design

## General database rules
- Use lowercase table names
- Use snake_case column names
- Include `created_at` and `updated_at` where appropriate
- Use soft delete only where needed; otherwise use `is_active`
- Use foreign keys for all relationships

## Core entities overview
Website -> Lead -> Client -> Matter -> Documents / Communications / Billing / Drafts / Signatures

---

## users
Used for authentication and role-based access.

### columns
- id
- full_name
- email (unique)
- password_hash
- role (`admin`, `lawyer`, `client`)
- is_active
- created_at
- updated_at

---

## leads
Stores public website contact/intake submissions and manual leads.

### columns
- id
- full_name
- email
- phone
- matter_type
- practice_area
- source
- message
- status (`new`, `screening`, `consultation_set`, `retained`, `declined`, `archived`)
- notes
- created_by_user_id (nullable)
- converted_client_id (nullable)
- created_at
- updated_at

---

## clients
Stores client profile/contact information.

### columns
- id
- user_id (nullable, unique when portal enabled)
- full_name
- email
- phone
- address_line_1 (nullable)
- address_line_2 (nullable)
- city (nullable)
- state (nullable)
- postal_code (nullable)
- notes (nullable)
- is_portal_enabled
- created_at
- updated_at

---

## lawyers
Optional profile layer for lawyers if needed beyond `users`.

### columns
- id
- user_id (unique)
- display_name
- practice_focus (nullable)
- phone (nullable)
- is_active
- created_at
- updated_at

---

## matters
Core legal workspace entity.

### columns
- id
- matter_number (unique)
- title
- client_id
- assigned_lawyer_id (nullable, references users or lawyers)
- practice_area
- matter_type
- opposing_party_name (nullable)
- description (nullable)
- status (`pending`, `active`, `completed`)
- opened_at (nullable)
- closed_at (nullable)
- created_by_user_id
- created_at
- updated_at

---

## matter_contacts
Optional future table for related parties/contacts on matters.

### columns
- id
- matter_id
- contact_type (`client`, `opposing_party`, `co_counsel`, `other`)
- full_name
- email (nullable)
- phone (nullable)
- notes (nullable)
- created_at
- updated_at

---

## matter_status_history
Tracks matter status changes.

### columns
- id
- matter_id
- old_status
- new_status
- changed_by_user_id
- note (nullable)
- created_at

---

## documents
Stores document/file metadata.

### columns
- id
- matter_id
- uploaded_by_user_id
- file_name
- original_name
- mime_type
- file_path
- file_size
- visibility (`internal`, `client_shared`)
- category (nullable)
- is_signature_required
- created_at
- updated_at

---

## communications
Stores matter-linked portal messages/correspondence.

### columns
- id
- matter_id
- sender_user_id
- sender_role
- message_body
- visibility (`internal`, `client_visible`)
- communication_type (`portal_message`, `note`, `email_log`, `call_log`, `meeting_log`)
- created_at
- updated_at

---

## invoices
Stores billing/invoice records.

### columns
- id
- matter_id
- invoice_number (unique)
- description
- amount
- due_date (nullable)
- status (`draft`, `pending`, `paid`, `overdue`, `void`)
- issued_at (nullable)
- paid_at (nullable)
- created_by_user_id
- created_at
- updated_at

---

## payments
Stores payments against invoices.

### columns
- id
- invoice_id
- matter_id
- amount
- payment_method (nullable)
- payment_reference (nullable)
- paid_on
- created_by_user_id (nullable)
- created_at
- updated_at

---

## drafts
Stores matter-linked templates/drafts.

### columns
- id
- matter_id
- title
- category
- content
- status (`draft`, `ready`, `sent_for_signature`, `signed`)
- created_by_user_id
- last_updated_by_user_id (nullable)
- sent_for_signature_at (nullable)
- signed_at (nullable)
- created_at
- updated_at

---

## signatures
Stores signature metadata linked to drafts.

### columns
- id
- draft_id
- signed_by_user_id
- signature_data (text / longtext for base64 or future path)
- signed_at
- ip_address (nullable)
- device_info (nullable)
- created_at

---

## activities
Generic activity feed for timeline rendering.

### columns
- id
- matter_id (nullable)
- actor_user_id (nullable)
- entity_type (`lead`, `client`, `matter`, `document`, `invoice`, `payment`, `draft`, `signature`, `message`)
- entity_id
- action
- description
- created_at

---

## marketing_sources
Optional source dictionary for attribution.

### columns
- id
- name
- channel_type (`direct`, `referral`, `instagram`, `facebook`, `linkedin`, `google`, `other`)
- is_active
- created_at
- updated_at

---

## lead_source_events
Optional tracking table for marketing attribution.

### columns
- id
- lead_id
- marketing_source_id
- landing_page (nullable)
- campaign_name (nullable)
- created_at

## Minimum MVP relationships
- one user can belong to one role
- one client may optionally have one portal user
- one client can have many matters
- one matter can have many documents
- one matter can have many communications
- one matter can have many invoices
- one invoice can have many payments
- one matter can have many drafts
- one draft can have one or many signatures depending on future expansion

## Prisma design note
You can start simple and keep `lawyers` optional; `users.role = lawyer` may be enough for MVP.
