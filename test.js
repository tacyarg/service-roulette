var test = require('tape')
var Game = require('./game')
var Games = require('./')
var Random = require('random-js')
var random = new Random(Random.engines.mt19937().autoSeed())
var lodash = require('lodash')

const CONFIG = {
    roulette_test: {
        name: 'roulette_test',
        betMin: 1, // min bet
        betMax: 99999, // max bet
        // maxBets: 3, // TODO: max number of bets per round.
        gameDuration: 1, //time in ms game should run before ending and picking winner
        endDuration: 1, //time before game is removed from list one winner picked
        totalSelections: 14 // +1 for house edge?
    }
}

const gameSelections = {
    BONUS: 2, // when winning value is 0 payout is 14x
    ODD: 1, // all odd numbers
    EVEN: 0, // all even number

    '2': 'BONUS',
    '1': 'ODD',
    '0': 'EVEN'
}

test('roulette', function (t) {
    var game = null
    t.test('create', function (t) {
        game = Game().create(CONFIG['roulette_test'], 1)
        t.ok(game, 'game object should return')
        t.ok(game.id, 'game id should be set')
        t.equal(1, game.created, 'time created should be set')
        t.equal(game.status, 'open', 'game status should be "open"')
        t.end()
    })
    t.test('join0', function (t) {
        const bet = Game(game).canJoin('user0', 420, gameSelections.BONUS)
        game = Game(game).join(bet, 2)
        t.ok(game, 'game object should return')
        t.equal(game.running.end, CONFIG['roulette_test'].gameDuration + 2, 'running end time should be equal')
        t.ok(game.bets['user0'], 'bet object should be return')
        t.end()
    })
    t.test('join1', function (t) {
        const bet = Game(game).canJoin('user1', 100, gameSelections.EVEN)
        game = Game(game).join(bet, 2)
        t.ok(game, 'game object should return')
        t.equal(game.running.end, CONFIG['roulette_test'].gameDuration + 2, 'running end time should be equal')
        t.ok(game.bets['user1'], 'bet object should be return')
        t.end()
    })
    t.test('tick', function (t) {
        game = Game(game).tick(random, 3)
        t.ok(game, 'game object should return')
        t.equal(game.status, 'pick_winner', 'game status should be "pick_winner"')
        t.end()
    })
    t.test('pickWinner', function (t) {
        game = Game(game).tick(random, 4)
        t.ok(game, 'game object should return')
        t.equal(game.status, 'winner_picked', 'game status should be "winner_picked"')
        t.equal(game.winner_picked.end, CONFIG['roulette_test'].gameDuration + 4, 'winner_picked duration should be equal')
        t.end()
    })
    t.test('tick', function (t) {
        game = Game(game).tick(random, 5)
        t.ok(game, 'game object should return')
        t.equal(game.status, 'ended', 'game status should be "ended"')
        t.end()
    })
})


test('roulettes', function (t) {
    var games = null
    var created = []
    t.test('init', function (t) {
        games = Games(null, null, null, null, random)
        t.ok(games, 'constructor ran')
        t.end()
    })
    t.test('create', function (t) {
        games.create('roulette_main').then(function (game) {
            created.push(game)
            t.ok(game, 'game object should be returned')
            t.end()
        }).catch(t.end)
    })
    t.test('join0', function (t) {
        games.join(created[0].id, 'user0', 420, gameSelections.BONUS).then(function (game) {
            t.ok(game, 'game object should be returned')
            t.end()
        }).catch(t.end)
    })
    t.test('join1', function (t) {
        games.join(created[0].id, 'user1', 100, gameSelections.EVEN).then(function (game) {
            t.ok(game, 'game object should be returned')
            game.status = 'pick_winner'
            t.end()
        }).catch(t.end)
    })
    t.test('tick', function (t) {
        games.tick().then(function () {
            t.end()
        }).catch(t.end)
    })
})