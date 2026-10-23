import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasTikTokScope, numberFromProvider, aggregateTikTokVideos } from './tiktokAnalyticsMath.ts';

test('escopos TikTok em CSV nao criam falsos positivos', () => {
  assert.equal(hasTikTokScope('user.info.basic,video.publish', 'video.list'), false);
  assert.equal(hasTikTokScope('user.info.basic,video.list,video.publish', 'video.list'), true);
  assert.equal(hasTikTokScope('video.lists', 'video.list'), false);
});
test('API TikTok numericos sao higienizados', () => {
  assert.equal(numberFromProvider('123'), 123);
  assert.equal(numberFromProvider('n/a'), 0);
  assert.equal(numberFromProvider(-4), 0);
});
test('consolidacao usa somente contagens recebidas', () => {
  const result = aggregateTikTokVideos([{ views: 10, likes: 4, comments: 3, shares: 2 }, { views: 20, likes: 2, comments: 1, shares: 1 }]);
  assert.deepEqual(result, { views: 30, likes: 6, comments: 4, shares: 3 });
});
