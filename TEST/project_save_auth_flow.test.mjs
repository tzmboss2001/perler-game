import test from "node:test";
import assert from "node:assert/strict";

import {
  isAuthExpiredApiResponse,
  normalizeProjectSaveFailure,
} from "../perler-beads/src/utils/projectSaveAuthFlow.js";

test("treats explicit 401 business code as auth expiry", () => {
  assert.equal(
    isAuthExpiredApiResponse({ code: 401, msg: "登录状态已过期，请重新登录" }),
    true,
  );
});

test("treats auth-related business message as auth expiry", () => {
  assert.equal(
    isAuthExpiredApiResponse({ code: 7, msg: "未登录或登录状态已失效，请先登录" }),
    true,
  );
});

test("does not treat generic cloud save failure as auth expiry", () => {
  assert.equal(
    isAuthExpiredApiResponse({ code: 7, msg: "创建失败: dial tcp timeout" }),
    false,
  );
});

test("normalizes auth expiry response to reauth action", () => {
  assert.deepEqual(
    normalizeProjectSaveFailure({ response: { code: 7, msg: "登录凭证无效，请重新登录" } }),
    {
      kind: "reauth",
      message: "登录状态已失效，请重新登录后继续云端保存。",
    },
  );
});

test("normalizes generic exception to local fallback action", () => {
  assert.deepEqual(
    normalizeProjectSaveFailure({ error: new Error("network timeout") }),
    {
      kind: "localFallback",
      message: "network timeout",
    },
  );
});

test("normalizes auth expiry exception message to reauth action", () => {
  assert.deepEqual(
    normalizeProjectSaveFailure({ error: new Error("登录状态已过期，请重新登录") }),
    {
      kind: "reauth",
      message: "登录状态已失效，请重新登录后继续云端保存。",
    },
  );
});
