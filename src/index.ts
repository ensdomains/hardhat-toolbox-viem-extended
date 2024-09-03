import type {
  KeyedClient,
  DeployContractConfig as OriginalDeployContractConfig,
} from "@nomicfoundation/hardhat-viem/types.js";
import { extendEnvironment } from "hardhat/config.js";
import { lazyObject } from "hardhat/plugins.js";
import type {
  Artifact,
  ContractTypesMap,
  HardhatRuntimeEnvironment,
} from "hardhat/types";

import "@nomicfoundation/hardhat-viem";
import "hardhat-deploy";
import "hardhat-deploy/dist/types.js";
import type {
  DeploymentSubmission,
  DeployOptions,
  DeployResult,
} from "hardhat-deploy/dist/types.js";
import type { HardhatUserConfig } from "hardhat/types/config.js";
import "hardhat/types/runtime.js";
import {
  getAddress,
  getContract as getViemContract,
  type Account,
  type ContractConstructorArgs,
  type Hash,
  type Hex,
  type TransactionReceipt,
  type Address as viemAddress,
} from "viem";

type ArtifactName = keyof ContractTypesMap;

type Client = Required<KeyedClient> & {
  address: viemAddress;
  account: Account;
};
type NewDeployContractConfig = OriginalDeployContractConfig & {
  artifact?: Artifact;
};
type RequiredArtifactConfig = Omit<OriginalDeployContractConfig, "artifact"> & {
  artifact: Artifact;
};
type DeployResultWithViemAddress = Omit<DeployResult, "address"> & {
  address: viemAddress;
};

declare module "hardhat/types/artifacts.js" {
  interface ContractTypesMap {}
}

declare module "hardhat-deploy/dist/types.js" {
  interface DeploymentsExtension {
    deploy<contractName extends ArtifactName>(
      name: contractName,
      options: Omit<DeployOptions, "args"> & {
        args: ContractConstructorArgs<ContractTypesMap[contractName]["abi"]>;
      }
    ): Promise<DeployResultWithViemAddress>;
  }
}

interface DeployContract {
  <contractName extends ArtifactName>(
    contractName: contractName,
    args: ContractConstructorArgs<ContractTypesMap[contractName]["abi"]>,
    options?: OriginalDeployContractConfig
  ): Promise<DeployResultWithViemAddress>;
  (
    contractName: string,
    args: any[],
    options: RequiredArtifactConfig
  ): Promise<DeployResultWithViemAddress>;
}

declare module "@nomicfoundation/hardhat-viem/types.js" {
  function deployContract<contractName extends ArtifactName>(
    contractName: contractName,
    args: ContractConstructorArgs<ContractTypesMap[contractName]["abi"]>,
    options?: OriginalDeployContractConfig
  ): Promise<DeployResult>;

  interface Register {}
  type ResolvedRegister = {
    config: Register extends { config: infer config extends HardhatUserConfig }
      ? config
      : HardhatUserConfig;
  };
  type ResolveConfig<key extends keyof ResolvedRegister["config"]> =
    ResolvedRegister["config"][key];

  interface HardhatViemHelpers {
    getContractOrNull: <contractName extends ArtifactName>(
      contractName: contractName,
      client?: KeyedClient
    ) => Promise<ContractTypesMap[contractName] | null>;
    getContract: <contractName extends ArtifactName>(
      contractName: contractName,
      client?: KeyedClient
    ) => Promise<ContractTypesMap[contractName]>;
    getNamedClients: () => Promise<
      Record<
        keyof ResolveConfig<"namedAccounts"> extends never
          ? string
          : keyof ResolveConfig<"namedAccounts">,
        Client
      >
    >;
    getUnnamedClients: () => Promise<Client[]>;
    waitForTransactionSuccess: (hash: Hash) => Promise<TransactionReceipt>;
    deploy: DeployContract;
  }
}

const getContractOrNull =
  (hre: HardhatRuntimeEnvironment) =>
  async <contractName extends ArtifactName>(
    contractName: contractName,
    client_?: KeyedClient
  ): Promise<ContractTypesMap[contractName] | null> => {
    if (typeof hre.deployments === "undefined")
      throw new Error("No deployment plugin installed");

    const deployment = await hre.deployments.getOrNull(contractName);
    if (!deployment) return null;

    const client = client_ ?? {
      public: await hre.viem.getPublicClient(),
      wallet: await hre.viem.getWalletClients().then(([c]) => c),
    };

    return getViemContract({
      abi: deployment.abi,
      address: deployment.address as viemAddress,
      client,
    }) as unknown as ContractTypesMap[contractName];
  };

const getContract =
  (hre: HardhatRuntimeEnvironment) =>
  async <contractName extends ArtifactName>(
    contractName: contractName,
    client?: KeyedClient
  ) => {
    const contract = await hre.viem.getContractOrNull(contractName, client);

    if (contract === null)
      throw new Error(`No contract deployed with name: ${contractName}`);

    return contract;
  };

const getNamedClients = (hre: HardhatRuntimeEnvironment) => async () => {
  const publicClient = await hre.viem.getPublicClient();
  const namedAccounts = await hre.getNamedAccounts();
  const clients: Record<string, Client> = {};

  for (const [name, address] of Object.entries(namedAccounts)) {
    const namedClient = await hre.viem.getWalletClient(address as viemAddress);
    clients[name] = {
      public: publicClient,
      wallet: namedClient,
      address: getAddress(address),
      account: namedClient.account,
    };
  }

  return clients;
};

