
Plan: Practice Website for API & Frontend Automation
A comprehensive single-page application (SPA) to be hosted on GitHub Pages alongside the existing Swagger docs. It will provide a full UI for the Bill Payment API, incorporating diverse UI elements for Selenium/Playwright practice.

Steps
Create site structure in docs folder with new pages: app/ directory containing index.html, styles.css, app.js, and component modules for each feature area (users, billers, bills, payments, auth).

Build authentication module with login form supporting all 4 auth methods (API Key, Bearer Token, Basic Auth, OAuth2), token storage in localStorage, and session management UI - mapped to /oauth/token and /v1/auth/me endpoints.

Build CRUD interfaces for each resource:

Users: Data table with search, filters, create/edit forms, KYC verification modal
Billers: Card grid with category filter chips, active toggle, amount range inputs
Bills: Dashboard with summary stats, status badges, auto-pay toggle switch
Payments: History table with date range picker, refund/cancel modals
Payment Methods: Type-specific forms (UPI, Card, Bank, Wallet), set-default radio buttons
Add practice-specific components for automation testing: shadow DOM elements, drag-and-drop file upload, iframes (card input simulation), infinite scroll, keyboard shortcuts, context menus, tooltips, and a dark mode toggle.

Implement advanced UI patterns: multi-step wizard for payment flow, collapsible accordions, auto-complete search, date pickers, dynamic tables with bulk actions, CSV/PDF export buttons, toast notifications, and loading spinners.

Update GitHub Pages deployment - the existing workflow at .github/workflows/docs.yml already deploys from docs folder, so new files will auto-deploy on push to main.

Further Considerations
Tech stack choice? Pure vanilla JS (no build step, simplest for GitHub Pages) vs. lightweight framework like Alpine.js or Preact (better structure, still no build required). Recommendation: Vanilla JS + Alpine.js for reactivity

Separate app or integrated with Swagger? Keep Swagger at index.html and create new app at /docs/app/ with a shared navigation header linking between them.

Mock data fallback? Since the API is on Cloudflare Workers, should we include a mock mode for when API is unavailable? This would help users practice even if the API has rate limits.