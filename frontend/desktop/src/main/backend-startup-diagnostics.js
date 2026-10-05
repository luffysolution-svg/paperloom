const net = require("net");

function createBackendStartupDiagnostics(options = {}) {
  const getDesktopLogPath = typeof options.getDesktopLogPath === "function"
    ? options.getDesktopLogPath
    : () => "";
  let state = createEmptyState();

  function createEmptyState(command = "", cwd = "") {
    return {
      command,
      cwd,
      exitDetail: "",
      recentStdout: [],
      recentStderr: [],
    };
  }

  function reset(command = "", cwd = "") {
    state = createEmptyState(command, cwd);
  }

  function rememberOutput(kind, chunk) {
    const text = String(chunk || "").trimEnd();
    if (!text) {
      return;
    }
    const key = kind === "stderr" ? "recentStderr" : "recentStdout";
    state[key].push(text);
    state[key] = state[key].slice(-20);
  }

  function markExit(detail) {
    state.exitDetail = detail || "";
  }

  function hasExited() {
    return !!state.exitDetail;
  }

  // Did the backend die fast with a bind conflict (someone grabbed the port
  // between our probe and its bind)? Used to decide startup retry with
  // freshly re-allocated ports instead of failing outright.
  function hasBindConflict() {
    const haystack = [...state.recentStdout, ...state.recentStderr].join("\n");
    return /address already in use|EADDRINUSE|WSAEACCES|os error 48|bind .* failed/i.test(haystack);
  }

  function diagnostic(host, port, timeoutMs) {
    const desktopLogPath = getDesktopLogPath();
    return [
      `backend did not become ready on ${host}:${port}`,
      `timeout_ms=${timeoutMs}`,
      state.command ? `command=${state.command}` : "",
      state.cwd ? `cwd=${state.cwd}` : "",
      state.exitDetail ? `backend_exit=${state.exitDetail}` : "backend_exit=<still-running-or-unknown>",
      desktopLogPath ? `desktop_log=${desktopLogPath}` : "",
      state.recentStdout.length > 0 ? `recent_stdout:\n${state.recentStdout.join("\n")}` : "",
      state.recentStderr.length > 0 ? `recent_stderr:\n${state.recentStderr.join("\n")}` : "",
    ].filter(Boolean).join("\n");
  }

  function waitForBackendReady(host, port, timeoutMs) {
    return waitForPort(host, port, timeoutMs, {
      buildTimeoutMessage: diagnostic,
      shouldStopWaiting: hasExited,
    });
  }

  return {
    diagnostic,
    hasBindConflict,
    hasExited,
    markExit,
    rememberOutput,
    reset,
    waitForBackendReady,
  };
}

function waitForPort(host, port, timeoutMs, options = {}) {
  const buildTimeoutMessage = typeof options.buildTimeoutMessage === "function"
    ? options.buildTimeoutMessage
    : () => `backend did not become ready on ${host}:${port}`;
  const shouldStopWaiting = typeof options.shouldStopWaiting === "function"
    ? options.shouldStopWaiting
    : () => false;
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    function tryConnect() {
      const socket = net.connect({ host, port });
      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        if (shouldStopWaiting()) {
          reject(new Error(buildTimeoutMessage(host, port, timeoutMs)));
          return;
        }
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(buildTimeoutMessage(host, port, timeoutMs)));
          return;
        }
        setTimeout(tryConnect, 500);
      });
    }

    tryConnect();
  });
}

function canConnectToPort(host, port, timeoutMs = 800) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (result) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

// 连不上不代表绑得上：Windows 上 Hyper-V / WSL / Docker 会保留整段端口，
// 没人在听却 bind 失败。分配端口前用真实 bind 再确认一次。
function canBindPort(host, port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.listen({ host, port, exclusive: true }, () => server.close(() => resolve(true)));
  });
}

// 让系统挑一个当前可用的端口（附近端口全被保留时的兜底）。
function findEphemeralPort(host) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen({ host, port: 0, exclusive: true }, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

module.exports = {
  canBindPort,
  canConnectToPort,
  createBackendStartupDiagnostics,
  findEphemeralPort,
  waitForPort,
};
