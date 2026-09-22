import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pagePatterns } from '../src/lib/product-design.ts';
import { productDesign } from '../src/config/product-design.ts';
import { designTemplates } from '../src/lib/design-templates.ts';

test('all fourteen Direction A specimens are linked, private, and structurally sound', () => {
  assert.equal(designTemplates.length,14);
  assert.equal(new Set(designTemplates.map(template=>template.id)).size,14);
  const directory=html('/design/product-system');
  for(const template of designTemplates){
    const path=`/design/templates/${template.id}`;
    assert.ok(directory.includes(`href="${path}"`),`${path}: directory link`);
    const page=html(path);
    assert.match(page,/<meta\s+name="robots"\s+content="[^"]*noindex/,path);
    assert.equal((page.match(/<main\b/g)||[]).length,1,path);
    assert.equal((page.match(/<h1\b/g)||[]).length,1,path);
    assert.match(page,/Design specimen\. Local interactions only/);
    const ids=[...page.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]);
    assert.equal(new Set(ids).size,ids.length,`${path}: IDs must be unique`);
    for(const match of page.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(match[1]),`${path}: missing anchor ${match[1]}`);
    const main=page.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1]||'';
    assert.doesNotMatch(main,/<form\b|type="(?:email|file|password|submit)"/,`${path}: no actual intake`);
  }
});
