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

// ---- Founder / developer info (only surfaced when explicitly asked) ----
const FOUNDER = {
  name: 'Odebunmi Quadri',
  role: 'Developer & Founder of BuyOnUma',
  contact: '08077128030',
  portfolio: 'odebunmi.netlify.app',
};

const STOPWORDS = new Set([
  'the', 'and', 'for', 'you', 'your', 'are', 'have', 'has', 'with',
  'that', 'this', 'want', 'need', 'looking', 'find', 'show', 'me',
  'can', 'please', 'like', 'good', 'best', 'any', 'some', 'get',
  'buy', 'sell', 'seller', 'sellers', 'product', 'products',
]);

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const stem = (word) => (word.endsWith('s') && word.length > 3 ? word.slice(0, -1) : word);

const extractBudget = (message) => {
  const cleaned = message.toLowerCase().replace(/,/g, '');
  const kMatch = cleaned.match(/(?:under|below|less than|budget( of)?|around|about|max)\s*₦?(\d+(?:\.\d+)?)\s*k\b/);
  if (kMatch) return parseFloat(kMatch[2]) * 1000;

  const plainMatch = cleaned.match(/(?:under|below|less than|budget( of)?|around|about|max)\s*₦?(\d{3,7})\b/);
  if (plainMatch) return parseFloat(plainMatch[2]);

  return null;
};

const isFounderQuestion = (message) => {
  const m = message.toLowerCase();
  return (
    /who (made|built|created|developed|owns|founded)/.test(m) ||
    /\b(founder|developer|creator|owner|admin)\b/.test(m) ||
    /who (is|are) (the )?(dev|devs|founder|owner)/.test(m) ||
    /contact (the )?(dev|developer|founder|admin)/.test(m)
  );
};

const gatherContext = async ({ message, productId }) => {
  const context = {
    product: null,
    matchingProducts: [],
    matchingSellers: [],
    fallbackProducts: [],
    budget: null,
  };

  if (productId) {
    context.product = await Product.findById(productId)
      .populate('seller', 'store_name username whatsapp rating category')
      .select('name description price category time_frame seller');
  }

  const budget = extractBudget(message);
  context.budget = budget;

  const words = message
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))
    .map(stem)
    .slice(0, 8);

  if (words.length > 0) {
    const safeWords = words.map(escapeRegex);
    const regex = new RegExp(safeWords.join('|'), 'i');

    const productQuery = {
      isActive: true,
      $or: [{ name: regex }, { description: regex }, { category: regex }],
    };
    if (budget) {
      productQuery.price = { $lte: budget };
    }

    const [products, sellers] = await Promise.all([
      Product.find(productQuery)
        .select('name price category description')
        .sort({ createdAt: -1 })
        .limit(8),
      Seller.find({
        isActive: true,
        isApproved: true,
        $or: [{ store_name: regex }, { category: regex }, { description: regex }],
      })
        .select('store_name username category rating')
        .sort({ rating: -1 })
        .limit(5),
    ]);

    context.matchingProducts = products;
    context.matchingSellers = sellers;

    if (budget && products.length === 0) {
      context.fallbackProducts = await Product.find({
        isActive: true,
        $or: [{ name: regex }, { description: regex }, { category: regex }],
      })
        .select('name price category')
        .sort({ price: 1 })
        .limit(5);
    }
  }

  if (context.matchingProducts.length === 0 && context.matchingSellers.length === 0) {
    const [topProducts, topSellers] = await Promise.all([
      Product.find({ isActive: true })
        .select('name price category')
        .sort({ createdAt: -1 })
        .limit(5),
      Seller.find({ isActive: true, isApproved: true })
        .select('store_name username category rating')
        .sort({ rating: -1 })
        .limit(5),
    ]);
    context.matchingProducts = topProducts;
    context.matchingSellers = topSellers;
  }

  return context;
};

const buildSystemPrompt = (context) => {
  let prompt = `You are the friendly shopping assistant for BuyOnUma, an online marketplace where independent sellers list products across many categories. Your job is to help buyers find products and sellers, answer questions about how the marketplace works, and answer questions about a specific product when one is provided.

Rules:
- Be concise, warm, and helpful — 2-4 sentences unless the user asks for more detail.
- Only recommend products/sellers that are given to you in the CONTEXT below. Never invent product names, prices, or sellers that weren't provided.
- If the CONTEXT below is a general/fallback list rather than an exact match for what the user asked, be upfront that these are close/popular picks rather than exact matches.
- Prices are in Nigerian Naira (₦).
- To contact a seller, buyers use the "Chat on WhatsApp" or "View Contact" button on the product/store page — you don't have the ability to place orders yourself.
- If asked something unrelated to shopping/the marketplace (e.g. general trivia, coding help), politely redirect back to how you can help them shop.
- Only share the developer/founder info below if the user specifically asks who built, owns, or runs BuyOnUma, or how to contact the developer/founder. Don't volunteer it otherwise.

DEVELOPER / FOUNDER INFO (share only when explicitly asked, as described above):
Name: ${FOUNDER.name}
Role: ${FOUNDER.role}
Contact: ${FOUNDER.contact}
Portfolio: ${FOUNDER.portfolio}`;

  if (context.product) {
    prompt += `\n\nCURRENT PRODUCT PAGE CONTEXT:\nName: ${context.product.name}\nPrice: ₦${context.product.price}\nCategory: ${context.product.category}\nDescription: ${context.product.description || 'N/A'}\nSold by: ${context.product.seller?.store_name || 'Unknown'}`;
  }

  if (context.budget) {
    prompt += `\n\nBUYER'S BUDGET (approx): ₦${context.budget}`;
  }

  if (context.matchingProducts.length > 0) {
    prompt += `\n\nMATCHING PRODUCTS IN CATALOG:\n` + context.matchingProducts
      .map((p) => `- ${p.name} (₦${p.price}, ${p.category})`)
      .join('\n');
  }

  if (context.fallbackProducts.length > 0) {
    prompt += `\n\nCLOSEST PRODUCTS (over stated budget, in case nothing fits exactly):\n` + context.fallbackProducts
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

export const getAIChatReply = async ({ message, history = [], productId }) => {
  if (!groq) {
    return "I'm not fully set up yet — the store admin needs to add a Groq API key. In the meantime, try browsing Products or Sellers, or use the search bar!";
  }

  if (isFounderQuestion(message)) {
    return `BuyOnUma was built and is run by ${FOUNDER.name} (${FOUNDER.role}). You can reach him at ${FOUNDER.contact}, and see more of his work at ${FOUNDER.portfolio}.`;
  }

  const context = await gatherContext({ message, productId });
  const systemPrompt = buildSystemPrompt(context);

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
