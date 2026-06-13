import js from "@eslint/js";
import tseslint from "typescript-eslint";
import unusedImports from "eslint-plugin-unused-imports";

export default tseslint.config(
  // ── إعدادات عامة ──────────────────────────────────────────────
  {
    ignores: ["dist/**", "node_modules/**", "*.config.js"],
  },

  // ── قواعد JS الأساسية ─────────────────────────────────────────
  js.configs.recommended,

  // ── قواعد TypeScript ──────────────────────────────────────────
  ...tseslint.configs.recommended,

  // ── القواعد المخصوصة ──────────────────────────────────────────
  {
    plugins: {
      "unused-imports": unusedImports,
    },
    rules: {
      // ✅ 1) تحذير لو في import مش مستخدم
      "unused-imports/no-unused-imports": "warn",

      // ✅ 2) تحذير لو في variable أو function مش مستخدم
      //    نطفي القاعدة الأساسية عشان typescript-eslint بيغطيها
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          vars: "all",           // كل المتغيرات
          args: "after-used",    // arguments بعد آخر argument مستخدم
          ignoreRestSiblings: true,
          varsIgnorePattern: "^_", // لو اسمه بيبدأ بـ _ → تجاهله (اصطلاح شائع)
          argsIgnorePattern: "^_", // نفس الكلام للـ arguments
        },
      ],

      // ✅ 3) إجبار استخدام Lazy Loading للصفحات ومنع الاستيراد المباشر
      "@typescript-eslint/no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: ["**/pages/*", "../pages/*", "./pages/*"],
              message: "Please use React.lazy() to import pages instead of static imports to enable Lazy Loading.",
              allowTypeImports: true
            }
          ]
        }
      ],

      // ✅ 4) منع أو التحذير من استدعاء Namespace (import * as X)
      "no-restricted-syntax": [
        "warn",
        {
          selector: "ImportNamespaceSpecifier",
          message: "Namespace imports (import * as X) are discouraged. Use named imports instead to support tree-shaking."
        }
      ],
    },
  },
);
