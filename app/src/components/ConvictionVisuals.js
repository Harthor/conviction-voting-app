import React, { useState, useEffect } from 'react'
import { useAragonApi } from '@aragon/api-react'
import { Timer, Text, Tag, useTheme, useLayout, textStyle } from '@aragon/ui'
import BN from 'bn.js'
import LineChart from './ModifiedLineChart'
import styled from 'styled-components'
import SummaryBar from './SummaryBar'
import {
  getConvictionHistory,
  getConvictionHistoryByEntity,
  getMaxConviction,
  getMinNeededStake,
  getRemainingTimeToPass,
  getCurrentConviction,
  getCurrentConvictionByEntity,
  getConvictionTrend,
} from '../lib/conviction'
import { useBlockNumber } from '../BlockContext'
import { formatTokenAmount } from '../lib/token-utils'
import { getStakesAndThreshold } from '../lib/proposals-utils'

const TIME_UNIT = (60 * 60 * 24) / 15

export function ConvictionChart({ proposal, withThreshold = true }) {
  const { appState, connectedAccount } = useAragonApi()
  const {
    stakeToken,
    globalParams: { alpha },
  } = appState
  const { stakes, threshold } = getStakesAndThreshold(proposal)
  const currentBlock = useBlockNumber()
  const theme = useTheme()

  const max = getMaxConviction(stakeToken.tokenSupply || 0, alpha)

  const lines = [
    getConvictionHistory(
      stakes,
      currentBlock + 25 * TIME_UNIT,
      alpha,
      TIME_UNIT
    ),
    getConvictionHistoryByEntity(
      stakes,
      connectedAccount,
      currentBlock + 25 * TIME_UNIT,
      alpha,
      TIME_UNIT
    ),
  ]

  // We want conviction and threhsold in percentages
  const normalize = n => n / max
  const normalizeLines = lines => {
    return lines.map(line => line.map(normalize))
  }

  return (
    <LineChart
      lines={normalizeLines(lines)}
      total={lines[0] && lines[0].length}
      label={i => i - Math.floor((lines[0].length - 1) / 2)}
      captionsHeight={20}
      color={i => [theme.info, theme.infoSurfaceContent][i]}
      threshold={
        withThreshold &&
        !Number.isNaN(threshold) &&
        threshold !== Number.POSITIVE_INFINITY &&
        normalize(threshold)
      }
    />
  )
}

export function ConvictionBar({ proposal, withThreshold = true }) {
  const { connectedAccount, appState } = useAragonApi()
  const {
    globalParams: { alpha },
  } = appState
  const blockNumber = useBlockNumber()
  const theme = useTheme()

  const { stakes, totalTokensStaked, threshold, max } = getStakesAndThreshold(
    proposal
  )
  const conviction = getCurrentConviction(stakes, blockNumber, alpha)
  const myConviction =
    (connectedAccount &&
      getCurrentConvictionByEntity(
        stakes,
        connectedAccount,
        blockNumber,
        alpha
      )) ||
    0
  const futureConviction = getMaxConviction(totalTokensStaked, alpha)
  const myStakedConviction = myConviction / max
  const stakedConviction = conviction / max
  const futureStakedConviction = futureConviction / max
  const neededConviction = threshold / max
  return (
    <div>
      <SummaryBar
        firstSize={myStakedConviction}
        secondSize={stakedConviction - myStakedConviction}
        thirdSize={futureStakedConviction - stakedConviction}
        requiredSize={withThreshold && neededConviction}
        compact
      />
      <div>
        <span
          css={`
            ${textStyle('body3')}
          `}
        >
          {Math.round(stakedConviction * 100)}%{' '}
          {withThreshold ? (
            <span
              css={`
                color: ${theme.contentSecondary};
              `}
            >
              {isFinite(neededConviction)
                ? `(${Math.round(neededConviction * 100)}% needed)`
                : `(&infin; needed)`}
            </span>
          ) : (
            <span
              css={`
                color: ${theme.contentSecondary};
              `}
            >
              {Math.round(stakedConviction * 100) !==
              Math.round(futureStakedConviction * 100)
                ? `(predicted: ${Math.round(futureStakedConviction * 100)}%)`
                : `(stable)`}
            </span>
          )}
        </span>
      </div>
    </div>
  )
}

