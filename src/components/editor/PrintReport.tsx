import React from 'react';
import { useEditor } from './editorState';
import { listEdges, operatorInfo } from './deontic';

/** Print-only report. "Export PDF" prints this through the browser's Save as PDF. */
export const PrintReport: React.FC<{ graphSvg: string | null }> = ({ graphSvg }) => {
  const { seed, result, doc, issues, edited } = useEditor();
  const name = (id: string) => result.galModel.entities.find((e) => e.id === id)?.name ?? id;
  return (
    <div className="ed-print-report" aria-hidden="true">
      <section>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>LAW → GAL report: {seed.title}</h1>
        <p>{seed.subtitle}</p>
        <p>Readiness: {result.readiness}{edited ? ' (edited in the deontic editor; requires formal review)' : ''} · Generated {new Date().toLocaleString()}</p>
        <p><em>{result.validation.complianceNotice}</em></p>
      </section>
      <section>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>1. Input statute</h2>
        <p style={{ whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif' }}>{seed.sourceText}</p>
      </section>
      <section>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>2. Segmentation</h2>
        <ol>{result.clauses.map((c) => <li key={c.id}>[{c.deonticModality} / {c.polarity}] {c.text}</li>)}</ol>
      </section>
      <section>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>3. Concept extraction</h2>
        <ul>{doc.concepts.map((c) => <li key={c.id}>{c.label} ({c.category}){c.mappedEntityId ? ` → ${c.mappedEntityId}` : ' — unbound'}</li>)}</ul>
      </section>
      <section>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>4. Deontic graph</h2>
        {graphSvg && <div style={{ border: '1px solid #ddd' }} dangerouslySetInnerHTML={{ __html: graphSvg }} />}
        <ul>
          {listEdges(result.galModel).map((r) => {
            const info = operatorInfo(r, doc.annotations[r.edge.id!]);
            const c = doc.annotations[r.edge.id!]?.confidence;
            return <li key={r.edge.id}>[{info.operator ?? 'Structural'}] {name(r.edge.source)} → {name(r.edge.target)} ({r.edge.type}){c !== undefined ? `, confidence ${c.toFixed(2)}` : ''}</li>;
          })}
        </ul>
      </section>
      <section>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>5. GAL-JSON</h2>
        <pre>{JSON.stringify(result.galModel, null, 2)}</pre>
      </section>
      <section>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>6. Validation report</h2>
        <p>Schema {result.validation.structuralValid ? 'valid' : 'invalid'} · closure consistency {result.validation.internalLawConsistent ? 'passed' : 'failed'} · directions {result.validation.relationDirectionsValid ? 'valid' : 'invalid'} · Alloy specification emitted, solver not executed.</p>
        {issues.length === 0 ? <p>No errors or warnings.</p> : <ul>{issues.map((i) => <li key={i.id}>{i.severity.toUpperCase()}: {i.message}</li>)}</ul>}
      </section>
    </div>
  );
};
