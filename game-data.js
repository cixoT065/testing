const classes = {
    'Warrior': {
        primaryStat: 'str',
        description: 'A balanced fighter with high HP and DEF. Excels at sustained combat and survivability.',
        base: { hp: 120, str: 10, con: 8, def: 6, dex: 3, agl: 2, int: 1, critChance: 0.05, critDmg: 1.5 },
        growth: { str: 2, con: 2, def: 1, dex: 0.5, agl: 0.5, int: 0, critChance: 0.0005, critDmg: 0 },
        promotions: { 20: ['Knight', 'Berserker'], 40: { 'Knight': ['Paladin', 'Guardian'], 'Berserker': ['Slayer', 'Warlord'] }, 70: { 'Paladin': ['Holy Knight'], 'Guardian': ['Aegis'], 'Slayer': ['Executioner'], 'Warlord': ['Conqueror'] } }
    },
    'Rogue': {
        primaryStat: 'str',
        description: 'A swift attacker specializing in high damage and critical hits. Relies on evasion to survive.',
        base: { hp: 90, str: 12, con: 5, def: 3, dex: 8, agl: 6, int: 1, critChance: 0.10, critDmg: 1.75 },
        growth: { str: 2, con: 1, def: 0.5, dex: 2, agl: 1, int: 0, critChance: 0.001, critDmg: 0 },
        promotions: { 20: ['Assassin', 'Ranger'], 40: { 'Assassin': ['Shadow', 'Reaper'], 'Ranger': ['Sharpshooter', 'Pathfinder'] }, 70: { 'Shadow': ['Phantom'], 'Reaper': ['Soul Carver'], 'Sharpshooter': ['Deadeye'], 'Pathfinder': ['Trailblazer'] } }
    },
    'Wizard': {
        primaryStat: 'int',
        description: 'A master of arcane arts, dealing massive damage with powerful spells. Fragile but deadly.',
        base: { hp: 80, str: 2, con: 4, def: 2, dex: 6, agl: 3, int: 12, critChance: 0.07, critDmg: 1.6 },
        growth: { str: 0, con: 1, def: 0.5, dex: 1, agl: 0.5, int: 3, critChance: 0.0007, critDmg: 0 },
        promotions: { 20: ['Mage', 'Sorcerer'], 40: { 'Mage': ['Archmage', 'Elementalist'], 'Sorcerer': ['Warlock', 'Chronomancer'] }, 70: { 'Archmage': ['Grand Magus'], 'Elementalist': ['Avatar'], 'Warlock': ['Demonologist'], 'Chronomancer': ['Time Lord'] } }
    },
};

const promotionInfo = {
    'Knight': { description: 'Focuses on defense, becoming a stalwart protector who can withstand heavy blows.' },
    'Berserker': { description: 'An offensive powerhouse who deals more damage by embracing risk and critical strikes.' },
    'Paladin': { description: 'A holy warrior who blends offense and defense with sacred power.' },
    'Guardian': { description: 'The ultimate shield, possessing unmatched defensive capabilities.' },
    'Slayer': { description: 'A ruthless killer focused on executing single targets with overwhelming force.' },
    'Warlord': { description: 'A charismatic leader in battle, bolstering their own power while commanding the field.' },
    'Assassin': { description: 'A master of burst damage and criticals, eliminating foes with deadly precision.' },
    'Ranger': { description: 'A nimble archer who excels at consistent damage and avoiding attacks.' },
    'Shadow': { description: 'Uses stealth and deception to strike from the darkness, ensuring a fatal blow.' },
    'Reaper': { description: 'A fearsome combatant who seems to dance with death, growing stronger with every kill.' },
    'Sharpshooter': { description: 'An unrivaled marksman whose precision leads to devastating critical hits.' },
    'Pathfinder': { description: 'A resourceful survivor who adapts to any situation, moving with incredible speed.' },
    'Mage': { description: 'A student of pure magic, wielding raw arcane power to demolish enemies.' },
    'Sorcerer': { description: 'A natural talent who bends magic to their will, often with unpredictable and chaotic results.' },
    'Archmage': { description: 'A supreme spellcaster who has achieved mastery over all forms of arcane magic.' },
    'Elementalist': { description: 'Commands the primal forces of fire, ice, and lightning to annihilate foes.' },
    'Warlock': { description: 'Draws upon forbidden, dark powers, sacrificing vitality for immense destructive force.' },
    'Chronomancer': { description: 'Manipulates time itself, slowing enemies and hastening their own actions.' },
};

