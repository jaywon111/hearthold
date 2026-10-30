import { Buffer } from "buffer";
import { setupWalletSelector } from "@near-wallet-selector/core";
import { setupModal } from "@near-wallet-selector/modal-ui";
import "@near-wallet-selector/modal-ui/styles.css";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { setupHereWallet } from "@near-wallet-selector/here-wallet";
import { setupMeteorWallet } from "@near-wallet-selector/meteor-wallet";
import { setupSender } from "@near-wallet-selector/sender";
if (!globalThis.Buffer) globalThis.Buffer=Buffer;
export const CONTRACT_ID=import.meta.env.VITE_CONTRACT_ID||"hearthold-jay.testnet";
export const TOKEN_ID=import.meta.env.VITE_TOKEN_ID||"hearthold-ft-jay.testnet";
export const RPC="https://rpc.testnet.near.org";
let selectorPromise,modal;
export async function getSelector(){if(!selectorPromise)selectorPromise=setupWalletSelector({network:{networkId:"testnet",nodeUrl:RPC,helperUrl:"https://helper.testnet.near.org",explorerUrl:"https://testnet.nearblocks.io",indexerUrl:"https://testnet-api.kitwallet.app"},modules:[setupMyNearWallet(),setupHereWallet(),setupMeteorWallet(),setupSender()]});return selectorPromise;}
export async function showWalletModal(){const selector=await getSelector();if(!modal)modal=setupModal(selector,{contractId:CONTRACT_ID,description:"Connect a NEAR testnet wallet to Hearthold.",theme:"dark"});modal.show();return selector;}
export async function view(methodName,args={}){const response=await fetch(RPC,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:"hearthold",method:"query",params:{request_type:"call_function",account_id:CONTRACT_ID,method_name:methodName,args_base64:Buffer.from(JSON.stringify(args)).toString("base64"),finality:"final"}})});if(!response.ok)throw new Error(`NEAR RPC returned HTTP ${response.status}`);const payload=await response.json();if(payload.error)throw new Error(payload.error.data||payload.error.message||"NEAR view failed");return JSON.parse(Buffer.from(payload.result.result).toString("utf8"));}
export async function change(methodName,args={},deposit="0"){const selector=await getSelector();if(!selector.store.getState().accounts[0])throw new Error("Connect your NEAR testnet wallet first.");return(await selector.wallet()).signAndSendTransaction({receiverId:CONTRACT_ID,actions:[{type:"FunctionCall",params:{methodName,args:Buffer.from(JSON.stringify(args)).toString("base64"),gas:"30000000000000",deposit}}]});}
export async function listProperty({token=TOKEN_ID,rent_ngn,description,move_in_at,dispute_window_ns}){return change("list_property",{token,rent_ngn:String(rent_ngn),description,move_in_at:String(move_in_at),dispute_window_ns:String(dispute_window_ns)});}
export async function depositToken(tokenAmount,agreementId){const selector=await getSelector();if(!selector.store.getState().accounts[0])throw new Error("Connect your NEAR testnet wallet first.");return(await selector.wallet()).signAndSendTransaction({receiverId:TOKEN_ID,actions:[{type:"FunctionCall",params:{methodName:"ft_transfer_call",args:Buffer.from(JSON.stringify({receiver_id:CONTRACT_ID,amount:String(tokenAmount),msg:String(agreementId)})).toString("base64"),gas:"100000000000000",deposit:"1"}}]});}
