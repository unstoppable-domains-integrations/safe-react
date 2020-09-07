import logo from 'src/assets/icons/icon_etherTokens.svg'
import { getStandardTokenContract, getERC721TokenContract } from 'src/logic/tokens/store/actions/fetchTokens'
import { makeToken, Token } from 'src/logic/tokens/store/model/token'
import { web3ReadOnly as web3 } from 'src/logic/wallets/getWeb3'
import { isEmptyData } from 'src/logic/safe/store/actions/transactions/utils/transactionHelpers'
import { TxServiceModel } from 'src/logic/safe/store/actions/transactions/fetchTransactions/loadOutgoingTransactions'
import { Map } from 'immutable'

export const ETH_ADDRESS = '0x000'
export const SAFE_TRANSFER_FROM_WITHOUT_DATA_HASH = '42842e0e'

export const getEthAsToken = (balance: string | number): Token => {
  return makeToken({
    address: ETH_ADDRESS,
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
    logoUri: logo,
    balance,
  })
}

export const isAddressAToken = async (tokenAddress: string): Promise<boolean> => {
  // SECOND APPROACH:
  // They both seem to work the same
  // const tokenContract = await getStandardTokenContract()
  // try {
  //   await tokenContract.at(tokenAddress)
  // } catch {
  //   return 'Not a token address'
  // }
  const call = await web3.eth.call({ to: tokenAddress, data: web3.utils.sha3('totalSupply()') as string })

  return call !== '0x'
}

export const isTokenTransfer = (tx: TxServiceModel): boolean => {
  return !isEmptyData(tx.data) && tx.data?.substring(0, 10) === '0xa9059cbb' && Number(tx.value) === 0
}

export const isSendERC721Transaction = (
  tx: TxServiceModel,
  txCode: string | null,
  knownTokens: Map<string, Token>,
): boolean => {
  // "0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85" - ens token contract, includes safeTransferFrom
  // but no proper ERC721 standard implemented
  return (
    (txCode &&
      txCode.includes(SAFE_TRANSFER_FROM_WITHOUT_DATA_HASH) &&
      tx.to !== '0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85') ||
    (isTokenTransfer(tx) && !knownTokens.get(tx.to))
  )
}

export const getERC721Symbol = async (contractAddress: string): Promise<string> => {
  let tokenSymbol = 'UNKNOWN'
  try {
    const ERC721token = await getERC721TokenContract()
    const tokenInstance = await ERC721token.at(contractAddress)
    tokenSymbol = tokenInstance.symbol()
  } catch (err) {
    console.error(`Failed to retrieve token symbol for ERC721 token ${contractAddress}`)
  }
  return tokenSymbol
}

export const isSendERC20Transaction = async (
  tx: TxServiceModel,
  txCode: string | null,
  knownTokens: Map<string, Token>,
): Promise<boolean> => {
  return !isSendERC721Transaction(tx, txCode, knownTokens) && isTokenTransfer(tx)
}

export const isERC721Contract = async (contractAddress: string): Promise<boolean> => {
  const ERC721Token = await getStandardTokenContract()
  let isERC721 = false

  try {
    await ERC721Token.at(contractAddress)
    isERC721 = true
  } catch (error) {
    console.warn('Asset not found')
  }

  return isERC721
}
