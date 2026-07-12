import Groq from 'groq-sdk';
import Product from '../models/Product.js';
import Seller from '../models/Seller.js';

const apiKey = process.env.GROQ_API_KEY;
let groq = null;
if (apiKey) {
  groq = new Groq({ apiKey });
} else {
  console.warn('⚠️ GROQ_API_KEY not set — AI chat will return a friendly fallback message instead of crashing.');
}

const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

/**
 * Give the assistant grounded, current context instead of letting it
 * hallucinate product names/prices. We do a light keyword search against
 * Product/Seller collections based on the user's message and inject the
 * top matches into the system prompt. This keeps the assistant honest —
 * it should only recommend things that actually exist in the marketplace
 * right now — and keeps token usage small (we don't dump the whole catalog).
 */
const gatherContext = async ({ message, productId }) => {
  const context = { product: null, matchingProducts: [], matchingSellers: [] };

  if (productId) {
    context.product = await Product.findById(productId)
      .populate('seller', 'store_name username whatsapp rating category')
      .select('name description price category time_frame seller');
  }

  const words = message
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 6);

  if (words.length > 0) {
    const regex = new RegExp(words.join('|'), 'i');
    const [products, sellers] = await Promise.all([
      Product.find({ isActive: true, $or: [{ name: regex }, { description: regex }, { category: regex }] })
        .select('name price category description')
        .limit(6),
      Seller.find({ isActive: true, isApproved: true, $or: [{ store_name: regex }, { category: regex }, { description: regex }] })
        .select('store_name username category rating')
        .limit(4),
    ]);
    context.matchingProducts = products;
    context.matchingSellers = sellers;
  }

  return context;
};

const buildSystemPrompt = (context) => {
  let prompt = `You are the friendly shopping assistant for BuyOnUma, an online marketplace where independent sellers list products across many categories. Your job is to help buyers find products and sellers, answer questions about how the marketplace works, and answer questions about a specific product when one is provided.

Rules:
- Be concise, warm, and helpful — 2-4 sentences unless the user asks for more detail.
- Only recommend products/sellers that are given to you in the CONTEXT below. Never invent product names, prices, or sellers that weren't provided.
- If nothing in the context matches what the user is asking for, say so honestly and suggest they browse the Products or Sellers page.
- Prices are in Nigerian Naira (₦).
- To contact a seller, buyers use the "Chat on WhatsApp" or "View Contact" button on the product/store page — you don't have the ability to place orders yourself.
- If asked something unrelated to shopping/the marketplace (e.g. general trivia, coding help), politely redirect back to how you can help them shop.`;

  if (context.product) {
    prompt += `\n\nCURRENT PRODUCT PAGE CONTEXT:\nName: ${context.product.name}\nPrice: ₦${context.product.price}\nCategory: ${context.product.category}\nDescription: ${context.product.description || 'N/A'}\nSold by: ${context.product.seller?.store_name || 'Unknown'}`;
  }

  if (context.matchingProducts.length > 0) {
    prompt += `\n\nMATCHING PRODUCTS IN CATALOG:\n` + context.matchingProducts
      .map((p) => `- ${p.name} (₦${p.price}, ${p.category})`)
      .join('\n');
  }

  if (context.matchingSellers.length > 0) {
    prompt += `\n\nMATCHING SELLERS:\n` + context.matchingSellers
      .map((s) => `- ${s.store_name} (@${s.username}, ${s.category}${s.rating ? `, rated ${s.rating}/5` : ''})`)
      .join('\n');
  }

  return prompt;
};

/**
 * @param {{ message: string, history: {role:'user'|'assistant', content:string}[], productId?: string }} params
 */
export const getAIChatReply = async ({ message, history = [], productId }) => {
  if (!groq) {
    return "I'm not fully set up yet — the store admin needs to add a Groq API key. In the meantime, try browsing Products or Sellers, or use the search bar!";
  }

  const context = await gatherContext({ message, productId });
  const systemPrompt = buildSystemPrompt(context);

  // Keep only the last few turns to bound token usage/cost
  const trimmedHistory = history.slice(-8);

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      ...trimmedHistory.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ],
    temperature: 0.5,
    max_tokens: 400,
  });

  return completion.choices?.[0]?.message?.content?.trim() || "Sorry, I couldn't come up with a reply — could you rephrase that?";
};
