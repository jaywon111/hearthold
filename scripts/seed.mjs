import { connect, keyStores, KeyPair } from "near-api-js";

const CONTRACT_ID = "hearthold-escrow.testnet";
const LANDLORD_ACCOUNT = "hearthold-landlord.testnet";
const LANDLORD_KEY = process.env.LANDLORD_PRIVATE_KEY;

async function main() {
  const keyStore = new keyStores.InMemoryKeyStore();
  const keyPair = KeyPair.fromString(LANDLORD_KEY);
  await keyStore.setKey("testnet", LANDLORD_ACCOUNT, keyPair);

  const near = await connect({
    networkId: "testnet",
    nodeUrl: "https://rpc.testnet.near.org",
    keyStore
  });

  const account = await near.account(LANDLORD_ACCOUNT);
  console.log(`Seeding agreements from ${LANDLORD_ACCOUNT}...`);

  const listings = [
    { id: 1, type: "Rent", amount: "4500000000000000000000000" }, // 4.5 HETH
    { id: 2, type: "Sale", amount: "28000000000000000000000000" }, // 28 HETH
    { id: 3, type: "Rent", amount: "1200000000000000000000000" }, // 1.2 HETH
    { id: 4, type: "Rent", amount: "2600000000000000000000000" }, // 2.6 HETH
    { id: 5, type: "Sale", amount: "65000000000000000000000000" }  // 65 HETH
  ];

  const futureTime = BigInt(Date.now() + 86400000) * 1000000n; // Tomorrow
  const disputeWindow = 72n * 3600n * 1000000000n; // 72 hours

  for (const listing of listings) {
    console.log(`Creating agreement for listing #${listing.id}...`);
    try {
      await account.functionCall({
        contractId: CONTRACT_ID,
        methodName: "list_property",
        args: {
          amount: listing.amount,
          move_in_time_ns: Number(futureTime),
          dispute_window_ns: Number(disputeWindow),
          agreement_type_str: listing.type
        },
        gas: "100000000000000",
        attachedDeposit: "100000000000000000000000" // 0.1 NEAR
      });
      console.log(`✅ Agreement created for listing #${listing.id}`);
    } catch (e) {
      console.error(`❌ Failed on listing #${listing.id}:`, e.message);
    }
  }
  console.log("Seeding complete!");
}

main().catch(console.error);
