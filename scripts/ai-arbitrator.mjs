import { connect, keyStores, KeyPair } from "near-api-js";
import dotenv from "dotenv";

dotenv.config();

const CONTRACT_ID = "hearthold-escrow.testnet";
const ARBITRATOR_ACCOUNT = "hearthold-arbitrator.testnet";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ARBITRATOR_KEY = process.env.ARBITRATOR_PRIVATE_KEY;

async function getAIDecision(reason) {
  console.log(`🤖 Asking Gemini AI to judge dispute: "${reason}"`);
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `You are a neutral real estate arbitrator. Read the tenant's dispute reason. Reply with EXACTLY ONE WORD: 'landlord' if the landlord should keep the money, or 'renter' if the tenant should be refunded.\n\nDispute: ${reason}`
        }]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 10
      }
    })
  });

  const data = await response.json();

  if (data.error) {
    console.error("❌ Gemini API Error:", JSON.stringify(data, null, 2));
    throw new Error("Failed to get a valid AI response.");
  }

  const decision = data.candidates[0].content.parts[0].text.trim().toLowerCase();
  console.log(`⚖️ AI Ruled in favor of: ${decision}`);
  return decision;
}

async function main() {
  if (!GEMINI_API_KEY || !ARBITRATOR_KEY) {
    throw new Error("Missing API keys in environment variables.");
  }

  const keyStore = new keyStores.InMemoryKeyStore();
  const keyPair = KeyPair.fromString(ARBITRATOR_KEY);
  await keyStore.setKey("testnet", ARBITRATOR_ACCOUNT, keyPair);

  const near = await connect({
    networkId: "testnet",
    nodeUrl: "https://rpc.testnet.near.org",
    keyStore
  });

  const account = await near.account(ARBITRATOR_ACCOUNT);

  const count = await account.viewFunction({
    contractId: CONTRACT_ID,
    methodName: "get_agreement_count",
    args: {}
  });

  console.log(`Checking ${count} agreements for disputes...`);

  for (let i = 1; i <= count; i++) {
    const agreement = await account.viewFunction({
      contractId: CONTRACT_ID,
      methodName: "get_agreement",
      args: { id: i }
    });

    if (agreement && agreement.status === "disputed" && agreement.is_disputed) {
      console.log(`🚨 Found disputed agreement #${i}: ${agreement.dispute_reason}`);
      
      const decision = await getAIDecision(agreement.dispute_reason);
      const awardLandlord = decision.includes("landlord");

      console.log(`Submitting resolution on-chain (award_to_landlord: ${awardLandlord})...`);
      
      await account.functionCall({
        contractId: CONTRACT_ID,
        methodName: "resolve_dispute",
        args: { id: i, award_to_landlord: awardLandlord },
        gas: "100000000000000",
        attachedDeposit: "0"
      });
      
      console.log(`✅ Agreement #${i} resolved!`);
    }
  }
  console.log("Scan complete.");
}

main().catch(console.error);
