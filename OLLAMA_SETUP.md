# 🚀 Ollama Setup Guide - FREE AI for MongoDB Queries

Your app has been updated to use **Ollama** instead of Gemini AI. This means:
- ✅ **100% FREE** - No API subscriptions needed
- ✅ **Runs locally** - Your data stays private
- ✅ **Works offline** - No internet required after setup
- ✅ **Production ready** - Can be deployed on your server

---

## 📋 Step 1: Install Ollama

### On Windows (Your Local Machine)
Ollama is currently being installed via `winget`. Wait for it to complete, then:

1. **Restart your terminal** (or open a new PowerShell window)
2. **Verify installation:**
   ```powershell
   ollama --version
   ```

If the installation didn't complete, download manually:
- Visit: https://ollama.com/download
- Download the Windows installer
- Run the installer

### On Linux Server (For Production Deployment)
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### On macOS
```bash
brew install ollama
```

---

## 📦 Step 2: Download an AI Model

After Ollama is installed, download a model. We recommend **llama3.2** (small, fast, good quality):

```powershell
ollama pull llama3.2
```

### Alternative Models (Choose based on your needs):

| Model | Size | Speed | Quality | Best For |
|-------|------|-------|---------|----------|
| `llama3.2` | ~2GB | ⚡⚡⚡ Fast | ⭐⭐⭐ Good | **Recommended** - Best balance |
| `mistral` | ~4GB | ⚡⚡ Medium | ⭐⭐⭐⭐ Great | Better quality, needs more RAM |
| `qwen2.5` | ~4GB | ⚡⚡ Medium | ⭐⭐⭐⭐ Great | Good for structured output |
| `gemma2` | ~5GB | ⚡ Slower | ⭐⭐⭐⭐⭐ Best | Best quality, needs 8GB+ RAM |

To use a different model, update your `.env` file:
```bash
OLLAMA_MODEL=mistral  # Change this to your preferred model
```

---

## 🔧 Step 3: Start Ollama Service

### On Windows
Ollama should start automatically after installation. If not:
```powershell
ollama serve
```

### On Linux/Mac
```bash
ollama serve
```

**Verify it's running:**
```powershell
curl http://localhost:11434
```
You should see: `Ollama is running`

---

## ▶️ Step 4: Test Your App

1. **Start the MCP server:**
   ```powershell
   npm run start-mcp
   ```

2. **In another terminal, start the Next.js app:**
   ```powershell
   npm run dev
   ```

3. **Or run both together:**
   ```powershell
   npm run dev-full
   ```

4. **Open your browser:** http://localhost:3000

5. **Try a query like:**
   - "Show me all users"
   - "Find products with price greater than 100"
   - "Get the latest 10 orders"

---

## 🌐 Step 5: Deploy to Production Server

### Option A: Deploy on VPS (DigitalOcean, AWS EC2, Linode, etc.)

1. **SSH into your server:**
   ```bash
   ssh user@your-server-ip
   ```

2. **Install Ollama on the server:**
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ```

3. **Pull the model:**
   ```bash
   ollama pull llama3.2
   ```

4. **Start Ollama service:**
   ```bash
   ollama serve &
   ```

5. **Update your `.env` on the server:**
   ```bash
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama3.2
   ```

6. **Deploy your app** (using PM2, Docker, or your preferred method)

### Option B: Deploy on Separate Ollama Server

If you want to run Ollama on a different server:

1. **On Ollama server, allow external connections:**
   ```bash
   OLLAMA_HOST=0.0.0.0:11434 ollama serve
   ```

2. **Update your app's `.env`:**
   ```bash
   OLLAMA_BASE_URL=http://your-ollama-server-ip:11434
   ```

---

## 🔍 Troubleshooting

### Issue: "Cannot connect to Ollama"
**Solution:**
```powershell
# Check if Ollama is running
curl http://localhost:11434

# If not, start it
ollama serve
```

### Issue: "Model not found"
**Solution:**
```powershell
# List available models
ollama list

# Pull the model if missing
ollama pull llama3.2
```

### Issue: "Slow responses"
**Solutions:**
- Use a smaller model (`llama3.2` instead of `mistral`)
- Increase server RAM
- Use GPU acceleration (if available)

### Issue: "Out of memory"
**Solutions:**
- Use a smaller model
- Increase server RAM (minimum 8GB recommended)
- Reduce `SAMPLE_SIZE` in schema extraction

---

## 📊 Performance Tips

1. **Use the right model for your server:**
   - 4GB RAM → `llama3.2`
   - 8GB RAM → `mistral` or `qwen2.5`
   - 16GB+ RAM → `gemma2`

2. **Keep Ollama running:**
   - First request is slower (model loading)
   - Subsequent requests are fast

3. **Use PM2 or systemd to keep Ollama running:**
   ```bash
   # Create systemd service
   sudo nano /etc/systemd/system/ollama.service
   ```

---

## 🎉 You're All Set!

Your app now uses **FREE, local AI** instead of paid APIs. No more subscription costs! 🎊

### Next Steps:
1. Wait for Ollama installation to complete
2. Run `ollama pull llama3.2`
3. Start your app with `npm run dev-full`
4. Test with MongoDB queries!

---

## 💡 Need Help?

- **Ollama Docs:** https://ollama.com/docs
- **Model Library:** https://ollama.com/library
- **GitHub Issues:** https://github.com/ollama/ollama/issues
