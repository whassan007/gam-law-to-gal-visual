import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

function files(path: string): string[] {
  if (statSync(path).isDirectory()) {
    return readdirSync(path).flatMap((name) => files(join(path, name)));
  }
  return [path];
}

describe('security and release packaging', () => {
  it('ships no specified credential markers in browser source or public assets', () => {
    expect(existsSync(join(root, 'src'))).toBe(true);
    expect(existsSync(join(root, 'index.html'))).toBe(true);
    const targets = ['src', 'public', 'index.html']
      .map((path) => join(root, path))
      .filter(existsSync)
      .flatMap(files);
    const markers = ['sk-', 'ghp_', 'gho_', 'AIza', 'PRIVATE_KEY'];
    const findings: string[] = [];
    for (const path of targets) {
      const content = readFileSync(path).toString('utf8');
      for (const marker of markers) {
        // Report paths and marker types only; never echo credential values.
        if (content.includes(marker)) findings.push(`${relative(root, path)}: ${marker}`);
      }
    }
    expect(findings, 'Credential markers must not be shipped to browsers').toEqual([]);
  });

  it('contains no forbidden heavyweight backend dependencies', () => {
    const manifest = JSON.parse(read('package.json'));
    const forbidden = new Set(['pg', 'redis', 'kubernetes', 'sequelize', 'prisma']);
    const findings: string[] = [];
    for (const section of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
      for (const [name, version] of Object.entries(manifest[section] ?? {})) {
        const aliasTarget = typeof version === 'string' && version.startsWith('npm:')
          ? version.slice(4).replace(/@[^@]*$/, '') : '';
        if (forbidden.has(name) || forbidden.has(aliasTarget)) findings.push(`${section}: ${name}`);
      }
    }
    expect(findings).toEqual([]);
  });

  it('documents the formal model, compliance distinction, and release commands', () => {
    expect(existsSync(join(root, 'README.md'))).toBe(true);
    const readme = read('README.md');
    for (const required of [
      'LAW → GAL', 'Φ = ⟨P, A, R, U ; PP, PA, RR, S, X, RA±, RU±, UP±, RP±, D±⟩',
      'Polarity Split', 'Single Shared Vocabulary', 'Closure Evaluation',
      'RA*', 'UP*', 'RR*', 'PP*', 'AssignedTo: Role → Activity',
      'CanAssignTo: Activity → Role', 'Φ_L', 'Φ_E', '\\text{Con}',
      'Ontology/Scenario', 'not a compliance verdict', 'human-reviewed',
      'actual-generated', 'unverified-draft', 'unsupported',
      'npm install', 'npm run dev', 'npm run build', 'npm test',
    ]) expect(readme, `README must include ${required}`).toContain(required);
  });

  it('documents all supported demonstration jurisdictions and laws', () => {
    const readme = read('README.md');
    for (const required of [
      'Canada', 'PIPEDA', 'Ontario', 'PHIPA', 'Quebec', 'Law 25',
      'United States', 'HIPAA', 'California', 'CCPA/CPRA',
      'SOX §201/§202/§301/§404-COSO', 'European Union', 'GDPR',
      'Germany', 'BDSG', 'France', 'Loi Informatique et Libertés',
      'United Kingdom', 'Data Protection Act 2018',
    ]) expect(readme, `README must include ${required}`).toContain(required);
  });

  it('preserves MIT permissions, academic attribution, and third-party notices', () => {
    expect(existsSync(join(root, 'LICENSE'))).toBe(true);
    const license = read('LICENSE');
    for (const required of [
      'MIT License', 'Permission is hereby granted', 'THE SOFTWARE IS PROVIDED "AS IS"',
      'W. A. Hassan', 'Validating Legal Compliance', 'Governance Analysis Method',
      'University of Ottawa, 2009', 'GAM 2.0 formal', 'polarity split',
      'shared vocabulary', 'closure', 'React', 'Three.js', 'D3-geo',
      'TopoJSON', 'World-Atlas', 'Lucide', 'GeographicLib',
    ]) expect(license, `LICENSE must include ${required}`).toContain(required);
  });
});
