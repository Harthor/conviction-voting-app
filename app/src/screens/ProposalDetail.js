import React, { useCallback, useMemo } from 'react'
import {
  BackButton,
  Bar,
  Box,
  Button,
  GU,
  Text,
  textStyle,
  Link,
  SidePanel,
  Split,
  useLayout,
  useTheme,
} from '@aragon/ui'
import styled from 'styled-components'
import { useAragonApi } from '@aragon/api-react'
import LocalIdentityBadge from '../components/LocalIdentityBadge/LocalIdentityBadge'
import Balance from '../components/Balance'
import {
  ConvictionCountdown,
  ConvictionBar,
  ConvictionChart,
} from '../components/ConvictionVisuals'
import usePanelState from '../hooks/usePanelState'
import { addressesEqualNoSum as addressesEqual } from '../lib/web3-utils'
import { useBlockNumber } from '../BlockContext'
import { getStakesAndThreshold } from '../lib/proposals-utils'
import { getCurrentConviction } from '../lib/conviction'
import SupportProposal from '../components/panels/SupportProposal'

function ProposalDetail({ proposal, onBack, requestToken }) {
  const theme = useTheme()
  const { layoutName } = useLayout()
  const { api, connectedAccount, appState } = useAragonApi()
  const {
    globalParams: { alpha },
  } = appState

  const blockNumber = useBlockNumber()
  const panelState = usePanelState()

  const {
    id,
    name,
    creator,
    beneficiary,
    link,
    requestedAmount,
    executed,
  } = proposal

  const { stakes, threshold } = getStakesAndThreshold(proposal)
  const conviction = getCurrentConviction(stakes, blockNumber, alpha)
  const myStakes = stakes.filter(({ entity }) => entity === connectedAccount)
  const didIStaked = myStakes.length > 0 && [...myStakes].pop().tokensStaked > 0

  const handleExecute = useCallback(() => {
    api.executeProposal(id, true).toPromise()
  }, [api, id])

  const handleStake = useCallback(() => {
    api.stakeAllToProposal(id).toPromise()
  }, [api, id])

  const handleWithdraw = useCallback(() => {
    api.withdrawAllFromProposal(id).toPromise()
  }, [api, id])

  const buttonMode = useMemo(() => {
    if (conviction >= threshold) {
      return { text: 'Execute proposal', action: handleExecute, mode: 'strong' }
    }
    if (didIStaked) {
      return {
        text: 'Change support',
        action: handleWithdraw,
        mode: 'normal',
      }
    }
    return {
      text: 'Support this proposal',
      action: panelState.requestOpen,
      mode: 'strong',
    }
  }, [
    conviction,
    threshold,
    didIStaked,
    handleExecute,
    handleStake,
    handleWithdraw,
    panelState,
  ])

  return (
    <div>
      <Bar>
        <BackButton onClick={onBack} />
      </Bar>
      <Split
        primary={
          <div>
            <Box>
              <section
                css={`
                  display: grid;
                  grid-template-rows: auto;
                  grid-gap: ${2.5 * GU}px;
                  margin-top: ${2.5 * GU}px;
                `}
              >
                <h1
                  css={`
                    ${textStyle('title2')};
                    font-weight: 600;
                  `}
                >
                  #{id} {name}
                </h1>
                <div
                  css={`
                    display: grid;
                    grid-template-columns: ${layoutName !== 'small'
                      ? 'auto auto auto auto'
                      : 'auto'};
                    grid-gap: ${layoutName !== 'small' ? 5 * GU : 2.5 * GU}px;
                  `}
                >
                  {requestToken && (
                    <Amount
                      requestedAmount={requestedAmount}
                      requestToken={requestToken}
                    />
                  )}
                  <div>
                    <Heading color={theme.surfaceContentSecondary}>
                      Link
                    </Heading>
                    {link ? (
                      <Link href={link} external>
                        Read more
                      </Link>
                    ) : (
                      <Text
                        css={`
                          ${textStyle('body2')};
                        `}
                      >
                        No link provided
                      </Text>
                    )}
                  </div>
                  <div>
                    <Heading color={theme.surfaceContentSecondary}>
                      Created By
                    </Heading>
                    <div
                      css={`
                        display: flex;
                        align-items: flex-start;
                      `}
                    >
                      <LocalIdentityBadge
                        connectedAccount={addressesEqual(
                          creator,
                          connectedAccount
                        )}
                        entity={creator}
                      />
                    </div>
                  </div>
                  {requestToken && (
                    <div>
                      <Heading color={theme.surfaceContentSecondary}>
                        Beneficiary
                      </Heading>
                      <div
                        css={`
                          display: flex;
                          align-items: flex-start;
                        `}
                      >
                        <LocalIdentityBadge
                          connectedAccount={addressesEqual(
                            beneficiary,
                            connectedAccount
                          )}
                          entity={beneficiary}
                        />
                      </div>
                    </div>
                  )}
                </div>
                {!executed && (
                  <React.Fragment>
                    <div css="width: 100%;">
                      <Heading color={theme.surfaceContentSecondary}>
                        Conviction prediction
                      </Heading>
                      <ConvictionChart
                        proposal={proposal}
                        withThreshold={!!requestToken}
                      />
                    </div>
                    <Button
                      wide
                      mode={buttonMode.mode}
                      onClick={buttonMode.action}
                    >
                      {buttonMode.text}
                    </Button>
                  </React.Fragment>
                )}
              </section>
            </Box>
          </div>
        }
        secondary={
          <div>
            {requestToken && (
              <Box heading="Status">
                <ConvictionCountdown proposal={proposal} />
              </Box>
            )}
            {!proposal.executed && (
              <Box heading="Conviction Progress">
                <ConvictionBar
                  proposal={proposal}
                  withThreshold={!!requestToken}
                />
              </Box>
            )}
          </div>
        }
      />
      <SidePanel
        title="Support this proposal"
        opened={panelState.visible}
        onClose={panelState.requestClose}
      >
        <SupportProposal id={id} onDone={panelState.requestClose} />
      </SidePanel>
    </div>
  )
}

const Amount = ({
  requestedAmount = 0,
  requestToken: { symbol, decimals, verified },
}) => (
  <div>
    <Heading color={useTheme().surfaceContentSecondary}>Amount</Heading>
    <Balance
      amount={requestedAmount}
      decimals={decimals}
      symbol={symbol}
      verified={verified}
    />
  </div>
)

const Heading = styled.h2`
  ${textStyle('label2')};
  color: ${props => props.color};
  margin-bottom: ${1.5 * GU}px;
`

export default ProposalDetail
