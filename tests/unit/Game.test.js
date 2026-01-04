/**
 * Game Class Unit Tests
 * Tests for game logic, tower placement, wave management, and game states
 */

const CONFIG = require('../../js/config.js');

// Setup DOM elements that Game class expects
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

// Mock global objects
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

// Mock entity classes
class MockTower {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.level = 1;
        this.maxLevel = 3;
        this.baseCost = CONFIG.TOWER_TYPES[type]?.cost || 50;
        this.totalSpent = this.baseCost;
        this.soldiers = [];
    }
    update() {}
    draw() {}
    drawRange() {}
    upgrade() { this.level++; return true; }
    getUpgradeCost() { return Math.floor(this.baseCost * 0.6); }
    getSellValue() { return Math.floor(this.totalSpent * 0.6); }
}
global.Tower = MockTower;

class MockEnemy {
    constructor(type, wave, difficulty) {
        this.type = type;
        this.alive = true;
        this.reachedEnd = false;
        this.reward = CONFIG.ENEMY_TYPES[type]?.reward || 15;
        this.x = CONFIG.PATH[0].x;
        this.y = CONFIG.PATH[0].y;
    }
    update() {}
    draw() {}
}
global.Enemy = MockEnemy;

class MockHero {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.alive = true;
    }
    update() {}
    draw() {}
    drawMoveIndicator() {}
    moveTo(x, y) { this.x = x; this.y = y; }
}
global.Hero = MockHero;

class MockProjectile {
    constructor() { this.alive = true; }
    update() {}
    draw() {}
}
global.Projectile = MockProjectile;

class MockParticle {
    constructor() { this.alive = true; }
    update() {}
    draw() {}
}
global.Particle = MockParticle;

class MockMeteor {
    constructor() { this.alive = true; }
    update() {}
    draw() {}
}
global.Meteor = MockMeteor;

class MockReinforcementSoldier {
    constructor() { this.alive = true; }
    update() {}
    draw() {}
}
global.ReinforcementSoldier = MockReinforcementSoldier;

// Load Game class
const fs = require('fs');
const path = require('path');
const gameCode = fs.readFileSync(path.join(__dirname, '../../js/game.js'), 'utf8');
// Remove the global game instance creation
const gameCodeWithoutGlobal = gameCode.replace(/\/\/ Глобальный экземпляр игры[\s\S]*$/, '');
eval(gameCodeWithoutGlobal);

