require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-solhint");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");
// require("hardhat-contract-sizer");
require("hardhat-deploy");
require("dotenv").config();

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
    "\n !! IMPORTANT !!\n Must set INFURA_API_KEY in .env before running hardhat"
  );
  process.exit(0);
}

const localArgs = {
  FeeToSetter: "",
  Factory: "",
  WETH: "",
};

const mainnetArgs = {
  FeeToSetter: "0x57802b223F76Afd6E51Bb2AF578E72B07066a069",
  Factory: "0x408f66057163d829a30D4d466092c6B0eebb692f",
  WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
};

const goerliArgs = {
  FeeToSetter: "0xC007C409E8366C68285292FB2833Fde4e85f2778",
  Factory: "0x8E257bA064C371EC05Ca7500362278B8098D13Ac",
  WETH: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
};

const arbitrumArgs = {
  FeeToSetter: "",
  Factory: "",
  WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
};

const goerliArbitrumArgs = {
  FeeToSetter: "0xC007C409E8366C68285292FB2833Fde4e85f2778",
  Factory: "0x8B6412217B66d299Ae12885F9Aae0d4D3049f53B",
  WETH: "0x6d44BB7122C831A749Cc0006Cd371c123bc2acA4",
};

// const ropstenArgs = {
//   FeeToSetter: "0xC007C409E8366C68285292FB2833Fde4e85f2778",
//   Factory: "",
//   WETH: "0xc778417E063141139Fce010982780140Aa0cD5Ab",
// };

// const kovanArgs = {
//   FeeToSetter: "0xC007C409E8366C68285292FB2833Fde4e85f2778",
//   Factory: "",
//   WETH: "0xd0A1E359811322d97991E03f863a0C30C2cF029C",
// };

// const rinkebyArgs = {
//   FeeToSetter: "0xC007C409E8366C68285292FB2833Fde4e85f2778",
//   Factory: "",
//   WETH: "0xc778417E063141139Fce010982780140Aa0cD5Ab",
// };

module.exports = {
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
    maxMethodDiff: 25,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },

  defaultNetwork: "hardhat",

  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },

    hardhat: {
      allowUnlimitedContractSize: true,
      mining: {
        auto: false,
        interval: 5000,
      },
      ...localArgs,
    },

    mainnet: {
      allowUnlimitedContractSize: true,
      url: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [PRIVATE_KEY_MAINNET],
      ...mainnetArgs,
    },

    goerli: {
      allowUnlimitedContractSize: true,
      url: `https://goerli.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [PRIVATE_KEY_TEST],
      ...goerliArgs,
    },

    arbitrum: {
      allowUnlimitedContractSize: true,
      url: `https://arb1.arbitrum.io/rpc`,
      accounts: [PRIVATE_KEY_MAINNET],
      ...arbitrumArgs,
    },

    goerliArbitrum: {
      allowUnlimitedContractSize: true,
      url: `https://goerli-rollup.arbitrum.io/rpc`,
      accounts: [PRIVATE_KEY_TEST],
      ...goerliArbitrumArgs,
    },

    // ropsten: {
    //   allowUnlimitedContractSize: true,
    //   url: `https://ropsten.infura.io/v3/${INFURA_API_KEY}`,
    //   accounts: [PRIVATE_KEY_TEST],
    //   ...ropstenArgs,
    // },

    // kovan: {
    //   allowUnlimitedContractSize: true,
    //   url: `https://kovan.infura.io/v3/${INFURA_API_KEY}`,
    //   accounts: [PRIVATE_KEY_TEST],
    //   ...kovanArgs,
    // },

    // rinkeby: {
    //   allowUnlimitedContractSize: true,
    //   url: `https://rinkeby.infura.io/v3/${INFURA_API_KEY}`,
    //   accounts: [PRIVATE_KEY_TEST],
    //   ...rinkebyArgs,
    // },
  },

  etherscan: {
    apiKey: {
      mainnet: ETHERSCAN_API_KEY,
      goerli: ETHERSCAN_API_KEY,
    },
  },

  solidity: {
    compilers: [
      {
        version: "0.8.9",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.4.18",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },

  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },

  mocha: {
    timeout: 20000,
  },
};
