import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 3000);
const server = createApp().listen(port, (error) => {
  if (error) {
    console.error("Could not start the Task API", error);
    process.exitCode = 1;
    return;
  }
  console.log("Task API listening on", server.address());
});
