/**
 * Projectile Class Unit Tests
 * Tests for projectile creation, movement, hit detection and effects
 */

const CONFIG = require('../../js/config.js');

// Mock audio
global.audio = {
    play: jest.fn()
};

// Mock Particle class
class MockParticle {
    constructor(x, y, vx, vy, color, lifetime) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.lifetime = lifetime;
        this.alive = true;
    }
}
global.Particle = MockParticle;

// Load Projectile class
const fs = require('fs');
const path = require('path');
const projectileCode = fs.readFileSync(path.join(__dirname, '../../js/entities/Projectile.js'), 'utf8');
eval(projectileCode);

describe('Projectile', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should create projectile with correct position', () => {
            const target = createMockEnemy();
            const proj = new Projectile(100, 200, target, 15, 'basic');

            expect(proj.x).toBe(100);
            expect(proj.y).toBe(200);
        });

        test('should store target and damage', () => {
            const target = createMockEnemy();
            const proj = new Projectile(100, 200, target, 25, 'basic');

            expect(proj.target).toBe(target);
            expect(proj.damage).toBe(25);
        });

        test('should initialize as alive', () => {
            const target = createMockEnemy();
            const proj = new Projectile(100, 200, target, 15, 'basic');

            expect(proj.alive).toBe(true);
        });

        test('should have no special effects by default', () => {
            const target = createMockEnemy();
            const proj = new Projectile(100, 200, target, 15, 'basic');

            expect(proj.slowAmount).toBe(0);
            expect(proj.slowDuration).toBe(0);
            expect(proj.splashRadius).toBe(0);
        });
    });

    describe('Speed by Type', () => {
        test('basic projectile should have speed 8', () => {
            const target = createMockEnemy();
            const proj = new Projectile(0, 0, target, 15, 'basic');

            expect(proj.speed).toBe(8);
        });

        test('frost projectile should have speed 6', () => {
            const target = createMockEnemy();
            const proj = new Projectile(0, 0, target, 15, 'frost');

            expect(proj.speed).toBe(6);
        });

        test('sniper projectile should have speed 15', () => {
            const target = createMockEnemy();
            const proj = new Projectile(0, 0, target, 15, 'sniper');

            expect(proj.speed).toBe(15);
        });

        test('cannon projectile should have speed 5', () => {
            const target = createMockEnemy();
            const proj = new Projectile(0, 0, target, 15, 'cannon');

            expect(proj.speed).toBe(5);
        });

        test('unknown type should default to speed 8', () => {
            const target = createMockEnemy();
            const proj = new Projectile(0, 0, target, 15, 'unknown');

            expect(proj.speed).toBe(8);
        });
    });

    describe('Radius by Type', () => {
        test('basic projectile should have radius 4', () => {
            const target = createMockEnemy();
            const proj = new Projectile(0, 0, target, 15, 'basic');

            expect(proj.radius).toBe(4);
        });

        test('frost projectile should have radius 5', () => {
            const target = createMockEnemy();
            const proj = new Projectile(0, 0, target, 15, 'frost');

            expect(proj.radius).toBe(5);
        });

        test('sniper projectile should have radius 3', () => {
            const target = createMockEnemy();
            const proj = new Projectile(0, 0, target, 15, 'sniper');

            expect(proj.radius).toBe(3);
        });

        test('cannon projectile should have radius 8', () => {
            const target = createMockEnemy();
            const proj = new Projectile(0, 0, target, 15, 'cannon');

            expect(proj.radius).toBe(8);
        });
    });

    describe('Color by Type', () => {
        test('should get color from CONFIG for each tower type', () => {
            const target = createMockEnemy();

            const basicProj = new Projectile(0, 0, target, 15, 'basic');
            expect(basicProj.color).toBe(CONFIG.TOWER_TYPES.basic.color);

            const frostProj = new Projectile(0, 0, target, 15, 'frost');
            expect(frostProj.color).toBe(CONFIG.TOWER_TYPES.frost.color);
        });

        test('should default to white for unknown type', () => {
            const target = createMockEnemy();
            const proj = new Projectile(0, 0, target, 15, 'unknown');

            expect(proj.color).toBe('#fff');
        });
    });

    describe('Movement', () => {
        test('should move towards target', () => {
            const target = createMockEnemy({ x: 200, y: 100 });
            const proj = new Projectile(100, 100, target, 15, 'basic');

            proj.update([], []);

            expect(proj.x).toBeGreaterThan(100);
        });

        test('should move at correct speed', () => {
            const target = createMockEnemy({ x: 200, y: 100 }); // 100 units away horizontally
            const proj = new Projectile(100, 100, target, 15, 'basic');
            const startX = proj.x;

            proj.update([], []);

            const moved = proj.x - startX;
            expect(moved).toBeCloseTo(proj.speed, 1);
        });

        test('should die when target is dead', () => {
            const target = createMockEnemy({ alive: false });
            const proj = new Projectile(100, 100, target, 15, 'basic');

            proj.update([], []);

            expect(proj.alive).toBe(false);
        });

        test('should die when target is null', () => {
            const proj = new Projectile(100, 100, null, 15, 'basic');

            proj.update([], []);

            expect(proj.alive).toBe(false);
        });

        test('should not update when dead', () => {
            const target = createMockEnemy({ x: 200, y: 100 });
            const proj = new Projectile(100, 100, target, 15, 'basic');
            proj.alive = false;
            const startX = proj.x;

            proj.update([], []);

            expect(proj.x).toBe(startX);
        });
    });

    describe('Hit Detection', () => {
        test('should hit when reaching target', () => {
            const target = createMockEnemy({ x: 105, y: 100 }); // Very close
            const proj = new Projectile(100, 100, target, 15, 'basic');

            proj.update([target], []);

            expect(proj.alive).toBe(false);
            expect(target.takeDamage).toHaveBeenCalledWith(15);
        });

        test('should play hit sound on normal hit', () => {
            const target = createMockEnemy({ x: 105, y: 100 });
            const proj = new Projectile(100, 100, target, 15, 'basic');

            proj.update([target], []);

            expect(audio.play).toHaveBeenCalledWith('hit');
        });
    });

    describe('Slow Effect', () => {
        test('should apply slow effect on hit', () => {
            const target = createMockEnemy({ x: 105, y: 100 });
            const proj = new Projectile(100, 100, target, 15, 'frost');
            proj.slowAmount = 0.5;
            proj.slowDuration = 60;

            proj.update([target], []);

            expect(target.applySlow).toHaveBeenCalledWith(0.5, 60);
        });

        test('should not apply slow if slowAmount is 0', () => {
            const target = createMockEnemy({ x: 105, y: 100 });
            const proj = new Projectile(100, 100, target, 15, 'basic');
            proj.slowAmount = 0;

            proj.update([target], []);

            expect(target.applySlow).not.toHaveBeenCalled();
        });
    });

    describe('Splash Damage', () => {
        test('should deal splash damage to all enemies in radius', () => {
            const target = createMockEnemy({ x: 105, y: 100 });
            const nearby = createMockEnemy({ x: 130, y: 100 });
            const proj = new Projectile(100, 100, target, 35, 'cannon');
            proj.splashRadius = 50;

            proj.update([target, nearby], []);

            expect(target.takeDamage).toHaveBeenCalled();
            expect(nearby.takeDamage).toHaveBeenCalled();
        });

        test('should not damage enemies outside splash radius', () => {
            const target = createMockEnemy({ x: 105, y: 100 });
            const farEnemy = createMockEnemy({ x: 300, y: 100 });
            const proj = new Projectile(100, 100, target, 35, 'cannon');
            proj.splashRadius = 50;

            proj.update([target, farEnemy], []);

            expect(farEnemy.takeDamage).not.toHaveBeenCalled();
        });

        test('should reduce damage based on distance from center', () => {
            const target = createMockEnemy({ x: 100, y: 100 }); // At center
            const nearbyEnemy = createMockEnemy({ x: 125, y: 100 }); // 25 units away
            const proj = new Projectile(100, 100, target, 100, 'cannon');
            proj.splashRadius = 50;

            proj.update([target, nearbyEnemy], []);

            // Center should get full damage
            const centerDamage = target.takeDamage.mock.calls[0][0];
            // Nearby should get reduced damage (1 - 25/50 * 0.5 = 0.75)
            const nearbyDamage = nearbyEnemy.takeDamage.mock.calls[0][0];

            expect(nearbyDamage).toBeLessThan(centerDamage);
        });

        test('should play explosion sound for splash damage', () => {
            const target = createMockEnemy({ x: 105, y: 100 });
            const proj = new Projectile(100, 100, target, 35, 'cannon');
            proj.splashRadius = 50;

            proj.update([target], []);

            expect(audio.play).toHaveBeenCalledWith('explosion');
        });

        test('should not damage dead enemies with splash', () => {
            const target = createMockEnemy({ x: 105, y: 100 });
            const deadEnemy = createMockEnemy({ x: 110, y: 100, alive: false });
            const proj = new Projectile(100, 100, target, 35, 'cannon');
            proj.splashRadius = 50;

            proj.update([target, deadEnemy], []);

            expect(deadEnemy.takeDamage).not.toHaveBeenCalled();
        });
    });

    describe('Particle Effects', () => {
        test('should create hit particles on normal hit', () => {
            const target = createMockEnemy({ x: 105, y: 100 });
            const proj = new Projectile(100, 100, target, 15, 'basic');
            const particles = [];

            proj.update([target], particles);

            expect(particles.length).toBe(5); // createHitParticles creates 5
        });

        test('should create explosion particles on splash hit', () => {
            const target = createMockEnemy({ x: 105, y: 100 });
            const proj = new Projectile(100, 100, target, 35, 'cannon');
            proj.splashRadius = 50;
            const particles = [];

            proj.update([target], particles);

            expect(particles.length).toBe(15); // createExplosion creates 15
        });

        test('explosion particles should have projectile color', () => {
            const target = createMockEnemy({ x: 105, y: 100 });
            const proj = new Projectile(100, 100, target, 35, 'cannon');
            proj.splashRadius = 50;
            const particles = [];

            proj.update([target], particles);

            particles.forEach(p => {
                expect(p.color).toBe(proj.color);
            });
        });
    });

    describe('Edge Cases', () => {
        test('should handle target dying mid-flight', () => {
            const target = createMockEnemy({ x: 200, y: 100 });
            const proj = new Projectile(100, 100, target, 15, 'basic');

            // First update - move towards target
            proj.update([], []);
            expect(proj.alive).toBe(true);

            // Target dies
            target.alive = false;

            // Next update - should die because target is dead
            proj.update([], []);
            expect(proj.alive).toBe(false);
        });

        test('should handle hitting already dead target', () => {
            const target = createMockEnemy({ x: 105, y: 100, alive: false });
            const proj = new Projectile(100, 100, target, 15, 'basic');

            proj.update([target], []);

            // Should die but not deal damage to dead target
            expect(proj.alive).toBe(false);
        });
    });

    describe('All projectile types', () => {
        test.each([
            ['basic', 8, 4],
            ['frost', 6, 5],
            ['sniper', 15, 3],
            ['cannon', 5, 8]
        ])('%s projectile should have speed %d and radius %d', (type, speed, radius) => {
            const target = createMockEnemy();
            const proj = new Projectile(0, 0, target, 15, type);

            expect(proj.speed).toBe(speed);
            expect(proj.radius).toBe(radius);
        });
    });
});
