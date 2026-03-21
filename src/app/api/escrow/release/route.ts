import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { agreementId, vendorProof, contractTerms } = await request.json();
    
    // Call OpenAI API using native fetch
    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // fast and cheap
        messages: [
          {
            role: "system",
            content: "You are an impartial Escrow Oracle. Compare the Vendor's Proof against the Contract Terms. If the proof is sufficient to satisfy the terms, reply with ONLY the exact word TRUE. If it is entirely unrelated or insufficient, reply with ONLY the exact word FALSE."
          },
          {
            role: "user",
            content: `Contract Terms: ${contractTerms}\nVendor Proof: ${vendorProof}`
          }
        ],
        temperature: 0.1
      })
    });

    const data = await aiResponse.json();
    if (!data.choices || data.choices.length === 0) {
       throw new Error("OpenAI returned empty response");
    }

    const reply = data.choices[0].message.content.trim().toUpperCase();
    
    if (reply.includes("TRUE")) {
      console.log(`[AI Oracle] Verified completion for Escrow ${agreementId}. Triggering blockchain release.`);
      // Here is where the backend would use the Endless SDK to sign the payout txn
      return NextResponse.json({ 
        success: true, 
        message: "AI Verified Completion. Funds released on Endless blockchain.",
        status: "Completed - Funds Released"
      });
    } else {
      console.log(`[AI Oracle] Rejected completion for Escrow ${agreementId}. Reply was: ${reply}`);
      return NextResponse.json({ 
        success: false, 
        message: "AI Rejected Completion: Proof does not match requirements.",
        status: "Active - Awaiting Vendor Completion"
      });
    }
  } catch (error) {
    console.error("AI API Error:", error);
    return NextResponse.json({ success: false, message: "Verification failed due to internal error." }, { status: 500 });
  }
}
