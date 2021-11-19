const oneSplitAbi = require('./abis/onesplit.json')   
const erc20Abi = require('./abis/erc20.json')   
const Web3 = require('web3')
const BigNumber = require('bignumber.js')        
const DexesList = require("./exchanges");     

const provider = new Web3.providers.HttpProvider("http://127.0.0.1:8545")
var web3 = new Web3(provider)
var fromAddress = "0xf60c2Ea62EDBfE808163751DD0d8693DCb30019c"
var fromTokenAddress = "0x6b175474e89094c44da98b954eedeac495271d0f"
var toTokenAddress = "0xB8c77482e45F1F44dE1745F52C74426C631bDD52"
var amountToSwap = 192
var oneSplitAddress = "0xC586BeF4a0992C495Cf22e1aeEE4E446CECDee0E";
var expectedSwap = null;
var amountToSwapWei;
var ethWeiDecimals;
var OneSplitContract = new web3.eth.Contract(oneSplitAbi, oneSplitAddress);
var FromTokenContract = new web3.eth.Contract(erc20Abi, fromTokenAddress);
var ToTokenContract = new web3.eth.Contract(erc20Abi, toTokenAddress);


async function getExpectedReturn() {
    const decimal = await FromTokenContract.methods.decimals().call()
    ethWeiDecimals = parseInt(decimal);
    amountToSwapWei = new BigNumber(amountToSwap).shiftedBy(ethWeiDecimals);
    await OneSplitContract.methods
      .getExpectedReturn(
        fromTokenAddress,
        toTokenAddress,
        new BigNumber(amountToSwap).shiftedBy(ethWeiDecimals),
        100,
        0
      )
      .call({}, async (err, res) => {
        if (err) console.error(err);
        expectedSwap = res;
        console.log(`
          from: ${fromTokenAddress}
          to: ${toTokenAddress}
          amount: ${amountToSwap}
          returnAmount: ${new BigNumber(res.returnAmount)
            .shiftedBy(-ethWeiDecimals)
            .toString()}
      `);
        DexesList.forEach((dex, i) => {
          console.log(`${dex}: ${res.distribution[i]}%`);
        });
        await approveSpender();
      });
  }
  
  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  async function awaitTransaction(tx) {
    var receipt = null;
    do {
      await web3.eth.getTransactionReceipt(tx).then(res => {
        if (res) receipt = res;
        wait(2000);
      });
    } while (receipt === null);
    console.log(`Transactions went successfull: ${receipt.transactionHash}`);
    return receipt.status;
  }
  
  async function approveSpender() {
    await FromTokenContract.methods
      .approve(oneSplitAddress, amountToSwapWei)
      .send({ from: fromAddress }, async (err, tx) => {
        if (err) console.log(`ERC20 token approving failed: ${err}`);
        console.log(`ERC20 token approved to: ${oneSplitAddress}`);
        await awaitTransaction(tx);
        await executeSwap();
      });
  }
  
  function fromWeiConvertor(amount) {
    return new BigNumber(amount).shiftedBy(-ethWeiDecimals).toFixed(2);
  }
  
  async function executeSwap() {
    var toTokenBefore = await ToTokenContract.methods.balanceOf(fromAddress).call();
    var fromTokenBefore = await FromTokenContract.methods.balanceOf(fromAddress).call();
    console.log(toTokenBefore)
    console.log(fromTokenBefore)
  
    await OneSplitContract.methods
      .swap(
        fromTokenAddress,
        toTokenAddress,
        amountToSwapWei,
        expectedSwap.returnAmount,
        expectedSwap.distribution,
        0
      )
      .send({ from: fromAddress, gas: 9999999 }, async (err, tx) => {
        if (err) console.log(`The swap couldn't be executed: ${err}`);
        await awaitTransaction(tx);
        var toTokenAfter = await ToTokenContract.methods.balanceOf(fromAddress).call();
        var fromTokenAfter = await FromTokenContract.methods.balanceOf(fromAddress).call();
  
        console.log(`
              The swap went successfull.
              
              Balances before: ${fromWeiConvertor(
                toTokenBefore
              )} - ${fromWeiConvertor(fromTokenBefore)}
              Balances after: ${fromWeiConvertor(toTokenAfter)} - ${fromWeiConvertor(
          fromTokenAfter
        )}`);
      });
  }
  
  getExpectedReturn();