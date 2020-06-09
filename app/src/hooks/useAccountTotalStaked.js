import { useMemo } from 'react'
import { useAppState, useConnectedAccount } from '@aragon/api-react'
import BN from 'bn.js'
import { addressesEqual } from '../lib/web3-utils'

export default function useAccountTotalStaked() {
  const { proposals = [] } = useAppState()
  const connectedAccount = useConnectedAccount()

  const totalStaked = useMemo(() =>
    proposals
      .filter(({ executed }) => !executed)
      .reduce((acc, { stakes }) => {
        const myStake = stakes.find(({ entity }) =>
          addressesEqual(entity, connectedAccount)
        )

        if (!myStake) {
          return acc
        }

        return acc.add(myStake.amount)
      }, new BN(0))
  )

  return totalStaked
}
