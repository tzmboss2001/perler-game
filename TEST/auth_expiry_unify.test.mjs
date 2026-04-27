import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const repoRoot = path.resolve(import.meta.dirname, '..');
const ts = createRequire(import.meta.url)(
  path.join(repoRoot, 'perler-beads', 'node_modules', 'typescript', 'lib', 'typescript.js'),
);

function loadTsModule(relativePath, globals = {}, requireOverrides = {}) {
  const fullPath = path.join(repoRoot, relativePath);
  const source = fs.readFileSync(fullPath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: fullPath,
  }).outputText;

  const module = { exports: {} };
  const dirname = path.dirname(fullPath);
  const localRequire = (requestPath) => {
    if (requireOverrides[requestPath]) {
      return requireOverrides[requestPath]();
    }
    return createRequire(fullPath)(requestPath);
  };
  const context = vm.createContext({
    module,
    exports: module.exports,
    require: localRequire,
    __dirname: dirname,
    __filename: fullPath,
    process,
    console,
    Buffer,
    setTimeout,
    clearTimeout,
    ...globals,
  });

  new vm.Script(transpiled, { filename: fullPath }).runInContext(context);
  return module.exports;
}

test('auth expiry helper recognizes 401, code 7 and auth messages', () => {
  const mod = loadTsModule('perler-beads/src/services/api/authExpiry.ts');
  assert.equal(mod.isAuthExpiredApiResponse({ code: 401, msg: '登录已过期' }), true);
  assert.equal(mod.isAuthExpiredApiResponse({ code: 7, msg: '请先登录' }), true);
  assert.equal(mod.isAuthExpiredApiResponse({ code: 0, msg: 'token 无效' }), true);
  assert.equal(mod.isAuthExpiredApiResponse({ code: 0, msg: 'ok' }), false);
  assert.equal(mod.isAuthExpiredMessage('请重新登录后继续'), true);
});

test('clearToken clears storage and dispatches auth-cleared event', () => {
  const storage = new Map([
    ['perler_beads_token', 'abc'],
    ['perler_beads_user_info', '{"id":1}'],
  ]);
  const events = [];

  const localStorage = {
    getItem(key) {
      return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
      storage.set(key, String(value));
    },
    removeItem(key) {
      storage.delete(key);
    },
  };

  const window = {
    dispatchEvent(event) {
      events.push(event.type);
      return true;
    },
    CustomEvent: class CustomEvent {
      constructor(type) {
        this.type = type;
      }
    },
  };

  const authApi = loadTsModule(
    'perler-beads/src/services/api/authApi.ts',
    {
      localStorage,
      window,
      CustomEvent: window.CustomEvent,
    },
    {
      './authExpiry': () => loadTsModule('perler-beads/src/services/api/authExpiry.ts'),
    },
  );

  authApi.clearToken();

  assert.equal(storage.get('perler_beads_token'), undefined);
  assert.equal(storage.get('perler_beads_user_info'), undefined);
  assert.deepEqual(events, ['perler-auth-cleared']);
});

test('handleAuthExpiredApiResponse only triggers callback for auth-expired responses', () => {
  const calls = [];
  const helper = loadTsModule('perler-beads/src/services/api/authExpiry.ts');

  helper.handleAuthExpiredApiResponse({ code: 7, msg: '请先登录' }, () => calls.push('clear'));
  helper.handleAuthExpiredApiResponse({ code: 0, msg: 'ok' }, () => calls.push('nope'));

  assert.deepEqual(calls, ['clear']);
});

test('userStore initUser syncs logged-in and logged-out state from storage', async () => {
  let authState = {
    token: 'demo-token',
    userInfo: { id: 1, nickname: '演示用户' },
  };
  const syncCalls = [];

  const createMock = (initializer) => {
    let state;
    const set = (partial) => {
      state = { ...state, ...(typeof partial === 'function' ? partial(state) : partial) };
      Object.assign(store, state);
    };
    const get = () => state;
    state = initializer(set, get);
    const store = { ...state, getState: () => state };
    return store;
  };

  const storeModule = loadTsModule(
    'perler-beads/src/store/userStore.ts',
    {},
    {
      zustand: () => ({ create: createMock }),
      '../services/api/authApi': () => ({
        authApi: {},
        getToken: () => authState.token,
        getLocalUserInfo: () => authState.userInfo,
      }),
      '../services/myColorsService': () => ({
        myColorsService: {
          syncFromCloud: () => {
            syncCalls.push('sync');
            return Promise.resolve();
          },
        },
      }),
    },
  );

  const store = storeModule.useUserStore;
  store.initUser();
  assert.equal(store.getState().isLoggedIn, true);
  assert.deepEqual(store.getState().userInfo, authState.userInfo);

  authState = { token: null, userInfo: null };
  store.initUser();
  assert.equal(store.getState().isLoggedIn, false);
  assert.equal(store.getState().userInfo, null);
  assert.deepEqual(syncCalls, ['sync']);
});
