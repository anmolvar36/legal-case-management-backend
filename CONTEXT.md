# VkTori Legal — Current Context

## Current project state
Frontend is already built in major areas and acts as the source of truth for backend planning.

## Existing frontend modules
- Public Website
- Admin portal
- Lawyer portal
- Client portal
- Leads / Intake pages
- Marketing pages
- Shared sidebar/topbar layout
- Vynius AI component

## Current naming rules
- Public-facing name: Victoria Tulsidas Law
- Internal software/backend name: VkTori

## Current product direction
This project is not only a website. It is a law firm website plus an internal matter-centric legal operations platform.

## Current confirmed flows
- Website -> Lead / Intake
- Lead -> Client
- Client -> Matter
- Matter -> Documents / Communications / Billing / Drafts
- Client portal -> view own matter / docs / invoices / messages / signatures

## Current frontend strengths
- Role-based UI exists
- Matter workspace exists
- Website and portal are already separate
- Leads and marketing modules already exist in frontend
- Drafts/e-sign direction is already in progress on frontend side

## Backend phase right now
Start with backend foundation and MVP modules only.

## Immediate backend implementation order
1. Auth
2. Leads
3. Clients
4. Matters
5. Matter detail/overview/activity
6. Documents metadata
7. Communications/messages
8. Billing basics
9. Drafts/signature basics
10. Dashboard endpoints

## Not first priority
- Real integrations
- Full bookkeeping
- Full timekeeping automation
- Advanced marketing attribution
- Real legal e-sign compliance workflow

## Goal of these docs
These files exist so AI/Antigravity can generate backend code that matches the current frontend instead of generating a generic legal SaaS backend.
