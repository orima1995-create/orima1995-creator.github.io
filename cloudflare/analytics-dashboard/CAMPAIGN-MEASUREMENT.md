# Campaign comparison

- Register the actual link-added/action time separately from the original post date. Datetime inputs use the browser's timezone; action and measurement timestamps are stored as ISO UTC.
- Choose a saved campaign and request a 1, 24, or 72-hour comparison. This is independent of the dashboard's rolling window. Before and after have equal durations; incomplete periods use elapsed time on both sides. Adjacent query intervals do not overlap.
- X entry counts come from the dedicated entry aggregation (1,000-row limit). Target-to-other-page PV comes from flow rows (200-row limit), includes all sources, and excludes same-page navigation. A limit warning is displayed when either cap is reached.
- Referrer entry counts are not people or X link clicks. Before/after changes do not establish causation or post-level attribution. Referrer loss and other concurrent activity remain confounders.
- X metrics are manually recorded cumulative values, with a required observation timestamp when any metric is entered. Empty inputs persist as null, not zero. Legacy zero values cannot be distinguished from previously coerced missing values. Legacy campaign records require an explicit action time before comparison; original publication time is not substituted.
- X preview imports public text/author information only. It does not retrieve publication time, impressions, clicks, satisfaction, or scheduled metric snapshots. No background collection or X API integration is implemented.
- Records remain in browser localStorage. Comparison requests require the dashboard's existing authentication. Failed or missing API data is displayed as an error, not a zero result.

Verification: generated JavaScript and campaign boundary/self-navigation regression checks run in the existing deployment workflow. Local mocked browser checks cover form submission, null persistence, comparison rendering and 1280/390/320px overflow. Live Cloudflare data must be checked separately after deployment.
