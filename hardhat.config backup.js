require("@nomiclabs/hardhat-waffle");
require('@nomiclabs/hardhat-ethers');
require("@nomiclabs/hardhat-solhint");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");
require('hardhat-deploy');
require('dotenv').config();


task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});


const INFURA_API_KEY = process.env.INFURA_API_KEY;
const PRIVATE_KEY_TEST = process.env.PRIVATE_KEY_TEST;
const PRIVATE_KEY_MAINNET = process.env.PRIVATE_KEY_MAINNET;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

if (!INFURA_API_KEY) {
  console.log(
    '\n !! IMPORTANT !!\n Must set INFURA_API_KEY in .env before running hardhat',
  );
  process.exit(0);
}

const name = "Pulsar-LP";
const symbol = "PUL-LP";
const blockInterval = "10";

const mainnetArgs = {
  Name: name,
  Symbol: symbol,
  WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  BlockInterval: blockInterval,
};

const ropstenArgs = {
  Name: name,
  Symbol: symbol,
  WETH: "0xE22953C88933f9dF589c259a385C7FA4F5257151",
  USDT: "0x52709362Aaa0143e38d53c671B4C443ccd19B4D9", 
  BlockInterval: blockInterval,
};

const kovanArgs = {
  Name: name,
  Symbol: symbol,
  WETH: "0x19642AcD1544bB95e0F7c916f065F8C811fd14B8",
  USDT: "0x7702d7eD5A5C53e6699cc2a135bD5318bD01777e", 
  BlockInterval: blockInterval,
};

module.exports = {
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
    maxMethodDiff: 25,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  
  defaultNetwork: 'hardhat',

  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },

    hardhat: {
      allowUnlimitedContractSize: true,
      mining: {
        auto: false,
      },
      ...mainnetArgs,
    },

    mainnet: {
      url: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [PRIVATE_KEY_MAINNET],
      ...mainnetArgs,
    },

    ropsten: {
      url: `https://ropsten.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [PRIVATE_KEY_TEST],
      ...ropstenArgs,
    },

    kovan: {
      url: `https://kovan.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [PRIVATE_KEY_TEST],
      ...kovanArgs,
    },
  },

  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
    
  solidity: {
    compilers: [
      {
        version: '0.8.9',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200},
        },
      },
    ]
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },

  mocha: {
    timeout: 20000,
  },
};
