import type { HardhatUserConfig } from "hardhat/config";

import "./src/index.cjs";
import "./tasks/esm_fix.cjs";

const config = {
  solidity: {
    version: "0.8.19",
    settings: {
      metadata: {
        useLiteralContent: true,
      },
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
} satisfies HardhatUserConfig;

declare module "@nomicfoundation/hardhat-viem/types.js" {
  interface Register {
    config: typeof config;
  }
}

export default config;
