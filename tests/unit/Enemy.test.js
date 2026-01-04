/**
 * Enemy Class Unit Tests
 * Tests for enemy creation, movement, damage, slow effects and healing
 */

const CONFIG = require('../../js/config.js');

// Load Enemy class
const fs = require('fs');
const path = require('path');
const enemyCode = fs.readFileSync(path.join(__dirname, '../../js/entities/Enemy.js'), 'utf8');
eval(enemyCode);

describe('Enemy', () => {
    describe('Constructor', () => {
        test('should create normal enemy with base stats', () => {
            const enemy = new Enemy('normal', 1, 'normal');

            expect(enemy.type).toBe('normal');
            expect(enemy.maxHp).toBe(100);
            expect(enemy.hp).toBe(100);
            expect(enemy.speed).toBe(1.5);
            expect(enemy.reward).toBe(15);
            expect(enemy.alive).toBe(true);
            expect(enemy.reachedEnd).toBe(false);
        });

        test('should create fast enemy with correct stats', () => {
            const enemy = new Enemy('fast', 1, 'normal');

            expect(enemy.maxHp).toBe(60);
            expect(enemy.speed).toBe(3);
            expect(enemy.reward).toBe(20);
        });

        test('should create tank enemy with high HP', () => {
            const enemy = new Enemy('tank', 1, 'normal');

            expect(enemy.maxHp).toBe(400);
            expect(enemy.speed).toBe(0.8);
            expect(enemy.reward).toBe(40);
        });

        test('should create flying enemy with flying flag', () => {
            const enemy = new Enemy('flying', 1, 'normal');

            expect(enemy.flying).toBe(true);
            expect(enemy.path).toBe(CONFIG.FLYING_PATH);
        });

        test('should create healer enemy with heal properties', () => {
            const enemy = new Enemy('healer', 1, 'normal');

            expect(enemy.healAmount).toBe(2);
            expect(enemy.healRange).toBe(60);
        });

        test('should create boss enemy with high stats', () => {
            const enemy = new Enemy('boss', 1, 'normal');

            expect(enemy.maxHp).toBe(2000);
            expect(enemy.isBoss).toBe(true);
            expect(enemy.reward).toBe(200);
        });

        test('should use ground path for non-flying enemies', () => {
            const enemy = new Enemy('normal', 1, 'normal');

            expect(enemy.path).toBe(CONFIG.PATH);
        });
    });

    describe('Wave Scaling', () => {
        test('should increase HP based on wave number', () => {
            const wave1Enemy = new Enemy('normal', 1, 'normal');
            const wave5Enemy = new Enemy('normal', 5, 'normal');

            // Wave 5: 100 * (1 + 4 * 0.15) = 100 * 1.6 = 160
            expect(wave5Enemy.maxHp).toBeGreaterThan(wave1Enemy.maxHp);
            expect(wave5Enemy.maxHp).toBe(160);
        });

        test('should scale HP correctly for wave 10', () => {
            const enemy = new Enemy('normal', 10, 'normal');

            // Wave 10: 100 * (1 + 9 * 0.15) = 100 * 2.35 = 235
            expect(enemy.maxHp).toBe(235);
        });
    });

    describe('Difficulty Modifiers', () => {
        test('easy difficulty should reduce HP', () => {
            const easyEnemy = new Enemy('normal', 1, 'easy');
            const normalEnemy = new Enemy('normal', 1, 'normal');

            expect(easyEnemy.maxHp).toBe(Math.floor(100 * 0.7)); // 70
            expect(easyEnemy.maxHp).toBeLessThan(normalEnemy.maxHp);
        });

        test('hard difficulty should increase HP', () => {
            const hardEnemy = new Enemy('normal', 1, 'hard');

            expect(hardEnemy.maxHp).toBe(Math.floor(100 * 1.3)); // 130
        });

        test('nightmare difficulty should greatly increase HP', () => {
            const nightmareEnemy = new Enemy('normal', 1, 'nightmare');

            expect(nightmareEnemy.maxHp).toBe(Math.floor(100 * 1.6)); // 160
        });

        test('easy difficulty should reduce speed', () => {
            const easyEnemy = new Enemy('normal', 1, 'easy');

            expect(easyEnemy.speed).toBe(1.5 * 0.8); // 1.2
        });

        test('nightmare difficulty should increase speed', () => {
            const nightmareEnemy = new Enemy('normal', 1, 'nightmare');

            expect(nightmareEnemy.speed).toBe(1.5 * 1.4); // 2.1
        });

        test('easy difficulty should increase rewards', () => {
            const easyEnemy = new Enemy('normal', 1, 'easy');

            expect(easyEnemy.reward).toBe(Math.floor(15 * 1.3)); // 19
        });

        test('nightmare difficulty should reduce rewards', () => {
            const nightmareEnemy = new Enemy('normal', 1, 'nightmare');

            expect(nightmareEnemy.reward).toBe(Math.floor(15 * 0.6)); // 9
        });
    });

    describe('Movement', () => {
        test('should move towards next path point', () => {
            const enemy = new Enemy('normal', 1, 'normal');
            const startX = enemy.x;
            const startY = enemy.y;

            enemy.update();

            // Should have moved
            expect(enemy.x !== startX || enemy.y !== startY).toBe(true);
        });

        test('should increment pathIndex when reaching waypoint', () => {
            const enemy = new Enemy('normal', 1, 'normal');
            // Place enemy very close to next waypoint
            enemy.x = CONFIG.PATH[1].x - 0.5;
            enemy.y = CONFIG.PATH[1].y;
            enemy.pathIndex = 0;

            enemy.update();

            expect(enemy.pathIndex).toBe(1);
        });

        test('should mark reachedEnd when finishing path', () => {
            const enemy = new Enemy('normal', 1, 'normal');
            enemy.pathIndex = CONFIG.PATH.length - 2;
            enemy.x = CONFIG.PATH[CONFIG.PATH.length - 1].x - 0.1;
            enemy.y = CONFIG.PATH[CONFIG.PATH.length - 1].y;

            enemy.update();

            expect(enemy.reachedEnd).toBe(true);
            expect(enemy.alive).toBe(false);
        });

        test('should not move when blocked', () => {
            const enemy = new Enemy('normal', 1, 'normal');
            const startX = enemy.x;
            const startY = enemy.y;
            enemy.blockedBy = { alive: true };

            enemy.update();

            expect(enemy.x).toBe(startX);
            expect(enemy.y).toBe(startY);
        });

        test('should resume movement when blocker dies', () => {
            const enemy = new Enemy('normal', 1, 'normal');
            enemy.blockedBy = { alive: false };
            const startX = enemy.x;

            enemy.update();

            expect(enemy.blockedBy).toBeNull();
            expect(enemy.x !== startX).toBe(true);
        });
    });

    describe('Slow Effect', () => {
        test('should apply slow effect', () => {
            const enemy = new Enemy('normal', 1, 'normal');

            enemy.applySlow(0.5, 60);

            expect(enemy.slowAmount).toBe(0.5);
            expect(enemy.slowTimer).toBe(60);
        });

        test('should use minimum slow amount when stacking', () => {
            const enemy = new Enemy('normal', 1, 'normal');
            enemy.applySlow(0.5, 60);

            enemy.applySlow(0.3, 60);

            expect(enemy.slowAmount).toBe(0.3);
        });

        test('should use maximum duration when stacking', () => {
            const enemy = new Enemy('normal', 1, 'normal');
            enemy.applySlow(0.5, 60);

            enemy.applySlow(0.5, 90);

            expect(enemy.slowTimer).toBe(90);
        });

        test('should reduce movement speed when slowed', () => {
            const enemy = new Enemy('normal', 1, 'normal');
            const normalSpeed = enemy.speed;
            enemy.applySlow(0.5, 100);

            const startX = enemy.x;
            enemy.update();
            const movedDistance = Math.abs(enemy.x - startX) + Math.abs(enemy.y - CONFIG.PATH[0].y);

            // Movement should be approximately half
            expect(movedDistance).toBeLessThan(normalSpeed);
        });

        test('should clear slow when timer expires', () => {
            const enemy = new Enemy('normal', 1, 'normal');
            enemy.applySlow(0.5, 1);

            enemy.update(); // Timer becomes 0

            expect(enemy.slowAmount).toBe(1);
        });
    });

    describe('Damage', () => {
        test('should take damage and reduce HP', () => {
            const enemy = new Enemy('normal', 1, 'normal');

            enemy.takeDamage(30);

            expect(enemy.hp).toBe(70);
        });

        test('should die when HP reaches 0', () => {
            const enemy = new Enemy('normal', 1, 'normal');

            const killed = enemy.takeDamage(100);

            expect(killed).toBe(true);
            expect(enemy.alive).toBe(false);
            expect(enemy.hp).toBe(0);
        });

        test('should not die from non-lethal damage', () => {
            const enemy = new Enemy('normal', 1, 'normal');

            const killed = enemy.takeDamage(50);

            expect(killed).toBe(false);
            expect(enemy.alive).toBe(true);
        });

        test('should handle overkill damage', () => {
            const enemy = new Enemy('normal', 1, 'normal');

            enemy.takeDamage(999);

            expect(enemy.hp).toBe(0);
            expect(enemy.alive).toBe(false);
        });
    });

    describe('Healing', () => {
        test('should heal and increase HP', () => {
            const enemy = new Enemy('normal', 1, 'normal');
            enemy.hp = 50;

            enemy.heal(20);

            expect(enemy.hp).toBe(70);
        });

        test('should not exceed maxHp when healing', () => {
            const enemy = new Enemy('normal', 1, 'normal');
            enemy.hp = 90;

            enemy.heal(50);

            expect(enemy.hp).toBe(enemy.maxHp);
        });

        test('should heal to full if overheal', () => {
            const enemy = new Enemy('normal', 1, 'normal');
            enemy.hp = 10;

            enemy.heal(1000);

            expect(enemy.hp).toBe(100);
        });
    });

    describe('Progress', () => {
        test('should return 0 at start', () => {
            const enemy = new Enemy('normal', 1, 'normal');
            enemy.x = CONFIG.PATH[0].x;
            enemy.y = CONFIG.PATH[0].y;
            enemy.pathIndex = 0;

            const progress = enemy.getProgress();

            expect(progress).toBeCloseTo(0, 1);
        });

        test('should increase progress as enemy moves', () => {
            const enemy = new Enemy('normal', 1, 'normal');
            const initialProgress = enemy.getProgress();

            // Move enemy forward
            enemy.update();
            enemy.update();
            enemy.update();

            expect(enemy.getProgress()).toBeGreaterThan(initialProgress);
        });

        test('should return value between 0 and 1', () => {
            const enemy = new Enemy('normal', 1, 'normal');

            // Test at various positions
            for (let i = 0; i < 5; i++) {
                enemy.update();
                const progress = enemy.getProgress();
                expect(progress).toBeGreaterThanOrEqual(0);
                expect(progress).toBeLessThanOrEqual(1);
            }
        });
    });

    describe('All Enemy Types', () => {
        test.each([
            ['normal', 100, 1.5, 15, false],
            ['fast', 60, 3, 20, false],
            ['tank', 400, 0.8, 40, false],
            ['flying', 80, 2, 25, true],
            ['healer', 120, 1.2, 35, false],
            ['boss', 2000, 0.6, 200, false]
        ])('%s enemy should have correct base stats', (type, hp, speed, reward, flying) => {
            const enemy = new Enemy(type, 1, 'normal');

            expect(enemy.maxHp).toBe(hp);
            expect(enemy.speed).toBe(speed);
            expect(enemy.reward).toBe(reward);
            expect(enemy.flying).toBe(flying);
        });
    });

    describe('Update when dead', () => {
        test('should not update when not alive', () => {
            const enemy = new Enemy('normal', 1, 'normal');
            enemy.alive = false;
            const startX = enemy.x;

            enemy.update();

            expect(enemy.x).toBe(startX);
        });
    });

    describe('Color utilities', () => {
        test('lightenColor should make color lighter', () => {
            const enemy = new Enemy('normal', 1, 'normal');
            const original = '#808080'; // Gray

            const lighter = enemy.lightenColor(original, 20);

            // Should be lighter (higher RGB values)
            expect(lighter).not.toBe(original);
        });

        test('darkenColor should make color darker', () => {
            const enemy = new Enemy('normal', 1, 'normal');
            const original = '#808080'; // Gray

            const darker = enemy.darkenColor(original, 20);

            // Should be darker (lower RGB values)
            expect(darker).not.toBe(original);
        });

        test('lightenColor should not exceed #ffffff', () => {
            const enemy = new Enemy('normal', 1, 'normal');
            const white = '#ffffff';

            const result = enemy.lightenColor(white, 100);

            expect(result).toBe('#ffffff');
        });

        test('darkenColor should not go below #000000', () => {
            const enemy = new Enemy('normal', 1, 'normal');
            const black = '#000000';

            const result = enemy.darkenColor(black, 100);

            expect(result).toBe('#000000');
        });
    });
});
