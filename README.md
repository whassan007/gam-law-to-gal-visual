# LAW → GAL: Interactive Global Visualization of the Governance Analysis Method

An interactive demonstration of translating natural-language legislation into
Governance Analysis Language (GAL): select a jurisdiction and provision, follow
source clauses through extraction and translation, and inspect the resulting
typed graph, polarity, provenance, and formal validation information.

The foundation is W. A. Hassan's *Validating Legal Compliance — Governance
Analysis Method* (University of Ottawa, 2009), with the GAM 2.0 formal engine
corrections. The shared contracts are in `src/types/contracts.ts`.

**Formal GAM model**

\[
\Phi = \langle P, A, R, U ; PP, PA, RR, S, X, RA^\pm, RU^\pm, UP^\pm, RP^\pm, D^\pm \rangle
\]

In plain text: `Φ = ⟨P, A, R, U ; PP, PA, RR, S, X, RA±, RU±, UP±, RP±, D±⟩`.
P, A, R, U denote Process, Activity, Role, User; PP is process composition,
PA containment, RR role inclusion, S succession, and X separation of concerns.
RA, RU, UP, RP, D encode activity assignment, role occupancy, process access,
role reachability, and delegation.

- **Polarity Split (`RA±`):** permissions and prohibitions are separate facts,
  as are `RU±`, `UP±`, `RP±`, and `D±`. A denial is distinct from silence.
- **Single Shared Vocabulary:** law and enterprise use the same identifiers and
  relations. Origin records provenance; it must not isolate the two models.
- **Closure Evaluation (`RA*`, `UP*`, `RR*`, `PP*`):** evaluate effective access
  through role inheritance, process composition, and delegation. Comparing only
  declared edges misses conflicts. Senior roles inherit junior roles.
- **Canonical directions:** `AssignedTo: Role → Activity` is a positive relation;
  `CanAssignTo: Activity → Role` is an Allow/Deny policy. `Acts: Role → User`
  and `CanAct: User → Role` likewise use different argument orders.

Translating a law yields **Φ_L**, not a compliance verdict. Organizational
compliance requires an enterprise model **Φ_E** and checking both
\(\text{Con}(\bigwedge\Phi_E \wedge \bigwedge\Phi_L)\) and the
**Ontology/Scenario requirements**. Consistency alone cannot detect a missing
required activity or required ordering. An internally valid law model does not
establish organizational compliance. Emitting an Alloy specification does not
mean an Alloy solver executed; the contract reports `alloySolverExecuted: false`.

**Demonstration coverage and translation readiness**

The demonstration scope covers selected provisions, rather than complete legal
instruments or a guarantee of current legal coverage:

| Jurisdiction | Demonstration laws |
| --- | --- |
| Canada (federal) | PIPEDA |
| Ontario | PHIPA |
| Quebec | Law 25 |
| United States (federal) | HIPAA; SOX §201/§202/§301/§404-COSO |
| California | CCPA/CPRA |
| European Union | GDPR |
| Germany | BDSG |
| France | Loi Informatique et Libertés |
| United Kingdom | Data Protection Act 2018 |

SOX §404 concerns internal control over financial reporting; segregation of
 duties is a COSO practice applied under §404.

Read the readiness label on each law/provision/result: **`human-reviewed`** means
a human-reviewed GAM translation; **`actual-generated`** means live-pipeline
output, which remains a draft requiring human formal review; **`unverified-draft`**
means heuristic extraction awaiting review; **`unsupported`** means no validated
translation is available. Jurisdiction inclusion alone does not imply review.
Review polarity, canonical directions, omissions, and ambiguous interpretations
before relying on a generated translation.

**Local development**

With Node.js and npm installed:

```sh
npm install
npm run dev
npm run build
npm test
```

Vite prints the local development URL. The build performs TypeScript checking
and produces `dist/`. Run the security and packaging gate separately with:

```sh
npx vitest run tests/security-packaging.test.ts
```

The gate scans `src/`, `public/` when present, and `index.html` for specified
secret markers; rejects specified backend dependencies; and checks release
documentation. It is a targeted release check, not a comprehensive vulnerability
audit. Browser assets must never contain credentials.

MIT licensed; see [LICENSE](LICENSE) for academic attribution and the React,
Three.js, D3-geo, TopoJSON, World-Atlas, and Lucide third-party notices.


## Instrument catalogue and source texts

`src/data/verified-examples/instrument-catalogue.ts` and `instrument-catalogue-world.ts` catalogue privacy, data-protection, cybersecurity and cross-border instruments. Entries are metadata only; only those linked by `translatedLawId` have curated GAL translations. Many world-catalogue citations and links are candidate inventory and have not been independently verified.

`npm run fetch:sources` retrieves text from the endpoints configured in `scripts/source-fetch/registry.mjs` and stores it in `public/source-texts/`, with URL, retrieval time, SHA-256, and a phrase-based content check in `manifest.json`. Publisher and text authority vary by entry; some sources are unofficial reproductions, archived copies, proposals, or guidance. A successful fetch or phrase match does **not** verify the legal citation, current status, effective date, or interpretation. Entries whose requests fail are recorded as `blocked` / `failed` with a reason; no access control is bypassed. Use `-- --only id1,id2` or `-- --missing` to limit a run.


## Interactive deontic editor

The app opens in a light, two-pane workspace: six translation stages on the left,
and an editable deontic graph, entity inspector, and collapsible live output on the right.
Use **Edit extraction** to rename, add, remove, or categorize concepts. Bound concept
names update graph labels and GAL-JSON immediately. Select graph nodes or relations
to inspect their source clauses, change operators, or remove them. The graph toolbar
supports connecting nodes, filtering operators, zooming, and fitting the graph.

Use **Translate your own statute** for custom input. Drafts are stored in this browser;
undo/redo retains ten edits. Share buttons encode the current document into a URL
fragment, with read-only links offering an editable-copy action. These links contain
the model and are not an access-control mechanism. **Globe** and **Animated pipeline**
open the existing research views; their editor button returns to this workspace.

Exports include GAL-JSON, Alloy specifications, and a report through the browser's
Print / Save as PDF dialog. Validation reruns schema, direction, and closure/SAT
checks after edits. The Alloy Analyzer is not embedded: download the specification
and run it with `alloy/gam_core.als` for Alloy verification. Publishing proposals to
KIBO requires an authentication and ontology API integration, which this repository
does not currently provide.