const promotionGrowthAdjustments = {
    'Knight': { con: 1, def: 1, str: -1 }, 'Berserker': { str: 1, critChance: 0.001, con: -1 },
    'Assassin': { str: 1, dex: 1, agl: 1, critChance: 0.0005, con: -1 }, 'Ranger': { dex: 1, agl: 1, str: 0, con: -1 },
    'Mage': { int: 1, str: 1, dex: -1 }, 'Sorcerer': { int: 1, dex: 1, str: -1 }
};

const promotionSkills = {
    // Warrior Path
    'Knight': { name: 'Aegis Block', description: '15% chance to block all incoming damage.' },
    'Paladin': { name: 'Holy Shield', description: 'Aegis Block now also heals you for 5% of your Max HP.' },
    'Holy Knight': { name: 'Divine Retribution', description: 'Holy Shield now also retaliates for 100% of your DEF as Holy damage.' },
    'Guardian': { name: 'Stand Firm', description: 'Aegis Block now also grants +30% DEF for 3 seconds.' },
    'Aegis': { name: 'Thornmail', description: 'Stand Firm now also reflects 20% of pre-mitigation damage back to the attacker.' },
    'Berserker': { name: 'Frenzy', description: 'Gain +8% ATK for every 10% of missing health.' },
    'Slayer': { name: 'Execute', description: 'Attacks against enemies below 20% HP deal 50% more damage.' },
    'Executioner': { name: 'Cull the Weak', description: 'Execute threshold increased to 30% HP and bonus damage increased to 100%.' },
    'Warlord': { name: 'Battle Rush', description: 'Attacks have a 20% chance to grant +20% ATK for 3 seconds.' },
    'Conqueror': { name: 'Unyielding Assault', description: 'Battle Rush now also grants 10% Lifesteal.' },
    // Rogue Path
    'Assassin': { name: 'Bleed', description: 'Critical hits cause the enemy to bleed for 30% of your ATK each second for 3 seconds.' },
    'Shadow': { name: 'Shadow Step', description: 'Attacks have a 10% chance to grant a guaranteed critical hit on your next attack.' },
    'Phantom': { name: 'Invisibility', description: 'Shadow Step now grants a guaranteed crit and 100% evasion for your next attack.' },
    'Reaper': { name: 'Hemorrhage', description: 'Bleed can now stack up to 3 times.' },
    'Soul Carver': { name: 'Exsanguinate', description: 'Bleed damage ticks can now critically strike.' },
    'Ranger': { name: 'Double Shot', description: '15% chance to attack a second time for 60% damage.' },
    'Sharpshooter': { name: 'Focus', description: 'Every 5th attack is a guaranteed critical hit.' },
    'Deadeye': { name: 'Lethal Precision', description: 'Guaranteed criticals from Focus deal +50% critical damage.' },
    'Pathfinder': { name: 'Sunder', description: 'Attacks have a 25% chance to reduce enemy DEF by 10% for 5 seconds.' },
    'Trailblazer': { name: 'Armor Shatter', description: 'Sunder now stacks up to 3 times and also reduces enemy ATK by 5%.' },
    // Wizard Path
    'Mage': { name: 'Arcane Power', description: 'Attacks have a 10% chance to unleash a spell for 250% of your ATK as bonus damage.' },
    'Archmage': { name: 'High Voltage', description: 'Arcane Power proc chance increased to 15% and damage to 300%.' },
    'Grand Magus': { name: 'Chain Lightning', description: 'Arcane Power hits now explode, dealing an additional 150% ATK damage.' },
    'Elementalist': { name: 'Combustion', description: 'Arcane Power now also applies a burn for 50% of your ATK for 3 seconds.' },
    'Avatar': { name: 'Apocalypse', description: 'Combustion burn damage is increased to 100% ATK and also reduces enemy DEF by 15%.' },
    'Sorcerer': { name: 'Soul Drain', description: 'Attacks have a 5% chance to deal 150% damage and heal you for 50% of the damage dealt.' },
    'Warlock': { name: 'Devour Soul', description: 'Soul Drain proc chance increased to 8% and heal increased to 75%.' },
    'Demonologist': { name: 'Annihilate', description: 'Devour Soul now deals bonus damage equal to 5% of the monster\'s max HP.' },
    'Chronomancer': { name: 'Time Warp', description: 'Soul Drain now also has a 50% chance to make the monster miss its next attack.' },
    'Time Lord': { name: 'Paradox', description: 'Time Warp now always makes the monster miss its next attack.' }
};

