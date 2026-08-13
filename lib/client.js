window.__ModuleLoader__.load({ id: 'dsh-notification', factory: (require) => { var module = { exports: {} }; var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.ts
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);

// src/client/SettingsSection.tsx
var import_react = require("react");

// src/client/notifier.ts
function titleKey(reason) {
  switch (reason) {
    case "completed":
      return "notify.titleCompleted";
    case "error":
      return "notify.titleError";
    case "aborted":
      return "notify.titleAborted";
    case "blocked":
      return "notify.titleBlocked";
    case "max-tokens":
      return "notify.titleMaxTokens";
  }
}
function bodyText(body, emptyBody) {
  const trimmed = body.trim();
  return trimmed === "" ? emptyBody : trimmed;
}
function shouldShow(permission, backgroundOnly, documentHidden, completedSessionId, currentSessionId) {
  if (permission !== "granted") return false;
  if (backgroundOnly && !documentHidden && completedSessionId === currentSessionId) return false;
  return true;
}
function notificationTag(sessionId) {
  return `dsh-notification-${sessionId}`;
}
function notificationsApi() {
  return typeof Notification === "undefined" ? void 0 : Notification;
}

// src/client/rules.ts
function mintRuleId() {
  return crypto.randomUUID();
}
function emptyRule() {
  return { id: mintRuleId(), enabled: true, mode: "include", pattern: "", isRegex: false, caseSensitive: false };
}
function ruleError(rule) {
  if (rule.pattern.trim() === "") return "settings.rules.invalid";
  if (rule.isRegex) {
    try {
      new RegExp(rule.pattern);
    } catch {
      return "settings.rules.invalidRegex";
    }
  }
  return void 0;
}
function firstRuleError(rules) {
  for (let index = 0; index < rules.length; index++) {
    const key = ruleError(rules[index]);
    if (key !== void 0) return { index, key };
  }
  return void 0;
}
function patchRule(rules, id, patch) {
  return rules.map((rule) => rule.id === id ? { ...rule, ...patch } : rule);
}
function removeRule(rules, id) {
  return rules.filter((rule) => rule.id !== id);
}

// src/client/SettingsSection.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var OUTCOMES = [
  { field: "notifyCompleted", key: "settings.when.completed", defaultValue: true },
  { field: "notifyError", key: "settings.when.error", defaultValue: true },
  { field: "notifyAborted", key: "settings.when.aborted", defaultValue: false },
  { field: "notifyBlocked", key: "settings.when.blocked", defaultValue: false },
  { field: "notifyMaxTokens", key: "settings.when.maxTokens", defaultValue: false }
];
function notifyPatch(field, checked) {
  return { [field]: checked };
}
function Toggle(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dsh_notification_toggleRow", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "input",
      {
        type: "checkbox",
        className: "dsh_notification_checkbox",
        defaultChecked: props.defaultChecked,
        onChange: (event) => {
          props.onChange(event.target.checked);
        }
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dsh_notification_toggleText", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh_notification_toggleLabel", children: props.label }),
      props.desc === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh_notification_toggleDesc", children: props.desc })
    ] })
  ] });
}
function RuleRow(props) {
  const { rule, t } = props;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh_notification_ruleRow", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "select",
      {
        className: "dsh_notification_ruleSelect",
        value: rule.mode,
        "aria-label": t("settings.rules.mode.include"),
        onChange: (event) => {
          props.onPatch({ mode: event.target.value === "exclude" ? "exclude" : "include" });
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "include", children: t("settings.rules.mode.include") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "exclude", children: t("settings.rules.mode.exclude") })
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "input",
      {
        type: "text",
        className: "dsh_notification_ruleInput",
        placeholder: t("settings.rules.patternPlaceholder"),
        value: rule.pattern,
        autoFocus: props.autoFocus,
        onChange: (event) => {
          props.onPatch({ pattern: event.target.value });
        }
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dsh_notification_ruleCheck", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          type: "checkbox",
          checked: rule.isRegex,
          onChange: (event) => {
            props.onPatch({ isRegex: event.target.checked });
          }
        }
      ),
      t("settings.rules.regex")
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dsh_notification_ruleCheck", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          type: "checkbox",
          checked: rule.caseSensitive,
          onChange: (event) => {
            props.onPatch({ caseSensitive: event.target.checked });
          }
        }
      ),
      t("settings.rules.case")
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "button",
      {
        type: "button",
        className: "dsh_notification_ruleDelete",
        "aria-label": t("settings.rules.remove"),
        onClick: props.onRemove,
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { viewBox: "0 0 16 16", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { fill: "currentColor", d: "M4.2 3.5h7.6l-.7 9.2a1 1 0 0 1-1 .8H5.9a1 1 0 0 1-1-.8l-.7-9.2Zm.9 1 .6 8h4.6l.6-8H5.1ZM6 1h4v1H6V1Zm-3 2h10v1H3V3Z", fillRule: "evenodd" }) })
      }
    ),
    props.errorKey === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh_notification_error", children: t(props.errorKey) })
  ] });
}
function NotificationSettingsSection({ useSettings, set, requestPermission, sendTest, t }) {
  const settings = useSettings((snapshot) => snapshot);
  const [permission, setPermission] = (0, import_react.useState)(() => notificationsApi()?.permission ?? "denied");
  const [draft, setDraft] = (0, import_react.useState)(null);
  const [focusedRuleId, setFocusedRuleId] = (0, import_react.useState)(null);
  const durable = settings?.rules ?? [];
  const rules = draft ?? durable;
  const dirty = draft !== null;
  const error = firstRuleError(rules);
  const edit = (updater) => {
    setDraft(updater(draft ?? durable));
  };
  const addRule = () => {
    const rule = emptyRule();
    edit((list) => [...list, rule]);
    setFocusedRuleId(rule.id);
  };
  const saveRules = () => {
    if (draft === null) return;
    set({ rules: draft });
    setDraft(null);
    setFocusedRuleId(null);
  };
  const onRequestPermission = async () => {
    setPermission(await requestPermission());
  };
  const permissionText = t(`settings.permission.${permission}`);
  const badgeClass = permission === "granted" ? "dsh_notification_badgeGranted" : permission === "denied" ? "dsh_notification_badgeDenied" : "dsh_notification_badgeDefault";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "dsh_notification_section", "aria-labelledby": "dsh-notification-settings-title", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh_notification_heading", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { id: "dsh-notification-settings-title", className: "dsh_notification_title", children: t("settings.title") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsh_notification_subtitle", children: t("settings.subtitle") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh_notification_card", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      Toggle,
      {
        defaultChecked: settings?.enabled ?? true,
        label: t("settings.enabled"),
        desc: t("settings.enabledDesc"),
        onChange: (checked) => {
          set({ enabled: checked });
        }
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh_notification_card", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh_notification_cardTitle", children: t("settings.permission.title") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh_notification_cardDesc", children: t("settings.permission.desc") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh_notification_permissionRow", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `dsh_notification_badge ${badgeClass}`, children: permissionText }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dsh_notification_button dsh_notification_buttonGhost", onClick: () => {
          void onRequestPermission();
        }, children: t("settings.permission.request") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: "dsh_notification_button dsh_notification_buttonPrimary",
            disabled: permission !== "granted",
            onClick: sendTest,
            children: t("settings.permission.test")
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh_notification_card", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh_notification_cardTitle", children: t("settings.when.title") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh_notification_cardDesc", children: t("settings.when.subtitle") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh_notification_grid", children: OUTCOMES.map(({ field, key, defaultValue }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        Toggle,
        {
          defaultChecked: settings?.[field] ?? defaultValue,
          label: t(key),
          onChange: (checked) => {
            set(notifyPatch(field, checked));
          }
        },
        field
      )) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh_notification_card", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh_notification_cardTitle", children: t("settings.rules.title") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh_notification_cardDesc", children: t("settings.rules.subtitle") })
      ] }),
      rules.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh_notification_empty", children: t("settings.rules.empty") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh_notification_rules", children: rules.map((rule, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        RuleRow,
        {
          rule,
          t,
          autoFocus: rule.id === focusedRuleId,
          errorKey: error !== void 0 && error.index === index ? error.key : void 0,
          onPatch: (patch) => {
            edit((list) => patchRule(list, rule.id, patch));
          },
          onRemove: () => {
            edit((list) => removeRule(list, rule.id));
          }
        },
        rule.id
      )) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh_notification_rulesFooter", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dsh_notification_button dsh_notification_buttonGhost", onClick: addRule, children: t("settings.rules.add") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: "dsh_notification_button dsh_notification_buttonPrimary",
            disabled: !dirty || error !== void 0,
            title: !dirty || error !== void 0 ? error !== void 0 ? t(error.key) : t("settings.rules.saveHint") : void 0,
            onClick: saveRules,
            children: t("settings.rules.save")
          }
        ),
        error !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh_notification_error", children: t(error.key) }) : dirty ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh_notification_unsavedHint", children: t("settings.rules.unsaved") }) : null
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh_notification_card", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh_notification_cardTitle", children: t("settings.advanced.title") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        Toggle,
        {
          defaultChecked: settings?.requireInteraction ?? false,
          label: t("settings.advanced.requireInteraction"),
          desc: t("settings.advanced.requireInteractionDesc"),
          onChange: (checked) => {
            set({ requireInteraction: checked });
          }
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        Toggle,
        {
          defaultChecked: settings?.backgroundOnly ?? true,
          label: t("settings.advanced.backgroundOnly"),
          desc: t("settings.advanced.backgroundOnlyDesc"),
          onChange: (checked) => {
            set({ backgroundOnly: checked });
          }
        }
      )
    ] })
  ] });
}

