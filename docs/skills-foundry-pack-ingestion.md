# Concord Foundry Skills Pack Ingestion

Status: durably staged and loaded on 2026-08-12.

## Takeover re-ingestion

The attached `Concord-Foundry-Skills-Pack-2026-08-12.zip` was re-ingested for
the 2026-08-14 Concord takeover. Its outer SHA-256 is unchanged at
`35bb0180d3a95bb3470470f120a9336e92bba2589f0282741d6d4b342f26c474`, and all
six nested bundle checksums below were re-verified. The attached GitHub and
Cloudflare environment files were used only through secret-preserving command
environments; their values were not printed, committed, or copied into this
repository.

## Source

- Uploaded name: `Concord-Foundry-Skills-Pack-2026-08-12(1).zip`
- File citation ID: `file_000000000d7881f48366d27a71f127f9`
- Library file ID: `libfile_09b19d4ba3e081918c774f22a18a02d2`
- Original upload path: `/workspace/scratch/9b193e913b16/upload/Concord-Foundry-Skills-Pack-2026-08-12(1).zip`
- Durable archive: workspace-managed storage outside this repository.
- Durable archive SHA-256: `35bb0180d3a95bb3470470f120a9336e92bba2589f0282741d6d4b342f26c474`

The original upload location is recorded for provenance only. The durable
archive and extracted sources are the working copies; no task step depends on
scratch or `/tmp`.

## Integrity

The outer archive checksum file was verified. All six nested archives passed
their recorded SHA-256 checksums:

| Package | SHA-256 |
| --- | --- |
| `product-foundry-agent-install-bundle-0.4.3.zip` | `0a43f714971cbf07c8b4c47da4babcf7616455dd6c48ef55774ba7448377f948` |
| `Research-Foundry-0.2.0.zip` | `c1fefce6fa19f9db4fecc8081a114d7ee585d152e94264cfa9eefddd86cc3f60` |
| `concord-fcc-0.1.0.zip` | `4d3cd95f372c5f196a5dca911059c0058f844d1e921ba4d5d989f0bea56e5ebc` |
| `experiment-foundry-agent-install-bundle-0.1.0.zip` | `1666edaf8ac6bf7e13ff11feef152c6578eebebf0fc887d87a9f8601558d4b4e` |
| `interface-foundry-0.3.0.zip` | `f4dc5e676567f59131410d80858ad3d0a663d3126aa49b9708e7ce7c724e11c4` |
| `Demo-Foundry-0.5.3.zip` | `e27a650b4ed9d3a9d1bc524b84453d182415c7a740d75071ecc35ec78528e7a3` |

## Durable extraction

All package sources are retained in workspace-managed storage outside this
repository.

Extracted package directories:

- `product-foundry-agent-install-bundle-0.4.3-extracted/`
- `Research-Foundry-0.2.0-extracted/`
- `concord-fcc-0.1.0-extracted/`
- `Experiment-Foundry-0.1.0-extracted/`
- `interface-foundry-0.3.0-extracted/`
- `Demo-Foundry-0.5.3-extracted/`

## Loaded order

The top-level instructions and required direct references were read in the
canonical order:

1. Product Foundry `0.4.3` — loaded.
2. Research Foundry `0.2.0` — loaded.
3. `concord-fcc` `0.1.0` — loaded; Flare skills remain external dependencies.
4. Experiment Foundry `0.1.0` — loaded from its nested archive.
5. Interface Foundry `0.3.0` — loaded.
6. Demo Foundry `0.5.3` — loaded for later production only.

## Validation

- Product, Research, and Experiment personal-skill compatibility validators: passed.
- Demo Foundry personal-skill compatibility validator: passed.
- `concord-fcc` skill validator: passed.
- Interface Foundry: no personal-skill validator was supplied in the package.
- Full Product/Research/Experiment runtime validation is pending because the
  environment lacks the declared `jsonschema` dependency. The package was not
  mutated to hide that limitation.

## Recorded package note

The Demo archive and manifest identify version `0.5.3`, while the header inside
its `SKILL.md` says `0.5.2`. This is retained as an explicit package
contradiction; the archive/manifest identity controls package tracking until
the upstream skill resolves it.

## Operating boundaries

- Product Foundry protects Concord Product Truth and requires persistent project state.
- Research Foundry requires source provenance, freshness, uncertainty, and visible contradictions.
- `concord-fcc` requires a fresh official Flare source snapshot for every material Flare/FCC task; its hackathon freshness limit is 12 hours.
- Experiment Foundry governs failure-focused, falsifiable tests and preserves raw/derived/interpretive evidence boundaries.
- Interface Foundry requires evidence-led design questions, accessibility-first semantics, critic/scorecard passes, and progressive disclosure.
- Demo Foundry must not produce final-demo material before the application works and evidence is truthful.

Official Flare skills and Flare-controlled sources are intentionally not vendored
in this pack and must be refreshed from their current official repositories and
Developer Hub before material Flare implementation decisions.
