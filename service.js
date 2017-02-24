const Game = require('./game.js')
const Promise = require('bluebird')
const lodash = require('lodash')
var assert = require('assert')
var Random = require('random-js')
var Emitter = require('events')

const CONFIG = {
  roulette_main: {
    name: 'roulette_main',
    betMin: 1, // min bet
    betMax: 99999, // max bet
    // maxBets: 3, // TODO: max number of bets per round.
    gameDuration: 20000, //time in ms game should run before ending and picking winner
    endDuration: 20000,  //time before game is removed from list one winner picked
    totalSelections: 14 // +1 for house edge?
  }
}

module.exports = function (resume,upsert,remove,config,random) {
  var random = new Random(Random.engines.mt19937())
  resume = resume || []
  upsert = upsert || function(){}
  remove = remove || function(){}
  config = config || CONFIG

  var games = null
  var methods = new Emitter()

  function isUserInGame(userid){
    return lodash.find(games,function(game){
      if(game.status=='ended') return false
      return game.bets[userid]
    })
  }

  function get(id){
    assert(id,'requires game id to get')
    assert(games[id],'game does not exist')
    return games[id]
  }

  function removeGame(id){
    lodash.unset(games, id)
    remove(id)
  }

  function create (name,ts) {
    assert(name,'requires config name')
    assert(config[name],'configuration by that name does not exist')
    var game = Game().create(config[name],ts)
    games[game.id] = game
    upsert(game)
    return game
  }

  methods.create = Promise.method(create)

  methods.list = Promise.method(function(){
    return lodash.values(games)
  })

  methods.getState = Promise.method(function () {
    return games
  })

  methods.get = Promise.method(function(id){
    return get(id)
  })

  methods.canJoin = Promise.method(function(gameid, userid, value, selection){
    // NOTE: userid should be checked before this point.
    assert(gameid,'requires gameid to join')
    var game = get(gameid)
    return Game(game).canJoin(userid, value, selection)
  })

  methods.join = Promise.method(function(gameid, userid, value, selection){
    // NOTE: userid should be checked before this point.
    // NOTE: user credits should be deducted before this point.
    assert(gameid,'requires gameid to join')
    var game = get(gameid)
    const bet = Game(game).canJoin(userid, value, selection)
    game = Game(game).join(bet)
    games[game.id] = game
    upsert(game)
    return game
  })

  //tick will start game stop games and create a new one
  methods.tick = Promise.method(function(rand,ts){
    var ts = ts || Date.now()
    rand = rand || random
    assert(rand,'requires RNG')
    var gamesEnded = []
    lodash.each(games,function(game){
      game = Game(game).tick(rand,ts)
      upsert(game)
      if(game.status == 'ended'){
        //this only notifies statesync that we want to remove this game
        removeGame(game.id)
        gamesEnded.push(game)
        //create new game to replace
        create(game.config.name)
      }
    })
    //return ended games to notify players
    return gamesEnded
  })

  function init(){
    games = {}
    lodash.each(resume, function(game){
      if(game.status != 'ended'){
        console.log('Resuming Roulette:', game.id)
        games[game.id] = game
      }
    })
    var startedGames = lodash.map(games, game => game.config.name)
    lodash.each(config, cfg => {
      if(!lodash.includes(startedGames, cfg.name)){
        console.log('Spinning up Roulette:', cfg.name)
        create(cfg.name)
      }
    })
    return methods
  }
  return init()
}
