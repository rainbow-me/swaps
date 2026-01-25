import { HardhatUserConfig, task, vars } from 'hardhat/config';
import '@nomiclabs/hardhat-waffle';
import 'hardhat-gas-reporter';
import 'hardhat-tracer';
import '@nomiclabs/hardhat-etherscan';

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts', async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    // eslint-disable-next-line no-console
    console.log(account.address);
  }
});

// Replicate Hardhat v3's configVariable behavior
// Checks environment variables first, then falls back to Hardhat vars
function configVariable(name: string): string {
  return process.env[name] ?? vars.get(name);
}

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  etherscan: {
    apiKey: configVariable('ETHERSCAN_API_KEY'),
  },
  gasReporter: {
    coinmarketcap: configVariable('COINMARKETCAP_API_KEY'),
    currency: 'USD',
  },
  networks: {
    hardhat: {
      chainId: 1,
      forking: {
        blockNumber: 15214922,
        url: configVariable('MAINNET_RPC_ENDPOINT'),
      },
    },
    mainnet: {
      // accounts: [configVariable('RAINBOW_DEPLOYMENT_PKEY')],
      url: configVariable('MAINNET_RPC_ENDPOINT'),
    },
  },
  solidity: {
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
    version: '0.8.11',
  },
};

export default config;
