// Deployment hardening guard rails (rules P-1, P-2, P-3) for manifests/, the Dockerfile and nginx.conf.
// Pure file parsing, no cluster or docker. js-yaml comes with ESLint (@eslint/eslintrc); add it to
// devDependencies if that ever changes.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import yaml from 'js-yaml';

const ROOT = resolve(import.meta.dirname, '../..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');
const docs = (p) => yaml.loadAll(read(p)).filter(Boolean);
const DIGEST = /@sha256:[0-9a-f]{64}$/;
const PLACEHOLDER = '<ECR_IMAGE_URI>';

const deployment = docs('manifests/deployment.yaml').find((d) => d.kind === 'Deployment');
const service = docs('manifests/deployment.yaml').find((d) => d.kind === 'Service');
const pod = deployment.spec.template.spec;
const containers = [...(pod.initContainers ?? []), ...pod.containers];

describe('P-1 container hardening', () => {
    it.each(containers.map((c) => [c.name, c]))('%s is non-root, read-only, no capabilities', (_name, c) => {
        const psc = pod.securityContext ?? {};
        const sc = c.securityContext ?? {};
        expect(sc.runAsNonRoot ?? psc.runAsNonRoot).toBe(true);
        expect(sc.runAsUser ?? psc.runAsUser).not.toBe(0);
        expect(sc.readOnlyRootFilesystem).toBe(true);
        expect(sc.allowPrivilegeEscalation).toBe(false);
        expect(sc.privileged ?? false).toBe(false);
        expect(sc.capabilities?.drop).toContain('ALL');
        expect(sc.capabilities?.add ?? []).toEqual([]);
        expect((sc.seccompProfile ?? psc.seccompProfile)?.type).toBe('RuntimeDefault');
    });

    it('mounts /tmp as a volume and only declared volumes', () => {
        const volumes = new Set(pod.volumes.map((v) => v.name));
        for (const c of containers) {
            const mounts = c.volumeMounts ?? [];
            expect(mounts.map((m) => m.mountPath)).toContain('/tmp');
            for (const m of mounts) expect(volumes.has(m.name)).toBe(true);
        }
        expect(pod.automountServiceAccountToken).toBe(false);
    });

    it('serves on the unprivileged port 8080 (probes and Service follow)', () => {
        const [c] = pod.containers;
        expect(c.ports.map((p) => p.containerPort)).toEqual([8080]);
        expect(c.readinessProbe.httpGet.port).toBe(8080);
        expect(c.livenessProbe.httpGet.port).toBe(8080);
        expect(['http', 8080]).toContain(service.spec.ports[0].targetPort);
        expect(read('nginx.conf')).toMatch(/listen 8080;/);
        expect(read('nginx.conf')).toMatch(/^pid \/tmp\/nginx\.pid;/m);
    });

    it('runtime image is nginx-unprivileged running as a non-root user', () => {
        const dockerfile = read('Dockerfile');
        const froms = [...dockerfile.matchAll(/^FROM\s+(\S+)/gm)].map((m) => m[1]);
        expect(froms.at(-1)).toMatch(/^nginxinc\/nginx-unprivileged:/);
        const users = [...dockerfile.matchAll(/^USER\s+(\S+)/gm)].map((m) => m[1]);
        expect(users.at(-1)).not.toMatch(/^(root|0)$/);
    });
});

describe('P-2 images pinned by digest', () => {
    it('every Dockerfile FROM is pinned', () => {
        const froms = [...read('Dockerfile').matchAll(/^FROM\s+(?:--platform=\S+\s+)?(\S+)/gm)].map((m) => m[1]);
        expect(froms.length).toBeGreaterThan(0);
        for (const ref of froms) expect(ref).toMatch(DIGEST);
    });

    it('manifest images are the CI placeholder or a digest, never a tag', () => {
        for (const c of containers) {
            expect(c.image === PLACEHOLDER || DIGEST.test(c.image)).toBe(true);
        }
    });
});

describe('P-3 NetworkPolicies', () => {
    const policies = Object.fromEntries(
        docs('manifests/networkpolicy.yaml').filter((d) => d.kind === 'NetworkPolicy').map((d) => [d.metadata.name, d.spec]),
    );

    it('denies ingress by default and admits only port 8080 to the frontend', () => {
        expect(policies['default-deny-ingress']).toEqual({ podSelector: {}, policyTypes: ['Ingress'] });
        const ingress = policies['frontend-ingress'];
        expect(ingress.podSelector.matchLabels).toEqual({ app: 'frontend' });
        expect(ingress.ingress.flatMap((r) => r.ports.map((p) => p.port))).toEqual([8080]);
    });

    it('gives the static nginx no egress', () => {
        const egress = policies['frontend-deny-egress'];
        expect(egress.policyTypes).toEqual(['Egress']);
        expect(egress.egress ?? []).toEqual([]);
    });
});
