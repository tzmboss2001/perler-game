import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("SCRIPT/deploy_frontend_ssh.py", "utf8");

test("deploy script prompts for ssh password instead of requiring command-line password", () => {
  assert.match(source, /import getpass/);
  assert.match(source, /getpass\.getpass/);
  assert.doesNotMatch(source, /--password["'][\s\S]*?required=True/);
});

test("deploy script can read ssh password from process env without command-line password", () => {
  assert.match(source, /ENV_PASSWORD_KEY = "DEPLOY_FRONTEND_SSH_PASSWORD"/);
  assert.match(source, /os\.environ\.get\(ENV_PASSWORD_KEY\)/);
  assert.doesNotMatch(source, /add_argument\("--password"/);
});

test("deploy script does not embed sudo password in remote shell command", () => {
  assert.doesNotMatch(source, /printf '%s\\n'/);
  assert.doesNotMatch(source, /sudo_bash\(command:\s*str,\s*password:\s*str\)/);
  assert.match(source, /exec_cmd_with_password/);
});

test("deploy script sends sudo password without pty echo", () => {
  const match = source.match(
    /def exec_cmd_with_password\([\s\S]*?\n\n\ndef sudo_bash/,
  );
  assert.ok(match);
  assert.doesNotMatch(match[0], /get_pty=True/);
});
