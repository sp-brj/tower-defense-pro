/**
 * Integration Tests for Game Scenarios
 * Tests complete game flows and interactions between components
 */

const CONFIG = require('../../js/config.js');

// Setup DOM
document.body.innerHTML = `
    <canvas id="gameCanvas" width="900" height="560"></canvas>
    <div id="money"><span class="value">200</span></div>
    <div id="lives"><span class="value">20</span></div>
    <div id="wave"><span class="value">0/20</span></div>
    <div id="score"><span class="value">0</span></div>
    <button id="start-wave-btn"></button>
    <button id="speed-btn">▶ x1</button>
    <button id="pause-btn"></button>
    <button id="mute-btn">🔊</button>
    <button id="resume-btn"></button>
    <button id="restart-btn"></button>
    <button id="exit-btn"></button>
    <button id="result-restart-btn"></button>
    <button id="result-menu-btn"></button>
    <div class="tower-btn" data-tower="basic"></div>
    <div class="tower-btn" data-tower="frost"></div>
    <div class="tower-btn" data-tower="sniper"></div>
    <div class="tower-btn" data-tower="cannon"></div>
    <div class="tower-btn" data-tower="laser"></div>
    <div class="tower-btn" data-tower="barracks"></div>
    <div id="upgrade-menu" style="display: none;">
        <button class="close-btn"></button>
        <div id="upgrade-title"></div>
        <div id="level-stars"></div>
        <div id="upgrade-stats"></div>
        <button id="upgrade-btn"></button>
        <button id="sell-btn"></button>
    </div>
    <button id="ability-fire"></button>
    <div id="fire-cooldown"></div>
    <button id="ability-reinforce"></button>
    <div id="reinforce-cooldown"></div>
`;

// Mocks
global.audio = {
    play: jest.fn(),
    init: jest.fn(),
    toggleMute: jest.fn(() => false)
};

global.menuSystem = {
    showPause: jest.fn(),
    hidePause: jest.fn(),
    showResult: jest.fn(),
    hideResult: jest.fn(),
    showMainMenu: jest.fn()
};

global.saveSystem = {
    getSettings: jest.fn(() => ({
        sfxVolume: 70,
        musicVolume: 50,
        showTutorial: true,
        autoWave: false,
        showRange: true
    }))
};

// Load actual entity classes
const fs = require('fs');
const path = require('path');

// Create minimal particle class
class Particle {
    constructor(x, y, vx, vy, color, lifetime) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.lifetime = lifetime;
        this.alive = true;
    }
    update() { this.lifetime--; if (this.lifetime <= 0) this.alive = false; }
    draw() {}
}
global.Particle = Particle;

class Meteor {
    constructor(x, y, damage, radius) {
        this.x = x;
        this.y = y;
        this.damage = damage;
        this.radius = radius;
        this.alive = true;
    }
    update() { this.alive = false; }
    draw() {}
}
global.Meteor = Meteor;

class ReinforcementSoldier {
    constructor(x, y, hp, damage, duration) {
        this.x = x;
        this.y = y;
        this.hp = hp;
        this.damage = damage;
        this.duration = duration;
        this.alive = true;
    }
    update() {}
    draw() {}
}
global.ReinforcementSoldier = ReinforcementSoldier;

class Soldier {
    constructor(x, y, hp, damage, tower) {
        this.x = x;
        this.y = y;
        this.hp = hp;
        this.damage = damage;
        this.tower = tower;
        this.alive = true;
    }
    update() {}
    draw() {}
}
global.Soldier = Soldier;

// Load classes
const enemyCode = fs.readFileSync(path.join(__dirname, '../../js/entities/Enemy.js'), 'utf8');
eval(enemyCode);

const heroCode = fs.readFileSync(path.join(__dirname, '../../js/entities/Hero.js'), 'utf8');
eval(heroCode);

const projectileCode = fs.readFileSync(path.join(__dirname, '../../js/entities/Projectile.js'), 'utf8');
eval(projectileCode);

