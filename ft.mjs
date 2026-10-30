import {KeyPair, JsonRpcProvider, PublicKey, Transaction, SignedTransaction, encodeTransaction, actions, baseDecode, Signature, KeyType} from 'near-api-js';
import {sha256} from '@noble/hashes/sha256';
import fs from 'fs';
const keyjson=JSON.parse(fs.readFileSync('./.near-local/testnet-credentials/hearthold-jay.testnet.json'));
const kp=KeyPair.fromString(keyjson.private_key||keyjson.secret_key);
const provider=new JsonRpcProvider({url:'https://rpc.testnet.near.org'});
async function send(receiverId, acts){
  const pk=PublicKey.from(kp.getPublicKey().toString());
  const ak=await provider.query({request_type:'view_access_key',account_id:keyjson.account_id,public_key:pk.toString(),finality:'final'});
  const tx=new Transaction({signerId:keyjson.account_id, publicKey:pk, nonce:ak.nonce+1, receiverId, actions:acts, blockHash:baseDecode(ak.block_hash)});
  const bytes=encodeTransaction(tx);
  const raw=kp.sign(new Uint8Array(sha256(bytes)));
  const signed=new SignedTransaction({transaction:tx, signature:new Signature({keyType:KeyType.ED25519, data:raw.signature})});
  const res=await provider.sendTransaction(signed);
  return res.transaction_outcome.id;
}
try{
  const h1=await send('ft.hearthold-jay.testnet', [actions.functionCall('storage_deposit', {account_id:'jayisagod.testnet'}, 30000000000000n, 20000000000000000000000n)]);
  console.log('storage tx:', h1);
  const amt=(BigInt('10000')*10n**24n).toString();
  const h2=await send('ft.hearthold-jay.testnet', [actions.functionCall('ft_transfer', {receiver_id:'jayisagod.testnet', amount:amt}, 50000000000000n, 1n)]);
  console.log('transfer tx:', h2);
}catch(e){console.error('ERR', e.message||e); process.exit(1)}
