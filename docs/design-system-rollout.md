# Visual identity rollout

The canonical design system lives in `design-system/`. All 36 HTML entrypoints import `site-theme.css` after their original styles. The shared theme maps the current components to the Forest, Cream, Sage, Peach and Lilac palette and editorial typography. Existing logo artwork retains its geometry and uses the new palette.

Scope: home, Healthy Routines introduction, programs portal and course dialogs, Life Portrait entry/assessment/results, DPP enrollment/participant/module screens, and Learn articles in their existing languages. JavaScript-generated components inherit the same theme through the body class. Legacy redirect pages still redirect.

Validation completed:

- All 36 product HTML documents compared with the previous commit: text, links, IDs, form attributes and script references unchanged. Only theme stylesheet, body classes and theme-color metadata were added/updated.
- No application JavaScript changed. Authentication, data storage, progress, calculations, exports and chart geometry remain unchanged.
- CSS parsed successfully; whitespace checks passed.
- Browser review of home, Healthy Routines preview/account forms, Life Portrait login in English/Portuguese, DPP enrollment, Portuguese Learn article, and a static rendering of participant dashboard markup.
- Sample lesson answer feedback and Life Portrait language switching worked in local preview.
- Life Portrait layout reviewed in a 390px iframe; no horizontal overflow. Home and Learn desktop had no horizontal overflow.

Verification limit: no authenticated account session was available. Participant dashboard review used the existing HTML with scripts removed in an unshipped local fixture; saving, real account login, and authenticated course/results flows were not exercised end to end. Existing behavior is preserved by the unchanged application code, but this is not an authenticated end-to-end test.

Maintain tokens and theme together. Never copy `showcase.js` into application pages. Do not apply this bridge to authentication or visibility logic. Keep chart series colors distinguishable and preserve existing print/export rules.

## Homepage product composition

Replaces the concentric-circle diagram with a live HTML composition using the actual Life Portrait question “Where do you want to make more room?” and the Healthy Routines lesson “Refine your intention”. Twelve egg shapes reference the Life Portrait exercise; category chips illustrate the product vocabulary, not participant answers or results. Links lead to Life Portrait and the public lesson preview. Content is localized in English, Portuguese and Spanish. No raster illustration, stock photo, invented metric or participant information is used.
