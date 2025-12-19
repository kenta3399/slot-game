// shared-config.js
// Config ที่ใช้ร่วมกันระหว่างหน้า

const VIP_SYSTEM_CONFIG = {
    // Storage keys (ใช้ localStorage เดียวกัน)
    STORAGE_KEYS: {
        SETTINGS: 'vip_system_settings_v2',
        BROADCASTS: 'vip_broadcast_messages_v2',
        USERS: 'vip_connected_users_v2'
    },
    
    // Default values
    DEFAULT_SETTINGS: {
        version: '2.0.0',
        lastUpdated: new Date().toISOString(),
        pg: {
            baseWin: 65,
            bonusChance: 25,
            randomness: 15
        },
        pp: {
            baseWin: 60,
            bonusChance: 22,
            volatility: 25
        }
    },
    
    // Polling intervals
    POLL_INTERVAL: 2000, // 2 วินาที
    CLEANUP_INTERVAL: 60000 // 1 นาที
};

// Game data
const GAME_DATA = {
    pg: [
        { name: 'Fortune Ox', img: 'https://i.postimg.cc/QtprgBHj/PGS-Fortune-Ox-1702650976.webp', multiplier: 'x5,000' },
        { name: 'Dragon Legend', img: 'https://i.postimg.cc/HL8mxvms/PGS-Dragon-Legend-1702650179.webp', multiplier: 'x10,000' }
    ],
    pp: [
        { name: 'Gates of Olympus', img: 'https://i.postimg.cc/wBnbWR2m/PMTS-Duel-of-Night-Day-1763560469.webp', multiplier: 'x5,000' },
        { name: 'Sweet Bonanza', img: 'https://i.postimg.cc/3JL05Xvp/PMTS-Anaconda-Gold-1765796713.webp', multiplier: 'x10,000' }
    ],
    bonus: {
        1: [{ img: 'https://i.postimg.cc/qM3pXXvx/107-BC-Bonustime-Soza.jpg' }],
        2: [{ img: 'https://i.postimg.cc/pXcPCkw4/88-Bc-fak-sasm-snok.jpg' }]
    }
};

const WEB_NAMES = {
    1: 'SOZA', 2: 'SNOK', 3: 'KKLOV', 4: 'KKKID', 5: 'KKBOY',
    6: 'FIWFUN', 7: 'MAFINX', 8: 'ZOCOOL', 9: 'OPPA', 10: 'SAATU',
    11: 'FH', 12: 'JKF', 13: 'MXMO', 14: 'SPD',
    15: 'JINGJAI', 16: 'KKMOO', 17: 'LKK', 18: 'SMU', 19: 'LAV'
};

const PROVIDER_LOGOS = {
    pg: "https://i.postimg.cc/wMmKwn72/unna.jpg",
    pp: "https://i.postimg.cc/T3czNV3M/download.png"
};

// สร้าง storage manager
class SharedStorage {
    constructor() {
        this.listeners = new Set();
        this.init();
    }
    
    init() {
        console.log('📦 SharedStorage initialized');
        
        // เริ่มต้น cleanup
        this.startCleanup();
        
        // ตั้งค่า event listener สำหรับ storage changes
        window.addEventListener('storage', (e) => {
            if (e.key === VIP_SYSTEM_CONFIG.STORAGE_KEYS.SETTINGS) {
                this.notifyListeners('settings', JSON.parse(e.newValue));
            }
            else if (e.key === VIP_SYSTEM_CONFIG.STORAGE_KEYS.BROADCASTS) {
                this.notifyListeners('broadcasts', JSON.parse(e.newValue));
            }
        });
    }
    
