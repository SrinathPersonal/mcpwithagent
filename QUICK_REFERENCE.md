# 🚀 Quick Reference - Ollama Commands

## 📦 Installation Status

Check if Ollama is installed:
```powershell
ollama --version
```

If not installed, download from: https://ollama.com/download

---

## 🤖 Model Management

### Download a model:
```powershell
ollama pull llama3.2        # Recommended (small, fast)
ollama pull mistral         # Better quality
ollama pull qwen2.5         # Good for structured output
ollama pull gemma2          # Best quality (needs more RAM)
```

### List installed models:
```powershell
ollama list
```

### Remove a model:
```powershell
ollama rm llama3.2
```

---

## 🔧 Service Management

### Start Ollama service:
```powershell
ollama serve
```

### Check if Ollama is running:
```powershell
curl http://localhost:11434
```

Expected response: `Ollama is running`

---

## 🎮 Application Commands

### Start everything (automated):
```powershell
.\start.ps1
```

### Start manually:
```powershell
# Terminal 1: Start MCP server
npm run start-mcp

# Terminal 2: Start Next.js
npm run dev
```

### Start both together:
```powershell
npm run dev-full
```

---

## 🧪 Test Ollama Directly

### Test with a simple prompt:
```powershell
ollama run llama3.2 "What is MongoDB?"
```

### Test with your model:
```powershell
ollama run llama3.2 "Convert this to a MongoDB query: show me all users"
```

---

## 🌐 URLs

- **Next.js App:** http://localhost:3000
- **MCP Server:** http://localhost:4000
- **Ollama Service:** http://localhost:11434

---

## 📝 Environment Variables

Edit `.env` file:

```bash
# MongoDB
MONGODB_URI=your_connection_string

# Ollama (Local)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# For production server:
# OLLAMA_BASE_URL=http://your-server-ip:11434
```

---

## 🔍 Debugging

### Check Ollama logs:
```powershell
# Ollama runs as a service, check Windows Event Viewer
# Or run in foreground:
ollama serve
```

### Check MCP server logs:
```powershell
npm run start-mcp
# Watch the console output
```

### Test MongoDB connection:
```powershell
# In your app, visit:
http://localhost:4000/health
http://localhost:4000/schema
```

---

## 🚨 Common Issues

### Issue: "ollama: command not found"
**Solution:** Restart your terminal after installation

### Issue: "Cannot connect to Ollama"
**Solution:** 
```powershell
ollama serve
```

### Issue: "Model not found"
**Solution:**
```powershell
ollama pull llama3.2
```

### Issue: "Connection refused on port 11434"
**Solution:** Check if Ollama service is running:
```powershell
Get-Process ollama
```

---

## 📚 Example Queries to Test

Once your app is running, try these queries:

1. "Show me all users"
2. "Find products with price greater than 100"
3. "Get the latest 10 orders"
4. "Show me users created in the last week"
5. "Find all active subscriptions"

---

## 🎯 Production Deployment

### On Linux Server:

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull model
ollama pull llama3.2

# Start service (background)
ollama serve &

# Or use systemd
sudo systemctl enable ollama
sudo systemctl start ollama
```

### Update .env on server:
```bash
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

---

## 💡 Tips

1. **First request is slow** - Ollama loads the model (5-10 seconds)
2. **Keep Ollama running** - Subsequent requests are fast (<1 second)
3. **Use smaller models** - If you have limited RAM
4. **GPU acceleration** - Ollama automatically uses GPU if available

---

## 📖 More Information

- **Ollama Docs:** https://ollama.com/docs
- **Model Library:** https://ollama.com/library
- **GitHub:** https://github.com/ollama/ollama
- **Setup Guide:** See `OLLAMA_SETUP.md`
- **Changes Summary:** See `CHANGES_SUMMARY.md`
