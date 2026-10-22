UPNEXT CARE DESIGN SYSTEM v1.0

Purpose: a calm, warm, optimistic identity for UpNext Care.
Files: upnext.css (shared tokens and components), tokens.json (portable design values), components.html (starter), index.html and showcase.js (interactive documentation).

Install: import upnext.css once in the shared layout. Put class="un" on the app container. The stylesheet includes a global box-sizing reset; audit existing CSS for conflicts before adoption. Component classes use the un- prefix. No build or external font required. Inter is used if locally installed; otherwise system UI. Display typography uses Georgia.

Do not import showcase.js into the product: it contains demonstration interactions only. Connect real forms and controls to the existing application logic. Translate interface text as a complete flow. English is the product default, with pt-BR and es variants.

Color roles: Forest primary action; Ink text; Cream canvas; Paper surface; Sage support/progress; Lilac reflection; Peach prevention/support. Soft colors are backgrounds, not body text. Use Ink text on soft colors and Paper text on Forest. Check every new combination for 4.5:1 normal-text contrast. Error #A13232, warning #785314, info #325A81. Status always includes text.

Spacing: 4,8,12,16,24,32,48,64,96px. Radius:8px fields,16px panels,24px cards,full for buttons/badges. Content max1160px; 24px desktop gutters and16px mobile. Body16px line-height1.6; labels14px; helper13px. H1 48–80px, H2 32–48px. Allow text expansion in translations.

Accessibility: semantic headings, visible focus, persistent labels, field error associations, keyboard operation, 48px touch controls, reduced motion. Use status/alert live regions for dynamic success/error. Program progress uses native progress with accessible label. Tables accompany charts. No-data must not be rendered as zero. Validate mobile layout and 200% zoom when integrating.

Brand mark in showcase is a visual proposal, not an automatically adopted replacement logo. Example copy and progress are demonstration data. No medical outcomes are implied.

Adoption: integrate tokens; migrate shared buttons/forms/cards; migrate one low-risk page; check responsive layouts, translations, focus, validation and existing behavior; then apply consistently to courses and result views. Existing main site is not modified by this package.

Governance: update tokens, CSS and this reference together. Add components when repeated patterns exist. Version breaking changes separately. No Figma dependency.

SITE ADOPTION
The production site imports site-theme.css after each page's original styles. This bridge shares the canonical token values and maps existing component classes to the new identity. Public pages and participant views keep their existing markup, behavior, authentication and content. Maintain this bridge with the canonical tokens. Product charts retain their semantic series colors and geometry.
