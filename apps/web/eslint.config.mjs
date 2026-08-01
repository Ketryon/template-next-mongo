import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * eslint-config-next is flat-config native as of Next 15+, so it is imported
 * directly rather than through @eslint/eslintrc's FlatCompat.
 */
const eslintConfig = [
  ...coreWebVitals,
  ...nextTypescript,
  {
    ignores: [".next/**", "node_modules/**"],
  },
  {
    rules: {
      // The data layer owns the driver. Everything else goes through @ketryon/db.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@ketryon/db/auth",
              message:
                "@ketryon/db/auth is the pre-session store and exists for @ketryon/auth only. Use the DAL from @ketryon/db.",
            },
            {
              name: "mongodb",
              message:
                "Import from @ketryon/db instead — the driver is owned by the data layer.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
