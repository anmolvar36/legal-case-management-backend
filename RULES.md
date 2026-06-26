# VkTori Legal — Build Rules for AI / Antigravity

## High-level rules
- Do not break the existing frontend structure.
- Do not rename existing frontend pages/modules unless explicitly requested.
- Keep public branding and internal software naming separate.
- Use **Matters** terminology instead of **Cases**.
- Use **Communications** terminology instead of only **Email**.

## Backend rules
- Follow modular Express structure.
- Follow: Routes -> Controllers -> Services -> Prisma.
- Do not place business logic in routes.
- Keep Prisma usage inside services/repository-style files.
- Use async/await consistently.
- Add validation for all write endpoints.
- Protect role-based routes with middleware.

## Security rules
- Hash passwords with bcryptjs.
- Use JWT for auth.
- Never return password hashes.
- Client users must only access their own matter data.
- Do not expose internal notes/documents to client endpoints.

## Code style rules
- Use clear file/module names.
- Keep functions focused and small.
- Use consistent success/error response format.
- Avoid unnecessary files and over-abstraction for MVP.

## Database rules
- Lowercase table names
- snake_case columns
- created_at / updated_at timestamps where relevant
- foreign keys for relationships

## Frontend-alignment rules
- Backend responses must support these modules:
  - AdminPages
  - LawyerPages
  - ClientPages
  - LeadPages
  - MarketingPages
  - Matter workspace tabs
- Do not invent features that the frontend cannot consume yet unless marked future phase.

## MVP priority rules
Build in this order:
1. Auth
2. Leads / Intake
3. Clients
4. Matters
5. Documents metadata
6. Communications
7. Billing basics
8. Drafts / signatures basics
9. Dashboard aggregates

## Antigravity prompt rule
Always start generation tasks with:
- Read project-docs: PRD.md, ARCHITECTURE.md, DATABASE.md, API_SPEC.md, FLOW.md, RULES.md, CONTEXT.md
- Generate only the requested module/file