// src/client/locales.ts
var zh = {
  "nav": "\u901A\u77E5",
  "settings.title": "\u4EFB\u52A1\u5B8C\u6210\u901A\u77E5",
  "settings.subtitle": "\u5F53 DSH \u5B8C\u6210\u4E00\u6B21\u64CD\u4F5C\u65F6\uFF0C\u901A\u8FC7\u6D4F\u89C8\u5668\u7CFB\u7EDF\u901A\u77E5\u63D0\u9192\u4F60\uFF1B\u53EF\u4EE5\u7528\u5173\u952E\u8BCD\u89C4\u5219\u7CBE\u786E\u63A7\u5236\u54EA\u4E9B\u6D88\u606F\u9700\u8981\u63D0\u9192\u3002",
  "settings.enabled": "\u542F\u7528\u901A\u77E5",
  "settings.enabledDesc": "\u5173\u95ED\u540E\u4E0D\u4F1A\u5F39\u51FA\u4EFB\u4F55\u901A\u77E5\uFF0C\u89C4\u5219\u4E0E\u504F\u597D\u8BBE\u7F6E\u4ECD\u4F1A\u4FDD\u7559\u3002",
  "settings.permission.title": "\u6D4F\u89C8\u5668\u6743\u9650",
  "settings.permission.desc": "\u901A\u77E5\u9700\u8981\u6D4F\u89C8\u5668\u6388\u6743\u3002\u70B9\u51FB\u4E0B\u65B9\u6309\u94AE\u6388\u6743\uFF0C\u7136\u540E\u53D1\u9001\u4E00\u6761\u6D4B\u8BD5\u901A\u77E5\u786E\u8BA4\u751F\u6548\u3002",
  "settings.permission.granted": "\u5DF2\u6388\u6743",
  "settings.permission.denied": "\u5DF2\u62D2\u7EDD\uFF08\u8BF7\u5728\u6D4F\u89C8\u5668\u5730\u5740\u680F\u7684\u7AD9\u70B9\u8BBE\u7F6E\u4E2D\u91CD\u65B0\u5F00\u542F\uFF09",
  "settings.permission.default": "\u672A\u6388\u6743",
  "settings.permission.request": "\u8BF7\u6C42\u901A\u77E5\u6743\u9650",
  "settings.permission.test": "\u53D1\u9001\u6D4B\u8BD5\u901A\u77E5",
  "settings.when.title": "\u901A\u77E5\u65F6\u673A",
  "settings.when.subtitle": "\u9009\u62E9\u54EA\u4E9B\u7ED3\u675F\u72B6\u6001\u89E6\u53D1\u901A\u77E5\u3002",
  "settings.when.completed": "\u6B63\u5E38\u5B8C\u6210",
  "settings.when.error": "\u51FA\u9519",
  "settings.when.aborted": "\u88AB\u4E2D\u6B62",
  "settings.when.blocked": "\u88AB\u963B\u585E",
  "settings.when.maxTokens": "\u8FBE\u5230 Token \u4E0A\u9650",
  "settings.rules.title": "\u5173\u952E\u8BCD\u89C4\u5219",
  "settings.rules.subtitle": "\u89C4\u5219\u5339\u914D\u8BE5\u8F6E\u56DE\u590D\u6587\u672C\u4E0E\u8C03\u7528\u8FC7\u7684\u5DE5\u5177\u540D\u3002\u5305\u542B\u89C4\u5219\uFF1A\u547D\u4E2D\u4EFB\u4E00\u624D\u901A\u77E5\uFF1B\u6392\u9664\u89C4\u5219\uFF1A\u547D\u4E2D\u5373\u4E0D\u901A\u77E5\u3002",
  "settings.rules.empty": "\u6682\u65E0\u89C4\u5219\uFF0C\u6240\u6709\u5DF2\u542F\u7528\u7684\u5B8C\u6210\u72B6\u6001\u90FD\u4F1A\u901A\u77E5\u3002",
  "settings.rules.add": "\u6DFB\u52A0\u89C4\u5219",
  "settings.rules.save": "\u4FDD\u5B58\u89C4\u5219",
  "settings.rules.mode.include": "\u5305\u542B",
  "settings.rules.mode.exclude": "\u6392\u9664",
  "settings.rules.patternPlaceholder": "\u5173\u952E\u8BCD\u6216\u6B63\u5219\u8868\u8FBE\u5F0F",
  "settings.rules.regex": "\u6B63\u5219",
  "settings.rules.case": "\u533A\u5206\u5927\u5C0F\u5199",
  "settings.rules.remove": "\u5220\u9664\u89C4\u5219",
  "settings.rules.invalid": "\u89C4\u5219\u6A21\u5F0F\u4E0D\u80FD\u4E3A\u7A7A",
  "settings.rules.invalidRegex": "\u65E0\u6548\u7684\u6B63\u5219\u8868\u8FBE\u5F0F",
  "settings.rules.unsaved": "\u89C4\u5219\u6709\u672A\u4FDD\u5B58\u7684\u4FEE\u6539",
  "settings.rules.saveHint": "\u5148\u586B\u5199\u89C4\u5219\u6A21\u5F0F\uFF0C\u518D\u70B9\u4FDD\u5B58",
  "settings.advanced.title": "\u9AD8\u7EA7",
  "settings.advanced.requireInteraction": "\u9700\u8981\u624B\u52A8\u5173\u95ED",
  "settings.advanced.requireInteractionDesc": "\u901A\u77E5\u4FDD\u6301\u663E\u793A\uFF0C\u76F4\u5230\u4F60\u624B\u52A8\u5173\u95ED\uFF08\u9002\u5408\u91CD\u8981\u4EFB\u52A1\uFF09\u3002",
  "settings.advanced.backgroundOnly": "\u4EC5\u5728\u4EFB\u52A1\u4E0D\u5728\u773C\u524D\u65F6\u901A\u77E5",
  "settings.advanced.backgroundOnlyDesc": "\u5F53\u524D\u4F1A\u8BDD\u6B63\u5728\u773C\u524D\u65F6\u4E0D\u63D0\u9192\uFF1B\u9875\u9762\u5728\u540E\u53F0\uFF0C\u6216\u4F60\u6B63\u5728\u67E5\u770B\u5176\u4ED6\u4F1A\u8BDD\u3001\u5176\u4ED6\u5DE5\u4F5C\u533A\u65F6\u4ECD\u4F1A\u63D0\u9192\u3002",
  "notify.titleCompleted": "DSH \u5DF2\u5B8C\u6210\u4EFB\u52A1",
  "notify.titleError": "DSH \u51FA\u9519\u4E86",
  "notify.titleAborted": "DSH \u5DF2\u4E2D\u6B62",
  "notify.titleBlocked": "DSH \u9700\u8981\u5904\u7406",
  "notify.titleMaxTokens": "DSH \u8FBE\u5230 Token \u4E0A\u9650",
  "notify.emptyBody": "\u4EFB\u52A1\u5DF2\u5B8C\u6210",
  "notify.testTitle": "DSH \u901A\u77E5\u6D4B\u8BD5",
  "notify.testBody": "\u5982\u679C\u4F60\u770B\u5230\u8FD9\u6761\u901A\u77E5\uFF0C\u8BF4\u660E\u901A\u77E5\u5DF2\u914D\u7F6E\u6210\u529F\u3002"
};
var en = {
  "nav": "Notifications",
  "settings.title": "Task completion notifications",
  "settings.subtitle": "Get a browser notification when DSH finishes an operation, with keyword rules to control exactly which messages notify.",
  "settings.enabled": "Enable notifications",
  "settings.enabledDesc": "Turning this off stops every notification; rules and preferences are kept.",
  "settings.permission.title": "Browser permission",
  "settings.permission.desc": "Notifications need browser permission. Grant it below, then send a test notification to confirm it works.",
  "settings.permission.granted": "Granted",
  "settings.permission.denied": "Denied (re-enable in the browser's site settings)",
  "settings.permission.default": "Not granted",
  "settings.permission.request": "Request permission",
  "settings.permission.test": "Send test notification",
  "settings.when.title": "When to notify",
  "settings.when.subtitle": "Choose which end states trigger a notification.",
  "settings.when.completed": "Completed",
  "settings.when.error": "Failed",
  "settings.when.aborted": "Aborted",
  "settings.when.blocked": "Blocked",
  "settings.when.maxTokens": "Hit token limit",
  "settings.rules.title": "Keyword rules",
  "settings.rules.subtitle": "Rules match the turn's reply text and called tool names. Include rules: notify only if one matches. Exclude rules: suppress on match.",
  "settings.rules.empty": "No rules yet \u2014 every enabled end state notifies.",
  "settings.rules.add": "Add rule",
  "settings.rules.save": "Save rules",
  "settings.rules.mode.include": "Include",
  "settings.rules.mode.exclude": "Exclude",
  "settings.rules.patternPlaceholder": "Keyword or regular expression",
  "settings.rules.regex": "Regex",
  "settings.rules.case": "Case sensitive",
  "settings.rules.remove": "Remove rule",
  "settings.rules.invalid": "Rule pattern must not be empty",
  "settings.rules.invalidRegex": "Invalid regular expression",
  "settings.rules.unsaved": "Rules have unsaved changes",
  "settings.rules.saveHint": "Fill in the rule pattern first, then save",
  "settings.advanced.title": "Advanced",
  "settings.advanced.requireInteraction": "Require manual dismiss",
  "settings.advanced.requireInteractionDesc": "The notification stays until you dismiss it (for important tasks).",
  "settings.advanced.backgroundOnly": "Only notify when the task is out of view",
  "settings.advanced.backgroundOnlyDesc": "Suppress notifications only for the session currently in view; still notify in the background or while viewing another session or workspace.",
  "notify.titleCompleted": "DSH finished",
  "notify.titleError": "DSH failed",
  "notify.titleAborted": "DSH aborted",
  "notify.titleBlocked": "DSH needs attention",
  "notify.titleMaxTokens": "DSH hit the token limit",
  "notify.emptyBody": "The task is done",
  "notify.testTitle": "DSH notification test",
  "notify.testBody": "If you can see this notification, notifications are configured correctly."
};
var NS = "notification";

