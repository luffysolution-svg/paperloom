import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><body></body>', { url: 'http://localhost/' });
for (const key of ['window', 'document', 'HTMLElement', 'Node', 'MouseEvent']) {
  Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true, writable: true });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { TaskCenter } = await import('../../src/features/task-center/ui/TaskCenter.js');
const { fetchJobList } = await import('@retainpdf/api/jobs');
const tick = () => new Promise((resolve) => setImmediate(resolve));
const job = (index) => ({ job_id: `job-${index}`, display_name: `书籍-${index}`, workflow: 'book', status: index ? 'succeeded' : 'running', updated_at: '2026-09-14T00:00:00Z', stage_snapshot: null });

test('task center DOM: summary releases loading before live detail; pagination remains usable', async () => {
  const oldFetch = globalThis.fetch;
  const listQueries = [];
  let resolveDetail;
  globalThis.fetch = async (url) => {
    const parsed = new URL(url, 'http://localhost');
    if (parsed.pathname.endsWith('/jobs')) {
      listQueries.push(parsed.searchParams);
      const offset = Number(parsed.searchParams.get('offset'));
      const items = offset ? [job(50)] : Array.from({ length: 50 }, (_, index) => job(index));
      return Response.json({ code: 0, data: { items } });
    }
    return new Promise((resolve) => { resolveDetail = resolve; });
  };
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  try {
    await React.act(async () => { root.render(React.createElement(TaskCenter, { onOpenBookDetail() {} })); await tick(); });
    assert.equal(host.querySelectorAll('[data-task-id]').length, 50);
    assert.doesNotMatch(host.textContent, /正在读取任务…/);
    assert.equal(listQueries.length, 1);
    assert.equal(listQueries[0].get('include_live_stage'), 'false');
    assert.equal(listQueries[0].get('limit'), '50');
    assert.equal(typeof resolveDetail, 'function', 'live request is still pending');
    const more = [...host.querySelectorAll('button')].find((button) => button.textContent === '加载更多任务');
    assert.equal(more.disabled, false);
    await React.act(async () => { more.click(); await tick(); });
    assert.equal(host.querySelectorAll('[data-task-id]').length, 51);
    assert.equal(listQueries[1].get('offset'), '50');
    await React.act(async () => {
      resolveDetail(Response.json({ code: 0, data: { job_id: 'job-0', status: 'failed', display_name: 'STALE' } }));
      await tick();
    });
    assert.doesNotMatch(host.textContent, /STALE/, 'old generation must not overwrite a new page');
  } finally {
    await React.act(async () => root.unmount());
    host.remove();
    globalThis.fetch = oldFetch;
  }
});

test('API client: ordinary list requests keep live projection by default', async () => {
  const oldFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url) => { request = url; return Response.json({ code: 0, data: { items: [] } }); };
  try {
    await fetchJobList('/api/v1');
    assert.equal(new URL(request, 'http://localhost').searchParams.has('include_live_stage'), false);
  } finally { globalThis.fetch = oldFetch; }
});