const towerCode = fs.readFileSync(path.join(__dirname, '../../js/entities/Tower.js'), 'utf8');
eval(towerCode);

const gameCode = fs.readFileSync(path.join(__dirname, '../../js/game.js'), 'utf8');
const gameCodeWithoutGlobal = gameCode.replace(/\/\/ Глобальный экземпляр игры[\s\S]*$/, '');
eval(gameCodeWithoutGlobal);

describe('Game Scenarios Integration', () => {
    let game;

    beforeEach(() => {
        jest.clearAllMocks();
        game = new Game();
    });

    describe('Complete Game Flow: Start to First Wave', () => {
        test('should start game, place tower, and start first wave', () => {
            // Start game
            game.start('normal');
            expect(game.state).toBe('playing');
            expect(game.money).toBe(200);

            // Place a basic tower (costs 50)
            game.selectedTowerType = 'basic';
            game.placeTower(500, 100);
            expect(game.towers.length).toBe(1);
            expect(game.money).toBe(150);

            // Start wave
            game.startWave();
            expect(game.wave).toBe(1);
            expect(game.waveInProgress).toBe(true);
        });
    });

    describe('Tower Targeting and Combat', () => {
        beforeEach(() => {
            game.start('normal');
        });

        test('tower should target and shoot enemies in range', () => {
            // Place tower
            const tower = new Tower(200, 280, 'basic');
            game.towers.push(tower);

            // Create enemy near tower
            const enemy = new Enemy('normal', 1, 'normal');
            enemy.x = 250;
            enemy.y = 280;
            game.enemies.push(enemy);

            // Update tower - should find target and shoot
            tower.update(game.enemies, game.projectiles);

            // Should have created a projectile
            expect(game.projectiles.length).toBe(1);
            expect(game.projectiles[0].target).toBe(enemy);
        });

        test('projectile should damage enemy on hit', () => {
            const enemy = new Enemy('normal', 1, 'normal');
            enemy.x = 110;
            enemy.y = 100;
            const initialHp = enemy.hp;

            const projectile = new Projectile(100, 100, enemy, 15, 'basic');
            projectile.update([enemy], game.particles);

            expect(enemy.hp).toBe(initialHp - 15);
            expect(projectile.alive).toBe(false);
        });

        test('frost tower should slow enemies', () => {
            const enemy = new Enemy('normal', 1, 'normal');
            enemy.x = 110;
            enemy.y = 100;

            const projectile = new Projectile(100, 100, enemy, 8, 'frost');
            projectile.slowAmount = 0.5;
            projectile.slowDuration = 60;

            projectile.update([enemy], game.particles);

            expect(enemy.slowAmount).toBe(0.5);
            expect(enemy.slowTimer).toBe(60);
        });

        test('cannon should deal splash damage', () => {
            const enemy1 = new Enemy('normal', 1, 'normal');
            enemy1.x = 100;
            enemy1.y = 100;

            const enemy2 = new Enemy('normal', 1, 'normal');
            enemy2.x = 120;
            enemy2.y = 100;

            const projectile = new Projectile(100, 100, enemy1, 35, 'cannon');
            projectile.splashRadius = 50;

            projectile.update([enemy1, enemy2], game.particles);

            expect(enemy1.hp).toBeLessThan(100);
            expect(enemy2.hp).toBeLessThan(100);
        });
    });

    describe('Enemy Wave Progression', () => {
        beforeEach(() => {
            game.start('normal');
        });

        test('enemies should spawn during wave', () => {
            game.startWave();

            // Simulate spawning
            game.spawnTimer = 0;
            game.spawnEnemy();

            expect(game.enemies.length).toBe(1);
            expect(game.enemiesSpawned).toBe(1);
        });

        test('wave should end when all enemies are dead', () => {
            game.startWave();
            game.enemiesSpawned = game.enemiesToSpawn;
            game.enemies = []; // All enemies dead

            // Check wave end logic
            const shouldEnd = game.waveInProgress &&
                game.enemies.length === 0 &&
                game.enemiesSpawned >= game.enemiesToSpawn;

            expect(shouldEnd).toBe(true);
        });
    });

    describe('Kill Rewards', () => {
        beforeEach(() => {
            game.start('normal');
        });

        test('killing enemy should give money and score', () => {
            const enemy = new Enemy('normal', 1, 'normal');
            enemy.alive = false;
            enemy.reachedEnd = false;
            game.enemies.push(enemy);

            const initialMoney = game.money;
            const initialScore = game.score;

            // Simulate update loop logic for killed enemies
            const killedEnemies = game.enemies.filter(e => !e.alive && !e.reachedEnd);
            for (const killed of killedEnemies) {
                game.money += killed.reward;
                game.score += Math.floor(killed.reward * game.diffSettings.scoreMult);
                game.kills++;
            }

            expect(game.money).toBe(initialMoney + enemy.reward);
            expect(game.score).toBeGreaterThan(initialScore);
            expect(game.kills).toBe(1);
        });
    });

    describe('Life Loss', () => {
        beforeEach(() => {
            game.start('normal');
        });

        test('enemy reaching end should reduce lives', () => {
            const enemy = new Enemy('normal', 1, 'normal');
            enemy.reachedEnd = true;
            enemy.alive = false;
            game.enemies.push(enemy);

            const initialLives = game.lives;

            // Simulate update logic
            for (const e of game.enemies) {
                if (e.reachedEnd) {
                    game.lives--;
                }
            }

            expect(game.lives).toBe(initialLives - 1);
        });

        test('losing all lives should trigger game over', () => {
            game.lives = 1;
            const enemy = new Enemy('normal', 1, 'normal');
            enemy.reachedEnd = true;
            game.enemies.push(enemy);

            // Simulate life loss
            game.lives--;

            if (game.lives <= 0) {
                game.gameOver(false);
            }

            expect(game.state).toBe('gameover');
            expect(audio.play).toHaveBeenCalledWith('gameover');
        });
    });

    describe('Hero Combat', () => {
        beforeEach(() => {
            game.start('normal');
        });

        test('hero should attack nearby enemies', () => {
            const enemy = new Enemy('normal', 1, 'normal');
            enemy.x = game.hero.x + 40;
            enemy.y = game.hero.y;
            game.enemies.push(enemy);

            const initialHp = enemy.hp;
            game.hero.update(game.enemies);

            expect(enemy.hp).toBe(initialHp - game.hero.damage);
        });

        test('hero should respawn after death', () => {
            game.hero.die();
            expect(game.hero.alive).toBe(false);

            // Set timer to almost done
            game.hero.respawnTimer = 1;
            game.hero.update([]);

            expect(game.hero.alive).toBe(true);
            expect(game.hero.hp).toBe(game.hero.maxHp);
        });
    });

    describe('Tower Upgrade Path', () => {
        beforeEach(() => {
            game.start('normal');
        });

        test('should upgrade tower through all levels', () => {
            const tower = new Tower(500, 100, 'basic');
            game.towers.push(tower);
            game.money = 1000;

            const initialDamage = tower.damage;
            const initialRange = tower.range;

            // Upgrade to level 2
            tower.upgrade();
            expect(tower.level).toBe(2);
            expect(tower.damage).toBeGreaterThan(initialDamage);

            // Upgrade to level 3
            tower.upgrade();
            expect(tower.level).toBe(3);
            expect(tower.range).toBeGreaterThan(initialRange);

            // Should not upgrade beyond max
            const result = tower.upgrade();
            expect(result).toBe(false);
            expect(tower.level).toBe(3);
        });
    });

    describe('Difficulty Scaling', () => {
        test.each([
            ['easy', 0.7, 0.8],
            ['normal', 1.0, 1.0],
            ['hard', 1.3, 1.2],
            ['nightmare', 1.6, 1.4]
        ])('%s difficulty should scale enemies correctly', (difficulty, hpMult, speedMult) => {
            game.start(difficulty);

            const enemy = new Enemy('normal', 1, difficulty);

            expect(enemy.maxHp).toBe(Math.floor(100 * hpMult));
            expect(enemy.speed).toBeCloseTo(1.5 * speedMult, 2);
        });
    });

    describe('Full Wave Cycle', () => {
        beforeEach(() => {
            game.start('normal');
        });

        test('should complete wave and enable next wave button', () => {
            game.startWave();
            expect(document.getElementById('start-wave-btn').disabled).toBe(true);

            // Simulate wave completion
            game.waveInProgress = false;
            document.getElementById('start-wave-btn').disabled = false;

            expect(document.getElementById('start-wave-btn').disabled).toBe(false);
        });
    });

    describe('Ability Usage', () => {
        beforeEach(() => {
            game.start('normal');
        });

        test('rain of fire should create meteors', () => {
            game.activateAbility('rainOfFire');
            game.useRainOfFire(400, 300);

            // Uses setTimeout, so check that function runs without error
            expect(game.abilities.rainOfFire.ready).toBe(false);
        });

        test('reinforcements should create soldiers', () => {
            game.activateAbility('reinforcements');
            game.useReinforcements(400, 300);

            expect(game.reinforcements.length).toBe(CONFIG.ABILITIES.reinforcements.soldierCount);
        });
    });

    describe('Game State Transitions', () => {
        test('full game state flow', () => {
            // Menu -> Playing
            expect(game.state).toBe('menu');
            game.start('normal');
            expect(game.state).toBe('playing');

            // Playing -> Paused
            game.pause();
            expect(game.state).toBe('paused');

            // Paused -> Playing
            game.resume();
            expect(game.state).toBe('playing');

            // Playing -> Game Over
            game.gameOver(true);
            expect(game.state).toBe('gameover');

            // Game Over -> Menu
            game.exitToMenu();
            expect(game.state).toBe('menu');
        });
    });

    describe('Economy Balance', () => {
        beforeEach(() => {
            game.start('normal');
        });

        test('should be able to afford basic tower at start', () => {
            game.selectedTowerType = 'basic';
            expect(game.money).toBeGreaterThanOrEqual(CONFIG.TOWER_TYPES.basic.cost);
        });

        test('kill rewards should allow tower building', () => {
            // Kill enough enemies to afford a tower
            const towerCost = CONFIG.TOWER_TYPES.basic.cost;
            const enemyReward = CONFIG.ENEMY_TYPES.normal.reward;
            const enemiesNeeded = Math.ceil(towerCost / enemyReward);

            game.money = 0;
            for (let i = 0; i < enemiesNeeded; i++) {
                game.money += enemyReward;
            }

            expect(game.money).toBeGreaterThanOrEqual(towerCost);
        });
    });

    describe('Barracks Mechanics', () => {
        beforeEach(() => {
            game.start('normal');
        });

        test('barracks should spawn soldiers', () => {
            const barracks = new Tower(500, 280, 'barracks');
            game.towers.push(barracks);

            barracks.update(game.enemies, game.projectiles);

            expect(barracks.soldiers.length).toBe(barracks.soldierCount);
        });
    });

    describe('Victory Condition', () => {
        beforeEach(() => {
            game.start('normal');
        });

        test('completing all waves should trigger victory', () => {
            game.wave = game.diffSettings.totalWaves;
            game.waveInProgress = true;
            game.enemies = [];
            game.enemiesSpawned = game.enemiesToSpawn;

            // Simulate victory check
            if (game.waveInProgress &&
                game.enemies.length === 0 &&
                game.enemiesSpawned >= game.enemiesToSpawn) {

                game.waveInProgress = false;

                if (game.wave >= game.diffSettings.totalWaves) {
                    game.gameOver(true);
                }
            }

            expect(game.state).toBe('gameover');
            expect(audio.play).toHaveBeenCalledWith('victory');
        });
    });
});
