# Usoseda Google Reviews

This repository collects visible Google Maps reviews once a week with GitHub Actions and Puppeteer.

## Source Files

Use these raw JSON links on the website:

- Минск, ул. Асаналиева 25:
  `https://raw.githubusercontent.com/usosedaby-hash/usoseda-google-reviews/main/data/google-reviews-asanaliyeva-25.json`
- Минск, ул. Скрыганова 39А:
  `https://raw.githubusercontent.com/usosedaby-hash/usoseda-google-reviews/main/data/google-reviews-skryganova-39a.json`

## Schedule

The workflow runs every Monday at `00:00 UTC`, which is `03:00` in Minsk.

It can also be started manually from the GitHub Actions tab.

## Debug Data

Every run uploads a `google-browser-debug` artifact with:

- `data/status.json`;
- both review JSON files;
- Google Maps HTML snapshots;
- visible text snapshots;
- screenshots.