describe('Game', () => {
    let game;

    beforeEach(() => {
        jest.clearAllMocks();
        game = new Game();
    });

    describe('Constructor', () => {
        test('should initialize with menu state', () => {
            expect(game.state).toBe('menu');
        });

        test('should have default difficulty', () => {
            expect(game.difficulty).toBe('normal');
        });

        test('should initialize empty game arrays', () => {
            expect(game.enemies).toEqual([]);
            expect(game.towers).toEqual([]);
            expect(game.projectiles).toEqual([]);
            expect(game.particles).toEqual([]);
        });

        test('should initialize abilities as ready', () => {
            expect(game.abilities.rainOfFire.ready).toBe(true);
            expect(game.abilities.reinforcements.ready).toBe(true);
        });

        test('should have basic tower selected by default', () => {
            expect(game.selectedTowerType).toBe('basic');
        });
    });

    describe('Start Game', () => {
        test('should set state to playing', () => {
            game.start('normal');

            expect(game.state).toBe('playing');
        });

        test('should set difficulty settings', () => {
            game.start('hard');

            expect(game.difficulty).toBe('hard');
            expect(game.diffSettings).toBe(CONFIG.DIFFICULTIES.hard);
        });

        test('should reset money based on difficulty', () => {
            game.start('easy');
            expect(game.money).toBe(300);

            game.start('nightmare');
            expect(game.money).toBe(100);
        });

        test('should reset lives based on difficulty', () => {
            game.start('easy');
            expect(game.lives).toBe(30);

            game.start('nightmare');
            expect(game.lives).toBe(10);
        });

        test('should reset wave to 0', () => {
            game.wave = 5;
            game.start('normal');

            expect(game.wave).toBe(0);
        });

        test('should reset score and stats', () => {
            game.score = 1000;
            game.kills = 50;
            game.towersBuilt = 10;

            game.start('normal');

            expect(game.score).toBe(0);
            expect(game.kills).toBe(0);
            expect(game.towersBuilt).toBe(0);
        });

        test('should clear all game arrays', () => {
            game.towers.push({});
            game.enemies.push({});

            game.start('normal');

            expect(game.towers).toEqual([]);
            expect(game.enemies).toEqual([]);
        });

        test('should create hero at center', () => {
            game.start('normal');

            expect(game.hero).toBeDefined();
            expect(game.hero.x).toBe(450);
            expect(game.hero.y).toBe(300);
        });

        test('should reset abilities', () => {
            game.abilities.rainOfFire.ready = false;
            game.abilities.rainOfFire.cooldown = 10000;

            game.start('normal');

            expect(game.abilities.rainOfFire.ready).toBe(true);
            expect(game.abilities.rainOfFire.cooldown).toBe(0);
        });

        test('should initialize audio', () => {
            game.start('normal');

            expect(audio.init).toHaveBeenCalled();
        });
    });

    describe('Tower Placement Validation', () => {
        beforeEach(() => {
            game.start('normal');
        });

        test('should allow placement with enough money', () => {
            game.money = 100;
            game.selectedTowerType = 'basic'; // costs 50

            const canPlace = game.canPlaceTower(500, 100);

            expect(canPlace).toBe(true);
        });

        test('should deny placement without enough money', () => {
            game.money = 10;
            game.selectedTowerType = 'basic'; // costs 50

            const canPlace = game.canPlaceTower(500, 100);

            expect(canPlace).toBe(false);
        });

        test('should deny placement on path', () => {
            game.money = 1000;
            // PATH point at {x: 150, y: 280}
            const canPlace = game.canPlaceTower(150, 280);

            expect(canPlace).toBe(false);
        });

        test('should deny placement too close to another tower', () => {
            game.money = 1000;
            game.towers.push({ x: 500, y: 100 });

            const canPlace = game.canPlaceTower(520, 100); // 20 pixels away, needs 50

            expect(canPlace).toBe(false);
        });

        test('should allow placement far from other towers', () => {
            game.money = 1000;
            game.towers.push({ x: 500, y: 100 });

            const canPlace = game.canPlaceTower(600, 100); // 100 pixels away

            expect(canPlace).toBe(true);
        });
    });

    describe('Tower Placement', () => {
        beforeEach(() => {
            game.start('normal');
        });

        test('should deduct money when placing tower', () => {
            game.money = 100;
            game.selectedTowerType = 'basic';

            game.placeTower(500, 100);

            expect(game.money).toBe(50);
        });

        test('should add tower to array', () => {
            game.placeTower(500, 100);

            expect(game.towers.length).toBe(1);
            expect(game.towers[0].x).toBe(500);
            expect(game.towers[0].y).toBe(100);
        });

        test('should increment towersBuilt', () => {
            game.placeTower(500, 100);

            expect(game.towersBuilt).toBe(1);
        });

        test('should play place sound', () => {
            game.placeTower(500, 100);

            expect(audio.play).toHaveBeenCalledWith('place');
        });
    });

    describe('Point to Segment Distance', () => {
        test('should return 0 when point is on segment', () => {
            const dist = game.pointToSegmentDistance(50, 50, 0, 50, 100, 50);

            expect(dist).toBe(0);
        });

        test('should return distance to nearest point on segment', () => {
            const dist = game.pointToSegmentDistance(50, 100, 0, 50, 100, 50);

            expect(dist).toBe(50);
        });

        test('should handle zero-length segment', () => {
            const dist = game.pointToSegmentDistance(50, 50, 100, 100, 100, 100);

            expect(dist).toBeCloseTo(Math.sqrt(50*50 + 50*50), 1);
        });
    });

    describe('Wave System', () => {
        beforeEach(() => {
            game.start('normal');
        });

        test('should start wave', () => {
            game.startWave();

            expect(game.waveInProgress).toBe(true);
            expect(game.wave).toBe(1);
        });

        test('should not start wave if already in progress', () => {
            game.startWave();
            const wave = game.wave;

            game.startWave();

            expect(game.wave).toBe(wave);
        });

        test('should not start wave beyond total waves', () => {
            game.wave = game.diffSettings.totalWaves;

            game.startWave();

            expect(game.waveInProgress).toBe(false);
        });

        test('should calculate enemies to spawn', () => {
            game.startWave();

            // Formula: 5 + wave * 2
            expect(game.enemiesToSpawn).toBe(7); // 5 + 1 * 2
        });

        test('should play wave sound', () => {
            game.startWave();

            expect(audio.play).toHaveBeenCalledWith('wave');
        });

        test('should disable start wave button', () => {
            game.startWave();

            expect(document.getElementById('start-wave-btn').disabled).toBe(true);
        });
    });

    describe('Wave Enemy Types', () => {
        beforeEach(() => {
            game.start('normal');
        });

        test('wave 1 should only have normal enemies', () => {
            game.wave = 0;
            game.startWave();

            const hasOnlyNormal = game.waveEnemyTypes.every(t => t === 'normal');
            expect(hasOnlyNormal).toBe(true);
        });

        test('wave 2+ should include fast enemies', () => {
            game.wave = 1; // Will become 2
            game.startWave();

            // May have fast enemies
            expect(game.waveEnemyTypes.length).toBeGreaterThan(0);
        });

        test('wave 5 should add boss', () => {
            game.wave = 4; // Will become 5
            game.startWave();

            expect(game.waveEnemyTypes).toContain('boss');
        });

        test('wave 10 should add boss', () => {
            game.wave = 9; // Will become 10
            game.startWave();

            expect(game.waveEnemyTypes).toContain('boss');
        });
    });

    describe('Game Speed', () => {
        beforeEach(() => {
            game.start('normal');
        });

        test('should toggle game speed', () => {
            expect(game.gameSpeed).toBe(1);

            game.toggleSpeed();
            expect(game.gameSpeed).toBe(2);

            game.toggleSpeed();
            expect(game.gameSpeed).toBe(3);

            game.toggleSpeed();
            expect(game.gameSpeed).toBe(1);
        });

        test('should update speed button text', () => {
            game.toggleSpeed();

            expect(document.getElementById('speed-btn').textContent).toBe('▶ x2');
        });
    });

    describe('Pause System', () => {
        beforeEach(() => {
            game.start('normal');
        });

        test('should pause game', () => {
            game.pause();

            expect(game.state).toBe('paused');
            expect(menuSystem.showPause).toHaveBeenCalled();
        });

        test('should resume game', () => {
            game.pause();
            game.resume();

            expect(game.state).toBe('playing');
            expect(menuSystem.hidePause).toHaveBeenCalled();
        });

        test('should toggle pause', () => {
            game.togglePause();
            expect(game.state).toBe('paused');

            game.togglePause();
            expect(game.state).toBe('playing');
        });
    });

    describe('Game Over', () => {
        beforeEach(() => {
            game.start('normal');
        });

        test('should set state to gameover', () => {
            game.gameOver(true);

            expect(game.state).toBe('gameover');
        });

        test('should play victory sound on win', () => {
            game.gameOver(true);

            expect(audio.play).toHaveBeenCalledWith('victory');
        });

        test('should play gameover sound on loss', () => {
            game.gameOver(false);

            expect(audio.play).toHaveBeenCalledWith('gameover');
        });

        test('should show result screen with stats', () => {
            game.wave = 10;
            game.score = 1000;
            game.kills = 50;
            game.towersBuilt = 5;

            game.gameOver(true);

            expect(menuSystem.showResult).toHaveBeenCalledWith(true, expect.objectContaining({
                wave: 10,
                score: 1000,
                kills: 50,
                towersBuilt: 5
            }));
        });
    });

    describe('Tower Selection', () => {
        test('should select tower type', () => {
            game.selectTowerType('frost');

            expect(game.selectedTowerType).toBe('frost');
        });

        test('should clear active ability when selecting tower', () => {
            game.activeAbility = 'rainOfFire';

            game.selectTowerType('basic');

            expect(game.activeAbility).toBeNull();
        });
    });

    describe('Abilities', () => {
        beforeEach(() => {
            game.start('normal');
        });

        test('should activate ability when ready', () => {
            game.activateAbility('rainOfFire');

            expect(game.activeAbility).toBe('rainOfFire');
        });

        test('should not activate ability when not ready', () => {
            game.abilities.rainOfFire.ready = false;

            game.activateAbility('rainOfFire');

            expect(game.activeAbility).toBeNull();
        });

        test('should not activate ability when not playing', () => {
            game.state = 'paused';

            game.activateAbility('rainOfFire');

            expect(game.activeAbility).toBeNull();
        });

        test('should put ability on cooldown after use', () => {
            game.activateAbility('rainOfFire');
            game.useAbility(400, 300);

            expect(game.abilities.rainOfFire.ready).toBe(false);
            expect(game.abilities.rainOfFire.cooldown).toBe(CONFIG.ABILITIES.rainOfFire.cooldown);
        });

        test('should play ability sound', () => {
            game.activateAbility('rainOfFire');
            game.useAbility(400, 300);

            expect(audio.play).toHaveBeenCalledWith('ability');
        });
    });

    describe('Tower Upgrade', () => {
        beforeEach(() => {
            game.start('normal');
            game.placeTower(500, 100);
            game.selectedTower = game.towers[0];
        });

        test('should deduct money on upgrade', () => {
            const initialMoney = game.money;
            const upgradeCost = game.selectedTower.getUpgradeCost();

            game.upgradeTower();

            expect(game.money).toBe(initialMoney - upgradeCost);
        });

        test('should not upgrade without enough money', () => {
            game.money = 0;
            const level = game.selectedTower.level;

            game.upgradeTower();

            expect(game.selectedTower.level).toBe(level);
        });
    });

    describe('Tower Sell', () => {
        beforeEach(() => {
            game.start('normal');
            game.placeTower(500, 100);
            game.selectedTower = game.towers[0];
        });

        test('should add sell value to money', () => {
            const initialMoney = game.money;
            const sellValue = game.selectedTower.getSellValue();

            game.sellTower();

            expect(game.money).toBe(initialMoney + sellValue);
        });

        test('should remove tower from array', () => {
            game.sellTower();

            expect(game.towers.length).toBe(0);
        });

        test('should play sell sound', () => {
            game.sellTower();

            expect(audio.play).toHaveBeenCalledWith('sell');
        });
    });

    describe('Exit and Restart', () => {
        beforeEach(() => {
            game.start('normal');
        });

        test('should exit to menu', () => {
            game.exitToMenu();

            expect(game.state).toBe('menu');
            expect(menuSystem.showMainMenu).toHaveBeenCalled();
        });

        test('should restart game', () => {
            game.wave = 10;
            game.score = 1000;

            game.restart();

            expect(game.wave).toBe(0);
            expect(game.score).toBe(0);
            expect(menuSystem.hidePause).toHaveBeenCalled();
        });
    });

    describe('Mouse on Canvas', () => {
        test('should return true when mouse is on canvas', () => {
            game.mouseX = 450;
            game.mouseY = 280;

            expect(game.isMouseOnCanvas()).toBe(true);
        });

        test('should return false when mouse is outside canvas', () => {
            game.mouseX = -10;
            game.mouseY = 280;

            expect(game.isMouseOnCanvas()).toBe(false);
        });
    });

    describe('Get Tower At Position', () => {
        beforeEach(() => {
            game.start('normal');
        });

        test('should find tower at position', () => {
            game.placeTower(500, 100);

            const tower = game.getTowerAt(510, 100);

            expect(tower).toBe(game.towers[0]);
        });

        test('should return null if no tower at position', () => {
            const tower = game.getTowerAt(500, 100);

            expect(tower).toBeNull();
        });
    });

    describe('Mute Toggle', () => {
        test('should toggle mute', () => {
            game.toggleMute();

            expect(audio.toggleMute).toHaveBeenCalled();
        });

        test('should update mute button', () => {
            audio.toggleMute.mockReturnValue(true);

            game.toggleMute();

            expect(document.getElementById('mute-btn').textContent).toBe('🔇');
        });
    });
});
