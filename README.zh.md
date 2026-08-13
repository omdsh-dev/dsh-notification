# dsh-notification

DeepSeek Harness 的任务完成通知插件。页面打开时可弹出浏览器系统通知；可选的服务端 Webhook 运行在 DSH Host 中，关闭所有页面后仍能发送。

**无需改动 harness**：host 侧贡献一个会话投影（每个会话最近完成一轮的有界摘要），client 侧监听会话列表的完成提醒，并应用自己持久化的偏好设置。

```
host:   notification 投影 -> 浏览器客户端
        已提交的 turn/end -> 服务端 Webhook（可选）
client: 实时完成提醒 + 持久化设置
        -> 权限 + 当前会话可见性门控 -> Notification API
```

## 安装

```sh
dsh plugin --profile web add https://github.com/omdsh-dev/dsh-notification/archive/refs/heads/main.tar.gz
```

随后重启 web 服务以加载 host 半部分与新的 client bundle。默认的 `dsh web` profile 已包含所需 client 组合（会话列表、设置外壳、locale）。

设置段位于 **设置 > 通知**。

## 设置

| 设置项 | 默认 | 作用 |
| --- | --- | --- |
| 启用通知 | 开 | 总开关；关闭后不再弹出，规则与偏好保留。 |
| 正常完成 / 出错 / 中止 / 阻塞 / 达 Token 上限 | 完成 + 出错开，其余关 | 哪些结束状态触发通知（host 投影会报告结束原因）。 |
| 关键词规则 | 无 | 针对会话标题、该轮回复文本与调用过的工具名做包含/排除匹配。包含规则：至少命中一条才通知；排除规则：命中即不通知。支持字面量或正则，可区分大小写。 |
| 需要手动关闭 | 关 | 通知保持显示直到手动关闭。 |
| 仅在任务不在眼前时通知 | 开 | 只有完成任务所属会话正显示在眼前时才不提醒；页面在后台，或正在查看其他会话、其他工作区时仍会提醒。关闭后，即使正在观看该会话也会通知。同一会话的通知会互相替换。 |

偏好保存在浏览器（localStorage）。设置段内还可授予浏览器权限并发送测试通知。

## 服务端 Webhook

Webhook 默认关闭。在 `cordis.yml` 的插件配置中启用：

```yaml
- id: dsh-notification
  name: dsh-notification
  config:
    maxBodyChars: 400
    webhook:
      enabled: true
      reasons: [completed, error]
```

启动 DSH 前导出目标地址：

```sh
export DSH_NOTIFICATION_WEBHOOK_URL='https://notifications.example.com/dsh'
```

生成密钥，并将结果保存到 `$DSH_HOME/.credentials.yaml`（权限 `0600`）：

```sh
node -e "console.log('whsec_'+require('node:crypto').randomBytes(32).toString('base64'))"
```

```yaml
DSH_NOTIFICATION_WEBHOOK_SECRET: whsec_...
```

浏览器设置不影响 Webhook。Host 只发送顶层会话中匹配的 `turn/end`，忽略子 Agent。请验证 [Standard Webhooks](https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md) 签名并按 `webhook-id` 去重；第三方平台的专用 Webhook 可能需要中转。

```json
{"id":"msg_…","type":"dsh.turn.ended","timestamp":"2026-08-13T12:34:56.789Z","data":{"turn":3,"reason":"completed"}}
```

| 外发数据 | 默认 | 开启方式 |
| --- | --- | --- |
| 事件 ID、时间、轮次、结束状态 | 发送 | 始终存在 |
| DSH 会话 ID | 不发送 | `includeSessionId: true` |
| 该轮收集到的助手文本 | 不发送 | `includeBody: true`（受 `maxBodyChars` 限制） |
| 工具名（最多 32 个） | 不发送 | `includeTools: true` |

除本机开发外必须使用 HTTPS。`2xx` 表示成功；插件不跟随重定向，也不发送超过 16 KiB 的请求。提示词及工具参数、结果不会作为字段发送，但 `includeBody` 可能泄露模型文本中的敏感信息。

## 对模型的影响

| 方面 | 效果 |
| --- | --- |
| Token 开销 | 无 —— 通知绝不进入模型请求。 |
| 工具调用 | 无 —— 模型没有新增任何工具。 |
| 会话日志 | 不变 —— 投影只读已有日志，不新增事件。 |
| 提示词 | 不变 —— 不注册任何 system prompt 段。 |

## 权限边界

- host 侧对会话日志做纯投影折叠（轮次原因、有界的回复文本、工具名）；插件不写日志，不注册面向模型的工具。
- client 侧监听会话列表的完成提醒（运行时已计算的"未选中会话已完成"实时去重信号），仅在用户授予 Notification 权限后弹通知。
- 规则匹配在 client 侧针对投影内容进行；回复正文不超过 `maxBodyChars`。

## 开发

```sh
pnpm install            # 链接同级 dsh 仓库用于构建与测试
pnpm run check          # typecheck + tests + build
pnpm run test           # vitest（host 投影 + 组合、client 判定/runner/辅助函数/设置段）
pnpm run build          # esbuild host/client/invariant 打包 + tsc 声明
```

仓库依赖同级 `../dsh` 仓库用于开发期 `link:` 解析。组合测试用真实 `SessionStore` 与 `SessionProjectionRegistry` 验证投影折叠。

## 已知限制

- 浏览器通知需要页面和权限；Webhook 需要 DSH Host 进程保持运行。
- Webhook 使用有界内存队列和有限重试，可能重复投递；停止 Host 可能丢失待发送事件，也不会补发插件加载前已完成的轮次。
- 浏览器通知在每轮结束（任意会话的 running→idle 边沿）触发一次；断线期间完成的轮次在重连后不会补发。
- 规则匹配对象为会话标题 + 最近一轮的回复文本与工具名，不匹配更早的轮次。
- 通知正文是纯文本摘要；点击仅聚焦窗口（不深链到具体轮次）。

## License

MIT
