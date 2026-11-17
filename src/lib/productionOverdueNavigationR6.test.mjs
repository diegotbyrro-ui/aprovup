import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

for (const [area, path] of [
  ['design', 'src/app/(dashboard)/design/page.tsx'],
  ['filmmaker', 'src/app/(dashboard)/filmmaker/page.tsx'],
]) {
  test(`R6: ${area} mostra apenas demandas em atraso e permite acessar a lista`, () => {
    const source = readFileSync(resolve(process.cwd(), path), 'utf8');
    assert.match(source, /const overdueContents = allContents\.filter\(\(content\) => isLate\(content\)\)/);
    assert.match(source, /params\?\.visao === "atrasos"/);
    assert.match(source, /<ProductionOverdueList contents=\{overdueContents\}/);
    assert.match(source, /<ProductionDeadlineFilter\s*\/>/);
    assert.match(source, /filterProductionByDay\(allContents, params\?\.periodo, params\?\.dia\)/);
    assert.match(source, new RegExp(`/${area}\\?visao=atrasos`));
  });
}