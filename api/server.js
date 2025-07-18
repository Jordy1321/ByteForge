const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Data storage
const DATA_FILE = path.join(__dirname, 'data.json');

// Initialize data structure
let gameData = {
  users: {},
  lastSave: Date.now()
};

// Load data from file
async function loadData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    gameData = JSON.parse(data);
  } catch (error) {
    console.log('No existing data found, starting fresh');
    await saveData();
  }
}

// Save data to file
async function saveData() {
  try {
    gameData.lastSave = Date.now();
    await fs.writeFile(DATA_FILE, JSON.stringify(gameData, null, 2));
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

// Auto-save every 30 seconds
setInterval(saveData, 30000);

// User management
function createUser(userId) {
  if (!gameData.users[userId]) {
    gameData.users[userId] = {
      id: userId,
      bytes: 0,
      totalBytesEarned: 0,
      totalBytesSpent: 0,
      lastActive: Date.now(),
      upgrades: {
        byteMultiplier: 1,
        autoCollector: 0,
        byteGenerator: 0
      },
      createdAt: Date.now()
    };
  }
  return gameData.users[userId];
}

function getUser(userId) {
  return gameData.users[userId] || createUser(userId);
}

// API Routes

// Get user data
app.get('/api/user/:userId', (req, res) => {
  const { userId } = req.params;
  const user = getUser(userId);
  user.lastActive = Date.now();
  res.json(user);
});

// Add bytes to user
app.post('/api/user/:userId/bytes/add', (req, res) => {
  const { userId } = req.params;
  const { amount } = req.body;
  
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }
  
  const user = getUser(userId);
  const multiplier = user.upgrades.byteMultiplier;
  const finalAmount = Math.floor(amount * multiplier);
  
  user.bytes += finalAmount;
  user.totalBytesEarned += finalAmount;
  user.lastActive = Date.now();
  
  res.json({
    success: true,
    bytesAdded: finalAmount,
    newTotal: user.bytes,
    multiplier: multiplier
  });
});

// Remove bytes from user
app.post('/api/user/:userId/bytes/remove', (req, res) => {
  const { userId } = req.params;
  const { amount } = req.body;
  
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }
  
  const user = getUser(userId);
  
  if (user.bytes < amount) {
    return res.status(400).json({ error: 'Insufficient bytes' });
  }
  
  user.bytes -= amount;
  user.totalBytesSpent += amount;
  user.lastActive = Date.now();
  
  res.json({
    success: true,
    bytesRemoved: amount,
    newTotal: user.bytes
  });
});

// Get bytes balance
app.get('/api/user/:userId/bytes', (req, res) => {
  const { userId } = req.params;
  const user = getUser(userId);
  user.lastActive = Date.now();
  
  res.json({
    bytes: user.bytes,
    totalEarned: user.totalBytesEarned,
    totalSpent: user.totalBytesSpent
  });
});

// Purchase upgrade
app.post('/api/user/:userId/upgrade', (req, res) => {
  const { userId } = req.params;
  const { upgradeType, cost } = req.body;
  
  if (!upgradeType || !cost || cost <= 0) {
    return res.status(400).json({ error: 'Invalid upgrade request' });
  }
  
  const user = getUser(userId);
  
  if (user.bytes < cost) {
    return res.status(400).json({ error: 'Insufficient bytes for upgrade' });
  }
  
  // Apply upgrade
  switch (upgradeType) {
    case 'byteMultiplier':
      user.upgrades.byteMultiplier += 0.1;
      break;
    case 'autoCollector':
      user.upgrades.autoCollector += 1;
      break;
    case 'byteGenerator':
      user.upgrades.byteGenerator += 1;
      break;
    default:
      return res.status(400).json({ error: 'Invalid upgrade type' });
  }
  
  user.bytes -= cost;
  user.totalBytesSpent += cost;
  user.lastActive = Date.now();
  
  res.json({
    success: true,
    upgradeApplied: upgradeType,
    newUpgradeLevel: user.upgrades[upgradeType],
    bytesSpent: cost,
    newTotal: user.bytes
  });
});

// Get all users (for admin purposes)
app.get('/api/users', (req, res) => {
  const users = Object.values(gameData.users).map(user => ({
    id: user.id,
    bytes: user.bytes,
    totalEarned: user.totalBytesEarned,
    totalSpent: user.totalBytesSpent,
    lastActive: user.lastActive,
    upgrades: user.upgrades
  }));
  
  res.json(users);
});

// Get game statistics
app.get('/api/stats', (req, res) => {
  const totalUsers = Object.keys(gameData.users).length;
  const totalBytes = Object.values(gameData.users).reduce((sum, user) => sum + user.bytes, 0);
  const totalEarned = Object.values(gameData.users).reduce((sum, user) => sum + user.totalBytesEarned, 0);
  const totalSpent = Object.values(gameData.users).reduce((sum, user) => sum + user.totalBytesSpent, 0);
  
  res.json({
    totalUsers,
    totalBytes,
    totalEarned,
    totalSpent,
    lastSave: gameData.lastSave
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
async function startServer() {
  await loadData();
  
  app.listen(PORT, () => {
    console.log(`ByteForge API server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Saving data before shutdown...');
  await saveData();
  process.exit(0);
});

startServer().catch(console.error);
