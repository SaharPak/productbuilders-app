// OpenNext Cloudflare build configuration.
//
// `defineCloudflareConfig` is the entry point exported by
// `@opennextjs/cloudflare`. The default config is fine for this app —
// we do not enable R2-backed incremental cache here because that
// requires provisioning an R2 bucket and binding it (see OpenNext docs
// for `r2IncrementalCache`). Add it later if ISR / fetch caching at
// the edge becomes a hard requirement.
//
// If you ever add overrides (queue, image optimizer, etc.), extend
// this object. Keep the default export and do not change the file
// name — OpenNext's CLI looks for `open-next.config.ts` at the root.

import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({});