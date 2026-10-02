# Data ingestion

The ingestion layer follows a source-of-truth hierarchy.

1. Official federation data is collected first.
2. Stable athlete identifiers are normalized before names are used.
3. Raw source snapshots are retained so parser changes can be audited.
4. A changed schedule is never inferred from weather or social posts; only an official source can promote a schedule change to confirmed.
5. Public social/media content can enrich Athlete Timeline but cannot overwrite official results.

## Current connectors
- FLGR athlete registry and results discovery
- FIS official results discovery
- IBU / Biathlonworld source registry
- Russian Biathlon Union source registry

## Automation
GitHub Actions runs source monitoring and ingestion on the free infrastructure. Supabase stores normalized data and evidence.