// src/client/styles.ts
var STYLE_ID = "dsh-notification-style";
var cssText = `
.dsh_notification_section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}
.dsh_notification_heading {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.dsh_notification_title {
  margin: 0;
  color: var(--dsw-alias-label-primary);
  font-size: 18px;
  line-height: 26px;
  font-weight: 600;
}
.dsh_notification_subtitle {
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  line-height: 20px;
}
.dsh_notification_card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  padding: 14px 16px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-1);
}
.dsh_notification_cardTitle {
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
  line-height: 22px;
  font-weight: 600;
}
.dsh_notification_cardDesc {
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  line-height: 20px;
}
.dsh_notification_grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 20px;
  min-width: 0;
}
.dsh_notification_toggleRow {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
  cursor: pointer;
}
.dsh_notification_checkbox {
  flex: none;
  width: 16px;
  height: 16px;
  margin: 3px 0 0;
  accent-color: var(--dsw-alias-brand-primary);
  cursor: pointer;
}
.dsh_notification_toggleText {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.dsh_notification_toggleLabel {
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
  line-height: 22px;
}
.dsh_notification_toggleDesc {
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  line-height: 20px;
}
.dsh_notification_permissionRow {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}
.dsh_notification_badge {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 10px;
  border-radius: 11px;
  font-size: 12px;
  line-height: 16px;
}
.dsh_notification_badgeGranted {
  color: var(--dsw-alias-state-success-primary);
  background: var(--dsw-alias-state-success-tertiary);
}
.dsh_notification_badgeDenied {
  color: var(--dsw-alias-state-error-primary);
  background: var(--dsw-alias-interactive-bg-hover-danger);
}
.dsh_notification_badgeDefault {
  color: var(--dsw-alias-state-warn-label);
  background: var(--dsw-alias-state-warn-tertiary);
}
.dsh_notification_button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0 14px;
  border-radius: 14px;
  font: inherit;
  font-size: 13px;
  line-height: 18px;
  cursor: pointer;
}
.dsh_notification_buttonPrimary {
  border: 0;
  background: var(--dsw-alias-button-primary-fill);
  color: var(--dsw-alias-label-primary-inverted);
}
.dsh_notification_buttonPrimary:hover {
  background: var(--dsw-alias-button-primary-hover);
}
.dsh_notification_buttonPrimary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.dsh_notification_buttonGhost {
  border: 1px solid var(--dsw-alias-border-l2);
  background: none;
  color: var(--dsw-alias-label-primary);
}
.dsh_notification_buttonGhost:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}
.dsh_notification_rules {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.dsh_notification_ruleRow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-2);
}
.dsh_notification_ruleSelect {
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.dsh_notification_ruleInput {
  flex: 1;
  min-width: 160px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
}
.dsh_notification_ruleInput:focus {
  outline: none;
  border-color: var(--dsw-alias-brand-primary);
}
.dsh_notification_ruleCheck {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
  line-height: 18px;
  cursor: pointer;
}
.dsh_notification_ruleCheck input {
  margin: 0;
  accent-color: var(--dsw-alias-brand-primary);
  cursor: pointer;
}
.dsh_notification_ruleDelete {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 14px;
  background: none;
  color: var(--dsw-alias-label-dimmed);
  cursor: pointer;
}
.dsh_notification_ruleDelete:hover {
  background: var(--dsw-alias-interactive-bg-hover-danger);
  color: var(--dsw-alias-state-error-primary);
}
.dsh_notification_ruleDelete svg {
  width: 14px;
  height: 14px;
}
.dsh_notification_error {
  color: var(--dsw-alias-state-error-primary);
  font-size: 12px;
  line-height: 18px;
}
.dsh_notification_empty {
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  line-height: 20px;
}
.dsh_notification_unsavedHint {
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
}
.dsh_notification_rulesFooter {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}
`;
function adoptStyles() {
  if (document.getElementById(STYLE_ID) !== null) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = cssText;
  document.head.appendChild(style);
}

