/**
 * SaveSystem Class Unit Tests
 * Tests for data persistence, settings, records and statistics
 */

// Load SaveSystem class
const fs = require('fs');
const path = require('path');
const saveSystemCode = fs.readFileSync(path.join(__dirname, '../../js/systems/SaveSystem.js'), 'utf8');

// Remove the global instance creation at the end
const codeWithoutGlobal = saveSystemCode.replace(/\/\/ Глобальный экземпляр[\s\S]*$/, '');
eval(codeWithoutGlobal);

describe('SaveSystem', () => {
    let saveSystem;

    beforeEach(() => {
        localStorage.clear();
        jest.clearAllMocks();
        saveSystem = new SaveSystem();
    });

    describe('Constructor', () => {
        test('should initialize with correct storage key', () => {
            expect(saveSystem.storageKey).toBe('towerDefensePro');
        });
    });

    describe('Default Data', () => {
        test('should return default data when storage is empty', () => {
            const data = saveSystem.getData();

            expect(data).toEqual({
                settings: {
                    sfxVolume: 70,
                    musicVolume: 50,
                    showTutorial: true,
                    autoWave: false,
                    showRange: true
                },
                records: [],
                stats: {
                    gamesPlayed: 0,
                    totalKills: 0,
                    totalTowersBuilt: 0,
                    totalWavesCompleted: 0
                },
                tutorialCompleted: false
            });
        });

        test('should have correct default settings', () => {
            const defaults = saveSystem.getDefaultData();

            expect(defaults.settings.sfxVolume).toBe(70);
            expect(defaults.settings.musicVolume).toBe(50);
            expect(defaults.settings.showTutorial).toBe(true);
            expect(defaults.settings.autoWave).toBe(false);
            expect(defaults.settings.showRange).toBe(true);
        });
    });

    describe('Save and Load Data', () => {
        test('should save data to localStorage', () => {
            const testData = { test: 'value' };

            saveSystem.saveData(testData);

            expect(localStorage.setItem).toHaveBeenCalledWith(
                'towerDefensePro',
                JSON.stringify(testData)
            );
        });

        test('should load saved data', () => {
            const testData = { test: 'value', settings: { sfxVolume: 50 } };
            localStorage.setItem('towerDefensePro', JSON.stringify(testData));

            const loaded = saveSystem.getData();

            expect(loaded).toEqual(testData);
        });

        test('should return default data if JSON is invalid', () => {
            localStorage.setItem('towerDefensePro', 'invalid json');

            const data = saveSystem.getData();

            expect(data).toEqual(saveSystem.getDefaultData());
        });

        test('should handle localStorage errors gracefully', () => {
            localStorage.setItem.mockImplementationOnce(() => {
                throw new Error('Storage full');
            });

            // Should not throw
            expect(() => saveSystem.saveData({ test: 'data' })).not.toThrow();
        });
    });

    describe('Settings', () => {
        test('should get settings from stored data', () => {
            const settings = saveSystem.getSettings();

            expect(settings).toEqual({
                sfxVolume: 70,
                musicVolume: 50,
                showTutorial: true,
                autoWave: false,
                showRange: true
            });
        });

        test('should save individual settings', () => {
            saveSystem.saveSettings({ sfxVolume: 100 });

            const settings = saveSystem.getSettings();
            expect(settings.sfxVolume).toBe(100);
        });

        test('should merge new settings with existing', () => {
            saveSystem.saveSettings({ sfxVolume: 100 });
            saveSystem.saveSettings({ musicVolume: 80 });

            const settings = saveSystem.getSettings();
            expect(settings.sfxVolume).toBe(100);
            expect(settings.musicVolume).toBe(80);
        });

        test('should preserve other settings when updating one', () => {
            saveSystem.saveSettings({ sfxVolume: 100 });

            const settings = saveSystem.getSettings();
            expect(settings.showRange).toBe(true); // Default value preserved
        });
    });

    describe('Records', () => {
        test('should return empty records array by default', () => {
            const records = saveSystem.getRecords();

            expect(records).toEqual([]);
        });

        test('should add new record', () => {
            const record = { score: 1000, wave: 10, difficulty: 'normal' };

            saveSystem.addRecord(record);

            const records = saveSystem.getRecords();
            expect(records.length).toBe(1);
            expect(records[0].score).toBe(1000);
        });

        test('should add date to record', () => {
            const record = { score: 1000, wave: 10, difficulty: 'normal' };

            saveSystem.addRecord(record);

            const records = saveSystem.getRecords();
            expect(records[0].date).toBeDefined();
        });

        test('should sort records by score descending', () => {
            saveSystem.addRecord({ score: 500, wave: 5 });
            saveSystem.addRecord({ score: 1000, wave: 10 });
            saveSystem.addRecord({ score: 750, wave: 7 });

            const records = saveSystem.getRecords();

            expect(records[0].score).toBe(1000);
            expect(records[1].score).toBe(750);
            expect(records[2].score).toBe(500);
        });

        test('should keep only top 10 records', () => {
            for (let i = 0; i < 15; i++) {
                saveSystem.addRecord({ score: i * 100, wave: i });
            }

            const records = saveSystem.getRecords();

            expect(records.length).toBe(10);
            expect(records[0].score).toBe(1400); // Highest
            expect(records[9].score).toBe(500); // 10th highest
        });

        test('should return position of new record', () => {
            saveSystem.addRecord({ score: 1000 });
            saveSystem.addRecord({ score: 500 });

            const position = saveSystem.addRecord({ score: 750 });

            expect(position).toBe(1); // Second place (0-indexed)
        });
    });

    describe('Is New Record', () => {
        test('should return true when less than 10 records', () => {
            const isRecord = saveSystem.isNewRecord(100);

            expect(isRecord).toBe(true);
        });

        test('should return true when score beats 10th place', () => {
            for (let i = 0; i < 10; i++) {
                saveSystem.addRecord({ score: (i + 1) * 100 }); // 100-1000
            }

            const isRecord = saveSystem.isNewRecord(150); // Beats 100

            expect(isRecord).toBe(true);
        });

        test('should return false when score does not beat 10th place', () => {
            for (let i = 0; i < 10; i++) {
                saveSystem.addRecord({ score: (i + 1) * 100 }); // 100-1000
            }

            const isRecord = saveSystem.isNewRecord(50); // Doesn't beat 100

            expect(isRecord).toBe(false);
        });
    });

    describe('Statistics', () => {
        test('should start with zero stats', () => {
            const data = saveSystem.getData();

            expect(data.stats.gamesPlayed).toBe(0);
            expect(data.stats.totalKills).toBe(0);
            expect(data.stats.totalTowersBuilt).toBe(0);
            expect(data.stats.totalWavesCompleted).toBe(0);
        });

        test('should increment games played', () => {
            saveSystem.updateStats({ kills: 0, towersBuilt: 0, wavesCompleted: 0 });

            const data = saveSystem.getData();
            expect(data.stats.gamesPlayed).toBe(1);
        });

        test('should accumulate kills', () => {
            saveSystem.updateStats({ kills: 50 });
            saveSystem.updateStats({ kills: 30 });

            const data = saveSystem.getData();
            expect(data.stats.totalKills).toBe(80);
        });

        test('should accumulate towers built', () => {
            saveSystem.updateStats({ towersBuilt: 10 });
            saveSystem.updateStats({ towersBuilt: 5 });

            const data = saveSystem.getData();
            expect(data.stats.totalTowersBuilt).toBe(15);
        });

        test('should accumulate waves completed', () => {
            saveSystem.updateStats({ wavesCompleted: 20 });
            saveSystem.updateStats({ wavesCompleted: 15 });

            const data = saveSystem.getData();
            expect(data.stats.totalWavesCompleted).toBe(35);
        });

        test('should handle missing stats properties', () => {
            saveSystem.updateStats({});

            const data = saveSystem.getData();
            expect(data.stats.gamesPlayed).toBe(1);
            expect(data.stats.totalKills).toBe(0);
        });
    });

    describe('Tutorial', () => {
        test('should start with tutorial not completed', () => {
            const completed = saveSystem.isTutorialCompleted();

            expect(completed).toBe(false);
        });

        test('should mark tutorial as completed', () => {
            saveSystem.completeTutorial();

            expect(saveSystem.isTutorialCompleted()).toBe(true);
        });

        test('should persist tutorial completion', () => {
            saveSystem.completeTutorial();

            // Create new instance to simulate page reload
            const newSaveSystem = new SaveSystem();
            expect(newSaveSystem.isTutorialCompleted()).toBe(true);
        });
    });

    describe('Clear All', () => {
        test('should remove all saved data', () => {
            saveSystem.saveSettings({ sfxVolume: 100 });
            saveSystem.addRecord({ score: 1000 });

            saveSystem.clearAll();

            expect(localStorage.removeItem).toHaveBeenCalledWith('towerDefensePro');
        });

        test('should return default data after clearing', () => {
            saveSystem.saveSettings({ sfxVolume: 100 });
            saveSystem.clearAll();

            const data = saveSystem.getData();
            expect(data).toEqual(saveSystem.getDefaultData());
        });
    });

    describe('Data Integrity', () => {
        test('should handle corrupted records array', () => {
            localStorage.setItem('towerDefensePro', JSON.stringify({
                settings: {},
                records: null // Corrupted
            }));

            const records = saveSystem.getRecords();

            expect(records).toEqual([]);
        });

        test('should handle missing stats object', () => {
            localStorage.setItem('towerDefensePro', JSON.stringify({
                settings: {}
                // stats missing
            }));

            // Should not throw
            expect(() => saveSystem.updateStats({ kills: 10 })).not.toThrow();
        });
    });
});
