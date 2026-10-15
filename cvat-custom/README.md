# CVAT 平台集成定制（cvat-custom）

本目录是 SMCB 无人机平台对上游 CVAT（2.78.1 CE）的一层**无侵入式定制**，目标只有两件事：

1. **免密单点登录（SSO）**：平台侧签发的短期 JWT 通过 `GET /api/auth/platform-sso` 换取 CVAT 会话，
   用户在平台里点开 CVAT 时无需再登录一次。
2. **允许 iframe 嵌入**：平台页面用 `<iframe>` 内嵌 CVAT。为此需要去掉 `X-Frame-Options: deny`，
   改用 `Content-Security-Policy: frame-ancestors` 精确声明允许的来源，同时放通跨域/CSRF 与
   独立的 Cookie 名，避免与平台自身的会话互相覆盖。

整套定制的关键约束是：**不修改任何 CVAT 既有源码文件**。所有改动都通过挂载（bind mount）以
override 的形式叠加到上游容器上，因此升级 CVAT 时冲突面极小。

---

## 目录结构

| 文件 | 作用 |
| --- | --- |
| `nginx.conf` | CVAT 后端 nginx 配置（挂载到 cvat_server 的 `/etc/nginx/nginx.conf`），去掉 X-Frame-Options、改用 CSP frame-ancestors。 |
| `react_nginx.conf` | CVAT UI（前端）nginx 配置（挂载到 cvat_ui 的 `/etc/nginx/conf.d/default.conf`），同样放开 iframe 嵌入。 |
| `docker-compose.platform.yml` | compose override，注入环境变量并挂载上述配置、settings、SSO 中间件与密钥。 |
| `.env.example` | 所有可配置环境变量的示例（占位值，无真实密钥）。 |
| `scripts/gen-sso-token.py` | 本地验证用：用私钥签一个短期 JWT 并打印完整免登 URL。 |
| `scripts/gen-keys.sh` | 生成 RS256 密钥对（私钥 0600、公钥 0644，已存在时不覆盖）。 |
| `scripts/verify-sso.sh` | 端到端免登验证脚本（不需要 UI）。 |
| `scripts/iframe-test.sh` | 生成一个内嵌 CVAT 的本地测试页，供**浏览器人工验证** iframe 嵌入。 |
| `keys/` | 存放 SSO 的 RSA 密钥对（`*.pem` 已被 `.gitignore` 忽略，绝不入库）。 |
| `settings.py` | Django settings overlay：LDAP、跨域/CSRF、Cookie 隔离、摘掉 `XFrameOptionsMiddleware`、注册 SSO 中间件。 |
| `platform_sso/` | SSO 中间件：拦截 `/api/auth/platform-sso`，验签后建立 CVAT 会话。 |

---

## 改动清单（相对上游 CVAT）

**新增文件（全部位于 `cvat-custom/`）：**

- `cvat-custom/nginx.conf` —— 复制自 `cvat/nginx.conf`，改动仅 3 处（顶部说明注释、
  删除 `X-Frame-Options` 兜底 map、`add_header` 改为 CSP）。
- `cvat-custom/react_nginx.conf` —— 复制自 `cvat-ui/react_nginx.conf`，改动仅 1 处
  （`X-Frame-Options: deny` → CSP frame-ancestors）。
- `cvat-custom/docker-compose.platform.yml` —— 新增 override。
- `cvat-custom/.env.example` —— 新增。
- `cvat-custom/scripts/gen-sso-token.py`、`cvat-custom/scripts/verify-sso.sh` —— 新增。
- `cvat-custom/README.md` —— 新增（本文件）。
- `cvat-custom/settings.py` —— 新增（Django settings overlay）。
- `cvat-custom/platform_sso/**` —— 新增（SSO 中间件）。

**修改的上游文件：无。**

> 强调：**没有修改任何 CVAT 既有源码文件**。上游的 `cvat/nginx.conf`、`cvat-ui/react_nginx.conf`
> 保持原样，定制版是它们各自的一份副本，通过 compose override 挂载覆盖容器内路径。
> 仓库根的 `docker-compose.override.yml` 也未被本定制改动。

