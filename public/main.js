// ByteForge - Main Game Script
class ByteForge {
  constructor() {
    this.userId = 'player-' + Math.random().toString(36).substr(2, 9);
    this.userData = null;
    this.isInitialized = false;
    
    // Game state
    this.lastUpdate = Date.now();
    this.autoCollectInterval = null;
    
    this.init();
  }

  async init() {
    try {
      await this.loadUserData();
      this.setupEventListeners();
      this.startAutoCollect();
      this.updateUI();
      this.isInitialized = true;
      console.log('ByteForge initialized for user:', this.userId);
    } catch (error) {
      console.error('Failed to initialize ByteForge:', error);
    }
  }

  // API Calls
  async loadUserData() {
    try {
      const response = await fetch(`/api/user/${this.userId}`);
      this.userData = await response.json();
      return this.userData;
    } catch (error) {
      console.error('Failed to load user data:', error);
      throw error;
    }
  }

  async addBytes(amount) {
    try {
      const response = await fetch(`/api/user/${this.userId}/bytes/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      
      const result = await response.json();
      if (result.success) {
        this.userData.bytes = result.newTotal;
        this.userData.totalBytesEarned += result.bytesAdded;
        this.updateUI();
        this.showNotification(`+${result.bytesAdded} bytes! (${result.multiplier}x multiplier)`);
      }
      return result;
    } catch (error) {
      console.error('Failed to add bytes:', error);
      throw error;
    }
  }

  async removeBytes(amount) {
    try {
      const response = await fetch(`/api/user/${this.userId}/bytes/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      
      const result = await response.json();
      if (result.success) {
        this.userData.bytes = result.newTotal;
        this.userData.totalBytesSpent += result.bytesRemoved;
        this.updateUI();
        this.showNotification(`-${result.bytesRemoved} bytes spent`);
      }
      return result;
    } catch (error) {
      console.error('Failed to remove bytes:', error);
      throw error;
    }
  }

  async purchaseUpgrade(upgradeType, cost) {
    try {
      const response = await fetch(`/api/user/${this.userId}/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upgradeType, cost })
      });
      
      const result = await response.json();
      if (result.success) {
        this.userData.bytes = result.newTotal;
        this.userData.totalBytesSpent += result.bytesSpent;
        this.userData.upgrades[upgradeType] = result.newUpgradeLevel;
        this.updateUI();
        this.showNotification(`Upgrade purchased: ${upgradeType} (Level ${result.newUpgradeLevel})`);
      }
      return result;
    } catch (error) {
      console.error('Failed to purchase upgrade:', error);
      throw error;
    }
  }

  async getBytesBalance() {
    try {
      const response = await fetch(`/api/user/${this.userId}/bytes`);
      const result = await response.json();
      this.userData.bytes = result.bytes;
      this.userData.totalBytesEarned = result.totalEarned;
      this.userData.totalBytesSpent = result.totalSpent;
      return result;
    } catch (error) {
      console.error('Failed to get bytes balance:', error);
      throw error;
    }
  }

  // Event Listeners
  setupEventListeners() {
    // Manual byte collection
    const collectButton = document.getElementById('collectButton');
    if (collectButton) {
      collectButton.addEventListener('click', () => {
        this.manualCollect();
      });
    }

    // Upgrade buttons
    const multiplierUpgradeBtn = document.getElementById('multiplierUpgradeBtn');
    if (multiplierUpgradeBtn) {
      multiplierUpgradeBtn.addEventListener('click', () => {
        this.buyMultiplierUpgrade();
      });
    }

    const autoCollectorUpgradeBtn = document.getElementById('autoCollectorUpgradeBtn');
    if (autoCollectorUpgradeBtn) {
      autoCollectorUpgradeBtn.addEventListener('click', () => {
        this.buyAutoCollectorUpgrade();
      });
    }

    const byteGeneratorUpgradeBtn = document.getElementById('byteGeneratorUpgradeBtn');
    if (byteGeneratorUpgradeBtn) {
      byteGeneratorUpgradeBtn.addEventListener('click', () => {
        this.buyByteGeneratorUpgrade();
      });
    }




  }

  // Game Actions
  async manualCollect() {
    const baseAmount = 1;
    await this.addBytes(baseAmount);
  }

  async buyMultiplierUpgrade() {
    const currentLevel = this.userData.upgrades.byteMultiplier;
    const cost = Math.floor(10 * Math.pow(1.5, currentLevel * 10));
    
    if (this.userData.bytes >= cost) {
      await this.purchaseUpgrade('byteMultiplier', cost);
    } else {
      this.showNotification('Not enough bytes!', 'error');
    }
  }

  async buyAutoCollectorUpgrade() {
    const currentLevel = this.userData.upgrades.autoCollector;
    const cost = Math.floor(25 * Math.pow(2, currentLevel));
    
    if (this.userData.bytes >= cost) {
      await this.purchaseUpgrade('autoCollector', cost);
    } else {
      this.showNotification('Not enough bytes!', 'error');
    }
  }

  async buyByteGeneratorUpgrade() {
    const currentLevel = this.userData.upgrades.byteGenerator;
    const cost = Math.floor(50 * Math.pow(3, currentLevel));
    
    if (this.userData.bytes >= cost) {
      await this.purchaseUpgrade('byteGenerator', cost);
    } else {
      this.showNotification('Not enough bytes!', 'error');
    }
  }





  // Auto Collection System
  startAutoCollect() {
    if (this.autoCollectInterval) {
      clearInterval(this.autoCollectInterval);
    }

    this.autoCollectInterval = setInterval(() => {
      this.autoCollect();
    }, 1000); // Collect every second
  }

  async autoCollect() {
    if (!this.userData) return;

    const autoCollectorLevel = this.userData.upgrades.autoCollector;
    const byteGeneratorLevel = this.userData.upgrades.byteGenerator;
    
    let totalAutoBytes = 0;
    
    // Auto collector bytes
    if (autoCollectorLevel > 0) {
      totalAutoBytes += autoCollectorLevel * 0.1;
    }
    
    // Byte generator bytes
    if (byteGeneratorLevel > 0) {
      totalAutoBytes += byteGeneratorLevel * 0.5;
    }
    
    if (totalAutoBytes > 0) {
      await this.addBytes(Math.floor(totalAutoBytes));
    }
  }

  // UI Updates
  updateUI() {
    if (!this.userData) return;

    // Update byte display
    const bytesDisplay = document.getElementById('bytesDisplay');
    if (bytesDisplay) {
      bytesDisplay.textContent = this.formatNumber(this.userData.bytes);
    }

    // Update total earned/spent
    const totalEarnedDisplay = document.getElementById('totalEarnedDisplay');
    if (totalEarnedDisplay) {
      totalEarnedDisplay.textContent = this.formatNumber(this.userData.totalBytesEarned);
    }

    const totalSpentDisplay = document.getElementById('totalSpentDisplay');
    if (totalSpentDisplay) {
      totalSpentDisplay.textContent = this.formatNumber(this.userData.totalBytesSpent);
    }

    // Update upgrade levels
    const multiplierLevelDisplay = document.getElementById('multiplierLevelDisplay');
    if (multiplierLevelDisplay) {
      multiplierLevelDisplay.textContent = this.userData.upgrades.byteMultiplier.toFixed(1) + 'x';
    }

    const autoCollectorLevelDisplay = document.getElementById('autoCollectorLevelDisplay');
    if (autoCollectorLevelDisplay) {
      autoCollectorLevelDisplay.textContent = this.userData.upgrades.autoCollector;
    }

    const byteGeneratorLevelDisplay = document.getElementById('byteGeneratorLevelDisplay');
    if (byteGeneratorLevelDisplay) {
      byteGeneratorLevelDisplay.textContent = this.userData.upgrades.byteGenerator;
    }

    // Update upgrade costs
    this.updateUpgradeCosts();

    // Update auto collection rate
    const autoCollectionRateDisplay = document.getElementById('autoCollectionRateDisplay');
    if (autoCollectionRateDisplay) {
      const autoRate = this.userData.upgrades.autoCollector * 0.1 + this.userData.upgrades.byteGenerator * 0.5;
      autoCollectionRateDisplay.textContent = this.formatNumber(autoRate) + '/s';
    }
  }

  updateUpgradeCosts() {
    // Multiplier upgrade cost
    const multiplierCostDisplay = document.getElementById('multiplierCostDisplay');
    if (multiplierCostDisplay) {
      const currentLevel = this.userData.upgrades.byteMultiplier;
      const cost = Math.floor(10 * Math.pow(1.5, currentLevel * 10));
      multiplierCostDisplay.textContent = this.formatNumber(cost);
    }

    // Auto collector upgrade cost
    const autoCollectorCostDisplay = document.getElementById('autoCollectorCostDisplay');
    if (autoCollectorCostDisplay) {
      const currentLevel = this.userData.upgrades.autoCollector;
      const cost = Math.floor(25 * Math.pow(2, currentLevel));
      autoCollectorCostDisplay.textContent = this.formatNumber(cost);
    }

    // Byte generator upgrade cost
    const byteGeneratorCostDisplay = document.getElementById('byteGeneratorCostDisplay');
    if (byteGeneratorCostDisplay) {
      const currentLevel = this.userData.upgrades.byteGenerator;
      const cost = Math.floor(50 * Math.pow(3, currentLevel));
      byteGeneratorCostDisplay.textContent = this.formatNumber(cost);
    }
  }

  // Utility Functions
  formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  // Public methods for external access
  getUserId() {
    return this.userId;
  }

  getUserData() {
    return this.userData;
  }

  isReady() {
    return this.isInitialized;
  }
}

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.byteForge = new ByteForge();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ByteForge;
}