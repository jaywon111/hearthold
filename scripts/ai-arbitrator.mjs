import { connect, keyStores, KeyPair } from "near-api-js";
import dotenv from "dotenv";

dotenv.config();

const CONTRACT_ID = "hearthold-escrow.testnet";
const ARBITRATOR_ACCOUNT = "hearthold-arbitrator.testnet";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ARBITRATOR_KEY = process.env.ARBITRATOR_PRIVATE_KEY;

// List of models to try in order if one is busy
const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3-flash-preview"
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getAIDecision(agreement) {
  console.log(`🤖 Asking Gemini AI to judge dispute...`);
  
  const moveInDate = new Date(Number(agreement.move_in_time_ns) / 1000000).toISOString();
  const amountHeth = (BigInt(agreement.amount) / 10n ** 24n).toString();
  
  const prompt = `
    You are an objective AI arbitrator for a real estate rental platform called Hearthold.
    Your job is to decide who receives the frozen escrow funds: the renter or the landlord.
    
    [SMART CONTRACT DATA]
    Agreement ID: ${agreement.id}
    Escrow Amount: ${amountHeth} HETH
    Scheduled Move-in Date: ${moveInDate}
    Dispute Reason provided by user: "${agreement.dispute_reason}"
    
    [RULES]
    If the dispute reason indicates the landlord failed to provide the property, refund the renter.
    If the dispute reason indicates the renter is trying to scam or squat, award the landlord.
    Be objective. Weigh the provided dispute reason against the move-in date.
  `;

  // Try each model with retries
  for (const model of MODELS) {
    console.log(`   -> Trying model: ${model}`);
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.0,
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  winner: { type: "STRING", enum: ["renter", "landlord"] },
                  reasoning: { type: "STRING" },
                  confidence_score: { type: "NUMBER" }
                },
                required: ["winner", "reasoning", "confidence_score"]
              }
            }
          })
        });

        const data = await response.json();

        if (data.error) {
          if (data.error.code === 503) {
            console.log(`      ⚠️ Model ${model} is busy. Retrying in ${attempt * 2}s...`);
            await sleep(attempt * 2000); // Exponential backoff
            continue; // Try again
          }
          // If it's a different error (like 404), log it and break to try the next model
          console.error(`      ❌ Error with ${model}:`, JSON.stringify(data.error, null, 2));
          break; 
        }

        // Success!
        const jsonText = data.candidates[0].content.parts[0].text;
        const decisionObj = JSON.parse(jsonText);
        
        console.log(`⚖️ AI RULED FOR: ${decisionObj.winner.toUpperCase()}`);
        console.log(`🧠 REASONING: ${decisionObj.reasoning}`);
        console.log(`📊 CONFIDENCE: ${decisionObj.confidence_score * 100}%`);
        
        return decisionObj.winner;

      } catch (err) {
        console.error(`      ❌ Network error on attempt ${attempt}:`, err.message);
        await sleep(attempt * 2000);
      }
    }
    console.log(`   -> Model ${model} failed. Moving to next model...`);
  }

  throw new Error("All AI models are currently overloaded. Please try again in a few minutes.");
}

async function main() {
  // ... (The rest of your main function remains exactly the same)
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
      const winner = await getAIDecision(agreement);
      const awardLandlord = winner === "landlord";
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
