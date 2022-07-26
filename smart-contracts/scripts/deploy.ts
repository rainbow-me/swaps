/* eslint-disable no-console */
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers, run } from 'hardhat';

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  await run('compile');

  const accounts = await ethers.getSigners();
  const owner = accounts[0];

  console.log('Owner address', owner.address);

  try {
    const RainbowRouter = await ethers.getContractFactory('RainbowRouter');
    const rainbowRouterInstance = await RainbowRouter.deploy();
    console.log('Waiting for tx to confirm', rainbowRouterInstance.hash);
    const tx = await rainbowRouterInstance.deployed();
    console.log('Contract deployed at address', rainbowRouterInstance.address);
    if (tx.deployTransaction.blockNumber) {
      const blockInfo = await ethers.provider.send('eth_getBlockByNumber', [
        ethers.utils.hexValue(tx.deployTransaction.blockNumber),
        true,
      ]);

      console.log(
        'GAS USED: ',
        ethers.BigNumber.from(blockInfo.gasUsed).toNumber()
      );
    }
  } catch (e) {
    console.log('ERROR deploying contract!', e);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
