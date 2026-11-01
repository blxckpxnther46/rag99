import { app } from "./app.js";
import env from "./config.js";
import { connectMongo } from "./db/mongo.js";

// Optional Polyglot Persistence: initialize MongoDB connection if configured
if (env.MONGODB_URI) {
  connectMongo().catch(() => {});
}

app.listen(env.PORT, () => {
  console.log(`rag99 api listening on http://localhost:${env.PORT}`);
});
