// 多用户模式的登录界面：登录，或者用管理员发的邀请码自己注册（没有找回密码：忘了找管理员重置）。
// 地址带 ?invite=… 时直接打开注册表单并填好邀请码。首次登录 / 密码被重置过的账号，登录后接着强制改密码。
import { useState, type FormEvent } from "react";
import { changePassword, login, logout, register as registerApi } from "@retainpdf/api/auth";
import { authErrorText } from "../domain/auth-errors.js";
import { readInviteParam, registerProblem } from "../domain/register.js";
import { ChangePasswordForm } from "./ChangePasswordForm.jsx";

const reload = () => globalThis.location?.reload();
// 注册成功已经是登录状态：回首页，顺手去掉地址栏里的邀请码。
const goHome = () => globalThis.location?.replace("./index.html");

export function LoginScreen({
  submit = login,
  onSuccess = reload,
  register = registerApi,
  onRegistered = goHome,
  initialInvite = readInviteParam(),
}: {
  submit?: (username: string, password: string) => Promise<unknown>;
  onSuccess?: () => void;
  register?: (inviteCode: string, username: string, password: string) => Promise<unknown>;
  onRegistered?: () => void;
  initialInvite?: string;
}) {
  const [mode, setMode] = useState<"login" | "register">(initialInvite ? "register" : "login");
  return mode === "register" ? (
    <RegisterCard initialInvite={initialInvite} register={register} onRegistered={onRegistered} onLogin={() => setMode("login")} />
  ) : (
    <LoginCard submit={submit} onSuccess={onSuccess} onRegister={() => setMode("register")} />
  );
}

function LoginCard({
  submit,
  onSuccess,
  onRegister,
}: {
  submit: (username: string, password: string) => Promise<unknown>;
  onSuccess: () => void;
  onRegister: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError("请填用户名和密码。");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await submit(username.trim(), password);
      onSuccess();
    } catch (err) {
      setError(authErrorText(err, "登录失败，请稍后再试。"));
      setBusy(false);
    }
  }

  return (
    <main className="auth-screen" data-auth-screen="login">
      <section className="auth-card" aria-label="登录">
        <h1>RetainPDF</h1>
        <p className="auth-sub">请用你的账号登录。</p>
        <form className="auth-form" onSubmit={onSubmit} data-auth-form="login">
          <label className="auth-field">
            <span>用户名</span>
            <input autoComplete="username" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} />
          </label>
          <label className="auth-field">
            <span>密码</span>
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error ? <p className="auth-error" role="alert">{error}</p> : null}
          <button type="submit" className="auth-primary" disabled={busy}>{busy ? "正在登录…" : "登录"}</button>
        </form>
        <p className="auth-foot">
          收到了邀请码？<button type="button" className="auth-link auth-inline-link" data-auth-action="to-register" onClick={onRegister}>用邀请码注册</button>
        </p>
        <p className="auth-foot">忘了密码请联系管理员重置。</p>
      </section>
    </main>
  );
}

function RegisterCard({
  initialInvite,
  register,
  onRegistered,
  onLogin,
}: {
  initialInvite: string;
  register: (inviteCode: string, username: string, password: string) => Promise<unknown>;
  onRegistered: () => void;
  onLogin: () => void;
}) {
  const [inviteCode, setInviteCode] = useState(initialInvite);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const problem = registerProblem({ inviteCode, username, password, confirm });
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await register(inviteCode.trim(), username.trim(), password);
      onRegistered();
    } catch (err) {
      // 后端的原因都是中文（邀请码不对 / 作废 / 过期 / 用完、用户名被占用……），失败时邀请码不会被用掉。
      setError(authErrorText(err, "注册失败，请稍后再试。"));
      setBusy(false);
    }
  }

  return (
    <main className="auth-screen" data-auth-screen="register">
      <section className="auth-card" aria-label="用邀请码注册">
        <h1>用邀请码注册</h1>
        <p className="auth-sub">填管理员给你的邀请码，再设一个用户名和密码。注册完直接登录。</p>
        <form className="auth-form" onSubmit={onSubmit} data-auth-form="register">
          <label className="auth-field">
            <span>邀请码</span>
            <input
              autoComplete="off"
              spellCheck={false}
              autoFocus={!initialInvite}
              placeholder="ABCD-EFGH-JKMN"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
            />
          </label>
          <label className="auth-field">
            <span>用户名</span>
            <input autoComplete="username" autoFocus={Boolean(initialInvite)} value={username} onChange={(e) => setUsername(e.target.value)} />
            <small>3～32 位，字母、数字、点、下划线、连字符</small>
          </label>
          <label className="auth-field">
            <span>密码</span>
            <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <small>8～128 位</small>
          </label>
          <label className="auth-field">
            <span>确认密码</span>
            <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </label>
          {error ? <p className="auth-error" role="alert">{error}</p> : null}
          <button type="submit" className="auth-primary" disabled={busy}>{busy ? "正在注册…" : "注册并登录"}</button>
        </form>
        <p className="auth-foot">
          已经有账号了？<button type="button" className="auth-link auth-inline-link" data-auth-action="to-login" onClick={onLogin}>去登录</button>
        </p>
      </section>
    </main>
  );
}

export function ForcedPasswordScreen({
  username = "",
  submit = changePassword,
  onDone = reload,
  onLogout = () => { void logout().finally(reload); },
}: {
  username?: string;
  submit?: (current: string, next: string) => Promise<unknown>;
  onDone?: () => void;
  onLogout?: () => void;
}) {
  return (
    <main className="auth-screen" data-auth-screen="change-password">
      <section className="auth-card" aria-label="设置新密码">
        <h1>设置新密码</h1>
        <p className="auth-sub">{username ? `${username}，` : ""}管理员给的是初始密码，请先换成你自己的密码再开始使用。</p>
        <ChangePasswordForm submit={submit} onDone={onDone} submitLabel="保存并进入" currentLabel="初始密码" />
        <button type="button" className="auth-link" onClick={onLogout}>换一个账号登录</button>
      </section>
    </main>
  );
}

export function AuthErrorScreen({ message }: { message: string }) {
  return (
    <main className="auth-screen" data-auth-screen="error">
      <section className="auth-card" aria-label="出错了">
        <h1>RetainPDF</h1>
        <p className="auth-error" role="alert">{message}</p>
        <button type="button" className="auth-primary" onClick={reload}>重试</button>
      </section>
    </main>
  );
}