---

## 本地启动步骤

在**仓库根目录**执行（以下命令均假设 cwd 为仓库根）：

### 1. 生成 SSO 密钥对

`keys/` 下需要一对 RSA 密钥。优先用仓库自带的辅助脚本生成：

```bash
bash cvat-custom/scripts/gen-keys.sh
```

若没有该脚本，也可用 openssl 手工生成：

```bash
openssl genrsa -out cvat-custom/keys/cvat_sso_private.pem 2048
openssl rsa -in cvat-custom/keys/cvat_sso_private.pem \
  -pubout -out cvat-custom/keys/cvat_sso_public.pem
```

- 私钥 `cvat_sso_private.pem` 仅用于本地签发 token，**绝不入库**。
- 公钥 `cvat_sso_public.pem` 会被挂载进 cvat_server，供中间件验签。

### 2.（可选）构建 cvat_ui

基础 `docker-compose.yml` 只声明了 `image: cvat/ui:${CVAT_VERSION:-dev}`，本地通常没有该镜像。
**只想验证 SSO/接口**时可以跳过本步，只起后端；**要在浏览器里看界面并确认 iframe 嵌入**时再构建：

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml build cvat_ui
```

> **Docker Hub 不可达时**：buildkit 不会使用 daemon 配置的 registry mirror，会直接连
> `registry-1.docker.io` 而失败。绕过办法是先用 daemon（会走 mirror）把两个基础镜像拉到本地，
> 再用 legacy builder 构建：
>
> ```bash
> docker pull nginxinc/nginx-unprivileged:1.31.6-alpine3.24-slim
> docker pull node:lts-slim
> DOCKER_BUILDKIT=0 docker build -f Dockerfile.ui -t cvat/ui:dev .
> ```
>
> 该构建会执行完整的 `yarn install --immutable` + `yarn run build:cvat-ui`，耗时较长。

### 3. 准备环境变量（可选）

```bash
cp cvat-custom/.env.example .env   # 按需修改，默认值即可满足本地验证
```

### 4. 启动

> ⚠️ **一旦显式指定 `-f`，compose 就不再自动加载仓库根的 `docker-compose.override.yml`**。
> 该文件里含本地端口映射（宿主 `7000` → 容器 `8080`），漏掉它会导致服务起得来但端口不通。
> 因此本地开发请把三个文件都列上：

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.override.yml \
  -f cvat-custom/docker-compose.platform.yml \
  up -d
```

只验证后端时，也可只起 `cvat_server`（把上面的 `up -d` 换成 `up -d cvat_server`）：

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.override.yml \
  -f cvat-custom/docker-compose.platform.yml \
  up -d cvat_server
