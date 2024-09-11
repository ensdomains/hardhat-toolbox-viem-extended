import { expect } from "chai";
import fs from "fs/promises";
import hre from "hardhat";
import { zeroAddress, type Address } from "viem";

const { viem } = hre;

before(async () => {
  await fs.rm("./deployments", { recursive: true, force: true });
});

let address: Address = zeroAddress;

it("deploys contract", async () => {
  const deployedContract = await viem.deploy("Test", []);
  expect(deployedContract.address).not.to.be.undefined;
  address = deployedContract.address;
  const contract = await viem.getContract("Test");
  const message = await contract.read.getMessage();
  expect(message).to.equal("Hello, World!");
});

it("reuses contract", async () => {
  const deployedContract = await viem.deploy("Test", []);
  expect(deployedContract.address).to.equal(address);
});

it("allows aliases", async () => {
  const deployedContract = await viem.deploy("Test", [], {
    alias: "TestWithAlias",
  });
  expect(deployedContract.address).not.to.be.undefined;
  expect(deployedContract.address).not.to.equal(address);
  const contract = await viem.getContract("TestWithAlias" as "Test");
  const message = await contract.read.getMessage();
  expect(message).to.equal("Hello, World!");
});

it("allows custom artifacts", async () => {
  const deployedContract = await viem.deploy("TestWithArtifact", [], {
    artifact: await hre.artifacts.readArtifact("Test"),
  });
  expect(deployedContract.address).not.to.be.undefined;
  expect(deployedContract.address).not.to.equal(address);
  const contract = await viem.getContract("TestWithArtifact" as "Test");
  const message = await contract.read.getMessage();
  expect(message).to.equal("Hello, World!");
});

it("allows custom artifact and alias", async () => {
  const deployedContract = await viem.deploy("Irrelevant", [], {
    artifact: await hre.artifacts.readArtifact("Test"),
    alias: "TestWithArtifactAndAlias",
  });
  expect(deployedContract.address).not.to.be.undefined;
  expect(deployedContract.address).not.to.equal(address);
  const contract = await viem.getContract("TestWithArtifactAndAlias" as "Test");
  const message = await contract.read.getMessage();
  expect(message).to.equal("Hello, World!");
});
