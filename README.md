# @ensdomains/hardhat-toolbox-viem-extended

Extended Hardhat toolbox for viem

## Setup

1. Install

```sh
bun add @ensdomains/hardhat-toolbox-viem-extended hardhat @nomicfoundation/hardhat-viem hardhat-deploy
```

2. Apply type-extensions patch for `@nomicfoundation/hardhat-viem`

3. Import into hardhat config

```ts
import "@ensdomains/hardhat-toolbox-viem-extended";
```

4. (optional) Register your config

```ts
const config = {
  /* Your config here */
} satisfies HardhatUserConfig;

declare module "@nomicfoundation/hardhat-viem/types.js" {
  interface Register {
    config: typeof config;
  }
}
```

Registering your config currently enables:

- Typed `getNamedClients()` command

## Functions

### deploy

Main deploy function.

Parameters:

- `contractName`: Name of the contract
- `args`: Argument array for contract constructor
- `options`: Options inherited from `@nomicfoundation/hardhat-viem`

Returns: `DeployResult`

### getContractOrNull

Gets contract, or if none available returns null.

Parameters:

- `contractName`: Name of the contract
- `client`: (optional) Keyed client to use

Returns: `GetContractReturnType | null`

### getContract

Gets contract, or if none available throws error.

Parameters:

- `contractName`: Name of the contract
- `client`: (optional) Keyed client to use

Returns: `GetContractReturnType`

### waitForTransactionSuccess

Waits for a transaction receipt, and throws error if the transaction reverted.

Parameters:

- `hash`: Transaction hash

Returns: `WaitForTransactionReceiptReturnType`

### getNamedClients

Gets named accounts as wallet clients, from values defined in config.

Returns: `{ [key: string]: Client }`

### getUnnamedClients

Gets all unnamed accounts as wallet clients.

Returns: `Client[]`