// src/client/store.ts
var import_client = require("@deepseek-ai/dsh-client-runtime/client");
function defaultNotificationSettings() {
  return {
    enabled: true,
    notifyCompleted: true,
    notifyError: true,
    notifyAborted: false,
    notifyBlocked: false,
    notifyMaxTokens: false,
    rules: [],
    requireInteraction: false,
    backgroundOnly: true
  };
}
var V2_PERSIST_KEY = "dsh-notification.v2";
function migrateV2Settings(storage) {
  const target = storage ?? (typeof localStorage === "undefined" ? void 0 : localStorage);
  if (target === void 0) return void 0;
  try {
    const raw = target.getItem(V2_PERSIST_KEY);
    if (raw === null) return void 0;
    target.removeItem(V2_PERSIST_KEY);
    const saved = JSON.parse(raw);
    return { ...defaultNotificationSettings(), ...saved, backgroundOnly: true };
  } catch {
    return void 0;
  }
}
function createNotificationSettingsStore() {
  return (0, import_client.createSnapshotStore)(migrateV2Settings() ?? defaultNotificationSettings(), {
    persist: { name: "dsh-notification.v3" }
  });
}

// src/client/decision.ts
function asReason(reason) {
  switch (reason) {
    case "completed":
    case "error":
    case "aborted":
    case "blocked":
    case "max-tokens":
      return reason;
    default:
      return void 0;
  }
}
function reasonEnabled(settings, reason) {
  switch (reason) {
    case "completed":
      return settings.notifyCompleted;
    case "error":
      return settings.notifyError;
    case "aborted":
      return settings.notifyAborted;
    case "blocked":
      return settings.notifyBlocked;
    case "max-tokens":
      return settings.notifyMaxTokens;
  }
}
function ruleSubject(title, body, tools) {
  const parts = [];
  if (title !== void 0 && title.trim() !== "") parts.push(title);
  if (body.trim() !== "") parts.push(body);
  if (tools.length > 0) parts.push(tools.join(" "));
  return parts.join("\n");
}
function ruleMatches(rule, subject) {
  if (rule.isRegex) {
    const flags = rule.caseSensitive ? "" : "i";
    return new RegExp(rule.pattern, flags).test(subject);
  }
  const haystack = rule.caseSensitive ? subject : subject.toLowerCase();
  const needle = rule.caseSensitive ? rule.pattern : rule.pattern.toLowerCase();
  return haystack.includes(needle);
}
function rulesAllow(settings, subject) {
  const active = settings.rules.filter((rule) => rule.enabled);
  const includes = active.filter((rule) => rule.mode === "include");
  const excludes = active.filter((rule) => rule.mode === "exclude");
  if (excludes.some((rule) => ruleMatches(rule, subject))) return false;
  if (includes.length > 0 && !includes.some((rule) => ruleMatches(rule, subject))) return false;
  return true;
}
function shouldNotify(settings, reason, subject) {
  if (!settings.enabled) return false;
  if (!reasonEnabled(settings, reason)) return false;
  return rulesAllow(settings, subject);
}

