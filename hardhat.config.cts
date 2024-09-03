import type { HardhatUserConfig } from "hardhat/config";

import "@nomicfoundation/hardhat-viem";
import "hardhat-deploy";
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

export default config;
