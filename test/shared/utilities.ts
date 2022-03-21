const { Contract } = require("ethers"); // , BigNumber, bigNumberify, getAddress, keccak256, defaultAbiCoder, solidityPack
// import { Web3Provider }=require("ethers/providers";
const { ethers } = require("hardhat");
const Web3Provider = ethers.Web3Provider;
// ethers.u

// const  toUtf8Bytes  = ethers.utils
// console.log(ethers.toUtf8Bytes)
const {
  BigNumber,
  bigNumberify,
  getAddress,
  keccak256,
  defaultAbiCoder,
  toUtf8Bytes,
  solidityPack,
} = ethers.utils;

const PERMIT_TYPEHASH = keccak256(
  toUtf8Bytes(
    "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
  )
);

function expandTo18Decimals(n: any) {
  return bigNumberify(n).mul(bigNumberify(10).pow(18));
}

function getDomainSeparator(name: any, tokenAddress: any) {
  return keccak256(
    defaultAbiCoder.encode(
      ["bytes32", "bytes32", "bytes32", "uint256", "address"],
      [
        keccak256(
          toUtf8Bytes(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
          )
        ),
        keccak256(toUtf8Bytes(name)),
        keccak256(toUtf8Bytes("1")),
        1,
        tokenAddress,
      ]
    )
  );
}

export function getCreate2Address(
  factoryAddress: any,
  [token0, token1]: any,
  bytecode: any
) {
  const [tokenA, tokenB] =
    token0 < token1 ? [token0, token1] : [token1, token0];
  const create2Inputs = [
    "0xff",
    factoryAddress,
    keccak256(solidityPack(["address", "address"], [tokenA, tokenB])),
    keccak256(bytecode),
  ];
  const sanitizedInputs = `0x${create2Inputs.map((i) => i.slice(2)).join("")}`;
  return getAddress(`0x${keccak256(sanitizedInputs).slice(-40)}`);
}

// : {
//     owner;
//     spender;
//     value;
// }

async function getApprovalDigest(
  token: { name: () => any; address: any },
  approve: { owner: any; spender: any; value: any },
  nonce: any,
  deadline: any
) {
  const name = await token.name();
  const DOMAIN_SEPARATOR = getDomainSeparator(name, token.address);
  return keccak256(
    solidityPack(
      ["bytes1", "bytes1", "bytes32", "bytes32"],
      [
        "0x19",
        "0x01",
        DOMAIN_SEPARATOR,
        keccak256(
          defaultAbiCoder.encode(
            ["bytes32", "address", "address", "uint256", "uint256", "uint256"],
            [
              PERMIT_TYPEHASH,
              approve.owner,
              approve.spender,
              approve.value,
              nonce,
              deadline,
            ]
          )
        ),
      ]
    )
  );
}

async function mineBlock(
  provider: {
    _web3Provider: {
      sendAsync: (
        arg0: { jsonrpc: string; method: string; params: any[] },
        arg1: (error: any, result: any) => void
      ) => void;
    };
  },
  timestamp: any
) {
  await new Promise(async (resolve, reject) => {
    provider._web3Provider.sendAsync(
      { jsonrpc: "2.0", method: "evm_mine", params: [timestamp] },
      (error: any, result: unknown) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
  });
}

function encodePrice(
  reserve0: {
    mul: (arg0: any) => {
      (): any;
      new (): any;
      div: { (arg0: any): any; new (): any };
    };
  },
  reserve1: {
    mul: (arg0: any) => {
      (): any;
      new (): any;
      div: { (arg0: any): any; new (): any };
    };
  }
) {
  return [
    reserve1.mul(bigNumberify(2).pow(112)).div(reserve0),
    reserve0.mul(bigNumberify(2).pow(112)).div(reserve1),
  ];
}
