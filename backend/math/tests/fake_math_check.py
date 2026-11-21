"""假的公式检查服务：协议和引擎的 bin/rpr-math-check.js 一样。tex 里有 BAD 就报错；有 CRASH 就直接退出；
有 HANG 就不回。启动参数 --dead 时连 ready 都不发就退出。每个请求记一行到 sys.argv[1] 指定的文件，测缓存用。"""

import json
import sys
import time

log_path = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else ""
if "--dead" in sys.argv:
    sys.exit(3)
print(json.dumps({"ready": True, "engine": "fake"}), flush=True)
for line in sys.stdin:
    request = json.loads(line)
    if log_path:
        with open(log_path, "a", encoding="utf-8") as log:
            log.write(request["tex"] + "\n")
    tex = request["tex"]
    if "CRASH" in tex:
        sys.exit(1)
    if "HANG" in tex:
        time.sleep(30)
    reply = {"id": request["id"], "ok": "BAD" not in tex}
    if not reply["ok"]:
        reply["error"] = "fake error"
    print(json.dumps(reply), flush=True)