const monsters = {
    regular: [
        { name: 'Slime', baseHp: 30, baseAtk: 5, baseDef: 2, baseEvasion: 0.01, gold: 5, xp: 5, dropChance: 0.15, monsterType: 'regular' },
        { name: 'Giant Rat', baseHp: 25, baseAtk: 6, baseDef: 1, baseEvasion: 0.03, gold: 4, xp: 4, dropChance: 0.10, monsterType: 'regular' },
        { name: 'Goblin Scout', baseHp: 40, baseAtk: 7, baseDef: 3, baseEvasion: 0.05, gold: 7, xp: 6, dropChance: 0.20, monsterType: 'regular' },
        { name: 'Cave Bat', baseHp: 20, baseAtk: 8, baseDef: 0, baseEvasion: 0.08, gold: 3, xp: 3, dropChance: 0.08, monsterType: 'regular' },
        { name: 'Kobold Miner', baseHp: 35, baseAtk: 9, baseDef: 2, baseEvasion: 0.02, gold: 8, xp: 7, dropChance: 0.18, monsterType: 'regular' },
        { name: 'Forest Spider', baseHp: 30, baseAtk: 7, baseDef: 1, baseEvasion: 0.10, gold: 6, xp: 5, dropChance: 0.12, monsterType: 'regular' },
        { name: 'Undead Soldier', baseHp: 50, baseAtk: 6, baseDef: 5, baseEvasion: 0.01, gold: 9, xp: 8, dropChance: 0.22, monsterType: 'regular' },
    ],
    mutant: [
        { name: 'Mutated Slime', baseHp: 80, baseAtk: 10, baseDef: 1, baseEvasion: 0.01, gold: 20, xp: 15, dropChance: 0.50, monsterType: 'mutant' },
        { name: 'Rabid Wolf', baseHp: 50, baseAtk: 18, baseDef: 2, baseEvasion: 0.12, gold: 25, xp: 18, dropChance: 0.40, monsterType: 'mutant' },
        { name: 'Shrieking Fungus', baseHp: 100, baseAtk: 8, baseDef: 8, baseEvasion: 0.00, gold: 30, xp: 20, dropChance: 0.60, monsterType: 'mutant' },
    ],
    elite: [
        { name: 'Orc Grunt', baseHp: 120, baseAtk: 20, baseDef: 8, baseEvasion: 0.05, gold: 50, xp: 30, dropChance: 0.8, monsterType: 'elite' },
        { name: 'Troll', baseHp: 150, baseAtk: 18, baseDef: 12, baseEvasion: 0.02, gold: 65, xp: 40, dropChance: 0.9, monsterType: 'elite' },
        { name: 'Ogre Mage', baseHp: 100, baseAtk: 28, baseDef: 6, baseEvasion: 0.04, gold: 80, xp: 50, dropChance: 0.85, monsterType: 'elite' },
        { name: 'Goblin Shaman', baseHp: 90, baseAtk: 32, baseDef: 5, baseEvasion: 0.08, gold: 90, xp: 55, dropChance: 0.88, monsterType: 'elite' },
        { name: 'Stone Golem', baseHp: 200, baseAtk: 15, baseDef: 20, baseEvasion: 0.00, gold: 100, xp: 60, dropChance: 1.0, monsterType: 'elite' },
    ],
    bosses: [
        { name: 'Grimgnaw the Goblin King', baseHp: 400, baseAtk: 35, baseDef: 15, baseEvasion: 0.06, gold: 400, xp: 200, dropChance: 1.0, monsterType: 'boss' },
        { name: 'The Slime Mother', baseHp: 600, baseAtk: 30, baseDef: 25, baseEvasion: 0.03, gold: 600, xp: 350, dropChance: 1.0, monsterType: 'boss' },
        { name: 'Hydra', baseHp: 500, baseAtk: 45, baseDef: 12, baseEvasion: 0.10, gold: 800, xp: 500, dropChance: 1.0, monsterType: 'boss' },
        { name: 'Dragon Whelp', baseHp: 700, baseAtk: 40, baseDef: 20, baseEvasion: 0.08, gold: 1000, xp: 600, dropChance: 1.0, monsterType: 'boss' },
    ]
};

