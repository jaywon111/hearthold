import { setupWalletSelector } from '@near-wallet-selector/core';
import { setupModal } from '@near-wallet-selector/modal-ui';
import '@near-wallet-selector/modal-ui/styles.css';
import { setupMyNearWallet } from '@near-wallet-selector/my-near-wallet';
import { setupHereWallet } from '@near-wallet-selector/here-wallet';
import { setupMeteorWallet } from '@near-wallet-selector/meteor-wallet';
import { setupSender } from '@near-wallet-selector/sender';
import type { WalletSelector } from '@near-wallet-selector/core';

export const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID || 'hearthold-jay.testnet';
export const TOKEN_ID = import.meta.env.VITE_TOKEN_ID || 'ft.hearthold-jay.testnet';
export const ARBITRATOR_ID = import.meta.env.VITE_ARBITRATOR_ID || '';
export const RPC = 'https://rpc.testnet.near.org';
let selectorPromise: Promise<WalletSelector> | undefined;
let modal: ReturnType<typeof setupModal> | undefined;
export async function getSelector() {
  if (!selectorPromise) selectorPromise = setupWalletSelector({ network: { networkId: 'testnet', nodeUrl: RPC, helperUrl: 'https://helper.testnet.near.org', explorerUrl: 'https://testnet.nearblocks.io', indexerUrl: 'https://testnet-api.kitwallet.app' }, modules: [setupMyNearWallet(), setupHereWallet(), setupMeteorWallet(), setupSender()] });
  return selectorPromise;
}
export async function showWalletModal() {
  const selector = await getSelector();
  if (!modal) modal = setupModal(selector, { contractId: CONTRACT_ID, description: 'Connect a NEAR testnet wallet to Hearthold.', theme: 'dark' });
  modal.show();
  return selector;
}
export async function view<T>(methodName: string, args: Record<string, unknown>): Promise<T> {
  const response = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 'hearthold', method: 'query', params: { request_type: 'call_function', account_id: CONTRACT_ID, method_name: methodName, args_base64: btoa(JSON.stringify(args)), finality: 'final' } }) });
  if (!response.ok) throw new Error(`NEAR RPC returned HTTP ${response.status}`);
  const raw = await response.text();
  if (!raw.trim()) throw new Error('NEAR RPC returned an empty response');
  let payload: { error?: { data?: string; message?: string }; result?: { result?: number[] } };
  try { payload = JSON.parse(raw); } catch { throw new Error('NEAR RPC returned invalid JSON'); }
  if (payload.error) throw new Error(payload.error.data || payload.error.message || 'NEAR view failed');
  const bytes = payload.result?.result;
  if (!Array.isArray(bytes)) throw new Error('NEAR RPC response did not include view data');
  const decoded = new TextDecoder().decode(new Uint8Array(bytes));
  if (!decoded.trim()) throw new Error('NEAR view returned empty data');
  try { return JSON.parse(decoded) as T; } catch { throw new Error('NEAR view returned invalid JSON'); }
}
export async function change(methodName: string, args: Record<string, unknown>, deposit = '0') {
  const selector = await getSelector();
  if (!selector.store.getState().accounts[0]) throw new Error('Connect your NEAR testnet wallet first.');
  return (await selector.wallet()).signAndSendTransaction({ receiverId: CONTRACT_ID, actions: [{ type: 'FunctionCall', params: { methodName, args: btoa(JSON.stringify(args)), gas: '30000000000000', deposit } }] } as never);
}
export async function depositToken(tokenAmount: string, agreementId: string) {
  const selector = await getSelector();
  if (!selector.store.getState().accounts[0]) throw new Error('Connect your NEAR testnet wallet first.');
  return (await selector.wallet()).signAndSendTransaction({ receiverId: TOKEN_ID, actions: [{ type: 'FunctionCall', params: { methodName: 'ft_transfer_call', args: btoa(JSON.stringify({ receiver_id: CONTRACT_ID, amount: tokenAmount, msg: agreementId })), gas: '100000000000000', deposit: '1' } }] } as never);
}
