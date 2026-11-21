/** 读构建产物的门禁，先确认那份产物不是陈旧的。
 *
 * `tests/layout/*` 量的是 `dist/css/reader.css`（真浏览器里的层叠结果），而
 * `npm test` 的 pretest 只跑 prepare:workspace、CI 的 frontend job 只跑包的 build ——
 * **两边都不重建 dist/css**，而那个文件又是被 git 跟踪的。于是改完源 CSS 不跑
 * `build:css`，门禁读的还是上次提交的产物，照样绿。
 *
 * 另外原来缺产物时是 `t.skip()` —— 静默放过。跳过的门禁和不存在的门禁没区别。
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import {
  computeReaderCssFingerprint,
  FINGERPRINT_PATH,
} from "../../scripts/css-source-fingerprint.mjs";

const REBUILD = "先跑 `npm --prefix frontend/web run build:css`";

/** 产物缺失或比源 CSS 旧时**硬失败**。 */
export function assertReaderCssIsFresh(cssPath) {
  assert.ok(existsSync(cssPath), `dist/css/reader.css 还没构建 —— ${REBUILD}`);
  assert.ok(
    existsSync(FINGERPRINT_PATH),
    `dist/css 里没有源指纹（产物是老版本 build-css 产的）—— ${REBUILD}`,
  );
  const recorded = readFileSync(FINGERPRINT_PATH, "utf8").trim();
  assert.equal(
    computeReaderCssFingerprint(),
    recorded,
    "源 CSS 改过但 dist/css/reader.css 没重建 —— 这条门禁量的是构建产物，"
      + `读的会是上次提交的那一份。${REBUILD}`,
  );
}
