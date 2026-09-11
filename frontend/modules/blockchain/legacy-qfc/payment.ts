import { Contract, getAddress, isAddress, keccak256, ZeroAddress, type Provider } from "ethers";
import { PAYMENT_ABI } from "./contract";

export type PaymentTerms = { burnRate: bigint; denominator: bigint; treasury: string; codeHash: string };
export type PaymentReader = {
  chainId(): Promise<bigint>;
  code(address: string): Promise<string>;
  metadata(address: string): Promise<{ token: string; treasury: string; burnRate: bigint; denominator: bigint }>;
};
export function paymentReader(provider: Provider): PaymentReader {
  return {
    chainId: async () => (await provider.getNetwork()).chainId,
    code: address => provider.getCode(address),
    metadata: async address => {
      const contract = new Contract(address, PAYMENT_ABI, provider);
      const [token, treasury, burnRate, denominator] = await Promise.all([
        contract.token(), contract.treasury(), contract.BURN_RATE_BPS(), contract.BPS_DENOMINATOR(),
      ]);
      return { token, treasury, burnRate, denominator };
    },
  };
}
export async function validatePayment(reader: PaymentReader, config: { address: string; token: string; chainId: number; codeHash: string }): Promise<PaymentTerms> {
  if (!isAddress(config.address) || !isAddress(config.token) || config.address === ZeroAddress || config.token === ZeroAddress) throw new Error("Invalid payment/token address");
  if (!Number.isSafeInteger(config.chainId) || config.chainId <= 0 || await reader.chainId() !== BigInt(config.chainId)) throw new Error("Wrong payment network");
  // The pin must come from independently verified deployed runtime bytecode, never auto-learned from the wallet RPC.
  if (!/^0x[0-9a-fA-F]{64}$/.test(config.codeHash)) throw new Error("Configure the verified payment runtime bytecode hash before approving");
  const code = await reader.code(config.address);
  if (!/^0x(?:[0-9a-fA-F]{2})+$/.test(code)) throw new Error("Payment address has no valid bytecode");
  const codeHash = keccak256(code);
  if (codeHash.toLowerCase() !== config.codeHash.toLowerCase()) throw new Error("Payment bytecode does not match the trusted hash");
  const metadata = await reader.metadata(config.address);
  if (!isAddress(metadata.token) || getAddress(metadata.token) !== getAddress(config.token)) throw new Error("Payment contract uses a different token");
  if (!isAddress(metadata.treasury) || metadata.treasury === ZeroAddress) throw new Error("Invalid payment treasury");
  if (metadata.denominator <= 0n || metadata.burnRate < 0n || metadata.burnRate > metadata.denominator) throw new Error("Invalid payment burn parameters");
  return { burnRate: metadata.burnRate, denominator: metadata.denominator, treasury: getAddress(metadata.treasury), codeHash };
}
export function paymentSplit(amount: bigint, terms: PaymentTerms) {
  if (amount <= 0n || terms.denominator <= 0n || terms.burnRate < 0n || terms.burnRate > terms.denominator) throw new Error("Invalid payment preview");
  const burned = amount * terms.burnRate / terms.denominator;
  return { payment: amount, burned, treasury: amount - burned };
}
