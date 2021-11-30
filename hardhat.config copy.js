require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
/**
 * @type import('hardhat/config').HardhatUserConfig
 */


 
 // This is a sample Hardhat task. To learn how to create your own go to
 // https://hardhat.org/guides/create-task.html
 task("accounts", "Prints the list of accounts", async () => {
   const accounts = await ethers.getSigners();
 
   for (const account of accounts) {
     console.log('tt:', account.address);
   }
 });
 
 task("balances", "Prints the list of AVAX account balances", async () => {
   const accounts = await ethers.getSigners();
 
   for (const account of accounts) {
     balance = await ethers.provider.getBalance(account.address);
     console.log(account.address, "has balance", balance.toString());
   }
 });


module.exports = {
  solidity: 
  {
    compilers: [
      {
        version: "0.8.9",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200},
        }
      }
    ]
  },
  defaultNetwork: "hardhat",

  localhost: {
      url: "http://127.0.0.1:8545",
    },

  networks: {
    hardhat: {
        gasPrice: 470000000000,
        chainId: 43112,
        allowUnlimitedContractSize: true,
      mining: {
        auto: false,
      },
      }
  
        //  ganache: {
        //      url: "http://127.0.0.1:7545",
        //      // accounts: [privateKey1, privateKey2, ...]
        //  }
     

    // hardhat: {
    //   allowUnlimitedContractSize: true,
    //   mining: {
    //     auto: false,
    //   },
    // }
}
};

