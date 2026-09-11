export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnvironment } = await import("./server/environment");
    try { validateEnvironment(); }
    catch (error) {
      // Next can turn a thrown instrumentation error into its own generic HTML
      // response before our route runs. Report configuration names here, then
      // let the mandatory server/env + Prisma guards fail closed at runtime:
      // health remains observable as safe JSON 503; auth cannot reach the DB.
      // The npm start preflight still exits nonzero for standalone deployment.
      if (!(error instanceof Error) || !error.message.startsWith("QazLoyal configuration error:")) throw error;
      console.error(error.message);
    }
  }
}
