# Phase 7: Template & Draft System Enhancement

This plan outlines the end-to-end implementation for the requested Draft preview, PDF download, and E-Sign workflows.

## Proposed Changes

### 1. Database Schema (`prisma/schema.prisma`)
#### [MODIFY] schema.prisma
- **Draft Model:** Add `signed_document_id Int?` to link a completed draft to its finalized PDF document.
- **New Model `SignatureRequest`:** Add model to manage secure signature requests.
  ```prisma
  model SignatureRequest {
    id              Int       @id @default(autoincrement())
    draft_id        Int
    token           String    @unique
    recipient_email String
    status          String    @default("pending") // pending, completed, expired
    expires_at      DateTime
    completed_at    DateTime?
    created_at      DateTime  @default(now())
    updated_at      DateTime  @updatedAt

    draft           Draft     @relation(fields: [draft_id], references: [id], onDelete: Cascade)
    @@map("signature_requests")
  }
  ```
*(Note: Adding `signed_document_id` to Draft will also require adding `drafts_signed Draft[]` to the `Document` model to satisfy Prisma's bidirectional relation rules).*

---

### 2. Backend & APIs (`Backend Backup/src/modules/drafts`)
#### [MODIFY] drafts.routes.js & drafts.controller.js & drafts.service.js
- **`GET /api/drafts/:id/pdf`**: Generate a PDF from the Draft `content` using `pdfkit`. Returns a buffer stream for previewing or downloading.
- **`POST /api/drafts/:id/send-signature`**: Generates a secure `SignatureRequest` token, sets expiry (e.g., 7 days), updates Draft status to `sent_for_signature`, and mocks email delivery.
- **`GET /api/drafts/signature/:token`**: Retrieves the signature request details securely for the signer.
- **`POST /api/drafts/signature/:token/sign`**: Completes the signature. Records IP, Device info, creates `Signature` record, updates Draft status to `signed`, generates the final signed PDF using `pdfkit`, saves it as a `Document` in the matter vault, and links it via `signed_document_id`.

---

### 3. Frontend (`Frontend Backup/src`)
#### [MODIFY] src/services/api.js
- Add endpoints for `downloadPdf`, `sendForSignature`, `getSignatureRequest`, and `completeSignature`.

#### [MODIFY] src/pages/AdminPages.jsx & src/pages/LawyerPages.jsx & src/pages/ClientPages.jsx
- **Draft List Actions**: Add "Preview", "Download PDF", "Send for Signature", and "View Signed Copy" buttons to draft rows.
- **Modals**: 
  - Add PDF Preview modal utilizing `<object>` or `<iframe>` to display the backend-generated PDF blob.
  - Add "Send for Signature" modal to input recipient email.
- **Status Badges**: Update UI to visually distinguish "Draft", "Sent for Signature", "Signed", and "Expired".

#### [NEW] src/pages/SignDocument.jsx (or integrated route in App.jsx)
- A secure, dedicated route `/sign/:token` for recipients to view the document and sign (draw/type signature).

---

## User Review Required

> [!WARNING]
> **Database Migrations**
> Modifying `schema.prisma` will require running `npx prisma db push` to update the MySQL database. I will ensure this is done safely without destroying existing data.

> [!IMPORTANT]
> **E-Sign Email Delivery**
> The current application does not appear to have an active SMTP integration (like SendGrid). I will implement the logic to "send" the email, but it will print the secure signing link to the backend console/logs so we can test the workflow locally without needing an actual email inbox. Is this acceptable?

## Verification Plan

### Automated/Manual Testing
- **Draft Preview & Download**: Generate a test draft, click "Preview", verify modal opens. Click "Download PDF", verify valid PDF is downloaded.
- **E-Sign Flow**: Click "Send for Signature", grab the secure token link from logs, open it in an incognito window, sign the document.
- **Vault Verification**: Verify the Draft status changes to "Signed" and the signed PDF automatically appears in the Matter's Document Vault.
- **Backward Compatibility**: Ensure existing drafts open and edit normally without crashing.
