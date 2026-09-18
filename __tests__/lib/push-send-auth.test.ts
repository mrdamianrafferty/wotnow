/**
 * @jest-environment node
 */
import { resolvePushCaller, refuseSend, secretsMatch } from '@/lib/push/pushSendAuth';

const verify = async (token: string) => (token === 'good' ? 'user-1' : null);

it('recognises the secret, and a signed-in person', async () => {
  expect(await resolvePushCaller({ headers: { 'x-push-api-secret': 's3cret' } }, 's3cret', verify)).toEqual({ kind: 'service' });
  expect(await resolvePushCaller({ headers: { authorization: 'Bearer good' } }, 's3cret', verify)).toEqual({ kind: 'user', userId: 'user-1' });
});

it('never matches when the server has no secret configured', async () => {
  expect(await resolvePushCaller({ headers: { 'x-push-api-secret': '' } }, undefined, verify)).toBeNull();
  expect(await resolvePushCaller({ headers: { 'x-push-api-secret': 'anything' } }, undefined, verify)).toBeNull();
});

it('rejects a wrong secret and a bad token', async () => {
  expect(await resolvePushCaller({ headers: { 'x-push-api-secret': 's3cre' } }, 's3cret', verify)).toBeNull();
  expect(await resolvePushCaller({ headers: { authorization: 'Bearer bad' } }, 's3cret', verify)).toBeNull();
});

it('compares secrets of different lengths without throwing', () => {
  expect(secretsMatch('a', 'abc')).toBe(false);
  expect(secretsMatch('abc', 'abc')).toBe(true);
});

it('lets the server do anything, and a person only reach themselves', () => {
  expect(refuseSend({ kind: 'service' }, { broadcast: true })).toBeNull();
  expect(refuseSend({ kind: 'user', userId: 'u' }, { broadcast: true })).toMatch(/server/);
  expect(refuseSend({ kind: 'user', userId: 'u' }, { userId: 'v' })).toMatch(/another user/);
  expect(refuseSend({ kind: 'user', userId: 'u' }, { userId: 'u' })).toBeNull();
  expect(refuseSend({ kind: 'user', userId: 'u' }, {})).toBeNull();
});
