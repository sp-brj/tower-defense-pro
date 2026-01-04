/**
 * Hero Class Unit Tests
 * Tests for hero creation, movement, combat, death and respawn
 */

const CONFIG = require('../../js/config.js');

// Mock audio
global.audio = {
    play: jest.fn()
};

// Load Hero class
const fs = require('fs');
const path = require('path');
const heroCode = fs.readFileSync(path.join(__dirname, '../../js/entities/Hero.js'), 'utf8');
eval(heroCode);

describe('Hero', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should create hero with correct initial position', () => {
            const hero = new Hero(450, 300);

            expect(hero.x).toBe(450);
            expect(hero.y).toBe(300);
            expect(hero.targetX).toBe(450);
            expect(hero.targetY).toBe(300);
        });

        test('should initialize hero with config values', () => {
            const hero = new Hero(100, 100);

            expect(hero.maxHp).toBe(CONFIG.HERO.hp);
            expect(hero.hp).toBe(CONFIG.HERO.hp);
            expect(hero.damage).toBe(CONFIG.HERO.damage);
            expect(hero.speed).toBe(CONFIG.HERO.speed);
            expect(hero.range).toBe(CONFIG.HERO.range);
            expect(hero.respawnTime).toBe(CONFIG.HERO.respawnTime);
        });

        test('should start alive with full health', () => {
            const hero = new Hero(100, 100);

            expect(hero.alive).toBe(true);
            expect(hero.hp).toBe(hero.maxHp);
        });

        test('should have attack cooldown at 0', () => {
            const hero = new Hero(100, 100);

            expect(hero.attackCooldown).toBe(0);
        });
    });

    describe('Movement', () => {
        test('should set target position with moveTo', () => {
            const hero = new Hero(100, 100);

            hero.moveTo(300, 200);

            expect(hero.targetX).toBe(300);
            expect(hero.targetY).toBe(200);
        });

        test('should move towards target position', () => {
            const hero = new Hero(100, 100);
            hero.moveTo(200, 100);

            hero.update([]);

            expect(hero.x).toBeGreaterThan(100);
        });

        test('should stop moving when close to target', () => {
            const hero = new Hero(100, 100);
            hero.moveTo(103, 100); // Very close

            hero.update([]);

            // Should have reached or passed target
            expect(Math.abs(hero.x - 103)).toBeLessThan(hero.speed + 1);
        });

        test('should move at correct speed', () => {
            const hero = new Hero(100, 100);
            hero.moveTo(200, 100); // 100 units away horizontally
            const startX = hero.x;

            hero.update([]);

            const moved = hero.x - startX;
            expect(moved).toBeCloseTo(hero.speed, 1);
        });

        test('should move diagonally correctly', () => {
            const hero = new Hero(0, 0);
            hero.moveTo(100, 100);

            hero.update([]);

            // Should move at same rate in both directions
            expect(hero.x).toBeCloseTo(hero.y, 1);
        });
    });

    describe('Target Finding', () => {
        test('should find closest enemy within range', () => {
            const hero = new Hero(100, 100);
            const nearEnemy = createMockEnemy({ x: 120, y: 100 });
            const farEnemy = createMockEnemy({ x: 150, y: 100 });

            const target = hero.findTarget([nearEnemy, farEnemy]);

            expect(target).toBe(nearEnemy);
        });

        test('should not find enemies outside double range', () => {
            const hero = new Hero(100, 100);
            const farEnemy = createMockEnemy({ x: 500, y: 100 });

            const target = hero.findTarget([farEnemy]);

            expect(target).toBeNull();
        });

        test('should find enemies within double range for targeting', () => {
            const hero = new Hero(100, 100);
            // Double range = 120 for default hero (range: 60)
            const enemy = createMockEnemy({ x: 210, y: 100 }); // 110 units away

            const target = hero.findTarget([enemy]);

            expect(target).toBe(enemy);
        });

        test('should not find dead enemies', () => {
            const hero = new Hero(100, 100);
            const deadEnemy = createMockEnemy({ x: 120, y: 100, alive: false });

            const target = hero.findTarget([deadEnemy]);

            expect(target).toBeNull();
        });

        test('should return null for empty enemy list', () => {
            const hero = new Hero(100, 100);

            const target = hero.findTarget([]);

            expect(target).toBeNull();
        });
    });

    describe('Combat', () => {
        test('should attack enemy in range', () => {
            const hero = new Hero(100, 100);
            hero.attackCooldown = 0;
            const enemy = createMockEnemy({ x: 130, y: 100 }); // Within range (60)

            hero.update([enemy]);

            expect(enemy.takeDamage).toHaveBeenCalledWith(hero.damage);
        });

        test('should not attack when on cooldown', () => {
            const hero = new Hero(100, 100);
            hero.attackCooldown = 30;
            const enemy = createMockEnemy({ x: 130, y: 100 });

            hero.update([enemy]);

            expect(enemy.takeDamage).not.toHaveBeenCalled();
        });

        test('should set cooldown after attack', () => {
            const hero = new Hero(100, 100);
            hero.attackCooldown = 0;
            const enemy = createMockEnemy({ x: 130, y: 100 });

            hero.update([enemy]);

            expect(hero.attackCooldown).toBe(hero.attackSpeed * 60);
        });

        test('should play heroAttack sound when attacking', () => {
            const hero = new Hero(100, 100);
            hero.attackCooldown = 0;
            const enemy = createMockEnemy({ x: 130, y: 100 });

            hero.update([enemy]);

            expect(audio.play).toHaveBeenCalledWith('heroAttack');
        });

        test('should decrease cooldown over time', () => {
            const hero = new Hero(100, 100);
            hero.attackCooldown = 30;

            hero.update([]);

            expect(hero.attackCooldown).toBe(29);
        });

        test('should not attack if target is outside attack range', () => {
            const hero = new Hero(100, 100);
            hero.attackCooldown = 0;
            // Enemy is in targeting range (2x) but outside attack range
            const enemy = createMockEnemy({ x: 200, y: 100 }); // 100 units away

            hero.update([enemy]);

            expect(enemy.takeDamage).not.toHaveBeenCalled();
        });

        test('attack method should not damage dead target', () => {
            const hero = new Hero(100, 100);
            hero.target = createMockEnemy({ alive: false });

            hero.attack();

            expect(hero.target.takeDamage).not.toHaveBeenCalled();
        });
    });

    describe('Taking Damage', () => {
        test('should reduce HP when taking damage', () => {
            const hero = new Hero(100, 100);

            hero.takeDamage(50);

            expect(hero.hp).toBe(hero.maxHp - 50);
        });

        test('should die when HP reaches 0', () => {
            const hero = new Hero(100, 100);

            const killed = hero.takeDamage(hero.maxHp);

            expect(killed).toBe(true);
            expect(hero.alive).toBe(false);
        });

        test('should not die from non-lethal damage', () => {
            const hero = new Hero(100, 100);

            const killed = hero.takeDamage(50);

            expect(killed).toBe(false);
            expect(hero.alive).toBe(true);
        });

        test('should handle overkill damage', () => {
            const hero = new Hero(100, 100);

            hero.takeDamage(9999);

            expect(hero.alive).toBe(false);
        });
    });

    describe('Death', () => {
        test('should mark as dead', () => {
            const hero = new Hero(100, 100);

            hero.die();

            expect(hero.alive).toBe(false);
        });

        test('should set respawn timer', () => {
            const hero = new Hero(100, 100);

            hero.die();

            // Timer in frames = respawnTime / (1000/60)
            const expectedTimer = hero.respawnTime / (1000 / 60);
            expect(hero.respawnTimer).toBeCloseTo(expectedTimer, 1);
        });
    });

    describe('Respawn', () => {
        test('should respawn after timer expires', () => {
            const hero = new Hero(100, 100);
            hero.die();
            hero.respawnTimer = 1;

            hero.update([]);

            expect(hero.alive).toBe(true);
        });

        test('should respawn with full health', () => {
            const hero = new Hero(100, 100);
            hero.hp = 50;
            hero.die();
            hero.respawnTimer = 1;

            hero.update([]);

            expect(hero.hp).toBe(hero.maxHp);
        });

        test('should respawn at target location', () => {
            const hero = new Hero(100, 100);
            hero.moveTo(300, 200);
            hero.die();
            hero.respawnTimer = 1;

            hero.update([]);

            expect(hero.x).toBe(300);
            expect(hero.y).toBe(200);
        });

        test('should decrease respawn timer while dead', () => {
            const hero = new Hero(100, 100);
            hero.die();
            const initialTimer = hero.respawnTimer;

            hero.update([]);

            expect(hero.respawnTimer).toBe(initialTimer - 1);
        });

        test('should not update movement while dead', () => {
            const hero = new Hero(100, 100);
            hero.die();
            hero.respawnTimer = 100;
            const x = hero.x;
            hero.targetX = 500;

            hero.update([]);

            expect(hero.x).toBe(x);
        });
    });

    describe('Animation', () => {
        test('should increase walk animation when moving', () => {
            const hero = new Hero(100, 100);
            hero.moveTo(200, 100);
            const initialAnim = hero.walkAnimation;

            hero.update([]);

            expect(hero.walkAnimation).not.toBe(initialAnim);
        });

        test('should set attack animation on attack', () => {
            const hero = new Hero(100, 100);
            const enemy = createMockEnemy({ x: 130, y: 100 });

            hero.update([enemy]);

            expect(hero.attackAnimation).toBe(15);
        });

        test('should decrease attack animation over time', () => {
            const hero = new Hero(100, 100);
            hero.attackAnimation = 10;

            hero.update([]);

            expect(hero.attackAnimation).toBe(9);
        });
    });

    describe('Update with no enemies', () => {
        test('should still move when no enemies present', () => {
            const hero = new Hero(100, 100);
            hero.moveTo(200, 100);
            const startX = hero.x;

            hero.update([]);

            expect(hero.x).toBeGreaterThan(startX);
        });

        test('should have null target when no enemies', () => {
            const hero = new Hero(100, 100);

            hero.update([]);

            expect(hero.target).toBeNull();
        });
    });

    describe('Multiple updates', () => {
        test('should track target continuously', () => {
            const hero = new Hero(100, 100);
            const enemy = createMockEnemy({ x: 130, y: 100 });

            hero.update([enemy]);
            const firstTarget = hero.target;

            hero.attackCooldown = 0; // Reset cooldown
            hero.update([enemy]);

            expect(hero.target).toBe(firstTarget);
        });

        test('should switch targets if closer enemy appears', () => {
            const hero = new Hero(100, 100);
            const enemy1 = createMockEnemy({ x: 150, y: 100 });

            hero.update([enemy1]);
            expect(hero.target).toBe(enemy1);

            const enemy2 = createMockEnemy({ x: 120, y: 100 });
            hero.update([enemy1, enemy2]);

            expect(hero.target).toBe(enemy2);
        });
    });
});