```

### 5. 验证

```bash
bash cvat-custom/scripts/verify-sso.sh
```

---

## 验证方法

`bash cvat-custom/scripts/verify-sso.sh` 会做一次**端到端免登验证**，共 7 步：

1. **容器在跑**：确认 `cvat_server` 容器处于运行状态；
2. **签发令牌**：用 `gen-sso-token.py` 签一个 60s 有效的 RS256 JWT 并拼出免登 URL；
3. **会话建立**：请求免登 URL，断言返回 `302`（登录成功）；
4. **拿到会话 Cookie**：断言响应里带 `cvat_sessionid`；
5. **身份正确**：带着该 cookie 请求 `GET /api/users/self`，断言 `200` 且 `username` 与传入值一致；
6. **重放防护**：用同一个 URL 再请求一次，断言返回 `400`（`jti` 已被消费）；
7. **允许嵌入**：断言响应头里**没有** `X-Frame-Options`（或不是 `deny`）。

可覆盖用户名：

```bash
bash cvat-custom/scripts/verify-sso.sh --username alice --cvat-url http://localhost:7000
```

脚本依赖：`docker`、`curl`、`python3`。签发用的 `pyjwt[crypto]` **宿主没有也能跑** ——
脚本会自动回退到 `cvat/server` 镜像自带的解释器（镜像里已含 pyjwt），以只读方式挂载仓库后
在一次性容器里签发。`jq` 可选（缺失时自动降级为 grep 解析）。
所有路径基于脚本自身位置解析，可在任意 cwd 下运行。

单独签一个 token 看免登 URL（调试用）：

```bash
python3 cvat-custom/scripts/gen-sso-token.py -u alice --roles admin,worker
```

### iframe 嵌入的浏览器验证

`verify-sso.sh` 只能证明**服务端**不再下发 `X-Frame-Options`，**不能**证明浏览器真的肯渲染。
最后这一步需要人工用浏览器确认：

```bash
bash cvat-custom/scripts/iframe-test.sh --username iframetest --ttl 600
```

脚本会签一个免登 JWT、生成 `/tmp/cvat-iframe-test.html`（一个把免登 URL 塞进 `<iframe>` 的页面），
用浏览器打开它即可。页面上方有状态条，会显示 iframe 是否触发了 `load`；10 秒内没触发会标红提示。

需要确认三件事：

1. CVAT 标注界面正常显示在页面里（不是空白、不是报错页）；
2. 无需再输密码，已是 `iframetest` 的登录态；
3. DevTools 控制台里没有 `Refused to display ... in a frame` / `frame-ancestors` 报错。

> ⚠️ 令牌是**一次性**的：页面打开的那一刻 `jti` 就被消费，**刷新会 400**。要再开一次会话就重跑脚本。
> 因此手动验证时用 `--ttl 600` 之类的宽裕值，别用默认的 60 秒。

建议至少覆盖 Chrome（普通 + 无痕）、Safari（ITP）、Firefox（严格模式）三种内核 —— 各家对
第三方 Cookie 的默认策略差异最大，跨域会话能不能活下来主要看这个。

---

## 生产部署注意事项

1. **必须替换 nginx 里的来源占位值。** `cvat-custom/nginx.conf` 与 `cvat-custom/react_nginx.conf`
   中写死了 `http://localhost:5173`（nginx 不会替换 `add_header` 值里的 `${...}`，故写死以便排查）。
   上线前替换为实际平台域名，例如 `https://platform.example.com`。
2. **按生产环境设置环境变量。** 至少确认：
   - `PLATFORM_ORIGIN` = 平台实际来源（写入 CSP、CSRF/CORS 白名单、JWT `iss`）；
   - `CVAT_ORIGIN` = CVAT 实际对外来源；
   - `COOKIE_DOMAIN` = 需要跨子域共享登录态时填写（如 `.example.com`）；
   - `COOKIE_SECURE` = **HTTPS 环境必须设为 `true`**。
3. **私钥绝不入库。** `cvat-custom/keys/.gitignore` 已忽略 `*.pem`；私钥只放在部署机/密钥管理系统，
   仓库里只应有公钥或干脆都不放。
4. **LDAP 段按需启用。** 仅当设置了 `LLDAP_URI` 时，`settings.py` 才会启用 `django_auth_ldap`
   并读取 `LLDAP_BIND_DN` / `LLDAP_ADMIN_PASSWORD`；留空则 CVAT 保持 BASIC 认证，
   本地验证 SSO 时无需 LLDAP。
5. **CSP 收敛。** 若平台来源不止一个，请把 `frame-ancestors` 写成以空格分隔的多个来源，
   保持"只允许受信平台嵌入"的最小授权。

---

## 上游升级指引

本定制的所有内容都在 `cvat-custom/` 内，对上游文件是**只读复制 + 挂载覆盖**，因此升级步骤很轻：

1. `git fetch upstream && git rebase upstream/develop`（或目标 tag）。
2. 若上游改动了 `cvat/nginx.conf` 或 `cvat-ui/react_nginx.conf`，重新把它们的改动合并进
   `cvat-custom/` 下的同名副本即可（保持"仅 iframe 相关的这几处差异"）。
3. 重新构建/重启：
   ```bash
   docker compose -f docker-compose.yml -f cvat-custom/docker-compose.platform.yml up -d --build
   ```
4. 重跑 `bash cvat-custom/scripts/verify-sso.sh` 确认免登与嵌入仍正常。

由于上游源码零改动，rebase 时不会因本定制产生冲突；唯一需要人工关注的是上游 nginx 配置的演进。