const itemData = {
    types: ['weapon', 'body', 'legs'],
    rarities: {
        N:   { color: '#DEDEDE',  statMod: 1.0, value: 2,   baseStatCount: 1, bonusStats: 0, enhanceCostMod: 1.0 },
        R:   { color: '#63C270',  statMod: 1.2, value: 8,   baseStatCount: 2, bonusStats: 1, enhanceCostMod: 1.5 },
        SR:  { color: '#6386C2',  statMod: 1.5, value: 40,  baseStatCount: 3, bonusStats: 2, enhanceCostMod: 2.5 },
        SSR: { color: '#9663C2',  statMod: 2.0, value: 200, baseStatCount: 4, bonusStats: 3, enhanceCostMod: 5.0 },
        UR:  { color: '#C29463',  statMod: 2.8, value: 1000,baseStatCount: 4, bonusStats: 4, enhanceCostMod: 10.0 },
        LR:  { color: '#FFD700',  statMod: 3.5, value: 5000,baseStatCount: 5, bonusStats: 4, enhanceCostMod: 25.0 },
    },
    bonusStatPool: Object.keys(STAT_NAMES),
    names: {
        weapon: {
            Warrior: ['Sword', 'Axe', 'Gauntlet'],
            Rogue: ['Dagger', 'Bow', 'Claw'],
            Wizard: ['Staff', 'Wand', 'Rod']
        },
        body: {
            Warrior: ['Armor', 'Vest'],
            Rogue: ['Leather', 'Jacket'],
            Wizard: ['Robe', 'Cape']
        },
        legs: {
            Warrior: ['Greaves', 'Sabatons'],
            Rogue: ['Boots', 'Slippers'],
            Wizard: ['Shoes', 'Wraps']
        },
        prefixes: {
            Warrior: ['Mighty', 'Stalwart', 'Brutal', 'Savage', 'Guardian\'s'],
            Rogue: ['Swift', 'Silent', 'Vicious', 'Shadow', 'Assassin\'s'],
            Wizard: ['Arcane', 'Mystic', 'Elemental', 'Warlock\'s', 'Sage\'s'],
            Balanced: ['Fine', 'Superior', 'Masterwork', 'Exquisite', 'Perfect']
        }
    }
};

const itemSets = {
    "Stonewall Plate": {
        class: "Warrior",
        items: ["Stonewall Greathelm", "Stonewall Chestplate", "Stonewall Greaves"],
        bonuses: {
            2: { def: 30, description: "2pc: +30 DEF" },
            3: { hpPercent: 0.15, description: "3pc: +15% Max HP" }
        }
    },
    "Undead King's Regalia": {
        class: "Rogue",
        items: ["Undead King's Dagger", "Undead King's Robe", "Undead King's Slippers"],
        bonuses: {
            2: { agl: 20, description: "2pc: +20 AGL" },
            3: { critDmg: 0.25, description: "3pc: +25% Crit Damage" }
        }
    },
    "Archon's Raiment": {
        class: "Wizard",
        items: ["Archon's Crown", "Archon's Mantle", "Archon's Treads"],
        bonuses: {
            2: { int: 25, description: "2pc: +25 INT" },
            3: { critChance: 0.05, description: "3pc: +5% Crit Chance" }
        }
    }
};