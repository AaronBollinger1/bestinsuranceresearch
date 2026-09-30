# Redesign inventory

Generated for DR1 on 2026-09-30 from `src/pages`. It says which layout,
template and shared components render each route, so a redesign can change a
family by editing the few files that draw it. Regenerate it when routes change;
`scripts/verify.mjs` fails if a page file is missing from this table.

## Where the look lives

- `src/styles/tokens.css`: every colour, font, size, space, radius, border,
  elevation and duration. Nothing outside it may hold a raw colour (verify rule
  "no raw colour lives outside the token file"). The `--u-*` block at the end of
  `:root` lists one-off colours by value with where each is used; the redesign
  should give each a role or retire it.
- Stylesheets: ask-journey.css, global.css, instrument.css, reading.css, templates.css, tokens.css.
- `src/layouts/BaseLayout.astro` wraps every page (header, footer, meta, JSON-LD).
- 36 shared components in `src/components` (templates in `src/components/templates`).

## Routes

| Route | File | Layout | Template | Components |
|---|---|---|---|---|
| `/404` | `pages/404.astro` | BaseLayout | - | StateBlock |
| `/about` | `pages/about.astro` | BaseLayout | - | Callout, PageHeader |
| `/ask` | `pages/ask.astro` | BaseLayout | - | Breadcrumbs, Callout, StateBlock, BirchLoadingMark, ProductContextBar, StatusChip |
| `/authors/[slug]` | `pages/authors/[slug].astro` | BaseLayout | - | PageHeader, StatusChip |
| `/changed` | `pages/changed.astro` | BaseLayout | - | Callout, DataTable, PageHeader, StateBlock, StatusChip |
| `/companies/[slug]` | `pages/companies/[slug].astro` | BaseLayout | - | QuotableLede, Breadcrumbs, Callout, CiteThisPage, CorrectionControl, EvidenceBoundary, RecordNavigation, SourceInspector, SourceLedger, StatusChip |
| `/companies` | `pages/companies/index.astro` | BaseLayout | - | Breadcrumbs, StatusChip |
| `/contribute` | `pages/contribute.astro` | BaseLayout | - | FocusPageHeader |
| `/corrections` | `pages/corrections.astro` | BaseLayout | - | Callout, PageHeader, StateBlock, StatusChip |
| `/dataset` | `pages/dataset.astro` | BaseLayout | - | Callout, DataTable, PageHeader, StateBlock |
| `/design/account-preview` | `pages/design/account-preview.astro` | BaseLayout | - | FocusPageHeader |
| `/design/commons-preview` | `pages/design/commons-preview.astro` | BaseLayout | - | Breadcrumbs |
| `/design/component-states` | `pages/design/component-states.astro` | BaseLayout | - | Callout, DataTable, PageHeader, StateBlock, StatusChip |
| `/design/corpus-matrix` | `pages/design/corpus-matrix.astro` | BaseLayout | - | - |
| `/design/directions/[direction]` | `pages/design/directions/[direction].astro` | BaseLayout | - | BirchFrontDoor, ProductPreview |
| `/design/homepage-concepts` | `pages/design/homepage-concepts.astro` | BaseLayout | - | Callout, DataTable, PageHeader |
| `/design/preview-pilot` | `pages/design/preview-pilot.astro` | BaseLayout | - | - |
| `/design/product-system` | `pages/design/product-system.astro` | BaseLayout | - | - |
| `/design/property-board` | `pages/design/property-board.astro` | BaseLayout | - | - |
| `/design/research-pipeline-preview` | `pages/design/research-pipeline-preview.astro` | BaseLayout | - | Breadcrumbs, ProductContextBar |
| `/design/reviewer-console-preview` | `pages/design/reviewer-console-preview.astro` | BaseLayout | - | Breadcrumbs, ProductContextBar |
| `/design/templates/[template]` | `pages/design/templates/[template].astro` | TemplateLayout | BrowseTemplate, ReadingTemplate, PersonalTemplate, OperationsTemplate, ToolsTemplate, StandardsTemplate | - |
| `/design/thread-preview` | `pages/design/thread-preview.astro` | BaseLayout | - | Breadcrumbs |
| `/editorial-policy` | `pages/editorial-policy.astro` | BaseLayout | - | Callout, PageHeader |
| `/examples/[slug]` | `pages/examples/[slug].astro` | BaseLayout | - | QuotableLede, Breadcrumbs, Callout, CiteThisPage, CorrectionControl, EvidenceBoundary, SourceLedger, StatusChip |
| `/examples` | `pages/examples/index.astro` | BaseLayout | - | Callout, DataTable, PageHeader, StatusChip |
| `/explore` | `pages/explore.astro` | BaseLayout | - | Breadcrumbs, ProductContextBar, StatusChip |
| `/figures` | `pages/figures.astro` | BaseLayout | - | Callout, PageHeader, StatusChip |
| `/for-ai` | `pages/for-ai.astro` | BaseLayout | - | Callout, PageHeader |
| `/guides/[slug]` | `pages/guides/[slug].astro` | BaseLayout | - | Breadcrumbs, CiteThisPage, GuideTabs, SourceLedger, StatusChip |
| `/guides` | `pages/guides/index.astro` | BaseLayout | - | Breadcrumbs |
| `/` | `pages/index.astro` | BaseLayout | - | StatusChip, BirchFrontDoor, BirchAssetManifesto, ProductPreview |
| `/industries/[slug]` | `pages/industries/[slug].astro` | BaseLayout | - | Breadcrumbs, Callout, CiteThisPage, SourceLedger, StatusChip |
| `/industries` | `pages/industries/index.astro` | BaseLayout | - | Callout, PageHeader |
| `/insurance/[slug]` | `pages/insurance/[slug].astro` | BaseLayout | - | QuotableLede, Breadcrumbs, Callout, CiteThisPage, CommonsHandoff, CorrectionControl, EvidenceBoundary, Handoff, RecordNavigation, SourceInspector, SourceLedger, StatusChip |
| `/insurance` | `pages/insurance/index.astro` | BaseLayout | - | Callout, PageHeader, StatusChip |
| `/lens` | `pages/lens.astro` | BaseLayout | - | Breadcrumbs, Callout |
| `/library/[kind]/[id]` | `pages/library/[kind]/[id].astro` | BaseLayout | - | - |
| `/lines/[line]` | `pages/lines/[line].astro` | BaseLayout | - | Breadcrumbs, Callout, Handoff, SourceLedger |
| `/lines` | `pages/lines/index.astro` | BaseLayout | - | Breadcrumbs, Callout |
| `/methodology` | `pages/methodology.astro` | BaseLayout | - | Callout, DataTable, PageHeader |
| `/network` | `pages/network.astro` | BaseLayout | - | Breadcrumbs, Callout |
| `/position` | `pages/position.astro` | BaseLayout | - | Breadcrumbs, Callout, Handoff, StateBlock, StatusChip |
| `/privacy` | `pages/privacy.astro` | BaseLayout | - | Callout, DataTable, PageHeader |
| `/professionals` | `pages/professionals.astro` | BaseLayout | - | FocusPageHeader |
| `/questions/[slug]` | `pages/questions/[slug].astro` | BaseLayout | - | Breadcrumbs, Callout, CiteThisPage, CommonsHandoff, CorrectionControl, EvidenceBoundary, Handoff, RecordNavigation, SourceInspector, SourceLedger, StatusChip |
| `/questions` | `pages/questions/index.astro` | BaseLayout | - | PageHeader, StateBlock, StatusChip |
| `/regulatory-impact` | `pages/regulatory-impact.astro` | BaseLayout | - | - |
| `/research/runs/[id]` | `pages/research/runs/[id].astro` | BaseLayout | - | Breadcrumbs |
| `/review-queue` | `pages/review-queue.astro` | BaseLayout | - | Breadcrumbs, Callout, DataTable, StatusChip |
| `/review-queue/[source]` | `pages/review-queue/[source].astro` | BaseLayout | - | Breadcrumbs, Callout, StatusChip |
| `/shelf` | `pages/shelf.astro` | BaseLayout | - | Breadcrumbs, ProductContextBar |
| `/sources/[slug]` | `pages/sources/[slug].astro` | BaseLayout | - | Breadcrumbs, Callout, CorrectionControl, SourceCitationKit, StateBlock, StatusChip |
| `/sources` | `pages/sources/index.astro` | BaseLayout | - | Callout, PageHeader, StateBlock |
| `/start` | `pages/start.astro` | BaseLayout | - | Breadcrumbs, StatusChip |
| `/states/[slug]` | `pages/states/[slug].astro` | BaseLayout | - | QuotableLede, Breadcrumbs, Callout, CiteThisPage, CorrectionControl, EvidenceBoundary, SourceLedger, StatusChip |
| `/states` | `pages/states/index.astro` | BaseLayout | - | Callout, PageHeader, StatusChip |
| `/status` | `pages/status.astro` | BaseLayout | - | PageHeader |
| `/terms` | `pages/terms.astro` | BaseLayout | - | Callout, PageHeader |
| `/tools/[module]` | `pages/tools/[module].astro` | BaseLayout | - | QuotableLede, Breadcrumbs, Callout, CiteThisPage, Handoff, ModuleForm, SourceLedger, StateBlock, StatusChip |
| `/tools` | `pages/tools/index.astro` | BaseLayout | - | Callout, DataTable, PageHeader, StatusChip |
| `/tools/policy-comparison` | `pages/tools/policy-comparison.astro` | BaseLayout | - | Callout, CiteThisPage, Handoff, SourceLedger, StateBlock, ToolFrame |
| `/tools/renewal-readiness` | `pages/tools/renewal-readiness.astro` | BaseLayout | - | Callout, CiteThisPage, Handoff, SourceLedger, StateBlock, ToolFrame |
| `/tools/requirement-mapper` | `pages/tools/requirement-mapper.astro` | BaseLayout | - | Callout, CiteThisPage, Handoff, SourceLedger, StateBlock, ToolFrame |
