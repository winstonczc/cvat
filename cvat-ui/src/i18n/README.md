# CVAT UI 多语言迁移规范

> 所有 i18n 迁移工作（人工或子代理）必须遵循本规范。
> 设计方案见 `/Users/winston/Desktop/projects/cvat需求/cvat多语言支持-设计方案.md`。

## 1. Key 约定

- **英文原文即 key**。`keySeparator: false`、`nsSeparator: '::'` 已配置，原文中的 `.` 不会冲突。
- 命名空间引用：`t('header::Projects')` 或 `useTranslation('header')` 后直接 `t('Projects')`。
- 通用文案（OK/Cancel/Save/Delete/Search…）放 `common` 命名空间，其他模块用 `t('common::Save')` 引用，**不要重复翻译**。
- 每个功能模块用各自的命名空间（见 `src/i18n/resources.ts` 的 NAMESPACES），**不要新增命名空间**；确需新增时先改 `resources.ts`（运行 `python3 scripts/gen-i18n-resources.py` 重新生成）。

## 2. 代码改造规则

- **React 组件**：顶部 `import { useTranslation } from 'react-i18next';`，组件内 `const { t } = useTranslation('<ns>');`。
- **非 React 上下文**（reducer、action、util、模块顶层常量）：`import i18n from 'i18next';` 后 `i18n.t('<ns>::原文')`。
- **模块顶层求值的常量数组/对象**（菜单项、角色选项、过滤器配置等）含文案的，必须改为**函数或组件内求值**，否则切换语言后不更新：
  ```ts
  // ❌ const items = [{ label: 'Worker' }];
  // ✅ const getItems = () => [{ label: i18n.t('common::Worker') }];
  ```
- **插值**：`t('Delete {{count}} items?', { count })`，禁止字符串拼接译文。
- **复数**：语言包用 `_one`/`_other` 后缀（中文只需要 `_other`，但 en 必须提供 `_one`/`_other`）。代码侧 `t('{{count}} item', { count })`。
- **富文本**（含链接/加粗的文案）：用 `<Trans i18nKey='...' ns='...'>`，不要把 HTML 拼进语言包。
- **cvat-core 枚举值**（JobState/JobStage/ShapeType/LabelType/Source 等原样渲染处）：用 `import { enumLabel } from 'i18n/enum-labels';` 包一层，枚举值本身不改。
- 语言包中**禁止翻译**：品牌名 CVAT、URL、快捷键字母（如 `Ctrl`、方向键名可翻）、代码片段、文件格式名（COCO、YOLO、KITTI 等）、`cvat-*` class 名。

## 3. 不破坏现有行为

- **最小 diff**：只把字符串包进 `t()`，不改组件结构/样式/className/data 属性/key（Cypress 依赖）。
- **英文渲染必须逐字节不变**：en 语言包 key → value 恒等。
- antd 命令式 API（`message.*`/`notification.*`/`Modal.confirm`）的文案照常 `i18n.t()` 包裹即可，按钮 OK/Cancel 已由 `ConfigProvider.config` 全局兜底。

## 4. 语言包填写

每个命名空间维护 5 个文件：`locales/{en,zh-Hans,zh-Hant,de,es}/<ns>.json`。

- **en**：value 与 key 完全相同。
- **zh-Hans / zh-Hant / de / es**：给出地道翻译，术语按下表统一。
- 所有语言的同一命名空间 **key 集合必须完全一致**。
- 插值占位符 `{{var}}` 在各语言中必须保留且拼写一致。

## 5. 术语表（必须统一）

| English | 简体中文 | 繁體中文 | Deutsch | Español |
|---|---|---|---|---|
| Project | 项目 | 專案 | Projekt | Proyecto |
| Task | 任务 | 任務 | Aufgabe | Tarea |
| Job | 作业 | 作業 | Job | Trabajo |
| Label | 标签 | 標籤 | Label | Etiqueta |
| Tag | 标记 | 標記 | Tag | Marca |
| Mask | 掩码 | 遮罩 | Maske | Máscara |
| Tracker | 跟踪器 | 跟蹤器 | Tracker | Tracker |
| Interactor | 交互器 | 互動器 | Interaktor | Interactor |
| Attribute | 属性 | 屬性 | Attribut | Atributo |
| Track | 轨迹 | 軌跡 | Track | Trayectoria |
| Shape | 形状 | 形狀 | Form | Forma |
| Annotation | 标注 | 標註 | Annotation | Anotación |
| Cloud Storage | 云存储 | 雲端儲存 | Cloud-Speicher | Almacenamiento en la nube |
| Model | 模型 | 模型 | Modell | Modelo |
| Organization | 组织 | 組織 | Organisation | Organización |
| Request | 请求 | 請求 | Anfrage | Solicitud |
| Webhook | Webhook | Webhook | Webhook | Webhook |
| Issue | 问题 | 問題 | Problem | Problema |
| Frame | 帧 | 幀 | Frame | Fotograma |
| Skeleton | 骨架 | 骨架 | Skelett | Esqueleto |
| Canvas | 画布 | 畫布 | Canvas | Lienzo |
| Save | 保存 | 儲存 | Speichern | Guardar |
| Cancel | 取消 | 取消 | Abbrechen | Cancelar |
| Delete | 删除 | 刪除 | Löschen | Eliminar |
| Search | 搜索 | 搜尋 | Suchen | Buscar |

> **zh-Hant 台灣用語**（OpenCC s2twp 轉換後須再確認）：激活→啟用、默認→預設、服務器→伺服器、賬戶→帳戶、所有者→擁有者、掩碼→遮罩、銷燬→銷毀、云存储→雲端儲存。

## 6. 验收（每个模块迁移后）

1. `npx tsc --noEmit -p cvat-ui` 通过。
2. 该模块所有用户可见字符串已包裹（JSX 文本、placeholder/title/label/tooltip/okText 等 props、`message/notification/Modal` 调用、表单 rules.message、顶层常量已函数化）。
3. 5 个语言 JSON 的 key 集合一致、占位符一致、JSON 合法。
