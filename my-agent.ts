import { createSphere } from './core/index.ts';
import * as bip39 from 'bip39';

// This is a "Recursive Mock" - it generates fake tools on the fly
// so the engine never hits a "not a function" error.
const createEverythingMock = () => {
    const mock: any = () => Promise.resolve(createEverythingMock());
    
    // Add the specific properties the engine checks
    mock.isConnected = () => true;
    mock.connect = async () => {};
    mock.disconnect = async () => {};
    mock.set = async () => {};
    mock.get = async () => null;
    mock.has = async () => false;
    
    return new Proxy(mock, {
        get: (target, prop) => {
            if (prop in target) return target[prop];
            return createEverythingMock();
        }
    });
};

async function start() {
    console.log("🛠️ Building a custom environment for your Agent...");
    try {
        const mnemonic = bip39.generateMnemonic();
        const masterMock = createEverythingMock();

        const sphere = await createSphere({
            mnemonic: mnemonic,
            network: 'testnet',
            storage: masterMock as any,
            transport: masterMock as any,
            oracle: masterMock as any
        });

        const address = await sphere.getAddress();

        console.log("\n🎯 SUCCESS! YOUR IDENTITY IS CREATED");
        console.log("📍 AGENT ADDRESS: " + address);
        console.log("🔑 SECRET PHRASE:  " + mnemonic);
        
        console.log("\n------------------------------------------------");
        console.log("1. COPY the ADDRESS (starts with un1...)");
        console.log("2. GO BACK to the 'New App' form in your browser.");
        console.log("3. PASTE it and CLICK 'CREATE PROJECT'.");
        console.log("------------------------------------------------");
        
        process.exit(0);
    } catch (e) {
        console.log("❌ Error: " + e.message);
        console.log("Debug: The engine is asking for something very specific.");
    }
}
start();
