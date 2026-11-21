# 被 entrypoint-app.sh 用 . 引进来，不单独执行。
#
# 交付包的 docker/auth.local.json 和 docker/web.env 带的是公开的占位 key。compose 给 app、web 两个容器
# 挂了同一个共享目录（RETAINPDF_SHARED_KEY_DIR）时，第一次启动生成一把随机 key 存进去，用 RUST_API_KEYS
# 交给后端（它优先于 auth.local.json）；web 容器的 15-backend-api-key.envsh 从同一个目录读。
# 旧 compose 没挂这个目录就照旧用占位 key，只打警告。自己设了 RUST_API_KEYS，或者 auth.local.json
# 换成了自己的 key，一律不动。占位 key 的字面量和后端 DELIVERY_PLACEHOLDER_API_KEY 是同一个。

RETAINPDF_PLACEHOLDER_API_KEY="replace-with-your-backend-key"

retainpdf_auth_file_has_only_placeholder() {
  python3 -I -c 'import json, sys
keys = [k.strip() for k in json.load(open(sys.argv[1], encoding="utf-8")).get("api_keys", []) if isinstance(k, str) and k.strip()]
sys.exit(0 if keys == [sys.argv[2]] else 1)' "$1" "$RETAINPDF_PLACEHOLDER_API_KEY" 2>/dev/null
}

retainpdf_resolve_api_key() {
  auth_file="$1"
  if [ -n "${RUST_API_KEYS+set}" ] || [ ! -f "$auth_file" ] || ! retainpdf_auth_file_has_only_placeholder "$auth_file"; then
    return 0
  fi
  key_dir="${RETAINPDF_SHARED_KEY_DIR:-}"
  if [ -z "$key_dir" ] || [ ! -d "$key_dir" ] || [ ! -w "$key_dir" ]; then
    echo "WARNING: $auth_file still holds the public placeholder API key." >&2
    echo "Replace it (and RETAINPDF_PROXY_API_KEY in web.env), or update docker-compose.yml so that a random key is generated on first start." >&2
    return 0
  fi
  key_file="$key_dir/backend-api-key"
  if [ ! -s "$key_file" ]; then
    (umask 077 && head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n' > "$key_file.tmp" && mv "$key_file.tmp" "$key_file")
    echo "Generated a random backend API key in $key_file (replacing the placeholder in $auth_file)." >&2
  fi
  RUST_API_KEYS="$(cat "$key_file")"
  export RUST_API_KEYS
}
