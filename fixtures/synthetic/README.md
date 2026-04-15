# Synthetic fixture

A tiny made-up app used by CI tests and local development. It is **not** a real runnable app — just enough structure to exercise the builder and (in v0.2) the sync pipeline.

Layout:

```
synthetic/
├── .claude/spec-viewer/
│   ├── config.json            # fixture config
│   ├── CONVENTIONS.md         # stub
│   └── specs/
│       ├── home.json
│       ├── contact-list.json
│       └── contact-detail.json
├── app/
│   └── routes/               # fake component files (for future /spec-sync tests)
│       ├── home.tsx
│       ├── contacts/
│       │   ├── index.tsx
│       │   └── [id].tsx
└── README.md
```

Tests:
- `packages/core/tests/build.test.ts` covers builder + escape.
- v0.2 adds `/spec-sync` tests that walk this fixture's `app/` tree.