    // ฟังก์ชันหลัก: ใช้ localStorage + polling
    get(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('Storage get error:', error);
            return null;
        }
    }
    
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            
            // Trigger storage event สำหรับหน้าเดียวกัน
            window.dispatchEvent(new StorageEvent('storage', {
                key: key,
                newValue: JSON.stringify(value),
                oldValue: localStorage.getItem(key),
                storageArea: localStorage
            }));
            
            return true;
        } catch (error) {
            console.error('Storage set error:', error);
            return false;
        }
    }
    
    // สำหรับ Admin: อัพเดท settings
    updateSettings(game, newSettings) {
        const key = VIP_SYSTEM_CONFIG.STORAGE_KEYS.SETTINGS;
        let current = this.get(key) || VIP_SYSTEM_CONFIG.DEFAULT_SETTINGS;
        
        current[game] = { ...current[game], ...newSettings };
        current.lastUpdated = new Date().toISOString();
        
        this.set(key, current);
        return current;
    }
    
    // สำหรับ Admin: ส่ง broadcast
    sendBroadcast(broadcastData) {
        const key = VIP_SYSTEM_CONFIG.STORAGE_KEYS.BROADCASTS;
        let broadcasts = this.get(key) || [];
        
        const broadcast = {
            ...broadcastData,
            id: 'broadcast_' + Date.now(),
            timestamp: new Date().toISOString(),
            read: false
        };
        
        broadcasts.unshift(broadcast);
        
        // จำกัดจำนวน
        if (broadcasts.length > 20) {
            broadcasts = broadcasts.slice(0, 20);
        }
        
        this.set(key, broadcasts);
        return broadcast;
    }
    
    // สำหรับ User: get unread broadcasts
    getUnreadBroadcasts() {
        const key = VIP_SYSTEM_CONFIG.STORAGE_KEYS.BROADCASTS;
        const broadcasts = this.get(key) || [];
        return broadcasts.filter(b => !b.read);
    }
    
    // สำหรับ User: mark as read
    markBroadcastAsRead(broadcastId) {
        const key = VIP_SYSTEM_CONFIG.STORAGE_KEYS.BROADCASTS;
        let broadcasts = this.get(key) || [];
        
        broadcasts = broadcasts.map(b => 
            b.id === broadcastId ? { ...b, read: true } : b
        );
        
        this.set(key, broadcasts);
    }
    
    // สำหรับทั้งคู่: register user
    registerUser(userData) {
        const key = VIP_SYSTEM_CONFIG.STORAGE_KEYS.USERS;
        let users = this.get(key) || [];
        
        const user = {
            ...userData,
            id: 'user_' + Date.now(),
            lastSeen: new Date().toISOString(),
            active: true
        };
        
        users = users.filter(u => 
            (Date.now() - new Date(u.lastSeen).getTime()) < 300000 // 5 นาที
        );
        
        users.push(user);
        this.set(key, users);
        
        return user;
    }
    
    updateUserActivity(userId) {
        const key = VIP_SYSTEM_CONFIG.STORAGE_KEYS.USERS;
        let users = this.get(key) || [];
        
        users = users.map(u => 
            u.id === userId ? { ...u, lastSeen: new Date().toISOString() } : u
        );
        
        this.set(key, users);
    }
    
    // Event listeners
    addListener(event, callback) {
        const listener = { event, callback };
        this.listeners.add(listener);
        
        return () => this.listeners.delete(listener);
    }
    
    notifyListeners(event, data) {
        this.listeners.forEach(listener => {
            if (listener.event === event || listener.event === '*') {
                try {
                    listener.callback(data);
                } catch (error) {
                    console.error('Listener error:', error);
                }
            }
        });
    }
    
    // Cleanup old data
    startCleanup() {
        setInterval(() => {
            // Cleanup broadcasts เก่ากว่า 1 วัน
            const broadcastKey = VIP_SYSTEM_CONFIG.STORAGE_KEYS.BROADCASTS;
            let broadcasts = this.get(broadcastKey) || [];
            
            broadcasts = broadcasts.filter(b => {
                const age = Date.now() - new Date(b.timestamp).getTime();
                return age < 24 * 60 * 60 * 1000; // 24 ชั่วโมง
            });
            
            if (broadcasts.length > 0) {
                this.set(broadcastKey, broadcasts);
            }
            
            // Cleanup inactive users
            const userKey = VIP_SYSTEM_CONFIG.STORAGE_KEYS.USERS;
            let users = this.get(userKey) || [];
            
            users = users.filter(u => {
                const inactiveTime = Date.now() - new Date(u.lastSeen).getTime();
                return inactiveTime < 5 * 60 * 1000; // 5 นาที
            });
            
            this.set(userKey, users);
            
        }, VIP_SYSTEM_CONFIG.CLEANUP_INTERVAL);
    }
}

// สร้าง global instance
const sharedStorage = new SharedStorage();

// Export สำหรับใช้ใน browser
if (typeof window !== 'undefined') {
    window.VIP_SYSTEM_CONFIG = VIP_SYSTEM_CONFIG;
    window.GAME_DATA = GAME_DATA;
    window.WEB_NAMES = WEB_NAMES;
    window.PROVIDER_LOGOS = PROVIDER_LOGOS;
    window.sharedStorage = sharedStorage;
}

// Export สำหรับ CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        VIP_SYSTEM_CONFIG,
        GAME_DATA,
        WEB_NAMES,
        PROVIDER_LOGOS,
        SharedStorage,
        sharedStorage
    };
}