// src/client/runner.ts
function projectionAdvance(prevTurn, projection) {
  const turn = projection?.turn ?? 0;
  return { nextTurn: turn, fresh: prevTurn !== void 0 && turn > prevTurn };
}
function notificationFor(sessionId, origin, title, projection, settings) {
  if (origin === "subagent") return null;
  const reason = projection === void 0 || projection.turn === 0 ? "completed" : asReason(projection.reason);
  if (reason === void 0) return null;
  const subject = ruleSubject(title, projection?.body ?? "", projection?.tools ?? []);
  if (!shouldNotify(settings, reason, subject)) return null;
  return {
    reason,
    body: projection?.body ?? title ?? "",
    tag: notificationTag(sessionId)
  };
}

// src/client/index.ts
var inject = ["sessions", "slots", "locale"];
function apply(ctx) {
  adoptStyles();
  console.info("[dsh-notification] bundle loaded (edge trigger, settings v2)");
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-notification: dictionaries");
  const t = ctx.locale.bind(NS);
  const sessions = ctx.get("sessions");
  const settings = createNotificationSettingsStore();
  const set = (patch) => {
    settings.update((draft) => {
      Object.assign(draft, patch);
    });
  };
  const requestPermission = () => notificationsApi()?.requestPermission() ?? Promise.resolve("denied");
  const show = (title, body, tag, requireInteraction) => {
    const api = notificationsApi();
    if (api === void 0 || api.permission !== "granted") return;
    const notification = new api(title, { body, tag, requireInteraction });
    notification.onclick = () => {
      window.focus();
    };
  };
  const sendTest = () => {
    show(t("notify.testTitle"), t("notify.testBody"), "dsh-notification-test", false);
  };
  ctx.effect(() => {
    const observedTurn = /* @__PURE__ */ new Map();
    const reseed = () => {
      observedTurn.clear();
    };
    const stopReset = ctx.on("connection/reset", reseed);
    const off = sessions.list.subscribe(() => {
      const state = sessions.list.getSnapshot();
      const current = settings.getSnapshot();
      for (const id of state.ids) {
        const summary = state.byId[id];
        const projection = summary.projectionValues?.notification;
        const { nextTurn, fresh } = projectionAdvance(observedTurn.get(id), projection);
        observedTurn.set(id, nextTurn);
        if (!fresh) continue;
        const plan = notificationFor(summary.id, summary.origin, summary.title, projection, current);
        if (plan === null) {
          console.info(`[dsh-notification] turn ${nextTurn} ${id} suppressed by settings/rules`);
          continue;
        }
        const permission = notificationsApi()?.permission ?? "denied";
        const showIt = shouldShow(permission, current.backgroundOnly, document.hidden, id, state.current);
        console.info(
          `[dsh-notification] turn ${nextTurn} ${id}: reason=${plan.reason} show=${showIt} (permission=${permission} backgroundOnly=${current.backgroundOnly} hidden=${document.hidden} current=${String(state.current)})`
        );
        if (showIt) {
          show(
            t(titleKey(plan.reason)),
            bodyText(plan.body, t("notify.emptyBody")),
            plan.tag,
            current.requireInteraction
          );
        }
      }
      const live = new Set(state.ids);
      for (const id of [...observedTurn.keys()]) {
        if (!live.has(id)) observedTurn.delete(id);
      }
    });
    return () => {
      off();
      stopReset();
    };
  }, "dsh-notification: completion runner");
  ctx.slots.inject("settings.section", () => ctx.slots.register({
    name: "settings.section",
    id: "notification",
    order: 60,
    label: () => t("nav"),
    locale: NS,
    inject: () => ({
      hooks: { settings },
      set,
      requestPermission,
      sendTest
    })
  }, NotificationSettingsSection));
}
return module.exports; } });
//# sourceMappingURL=client.js.map
