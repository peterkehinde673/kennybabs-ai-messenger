export interface LocalMatchResult {
  matched: boolean;
  category?: string;
  text?: string;
}

function evaluateSimpleMath(expr: string): string | null {
  const cleaned = expr.trim().replace(/^calculate\s+/i, '').replace(/^what is\s+/i, '').replace(/\?+$/, '').trim();
  const simpleBinary = /^(\-?\d+(?:\.\d+)?)\s*([\+\-\*\/xX\^%])\s*(\-?\d+(?:\.\d+)?)$/;
  const match = cleaned.match(simpleBinary);
  if (!match) return null;

  const a = parseFloat(match[1]);
  const op = match[2];
  const b = parseFloat(match[3]);

  if (isNaN(a) || isNaN(b)) return null;

  let result: number;
  switch (op) {
    case '+': result = a + b; break;
    case '-': result = a - b; break;
    case '*':
    case 'x':
    case 'X': result = a * b; break;
    case '/':
      if (b === 0) return 'Cannot divide by zero';
      result = a / b;
      break;
    case '%': result = a % b; break;
    case '^': result = Math.pow(a, b); break;
    default: return null;
  }

  return Number.isInteger(result) ? result.toString() : result.toFixed(4).replace(/\.?0+$/, '');
}

export function matchLocalResponder(rawMessage: string, nametag: string): LocalMatchResult {
  const msg = rawMessage.trim();
  const lower = msg.toLowerCase().replace(/[!.,?]+$/, '').trim();

  // 1. Greetings
  if (/^(hi|hello|hey|gm|good\s+morning|good\s+day|yo|sup|greetings)(\s+kennybabs|\s+bot)?$/i.test(lower)) {
    if (/^hi$/i.test(lower)) {
      return {
        matched: true,
        category: 'greeting',
        text: `Hey! 👋 I'm KennyBabs AI on Unicity testnet2. I'm online and ready to help. Ask me anything about Unicity or the KennyBabs project.`
      };
    }
    return {
      matched: true,
      category: 'greeting',
      text: `Hello! 👋 I'm KennyBabs AI. I'm online on Unicity testnet2. What would you like to know?`
    };
  }

  // 2. Online / Status Inquiries
  if (/^(are\s+(you|u)\s+online|is\s+this\s+(bot|agent)\s+(active|online|live)|online|status|ping|alive)$/i.test(lower)) {
    if (/^are\s+u\s+online$/i.test(lower)) {
      return {
        matched: true,
        category: 'online_status',
        text: `Yes, I'm online and connected to Unicity testnet2. 🚀`
      };
    }
    return {
      matched: true,
      category: 'online_status',
      text: `Yes, I'm online and connected to the Unicity testnet2 relay. 🚀`
    };
  }

  // 3. Identity / Name
  if (/^(what\s+is\s+your\s+name|who\s+are\s+you|who\s+r\s+u|what\s+are\s+you|who\s+made\s+you)$/i.test(lower)) {
    return {
      matched: true,
      category: 'identity',
      text: `I am @${nametag} AI Messenger, an autonomous AI agent operating on the Unicity Sphere Network.`
    };
  }

  // 4. Capabilities / Help
  if (/^(what\s+can\s+you\s+do(\s+on\s+unicity)?|what\s+do\s+you\s+do|what\s+are\s+your\s+features|help|commands)$/i.test(lower)) {
    return {
      matched: true,
      category: 'capabilities',
      text: `I'm KennyBabs AI running through Sphere on Unicity testnet2. I can chat with users through DMs, answer questions, explain Unicity concepts, help with basic calculations and general questions, and provide information about the KennyBabs AI Messenger.`
    };
  }

  // 5. Unicity & Sphere Concepts
  if (/^(what\s+is\s+unicity|what\s+is\s+sphere|what\s+is\s+agentsphere|explain\s+unicity)$/i.test(lower)) {
    return {
      matched: true,
      category: 'unicity_info',
      text: `Unicity is a blockchain/network project focused on scalable digital value and decentralized applications. I'm currently connected to the Unicity testnet2 environment through the Sphere SDK.`
    };
  }

  // 6. Arithmetic / Calculation
  const mathResult = evaluateSimpleMath(msg);
  if (mathResult !== null) {
    return {
      matched: true,
      category: 'arithmetic',
      text: mathResult
    };
  }

  return { matched: false };
}

export function getContextualFallback(userMessage: string, nametag: string): string {
  return `Hello! I am @${nametag} AI Messenger on Unicity testnet2. I received your message: "${userMessage}". My external AI reasoning engine is currently in a brief rate-limit cooldown, but I am online and listening. You can ask me about Unicity, basic calculations (like '2*7'), or type 'what can you do' for quick assistance!`;
}
