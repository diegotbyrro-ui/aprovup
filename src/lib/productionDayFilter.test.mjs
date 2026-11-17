import test from 'node:test';
import assert from 'node:assert/strict';
import { filterProductionByDay } from './productionDayFilter.ts';

const now = new Date('2026-11-17T11:00:00-03:00');
const records = [
  { id: 'yesterday', productionDeadline: new Date('2026-11-16T23:59:00-03:00'), plannedDate: null },
  { id: 'today', productionDeadline: new Date('2026-11-17T16:00:00-03:00'), plannedDate: null },
  { id: 'tomorrow', productionDeadline: new Date('2026-11-18T18:00:00-03:00'), plannedDate: null },
  { id: 'week', productionDeadline: null, plannedDate: new Date('2026-11-22T10:00:00-03:00') },
  { id: 'nextWeek', productionDeadline: new Date('2026-11-23T10:00:00-03:00'), plannedDate: null },
  { id: 'noDate', productionDeadline: null, plannedDate: null },
];
const ids = (period, day) => filterProductionByDay(records, period, day, now).map((r) => r.id);

test('R6: todos e desconhecidos preservam a lista', () => {
  assert.equal(ids('TODOS').length, 6);
  assert.equal(ids('INVÃLIDO').length, 6);
});
test('R6: hoje e amanha usam America/Maceio', () => {
  assert.deepEqual(ids('HOJE'), ['today']);
  assert.deepEqual(ids('AMANHA'), ['tomorrow']);
});
test('R6: semana e 7 dias tratam limites e prazo alternativo', () => {
  assert.deepEqual(ids('SEMANA'), ['yesterday', 'today', 'tomorrow', 'week']);
  assert.deepEqual(ids('7_DIAS'), ['today', 'tomorrow', 'week', 'nextWeek']);
});
test('R6: dia especÃ­fico e datas invalidas', () => {
  assert.deepEqual(ids('DATA', '2026-11-18'), ['tomorrow']);
  assert.deepEqual(ids('DATA', '2026-02-30'), []);
});
test('R6: sem data somente entradas sem qualquer prazo', () => {
  assert.deepEqual(ids('SEM_DATA'), ['noDate']);
});