# Product Release Workbench data dictionary

All records and people are synthetic. data/seed.json is the canonical initial fixture; data/features.csv is a readable export, not a second runtime data source. Preserve the seed during core labs. User edits and proposals persist in ignored runtime/state.json.

## Feature record

| Field | Type and unit | Rule and example |
| --- | --- | --- |
| id | String identifier | Stable FEAT-001 style key; unique in the fixture |
| title | String | Human-readable opportunity, e.g. Wafer map bin overlay |
| product | String category | Test Operations (ATE floor, test programs, STDF data), Yield Analytics (wafer maps, bins, excursions) or Customer Quality (audits, RMA, field returns) |
| owner | String | Trimmed non-empty, maximum 80 characters; synthetic role/person |
| status | String enum | discovery, ready, in-progress or done |
| release | String enum | R1 or R2; selected item must match requested release |
| reach | Integer users per quarter | 1 to 1,000,000; e.g. 120 |
| impact | Number on workshop scale | 0.5, 1, 2 or 3; e.g. 3 |
| confidence | Fraction | Greater than 0 and at most 1; .8 means 80%; CR01 selected threshold .80 |
| effort | Engineering weeks | .01 to 100, at most two decimals; total calculated in hundredths |
| dependencies | Array of feature IDs | Target must be done or selected; selected cycles block |
| version | Positive integer | Starts at 1; successful edit increments; PATCH must supply current value |
| notes | Untrusted string data | Product rationale; FEAT-012 contains a synthetic hostile instruction |

PATCH permits changes only to owner, status, reach, impact, confidence and effort. Identity, dependency and release editing are not exposed by this workshop API. Schema extension requires a separate approved work item. Validate permitted fields before persistence.

## Workspace and derived values

| Field | Meaning |
| --- | --- |
| revision | Global positive integer, starts at 1; edit or new draft increments |
| features | Array of current feature records |
| proposals | Array of persisted local draft proposals, empty initially |
| score | Derived reach × impact × confidence ÷ effort; not stored in seed |
| contractVersion | Imported business agreement version: 1.0, then 1.1 |

## Preview response

| Field | Meaning |
| --- | --- |
| release, featureIds, capacity | Validated request; IDs returned sorted; capacity in engineering weeks |
| contractVersion, revision | Current agreement and workspace source |
| totalEffort | Selected effort sum in exact hundredths |
| eligible | True only when blockers is empty |
| blockers | Array of code, message and featureId objects |
| snapshotHash | SHA-256 binding contract, revision, request and current feature state |

Core blocker codes: NOT_READY, WRONG_RELEASE, DEPENDENCY, CYCLE and CAPACITY. CR01 adds LOW_CONFIDENCE. Request validation errors are separate from valid-but-blocked readiness.

## Stored proposal

| Field | Meaning |
| --- | --- |
| id | DRAFT-001 style local identifier |
| status | Always draft; no publication state or endpoint |
| release, featureIds, totalEffort, capacity, snapshotHash | Accepted recomputed preview values |
| idempotencyKey | 8-80 letters/digits/underscore/hyphen; identifies one request |
| fingerprint | Canonical JSON representation of submitted preview; detects key/body conflict |
| createdAt | ISO timestamp produced on new creation |

The local JSON store supports the teaching single-process flow. Cross-process transactions and production key uniqueness/retention require a database and explicit design.