const getUnnamedClients = (hre: HardhatRuntimeEnvironment) => async () => {
  const publicClient = await hre.viem.getPublicClient();
  const unnamedAccounts = await hre.getUnnamedAccounts();

  const clients: Client[] = await Promise.all(
    unnamedAccounts.map(async (address) => {
      const unnamedClient = await hre.viem.getWalletClient(
        address as viemAddress
      );
      return {
        public: publicClient,
        wallet: unnamedClient,
        address: getAddress(address),
        account: unnamedClient.account,
      };
    })
  );

  return clients;
};

const waitForTransactionSuccess =
  (hre: HardhatRuntimeEnvironment) => async (hash: Hash) => {
    const publicClient = await hre.viem.getPublicClient();

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success")
      throw new Error(`Transaction failed: ${hash}`);

    return receipt;
  };

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

type ObjectWithOptionalUndefined<obj extends Record<string, any>> = {
  [key in keyof obj as undefined extends obj[key] ? never : key]: obj[key];
} & {
  [key in keyof obj as undefined extends obj[key] ? key : never]?: Exclude<
    obj[key],
    undefined
  >;
};
const objectWithoutUndefined = <obj extends Record<string, any>>(
  obj: obj
): Prettify<ObjectWithOptionalUndefined<obj>> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined)
  ) as ObjectWithOptionalUndefined<obj>;
};

const deploy =
  (hre: HardhatRuntimeEnvironment) =>
  async (
    contractName: string,
    args: any[],
    options?: NewDeployContractConfig
  ) => {
    const [defaultWalletClient] = await hre.viem.getWalletClients();
    const walletClient = options?.client?.wallet ?? defaultWalletClient;

    const legacyOptions = objectWithoutUndefined({
      args,
      from: walletClient.account.address,
      log: true,
      waitConfirmations: options?.confirmations,
      value: options?.value?.toString(),
      gasLimit: options?.gas?.toString(),
      gasPrice: options?.gasPrice?.toString(),
      maxFeePerGas: options?.maxFeePerGas?.toString(),
      maxPriorityFeePerGas: options?.maxPriorityFeePerGas?.toString(),
    }) satisfies DeployOptions;

    if (hre.network.saveDeployments)
      return hre.deployments.deploy(
        contractName as string,
        legacyOptions
      ) as Promise<DeployResultWithViemAddress>;

    const diffResult = await hre.deployments.fetchIfDifferent(
      contractName,
      legacyOptions
    );

    if (!diffResult.differences) {
      const deployment = await hre.deployments.get(contractName);
      return {
        ...deployment,
        address: deployment.address as viemAddress,
        newlyDeployed: false,
      };
    }

    const artifact =
      options?.artifact ?? (await hre.artifacts.readArtifact(contractName));
    const deployHash = await walletClient.deployContract({
      abi: artifact.abi,
      bytecode: artifact.bytecode as Hex,
      args,
      value: options?.value,
      gas: options?.gas,
      ...(options?.gasPrice
        ? {
            gasPrice: options?.gasPrice,
          }
        : {
            maxFeePerGas: options?.maxFeePerGas,
            maxPriorityFeePerGas: options?.maxPriorityFeePerGas,
          }),
    });

    console.log(`deploying "${contractName}" (tx: ${deployHash})...`);

    const receipt = await hre.viem.waitForTransactionSuccess(deployHash);

    console.log(
      `"${contractName}" deployed at: ${receipt.contractAddress} with ${receipt.gasUsed} gas`
    );

    const deployment = {
      address: receipt.contractAddress!,
      abi: artifact.abi,
      receipt: {
        from: receipt.from,
        transactionHash: deployHash,
        blockHash: receipt.blockHash,
        blockNumber: Number(receipt.blockNumber),
        transactionIndex: receipt.transactionIndex,
        cumulativeGasUsed: receipt.cumulativeGasUsed.toString(),
        gasUsed: receipt.gasUsed.toString(),
        contractAddress: receipt.contractAddress!,
        logs: receipt.logs.map((log) => ({
          blockNumber: Number(log.blockNumber),
          blockHash: log.blockHash,
          transactionHash: log.transactionHash,
          transactionIndex: log.transactionIndex,
          logIndex: log.logIndex,
          removed: log.removed,
          address: log.address,
          topics: log.topics,
          data: log.data,
        })),
        logsBloom: receipt.logsBloom,
        status: receipt.status === "success" ? 1 : 0,
        ...(receipt.to ? { to: receipt.to } : {}),
      },
      transactionHash: deployHash,
      args,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    } satisfies DeploymentSubmission;

    await hre.deployments.save(contractName, deployment);

    return {
      ...deployment,
      newlyDeployed: true,
    };
  };

extendEnvironment((hre) => {
  const prevViem = hre.viem;
  hre.viem = lazyObject(() => {
    prevViem.getContractOrNull = getContractOrNull(hre);
    prevViem.getContract = getContract(hre);
    prevViem.getNamedClients = getNamedClients(hre);
    prevViem.getUnnamedClients = getUnnamedClients(hre);
    prevViem.waitForTransactionSuccess = waitForTransactionSuccess(hre);
    prevViem.deploy = deploy(hre);
    return prevViem;
  });
});
