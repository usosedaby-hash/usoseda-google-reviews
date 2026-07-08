# Usoseda Google Reviews

This repository runs a weekly GitHub Actions browser diagnostic for Google Maps review pages.

The first step is intentionally diagnostic-only:

- launches Chromium through Puppeteer;
- opens two Google Maps review URLs;
- writes `data/status.json`;
- writes a placeholder `data/google-reviews.json`;
- uploads HTML, text, and screenshots as workflow artifacts.

If GitHub Actions can access the review pages reliably, the next step is to add real review parsing and duplicate protection.
