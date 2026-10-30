import {KeyPair, JsonRpcProvider, PublicKey, Transaction, SignedTransaction, encodeTransaction, actions, baseDecode, Signature, KeyType} from 'near-api-js';
import {sha256} from '@noble/hashes/sha256';
import fs from 'fs';
const keyjson=JSON.parse(fs.readFileSync('./.near-local/testnet-credentials/hearthold-jay.testnet.json'));
const kp=KeyPair.fromString(keyjson.private_key||keyjson.secret_key);
const provider=new JsonRpcProvider({url:'https://rpc.testnet.near.org'});
try{
const pk=PublicKey.from(kp.getPublicKey().toString());
const accessKey=await provider.query({request_type:'view_access_key',account_id:keyjson.account_id,public_key:pk.toString(),finality:'final'});
const tx=new Transaction({
  signerId:keyjson.account_id, publicKey:pk, nonce:accessKey.nonce+1,
  receiverId:'jayisagod.testnet', actions:[actions.transfer((BigInt('2')*10n**24n).toString())],
  blockHash:baseDecode(accessKey.block_hash)
});
const bytes=encodeTransaction(tx);
const hash=new Uint8Array(sha256(bytes));
const raw=kp.sign(hash);
const sig=new Signature({keyType:KeyType.ED25519, data:raw.signature});
const signed=new SignedTransaction({transaction:tx, signature:sig});
const res=await provider.sendTransaction(signed);
console.log('txhash:', res.transaction_outcome.id);
}catch(e){console.error('ERR', e.message||e); process.exit(1)}
