export type DeploymentEnvironment = {
  SEPOLIA_RPC_URL?: string;
  PRIVATE_KEY?: string;
};

export function selectedHardhatNetwork(argv: readonly string[]) {
  const flagIndex = argv.indexOf("--network");
  if (flagIndex >= 0) return argv[flagIndex + 1];
  const inlineFlag = argv.find((argument) => argument.startsWith("--network="));
  return inlineFlag?.slice("--network=".length);
}

export function validateSepoliaEnvironment(networkName: string | undefined, environment: DeploymentEnvironment) {
  if (networkName !== "sepolia") return;
  if (!environment.SEPOLIA_RPC_URL) throw new Error("SEPOLIA_RPC_URL is required for Sepolia deployment");
  if (!environment.PRIVATE_KEY) throw new Error("PRIVATE_KEY is required for Sepolia deployment");
}
