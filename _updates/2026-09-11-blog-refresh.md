---
title: "Blog refresh: new design, D2Coding font and code highlighting"
date: 2026-09-11
excerpt: "A readable dark design, the D2Coding font, syntax highlighting, a new home page and some housekeeping."
---

A full refresh of how the blog looks and works. Post text was not changed.

## Home page

- The home page now shows the most recent post instead of the original theme introduction.
- Buttons under the post lead to the post itself (with comments) and to the full post list.

## Design

- New logo: a lambda between code brackets, `<λ>`, where math meets code. Small favicons use a bolder version so it stays readable.
- Reworked dark theme based on the existing blue and orange palette. Headings and body text now have proper contrast.
- Sticky header with a working menu on mobile.
- Post pages: table of contents on the left, a comfortable reading width, date and tags under the title.
- Post list (Thoughts): thumbnails, tags and a two-line summary per post.
- Categories page: compact lists with post counts.
- New **Update** menu for change notes like this one.

## Font

- The whole site uses [D2Coding](https://github.com/naver/d2-coding-font) by NAVER, a monospaced font that also covers Korean.
- The font is served from this site, not from a third-party font service, under the SIL Open Font License 1.1 ([license text]({{ '/assets/fonts/OFL.txt' | relative_url }})).

## Markdown and code

- Styles for headings, lists, blockquotes, tables, images and inline code.
- Fenced code blocks get syntax highlighting per language, a language label and a copy button.
- Code blocks without a language are shown as plain text, so write the language after the opening fence:

````markdown
```java
System.out.println("Hello");
```
````

## Housekeeping

- The site is built only from files in this repository.
- Removed leftovers from the original theme template: the demo contact form, the custom domain setting, sponsor and contribution files, and links to the theme author's personal pages.
- The search page was rewritten and hardened.
- Fixed links that ignored the `/FirstBlog` base path (RSS feed, offline page, installed-app start page).
- The RabbitMQ post now has four separate categories. Its old address redirects to the new one.
- Local builds use the same Jekyll version as GitHub Pages.

## Credits

- Based on the [Alembic](https://github.com/daviddarnes/alembic) Jekyll theme by David Darnes (MIT License).
- [D2Coding](https://github.com/naver/d2-coding-font) font by NAVER (SIL Open Font License 1.1).
