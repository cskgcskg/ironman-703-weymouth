# 🏊🚴🏃 IRONMAN 70.3 Weymouth — Triathlon Game

A **Mario Bros style** side-scrolling triathlon simulator with pixel art graphics, 8-bit sound effects, and strategic nutrition management. Inspired by the real IRONMAN 70.3 Weymouth on England's Jurassic Coast.

![React](https://img.shields.io/badge/React-18-blue) ![Vite](https://img.shields.io/badge/Vite-5-purple) ![License](https://img.shields.io/badge/License-MIT-green)

## 🎮 Play Now

**[Play Live →](#)** *(replace with your GitHub Pages URL after deploying)*

## 🕹️ Controls

| Key | Action |
|---|---|
| `← →` or `A / D` | Alternate keys to swim / pedal / run |
| `SPACE` (hold) | Sprint burst 🔥 (drains energy fast!) |
| `1` | 💧 Water (+20 Hydration) |
| `2` | 🟡 Gel (+18 Endurance) |
| `3` | 🍌 Banana (+15 Endurance) |
| `4` | 🟠 Caffeine Gel (+25 Caffeine, +12 Endurance) |
| `5` | ☕ **COFFEE** (+40 Caffeine, +15 Morale!) |
| `6` | 🥤 Coke (+15 Caffeine, +8 Morale) |
| `7` | ⭐ Star (+10 everything!) |
| `P` / `ESC` | Pause |

**Pro tip:** Alternate ← → rhythmically to build combos. Save coffee (key 5) for the late bike and run!

## 📖 The Race

| Discipline | Distance | Gameplay |
|---|---|---|
| 🏊 **Swim** | 1.2 mi | Surface swimming in Weymouth Bay with buoys, fish, and jellyfish |
| 🚴 **Bike** | 56 mi | Dorset countryside — longest leg! Through Dorchester, King's Stag, Godmanstone |
| 🏃 **Run** | 13.1 mi | Weymouth Esplanade promenade with spectators and sea views |

Distances are **proportional** — the bike takes ~47× longer than the swim, just like real life!

## ⚙️ Features

- **8-bit sound effects** — Splash, pedal clicks, footsteps, power-ups, warnings, fanfares
- **Manual nutrition strategy** — YOU decide when to eat/drink (keys 1-7), just like a real race
- **Stat management** — Endurance, Hydration, Caffeine, Morale all affect your speed
- **Caffeine mechanics** — Boosts power & speed, decays over time, golden aura effect
- **Side-scrolling pixel art** — Mario-style graphics with parallax backgrounds
- **Player moves horizontally** — Faster = further right on screen, realistic momentum
- **Surface swimming** — Swimmer strokes on top of the water with wake and splash effects
- **12 AI rivals** — Race against Bowser, Luigi, Peach, and more
- **Easy Mode** — Slower stamina drain for casual play
- **Touch controls** — On-screen buttons for mobile

---

## 🚀 Deploy to GitHub Pages (Go Live!)

### Step 1: Create GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Name it `ironman-703-weymouth`
3. Set to **Public**
4. Click **Create repository**

### Step 2: Upload & Push Code

```bash
# Unzip the downloaded project
unzip ironman-703-weymouth.zip
cd ironman-weymouth

# Initialize git
git init
git add .
git commit -m "Initial commit: IRONMAN 70.3 Weymouth game"

# Connect to your GitHub repo (replace YOUR_USERNAME)
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ironman-703-weymouth.git
git push -u origin main
```

### Step 3: Install Dependencies & Build

```bash
npm install
npm run build
```

### Step 4: Deploy to GitHub Pages

```bash
npm run deploy
```

This runs `vite build` then `gh-pages -d dist` automatically.

### Step 5: Enable GitHub Pages

1. Go to your repo on GitHub
2. Click **Settings** → **Pages**
3. Under **Source**, select **Deploy from a branch**
4. Select **gh-pages** branch, **/ (root)** folder
5. Click **Save**

### Step 6: Your game is LIVE! 🎉

After 1-2 minutes, visit:
```
https://YOUR_USERNAME.github.io/ironman-703-weymouth/
```

Share this URL with anyone — they can play instantly in their browser!

---

## 🧪 Test Locally First

```bash
npm install
npm run dev
```

Open **http://localhost:5173** — verify everything works before deploying.

---

## 🔄 Update After Changes

```bash
# After editing code:
git add .
git commit -m "Your change description"
git push

# Redeploy to GitHub Pages:
npm run deploy
```

---

## 📁 Project Structure

```
ironman-weymouth/
├── index.html          # Entry HTML
├── package.json        # Dependencies & scripts
├── vite.config.js      # Vite build config
├── .gitignore
├── README.md
└── src/
    ├── main.jsx        # React mount point
    └── App.jsx         # Complete game (single file!)
```

## 🛠️ Tech Stack

- **React 18** — UI framework
- **HTML5 Canvas** — Side-scrolling game graphics
- **Web Audio API** — 8-bit sound effects (no audio files needed!)
- **Vite 5** — Build tool
- **gh-pages** — GitHub Pages deployment
- **Zero game engine dependencies** — Just React + Canvas + Web Audio

## 📄 License

MIT — see [LICENSE](LICENSE)

---

*Fan-made simulator. Not affiliated with IRONMAN® or World Triathlon Corporation.*
