# 🌿 EcoAware

> Transforming carbon awareness into an engaging and interactive experience.

EcoAware is a premium climate-tech platform designed to help people understand their environmental impact through intuitive visualizations, educational insights, and sustainability-focused interactions.

![React](https://img.shields.io/badge/React-Frontend-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-06B6D4?logo=tailwindcss)
![Prompt War](https://img.shields.io/badge/Prompt%20War-Submission-success)
![License](https://img.shields.io/badge/License-MIT-green)
![Lighthouse](https://img.shields.io/badge/Lighthouse-100%2F100-success?style=flat)

---

## 🌎 About EcoAware

EcoAware evolved from a simple carbon tracker into a visually immersive sustainability awareness experience. We believe that addressing climate change begins with understanding our individual impact.

**The Problem:** Traditional carbon calculators feel like tax forms—dry, uninspiring, and disconnected from the beauty of the natural world they aim to protect. 

**Our Solution:** EcoAware transforms personal climate action into an engaging, elegant experience. By combining actionable climate insights with striking data visualizations and a premium UI, we inspire meaningful environmental action.

## ✨ Key Features

- **Interactive Carbon Dashboard**: A centralized, dynamic hub monitoring your footprint across transport, energy, diet, and waste.
- **Carbon Assessment Experience**: An immersive onboarding flow that calculates your baseline impact through an intuitive, gamified interview.
- **Eco Insights**: AI-powered, personalized recommendations that provide realistic, high-impact strategies to lower your carbon debt.
- **Sustainability Quiz**: An engaging way to learn about the environment and test your climate-tech knowledge.
- **Data Visualizations**: Beautifully crafted charts and graphs that turn abstract CO₂ emissions into tangible, easily understandable metrics.
- **Premium User Experience**: Fluid micro-animations, staggered entry reveals, and satisfying tactile feedback on every interaction.
- **Responsive Design**: Flawless experience across all devices, from ultra-wide desktop monitors to mobile screens.

## 🎨 Design Philosophy

EcoAware breaks away from generic dashboards by establishing a **dark premium climate-tech identity**.

- **Eco-Inspired Aesthetics**: Deep emerald greens (`#052e21`) contrasted with vibrant bio-luminescent accents (`#10b981`) to evoke a sense of deep nature meeting high technology.
- **Glass-Inspired Interface**: Strategic use of translucency, soft blurs, and glassmorphism to create depth without clutter.
- **Accessible & Tactile**: A perfect **100/100 Lighthouse Accessibility score**, featuring smooth radial-wipe theme toggles, clear ARIA labels, and high-contrast typography.

## 🛠 Tech Stack

EcoAware is built on a modern, high-performance foundation:

| Category | Technology |
| :--- | :--- |
| **Frontend Framework** | React 18, TypeScript |
| **Build Tool** | Vite (Blazing fast HMR) |
| **Styling** | Tailwind CSS + Custom CSS Animations |
| **Data Fetching** | TanStack Query (React Query) |
| **Charts & Visuals** | Recharts, jsPDF (Auto-Report Generation) |
| **Icons** | Lucide React |

## 🌟 Project Highlights

What separates EcoAware from an ordinary carbon tracker?
1. **Zero-Friction Onboarding**: Bypasses tedious login screens in favor of an immediate, immersive guest-driven exploration.
2. **Offline-Ready Architecture**: Built as a PWA (Progressive Web App) with intelligent service worker caching.
3. **One-Click PDF Reports**: Generates highly polished, branded PDF carbon footprint reports instantly on the client side.
4. **View Transitions API**: Implements cutting-edge browser APIs for seamless, native-feeling dark mode radial wipes.

## 📸 Gallery

<details>
<summary><b>1. The Dashboard</b></summary>
<br/>
<i>A panoramic view of your environmental impact featuring dynamic charts and actionable goals.</i>
<br/>
<img src="https://via.placeholder.com/800x450/052e21/10b981?text=Dashboard+Screenshot" alt="Dashboard View">
</details>

<details>
<summary><b>2. Eco Insights</b></summary>
<br/>
<i>AI-driven recommendations tailored specifically to your lifestyle and highest emission categories.</i>
<br/>
<img src="https://via.placeholder.com/800x450/052e21/10b981?text=Eco+Insights+Screenshot" alt="Insights View">
</details>

<details>
<summary><b>3. PDF Report Generation</b></summary>
<br/>
<i>Export beautiful, brand-aligned PDF summaries of your footprint with a single click.</i>
<br/>
<img src="https://via.placeholder.com/800x450/052e21/10b981?text=PDF+Report+Screenshot" alt="PDF Report View">
</details>

*Note: Replace the placeholder images above with actual screenshots of the application before presenting.*

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or pnpm

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/shaaannn7/Ecoaware.git

# 2. Navigate into the project
cd Ecoaware

# 3. Install dependencies
npm install
```

### Development

To start the local development server with hot-module replacement (HMR):
```bash
# Start backend API and Frontend App concurrently
npm run dev
```

### Build for Production

To create an optimized, minified production build:
```bash
npm run build
npm run preview # To preview the production build locally
```

## 📁 Folder Structure

```text
carbon-platform/
├── apps/
│   ├── api/                # Express.js Backend Services
│   └── web/                # React Vite Frontend Application
│       ├── src/
│       │   ├── components/ # Reusable UI pieces (Bento boxes, Nav, Charts)
│       │   ├── contexts/   # React Context (Auth, Theme)
│       │   ├── hooks/      # Custom React hooks (useCarbonData)
│       │   ├── pages/      # Route-level components (Dashboard, Insights)
│       │   ├── services/   # API connectors and PDF generators
│       │   ├── index.css   # Global styles and custom keyframe animations
│       │   └── App.tsx     # Main application routing and transition logic
│       └── index.html      # Entry point with inline zero-delay preloader
├── docs/                   # Documentation and design specs
└── package.json            # Workspace configuration
```

## 🔮 Future Improvements

While EcoAware is a polished experience today, our roadmap includes:
- **Community Leaderboards**: Opt-in gamification to foster friendly competition for carbon reduction.
- **Real-Time API Integrations**: Syncing with smart-home devices to track energy consumption automatically.
- **Localization**: Full i18n support, starting with localized datasets for the Indian market.

## 🤝 Contributing

We welcome contributions from developers, designers, and climate enthusiasts! 
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🙏 Acknowledgements

- Inspiration drawn from modern glassmorphism design trends.
- Huge thanks to the open-source community for tools like Vite, React, and TailwindCSS.
- Developed with a deep commitment to environmental preservation and tech-for-good initiatives.

## 👨‍💻 Author

Created for the **Prompt War** competition.
Built with ❤️, TypeScript, and a passion for our planet.

## Video

<video width="100%" autoplay loop muted controls>
  <source src="[Ecoaware.webm](https://github.com/user-attachments/assets/6e8231ab-2b08-4d56-9c71-f5bc7a6918b6)
" type="video/webm">
  Your browser does not support the video tag.
</video>

---

<div align="center">
  <i>"The greatest threat to our planet is the belief that someone else will save it." — Robert Swan</i>
</div>
