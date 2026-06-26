# VkTori Legal — Backend Architecture

## Recommended stack
- Runtime: Node.js
- Framework: Express.js
- Database: MySQL
- ORM: Prisma
- Auth: JWT
- Password hashing: bcryptjs
- File uploads: Multer
- Environment config: dotenv

## Architectural style
Use a modular Express backend with clear separation of responsibilities.

### Required flow
Routes -> Controllers -> Services -> Prisma / Database

## Project structure
```txt
backend/
  src/
    app.js
    server.js
    config/
      env.js
      db.js
    routes/
      index.js
    middlewares/
      auth.middleware.js
      role.middleware.js
      error.middleware.js
      validate.middleware.js
    utils/
      jwt.js
      response.js
      pagination.js
      upload.js
    modules/
      auth/
        auth.routes.js
        auth.controller.js
        auth.service.js
        auth.schema.js
      users/
        users.routes.js
        users.controller.js
        users.service.js
      leads/
        leads.routes.js
        leads.controller.js
        leads.service.js
        leads.schema.js
      clients/
        clients.routes.js
        clients.controller.js
        clients.service.js
      matters/
        matters.routes.js
        matters.controller.js
        matters.service.js
      documents/
        documents.routes.js
        documents.controller.js
        documents.service.js
      communications/
        communications.routes.js
        communications.controller.js
        communications.service.js
      billing/
        billing.routes.js
        billing.controller.js
        billing.service.js
      drafts/
        drafts.routes.js
        drafts.controller.js
        drafts.service.js
      dashboards/
        dashboards.routes.js
        dashboards.controller.js
        dashboards.service.js
      marketing/
        marketing.routes.js
        marketing.controller.js
        marketing.service.js
      conflicts/
        conflicts.routes.js
        conflicts.controller.js
        conflicts.service.js
    prisma/
      schema.prisma
      seed.js
```

## Design principles
1. No business logic in routes.
2. Controllers only handle request/response.
3. Services contain business logic.
4. Prisma access must stay in services/repositories.
5. Every protected route must validate auth token and role.
6. Client-facing responses must be filtered for portal safety.
7. Matter should be the central entity for docs, billing, communications, and drafts.

## Authentication design
- Login via email/password
- JWT access token returned to frontend
- Frontend stores token and role
- Middleware extracts authenticated user
- Role middleware guards admin/lawyer/client access

## Authorization rules
### Admin
- Full access to leads, clients, matters, billing, users, docs, communications

### Lawyer
- Access only to assigned matters/clients unless otherwise granted
- Can update matter status, communications, drafts, certain billing items

### Client
- Access only to own matters and client-safe data
- Cannot see internal notes, internal documents, admin-only billing details, or unrelated users

## API response conventions
Use consistent response shapes.

### Success
```json
{
  "success": true,
  "message": "Matter fetched successfully",
  "data": {}
}
```

### Error
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

## Logging / audit
Create activity log events for:
- lead created/updated/converted
- matter created/updated/status changed
- document uploaded/shared
- message sent
- invoice created/paid
- draft sent for signature
- document signed

## File handling
Phase 1 can store uploaded file metadata in DB and save files locally or in a simple storage layer.
Future storage can move to cloud object storage.

## Frontend alignment
The backend must support these frontend modules:
- `AdminPages.jsx`
- `LawyerPages.jsx`
- `ClientPages.jsx`
- `LeadPages.jsx`
- `MarketingPages.jsx`
- website pages and portal entry flow

## Naming alignment
- Prefer **Matters** over **Cases** in backend endpoints and models
- Prefer **Communications** over **Email** as a broader module name
- Keep public brand text separate from internal system identity
