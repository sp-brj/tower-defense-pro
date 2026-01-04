/**
 * Tower Class Unit Tests
 * Tests for tower creation, targeting, shooting, upgrading and selling
 */

// Load config and Tower class
const CONFIG = require('../../js/config.js');

// Mock audio globally
global.audio = {
    play: jest.fn(),
    init: jest.fn()
};

// Mock Soldier and Projectile classes
class MockSoldier {
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
global.Soldier = MockSoldier;

class MockProjectile {
    constructor(x, y, target, damage, type) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.type = type;
        this.slowAmount = 0;
        this.slowDuration = 0;
        this.splashRadius = 0;
        this.alive = true;
    }
}
global.Projectile = MockProjectile;

// Load Tower class after mocks are set up
const fs = require('fs');
const path = require('path');
const towerCode = fs.readFileSync(path.join(__dirname, '../../js/entities/Tower.js'), 'utf8');
eval(towerCode);

describe('Tower', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should create a basic tower with correct properties', () => {
            const tower = new Tower(100, 200, 'basic');

            expect(tower.x).toBe(100);
            expect(tower.y).toBe(200);
            expect(tower.type).toBe('basic');
            expect(tower.name).toBe('Пулемёт');
            expect(tower.baseCost).toBe(50);
            expect(tower.range).toBe(120);
            expect(tower.damage).toBe(15);
            expect(tower.fireRate).toBe(0.5);
            expect(tower.level).toBe(1);
            expect(tower.maxLevel).toBe(3);
            expect(tower.totalSpent).toBe(50);
        });

        test('should create a frost tower with slow properties', () => {
            const tower = new Tower(100, 200, 'frost');

            expect(tower.type).toBe('frost');
            expect(tower.slowAmount).toBe(0.5);
            expect(tower.slowDuration).toBe(60);
            expect(tower.damage).toBe(8);
        });

        test('should create a cannon tower with splash radius', () => {
            const tower = new Tower(100, 200, 'cannon');

            expect(tower.type).toBe('cannon');
            expect(tower.splashRadius).toBe(50);
            expect(tower.damage).toBe(35);
        });

        test('should create a barracks tower with soldier properties', () => {
            const tower = new Tower(100, 200, 'barracks');

            expect(tower.type).toBe('barracks');
            expect(tower.soldierCount).toBe(2);
            expect(tower.soldierHp).toBe(50);
            expect(tower.soldierDamage).toBe(10);
            expect(tower.soldiers).toEqual([]);
        });

        test('should create all 6 tower types without errors', () => {
            const types = ['basic', 'frost', 'sniper', 'cannon', 'laser', 'barracks'];

            types.forEach(type => {
                expect(() => new Tower(100, 100, type)).not.toThrow();
            });
        });
    });

    describe('Target Finding', () => {
        test('should find enemy within range', () => {
            const tower = new Tower(100, 100, 'basic');
            const enemy = createMockEnemy({ x: 150, y: 100 });

            const target = tower.findTarget([enemy]);

            expect(target).toBe(enemy);
        });

        test('should not find enemy outside range', () => {
            const tower = new Tower(100, 100, 'basic'); // range: 120
            const enemy = createMockEnemy({ x: 300, y: 100 }); // distance: 200

            const target = tower.findTarget([enemy]);

            expect(target).toBeNull();
        });

        test('should not find dead enemies', () => {
            const tower = new Tower(100, 100, 'basic');
            const enemy = createMockEnemy({ x: 150, y: 100, alive: false });

            const target = tower.findTarget([enemy]);

            expect(target).toBeNull();
        });

        test('should prioritize enemy with highest progress', () => {
            const tower = new Tower(100, 100, 'basic');
            const enemy1 = createMockEnemy({ x: 150, y: 100 });
            const enemy2 = createMockEnemy({ x: 180, y: 100 });

            enemy1.getProgress = jest.fn(() => 0.3);
            enemy2.getProgress = jest.fn(() => 0.7);

            const target = tower.findTarget([enemy1, enemy2]);

            expect(target).toBe(enemy2);
        });

        test('cannon should not target flying enemies', () => {
            const tower = new Tower(100, 100, 'cannon');
            const flyingEnemy = createMockEnemy({ x: 150, y: 100, flying: true });

            const target = tower.findTarget([flyingEnemy]);

            expect(target).toBeNull();
        });

        test('other towers should target flying enemies', () => {
            const tower = new Tower(100, 100, 'basic');
            const flyingEnemy = createMockEnemy({ x: 150, y: 100, flying: true });

            const target = tower.findTarget([flyingEnemy]);

            expect(target).toBe(flyingEnemy);
        });
    });

    describe('Shooting', () => {
        test('should create projectile when shooting', () => {
            const tower = new Tower(100, 100, 'basic');
            const enemy = createMockEnemy({ x: 150, y: 100 });
            tower.target = enemy;

            const projectiles = [];
            tower.shoot(projectiles);

            expect(projectiles.length).toBe(1);
            expect(projectiles[0].target).toBe(enemy);
            expect(projectiles[0].damage).toBe(tower.damage);
            expect(audio.play).toHaveBeenCalledWith('shoot');
        });

        test('should set fire cooldown after shooting', () => {
            const tower = new Tower(100, 100, 'basic');
            const enemy = createMockEnemy({ x: 150, y: 100 });
            tower.target = enemy;

            tower.shoot([]);

            expect(tower.fireCooldown).toBe(tower.fireRate * 60);
        });

        test('frost tower should pass slow properties to projectile', () => {
            const tower = new Tower(100, 100, 'frost');
            const enemy = createMockEnemy({ x: 150, y: 100 });
            tower.target = enemy;

            const projectiles = [];
            tower.shoot(projectiles);

            expect(projectiles[0].slowAmount).toBe(0.5);
            expect(projectiles[0].slowDuration).toBe(60);
        });

        test('cannon tower should pass splash radius to projectile', () => {
            const tower = new Tower(100, 100, 'cannon');
            const enemy = createMockEnemy({ x: 150, y: 100 });
            tower.target = enemy;

            const projectiles = [];
            tower.shoot(projectiles);

            expect(projectiles[0].splashRadius).toBe(50);
        });

        test('should not shoot without target', () => {
            const tower = new Tower(100, 100, 'basic');
            tower.target = null;

            const projectiles = [];
            tower.shoot(projectiles);

            expect(projectiles.length).toBe(0);
        });
    });

    describe('Update', () => {
        test('should decrease fire cooldown', () => {
            const tower = new Tower(100, 100, 'basic');
            tower.fireCooldown = 10;

            tower.update([], []);

            expect(tower.fireCooldown).toBe(9);
        });

        test('should find and shoot at enemies', () => {
            const tower = new Tower(100, 100, 'basic');
            tower.fireCooldown = 0;
            const enemy = createMockEnemy({ x: 150, y: 100 });

            const projectiles = [];
            tower.update([enemy], projectiles);

            expect(projectiles.length).toBe(1);
        });

        test('should not shoot when on cooldown', () => {
            const tower = new Tower(100, 100, 'basic');
            tower.fireCooldown = 10;
            const enemy = createMockEnemy({ x: 150, y: 100 });

            const projectiles = [];
            tower.update([enemy], projectiles);

            expect(projectiles.length).toBe(0);
        });

        test('laser tower should deal continuous damage', () => {
            const tower = new Tower(100, 100, 'laser');
            const enemy = createMockEnemy({ x: 150, y: 100 });

            tower.update([enemy], []);

            expect(enemy.takeDamage).toHaveBeenCalledWith(tower.damage);
            expect(tower.laserTarget).toBe(enemy);
        });

        test('should rotate towards target', () => {
            const tower = new Tower(100, 100, 'basic');
            tower.fireCooldown = 100; // Prevent shooting
            const enemy = createMockEnemy({ x: 200, y: 100 }); // Right of tower

            tower.update([enemy], []);

            expect(tower.angle).toBeCloseTo(0, 1); // 0 radians = pointing right
        });
    });

    describe('Barracks', () => {
        test('should spawn soldiers up to soldierCount', () => {
            const tower = new Tower(100, 100, 'barracks');

            tower.update([], []);

            expect(tower.soldiers.length).toBe(tower.soldierCount);
        });

        test('should remove dead soldiers', () => {
            const tower = new Tower(100, 100, 'barracks');
            tower.update([], []); // Spawn soldiers

            tower.soldiers[0].alive = false;
            tower.update([], []);

            // Should have respawned
            expect(tower.soldiers.length).toBe(tower.soldierCount);
            expect(tower.soldiers.every(s => s.alive)).toBe(true);
        });
    });

    describe('Upgrade', () => {
        test('should increase level on upgrade', () => {
            const tower = new Tower(100, 100, 'basic');

            tower.upgrade();

            expect(tower.level).toBe(2);
        });

        test('should boost stats on upgrade', () => {
            const tower = new Tower(100, 100, 'basic');
            const originalRange = tower.range;
            const originalDamage = tower.damage;

            tower.upgrade();

            expect(tower.range).toBe(Math.floor(originalRange * CONFIG.UPGRADE_STAT_BOOST));
            expect(tower.damage).toBe(Math.floor(originalDamage * CONFIG.UPGRADE_STAT_BOOST));
        });

        test('should decrease fire rate on upgrade (faster shooting)', () => {
            const tower = new Tower(100, 100, 'basic');
            const originalFireRate = tower.fireRate;

            tower.upgrade();

            expect(tower.fireRate).toBeCloseTo(originalFireRate * 0.85, 2);
        });

        test('should not upgrade beyond max level', () => {
            const tower = new Tower(100, 100, 'basic');
            tower.level = 3;

            const result = tower.upgrade();

            expect(result).toBe(false);
            expect(tower.level).toBe(3);
        });

        test('should track total spent on upgrades', () => {
            const tower = new Tower(100, 100, 'basic');
            const upgradeCost = tower.getUpgradeCost();

            tower.upgrade();

            expect(tower.totalSpent).toBe(50 + upgradeCost);
        });

        test('should play upgrade sound', () => {
            const tower = new Tower(100, 100, 'basic');

            tower.upgrade();

            expect(audio.play).toHaveBeenCalledWith('upgrade');
        });

        test('barracks should get extra soldier at max level', () => {
            const tower = new Tower(100, 100, 'barracks');
            const originalCount = tower.soldierCount;

            tower.upgrade(); // level 2
            expect(tower.soldierCount).toBe(originalCount);

            tower.upgrade(); // level 3
            expect(tower.soldierCount).toBe(originalCount + 1);
        });
    });

    describe('Sell Value', () => {
        test('should return 60% of total spent', () => {
            const tower = new Tower(100, 100, 'basic');

            const sellValue = tower.getSellValue();

            expect(sellValue).toBe(Math.floor(50 * CONFIG.SELL_RETURN));
        });

        test('should include upgrade costs in sell value', () => {
            const tower = new Tower(100, 100, 'basic');
            tower.upgrade();

            const expectedSellValue = Math.floor(tower.totalSpent * CONFIG.SELL_RETURN);
            expect(tower.getSellValue()).toBe(expectedSellValue);
        });
    });

    describe('Upgrade Cost', () => {
        test('should calculate upgrade cost correctly', () => {
            const tower = new Tower(100, 100, 'basic');

            const cost = tower.getUpgradeCost();

            expect(cost).toBe(Math.floor(tower.baseCost * CONFIG.UPGRADE_COSTS[tower.level]));
        });

        test('should change cost based on level', () => {
            const tower = new Tower(100, 100, 'basic');
            const cost1 = tower.getUpgradeCost();

            tower.upgrade();
            const cost2 = tower.getUpgradeCost();

            expect(cost1).not.toBe(cost2);
        });
    });

    describe('All Tower Types Configuration', () => {
        test.each([
            ['basic', 50, 120, 15],
            ['frost', 75, 100, 8],
            ['sniper', 100, 200, 50],
            ['cannon', 125, 110, 35],
            ['laser', 200, 150, 2],
            ['barracks', 70, 80, 0]
        ])('%s tower should have correct stats', (type, cost, range, damage) => {
            const tower = new Tower(100, 100, type);

            expect(tower.baseCost).toBe(cost);
            expect(tower.range).toBe(range);
            expect(tower.damage).toBe(damage);
        });
    });
});