export function ConvictionCountdown({ proposal, shorter }) {
  const { appState } = useAragonApi()
  const {
    globalParams: { alpha, maxRatio },
  } = appState
  const {
    appState: {
      stakeToken: { tokenSymbol, tokenDecimals },
    },
  } = useAragonApi()
  const blockNumber = useBlockNumber()
  const theme = useTheme()
  const { executed } = proposal
  const { stakes, totalTokensStaked, threshold } = getStakesAndThreshold(
    proposal
  )
  const conviction = getCurrentConviction(stakes, blockNumber, alpha)
  const minTokensNeeded = getMinNeededStake(threshold, alpha)
  console.log('tokens ', minTokensNeeded, totalTokensStaked)

  const minTokensNeededBN = new BN(minTokensNeeded.toString())
  const totalTokensStakedBN = new BN(totalTokensStaked.toString())

  console.log('minTokensNeededBN ', minTokensNeededBN.toString())
  console.log('totalTokensStaked ', totalTokensStakedBN.toString())

  const subs = minTokensNeededBN.sub(totalTokensStakedBN)

  console.log('RESTA ', subs.toString())

  const neededTokens = formatTokenAmount(subs, tokenDecimals)

  // const neededTokens = parseInt(minTokensNeeded - totalTokensStaked)

  console.log('neededTokens ', neededTokens)
  const time = getRemainingTimeToPass(
    threshold,
    conviction,
    totalTokensStaked,
    alpha
  )

  const UNABLE_TO_PASS = 0
  const MAY_PASS = 1
  const AVAILABLE = 2
  const EXECUTED = 3

  console.log('conviction ', conviction, threshold)

  const getView = () =>
    executed
      ? EXECUTED
      : conviction >= threshold
      ? AVAILABLE
      : time > 0
      ? MAY_PASS
      : UNABLE_TO_PASS
  const [view, setView] = useState(getView())

  const NOW = Date.now()
  const BLOCK_TIME = 1000 * 15
  const endDate =
    !isNaN(new Date(NOW + time * BLOCK_TIME).getTime()) &&
    new Date(NOW + time * BLOCK_TIME)
  useEffect(() => {
    setView(getView())
  }, [conviction, threshold, time])

  return view === UNABLE_TO_PASS ? (
    <>
      <Text color={theme.negative.toString()}> ✘ Won't pass</Text>
      {!shorter && (
        <div>
          <Text color={theme.surfaceContent.toString()}>
            {!isNaN(neededTokens)
              ? 'Insufficient staked tokens'
              : 'Not enough funds in the organization'}
          </Text>
          <br />
          <Text color={theme.surfaceContentSecondary.toString()}>
            (
            {!isNaN(neededTokens) ? (
              <React.Fragment>
                At least{' '}
                <Tag>
                  {neededTokens} {tokenSymbol}
                </Tag>{' '}
                more needed
              </React.Fragment>
            ) : (
              `Funding requests must be below ${maxRatio *
                100}% organization total funds`
            )}
            ).
          </Text>
        </div>
      )}
    </>
  ) : view === MAY_PASS ? (
    <>
      <Text color={theme.positive.toString()}> ✓ May pass</Text>
      {!shorter && (
        <React.Fragment>
          <br />
          <Text color={theme.surfaceContentSecondary.toString()}>
            Estimate until pass
          </Text>
          {!!endDate && <Timer end={endDate} />}
        </React.Fragment>
      )}
    </>
  ) : view === EXECUTED ? (
    <Text color={theme.positive.toString()}> ✓ Executed</Text>
  ) : (
    <>
      <Text color={theme.positive.toString()}> ✓ Available for execution</Text>
    </>
  )
}

export function ConvictionTrend({ proposal }) {
  const { appState } = useAragonApi()
  const {
    globalParams: { alpha },
  } = appState
  const theme = useTheme()
  const { stakes, max } = getStakesAndThreshold(proposal)
  const blockNumber = useBlockNumber()
  const trend = getConvictionTrend(stakes, max, blockNumber, alpha, TIME_UNIT)
  const { layoutName } = useLayout()
  const compactMode = layoutName === 'small'
  const percentage =
    trend > 0.1 ? Math.round(trend * 100) : Math.round(trend * 1000) / 10

  return (
    <TrendWrapper compactMode={compactMode} color={theme.contentSecondary}>
      <TrendArrow>{trend > 0 ? '↑' : trend < 0 ? '↓' : '↝'}</TrendArrow>
      <span
        css={`
          ${textStyle('body3')}
        `}
      >
        {percentage > 0 && '+'}
        {percentage}%
      </span>
    </TrendWrapper>
  )
}

const TrendWrapper = styled.span`
  display: flex;
  align-items: center;
  ${({ color }) => color && `color: ${color};`}
  ${({ compactMode }) => !compactMode && 'text-align: center;'}
`

const TrendArrow = styled.span`
  ${textStyle('title4')}
  margin-right: 8px;
`
