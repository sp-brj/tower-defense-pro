/**
 * Jest Setup File
 * Configures the test environment with mocks for browser APIs
 */

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, value) => {
            store[key] = String(value);
        }),
        removeItem: jest.fn((key) => {
            delete store[key];
        }),
        clear: jest.fn(() => {
            store = {};
        }),
        get length() {
            return Object.keys(store).length;
        },
        key: jest.fn((i) => Object.keys(store)[i] || null)
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((callback) => {
    return setTimeout(callback, 16);
});

global.cancelAnimationFrame = jest.fn((id) => {
    clearTimeout(id);
});

// Mock Audio API
class AudioContextMock {
    constructor() {
        this.state = 'running';
        this.destination = {};
    }
    createOscillator() {
        return {
            type: 'sine',
            frequency: { setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() },
            connect: jest.fn(),
            start: jest.fn(),
            stop: jest.fn()
        };
    }
    createGain() {
        return {
            gain: { setValueAtTime: jest.fn(), linearRampToValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() },
            connect: jest.fn()
        };
    }
    createBiquadFilter() {
        return {
            type: 'lowpass',
            frequency: { setValueAtTime: jest.fn() },
            Q: { setValueAtTime: jest.fn() },
            connect: jest.fn()
        };
    }
    resume() {
        return Promise.resolve();
    }
}

global.AudioContext = AudioContextMock;
global.webkitAudioContext = AudioContextMock;

// Mock canvas
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(),
    putImageData: jest.fn(),
    createImageData: jest.fn(),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    fill: jest.fn(),
    arc: jest.fn(),
    ellipse: jest.fn(),
    rect: jest.fn(),
    fillText: jest.fn(),
    strokeText: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
    translate: jest.fn(),
    rotate: jest.fn(),
    scale: jest.fn(),
    createLinearGradient: jest.fn(() => ({
        addColorStop: jest.fn()
    })),
    createRadialGradient: jest.fn(() => ({
        addColorStop: jest.fn()
    })),
    setLineDash: jest.fn(),
    strokeRect: jest.fn(),
    clip: jest.fn(),
    canvas: {
        width: 900,
        height: 560
    }
}));

HTMLCanvasElement.prototype.getBoundingClientRect = jest.fn(() => ({
    left: 0,
    top: 0,
    right: 900,
    bottom: 560,
    width: 900,
    height: 560
}));

// Mock Date.now for consistent timing in tests
const originalDateNow = Date.now;
let mockTime = 0;

global.mockTime = (time) => {
    mockTime = time;
    Date.now = () => mockTime;
};

global.advanceTime = (ms) => {
    mockTime += ms;
};

global.restoreTime = () => {
    Date.now = originalDateNow;
};

// Helper to reset all mocks between tests
beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    mockTime = 0;
});

// Global test utilities
global.createMockEnemy = (overrides = {}) => ({
    x: 100,
    y: 100,
    hp: 100,
    maxHp: 100,
    alive: true,
    flying: false,
    speed: 1.5,
    baseSpeed: 1.5,
    slowAmount: 1,
    slowTimer: 0,
    reward: 15,
    pathIndex: 0,
    reachedEnd: false,
    blockedBy: null,
    getProgress: jest.fn(() => 0.5),
    takeDamage: jest.fn(function(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.alive = false;
            return true;
        }
        return false;
    }),
    applySlow: jest.fn(function(amount, duration) {
        this.slowAmount = Math.min(this.slowAmount, amount);
        this.slowTimer = Math.max(this.slowTimer, duration);
    }),
    heal: jest.fn(function(amount) {
        this.hp = Math.min(this.hp + amount, this.maxHp);
    }),
    update: jest.fn(),
    draw: jest.fn(),
    ...overrides
});

global.createMockTower = (overrides = {}) => ({
    x: 200,
    y: 200,
    type: 'basic',
    range: 120,
    damage: 15,
    fireRate: 0.5,
    fireCooldown: 0,
    level: 1,
    maxLevel: 3,
    baseCost: 50,
    totalSpent: 50,
    soldiers: [],
    target: null,
    angle: 0,
    laserTarget: null,
    update: jest.fn(),
    findTarget: jest.fn(),
    shoot: jest.fn(),
    upgrade: jest.fn(),
    getUpgradeCost: jest.fn(() => 30),
    getSellValue: jest.fn(() => 30),
    draw: jest.fn(),
    drawRange: jest.fn(),
    ...overrides
});

// Export for use in tests
module.exports = { localStorageMock };
