/**
 * UI Interaction Tests
 * Tests for button clicks, keyboard shortcuts, and UI updates
 */

const CONFIG = require('../../js/config.js');

// Setup complete DOM structure
document.body.innerHTML = `
    <canvas id="gameCanvas" width="900" height="560"></canvas>

    <!-- Stats display -->
    <div id="money"><span class="value">200</span></div>
    <div id="lives"><span class="value">20</span></div>
    <div id="wave"><span class="value">0/20</span></div>
    <div id="score"><span class="value">0</span></div>

    <!-- Game controls -->
    <button id="start-wave-btn">Start Wave</button>
    <button id="speed-btn">▶ x1</button>
    <button id="pause-btn">⏸</button>
    <button id="mute-btn">🔊</button>

    <!-- Pause menu -->
    <button id="resume-btn">Resume</button>
    <button id="restart-btn">Restart</button>
    <button id="exit-btn">Exit</button>

    <!-- Result screen -->
    <button id="result-restart-btn">Play Again</button>
    <button id="result-menu-btn">Menu</button>

    <!-- Tower buttons -->
    <div class="tower-btn" data-tower="basic">
        <span class="tower-icon">🔫</span>
        <span class="tower-cost">50$</span>
    </div>
    <div class="tower-btn" data-tower="frost">
        <span class="tower-icon">❄️</span>
        <span class="tower-cost">75$</span>
    </div>
    <div class="tower-btn" data-tower="sniper">
        <span class="tower-icon">🎯</span>
        <span class="tower-cost">100$</span>
    </div>
    <div class="tower-btn" data-tower="cannon">
        <span class="tower-icon">💥</span>
        <span class="tower-cost">125$</span>
    </div>
    <div class="tower-btn" data-tower="laser">
        <span class="tower-icon">⚡</span>
        <span class="tower-cost">200$</span>
    </div>
    <div class="tower-btn" data-tower="barracks">
        <span class="tower-icon">⚔️</span>
        <span class="tower-cost">70$</span>
    </div>

    <!-- Upgrade menu -->
    <div id="upgrade-menu" style="display: none;">
        <button class="close-btn">✕</button>
        <div id="upgrade-title">🔫 Пулемёт</div>
        <div id="level-stars">★☆☆</div>
        <div id="upgrade-stats">
            <div>Урон: 15</div>
            <div>Радиус: 120</div>
        </div>
        <button id="upgrade-btn">Улучшить (30$)</button>
        <button id="sell-btn">Продать (30$)</button>
    </div>

    <!-- Ability buttons -->
    <button id="ability-fire">☄️</button>
    <div id="fire-cooldown" style="display: none;">30s</div>
    <button id="ability-reinforce">🛡️</button>
    <div id="reinforce-cooldown" style="display: none;">45s</div>
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

// Mock classes
class MockTower {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.level = 1;
        this.maxLevel = 3;
        this.baseCost = CONFIG.TOWER_TYPES[type]?.cost || 50;
        this.totalSpent = this.baseCost;
        this.icon = CONFIG.TOWER_TYPES[type]?.icon || '🔫';
        this.name = CONFIG.TOWER_TYPES[type]?.name || 'Tower';
        this.damage = CONFIG.TOWER_TYPES[type]?.damage || 15;
        this.range = CONFIG.TOWER_TYPES[type]?.range || 120;
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

global.Enemy = class { constructor() { this.alive = true; } update() {} draw() {} };
global.Hero = class {
    constructor(x, y) { this.x = x; this.y = y; this.alive = true; }
    update() {}
    draw() {}
    drawMoveIndicator() {}
    moveTo(x, y) {}
};
global.Projectile = class { constructor() { this.alive = true; } update() {} draw() {} };
global.Particle = class { constructor() { this.alive = true; } update() {} draw() {} };
global.Meteor = class { constructor() { this.alive = true; } update() {} draw() {} };
global.ReinforcementSoldier = class { constructor() { this.alive = true; } update() {} draw() {} };

// Load Game class
const fs = require('fs');
const path = require('path');
const gameCode = fs.readFileSync(path.join(__dirname, '../../js/game.js'), 'utf8');
const gameCodeWithoutGlobal = gameCode.replace(/\/\/ Глобальный экземпляр игры[\s\S]*$/, '');
eval(gameCodeWithoutGlobal);

describe('UI Interactions', () => {
    let game;

    beforeEach(() => {
        jest.clearAllMocks();
        game = new Game();
        game.start('normal');
    });

    describe('Tower Button Clicks', () => {
        test('clicking tower button should select that tower type', () => {
            const frostBtn = document.querySelector('.tower-btn[data-tower="frost"]');
            frostBtn.click();

            expect(game.selectedTowerType).toBe('frost');
        });

        test('clicking tower button should add "selected" class', () => {
            const sniperBtn = document.querySelector('.tower-btn[data-tower="sniper"]');
            sniperBtn.click();

            expect(sniperBtn.classList.contains('selected')).toBe(true);
        });

        test('selecting new tower should deselect previous', () => {
            const basicBtn = document.querySelector('.tower-btn[data-tower="basic"]');
            const frostBtn = document.querySelector('.tower-btn[data-tower="frost"]');

            basicBtn.click();
            frostBtn.click();

            expect(basicBtn.classList.contains('selected')).toBe(false);
            expect(frostBtn.classList.contains('selected')).toBe(true);
        });
    });

    describe('Keyboard Shortcuts', () => {
        function createKeyEvent(key) {
            return new KeyboardEvent('keydown', { key, bubbles: true });
        }

        test('pressing 1-6 should select tower types', () => {
            const types = ['basic', 'frost', 'sniper', 'cannon', 'laser', 'barracks'];

            types.forEach((type, index) => {
                document.dispatchEvent(createKeyEvent(String(index + 1)));
                expect(game.selectedTowerType).toBe(type);
            });
        });

        test('pressing Space should start wave', () => {
            game.waveInProgress = false;
            const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true });

            document.dispatchEvent(event);

            expect(game.waveInProgress).toBe(true);
        });

        test('pressing Escape should pause game', () => {
            const event = createKeyEvent('Escape');

            document.dispatchEvent(event);

            expect(game.state).toBe('paused');
        });

        test('pressing Escape while paused should resume', () => {
            game.pause();
            const event = createKeyEvent('Escape');

            document.dispatchEvent(event);

            expect(game.state).toBe('playing');
        });

        test('pressing Q should activate Rain of Fire', () => {
            const event = createKeyEvent('q');

            document.dispatchEvent(event);

            expect(game.activeAbility).toBe('rainOfFire');
        });

        test('pressing W should activate Reinforcements', () => {
            const event = createKeyEvent('w');

            document.dispatchEvent(event);

            expect(game.activeAbility).toBe('reinforcements');
        });

        test('Russian keyboard Q (й) should activate Rain of Fire', () => {
            const event = createKeyEvent('й');

            document.dispatchEvent(event);

            expect(game.activeAbility).toBe('rainOfFire');
        });

        test('Russian keyboard W (ц) should activate Reinforcements', () => {
            const event = createKeyEvent('ц');

            document.dispatchEvent(event);

            expect(game.activeAbility).toBe('reinforcements');
        });
    });

    describe('Control Button Clicks', () => {
        test('start wave button should start wave', () => {
            game.waveInProgress = false;
            const btn = document.getElementById('start-wave-btn');

            btn.click();

            expect(game.waveInProgress).toBe(true);
        });

        test('speed button should toggle game speed', () => {
            const btn = document.getElementById('speed-btn');

            btn.click();
            expect(game.gameSpeed).toBe(2);

            btn.click();
            expect(game.gameSpeed).toBe(3);

            btn.click();
            expect(game.gameSpeed).toBe(1);
        });

        test('pause button should pause game', () => {
            const btn = document.getElementById('pause-btn');

            btn.click();

            expect(game.state).toBe('paused');
        });

        test('mute button should toggle mute', () => {
            const btn = document.getElementById('mute-btn');

            btn.click();

            expect(audio.toggleMute).toHaveBeenCalled();
        });
    });

    describe('Pause Menu Buttons', () => {
        beforeEach(() => {
            game.pause();
        });

        test('resume button should resume game', () => {
            const btn = document.getElementById('resume-btn');

            btn.click();

            expect(game.state).toBe('playing');
        });

        test('restart button should restart game', () => {
            game.wave = 10;
            const btn = document.getElementById('restart-btn');

            btn.click();

            expect(game.wave).toBe(0);
            expect(game.state).toBe('playing');
        });

        test('exit button should go to menu', () => {
            const btn = document.getElementById('exit-btn');

            btn.click();

            expect(game.state).toBe('menu');
        });
    });

    describe('Result Screen Buttons', () => {
        beforeEach(() => {
            game.gameOver(true);
        });

        test('result restart button should restart game', () => {
            const btn = document.getElementById('result-restart-btn');

            btn.click();

            expect(game.state).toBe('playing');
        });

        test('result menu button should go to menu', () => {
            const btn = document.getElementById('result-menu-btn');

            btn.click();

            expect(game.state).toBe('menu');
        });
    });

    describe('Ability Buttons', () => {
        test('fire ability button should activate ability', () => {
            const btn = document.getElementById('ability-fire');

            btn.click();

            expect(game.activeAbility).toBe('rainOfFire');
        });

        test('reinforce ability button should activate ability', () => {
            const btn = document.getElementById('ability-reinforce');

            btn.click();

            expect(game.activeAbility).toBe('reinforcements');
        });
    });

    describe('Upgrade Menu', () => {
        let tower;

        beforeEach(() => {
            tower = new MockTower(500, 100, 'basic');
            game.towers.push(tower);
            game.money = 1000;
        });

        test('close button should close upgrade menu', () => {
            game.selectedTower = tower;
            document.getElementById('upgrade-menu').style.display = 'block';

            const closeBtn = document.querySelector('#upgrade-menu .close-btn');
            closeBtn.click();

            expect(document.getElementById('upgrade-menu').style.display).toBe('none');
        });

        test('upgrade button should upgrade tower', () => {
            game.selectedTower = tower;
            const initialLevel = tower.level;

            const upgradeBtn = document.getElementById('upgrade-btn');
            upgradeBtn.click();

            expect(tower.level).toBe(initialLevel + 1);
        });

        test('sell button should sell tower', () => {
            game.selectedTower = tower;
            const initialMoney = game.money;
            const sellValue = tower.getSellValue();

            const sellBtn = document.getElementById('sell-btn');
            sellBtn.click();

            expect(game.money).toBe(initialMoney + sellValue);
            expect(game.towers.length).toBe(0);
        });
    });

    describe('UI Updates', () => {
        test('updateUI should update money display', () => {
            game.money = 500;

            game.updateUI();

            expect(document.querySelector('#money .value').textContent).toBe('500');
        });

        test('updateUI should update lives display', () => {
            game.lives = 15;

            game.updateUI();

            expect(document.querySelector('#lives .value').textContent).toBe('15');
        });

        test('updateUI should update wave display', () => {
            game.wave = 5;
            game.diffSettings = { totalWaves: 20 };

            game.updateUI();

            expect(document.querySelector('#wave .value').textContent).toBe('5/20');
        });

        test('updateUI should update score display', () => {
            game.score = 1234;

            game.updateUI();

            expect(document.querySelector('#score .value').textContent).toBe('1234');
        });
    });

    describe('Tower Button Lock State', () => {
        test('should lock tower buttons when not enough money', () => {
            game.money = 60; // Only afford basic (50) and not frost (75)

            game.updateTowerButtons();

            const basicBtn = document.querySelector('.tower-btn[data-tower="basic"]');
            const frostBtn = document.querySelector('.tower-btn[data-tower="frost"]');

            expect(basicBtn.classList.contains('locked')).toBe(false);
            expect(frostBtn.classList.contains('locked')).toBe(true);
        });

        test('should unlock tower buttons when have enough money', () => {
            game.money = 1000;

            game.updateTowerButtons();

            document.querySelectorAll('.tower-btn').forEach(btn => {
                expect(btn.classList.contains('locked')).toBe(false);
            });
        });
    });

    describe('Mouse Events', () => {
        test('mouse move should update mouse position', () => {
            const event = new MouseEvent('mousemove', {
                clientX: 450,
                clientY: 280
            });

            game.canvas.dispatchEvent(event);

            expect(game.mouseX).toBeDefined();
            expect(game.mouseY).toBeDefined();
        });

        test('left click should attempt tower placement', () => {
            game.money = 1000;
            game.mouseX = 500;
            game.mouseY = 100;

            // Mock canPlaceTower to return true
            jest.spyOn(game, 'canPlaceTower').mockReturnValue(true);

            const event = new MouseEvent('click');
            game.canvas.dispatchEvent(event);

            expect(game.towers.length).toBe(1);
        });

        test('right click on tower should open upgrade menu', () => {
            const tower = new MockTower(500, 100, 'basic');
            game.towers.push(tower);
            game.mouseX = 500;
            game.mouseY = 100;

            const event = new MouseEvent('contextmenu', {
                clientX: 500,
                clientY: 100
            });

            game.canvas.dispatchEvent(event);

            expect(game.selectedTower).toBe(tower);
        });
    });

    describe('Speed Button Display', () => {
        test('speed button should show current speed', () => {
            const btn = document.getElementById('speed-btn');

            expect(btn.textContent).toBe('▶ x1');

            game.toggleSpeed();
            expect(btn.textContent).toBe('▶ x2');

            game.toggleSpeed();
            expect(btn.textContent).toBe('▶ x3');
        });
    });

    describe('Mute Button Display', () => {
        test('mute button should show muted state', () => {
            audio.toggleMute.mockReturnValue(true);
            const btn = document.getElementById('mute-btn');

            game.toggleMute();

            expect(btn.textContent).toBe('🔇');
        });

        test('mute button should show unmuted state', () => {
            audio.toggleMute.mockReturnValue(false);
            const btn = document.getElementById('mute-btn');

            game.toggleMute();

            expect(btn.textContent).toBe('🔊');
        });
    });

    describe('Ability Cooldown Display', () => {
        test('should show cooldown when ability is on cooldown', () => {
            game.abilities.rainOfFire.ready = false;
            game.abilities.rainOfFire.cooldown = 15000;

            game.updateAbilityUI();

            const fireBtn = document.getElementById('ability-fire');
            const fireCd = document.getElementById('fire-cooldown');

            expect(fireBtn.classList.contains('on-cooldown')).toBe(true);
            expect(fireCd.style.display).toBe('block');
            expect(fireCd.textContent).toBe('15s');
        });

        test('should hide cooldown when ability is ready', () => {
            game.abilities.rainOfFire.ready = true;
            game.abilities.rainOfFire.cooldown = 0;

            game.updateAbilityUI();

            const fireBtn = document.getElementById('ability-fire');
            const fireCd = document.getElementById('fire-cooldown');

            expect(fireBtn.classList.contains('on-cooldown')).toBe(false);
            expect(fireCd.style.display).toBe('none');
        });
    });

    describe('State-Based UI Behavior', () => {
        test('should not process clicks when paused', () => {
            game.pause();
            const initialTowers = game.towers.length;

            game.onLeftClick({ preventDefault: () => {} });

            expect(game.towers.length).toBe(initialTowers);
        });

        test('should not process ability activation when not playing', () => {
            game.state = 'menu';

            game.activateAbility('rainOfFire');

            expect(game.activeAbility).toBeNull();
        });
    });
});
