'use strict'
const lodash = require('lodash')
const uuid = require('uuid')
const assert = require('assert')

module.exports = function (game) {
  var methods = {}
  //states:
  //open, running, pick_winner, winner_picked, ended

  const gameSelections = {
    BONUS: 2, // when winning value is 0 payout is 14x
    ODD: 1, // all odd numbers
    EVEN: 0, // all even number

    '2': 'BONUS',
    '1': 'ODD',
    '0': 'EVEN'
  }

  function defaults(state) {
    return lodash.defaults(state, {
      id: uuid.v4(),
      type:'roulette',
      status: 'open',
      created: Date.now(),
      updated: Date.now(),
      ended: null,
      bets: {},
      value: 0,
      endingSelection: null,
      winners: [],
      countdown: 5
    })
  }
  
  function makeBet(userid, value, selection) {
    return {
      userid: userid,
      value: value,
      selection: selection,
      time: Date.now()
    }
  }

  methods.create = function (config,ts) {
    ts = ts || Date.now()
    return defaults({
      created:ts,
      config: config
    })
  }

  methods.canJoin = function (userid, value, selection) {
    assert((game.status == 'open') || (game.status == 'running'), 'cant join game, it has ended')
    assert(userid, 'requires user id') //user is checked before getting here.
    assert(value, 'needs value') //credits are deducted from user before getting here.
    assert(Number.isInteger(value), 'value should be a integer!')
    assert(value > 0, 'The value bet should be more than 0')
    assert(value >= game.config.betMin && value <= game.config.betMax, `The bet must be within ${game.config.betMin} and ${game.config.betMax}`)
    assert(Number.isInteger(selection), 'Selection should be a integer!')
    assert(selection <= gameSelections.BONUS && selection >= gameSelections.EVEN, 'You must pick a valid selection')

    assert(!lodash.has(game.bets, userid), 'you are already in this game') // NOTE: this needs to be changed to allow one bet per selection.

    return makeBet(userid, value, selection)
  }

  methods.join = function(bet, ts) {
    ts = ts || Date.now()
    if(lodash.keys(game.bets).length === 0) {
      // game will wait for the first bet before starting the countdown timer.
      game.status = 'running'
      //set start and stop times
      game.running = {
        start:ts,
        end:ts + game.config.gameDuration  
      }
      game.started = ts
    }
    game.bets[bet.userid] = bet
    game.value += bet.value
    return game
  }

  function checkSelection (outcome, selection) {
    return (outcome === 0 && selection === gameSelections.BONUS) || (outcome !== 0 && outcome % 2 === selection)
  }

  methods.findWinners = function(random, ts) {
    assert(game.status == 'pick_winner', 'game is not ready to pick a winner')
    assert(lodash.isFinite(game.value) && game.value > 0, 'cannot choose winner with game of 0 value')
    assert(!game.outcome, 'Cannot pick a new outcome of a game that has already ended.')
    ts = ts || Date.now()

    game.outcome = random.integer(0, game.config.totalSelections)
    // const winningNumber = Math.ceil(total + result.outcome) % (CHOICE_RANGE_MAX - CHOICE_RANGE_MIN + 1) 

    const winners = lodash.reduce(game.bets, (memo, bet) => {
      const win = checkSelection(game.outcome, bet.selection)
      if(win) {
        memo.push(bet)
      }
      return memo
    }, [])

    game.status = 'winner_picked'
    game.winner_picked = {
      start:ts,
      end:ts+game.config.endDuration
    }
    return game
  }

  /* main game loop */
  methods.tick = function(random, ts) {
    var ts = ts || Date.now()
    game.updated = ts

    if(game.status == 'open'){
      return game
    }
    if(game.status == 'running'){
      var end = game.running.end
      game.countdown = parseInt((game.running.end - ts)/1000)
      if(game.countdown <= 0) game.countdown = 0
      if(end <= ts) game.status = 'pick_winner'
      return game
    }

    if(game.status == 'pick_winner'){
      //sets status to 'winner_picked'
      return methods.findWinners(random, ts)
    }

    if(game.status == 'winner_picked'){
      //delay before starting the new game.
      var end = game.winner_picked.end
      if(end <= ts) game.status = 'ended'
      return game
    }

    return game
  }

  return methods
}
