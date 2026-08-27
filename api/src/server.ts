import { app } from "./app.js";
import env from "./config.js";

app.listen(env.PORT, () => {
  console.log(`rag99 api listening on http://localhost:${env.PORT}`);
});
// Trigger reload to load updated pooled database URL configuration with pgbouncer parameters.
