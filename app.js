const OneSplit = require('./abis/onesplit.json')   
const Web3 = require('web3')
const dotenv = require('dotenv');  
const BigNumber = require('bignumber.js')             

const provider = new Web3.providers.HttpProvider(process.env.INFURA)
var web3 = new Web3(provider)
var fromTokenAddress = process.env.FROM
var toTokenAddress = process.env.TO
var amount = parseInt(process.env.AMOUNT)
const weiDecimals = 18

var OneSplitContract = new web3.eth.Contract(
    OneSplit,
    "0xC586BeF4a0992C495Cf22e1aeEE4E446CECDee0E"
)

OneSplitContract.methods.getExpectedReturn(
    fromTokenAddress,
    toTokenAddress,
    amount,
    new BigNumber(amount).shiftedBy(weiDecimals),
    0
).call({}, (err,res) => {
    if(err) console.log(err)
    console.log(res)
})