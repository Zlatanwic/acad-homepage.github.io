# Native blog integration

## Scope

Add a native Jekyll Markdown blog to the existing GitHub Pages academic site. Keep existing academic content, interest galleries, and homepage motion intact. The user approved Markdown publishing. Default UI stays English; article content can be Chinese or English. No external CMS, login system, comments service, paid service, or invented personal articles.

## Implementation

1. Inspect existing content routes, shared navigation, SEO and build/test assumptions.
2. Add `/blog/`, a dedicated blog shell and readable post layout, Jekyll post defaults, a shared post-card include, and an Atom feed using GitHub Pages-compatible features.
3. Add progressive client-side title/excerpt/tag search and tag filtering. All articles remain reachable without JavaScript. Add a generated article table of contents when headings exist.
4. Scope sky-blue editorial styles to the blog. Preserve the homepage and make shared navigation resolve correctly from both home and nested article URLs.
5. Provide an unpublished Markdown draft and a concise Chinese publishing guide. Use an honest empty state until the user supplies posts; test article rendering with isolated fixtures.
6. Verify build, existing regression tests, blog tests, mobile/desktop, no-results/no-JS states, nested URLs and feed. Run independent code review.
7. Commit only task changes, push to the existing Pages branch, and verify the deployed routes. If Git/network permissions block publishing, report the exact unfinished step.

## Ownership

- Root: orchestration, Jekyll templates/config/navigation, blog styling, publishing documentation, build/browser/deploy verification.
- Explorer: read-only analysis of existing routes, SEO and navigation tests.
- Worker: blog JavaScript enhancement and focused tests, after the DOM contract is specified.
- Reviewer: read-only final code review.

## Acceptance

- Home navigation gains Blog without breaking its existing anchors.
- `/blog/` works under `/acad-homepage.github.io/`; future posts have stable dated blog URLs.
- Markdown headings, code, lists, images and tables render with a responsive reading layout.
- Search/filter is accessible and preserves article access when JavaScript is off.
- RSS/Atom subscription is valid, and drafts do not appear in the production site.
- No fabricated published articles and no changes to existing personal/academic content.

## Verification

- 58 Node tests and 6 isolated Jekyll integration tests (144 assertions) passed.
- Verified the real empty archive, a populated isolated archive, special-character tags, no results/reset, article TOC, and unenhanced HTML in a browser.
- Checked 1101px navigation and 320/390px mobile layouts; source links and article anchors preserve the project base path.
- Independent review addressed Atom base URLs/update timestamps and code-color contrast. No remaining blocking findings.
